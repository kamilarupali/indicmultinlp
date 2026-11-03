# IndicMultiNLP: Multilingual Indic NLP & Intelligent Voice Assistant

An interactive research platform and conversational voice assistant for multilingual Indic language processing, Romanized and code-mixed speech understanding, explainable NLP, and cross-lingual meaning translation across **Telugu, Hindi, Tamil, Kannada, English, and expandable Indian & international languages**.

---

## 🌟 Key Capabilities

### 1. Fully Working Voice + Text Multilingual Assistant
- **Complete End-to-End Pipeline**:
  $$\text{Voice / Text} \longrightarrow \text{Language Detection} \longrightarrow \text{Meaning} \longrightarrow \text{Sentiment / Intent / CMI} \longrightarrow \text{Explainable NLP} \longrightarrow \text{Conversational Response} \longrightarrow \text{Target-Language Translation} \longrightarrow \text{Voice Output (TTS)} \longrightarrow \text{History}$$
- **Voice Input (STT)**: Native Web Speech API with live animated audio orb, pulsing listening state, microphone language picker, and real-time streaming transcription.
- **Text Input**: Keyboard entry with Enter key support and fast pre-set prompt buttons.
- **Spoken Audio Output (TTS)**: Conversational voice synthesis spoken in the selected target language matching the language's native voice locale (e.g., `te-IN`, `hi-IN`, `ta-IN`, `kn-IN`, `en-IN`, `fr-FR`, `es-ES`, etc.).

### 2. Target-Language Selector & Dynamic Language Expansion
- **Core Languages Supported**:
  - **English (`en`)**
  - **Telugu (`te`)** — తెలుగు
  - **Hindi (`hi`)** — हिन्दी
  - **Tamil (`ta`)** — தமிழ்
  - **Kannada (`kn`)** — ಕನ್ನಡ
- **Expandable Indian Languages**:
  - Malayalam (`ml`) — മലയാളം
  - Marathi (`mr`) — मराठी
  - Bengali (`bn`) — বাংলা
  - Gujarati (`gu`) — ગુજરાતી
  - Punjabi (`pa`) — ਪੰਜਾਬੀ
  - Odia (`or`) — ଓଡ଼ିଆ
  - Urdu (`ur`) — اردو
- **Expandable International Languages**:
  - Spanish (`es`), French (`fr`), German (`de`), Japanese (`ja`), Arabic (`ar`), Russian (`ru`), Portuguese (`pt`), Italian (`it`), Korean (`ko`)
- **Custom Language Option**: "+ Add Custom Language" allows entering any ISO 639-1 code (e.g. `tr`, `zh`, `nl`) and language name, dynamically registering it into the selector and speech synthesizer.
- **Target Language Translation**: The conversational assistant response and the input meaning are translated into the selected target language and spoken aloud using TTS.

### 3. Genuine Semantic Meaning Translation vs. Phonetic Transliteration
- **Strict Invariant**: Translation of meaning is **strictly separated** from phonetic transliteration (script conversion). Transliteration, original text, or placeholders are **never** substituted as successful translations.
- **Romanized Dravidian & Indo-Aryan Comprehension**: Romanized text (e.g., `"ee movie chala bagundi"`, `"nenu repu vasthanu"`) is transliterated into native script before querying the neural machine translation engine, producing genuine semantic translations rather than leaving words untranslated.
- **Hybrid Translation Engine**:
  1. *Primary*: High-speed, high-accuracy neural translation via Google Neural MT (`client=gtx`).
  2. *Secondary*: MyMemory Neural MT with authenticated quota support.
  3. *Deterministic*: Verified offline domain phrasebook for zero-latency baseline.
- **Explicit Status Reporting**: Every translation result carries an explicit status: `success`, `unavailable`, `same_language`, or `unsupported_language`, with error details and method tracking.

### 4. Short Conversational Context & "Translate That" Commands
- **Context Memory**: Tracks session context (`last_query`, `last_reply`, `last_translation`, `last_detected_lang`).
- **Contextual Translation**: Commands like `"translate that"`, `"translate that to Tamil"`, `"translate it into Telugu"`, or `"what does that mean in English?"` automatically reference the previous sentence in the conversation, translate it into the requested target language, and speak it aloud.
- **Polite Handling**: If no previous text exists in the conversation, the assistant informs the user and invites them to speak or type a sentence first.

### 5. Explainable NLP Results with Genuine Confidence Scores
- **Language Identification**:
  - Explains *why* the language was detected (e.g. *"Identified as Telugu native script because 100.0% of characters (18/18) belong to the Telugu Unicode Block (U+0C00–U+0C7F)"* or *"Identified as Romanized Telugu because Latin script was used with characteristic Telugu lexical cues: ['chala', 'bagundi']"*).
  - Genuine confidence score calibrated from script distribution or lexical cue density.
- **Code-Mixing Analysis (CMI)**:
  - Implements the Gambäck & Das (2014) standard formula:
    $$\text{CMI} = 100 \times \left[1 - \frac{\max_i w_i}{N}\right]$$
  - Displays token script breakdown, switch points count, and an explicit mathematical explanation of how CMI was computed.
