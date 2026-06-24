import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.fraud_alert import FraudAlert
from app.core.encryption import encryption_service
from app.core.fraud import fraud_engine
from app.core.audit import audit_logger


class PaymentService:
    def transfer(
        self,
        sender_account_id: str,
        receiver_account_number: str,
        amount: Decimal,
        currency: str,
        narration: str,
        user_id: str,
        ip: str,
        db: Session,
    ) -> dict:
        # Validate sender
        sender = (
            db.query(Account)
            .filter(
                Account.id == sender_account_id,
                Account.user_id == user_id,
                Account.is_active == True,
            )
            .first()
        )
        if not sender:
            raise HTTPException(status_code=404, detail="Sender account not found")

        if Decimal(str(sender.balance)) < amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")

        # Locate receiver account by decrypting stored account numbers
        receiver = None
        all_accounts = db.query(Account).filter(Account.is_active == True).all()
        for acct in all_accounts:
            try:
                decrypted_number = encryption_service.decrypt(acct.account_number)
                if decrypted_number == receiver_account_number:
                    receiver = acct
                    break
            except Exception:
                continue

        if not receiver:
            raise HTTPException(status_code=404, detail="Receiver account not found")

        if str(receiver.id) == str(sender_account_id):
            raise HTTPException(status_code=400, detail="Cannot transfer to same account")

        # Fraud feature engineering
        last_tx = (
            db.query(Transaction)
            .filter(Transaction.sender_account_id == sender_account_id)
            .order_by(Transaction.created_at.desc())
            .first()
        )
        if last_tx and last_tx.created_at:
            last_dt = last_tx.created_at
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            time_since = (datetime.now(timezone.utc) - last_dt).total_seconds()
        else:
            time_since = 999_999.0

        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        tx_count = (
            db.query(Transaction)
            .filter(
                Transaction.sender_account_id == sender_account_id,
                Transaction.created_at >= one_hour_ago,
            )
            .count()
        )

        previous_to_receiver = (
            db.query(Transaction)
            .filter(
                Transaction.sender_account_id == sender_account_id,
                Transaction.receiver_account_id == receiver.id,
            )
            .count()
        )
        is_new_beneficiary = previous_to_receiver == 0

        fraud_score = fraud_engine.score_transaction(
            amount=float(amount),
            time_since_last_tx=time_since,
            is_new_beneficiary=is_new_beneficiary,
            tx_count_last_hour=tx_count,
        )
        decision = fraud_engine.get_decision(fraud_score)

        nip_ref = str(uuid.uuid4()).replace("-", "")[:20].upper()

        if decision in ("approve", "step_up"):
            tx_status = "approved"
        else:
            tx_status = "flagged"

        transaction = Transaction(
            sender_account_id=sender.id,
            receiver_account_id=receiver.id,
            amount=amount,
            currency=currency,
            transaction_type="transfer",
            status=tx_status,
            narration=narration,
            fraud_score=fraud_score,
            nip_reference=nip_ref,
            completed_at=datetime.now(timezone.utc) if tx_status == "approved" else None,
        )
        db.add(transaction)
        db.flush()

        if tx_status == "approved":
            sender.balance = Decimal(str(sender.balance)) - amount
            receiver.balance = Decimal(str(receiver.balance)) + amount

        if fraud_score >= 0.75:
            alert = FraudAlert(
                transaction_id=transaction.id,
                risk_score=fraud_score,
                alert_type="high_risk_transfer",
                status="pending",
            )
            db.add(alert)

        db.commit()
        db.refresh(transaction)

        audit_logger.log(
            event_type="TRANSACTION_CREATED",
            detail_dict={
                "transaction_id": str(transaction.id),
                "amount": str(amount),
                "currency": currency,
                "status": tx_status,
                "fraud_score": fraud_score,
                "decision": decision,
            },
            db=db,
            user_id=user_id,
            transaction_id=str(transaction.id),
            ip=ip,
        )

        return {
            "transaction": transaction,
            "fraud_score": fraud_score,
            "decision": decision,
        }


payment_service = PaymentService()
