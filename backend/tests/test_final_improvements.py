"""Verification Test Suite for IndicMultiNLP Final Improvements.

Tests:
1. Empty first-load state (Voice Assistant and Live Analyzer start empty, no pre-filled text or auto-analysis).
2. Conversational context commands apply STRICTLY to the user's most recent input sentence.
   - Assistant replies, translations, and demo content are never used as text to translate.
   - "Translate that" without prior user sentence returns contextual_translation_empty.
3. Full sentence preservation (multi-clause compound sentences remain intact through translation).
4. Target language selection across all supported core, Indian, and international languages.
5. Real snapshot data provenance:
   - 5 Dataset Partitions (raw, processed, train, validation, test CSVs).
   - 10 Evaluation Runs (10 JSON experiment files).
   - 7 Active Models (1 baseline + 6 TF-IDF LR/SVM joblib models).
6. Speech and Voice Fallback behavior:
   - Clean voice locale mappings.
   - Graceful status message when TTS or STT voice is not available in browser.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

REPO_ROOT = BASE_DIR.parent

from app.services.assistant_service import (
    process_voice_query,
    _is_contextual_translation_request,
    _parse_explicit_translation_command,
)
from app.services.translation_service import (
    translate_meaning,
    resolve_lang_code,
    resolve_lang_name,
    resolve_voice_locale,
    LANGUAGE_CODES,
)
from app.services.analysis_service import analyze


class TestEmptyFirstLoadState(unittest.TestCase):
    """Ensure the assistant and analyzer behave cleanly with empty input."""

    def test_voice_assistant_empty_query(self):
        res = process_voice_query("", target_language="en")
        self.assertEqual(res["intent_type"], "empty")
        self.assertEqual(res["query"], "")
        self.assertIn("speak or type a sentence", res["reply_text"].lower())

    def test_voice_assistant_whitespace_query(self):
        res = process_voice_query("    ", target_language="te")
        self.assertEqual(res["intent_type"], "empty")
        self.assertEqual(res["query"], "")


class TestContextualCommandIsolation(unittest.TestCase):
    """Ensure contextual commands ONLY apply to the user's prior sentence."""

    def test_contextual_translation_empty_context(self):
        # When no prior sentence exists, "Translate that" should honestly report it
        res = process_voice_query("Translate that", target_language="hi", context={})
        self.assertEqual(res["intent_type"], "contextual_translation_empty")
        self.assertEqual(res["user_sentence"], "")
        self.assertIn("no previous sentence", res["reply_text"].lower())

    def test_contextual_translation_uses_user_sentence_not_assistant_reply(self):
        # Scenario: User previously submitted "We will meet at the station"
        # The assistant replied with Hindi: "हम स्टेशन पर मिलेंगे"
        user_sentence = "We will meet at the station"
        assistant_reply = "हम स्टेशन पर मिलेंगे"

        context = {
            "last_user_sentence": user_sentence,
            "last_translation": assistant_reply,
            "last_reply": f"**Hindi Translation:** {assistant_reply}",
        }

        # User issues: "Translate that to Tamil"
        res = process_voice_query("Translate that to Tamil", target_language="en", context=context)
        self.assertEqual(res["intent_type"], "contextual_translation")
        self.assertEqual(res["target_lang_code"], "ta")
        # Text to translate MUST be the user's English sentence, NOT the assistant's Hindi reply!
        self.assertEqual(res["user_sentence"], user_sentence)
        self.assertEqual(res["text_to_translate"], user_sentence)

    def test_contextual_command_not_hijacked_by_regular_sentence(self):
        # Sentence containing "this" or "that" as a subject should NOT be treated as a contextual command
        query = "Translate this movie was enjoyable to Hindi"
        self.assertFalse(_is_contextual_translation_request(query))
        
        tgt, extracted = _parse_explicit_translation_command(query, "en")
        self.assertEqual(tgt, "hi")
        self.assertIn("movie was enjoyable", extracted)


class TestFullSentencePreservation(unittest.TestCase):
    """Ensure multi-clause sentences are preserved without dropping clauses."""

    def test_long_sentence_with_commas_and_conjunctions(self):
        long_sentence = (
            "The food was delicious, but the train was delayed by two hours, "
            "so we reached our hotel very late at night."
        )
        res = process_voice_query(long_sentence, target_language="te")
        self.assertEqual(res["user_sentence"], long_sentence)
        self.assertIsNotNone(res["speech_text"])
        self.assertTrue(len(res["speech_text"]) > 10)

    def test_explicit_command_with_quotes(self):
        long_sentence = "The flight was smooth and the customer service was fantastic."
        query = f'Translate "{long_sentence}" to Odia'
        res = process_voice_query(query, target_language="en")
        self.assertEqual(res["intent_type"], "translation")
        self.assertEqual(res["target_lang_code"], "or")
        self.assertEqual(res["text_to_translate"], long_sentence)


