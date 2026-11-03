"""IndicMultiNLP Multilingual Voice & Text Assistant Service.

Operates as a real AI Multilingual Voice Assistant and Translator:
Takes any spoken or typed sentence in an Indic language, Romanized text, or code-mixed text,
accurately translates the given sentence into the user's selected target language,
and speaks ONLY the translated sentence in the selected language without any extra conversational filler.

Supported Flow:
Voice/Text → Language Detection → Meaning Translation → Explainable NLP (Sentiment, Intent, CMI) → Target Voice Output (Only Translated Sentence) → Persistent History.
"""
from __future__ import annotations

import re
from typing import Optional

from app.services.analysis_service import analyze
from app.services.translation_service import (
    translate_meaning,
    get_all_multilingual_meanings,
    resolve_lang_code,
    resolve_lang_name,
    resolve_voice_locale,
    LANGUAGE_CODES,
)

QA_KNOWLEDGE_BASE = {
    "cmi": {
        "keywords": [
            "what is cmi",
            "what is code mixing index",
            "what is code-mixing index",
            "code mixing index",
            "code-mixing index",
            "calculate cmi",
            "how is cmi calculated",
            "explain cmi",
            "define cmi",
        ],
        "speech": "Code-Mixing Index, or C M I, quantifies the degree of multilingual switching. It is computed as 100 times 1 minus the maximum language token count divided by total tokens. Pure monolingual text has C M I 0 percent.",
        "text": "Code-Mixing Index (CMI) = 100 * [1 - max(w_i) / N]. A monolingual sentence has CMI = 0%, while bilingual utterances reach up to 50%.",
    },
    "tokenization": {
        "keywords": [
            "what is tokenization",
            "indic tokenization challenges",
            "why tokenization is hard",
            "abugida tokenization",
            "explain indic tokenization",
        ],
        "speech": "Indic tokenization is challenging because abugida writing systems use combining marks, matras, and halants that attach to base consonants. Standard space tokenizers fragment words incorrectly.",
        "text": "Indic orthography uses dependent vowel signs (matras, viramas) and agglutinative compounding (especially in Dravidian languages like Telugu, Tamil, and Kannada). Standard regex \\w splits combining marks.",
    },
    "perplexity": {
        "keywords": [
            "what is perplexity",
            "perplexity in language model",
            "how is perplexity calculated",
            "explain perplexity",
            "define perplexity",
        ],
        "speech": "Perplexity measures the branching factor and uncertainty of a language model. Lower perplexity indicates that the model is more confident in predicting the next Indic token.",
        "text": "Perplexity (PPL) = exp(-1/N * ∑ log P(w_i | context)). Lower values reflect higher predictive certainty.",
    },
    "macro_f1": {
        "keywords": [
            "what is macro f1",
            "macro f1 vs weighted f1",
            "difference between macro f1 and weighted f1",
            "explain macro f1",
        ],
        "speech": "Macro-F1 computes the unweighted average across all classes, penalizing poor performance on minority classes. Weighted-F1 weights each class by its frequency in the test split.",
        "text": "Macro-F1 = (F1_1 + ... + F1_k) / k (treats all classes equally). Weighted-F1 = ∑ (support_i * F1_i) / N (reflects population prevalence).",
    },
}


def _extract_target_language_from_text(query: str) -> Optional[str]:
    """Check if query specifies an explicit target language."""
    lower = query.lower()
    sorted_langs = sorted(LANGUAGE_CODES.keys(), key=lambda x: len(x), reverse=True)
    for name in sorted_langs:
        patterns = [
            rf"\b(?:to|into|in|as)\s+{re.escape(name)}\b",
            rf"\b{re.escape(name)}\s+translation\b",
        ]
        if any(re.search(p, lower) for p in patterns):
            return LANGUAGE_CODES[name]
    return None


