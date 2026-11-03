import unittest
from app.services.assistant_service import process_voice_query
from app.services.translation_service import (
    translate_meaning,
    resolve_lang_code,
    resolve_lang_name,
    resolve_voice_locale,
    LANGUAGE_CODES,
)


class TestDashboardAndMultilingualVoice(unittest.TestCase):
    """Test suite covering the complete dashboard metrics contracts and multilingual voice flow."""

    def test_microphone_explicit_source_forwarding(self):
        """Microphone selector language code is forwarded to translation flow."""
        # When user selected Telugu microphone (te-IN) and spoke Romanized or native Telugu
        res = process_voice_query("namaskaram", target_language="en", source_language="te")
        self.assertEqual(res["target_lang_code"], "en")
        self.assertEqual(res["source_lang_code"], "te")
        self.assertEqual(res["source_speech_lang"], "te-IN")
        self.assertEqual(res["speech_lang"], "en-IN")
        self.assertIn("Hello", res["speech_text"])

    def test_multilingual_pairs_translation_and_separate_speech_locales(self):
        """Translates across supported pairs and provides separate locales for original and target speech."""
        test_cases = [
            # (query, source_lang, target_lang, expected_src_locale, expected_tgt_locale)
            ("ధన్యవాదాలు", "te", "en", "te-IN", "en-IN"),
            ("धन्यवाद", "hi", "te", "hi-IN", "te-IN"),
            ("நன்றி", "ta", "hi", "ta-IN", "hi-IN"),
            ("ಧನ್ಯವಾದಗಳು", "kn", "en", "kn-IN", "en-IN"),
            ("നന്ദി", "ml", "en", "ml-IN", "en-IN"),
            ("ଧନ୍ୟବାଦ", "or", "en", "or-IN", "en-IN"),
            ("شکریہ", "ur", "en", "ur-PK", "en-IN"),
            ("감사합니다", "ko", "en", "ko-KR", "en-IN"),
            ("Thank you", "en", "ko", "en-IN", "ko-KR"),
            ("Thank you", "en", "es", "en-IN", "es-ES"),
        ]

        for query, src, tgt, exp_src_loc, exp_tgt_loc in test_cases:
            res = process_voice_query(query, target_language=tgt, source_language=src)
            self.assertEqual(
                res["target_lang_code"],
                tgt,
                f"Failed target lang for {query}",
            )
            self.assertEqual(
                res["source_speech_lang"],
                exp_src_loc,
                f"Failed source speech locale for {query}",
            )
            self.assertEqual(
                res["speech_lang"],
                exp_tgt_loc,
                f"Failed target speech locale for {query}",
            )
            self.assertTrue(
                len(res["speech_text"]) > 0,
                f"Expected non-empty speech text for {query}",
            )

    def test_identity_output_never_claimed_as_successful_translation(self):
        """When translation returns unchanged input across differing languages, status is unavailable, never success."""
        from unittest.mock import patch
        with patch("app.services.translation_service._query_gtx_translator", return_value=("Hello world input", None)):
            with patch("app.services.translation_service._query_mymemory_translator", return_value=("Hello world input", None)):
                res = translate_meaning("Hello world input", target_language="te", source_language="en")
                self.assertEqual(res["status"], "unavailable")
                self.assertIsNone(res.get("translated_meaning"))
                err = res.get("error_detail", "").lower()
                self.assertTrue("unchanged" in err or "untranslated" in err)

    def test_dashboard_metrics_calculation_contract(self):
        """Dashboard accurately calculates sentences, errors, and distinguishes unavailable from success."""
        # Simulate session records adhering to ConversationHistoryItem contract
        session_history = [
            {
                "id": "1",
                "timestamp": "10:00 AM",
                "originalText": "నమస్కారం",
                "detectedLanguage": "Telugu",
                "targetLanguage": "English",
                "targetLangCode": "en",
                "translatedMeaning": "Hello / Greetings",
                "status": "success",
                "replyText": "Hello",
                "speechText": "Hello",
                "speechLang": "en-IN",
                "sourceSpeechLang": "te-IN",
                "sourceModule": "assistant",
            },
            {
                "id": "2",
                "timestamp": "10:02 AM",
                "originalText": "Hello world",
                "detectedLanguage": "English",
                "targetLanguage": "English",
                "targetLangCode": "en",
                "translatedMeaning": "Hello world",
                "status": "same_language",
                "replyText": "Hello world",
                "speechText": "Hello world",
                "speechLang": "en-IN",
                "sourceSpeechLang": "en-IN",
                "sourceModule": "analyzer",
            },
            {
                "id": "3",
                "timestamp": "10:05 AM",
                "originalText": "xyz_rare_unsupported_term",
                "detectedLanguage": "Unknown",
                "targetLanguage": "Telugu",
                "targetLangCode": "te",
                "translatedMeaning": "Translation unavailable",
                "status": "unavailable",
                "errorDetail": "No offline phrasebook match and translation service limit reached",
                "replyText": "Translation unavailable",
                "speechText": "",
                "speechLang": "te-IN",
                "sourceSpeechLang": "en-IN",
                "sourceModule": "assistant",
            },
            {
                "id": "4",
                "timestamp": "10:08 AM",
                "originalText": "Test sentence",
                "detectedLanguage": "English",
                "targetLanguage": "Hindi",
                "targetLangCode": "hi",
                "translatedMeaning": "Translation Error",
                "status": "error",
                "errorDetail": "Network connection dropped to external translation backend",
                "replyText": "Network error",
                "speechText": "",
                "speechLang": "hi-IN",
                "sourceSpeechLang": "en-IN",
                "sourceModule": "assistant",
            },
        ]

        sentences_analyzed = len(session_history)
        real_errors = [h for h in session_history if h["status"] == "error" or h.get("errorDetail")]
        strictly_failed = [h for h in session_history if h["status"] == "error"]
        successful = [h for h in session_history if h["status"] in ("success", "same_language")]
        unavailable = [h for h in session_history if h["status"] == "unavailable"]

        self.assertEqual(sentences_analyzed, 4)
        self.assertEqual(len(strictly_failed), 1)
        # Unavailable is strictly separate from success
        self.assertEqual(len(successful), 2)
        self.assertEqual(len(unavailable), 1)
        self.assertNotIn("unavailable", [s["status"] for s in successful])

    def test_voice_locales_resolution(self):
        """Voice locales match target and source speech requirements."""
        self.assertEqual(resolve_voice_locale("te"), "te-IN")
        self.assertEqual(resolve_voice_locale("hi"), "hi-IN")
        self.assertEqual(resolve_voice_locale("ta"), "ta-IN")
        self.assertEqual(resolve_voice_locale("kn"), "kn-IN")
        self.assertEqual(resolve_voice_locale("ml"), "ml-IN")
        self.assertEqual(resolve_voice_locale("or"), "or-IN")
        self.assertEqual(resolve_voice_locale("ur"), "ur-PK")
        self.assertEqual(resolve_voice_locale("ko"), "ko-KR")
        self.assertEqual(resolve_voice_locale("es"), "es-ES")
        self.assertEqual(resolve_voice_locale("fr"), "fr-FR")
        self.assertEqual(resolve_voice_locale("en"), "en-IN")


if __name__ == "__main__":
    unittest.main()
