import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Target, 
  Lightbulb, 
  Layers, 
  ClipboardList, 
  ArrowRight, 
  CheckCircle2, 
  FileText,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';

export default function ClinicalResults({ 
  data, 
  patientData, 
  onBack, 
  onNewCase, 
  onNavigateHome,
  activeSection = 'clinical'
}) {
  const isPediatrics = activeSection === 'pediatrics';
  const [feedback, setFeedback] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  
  // Exit Feedback Interception (when user clicks Back or uses browser/phone back gesture)
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'back' | 'newCase'
  const feedbackGivenRef = useRef(false);

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

  const sendFeedbackToApi = async (type) => {
    try {
      await fetch(`${backendBaseUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caseId: data?.caseId,
          feedback: type
        })
      });
    } catch (err) {
      console.warn('Feedback submission notice:', err);
    }
  };

  const handleFeedback = async (type) => {
    setFeedback(type);
    feedbackGivenRef.current = true;
    setIsSubmittingFeedback(true);
    setFeedbackNote('');

    try {
      await sendFeedbackToApi(type);
      setFeedbackNote(type === 'satisfied' ? 'Thank you! Marked as Satisfied.' : 'Thank you! Marked as Not Satisfied.');
    } catch (err) {
      setFeedbackNote('Recorded locally. Thank you!');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Intercept Back button
  const handleTriggerBack = () => {
    if (!feedbackGivenRef.current) {
      setPendingAction('back');
      setShowExitModal(true);
    } else {
      onBack();
    }
  };

  // Intercept New Case button
  const handleTriggerNewCase = () => {
    if (!feedbackGivenRef.current) {
      setPendingAction('newCase');
      setShowExitModal(true);
    } else {
      onNewCase();
    }
  };

  // Browser / mobile phone hardware back navigation interception
  useEffect(() => {
    window.history.pushState({ isResult: true }, '');

    const handlePopState = () => {
      if (!feedbackGivenRef.current) {
        window.history.pushState({ isResult: true }, '');
        setPendingAction('back');
        setShowExitModal(true);
      } else {
        onBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onBack]);

  const handleExitWithFeedback = async (type) => {
    setFeedback(type);
    feedbackGivenRef.current = true;
    setIsSubmittingFeedback(true);

    try {
      await sendFeedbackToApi(type);
    } finally {
      setIsSubmittingFeedback(false);
      setShowExitModal(false);
      if (pendingAction === 'newCase') {
        onNewCase();
      } else {
        onBack();
      }
    }
  };

  const handleSkipAndProceed = () => {
    feedbackGivenRef.current = true;
    setShowExitModal(false);
    if (pendingAction === 'newCase') {
      onNewCase();
    } else {
      onBack();
    }
  };

  const {
    mostLikely = "Clinical Diagnostic Assessment",
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
    <div className="case-workspace-wrapper results-workspace-view">
      <main className="workspace-main-container">
        {/* =================================================================
            1. MOST LIKELY & CONFIDENCE (Exact app.py format)
            ================================================================= */}
        <section className="dashboard-hero-card">
          <div className="dashboard-hero-content">
            <div className="dashboard-badge-row">
              <div className="clinical-audience-tag">
                <Target size={13} className="shield-icon" />
                <span>{isPediatrics ? 'PEDIATRICS MOST LIKELY' : 'MOST LIKELY'}</span>
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
                onClick={handleTriggerNewCase}
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
                onClick={handleTriggerBack}
              >
                <ArrowLeft size={14} />
                <span>Edit Case</span>
              </button>
            </div>
          </div>
        </section>

        {/* =================================================================
            2. WHY, DIFFERENTIALS, NEXT
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
              <p className="text-slate-500 text-sm">Clinical monitoring and prompt evaluation.</p>
            )}
          </div>
        </div>

        {/* =================================================================
            3. INLINE ANALYSIS FEEDBACK (Satisfied / Not Satisfied)
            ================================================================= */}
        <section className="dashboard-feedback-card">
          <div className="feedback-inner">
            <div className="feedback-text-wrap">
              <span className="feedback-label">Case Diagnostic Feedback</span>
              <p className="feedback-sub">Are you satisfied with this reasoning and differential?</p>
            </div>
            <div className="feedback-actions">
              <button 
                type="button" 
                className={`feedback-btn satisfied ${feedback === 'satisfied' ? 'active' : ''}`}
                onClick={() => handleFeedback('satisfied')}
                disabled={isSubmittingFeedback}
              >
                <ThumbsUp size={15} />
                <span>Satisfied</span>
              </button>
              <button 
                type="button" 
                className={`feedback-btn unsatisfied ${feedback === 'unsatisfied' ? 'active' : ''}`}
                onClick={() => handleFeedback('unsatisfied')}
                disabled={isSubmittingFeedback}
              >
                <ThumbsDown size={15} />
                <span>Not Satisfied</span>
              </button>
            </div>
          </div>
          {feedbackNote && (
            <div className="feedback-confirmation">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>{feedbackNote}</span>
            </div>
          )}
        </section>

        {/* =================================================================
            4. PATIENT CASE PROFILE SUMMARY
            ================================================================= */}
        {patientData && (
          <section className="dashboard-patient-summary">
            <div className="patient-summary-header">
              <FileText size={16} className="text-slate-600" />
              <h3 className="patient-summary-title">
                Presented Patient Case ({isPediatrics ? 'Pediatrics' : 'Clinical Medicine'})
              </h3>
            </div>
            <div className="patient-summary-body">
              <span className="patient-meta-item">
                <strong>Patient:</strong> {patientData.age} {patientData.gender}
              </span>
              {patientData.chiefComplaint && (
                <span className="patient-meta-item">
                  <strong>Chief Complaint:</strong> {patientData.chiefComplaint}
                </span>
              )}
              {patientData.history && (
                <p className="patient-history-preview">
                  <strong>Clinical Presentation:</strong> {patientData.history}
                </p>
              )}
            </div>
          </section>
        )}
      </main>

      {/* =================================================================
          5. EXIT FEEDBACK MODAL (Prompted when user goes back without feedback)
          ================================================================= */}
      {showExitModal && (
        <div className="exit-feedback-backdrop" onClick={handleSkipAndProceed}>
          <div className="exit-feedback-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="exit-feedback-header">
              <div className="exit-feedback-icon-wrap">
                <Target size={20} />
              </div>
              <div className="exit-feedback-titles">
                <h3 className="exit-feedback-title">Diagnostic Quality Check</h3>
                <p className="exit-feedback-sub">Before you go back, were you satisfied with this case reasoning?</p>
              </div>
              <button 
                type="button" 
                className="exit-feedback-close" 
                onClick={handleSkipAndProceed}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="exit-feedback-options">
              <button 
                type="button" 
                className="exit-feedback-choice satisfied"
                onClick={() => handleExitWithFeedback('satisfied')}
                disabled={isSubmittingFeedback}
              >
                <ThumbsUp size={18} />
                <div className="choice-text-col">
                  <strong>Satisfied</strong>
                  <span>Accurate differential & diagnosis</span>
                </div>
              </button>

              <button 
                type="button" 
                className="exit-feedback-choice unsatisfied"
                onClick={() => handleExitWithFeedback('unsatisfied')}
                disabled={isSubmittingFeedback}
              >
                <ThumbsDown size={18} />
                <div className="choice-text-col">
                  <strong>Not Satisfied</strong>
                  <span>Needs calibration or missing clues</span>
                </div>
              </button>
            </div>

            <div className="exit-feedback-footer">
              <button 
                type="button" 
                className="exit-feedback-skip-btn"
                onClick={handleSkipAndProceed}
              >
                Skip and Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
