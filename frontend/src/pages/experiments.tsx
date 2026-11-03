import { useEffect, useState } from 'react';
import { getDatasets, getExperiments, runExperiment } from '../services/api';
import type { Dataset, ExperimentRun } from '../types';
import LabNav from '../components/labnav';

export default function Experiments() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [dataset, setDataset] = useState('');
  const [task, setTask] = useState('sentiment');
  const [category, setCategory] = useState('sentiment');
  const [groupColumn, setGroupColumn] = useState('');
  const [family, setFamily] = useState('tfidf_lr');
  const [textColumn, setTextColumn] = useState('text');
  const [labelColumn, setLabelColumn] = useState('sentiment');
  const [testSize, setTestSize] = useState(0.25);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [d, r] = await Promise.all([getDatasets(), getExperiments()]);
      setDatasets(d.datasets);
      setRuns(r.experiments);
      if (!dataset && d.datasets[0]) setDataset(d.datasets[0].path);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load experiment data');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function run() {
    setBusy(true);
    setError('');
    try {
      await runExperiment({
        dataset_path: dataset,
        task,
        category,
        group_column: groupColumn || undefined,
        model: family,
        text_column: textColumn,
        label_column: labelColumn,
        test_size: testSize,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed');
    } finally {
      setBusy(false);
    }
  }

  const filteredRuns =
    filterCategory === 'ALL'
      ? runs
      : runs.filter((r) => r.category === filterCategory || r.task === filterCategory);

  return (
    <>
      <LabNav />
      <div className="intro">
        <div>
          <div className="eyebrow">REPRODUCIBLE RESEARCH EVALUATION</div>
          <p>
            Conduct empirical benchmark evaluations on held-out test splits. Slices performance across Native vs Romanized,
            Monolingual vs Code-Mixed, and Preprocessing conditions.
          </p>
        </div>
        <span className="tag">DETERMINISTIC SEED 42</span>
      </div>

      <section className="form-panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">RUN EXPERIMENTAL BENCHMARK</div>
            <h2>Configure & Train Evaluation Run</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Dataset
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              <option value="">Choose CSV</option>
              {datasets.map((d) => (
                <option key={d.path} value={d.path}>
                  {d.path}
                </option>
              ))}
            </select>
          </label>
          <label>
            Task
            <select
              value={task}
              onChange={(e) => {
                const newTask = e.target.value;
                setTask(newTask);
                setLabelColumn(newTask);
                if (newTask === 'language') setCategory('language_identification');
                else setCategory(newTask);
              }}
            >
              <option value="sentiment">Sentiment (Positive, Negative, Neutral)</option>
              <option value="intent">Intent (8 Domain Categories)</option>
              <option value="language">Language Identification</option>
            </select>
          </label>
          <label>
            Experiment Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="sentiment">Sentiment</option>
              <option value="intent">Intent</option>
              <option value="language_identification">Language Identification</option>
              <option value="native_vs_romanized">Native vs Romanized</option>
              <option value="monolingual_vs_codemixed">Monolingual vs Code-Mixed</option>
              <option value="ablation">Preprocessing Ablation</option>
              <option value="error_analysis">Error Analysis</option>
            </select>
          </label>
          <label>
            Model Architecture
            <select value={family} onChange={(e) => setFamily(e.target.value)}>
              <option value="tfidf_lr">TF-IDF + Logistic Regression</option>
              <option value="tfidf_svm">TF-IDF + Linear SVM</option>
            </select>
          </label>
          <label>
            Text Column
            <input value={textColumn} onChange={(e) => setTextColumn(e.target.value)} />
          </label>
          <label>
            Label Column
            <input value={labelColumn} onChange={(e) => setLabelColumn(e.target.value)} />
          </label>
          <label>
            Condition / Group Column
            <input
              value={groupColumn}
              onChange={(e) => setGroupColumn(e.target.value)}
              placeholder="e.g. text_form, language"
            />
          </label>
          <label>
            Holdout Test Split
            <select value={testSize} onChange={(e) => setTestSize(Number(e.target.value))}>
              <option value={0.2}>20% Holdout</option>
              <option value={0.25}>25% Holdout</option>
              <option value={0.3}>30% Holdout</option>
            </select>
          </label>
        </div>
        <button className="primary-button" disabled={busy || !dataset} onClick={() => void run()}>
          {busy ? 'Running evaluation pipeline…' : 'Run Empirical Evaluation →'}
        </button>
      </section>

      {error && <div className="error">{error}</div>}

      <div className="section-head" style={{ marginTop: '28px' }}>
        <div>
          <div className="eyebrow">SAVED BENCHMARK RUNS</div>
          <h2>
            {filteredRuns.length} of {runs.length} Recorded Runs
          </h2>
        </div>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {[
          { id: 'ALL', label: 'All Experiments' },
          { id: 'sentiment', label: 'Sentiment' },
          { id: 'intent', label: 'Intent' },
          { id: 'language_identification', label: 'Language ID' },
          { id: 'native_vs_romanized', label: 'Native vs Romanized' },
          { id: 'monolingual_vs_codemixed', label: 'Mono vs Code-Mixed' },
          { id: 'ablation', label: 'Ablation' },
        ].map((f) => (
          <button
            key={f.id}
            className={filterCategory === f.id ? 'primary-button' : 'secondary-button'}
            style={{ padding: '7px 12px', fontSize: '12px' }}
            onClick={() => setFilterCategory(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredRuns.length === 0 ? (
        <div className="placeholder-panel">
          <p>No evaluation runs matching filter. Run an evaluation using the panel above.</p>
        </div>
      ) : (
        <div className="run-list" style={{ display: 'grid', gap: '20px' }}>
          {filteredRuns.map((r) => (
            <article className="run-card" key={r.id}>
              <div className="run-heading">
                <div>
                  <div className="eyebrow">
                    {(r.category || r.task).toUpperCase()} · {r.model.toUpperCase()}
                  </div>
                  <h3>{r.dataset}</h3>
                  <small>
                    {new Date(r.created_at).toLocaleString()} · Train: {r.train_rows} rows | Test: {r.test_rows} rows
                  </small>
                </div>
                <code>Run ID: {r.id}</code>
              </div>

              {/* Metric Overview Grid */}
              <div className="metrics">
                {Object.entries(r.metrics).map(([name, value]) => (
                  <div className="metric-card" key={name}>
                    <span>{name.replace(/_/g, ' ').toUpperCase()}</span>
                    <b>{typeof value === 'number' ? value.toFixed(3) : String(value)}</b>
                  </div>
                ))}
              </div>

              {/* Condition breakdown table if group_column present */}
              {(r.condition_metrics?.length ?? 0) > 0 && (
                <div className="condition-metrics">
                  <h4>Held-out Performance Sliced by '{r.group_column}'</h4>
                  {r.condition_metrics.map((c) => (
                    <div className="condition-row" key={c.condition}>
                      <strong>{c.condition}</strong>
                      <span>({c.rows} samples)</span>
                      {Object.entries(c.metrics).map(([name, value]) => (
                        <span key={name}>
                          {name.replace(/_/g, ' ')}: <b>{typeof value === 'number' ? value.toFixed(3) : String(value)}</b>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Confusion Matrix */}
              {r.confusion_matrix?.labels && (
                <div className="matrix-wrap" style={{ marginTop: '16px' }}>
                  <h4>Confusion Matrix · Actual Rows vs Predicted Columns</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Actual \ Predicted</th>
                        {r.confusion_matrix.labels.map((l) => (
                          <th key={l}>{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.confusion_matrix.labels.map((label, i) => (
                        <tr key={label}>
                          <th>{label}</th>
                          {r.confusion_matrix.values[i]?.map((value, j) => {
                            const isDiagonal = i === j;
                            const hasValue = value > 0;
                            return (
                              <td
                                key={j}
                                style={{
                                  background: isDiagonal
                                    ? hasValue
                                      ? '#1c3d36'
                                      : 'transparent'
                                    : hasValue
                                    ? '#3b2025'
                                    : 'transparent',
                                  color: isDiagonal && hasValue ? '#72d9b9' : hasValue ? '#ff9b9b' : '#64758a',
                                  fontWeight: hasValue ? 700 : 400,
                                  textAlign: 'center',
                                }}
                              >
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
