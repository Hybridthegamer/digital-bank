from fastapi import APIRouter
import datetime

router = APIRouter(tags=["Health"])


@router.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
