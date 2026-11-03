import { useState, useEffect } from 'react';
import type { Analysis, TranslationLangItem } from '../types';
import { translateText } from '../services/api';

interface Props {
  data: Analysis;
}

interface LangOption {
  code: string;
  label: string;
  name: string;
  voiceLang: string;
}

const CORE_LANG_OPTIONS: LangOption[] = [
  { code: 'te', label: 'Telugu (తెలుగు)', name: 'Telugu', voiceLang: 'te-IN' },
  { code: 'hi', label: 'Hindi (हिन्दी)', name: 'Hindi', voiceLang: 'hi-IN' },
  { code: 'ta', label: 'Tamil (தமிழ்)', name: 'Tamil', voiceLang: 'ta-IN' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', name: 'Kannada', voiceLang: 'kn-IN' },
  { code: 'or', label: 'Odia (ଓଡ଼ିଆ)', name: 'Odia', voiceLang: 'or-IN' },
  { code: 'ur', label: 'Urdu (اردو)', name: 'Urdu', voiceLang: 'ur-PK' },
  { code: 'en', label: 'English', name: 'English', voiceLang: 'en-IN' },
  { code: 'ml', label: 'Malayalam (മലയാളം)', name: 'Malayalam', voiceLang: 'ml-IN' },
  { code: 'mr', label: 'Marathi (मराठी)', name: 'Marathi', voiceLang: 'mr-IN' },
  { code: 'bn', label: 'Bengali (বাংলা)', name: 'Bengali', voiceLang: 'bn-IN' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)', name: 'Gujarati', voiceLang: 'gu-IN' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)', name: 'Punjabi', voiceLang: 'pa-IN' },
];

