SCRIPT_RANGES = {
    "Devanagari": (0x0900, 0x097F),
    "Bengali": (0x0980, 0x09FF),
    "Gurmukhi": (0x0A00, 0x0A7F),
    "Gujarati": (0x0A80, 0x0AFF),
    "Odia": (0x0B00, 0x0B7F),
    "Tamil": (0x0B80, 0x0BFF),
    "Telugu": (0x0C00, 0x0C7F),
    "Kannada": (0x0C80, 0x0CFF),
    "Malayalam": (0x0D00, 0x0D7F),
    "Arabic": (0x0600, 0x06FF),
    "Hangul": (0xAC00, 0xD7AF),
    "Cyrillic": (0x0400, 0x04FF),
    "Hiragana": (0x3040, 0x309F),
    "Katakana": (0x30A0, 0x30FF),
    "CJK": (0x4E00, 0x9FFF),
}


def detect_script(text: str) -> dict:
    counts: dict[str, int] = {}
    for name, (start, end) in SCRIPT_RANGES.items():
        counts[name] = sum(start <= ord(ch) <= end for ch in text)

    # Extended Arabic ranges if any
    counts["Arabic"] += sum(
        (0x0750 <= ord(ch) <= 0x077F) or (0xFB50 <= ord(ch) <= 0xFDFF) or (0xFE70 <= ord(ch) <= 0xFEFF)
        for ch in text
    )
    # Extended Hangul ranges if any
    counts["Hangul"] += sum(
        (0x1100 <= ord(ch) <= 0x11FF) or (0x3130 <= ord(ch) <= 0x318F)
        for ch in text
    )

    counts["Latin"] = sum(
        "LATIN" in __import__("unicodedata").name(ch, "")
        for ch in text
    )

    if counts.get("Hiragana", 0) > 0 or counts.get("Katakana", 0) > 0:
        counts["Japanese"] = counts.get("Hiragana", 0) + counts.get("Katakana", 0)

    present = [name for name, count in counts.items() if count > 0]
    primary_candidates = {k: v for k, v in counts.items() if k not in {"Hiragana", "Katakana"}}
    total = sum(primary_candidates.values())
    primary = max(primary_candidates, key=primary_candidates.get) if total else "Unknown"

    return {
        "primary": primary,
        "scripts": present or ["Unknown"],
        "counts": counts,
    }



