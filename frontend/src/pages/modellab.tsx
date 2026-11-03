import { useEffect, useState } from 'react';
import ModelCard from '../components/modelcard';
import LabNav from '../components/labnav';
import { getDatasets, getModels, trainModel } from '../services/api';
import type { Dataset, ModelInfo } from '../types';

export default function ModelLab() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dataset, setDataset] = useState('');
  const [task, setTask] = useState('sentiment');
  const [family, setFamily] = useState('tfidf_lr');
  const [textColumn, setTextColumn] = useState('text');
  const [labelColumn, setLabelColumn] = useState('sentiment');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [m, d] = await Promise.all([getModels(), getDatasets()]);
      setModels(m.models);
      setDatasets(d.datasets);
      if (!dataset && d.datasets[0]) setDataset(d.datasets[0].path);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load models and datasets');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function train() {
    if (!dataset) {
      setNotice('Add a CSV dataset under data/ first.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const result = await trainModel({
        dataset_path: dataset,
        task,
        text_column: textColumn,
        label_column: labelColumn,
        model: family,
      });
      setNotice(`Saved ${result.id} using ${result.training_rows} rows and labels: ${result.labels.join(', ')}`);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Training failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <LabNav />
      <div className="intro">
        <div>
          <div className="eyebrow">MODEL REGISTRY & TRAINING LAB</div>
          <p>Train custom TF-IDF and Linear classifiers from labeled CSV datasets and register them in the live analyzer.</p>
        </div>
        <span className="tag">BASELINE + TRAINABLE CLASSIFIERS</span>
      </div>
      <div className="model-panel">
        {models.map((m) => (
          <ModelCard key={m.id} name={`${m.name}${m.id.includes(':') ? ` · ${m.tasks[0]}` : ''}`} available={m.available} />
        ))}
      </div>
      <section className="form-panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">TRAIN CLASSIFIER</div>
            <h2>Fit from your labeled data</h2>
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
                setTask(e.target.value);
                setLabelColumn(e.target.value);
              }}
            >
              <option value="sentiment">Sentiment</option>
              <option value="intent">Intent</option>
              <option value="language">Language</option>
            </select>
          </label>
          <label>
            Model family
            <select value={family} onChange={(e) => setFamily(e.target.value)}>
              <option value="tfidf_lr">TF-IDF + Logistic Regression</option>
              <option value="tfidf_svm">TF-IDF + Linear SVM</option>
            </select>
          </label>
          <label>
            Text column
            <input value={textColumn} onChange={(e) => setTextColumn(e.target.value)} />
          </label>
          <label>
            Label column
            <input value={labelColumn} onChange={(e) => setLabelColumn(e.target.value)} />
          </label>
        </div>
        <button className="primary-button" disabled={busy || !dataset} onClick={() => void train()}>
          {busy ? 'Training…' : 'Train and save model'}
        </button>
        {notice && <p className="notice">{notice}</p>}
      </section>
      <div className="callout">
        A model marked unavailable needs training data. Training saves a local artifact under models/&lt;task&gt;; evaluate it on held-out data before using its results in research.
      </div>
    </>
  );
}
