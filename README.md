# Secure Digital Payment System (SDPS)

A fully-featured, security-first digital payment platform developed as a Final Year Project (FYP) in partial fulfilment of a Bachelor of Science degree in Computer Science. The system demonstrates modern cryptographic best practices, microservices-inspired architecture, machine learning-based fraud detection, and regulatory-compliant payment security.

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Requirements](#system-requirements)
- [Quick Start (Docker)](#quick-start-docker)
- [Manual Setup](#manual-setup)
- [Tool Stack & Rationale](#tool-stack--rationale)
- [Security Architecture](#security-architecture)
- [API Documentation](#api-documentation)
- [Demo Credentials](#demo-credentials)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Project Overview

The SDPS implements all functional and non-functional requirements specified in Chapters 1–3 of the FYP documentation:

| Requirement | Implementation |
|---|---|
| FR-01: User registration with BVN/NIN | SHA-256 hashed identity verification |
| FR-02: MFA authentication | Password + TOTP (RFC 6238) via pyotp |
| FR-03: Wallet-to-wallet transfers | Full transfer pipeline with balance update |
| FR-04: PAN tokenisation | EMVCo-style DRBG 16-digit token generation |
| FR-05: AES-256-GCM encryption | All sensitive fields encrypted at rest |
| FR-06: ML fraud scoring | IsolationForest + rule-based hybrid (0–1 score) |
| FR-07: Transaction notifications | Email simulation with structured logging |
| FR-08: Transaction history with filters | Paginated API with status/amount/type filters |
| FR-09: Admin user & fraud management | Full admin console with audit reports |
| FR-10: Tamper-evident audit logs | HMAC-SHA256 signed audit log entries |

---

## System Requirements

### Docker (Recommended)
- **Docker Desktop** ≥ 24.0 or **Docker Engine** ≥ 24.0
- **Docker Compose** ≥ 2.20
- At least **2 GB RAM** available to Docker

### Manual Setup
- **Python** 3.11+
- **Node.js** 20+ and npm 10+
- **PostgreSQL** 16+
- **Redis** 7+

---

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/hybridthegamer/digital-bank.git
cd digital-bank

# 2. Start all services (PostgreSQL, Redis, backend, frontend)
docker-compose up --build

# 3. Wait ~60 seconds for services to be healthy and seed data to load
# Backend API:   http://localhost:8000
# Frontend:      http://localhost:5173
# API Docs:      http://localhost:8000/docs
```

The startup sequence automatically:
1. Runs Alembic database migrations
2. Seeds an admin account and two demo customer accounts
3. Starts the FastAPI backend with uvicorn
4. Starts the Vite dev server for the React frontend

---

## Manual Setup

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate       # Linux/macOS
# .venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your PostgreSQL and Redis connection strings

# Run database migrations
alembic upgrade head

# Seed demo data
python seed.py

# Start the development server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Accessible at http://localhost:5173
```

---

## Tool Stack & Rationale

### Backend: Python 3.11 + FastAPI

**Why Python?** Python's mature cryptographic ecosystem (`cryptography`, `passlib`, `pyotp`) provides battle-tested implementations of AES-GCM, bcrypt, and TOTP — avoiding the risk of implementing these primitives from scratch. Python also hosts `scikit-learn`, essential for the ML fraud detection engine.

**Why FastAPI?** FastAPI was selected over Flask and Django REST Framework for three reasons: (1) native async support reduces I/O latency for concurrent payment requests; (2) automatic OpenAPI/Swagger documentation accelerates Chapter 4 testing; (3) Pydantic v2 enforces input validation at the schema layer, directly implementing OWASP Input Validation recommendations cited in Chapter 3.

### Database: PostgreSQL 16 + SQLAlchemy + Alembic

**Why PostgreSQL?** PostgreSQL's `DECIMAL(19,4)` type prevents floating-point rounding errors in monetary arithmetic — a requirement explicitly stated in Section 3.10.2. Its UUID extension supports RFC 4122 v4 primary keys (per Section 3.10.2), and JSON column support stores structured audit event details.

**Why SQLAlchemy + Alembic?** SQLAlchemy provides a Pythonic ORM that maps cleanly to the class diagram in Section 3.8. Alembic's migration system enables database schema versioning, critical for demonstrating Agile sprint-based iterative development (Section 3.2).

### Cache: Redis 7

**Why Redis?** The session management algorithm (Section 3.13.3) requires server-side refresh token storage to support revocation. Redis's TTL-based key expiry perfectly models the 24-hour refresh token lifetime, and its O(1) `GET`/`SET`/`DEL` operations ensure sub-millisecond token validation.

### Authentication: JWT RS256 + bcrypt + pyotp

**Why RS256 over HS256?** Section 3.13.3 explicitly specifies "JWT signed with RS256 using a 2048-bit RSA key pair." RS256's asymmetric scheme means microservices can verify tokens using only the public key, without exposing the signing secret — a zero-trust principle from Section 3.5.

**Why bcrypt cost factor 12?** Section 3.10.1 specifies `bcrypt, cost factor 12`, matching NIST SP 800-63B's recommendation for memory-hard password hashing.

**Why pyotp?** Implements RFC 6238 TOTP exactly as specified in FR-02 and Section 3.13.3, producing 6-digit time-based codes compatible with Google Authenticator and Authy.

### Encryption: `cryptography` library (AES-256-GCM)

**Why AES-256-GCM?** Section 3.5 and FR-05 mandate AES-256-GCM for data at rest. GCM mode provides both confidentiality and authenticated encryption (AEAD), detecting tampering without a separate MAC step. The `cryptography` library (by the Python Cryptographic Authority) is audited and FIPS-compliant.

### Fraud Detection: scikit-learn IsolationForest + Rule Engine

**Why IsolationForest?** The unsupervised IsolationForest isolates anomalous transactions by recursively partitioning the feature space — transactions that require fewer splits to isolate receive higher anomaly scores. It handles the class imbalance problem inherent in fraud datasets (discussed in Section 2.2.6) without requiring labelled fraud data, making it suitable for a development context without a real transaction dataset.

The rule-based boosting layer (Section 3.13.2) adds domain-specific signals: high-value amounts (>₦500,000), rapid successive transactions (<30s), and new beneficiaries — directly implementing the thresholds specified in the FYP.

### Frontend: React 18 + TypeScript + Tailwind CSS + Vite

**Why React 18?** React's component model maps cleanly to the UI use cases defined in the Use Case Diagram (Section 3.6). Hooks and Zustand state management simplify the two-step MFA login flow.

**Why TypeScript?** Type safety at the API boundary prevents runtime errors from malformed payment data — a form of defence-in-depth at the client layer.

**Why Tailwind CSS?** Utility-first CSS eliminates the need for a separate CSS bundle while providing responsive design out of the box — appropriate for both web and mobile-accessible use cases (Section 3.5).

**Why Vite?** Vite's native ESM dev server with HMR provides instant feedback during development. Its proxy configuration routes `/api` requests to the backend, avoiding CORS issues in development without requiring backend changes.

### Containerisation: Docker + Docker Compose

**Why Docker?** Containerisation ensures the system runs identically across development, testing, and evaluation environments — directly supporting the Chapter 5 testing and evaluation methodology. Health checks on PostgreSQL and Redis ensure the backend only starts after its dependencies are ready.

---

## Security Architecture

```
Client (HTTPS/TLS 1.3)
        │
   API Gateway (FastAPI)
        │
   ┌────┴──────────────────────────────────────┐
   │              Security Layer               │
   │  ┌─────────────┐  ┌────────────────────┐  │
   │  │ JWT RS256   │  │  AES-256-GCM       │  │
   │  │ Auth        │  │  Encryption Svc    │  │
   │  └─────────────┘  └────────────────────┘  │
   │  ┌─────────────┐  ┌────────────────────┐  │
   │  │ TOTP MFA    │  │  IsolationForest   │  │
   │  │ (RFC 6238)  │  │  Fraud Engine      │  │
   │  └─────────────┘  └────────────────────┘  │
   │  ┌─────────────┐  ┌────────────────────┐  │
   │  │ PAN         │  │  HMAC-SHA256       │  │
   │  │ Tokenisation│  │  Audit Logger      │  │
   │  └─────────────┘  └────────────────────┘  │
   └───────────────────────────────────────────┘
        │
   ┌────┴──────────┐
   │  Data Layer   │
   │  PostgreSQL   │  — encrypted fields (AES-256-GCM)
   │  Redis        │  — refresh tokens (TTL 24h)
   └───────────────┘
```

### Fraud Decision Thresholds

| Score Range | Decision | Action |
|---|---|---|
| 0.00 – 0.39 | `approve` | Transaction automatically approved |
| 0.40 – 0.74 | `step_up` | Approved with step-up auth flag |
| 0.75 – 1.00 | `flag` | Held for analyst review; FraudAlert created |

---

## API Documentation

Interactive Swagger UI: **http://localhost:8000/docs**

ReDoc: **http://localhost:8000/redoc**

### Core Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login (returns MFA flag or tokens) |
| POST | `/api/v1/auth/login/mfa` | Complete MFA login with TOTP |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| POST | `/api/v1/auth/totp/setup` | Generate TOTP secret + QR URI |
| POST | `/api/v1/auth/totp/verify` | Enable MFA after verifying code |
| GET | `/api/v1/accounts/` | List accounts |
| POST | `/api/v1/accounts/{id}/fund` | Simulate deposit |
| POST | `/api/v1/payments/transfer` | Initiate transfer |
| GET | `/api/v1/payments/history` | Transaction history (filterable) |
| POST | `/api/v1/cards/` | Tokenise and add card |
| GET | `/api/v1/admin/dashboard` | System statistics (admin) |
| GET | `/api/v1/admin/fraud-alerts` | Fraud alert queue (admin) |
| GET | `/api/v1/admin/audit-logs` | Audit log viewer (admin) |

---

## Demo Credentials

After running `docker-compose up`, the following accounts are available:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sdps.ng` | `Admin@123456` |
| Customer | `alice@example.com` | `Alice@123456` |
| Customer | `bob@example.com` | `Bob@123456` |

Each demo account is pre-funded with ₦100,000. To test a transfer, log in as Alice and send to Bob's account number (visible in the Dashboard).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://sdps:sdpspass123@postgres:5432/sdps` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `SECRET_KEY` | *(dev default)* | HMAC-SHA256 key for audit log signatures |
| `ENCRYPTION_KEY` | *(dev default)* | Base64-encoded 32-byte AES key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_HOURS` | `24` | Refresh token lifetime |
| `FRAUD_THRESHOLD_LOW` | `0.40` | Below this: auto-approve |
| `FRAUD_THRESHOLD_HIGH` | `0.75` | Above this: flag for review |

Generate a secure encryption key:
```bash
python3 -c "import base64, os; print(base64.b64encode(os.urandom(32)).decode())"
```

---

## Project Structure

```
digital-bank/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (auth, accounts, payments, cards, admin)
│   │   ├── core/         # Security, encryption, fraud engine, audit logger, tokenisation
│   │   ├── models/       # SQLAlchemy ORM models (7 entities)
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Notification service
│   │   ├── db/           # Database session and base model
│   │   └── main.py       # FastAPI application entry point
│   ├── alembic/          # Database migrations
│   ├── seed.py           # Demo data seeder
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios client with token refresh interceptor
│   │   ├── components/   # Layout, ProtectedRoute
│   │   ├── pages/        # Login, Register, Dashboard, Transfer, History, Cards, MFA, Admin
│   │   ├── store/        # Zustand auth state
│   │   └── types/        # TypeScript interfaces
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

*Developed in accordance with Agile Software Development Methodology (Beck et al., 2001) as specified in Chapter 3, Section 3.2.*
