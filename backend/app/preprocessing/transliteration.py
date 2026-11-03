"""Phonetic and Lexical Transliteration Engine for Indic Scripts.

Supports bidirectional transliteration:
- Romanized Latin <-> Telugu Script (U+0C00 - U+0C7F)
- Romanized Latin <-> Devanagari/Hindi Script (U+0900 - U+097F)
- Romanized Latin <-> Tamil Script (U+0B80 - U+0BFF)
- Romanized Latin <-> Kannada Script (U+0C80 - U+0CFF)

Key Invariants:
1. In code-mixed discourse, English words, technical terms, and acronyms are preserved
   rather than mutilated into broken phonetic consonant clusters.
2. Named entities (persons, places, organizations) are transliterated using canonical
   representations or preserved cleanly.
3. Native-to-Roman transliteration correctly handles consonant inherent vowels and viramas.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Optional

from app.preprocessing.entities import (
    CANONICAL_ENTITY_TRANSLITERATIONS,
    INDIAN_FIRST_NAMES_LATIN,
    INDIAN_SURNAMES_LATIN,
    INDIAN_LOCATIONS_LATIN,
    ORGANIZATIONS_LATIN,
)

# Common English technical, conversational, and loan words frequently occurring in code-mixed Indic text.
# These MUST NOT be chopped into broken Indic consonant clusters.
COMMON_ENGLISH_LOANWORDS = {
    "the", "is", "at", "which", "on", "and", "a", "an", "this", "that", "was", "for", "with",
    "have", "has", "had", "very", "good", "bad", "movie", "book", "customer", "please",
    "room", "quality", "service", "what", "where", "how", "who", "when", "why", "are", "you",
    "they", "our", "their", "from", "today", "yesterday", "tomorrow", "translate", "hello",
    "hi", "assistant", "language", "super", "acting", "story", "storyline", "hero", "heroine",
    "director", "laptop", "phone", "mobile", "screen", "switch", "charger", "battery", "display",
    "center", "centre", "service", "care", "support", "replacement", "repair", "refund",
    "cancel", "cancellation", "order", "delivery", "package", "box", "complaint", "issue",
    "problem", "technical", "project", "office", "work", "meeting", "attend", "friend",
    "friends", "interview", "college", "school", "university", "exam", "test", "study",
    "course", "syllabus", "admission", "student", "teacher", "sir", "madam", "hospital",
    "doctor", "nurse", "engineer", "engineering", "developer", "medicine", "bus", "train", "flight", "ticket", "station", "airport",
    "hotel", "restaurant", "table", "menu", "food", "dinner", "lunch", "breakfast", "app",
    "application", "software", "hardware", "wifi", "internet", "network", "server", "code",
    "bug", "patch", "update", "fast", "slow", "late", "damage", "broken", "cracked", "missing",
    "rude", "passionate", "trouble", "important", "urgent", "review", "film", "cinema",
    "waste", "rate", "price", "discount", "offer", "sale", "store", "shop", "online",
    "offline", "bank", "account", "payment", "card", "cash", "call", "message", "email",
    "help", "agent", "representative", "staff", "manager", "team", "class", "score", "time",
    "date", "day", "week", "month", "year", "hours", "minute", "ready", "done", "fine",
    "ok", "okay", "cool", "great", "nice", "best", "worst", "better", "welcome", "thanks",
    "thank", "sorry", "excuse", "camera", "police", "driver", "cab", "auto", "road", "street",
    "submit", "submitted", "submission", "start", "stop", "upload", "download", "login", "logout",
    "file", "folder", "link", "click", "open", "close", "restart", "install", "check", "verify",
    "send", "receive", "buy", "sell", "pay", "post", "search",
}

# High-frequency Romanized vocabulary mapping to native script
LEXICAL_MAP: dict[str, dict[str, str]] = {
    "te": {
        "ee": "ఈ", "cinema": "సినిమా", "movie": "సినిమా", "chala": "చాలా", "chaalaa": "చాలా",
        "bagundi": "బాగుంది", "baagundi": "బాగుంది", "hero": "హీరో", "acting": "నటన",
        "super": "సూపర్", "ga": "గా", "undi": "ఉంది", "undhi": "ఉంది", "kathaa": "కథ",
        "katha": "కథ", "adbhuthamga": "అద్భుతంగా", "adbhutamga": "అద్భుతంగా", "unnaayi": "ఉన్నాయి",
        "unnayi": "ఉన్నాయి", "dhanyavadalu": "ధన్యవాదాలు", "namaskaram": "నమస్కారం",
        "ela": "ఎలా", "unnaru": "ఉన్నారు", "unnav": "ఉన్నావు", "baga": "బాగా", "baaga": "బాగా",
        "ledu": "లేదు", "ledhu": "లేదు", "kaledu": "కాలేదు", "nenu": "నేను", "meeru": "మీరు",
        "memu": "మేము", "manam": "మనం", "enti": "ఏంటి", "eppudu": "ఎప్పుడు", "ekkada": "ఎక్కడ",
        "ekkadiki": "ఎక్కడికి", "enduku": "ఎందుకు", "anduku": "అందుకు", "chesaru": "చేశారు",
        "chesanu": "చేశాను", "chesindi": "చేసింది", "chesadu": "చేశాడు", "cheyali": "చేయాలి",
        "cheyyali": "చేయాలి", "cheppandi": "చెప్పండి", "cheppu": "చెప్పు", "telugu": "తెలుగు",
        "manchi": "మంచి", "chedda": "చెడ్డ", "tappakunda": "తప్పకుండా", "bhojanam": "భోజనం",
        "saapadu": "భోజనం", "rate": "ధర", "ticket": "టికెట్", "waste": "వ్యర్థం",
        "repu": "రేపు", "ninna": "నిన్న", "vasthanu": "వస్తాను", "vastanu": "వస్తాను",
        "vacharu": "వచ్చారు", "vachindi": "వచ్చింది", "velthunnaru": "వెళ్తున్నారు",
        "velthondi": "వెళ్తోంది", "veldam": "వెళ్దాం", "babu": "బాబు", "annaya": "అన్నయ్య",
        "tinnara": "తిన్నారా", "kavali": "కావాలి", "voddu": "వద్దు", "vaddu": "వద్దు",
        "avunu": "అవును", "kadu": "కాదు", "kaadhu": "కాదు", "roju": "రోజు", "chusi": "చూసి",
        "choodandi": "చూడండి", "vinandi": "వినండి", "kani": "కానీ", "kaani": "కానీ",
        "kooda": "కూడా", "kuda": "కూడా", "inka": "ఇంకా", "ippudu": "ఇప్పుడు", "appudu": "అప్పుడు",
        "kosam": "కోసం", "lo": "లో", "ki": "కి", "ku": "కు", "nundi": "నుండి",
        "avadam": "అవ్వడం", "avatam": "అవ్వడం", "avvaledu": "అవ్వలేదు", "pani": "పని",
        "cheyadam": "చేయడం", "cheyandi": "చేయండి", "chestaru": "చేస్తారు", "matladandi": "మాట్లాడండి",
        "ivvandi": "ఇవ్వండి", "tisukondi": "తీసుకోండి", "lekapothe": "లేకపోతే", "mariyu": "మరియు",
    },
    "hi": {
        "hello": "हेलो", "mai": "मैं", "mei": "मैं", "mein": "मैं", "main": "मैं",
        "hum": "हम", "aap": "आप", "tum": "तुम", "yeh": "यह", "ye": "यह", "woh": "वह", "wo": "वह",
        "hun": "हूँ", "hoon": "हूँ", "hu": "हूँ", "ek": "एक", "hai": "है", "hain": "हैं", "ho": "हो",
        "tha": "था", "thi": "थी", "the": "थे", "hoga": "होगा", "hogi": "होगी", "honge": "होंगे",
        "bahut": "बहुत", "bohot": "बहुत", "acchi": "अच्छी", "achhi": "अच्छी", "accha": "अच्छा",
        "achha": "अच्छा", "storyline": "कहानी", "kahani": "कहानी", "ekdum": "एकदम",
        "mast": "मस्त", "lagi": "लगी", "laga": "लगा", "acting": "अभिनय", "super": "सुपर",
        "dhanyawad": "धन्यवाद", "shukriya": "शुक्रिया", "namaste": "नमस्ते", "namaskar": "नमस्कार",
        "kaise": "कैसे", "kaisa": "कैसा", "kaisi": "कैसी", "kya": "क्या", "kyun": "क्यों",
        "kyu": "क्यों", "kahan": "कहाँ", "kab": "कब", "nahi": "नहीं", "nahin": "नहीं",
        "bhai": "भाई", "sundar": "सुंदर", "khana": "खाना", "swadisht": "स्वादिष्ट", "pani": "पानी",
        "tumhara": "तुम्हारा", "naam": "नाम", "swagat": "स्वागत", "naye": "नए", "naya": "नया",
        "aaj": "आज", "kal": "कल", "parso": "परसों", "pehle": "पहले", "baad": "बाद",
        "karo": "करो", "karna": "करना", "kiya": "किया", "dekha": "देखा", "bola": "बोला",
        "boli": "बोली", "gaye": "गए", "gayi": "गई", "gaya": "गया", "achanak": "अचानक",
        "zaroorat": "ज़रूरत", "pareshan": "परेशान", "theek": "ठीक", "thik": "ठीक",
        "khush": "खुश", "baat": "बात", "kaam": "काम", "ghar": "घर", "dost": "दोस्त",
        "khareeda": "खरीदा", "khareedna": "खरीदना", "lekin": "लेकिन", "par": "पर",
        "se": "से", "ko": "को", "ka": "का", "ke": "के", "ki": "की", "mujhe": "मुझे",
        "mera": "मेरा", "meri": "मेरी", "mere": "मेरे", "raha": "रहा", "rahi": "रही", "rahe": "रहे",
        "sirf": "सिर्फ", "do": "दो", "teen": "तीन", "chaar": "चार", "paanch": "पाँच",
        "hafte": "हफ्ते", "mahine": "महीने", "saal": "साल", "liye": "लिए",
        "ja": "जा", "jaa": "जा", "jao": "जाओ", "jaao": "जाओ", "jaana": "जाना", "aana": "आना",
        "aur": "और", "toh": "तो", "to": "तो", "bhi": "भी", "ab": "अब", "tab": "तब", "jab": "जब",
        "sab": "सब", "koi": "कोई", "kuch": "कुछ", "kuchh": "कुछ", "chala": "चला", "chali": "चली",
        "chale": "चले", "pichle": "पिछले", "pichla": "पिछला", "band": "बंद", "khareedi": "खरीदी",
    },
    "ta": {
        "indha": "இந்த", "intha": "இந்த", "adhu": "அது", "idhu": "இது", "padam": "படம்",
        "cinema": "சினிமா", "movie": "படம்", "romba": "ரொம்ப", "nalla": "நல்ல", "nallaa": "நல்லா",
        "irukku": "இருக்கு", "irukkudhu": "இருக்குது", "super": "சூப்பர்", "isai": "இசை",
        "pramatham": "பிரமாதம்", "arumai": "அருமை", "arumaiyaaga": "அருமையாக", "ulladhu": "உள்ளது",
        "vanakkam": "வணக்கம்", "nandri": "நன்றி", "eppadi": "எப்படி", "epdi": "எப்படி",
        "irukkeenga": "இருக்கிறீர்கள்", "enna": "என்ன", "enge": "எங்கே", "enga": "எங்கே",
        "eppodhu": "எப்போது", "illai": "இல்லை", "illa": "இல்லை", "saapadu": "சாப்பாடு",
        "thalaiva": "தலைவா", "sema": "செம", "vaanga": "வாங்க", "ponga": "போங்க",
        "theriyum": "தெரியும்", "theriyala": "தெரியவில்லை", "naan": "நான்", "neenga": "நீங்கள்",
        "sonna": "சொன்ன", "solla": "சொல்ல", "pannunga": "பண்ணுங்க", "paathen": "பார்த்தேன்",
    },
    "kn": {
        "ee": "ಈ", "idu": "ಇದು", "adu": "ಅದು", "movie": "ಚಲನಚಿತ್ರ", "chalanachithra": "ಚಲನಚಿತ್ರ",
        "cinema": "ಚಿತ್ರ", "thumba": "ತುಂಬಾ", "tumba": "ತುಂಬಾ", "chennagide": "ಚೆನ್ನಾಗಿದೆ",
        "channagide": "ಚೆನ್ನಾಗಿದೆ", "acting": "ನಟನೆ", "super": "ಸೂಪರ್", "aagide": "ಆಗಿದೆ",
        "adbhutha": "ಅದ್ಭುತ", "adbhutavagide": "ಅದ್ಭುತವಾಗಿದೆ", "hadugalu": "ಹಾಡುಗಳು",
        "namaskara": "ನಮಸ್ಕಾರ", "dhanyavada": "ಧನ್ಯವಾದಗಳು", "hegide": "ಹೇಗಿದೆ",
        "hegiddira": "ಹೇಗಿದ್ದೀರಾ", "enu": "ಏನು", "yenu": "ಏನು", "elli": "ಎಲ್ಲಿ",
        "yelli": "ಎಲ್ಲಿ", "yavaaga": "ಯಾವಾಗ", "yavaga": "ಯಾವಾಗ", "yake": "ಯಾಕೆ",
        "illa": "ಇಲ್ಲ", "oota": "ಊಟ", "aaytha": "ಆಯ್ತಾ", "chennagi": "ಚೆನ್ನಾಗಿ",
        "bega": "ಬೇಗ", "pusthaka": "ಪುಸ್ತಕ", "neevu": "ನೀವು", "naanu": "ನಾನು",
        "beku": "ಬೇಕು", "beda": "ಬೇಡ", "madide": "ಮಾಡಿದೆ", "madoke": "ಮಾಡೋಕೆ",
    },
}

# Phonetic consonants mapping
CONSONANTS = {
    "te": {
        "kh": "ఖ", "k": "క", "gh": "ఘ", "g": "గ", "ch": "చ", "chh": "ఛ", "j": "జ", "jh": "ఝ",
        "th": "థ", "t": "త", "dh": "ధ", "d": "ద", "n": "న", "ph": "ఫ", "p": "ప", "bh": "భ",
        "b": "బ", "m": "మ", "y": "య", "r": "ర", "l": "ల", "v": "వ", "w": "వ", "sh": "శ",
        "s": "స", "h": "హ",
    },
    "hi": {
        "kh": "ख", "k": "क", "gh": "घ", "g": "ग", "chh": "छ", "ch": "च", "jh": "झ", "j": "ज",
        "th": "थ", "t": "त", "dh": "ध", "d": "द", "n": "न", "ph": "फ", "p": "प", "bh": "भ",
        "b": "ब", "m": "म", "y": "य", "r": "र", "l": "ल", "v": "व", "w": "व", "sh": "श",
        "s": "स", "h": "ह",
    },
    "ta": {
        "k": "க", "g": "க", "ch": "ச", "s": "ச", "j": "ஜ", "t": "த", "d": "த", "th": "த",
        "n": "ந", "p": "ப", "b": "ப", "m": "ம", "y": "ய", "r": "ர", "l": "ல", "v": "வ",
        "w": "வ", "sh": "ஷ", "h": "ஹ",
    },
    "kn": {
        "kh": "ಖ", "k": "ಕ", "gh": "ಘ", "g": "ಗ", "ch": "ಚ", "chh": "ಛ", "j": "ಜ", "jh": "ಝ",
        "th": "ಥ", "t": "ತ", "dh": "ಧ", "d": "ದ", "n": "ನ", "ph": "ಫ", "p": "ಪ", "bh": "ಭ",
        "b": "ಬ", "m": "ಮ", "y": "ಯ", "r": "ರ", "l": "ಲ", "v": "ವ", "w": "ವ", "sh": "ಶ",
        "s": "ಸ", "h": "ಹ",
    },
}

VOWEL_SIGNS = {
    "te": {
        "aa": "ా", "a": "", "ee": "ీ", "ii": "ీ", "i": "ి", "oo": "ూ", "uu": "ూ", "u": "ు",
        "ai": "ై", "e": "ె", "o": "ొ", "au": "ౌ",
    },
    "hi": {
        "aa": "ा", "a": "", "ee": "ी", "ii": "ी", "i": "ि", "oo": "ू", "uu": "ू", "u": "ु",
        "ai": "ै", "e": "े", "o": "ो", "au": "ौ",
    },
    "ta": {
        "aa": "ா", "a": "", "ee": "ீ", "ii": "ீ", "i": "ி", "oo": "ூ", "uu": "ூ", "u": "ு",
        "ai": "ை", "e": "ெ", "o": "ொ", "au": "ௌ",
    },
    "kn": {
        "aa": "ಾ", "a": "", "ee": "ీ", "ii": "ೀ", "i": "ಿ", "oo": "ೂ", "uu": "ూ", "u": "ు",
        "ai": "ೈ", "e": "ೆ", "o": "ೊ", "au": "ೌ",
    },
}


def transliterate_word_to_native(word: str, lang_code: str) -> str:
    """Transliterate a single Romanized word to target Indic script with loanword preservation."""
    clean = word.lower().strip()
    if not clean:
        return word

    # 1. Check verified lexical dictionary
    lex = LEXICAL_MAP.get(lang_code, {})
    if clean in lex:
        return lex[clean]

    # 2. Check canonical Named Entity transliteration table
    if clean in CANONICAL_ENTITY_TRANSLITERATIONS:
        trans_dict = CANONICAL_ENTITY_TRANSLITERATIONS[clean]
        if lang_code in trans_dict:
            return trans_dict[lang_code]

    # 3. Check English loanword whitelist: preserve original Latin word in code-mixed text!
    # Mutilating common English words into broken Indic characters destroys MT comprehension.
    if clean in COMMON_ENGLISH_LOANWORDS:
        return word

    # 4. Check known organizations, locations, or English names
    if clean in ORGANIZATIONS_LATIN or clean in INDIAN_LOCATIONS_LATIN or clean in INDIAN_FIRST_NAMES_LATIN:
        # If no specific transliteration exists, preserve in original Latin rather than chopping
        return word

    # 5. Syllabic transliteration fallback for phonological Indic words
    consonants = CONSONANTS.get(lang_code, CONSONANTS["hi"])
    vowels = VOWEL_SIGNS.get(lang_code, VOWEL_SIGNS["hi"])

    result = []
    i = 0
    n = len(clean)

    while i < n:
        matched = False
        # Try 3-char, 2-char, 1-char consonant prefixes
        for size in (3, 2, 1):
            if i + size <= n:
                chunk = clean[i : i + size]
                if chunk in consonants:
                    base_char = consonants[chunk]
                    i += size
                    matched = True

                    # Look ahead for vowel sign
                    vowel_matched = False
                    for v_size in (2, 1):
                        if i + v_size <= n:
                            v_chunk = clean[i : i + v_size]
                            if v_chunk in vowels:
                                result.append(base_char + vowels[v_chunk])
                                i += v_size
                                vowel_matched = True
                                break
                    if not vowel_matched:
                        result.append(base_char)
                    break
        if not matched:
            result.append(clean[i])
            i += 1

    return "".join(result)


def transliterate_roman_to_native(text: str, target_lang: str = "te") -> str:
    """Convert Romanized text to target native script with entity and loanword protection."""
    lang_code = target_lang.lower()
    if lang_code.startswith("telugu") or lang_code == "te":
        lang = "te"
    elif lang_code.startswith("hindi") or lang_code == "hi":
        lang = "hi"
    elif lang_code.startswith("tamil") or lang_code == "ta":
        lang = "ta"
    elif lang_code.startswith("kannada") or lang_code == "kn":
        lang = "kn"
    else:
        return text

    tokens = re.findall(r"\w+|[^\w\s]|\s+", text, re.UNICODE)
    output = []
    for tok in tokens:
        if tok.isalnum() and not tok.isdigit():
            output.append(transliterate_word_to_native(tok, lang))
        else:
            output.append(tok)
    return "".join(output)


# Indic Unicode to Romanized Latin pronunciation table with proper inherent vowel 'a'
UNICODE_CONSONANTS_ROMAN = {
    # Telugu
    "క": "ka", "ఖ": "kha", "గ": "ga", "ఘ": "gha", "చ": "cha", "ఛ": "chha", "జ": "ja", "ఝ": "jha",
    "ట": "ta", "ఠ": "tha", "డ": "da", "ఢ": "dha", "ణ": "na", "త": "ta", "థ": "tha", "ద": "da",
    "ధ": "dha", "న": "na", "ప": "pa", "ఫ": "pha", "బ": "ba", "భ": "bha", "మ": "ma", "య": "ya",
    "ర": "ra", "ల": "la", "వ": "va", "శ": "sha", "ష": "sha", "స": "sa", "హ": "ha",
    # Hindi / Devanagari
    "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "च": "cha", "छ": "chha", "ज": "ja", "झ": "jha",
    "ट": "ta", "ठ": "tha", "ड": "da", "ढ": "dha", "ण": "na", "त": "ta", "थ": "tha", "द": "da",
    "ध": "dha", "न": "na", "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma", "य": "ya",
    "र": "ra", "ल": "la", "व": "va", "श": "sha", "ष": "sha", "स": "sa", "ह": "ha",
    # Tamil
    "க": "ka", "ச": "sa", "ஜ": "ja", "ட": "ta", "ண": "na", "த": "tha", "ந": "na", "ப": "pa",
    "ம": "ma", "ய": "ya", "ர": "ra", "ல": "la", "வ": "va", "ழ": "zha", "ள": "la", "ற": "ra",
    "ன": "na", "ஷ": "sha", "ஸ": "sa", "ஹ": "ha",
    # Kannada
    "ಕ": "ka", "ಖ": "kha", "ಗ": "ga", "ಘ": "gha", "ಚ": "cha", "ಛ": "chha", "ಜ": "ja", "ಝ": "jha",
    "ಟ": "ta", "ಠ": "tha", "ಡ": "da", "ಢ": "dha", "ಣ": "na", "ತ": "ta", "ಥ": "tha", "ದ": "da",
    "ಧ": "dha", "ನ": "na", "ಪ": "pa", "ಫ": "pha", "ಬ": "ba", "ಭ": "bha", "ಮ": "ma", "ಯ": "ya",
    "ರ": "ra", "ಲ": "la", "ವ": "va", "ಶ": "sha", "ಷ": "sha", "ಸ": "sa", "ಹ": "ha",
}

UNICODE_VOWELS_ROMAN = {
    # Independent vowels
    "అ": "a", "ఆ": "aa", "ఇ": "i", "ఈ": "ee", "ఉ": "u", "ఊ": "oo", "ఎ": "e", "ఏ": "e",
    "ఐ": "ai", "ఒ": "o", "ఓ": "o", "ఔ": "au",
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ए": "e", "ऐ": "ai",
    "ओ": "o", "औ": "au",
    "அ": "a", "ஆ": "aa", "இ": "i", "ஈ": "ee", "உ": "u", "ஊ": "oo", "எ": "e", "ஏ": "e",
    "ஐ": "ai", "ஒ": "o", "ஓ": "o", "ஔ": "au",
    "ಅ": "a", "ಆ": "aa", "ಇ": "i", "ಈ": "ee", "ಉ": "u", "ಊ": "oo", "ಎ": "e", "ಏ": "e",
    "ಐ": "ai", "ಒ": "o", "ಓ": "o", "ಔ": "au",
}

# Dependent vowel signs (matras) replace the inherent 'a' of the preceding consonant
UNICODE_MATRAS_ROMAN = {
    # Telugu
    "ా": "aa", "ి": "i", "ీ": "ee", "ు": "u", "ూ": "oo", "ె": "e", "ే": "e", "ై": "ai",
    "ొ": "o", "ో": "o", "ౌ": "au", "ం": "m",
    # Hindi
    "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "े": "e", "ै": "ai", "ो": "o",
    "ौ": "au", "ं": "n", "ः": "h",
    # Tamil
    "ா": "aa", "ி": "i", "ீ": "ee", "ு": "u", "ூ": "oo", "ெ": "e", "ே": "e", "ை": "ai",
    "ொ": "o", "ோ": "o", "ௌ": "au",
    # Kannada
    "ಾ": "aa", "ಿ": "i", "ೀ": "ee", "ು": "u", "ೂ": "oo", "ೆ": "e", "ೇ": "e", "ೈ": "ai",
    "ೊ": "o", "ೋ": "o", "ೌ": "au", "ಂ": "m",
}

HALANTS = {"్", "्", "்", "್"}


def transliterate_native_to_roman(text: str, source_lang: str = "auto") -> str:
    """Transliterate Indic native script into readable Romanized phonetic Latin text.
    
    Correctly models inherent vowels ('a') and replaces them when matras or viramas occur.
    """
    if not text:
        return ""

    res: list[str] = []
    chars = list(text)
    n = len(chars)
    i = 0

    while i < n:
        ch = chars[i]
        next_ch = chars[i + 1] if i + 1 < n else ""

        # Independent vowel
        if ch in UNICODE_VOWELS_ROMAN:
            res.append(UNICODE_VOWELS_ROMAN[ch])
            i += 1
            continue

        # Consonant
        if ch in UNICODE_CONSONANTS_ROMAN:
            rom_base = UNICODE_CONSONANTS_ROMAN[ch]  # e.g. "ka"
            base_cons = rom_base[:-1]  # "k"

            # Check if followed by virama (halant)
            if next_ch in HALANTS:
                res.append(base_cons)
                i += 2  # Skip virama
                continue

            # Check if followed by matra (vowel sign)
            if next_ch in UNICODE_MATRAS_ROMAN:
                res.append(base_cons + UNICODE_MATRAS_ROMAN[next_ch])
                i += 2  # Skip matra
                continue

            # Word-final consonant in Hindi usually drops inherent schwa
            is_word_end = (i + 1 == n or chars[i + 1].isspace() or unicodedata.category(chars[i + 1]).startswith("P"))
            if is_word_end and source_lang in ("hi", "hindi"):
                res.append(base_cons)
            else:
                res.append(rom_base)
            i += 1
            continue

        # Matra without consonant (unusual, but handle gracefully)
        if ch in UNICODE_MATRAS_ROMAN:
            res.append(UNICODE_MATRAS_ROMAN[ch])
            i += 1
            continue

        # Any other character (space, punctuation, English, digit)
        res.append(ch)
        i += 1

    return "".join(res)


def transliteration_note(text: str) -> str:
    return "Phonological transliteration active for Telugu, Devanagari, Tamil, and Kannada scripts."
