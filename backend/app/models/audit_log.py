import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True)
    event_type = Column(String, nullable=False)
    event_detail = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    hmac_signature = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
