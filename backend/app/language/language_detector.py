"""IndicMultiNLP Multilingual and Multi-Script Language Identification Service.

Supports:
- Native Indic scripts: Telugu, Devanagari (Hindi/Marathi), Tamil, Kannada, Bengali,
  Gurmukhi (Punjabi), Gujarati, Malayalam, Odia, Arabic/Perso-Arabic (Urdu).
- Romanized Indic forms (Hinglish, Tenglish, Tanglish, Kanglish, etc.) written in Latin script.
- Code-mixed sentences across native scripts and Latin alphabet.
- Named entity handling: prevents proper nouns from skewing language detection.
- Multi-sentence long text processing with token-ratio evaluation.
"""
from __future__ import annotations

import re
from app.language.script_detector import detect_script
from app.preprocessing.entities import is_pure_named_entity, detect_named_entities

SCRIPT_LANG = {
    "Telugu": "Telugu",
    "Devanagari": "Hindi",
    "Tamil": "Tamil",
    "Kannada": "Kannada",
    "Bengali": "Bengali",
    "Gurmukhi": "Punjabi",
    "Gujarati": "Gujarati",
    "Malayalam": "Malayalam",
    "Odia": "Odia",
    "Arabic": "Urdu",
    "Hangul": "Korean",
    "Cyrillic": "Russian",
    "Japanese": "Japanese",
    "Hiragana": "Japanese",
    "Katakana": "Japanese",
    "CJK": "Chinese",
}

SCRIPT_UNICODE_BLOCKS = {
    "Telugu": "Telugu (U+0C00–U+0C7F)",
    "Devanagari": "Devanagari (U+0900–U+097F)",
    "Tamil": "Tamil (U+0B80–U+0BFF)",
    "Kannada": "Kannada (U+0C80–U+0CFF)",
    "Bengali": "Bengali (U+0980–U+09FF)",
    "Gurmukhi": "Gurmukhi (U+0A00–U+0A7F)",
    "Gujarati": "Gujarati (U+0A80–U+0AFF)",
    "Malayalam": "Malayalam (U+0D00–U+0D7F)",
    "Odia": "Odia (U+0B00–U+0B7F)",
    "Arabic": "Arabic/Perso-Arabic (U+0600–U+06FF)",
    "Hangul": "Hangul (U+AC00–U+D7AF)",
    "Cyrillic": "Cyrillic (U+0400–U+04FF)",
    "Japanese": "Japanese Kana (U+3040–U+30FF)",
    "Hiragana": "Hiragana (U+3040–U+309F)",
    "Katakana": "Katakana (U+30A0–U+30FF)",
    "CJK": "CJK Ideographs (U+4E00–U+9FFF)",
}

