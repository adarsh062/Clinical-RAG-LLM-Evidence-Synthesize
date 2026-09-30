import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import CaseForm from './components/CaseForm';
import ClinicalResults from './components/ClinicalResults';
import LoadingModal from './components/LoadingModal';
import { parseClinicalReasoning } from './utils/parser';

export default function App() {
  // Navigation: 'home' -> 'form' -> 'output'
  const [currentView, setCurrentView] = useState('home');
  const [patientData, setPatientData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyzeCase = async (formData) => {
    setIsLoading(true);
    setServerError(null);
    setPatientData(formData);

    const fullHistoryText = formData.compiledQuery || formData.history;

    try {
      // Send request to Flask backend (/analyse)
      const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
      const res = await fetch(`${backendBaseUrl}/analyse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: fullHistoryText,
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

      // Parse the textbook-grounded reasoning from Gemini
      const parsed = parseClinicalReasoning(json.result);
      setAnalysisResult(parsed);
      setCurrentView('output');
    } catch (err) {
      console.error('Backend /analyse API call failed:', err);
      // Strictly NO fake fallback results! Show real error to user
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
      {/* Universal Fixed Top Navbar across Home, Form, and Results */}
      <Navbar 
        currentView={currentView}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateForm={() => setCurrentView('form')}
        onNavigateOutput={() => {
          if (analysisResult) setCurrentView('output');
        }}
        hasResults={Boolean(analysisResult)}
      />

      {isLoading && <LoadingModal />}

      {currentView === 'home' && (
        <HomePage onStartPracticing={() => setCurrentView('form')} />
      )}

      {currentView === 'form' && (
        <CaseForm 
          onAnalyze={handleAnalyzeCase} 
          isLoading={isLoading} 
          serverError={serverError}
          onClearError={() => setServerError(null)}
          onNavigateHome={() => setCurrentView('home')}
        />
      )}

      {currentView === 'output' && (
        <ClinicalResults
          data={analysisResult}
          patientData={patientData}
          onBack={() => setCurrentView('form')}
          onNavigateHome={() => setCurrentView('home')}
          onNewCase={() => {
            setPatientData(null);
            setAnalysisResult(null);
            setCurrentView('form');
          }}
        />
      )}
    </div>
  );
}
