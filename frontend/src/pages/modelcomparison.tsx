import { useEffect, useState } from 'react';
import { getModelComparisons } from '../services/api';
import type { ModelComparison } from '../types';

export default function ModelComparisonPage() {
  const [comparisons, setComparisons] = useState<ModelComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'macro_f1' | 'accuracy' | 'latency_ms'>('macro_f1');

  useEffect(() => {
    getModelComparisons()
      .then((data) => setComparisons(data.comparisons))
      .catch(() => setComparisons([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="intro">
        <div>
          <div className="eyebrow">RESEARCH BENCHMARK & ARCHITECTURAL COMPARISON</div>
          <p>
            Systematic empirical comparison of Traditional NLP (N-Gram LM, TF-IDF + Logistic Regression, TF-IDF + Linear SVM)
            against Multilingual Transformer architectures (IndicBERT, XLM-RoBERTa) on Indic and code-mixed corpora.
          </p>
        </div>
        <span className="tag" style={{ color: 'var(--accent-teal)' }}>
          UNITS I–V EMPIRICAL EVALUATION
        </span>
      </div>

      <div className="metrics">
        <div className="metric-card">
          <span>FASTEST INFERENCE</span>
          <b style={{ color: 'var(--accent-teal)' }}>1.2 ms</b>
          <small>N-Gram Language Model</small>
        </div>
        <div className="metric-card">
          <span>HIGHEST MACRO-F1</span>
          <b style={{ color: 'var(--accent-teal)' }}>0.929</b>
          <small>XLM-RoBERTa Base</small>
        </div>
        <div className="metric-card">
          <span>OPTIMAL CPU TRADEOFF</span>
          <b style={{ color: 'var(--accent-teal)' }}>0.865</b>
          <small>TF-IDF + Linear SVM (10.5 MB)</small>
        </div>
        <div className="metric-card">
          <span>SPECIALIZED INDIC TOKENIZER</span>
          <b style={{ color: 'var(--accent-teal)' }}>0.912</b>
          <small>IndicBERT (SentencePiece)</small>
        </div>
      </div>

      <section className="form-panel" style={{ marginTop: '20px' }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">INTERACTIVE BENCHMARK VISUALIZER</div>
            <h2>Comparative Metric Distribution</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Compare accuracy, macro-averaged F1, and CPU/GPU inference latency across the evaluated models.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={selectedMetric === 'macro_f1' ? 'primary-button' : 'secondary-button'}
              onClick={() => setSelectedMetric('macro_f1')}
              type="button"
            >
              Macro-F1
            </button>
            <button
              className={selectedMetric === 'accuracy' ? 'primary-button' : 'secondary-button'}
              onClick={() => setSelectedMetric('accuracy')}
              type="button"
            >
              Accuracy
            </button>
            <button
              className={selectedMetric === 'latency_ms' ? 'primary-button' : 'secondary-button'}
              onClick={() => setSelectedMetric('latency_ms')}
              type="button"
            >
              Latency (ms)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
          {comparisons.map((c) => {
            const val = c[selectedMetric];
            const maxVal = selectedMetric === 'latency_ms' ? 100 : 1.0;
            const pct = Math.min(100, Math.round((Number(val) / maxVal) * 100));
            return (
              <div key={c.id} style={{ display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{c.name}</strong>
                  <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>
                    {selectedMetric === 'latency_ms' ? `${val} ms` : Number(val).toFixed(3)}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-primary, #0e1520)', height: '10px', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      background: selectedMetric === 'latency_ms' ? 'var(--accent-amber, #f59e0b)' : 'var(--accent-teal, #10b981)',
                      height: '100%',
                      borderRadius: '5px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="section-head" style={{ marginTop: '32px' }}>
        <div>
          <div className="eyebrow">DETAILED ARCHITECTURAL MATRIX</div>
          <h2>Model Specification & Tradeoff Matrix</h2>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Model Name</th>
              <th>Family</th>
              <th>Accuracy</th>
              <th>Macro-F1</th>
              <th>Weighted-F1</th>
              <th>Latency</th>
              <th>Model Size</th>
              <th>Hardware</th>
              <th>Key Strengths & Low-Resource Fit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>Loading comparison benchmarks…</td>
              </tr>
            ) : (
              comparisons.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {item.architecture}
                    </div>
                  </td>
                  <td>
                    <span className="tag">{item.family}</span>
                  </td>
                  <td><b>{item.accuracy.toFixed(3)}</b></td>
                  <td><b style={{ color: 'var(--accent-teal)' }}>{item.macro_f1.toFixed(3)}</b></td>
                  <td>{item.weighted_f1.toFixed(3)}</td>
                  <td>{item.latency_ms} ms</td>
                  <td>{item.model_size_mb} MB</td>
                  <td>
                    <span className={item.gpu_required ? 'unavailable' : 'available'}>
                      {item.gpu_required ? 'GPU Required' : 'CPU Native'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', lineHeight: '1.5' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>{item.strengths}</div>
                    <div style={{ color: 'var(--accent-pink, #ef4444)', marginTop: '4px' }}>{item.weaknesses}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="callout" style={{ marginTop: '24px' }}>
        <strong>Key Research Finding (Unit V):</strong> While multilingual transformers like XLM-RoBERTa achieve the highest semantic generalization (+6.4% Macro-F1 over SVM), TF-IDF + Linear SVM is 24x faster (3.2 ms vs 78 ms) and uses 100x less memory (10.5 MB vs 1.1 GB), making it the optimal architecture for real-time edge deployment on Dravidian low-resource code-mixed inputs.
      </div>
    </>
  );
}
