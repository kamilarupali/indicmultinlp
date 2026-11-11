import { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './components/sidebar';
import Navbar from './components/navbar';
import Home from './pages/home';
import Dashboard from './pages/dashboard';
import Analyzer from './pages/analyzer';
import ResearchHub from './pages/hub';
import ModelLab from './pages/modellab';
import DatasetExplorer from './pages/datasetexplorer';
import ErrorAnalysis from './pages/erroranalysis';
import VoiceAssistant from './pages/voiceassistant';
import ExampleDemo from './pages/demo';
import AboutProject from './pages/about';

class PageErrorBoundary extends Component<{ children: ReactNode; title: string }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; title: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Page render error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: { title: string }) {
    if (prevProps.title !== this.props.title && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', textAlign: 'center', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', margin: '20px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Unable to display {this.props.title}
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 18px' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering this section.'}
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            🔄 Try Reloading Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const pages: { [key: string]: [string, () => JSX.Element] } = {
  '/': ['Overview', Home],
  '/dashboard': ['Project Dashboard', Dashboard],
  '/demo': ['Example Demo', ExampleDemo],
  '/about': ['About the Project', AboutProject],
  '/analyzer': ['Live Analyzer', Analyzer],
  '/assistant': ['Voice Assistant', VoiceAssistant],
  '/hub': ['Research & Evaluation Hub', ResearchHub],
  '/comparison': ['Model Comparison', ResearchHub],
  '/experiments': ['Experiment Lab', ResearchHub],
  '/research': ['Research & Syllabus', ResearchHub],
  '/model-lab': ['Model Lab', ModelLab],
  '/datasets': ['Dataset Information', DatasetExplorer],
  '/errors': ['Error Analysis', ErrorAnalysis],
};

export default function App() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const rawPath = location.pathname;
  const cleanPath = (rawPath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/').toLowerCase();
  const [title, Page] = pages[cleanPath] ?? pages[rawPath] ?? pages['/'];

  // Automatically close mobile drawer navigation whenever route changes
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      <main className="main-area">
        <Navbar
          title={title}
          onToggleNav={() => setIsMobileNavOpen((prev) => !prev)}
          isNavOpen={isMobileNavOpen}
        />
        <div className="page-content">
          <PageErrorBoundary title={title}>
            <Page />
          </PageErrorBoundary>
        </div>
        <footer>
          IndicMultiNLP <span>· Real-Time Multilingual & Code-Mixed NLP Research Platform</span>
        </footer>
      </main>
    </div>
  );
}

