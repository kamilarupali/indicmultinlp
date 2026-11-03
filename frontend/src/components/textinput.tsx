import React from 'react';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onAnalyze: () => void;
  busy: boolean;
}

export default function TextInput({ value, onChange, onAnalyze, busy }: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!busy && value.trim()) {
        onAnalyze();
      }
    }
  }

  return (
    <div className="input-panel">
      <div className="input-panel-header">
        <label htmlFor="sample-text-input" className="input-label">
          <span className="label-title">INPUT TEXT TO ANALYZE</span>
          <span className="label-hint">Enter native Indic script, Romanized orthography, or code-mixed sentences</span>
        </label>
        {value.trim() && (
          <button
            type="button"
            className="clear-text-btn"
            onClick={() => onChange('')}
            title="Clear entered text"
          >
            ✕ Clear
          </button>
        )}
      </div>

      <textarea
        id="sample-text-input"
        className="analyzer-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type or paste sentences in Telugu, Hindi, Tamil, Kannada, English, or code-mixed (e.g., 'Ee movie chala bagundi, hero acting super ga undi')..."
        maxLength={5000}
        rows={4}
      />

      <div className="input-bottom">
        <div className="input-meta">
          <span className="char-count">{value.length} / 5,000 characters</span>
          <span className="shortcut-hint">Press <b>⌘/Ctrl + Enter</b> to run</span>
        </div>
        <button
          type="button"
          className="primary-button run-analyze-btn"
          onClick={onAnalyze}
          disabled={busy || !value.trim()}
        >
          {busy ? (
            <>
              <span className="spinner-inline" /> Analyzing text…
            </>
          ) : (
            <>Analyze text →</>
          )}
        </button>
      </div>
    </div>
  );
}
