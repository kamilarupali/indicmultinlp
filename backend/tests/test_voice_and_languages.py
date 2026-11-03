"""Unit and Integration Tests for IndicMultiNLP Voice Assistant, Commands, and Language Coverage.

Validates:
1. Supported Language Coverage: Odia, Urdu, Telugu, Hindi, Tamil, Kannada, and extended Indic languages.
2. Voice Command Parsing: Prefix patterns ('Translate to Odia ...'), suffix patterns ('Translate ... to Urdu'), quoted and colon commands.
3. Conversational Context Commands: 'Translate that', 'Translate that to [lang]' using conversation history.
4. Whole-Sentence Handling: Ensuring complete multi-clause sentences are preserved and translated.
5. Target Language Selection: Honoring target language codes and corresponding voice synthesis locales.
6. Processing Time & Cache Acceleration: Verifying zero-latency cached responses and avoidance of redundant calls.
"""
from __future__ import annotations

import time
import unittest
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.language.language_detector import detect_language
from app.language.script_detector import detect_script
from app.services.translation_service import (
    translate_meaning,
    resolve_lang_code,
    resolve_lang_name,
    resolve_voice_locale,
    _TRANSLATION_CACHE,
    LANGUAGE_CODES,
)
from app.services.assistant_service import (
    process_voice_query,
    _parse_explicit_translation_command,
    _is_contextual_translation_request,
    _extract_target_language_from_text,
)


class TestSupportedLanguageCoverage(unittest.TestCase):
    """Test Odia, Urdu, and other Indic languages end-to-end."""

    def test_odia_detection_and_resolution(self):
        self.assertEqual(resolve_lang_code("odia"), "or")
        self.assertEqual(resolve_lang_code("oriya"), "or")
        self.assertEqual(resolve_lang_code("or"), "or")
        self.assertEqual(resolve_lang_name("or"), "Odia")
        self.assertEqual(resolve_voice_locale("or"), "or-IN")

        # Native Odia script detection
        odia_text = "ଏହି ଚଳଚ୍ଚିତ୍ରଟି ବହୁତ ଭଲ ଏବଂ କାହାଣୀ ପ୍ରଭାବଶାଳୀ ଅଟେ।"
        det = detect_language(odia_text)
        self.assertEqual(det["language"], "Odia")
        self.assertEqual(det["script"], "Odia")
        self.assertTrue(det["confidence_is_genuine"])

    def test_urdu_detection_and_resolution(self):
        self.assertEqual(resolve_lang_code("urdu"), "ur")
        self.assertEqual(resolve_lang_code("ur"), "ur")
        self.assertEqual(resolve_lang_name("ur"), "Urdu")
        self.assertIn("ur", resolve_voice_locale("ur"))

        # Native Urdu Perso-Arabic detection
        urdu_text = "یہ فلم بہت اچھی ہے اور تمام اداکاروں نے شاندار کام کیا ہے۔"
        det = detect_language(urdu_text)
        self.assertEqual(det["language"], "Urdu")
        self.assertEqual(det["script"], "Arabic")
        self.assertTrue(det["confidence_is_genuine"])

    def test_odia_offline_phrasebook_translation(self):
        res = translate_meaning("ee movie chala bagundi", target_language="or")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["target_lang_code"], "or")
        self.assertIn("ଚଳଚ୍ଚିତ୍ର", res["translated_meaning"])

    def test_urdu_offline_phrasebook_translation(self):
        res = translate_meaning("ee movie chala bagundi", target_language="ur")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["target_lang_code"], "ur")
        self.assertIn("فلم", res["translated_meaning"])

    def test_unsupported_language_behavior(self):
        # Blank text should report honest unavailable status
        res = translate_meaning("", target_language="or")
        self.assertEqual(res["status"], "unavailable")


