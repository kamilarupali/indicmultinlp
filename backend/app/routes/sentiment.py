from fastapi import APIRouter
from app.routes.language import TextRequest
from app.services.sentiment_service import predict_sentiment

router = APIRouter(tags=["sentiment"])
@router.post("/sentiment")
def sentiment(body: TextRequest): return predict_sentiment(body.text)

