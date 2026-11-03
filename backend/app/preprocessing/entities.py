"""IndicMultiNLP Named Entity Recognition, Preservation, and Transliteration Engine.

Detects, categorizes, and preserves proper nouns (Person names, Place names, Organizations,
and general proper nouns) across English, Romanized Indic, and Native Indic scripts
(Telugu, Devanagari/Hindi, Tamil, Kannada, Bengali, etc.).

Crucial Invariants:
1. Proper nouns must NOT be silently mistranslated into common dictionary words (e.g.
   "Pooja" -> "worship", "Karan" -> "reason", "Anand" -> "pleasure", "Tara" -> "star").
2. Proper nouns must NOT be butchered by naive character-level phonetic substitution.
3. Proper nouns preserved in target language must be treated as successful translations,
   not flagged as 'untranslated errors'.
4. Ambiguous words (e.g. words that can be both common nouns and names) are evaluated
   in context and marked with honest confidence / ambiguity flags.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Optional, TypedDict


class EntityItem(TypedDict):
    text: str
    category: str  # PER, LOC, ORG, PROPN
    start: int
    end: int
    confidence: float
    is_ambiguous: bool
    explanation: str
    target_transliterations: dict[str, str]


# Common Indian and international person names (First names & Surnames)
INDIAN_FIRST_NAMES_LATIN = {
    "rahul", "rohit", "sachin", "priya", "pooja", "puja", "ananya", "suresh", "ramesh",
    "amit", "anita", "vikram", "sneha", "neha", "raj", "rajesh", "sanjay", "karthik",
    "kartik", "vijay", "divya", "manoj", "kavya", "varun", "swati", "kiran", "deepa",
    "aditya", "harish", "sai", "krishna", "venkatesh", "lakshmi", "bhavani", "sunita",
    "radhika", "ritu", "meena", "arun", "ajay", "alok", "deepak", "anil", "sunil",
    "prakash", "rupali", "pradeep", "sandeep", "ashok", "mohan", "sohan", "kamal",
    "anand", "karan", "tara", "surya", "arjun", "vishal", "vivek", "manisha", "shweta",
    "geeta", "seema", "preeti", "anushka", "deepika", "alia", "shraddha", "rashmika",
    "samanta", "samantha", "kajal", "tamanna", "tamannaah", "nayanthara", "trisha",
    "mahesh", "prabhas", "ntr", "chiranjeevi", "balakrishna", "nagarjuna", "venkatesh",
    "pawan", "kalyan", "ram", "charan", "allu", "arjun", "vijay", "ajith", "rajinikanth",
    "kamal", "haasan", "dhanush", "suriya", "vikram", "siva", "karthikeyan", "yash",
    "sudeep", "darshan", "puneeth", "rajkumar", "rishab", "rakshit", "shetty",
}

INDIAN_SURNAMES_LATIN = {
    "sharma", "verma", "singh", "kumar", "rao", "reddy", "patel", "gupta", "joshi",
    "nair", "iyer", "iyengar", "pillai", "das", "mukherjee", "banerjee", "chatterjee",
    "mehta", "shah", "bhat", "bhatt", "gowda", "naidu", "choudhury", "chowdhury", "khan",
    "ali", "sheikh", "ahmed", "mishra", "pandey", "tiwari", "dubey", "shukla", "tripathi",
    "yadav", "chavan", "pawar", "kadam", "shinde", "jadhav", "deshmukh", "kulkarni",
    "patil", "joshi", "kamat", "prabhu", "pai", "menon", "kurup", "nambiar", "varma",
}

# Major cities, states, landmarks, countries
INDIAN_LOCATIONS_LATIN = {
    "hyderabad", "bengaluru", "bangalore", "chennai", "mumbai", "delhi", "new delhi",
    "kolkata", "calcutta", "pune", "ahmedabad", "jaipur", "surat", "lucknow", "kanpur",
    "nagpur", "visakhapatnam", "vizag", "vijayawada", "tirupati", "warangal", "guntur",
    "madurai", "coimbatore", "mysore", "mysuru", "kochi", "cochin", "thiruvananthapuram",
    "trivandrum", "patna", "bhopal", "chandigarh", "indore", "vadodara", "varanasi",
    "kashi", "agra", "amritsar", "dehradun", "shimla", "srinagar", "jammu", "ranchi",
    "raipur", "bhubaneswar", "cuttack", "guwahati", "shillong", "imphal", "agartala",
    "telangana", "andhra pradesh", "andhra", "karnataka", "tamil nadu", "maharashtra",
    "kerala", "uttar pradesh", "bihar", "west bengal", "gujarat", "rajasthan", "punjab",
    "haryana", "odisha", "assam", "goa", "madhya pradesh", "jharkhand", "chhattisgarh",
    "uttarakhand", "himachal pradesh", "india", "bharat", "delhi",
}

ORGANIZATIONS_LATIN = {
    "google", "microsoft", "apple", "amazon", "meta", "facebook", "tcs", "infosys",
    "wipro", "hcl", "cognizant", "tech mahindra", "isro", "nasa", "drdo", "aiims",
    "iit", "nit", "iim", "iiit", "bits", "flipkart", "swiggy", "zomato", "paytm",
    "phonepe", "tata", "reliance", "jio", "airtel", "lic", "sbi", "hdfc", "icici",
}

# Context markers that identify adjacent or attached tokens as proper nouns
HONORIFICS = {"dr.", "dr", "mr.", "mr", "ms.", "ms", "mrs.", "mrs", "prof.", "prof", "shri", "smt.", "smt", "pandit"}

# Suffixes and postpositions indicating person or place
INDIC_PERSON_POSTPOSITIONS = {
    "garu", "ji", "avargal", "avaru", "sahab", "saheb", "babu", "annayya", "thambi", "dost",
}

INDIC_LOCATIVE_POSTPOSITIONS = {
    # Telugu
    "lo", "ki", "ku", "nundi", "vipu",
    # Hindi
    "mein", "me", "se", "ko", "par", "paas",
    # Tamil
    "il", "kku", "le", "irundu",
    # Kannada
    "nalli", "ge", "inda",
}

# High-accuracy transliterations for proper nouns
CANONICAL_ENTITY_TRANSLITERATIONS: dict[str, dict[str, str]] = {
    "rahul": {"te": "రాహుల్", "hi": "राहुल", "ta": "ராகுல்", "kn": "ರಾಹುಲ್", "en": "Rahul"},
    "sharma": {"te": "శర్మ", "hi": "शर्मा", "ta": "சர்மா", "kn": "ಶರ್ಮಾ", "en": "Sharma"},
    "rohit": {"te": "రోహిత్", "hi": "रोहित", "ta": "ரோஹித்", "kn": "ರೋಹಿತ್", "en": "Rohit"},
    "sachin": {"te": "సచిన్", "hi": "सचिन", "ta": "சச்சின்", "kn": "ಸಚಿನ್", "en": "Sachin"},
    "priya": {"te": "ప్రియ", "hi": "प्रिया", "ta": "பிரியா", "kn": "ಪ್ರಿಯಾ", "en": "Priya"},
    "pooja": {"te": "పూజ", "hi": "पूजा", "ta": "பூஜா", "kn": "ಪೂಜಾ", "en": "Pooja"},
    "puja": {"te": "పూజ", "hi": "पूजा", "ta": "பூஜா", "kn": "ಪೂಜಾ", "en": "Puja"},
    "ananya": {"te": "అనన్య", "hi": "अनन्या", "ta": "அனன்யா", "kn": "ಅನನ್ಯ", "en": "Ananya"},
    "suresh": {"te": "సురేష్", "hi": "सुरेश", "ta": "சுரேஷ்", "kn": "ಸುರೇಶ್", "en": "Suresh"},
    "ramesh": {"te": "రమేష్", "hi": "रमेश", "ta": "ரமேஷ்", "kn": "ರಮೇಶ್", "en": "Ramesh"},
    "amit": {"te": "అమిత్", "hi": "अमित", "ta": "அமித்", "kn": "ಅಮಿತ್", "en": "Amit"},
    "vikram": {"te": "విక్రమ్", "hi": "विक्रम", "ta": "விக்ரம்", "kn": "ವಿಕ್ರಮ್", "en": "Vikram"},
    "sneha": {"te": "స్నేహ", "hi": "स्नेहा", "ta": "சினேகா", "kn": "ಸ್ನೇಹಾ", "en": "Sneha"},
    "karthik": {"te": "కార్తీక్", "hi": "कार्तिक", "ta": "கார்த்திக்", "kn": "ಕಾರ್ತಿಕ್", "en": "Karthik"},
    "vijay": {"te": "విజయ్", "hi": "विजय", "ta": "விஜய்", "kn": "ವಿಜಯ್", "en": "Vijay"},
    "prakash": {"te": "ప్రకాష్", "hi": "प्रकाश", "ta": "பிரகாஷ்", "kn": "ಪ್ರಕಾಶ್", "en": "Prakash"},
    "rupali": {"te": "రూపాలి", "hi": "रूपाली", "ta": "ரூபாலி", "kn": "ರೂಪಾಲಿ", "en": "Rupali"},
    "anand": {"te": "ఆనంద్", "hi": "आनंद", "ta": "ஆனந்த்", "kn": "ಆನಂದ್", "en": "Anand"},
    "karan": {"te": "కరణ్", "hi": "करण", "ta": "கரண்", "kn": "ಕರಣ್", "en": "Karan"},
    "hyderabad": {"te": "హైదరాబాద్", "hi": "हैदराबाद", "ta": "ஹைதராபாத்", "kn": "ಹೈದರಾಬಾದ್", "en": "Hyderabad"},
    "bengaluru": {"te": "బెంగళూరు", "hi": "बेंगलुरु", "ta": "பெங்களூரு", "kn": "ಬೆಂಗಳೂರು", "en": "Bengaluru"},
    "bangalore": {"te": "బెంగళూరు", "hi": "बेंगलुरु", "ta": "பெங்களூரு", "kn": "ಬೆಂಗಳೂರು", "en": "Bangalore"},
    "chennai": {"te": "చెన్నై", "hi": "चेन्नई", "ta": "சென்னை", "kn": "ಚೆನ್ನೈ", "en": "Chennai"},
    "mumbai": {"te": "ముంబై", "hi": "मुंबई", "ta": "மும்பை", "kn": "ಮುಂಬೈ", "en": "Mumbai"},
    "delhi": {"te": "ఢిల్లీ", "hi": "दिल्ली", "ta": "தில்லி", "kn": "ದೆಹಲಿ", "en": "Delhi"},
    "new delhi": {"te": "న్యూఢిల్లీ", "hi": "नई दिल्ली", "ta": "புது தில்லி", "kn": "ನವದೆಹಲಿ", "en": "New Delhi"},
    "kolkata": {"te": "కోల్‌కతా", "hi": "कोलकाता", "ta": "கொல்கத்தா", "kn": "ಕೋಲ್ಕತ್ತಾ", "en": "Kolkata"},
    "pune": {"te": "పూణే", "hi": "पुणे", "ta": "புனே", "kn": "ಪುಣೆ", "en": "Pune"},
    "visakhapatnam": {"te": "విశాఖపట్నం", "hi": "विशाखापट्टनम", "ta": "விசாகப்பட்டினம்", "kn": "ವಿಶಾಖಪಟ್ಟಣ", "en": "Visakhapatnam"},
    "vizag": {"te": "వైజాగ్", "hi": "वाइज़ैग", "ta": "வைசாக்", "kn": "ವೈಜಾಗ್", "en": "Vizag"},
    "vijayawada": {"te": "విజయవాడ", "hi": "विजयवाड़ा", "ta": "விஜயவாடா", "kn": "ವಿಜಯವಾಡ", "en": "Vijayawada"},
    "tirupati": {"te": "తిరుపతి", "hi": "तिरुपति", "ta": "திருப்பதி", "kn": "ತಿರುಪತಿ", "en": "Tirupati"},
    "warangal": {"te": "వరంగల్", "hi": "वारंगल", "ta": "வரங்கல்", "kn": "ವಾರಂಗಲ್", "en": "Warangal"},
    "google": {"te": "గూగుల్", "hi": "गूगल", "ta": "கூகிள்", "kn": "ಗೂಗಲ್", "en": "Google"},
    "microsoft": {"te": "మైక్రోసాఫ్ట్", "hi": "माइक्रोसॉफ्ट", "ta": "மைக்ரோசாப்ட்", "kn": "ಮೈಕ್ರೋಸಾಫ್ಟ್", "en": "Microsoft"},
    "apple": {"te": "యాపిల్", "hi": "एप्पल", "ta": "ஆப்பிள்", "kn": "ಆಪಲ್", "en": "Apple"},
    "amazon": {"te": "అమెజాన్", "hi": "अमेज़न", "ta": "அமேசான்", "kn": "ಅಮೆಜಾನ್", "en": "Amazon"},
    "isro": {"te": "ఇస్రో", "hi": "इसरो", "ta": "இஸ்ரோ", "kn": "ಇಸ್ರೋ", "en": "ISRO"},
    "tcs": {"te": "టిసిఎస్", "hi": "टीसीएस", "ta": "டிசிஎஸ்", "kn": "ಟಿಸಿಎಸ್", "en": "TCS"},
    "infosys": {"te": "ఇన్ఫోసిస్", "hi": "इन्फोसिस", "ta": "இன்போசிஸ்", "kn": "ಇನ್ಫೋಸಿಸ್", "en": "Infosys"},
}

# Reverse lookup for Indic native scripts
NATIVE_TO_LATIN_ENTITIES: dict[str, tuple[str, str]] = {
    # Devanagari
    "राहुल": ("Rahul", "PER"), "रोहित": ("Rohit", "PER"), "सचिन": ("Sachin", "PER"),
    "प्रिया": ("Priya", "PER"), "पूजा": ("Pooja", "PER"), "अनन्या": ("Ananya", "PER"),
    "सुरेश": ("Suresh", "PER"), "रमेश": ("Ramesh", "PER"), "अमित": ("Amit", "PER"),
    "विक्रम": ("Vikram", "PER"), "स्नेहा": ("Sneha", "PER"), "प्रकाश": ("Prakash", "PER"),
    "रूपाली": ("Rupali", "PER"), "शर्मा": ("Sharma", "PER"), "वर्मा": ("Verma", "PER"),
    "सिंह": ("Singh", "PER"), "कुमार": ("Kumar", "PER"), "हैदराबाद": ("Hyderabad", "LOC"),
    "बेंगलुरु": ("Bengaluru", "LOC"), "चेन्नई": ("Chennai", "LOC"), "मुंबई": ("Mumbai", "LOC"),
    "दिल्ली": ("Delhi", "LOC"), "कोलकाता": ("Kolkata", "LOC"), "पुणे": ("Pune", "LOC"),
    "विशाखापट्टनम": ("Visakhapatnam", "LOC"), "गूगल": ("Google", "ORG"),
    "माइक्रोसॉफ्ट": ("Microsoft", "ORG"), "इसरो": ("ISRO", "ORG"),
    # Telugu
    "రాహుల్": ("Rahul", "PER"), "రోహిత్": ("Rohit", "PER"), "సచిన్": ("Sachin", "PER"),
    "ప్రియ": ("Priya", "PER"), "పూజ": ("Pooja", "PER"), "అనన్య": ("Ananya", "PER"),
    "సురేష్": ("Suresh", "PER"), "రమేష్": ("Ramesh", "PER"), "అమిత్": ("Amit", "PER"),
    "విక్రమ్": ("Vikram", "PER"), "స్నేహ": ("Sneha", "PER"), "ప్రకాష్": ("Prakash", "PER"),
    "రూపాలి": ("Rupali", "PER"), "శర్మ": ("Sharma", "PER"), "వర్మ": ("Verma", "PER"),
    "సింగ్": ("Singh", "PER"), "కుమార్": ("Kumar", "PER"), "రెడ్డి": ("Reddy", "PER"),
    "రావు": ("Rao", "PER"), "నాయుడు": ("Naidu", "PER"), "హైదరాబాద్": ("Hyderabad", "LOC"),
    "బెంగళూరు": ("Bengaluru", "LOC"), "చెన్నై": ("Chennai", "LOC"), "ముంబై": ("Mumbai", "LOC"),
    "ఢిల్లీ": ("Delhi", "LOC"), "విశాఖపట్నం": ("Visakhapatnam", "LOC"), "విజయవాడ": ("Vijayawada", "LOC"),
    "తిరుపతి": ("Tirupati", "LOC"), "వరంగల్": ("Warangal", "LOC"), "గూగుల్": ("Google", "ORG"),
    "మైక్రోసాఫ్ట్": ("Microsoft", "ORG"), "ఇస్రో": ("ISRO", "ORG"),
    # Tamil
    "ராகுல்": ("Rahul", "PER"), "ரோஹித்": ("Rohit", "PER"), "சச்சின்": ("Sachin", "PER"),
    "பிரியா": ("Priya", "PER"), "பூஜா": ("Pooja", "PER"), "சுரேஷ்": ("Suresh", "PER"),
    "ரமேஷ்": ("Ramesh", "PER"), "சர்மா": ("Sharma", "PER"), "வர்மா": ("Verma", "PER"),
    "ஹைதராபாத்": ("Hyderabad", "LOC"), "பெங்களூரு": ("Bengaluru", "LOC"),
    "சென்னை": ("Chennai", "LOC"), "மும்பை": ("Mumbai", "LOC"), "தில்லி": ("Delhi", "LOC"),
    # Kannada
    "ರಾಹುಲ್": ("Rahul", "PER"), "ರೋಹಿತ್": ("Rohit", "PER"), "ಸಚಿನ್": ("Sachin", "PER"),
    "ಪ್ರಿಯಾ": ("Priya", "PER"), "ಪೂಜಾ": ("Pooja", "PER"), "ಸುರೇಶ್": ("Suresh", "PER"),
    "ರಮೇಶ್": ("Ramesh", "PER"), "ಶರ್ಮಾ": ("Sharma", "PER"), "ವರ್ಮಾ": ("Verma", "PER"),
    "ಹೈದರಾಬಾದ್": ("Hyderabad", "LOC"), "ಬೆಂಗಳೂರು": ("Bengaluru", "LOC"),
    "ದೆಹಲಿ": ("Delhi", "LOC"), "ಮುಂಬೈ": ("Mumbai", "LOC"), "ಚೆನ್ನೈ": ("Chennai", "LOC"),
}

# Words that can be ambiguous (proper noun vs common noun)
AMBIGUOUS_NOUN_TERMS = {
    "anand": "Can refer to person 'Anand' or Sanskrit/Hindi concept of bliss/joy",
    "pooja": "Can refer to person 'Pooja' or Hindu ritual of worship",
    "puja": "Can refer to person 'Puja' or Hindu ritual of worship",
    "karan": "Can refer to person 'Karan' or Hindi noun 'reason/cause'",
    "tara": "Can refer to person 'Tara' or Hindi/Sanskrit noun 'star'",
    "surya": "Can refer to person 'Surya' or Sanskrit noun 'sun'",
    "raj": "Can refer to person 'Raj' or noun 'rule/regime'",
    "kalyan": "Can refer to person 'Kalyan' or noun 'welfare/auspiciousness'",
    "vijay": "Can refer to person 'Vijay' or noun 'victory'",
    "shanti": "Can refer to person 'Shanti' or noun 'peace'",
    "prem": "Can refer to person 'Prem' or noun 'love'",
    "kamal": "Can refer to person 'Kamal' or noun 'lotus'",
    "kiran": "Can refer to person 'Kiran' or noun 'ray of light'",
    "sneha": "Can refer to person 'Sneha' or noun 'affection/friendship'",
    "swati": "Can refer to person 'Swati' or star/nakshatra",
    "deepa": "Can refer to person 'Deepa' or noun 'lamp/light'",
}


def _get_target_transliterations(entity_text: str, category: str) -> dict[str, str]:
    """Retrieve or synthesize target script representations for an entity."""
    clean_lower = entity_text.strip().lower()

    # Exact dictionary match
    if clean_lower in CANONICAL_ENTITY_TRANSLITERATIONS:
        return CANONICAL_ENTITY_TRANSLITERATIONS[clean_lower].copy()

    # Compound name match, e.g. "Rahul Sharma"
    words = clean_lower.split()
    if len(words) > 1:
        res: dict[str, list[str]] = {"te": [], "hi": [], "ta": [], "kn": [], "en": []}
        all_found = True
        for w in words:
            if w in CANONICAL_ENTITY_TRANSLITERATIONS:
                for lang in ("te", "hi", "ta", "kn", "en"):
                    res[lang].append(CANONICAL_ENTITY_TRANSLITERATIONS[w].get(lang, w))
            else:
                all_found = False
                break
        if all_found:
            return {lang: " ".join(toks) for lang, toks in res.items()}

    # Acronym or uppercase tech organization: preserve original Latin text across scripts
    if category in ("ORG", "PROPN") and (entity_text.isupper() or len(entity_text) <= 5):
        return {"te": entity_text, "hi": entity_text, "ta": entity_text, "kn": entity_text, "en": entity_text}

    # Capitalized single proper noun fallback
    cap = entity_text.title()
    return {"en": cap}


def detect_named_entities(text: str) -> list[EntityItem]:
    """Extract Named Entities with span locations, categories, confidence, and target representations."""
    entities: list[EntityItem] = []
    if not text or not text.strip():
        return entities

    raw_text = text.strip()
    tokens_with_spans = [(m.group(0), m.start(), m.end()) for m in re.finditer(r"\S+", raw_text)]
    words_clean = [re.sub(r"[^\w]", "", tok) for tok, _, _ in tokens_with_spans]

    # Track covered character intervals to avoid duplicate overlapping spans
    covered_spans: set[tuple[int, int]] = set()

    def is_covered(s: int, e: int) -> bool:
        for cs, ce in covered_spans:
            if not (e <= cs or s >= ce):
                return True
        return False

    def add_entity(
        ent_text: str,
        cat: str,
        start_idx: int,
        end_idx: int,
        conf: float,
        is_ambig: bool,
        expl: str,
    ):
        if not is_covered(start_idx, end_idx) and ent_text.strip():
            covered_spans.add((start_idx, end_idx))
            trans_dict = _get_target_transliterations(ent_text, cat)
            entities.append({
                "text": ent_text,
                "category": cat,
                "start": start_idx,
                "end": end_idx,
                "confidence": round(conf, 2),
                "is_ambiguous": is_ambig,
                "explanation": expl,
                "target_transliterations": trans_dict,
            })

    # 1. Native Indic Script Entity Lookup
    for native_word, (roman_equiv, cat) in NATIVE_TO_LATIN_ENTITIES.items():
        for match in re.finditer(re.escape(native_word), raw_text):
            s, e = match.start(), match.end()
            add_entity(
                ent_text=native_word,
                cat=cat,
                start_idx=s,
                end_idx=e,
                conf=0.96,
                is_ambig=False,
                expl=f"Identified native Indic {cat} entity '{native_word}' (Latin: {roman_equiv}).",
            )

    # 2. Multi-word Latin Person Names (First name + Surname)
    i = 0
    while i < len(tokens_with_spans) - 1:
        w1_raw, s1, _ = tokens_with_spans[i]
        w2_raw, _, e2 = tokens_with_spans[i + 1]
        w1_clean = words_clean[i].lower()
        w2_clean = words_clean[i + 1].lower()

        # Check First Name + Surname
        is_fn = w1_clean in INDIAN_FIRST_NAMES_LATIN or (w1_raw.istitle() and len(w1_raw) >= 3)
        is_sn = w2_clean in INDIAN_SURNAMES_LATIN

        if is_fn and is_sn and not is_covered(s1, e2):
            full_span_text = raw_text[s1:e2].strip(".,!?:;\"'()")
            add_entity(
                ent_text=full_span_text,
                cat="PER",
                start_idx=s1,
                end_idx=e2,
                conf=0.98,
                is_ambig=False,
                expl=f"Identified compound full Indian person name: '{full_span_text}'.",
            )
            i += 2
            continue

        # Two-word Location match (e.g. "New Delhi", "Andhra Pradesh", "Tamil Nadu", "Uttar Pradesh")
        loc_candidate = f"{w1_clean} {w2_clean}"
        if loc_candidate in INDIAN_LOCATIONS_LATIN and not is_covered(s1, e2):
            full_span_text = raw_text[s1:e2].strip(".,!?:;\"'()")
            add_entity(
                ent_text=full_span_text,
                cat="LOC",
                start_idx=s1,
                end_idx=e2,
                conf=0.98,
                is_ambig=False,
                expl=f"Identified compound geographic location: '{full_span_text}'.",
            )
            i += 2
            continue

        i += 1

    # 3. Single-word Entities with Context Clues
    for idx, (tok_raw, s_pos, e_pos) in enumerate(tokens_with_spans):
        w_clean = words_clean[idx].lower()
        if not w_clean or is_covered(s_pos, e_pos):
            continue

        # Check Prev/Next contextual postpositions
        prev_word = words_clean[idx - 1].lower() if idx > 0 else ""
        next_word = words_clean[idx + 1].lower() if idx + 1 < len(words_clean) else ""

        has_honorific = prev_word in HONORIFICS
        has_person_marker = next_word in INDIC_PERSON_POSTPOSITIONS or prev_word in {"naam", "peru", "peyar", "hesaru"}
        has_loc_marker = next_word in INDIC_LOCATIVE_POSTPOSITIONS

        is_ambig = w_clean in AMBIGUOUS_NOUN_TERMS
        ambig_note = AMBIGUOUS_NOUN_TERMS.get(w_clean, "")

        clean_span_text = raw_text[s_pos:e_pos].strip(".,!?:;\"'()")

        # Organizations
        if w_clean in ORGANIZATIONS_LATIN:
            add_entity(
                ent_text=clean_span_text,
                cat="ORG",
                start_idx=s_pos,
                end_idx=e_pos,
                conf=0.95,
                is_ambig=False,
                expl=f"Recognized organization/enterprise: '{clean_span_text}'.",
            )
            continue

        # Known Locations
        if w_clean in INDIAN_LOCATIONS_LATIN or (has_loc_marker and tok_raw.istitle()):
            add_entity(
                ent_text=clean_span_text,
                cat="LOC",
                start_idx=s_pos,
                end_idx=e_pos,
                conf=0.95 if w_clean in INDIAN_LOCATIONS_LATIN else 0.85,
                is_ambig=False,
                expl=f"Recognized geographical location: '{clean_span_text}'{' (corroborated by locative marker)' if has_loc_marker else ''}.",
            )
            continue

        # Known First Names or Surnames
        if w_clean in INDIAN_FIRST_NAMES_LATIN or w_clean in INDIAN_SURNAMES_LATIN:
            # Context clarifies ambiguous words
            is_capitalized = tok_raw.istitle() or tok_raw.isupper()
            conf = 0.95 if (is_capitalized or has_honorific or has_person_marker) else (0.75 if is_ambig else 0.88)
            expl = (
                f"Recognized person name '{clean_span_text}'."
                + (f" Context note: {ambig_note}." if is_ambig else "")
            )
            add_entity(
                ent_text=clean_span_text,
                cat="PER",
                start_idx=s_pos,
                end_idx=e_pos,
                conf=conf,
                is_ambig=is_ambig and not (has_honorific or has_person_marker),
                expl=expl,
            )
            continue

        # Honorific preceding capitalized word (e.g. "Dr. Kalam", "Prof. Rao")
        if has_honorific and tok_raw.istitle():
            add_entity(
                ent_text=clean_span_text,
                cat="PER",
                start_idx=s_pos,
                end_idx=e_pos,
                conf=0.90,
                is_ambig=False,
                expl=f"Recognized person proper noun '{clean_span_text}' following title '{prev_word}'.",
            )
            continue

        # Suffix postposition indicating person (e.g. "Suresh garu", "Amit ji")
        if has_person_marker and tok_raw.istitle():
            add_entity(
                ent_text=clean_span_text,
                cat="PER",
                start_idx=s_pos,
                end_idx=e_pos,
                conf=0.92,
                is_ambig=False,
                expl=f"Recognized person proper noun '{clean_span_text}' qualified by honorific/marker '{next_word}'.",
            )
            continue

    # Sort entities by order of appearance
    entities.sort(key=lambda x: x["start"])
    return entities


def is_pure_named_entity(text: str) -> Optional[EntityItem]:
    """Return entity if input consists solely of a recognized named entity."""
    stripped = text.strip().strip(".,!?:;\"'()")
    entities = detect_named_entities(stripped)
    if len(entities) == 1:
        ent = entities[0]
        # Check if the entity spans the entire string
        if ent["text"].lower() == stripped.lower():
            return ent
    return None


extract_named_entities = detect_named_entities


def transliterate_entity(entity_text: str, category: str, lang_code: str) -> str:
    """Retrieve canonical target transliteration for an entity if available, else original."""
    trans_map = _get_target_transliterations(entity_text, category)
    return trans_map.get(lang_code, entity_text)

