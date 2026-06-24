from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid


class UserAdminResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone_number: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    mfa_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserStatusUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None


class FraudAlertResponse(BaseModel):
    id: uuid.UUID
    transaction_id: uuid.UUID
    risk_score: float
    alert_type: str
    status: str
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class FraudAlertUpdate(BaseModel):
    status: str  # resolved / dismissed


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    transaction_id: Optional[uuid.UUID]
    event_type: str
    event_detail: Optional[dict]
    ip_address: Optional[str]
    hmac_signature: str
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_users: int
    total_transactions: int
    total_fraud_alerts: int
    pending_alerts: int
    total_volume: float
