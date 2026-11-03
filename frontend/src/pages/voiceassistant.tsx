import { useState, useEffect, useRef } from 'react';
import { queryVoiceAssistant } from '../services/api';
import type { VoiceAssistantResponse, ConversationHistoryItem } from '../types';

interface TargetLanguageOption {
  code: string;
  name: string;
  voiceLocale: string;
  category: 'core' | 'indic' | 'international' | 'custom';
}

const DEFAULT_TARGET_LANGUAGES: TargetLanguageOption[] = [
  // Core 5
  { code: 'en', name: 'English', voiceLocale: 'en-IN', category: 'core' },
  { code: 'te', name: 'Telugu (తెలుగు)', voiceLocale: 'te-IN', category: 'core' },
  { code: 'hi', name: 'Hindi (हिन्दी)', voiceLocale: 'hi-IN', category: 'core' },
  { code: 'ta', name: 'Tamil (தமிழ்)', voiceLocale: 'ta-IN', category: 'core' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', voiceLocale: 'kn-IN', category: 'core' },
  // More Indian Languages
  { code: 'ml', name: 'Malayalam (മലയാളം)', voiceLocale: 'ml-IN', category: 'indic' },
  { code: 'mr', name: 'Marathi (मराठी)', voiceLocale: 'mr-IN', category: 'indic' },
  { code: 'bn', name: 'Bengali (বাংলা)', voiceLocale: 'bn-IN', category: 'indic' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)', voiceLocale: 'gu-IN', category: 'indic' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)', voiceLocale: 'pa-IN', category: 'indic' },
  { code: 'or', name: 'Odia (ଓଡ଼ିଆ)', voiceLocale: 'or-IN', category: 'indic' },
  { code: 'ur', name: 'Urdu (اردو)', voiceLocale: 'ur-PK', category: 'indic' },
  // International Languages
  { code: 'es', name: 'Spanish (Español)', voiceLocale: 'es-ES', category: 'international' },
  { code: 'fr', name: 'French (Français)', voiceLocale: 'fr-FR', category: 'international' },
  { code: 'de', name: 'German (Deutsch)', voiceLocale: 'de-DE', category: 'international' },
  { code: 'ja', name: 'Japanese (日本語)', voiceLocale: 'ja-JP', category: 'international' },
  { code: 'ar', name: 'Arabic (العربية)', voiceLocale: 'ar-SA', category: 'international' },
  { code: 'ru', name: 'Russian (Русский)', voiceLocale: 'ru-RU', category: 'international' },
  { code: 'pt', name: 'Portuguese (Português)', voiceLocale: 'pt-PT', category: 'international' },
  { code: 'it', name: 'Italian (Italiano)', voiceLocale: 'it-IT', category: 'international' },
  { code: 'ko', name: 'Korean (한국어)', voiceLocale: 'ko-KR', category: 'international' },
];

function findVoiceForLocale(locale: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices || voices.length === 0) return undefined;
  const clean = locale.toLowerCase().replace('_', '-');
  const prefix = clean.split('-')[0];
  const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === clean);
  if (exact) return exact;
  const prefixMatch = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
  if (prefixMatch) return prefixMatch;
  return undefined;
}

const MIC_INPUT_LANGS = [
  { code: 'te-IN', label: 'Telugu (తెలుగు - Native Script)' },
  { code: 'hi-IN', label: 'Hindi (हिन्दी - Native Script)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ் - Native Script)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ - Native Script)' },
  { code: 'or-IN', label: 'Odia (ଓଡ଼ିଆ - Native Script)' },
  { code: 'ur-IN', label: 'Urdu (اردو - India)' },
  { code: 'ur-PK', label: 'Urdu (اردو - Pakistan)' },
  { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'bn-IN', label: 'Bengali (বাংলা)' },
  { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'es-ES', label: 'Spanish (Español)' },
  { code: 'fr-FR', label: 'French (Français)' },
  { code: 'de-DE', label: 'German (Deutsch)' },
  { code: 'ja-JP', label: 'Japanese (日本語)' },
  { code: 'ar-SA', label: 'Arabic (العربية)' },
  { code: 'ru-RU', label: 'Russian (Русский)' },
  { code: 'pt-PT', label: 'Portuguese (Português)' },
  { code: 'it-IT', label: 'Italian (Italiano)' },
  { code: 'ko-KR', label: 'Korean (한국어)' },
  { code: 'en-IN', label: 'English / Romanized Indic / Code-Mixed (en-IN)' },
  { code: 'en-US', label: 'English (en-US)' },
];

