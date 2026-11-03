import { NavLink, useLocation } from 'react-router-dom';
import BrandLogo from './logo';

const navItems = [
  { to: '/', label: 'Overview', icon: '🏠', exact: true },
  { to: '/dashboard', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/analyzer', label: 'Live Analyzer', icon: '⚡' },
  { to: '/assistant', label: 'Voice Assistant', icon: '🎙️' },
  { to: '/demo', label: 'Example Demo', icon: '🎯' },
  {
    to: '/hub',
    label: 'Research & Evaluation Hub',
    icon: '🔬',
    aliases: ['/comparison', '/experiments', '/research', '/model-lab', '/errors', '/datasets'],
  },
  { to: '/about', label: 'About Project', icon: 'ℹ️' },
];

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/+$/, '') || '/';

  return (
    <aside className="sidebar">
      <BrandLogo />
      <div className="nav-label">RESEARCH CONSOLE</div>
      <nav>
        {navItems.map((item) => {
          const isItemActive = item.exact
            ? currentPath === item.to
            : currentPath === item.to || Boolean(item.aliases?.includes(currentPath));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`nav-item ${isItemActive ? 'active' : ''}`}
            >
              <span style={{ fontSize: '15px', width: '22px', display: 'inline-flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="side-foot">
        <div className="status-dot" /> Indic NLP Engine Active
      </div>
    </aside>
  );
}