def _is_contextual_translation_request(query: str) -> bool:
    """Detect requests that strictly refer to the previous conversation context ('translate that', etc.)."""
    clean = query.strip().lower()
    # Strip optional polite prefixes
    clean = re.sub(r"^(?:please\s+|can you\s+|could you\s+|would you\s+|kindly\s+)+", "", clean).strip()

    patterns = [
        r"^translate\s+(?:that|it|this|the previous sentence|the last sentence|the prior sentence)(?:\s+(?:to|into|in|as)\s+[a-zA-Z\-]+)?[.?!]?$",
        r"^what does (?:that|it|this|the previous sentence|the last sentence) mean(?:\s+(?:in|to)\s+[a-zA-Z\-]+)?[.?!]?$",
        r"^how (?:do you|to) say (?:that|it|this)(?:\s+(?:in|to|into)\s+[a-zA-Z\-]+)?[.?!]?$",
        r"^meaning of (?:that|it|this|the previous sentence|the last sentence)(?:\s+(?:in|to)\s+[a-zA-Z\-]+)?[.?!]?$",
        r"^(?:is|us)ko\s+(?:translate\s+karo|translate\s+kijiye|translate\s+cheyyi)(?:\s+(?:to|into|in|mein|me|lo|re)\s+[a-zA-Z\-]+)?[.?!]?$",
        r"^(?:is|us)ka\s+matlab(?:\s+kya\s+hai)?(?:\s+(?:to|into|in|mein|me)\s+[a-zA-Z\-]+)?[.?!]?$",
    ]
    return any(re.match(pat, clean) for pat in patterns)



