import { useEffect, useState } from 'react';
import { getExperiments } from '../services/api';
import type { ExperimentRun } from '../types';
import LabNav from '../components/labnav';

export default function ErrorAnalysis() {
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [selected, setSelected] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    getExperiments()
      .then((r) => {
        setRuns(r.experiments);
        setSelected(r.experiments[0]?.id ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load saved errors'));
  }, []);

  const run = runs.find((r) => r.id === selected);
  const allErrors = run?.errors ?? [];
  const filteredErrors =
    categoryFilter === 'ALL'
      ? allErrors
      : allErrors.filter((e) => e.category === categoryFilter);

  // Group counts by category
  const categoryCounts = allErrors.reduce((acc, curr) => {
    const cat = curr.category || 'Rare Word / OOV';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <LabNav />
      <div className="intro">
        <div>
          <div className="eyebrow">EMPIRICAL ERROR TAXONOMY & QUALITATIVE ANALYSIS</div>
          <p>
            Inspect held-out misclassifications categorized across Romanization ambiguity, spelling variation,
            code-switching boundaries, lexical polysemy, negation reversal, and out-of-vocabulary terms.
          </p>
        </div>
        {runs.length > 0 && (
          <select
            aria-label="Evaluation run"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ maxWidth: '320px' }}
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.task.toUpperCase()} ({r.category}) · {r.model} · {r.id}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {!run ? (
        <div className="placeholder-panel">
          <h2>No evaluation errors available</h2>
          <p>Run an evaluation on the Experiments page. Error examples are saved with the result.</p>
        </div>
      ) : allErrors.length === 0 ? (
        <div className="placeholder-panel">
          <h2>No mistakes in this test split</h2>
          <p>The run predicted all {run.test_rows} held-out examples correctly.</p>
        </div>
      ) : (
        <>
          {/* Error Summary Statistics */}
          <div className="metrics" style={{ marginBottom: '20px' }}>
            <div className="metric-card">
              <span>TOTAL TEST SAMPLES</span>
              <b>{run.test_rows}</b>
              <small>Held-out split</small>
            </div>
            <div className="metric-card">
              <span>MISCLASSIFIED</span>
              <b style={{ color: '#ff9b9b' }}>{allErrors.length}</b>
              <small>Error rate: {((allErrors.length / run.test_rows) * 100).toFixed(1)}%</small>
            </div>
            <div className="metric-card">
              <span>TOP FAILURE MODE</span>
              <b style={{ fontSize: '18px', color: '#e7bf75' }}>
                {Object.keys(categoryCounts).length > 0
                  ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0].split(' ')[0]
                  : 'N/A'}
              </b>
              <small>Linguistic vulnerability</small>
            </div>
            <div className="metric-card">
              <span>MODEL EVALUATED</span>
              <b style={{ fontSize: '18px', color: '#72d9b9' }}>{run.model}</b>
              <small>Task: {run.task}</small>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <button
              className={categoryFilter === 'ALL' ? 'primary-button' : 'secondary-button'}
              onClick={() => setCategoryFilter('ALL')}
            >
              All Errors ({allErrors.length})
            </button>
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <button
                key={cat}
                className={categoryFilter === cat ? 'primary-button' : 'secondary-button'}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat} ({count})
              </button>
            ))}
          </div>

          <div className="section-head">
            <div>
              <div className="eyebrow">{run.task.toUpperCase()} · {run.model}</div>
              <h2>
                Showing {filteredErrors.length} of {allErrors.length} Misclassified Sentences
              </h2>
            </div>
          </div>

          <div className="error-table">
            {filteredErrors.map((item, i) => (
              <article className="error-example" key={`${run.id}-${i}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className="tag" style={{ background: '#253342', color: '#e7bf75', fontWeight: 600 }}>
                    {item.category || 'Linguistic Error'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8291a3' }}>Example #{i + 1}</span>
                </div>

                <p style={{ fontSize: '15px', fontWeight: 500, margin: '8px 0 12px' }}>
                  "{item.text}"
                </p>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span className="expected">
                    <b>Expected (Gold):</b> {item.expected}
                  </span>
                  <span className="predicted">
                    <b>Predicted (Model):</b> {item.predicted}
                  </span>
                </div>

                {item.explanation && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#101720',
                      borderRadius: '8px',
                      borderLeft: '3px solid #e7bf75',
                      fontSize: '12px',
                      color: '#b8c5d3',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Linguistic Diagnosis: </strong>
                    {item.explanation}
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
