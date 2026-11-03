"""IndicMultiNLP Multilingual Sentiment Analysis Service.

Evaluates sentiment across Dravidian, Indo-Aryan, and English expressions.
Supports:
- Multi-word sentiment phrases ("chala bagundi", "bohot accha", "ekdum mast", etc.)
- Negation handling ("not good", "no problem", "problem ledu", "nahi chal raha", etc.)
- Named entity masking (prevents proper nouns like Anand, Pooja, Shanti from skewing polarity)
- Multi-sentence long text processing with per-sentence breakdown and overall document polarity.
- Genuine explainability and honest uncalibrated baseline for neutral text.
"""
from __future__ import annotations

import re
from typing import Optional
from app.preprocessing.tokenizer import split_sentences
from app.preprocessing.entities import detect_named_entities

# Single word and multi-word positive cues
POSITIVE_PHRASES = {
    # English
    "very good", "extremely good", "really loved", "great quality", "highly recommend",
    "excellent service", "worth buying", "worked perfectly",
    # Telugu
    "chala bagundi", "chaalaa bagundi", "super ga undi", "adbhutamga undi", "baga undi",
    "chala manchi", "super ga",
    # Hindi
    "bahut accha", "bahut acchi", "bohot accha", "bohot acchi", "ekdum mast", "sundar laga",
    "bada accha", "shandar performance", "pasand aaya", "khoob sundar",
    # Tamil
    "romba nalla", "romba nallaa", "arumaiyaaga irukku", "super ah irukku", "sema padham",
    # Kannada
    "thumba chennagide", "tumba chennagide", "adbhutavagi ide", "channagi ide",
}

POSITIVE_WORDS = {
    # English
    "good", "great", "love", "loved", "loving", "excellent", "magnificent", "stunning",
    "delicious", "lucid", "seamless", "fantastic", "wonderful", "authentic", "informative",
    "super", "happy", "best", "brilliant", "awesome", "perfect", "enjoyed", "enjoyable",
    "liked", "nice", "pleased", "satisfied", "impressive", "outstanding", "fabulous",
    "smooth", "prompt", "helpful", "reliable", "phenomenal",
    # Telugu (Native + Romanized)
    "బాగుంది", "అద్భుతంగా", "రుచిగా", "మంచి", "గొప్ప", "సంతోషం", "అద్భుతం", "సూపర్",
    "మెచ్చిన", "సంతోషకరమైన", "హర్షణీయం", "ప్రశంసనీయం",
    "bagundi", "baagundi", "super", "tasty", "manchi", "adbhutam", "santosham", "goppa",
    # Hindi (Native + Romanized)
    "अच्छा", "अच्छी", "सुंदर", "स्वादिष्ट", "प्रेरणादायक", "बढ़िया", "ताजा", "शानदार", "सफल", "मस्त",
    "संतुष्ट", "पसंदीदा", "उम्दा", "तारीफ", "खुशी",
    "acchi", "achhi", "accha", "achha", "mast", "sundar", "shandar", "badhiya", "khush",
    "khushi", "taza", "swadisht",
    # Tamil (Native + Romanized)
    "அருமை", "சிறப்பு", "சுவை", "அமைதி", "அருமையாக", "வசதி", "நல்ல", "பிரமாதம்", "சூப்பர்",
    "nalla", "nallaa", "sema", "arumai", "pramatham", "pidithadhu", "vetri",
    # Kannada (Native + Romanized)
    "ಅದ್ಭುತ", "ರುಚಿ", "ಸ್ವಚ್ಛ", "ಉತ್ತಮ", "ಸಂತೋಷ", "ಮುದ", "ರುಚಿಕರ", "ಚೆನ್ನಾಗಿದೆ", "ಸೂಪರ್",
    "chennagide", "channagide", "uttam", "adbhutha", "santhosha",
}

NEGATIVE_PHRASES = {
    # English
    "not working", "screen cracked", "charger missing", "very dissatisfied", "horrible experience",
    "poor quality", "worst service", "waste of money", "refused refund", "broken package",
    "delivery late", "battery drains", "completely useless",
    # Telugu
    "pani cheyadam ledu", "nachaledu", "bavale ledu", "vyartham ayindi", "late ga vacharu",
    "technical problems", "work avadam ledu", "switch on avadam ledu",
    # Hindi
    "band ho gayi", "switch on nahi", "kaam nahi kar raha", "pareshan hoon", "pareshan hu",
    "bekar service", "thanda khana", "kharab ho gaya", "replacement nahi mila", "refund nahi diya",
    # Tamil
    "vela seiyala", "pidikkavillai", "mosamaana service", "late ah vandhadhu",
    # Kannada
    "kelsa madthilla", "tumba kettadagithu", "ishta aagilla",
}

