from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
import uuid


class AccountCreate(BaseModel):
    account_type: str = "savings"
    currency: str = "NGN"


class AccountFund(BaseModel):
    amount: Decimal


class AccountResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    account_number: str
    account_type: str
    balance: Decimal
    currency: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