- **Sentiment Analysis**:
  - Explains *why* sentiment was detected, listing matching positive cues (e.g. `+బాగుంది`, `+super`) and negative cues (e.g. `-worst`, `-delay`), along with net polarity score.
  - Genuine confidence score: only displayed when positive or negative cues are present; omitted for uncalibrated neutral baseline with no cues.
- **Intent Classification**:
  - Explains *why* intent was detected, listing domain keyword matches across Education, Shopping, Restaurant, Travel, Entertainment, Customer Service, and Technology.
  - Genuine confidence score: only displayed when domain keywords match; omitted for General Query fallback.

### 6. Translation & Conversation History
- **Persistent Storage**: Saved in `localStorage` across browser refreshes and sessions.
- **History Card Features**:
  - Original input text and detected language badge.
  - Target language badge and translated meaning.
  - Conversational reply and timestamp.
  - Sentiment, intent, and CMI badges.
- **Action Buttons**:
  - 📋 **Copy**: Copies translated text to clipboard with animated "✓ Copied!" feedback.
  - 🔊 **Speak**: Plays TTS speech in the item's target language voice locale.
  - 🗑️ **Delete**: Removes single item from history.
  - 🧹 **Clear All**: Clears all history with confirmation.
- **Instant Search**: Filter past conversations by keyword.

---

## 🚀 Quick Start (One Command)

From the project root:

```bash
./run.sh
```

This script:
1. Verifies/creates the Python virtual environment (`backend/.venv`).
2. Installs backend dependencies.
3. Launches the server on `http://localhost:8000` with the production frontend bundle.
4. Opens `http://localhost:8000` in your default browser.

To run with live hot reloading during development:
```bash
./run.sh --dev
```

---

## 🧪 Automated Test Suite

Run the comprehensive unit and integration test suite:

```bash
./backend/.venv/bin/python -m unittest backend/tests/test_assistant_flow.py
```

The test suite validates:
- Native Indic script detection and explainability (Telugu, Hindi, Tamil, Kannada).
- Romanized Indic and code-mixed detection with lexical cue tracking.
- Code-Mixing Index (CMI) formula calculation and script switch points.
- Sentiment polarity explainability and genuine confidence scoring.
- Intent classification with domain cue tracking.
- Semantic meaning translation across Telugu, Hindi, Tamil, Kannada, English, and Spanish.
- Complete voice assistant flow with target language voice synthesis.
- Conversational context handling (`"translate that"` and `"translate that to Tamil"`).
- Syllabus knowledge base Q&A in target language.

---

## 📁 Project Architecture

```
indicmultinlp/
├── backend/
│   ├── app/
│   │   ├── language/
│   │   │   ├── code_mixing.py          # CMI calculation with Gambäck & Das formula
│   │   │   ├── language_detector.py    # Explainable language detection with Unicode blocks
│   │   │   ├── romanized_detector.py   # Romanized Latin check
│   │   │   └── script_detector.py      # Unicode character range inspector
│   │   ├── preprocessing/
│   │   │   ├── cleaner.py              # URL & noise sanitization
│   │   │   ├── normalization.py        # NFC Unicode normalization
│   │   │   ├── tokenizer.py            # Unicode-aware word tokenization
│   │   │   └── transliteration.py      # Bidirectional phonetic transliteration & lexicon
│   │   ├── routes/
│   │   │   ├── analyze.py              # Live text analysis route
│   │   │   ├── assistant.py            # Voice assistant route (with context & target_language)
│   │   │   ├── translate.py            # Semantic translation routes
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── analysis_service.py     # End-to-end pipeline coordination
│   │   │   ├── assistant_service.py    # Voice assistant, context, target translation, TTS
│   │   │   ├── intent_service.py       # Explainable intent classification
│   │   │   ├── sentiment_service.py    # Explainable sentiment analysis
│   │   │   └── translation_service.py  # Neural MT, phrasebook, multi-language catalog
│   │   └── main.py                     # FastAPI application & SPA static serving
│   ├── server.py                       # Dual-mode server (FastAPI or standalone http.server)
│   └── tests/
│       └── test_assistant_flow.py      # Complete automated test suite
├── frontend/
│   ├── src/
│   │   ├── components/                 # Reusable UI cards & components
│   │   ├── pages/
│   │   │   ├── analyzer.tsx            # Live NLP pipeline analyzer
│   │   │   ├── voiceassistant.tsx      # Voice + Text Multilingual Assistant & History
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.ts                  # API client functions
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript data models
│   │   └── styles.css                  # Dark mode & glassmorphic styling
│   └── package.json
└── run.sh                              # Single-command launcher
```

---

## 🎙️ Browser & Speech Hardware Compatibility

- **Speech-to-Text (STT)**:
  - Uses the native browser **Web Speech API** (`webkitSpeechRecognition`).
  - **Supported Browsers**: Google Chrome, Microsoft Edge, Brave, and Chromium-based browsers on `localhost` or HTTPS.
  - **Fallback**: In Firefox or Safari, users can type their queries directly into the input box or click any pre-set prompt.
- **Text-to-Speech (TTS)**:
  - Uses native `window.speechSynthesis`.
  - Supported across modern desktop and mobile browsers. Native accents and voice timbre correspond to the system's installed language packs.
