import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.payment_card import PaymentCard
from app.models.account import Account
from app.schemas.card import CardCreate, CardResponse
from app.core.tokenisation import tokenisation_service
from app.core.audit import audit_logger
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/cards", tags=["Cards"])


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Tokenise and add card")
def add_card(
    payload: CardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(
        Account.id == payload.account_id,
        Account.user_id == current_user.id,
        Account.is_active == True,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        vault_entry = tokenisation_service.tokenise_pan(payload.pan, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    masked = tokenisation_service.mask_pan(payload.pan)
    card = PaymentCard(
        account_id=account.id,
        token_vault_id=vault_entry.id,
        masked_pan=masked,
        card_type=payload.card_type.lower(),
        expiry_month=payload.expiry_month,
        expiry_year=payload.expiry_year,
        is_active=True,
    )
    db.add(card)
    db.commit()

    audit_logger.log(
        "CARD_ADDED",
        {"masked_pan": masked, "card_type": payload.card_type},
        db, user_id=str(current_user.id),
    )
    return {
        "id": str(card.id),
        "account_id": str(card.account_id),
        "masked_pan": card.masked_pan,
        "card_type": card.card_type,
        "expiry_month": card.expiry_month,
        "expiry_year": card.expiry_year,
        "is_active": card.is_active,
        "created_at": card.created_at.isoformat(),
        "token": vault_entry.token_pan,
    }


@router.get("/", summary="List user cards")
def list_cards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [a.id for a in user_accounts]
    cards = db.query(PaymentCard).filter(
        PaymentCard.account_id.in_(account_ids),
        PaymentCard.is_active == True,
    ).all()
    return [
        {
            "id": str(c.id),
            "account_id": str(c.account_id),
            "masked_pan": c.masked_pan,
            "card_type": c.card_type,
            "expiry_month": c.expiry_month,
            "expiry_year": c.expiry_year,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat(),
        }
        for c in cards
    ]


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Deactivate card")
def deactivate_card(
    card_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    account_ids = [a.id for a in user_accounts]
    card = db.query(PaymentCard).filter(
        PaymentCard.id == card_id,
        PaymentCard.account_id.in_(account_ids),
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    card.is_active = False
    db.commit()
    audit_logger.log("CARD_DEACTIVATED", {"card_id": str(card_id)}, db, user_id=str(current_user.id))
