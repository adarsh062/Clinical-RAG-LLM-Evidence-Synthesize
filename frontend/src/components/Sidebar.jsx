import React from 'react';
import { 
  Stethoscope, 
  LayoutDashboard, 
  PlusSquare, 
  CheckSquare, 
  FolderLock, 
  Settings, 
  GraduationCap,
  Home
} from 'lucide-react';

export default function Sidebar({ currentView, onNavigate }) {
  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div 
        className="sidebar-brand" 
        onClick={() => onNavigate('home')} 
        role="button" 
        tabIndex={0}
        title="Return to Home"
      >
        <div className="brand-icon-wrapper">
          <Stethoscope className="brand-icon" size={24} />
        </div>
        <span className="brand-name">Medico</span>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        <button 
          className={`sidebar-link ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        <button 
          className="sidebar-link disabled"
          title="Dashboard view (simplified for now)"
          disabled
        >
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </button>

        <button 
          className={`sidebar-link ${currentView === 'form' || currentView === 'output' ? 'active' : ''}`}
          onClick={() => onNavigate('form')}
        >
          <PlusSquare size={19} />
          <span>New Case</span>
        </button>

        <button 
          className="sidebar-link disabled"
          title="Practice Cases"
          disabled
        >
          <CheckSquare size={19} />
          <span>Practice Cases</span>
        </button>

        <button 
          className="sidebar-link disabled"
          title="My Cases"
          disabled
        >
          <FolderLock size={19} />
          <span>My Cases</span>
        </button>

        <button 
          className="sidebar-link disabled"
          title="Settings"
          disabled
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Educational Tool Card at bottom */}
      <div className="sidebar-footer-card">
        <div className="footer-card-icon">
          <GraduationCap size={20} />
        </div>
        <div className="footer-card-content">
          <strong>Educational Tool</strong>
          <p>Not a substitute for professional diagnosis.</p>
        </div>
      </div>
    </aside>
  );
}