def _parse_explicit_translation_command(clean_query: str, default_tgt: str) -> tuple[Optional[str], Optional[str]]:
    """Parse explicit translation requests and cleanly extract the exact sentence to translate."""
    explicit_target = _extract_target_language_from_text(clean_query)

    # 1. Quoted content
    match = re.search(r"['\"](.*?)['\"]", clean_query)
    if match:
        extracted = match.group(1).strip()
        if extracted:
            return explicit_target or default_tgt, extracted

    # 2. Colon separator (e.g. "Translate to Odia: How are you?")
    if ":" in clean_query:
        prefix, text_after = clean_query.split(":", 1)
        extracted = text_after.strip()
        if extracted:
            target_from_prefix = _extract_target_language_from_text(prefix)
            return target_from_prefix or explicit_target or default_tgt, extracted

    # 3. Code-mixed / Romanized Indic prefix commands:
    # e.g., "Hindi mein translate karo how are you", "Urdu me bolo good morning", "Odia re translate kara good morning"
    match = re.match(
        r"(?i)^([a-zA-Z\-]+)\s+(?:mein|me|re|lo|la|alli|il)\s+(?:translate karo|translate kijiye|translate cheyyi|translate kara|bolo|boliye|cheppu|para)\s+(.+)$",
        clean_query.strip(),
    )
    if match:
        lang_cand = match.group(1).lower()
        sentence_cand = match.group(2).strip()
        if lang_cand in LANGUAGE_CODES and sentence_cand:
            return LANGUAGE_CODES[lang_cand], sentence_cand

    # e.g., "how are you ko Hindi mein translate karo", "good morning ko Odia me bolo"
    match = re.match(
        r"(?i)^(.+?)\s+(?:ko|ni|annu)\s+([a-zA-Z\-]+)\s+(?:mein|me|re|lo|la|alli|il)\s+(?:translate karo|translate kijiye|translate cheyyi|translate kara|bolo|boliye)[.?!]?$",
        clean_query.strip(),
    )
    if match:
        sentence_cand = match.group(1).strip()
        lang_cand = match.group(2).lower()
        if lang_cand in LANGUAGE_CODES and sentence_cand:
            return LANGUAGE_CODES[lang_cand], sentence_cand

    # e.g., "translate karo how are you to Hindi" / "translate karo good morning Hindi mein"
    match = re.match(
        r"(?i)^(?:translate karo|translate kijiye|translate cheyyi)\s+(.+?)(?:\s+(?:to|into|in|mein|me|lo|re)\s+([a-zA-Z\-]+))?[.?!]?$",
        clean_query.strip(),
    )
    if match:
        sentence_cand = match.group(1).strip()
        lang_cand = (match.group(2) or "").lower()
        if lang_cand in LANGUAGE_CODES:
            return LANGUAGE_CODES[lang_cand], sentence_cand
        if sentence_cand:
            return explicit_target or default_tgt, sentence_cand

    # 4. Standard Prefix language pattern (e.g. "Translate to Odia good morning")
    match = re.match(
        r"(?i)^(?:please\s+|can you\s+|could you\s+)?(?:translate|convert|say)\s+(?:to|into|in)\s+([a-zA-Z\-]+)[:\s]+(.+)$",
        clean_query.strip(),
    )
    if match:
        lang_cand = match.group(1).lower()
        sentence_cand = match.group(2).strip()
        if lang_cand in LANGUAGE_CODES and sentence_cand:
            return LANGUAGE_CODES[lang_cand], sentence_cand

    # 5. Suffix language pattern (e.g. "Translate the food is delicious to Telugu", "How do you say thank you in Tamil")
    match = re.match(
        r"(?i)^(?:please\s+|can you\s+|could you\s+)?(?:translate|convert|how do you say|how to say)\s+(.+?)\s+(?:to|into|in|as)\s+([a-zA-Z\-]+)[.?!]?$",
        clean_query.strip(),
    )
    if match:
        sentence_cand = match.group(1).strip()
        lang_cand = match.group(2).lower()
        if lang_cand in LANGUAGE_CODES and sentence_cand:
            return LANGUAGE_CODES[lang_cand], sentence_cand

    # 6. General translate request (e.g. "Translate this movie is very good")
    match = re.match(
        r"(?i)^(?:please\s+|can you\s+|could you\s+)?(?:translate|convert)\s+(.+)$",
        clean_query.strip(),
    )
    if match:
        sentence_cand = match.group(1).strip()
        # If sentence_cand is a deictic reference to previous sentence ("that", "this", "it", etc.), it is contextual!
        lower_cand = re.sub(r"\s+(?:to|into|in|as)\s+[a-zA-Z\-]+$", "", sentence_cand.lower()).strip(".?! ")
        if lower_cand in {"that", "it", "this", "the previous sentence", "the last sentence", "the prior sentence"}:
            return None, None
        # If the sentence still has a trailing target language, strip it
        trailing = re.match(r"(?i)^(.+?)\s+(?:to|into|in|as)\s+([a-zA-Z\-]+)[.?!]?$", sentence_cand)
        if trailing and trailing.group(2).lower() in LANGUAGE_CODES:
            return LANGUAGE_CODES[trailing.group(2).lower()], trailing.group(1).strip()
        if sentence_cand:
            return explicit_target or default_tgt, sentence_cand

    # 7. "How to say" / "How do you say"
    match = re.match(r"(?i)^(?:how do you say|how to say)\s+(.+)$", clean_query.strip())
    if match:
        sentence_cand = match.group(1).strip()
        lower_cand = re.sub(r"\s+(?:in|to|as)\s+[a-zA-Z\-]+$", "", sentence_cand.lower()).strip(".?! ")
        if lower_cand in {"that", "it", "this", "the previous sentence", "the last sentence", "the prior sentence"}:
            return None, None
        trailing = re.match(r"(?i)^(.+?)\s+(?:in|to|as)\s+([a-zA-Z\-]+)[.?!]?$", sentence_cand)
        if trailing and trailing.group(2).lower() in LANGUAGE_CODES:
            return LANGUAGE_CODES[trailing.group(2).lower()], trailing.group(1).strip()
        return explicit_target or default_tgt, sentence_cand

    return None, None


