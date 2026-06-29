import secrets
import string
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.gift_card import GiftCard
from app.models.account import Account
from app.api.deps import get_current_user
from app.models.user import User
from app.core.audit import audit_logger
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/giftcards", tags=["Gift Cards"])

DENOMINATIONS = [500, 1000, 2000, 5000, 10000, 20000, 50000]


class GiftCardPurchaseRequest(BaseModel):
    account_id: uuid.UUID
    amount: Decimal
    currency: str = "NGN"


class GiftCardRedeemRequest(BaseModel):
    code: str
    account_id: uuid.UUID


def _generate_code(length: int = 20) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/purchase", status_code=status.HTTP_201_CREATED)
def purchase_gift_card(
    payload: GiftCardPurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.amount not in [Decimal(d) for d in DENOMINATIONS]:
        raise HTTPException(
            status_code=400,
            detail=f"Amount must be one of: {DENOMINATIONS}",
        )

    account = db.query(Account).filter(
        Account.id == payload.account_id,
        Account.user_id == current_user.id,
        Account.is_active == True,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if account.balance < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    code = _generate_code()
    while db.query(GiftCard).filter(GiftCard.code == code).first():
        code = _generate_code()

    account.balance -= payload.amount

    gift_card = GiftCard(
        code=code,
        amount=payload.amount,
        currency=payload.currency,
        issuer="SDPS",
        denomination_label=f"₦{int(payload.amount):,}",
        purchased_by_account_id=account.id,
        is_redeemed=False,
        expires_at=datetime.utcnow() + timedelta(days=365),
    )
    db.add(gift_card)
    db.commit()

    audit_logger.log(
        "GIFT_CARD_PURCHASED",
        {"code": code, "amount": str(payload.amount), "currency": payload.currency},
        db,
        user_id=str(current_user.id),
    )

    return {
        "message": "Gift card purchased successfully",
        "code": code,
        "amount": str(payload.amount),
        "currency": payload.currency,
        "denomination_label": gift_card.denomination_label,
        "expires_at": gift_card.expires_at.isoformat(),
    }


@router.post("/redeem")
def redeem_gift_card(
    payload: GiftCardRedeemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gift_card = db.query(GiftCard).filter(GiftCard.code == payload.code.upper().strip()).first()
    if not gift_card:
        raise HTTPException(status_code=404, detail="Invalid gift card code")

    if gift_card.is_redeemed:
        raise HTTPException(status_code=400, detail="Gift card has already been redeemed")

    if gift_card.expires_at and gift_card.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Gift card has expired")

    account = db.query(Account).filter(
        Account.id == payload.account_id,
        Account.user_id == current_user.id,
        Account.is_active == True,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.balance += gift_card.amount
    gift_card.is_redeemed = True
    gift_card.redeemed_by_account_id = account.id
    gift_card.redeemed_at = datetime.utcnow()
    db.commit()

    audit_logger.log(
        "GIFT_CARD_REDEEMED",
        {"code": payload.code, "amount": str(gift_card.amount)},
        db,
        user_id=str(current_user.id),
    )

    return {
        "message": "Gift card redeemed successfully",
        "amount_credited": str(gift_card.amount),
        "currency": gift_card.currency,
        "new_balance": str(account.balance),
    }


@router.get("/mine")
def list_my_gift_cards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [a.id for a in accounts]

    purchased = db.query(GiftCard).filter(
        GiftCard.purchased_by_account_id.in_(account_ids)
    ).all()

    return [
        {
            "id": str(gc.id),
            "code": gc.code,
            "amount": str(gc.amount),
            "currency": gc.currency,
            "denomination_label": gc.denomination_label,
            "is_redeemed": gc.is_redeemed,
            "redeemed_at": gc.redeemed_at.isoformat() if gc.redeemed_at else None,
            "expires_at": gc.expires_at.isoformat() if gc.expires_at else None,
            "created_at": gc.created_at.isoformat(),
        }
        for gc in purchased
    ]


@router.get("/denominations")
def get_denominations():
    return {"denominations": DENOMINATIONS, "currency": "NGN"}
