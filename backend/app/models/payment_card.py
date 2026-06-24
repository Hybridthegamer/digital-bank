import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class PaymentCard(Base):
    __tablename__ = "payment_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    token_vault_id = Column(UUID(as_uuid=True), ForeignKey("token_vault.id"), nullable=False)
    masked_pan = Column(String, nullable=False)
    card_type = Column(String, nullable=False)   # visa / mastercard / verve
    expiry_month = Column(Integer, nullable=False)
    expiry_year = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