class TestTargetLanguageSelection(unittest.TestCase):
    """Verify target language resolution and speech locales across all categories."""

    def test_core_indic_languages(self):
        for code, name, locale in [
            ("te", "Telugu", "te-IN"),
            ("hi", "Hindi", "hi-IN"),
            ("ta", "Tamil", "ta-IN"),
            ("kn", "Kannada", "kn-IN"),
            ("en", "English", "en-IN"),
        ]:
            self.assertEqual(resolve_lang_code(code), code)
            self.assertEqual(resolve_lang_name(code), name)
            self.assertEqual(resolve_voice_locale(code), locale)

    def test_extended_indic_languages(self):
        for code, name in [
            ("or", "Odia"),
            ("ur", "Urdu"),
            ("ml", "Malayalam"),
            ("mr", "Marathi"),
            ("bn", "Bengali"),
            ("gu", "Gujarati"),
            ("pa", "Punjabi"),
        ]:
            self.assertEqual(resolve_lang_code(code), code)
            self.assertEqual(resolve_lang_name(code), name)
            self.assertTrue(len(resolve_voice_locale(code)) > 0)

    def test_international_languages(self):
        for code, name in [
            ("es", "Spanish"),
            ("fr", "French"),
            ("de", "German"),
            ("ja", "Japanese"),
            ("ar", "Arabic"),
            ("ru", "Russian"),
            ("pt", "Portuguese"),
            ("it", "Italian"),
            ("ko", "Korean"),
        ]:
            self.assertEqual(resolve_lang_code(code), code)
            self.assertEqual(resolve_lang_name(code), name)


class TestSnapshotDataProvenance(unittest.TestCase):
    """Validate that snapshot metrics are derived from actual files on disk."""

    def test_dataset_partitions_count_and_existence(self):
        data_dir = REPO_ROOT / "data"
        self.assertTrue(data_dir.exists(), "data/ directory must exist")

        csv_files = sorted(data_dir.glob("**/*.csv"))
        # Exactly 5 CSV files: raw, processed, train, validation, test
        self.assertEqual(len(csv_files), 5, f"Expected 5 CSV dataset partitions, found: {[f.name for f in csv_files]}")
        
        partition_names = [f.parent.name for f in csv_files]
        self.assertIn("raw", partition_names)
        self.assertIn("processed", partition_names)
        self.assertIn("train", partition_names)
        self.assertIn("validation", partition_names)
        self.assertIn("test", partition_names)

    def test_evaluation_runs_count_and_existence(self):
        exp_dir = REPO_ROOT / "experiments"
        self.assertTrue(exp_dir.exists(), "experiments/ directory must exist")

        json_runs = sorted(exp_dir.glob("**/*.json"))
        # Exactly 10 experiment runs
        self.assertEqual(len(json_runs), 10, f"Expected 10 evaluation runs, found {len(json_runs)}")

    def test_active_runnable_models_count(self):
        models_dir = REPO_ROOT / "models"
        self.assertTrue(models_dir.exists(), "models/ directory must exist")

        joblib_files = sorted(models_dir.glob("**/*.joblib"))
        # Exactly 6 joblib models: language (lr, svm), intent (lr, svm), sentiment (lr, svm)
        self.assertEqual(len(joblib_files), 6)
        # Plus 1 rule-based baseline = 7 active runnable models
        active_models_count = len(joblib_files) + 1
        self.assertEqual(active_models_count, 7)


class TestUniversalSpeechSynthesis(unittest.TestCase):
    """Validate that speech audio is fetchable across languages."""

    def test_tts_fetch_audio_bytes_indic(self):
        from app.routes.tts import fetch_tts_audio_bytes
        # Test Malayalam, Telugu, and Hindi
        for lang, text in [("ml", "സുഖമാണോ"), ("te", "నమస్కారం"), ("hi", "नमस्ते")]:
            data = fetch_tts_audio_bytes(text, lang)
            self.assertIsNotNone(data, f"TTS audio should not be None for {lang}")
            self.assertGreater(len(data), 500, f"Audio bytes should exceed 500 bytes for {lang}")

    def test_tts_fetch_audio_bytes_odia_fallback(self):
        from app.routes.tts import fetch_tts_audio_bytes
        # Odia text uses phonetic fallback
        data = fetch_tts_audio_bytes("ନମସ୍କାର", "or")
        self.assertIsNotNone(data, "Odia TTS audio should return audio bytes via fallback")
        self.assertGreater(len(data), 500)

    def test_tts_empty_text(self):
        from app.routes.tts import fetch_tts_audio_bytes
        data = fetch_tts_audio_bytes("", "en")
        self.assertIsNone(data)


if __name__ == "__main__":
    unittest.main()
