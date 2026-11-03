import re
import unicodedata

ABBREVIATIONS = {
    "dr.", "mr.", "ms.", "mrs.", "prof.", "i.e.", "e.g.", "vs.", "etc.", "st.", "jr.", "sr.",
    "shri.", "smt.", "rs.",
}


def split_sentences(text: str) -> list[str]:
    """Segment long text or paragraphs into individual sentences.
    
    Supports:
    - Indic punctuation: Devanagari/Bengali danda (।) and double danda (॥)
    - Standard punctuation: Period (.), exclamation mark (!), question mark (?)
    - Paragraph newlines
    - Preserves abbreviations (Dr., Mr., etc.) and decimal numbers.
    """
    if not text or not text.strip():
        return []

    cleaned = text.strip()

    # Normalize carriage returns
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")

    # Temporary mask for abbreviations and numbers
    # Protect decimal numbers (e.g. 3.14)
    protected = re.sub(r"(\d+)\.(\d+)", r"\1__DECIMAL_DOT__\2", cleaned)

    # Protect common abbreviations
    for ab in ABBREVIATIONS:
        # Case insensitive substitution preserving original matched casing
        pattern = re.compile(re.escape(ab), re.IGNORECASE)
        protected = pattern.sub(lambda m: m.group(0).replace(".", "__ABBR_DOT__"), protected)

    # Split on sentence boundaries: Indic danda, punctuation followed by space or newline, or double newline
    chunks = re.split(r"(?<=[.!?।॥])\s+|\n+", protected)

    sentences: list[str] = []
    for chunk in chunks:
        # Restore masked dots
        restored = chunk.replace("__DECIMAL_DOT__", ".").replace("__ABBR_DOT__", ".")
        restored = restored.strip()
        if restored:
            sentences.append(restored)

    return sentences if sentences else [cleaned]


def tokenize(text: str) -> list[str]:
    tokens: list[str] = []
    current: list[str] = []
    for ch in text:
        cat = unicodedata.category(ch)
        if cat[0] in ("L", "M", "N") or ch == "_":
            current.append(ch)
        elif cat[0] == "Z" or ch in "\t\n\r":
            if current:
                tokens.append("".join(current))
                current = []
        else:
            if current:
                tokens.append("".join(current))
                current = []
            tokens.append(ch)
    if current:
        tokens.append("".join(current))
    return tokens