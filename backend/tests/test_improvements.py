"""Comprehensive Unit and Integration Test Suite for IndicMultiNLP Improvements.

Tests:
1. Sentence splitting and multi-sentence handling (Indic dandas, abbreviations, punctuation).
2. Named Entity Recognition (NER), entity preservation, canonical transliteration, and entity masking in sentiment/intent.
3. Romanized transliteration with English loanword protection.
4. Gambäck & Das (2014) Code-Mixing Index (CMI) calculation without artificial clamps.
5. Multi-sentence translation and honest error reporting.
6. Full Analysis Service integration pipeline trace, entity breakdown, and sentence breakdown.
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.preprocessing.tokenizer import split_sentences, tokenize
from app.preprocessing.entities import extract_named_entities, transliterate_entity
from app.preprocessing.transliteration import transliterate_roman_to_native, transliterate_native_to_roman
from app.language.language_detector import detect_language
from app.language.code_mixing import detect_code_mixing
from app.services.sentiment_service import predict_sentiment
from app.services.intent_service import predict_intent
from app.services.translation_service import translate_meaning, get_all_multilingual_meanings
from app.services.analysis_service import analyze as analyze_text


class TestSentenceSplitting(unittest.TestCase):
    """Validate sentence tokenization across Indic dandas, abbreviations, and punctuation."""

    def test_indic_danda_splitting(self):
        text = "यह पहली बात है। यह दूसरी बात है॥ तीसरी बात भी है।"
        sentences = split_sentences(text)
        self.assertEqual(len(sentences), 3)
        self.assertIn("यह पहली बात है।", sentences[0])
        self.assertIn("यह दूसरी बात है॥", sentences[1])
        self.assertIn("तीसरी बात भी है।", sentences[2])

    def test_abbreviation_and_decimal_protection(self):
        text = "Dr. Sharma paid Rs. 15.50 at the store. He was happy."
        sentences = split_sentences(text)
        self.assertEqual(len(sentences), 2)
        self.assertTrue(sentences[0].startswith("Dr. Sharma"))
        self.assertTrue(sentences[1].startswith("He was happy"))

    def test_long_multisentence_text(self):
        text = "Main pichle hafte ek naya laptop khareeda tha. Pehle do din laptop theek chala, lekin kal achanak screen band ho gayi. Maine service center phone kiya!"
        sentences = split_sentences(text)
        self.assertEqual(len(sentences), 3)


class TestNamedEntityRecognition(unittest.TestCase):
    """Validate entity extraction, canonical transliteration, and masking."""

    def test_english_and_indic_names_extraction(self):
        text = "Rahul Sharma and Priya Patel met in Hyderabad at Microsoft office."
        entities = extract_named_entities(text)
        names = {e["text"]: e["category"] for e in entities}
        
        self.assertIn("Rahul Sharma", names)
        self.assertEqual(names["Rahul Sharma"], "PER")
        self.assertIn("Priya Patel", names)
        self.assertEqual(names["Priya Patel"], "PER")
        self.assertIn("Hyderabad", names)
        self.assertEqual(names["Hyderabad"], "LOC")
        self.assertIn("Microsoft", names)
        self.assertEqual(names["Microsoft"], "ORG")

    def test_canonical_transliteration(self):
        res_hi = transliterate_entity("Rahul Sharma", "PER", "hi")
        self.assertEqual(res_hi, "राहुल शर्मा")

        res_te = transliterate_entity("Rahul Sharma", "PER", "te")
        self.assertEqual(res_te, "రాహుల్ శర్మ")

        res_loc = transliterate_entity("Bengaluru", "LOC", "hi")
        self.assertEqual(res_loc, "बेंगलुरु")

    def test_sentiment_not_skewed_by_entity_names(self):
        # "Anand" means bliss/joy in Hindi/Sanskrit, but when it's a person's name "Anand said...",
        # it shouldn't turn a neutral or critical statement into positive sentiment.
        res = predict_sentiment("Anand went to the market yesterday.")
        self.assertIn(res["label"], ["Neutral", "Mixed"])

    def test_intent_not_skewed_by_entity_names(self):
        # "State Bank of India" might trigger Banking intent, but a pure name alone should be general query
        res = predict_intent("Rahul Sharma")
        self.assertEqual(res["label"], "General Query")


class TestLoanwordTransliteration(unittest.TestCase):
    """Validate that common English technical loanwords are preserved from mangling."""

    def test_loanwords_preserved_in_roman_to_indic(self):
        # Words like 'laptop', 'project', 'screen', 'office' should NOT be chopped into mangled Indic clusters
        text = "Ee roju nenu office lo project submit cheyali, kani laptop work avadam ledu"
        translit_te = transliterate_roman_to_native(text, "te")
        # Technical loanwords should remain intact in Latin script
        self.assertIn("laptop", translit_te)
        self.assertIn("project", translit_te)
        self.assertIn("office", translit_te)
        self.assertIn("submit", translit_te)

    def test_romanized_hindi_voice_example_detects_and_preserves_english_noun(self):
        text = "hello mei ek engineer hun"
        detected = detect_language(text)
        self.assertEqual(detected["base_language"], "Hindi")
        self.assertIn("Code-Mixed", detected["language"])

        transliterated = transliterate_roman_to_native(text, "hi")
        self.assertIn("मैं", transliterated)
        self.assertIn("एक", transliterated)
        self.assertIn("engineer", transliterated)
        self.assertIn("हूँ", transliterated)

        with patch(
            "app.services.translation_service._query_gtx_translator",
            return_value=("Hello, I am an engineer.", None),
        ) as translator:
            result = translate_meaning(text, target_language="en")

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["source_lang_code"], "hi")
        self.assertEqual(translator.call_args.args, (transliterated, "hi", "en"))


class TestCodeMixingIndex(unittest.TestCase):
    """Validate Gambäck & Das (2014) CMI without arbitrary clamping."""

    def test_pure_monolingual_cmi_is_zero(self):
        text = "यह एक बहुत सुंदर दिन है और हम खुश हैं"
        cm = detect_code_mixing(text)
        self.assertEqual(cm["cmi"], 0.0)
        self.assertFalse(cm["is_code_mixed"])

    def test_code_mixed_cmi_calculation(self):
        # "Movie bahut acchi hai, storyline ekdum mast lagi."
        text = "Movie bahut acchi hai, storyline ekdum mast lagi"
        cm = detect_code_mixing(text)
        self.assertGreater(cm["cmi"], 0.0)
        self.assertTrue(cm["is_code_mixed"])
        self.assertIn("formula", cm)
        self.assertIn("CMI", cm["formula"])


class TestTranslationAndHonestReporting(unittest.TestCase):
    """Validate translation across sentences and honest reporting."""

    def test_pure_named_entity_translation_is_successful(self):
        # Pure proper noun should succeed with preserved/transliterated text, NOT return 'unavailable'
        res = translate_meaning("Rahul Sharma", target_language="en")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["translated_meaning"], "Rahul Sharma")
        self.assertIn("named_entities", res)
        self.assertGreater(len(res["named_entities"]), 0)

    def test_empty_input_honest_reporting(self):
        res = translate_meaning("", target_language="en")
        self.assertEqual(res["status"], "unavailable")
        self.assertIsNone(res["translated_meaning"])

    def test_multilingual_meanings_structure(self):
        res = get_all_multilingual_meanings("Hyderabad is a beautiful city")
        self.assertIn("translations", res)
        self.assertIn("en", res["translations"])
        self.assertIn("te", res["translations"])
        self.assertIn("hi", res["translations"])
        self.assertEqual(res["translations"]["en"]["status"], "same_language")


class TestFullAnalysisService(unittest.TestCase):
    """Validate end-to-end analysis service with named entities, sentences, and 8-stage pipeline."""

    def test_long_complaint_analysis(self):
        complaint = (
            "Main pichle hafte ek naya laptop khareeda tha. "
            "Pehle do din laptop theek chala, lekin kal achanak screen band ho gayi aur switch on nahi ho raha hai. "
            "Maine service center phone kiya toh unhone bola ki replacement nahi milega, sirf repair hoga. "
            "Mujhe office project ke liye laptop ki bahut zaroorat hai aur main bohot pareshan hoon."
        )
        res = analyze_text(complaint)

        # 1. Pipeline stages
        self.assertIn("pipeline_stages", res)
        stage_names = [s["stage"] for s in res["pipeline_stages"]]
        self.assertTrue(any("Named Entity" in s for s in stage_names))
        self.assertTrue(any("Preprocessing" in s for s in stage_names))

        # 2. Named entities detected
        self.assertIn("named_entities", res)

        # 3. Sentences split properly
        self.assertIn("sentences", res)
        self.assertGreaterEqual(len(res["sentences"]), 3)

        # 4. Sentiment classified accurately
        self.assertIn("sentiment", res)
        self.assertEqual(res["sentiment"]["label"], "Negative")

        # 5. Intent classified as Customer Grievance / Service
        self.assertIn("intent", res)
        self.assertIn(res["intent"]["label"], ["Customer Service", "Technical Support"])

        # 6. Translation present and coherent
        self.assertIn("translation", res)
        self.assertEqual(res["translation"]["status"], "success")


if __name__ == "__main__":
    unittest.main()
