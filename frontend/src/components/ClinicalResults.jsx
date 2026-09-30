import React from 'react';
import { 
  ArrowLeft, 
  Target, 
  Lightbulb, 
  Layers, 
  ClipboardList, 
  ArrowRight, 
  CheckCircle2, 
  FileText
} from 'lucide-react';

export default function ClinicalResults({ data, patientData, onBack, onNewCase, onNavigateHome }) {
  const {
    mostLikely = "Pulmonary Tuberculosis",
    why = [],
    differentials = [],
    nextSteps = [],
    confidence = "Moderate",
    confidenceReason = ""
  } = data || {};

  const getConfidenceClass = (conf) => {
    const lower = (conf || '').toLowerCase();
    if (lower.includes('high')) return 'confidence-pill-high';
    if (lower.includes('low')) return 'confidence-pill-low';
    return 'confidence-pill-mod';
  };

  return (
    <div className="case-workspace-wrapper">
      <main className="workspace-main-container">
        {/* =================================================================
            1. MOST LIKELY & CONFIDENCE (Exact app.py format)
            ================================================================= */}
        <section className="dashboard-hero-card">
          <div className="dashboard-hero-content">
            <div className="dashboard-badge-row">
              <div className="clinical-audience-tag">
                <Target size={13} className="shield-icon" />
                <span>MOST LIKELY</span>
              </div>
              <div className={`confidence-pill ${getConfidenceClass(confidence)}`}>
                CONFIDENCE: {confidence}
              </div>
            </div>

            <h1 className="dashboard-primary-title">{mostLikely}</h1>

            {confidenceReason && (
              <p className="dashboard-primary-rationale">
                <strong>CONFIDENCE REASON: </strong>{confidenceReason}
              </p>
            )}

            <div className="dashboard-hero-actions">
              <button 
                type="button" 
                className="hero-cta-pill"
                onClick={onNewCase}
                id="dash-new-case-btn"
              >
                <span>Analyze New Case</span>
                <div className="cta-arrow-circle">
                  <ArrowRight size={14} />
                </div>
              </button>

              <button 
                type="button" 
                className="dashboard-secondary-pill"
                onClick={onBack}
              >
                <ArrowLeft size={14} />
                <span>Edit Case</span>
              </button>
            </div>
          </div>
        </section>

        {/* =================================================================
            2. WHY, DIFFERENTIALS, NEXT (Exact app.py format)
            ================================================================= */}
        <div className="dashboard-cards-grid">
          {/* Card 1: WHY */}
          <div className="dashboard-step-card">
            <div className="dashboard-card-header">
              <div className="step-icon-wrap">
                <Lightbulb size={22} className="step-icon" />
              </div>
              <h2 className="dashboard-card-title">WHY</h2>
            </div>
            {why && why.length > 0 ? (
              <ul className="clinical-clues-list">
                {why.map((clue, idx) => (
                  <li key={idx} className="clue-item">
                    <CheckCircle2 size={16} className="clue-check-icon" />
                    <span>{clue}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">Symptoms align with textbook clinical patterns.</p>
            )}
          </div>

          {/* Card 2: DIFFERENTIALS */}
          <div className="dashboard-step-card">
            <div className="dashboard-card-header">
              <div className="step-icon-wrap">
                <Layers size={22} className="step-icon" />
              </div>
              <h2 className="dashboard-card-title">DIFFERENTIALS</h2>
            </div>
            {differentials && differentials.length > 0 ? (
              <div className="differentials-stack">
                {differentials.map((diff, idx) => (
                  <div key={idx} className="differential-item-box">
                    <div className="diff-number-pill">{idx + 1}</div>
                    <div className="diff-details">
                      <h3 className="diff-name">{diff.name}</h3>
                      {diff.reason && <p className="diff-rationale">{diff.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No alternative differentials specified.</p>
            )}
          </div>

          {/* Card 3: NEXT */}
          <div className="dashboard-step-card">
            <div className="dashboard-card-header">
              <div className="step-icon-wrap">
                <ClipboardList size={22} className="step-icon" />
              </div>
              <h2 className="dashboard-card-title">NEXT</h2>
            </div>
            {nextSteps && nextSteps.length > 0 ? (
              <ol className="next-steps-list">
                {nextSteps.map((step, idx) => (
                  <li key={idx} className="step-list-item">
                    <span className="step-counter">{idx + 1}</span>
                    <span className="step-text">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-slate-500 text-sm">Bedside clinical examination and posteroanterior radiograph.</p>
            )}
          </div>
        </div>

        {/* =================================================================
            3. PATIENT CASE PROFILE SUMMARY
            ================================================================= */}
        {patientData && (
          <section className="dashboard-patient-summary">
            <div className="patient-summary-header">
              <FileText size={16} className="text-slate-600" />
              <h3 className="patient-summary-title">Presented Patient Case</h3>
            </div>
            <div className="patient-summary-body">
              <span className="patient-meta-item">
                <strong>Patient:</strong> {patientData.age} yr old {patientData.gender}
              </span>
              {patientData.chiefComplaint && (
                <span className="patient-meta-item">
                  <strong>Chief Complaint:</strong> {patientData.chiefComplaint}
                </span>
              )}
              {patientData.history && (
                <p className="patient-history-preview">
                  <strong>Clinical History:</strong> {patientData.history}
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
