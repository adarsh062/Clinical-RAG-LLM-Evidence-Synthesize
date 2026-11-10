import React from 'react';
import { Stethoscope, ArrowRight, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ onStartPractice }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const isHome = pathname === '/';
  const isForm = pathname.startsWith('/practice');
  const isResults = pathname === '/results';
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="fixed-app-nav">
      <div className="nav-container">
        {/* Brand */}
        <div 
          className="nav-brand" 
          onClick={() => navigate('/')} 
          role="button" 
          tabIndex={0}
          title="Medico Clinical Reasoning"
        >
          <div className="brand-icon-wrapper">
            <Stethoscope className="brand-icon" size={24} />
          </div>
          <span className="brand-name">Medico</span>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="nav-links">
          <button 
            type="button"
            className={`nav-tab-link ${isHome ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <Home size={15} />
            <span>Home</span>
          </button>
        </nav>

        {/* Right CTA Button */}
        <div className="nav-actions">
          {isHome && (
            <button 
              className="nav-cta-btn" 
              onClick={onStartPractice}
              id="nav-practice-btn"
            >
              <span>Practice Case</span>
              <ArrowRight size={14} />
            </button>
          )}

          {isForm && (
            <button 
              className="nav-secondary-btn" 
              onClick={() => navigate('/')}
            >
              <span>Back to Home</span>
            </button>
          )}

          {isResults && (
            <button 
              className="nav-cta-btn" 
              onClick={onStartPractice}
              id="nav-new-case-btn"
            >
              <span>+ New Case</span>
            </button>
          )}

          {isAdmin && (
            <button 
              className="nav-secondary-btn" 
              onClick={() => navigate('/')}
            >
              <span>Exit Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
