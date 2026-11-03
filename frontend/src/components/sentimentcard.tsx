import type { Analysis } from '../types';

export default function SentimentCard({ data }: { data: Analysis }) {
  const isGenuine = data.sentiment.confidence_is_genuine;
  const confText =
    data.sentiment.confidence !== null && isGenuine
      ? `${Math.round(data.sentiment.confidence * 100)}% (Genuine cue evidence)`
      : 'Omitted (Neutral baseline / no cues)';

  const posCues = data.sentiment.positive_cues ?? [];
  const negCues = data.sentiment.negative_cues ?? [];

  return (
    <div className="info-card">
      <div className="eyebrow">SENTIMENT POLARITY</div>
      <h3 className={'sent-' + (data.sentiment.label ? data.sentiment.label.toLowerCase() : 'neutral')}>
        {data.sentiment.label}
      </h3>
      <p style={{ margin: '6px 0 10px', fontSize: '12px' }}>
        Confidence: <b>{confText}</b>
      </p>

      {data.sentiment.explanation && (
        <div className="explain-box" style={{ marginBottom: '10px' }}>
          <div className="explain-title">💡 Why Detected:</div>
          <div>{data.sentiment.explanation}</div>
        </div>
      )}

      {(posCues.length > 0 || negCues.length > 0) && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {posCues.map((cue) => (
            <span key={cue} className="cue-pill positive">
              +{cue}
            </span>
          ))}
          {negCues.map((cue) => (
            <span key={cue} className="cue-pill negative">
              -{cue}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
