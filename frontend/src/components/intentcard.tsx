import type { Analysis } from '../types';

export default function IntentCard({ data }: { data: Analysis }) {
  const isGenuine = data.intent.confidence_is_genuine;
  const confText =
    data.intent.confidence !== null && isGenuine
      ? `${Math.round(data.intent.confidence * 100)}% (Keyword matches)`
      : 'Omitted (General query baseline)';

  const matchedCues = data.intent.matched_cues ?? [];
  const scores = data.intent.scores;

  return (
    <div className="info-card">
      <div className="eyebrow">INTENT CLASSIFICATION</div>
      <h3 style={{ color: '#79ddc5' }}>{data.intent.label}</h3>
      <p style={{ margin: '6px 0 10px', fontSize: '12px' }}>
        Confidence: <b>{confText}</b>
      </p>

      {data.intent.explanation && (
        <div className="explain-box" style={{ marginBottom: '10px' }}>
          <div className="explain-title">💡 Why Detected:</div>
          <div>{data.intent.explanation}</div>
        </div>
      )}

      {matchedCues.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {matchedCues.map((cue) => (
            <span key={cue} className="cue-pill domain">
              #{cue}
            </span>
          ))}
        </div>
      )}

      {scores && Object.keys(scores).length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {Object.entries(scores)
            .filter(([_, score]) => score > 0)
            .map(([cat, score]) => (
              <span key={cat} className="tag" style={{ background: '#254b49', color: '#79ddc5' }}>
                {cat}: {score}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
