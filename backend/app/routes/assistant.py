from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.assistant_service import process_voice_query

router = APIRouter(tags=["assistant"])


class AssistantRequest(BaseModel):
    query: str = Field(min_length=1, max_length=5000)
    target_language: Optional[str] = "en"
    source_language: Optional[str] = None
    context: Optional[dict] = None
    model_id: Optional[str] = "baseline"


@router.post("/assistant")
def assistant_endpoint(body: AssistantRequest):
    if not body.query.strip():
        raise HTTPException(422, "Query cannot be blank")
    try:
        return process_voice_query(
            body.query,
            target_language=body.target_language or "en",
            source_language=body.source_language,
            context=body.context,
            active_model=body.model_id or "baseline",
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

