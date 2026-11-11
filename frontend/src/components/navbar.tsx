import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  title: string;
  onToggleNav?: () => void;
  isNavOpen?: boolean;
}

export default function Navbar({ title, onToggleNav, isNavOpen = false }: NavbarProps) {
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
      <div className="topbar-left">
        {onToggleNav && (
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={onToggleNav}
            aria-label={isNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isNavOpen}
          >
            <span className="hamburger-icon" aria-hidden="true">
              {isNavOpen ? '✕' : '☰'}
            </span>
          </button>
        )}
        <div className="topbar-titles">
          <div className="eyebrow topbar-eyebrow">MULTILINGUAL NLP RESEARCH · INDIC & CODE-MIXED</div>
          <h1 className="topbar-heading">{title}</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <Link
          to="/assistant"
          className={`nav-btn-assistant ${isAssistantActive ? 'active' : ''}`}
          title="Open AI Multilingual Voice Assistant"
        >
          <span className="live-mic-icon">🎙️</span>
          <span className="nav-btn-assistant-text">Voice Assistant</span>
          <span className="nav-tag-pill">AI Voice</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title="Toggle Light / Dark Mode"
          aria-label="Toggle display theme"
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="theme-toggle-label">{theme === 'dark' ? ' Light' : ' Dark'}</span>
        </button>
      </div>
    </header>
  );
}
