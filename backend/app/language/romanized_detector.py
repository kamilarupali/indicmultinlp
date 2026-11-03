from app.language.language_detector import ROMAN_CUES

INDIC_ROMAN_CUES = (
    ROMAN_CUES.get("Telugu", set())
    | ROMAN_CUES.get("Hindi", set())
    | ROMAN_CUES.get("Tamil", set())
    | ROMAN_CUES.get("Kannada", set())
)

def is_romanized(text: str) -> bool:
    words = {w.strip(".,!?:;\"'()[]{}").lower() for w in text.split() if w.strip()}
    return bool(words & INDIC_ROMAN_CUES)

