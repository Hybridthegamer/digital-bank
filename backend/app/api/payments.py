import uuid, datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.fraud_alert import FraudAlert
from app.schemas.transaction import TransferRequest, TransactionResponse, TransactionHistoryResponse
from app.core.fraud import fraud_engine
from app.core.audit import audit_logger
from app.core.encryption import encryption_service
from app.api.deps import get_current_user, get_request_ip
from app.models.user import User
from app.services.notification_service import notification_service

router = APIRouter(prefix="/payments", tags=["Payments"])


def _lookup_account_by_number(account_number: str, db: Session) -> Optional[Account]:
    all_accounts = db.query(Account).filter(Account.is_active == True).all()
    for acct in all_accounts:
        try:
            if encryption_service.decrypt(acct.account_number) == account_number:
                return acct
        except Exception:
            pass
    return None


def _get_recent_tx_count(account_id, db: Session) -> int:
    one_hour_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)
    return db.query(Transaction).filter(
        Transaction.sender_account_id == account_id,
        Transaction.created_at >= one_hour_ago,
    ).count()


def _get_time_since_last_tx(account_id, db: Session) -> float:
    last = db.query(Transaction).filter(
        Transaction.sender_account_id == account_id,
        Transaction.status == "approved",
    ).order_by(Transaction.created_at.desc()).first()
    if not last or not last.created_at:
        return 86400.0
    now = datetime.datetime.now(datetime.timezone.utc)
    last_time = last.created_at
    if last_time.tzinfo is None:
        last_time = last_time.replace(tzinfo=datetime.timezone.utc)
    return (now - last_time).total_seconds()


@router.post("/transfer", summary="Initiate wallet transfer")
def transfer(
    payload: TransferRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sender_account = db.query(Account).filter(
        Account.id == payload.sender_account_id,
        Account.user_id == current_user.id,
        Account.is_active == True,
    ).first()
    if not sender_account:
        raise HTTPException(status_code=404, detail="Sender account not found")

    receiver_account = _lookup_account_by_number(payload.receiver_account_number, db)
    if not receiver_account:
        raise HTTPException(status_code=404, detail="Recipient account not found")

    if sender_account.id == receiver_account.id:
        raise HTTPException(status_code=400, detail="Cannot transfer to same account")

    amount = Decimal(str(payload.amount))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    sender_balance = Decimal(str(sender_account.balance))
    if sender_balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    # Fraud scoring
    is_new_beneficiary = db.query(Transaction).filter(
        Transaction.sender_account_id == sender_account.id,
        Transaction.receiver_account_id == receiver_account.id,
        Transaction.status == "approved",
    ).count() == 0

    time_since_last = _get_time_since_last_tx(sender_account.id, db)
    tx_count = _get_recent_tx_count(sender_account.id, db)

    fraud_score = fraud_engine.score_transaction(
        amount=float(amount),
        time_since_last_tx=time_since_last,
        is_new_beneficiary=is_new_beneficiary,
        tx_count_last_hour=tx_count,
    )
    decision = fraud_engine.get_decision(fraud_score)

    tx_status = "pending"
    if decision == "approve":
        tx_status = "approved"
    elif decision == "step_up":
        tx_status = "approved"  # step-up handled at client; simplified here
    elif decision == "flag":
        tx_status = "flagged"

    nip_ref = f"NIP-{uuid.uuid4().hex[:12].upper()}"

    tx = Transaction(
        sender_account_id=sender_account.id,
        receiver_account_id=receiver_account.id,
        amount=amount,
        currency=payload.currency,
        transaction_type="transfer",
        status=tx_status,
        narration=payload.narration,
        fraud_score=fraud_score,
        nip_reference=nip_ref,
        completed_at=datetime.datetime.now(datetime.timezone.utc) if tx_status == "approved" else None,
    )
    db.add(tx)
    db.flush()

    if tx_status == "approved":
        sender_account.balance = sender_balance - amount
        receiver_account.balance = Decimal(str(receiver_account.balance)) + amount
    elif tx_status == "flagged":
        fraud_alert = FraudAlert(
            transaction_id=tx.id,
            risk_score=fraud_score,
            alert_type="HIGH_RISK_TRANSFER",
            status="pending",
        )
        db.add(fraud_alert)

        sender_email = encryption_service.decrypt(current_user.email)
        notification_service.send_fraud_alert_notification(sender_email, str(tx.id), fraud_score)

    db.commit()

    audit_logger.log(
        "TRANSFER_INITIATED",
        {
            "amount": str(amount),
            "currency": payload.currency,
            "fraud_score": fraud_score,
            "decision": decision,
            "status": tx_status,
        },
        db,
        user_id=str(current_user.id),
        transaction_id=str(tx.id),
        ip=get_request_ip(request),
    )

    sender_email = encryption_service.decrypt(current_user.email)
    notification_service.send_transaction_notification(
        sender_email, str(tx.id), str(amount), payload.currency, tx_status, payload.narration
    )

    return {
        "transaction_id": str(tx.id),
        "status": tx_status,
        "amount": str(amount),
        "currency": payload.currency,
        "fraud_score": round(fraud_score, 4),
        "fraud_decision": decision,
        "nip_reference": nip_ref,
        "message": (
            "Transaction completed successfully" if tx_status == "approved"
            else "Transaction flagged for review due to suspicious activity"
        ),
    }


@router.get("/history", summary="Get transaction history")
def transaction_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    transaction_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [a.id for a in user_accounts]

    from sqlalchemy import or_
    q = db.query(Transaction).filter(
        or_(
            Transaction.sender_account_id.in_(account_ids),
            Transaction.receiver_account_id.in_(account_ids),
        )
    )
    if transaction_type:
        q = q.filter(Transaction.transaction_type == transaction_type)
    if status_filter:
        q = q.filter(Transaction.status == status_filter)
    if min_amount is not None:
        q = q.filter(Transaction.amount >= Decimal(str(min_amount)))
    if max_amount is not None:
        q = q.filter(Transaction.amount <= Decimal(str(max_amount)))

    total = q.count()
    items = q.order_by(Transaction.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            {
                "id": str(t.id),
                "sender_account_id": str(t.sender_account_id) if t.sender_account_id else None,
                "receiver_account_id": str(t.receiver_account_id) if t.receiver_account_id else None,
                "amount": str(t.amount),
                "currency": t.currency,
                "transaction_type": t.transaction_type,
                "status": t.status,
                "narration": t.narration,
                "fraud_score": t.fraud_score,
                "nip_reference": t.nip_reference,
                "created_at": t.created_at.isoformat(),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            }
            for t in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{transaction_id}", summary="Get single transaction")
def get_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [a.id for a in user_accounts]

    from sqlalchemy import or_
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        or_(
            Transaction.sender_account_id.in_(account_ids),
            Transaction.receiver_account_id.in_(account_ids),
        ),
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return {
        "id": str(tx.id),
        "sender_account_id": str(tx.sender_account_id) if tx.sender_account_id else None,
        "receiver_account_id": str(tx.receiver_account_id) if tx.receiver_account_id else None,
        "amount": str(tx.amount),
        "currency": tx.currency,
        "transaction_type": tx.transaction_type,
        "status": tx.status,
        "narration": tx.narration,
        "fraud_score": tx.fraud_score,
        "nip_reference": tx.nip_reference,
        "created_at": tx.created_at.isoformat(),
        "completed_at": tx.completed_at.isoformat() if tx.completed_at else None,
    }
