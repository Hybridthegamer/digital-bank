import uuid, datetime
from typing import Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.fraud_alert import FraudAlert
from app.models.audit_log import AuditLog
from app.schemas.admin import UserStatusUpdate, FraudAlertUpdate
from app.core.encryption import encryption_service
from app.core.audit import audit_logger
from app.api.deps import get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin"])


def _decrypt_user(u: User) -> dict:
    try:
        email = encryption_service.decrypt(u.email)
    except Exception:
        email = "[encrypted]"
    try:
        phone = encryption_service.decrypt(u.phone_number) if u.phone_number else None
    except Exception:
        phone = None
    return {
        "id": str(u.id),
        "full_name": u.full_name,
        "email": email,
        "phone_number": phone,
        "role": u.role,
        "is_active": u.is_active,
        "is_verified": u.is_verified,
        "mfa_enabled": u.mfa_enabled,
        "created_at": u.created_at.isoformat(),
    }


@router.get("/dashboard", summary="Admin dashboard statistics")
def dashboard(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_txs = db.query(Transaction).count()
    total_alerts = db.query(FraudAlert).count()
    pending_alerts = db.query(FraudAlert).filter(FraudAlert.status == "pending").count()

    vol_result = db.query(func.sum(Transaction.amount)).filter(
        Transaction.status == "approved"
    ).scalar()
    total_volume = float(vol_result or 0)

    return {
        "total_users": total_users,
        "total_transactions": total_txs,
        "total_fraud_alerts": total_alerts,
        "pending_alerts": pending_alerts,
        "total_volume": total_volume,
    }


@router.get("/users", summary="List all users")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    total = db.query(User).count()
    users = db.query(User).order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [_decrypt_user(u) for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch("/users/{user_id}", summary="Update user status or role")
def update_user(
    user_id: uuid.UUID,
    payload: UserStatusUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role
    db.commit()

    audit_logger.log(
        "ADMIN_USER_UPDATE",
        {"target_user_id": str(user_id), "changes": payload.model_dump(exclude_none=True)},
        db, user_id=str(admin.id),
    )
    return _decrypt_user(user)


@router.get("/fraud-alerts", summary="List fraud alerts")
def list_fraud_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    q = db.query(FraudAlert)
    if status_filter:
        q = q.filter(FraudAlert.status == status_filter)
    total = q.count()
    items = q.order_by(FraudAlert.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [
            {
                "id": str(a.id),
                "transaction_id": str(a.transaction_id),
                "risk_score": a.risk_score,
                "alert_type": a.alert_type,
                "status": a.status,
                "resolved_by": str(a.resolved_by) if a.resolved_by else None,
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
                "created_at": a.created_at.isoformat(),
            }
            for a in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch("/fraud-alerts/{alert_id}", summary="Resolve or dismiss fraud alert")
def update_fraud_alert(
    alert_id: uuid.UUID,
    payload: FraudAlertUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    alert = db.query(FraudAlert).filter(FraudAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if payload.status not in ("resolved", "dismissed"):
        raise HTTPException(status_code=400, detail="Status must be 'resolved' or 'dismissed'")

    alert.status = payload.status
    alert.resolved_by = admin.id
    alert.resolved_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    audit_logger.log(
        "FRAUD_ALERT_UPDATED",
        {"alert_id": str(alert_id), "new_status": payload.status},
        db, user_id=str(admin.id),
    )
    return {"id": str(alert.id), "status": alert.status, "resolved_at": alert.resolved_at.isoformat()}


@router.get("/audit-logs", summary="Paginated audit logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    event_type: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if event_type:
        q = q.filter(AuditLog.event_type == event_type)
    total = q.count()
    items = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [
            {
                "id": str(a.id),
                "user_id": str(a.user_id) if a.user_id else None,
                "transaction_id": str(a.transaction_id) if a.transaction_id else None,
                "event_type": a.event_type,
                "event_detail": a.event_detail,
                "ip_address": a.ip_address,
                "hmac_signature": a.hmac_signature,
                "created_at": a.created_at.isoformat(),
            }
            for a in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
