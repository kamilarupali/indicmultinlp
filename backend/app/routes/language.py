from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.language.language_detector import detect_language
from app.language.script_detector import detect_script
from app.language.code_mixing import detect_code_mixing
from app.language.romanized_detector import is_romanized

router = APIRouter(tags=["language"])
class TextRequest(BaseModel): text: str = Field(min_length=1, max_length=5000)

@router.post("/language")
def language(body: TextRequest):
    return {"language": detect_language(body.text), "script": detect_script(body.text), "romanized": is_romanized(body.text), "code_mixing": detect_code_mixing(body.text)}

