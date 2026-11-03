from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.translation_service import translate_meaning, get_all_multilingual_meanings

router = APIRouter(tags=["translation"])


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    target_language: str = "en"
    source_language: Optional[str] = "auto"


class MultilingualRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


@router.post("/translate")
def translate_endpoint(body: TranslateRequest):
    if not body.text.strip():
        raise HTTPException(422, "Text cannot be blank")
    try:
        return translate_meaning(body.text, body.target_language, body.source_language)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/translate/multilingual")
def multilingual_endpoint(body: MultilingualRequest):
    if not body.text.strip():
        raise HTTPException(422, "Text cannot be blank")
    try:
        return get_all_multilingual_meanings(body.text)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

