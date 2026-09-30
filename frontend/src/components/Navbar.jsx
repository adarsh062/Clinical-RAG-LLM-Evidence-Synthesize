import React from 'react';
import { Stethoscope, ArrowRight, Home } from 'lucide-react';

export default function Navbar({ 
  currentView, 
  onNavigateHome, 
  onNavigateForm, 
  onNavigateOutput, 
  hasResults 
}) {
  return (
    <header className="fixed-app-nav">
      <div className="nav-container">
        {/* Brand */}
        <div 
          className="nav-brand" 
          onClick={onNavigateHome} 
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
            className={`nav-tab-link ${currentView === 'home' ? 'active' : ''}`}
            onClick={onNavigateHome}
          >
            <Home size={15} />
            <span>Home</span>
          </button>
        </nav>

        {/* Right CTA Button */}
        <div className="nav-actions">
          {currentView === 'home' && (
            <button 
              className="nav-cta-btn" 
              onClick={onNavigateForm}
              id="nav-practice-btn"
            >
              <span>Practice Case</span>
              <ArrowRight size={14} />
            </button>
          )}

          {currentView === 'form' && (
            <button 
              className="nav-secondary-btn" 
              onClick={onNavigateHome}
            >
              <span>Back to Home</span>
            </button>
          )}

          {currentView === 'output' && (
            <button 
              className="nav-cta-btn" 
              onClick={onNavigateForm}
              id="nav-new-case-btn"
            >
              <span>+ New Case</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