def process_voice_query(
    query: str,
    target_language: str = "en",
    source_language: Optional[str] = None,
    context: Optional[dict] = None,
    active_model: str = "baseline",
) -> dict:
    """Analyze query, translate the given sentence into the selected language, and speak ONLY the translation."""
    clean_query = query.strip()
    tgt_code = resolve_lang_code(target_language)
    tgt_name = resolve_lang_name(tgt_code)
    speech_lang = resolve_voice_locale(tgt_code)

    if not clean_query:
        empty_msg = "Please speak or type a sentence to translate."
        return {
            "query": "",
            "target_language": tgt_name,
            "target_lang_code": tgt_code,
            "reply_text": empty_msg,
            "speech_text": empty_msg,
            "speech_lang": speech_lang,
            "intent_type": "empty",
        }

    lower_query = clean_query.lower()

    # 1. Check for Contextual Translation ("translate that", "translate that to Tamil", "what does that mean", etc.)
    # Strictly applies ONLY to the user's most recently submitted sentence.
    if _is_contextual_translation_request(lower_query):
        explicit_target = _extract_target_language_from_text(clean_query)
        effective_tgt_code = explicit_target or tgt_code
        effective_tgt_name = resolve_lang_name(effective_tgt_code)
        effective_speech_lang = resolve_voice_locale(effective_tgt_code)

        candidate = (
            (context or {}).get("last_user_sentence")
            or (context or {}).get("last_text_to_translate")
            or (context or {}).get("last_query")
        )
        if candidate and _is_contextual_translation_request(candidate):
            candidate = (context or {}).get("last_text_to_translate")

        text_to_translate = (candidate or "").strip()

        if not text_to_translate:
            empty_msg = "There is no previous sentence in our conversation to translate yet. Please speak or type a sentence first!"
            return {
                "query": clean_query,
                "user_sentence": "",
                "text_to_translate": "",
                "last_user_sentence": "",
                "target_language": effective_tgt_name,
                "target_lang_code": effective_tgt_code,
                "reply_text": empty_msg,
                "speech_text": empty_msg,
                "speech_lang": "en-IN",
                "intent_type": "contextual_translation_empty",
            }

        trans_kwargs = {"target_language": effective_tgt_code}
        if source_language:
            trans_kwargs["source_language"] = source_language
        trans_res = translate_meaning(text_to_translate, **trans_kwargs)

        if trans_res["status"] in ("success", "same_language") and trans_res["translated_meaning"]:
            meaning = trans_res["translated_meaning"].strip()
            reply_text = (
                f"**{effective_tgt_name} Translation:**\n\n"
                f"{meaning}\n\n"
                f"*(Original: \"{text_to_translate}\" · Method: {trans_res['translation_method']})*"
            )
            speech_text = meaning
        else:
            err = trans_res.get("error_detail") or "Translation unavailable."
            reply_text = f"⚠️ Could not translate previous sentence into {effective_tgt_name}: {err}"
            speech_text = f"Translation to {effective_tgt_name} is currently unavailable."
            meaning = None

        source_lang_name = trans_res.get("source_language") or "Source"
        source_lang_code = trans_res.get("source_lang_code") or "auto"
        source_speech_lang = resolve_voice_locale(source_lang_code)

        return {
            "query": clean_query,
            "user_sentence": text_to_translate,
            "text_to_translate": text_to_translate,
            "last_user_sentence": text_to_translate,
            "source_language": source_lang_name,
            "source_lang_code": source_lang_code,
            "source_speech_lang": source_speech_lang,
            "target_language": effective_tgt_name,
            "target_lang_code": effective_tgt_code,
            "reply_text": reply_text,
            "translated_reply": meaning,
            "speech_text": speech_text,
            "speech_lang": effective_speech_lang,
            "intent_type": "contextual_translation",
            "context_reference": text_to_translate,
            "translation_data": trans_res,
        }

    # 2. Check for Explicit Translation Commands ("Translate '...' to Hindi", "Translate to Odia: Good morning", "Hindi me bolo ...")
    cmd_tgt_code, cmd_text = _parse_explicit_translation_command(clean_query, tgt_code)
    if cmd_text:
        effective_tgt_code = cmd_tgt_code or tgt_code
        effective_tgt_name = resolve_lang_name(effective_tgt_code)
        effective_speech_lang = resolve_voice_locale(effective_tgt_code)

        trans_kwargs = {"target_language": effective_tgt_code}
        if source_language:
            trans_kwargs["source_language"] = source_language
        trans_res = translate_meaning(cmd_text, **trans_kwargs)

        if trans_res.get("status") == "uncertain":
            return {
                "query": clean_query,
                "user_sentence": cmd_text,
                "text_to_translate": cmd_text,
                "last_user_sentence": cmd_text,
                "target_language": effective_tgt_name,
                "target_lang_code": effective_tgt_code,
                "reply_text": (
                    f"I couldn't confidently identify the source language for: **\"{cmd_text}\"**.\n\n"
                    f"Please choose or confirm the source language below so I can translate it into {effective_tgt_name}."
                ),
                "translated_reply": None,
                "speech_text": f"Please confirm the source language for this sentence.",
                "speech_lang": speech_lang,
                "intent_type": "language_confirmation_needed",
                "is_uncertain": True,
                "needs_confirmation": True,
                "suggested_languages": trans_res.get("suggested_languages", ["Hindi", "Telugu", "Tamil", "Kannada", "English"]),
                "translation_data": trans_res,
            }

        if trans_res["status"] in ("success", "same_language") and trans_res["translated_meaning"]:
            meaning = trans_res["translated_meaning"].strip()
            reply_text = (
                f"**{effective_tgt_name} Translation:**\n\n"
                f"{meaning}\n\n"
                f"*(Source: \"{cmd_text}\" · Method: {trans_res['translation_method']})*"
            )
            speech_text = meaning
        else:
            err = trans_res.get("error_detail") or "Translation unavailable."
            reply_text = f"⚠️ Translation to {effective_tgt_name} is unavailable: {err}"
            speech_text = f"Translation to {effective_tgt_name} is currently unavailable."
            meaning = None

        if trans_res.get("transliteration", {}).get("native_script"):
            reply_text += f"\n\n*Phonetic Script Transliteration:* `{trans_res['transliteration']['native_script']}`"

        source_lang_name = trans_res.get("source_language") or "Source"
        source_lang_code = trans_res.get("source_lang_code") or "auto"
        source_speech_lang = resolve_voice_locale(source_lang_code)

        return {
            "query": clean_query,
            "user_sentence": cmd_text,
            "text_to_translate": cmd_text,
            "last_user_sentence": cmd_text,
            "source_language": source_lang_name,
            "source_lang_code": source_lang_code,
            "source_speech_lang": source_speech_lang,
            "target_language": effective_tgt_name,
            "target_lang_code": effective_tgt_code,
            "reply_text": reply_text,
            "translated_reply": meaning,
            "speech_text": speech_text,
            "speech_lang": effective_speech_lang,
            "intent_type": "translation",
            "translation_data": trans_res,
        }

    # 3. Check Syllabus QA Knowledge Base (only for explicit inquiry questions)
    clean_lower = re.sub(r"[^\w\s]", " ", lower_query)
    normalized_query = " ".join(clean_lower.split())
    for key, item in QA_KNOWLEDGE_BASE.items():
        if any(kw in lower_query or kw in normalized_query for kw in item["keywords"]):
            ans_text = item["text"]
            ans_speech = item["speech"]

            # If user selected a non-English target language, translate the QA answer!
            if tgt_code != "en":
                qa_trans = translate_meaning(ans_text, target_language=tgt_code, source_language="en")
                if qa_trans["status"] in ("success", "same_language") and qa_trans["translated_meaning"]:
                    ans_text = f"**{tgt_name} Explanation:**\n\n{qa_trans['translated_meaning']}\n\n*(English Reference: {item['text']})*"
                    ans_speech = qa_trans["translated_meaning"]

            return {
                "query": clean_query,
                "user_sentence": clean_query,
                "text_to_translate": clean_query,
                "last_user_sentence": clean_query,
                "source_language": "English",
                "source_lang_code": "en",
                "source_speech_lang": "en-IN",
                "target_language": tgt_name,
                "target_lang_code": tgt_code,
                "reply_text": ans_text,
                "speech_text": ans_speech,
                "speech_lang": speech_lang,
                "intent_type": "knowledge_qa",
                "topic": key,
            }

    # 4. Standard Unified Translation & NLP Flow:
    # Always translates the current new sentence from user input!
    analysis_kwargs = {"target_language": tgt_code, "include_all_languages": False}
    trans_kwargs = {"target_language": tgt_code}
    if source_language is not None:
        analysis_kwargs["source_language"] = source_language
        trans_kwargs["source_language"] = source_language

    analysis_res = analyze(clean_query, active_model, **analysis_kwargs)
    target_trans_item = analysis_res.get("translation") or translate_meaning(clean_query, **trans_kwargs)

    detected_lang = analysis_res.get("language", {}).get("language", "Unknown")
    target_meaning = target_trans_item.get("translated_meaning")
    target_status = target_trans_item.get("status")

    # Check for uncertainty in source language detection:
    if target_status == "uncertain":
        return {
            "query": clean_query,
            "user_sentence": clean_query,
            "text_to_translate": clean_query,
            "last_user_sentence": clean_query,
            "target_language": tgt_name,
            "target_lang_code": tgt_code,
            "reply_text": (
                f"I couldn't confidently identify the source language for: **\"{clean_query}\"**.\n\n"
                f"Please choose or confirm the source language below to ensure an accurate translation into {tgt_name}."
            ),
            "translated_reply": None,
            "speech_text": f"Please confirm the source language for this sentence.",
            "speech_lang": speech_lang,
            "intent_type": "language_confirmation_needed",
            "is_uncertain": True,
            "needs_confirmation": True,
            "suggested_languages": target_trans_item.get("suggested_languages", ["Hindi", "Telugu", "Tamil", "Kannada", "English"]),
            "analysis": analysis_res,
            "translation_data": target_trans_item,
        }

    # Speech output: ONLY the translated sentence in the selected language!
    if target_status in ("success", "same_language") and target_meaning:
        speech_text = target_meaning.strip()
        translated_reply = target_meaning.strip()
    else:
        speech_text = f"Translation to {tgt_name} is currently unavailable."
        translated_reply = None

    # Build clean, direct translation markdown
    if target_status in ("success", "same_language") and target_meaning:
        reply_markdown = (
            f"**{tgt_name} Translation:**\n\n"
            f"{target_meaning}\n\n"
            f"*(Source: {detected_lang} · Method: {target_trans_item.get('translation_method')})*"
        )
    else:
        reply_markdown = (
            f"**{tgt_name} Translation:** *Unavailable ({target_trans_item.get('error_detail') or 'Check service status'})*\n\n"
            f"*(Source: {detected_lang})*"
        )

    # Transliteration section strictly isolated from meaning
    native_script = target_trans_item.get("transliteration", {}).get("native_script")
    if native_script and native_script.strip() != clean_query.strip():
        reply_markdown += f"\n\n*Phonetic Script Conversion (Transliteration):* `{native_script}`"

    multi_trans = {
        "source_language": detected_lang,
        "source_code": target_trans_item.get("source_lang_code", "auto"),
        "transliteration": target_trans_item.get("transliteration", {}),
        "translations": target_trans_item.get("multilingual", {}),
    }

    if source_language and source_language != "auto":
        source_lang_code = resolve_lang_code(source_language)
        source_lang_name = resolve_lang_name(source_lang_code)
    else:
        source_lang_name = detected_lang
        source_lang_code = target_trans_item.get("source_lang_code") or resolve_lang_code(detected_lang)
    source_speech_lang = resolve_voice_locale(source_lang_code)

    return {
        "query": clean_query,
        "user_sentence": clean_query,
        "text_to_translate": clean_query,
        "last_user_sentence": clean_query,
        "source_language": source_lang_name,
        "source_lang_code": source_lang_code,
        "source_speech_lang": source_speech_lang,
        "target_language": tgt_name,
        "target_lang_code": tgt_code,
        "reply_text": reply_markdown.strip(),
        "translated_reply": translated_reply,
        "speech_text": speech_text,
        "speech_lang": speech_lang,
        "intent_type": "translation_response",
        "analysis": analysis_res,
        "translation_data": target_trans_item,
        "translations": multi_trans,
    }

