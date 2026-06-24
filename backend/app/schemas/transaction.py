from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
import uuid


class TransferRequest(BaseModel):
    sender_account_id: uuid.UUID
    receiver_account_number: str
    amount: Decimal
    currency: str = "NGN"
    narration: Optional[str] = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    sender_account_id: Optional[uuid.UUID]
    receiver_account_id: Optional[uuid.UUID]
    amount: Decimal
    currency: str
    transaction_type: str
    status: str
    narration: Optional[str]
    fraud_score: Optional[float]
    nip_reference: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TransactionHistoryResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int
