import unicodedata

def normalize(text: str) -> str:
    return unicodedata.normalize("NFC", text).strip()

