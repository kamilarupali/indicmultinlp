from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.analysis_service import analyze

router = APIRouter(tags=["analysis"])

class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    model_id: str = "baseline"
    target_language: Optional[str] = None
    source_language: Optional[str] = None


@router.post("/analyze")
def analyze_text(body: AnalyzeRequest):
    if not body.text.strip():
        raise HTTPException(422, "Text cannot be blank")
    try:
        return analyze(
            body.text,
            model_id=body.model_id,
            target_language=body.target_language,
            source_language=body.source_language,
        )
    except (ValueError, FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

