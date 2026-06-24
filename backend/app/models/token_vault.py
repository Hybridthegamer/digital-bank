import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class TokenVault(Base):
    __tablename__ = "token_vault"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_pan = Column(String(16), nullable=False, unique=True)
    encrypted_pan = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
