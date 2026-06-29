from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.db.session import engine
from app.db.base import Base
from app.api import auth, accounts, payments, cards, admin, health, giftcards, crypto

# Import all models so Alembic detects them
from app.models import user, account, transaction, payment_card, token_vault, audit_log, fraud_alert, gift_card, crypto_holding, crypto_transaction  # noqa


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist (for dev; use Alembic for prod)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Secure Digital Payment System (SDPS)",
    description="A secure, microservices-based digital payment platform implementing AES-256-GCM encryption, RS256 JWT auth, TOTP MFA, and ML-based fraud detection.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "type": "https://tools.ietf.org/html/rfc7807",
            "title": "Validation Error",
            "status": 422,
            "detail": exc.errors(),
            "instance": str(request.url),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "type": "https://tools.ietf.org/html/rfc7807",
            "title": "Internal Server Error",
            "status": 500,
            "detail": "An unexpected error occurred.",
            "instance": str(request.url),
        },
    )


PREFIX = "/api/v1"
app.include_router(health.router)
app.include_router(auth.router, prefix=PREFIX)
app.include_router(accounts.router, prefix=PREFIX)
app.include_router(payments.router, prefix=PREFIX)
app.include_router(cards.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)
app.include_router(giftcards.router, prefix=PREFIX)
app.include_router(crypto.router, prefix=PREFIX)
