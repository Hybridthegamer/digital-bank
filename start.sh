#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[SDPS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

info "============================================="
info " Secure Digital Payment System (SDPS)"
info " Demo Startup Script"
info "============================================="

# Check Docker
command -v docker >/dev/null 2>&1 || error "Docker not found. Install Docker Desktop from https://docker.com/products/docker-desktop"
docker info >/dev/null 2>&1 || error "Docker daemon is not running. Please start Docker Desktop."

# Check docker compose (v2 plugin or v1 standalone)
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    error "docker compose not found. Install Docker Desktop >= 3.6 which bundles Compose v2."
fi
info "Using: $DC"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Stop any existing containers
info "Stopping any existing containers..."
$DC down --remove-orphans 2>/dev/null || true

# Build images
info "Building images (first run may take a few minutes)..."
$DC build

# Start services
info "Starting services..."
$DC up -d

# Wait for backend to be healthy
info "Waiting for backend to be ready..."
TRIES=0
MAX=40
until curl -sf http://localhost:8000/health >/dev/null 2>&1; do
    TRIES=$((TRIES+1))
    if [ $TRIES -ge $MAX ]; then
        warn "Backend didn't respond after ${MAX} attempts. Check logs: $DC logs backend"
        break
    fi
    printf "."
    sleep 3
done
echo ""

# Run database migrations
info "Running database migrations..."
$DC exec -T backend alembic upgrade head 2>&1 | tail -5 || warn "Migration may have already run"

# Seed demo data
info "Seeding demo data..."
$DC exec -T backend python seed.py 2>&1 || warn "Seed may have already run (safe to ignore)"

info "============================================="
info " SDPS is ready!"
info ""
info " Frontend:  http://localhost:5173"
info " Backend:   http://localhost:8000"
info " API Docs:  http://localhost:8000/docs"
info ""
info " Demo Credentials:"
info "   Admin:    admin@sdps.ng    / Admin@123456"
info "   Customer: alice@example.com / Alice@123456"
info "   Customer: bob@example.com   / Bob@123456"
info ""
info " Stop:  $DC down"
info " Logs:  $DC logs -f"
info "============================================="
