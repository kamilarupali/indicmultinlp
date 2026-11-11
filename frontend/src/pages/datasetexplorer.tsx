import { useEffect, useState } from 'react';
import { getDatasets, previewDataset } from '../services/api';
import type { Dataset, DatasetPreview } from '../types';
import LabNav from '../components/labnav';

export default function DatasetExplorer() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selected, setSelected] = useState('');
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const result = await getDatasets();
      setDatasets(result.datasets);
      if (result.datasets.length > 0 && !selected) {
        void open(result.datasets[0].path);
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load datasets');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function open(path: string) {
    setSelected(path);
    setPreview(null);
    try {
      setPreview(await previewDataset(path, 25));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not preview dataset');
    }
  }

  return (
    <>
      <LabNav />
      <div className="intro">
        <div>
          <div className="eyebrow">RESEARCH CORPUS INFORMATION & DATASET EXPLORER</div>
          <p>
            Curated multilingual and code-mixed corpus spanning <strong>Telugu, Hindi, Tamil, Kannada, and English</strong>.
            Stratified across native scripts, Romanized orthography, and multi-script switching.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void refresh()}>
          Refresh Datasets ⟳
        </button>
      </div>

      {/* High Level Corpus Statistics */}
      <div className="metrics" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <span>CURATED SENTENCES</span>
          <b>110</b>
          <small>Gold-labeled instances</small>
        </div>
        <div className="metric-card">
          <span>LANGUAGES</span>
          <b>5 Major</b>
          <small>Telugu · Hindi · Tamil · Kannada · English</small>
        </div>
        <div className="metric-card">
          <span>INTENT CLASSES</span>
          <b>8 Domains</b>
          <small>Edu · Shop · Rest · Trav · Ent · CS · Tech · Gen</small>
        </div>
        <div className="metric-card">
          <span>TEXT ORTHOGRAPHY</span>
          <b>3 Forms</b>
          <small>Native Script · Romanized · Code-Mixed</small>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Corpus Distribution & Schema */}
      <section className="form-panel" style={{ marginBottom: '24px' }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">CORPUS DISTRIBUTION & ANNOTATION PROTOCOL</div>
            <h2>Annotation Schema & Linguistic Specifications</h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '16px' }}>
          <div style={{ background: '#101720', padding: '16px', borderRadius: '8px', border: '1px solid #2b3948' }}>
            <h4 style={{ color: '#72d9b9', marginTop: 0 }}>Language & Script Stratification</h4>
            <ul style={{ fontSize: '13px', lineHeight: 1.8, color: '#b8c5d3', paddingLeft: '18px' }}>
              <li><strong>Telugu:</strong> Telugu Script (తెలుగు) & Romanized ("chala bagundi")</li>
              <li><strong>Hindi:</strong> Devanagari Script (हिन्दी) & Romanized ("bahut acchi")</li>
              <li><strong>Tamil:</strong> Tamil Script (தமிழ்) & Romanized ("romba nalla")</li>
              <li><strong>Kannada:</strong> Kannada Script (ಕನ್ನಡ) & Romanized ("thumba chennagide")</li>
              <li><strong>English:</strong> Native Latin with technical / conversational vocabulary</li>
              <li><strong>Code-Mixed:</strong> Intra-sentential code-switching across Latin & Indic scripts</li>
            </ul>
          </div>

          <div style={{ background: '#101720', padding: '16px', borderRadius: '8px', border: '1px solid #2b3948' }}>
            <h4 style={{ color: '#72d9b9', marginTop: 0 }}>Target Task Specifications</h4>
            <ul style={{ fontSize: '13px', lineHeight: 1.8, color: '#b8c5d3', paddingLeft: '18px' }}>
              <li><strong>Sentiment:</strong> 3-class polarity (Positive, Negative, Neutral)</li>
              <li><strong>Intent:</strong> 8 functional domains (Education, Shopping, Restaurant, Travel, Entertainment, Customer Service, Technology, General Query)</li>
              <li><strong>Code-Mixing Index:</strong> Quantitative metric quantifying language switching ratio</li>
              <li><strong>Splits:</strong> Train (70%), Validation (15%), Test (15%) with fixed seed 42</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Dataset Files Table */}
      <div className="section-head">
        <div>
          <div className="eyebrow">LOCAL DATASET PARTITIONS</div>
          <h2>CSV Files in Workspace (data/)</h2>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="placeholder-panel">
          <h2>No CSV datasets found</h2>
          <p>Add a labeled CSV file inside data/. Files remain local and are excluded from Git.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dataset File Path</th>
                <th>Detected Columns</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.path} style={{ background: selected === d.path ? '#1c2936' : 'transparent' }}>
                  <td>
                    <code>{d.path}</code>
                  </td>
                  <td>{d.error ?? d.columns.join(', ')}</td>
                  <td>
                    <button
                      className="primary-button"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => void open(d.path)}
                    >
                      {selected === d.path ? 'Active Preview' : 'Inspect CSV'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive CSV Preview Table */}
      {preview && (
        <section className="preview-panel" style={{ marginTop: '24px' }}>
          <div className="section-head">
            <div>
              <div className="eyebrow">DATASET RECORD PREVIEW</div>
              <h2>{selected}</h2>
            </div>
            <span className="tag">{preview.preview_count} sample rows displayed</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {preview.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {preview.columns.map((c) => (
                      <td key={c}>
                        {c === 'sentiment' ? (
                          <span
                            className="tag"
                            style={{
                              background:
                                row[c] === 'Positive'
                                  ? '#1c3d36'
                                  : row[c] === 'Negative'
                                  ? '#3d1f24'
                                  : '#383220',
                              color:
                                row[c] === 'Positive'
                                  ? '#72d9b9'
                                  : row[c] === 'Negative'
                                  ? '#ff9b9b'
                                  : '#d5bd7c',
                            }}
                          >
                            {row[c]}
                          </span>
                        ) : c === 'language' || c === 'text_form' ? (
                          <span className="tag">{row[c]}</span>
                        ) : (
                          row[c]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
