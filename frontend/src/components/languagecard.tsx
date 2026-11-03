import type { Analysis } from '../types';

export default function LanguageCard({ data }: { data: Analysis }) {
  const isGenuine = data.language.confidence_is_genuine;
  const confText =
    data.language.confidence !== null && isGenuine
      ? `${Math.round(data.language.confidence * 100)}% (Calibrated)`
      : 'Uncalibrated baseline';

  return (
    <div className="info-card">
      <div className="eyebrow">LANGUAGE & SCRIPT</div>
      <h3>{data.language.language}</h3>
      <p style={{ margin: '6px 0 10px', fontSize: '12px' }}>
        Primary script: <b>{data.script.primary}</b> · {confText}
      </p>

      {data.language.explanation && (
        <div className="explain-box" style={{ marginBottom: '10px' }}>
          <div className="explain-title">💡 Why Detected:</div>
          <div>{data.language.explanation}</div>
        </div>
      )}

      <div className="chips">
        {data.script.scripts.map((s) => (
          <span key={s}>{s}</span>
        ))}
        {data.romanized && <span>Romanized Latin</span>}
        {data.language.form && <span>{data.language.form}</span>}
      </div>
    </div>
  );
}
