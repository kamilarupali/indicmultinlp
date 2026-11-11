import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ModelComparisonPage from './modelcomparison';
import Experiments from './experiments';
import Research from './research';

export type HubTab = 'comparison' | 'experiments' | 'research';

export default function ResearchHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL query (?tab=...) or fallback based on path
  const getTabFromLocation = (): HubTab => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'experiments' || tabParam === 'comparison' || tabParam === 'research') {
      return tabParam;
    }
    const path = location.pathname.replace(/\/+$/, '');
    if (path === '/experiments' || path === '/model-lab' || path === '/datasets' || path === '/errors') {
      return 'experiments';
    }
    if (path === '/research') {
      return 'research';
    }
    return 'comparison';
  };

  const [activeTab, setActiveTab] = useState<HubTab>(getTabFromLocation);

  useEffect(() => {
    setActiveTab(getTabFromLocation());
  }, [location.pathname, location.search]);

  function switchTab(tab: HubTab) {
    setActiveTab(tab);
    navigate(`/hub?tab=${tab}`);
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Hub Header & Plain Language Area Explanations */}
      <div className="intro" style={{ marginBottom: '18px' }}>
        <div>
          <div className="eyebrow">UNIFIED RESEARCH ENVIRONMENT</div>
          <h2 style={{ margin: '4px 0 6px', fontSize: '24px', fontWeight: 800 }}>
            Research & Evaluation Hub
          </h2>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Central workspace bringing together empirical model benchmarking, repeatable experiment execution, and academic syllabus literature.
          </p>
        </div>
        <span
          className="tag"
          style={{
            color: 'var(--accent-teal)',
            borderColor: 'rgba(114, 217, 185, 0.4)',
            fontSize: '11px',
            padding: '4px 10px',
          }}
        >
          🔬 ACADEMIC RIGOR & BENCHMARKING
        </span>
      </div>

      {/* Plain Language Three-Area Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        <div
          onClick={() => switchTab('comparison')}
          style={{
            padding: '16px',
            background: activeTab === 'comparison' ? 'var(--accent-teal-subtle)' : 'var(--panel-bg)',
            border: activeTab === 'comparison' ? '1.5px solid var(--accent-teal)' : '1px solid var(--border-color)',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: activeTab === 'comparison' ? 'var(--accent-teal)' : 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {activeTab === 'comparison' ? 'Active Area' : 'Click to View'}
            </span>
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>
            Model Comparison
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Compare available models using actual evaluation results. Inspect accuracy, macro-F1, latency, and memory footprints side-by-side.
          </p>
        </div>

        <div
          onClick={() => switchTab('experiments')}
          style={{
            padding: '16px',
            background: activeTab === 'experiments' ? 'var(--accent-teal-subtle)' : 'var(--panel-bg)',
            border: activeTab === 'experiments' ? '1.5px solid var(--accent-teal)' : '1px solid var(--border-color)',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>🧪</span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: activeTab === 'experiments' ? 'var(--accent-teal)' : 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {activeTab === 'experiments' ? 'Active Area' : 'Click to View'}
            </span>
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>
            Experiment Lab
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Run or review experiments that the project really supports. Train classifiers on partitions, inspect confusion matrices, and evaluate slice ablations.
          </p>
        </div>

        <div
          onClick={() => switchTab('research')}
          style={{
            padding: '16px',
            background: activeTab === 'research' ? 'var(--accent-teal-subtle)' : 'var(--panel-bg)',
            border: activeTab === 'research' ? '1.5px solid var(--accent-teal)' : '1px solid var(--border-color)',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>📚</span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: activeTab === 'research' ? 'var(--accent-teal)' : 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {activeTab === 'research' ? 'Active Area' : 'Click to View'}
            </span>
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>
            Research & Syllabus
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Access the project’s research material and academic learning content. Review Units I–V course syllabus coverage and theoretical linguistic formulations.
          </p>
        </div>
      </div>

      {/* Tab Switcher Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => switchTab('comparison')}
          className={activeTab === 'comparison' ? 'primary-button' : 'secondary-button'}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📊</span>
          <span>Model Comparison</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('experiments')}
          className={activeTab === 'experiments' ? 'primary-button' : 'secondary-button'}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🧪</span>
          <span>Experiment Lab</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('research')}
          className={activeTab === 'research' ? 'primary-button' : 'secondary-button'}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📚</span>
          <span>Research & Syllabus</span>
        </button>
      </div>

      {/* Render Distinct Area Components */}
      <div className="hub-content-area">
        {activeTab === 'comparison' && <ModelComparisonPage />}
        {activeTab === 'experiments' && <Experiments />}
        {activeTab === 'research' && <Research />}
      </div>
    </div>
  );
}
