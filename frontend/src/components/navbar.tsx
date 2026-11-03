import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ title }: { title: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  const location = useLocation();
  const isAssistantActive = location.pathname.startsWith('/assistant');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">MULTILINGUAL NLP RESEARCH · INDIC & CODE-MIXED</div>
        <h1>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Link
          to="/assistant"
          className={`nav-btn-assistant ${isAssistantActive ? 'active' : ''}`}
          title="Open AI Multilingual Voice Assistant"
        >
          <span className="live-mic-icon">🎙️</span>
          <span>Voice Assistant</span>
          <span className="nav-tag-pill">AI Voice</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title="Toggle Light / Dark Mode"
          aria-label="Toggle display theme"
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </header>
  );
}
