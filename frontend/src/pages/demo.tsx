import { useState } from 'react';
import { translateText } from '../services/api';
import type { TranslationResult } from '../types';

interface ExampleItem {
  id: string;
  category: string;
  sourceLangName: string;
  sourceLangCode: string;
  sourceSpeechLocale: string;
  targetLangName: string;
  targetLangCode: string;
  targetSpeechLocale: string;
  inputText: string;
  translatedText: string;
}

const EXAMPLES: ExampleItem[] = [
  {
    id: 'ex-1',
    category: 'Telugu (Native Script)',
    sourceLangName: 'Telugu (తెలుగు)',
    sourceLangCode: 'te',
    sourceSpeechLocale: 'te-IN',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'ఈ సినిమా చాలా బాగుంది, నటన అద్భుతం మరియు పాటలు చాలా శ్రావ్యంగా ఉన్నాయి!',
    translatedText: 'This movie is very good, acting is wonderful and the songs are melodious!',
  },
  {
    id: 'ex-2',
    category: 'Telugu (Native Script)',
    sourceLangName: 'Telugu (తెలుగు)',
    sourceLangCode: 'te',
    sourceSpeechLocale: 'te-IN',
    targetLangName: 'Hindi (हिन्दी)',
    targetLangCode: 'hi',
    targetSpeechLocale: 'hi-IN',
    inputText: 'ఈ సినిమా చాలా బాగుంది, నటన అద్భుతం మరియు పాటలు చాలా శ్రావ్యంగా ఉన్నాయి!',
    translatedText: 'यह फिल्म बहुत अच्छी है, अभिनय शानदार है और गाने बहुत मधुर हैं!',
  },
  {
    id: 'ex-3',
    category: 'Romanized Telugu (Tenglish)',
    sourceLangName: 'Telugu (Romanized / Tenglish)',
    sourceLangCode: 'te',
    sourceSpeechLocale: 'te-IN',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'Ee movie chala bagundi, hero acting super ga undi!',
    translatedText: 'This movie is very good, hero acting is super!',
  },
  {
    id: 'ex-4',
    category: 'Romanized Telugu (Tenglish)',
    sourceLangName: 'Telugu (Romanized / Tenglish)',
    sourceLangCode: 'te',
    sourceSpeechLocale: 'te-IN',
    targetLangName: 'Telugu (తెలుగు Script)',
    targetLangCode: 'te',
    targetSpeechLocale: 'te-IN',
    inputText: 'Ee movie chala bagundi, hero acting super ga undi!',
    translatedText: 'ఈ సినిమా చాలా బాగుంది, హీరో యాక్టింగ్ సూపర్ గా ఉంది!',
  },
  {
    id: 'ex-5',
    category: 'Hinglish (Code-Mixed)',
    sourceLangName: 'Hindi (Code-Mixed / Hinglish)',
    sourceLangCode: 'hi',
    sourceSpeechLocale: 'hi-IN',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'Yeh phone screen broken hai, customer care ne koi replacement response nahi diya.',
    translatedText: 'This phone screen is broken, customer care gave no replacement response.',
  },
  {
    id: 'ex-6',
    category: 'Hinglish (Code-Mixed)',
    sourceLangName: 'Hindi (Code-Mixed / Hinglish)',
    sourceLangCode: 'hi',
    sourceSpeechLocale: 'hi-IN',
    targetLangName: 'Telugu (తెలుగు)',
    targetLangCode: 'te',
    targetSpeechLocale: 'te-IN',
    inputText: 'Yeh phone screen broken hai, customer care ne koi replacement response nahi diya.',
    translatedText: 'ఈ ఫోన్ స్క్రీన్ విరిగిపోయింది, కస్టమర్ కేర్ ఎటువంటి రీప్లేస్‌మెంట్ ప్రతిస్పందన ఇవ్వలేదు.',
  },
  {
    id: 'ex-7',
    category: 'Tanglish (Romanized Tamil)',
    sourceLangName: 'Tamil (Romanized / Tanglish)',
    sourceLangCode: 'ta',
    sourceSpeechLocale: 'ta-IN',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'Intha padam romba nalla irukku, paathen romba pidichirukku.',
    translatedText: 'This movie is very good, I watched it and liked it very much.',
  },
  {
    id: 'ex-8',
    category: 'Tanglish (Romanized Tamil)',
    sourceLangName: 'Tamil (Romanized / Tanglish)',
    sourceLangCode: 'ta',
    sourceSpeechLocale: 'ta-IN',
    targetLangName: 'Hindi (हिन्दी)',
    targetLangCode: 'hi',
    targetSpeechLocale: 'hi-IN',
    inputText: 'Intha padam romba nalla irukku, paathen romba pidichirukku.',
    translatedText: 'यह फिल्म बहुत अच्छी है, मैंने इसे देखा और बहुत पसंद आया।',
  },
  {
    id: 'ex-9',
    category: 'Hindi (Native Script)',
    sourceLangName: 'Hindi (हिन्दी)',
    sourceLangCode: 'hi',
    sourceSpeechLocale: 'hi-IN',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'आज का मौसम बहुत सुहावना है और शाम को बारिश होने की संभावना है।',
    translatedText: 'Today\'s weather is very pleasant and there is a possibility of rain in the evening.',
  },
  {
    id: 'ex-10',
    category: 'Hindi (Native Script)',
    sourceLangName: 'Hindi (हिन्दी)',
    sourceLangCode: 'hi',
    sourceSpeechLocale: 'hi-IN',
    targetLangName: 'Tamil (தமிழ்)',
    targetLangCode: 'ta',
    targetSpeechLocale: 'ta-IN',
    inputText: 'आज का मौसम बहुत सुहावना है और शाम को बारिश होने की संभावना है।',
    translatedText: 'இன்றைய வானிலை மிகவும் இனிமையாக உள்ளது மற்றும் மாலையில் மழை பெய்ய வாய்ப்புள்ளது.',
  },
  {
    id: 'ex-11',
    category: 'Kannada (Native Script)',
    sourceLangName: 'Kannada (ಕನ್ನಡ)',
    sourceLangCode: 'kn',
    sourceSpeechLocale: 'kn-IN',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'ಈ ಪುಸ್ತಕ ತುಂಬಾ ಉಪಯುಕ್ತವಾಗಿದೆ ಮತ್ತು ಓದಲು ಸರಳವಾಗಿದೆ.',
    translatedText: 'This book is very useful and simple to read.',
  },
  {
    id: 'ex-12',
    category: 'Kannada (Native Script)',
    sourceLangName: 'Kannada (ಕನ್ನಡ)',
    sourceLangCode: 'kn',
    sourceSpeechLocale: 'kn-IN',
    targetLangName: 'Hindi (हिन्दी)',
    targetLangCode: 'hi',
    targetSpeechLocale: 'hi-IN',
    inputText: 'ಈ ಪುಸ್ತಕ ತುಂಬಾ ಉಪಯುಕ್ತವಾಗಿದೆ ಮತ್ತು ಓದಲು ಸರಳವಾಗಿದೆ.',
    translatedText: 'यह किताब बहुत उपयोगी है और पढ़ने में सरल है।',
  },
  {
    id: 'ex-13',
    category: 'Malayalam (Native Script)',
    sourceLangName: 'Malayalam (മലയാളം)',
    sourceLangCode: 'ml',
    sourceSpeechLocale: 'ml-IN',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'കേരളത്തിലെ പ്രകൃതി സൗന്ദര്യം അതിമനോഹരമാണ്.',
    translatedText: 'The natural beauty in Kerala is extremely magnificent.',
  },
  {
    id: 'ex-14',
    category: 'Odia (Native Script)',
    sourceLangName: 'Odia (ଓଡ଼ିଆ)',
    sourceLangCode: 'or',
    sourceSpeechLocale: 'or-IN',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'ଓଡ଼ିଶାର ସଂସ୍କୃତି ଏବଂ ମନ୍ଦିର କଳା ଅତ୍ୟନ୍ତ ପ୍ରାଚୀନ ଓ ସମୃଦ୍ଧ।',
    translatedText: 'The culture and temple art of Odisha are extremely ancient and rich.',
  },
  {
    id: 'ex-15',
    category: 'Urdu (Perso-Arabic)',
    sourceLangName: 'Urdu (اردو)',
    sourceLangCode: 'ur',
    sourceSpeechLocale: 'ur-PK',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: 'اردو زبان کی شاعری اور ادب بہت خوبصورت ہے۔',
    translatedText: 'The poetry and literature of the Urdu language is very beautiful.',
  },
  {
    id: 'ex-16',
    category: 'Korean (Hangul Script)',
    sourceLangName: 'Korean (한국어)',
    sourceLangCode: 'ko',
    sourceSpeechLocale: 'ko-KR',
    targetLangName: 'English',
    targetLangCode: 'en',
    targetSpeechLocale: 'en-IN',
    inputText: '안녕하세요, 반갑습니다. 오늘 하루도 좋은 하루 되세요!',
    translatedText: 'Hello, nice to meet you. Have a great day today!',
  },
  {
    id: 'ex-17',
    category: 'Korean (Hangul Script)',
    sourceLangName: 'Korean (한국어)',
    sourceLangCode: 'ko',
    sourceSpeechLocale: 'ko-KR',
    targetLangName: 'Hindi (हिन्दी)',
    targetLangCode: 'hi',
    targetSpeechLocale: 'hi-IN',
    inputText: '안녕하세요, 반갑습니다. 오늘 하루도 좋은 하루 되세요!',
    translatedText: 'नमस्ते, आपसे मिलकर खुशी हुई। आपका आज का दिन बहुत अच्छा रहे!',
  },
  {
    id: 'ex-18',
    category: 'English',
    sourceLangName: 'English',
    sourceLangCode: 'en',
    sourceSpeechLocale: 'en-IN',
    targetLangName: 'Telugu (తెలుగు)',
    targetLangCode: 'te',
    targetSpeechLocale: 'te-IN',
    inputText: 'Machine learning models require clean, representative evaluation datasets to avoid biased performance.',
    translatedText: 'పక్షపాత పనితీరును నివారించడానికి మెషిన్ లెర్నింగ్ మోడళ్లకు స్వచ్ఛమైన, ప్రాతినిధ్య మూల్యాంకన డేటాసెట్‌లు అవసరం.',
  },
  {
    id: 'ex-19',
    category: 'English',
    sourceLangName: 'English',
    sourceLangCode: 'en',
    sourceSpeechLocale: 'en-IN',
    targetLangName: 'Hindi (हिन्दी)',
    targetLangCode: 'hi',
    targetSpeechLocale: 'hi-IN',
    inputText: 'Machine learning models require clean, representative evaluation datasets to avoid biased performance.',
    translatedText: 'पक्षपातपूर्ण प्रदर्शन से बचने के लिए मशीन लर्निंग मॉडल को स्वच्छ, प्रतिनिधि मूल्यांकन डेटासेट की आवश्यकता होती है।',
  },
  {
    id: 'ex-20',
    category: 'English',
    sourceLangName: 'English',
    sourceLangCode: 'en',
    sourceSpeechLocale: 'en-IN',
    targetLangName: 'Korean (한국어)',
    targetLangCode: 'ko',
    targetSpeechLocale: 'ko-KR',
    inputText: 'Machine learning models require clean, representative evaluation datasets to avoid biased performance.',
    translatedText: '편향된 성능을 방지하려면 머신러닝 모델에 깨끗하고 대표성 있는 평가 데이터 세트가 필요합니다.',
  },
];

