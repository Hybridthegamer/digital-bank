"""Seed script: creates admin + demo customers with funded accounts, crypto holdings, gift cards."""
import sys
import os
import random
import hashlib
import datetime
import decimal
import secrets
import string

sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.gift_card import GiftCard
from app.models.crypto_holding import CryptoHolding
from app.core.security import hash_password
from app.core.encryption import encryption_service

Base.metadata.create_all(bind=engine)

db = SessionLocal()


def gen_account_number():
    return "".join([str(random.randint(0, 9)) for _ in range(10)])


def gen_gift_code(length=20):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_user(full_name, email, phone, bvn_nin, password, role="customer"):
    all_users = db.query(User).all()
    for u in all_users:
        try:
            if encryption_service.decrypt(u.email) == email.lower():
                print(f"  User {email} already exists, skipping.")
                return db.query(Account).filter(Account.user_id == u.id).first(), u
        except Exception:
            pass

    user = User(
        full_name=full_name,
        email=encryption_service.encrypt(email.lower()),
        phone_number=encryption_service.encrypt(phone),
        bvn_nin_hash=hashlib.sha256(bvn_nin.encode()).hexdigest(),
        password_hash=hash_password(password),
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
        balance=decimal.Decimal("500000.0000"),
        currency="NGN",
        is_active=True,
    )
    db.add(account)
    db.flush()

    tx = Transaction(
        receiver_account_id=account.id,
        amount=decimal.Decimal("500000.0000"),
        currency="NGN",
        transaction_type="deposit",
        status="approved",
        narration="Initial seed deposit",
        nip_reference="SEED-INIT-001",
        completed_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(tx)
    db.commit()
    print(f"  Created {role}: {email} | Account: {acct_number} | Balance: NGN 500,000")
    return account, user


print("Seeding database...")

_, admin = create_user("System Administrator", "admin@sdps.ng", "08000000000", "ADM0000000001", "Admin@123456", role="admin")
alice_acct, alice = create_user("Alice Johnson", "alice@example.com", "08012345678", "BVN0000000001", "Alice@123456", role="customer")
bob_acct, bob = create_user("Bob Williams", "bob@example.com", "08098765432", "BVN0000000002", "Bob@123456", role="customer")

# Seed demo crypto holdings for Alice
if alice_acct and alice:
    demo_holdings = [
        ("BTC", decimal.Decimal("0.00250000")),
        ("ETH", decimal.Decimal("0.15000000")),
        ("USDT", decimal.Decimal("5000.00000000")),
        ("SOL", decimal.Decimal("2.50000000")),
    ]
    for symbol, balance in demo_holdings:
        existing = db.query(CryptoHolding).filter(
            CryptoHolding.user_id == alice.id,
            CryptoHolding.symbol == symbol,
        ).first()
        if not existing:
            db.add(CryptoHolding(user_id=alice.id, symbol=symbol, balance=balance))
    db.commit()
    print(f"  Seeded crypto holdings for Alice: BTC, ETH, USDT, SOL")

# Seed demo gift cards
if alice_acct:
    gc_data = [
        (decimal.Decimal("5000"), "N5,000"),
        (decimal.Decimal("10000"), "N10,000"),
    ]
    for amount, label in gc_data:
        code = gen_gift_code()
        existing = db.query(GiftCard).filter(GiftCard.purchased_by_account_id == alice_acct.id).first()
        if not existing:
            db.add(GiftCard(
                code=code,
                amount=amount,
                currency="NGN",
                issuer="SDPS",
                denomination_label=label,
                purchased_by_account_id=alice_acct.id,
                is_redeemed=False,
                expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=365),
            ))
    db.commit()
    print(f"  Seeded demo gift cards for Alice")

print("\nDone!")
print("  Admin:    admin@sdps.ng    / Admin@123456")
print("  Customer: alice@example.com / Alice@123456")
print("  Customer: bob@example.com   / Bob@123456")
db.close()
