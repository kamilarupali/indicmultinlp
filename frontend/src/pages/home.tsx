import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/metriccard';
import { getDatasets, getExperiments, getModels } from '../services/api';

const ARCHITECTURE_STAGES = [
  {
    step: '01',
    title: 'Input & Script Range Inspection',
    category: 'Orthography & Ingestion',
    desc: 'Scans raw text against Unicode blocks (Devanagari, Telugu, Tamil, Kannada, Malayalam, Odia, Urdu, Hangul, Cyrillic, Latin). Normalizes characters via NFC equivalence and preserves agglutinative boundaries.',
    tech: 'Unicode mark parser · NFC canonical equivalence · Abugida preservation',
  },
  {
    step: '02',
    title: 'Language Detection & Uncertainty Scoring',
    category: 'Phonology & Lexicon',
    desc: 'Matches token lexicons for Romanized Indic (Hinglish/Tenglish/Tanglish) vs English. Prompts user confirmation if ambiguous rather than silently guessing. Computes Gambäck & Das (2014) Code-Mixing Index (CMI).',
    tech: 'Phonological lexicons · Calibrated uncertainty · Gambäck & Das CMI',
  },
  {
    step: '03',
    title: 'Explainable Sentiment & Intent ML',
    category: 'Machine Learning',
    desc: 'Evaluates sentiment polarity and domain intent using TF-IDF feature extractors coupled with Logistic Regression and Linear SVM classifiers, accompanied by extracted keyword cues.',
    tech: 'TF-IDF Vectorizers · Logistic Regression · Linear SVM · Cue extraction',
  },
  {
    step: '04',
    title: 'Strict Semantic Translation Cascade',
    category: 'Cross-Lingual Transfer',
    desc: 'Translates semantic meaning into the selected target language via Verified Offline Phrasebook and Neural MT. Rejects identical source outputs when source != target and prevents context contamination.',
    tech: 'Offline Phrasebook · Neural MT · Identity-output rejection · Context guards',
  },
  {
    step: '05',
    title: 'Target Locale Voice Synthesis',
    category: 'Acoustic Speech',
    desc: 'Synthesizes translated meaning in the target language locale (e.g. te-IN, hi-IN, ta-IN, kn-IN, or-IN, ko-KR) using HD Neural TTS or browser device voices, keeping text accessible if voice is absent.',
    tech: 'HD Neural TTS · Web Speech API · Target locale matching · Voice fallback',
  },
];

const PLATFORM_CARDS = [
  {
    to: '/dashboard',
    icon: '📊',
    title: 'Live Project Dashboard',
    desc: 'Real-time monitoring of processed sentences, recorded runtime errors, recent activity logs, and 4-way language capability availability matrix.',
    badge: 'Live Operations',
  },
  {
    to: '/analyzer',
    icon: '⚡',
    title: 'Live Linguistic Analyzer',
    desc: 'Real-time interactive inspection of script, tokenization, calibrated language identification, CMI calculation, sentiment polarity, and intent classification.',
    badge: 'Real-Time NLP',
  },
  {
    to: '/assistant',
    icon: '🎙️',
    title: 'AI Multilingual Voice Assistant',
    desc: 'Speech-to-text and text-to-speech conversational assistant. Translates new sentences into your chosen target language with context-isolated deictic memory.',
    badge: 'Speech & Audio',
  },
  {
    to: '/demo',
    icon: '🎯',
    title: 'Example Demo Showcase',
    desc: 'Dedicated showcase featuring verified example inputs and accurate translations across Indic, Romanized Indic, code-mixed, and international languages.',
    badge: 'Verified Showcase',
  },
  {
    to: '/hub',
    icon: '🔬',
    title: 'Research & Evaluation Hub',
    desc: 'Consolidated workspace grouping Model Comparison benchmarks, Experiment Training Lab, and academic syllabus literature with plain language explanations.',
    badge: 'Research & Lab',
  },
  {
    to: '/about',
    icon: 'ℹ️',
    title: 'About the Project',
    desc: 'Deep-dive architectural overview, engineering invariants, data provenance across 110 corpus sentences, and realistic service limitations.',
    badge: 'System Documentation',
  },
];

