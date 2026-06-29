from decimal import Decimal, ROUND_DOWN
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.account import Account
from app.models.crypto_holding import CryptoHolding
from app.models.crypto_transaction import CryptoTransaction
from app.api.deps import get_current_user
from app.models.user import User
from app.core.audit import audit_logger
from app.core import crypto_rates
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/crypto", tags=["Cryptocurrency"])


class CryptoBuyRequest(BaseModel):
    account_id: uuid.UUID
    symbol: str
    ngn_amount: Decimal


class CryptoSellRequest(BaseModel):
    account_id: uuid.UUID
    symbol: str
    crypto_amount: Decimal


def _get_or_create_holding(db: Session, user_id, symbol: str) -> CryptoHolding:
    holding = db.query(CryptoHolding).filter(
        CryptoHolding.user_id == user_id,
        CryptoHolding.symbol == symbol,
    ).first()
    if not holding:
        holding = CryptoHolding(user_id=user_id, symbol=symbol, balance=Decimal("0"))
        db.add(holding)
        db.flush()
    return holding


@router.get("/rates")
def get_rates():
    return {"rates": crypto_rates.get_rates()}


@router.post("/buy", status_code=status.HTTP_201_CREATED)
def buy_crypto(
    payload: CryptoBuyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    symbol = payload.symbol.upper()
    if symbol not in crypto_rates.SUPPORTED_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"Unsupported symbol: {symbol}")

    if payload.ngn_amount < Decimal("500"):
        raise HTTPException(status_code=400, detail="Minimum purchase is N500")

    account = db.query(Account).filter(
        Account.id == payload.account_id,
        Account.user_id == current_user.id,
        Account.is_active == True,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if account.balance < payload.ngn_amount:
        raise HTTPException(status_code=400, detail="Insufficient NGN balance")

    buy_rate = Decimal(str(crypto_rates.get_buy_rate(symbol)))
    crypto_amount = (payload.ngn_amount / buy_rate).quantize(Decimal("0.00000001"), rounding=ROUND_DOWN)

    if crypto_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount too small")

    account.balance -= payload.ngn_amount
    holding = _get_or_create_holding(db, current_user.id, symbol)
    holding.balance += crypto_amount

    txn = CryptoTransaction(
        user_id=current_user.id,
        account_id=account.id,
        symbol=symbol,
        transaction_type="buy",
        crypto_amount=crypto_amount,
        ngn_amount=payload.ngn_amount,
        rate=buy_rate,
        status="completed",
    )
    db.add(txn)
    db.commit()

    audit_logger.log(
        "CRYPTO_BUY",
        {"symbol": symbol, "ngn_amount": str(payload.ngn_amount), "crypto_amount": str(crypto_amount)},
        db,
        user_id=str(current_user.id),
    )

    return {
        "message": f"Purchased {crypto_amount} {symbol}",
        "symbol": symbol,
        "crypto_amount": str(crypto_amount),
        "ngn_spent": str(payload.ngn_amount),
        "rate": str(buy_rate),
        "new_ngn_balance": str(account.balance),
        "new_crypto_balance": str(holding.balance),
    }


@router.post("/sell")
def sell_crypto(
    payload: CryptoSellRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    symbol = payload.symbol.upper()
    if symbol not in crypto_rates.SUPPORTED_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"Unsupported symbol: {symbol}")

    holding = db.query(CryptoHolding).filter(
        CryptoHolding.user_id == current_user.id,
        CryptoHolding.symbol == symbol,
    ).first()
    if not holding or holding.balance < payload.crypto_amount:
        raise HTTPException(status_code=400, detail="Insufficient crypto balance")

    account = db.query(Account).filter(
        Account.id == payload.account_id,
        Account.user_id == current_user.id,
        Account.is_active == True,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    sell_rate = Decimal(str(crypto_rates.get_sell_rate(symbol)))
    ngn_received = (payload.crypto_amount * sell_rate).quantize(Decimal("0.01"), rounding=ROUND_DOWN)

    holding.balance -= payload.crypto_amount
    account.balance += ngn_received

    txn = CryptoTransaction(
        user_id=current_user.id,
        account_id=account.id,
        symbol=symbol,
        transaction_type="sell",
        crypto_amount=payload.crypto_amount,
        ngn_amount=ngn_received,
        rate=sell_rate,
        status="completed",
    )
    db.add(txn)
    db.commit()

    audit_logger.log(
        "CRYPTO_SELL",
        {"symbol": symbol, "crypto_amount": str(payload.crypto_amount), "ngn_received": str(ngn_received)},
        db,
        user_id=str(current_user.id),
    )

    return {
        "message": f"Sold {payload.crypto_amount} {symbol}",
        "symbol": symbol,
        "crypto_amount": str(payload.crypto_amount),
        "ngn_received": str(ngn_received),
        "rate": str(sell_rate),
        "new_ngn_balance": str(account.balance),
        "new_crypto_balance": str(holding.balance),
    }


@router.get("/portfolio")
def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    holdings = db.query(CryptoHolding).filter(
        CryptoHolding.user_id == current_user.id,
        CryptoHolding.balance > 0,
    ).all()

    rates = crypto_rates.get_rates()
    total_ngn_value = Decimal("0")
    portfolio = []

    for h in holdings:
        rate_info = rates.get(h.symbol, {})
        mid = Decimal(str(rate_info.get("mid_ngn", 0)))
        ngn_value = (h.balance * mid).quantize(Decimal("0.01"))
        total_ngn_value += ngn_value
        portfolio.append({
            "symbol": h.symbol,
            "name": rate_info.get("name", h.symbol),
            "icon": rate_info.get("icon", ""),
            "balance": str(h.balance),
            "mid_ngn": str(mid),
            "ngn_value": str(ngn_value),
            "change_24h_pct": rate_info.get("change_24h_pct", 0),
        })

    return {
        "holdings": portfolio,
        "total_ngn_value": str(total_ngn_value),
    }


@router.get("/transactions")
def get_crypto_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txns = db.query(CryptoTransaction).filter(
        CryptoTransaction.user_id == current_user.id
    ).order_by(CryptoTransaction.created_at.desc()).limit(50).all()

    return [
        {
            "id": str(t.id),
            "symbol": t.symbol,
            "transaction_type": t.transaction_type,
            "crypto_amount": str(t.crypto_amount),
            "ngn_amount": str(t.ngn_amount),
            "rate": str(t.rate),
            "status": t.status,
            "created_at": t.created_at.isoformat(),
        }
        for t in txns
    ]
