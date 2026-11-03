import { useEffect, useState } from 'react';
import { analyzeText, getModels } from '../services/api';
import type { Analysis, ModelInfo } from '../types';
import TextInput from '../components/textinput';
import LanguageCard from '../components/languagecard';
import SentimentCard from '../components/sentimentcard';
import IntentCard from '../components/intentcard';
import CodeMixCard from '../components/codemixcard';
import TranslationCard from '../components/translationcard';

const baselineModel: ModelInfo = {
  id: 'baseline',
  name: 'Explainable Rule-Based Baseline',
  available: true,
  tasks: ['language', 'sentiment', 'intent'],
  family: 'baseline',
};

export default function Analyzer() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [model, setModel] = useState('baseline');
  const [models, setModels] = useState<ModelInfo[]>([baselineModel]);

  useEffect(() => {
    getModels()
      .then((r) => {
        const available = r.models.filter((m) => m.available);
        setModels(available.length > 0 ? available : [baselineModel]);
      })
      .catch(() => undefined);
  }, []);

  async function run(overrideText?: string, overrideModel?: string) {
    const t = overrideText ?? text;
    const m = overrideModel ?? model;
    if (!t.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await analyzeText(t, m);
      setResult(res);

      // Record sentence analysis in real project history
      try {
        const saved = localStorage.getItem('indicmultinlp_history');
        const historyList = saved ? JSON.parse(saved) : [];
        const transStatus = res.translation?.status || 'success';
        const itemStatus =
          transStatus === 'success' || transStatus === 'same_language'
            ? transStatus
            : transStatus === 'unavailable'
            ? 'unavailable'
            : 'error';

        const newItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          originalText: t,
          detectedLanguage: res.language.language,
          sourceLanguage: res.language.base_language || res.language.language,
          targetLanguage: res.translation?.target_language || 'English',
          targetLangCode: res.translation?.target_lang_code || 'en',
          translatedMeaning: res.translation?.translated_meaning || (itemStatus === 'same_language' ? t : 'Translation unavailable'),
          status: itemStatus,
          replyText: res.translation?.translated_meaning || '',
          speechText: res.translation?.translated_meaning || '',
          speechLang: 'en-IN',
          sentiment: res.sentiment.label,
          intent: res.intent.label,
          cmi: res.code_mixing.cmi,
          isRomanized: res.romanized,
          sourceModule: 'analyzer',
        };
        localStorage.setItem('indicmultinlp_history', JSON.stringify([newItem, ...historyList.slice(0, 49)]));
      } catch (err) {
        console.warn('Could not record analysis to history', err);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'API request failed. Is the backend service active?';
      setError(errMsg);

      // Record analysis error in project history
      try {
        const saved = localStorage.getItem('indicmultinlp_history');
        const historyList = saved ? JSON.parse(saved) : [];
        const errorItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          originalText: t,
          detectedLanguage: 'Unknown',
          targetLanguage: 'English',
          targetLangCode: 'en',
          translatedMeaning: 'Analysis failed with error',
          status: 'error',
          errorDetail: errMsg,
          replyText: errMsg,
          speechText: '',
          speechLang: 'en-IN',
          sourceModule: 'analyzer',
        };
        localStorage.setItem('indicmultinlp_history', JSON.stringify([errorItem, ...historyList.slice(0, 49)]));
      } catch {}
    } finally {
      setBusy(false);
    }
  }

  function handleModelChange(newModel: string) {
    setModel(newModel);
    if (result) {
      void run(undefined, newModel);
    }
  }

  const selectedModelObj = models.find((m) => m.id === model) ?? baselineModel;

  return (
    <>
      {/* Intro Header */}
      <div className="intro">
        <div>
          <div className="eyebrow">REAL-TIME MULTILINGUAL NLP PIPELINE</div>
          <p>
            Evaluate text across Telugu, Hindi, Tamil, Kannada, Odia, Urdu, and English with script detection, Code-Mixing Index (CMI),
            preprocessing, sentiment analysis, 8-class intent classification, and cross-lingual translation.
          </p>
        </div>
      </div>

      {/* Active NLP Model Clarifier Box */}
      <div className="model-clarify-box">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="eyebrow" style={{ color: 'var(--accent-teal)' }}>ACTIVE NLP MODEL SELECTION</span>
            <span className="tag" style={{ fontSize: '10px', padding: '2px 8px' }}>
              {selectedModelObj.id === 'baseline' ? 'Heuristic Rule-Based' : 'Trained Statistical ML'}
            </span>
          </div>
          <div className="model-explainer">
            <strong>What this option does:</strong> Selects the machine learning classification model applied for downstream{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Sentiment Analysis</strong> and{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Intent Classification</strong>. Foundational stages (Script Detection,
            Code-Mixing CMI, Named Entity Recognition, Sentence Splitting, and Semantic Translation) execute in unison across all inputs.
          </div>
        </div>

        <label className="select-label" style={{ margin: 0, minWidth: '240px' }}>
          CLASSIFIER MODEL
          <select value={model} onChange={(e) => handleModelChange(e.target.value)}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.id === 'baseline' ? ' (Lexical Cues)' : ' · ' + (m.tasks[0] ?? '')}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Focused Text Input Component (Empty on first load, ready for user's sentence) */}
      <TextInput value={text} onChange={setText} onAnalyze={() => run()} busy={busy} />
      {error && <div className="error">{error}</div>}

      {!result && !busy && (
        <div
          style={{
            marginTop: '20px',
            padding: '24px',
            background: 'var(--panel-bg)',
            border: '1px dashed var(--border-color)',
            borderRadius: '10px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '13px',
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '6px' }}>📝</div>
          <strong style={{ color: 'var(--text-secondary)' }}>Ready for your sentence</strong>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Type or paste any sentence in native Indic script, Romanized orthography (Hinglish/Tenglish/Tanglish), or English above and click <strong>Analyze text →</strong> or press <strong>⌘/Ctrl + Enter</strong>.
          </p>
        </div>
      )}

      {/* Results Output Section */}
      {result && (
        <>
          <div className="section-head" style={{ marginTop: '28px' }}>
            <div>
              <div className="eyebrow">ANALYSIS OUTPUT · {result.model.toUpperCase()}</div>
              <h2>Pipeline Results & Linguistic Insights</h2>
            </div>
          </div>

          {/* 4 Core Result Cards Grid */}
          <div className="result-grid">
            <LanguageCard data={result} />
            <SentimentCard data={result} />
            <IntentCard data={result} />
            <CodeMixCard data={result} />
          </div>

          {/* Cross-Lingual Semantic Translation Card */}
          {result.translation && (
            <div style={{ marginTop: '16px' }}>
              <TranslationCard data={result} />
            </div>
          )}

          {/* Named Entity Recognition & Preservation Inspector */}
          {result.named_entities && result.named_entities.length > 0 && (
            <div className="info-card" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div className="eyebrow">NAMED ENTITY RECOGNITION & PRESERVATION ({result.named_entities.length})</div>
                <span className="tag" style={{ color: 'var(--accent-teal)' }}>
                  PRESERVED / UNCORRUPTED
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 12px' }}>
                Detected proper nouns are isolated from dictionary mistranslation and preserved across scripts.
              </p>
              <div style={{ display: 'grid', gap: '10px' }}>
                {result.named_entities.map((ent, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card, #0c121b)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`entity-badge ${ent.category}`}>
                          {ent.category === 'PER' ? '👤 PERSON' : ent.category === 'LOC' ? '📍 LOCATION' : ent.category === 'ORG' ? '🏢 ORGANIZATION' : '🏷️ PROPER NOUN'}
                        </span>
                        <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{ent.text}</strong>
                        {ent.is_ambiguous && (
                          <span style={{ fontSize: '11px', background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Ambiguous in Context
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Confidence: <b>{Math.round(ent.confidence * 100)}%</b>
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      {ent.explanation}
                    </div>
                    {ent.target_transliterations && Object.keys(ent.target_transliterations).length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', fontSize: '12px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>TARGET SCRIPT TRANSLITERATIONS:</span>
                        {Object.entries(ent.target_transliterations).map(([lang, rep]) => (
                          <span
                            key={lang}
                            style={{
                              background: 'var(--panel-bg)',
                              border: '1px solid var(--border-subtle)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <span style={{ textTransform: 'uppercase', color: 'var(--accent-teal)', fontWeight: 700, marginRight: '4px' }}>{lang}:</span>
                            {rep}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Long Multi-Sentence Discourse Breakdown */}
          {result.sentences && result.sentences.length > 1 && (
            <div className="info-card" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div className="eyebrow">LONG INPUT MULTI-SENTENCE BREAKDOWN ({result.sentences.length} SENTENCES)</div>
                <span className="tag">CONTEXT-PRESERVED SEGMENTATION</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 12px' }}>
                Input is segmented at sentence boundaries to maintain local context and prevent length-limit MT failures.
              </p>
              <div style={{ display: 'grid', gap: '8px' }}>
                {result.sentences.map((sent, sIdx) => {
                  const sentDetail = result.sentiment.sentence_breakdown?.[sIdx];
                  const pol = sentDetail?.polarity ?? 'Neutral';
                  return (
                    <div key={sIdx} className="sentence-item">
                      <div className="sentence-header">
                        <span style={{ color: 'var(--text-muted)' }}>Sentence #{sIdx + 1}</span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background:
                              pol === 'Positive'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : pol === 'Negative'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(148, 163, 184, 0.15)',
                            color:
                              pol === 'Positive'
                                ? '#10b981'
                                : pol === 'Negative'
                                ? '#ef4444'
                                : '#94a3b8',
                          }}
                        >
                          {pol}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>{sent}</div>
                      {sentDetail && (sentDetail.positive_cues.length > 0 || sentDetail.negative_cues.length > 0) && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {sentDetail.positive_cues.length > 0 && (
                            <span style={{ color: '#10b981', marginRight: '10px' }}>
                              + {sentDetail.positive_cues.join(', ')}
                            </span>
                          )}
                          {sentDetail.negative_cues.length > 0 && (
                            <span style={{ color: '#ef4444' }}>
                              - {sentDetail.negative_cues.join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Token-Level Script & Code-Switching Tags */}
          {result.code_mixing.token_tags && result.code_mixing.token_tags.length > 0 && (
            <div className="info-card" style={{ marginTop: '16px' }}>
              <div className="eyebrow">TOKEN-LEVEL SCRIPT & CODE-SWITCHING TAGS</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                {result.code_mixing.token_tags.map((tag, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card, #101720)',
                      border: '1px solid var(--border-color)',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>{tag.token}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background:
                          tag.script === 'Telugu'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : tag.script === 'Devanagari'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : tag.script === 'Tamil'
                            ? 'rgba(59, 130, 246, 0.2)'
                            : tag.script === 'Kannada'
                            ? 'rgba(168, 85, 247, 0.2)'
                            : 'rgba(100, 116, 139, 0.2)',
                        color:
                          tag.script === 'Telugu'
                            ? '#10b981'
                            : tag.script === 'Devanagari'
                            ? '#f59e0b'
                            : tag.script === 'Tamil'
                            ? '#60a5fa'
                            : tag.script === 'Kannada'
                            ? '#c084fc'
                            : 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {tag.script}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preprocessing & N-Gram LM Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', marginTop: '16px' }}>
            <div className="info-card">
              <div className="eyebrow">PREPROCESSING & NORMALIZATION TRACE</div>
              <div style={{ display: 'grid', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Raw Text:</span>
                  <div style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{result.text}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>NFC Normalized:</span>
                  <div style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{result.normalized_text ?? result.text}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Cleaned:</span>
                  <div style={{ color: 'var(--accent-teal)', wordBreak: 'break-word' }}>{result.cleaned_text}</div>
                </div>
              </div>
            </div>

            {result.ngram_lm && (
              <div className="info-card">
                <div className="eyebrow">N-GRAM LANGUAGE MODEL EVALUATION</div>
                <div style={{ display: 'grid', gap: '8px', marginTop: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sequence Log-Likelihood:</span>
                    <b style={{ color: 'var(--accent-teal)' }}>{result.ngram_lm.log_likelihood}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Perplexity (PPL):</span>
                    <b style={{ color: 'var(--text-primary)' }}>{result.ngram_lm.perplexity}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Evaluated Tokens:</span>
                    <span>{result.ngram_lm.token_count}</span>
                  </div>
                  <small style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Smoothing: {result.ngram_lm.smoothing} (Unit II)
                  </small>
                </div>
              </div>
            )}
          </div>

          {/* End-to-End Pipeline Trace with Honest Status Labels */}
          {result.pipeline_stages && (
            <div className="pipeline-trace-wrapper">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div className="eyebrow">END-TO-END PIPELINE TRACE ({result.pipeline_stages.length} STAGES)</div>
                  <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: 'var(--text-primary)' }}>
                    Architectural Execution & Diagnostic Provenance
                  </h3>
                </div>
                <span className="tag" style={{ color: 'var(--accent-teal)' }}>
                  TRANSPARENT DIAGNOSTICS
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '6px 0 14px' }}>
                Every computational stage is traced honestly. Fully supported phases display verified data; unsupported capabilities are labeled transparently.
              </p>

              <div className="pipeline-stages-list">
                {result.pipeline_stages.map((stage: any, idx: number) => {
                  const isSupported = stage.supported !== false;
                  return (
                    <div key={idx} className="stage-card-row">
                      <span className="stage-badge-num">STAGE {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{stage.stage}</strong>
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          {stage.detail}
                        </div>
                        {stage.info && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                            {stage.info}
                          </div>
                        )}
                      </div>
                      <span className={`stage-status-badge ${isSupported ? 'supported' : 'unsupported'}`}>
                        {stage.status_label ?? (isSupported ? 'Supported' : 'Unsupported')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extracted Words & Morphological Tokens Panel */}
          <div className="token-panel" style={{ marginTop: '16px' }}>
            <div className="eyebrow">EXTRACTED WORDS & MORPHOLOGICAL TOKENS ({result.tokens.length})</div>
            <div className="chips">
              {result.tokens.map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
            <p className="disclaimer">{result.disclaimer}</p>
          </div>
        </>
      )}
    </>
  );
}
