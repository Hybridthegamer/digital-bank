import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)      # AES-256-GCM encrypted
    phone_number = Column(String, nullable=True)              # AES-256-GCM encrypted
    bvn_nin_hash = Column(String, nullable=True)              # SHA-256 hash of BVN/NIN
    password_hash = Column(String, nullable=False)            # bcrypt cost=12
    totp_secret = Column(String, nullable=True)               # AES-256-GCM encrypted
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    role = Column(String, default="customer")                 # customer / merchant / admin
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
