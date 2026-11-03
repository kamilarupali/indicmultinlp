import type { Analysis } from '../types';

export default function CodeMixCard({ data }: { data: Analysis }) {
  const cmi = data.code_mixing.cmi ?? (data.code_mixing.is_code_mixed ? 35.0 : 0.0);
  return (
    <div className="info-card">
      <div className="eyebrow">CODE-MIXING ANALYSIS</div>
      <h3 style={{ color: data.code_mixing.is_code_mixed ? '#ff758f' : '#72d9b9' }}>
        {data.code_mixing.is_code_mixed ? `Code-Mixed (CMI: ${cmi}%)` : 'Monolingual'}
      </h3>
      <p style={{ margin: '6px 0 10px', fontSize: '12px' }}>{data.code_mixing.note}</p>

      {data.code_mixing.explanation && (
        <div className="explain-box" style={{ marginBottom: '10px' }}>
          <div className="explain-title">💡 Math & Breakdown:</div>
          <div>{data.code_mixing.explanation}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#94a3b5' }}>
        <span>
          Scripts: <b>{data.code_mixing.scripts.join(', ')}</b>
        </span>
        <span>
          Switch points: <b>{data.code_mixing.switch_points ?? 0}</b>
        </span>
      </div>
    </div>
  );
}
