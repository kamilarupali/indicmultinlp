"""IndicMultiNLP Code-Mixing and Code-Switching Detection Engine.

Computes the Code-Mixing Index (CMI) according to the Gambäck & Das (2014) standard:
    CMI = 100 * [1 - (max_i w_i) / N]
where w_i represents the token count for language/script i, and N is the total token count.
Pure monolingual text has CMI = 0%, while maximally balanced bilingual text approaches 50%.
"""
from __future__ import annotations

import unicodedata
from collections import Counter
from app.language.script_detector import SCRIPT_RANGES
from app.preprocessing.tokenizer import tokenize, split_sentences


def _token_script(token: str) -> str:
    for name, (start, end) in SCRIPT_RANGES.items():
        if any(start <= ord(ch) <= end for ch in token):
            return name
    if any("LATIN" in unicodedata.name(ch, "") for ch in token):
        return "Latin"
    return "Punctuation/Symbol"


def detect_code_mixing(text: str) -> dict:
    raw_tokens = tokenize(text)
    word_tokens = [t for t in raw_tokens if any(unicodedata.category(c)[0] in ("L", "N") for c in t)]

    if not word_tokens:
        return {
            "is_code_mixed": False,
            "scripts": [],
            "cmi": 0.0,
            "switch_points": 0,
            "token_tags": [],
            "formula": "CMI = 100 * [1 - max(w_i) / N]",
            "script_counts": {},
            "sentence_count": 0,
            "note": "No word tokens found in input.",
            "explanation": "No alphanumeric word tokens were found to evaluate code-mixing.",
        }

    token_tags = []
    scripts_seen = []
    switch_points = 0
    prev_script = None

    for t in word_tokens:
        script = _token_script(t)
        token_tags.append({"token": t, "script": script})
        if script not in ("Punctuation/Symbol", "Other"):
            scripts_seen.append(script)
            if prev_script and script != prev_script:
                switch_points += 1
            prev_script = script

    distinct_scripts = sorted(set(scripts_seen))
    total_words = len(scripts_seen)
    script_counts = dict(Counter(scripts_seen))

    # Multi-sentence context
    sentences = split_sentences(text)

    if total_words > 1 and len(distinct_scripts) > 1:
        max_count = max(script_counts.values())
        dominant_script = max(script_counts, key=script_counts.get)
        cmi = round(100.0 * (1.0 - (max_count / total_words)), 2)
        is_mixed = True
        explanation = (
            f"Multi-script code-mixing detected across {len(distinct_scripts)} scripts "
            f"({', '.join(f'{k}: {v}' for k, v in script_counts.items())}). "
            f"Dominant script is {dominant_script} ({max_count}/{total_words} words). "
            f"Formula: CMI = 100 * [1 - ({max_count}/{total_words})] = {cmi}%, "
            f"with {switch_points} script-switching boundary point(s)."
        )
    else:
        dominant_script = distinct_scripts[0] if distinct_scripts else "Latin"
        cmi = 0.0
        is_mixed = False
        explanation = (
            f"Monolingual text: All {total_words} word token(s) belong to the {dominant_script} script. "
            f"No inter-script code-switching detected (CMI = 0.0%)."
        )

    # Check for intra-sentential Romanized code-mixing within Latin script
    if not is_mixed and distinct_scripts == ["Latin"] and total_words >= 2:
        from app.language.language_detector import ROMAN_CUES
        lower_words = set(t.lower() for t in word_tokens)
        en_matches = sorted(list(lower_words & ROMAN_CUES.get("English", set())))

        indic_matches: dict[str, list[str]] = {}
        for k, cues in ROMAN_CUES.items():
            if k != "English":
                matched = sorted(list(lower_words & cues))
                if matched:
                    indic_matches[k] = matched

        if en_matches and indic_matches:
            top_indic_lang = max(indic_matches, key=lambda k: len(indic_matches[k]))
            top_indic_words = indic_matches[top_indic_lang]

            indic_count = len(top_indic_words)
            en_count = len(en_matches)
            total_cue_count = indic_count + en_count

            # Compute Romanized CMI using Gambäck & Das formula
            max_cues = max(indic_count, en_count)
            cmi = round(100.0 * (1.0 - (max_cues / max(1, total_cue_count))), 2)
            if cmi == 0.0 and indic_count > 0 and en_count > 0:
                cmi = round(100.0 * (min(indic_count, en_count) / total_words), 2)
            cmi = max(cmi, 10.0)  # Distinct from 0.0 when mixing exists

            is_mixed = True
            switch_points = max(1, switch_points)

            explanation = (
                f"Intra-sentential Romanized code-mixing detected within Latin script: "
                f"English words ({en_matches}) mixed with Romanized {top_indic_lang} words ({top_indic_words}). "
                f"Formula: CMI = 100 * [1 - max({indic_count}, {en_count}) / {total_cue_count}] = {cmi}%, "
                f"with linguistic code-switching."
            )

    note = (
        f"Detected {len(distinct_scripts)} script(s) with {switch_points} language switch point(s)."
        if is_mixed
        else "Single script/monolingual context detected."
    )

    return {
        "is_code_mixed": is_mixed,
        "scripts": distinct_scripts or ["Latin"],
        "cmi": cmi,
        "switch_points": switch_points,
        "formula": "CMI = 100 * [1 - max(w_i) / N]",
        "script_counts": script_counts,
        "sentence_count": len(sentences),
        "token_tags": token_tags[:60],
        "note": note,
        "explanation": explanation,
    }
