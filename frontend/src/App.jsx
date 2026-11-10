import React, { useState } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate 
} from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import CaseForm from './components/CaseForm';
import ClinicalResults from './components/ClinicalResults';
import AdminDashboard from './components/AdminDashboard';
import LoadingModal from './components/LoadingModal';
import { parseClinicalReasoning } from './utils/parser';

function AppContent() {
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('medico_patient_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [analysisResult, setAnalysisResult] = useState(() => {
    try {
      const saved = sessionStorage.getItem('medico_analysis_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeSection, setActiveSection] = useState('clinical');
  const [serverError, setServerError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectSectionAndPractice = (section) => {
    setActiveSection(section);
    navigate(`/practice/${section}`);
  };

  const handleAnalyzeCase = async (formData, section) => {
    setIsLoading(true);
    setServerError(null);
    setPatientData(formData);
    setActiveSection(section);

    try {
      sessionStorage.setItem('medico_patient_data', JSON.stringify(formData));
    } catch {}

    const fullHistoryText = formData.compiledQuery || formData.history;

    try {
      const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
      const pedBackendUrl = (import.meta.env.VITE_PEDIATRIC_BACKEND_URL || '').replace(/\/$/, '');

      const targetBase = (section === 'pediatrics' && pedBackendUrl) ? pedBackendUrl : backendBaseUrl;
      const targetEndpoint = (section === 'pediatrics' && !pedBackendUrl && !backendBaseUrl)
        ? '/analyse-pediatric'
        : '/analyse';

      const res = await fetch(`${targetBase}${targetEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: fullHistoryText,
          specialty: section
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
      const enrichedResult = {
        ...parsed,
        caseId: json.caseId
      };
      setAnalysisResult(enrichedResult);
      try {
        sessionStorage.setItem('medico_analysis_result', JSON.stringify(enrichedResult));
      } catch {}

      // Navigate to results page (enables browser Back/Forward)
      navigate('/results');
    } catch (err) {
      console.error('Backend /analyse API call failed:', err);
      setAnalysisResult(null);
      setServerError(
        err.message || 'Unable to connect to reasoning server. Please verify backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="medico-app-root">
      <Navbar 
        onStartPractice={() => {
          window.dispatchEvent(new CustomEvent('open-practice-modal'));
        }}
      />

      {isLoading && <LoadingModal />}

      <Routes>
        {/* Route 1: Home Page */}
        <Route 
          path="/" 
          element={
            <HomePage 
              onSelectSectionAndPractice={handleSelectSectionAndPractice}
            />
          } 
        />

        {/* Route 2: Clinical Practice Page */}
        <Route 
          path="/practice/clinical" 
          element={
            <CaseForm 
              activeSection="clinical"
              onAnalyze={(formData) => handleAnalyzeCase(formData, 'clinical')}
              isLoading={isLoading}
              serverError={serverError}
              onClearError={() => setServerError(null)}
              onNavigateHome={() => navigate('/')}
              onSwitchSection={() => navigate('/practice/pediatrics')}
            />
          } 
        />

        {/* Route 3: Pediatrics Practice Page */}
        <Route 
          path="/practice/pediatrics" 
          element={
            <CaseForm 
              activeSection="pediatrics"
              onAnalyze={(formData) => handleAnalyzeCase(formData, 'pediatrics')}
              isLoading={isLoading}
              serverError={serverError}
              onClearError={() => setServerError(null)}
              onNavigateHome={() => navigate('/')}
              onSwitchSection={() => navigate('/practice/clinical')}
            />
          } 
        />

        {/* Route 4: Results Dashboard */}
        <Route 
          path="/results" 
          element={
            analysisResult ? (
              <ClinicalResults 
                data={analysisResult}
                patientData={patientData}
                activeSection={activeSection}
                onBack={() => navigate(-1)}
                onNavigateHome={() => navigate('/')}
                onNewCase={() => {
                  setPatientData(null);
                  setAnalysisResult(null);
                  try {
                    sessionStorage.removeItem('medico_patient_data');
                    sessionStorage.removeItem('medico_analysis_result');
                  } catch {}
                  navigate('/');
                  window.dispatchEvent(new CustomEvent('open-practice-modal'));
                }}
              />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Route 5: Private Admin Dashboard (No signin/signup required) */}
        <Route 
          path="/admin" 
          element={<AdminDashboard />} 
        />

        {/* Catch-all: Redirect unknown routes to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
