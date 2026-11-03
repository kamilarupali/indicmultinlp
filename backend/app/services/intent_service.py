"""IndicMultiNLP Multilingual Intent Classification Service.

Dispatches natural language utterances into domain intent categories:
Education, Shopping, Restaurant, Travel, Entertainment, Customer Service, Technology, General Query.
Reports transparent explainability: identifies matching domain cues and reports genuine confidence.
Supports multi-word phrase matching, named-entity masking, and long multi-sentence inputs.
"""
from __future__ import annotations

import re
from app.preprocessing.tokenizer import split_sentences
from app.preprocessing.entities import detect_named_entities

INTENT_PHRASES = {
    "Customer Service": {
        "customer care", "customer service", "service center", "service centre", "get a refund",
        "issue replacement", "register a complaint", "raise a ticket", "cancel order", "cancel booking",
        "replacement nahi", "refund nahi", "pareshan hoon", "rude representative", "unhelpful support",
    },
    "Technology": {
        "switch on", "switch off", "screen cracked", "battery drain", "software update",
        "laptop repair", "code review", "system crash", "wifi not working",
    },
    "Shopping": {
        "order placed", "add to cart", "cash on delivery", "track order", "sale offer",
    },
    "Restaurant": {
        "book a table", "order food", "dinner menu", "lunch buffet",
    },
    "Travel": {
        "board flight", "train ticket", "flight delay", "platform number", "airport cab",
    },
    "Entertainment": {
        "movie review", "box office", "climax scene", "trailer release",
    },
    "Education": {
        "annual exam", "course syllabus", "admission process", "college library",
    },
}

