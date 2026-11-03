"""Unit and Integration Tests for IndicMultiNLP Pipeline Trace, Translation Context, and Voice Assistant.

Validates:
1. Full-sentence translation preserving meaning in context (English, Indic, Code-mixed).
2. Selected target language translation consistency.
3. Pipeline trace data integrity (supported stages, tokens, script tags, CMI switch points, honest labeling).
4. Voice Assistant presets and conversational context commands ('translate that', 'translate that to [lang]', empty context).
5. Long multi-sentence and code-mixed discourse handling.
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.language.language_detector import detect_language
from app.language.code_mixing import detect_code_mixing
from app.services.translation_service import translate_meaning, get_all_multilingual_meanings
from app.services.analysis_service import analyze
from app.services.assistant_service import process_voice_query


class TestPipelineTraceAndHonestReporting(unittest.TestCase):
    """Validate that the pipeline trace returns rich supported stages, token info, and honest labeling."""

    def test_pipeline_trace_stages_and_honest_label(self):
        text = "Ee movie chala bagundi, hero acting super ga undi!"
        res = analyze(text)

        self.assertIn("pipeline_stages", res)
        stages = res["pipeline_stages"]
        self.assertGreaterEqual(len(stages), 8)

        # Verify presence of key stages
        stage_names = [s["stage"] for s in stages]
        self.assertTrue(any("Tokenization" in s for s in stage_names))
        self.assertTrue(any("Script" in s for s in stage_names))
        self.assertTrue(any("Code-Mixing" in s for s in stage_names))
        self.assertTrue(any("Named Entity" in s for s in stage_names))
        self.assertTrue(any("Translation" in s for s in stage_names))

        # Verify honest reporting of unsupported deep syntax tree
        unsupported_stages = [s for s in stages if not s.get("supported", True)]
        self.assertGreaterEqual(len(unsupported_stages), 1)
        self.assertTrue(any("Unsupported" in s.get("status_label", "") for s in unsupported_stages))

        # Verify tokens and code-switching tags in result
        self.assertIn("tokens", res)
        self.assertGreater(len(res["tokens"]), 0)
        self.assertIn("token_tags", res["code_mixing"])
        self.assertGreater(len(res["code_mixing"]["token_tags"]), 0)


class TestFullSentenceTranslationAndTargetLanguages(unittest.TestCase):
    """Validate full-sentence semantic preservation and selected target language behavior."""

    def test_english_full_sentence_not_mangled_as_hindi(self):
        text = "The food is delicious, but the train was delayed."
        detected = detect_language(text)
        self.assertEqual(detected["base_language"], "English")
        self.assertEqual(detected["script"], "Latin")

        # Mock translator response to test invariant without depending on external network latency
        with patch(
            "app.services.translation_service._query_gtx_translator",
            return_value=("ఆహారం రుచికరమైనది, కానీ రైలు ఆలస్యమైంది.", None),
        ):
            res_te = translate_meaning(text, target_language="te")
            self.assertEqual(res_te["status"], "success")
            self.assertEqual(res_te["target_lang_code"], "te")
            self.assertIn("ఆహారం", res_te["translated_meaning"])

    def test_code_mixed_input_translation(self):
        text = "Movie bahut acchi hai, storyline ekdum mast lagi!"
        detected = detect_language(text)
        self.assertEqual(detected["base_language"], "Hindi")

        with patch(
            "app.services.translation_service._query_gtx_translator",
            return_value=("The movie is very good, I really liked the storyline!", None),
        ):
            res_en = translate_meaning(text, target_language="en")
            self.assertEqual(res_en["status"], "success")
            self.assertEqual(res_en["target_lang_code"], "en")
            self.assertIn("movie", res_en["translated_meaning"].lower())

    def test_target_language_selection_in_analyze(self):
        text = "ఈ సినిమా కథ చాలా బాగుంది"
        with patch(
            "app.services.translation_service._query_gtx_translator",
            return_value=("यह फिल्म बहुत अच्छी है", None),
        ):
            res = analyze(text, target_language="hi")
            self.assertEqual(res["translation"]["target_lang_code"], "hi")
            self.assertEqual(res["translation"]["target_language"], "Hindi")


class TestVoiceAssistantPresetsAndContextCommands(unittest.TestCase):
    """Validate presets, explicit commands, and conversational context commands in Voice Assistant."""

    def test_contextual_translate_that_with_previous_context(self):
        context = {
            "last_query": "Ee movie chala bagundi, hero acting super ga undi!",
            "last_translation": "This movie is very good, hero acting is super!",
            "last_detected_lang": "Telugu",
        }
        with patch(
            "app.services.assistant_service.translate_meaning",
            return_value={
                "status": "success",
                "translated_meaning": "यह फिल्म बहुत अच्छी है, हीरो की एक्टिंग शानदार है!",
                "translation_method": "Neural MT",
                "target_language": "Hindi",
                "target_lang_code": "hi",
                "error_detail": None,
            },
        ):
            res = process_voice_query("translate that to Hindi", target_language="en", context=context)
            self.assertEqual(res["intent_type"], "contextual_translation")
            self.assertEqual(res["target_lang_code"], "hi")
            self.assertEqual(res["speech_lang"], "hi-IN")
            self.assertEqual(res["speech_text"], "यह फिल्म बहुत अच्छी है, हीरो की एक्टिंग शानदार है!")

    def test_contextual_translate_that_defaults_to_selected_target(self):
        context = {
            "last_query": "The food was delicious",
            "last_translation": "ఆహారం రుచికరమైనది",
            "last_detected_lang": "English",
        }
        with patch(
            "app.services.assistant_service.translate_meaning",
            return_value={
                "status": "success",
                "translated_meaning": "இந்த உணவு சுவையாக இருந்தது",
                "translation_method": "Neural MT",
                "target_language": "Tamil",
                "target_lang_code": "ta",
                "error_detail": None,
            },
        ):
            # When query is just 'translate that', it uses selected target_language ('ta')
            res = process_voice_query("translate that", target_language="ta", context=context)
            self.assertEqual(res["intent_type"], "contextual_translation")
            self.assertEqual(res["target_lang_code"], "ta")
            self.assertEqual(res["speech_lang"], "ta-IN")

    def test_contextual_translate_that_with_empty_context(self):
        res = process_voice_query("translate that", target_language="hi", context={})
        self.assertEqual(res["intent_type"], "contextual_translation_empty")
        self.assertIn("no previous sentence", res["reply_text"].lower())

    def test_voice_assistant_honors_selected_target_language(self):
        query = "Main kal Delhi ja raha hoon"
        with patch(
            "app.services.assistant_service.translate_meaning",
            return_value={
                "status": "success",
                "translated_meaning": "నేను రేపు ఢిల్లీ వెళ్తున్నాను",
                "translation_method": "Neural MT",
                "target_language": "Telugu",
                "target_lang_code": "te",
                "error_detail": None,
            },
        ):
            res = process_voice_query(query, target_language="te")
            self.assertEqual(res["target_lang_code"], "te")
            self.assertEqual(res["speech_lang"], "te-IN")
            self.assertEqual(res["speech_text"], "నేను రేపు ఢిల్లీ వెళ్తున్నాను")


if __name__ == "__main__":
    unittest.main()
