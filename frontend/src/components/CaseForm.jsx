import React, { useState } from 'react';
import { 
  ArrowRight, 
  RotateCcw, 
  Plus, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Stethoscope, 
  ArrowLeft,
  BookOpen,
  User
} from 'lucide-react';
import { SAMPLE_CASE } from '../utils/parser';

export default function CaseForm({ onAnalyze, isLoading, onNavigateHome }) {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleClear = () => {
    setAge('');
    setGender('Male');
    setChiefComplaint('');
    setClinicalHistory('');
    setValidationError('');
  };

  const handleLoadSample = () => {
    setAge(SAMPLE_CASE.age);
    setGender(SAMPLE_CASE.gender);
    setChiefComplaint(SAMPLE_CASE.chiefComplaint);
    setClinicalHistory(SAMPLE_CASE.history);
    setValidationError('');
  };

  const handleAppendSection = (title) => {
    const addition = `\n\n[${title}]:\n`;
    setClinicalHistory((prev) => (prev ? prev.trim() + addition : `[${title}]:\n`));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clinicalHistory.trim() && !chiefComplaint.trim()) {
      setValidationError("Please enter the patient's clinical history or chief complaint to analyze.");
      return;
    }

    setValidationError('');
    
    // Format full query text for ChromaDB vector search + Gemini RAG prompt
    let compiledHistory = '';
    if (age || gender) {
      compiledHistory += `Patient: ${age ? age + '-year-old' : ''} ${gender}.\n\n`;
    }
    if (chiefComplaint) {
      compiledHistory += `Chief Complaint: ${chiefComplaint}\n\n`;
    }
    compiledHistory += `Clinical History:\n${clinicalHistory}`;

    onAnalyze({
      age: age || 'Unknown',
      gender,
      chiefComplaint: chiefComplaint || 'Unspecified symptoms',
      history: clinicalHistory,
      compiledQuery: compiledHistory
    });
  };

  return (
    <div className="case-workspace-wrapper">
      {/* Main Case Form Card */}
      <main className="workspace-main-container">
        {/* Top Hero Banner Wrapper in soft gray-blue #e9eff5 (matching Results & Home) */}
        <section className="dashboard-hero-card">
          <div className="dashboard-hero-content">
            <div className="dashboard-badge-row">
              <div className="clinical-audience-tag">
                <BookOpen size={13} className="shield-icon" />
                <span>Textbook RAG Ingestion Active</span>
              </div>
            </div>

            <h1 className="dashboard-primary-title">Patient Clinical Case Presentation</h1>

          </div>
        </section>

        {/* Clinical Form Body Card */}
        <div className="case-entry-card">
          {validationError && (
            <div className="clinical-alert-box error">
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="clinical-form-body">
            {/* Section 1: Demographics */}
            <div className="form-section-block">
              <div className="section-label-header">
                <span className="section-number-pill">1</span>
                <h3 className="section-heading">Patient Demographics & Chief Complaint</h3>
              </div>

              <div className="demographics-grid">
                <div className="form-field-group">
                  <label htmlFor="patient-age">Age (Years)</label>
                  <input 
                    type="number" 
                    id="patient-age"
                    placeholder="e.g. 56" 
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="0"
                    max="120"
                    className="clinical-input"
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="patient-gender">Biological Sex</label>
                  <select 
                    id="patient-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="clinical-select"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-field-group field-grow">
                  <label htmlFor="chief-complaint">Chief Complaint & Duration</label>
                  <input 
                    type="text" 
                    id="chief-complaint"
                    placeholder="e.g. Productive cough for 2 months with evening fever and weight loss" 
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="clinical-input"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Clinical History */}
            <div className="form-section-block">
              <div className="section-label-header">
                <span className="section-number-pill">2</span>
                <div className="section-heading-col">
                  <h3 className="section-heading">Detailed Clinical History & Presentation</h3>
                  <span className="section-hint">
                    Chronology of symptoms, constitutional signs, past medical illnesses, exposures, and examination clues.
                  </span>
                </div>
              </div>

              <div className="history-textarea-wrap">
                <textarea 
                  id="clinical-history-input"
                  rows={9}
                  placeholder="Enter patient's clinical history (e.g., 56-year-old male construction worker with productive cough for 2 months, evening fever, weight loss, brother treated for TB 1 year ago...)"
                  value={clinicalHistory}
                  onChange={(e) => setClinicalHistory(e.target.value)}
                  className="clinical-textarea"
                />
              </div>

              {/* Quick Append Chips */}
              <div className="quick-tags-container">
                <span className="quick-tags-label">Quick Add Section:</span>
                <div className="tags-flex">
                  <button 
                    type="button" 
                    className="tag-chip-btn"
                    onClick={() => handleAppendSection('Associated Symptoms')}
                  >
                    <Plus size={12} /> Symptoms
                  </button>
                  <button 
                    type="button" 
                    className="tag-chip-btn"
                    onClick={() => handleAppendSection('Past Medical History')}
                  >
                    <Plus size={12} /> Past History
                  </button>
                  <button 
                    type="button" 
                    className="tag-chip-btn"
                    onClick={() => handleAppendSection('Physical Examination Findings')}
                  >
                    <Plus size={12} /> Exam Findings
                  </button>
                  <button 
                    type="button" 
                    className="tag-chip-btn"
                    onClick={() => handleAppendSection('Medication & Social History')}
                  >
                    <Plus size={12} /> Medications / Social
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="form-actions-bar">
              <button 
                type="button" 
                className="btn-clear-history"
                onClick={handleClear}
                disabled={isLoading}
              >
                <RotateCcw size={14} />
                <span>Clear Form</span>
              </button>

              <button 
                type="submit" 
                className="btn-analyze-submit"
                id="analyze-case-btn"
                disabled={isLoading}
              >
                <span>{isLoading ? 'Retrieving Textbook Evidence...' : 'Analyze Case with Textbook RAG'}</span>
                <div className="submit-arrow-circle">
                  <ArrowRight size={14} />
                </div>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
