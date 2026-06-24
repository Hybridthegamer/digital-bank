import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.audit_log import AuditLog


class AuditLogger:
    def _compute_hmac(self, event_type: str, detail_json: str, timestamp: str) -> str:
        message = f"{event_type}|{detail_json}|{timestamp}".encode("utf-8")
        key = settings.SECRET_KEY.encode("utf-8")
        return hmac.new(key, message, hashlib.sha256).hexdigest()

    def log(
        self,
        event_type: str,
        detail_dict: dict,
        db: Session,
        user_id: Optional[str] = None,
        transaction_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> AuditLog:
        timestamp = datetime.now(timezone.utc).isoformat()
        detail_json = json.dumps(detail_dict, default=str)
        hmac_sig = self._compute_hmac(event_type, detail_json, timestamp)

        log_entry = AuditLog(
            user_id=user_id,
            transaction_id=transaction_id,
            event_type=event_type,
            event_detail=detail_dict,
            ip_address=ip,
            hmac_signature=hmac_sig,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry


audit_logger = AuditLogger()
