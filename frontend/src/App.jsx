import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import CaseForm from './components/CaseForm';
import ClinicalResults from './components/ClinicalResults';
import LoadingModal from './components/LoadingModal';
import { parseClinicalReasoning } from './utils/parser';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [activeSection, setActiveSection] = useState('clinical'); // 'clinical' or 'pediatrics'
  const [patientData, setPatientData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // When user chooses a section from the 2 options modal
  const handleSelectSectionAndPractice = (section) => {
    setActiveSection(section);
    setCurrentView('form');
  };

  const handleAnalyzeCase = async (formData) => {
    setIsLoading(true);
    setServerError(null);
    setPatientData(formData);

    const fullHistoryText = formData.compiledQuery || formData.history;

    try {
      const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
      const pedBackendUrl = (import.meta.env.VITE_PEDIATRIC_BACKEND_URL || '').replace(/\/$/, '');

      // Support 2 separate Render backends OR a single unified backend
      const targetBase = (activeSection === 'pediatrics' && pedBackendUrl) ? pedBackendUrl : backendBaseUrl;
      const targetEndpoint = (activeSection === 'pediatrics' && !pedBackendUrl && !backendBaseUrl)
        ? '/analyse-pediatric'
        : '/analyse';

      const res = await fetch(`${targetBase}${targetEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: fullHistoryText,
          specialty: activeSection
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(`Server status ${res.status}: ${text.slice(0, 120)}`);
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid server response: ${text.slice(0, 100)}`);
      }

      if (json.error) {
        throw new Error(json.error);
      }

      const parsed = parseClinicalReasoning(json.result);
      setAnalysisResult(parsed);
      setCurrentView('output');
    } catch (err) {
      console.error('Backend /analyse API call failed:', err);
      setAnalysisResult(null);
      setServerError(
        err.message || 'Unable to connect to clinical reasoning server. Please verify backend is active on Render.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="medico-app-root">
      <Navbar 
        currentView={currentView}
        onNavigateHome={() => setCurrentView('home')}
        onStartPractice={() => {
          // If already on form, stay on form; else go to home to choose or set view
          setCurrentView('home');
          // Trigger choice modal by custom event or state
          window.dispatchEvent(new CustomEvent('open-practice-modal'));
        }}
      />

      {isLoading && <LoadingModal />}

      {currentView === 'home' && (
        <HomePage 
          onSelectSectionAndPractice={handleSelectSectionAndPractice}
        />
      )}

      {currentView === 'form' && (
        <CaseForm 
          onAnalyze={handleAnalyzeCase} 
          isLoading={isLoading} 
          serverError={serverError}
          onClearError={() => setServerError(null)}
          onNavigateHome={() => setCurrentView('home')}
          activeSection={activeSection}
          onSwitchSection={(sec) => setActiveSection(sec)}
        />
      )}

      {currentView === 'output' && (
        <ClinicalResults
          data={analysisResult}
          patientData={patientData}
          activeSection={activeSection}
          onBack={() => setCurrentView('form')}
          onNavigateHome={() => setCurrentView('home')}
          onNewCase={() => {
            setPatientData(null);
            setAnalysisResult(null);
            setCurrentView('home');
            window.dispatchEvent(new CustomEvent('open-practice-modal'));
          }}
        />
      )}
    </div>
  );
}
