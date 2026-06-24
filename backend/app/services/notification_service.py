import logging
from typing import Optional

logger = logging.getLogger(__name__)


class NotificationService:
    def send_transaction_notification(
        self,
        user_email: str,
        transaction_id: str,
        amount: str,
        currency: str,
        status: str,
        narration: Optional[str] = None,
    ):
        logger.info(
            "[EMAIL NOTIFICATION] To: %s | Transaction %s: %s %s - %s | Narration: %s",
            user_email,
            transaction_id,
            currency,
            amount,
            status,
            narration,
        )

    def send_registration_notification(self, user_email: str, full_name: str):
        logger.info(
            "[EMAIL NOTIFICATION] Welcome %s (%s) - Account registered",
            full_name,
            user_email,
        )

    def send_mfa_setup_notification(self, user_email: str):
        logger.info("[EMAIL NOTIFICATION] MFA enabled for %s", user_email)

    def send_fraud_alert_notification(
        self, user_email: str, transaction_id: str, score: float
    ):
        logger.info(
            "[FRAUD ALERT EMAIL] To: %s | Suspicious transaction %s flagged with score %.2f",
            user_email,
            transaction_id,
            score,
        )


notification_service = NotificationService()