export default function TranslationCard({ data }: Props) {
  const trans = data.translation;
  const multi = trans?.multilingual ?? {};

  // Default to English if source is Indic, or Telugu if source is English
  const sourceLang = data.language.base_language?.toLowerCase() ?? 'english';
  const defaultTarget = sourceLang === 'english' ? 'te' : 'en';

  const [activeLang, setActiveLang] = useState<string>(defaultTarget);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ttsNote, setTtsNote] = useState<string>('');
  const [dynamicTranslation, setDynamicTranslation] = useState<{
    meaning: string | null;
    status: string;
    method: string;
    error: string | null;
  } | null>(null);
  const [fetchingDynamic, setFetchingDynamic] = useState(false);

  // When activeLang changes, if not in multi, fetch it dynamically
  useEffect(() => {
    const item = multi[activeLang];
    const isDirect = trans?.target_lang_code === activeLang;
    const existingMeaning = item?.translated_meaning ?? (isDirect ? trans?.translated_meaning : null);

    if (!existingMeaning && data.cleaned_text.trim()) {
      setFetchingDynamic(true);
      translateText(data.cleaned_text, activeLang)
        .then((res) => {
          setDynamicTranslation({
            meaning: res.translated_meaning,
            status: res.status,
            method: res.translation_method,
            error: res.error_detail ?? null,
          });
        })
        .catch((err) => {
          setDynamicTranslation({
            meaning: null,
            status: 'unavailable',
            method: 'Failed',
            error: err instanceof Error ? err.message : 'Translation request error',
          });
        })
        .finally(() => setFetchingDynamic(false));
    } else {
      setDynamicTranslation(null);
    }
  }, [activeLang, data.cleaned_text]);

  const activeOption = CORE_LANG_OPTIONS.find((l) => l.code === activeLang) ?? {
    code: activeLang,
    label: activeLang.toUpperCase(),
    name: activeLang.toUpperCase(),
    voiceLang: 'en-IN',
  };

  const activeItem: TranslationLangItem | undefined = multi[activeLang];
  const isDirectTarget = trans?.target_lang_code === activeLang;

  const activeStatus =
    dynamicTranslation?.status ??
    activeItem?.status ??
    (isDirectTarget ? trans?.status : 'success') ??
    'success';

  const activeMeaning =
    dynamicTranslation?.meaning ??
    activeItem?.translated_meaning ??
    (isDirectTarget ? trans?.translated_meaning : null) ??
    activeItem?.text ??
    trans?.translated_text;

  const activeMethod =
    dynamicTranslation?.method ??
    activeItem?.translation_method ??
    (isDirectTarget ? trans?.translation_method : null) ??
    trans?.translation_method ??
    'Neural Machine Translation';

  const activeError =
    dynamicTranslation?.error ??
    activeItem?.error_detail ??
    (isDirectTarget ? trans?.error_detail : null);

  // Transliteration is strictly isolated from semantic translation
  const translit = trans?.transliteration;
  const hasTranslit = Boolean(
    translit?.native_script &&
    translit.native_script.trim() !== '' &&
    translit.native_script.trim() !== data.cleaned_text.trim()
  );

  function handleSpeak(textToSpeak: string | null | undefined, langCode: string) {
    if (!('speechSynthesis' in window)) {
      setTtsNote('Speech synthesis (TTS) is not supported in this browser.');
      setTimeout(() => setTtsNote(''), 4000);
      return;
    }

    if (!textToSpeak) return;

    window.speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const langObj = CORE_LANG_OPTIONS.find((l) => l.code === langCode);
    utterance.lang = langObj?.voiceLang ?? 'en-IN';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(langCode));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function handleCopy() {
    if (!activeMeaning) return;
    void navigator.clipboard.writeText(activeMeaning);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="result-card" style={{ gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span className="card-label">CROSS-LINGUAL MEANING TRANSLATION</span>
          <h3 style={{ margin: '2px 0 0', fontSize: '18px', color: 'var(--text-primary)' }}>
            Semantic Translation Engine ({data.language.language} → {activeOption.name})
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {activeStatus === 'success' && activeMeaning && (
            <button
              type="button"
              className="secondary-button"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={() => handleSpeak(activeMeaning, activeLang)}
              title="Speak translation using Web Speech API"
            >
              {speaking ? '⏹ Stop' : '🔊 Listen'}
            </button>
          )}
          {activeMeaning && (
            <button
              type="button"
              className="secondary-button"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={handleCopy}
              title="Copy translation text"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          )}
        </div>
      </div>

      {ttsNote && (
        <div style={{ fontSize: '11px', color: 'var(--accent-amber)', marginTop: '6px' }}>
          ℹ️ {ttsNote}
        </div>
      )}

      {/* Target Language Switcher Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
        {CORE_LANG_OPTIONS.map((opt) => {
          const item = multi[opt.code];
          const isSelected = activeLang === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              style={{
                padding: '7px 13px',
                borderRadius: '8px',
                border: isSelected ? '1px solid var(--accent-teal)' : '1px solid var(--border-color)',
                background: isSelected ? 'var(--accent-teal-subtle)' : 'var(--panel-bg)',
                color: isSelected ? 'var(--accent-teal)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => {
                if (speaking && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                setSpeaking(false);
                setActiveLang(opt.code);
              }}
            >
              {opt.label}
              {item?.is_source && (
                <span style={{ fontSize: '9px', marginLeft: '5px', opacity: 0.7 }}>(Source)</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Semantic Translation Content Box */}
      <div
        style={{
          marginTop: '12px',
          background: 'var(--bg-card, #0c121b)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
            Contextual Meaning in {activeOption.name}
          </span>

          {/* Status Badge */}
          {fetchingDynamic ? (
            <span style={{ fontSize: '10px', color: 'var(--accent-teal)', fontWeight: 600 }}>
              Translating…
            </span>
          ) : activeStatus === 'success' ? (
            <span style={{ fontSize: '10.5px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 9px', borderRadius: '999px', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              ✓ Full-Sentence Meaning Preserved
            </span>
          ) : activeStatus === 'same_language' ? (
            <span style={{ fontSize: '10.5px', background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', padding: '3px 9px', borderRadius: '999px', fontWeight: 600, border: '1px solid rgba(96, 165, 250, 0.3)' }}>
              ℹ️ Source & Target Identical
            </span>
          ) : activeStatus === 'unavailable' ? (
            <span style={{ fontSize: '10.5px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '3px 9px', borderRadius: '999px', fontWeight: 600, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              ⚠️ Translation Unavailable
            </span>
          ) : (
            <span style={{ fontSize: '10.5px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '3px 9px', borderRadius: '999px', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              ✕ Error
            </span>
          )}
        </div>

        {fetchingDynamic ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', padding: '8px 0' }}>
            Fetching neural translation for {activeOption.name}…
          </div>
        ) : activeStatus === 'success' || activeStatus === 'same_language' ? (
          <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {activeMeaning || 'No translation returned.'}
          </div>
        ) : (
          <div style={{ padding: '12px 14px', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--accent-amber)', fontWeight: 600 }}>
              Semantic translation to {activeOption.name} is currently unavailable.
            </div>
            {activeError && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Reason: {activeError}
              </div>
            )}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
              In accordance with strict translation separation, transliterations or untranslated placeholders are never displayed as a successful translation.
            </div>
          </div>
        )}
      </div>

      {/* Strictly Isolated Phonetic Transliteration Block */}
      {hasTranslit && (
        <div
          style={{
            marginTop: '12px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 700, letterSpacing: '0.05em' }}>
              PHONETIC SCRIPT TRANSLITERATION (SCRIPT CONVERSION ONLY)
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Strictly distinct from semantic translation
            </span>
          </div>
          <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
            {translit?.native_script}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Note: This reflects phonetic script conversion into native orthography, not meaning translation.
          </div>
        </div>
      )}

      {/* Engine & Source Metadata Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '12px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '8px',
        }}
      >
        <span>
          Detected Source: <strong style={{ color: 'var(--text-primary)' }}>{data.language.language}</strong> ({data.language.form ?? 'Native'})
        </span>
        <span>
          Translation Method: <span style={{ color: 'var(--accent-teal)' }}>{activeMethod}</span>
        </span>
      </div>
    </article>
  );
}