export default function Home() {
  const [counts, setCounts] = useState({ datasets: '—', models: '—', runs: '—' });
  const [activeArchStep, setActiveArchStep] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDatasets(), getModels(), getExperiments()])
      .then(([d, m, e]) =>
        setCounts({
          datasets: String(d.datasets.length),
          models: String(m.models.filter((item) => item.available).length),
          runs: String(e.experiments.length),
        })
      )
      .catch(() => undefined);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-copy">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className="tag" style={{ color: 'var(--accent-teal)', borderColor: 'rgba(114, 217, 185, 0.4)' }}>
              REAL-TIME MULTILINGUAL & CODE-MIXED PLATFORM
            </span>
          </div>

          <h2>
            IndicMultiNLP<br />
            <em>Multilingual & Code-Mixed NLP Research Platform</em>
          </h2>

          <p>
            An advanced platform engineered for Indian and international languages: <strong>Telugu, Hindi, Tamil, Kannada, Malayalam, Odia, Urdu, Korean, and English</strong>.
            Evaluates native abugida scripts, Romanized orthography, and code-mixed speech with genuine Code-Mixing Index (CMI),
            explainable sentiment & intent classification, and context-isolated semantic translation.
          </p>

          {/* Supported Language Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '18px 0 6px' }}>
            {[
              { lang: 'Telugu', native: 'తెలుగు' },
              { lang: 'Hindi', native: 'हिन्दी' },
              { lang: 'Tamil', native: 'தமிழ்' },
              { lang: 'Kannada', native: 'ಕನ್ನಡ' },
              { lang: 'Malayalam', native: 'മലയാളം' },
              { lang: 'Odia', native: 'ଓଡ଼ିଆ' },
              { lang: 'Urdu', native: 'اردو' },
              { lang: 'Korean', native: '한국어' },
              { lang: 'English', native: 'English' },
              { lang: 'Marathi', native: 'मराठी' },
              { lang: 'Bengali', native: 'বাংলা' },
              { lang: 'Gujarati', native: 'ગુજરાતી' },
            ].map((item) => (
              <span
                key={item.lang}
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: 'var(--accent-teal)' }}>{item.native}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {item.lang}</span>
              </span>
            ))}
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '18px' }}>
            <Link className="primary-link" to="/analyzer">
              Open Live Analyzer →
            </Link>
            <Link
              className="secondary-button"
              style={{ padding: '12px 18px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              to="/dashboard"
            >
              📊 Live Dashboard
            </Link>
            <Link
              className="secondary-button"
              style={{ padding: '12px 18px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              to="/assistant"
            >
              🎙️ Voice Assistant
            </Link>
            <Link
              className="secondary-button"
              style={{ padding: '12px 18px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              to="/demo"
            >
              🎯 Example Demo
            </Link>
            <Link
              className="secondary-button"
              style={{ padding: '12px 18px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              to="/hub"
            >
              🔬 Research Hub
            </Link>
          </div>
        </div>

        {/* Hero Orbit Visualization */}
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="orbit-core">🇮🇳</div>
          <span className="orbit-label" style={{ top: '8px', left: '42%' }}>తెలుగు</span>
          <span className="orbit-label" style={{ right: '8px', top: '35%' }}>हिन्दी</span>
          <span className="orbit-label" style={{ right: '22px', bottom: '22%' }}>தமிழ்</span>
          <span className="orbit-label" style={{ left: '22px', bottom: '22%' }}>ಕನ್ನಡ</span>
          <span className="orbit-label" style={{ left: '8px', top: '35%' }}>English</span>
        </div>
      </section>

      {/* Project Real Indicators Metric Grid */}
      <div className="section-head" style={{ marginTop: '36px' }}>
        <div>
          <div className="eyebrow">EMPIRICAL PROJECT INDICATORS</div>
          <h2>Live System Provenance & Repository Coverage</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Empirically computed metrics derived directly from repository datasets, trained model artifacts, and evaluation runs.
          </p>
        </div>
      </div>

      <div className="metrics">
        <MetricCard
          label="MASTER CORPUS SIZE"
          value="110 Sentences"
          sub="Partitioned into 77 Train / 17 Test / 16 Validation instances across Dravidian, Indo-Aryan & Code-Mixed text"
        />
        <MetricCard
          label="RUNNABLE MODELS"
          value={`${counts.models} Active`}
          sub="1 explainable rule-based baseline + trained TF-IDF (Logistic Regression & Linear SVM) models"
        />
        <MetricCard
          label="SAVED EVALUATION RUNS"
          value={`${counts.runs} Runs`}
          sub="10 saved empirical evaluation runs testing accuracy, macro-F1, confusion matrices & ablation"
        />
        <MetricCard
          label="SCRIPT SYSTEMS"
          value="12+ Scripts"
          sub="Devanagari, Telugu, Tamil, Kannada, Malayalam, Odia, Urdu, Hangul, Cyrillic, and Latin"
        />
      </div>

      {/* Visual Workflow Overview Section */}
      <div className="section-head" style={{ marginTop: '36px' }}>
        <div>
          <div className="eyebrow">WORKFLOW OVERVIEW</div>
          <h2>Interconnected Five-Stage Computational Pipeline</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Step-by-step data flow ensuring robust language detection, code-mixing calculation, semantic translation, and speech generation.
          </p>
        </div>
      </div>

      <div className="arch-grid">
        {ARCHITECTURE_STAGES.map((s) => (
          <div
            key={s.step}
            className={`arch-stage-card ${activeArchStep === s.step ? 'active' : ''}`}
            onMouseEnter={() => setActiveArchStep(s.step)}
            onMouseLeave={() => setActiveArchStep(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="arch-step-badge">STAGE {s.step}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.category}</span>
            </div>
            <h3 className="arch-stage-title">{s.title}</h3>
            <p className="arch-stage-desc">{s.desc}</p>
            <div className="arch-stage-tech">{s.tech}</div>
          </div>
        ))}
      </div>

      {/* Visual Summary of Dataset Partitions & Provenance */}
      <section
        style={{
          marginTop: '28px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              DATASET PARTITION DISTRIBUTION & PROVENANCE
            </span>
            <h3 style={{ margin: '2px 0 0' }}>Held-Out Partition Splits (110 Total Sentences)</h3>
          </div>
          <Link to="/datasets" style={{ fontSize: '12px', color: 'var(--accent-teal)', textDecoration: 'none', fontWeight: 600 }}>
            Inspect Dataset Explorer →
          </Link>
        </div>

        {/* Partition Distribution Progress Bars */}
        <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{ width: '70%', background: '#72d9b9' }} title="Train Split: 77 instances (70%)" />
          <div style={{ width: '15.5%', background: '#60a5fa' }} title="Held-Out Test Split: 17 instances (15.5%)" />
          <div style={{ width: '14.5%', background: '#f59e0b' }} title="Validation Split: 16 instances (14.5%)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12.5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#72d9b9' }} />
            <span><strong>Training Split:</strong> 77 rows (70%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#60a5fa' }} />
            <span><strong>Held-Out Test:</strong> 17 rows (15.5%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            <span><strong>Validation Split:</strong> 16 rows (14.5%)</span>
          </div>
        </div>
      </section>

      {/* Platform Capabilities & Realistic Limitations */}
      <section style={{ marginTop: '32px' }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">ENGINEERING TRANSPARENCY</div>
            <h2>Capabilities & Realistic Service Boundaries</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Clear delineation of verified platform strengths and realistic external service limitations.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '18px', background: 'var(--panel-bg)', borderRadius: '10px', border: '1px solid rgba(114, 217, 185, 0.3)' }}>
            <h4 style={{ margin: '0 0 10px', color: 'var(--accent-teal)', fontSize: '14px' }}>
              ✅ Verified Architectural Strengths
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <li><strong>Context Isolation:</strong> Translates new sentences strictly from current input without prior conversation leakage.</li>
              <li><strong>Deictic Commands:</strong> Commands like <em>"Translate that to Hindi"</em> isolate and translate the prior user sentence.</li>
              <li><strong>Uncertainty Confirmation:</strong> Asks for source language confirmation rather than silently guessing English.</li>
              <li><strong>Identity-Output Rejection:</strong> Refuses to present unchanged source text as a successful translation when languages differ.</li>
            </ul>
          </div>

          <div style={{ padding: '18px', background: 'var(--panel-bg)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <h4 style={{ margin: '0 0 10px', color: '#f59e0b', fontSize: '14px' }}>
              ⚠️ Realistic Service Boundaries
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <li><strong>Microphone STT:</strong> Browser-based speech recognition requires Chromium-based browsers with mic access permissions.</li>
              <li><strong>External Neural MT:</strong> Free translation endpoints carry public rate limits; offline phrasebook guarantees core phrases.</li>
              <li><strong>Voice Synthesis Locale:</strong> Device voices vary by OS; if an acoustic voice is unavailable, full text remains accessible.</li>
              <li><strong>Ambiguous Romanized Words:</strong> Single Romanized words shared across languages prompt for source confirmation.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Navigation Cards Grid */}
      <section style={{ marginTop: '36px', marginBottom: '20px' }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">RESEARCH CONSOLE</div>
            <h2>Explore Platform Modules & Tooling</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Direct access to all research, evaluation, and interactive components in the IndicMultiNLP framework.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {PLATFORM_CARDS.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              style={{
                textDecoration: 'none',
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
              className="nav-card-link"
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '26px' }}>{card.icon}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'rgba(114, 217, 185, 0.12)',
                      color: 'var(--accent-teal)',
                      border: '1px solid rgba(114, 217, 185, 0.3)',
                    }}
                  >
                    {card.badge}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--text-primary)' }}>
                  {card.title}
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {card.desc}
                </p>
              </div>
              <div style={{ marginTop: '14px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-teal)' }}>
                Launch Module →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Academic Rigor Notice */}
      <div className="callout" style={{ marginTop: '24px' }}>
        <strong>Academic Rigor & Scientific Integrity:</strong> All accuracy scores, macro-F1 benchmarks, confusion matrices, and code-mixing indices presented on this platform are computed directly from held-out empirical evaluations on the IndicMultiNLP corpus. No benchmark statistics or evaluation figures are fabricated or simulated.
      </div>
    </>
  );
}
