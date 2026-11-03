import { NavLink } from 'react-router-dom';

export default function LabNav() {
  return (
    <div className="lab-subnav" role="tablist" aria-label="Research and Evaluation Modules">
      <NavLink
        to="/experiments"
        className={({ isActive }) => (isActive ? 'pill-tab active' : 'pill-tab')}
      >
        🧪 Experiments & Benchmarks
      </NavLink>
      <NavLink
        to="/model-lab"
        className={({ isActive }) => (isActive ? 'pill-tab active' : 'pill-tab')}
      >
        🔬 Model Training Lab
      </NavLink>
      <NavLink
        to="/errors"
        className={({ isActive }) => (isActive ? 'pill-tab active' : 'pill-tab')}
      >
        🔍 Error Taxonomy
      </NavLink>
      <NavLink
        to="/datasets"
        className={({ isActive }) => (isActive ? 'pill-tab active' : 'pill-tab')}
      >
        📁 Dataset Explorer
      </NavLink>
    </div>
  );
}