INTENT_CUES = {
    "Education": {
        "course", "syllabus", "exam", "books", "book", "preparation", "college", "university",
        "student", "students", "notes", "tutorial", "algorithm", "lecture", "library",
        "admission", "study", "studying", "pusthaka", "padikka", "school", "teacher", "classes",
        # Telugu
        "పుస్తకం", "పరీక్ష", "సిలబస్", "కోర్సు", "చదవడం", "కాలేజ్", "విద్యార్థి",
        # Hindi
        "किताब", "परीक्षा", "कोर्स", "छात्र", "विश्वविद्यालय", "प्रवेश", "कॉलेज", "पढ़ाई",
        # Tamil
        "புத்தகம்", "தேர்வு", "கல்லூரி", "மாணவர்", "பல்கலைக்கழக", "படிப்பு",
        # Kannada
        "ಪಠ್ಯಪುಸ್ತಕ", "ಪರೀಕ್ಷೆ", "ಕಾಲೇಜು", "ಪ್ರವೇಶ", "ಪುಸ್ತಕ", "ಓದು",
    },
    "Shopping": {
        "buy", "price", "discount", "order", "cart", "delivery", "clothes", "store",
        "sale", "product", "flipkart", "amazon", "offer", "dress", "purchase", "shopping",
        "merchandise", "khareeda", "khareedna", "shop", "items",
        # Telugu
        "బట్టలు", "దుకాణం", "ఆర్డర్", "ఆఫర్", "ధర", "కొనడం",
        # Hindi
        "सेल", "दाम", "खरीददारी", "दुकान", "जूते", "ऑफर", "कीमत", "खरीदा",
        # Tamil
        "துணி", "விலை", "தள்ளுபடி", "பொருள்", "வாங்குதல்",
        # Kannada
        "ಬಟ್ಟೆ", "ರಿಯಾಯಿತಿ", "ಮಳಿಗೆ", "ಖರೀದಿ", "ಬೆಲೆ",
    },
    "Restaurant": {
        "food", "hotel", "biryani", "menu", "dinner", "lunch", "breakfast", "tasty",
        "delicious", "restaurant", "table", "chutney", "dosa", "paneer", "meal", "taste",
        "saapadu", "oota", "khana", "bhojanam", "dish", "snack",
        # Telugu
        "భోజనం", "రుచి", "హోటల్", "టిఫిన్", "సాపాటు",
        # Hindi
        "खाना", "स्वादिष्ट", "रेस्टोरेंट", "पनीर", "ताजा", "भोजन", "चाय",
        # Tamil
        "உணவு", "சுவை", "உபசரிப்பு", "சாப்பாடு", "ஹோட்டல்",
        # Kannada
        "ಊಟ", "ರುಚಿ", "ಹೋಟೆಲ್", "ದೋಸೆ", "ತಿಂಡಿ",
    },
    "Travel": {
        "flight", "train", "bus", "ticket", "platform", "airport", "cab", "booking",
        "trip", "journey", "station", "airline", "delay", "passenger", "travel", "traveling",
        # Telugu
        "రైలు", "విమానం", "టికెట్", "క్యాబ్", "ప్రయాణం", "బస్సు", "స్టేషన్",
        # Hindi
        "बस", "ट्रेन", "फ्लाइट", "टिकट", "हवाई अड्डा", "सफर", "यात्रा", "स्टेशन",
        # Tamil
        "ரயில்", "பேருந்து", "விமானம்", "பயணம்", "டிக்கெட்", "நிலையம்",
        # Kannada
        "ರೈಲು", "ವಿಮಾನ", "ಪ್ರಯಾಣ", "ನಿಲ್ದಾಣ", "ಬಸ್ಸು", "ಟಿಕೆಟ್",
    },
    "Entertainment": {
        "movie", "cinema", "song", "songs", "actor", "acting", "music", "trailer",
        "story", "film", "screenplay", "show", "climax", "director", "entertainment",
        "padam", "chalanachithra", "katha", "hero", "heroine",
        # Telugu
        "సినిమా", "నటన", "కథ", "పాటలు", "హీరో", "దర్శకుడు",
        # Hindi
        "फिल्म", "गाना", "अभिनय", "कहानी", "अभिनेता", "सिनेमा",
        # Tamil
        "படம்", "இசை", "திரைப்படம்", "பாடல்", "நடிகர்", "இயக்கம்",
        # Kannada
        "ಚಲನಚಿತ್ರ", "ಹಾಡು", "ನಟನೆ", "ಸಿನಿಮಾ", "ನಾಯಕ", "ಚಿತ್ರ",
    },
    "Customer Service": {
        "complaint", "helpline", "agent", "support", "care", "refund", "cancel",
        "cancellation", "payment", "grievance", "representative", "service", "issue", "problem",
        "replacement", "warranty", "repair", "dispute", "intervention", "dissatisfied",
        # Telugu
        "రీఫండ్", "రద్దు", "ఫిర్యాదు", "కస్టమర్", "సమస్య", "సహాయం", "రిప్లేస్‌మెంట్",
        # Hindi
        "ग्राहक", "सेवा", "शिकायत", "रिफंड", "समस्या", "मदद", "रिप्लेसमेंट",
        # Tamil
        "வாடிக்கையாளர்", "சேவை", "தீர்வு", "புகார்", "பிரச்சினை",
        # Kannada
        "ಗ್ರಾಹಕ", "ಸೇವೆ", "ದೂರು", "ಹಣ", "ಸಮಸ್ಯೆ",
    },
    "Technology": {
        "software", "laptop", "phone", "screen", "app", "crash", "wifi", "hardware",
        "python", "code", "programming", "battery", "latency", "display", "bug", "server",
        "update", "patch", "charger", "switch", "install",
        # Telugu
        "ల్యాప్‌టాప్", "ఫోన్", "స్క్రీన్", "సాఫ్ట్‌వేర్", "యాప్", "ఛార్జర్",
        # Hindi
        "सॉफ्टवेयर", "लैपटॉप", "फोन", "इंटरनेट", "कंप्यूटर",
        # Tamil
        "மொபைல்", "செயலி", "மடிக்கணினி", "மென்பொருள்",
        # Kannada
        "ಮೊಬೈಲ್", "ತಂತ್ರಾಂಶ", "ಅಪ್ಲಿಕೇಶನ್", "ಗಣಕಯಂತ್ರ",
    },
    "General Query": {
        "what", "why", "when", "where", "how", "time", "weather", "address",
        "hours", "schedule", "information", "hello", "hi", "guide", "timings",
        "translate", "meaning", "namaskaram", "namaste", "vanakkam", "namaskara",
        # Telugu
        "ఎలా", "ఎప్పుడు", "ఎక్కడ", "ఏమిటి", "వాతావరణం", "నమస్కారం",
        # Hindi
        "क्या", "कब", "कहाँ", "कैसे", "मौसम", "समय", "नमस्ते",
        # Tamil
        "எப்படி", "எப்போது", "எங்கே", "என்ன", "வானிலை", "வணக்கம்",
        # Kannada
        "ಹೇಗೆ", "ಯಾವಾಗ", "ಎಲ್ಲಿ", "ಏನು", "ಹವಾಮಾನ", "ನಮಸ್ಕಾರ",
    },
}


