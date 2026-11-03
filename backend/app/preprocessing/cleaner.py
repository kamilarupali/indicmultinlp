import re

def clean_text(text: str) -> str:
    text = re.sub(r"https?://\S+|www\.\S+", " URL ", text)
    text = re.sub(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f]", " ", text)
    return re.sub(r"\s+", " ", text).strip()

