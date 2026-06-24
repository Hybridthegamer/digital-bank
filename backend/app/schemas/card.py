from pydantic import BaseModel
from datetime import datetime
import uuid


class CardCreate(BaseModel):
    account_id: uuid.UUID
    pan: str
    card_type: str
    expiry_month: int
    expiry_year: int


class CardResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    masked_pan: str
    card_type: str
    expiry_month: int
    expiry_year: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