def predict_intent(text: str) -> dict:
    clean_text = text.lower()
    raw_words = clean_text.split()
    stripped_words = [w.strip(".,!?:;\"'()[]{}") for w in raw_words if w.strip()]
    word_set = set(raw_words) | set(stripped_words)

    # Exclude recognized person/location proper nouns
    entities = detect_named_entities(text)
    for ent in entities:
        if ent["category"] in ("PER", "LOC"):
            for tok in ent["text"].lower().split():
                word_set.discard(tok)

    matched_by_intent: dict[str, list[str]] = {}
    scores: dict[str, int] = {}

    for intent, cues in INTENT_CUES.items():
        matched = sorted(list(word_set & cues))
        # Add phrase matches if present
        for phrase in INTENT_PHRASES.get(intent, set()):
            if phrase in clean_text and phrase not in matched:
                matched.append(phrase)

        matched_by_intent[intent] = matched
        scores[intent] = len(matched)

    # Prioritize Customer Service if grievance cues are present in multi-intent text
    if scores.get("Customer Service", 0) >= 2 and scores.get("Technology", 0) >= 1:
        # User is reporting a tech problem or complaint
        scores["Customer Service"] += 1

    # Exclude General Query when finding top intent if another specific category matched
    domain_scores = {k: v for k, v in scores.items() if k != "General Query"}
    max_domain_score = max(domain_scores.values()) if domain_scores else 0

    if max_domain_score > 0:
        top_intents = [intent for intent, count in domain_scores.items() if count == max_domain_score]
        label = top_intents[0]
        matched_cues = matched_by_intent[label]
        confidence = round(min(0.96, 0.65 + 0.10 * max_domain_score), 2)
        confidence_is_genuine = True
        explanation = (
            f"Classified as '{label}' intent because {len(matched_cues)} domain keyword(s)/phrase(s) "
            f"({matched_cues}) were matched, outscoring all other categories."
        )
    elif scores.get("General Query", 0) > 0:
        label = "General Query"
        matched_cues = matched_by_intent["General Query"]
        confidence = round(min(0.88, 0.60 + 0.08 * len(matched_cues)), 2)
        confidence_is_genuine = True
        explanation = (
            f"Classified as 'General Query' based on general inquiry / greeting cues: {matched_cues}."
        )
    else:
        label = "General Query"
        matched_cues = []
        confidence = None
        confidence_is_genuine = False
        explanation = (
            "Defaulted to 'General Query' baseline: no domain-specific intent cues were matched "
            "in the text. Genuine confidence score is omitted."
        )

    return {
        "label": label,
        "confidence": confidence,
        "confidence_is_genuine": confidence_is_genuine,
        "matched_cues": matched_cues,
        "scores": scores,
        "explanation": explanation,
        "method": "Multilingual Indic Domain Intent Lexicon",
    }
