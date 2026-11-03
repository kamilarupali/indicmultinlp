import { Link } from 'react-router-dom';

export default function AboutProject() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Hero Section */}
      <div className="intro">
        <div>
          <div className="eyebrow">COMPREHENSIVE RESEARCH ARCHITECTURE & DOCUMENTATION</div>
          <p>
            IndicMultiNLP is a high-performance research platform designed to solve core challenges in Indian language processing:
            native Brahmic script disambiguation, Romanized phonetic transcription (e.g., Hinglish, Tenglish, Tanglish), code-mixing index (CMI)
            quantification, explainable sentiment and intent classification, and strict context-isolated semantic translation.
          </p>
        </div>
      </div>

      {/* Real Project Indicators Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', margin: '24px 0 32px' }}>
        <div className="history-card" style={{ textAlign: 'center', padding: '18px' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-teal)' }}>110</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>Curated Master Sentences</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Partitioned into 77 Train / 17 Test / 16 Val
          </div>
        </div>

        <div className="history-card" style={{ textAlign: 'center', padding: '18px' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa' }}>7</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>Runnable Models</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Baseline heuristic + 6 TF-IDF Linear/SVM Classifiers
          </div>
        </div>

        <div className="history-card" style={{ textAlign: 'center', padding: '18px' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>10</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>Saved Evaluation Runs</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Documented confusion matrices & condition splits
          </div>
        </div>

        <div className="history-card" style={{ textAlign: 'center', padding: '18px' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399' }}>12+</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>Language & Script Systems</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Devanagari, Telugu, Tamil, Kannada, Malayalam, Odia, Urdu, Hangul, Latin
          </div>
        </div>
      </div>

      {/* Architectural Breakdown */}
      <section className="form-panel" style={{ marginBottom: '28px' }}>
        <div className="eyebrow">FIVE-STAGE ARCHITECTURAL PIPELINE</div>
        <h3 style={{ margin: '4px 0 16px' }}>How IndicMultiNLP Processes Multilingual & Code-Mixed Text</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Layer 1 */}
          <div style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', borderLeft: '4px solid var(--accent-teal)' }}>
            <h4 style={{ margin: '0 0 6px', color: 'var(--accent-teal)' }}>
              1. Script Identification & Preprocessing
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Raw input is stripped of adversarial whitespace and normalized. Characters are mapped directly to Unicode blocks
              (Devanagari <code>U+0900–U+097F</code>, Telugu <code>U+0C00–U+0C7F</code>, Tamil <code>U+0B80–U+0BFF</code>,
              Kannada <code>U+0C80–U+0CFF</code>, Odia <code>U+0B00–U+0B7F</code>, Malayalam <code>U+0D00–U+0D7F</code>,
              Arabic/Urdu <code>U+0600–U+06FF</code>, Hangul <code>U+AC00–U+D7AF</code>, Cyrillic <code>U+0400–U+04FF</code>, and Latin <code>U+0020–U+007F</code>).
            </p>
          </div>

          {/* Layer 2 */}
          <div style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', borderLeft: '4px solid #60a5fa' }}>
            <h4 style={{ margin: '0 0 6px', color: '#60a5fa' }}>
              2. Phonological Lexicon Matching & Uncertainty Detection
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              For Latin script utterances, IndicMultiNLP inspects phonetic token sets across Telugu, Hindi, Tamil, Kannada, Malayalam, Odia, and Urdu.
              Unlike naive detectors that silently guess English when confidence is low, IndicMultiNLP returns <code>is_uncertain: true</code>
              and prompts the user to confirm the source language when input is ambiguous.
            </p>
          </div>

          {/* Layer 3 */}
          <div style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
            <h4 style={{ margin: '0 0 6px', color: '#f59e0b' }}>
              3. Explainable Sentiment & Intent Classification
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Trained models (TF-IDF vectorizer + Logistic Regression / Linear SVM) classify text into polarity and intent classes.
              Every decision is accompanied by extracted lexical evidence (positive/negative cues or domain tokens) to provide complete interpretability.
            </p>
          </div>

          {/* Layer 4 */}
          <div style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', borderLeft: '4px solid #34d399' }}>
            <h4 style={{ margin: '0 0 6px', color: '#34d399' }}>
              4. Multi-Tier Semantic Translation Cascade
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Translation follows a strictly verified cascade:
              (Tier 1) Verified Offline Phrasebook for common greetings, queries, and conversational idioms;
              (Tier 2) MyMemory Neural Machine Translation API;
              (Tier 3) Google Cloud MT fallback.
              <strong>Strict invariant:</strong> If the translation engine returns input unchanged when source != target, it is rejected and marked <code>UNAVAILABLE</code> rather than deceiving the user.
            </p>
          </div>

          {/* Layer 5 */}
          <div style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', borderLeft: '4px solid #a855f7' }}>
            <h4 style={{ margin: '0 0 6px', color: '#a855f7' }}>
              5. Speech Synthesis & Target Locale Voice
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The voice assistant speaks <em>only</em> the translated sentence in the target language locale (e.g. <code>te-IN</code>, <code>hi-IN</code>, <code>ta-IN</code>, <code>kn-IN</code>, <code>or-IN</code>, <code>ur-PK</code>, <code>ko-KR</code>).
              If the device or browser lacks an acoustic voice for a specific locale, an honest notification is displayed while preserving full textual access.
            </p>
          </div>
        </div>
      </section>

      {/* Realistic Capabilities vs Service Limitations */}
      <section className="form-panel" style={{ marginBottom: '32px' }}>
        <div className="eyebrow">TRANSPARENCY & PROVENANCE</div>
        <h3 style={{ margin: '4px 0 16px' }}>System Capabilities vs Realistic Service Limitations</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid rgba(114, 217, 185, 0.3)' }}>
            <h4 style={{ margin: '0 0 8px', color: 'var(--accent-teal)' }}>✅ Supported Capabilities</h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <li>Context isolation: Translates new sentences without previous conversational contamination.</li>
              <li>Deictic command support: "Translate that to Hindi" dynamically isolates the prior sentence.</li>
              <li>Unicode abugida and world script identification across 10 Indian and international scripts.</li>
              <li>Phonetic transliteration strictly isolated from semantic translation.</li>
              <li>Persistent session history tracking status (<code>SUCCESS</code>, <code>SAME_LANGUAGE</code>, <code>UNAVAILABLE</code>, <code>ERROR</code>, <code>UNCERTAIN</code>).</li>
            </ul>
          </div>

          <div style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <h4 style={{ margin: '0 0 8px', color: '#f59e0b' }}>⚠️ Realistic Limitations</h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <li>Microphone speech-to-text (STT) requires a Chromium browser with permissions enabled.</li>
              <li>Highly ambiguous Romanized words without context will prompt for source language confirmation.</li>
              <li>Free external MT endpoints have public rate limits; offline phrasebook guarantees core idioms.</li>
              <li>Browser device voices vary by operating system; neural audio fallback requires network connectivity.</li>
            </ul>
          </div>
        </div>

        {/* Quick Navigation Footer */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <Link to="/" className="secondary-button" style={{ fontSize: '12px', padding: '8px 16px' }}>
            🏠 Overview Dashboard
          </Link>
          <Link to="/demo" className="primary-button" style={{ fontSize: '12px', padding: '8px 16px' }}>
            🎯 Try Example Demo
          </Link>
          <Link to="/assistant" className="secondary-button" style={{ fontSize: '12px', padding: '8px 16px' }}>
            🎙️ Voice Assistant
          </Link>
          <Link to="/analyzer" className="secondary-button" style={{ fontSize: '12px', padding: '8px 16px' }}>
            ⚡ Live Analyzer
          </Link>
        </div>
      </section>
    </div>
  );
}