ROMAN_CUES = {
    "Telugu": {
        "chala", "bagundi", "baagundi", "enti", "cheppu", "ela", "unnav", "unnaru", "ekkada", "ekkadiki",
        "ledhu", "ledi", "ledu", "undi", "undhi", "kooda", "kuda", "ayindi", "kosam", "dhorukuthayi", "inka",
        "bava", "cheddam", "eppudu", "vasthanu", "vastanu", "meeru", "nenu", "memu", "manam", "manchi",
        "chusi", "velthunnaru", "velthondi", "veldam", "cheppandi", "chesta", "cheyali", "cheyyali",
        "chesanu", "chesindi", "chesaru", "avunu", "kadu", "kaadhu", "emiti", "ippudu", "appudu", "repu",
        "ninna", "kavali", "vaddu", "voddu", "roju", "rojulu", "baga", "baaga", "cinema", "babu", "annaya",
        "namaskaram", "dhanyavadalu", "ee", "tinnara", "enduku", "anduku", "kani", "kaani", "mariyu",
        "lekapothe", "avadam", "pani", "cheyadam", "ivvandi", "tisukondi", "adbhutamga",
    },
    "Hindi": {
        "bahut", "bohot", "acchi", "achhi", "accha", "achha", "hai", "hain", "nahi", "nahin", "kya", "kaise",
        "kaisa", "kaisi", "mera", "meri", "mere", "tum", "aap", "hum", "karo", "karna", "chahiye", "bekar",
        "raha", "rahi", "rahe", "swagat", "aaj", "kal", "parso", "mast", "thanda", "bache", "baje", "yeh",
        "woh", "ye", "wo", "kaha", "kahan", "kab", "naye", "naya", "kyun", "kyu", "hoga", "hogi", "honge",
        "dekha", "shukriya", "dhanyavad", "namaste", "film", "tumhara", "naam", "mai", "mei", "mein", "main",
        "hun", "hoon", "hu", "ek", "mujhe", "tha", "thi", "lekin", "achanak", "zaroorat", "pareshan",
        "theek", "thik", "khush", "khareeda", "dost", "ghar", "kaam", "baat", "sirf", "liye", "bhi", "aur",
        "toh", "ab", "tab", "jab", "sab", "koi", "kuch", "kuchh",
    },
    "Tamil": {
        "romba", "nalla", "nallaa", "irukku", "irukkudhu", "enna", "illa", "illai", "epdi", "theriyum",
        "nandri", "pannunga", "varudhu", "saapadu", "kevalama", "anupunga", "solla", "mudiyuma",
        "mokkai", "paathen", "innum", "vanakkam", "neenga", "naan", "inga", "enga", "eppadi",
        "kidaikkum", "theriyala", "padam", "indha", "intha", "thalaiva", "sema", "vaanga", "ponga",
        "adhu", "idhu", "isai", "pramatham", "arumai", "ulladhu", "sonna",
    },
    "Kannada": {
        "chennagide", "channagide", "thumba", "tumba", "yenu", "hege", "idhe", "beku", "yavaaga",
        "yavaga", "oota", "kettadagithu", "helthilla", "madidhe", "dayavittu", "hegide", "hegiddira",
        "madoke", "aaguththe", "duddu", "kooda", "namaskara", "neevu", "naanu", "illi", "yelli",
        "gothilla", "beda", "chalanachithra", "dhanyavadagalu", "ee", "aaytha", "bega", "pusthaka",
        "idu", "adu", "aagide", "adbhutha", "madide", "hadugalu",
    },
    "English": {
        "the", "is", "at", "which", "on", "and", "a", "an", "this", "that", "was", "for", "with",
        "have", "has", "had", "very", "good", "bad", "movie", "book", "customer", "please", "room",
        "quality", "service", "what", "where", "how", "who", "when", "why", "are", "you", "they",
        "our", "their", "from", "today", "yesterday", "tomorrow", "translate", "hello", "hi",
        "assistant", "language", "super", "acting", "story", "laptop", "screen", "switch", "phone",
        "charger", "replacement", "repair", "refund", "issue", "problem", "complaint", "project",
        "office", "meeting", "attend", "friend", "trouble", "important", "delivery", "arrived",
        "package", "received", "broken", "cracked", "rude", "dissatisfied", "intervention",
        "food", "train", "delayed", "delicious", "car", "bus", "flight", "ticket", "hotel",
        "travel", "work", "time", "date", "number", "email", "address", "order", "item",
        "product", "price", "money", "card", "bank", "payment", "bill", "table", "unclean",
        "mediocre", "late", "help", "need", "want", "cancel", "cancellation", "flight",
    },
    "Malayalam": {
        "nalla", "valare", "aanu", "und", "illa", "enthane", "evide", "sukhamano", "nanni", "namaskaram",
        "padam", "entha", "ivide", "avide", "athe",
    },
    "Marathi": {
        "ahe", "nahi", "kasa", "kashi", "khoop", "chhan", "namaskar", "dhanyavad", "kuthe", "kay",
        "khup", "bara", "he", "te", "amhi", "tumi",
    },
    "Bengali": {
        "bhalo", "khub", "kemon", "achen", "dhonnobad", "namaskar", "kothay", "ki", "shundor",
        "ekhane", "shekhane", "ami", "apni", "tumi",
    },
    "Gujarati": {
        "kem", "cho", "saras", "aabhar", "namaste", "su", "kya", "ma",
    },
    "Punjabi": {
        "kiddan", "changa", "vadhiya", "shukriya", "sat", "sri", "akal", "kithe", "ki",
    },
    "Odia": {
        "kemiti", "achanti", "bhala", "dhanyabad", "namaskar", "kou", "kana",
    },
    "Urdu": {
        "kya", "haal", "hai", "shukriya", "adaab", "kahan", "aap", "kaise",
    },
    "Spanish": {
        "hola", "gracias", "por", "favor", "bueno", "buena", "muy", "como", "esta", "este", "pelicula", "amigo", "dias", "bien", "que", "tal",
    },
    "French": {
        "bonjour", "merci", "tres", "très", "bon", "bonne", "film", "comment", "vous", "avec", "pour", "bien", "salut", "oui", "mon", "ami",
    },
    "German": {
        "hallo", "danke", "sehr", "gut", "guten", "film", "wie", "geht", "nicht", "morgen", "tag", "bitte", "ja", "nein",
    },
    "Italian": {
        "ciao", "grazie", "molto", "bene", "buono", "film", "come", "stai", "per", "favore", "buongiorno",
    },
    "Portuguese": {
        "ola", "olá", "obrigado", "obrigada", "muito", "bom", "boa", "filme", "como", "voce", "você", "bom", "dia",
    },
}


