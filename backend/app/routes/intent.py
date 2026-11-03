from fastapi import APIRouter
from app.routes.language import TextRequest
from app.services.intent_service import predict_intent

router = APIRouter(tags=["intent"])
@router.post("/intent")
def intent(body: TextRequest): return predict_intent(body.text)

