import unittest
from app.language.script_detector import detect_script
from app.language.language_detector import detect_language
from app.services.translation_service import translate_meaning, resolve_lang_code, resolve_voice_locale
from app.services.assistant_service import process_voice_query


class TestTranslationAndVoiceFixes(unittest.TestCase):
    """Comprehensive regression and verification test suite for translation and voice fixes."""

    def test_korean_script_detection(self):
        """Korean Hangul characters are identified as Hangul script and Korean language."""
        text = "안녕하세요, 반갑습니다"
        script_info = detect_script(text)
        self.assertEqual(script_info["primary"], "Hangul")
        self.assertIn("Hangul", script_info["scripts"])

        lang_info = detect_language(text)
        self.assertEqual(lang_info["language"], "Korean")
        self.assertEqual(lang_info["script"], "Hangul")
        self.assertFalse(lang_info["is_uncertain"])

    def test_cyrillic_script_detection(self):
        """Cyrillic characters are identified as Cyrillic script and Russian language."""
        text = "Привет, как дела?"
        script_info = detect_script(text)
        self.assertEqual(script_info["primary"], "Cyrillic")

        lang_info = detect_language(text)
        self.assertEqual(lang_info["language"], "Russian")
        self.assertEqual(lang_info["script"], "Cyrillic")

    def test_romanized_indic_vs_english(self):
        """Romanized Telugu and Romanized Hindi are identified based on characteristic cues."""
        telugu_text = "Ee movie chala bagundi, hero acting super ga undi!"
        t_info = detect_language(telugu_text)
        self.assertEqual(t_info["base_language"], "Telugu")
        self.assertEqual(t_info["script"], "Latin")

        hindi_text = "Mujhe ghar jana hai, bahut kaam baki hai"
        h_info = detect_language(hindi_text)
        self.assertEqual(h_info["base_language"], "Hindi")
        self.assertEqual(h_info["script"], "Latin")

    def test_uncertain_source_detection_for_ambiguous_latin(self):
        """Unknown or ambiguous Latin tokens trigger calibrated uncertainty rather than silently guessing English."""
        ambiguous_text = "xyzzy qwerty blabla foo zxcv"
        info = detect_language(ambiguous_text)
        self.assertTrue(info["is_uncertain"])
        self.assertTrue(info["needs_confirmation"])
        self.assertEqual(info["base_language"], "uncertain")
        self.assertIn("suggested_languages", info)

    def test_context_isolation_between_consecutive_unrelated_queries(self):
        """A Romanized Hindi query must NOT receive the prior turn's Korean sentence."""
        # Turn 1: Korean sentence
        turn1 = process_voice_query("안녕하세요", target_language="en")
        self.assertEqual(turn1["target_lang_code"], "en")
        self.assertIn("Hello", turn1["speech_text"])

        # Context built from turn 1
        context = {
            "last_user_sentence": turn1["user_sentence"],
            "last_query": turn1["query"],
            "last_translation": turn1.get("translated_reply"),
        }

        # Turn 2: User says a new sentence in Romanized Hindi
        turn2 = process_voice_query("Mujhe ghar jana hai", target_language="en", context=context)
        # It must translate the CURRENT sentence ("Mujhe ghar jana hai"), NOT the Korean sentence!
        self.assertEqual(turn2["user_sentence"], "Mujhe ghar jana hai")
        self.assertNotIn("Hello", turn2["speech_text"])
        self.assertTrue("home" in turn2["speech_text"].lower() or "go" in turn2["speech_text"].lower())

    def test_contextual_command_isolates_prior_sentence(self):
        """'Translate that to Hindi' explicitly translates the prior user sentence."""
        turn1 = process_voice_query("Thank you very much", target_language="en")
        context = {
            "last_user_sentence": turn1["user_sentence"],
            "last_query": turn1["query"],
            "last_text_to_translate": turn1.get("text_to_translate"),
        }

        turn2 = process_voice_query("Translate that to Hindi", target_language="en", context=context)
        self.assertEqual(turn2["intent_type"], "contextual_translation")
        self.assertEqual(turn2["target_lang_code"], "hi")
        self.assertEqual(turn2["user_sentence"], "Thank you very much")
        self.assertIn("धन्यवाद", turn2["speech_text"])

    def test_deictic_words_not_treated_as_literal_sentences(self):
        """'that' or 'this' in 'translate that' must not be translated as a literal one-word sentence."""
        context = {"last_user_sentence": "Good morning"}
        res = process_voice_query("translate that", target_language="hi", context=context)
        self.assertEqual(turn_text := res["user_sentence"], "Good morning")
        self.assertEqual(res["speech_text"], "शुभ प्रभात")

    def test_unchanged_input_rejected_when_src_differs_from_tgt(self):
        """When source and target languages differ, returning input unchanged is marked unavailable."""
        # Non-pure-entity sentence with unknown words forced into German
        res = translate_meaning("qwerty uiophjkl zxcvbnm", target_language="de", source_language="te")
        self.assertIn(res["status"], ("unavailable", "error", "uncertain"))
        # Must not be 'success' with identical output!
        if res["translated_meaning"] is not None:
            self.assertNotEqual(res["translated_meaning"].strip(), "qwerty uiophjkl zxcvbnm")

    def test_target_voice_locales(self):
        """Target language codes map to authentic regional voice locales."""
        self.assertEqual(resolve_voice_locale("te"), "te-IN")
        self.assertEqual(resolve_voice_locale("hi"), "hi-IN")
        self.assertEqual(resolve_voice_locale("ta"), "ta-IN")
        self.assertEqual(resolve_voice_locale("kn"), "kn-IN")
        self.assertEqual(resolve_voice_locale("ml"), "ml-IN")
        self.assertEqual(resolve_voice_locale("or"), "or-IN")
        self.assertEqual(resolve_voice_locale("ko"), "ko-KR")
        self.assertEqual(resolve_voice_locale("ru"), "ru-RU")
        self.assertEqual(resolve_voice_locale("es"), "es-ES")

    def test_offline_phrasebook_korean_and_indic_greetings(self):
        """Verified offline phrasebook provides instant translations across Korean and Indic languages."""
        ko_res = translate_meaning("안녕하세요", target_language="en")
        self.assertEqual(ko_res["status"], "success")
        self.assertEqual(ko_res["translated_meaning"], "Hello")

        gamsa_res = translate_meaning("gamsahamnida", target_language="hi")
        self.assertEqual(gamsa_res["status"], "success")
        self.assertEqual(gamsa_res["translated_meaning"], "धन्यवाद")

        telugu_res = translate_meaning("namaskaram", target_language="hi")
        self.assertEqual(telugu_res["status"], "success")
        self.assertEqual(telugu_res["translated_meaning"], "नमस्ते")

    def test_speech_text_is_only_translation(self):
        """Voice assistant speech text contains only the translated text, never markdown or debug clutter."""
        res = process_voice_query("Hello", target_language="te")
        self.assertEqual(res["target_lang_code"], "te")
        self.assertEqual(res["speech_text"], "నమస్కారం")
        self.assertNotIn("**", res["speech_text"])
        self.assertNotIn("Translation:", res["speech_text"])


if __name__ == "__main__":
    unittest.main()