def detect_language(text: str) -> dict:
    clean_text = text.strip()
    if not clean_text:
        return {
            "language": "Unknown",
            "base_language": "Unknown",
            "script": "Unknown",
            "confidence": None,
            "confidence_is_genuine": False,
            "form": "Empty",
            "is_uncertain": True,
            "needs_confirmation": True,
            "suggested_languages": ["Hindi", "Telugu", "Tamil", "Kannada", "English"],
            "method": "None",
            "detected_cues": [],
            "explanation": "No text provided for language detection.",
        }

    script_info = detect_script(clean_text)
    primary_script = script_info["primary"]
    counts = script_info.get("counts", {})
    total_script_chars = sum(counts.values()) or 1

    words = [w.strip(".,!?:;\"'()[]{}").lower() for w in clean_text.split() if w.strip()]
    word_set = set(words)
    total_words = len(words)

    # 1. Native Indic & World Script Match
    if primary_script in SCRIPT_LANG:
        lang_name = SCRIPT_LANG[primary_script]

        # Script-specific language disambiguation:
        if primary_script == "Devanagari":
            marathi_cues = {"आहे", "नाही", "कसा", "कशी", "खूप", "छान", "कुठे", "काय", "आम्ही", "तुम्ही", "मराठी", "चित्रपट"}
            if "ळ" in clean_text or any(w in word_set for w in marathi_cues):
                lang_name = "Marathi"
        elif primary_script == "Arabic":
            urdu_specific_chars = set("ٹڈڑںےہھپچژگ")
            urdu_cues = {"کیا", "حال", "شکریہ", "آداب", "کہاں", "کیسے", "میں", "آپ", "فلم"}
            if any(ch in clean_text for ch in urdu_specific_chars) or any(w in word_set for w in urdu_cues):
                lang_name = "Urdu"
            else:
                lang_name = "Arabic"

        script_chars = counts.get(primary_script, 0)
        script_ratio = script_chars / max(1, total_script_chars)
        block_name = SCRIPT_UNICODE_BLOCKS.get(primary_script, f"{primary_script} Unicode Block")

        # Check for Latin code-mixing
        latin_chars = counts.get("Latin", 0)
        has_latin = latin_chars > 0 and len(words) >= 2

        if has_latin:
            latin_pct = round((latin_chars / total_script_chars) * 100, 1)
            indic_pct = round(script_ratio * 100, 1)
            confidence = round(min(0.98, max(0.70, script_ratio)), 2)
            return {
                "language": f"{lang_name} (Code-Mixed)",
                "base_language": lang_name,
                "script": primary_script,
                "confidence": confidence,
                "confidence_is_genuine": True,
                "form": "Code-Mixed Native",
                "is_uncertain": False,
                "needs_confirmation": False,
                "method": f"{primary_script} native script mixed with Latin tokens",
                "detected_cues": [w for w in words if any(ord(c) > 127 for c in w)][:6],
                "explanation": (
                    f"Identified as {lang_name} (Code-Mixed) because text contains {indic_pct}% "
                    f"{primary_script} script characters ({script_chars}/{total_script_chars}) and {latin_pct}% "
                    f"Latin characters ({latin_chars}/{total_script_chars}) across multiple words."
                ),
            }

        # Pure Native Script
        confidence = round(min(0.99, max(0.85, script_ratio)), 2)
        pct = round(script_ratio * 100, 1)
        return {
            "language": lang_name,
            "base_language": lang_name,
            "script": primary_script,
            "confidence": confidence,
            "confidence_is_genuine": True,
            "form": "Native Script",
            "is_uncertain": False,
            "needs_confirmation": False,
            "method": f"Unicode block inspection ({block_name})",
            "detected_cues": words[:6],
            "explanation": (
                f"Identified as {lang_name} native script because {pct}% of characters "
                f"({script_chars}/{total_script_chars}) belong to the {block_name}."
            ),
        }

    # 2. Pure Named Entity Check in Latin Script (e.g. "Rahul Sharma", "Hyderabad")
    pure_ne = is_pure_named_entity(clean_text)
    if pure_ne and primary_script == "Latin":
        cat = pure_ne["category"]
        ent_text = pure_ne["text"]
        return {
            "language": "Proper Noun / Named Entity",
            "base_language": "English",
            "script": "Latin",
            "confidence": pure_ne["confidence"],
            "confidence_is_genuine": True,
            "form": f"Proper Noun ({cat})",
            "is_uncertain": False,
            "needs_confirmation": False,
            "method": "Gazetteer and proper noun syntactic profile",
            "detected_cues": [ent_text],
            "explanation": f"Input consists solely of recognized proper noun / named entity ({cat}): '{ent_text}'.",
        }

    # 3. Latin Script (Romanized Indic vs English vs Code-Mixed vs International)
    cue_matches: dict[str, list[str]] = {}
    for lang, cues in ROMAN_CUES.items():
        matched = sorted(list(word_set & cues))
        if matched:
            cue_matches[lang] = matched

    indic_candidates = {k: v for k, v in cue_matches.items() if k not in {"English", "Spanish", "French", "German", "Italian", "Portuguese"}}
    intl_candidates = {k: v for k, v in cue_matches.items() if k in {"Spanish", "French", "German", "Italian", "Portuguese"}}
    en_cues = cue_matches.get("English", [])

    if indic_candidates:
        # Check for ambiguity / tie between multiple Indic candidates with equal low cue counts
        sorted_indic = sorted(indic_candidates.items(), key=lambda kv: len(kv[1]), reverse=True)
        top_indic, top_cues = sorted_indic[0]

        # Check for genuine conflict: different words matching different languages with equal count
        if (
            len(sorted_indic) > 1
            and len(sorted_indic[1][1]) == len(top_cues)
            and set(sorted_indic[0][1]) != set(sorted_indic[1][1])
            and total_words >= 2
        ):
            tied_langs = [k for k, v in sorted_indic if len(v) == len(top_cues)]
            return {
                "language": "Uncertain (Please Confirm)",
                "base_language": "uncertain",
                "script": "Latin",
                "confidence": 0.40,
                "confidence_is_genuine": False,
                "form": "Romanized (Ambiguous)",
                "is_uncertain": True,
                "needs_confirmation": True,
                "suggested_languages": tied_langs + ["English"],
                "method": f"Conflicting cues detected between {', '.join(tied_langs)}",
                "detected_cues": top_cues + sorted_indic[1][1],
                "explanation": (
                    f"Conflicting Romanized cues detected across multiple languages ({', '.join(tied_langs)}). "
                    "Please choose or confirm the source language to ensure correct translation."
                ),
            }

        indic_token_hits = len(top_cues)
        en_token_hits = len(en_cues)

        # Check if English clearly dominates over minor Indic cues or loanwords
        is_english_dominant_with_loanwords = (
            (en_token_hits >= 2 * indic_token_hits and en_token_hits >= 3)
            or (en_token_hits > indic_token_hits and indic_token_hits <= 1 and total_words >= 4)
        )

        if is_english_dominant_with_loanwords:
            confidence = round(min(0.96, 0.70 + 0.04 * en_token_hits), 2)
            has_loanwords = indic_token_hits > 0
            return {
                "language": f"English (with {top_indic} loanwords)" if has_loanwords else "English",
                "base_language": "English",
                "script": "Latin",
                "confidence": confidence,
                "confidence_is_genuine": True,
                "form": "Code-Mixed English" if has_loanwords else "Native Script",
                "is_uncertain": False,
                "needs_confirmation": False,
                "method": "Predominant English lexicon with Indic cultural terms" if has_loanwords else "Latin alphabet with English lexical dictionary matching",
                "detected_cues": en_cues[:6] + top_cues[:3],
                "explanation": (
                    f"Identified as English based on predominantly English syntax ({en_token_hits} cues: {en_cues[:5]})"
                    + (f" with occasional {top_indic} loanword(s) ({top_cues})." if has_loanwords else ".")
                ),
            }

        # Otherwise: Romanized Indic or Romanized Code-Mixed
        has_english_cues = en_token_hits > 0
        confidence = round(min(0.96, 0.65 + 0.08 * indic_token_hits), 2)

        if has_english_cues:
            return {
                "language": f"Romanized {top_indic} (Code-Mixed)",
                "base_language": top_indic,
                "script": "Latin",
                "confidence": confidence,
                "confidence_is_genuine": True,
                "form": "Romanized / Code-Mixed",
                "is_uncertain": False,
                "needs_confirmation": False,
                "method": "Phonological Latin lexicon matching (Indic + English loanwords)",
                "detected_cues": top_cues + en_cues,
                "explanation": (
                    f"Identified as Romanized {top_indic} (Code-Mixed) written in Latin script. "
                    f"Detected {len(top_cues)} {top_indic} phonetic cue(s) ({top_cues}) "
                    f"co-occurring with {len(en_cues)} English word(s) ({en_cues})."
                ),
            }

        return {
            "language": f"Romanized {top_indic}",
            "base_language": top_indic,
            "script": "Latin",
            "confidence": confidence,
            "confidence_is_genuine": True,
            "form": "Romanized Indic",
            "is_uncertain": False,
            "needs_confirmation": False,
            "method": f"Phonological Latin lexicon matching for {top_indic}",
            "detected_cues": top_cues,
            "explanation": (
                f"Identified as Romanized {top_indic} written in Latin script based on "
                f"{len(top_cues)} characteristic {top_indic} phonetic cue word(s): {top_cues}."
            ),
        }

    # Extended International Latin Languages (Spanish, French, German, Italian, Portuguese)
    if intl_candidates:
        top_intl = max(intl_candidates, key=lambda k: len(intl_candidates[k]))
        top_intl_cues = intl_candidates[top_intl]
        if len(top_intl_cues) >= 1:
            confidence = round(min(0.96, 0.70 + 0.08 * len(top_intl_cues)), 2)
            return {
                "language": top_intl,
                "base_language": top_intl,
                "script": "Latin",
                "confidence": confidence,
                "confidence_is_genuine": True,
                "form": "Native Script",
                "is_uncertain": False,
                "needs_confirmation": False,
                "method": f"Lexical dictionary matching for {top_intl}",
                "detected_cues": top_intl_cues,
                "explanation": f"Identified as {top_intl} based on {len(top_intl_cues)} vocabulary cue(s): {top_intl_cues}.",
            }

    # 4. Standard English Check
    if primary_script == "Latin":
        if en_cues:
            confidence = round(min(0.96, 0.70 + 0.05 * len(en_cues)), 2)
            return {
                "language": "English",
                "base_language": "English",
                "script": "Latin",
                "confidence": confidence,
                "confidence_is_genuine": True,
                "form": "Native Script",
                "is_uncertain": False,
                "needs_confirmation": False,
                "method": "Latin alphabet with English lexical dictionary matching",
                "detected_cues": en_cues,
                "explanation": (
                    f"Identified as English based on Latin script syntax with {len(en_cues)} "
                    f"standard English lexical cue(s): {en_cues[:8]}."
                ),
            }
        else:
            # Check if text contains named entities
            entities = detect_named_entities(clean_text)
            if entities:
                first_ent = entities[0]
                return {
                    "language": "English",
                    "base_language": "English",
                    "script": "Latin",
                    "confidence": first_ent["confidence"],
                    "confidence_is_genuine": True,
                    "form": "Proper Noun Discourse",
                    "is_uncertain": False,
                    "needs_confirmation": False,
                    "method": "Named entity extraction in Latin script",
                    "detected_cues": [e["text"] for e in entities],
                    "explanation": f"Text contains recognized proper noun entities ({[e['text'] for e in entities]}) without polarizing language markers.",
                }

            # Latin script with no recognizable cues: Do not silently guess!
            return {
                "language": "Uncertain (Please Confirm)",
                "base_language": "uncertain",
                "script": "Latin",
                "confidence": None,
                "confidence_is_genuine": False,
                "form": "Latin Script (Uncertain)",
                "is_uncertain": True,
                "needs_confirmation": True,
                "suggested_languages": ["Hindi", "Telugu", "Tamil", "Kannada", "English"],
                "method": "No definitive language cues detected in Latin script",
                "detected_cues": [],
                "explanation": (
                    "Text is written in Latin script, but lacks clear lexical cues for English or Romanized Indic. "
                    "Please confirm or choose the source language to ensure an accurate translation."
                ),
            }

    # 5. Unknown Script / Fallback
    return {
        "language": "Uncertain (Unknown Script)",
        "base_language": "uncertain",
        "script": primary_script,
        "confidence": None,
        "confidence_is_genuine": False,
        "form": "Unknown Script",
        "is_uncertain": True,
        "needs_confirmation": True,
        "suggested_languages": ["Hindi", "Telugu", "Tamil", "Kannada", "English"],
        "method": "Fallback heuristic",
        "detected_cues": [],
        "explanation": f"Character script '{primary_script}' does not match any configured Indic or standard Unicode profiles. Please choose the source language.",
    }

