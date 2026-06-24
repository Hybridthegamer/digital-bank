from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.account import AccountCreate, AccountFund, AccountResponse
from app.core.encryption import encryption_service
from app.core.audit import audit_logger
from app.api.deps import get_current_user
from app.models.user import User
import random, uuid, datetime

router = APIRouter(prefix="/accounts", tags=["Accounts"])


def _gen_account_number() -> str:
    return "".join([str(random.randint(0, 9)) for _ in range(10)])


def _decrypt_account(acct: Account) -> dict:
    return {
        "id": str(acct.id),
        "user_id": str(acct.user_id),
        "account_number": encryption_service.decrypt(acct.account_number),
        "account_type": acct.account_type,
        "balance": str(acct.balance),
        "currency": acct.currency,
        "is_active": acct.is_active,
        "created_at": acct.created_at.isoformat(),
    }


@router.get("/", summary="List user accounts")
def list_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accounts = db.query(Account).filter(
        Account.user_id == current_user.id, Account.is_active == True
    ).all()
    return [_decrypt_account(a) for a in accounts]


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Create new account")
def create_account(
    payload: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acct_number = _gen_account_number()
    account = Account(
        user_id=current_user.id,
        account_number=encryption_service.encrypt(acct_number),
        account_type=payload.account_type,
        balance=Decimal("0"),
        currency=payload.currency,
        is_active=True,
    )
    db.add(account)
    db.commit()
    audit_logger.log("ACCOUNT_CREATED", {"account_type": payload.account_type}, db,
                     user_id=str(current_user.id))
    return _decrypt_account(account)


@router.get("/{account_id}", summary="Get account detail")
def get_account(
    account_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(
        Account.id == account_id, Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return _decrypt_account(account)


@router.post("/{account_id}/fund", summary="Simulate wallet deposit")
def fund_account(
    account_id: uuid.UUID,
    payload: AccountFund,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    account = db.query(Account).filter(
        Account.id == account_id, Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if not account.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    amount = Decimal(str(payload.amount))
    account.balance = Decimal(str(account.balance)) + amount

    tx = Transaction(
        receiver_account_id=account.id,
        amount=amount,
        currency=account.currency,
        transaction_type="deposit",
        status="approved",
        narration="Wallet funding",
        nip_reference=f"DEP-{uuid.uuid4().hex[:12].upper()}",
        completed_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(tx)
    db.commit()

    audit_logger.log("ACCOUNT_FUNDED", {"amount": str(amount), "account_id": str(account_id)},
                     db, user_id=str(current_user.id), transaction_id=str(tx.id))
    return {
        "message": "Account funded successfully",
        "new_balance": str(account.balance),
        "transaction_id": str(tx.id),
    }