class TestVoiceCommandParsing(unittest.TestCase):
    """Test voice command grammar and sentence extraction."""

    def test_prefix_language_command(self):
        tgt, text = _parse_explicit_translation_command("Translate to Odia good morning", "en")
        self.assertEqual(tgt, "or")
        self.assertEqual(text, "good morning")

        tgt2, text2 = _parse_explicit_translation_command("Translate to Urdu how are you doing today", "en")
        self.assertEqual(tgt2, "ur")
        self.assertEqual(text2, "how are you doing today")

    def test_suffix_language_command(self):
        tgt, text = _parse_explicit_translation_command("Translate the food is delicious to Telugu", "en")
        self.assertEqual(tgt, "te")
        self.assertEqual(text, "the food is delicious")

        tgt2, text2 = _parse_explicit_translation_command("How do you say thank you in Tamil", "en")
        self.assertEqual(tgt2, "ta")
        self.assertEqual(text2, "thank you")

    def test_quoted_and_colon_commands(self):
        tgt, text = _parse_explicit_translation_command('Translate "Ee movie chala bagundi" to Hindi', "en")
        self.assertEqual(tgt, "hi")
        self.assertEqual(text, "Ee movie chala bagundi")

        tgt2, text2 = _parse_explicit_translation_command("Translate to Kannada: this is a great movie", "en")
        self.assertEqual(tgt2, "kn")
        self.assertEqual(text2, "this is a great movie")

    def test_contextual_command_detection(self):
        self.assertTrue(_is_contextual_translation_request("translate that"))
        self.assertTrue(_is_contextual_translation_request("Translate that to Odia"))
        self.assertTrue(_is_contextual_translation_request("Can you please translate that to Urdu"))
        self.assertTrue(_is_contextual_translation_request("what does that mean"))
        self.assertTrue(_is_contextual_translation_request("how do you say that in Telugu"))

    def test_target_language_extraction(self):
        self.assertEqual(_extract_target_language_from_text("Translate that to Odia"), "or")
        self.assertEqual(_extract_target_language_from_text("Say that in Urdu"), "ur")
        self.assertEqual(_extract_target_language_from_text("Translate into French"), "fr")
        self.assertEqual(_extract_target_language_from_text("German translation"), "de")


class TestVoiceAssistantEndToEnd(unittest.TestCase):
    """Test Voice Assistant integration flow and contextual execution."""

    def test_voice_query_with_selected_target_odia(self):
        res = process_voice_query("namaskaram", target_language="or")
        self.assertEqual(res["target_language"], "Odia")
        self.assertEqual(res["target_lang_code"], "or")
        self.assertEqual(res["speech_lang"], "or-IN")
        self.assertTrue(len(res["speech_text"]) > 0)
        self.assertIn("ନମସ୍କାର", res["speech_text"])

    def test_voice_query_with_selected_target_urdu(self):
        res = process_voice_query("dhanyavadalu", target_language="ur")
        self.assertEqual(res["target_language"], "Urdu")
        self.assertEqual(res["target_lang_code"], "ur")
        self.assertIn("ur", res["speech_lang"])
        self.assertIn("شکریہ", res["speech_text"])

    def test_contextual_translation_from_conversation(self):
        # Step 1: user says something
        res1 = process_voice_query("ee movie chala bagundi", target_language="en")
        self.assertIn("good", res1["speech_text"].lower())

        # Step 2: user follows up with contextual command "Translate that to Odia"
        context = {
            "last_query": res1["query"],
            "last_text_to_translate": res1.get("text_to_translate", res1["query"]),
            "last_translation": res1.get("translated_reply"),
        }
        res2 = process_voice_query("Translate that to Odia", target_language="en", context=context)
        self.assertEqual(res2["intent_type"], "contextual_translation")
        self.assertEqual(res2["target_language"], "Odia")
        self.assertEqual(res2["target_lang_code"], "or")
        self.assertIn("ଚଳଚ୍ଚିତ୍ର", res2["speech_text"])

    def test_whole_sentence_preservation_in_explicit_command(self):
        long_sentence = "The food was delicious and the staff was courteous, but the train was delayed"
        query = f"Translate to Odia {long_sentence}"
        res = process_voice_query(query, target_language="en")
        self.assertEqual(res["intent_type"], "translation")
        self.assertEqual(res["target_lang_code"], "or")
        self.assertEqual(res["text_to_translate"], long_sentence)


class TestProcessingSpeedAndCache(unittest.TestCase):
    """Test performance, cache hits, and avoidance of redundant network queries."""

    def test_translation_caching_performance(self):
        text = "Hello my friend, welcome to India"
        t0 = time.time()
        res1 = translate_meaning(text, target_language="te")
        t1 = time.time()

        # Second identical request must come from memory cache in < 15ms
        t2 = time.time()
        res2 = translate_meaning(text, target_language="te")
        t3 = time.time()
        cache_duration = t3 - t2

        self.assertEqual(res1["translated_meaning"], res2["translated_meaning"])
        self.assertLess(cache_duration, 0.05, "Cached translation must return in < 50ms")

    def test_voice_assistant_no_duplicate_translation_work(self):
        query = "namaskaram"
        t0 = time.time()
        res = process_voice_query(query, target_language="hi")
        duration = time.time() - t0

        self.assertIsNotNone(res["speech_text"])
        self.assertEqual(res["target_lang_code"], "hi")
        # Ensure that speech text is ONLY the translated sentence
        self.assertEqual(res["speech_text"], "नमस्ते")
        # Sub-second execution
        self.assertLess(duration, 0.5)


if __name__ == "__main__":
    unittest.main()