NEGATIVE_WORDS = {
    # English
    "bad", "worst", "poor", "mediocre", "unclean", "disjointed", "broken", "rude",
    "damaged", "crashed", "terrible", "horrible", "error", "hate", "hated", "sad",
    "fail", "failed", "failing", "delay", "delayed", "boring", "useless", "waste",
    "disappointed", "disappointing", "dissatisfied", "slow", "pathetic", "defective",
    "cracked", "missing", "faulty", "frustrating", "painful", "cheated", "fraud",
    "regret", "trouble", "refused", "unhelpful",
    # Telugu (Native + Romanized)
    "బాలేదు", "చెడ్డ", "చెత్త", "నెమ్మదిగా", "నచ్చలేదు", "బాధ", "వ్యర్థం", "లోపం", "విరిగిపోయిన",
    "కష్టం", "ఆలస్యం",
    "worst", "waste", "late", "damage", "boring", "kaledu", "bavale", "chedda", "ledu",
    "ledhu", "nachaledu", "kashtam",
    # Hindi (Native + Romanized)
    "खराब", "धीमा", "बेकार", "ठंडा", "बुरा", "दुखी", "हानिकारक", "घटिया", "बकवास", "नुकसान",
    "टूटा", "परेशान", "कठिन",
    "bekar", "ganda", "thanda", "kharab", "ghatiya", "bakwas", "bura", "pareshan", "toota",
    "dukh", "mushkil", "deri",
    # Tamil (Native + Romanized)
    "மோசம்", "அசுத்தம்", "தாமதம்", "சேதம்", "கெட்ட", "பிடிக்கவில்லை", "மொக்கை",
    "kevalam", "kevalama", "mokkai", "sodhappal", "mosam", "illai", "illa",
    # Kannada (Native + Romanized)
    "ಕಷ್ಟ", "ತಡ", "ಕಳಪೆ", "ಕೆಟ್ಟ", "ಬೇಸರ", "ತೊಂದರೆ", "ವ್ಯರ್ಥ",
    "kettadagithu", "kettadu", "dolu", "waste", "illa",
}

# Negation operators that invert adjacent polarity
NEGATIONS = {
    "not", "no", "never", "neither", "nor", "none",
    "nahi", "nahin", "na",
    "ledu", "ledhu", "kaledu", "vaddu", "voddu",
    "illai", "illa",
    "beda",
}

# Proper nouns that can overlap with sentiment words when used as common nouns
AMBIGUOUS_NAME_WORDS = {"anand", "pooja", "puja", "shanti", "vijay", "kalyan", "prem", "kamal", "kiran", "sneha", "tara"}


def _analyze_sentence(sentence: str, excluded_words: set[str]) -> dict:
    """Analyze sentiment polarity for a single sentence."""
    lower_sent = sentence.lower()
    raw_tokens = [w.strip(".,!?:;\"'()[]{}") for w in lower_sent.split() if w.strip()]
    word_set = set(raw_tokens) - excluded_words

    pos_cues: list[str] = []
    neg_cues: list[str] = []

    # 1. Multi-word phrase matches
    for phrase in POSITIVE_PHRASES:
        if phrase in lower_sent:
            pos_cues.append(phrase)

    for phrase in NEGATIVE_PHRASES:
        if phrase in lower_sent:
            neg_cues.append(phrase)

    # 2. Individual word matches with local negation window
    for idx, token in enumerate(raw_tokens):
        if token in excluded_words:
            continue

        prev_1 = raw_tokens[idx - 1] if idx > 0 else ""
        prev_2 = raw_tokens[idx - 2] if idx > 1 else ""
        has_negation = prev_1 in NEGATIONS or prev_2 in NEGATIONS

        if token in POSITIVE_WORDS:
            if has_negation:
                neg_cues.append(f"{prev_1} {token}".strip())
            else:
                if token not in pos_cues and not any(token in p for p in pos_cues):
                    pos_cues.append(token)

        elif token in NEGATIVE_WORDS:
            if has_negation:
                # "not bad", "no problem"
                pos_cues.append(f"{prev_1} {token}".strip())
            else:
                if token not in neg_cues and not any(token in p for p in neg_cues):
                    neg_cues.append(token)

    # Remove duplicates
    pos_cues = sorted(list(set(pos_cues)))
    neg_cues = sorted(list(set(neg_cues)))
    score = len(pos_cues) - len(neg_cues)

    return {
        "text": sentence,
        "positive_cues": pos_cues,
        "negative_cues": neg_cues,
        "score": score,
    }


