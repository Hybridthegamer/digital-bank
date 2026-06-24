import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    receiver_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    amount = Column(Numeric(19, 4), nullable=False)
    currency = Column(String, default="NGN")
    transaction_type = Column(String, nullable=False)  # transfer / deposit / withdrawal
    status = Column(String, default="pending")          # pending / approved / declined / flagged
    narration = Column(String, nullable=True)
    fraud_score = Column(Float, nullable=True)
    nip_reference = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