const CATEGORIES = [
  'ALL',
  'Telugu (Native Script)',
  'Romanized Telugu (Tenglish)',
  'Hinglish (Code-Mixed)',
  'Tanglish (Romanized Tamil)',
  'Hindi (Native Script)',
  'Kannada (Native Script)',
  'Malayalam (Native Script)',
  'Odia (Native Script)',
  'Urdu (Perso-Arabic)',
  'Korean (Hangul Script)',
  'English',
];

export default function ExampleDemo() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live tester state
  const [testText, setTestText] = useState(EXAMPLES[0].inputText);
  const [testTarget, setTestTarget] = useState('en');
  const [testResult, setTestResult] = useState<TranslationResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');

  const filteredExamples =
    selectedCategory === 'ALL'
      ? EXAMPLES
      : EXAMPLES.filter((ex) => ex.category === selectedCategory);

  function speak(text: string, locale: string) {
    if (!text.trim()) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const cleanLang = locale.split('-')[0].toLowerCase();
    const url = `/api/tts?text=${encodeURIComponent(text.trim())}&lang=${encodeURIComponent(cleanLang)}`;
    const audio = new Audio(url);
    audio.play().catch(() => {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = locale;
        window.speechSynthesis.speak(u);
      }
    });
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function runLiveTest() {
    if (!testText.trim()) return;
    setTesting(true);
    setTestError('');
    try {
      const res = await translateText(testText.trim(), testTarget);
      setTestResult(res);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Translation request failed');
    } finally {
      setTesting(false);
    }
  }

  function loadExampleIntoTester(ex: ExampleItem) {
    setTestText(ex.inputText);
    setTestTarget(ex.targetLangCode);
    setTestResult(null);
    setTestError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="intro" style={{ marginBottom: '20px' }}>
        <div>
          <div className="eyebrow">VERIFIED TRANSLATION SHOWCASE</div>
          <h2 style={{ margin: '4px 0 6px', fontSize: '24px', fontWeight: 800 }}>
            Example Demo
          </h2>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Curated example inputs and accurate translations across Indic abugida scripts, Romanized Indic, code-mixed text, and international languages.
          </p>
        </div>
        <span
          className="tag"
          style={{
            color: 'var(--accent-teal)',
            borderColor: 'rgba(114, 217, 185, 0.4)',
            fontSize: '11px',
            padding: '4px 10px',
          }}
        >
          🎯 VERIFIED EXAMPLES ONLY
        </span>
      </div>

      {/* Interactive Live Translation Tester */}
      <section
        className="form-panel"
        style={{
          marginBottom: '26px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              INTERACTIVE TRANSLATION TESTER
            </span>
            <h3 style={{ margin: '2px 0 0', fontSize: '17px' }}>Run Example or Custom Sentence</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target:</span>
            <select
              value={testTarget}
              onChange={(e) => setTestTarget(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
              }}
            >
              <option value="en">English (en)</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="kn">Kannada (ಕನ್ನಡ)</option>
              <option value="ml">Malayalam (മലയാളം)</option>
              <option value="or">Odia (ଓଡ଼ିଆ)</option>
              <option value="ur">Urdu (اردو)</option>
              <option value="ko">Korean (한국어)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
            </select>
            <button
              type="button"
              className="primary-button"
              style={{ padding: '8px 18px', fontSize: '13px', minHeight: '40px' }}
              onClick={runLiveTest}
              disabled={testing || !testText.trim()}
            >
              {testing ? 'Translating…' : 'Translate →'}
            </button>
          </div>
        </div>

        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            lineHeight: 1.6,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          placeholder="Enter sentence to test translation..."
        />

        {testError && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#fca5a5', fontSize: '13px' }}>
            ⚠️ {testError}
          </div>
        )}

        {testResult && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(16, 26, 38, 0.7)',
              border: '1px solid rgba(114, 217, 185, 0.3)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    background: testResult.status === 'success' || testResult.status === 'same_language' ? 'rgba(114, 217, 185, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: testResult.status === 'success' || testResult.status === 'same_language' ? 'var(--accent-teal)' : 'var(--accent-amber)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  STATUS: {testResult.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Source: <strong>{testResult.source_language || 'Detected'}</strong> → Target: <strong>{testResult.target_language}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testResult.translated_meaning && (
                  <>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => copyText(testResult.translated_meaning || '', 'live-result')}
                    >
                      {copiedId === 'live-result' ? '✓ Copied' : '📋 Copy'}
                    </button>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => speak(testResult.translated_meaning || '', testResult.target_lang_code)}
                    >
                      🔊 Listen
                    </button>
                  </>
                )}
              </div>
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.6 }}>
              {testResult.translated_meaning || (
                <span style={{ color: 'var(--accent-amber)' }}>
                  Translation unavailable for this language pair: {testResult.error_detail || 'No provider response'}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Category Filter Pills */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-teal)', letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' }}>
          FILTER EXAMPLES BY LANGUAGE CATEGORY:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORIES.map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSel ? '1px solid var(--accent-teal)' : '1px solid var(--border-color)',
                  background: isSel ? 'var(--accent-teal)' : 'var(--panel-bg)',
                  color: isSel ? '#0a1016' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Example Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {filteredExamples.map((ex) => (
          <div
            key={ex.id}
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div>
              {/* Language Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(96, 165, 250, 0.15)',
                    color: '#93c5fd',
                    fontWeight: 700,
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                  }}
                >
                  SOURCE: {ex.sourceLangName}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(114, 217, 185, 0.15)',
                    color: 'var(--accent-teal)',
                    fontWeight: 700,
                    border: '1px solid rgba(114, 217, 185, 0.3)',
                  }}
                >
                  TARGET: {ex.targetLangName}
                </span>
              </div>

              {/* Example Input */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Example Input:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => copyText(ex.inputText, `${ex.id}-in`)}
                      title="Copy example input"
                    >
                      {copiedId === `${ex.id}-in` ? '✓' : '📋'}
                    </button>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => speak(ex.inputText, ex.sourceSpeechLocale)}
                      title="Speak example input"
                    >
                      🔊
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  "{ex.inputText}"
                </div>
              </div>

              {/* Verified Translation */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent-teal)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Verified Translation:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => copyText(ex.translatedText, `${ex.id}-out`)}
                      title="Copy translated text"
                    >
                      {copiedId === `${ex.id}-out` ? '✓' : '📋'}
                    </button>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => speak(ex.translatedText, ex.targetSpeechLocale)}
                      title="Speak translated text"
                    >
                      🔊
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(16, 26, 38, 0.7)',
                    border: '1px solid rgba(114, 217, 185, 0.25)',
                    borderRadius: '6px',
                    fontSize: '13.5px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {ex.translatedText}
                </div>
              </div>
            </div>

            {/* Test Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn-action-sm"
                onClick={() => loadExampleIntoTester(ex)}
                style={{ fontSize: '11.5px', color: 'var(--accent-teal)' }}
              >
                Load into Tester ↑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
