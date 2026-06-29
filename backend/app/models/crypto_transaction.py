import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class CryptoTransaction(Base):
    __tablename__ = "crypto_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    symbol = Column(String(10), nullable=False)
    transaction_type = Column(String(10), nullable=False)   # buy / sell
    crypto_amount = Column(Numeric(28, 8), nullable=False)
    ngn_amount = Column(Numeric(19, 4), nullable=False)
    rate = Column(Numeric(19, 4), nullable=False)           # NGN per 1 unit
    status = Column(String(20), default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
