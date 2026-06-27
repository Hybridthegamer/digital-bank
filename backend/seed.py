"""Seed script: creates admin user + demo customer with funded account."""
import sys
import os
import random
import hashlib
import datetime
import decimal

sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.core.security import hash_password
from app.core.encryption import encryption_service

Base.metadata.create_all(bind=engine)

db = SessionLocal()

def gen_account_number():
    return "".join([str(random.randint(0, 9)) for _ in range(10)])

def create_user(full_name, email, phone, bvn_nin, password, role="customer"):
    all_users = db.query(User).all()
    for u in all_users:
        try:
            if encryption_service.decrypt(u.email) == email.lower():
                print(f"  User {email} already exists, skipping.")
                return u
        except Exception:
            pass

    user = User(
        full_name=full_name,
        email=encryption_service.encrypt(email.lower()),
        phone_number=encryption_service.encrypt(phone),
        bvn_nin_hash=hashlib.sha256(bvn_nin.encode()).hexdigest(),
        password_hash=hash_password(password[:72]),
        is_verified=True,
        is_active=True,
        role=role,
    )
    db.add(user)
    db.flush()

    acct_number = gen_account_number()
    account = Account(
        user_id=user.id,
        account_number=encryption_service.encrypt(acct_number),
        account_type="savings",
        balance=decimal.Decimal("100000.0000"),
        currency="NGN",
        is_active=True,
    )
    db.add(account)
    db.flush()

    # Seed deposit transaction
    tx = Transaction(
        receiver_account_id=account.id,
        amount=decimal.Decimal("100000.0000"),
        currency="NGN",
        transaction_type="deposit",
        status="approved",
        narration="Initial seed deposit",
        nip_reference="SEED-INIT-001",
        completed_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(tx)
    db.commit()
    print(f"  Created {role}: {email} | Account: {acct_number} | Balance: NGN 100,000")
    return user


print("Seeding database...")
create_user("System Administrator", "admin@sdps.ng", "08000000000", "ADM0000000001", "Admin@123456", role="admin")
create_user("Alice Johnson", "alice@example.com", "08012345678", "BVN0000000001", "Alice@123456", role="customer")
create_user("Bob Williams", "bob@example.com", "08098765432", "BVN0000000002", "Bob@123456", role="customer")
print("Done. Login with admin@sdps.ng / Admin@123456 or alice@example.com / Alice@123456")
db.close()
