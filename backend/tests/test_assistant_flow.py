"""Comprehensive Integration Test Suite for IndicMultiNLP.

Validates:
1. Language detection (Native Indic, Romanized, Code-Mixed, English)
2. Explainable sentiment analysis (Positive, Negative, Neutral baseline)
3. Explainable intent classification (Domain cues, General query baseline)
4. Explainable CMI code-mixing index calculation
5. Semantic meaning translation (Google gtx MT, phrasebook, Dravidian Romanized handling)
6. Voice Assistant flow: Voice/Text → Detect → Meaning → Explainable NLP → Target Translation → Speech → Context
7. Short conversational context ("translate that", "translate that to [lang]")
8. Target language selection across Core + Extended Indian + International languages
"""
import sys
import unittest
from unittest.mock import patch
from pathlib import Path

# Add backend to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.language.language_detector import detect_language
from app.language.code_mixing import detect_code_mixing
from app.services.sentiment_service import predict_sentiment
from app.services.intent_service import predict_intent
from app.services.translation_service import (
    translate_meaning,
    get_all_multilingual_meanings,
    resolve_lang_code,
    resolve_lang_name,
)
from app.services.assistant_service import process_voice_query


class TestIndicMultiNLP(unittest.TestCase):

    def test_language_detection_native(self):
        """Test native script detection with character block explainability."""
        res_te = detect_language("ఈ సినిమా కథ చాలా అద్భుతంగా ఉంది")
        self.assertEqual(res_te["language"], "Telugu")
        self.assertEqual(res_te["base_language"], "Telugu")
        self.assertEqual(res_te["script"], "Telugu")
        self.assertTrue(res_te["confidence_is_genuine"])
        self.assertGreater(res_te["confidence"], 0.85)
        self.assertIn("Unicode block", res_te["method"])
        self.assertIn("Telugu", res_te["explanation"])
        self.assertIn("100", res_te["explanation"])

        res_hi = detect_language("यह फिल्म बहुत अच्छी है और कहानी बेहद प्रभावशाली है")
        self.assertEqual(res_hi["language"], "Hindi")
        self.assertEqual(res_hi["script"], "Devanagari")
        self.assertTrue(res_hi["confidence_is_genuine"])

        res_ta = detect_language("இந்த படம் மிகவும் நன்றாக உள்ளது")
        self.assertEqual(res_ta["language"], "Tamil")
        self.assertEqual(res_ta["script"], "Tamil")

        res_kn = detect_language("ಈ ಚಲನಚಿತ್ರ ತುಂಬಾ ಅದ್ಭುತವಾಗಿದೆ")
        self.assertEqual(res_kn["language"], "Kannada")
        self.assertEqual(res_kn["script"], "Kannada")

    def test_language_detection_romanized_and_code_mixed(self):
        """Test Romanized Indic and code-mixed detection with lexical cues."""
        res = detect_language("Ee movie chala bagundi, hero acting super ga undi!")
        self.assertIn("Telugu", res["language"])
        self.assertIn("Romanized", res["language"])
        self.assertEqual(res["base_language"], "Telugu")
        self.assertTrue(res["confidence_is_genuine"])
        self.assertGreaterEqual(len(res["detected_cues"]), 2)

        res_hi = detect_language("Movie bahut acchi hai storyline mast lagi")
        self.assertIn("Hindi", res_hi["language"])
        self.assertTrue(res_hi["confidence_is_genuine"])

    def test_code_mixing_cmi_calculation(self):
        """Test CMI formula and switch points."""
        # Monolingual
        mono = detect_code_mixing("ఈ సినిమా చాలా బాగుంది")
        self.assertFalse(mono["is_code_mixed"])
        self.assertEqual(mono["cmi"], 0.0)
        self.assertIn("Monolingual", mono["explanation"])

        # Code-mixed with English in Latin script
        mixed = detect_code_mixing("Ee movie chala bagundi, hero acting super ga undi!")
        self.assertTrue(mixed["is_code_mixed"])
        self.assertGreater(mixed["cmi"], 0.0)
        self.assertIn("CMI", mixed["formula"])
        self.assertIn("explanation", mixed)

    def test_sentiment_explainability(self):
        """Test explainable sentiment with genuine confidence and cue reporting."""
        pos = predict_sentiment("ఈ సినిమా చాలా బాగుంది, super acting")
        self.assertEqual(pos["label"], "Positive")
        self.assertTrue(pos["confidence_is_genuine"])
        self.assertIsNotNone(pos["confidence"])
        self.assertGreater(len(pos["positive_cues"]), 0)
        self.assertIn("Positive", pos["explanation"])

        neg = predict_sentiment("The food was terrible, late and worst service")
        self.assertEqual(neg["label"], "Negative")
        self.assertTrue(neg["confidence_is_genuine"])
        self.assertGreater(len(neg["negative_cues"]), 0)

        neutral = predict_sentiment("The meeting is scheduled at 4 PM in room 302")
        self.assertEqual(neutral["label"], "Neutral")
        # For neutral baseline with 0 cues, confidence must not be fake
        self.assertFalse(neutral["confidence_is_genuine"])
        self.assertIsNone(neutral["confidence"])
        self.assertIn("Neutral baseline", neutral["explanation"])

    def test_intent_explainability(self):
        """Test intent classification with domain cue tracking."""
        res_ent = predict_intent("The movie screenplay, songs, and actor were great")
        self.assertEqual(res_ent["label"], "Entertainment")
        self.assertTrue(res_ent["confidence_is_genuine"])
        self.assertIn("movie", res_ent["matched_cues"])

        res_cust = predict_intent("I want to register a complaint and get a refund for cancellation")
        self.assertEqual(res_cust["label"], "Customer Service")
        self.assertTrue(res_cust["confidence_is_genuine"])

        res_gen = predict_intent("Tomorrow is Thursday")
        self.assertEqual(res_gen["label"], "General Query")
        self.assertFalse(res_gen["confidence_is_genuine"])
        self.assertIsNone(res_gen["confidence"])

    def test_semantic_translation(self):
        """Test real semantic translation across multiple languages and Dravidian Romanized handling."""
        # 1. Native Telugu -> English
        t1 = translate_meaning("ఈ సినిమా చాలా బాగుంది", target_language="en")
        self.assertEqual(t1["status"], "success")
        self.assertIn("good", t1["translated_meaning"].lower())
        self.assertNotEqual(t1["translated_meaning"], t1["source_text"])

        # 2. Romanized Telugu -> English
        t2 = translate_meaning("ee movie chala bagundi", target_language="en")
        self.assertEqual(t2["status"], "success")
        self.assertIn("good", t2["translated_meaning"].lower())
        # Transliteration must be strictly isolated
        self.assertIsNotNone(t2["transliteration"])
        self.assertNotEqual(t2["translated_meaning"], t2["transliteration"]["native_script"])

        # 3. English -> Hindi
        t3 = translate_meaning("Welcome to our research platform", target_language="hi")
        self.assertEqual(t3["status"], "success")
        self.assertTrue(any(ord(c) >= 0x0900 and ord(c) <= 0x097F for c in t3["translated_meaning"]))

        # 4. English -> Telugu
        t4 = translate_meaning("The movie is very good", target_language="te")
        self.assertEqual(t4["status"], "success")
        self.assertTrue(any(ord(c) >= 0x0C00 and ord(c) <= 0x0C7F for c in t4["translated_meaning"]))

        # 5. English -> Tamil
        t5 = translate_meaning("Thank you very much", target_language="ta")
        self.assertEqual(t5["status"], "success")
        self.assertTrue(any(ord(c) >= 0x0B80 and ord(c) <= 0x0BFF for c in t5["translated_meaning"]))

        # 6. English -> Kannada
        t6 = translate_meaning("The movie is very good", target_language="kn")
        self.assertEqual(t6["status"], "success")
        self.assertTrue(any(ord(c) >= 0x0C80 and ord(c) <= 0x0CFF for c in t6["translated_meaning"]))

        # 7. Extended language: Spanish
        t7 = translate_meaning("The movie is very good", target_language="es")
        self.assertEqual(t7["status"], "success")
        self.assertTrue("pelicula" in t7["translated_meaning"].lower() or "película" in t7["translated_meaning"].lower())

    def test_romanized_hindi_uses_native_script_for_semantic_translation(self):
        """Romanized Hindi should be transliterated before contacting neural MT."""
        transcript = "hi kaise ho mei ek engineer hun"
        with patch(
            "app.services.translation_service._query_gtx_translator",
            return_value=("How are you? I am an engineer.", None),
        ) as translator:
            result = translate_meaning(transcript, target_language="en")

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["translated_meaning"], "How are you? I am an engineer.")
        translated_input, source_code, target_code = translator.call_args.args
        self.assertIn("कैसे", translated_input)
        self.assertEqual((source_code, target_code), ("hi", "en"))

    def test_voice_assistant_complete_flow(self):
        """Test full pipeline: Query -> Detect -> Meaning -> Explainable NLP -> Target Voice Speech."""
        res = process_voice_query("ఈ సినిమా చాలా బాగుంది", target_language="hi")
        self.assertEqual(res["target_language"], "Hindi")
        self.assertEqual(res["target_lang_code"], "hi")
        self.assertEqual(res["speech_lang"], "hi-IN")
        self.assertTrue(len(res["speech_text"]) > 0)
        self.assertIn("analysis", res)
        self.assertIn("translation_data", res)
        self.assertEqual(res["translation_data"]["status"], "success")

    def test_voice_transcript_is_sent_to_semantic_translation(self):
        """A recognized Romanized/code-mixed utterance reaches the semantic MT call unchanged."""
        transcript = "Ee movie chala bagundi, hero acting super ga undi!"
        analysis = {
            "language": {"language": "Romanized Telugu", "base_language": "Telugu"},
            "sentiment": {"label": "Positive", "confidence": 0.9},
            "intent": {"label": "Entertainment"},
            "code_mixing": {"is_code_mixed": True, "cmi": 25.0},
            "romanized": True,
        }
        translation = {
            "status": "success",
            "translated_meaning": "This movie is very good, the hero's acting is great!",
            "translation_method": "test translator",
            "error_detail": None,
            "target_language": "English",
            "target_lang_code": "en",
            "transliteration": {"native_script": "ఈ సినిమా చాలా బాగుంది"},
        }
        with patch("app.services.assistant_service.analyze", return_value=analysis), \
             patch("app.services.assistant_service.get_all_multilingual_meanings", return_value={}), \
             patch("app.services.assistant_service.translate_meaning", return_value=translation) as translate:
            result = process_voice_query(transcript, target_language="en")

        translate.assert_called_once_with(transcript, target_language="en")
        self.assertEqual(result["query"], transcript)
        self.assertEqual(result["translation_data"]["translated_meaning"], translation["translated_meaning"])

    def test_conversational_context_translate_that(self):
        """Test short conversational context ('translate that', 'translate that to Tamil')."""
        context = {
            "last_query": "Ee movie chala bagundi",
            "last_translation": "This movie is very good",
            "last_detected_lang": "Telugu",
        }

        # 1. Translate that to Tamil
        res = process_voice_query("translate that to Tamil", target_language="ta", context=context)
        self.assertEqual(res["intent_type"], "contextual_translation")
        self.assertEqual(res["context_reference"], "Ee movie chala bagundi")
        self.assertEqual(res["speech_lang"], "ta-IN")
        self.assertIn("இந்த படம்", res["speech_text"])

        # 2. Translate that to Hindi
        res2 = process_voice_query("translate that into Hindi", target_language="hi", context=context)
        self.assertEqual(res2["intent_type"], "contextual_translation")
        self.assertEqual(res2["speech_lang"], "hi-IN")

        # 3. Contextual translate with empty context
        res_empty = process_voice_query("translate that", target_language="en", context={})
        self.assertEqual(res_empty["intent_type"], "contextual_translation_empty")
        self.assertIn("no previous sentence", res_empty["reply_text"].lower())

    def test_syllabus_qa_with_target_language(self):
        """Test syllabus knowledge base query translated to target language."""
        res = process_voice_query("What is Code-Mixing Index?", target_language="te")
        self.assertEqual(res["intent_type"], "knowledge_qa")
        self.assertEqual(res["topic"], "cmi")
        self.assertEqual(res["speech_lang"], "te-IN")
        self.assertIn("కోడ్-మిక్సింగ్", res["speech_text"])


if __name__ == "__main__":
    unittest.main()