function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Strip markdown bold / italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Strip parenthetical source notes like *(Source: Telugu)*
    .replace(/\s*\*\([^)]*\)\*/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    // Strip markdown headers, links, and code backticks
    .replace(/^#+\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip emojis
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function VoiceAssistant() {
  const [query, setQuery] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [response, setResponse] = useState<VoiceAssistantResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [selectedMicLang, setSelectedMicLang] = useState('te-IN');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceEngine, setVoiceEngine] = useState<'neural' | 'browser'>('neural');
  const [speechSpeed, setSpeechSpeed] = useState<number>(0.92);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasSpeechRecog, setHasSpeechRecog] = useState(false);
  const [hasSpeechSynth, setHasSpeechSynth] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Transcript review & progress state
  const [autoSubmitVoice, setAutoSubmitVoice] = useState(false);
  const [isReviewingTranscript, setIsReviewingTranscript] = useState(false);
  const [showMicGuide, setShowMicGuide] = useState(false);
  const [processingStage, setProcessingStage] = useState('');

  // Custom Language state
  const [customLanguages, setCustomLanguages] = useState<TargetLanguageOption[]>(() => {
    try {
      const saved = localStorage.getItem('indicmultinlp_custom_languages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');

  // Conversation context (for "translate that", etc.)
  const [context, setContext] = useState<{
    last_user_sentence?: string;
    last_query?: string;
    last_text_to_translate?: string;
    last_reply?: string;
    last_translation?: string;
    last_detected_lang?: string;
    last_target_lang?: string;
  }>({});

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Translation & Conversation History
  const [history, setHistory] = useState<ConversationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('indicmultinlp_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [historySearch, setHistorySearch] = useState('');

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const submitTranscriptRef = useRef<(transcript: string) => void>(() => undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Speech Recognition & Synthesis detection
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const synthSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setHasSpeechSynth(synthSupported);

    if (synthSupported) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    if (SpeechRecognition) {
      setHasSpeechRecog(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setListening(true);
        setIsReviewingTranscript(false);
        setStatusMessage('Listening… speak clearly into your microphone!');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript + ' ';
          } else {
            interimTranscript += item[0].transcript;
          }
        }
        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          setQuery(combined);
          finalTranscriptRef.current = combined;
        }
      };

      recognition.onerror = (event: any) => {
        setListening(false);
        if (event.error === 'not-allowed') {
          setStatusMessage('Microphone access denied. Please grant permission in browser settings.');
        } else if (event.error === 'no-speech') {
          setStatusMessage('No speech detected. Please tap mic and try again.');
        } else {
          setStatusMessage(`Speech recognition: ${event.error}`);
        }
        setTimeout(() => setStatusMessage(''), 4500);
      };

      recognition.onend = () => {
        setListening(false);
        const transcript = finalTranscriptRef.current;
        finalTranscriptRef.current = '';
        if (transcript) {
          setQuery(transcript);
          if (autoSubmitVoice) {
            setStatusMessage('');
            setIsReviewingTranscript(false);
            submitTranscriptRef.current(transcript);
          } else {
            setIsReviewingTranscript(true);
            setStatusMessage('✓ Voice captured! Review or edit below, then click "Translate & Speak"');
          }
        } else {
          setStatusMessage('');
        }
      };

      recognitionRef.current = recognition;
    } else {
      setHasSpeechRecog(false);
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [autoSubmitVoice]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('indicmultinlp_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history]);

  // Save custom languages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('indicmultinlp_custom_languages', JSON.stringify(customLanguages));
    } catch (e) {
      console.warn('Could not save custom languages to localStorage', e);
    }
  }, [customLanguages]);

  const allTargetLanguages = [...DEFAULT_TARGET_LANGUAGES, ...customLanguages];
  const currentTargetLangObj = allTargetLanguages.find((l) => l.code === targetLang) || allTargetLanguages[0];
  const currentTargetVoice = findVoiceForLocale(
    currentTargetLangObj.voiceLocale,
    availableVoices.length > 0
      ? availableVoices
      : typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis.getVoices()
      : []
  );

  function toggleListening() {
    if (!hasSpeechRecog || !recognitionRef.current) {
      alert(
        'Speech Recognition (STT) requires a Chromium-based browser (Chrome, Edge, Brave) with microphone permissions. You can also type freely in the input box!'
      );
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setSpeaking(false);
      recognitionRef.current.lang = selectedMicLang;
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.lang = selectedMicLang;
          recognitionRef.current.start();
        }, 150);
      }
    }
  }

  async function handleSendQuery(customQuery?: string, explicitSourceLang?: string) {
    const textToSend = customQuery ?? query;
    if (!textToSend.trim()) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }

    setIsReviewingTranscript(false);
    setBusy(true);
    setError('');
    setProcessingStage('Analyzing language, grammar & script...');
    setStatusMessage(`Translating into ${currentTargetLangObj.name}…`);

    try {
      const res = await queryVoiceAssistant(textToSend, targetLang, context, 'baseline', explicitSourceLang);
      setResponse(res);
      setProcessingStage('Spoken response ready');

      // Update conversational context for subsequent "translate that" requests
      const detectedLangName = explicitSourceLang || res.analysis?.language.language || 'Unknown';
      const rawTransStatus = res.translation_data?.status;
      const isSuccess = rawTransStatus === 'success';
      const isSameLang = rawTransStatus === 'same_language';
      const isUncertain = res.is_uncertain || res.needs_confirmation || res.intent_type === 'language_confirmation_needed';
      const isUnavailable = rawTransStatus === 'unavailable';
      const isError = rawTransStatus === 'error';

      const itemStatus: ConversationHistoryItem['status'] =
        isUncertain ? 'uncertain' :
        isSameLang ? 'same_language' :
        isSuccess ? 'success' :
        isUnavailable ? 'unavailable' :
        isError ? 'error' :
        (res.translated_reply ? 'success' : 'unavailable');

      const cleanMeaning =
        itemStatus === 'success' || itemStatus === 'same_language'
          ? (res.translation_data?.translated_meaning || res.translated_reply || '')
          : itemStatus === 'uncertain'
          ? 'Source language confirmation needed'
          : 'Translation unavailable';

      const reply = res.reply_text || '';

      const lastUserSent =
        res.last_user_sentence ||
        res.user_sentence ||
        res.text_to_translate ||
        (context.last_user_sentence || textToSend);

      setContext({
        last_user_sentence: lastUserSent,
        last_query: textToSend,
        last_text_to_translate: res.text_to_translate || textToSend,
        last_reply: reply,
        last_translation: isSuccess || isSameLang ? cleanMeaning : undefined,
        last_detected_lang: detectedLangName,
        last_target_lang: res.target_language || targetLang,
      });

      // Record in conversation history with explicit status
      const newHistoryItem: ConversationHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalText: textToSend,
        detectedLanguage: detectedLangName,
        sourceLanguage: explicitSourceLang || res.translation_data?.source_language || res.source_language,
        sourceLangCode: res.translation_data?.source_lang_code || res.source_lang_code,
        sourceSpeechLang: res.source_speech_lang || (res.source_lang_code ? `${res.source_lang_code}-IN` : 'en-IN'),
        targetLanguage: res.target_language || currentTargetLangObj.name,
        targetLangCode: res.target_lang_code || targetLang,
        translatedMeaning: cleanMeaning,
        status: itemStatus,
        replyText: reply,
        speechText: res.speech_text,
        speechLang: res.speech_lang,
        sentiment: res.analysis?.sentiment.label,
        sentimentConfidence: res.analysis?.sentiment.confidence,
        sentimentConfidenceGenuine: res.analysis?.sentiment.confidence_is_genuine,
        intent: res.analysis?.intent.label,
        cmi: res.analysis?.code_mixing.cmi,
        isRomanized: res.analysis?.romanized,
        nativeScript: res.analysis?.translation?.transliteration?.native_script,
        isUncertain: isUncertain,
        suggestedLanguages: res.suggested_languages,
        errorDetail: res.translation_data?.error_detail || undefined,
        sourceModule: 'assistant',
      };

      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 49)]); // Keep last 50 items

      // Auto-speak response in target language if enabled and valid
      if (autoSpeak && res.speech_text && !isUncertain) {
        speakText(res.speech_text, res.speech_lang);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Voice assistant request failed';
      setError(errMsg);

      // Record real error in session history
      const errItem: ConversationHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalText: textToSend,
        detectedLanguage: explicitSourceLang || 'Unknown',
        sourceLanguage: explicitSourceLang,
        targetLanguage: currentTargetLangObj.name,
        targetLangCode: targetLang,
        translatedMeaning: 'Translation Error',
        status: 'error',
        errorDetail: errMsg,
        replyText: `Request error: ${errMsg}`,
        speechText: '',
        speechLang: 'en-IN',
        sourceModule: 'assistant',
      };
      setHistory((prev) => [errItem, ...prev.slice(0, 49)]);
    } finally {
      setBusy(false);
      setStatusMessage('');
    }
  }

  // Keep the recognition callback connected to the latest target language and context.
  submitTranscriptRef.current = (transcript) => {
    const micBase = (selectedMicLang === 'en-IN' || selectedMicLang === 'en-US') ? undefined : selectedMicLang.split('-')[0];
    void handleSendQuery(transcript, micBase);
  };

  function playCloudTtsAudio(textToSpeak: string, langCode: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const clean = cleanTextForSpeech(textToSpeak);
    if (!clean) return;

    const cleanLang = langCode.split('-')[0].toLowerCase();
    const url = `/api/tts?text=${encodeURIComponent(clean)}&lang=${encodeURIComponent(cleanLang)}`;
    const audio = new Audio(url);
    audio.playbackRate = speechSpeed;
    audioRef.current = audio;

    audio.onplay = () => {
      setSpeaking(true);
      setStatusMessage(`🔊 Speaking in ${currentTargetLangObj.name} (HD Neural Voice · ${speechSpeed}x speed)…`);
    };
    audio.onended = () => {
      setSpeaking(false);
      setStatusMessage('');
      audioRef.current = null;
    };
    audio.onerror = () => {
      setSpeaking(false);
      setStatusMessage(`⚠️ Spoken voice audio is currently unavailable for ${currentTargetLangObj.name} on this device, but the complete written translation remains accessible.`);
      audioRef.current = null;
    };
    audio.play().catch((err) => {
      console.warn('Audio playback error', err);
      setSpeaking(false);
      setStatusMessage(`⚠️ Spoken voice audio was blocked or unavailable, but the complete written translation remains accessible.`);
      audioRef.current = null;
    });
  }

  function speakText(textToSpeak: string, langCode = 'en-IN') {
    const clean = cleanTextForSpeech(textToSpeak);
    if (!clean) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (voiceEngine === 'neural') {
      // Primary Crystal-Clear HD Neural Voice: native pronunciation & high clarity
      playCloudTtsAudio(clean, langCode);
      return;
    }

    // Secondary Browser Device Voice
    const voices =
      availableVoices.length > 0
        ? availableVoices
        : typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis.getVoices()
        : [];
    const matchedVoice = findVoiceForLocale(langCode, voices);

    if (hasSpeechSynth && matchedVoice) {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
      utterance.rate = speechSpeed;

      utterance.onstart = () => {
        setSpeaking(true);
        setStatusMessage(`🔊 Speaking in ${currentTargetLangObj.name} (${matchedVoice.name})…`);
      };
      utterance.onend = () => {
        setSpeaking(false);
        setStatusMessage('');
      };
      utterance.onerror = () => {
        playCloudTtsAudio(clean, langCode);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      playCloudTtsAudio(clean, langCode);
    }
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  function deleteHistoryItem(id: string) {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }

  function clearAllHistory() {
    if (confirm('Are you sure you want to clear all conversation & translation history?')) {
      setHistory([]);
      try {
        localStorage.removeItem('indicmultinlp_history');
      } catch {}
    }
  }

  function handleAddCustomLanguage() {
    const code = customCode.trim().toLowerCase();
    const name = customName.trim();
    if (!code || !name) {
      alert('Please provide both language name and a 2-letter ISO language code.');
      return;
    }
    if (allTargetLanguages.some((l) => l.code === code)) {
      alert(`Language code "${code}" already exists in the selector.`);
      return;
    }

    const newLang: TargetLanguageOption = {
      code,
      name,
      voiceLocale: `${code}-${code.toUpperCase()}`,
      category: 'custom',
    };

    setCustomLanguages((prev) => [...prev, newLang]);
    setTargetLang(code);
    setCustomCode('');
    setCustomName('');
    setShowCustomModal(false);
  }

  const filteredHistory = history.filter((item) => {
    if (!historySearch.trim()) return true;
    const s = historySearch.toLowerCase();
    return (
      item.originalText.toLowerCase().includes(s) ||
      item.translatedMeaning.toLowerCase().includes(s) ||
      item.detectedLanguage.toLowerCase().includes(s) ||
      item.targetLanguage.toLowerCase().includes(s)
    );
  });

  return (
    <>
      <div className="intro">
        <div>
          <div className="eyebrow">INTELLIGENT MULTILINGUAL VOICE + TEXT ASSISTANT</div>
          <p>
            Seamlessly detect Indian languages, Romanized text, and code-mixed speech. Understands deep semantic meaning,
            analyzes explainable sentiment/intent/CMI, and synthesizes conversational spoken voice responses in your selected target language.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#b8c5d3', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-Speak Responses
          </label>
        </div>
      </div>

      {/* Target Language Selector Toolbar */}
      <div className="target-lang-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-teal)' }}>
            🎯 Target Response Language:
          </span>
          <select
            className="target-lang-select"
            value={targetLang}
            onChange={(e) => {
              if (e.target.value === '__add_custom__') {
                setShowCustomModal(true);
              } else {
                setTargetLang(e.target.value);
              }
            }}
          >
            <optgroup label="Core Languages">
              {allTargetLanguages
                .filter((l) => l.category === 'core')
                .map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="More Indian Languages">
              {allTargetLanguages
                .filter((l) => l.category === 'indic')
                .map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="International Languages">
              {allTargetLanguages
                .filter((l) => l.category === 'international')
                .map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
            </optgroup>
            {customLanguages.length > 0 && (
              <optgroup label="Custom Added Languages">
                {customLanguages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </optgroup>
            )}
            <option value="__add_custom__">➕ Add Custom Language...</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-action-sm"
          onClick={() => setShowCustomModal(true)}
          style={{ borderColor: 'var(--accent-teal)' }}
        >
          ➕ Expand Languages
        </button>

        {/* Voice Engine & Articulation Controls */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={voiceEngine}
            onChange={(e) => setVoiceEngine(e.target.value as 'neural' | 'browser')}
            style={{
              padding: '5px 10px',
              fontSize: '11.5px',
              background: 'var(--input-bg)',
              border: '1px solid var(--accent-teal)',
              borderRadius: '6px',
              color: 'var(--accent-teal)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Choose speech synthesis engine: HD Neural Voice produces studio-grade, crystal-clear native pronunciation"
          >
            <option value="neural">✨ HD Neural Voice (Crystal Clear)</option>
            <option value="browser">💻 Browser Device Voice</option>
          </select>

          <select
            value={speechSpeed}
            onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
            style={{
              padding: '5px 8px',
              fontSize: '11px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            title="Adjust speech playback speed for optimal clarity and comprehension"
          >
            <option value="0.85">🐢 0.85x (Clear & Measured)</option>
            <option value="0.92">🎯 0.92x (Optimal Clarity)</option>
            <option value="1.0">⚡ 1.0x (Standard Pace)</option>
            <option value="1.15">🚀 1.15x (Brisk Pace)</option>
          </select>

          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '10px',
              background: 'rgba(114, 217, 185, 0.12)',
              color: 'var(--accent-teal)',
              border: '1px solid rgba(114, 217, 185, 0.3)',
            }}
            title="Audio synthesis is active and configured for clear pronunciation"
          >
            🔊 {voiceEngine === 'neural' ? 'HD Neural Active' : currentTargetVoice ? currentTargetVoice.name.slice(0, 16) : 'Device Voice'}
          </span>
        </div>

        {(context.last_user_sentence || context.last_query) && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Context Sentence:</span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(114, 217, 185, 0.12)',
                color: 'var(--accent-teal)',
                border: '1px solid rgba(114, 217, 185, 0.3)',
                maxWidth: '220px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={context.last_user_sentence || context.last_query}
            >
              "{context.last_user_sentence || context.last_query}"
            </span>
          </div>
        )}
      </div>

      {/* Add Custom Language Modal / Dropdown */}
      {showCustomModal && (
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--accent-teal)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-teal)' }}>Add Any Indian or International Language</h4>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => setShowCustomModal(false)}
            >
              ✕ Close
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Enter any language name and standard ISO 639-1 code (e.g., Turkish <code>tr</code>, Dutch <code>nl</code>, Assamese <code>as</code>).
            The translation and speech engine will automatically configure support!
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Language Name (e.g. Turkish)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                flex: 1,
                minWidth: '180px',
              }}
            />
            <input
              type="text"
              placeholder="ISO 639-1 Code (e.g. tr)"
              value={customCode}
              maxLength={5}
              onChange={(e) => setCustomCode(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                width: '120px',
              }}
            />
            <button
              type="button"
              className="primary-button"
              onClick={handleAddCustomLanguage}
              style={{ padding: '8px 16px' }}
            >
              Add Language
            </button>
          </div>
        </div>
      )}

      {/* Voice Assistant Interactive Hub */}
      <section className="form-panel" style={{ textAlign: 'center', padding: '28px 20px', position: 'relative' }}>
        {/* Animated Voice Orb */}
        <div
          style={{
            width: '94px',
            height: '94px',
            borderRadius: '50%',
            margin: '0 auto 16px',
            background: listening
              ? 'radial-gradient(circle, #ff4d4d 0%, #7a1e1e 100%)'
              : speaking
              ? 'radial-gradient(circle, #72d9b9 0%, #1c5246 100%)'
              : busy
              ? 'radial-gradient(circle, #f59e0b 0%, #54370a 100%)'
              : 'radial-gradient(circle, #2d4560 0%, #101720 100%)',
            boxShadow: listening
              ? '0 0 35px #ff4d4d'
              : speaking
              ? '0 0 35px #72d9b9'
              : busy
              ? '0 0 35px #f59e0b'
              : '0 0 15px rgba(114, 217, 185, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '34px',
            cursor: 'pointer',
            transition: 'all 0.35s ease',
          }}
          className={listening ? 'pulse-mic' : ''}
          onClick={toggleListening}
          title={listening ? 'Click to stop listening' : 'Click to speak'}
        >
          {listening ? '🔴' : speaking ? '🔊' : busy ? '⏳' : '🎙️'}
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: '20px' }}>
          {listening
            ? 'Listening to speech…'
            : speaking
            ? `Speaking aloud in ${currentTargetLangObj.name}…`
            : busy
            ? 'Analyzing linguistic structures & translating…'
            : 'Tap the Mic or Speak your Question'}
        </h3>
        <p style={{ color: '#8291a3', fontSize: '13px', margin: '0 0 16px' }}>
          {statusMessage ||
            (hasSpeechRecog
              ? 'Click the microphone orb or choose a voice prompt below'
              : 'Type your query in the box below or click any pre-set prompt')}
        </p>

        {/* Voice Controls Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <select
            value={selectedMicLang}
            onChange={(e) => setSelectedMicLang(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
            }}
          >
            {MIC_INPUT_LANGS.map((vl) => (
              <option key={vl.code} value={vl.code}>
                Mic Input: {vl.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={listening ? 'primary-button' : 'secondary-button'}
            style={{
              padding: '7px 16px',
              background: listening ? '#7a1e1e' : undefined,
              borderColor: listening ? '#ff6b6b' : undefined,
              color: listening ? '#ffb3b3' : undefined,
              opacity: hasSpeechRecog ? 1 : 0.6,
            }}
            onClick={toggleListening}
          >
            {listening ? '⏹ Stop Listening' : '🎙️ Start Voice Input'}
          </button>

          {speaking && (
            <button
              type="button"
              className="secondary-button"
              style={{ padding: '7px 14px', color: '#ff9b9b', borderColor: '#542d2d' }}
              onClick={stopSpeaking}
            >
              ⏹ Stop Audio
            </button>
          )}

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginLeft: '4px',
            }}
            title="When checked, voice queries submit immediately after speech pause. When unchecked, you can review and correct the transcript first."
          >
            <input
              type="checkbox"
              checked={autoSubmitVoice}
              onChange={(e) => setAutoSubmitVoice(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-Submit on Pause
          </label>

          <button
            type="button"
            className="btn-action-sm"
            onClick={() => setShowMicGuide((prev) => !prev)}
            style={{ color: 'var(--accent-teal)', borderColor: 'rgba(114, 217, 185, 0.4)' }}
            title="Diagnose transcription accuracy and mic language modes"
          >
            {showMicGuide ? '✕ Close Guide' : 'ℹ️ Speech Accuracy Guide'}
          </button>
        </div>

        {/* Speech Recognition & Script Accuracy Diagnostic Guide */}
        {showMicGuide && (
          <div
            style={{
              maxWidth: '740px',
              margin: '0 auto 16px',
              padding: '14px 18px',
              background: 'var(--panel-bg)',
              border: '1px solid var(--accent-teal)',
              borderRadius: '8px',
              textAlign: 'left',
              fontSize: '12px',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
            }}
          >
            <h5 style={{ margin: '0 0 6px', color: 'var(--accent-teal)', fontSize: '13px' }}>
              🎙️ Speech Recognition Diagnostics: How to Ensure 100% Transcription Accuracy
            </h5>
            <ul style={{ margin: '0 0 8px', paddingLeft: '18px' }}>
              <li>
                <strong>Native Script Speech (e.g., Telugu, Hindi, Odia, Urdu, Tamil, Kannada):</strong> Select the native language in the <em>Mic Input</em> dropdown. The speech engine will directly transcribe into the abugida or Perso-Arabic script.
              </li>
              <li>
                <strong>Romanized Indic / Code-Mixed Speech (Hinglish/Tenglish/Tanglish):</strong> When speaking mixed phrases like <em>"Ee movie chala bagundi"</em> or <em>"Main kal aunga"</em>, select <strong>English / Romanized Indic (en-IN)</strong>. Selecting a native script for Latin speech causes acoustic mismatches and misrecognized words.
              </li>
              <li>
                <strong>Review & Correct Before Submitting:</strong> Leave <em>Auto-Submit on Pause</em> unchecked. When you stop speaking, the captured transcript appears below so you can review or adjust any homophones or names before requesting translation!
              </li>
            </ul>
          </div>
        )}

        {/* Transcript Review & Confirmation Banner */}
        {isReviewingTranscript && (
          <div
            style={{
              maxWidth: '740px',
              margin: '0 auto 12px',
              padding: '10px 14px',
              background: 'rgba(114, 217, 185, 0.1)',
              border: '1px solid var(--accent-teal)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: '18px' }}>🎙️</span>
              <span>
                <strong>Voice Transcript Captured:</strong> Review or edit the text below, then confirm translation.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="primary-button"
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={() => {
                  const micBase = (selectedMicLang === 'en-IN' || selectedMicLang === 'en-US') ? undefined : selectedMicLang.split('-')[0];
                  void handleSendQuery(undefined, micBase);
                }}
              >
                ✓ Translate & Speak →
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                onClick={() => {
                  setIsReviewingTranscript(false);
                  toggleListening();
                }}
              >
                🔄 Try Again
              </button>
              <button
                type="button"
                className="btn-action-sm"
                onClick={() => {
                  setIsReviewingTranscript(false);
                  setQuery('');
                }}
              >
                ✕ Clear
              </button>
            </div>
          </div>
        )}

        {/* Processing Progress Badge */}
        {busy && (
          <div
            style={{
              maxWidth: '740px',
              margin: '0 auto 12px',
              padding: '8px 14px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '12.5px',
              color: 'var(--accent-amber)',
            }}
          >
            <span className="spinner-inline" />
            <span>
              <strong>Processing:</strong> {processingStage || 'Translating into selected target language...'}
            </span>
          </div>
        )}

        {/* Text Input Row */}
        <div style={{ display: 'flex', gap: '8px', maxWidth: '740px', margin: '0 auto' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSendQuery();
            }}
            placeholder="Type or speak in Telugu, Hindi, Tamil, Kannada, Odia, Urdu, Romanized text, or 'translate that'…"
            style={{
              flex: 1,
              padding: '12px 14px',
              background: 'var(--input-bg)',
              border: isReviewingTranscript ? '1.5px solid var(--accent-teal)' : '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
          <button
            className="primary-button"
            style={{ padding: '12px 22px', whiteSpace: 'nowrap' }}
            disabled={busy || !query.trim()}
            onClick={() => void handleSendQuery()}
          >
            {busy ? 'Processing…' : 'Translate →'}
          </button>
        </div>

        {/* Conversational Context Status & Guidance (No bundled sample queries) */}
        <div
          style={{
            marginTop: '20px',
            padding: '14px 18px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 800, letterSpacing: '0.08em' }}>
              CONVERSATIONAL MEMORY & CONTEXT COMMANDS
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--accent-teal)' }}>
              🎯 Target: <b>{currentTargetLangObj.name}</b>
            </span>
          </div>
          {context.last_user_sentence ? (
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                <strong>Active Prior User Sentence:</strong>{' '}
                <span style={{ color: 'var(--accent-teal)', fontStyle: 'italic' }}>
                  "{context.last_user_sentence}"
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                You can say or type follow-up commands like <code>Translate that</code>, <code>Translate that to {currentTargetLangObj.name}</code>, or <code>Translate to Hindi</code> to translate this exact prior sentence without re-entering it.
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              💡 Speak or type any sentence in the input box above. Once submitted, conversational commands such as <em>"Translate that"</em>, <em>"Translate that to Tamil"</em>, or <em>"Translate to Telugu"</em> will dynamically translate your last submitted sentence into any chosen language.
            </p>
          )}
        </div>
      </section>

      {error && (
        <div className="error" style={{ margin: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button type="button" className="btn-action-sm" onClick={() => setError('')}>
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* Response Display Panel */}
      {response && (
        <section className="form-panel" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="eyebrow">
                ASSISTANT RESPONSE · {response.intent_type.toUpperCase()} · TARGET: {response.target_language?.toUpperCase() || currentTargetLangObj.name}
              </span>
              <h3 style={{ margin: '4px 0 0', color: 'var(--accent-teal)' }}>Interactive Spoken & Linguistic Analysis</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={() => speakText(response.speech_text, response.speech_lang)}
              >
                🔊 Replay Voice ({response.target_language || currentTargetLangObj.name})
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => copyToClipboard(response.reply_text, 'current-reply')}
              >
                {copiedId === 'current-reply' ? '✓ Copied!' : '📋 Copy Reply'}
              </button>
            </div>
          </div>

          {/* Interactive Source Language Confirmation Card */}
          {(response.is_uncertain || response.needs_confirmation || response.intent_type === 'language_confirmation_needed') && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '16px',
                margin: '14px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>❓</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>
                  Source Language Confirmation Needed
                </span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                We detected that <strong>"{response.user_sentence || response.query}"</strong> could be Romanized Indic, code-mixed, or an ambiguous dialect. Please click your intended source language to confirm and generate an accurate translation into <strong>{response.target_language || currentTargetLangObj.name}</strong>:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(response.suggested_languages || ['Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Odia', 'Korean', 'English']).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className="primary-button"
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      background: 'rgba(245, 158, 11, 0.25)',
                      borderColor: '#f59e0b',
                      color: '#ffd166',
                    }}
                    onClick={() => void handleSendQuery(response.user_sentence || response.query, lang)}
                  >
                    ✓ {lang}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User Query Echo & Context Reference */}
          <div style={{ margin: '14px 0', padding: '12px 14px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Input Query / Original Transcript ({response.source_language || response.analysis?.language.language || 'Source'}):
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {response.context_reference && (
                  <span style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 600 }}>
                    Context Reference: "{response.context_reference}"
                  </span>
                )}
                <button
                  type="button"
                  className="btn-action-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => speakText(response.query, response.source_speech_lang || 'en-IN')}
                  title="Speak the original captured transcript in its source language"
                >
                  🔊 Speak Original
                </button>
              </div>
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>
              "{response.query}"
            </div>
          </div>

          {/* Spoken Speech Text Box in Target Language */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(16, 26, 38, 0.8)',
              border: '1px solid rgba(114, 217, 185, 0.3)',
              borderRadius: '8px',
              fontSize: '15px',
              lineHeight: 1.7,
              color: 'var(--text-primary)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 700, letterSpacing: '0.08em' }}>
                SPOKEN VOICE SYNTHESIS ({response.target_language?.toUpperCase() || currentTargetLangObj.name} · {response.speech_lang}):
              </span>
              {speaking && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="voice-wave-bar" style={{ height: '14px', animationDelay: '0.1s' }}></span>
                  <span className="voice-wave-bar" style={{ height: '18px', animationDelay: '0.3s' }}></span>
                  <span className="voice-wave-bar" style={{ height: '12px', animationDelay: '0.2s' }}></span>
                </span>
              )}
            </div>
            {response.speech_text}
          </div>

          {/* Target Language Semantic Translation Card (Prominent & Clear) */}
          {response.translation_data && (
            <div
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  📖 SEMANTIC TRANSLATION · {response.translation_data.target_language.toUpperCase()}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      background:
                        response.translation_data.status === 'success' || response.translation_data.status === 'same_language'
                          ? 'rgba(114, 217, 185, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                      color:
                        response.translation_data.status === 'success' || response.translation_data.status === 'same_language'
                          ? '#72d9b9'
                          : '#f59e0b',
                      border:
                        response.translation_data.status === 'success' || response.translation_data.status === 'same_language'
                          ? '1px solid #2d6a4f'
                          : '1px solid #7d4f27',
                    }}
                  >
                    {response.translation_data.status.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    className="btn-action-sm"
                    onClick={() =>
                      response.translation_data?.translated_meaning &&
                      copyToClipboard(response.translation_data.translated_meaning, 'target-meaning')
                    }
                  >
                    {copiedId === 'target-meaning' ? '✓ Copied' : '📋 Copy'}
                  </button>
                  <button
                    type="button"
                    className="btn-action-sm"
                    onClick={() =>
                      response.translation_data?.translated_meaning &&
                      speakText(response.translation_data.translated_meaning, response.speech_lang)
                    }
                  >
                    🔊 Listen
                  </button>
                </div>
              </div>

              {response.translation_data.status === 'success' || response.translation_data.status === 'same_language' ? (
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {response.translation_data.translated_meaning}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#f59e0b', fontStyle: 'italic', lineHeight: 1.5 }}>
                  ⚠️ Translation unavailable for this language pair: {response.translation_data.error_detail || 'No translation returned.'}
                </div>
              )}

              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Translation Method: {response.translation_data.translation_method}
              </div>
            </div>
          )}

          {/* Explainable NLP Results Grid */}
          {response.analysis && (
            <div style={{ marginBottom: '18px' }}>
              <div className="eyebrow" style={{ marginBottom: '8px' }}>
                EXPLAINABLE NLP PIPELINE RESULTS
              </div>
              <div className="result-grid">
                {/* 1. Language Detection Card */}
                <div className="result-card">
                  <span className="card-label">LANGUAGE IDENTIFICATION</span>
                  <h3>{response.analysis.language.language}</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', margin: '4px 0' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Script: {response.analysis.script.primary} · {response.analysis.language.form}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: response.analysis.language.confidence_is_genuine ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                    Confidence:{' '}
                    {response.analysis.language.confidence !== null && response.analysis.language.confidence_is_genuine
                      ? `${Math.round(response.analysis.language.confidence * 100)}% (Calibrated)`
                      : 'Uncalibrated baseline'}
                  </div>

                  {/* Why this language was detected */}
                  {response.analysis.language.explanation && (
                    <div className="explain-box">
                      <div className="explain-title">💡 Why Detected:</div>
                      <div>{response.analysis.language.explanation}</div>
                      {response.analysis.language.detected_cues && response.analysis.language.detected_cues.length > 0 && (
                        <div className="cue-pill-container">
                          {response.analysis.language.detected_cues.map((c, i) => (
                            <span key={i} className="cue-pill">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Sentiment Analysis Card */}
                <div className="result-card">
                  <span className="card-label">SENTIMENT CLASSIFICATION</span>
                  <h3
                    style={{
                      color:
                        response.analysis.sentiment.label === 'Positive'
                          ? '#72d9b9'
                          : response.analysis.sentiment.label === 'Negative'
                          ? '#ff758f'
                          : '#cbd5e1',
                    }}
                  >
                    {response.analysis.sentiment.label}
                  </h3>
                  <div style={{ fontSize: '11px', color: response.analysis.sentiment.confidence_is_genuine ? 'var(--accent-teal)' : 'var(--text-muted)', margin: '4px 0' }}>
                    Confidence:{' '}
                    {response.analysis.sentiment.confidence !== null && response.analysis.sentiment.confidence_is_genuine
                      ? `${Math.round(response.analysis.sentiment.confidence * 100)}% (Genuine cue evidence)`
                      : 'Omitted (Neutral baseline / no cues)'}
                  </div>

                  {/* Why this sentiment was detected */}
                  {response.analysis.sentiment.explanation && (
                    <div className="explain-box">
                      <div className="explain-title">💡 Why Detected:</div>
                      <div>{response.analysis.sentiment.explanation}</div>
                      <div className="cue-pill-container">
                        {response.analysis.sentiment.positive_cues?.map((c, i) => (
                          <span key={`p-${i}`} className="cue-pill positive">
                            +{c}
                          </span>
                        ))}
                        {response.analysis.sentiment.negative_cues?.map((c, i) => (
                          <span key={`n-${i}`} className="cue-pill negative">
                            -{c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Intent Detection Card */}
                <div className="result-card">
                  <span className="card-label">INTENT CATEGORY</span>
                  <h3 style={{ color: '#e7bf75' }}>{response.analysis.intent.label}</h3>
                  <div style={{ fontSize: '11px', color: response.analysis.intent.confidence_is_genuine ? 'var(--accent-teal)' : 'var(--text-muted)', margin: '4px 0' }}>
                    Confidence:{' '}
                    {response.analysis.intent.confidence !== null && response.analysis.intent.confidence_is_genuine
                      ? `${Math.round(response.analysis.intent.confidence * 100)}% (Keyword matches)`
                      : 'Omitted (General query baseline)'}
                  </div>

                  {/* Why this intent was detected */}
                  {response.analysis.intent.explanation && (
                    <div className="explain-box">
                      <div className="explain-title">💡 Why Detected:</div>
                      <div>{response.analysis.intent.explanation}</div>
                      {response.analysis.intent.matched_cues && response.analysis.intent.matched_cues.length > 0 && (
                        <div className="cue-pill-container">
                          {response.analysis.intent.matched_cues.map((c, i) => (
                            <span key={i} className="cue-pill domain">
                              #{c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Code-Mixing (CMI) Card */}
                <div className="result-card">
                  <span className="card-label">CODE-MIXING INDEX (CMI)</span>
                  <h3 style={{ color: response.analysis.code_mixing.is_code_mixed ? '#ff758f' : '#72d9b9' }}>
                    {response.analysis.code_mixing.is_code_mixed ? 'Code-Mixed' : 'Monolingual'}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0' }}>
                    CMI: {response.analysis.code_mixing.cmi ?? 0}% · {response.analysis.code_mixing.switch_points ?? 0} switch points
                  </div>

                  {/* Why and how CMI was calculated */}
                  {response.analysis.code_mixing.explanation && (
                    <div className="explain-box">
                      <div className="explain-title">💡 Math & Breakdown:</div>
                      <div>{response.analysis.code_mixing.explanation}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Phonetic Transliteration Card (Strictly Isolated from Semantic Meaning) */}
          {response.translations?.transliteration?.native_script &&
            response.translations.transliteration.native_script.trim() !== '' &&
            response.translations.transliteration.native_script.trim() !== response.query.trim() && (
              <div
                style={{
                  background: 'rgba(14, 24, 36, 0.75)',
                  border: '1px solid rgba(36, 56, 78, 0.9)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#88a3c2', fontWeight: 700, letterSpacing: '0.05em' }}>
                    🔤 PHONETIC TRANSLITERATION (SCRIPT CONVERSION ONLY)
                  </span>
                  <span style={{ fontSize: '10px', color: '#72d9b9', fontStyle: 'italic' }}>
                    Strictly isolated from semantic meaning translation
                  </span>
                </div>
                <div style={{ fontSize: '15px', color: '#b9d5f3', fontWeight: 600 }}>
                  {response.translations.transliteration.native_script}
                </div>
                <div style={{ fontSize: '11px', color: '#68829f', marginTop: '4px' }}>
                  {response.translations.transliteration.note}
                </div>
              </div>
            )}

          {/* Multilingual Cross-Translation Matrix */}
          {response.translations && response.translations.translations && (
            <div>
              <div className="eyebrow" style={{ marginBottom: '8px' }}>
                CROSS-LINGUAL MEANING TRANSLATIONS (TELUGU, HINDI, TAMIL, KANNADA, ENGLISH + TARGET)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {Object.entries(response.translations.translations).map(([code, item]) => {
                  const meaning = item.translated_meaning || item.text;
                  const isSuccess = item.status === 'success' || item.status === 'same_language';
                  const voiceLocale = code === 'en' ? 'en-IN' : `${code}-IN`;

                  return (
                    <div
                      key={code}
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--accent-teal)', fontWeight: 700 }}>
                            {item.language} {item.is_source ? '(Source)' : ''}
                          </span>
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              background: isSuccess ? 'rgba(114, 217, 185, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isSuccess ? '#72d9b9' : '#f59e0b',
                              border: isSuccess ? '1px solid #2d6a4f' : '1px solid #7d4f27',
                            }}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </div>

                        {isSuccess && meaning ? (
                          <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                            {meaning}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#f59e0b', fontStyle: 'italic', lineHeight: 1.4 }}>
                            Translation unavailable ({item.error_detail || 'No result'})
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {item.translation_method || 'Neural MT'}
                        </span>
                        {isSuccess && meaning && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn-action-sm"
                              onClick={() => copyToClipboard(meaning, `trans-${code}`)}
                              title="Copy translation"
                            >
                              {copiedId === `trans-${code}` ? '✓' : '📋'}
                            </button>
                            <button
                              type="button"
                              className="btn-action-sm"
                              onClick={() => speakText(meaning, voiceLocale)}
                              title={`Listen in ${item.language}`}
                            >
                              🔊
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Translation & Conversation History Section */}
      <section style={{ marginTop: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <div className="eyebrow">PERSISTENT SESSION LOG</div>
            <h3 style={{ margin: '2px 0 0' }}>Conversation & Translation History ({history.length})</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search history…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                width: '180px',
              }}
            />
            {history.length > 0 && (
              <button
                type="button"
                className="btn-action-sm danger"
                onClick={clearAllHistory}
                title="Clear all saved history"
              >
                🧹 Clear All
              </button>
            )}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              background: 'var(--panel-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            {history.length === 0
              ? 'No conversations recorded yet. Speak into your microphone or type a query above to start building history!'
              : 'No history items matched your search filter.'}
          </div>
        ) : (
          <div>
            {filteredHistory.map((item) => (
              <div key={item.id} className="history-card">
                <div className="history-card-header">
                  <div className="history-meta-badges">
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      🕒 {item.timestamp}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        background:
                          item.status === 'success'
                            ? 'rgba(114, 217, 185, 0.15)'
                            : item.status === 'same_language'
                            ? 'rgba(96, 165, 250, 0.15)'
                            : item.status === 'uncertain'
                            ? 'rgba(168, 85, 247, 0.15)'
                            : item.status === 'unavailable'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color:
                          item.status === 'success'
                            ? '#72d9b9'
                            : item.status === 'same_language'
                            ? '#93c5fd'
                            : item.status === 'uncertain'
                            ? '#d8b4fe'
                            : item.status === 'unavailable'
                            ? '#f59e0b'
                            : '#f87171',
                        border:
                          item.status === 'success'
                            ? '1px solid rgba(114, 217, 185, 0.4)'
                            : item.status === 'same_language'
                            ? '1px solid rgba(96, 165, 250, 0.4)'
                            : item.status === 'uncertain'
                            ? '1px solid rgba(168, 85, 247, 0.4)'
                            : item.status === 'unavailable'
                            ? '1px solid rgba(245, 158, 11, 0.4)'
                            : '1px solid rgba(239, 68, 68, 0.4)',
                      }}
                    >
                      {(item.status || 'SUCCESS').replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="cue-pill">
                      Source: {item.sourceLanguage || item.detectedLanguage}
                    </span>
                    <span className="cue-pill" style={{ borderColor: 'var(--accent-teal)', color: 'var(--accent-teal)' }}>
                      Target: {item.targetLanguage}
                    </span>
                    {item.sentiment && (
                      <span
                        className={`cue-pill ${item.sentiment.toLowerCase() === 'positive' ? 'positive' : item.sentiment.toLowerCase() === 'negative' ? 'negative' : ''}`}
                      >
                        {item.sentiment}
                      </span>
                    )}
                    {item.intent && (
                      <span className="cue-pill domain">
                        {item.intent}
                      </span>
                    )}
                    {item.cmi !== undefined && item.cmi > 0 && (
                      <span className="cue-pill negative">
                        CMI: {item.cmi}%
                      </span>
                    )}
                  </div>

                  <div className="history-actions">
                    {item.status === 'uncertain' && (
                      <button
                        type="button"
                        className="btn-action-sm"
                        style={{ color: '#ffd166', borderColor: '#f59e0b' }}
                        onClick={() => {
                          setQuery(item.originalText);
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        title="Confirm language & translate"
                      >
                        ❓ Confirm Language
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => copyToClipboard(item.translatedMeaning, item.id)}
                      title="Copy translation"
                    >
                      {copiedId === item.id ? '✓ Copied' : '📋 Copy'}
                    </button>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => speakText(item.originalText, item.sourceSpeechLang || 'en-IN')}
                      title="Speak original transcript in source language"
                    >
                      🔊 Original
                    </button>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => speakText(item.translatedMeaning || item.speechText, item.speechLang)}
                      title="Speak translated text in target language"
                      disabled={item.status === 'unavailable' || item.status === 'uncertain' || item.status === 'error'}
                    >
                      🔊 Translation
                    </button>
                    <button
                      type="button"
                      className="btn-action-sm danger"
                      onClick={() => deleteHistoryItem(item.id)}
                      title="Delete from history"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {/* Original Input */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Original ({item.sourceLanguage || item.detectedLanguage}):
                    </div>
                    <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      "{item.originalText}"
                    </div>
                  </div>

                  {/* Translated Meaning */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-teal)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 700 }}>
                      Translation ({item.targetLanguage}):
                    </div>
                    <div
                      style={{
                        fontSize: '13.5px',
                        color:
                          item.status === 'success' || item.status === 'same_language'
                            ? 'var(--text-primary)'
                            : item.status === 'uncertain'
                            ? '#d8b4fe'
                            : '#f59e0b',
                        fontWeight: item.status === 'success' || item.status === 'same_language' ? 600 : 400,
                        fontStyle: item.status === 'success' || item.status === 'same_language' ? 'normal' : 'italic',
                      }}
                    >
                      {item.translatedMeaning}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