def predict_sentiment(text: str) -> dict:
    clean_text = text.strip()
    if not clean_text:
        return {
            "label": "Neutral",
            "confidence": None,
            "confidence_is_genuine": False,
            "positive_cues": [],
            "negative_cues": [],
            "polarity_score": 0,
            "explanation": "No text provided for sentiment analysis.",
            "method": "Multilingual Indic Sentiment Lexicon",
        }

    # Extract named entities to prevent person names (e.g. Pooja, Anand) from triggering false sentiment
    entities = detect_named_entities(clean_text)
    excluded_entity_words = set()
    for ent in entities:
        if ent["category"] in ("PER", "ORG", "LOC"):
            for tok in ent["text"].lower().split():
                if tok in AMBIGUOUS_NAME_WORDS:
                    excluded_entity_words.add(tok)

    # Segment into sentences
    sentences = split_sentences(clean_text)
    sent_results = [_analyze_sentence(s, excluded_entity_words) for s in sentences]

    all_pos_cues: list[str] = []
    all_neg_cues: list[str] = []
    total_score = 0

    for sr in sent_results:
        all_pos_cues.extend(sr["positive_cues"])
        all_neg_cues.extend(sr["negative_cues"])
        total_score += sr["score"]

    all_pos_cues = sorted(list(set(all_pos_cues)))
    all_neg_cues = sorted(list(set(all_neg_cues)))

    pos_count = len(all_pos_cues)
    neg_count = len(all_neg_cues)
    net_score = pos_count - neg_count

    # Determine document label
    if net_score > 0:
        label = "Positive"
        conf = round(min(0.96, 0.65 + 0.08 * pos_count), 2)
        confidence_is_genuine = True
        explanation = (
            f"Classified as Positive sentiment: identified {pos_count} positive cue word(s)/phrase(s) "
            f"({all_pos_cues}) versus {neg_count} negative cue(s). Net polarity score: +{net_score}."
        )
    elif net_score < 0:
        label = "Negative"
        conf = round(min(0.96, 0.65 + 0.08 * neg_count), 2)
        confidence_is_genuine = True
        explanation = (
            f"Classified as Negative sentiment: identified {neg_count} negative cue word(s)/phrase(s) "
            f"({all_neg_cues}) versus {pos_count} positive cue(s). Net polarity score: -{abs(net_score)}."
        )
    else:
        label = "Neutral"
        if pos_count > 0 and neg_count > 0:
            conf = 0.65
            confidence_is_genuine = True
            explanation = (
                f"Classified as Neutral / Balanced: identified both positive cue(s) ({all_pos_cues}) "
                f"and negative cue(s) ({all_neg_cues}) in equal weight, producing zero net polarity."
            )
        else:
            conf = None
            confidence_is_genuine = False
            explanation = (
                "Classified as Neutral baseline: no strongly polarizing sentiment cue words were "
                "detected in our Indic/English sentiment lexicons. Genuine confidence score is omitted."
            )

    result = {
        "label": label,
        "confidence": conf,
        "confidence_is_genuine": confidence_is_genuine,
        "positive_cues": all_pos_cues,
        "negative_cues": all_neg_cues,
        "polarity_score": net_score,
        "explanation": explanation,
        "method": "Multilingual Indic Sentiment Lexicon (Telugu, Hindi, Tamil, Kannada, English)",
    }

    if len(sentences) > 1:
        result["sentence_breakdown"] = [
            {
                "sentence": sr["text"],
                "positive_cues": sr["positive_cues"],
                "negative_cues": sr["negative_cues"],
                "polarity": "Positive" if sr["score"] > 0 else ("Negative" if sr["score"] < 0 else "Neutral"),
            }
            for sr in sent_results
        ]

    return result
