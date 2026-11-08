import React, { useState } from 'react';
import { 
  ArrowRight, 
  RotateCcw, 
  Plus, 
  Sparkles, 
  AlertCircle, 
  Stethoscope, 
  Baby,
  BookOpen
} from 'lucide-react';
import { SAMPLE_CASE, SAMPLE_PEDIATRIC_CASE } from '../utils/parser';

export default function CaseForm({ 
  onAnalyze, 
  isLoading, 
  serverError, 
  onClearError, 
  onNavigateHome,
  activeSection = 'clinical',
  onSwitchSection
}) {
  const isPediatrics = activeSection === 'pediatrics';

  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState(isPediatrics ? 'Months' : 'Years');
  const [gender, setGender] = useState('Male');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleClear = () => {
    setAge('');
    setAgeUnit(isPediatrics ? 'Months' : 'Years');
    setGender('Male');
    setChiefComplaint('');
    setClinicalHistory('');
    setValidationError('');
    if (onClearError) onClearError();
  };

  const handleLoadSample = () => {
    if (isPediatrics) {
      setAge(SAMPLE_PEDIATRIC_CASE.age);
      setAgeUnit(SAMPLE_PEDIATRIC_CASE.ageUnit || 'Years');
      setGender(SAMPLE_PEDIATRIC_CASE.gender);
      setChiefComplaint(SAMPLE_PEDIATRIC_CASE.chiefComplaint);
      setClinicalHistory(SAMPLE_PEDIATRIC_CASE.history);
    } else {
      setAge(SAMPLE_CASE.age);
      setAgeUnit('Years');
      setGender(SAMPLE_CASE.gender);
      setChiefComplaint(SAMPLE_CASE.chiefComplaint);
      setClinicalHistory(SAMPLE_CASE.history);
    }
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
    
    // Format full query text
    let compiledHistory = `[Specialty: ${isPediatrics ? 'Pediatrics' : 'Clinical Medicine'}]\n\n`;
    if (age || gender) {
      const formattedAge = age ? `${age} ${ageUnit.toLowerCase()}-old` : '';
      compiledHistory += `Patient: ${formattedAge} ${gender}.\n\n`;
    }
    if (chiefComplaint) {
      compiledHistory += `Chief Complaint: ${chiefComplaint}\n\n`;
    }
    compiledHistory += `Clinical Presentation:\n${clinicalHistory}`;

    onAnalyze({
      specialty: activeSection,
      age: age ? `${age} ${ageUnit}` : 'Unspecified',
      gender,
      chiefComplaint: chiefComplaint || 'Unspecified symptoms',
      history: clinicalHistory,
      compiledQuery: compiledHistory
    });
  };

  return (
    <div className="case-workspace-wrapper">
      <main className="workspace-main-container">
        {/* Top Header Card */}
        <section className="dashboard-hero-card">
          <div className="dashboard-hero-content">
            <div className="dashboard-badge-row">
              <div className="clinical-audience-tag">
                {isPediatrics ? (
                  <>
                    <Baby size={13} className="shield-icon" />
                    <span>Pediatrics Section</span>
                  </>
                ) : (
                  <>
                    <BookOpen size={13} className="shield-icon" />
                    <span>Clinical Medicine Section</span>
                  </>
                )}
              </div>

              {/* Quick switch between Clinical and Pediatrics if needed */}
              <button 
                type="button"
                className="section-switch-link"
                onClick={() => onSwitchSection(isPediatrics ? 'clinical' : 'pediatrics')}
                title="Switch section"
              >
                Switch to {isPediatrics ? 'Clinical Medicine' : 'Pediatrics'}
              </button>
            </div>

            <h1 className="dashboard-primary-title">
              {isPediatrics ? 'Pediatric Patient Case Presentation' : 'Patient Clinical Case Presentation'}
            </h1>

            {/* 1-Click Load Sample Button */}
            <div style={{ marginTop: '14px' }}>
              <button 
                type="button" 
                className="hero-cta-pill" 
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                onClick={handleLoadSample}
              >
                <Sparkles size={14} />
                <span>{isPediatrics ? 'Load Sample Pediatric Case' : 'Load Sample TB Case'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Clinical Form Body Card */}
        <div className="case-entry-card">
          {serverError && (
            <div className="clinical-alert-box error" style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Backend Server Error:</strong> {serverError}
              </div>
            </div>
          )}

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
                  <label htmlFor="patient-age">{isPediatrics ? 'Age' : 'Age (Years)'}</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="number" 
                      id="patient-age"
                      placeholder={isPediatrics ? '3' : '56'} 
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min="0"
                      max={ageUnit === 'Months' ? 36 : 120}
                      className="clinical-input"
                      style={{ width: isPediatrics ? '90px' : '100%' }}
                    />
                    {isPediatrics && (
                      <select 
                        value={ageUnit} 
                        onChange={(e) => setAgeUnit(e.target.value)}
                        className="clinical-select"
                        style={{ width: '100px' }}
                      >
                        <option value="Years">Years</option>
                        <option value="Months">Months</option>
                        <option value="Weeks">Weeks</option>
                      </select>
                    )}
                  </div>
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
                    placeholder={isPediatrics ? 'e.g. Barking cough and stridor for 2 days' : 'e.g. Productive cough for 2 months with evening fever'} 
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
                    Chronology of symptoms, constitutional signs, past history, exposures, and examination clues.
                  </span>
                </div>
              </div>

              <div className="history-textarea-wrap">
                <textarea 
                  id="clinical-history-input"
                  rows={9}
                  placeholder={
                    isPediatrics
                      ? "Enter pediatric clinical history (e.g. 3-year-old child with barking cough, stridor, low grade fever, up-to-date immunizations...)"
                      : "Enter patient's clinical history (e.g. 56-year-old male construction worker with productive cough for 2 months, evening fever, weight loss...)"
                  }
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
                  {isPediatrics ? (
                    <>
                      <button 
                        type="button" 
                        className="tag-chip-btn"
                        onClick={() => handleAppendSection('Birth & Developmental Milestones')}
                      >
                        <Plus size={12} /> Milestones
                      </button>
                      <button 
                        type="button" 
                        className="tag-chip-btn"
                        onClick={() => handleAppendSection('Immunization & Feeding')}
                      >
                        <Plus size={12} /> Immunization
                      </button>
                      <button 
                        type="button" 
                        className="tag-chip-btn"
                        onClick={() => handleAppendSection('Pediatric Examination Findings')}
                      >
                        <Plus size={12} /> Exam Clues
                      </button>
                    </>
                  ) : (
                    <>
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
                        <Plus size={12} /> Medications
                      </button>
                    </>
                  )}
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
                <span>{isLoading ? 'Analyzing Case...' : 'Analyze Case with Textbook RAG'}</span>
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
