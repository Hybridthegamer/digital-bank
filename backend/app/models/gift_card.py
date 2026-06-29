import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class GiftCard(Base):
    __tablename__ = "gift_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), nullable=False, unique=True)
    amount = Column(Numeric(19, 4), nullable=False)
    currency = Column(String(3), default="NGN")
    issuer = Column(String(50), nullable=False)          # iTunes, Amazon, etc.
    denomination_label = Column(String(20), nullable=True)
    purchased_by_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    redeemed_by_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    is_redeemed = Column(Boolean, default=False)
    redeemed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
