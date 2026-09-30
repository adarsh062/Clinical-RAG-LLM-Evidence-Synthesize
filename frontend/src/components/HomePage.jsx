import React from 'react';
import { 
  ArrowRight, 
  Play, 
  BookOpen, 
  CheckCircle2, 
  Target, 
  Stethoscope, 
  FileText, 
  Activity, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  BrainCircuit, 
  Database 
} from 'lucide-react';
import heroDoctorImg from '../assets/hero-doctor.png';

export default function HomePage({ onStartPracticing }) {
  return (
    <div className="landing-screen-container">
      <main className="landing-main-wrapper">
        {/* =================================================================
            1. HERO SECTION BANNER
            ================================================================= */}
        <section className="hero-banner-card">
          {/* Subtle medical accents */}
          <div className="decorative-sparkle sparkle-top-right">✦</div>
          <div className="decorative-sparkle sparkle-mid-left">+</div>
          <div className="decorative-sparkle sparkle-mid-center">✦</div>
          <div className="decorative-sparkle sparkle-cross-lime">+</div>

          <div className="hero-banner-grid">
            {/* Left Column: Heading & CTA */}
            <div className="hero-text-content">
              <div className="clinical-audience-tag">
                <ShieldCheck size={14} className="shield-icon" />
                <span>Exclusively for Medical Students & Clinicians</span>
              </div>

              <h1 className="hero-main-title">
                Empowering<br />
                Diagnostic Minds Through<br />
                Clinical AI 
              </h1>

              <button 
                className="hero-cta-pill" 
                onClick={onStartPracticing}
                id="hero-get-started-btn"
              >
                <span>Start Case Practice</span>
                <div className="cta-arrow-circle">
                  <ArrowRight size={14} />
                </div>
              </button>
            </div>

            {/* Right Column: Hero Doctor & Patient Vector Illustration */}
            <div className="hero-illustration-pane">
              <div className="illustration-wrapper">
                <img 
                  src={heroDoctorImg} 
                  alt="Doctor with stethoscope taking blood pressure of patient" 
                  className="hero-doctor-img"
                />
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            2. BRIDGE & STATS SECTION (3 Columns)
            ================================================================= */}
        <section className="bridge-stats-section" id="working-process">
          {/* Left Column: Bridge Title & Vision Tagline */}
          <div className="bridge-intro-col">
            <h2 className="bridge-title">
              Your Bridge to Evidence-Based Medicine<br />
              <span className="bridge-title-sub">Sharpen Your Diagnostic Skills</span>
            </h2>

            <div className="bridge-bottom-tagline">
              <p>Bedside Examination Meets Vector RAG</p>
              <p>Grounded in Gold-Standard Medical Textbooks</p>
            </div>
          </div>

          {/* Middle Column: Verified Textbooks Card */}
          <div className="clients-stat-card">
            <div className="clients-card-top">
              <span className="clients-label">Textbook Library</span>
              <div className="textbook-badge-stack">
                <span className="textbook-pill-tag">Hutchinson's</span>
                <span className="textbook-pill-tag">PJ Mehta</span>
                <span className="textbook-pill-tag">Bedside Clinics</span>
              </div>
            </div>

            <div className="clients-card-bottom">
              <div className="count-block">
                <span className="count-number">3,000+</span>
                <span className="count-sub">Clinical Chunks Indexed</span>
              </div>
              <button className="testimonial-link-btn" onClick={onStartPracticing}>
                <span>View Knowledge Base</span>
                <div className="testimonial-arrow-circle">
                  <ArrowRight size={11} />
                </div>
              </button>
            </div>
          </div>

          {/* Right Column: Textbook Alignment Circular Ring Card */}
          <div className="success-gauge-card">
            <div className="gauge-graphic-container">
              <svg className="progress-ring" viewBox="0 0 100 100" width="110" height="110">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#e2e8f0" 
                  strokeWidth="6" 
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#38bdf8" 
                  strokeWidth="6" 
                  strokeDasharray="238.76" 
                  strokeDashoffset="28.65" 
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text 
                  x="50" 
                  y="56" 
                  textAnchor="middle" 
                  className="gauge-text"
                >
                  88%
                </text>
              </svg>
            </div>
            <div className="gauge-label">Textbook Grounding Alignment</div>
          </div>
        </section>

        {/* =================================================================
            3. VERIFIED MEDICAL TEXTBOOKS & RAG CORE (Lime Green Pill Banner)
            ================================================================= */}
        <section className="partners-lime-bar" id="partners">
          {/* Source 1: Hutchinson's */}
          <div className="partner-item">
            <BookOpen size={20} className="partner-svg" />
            <span className="partner-text">Hutchinson's Clinical Methods</span>
          </div>

          {/* Source 2: Bedside Clinics */}
          <div className="partner-item">
            <Stethoscope size={20} className="partner-svg" />
            <span className="partner-text">Bedside Clinics in Medicine</span>
          </div>

          {/* Source 3: PJ Mehta */}
          <div className="partner-item">
            <Activity size={20} className="partner-svg" />
            <span className="partner-text">PJ Mehta Practical Medicine</span>
          </div>

          {/* Stack 1: ChromaDB */}
          <div className="partner-item">
            <Database size={20} className="partner-svg" />
            <span className="partner-text">ChromaDB Vector Store</span>
          </div>

          {/* Stack 2: Gemini */}
          <div className="partner-item">
            <BrainCircuit size={20} className="partner-svg" />
            <span className="partner-text">Gemini 3.6 Flash</span>
          </div>
        </section>

        {/* =================================================================
            4. 4 STEPS IN CLINICAL CASE REASONING
            ================================================================= */}
        <section className="steps-section" id="steps">
          <div className="steps-header">
            <h2 className="steps-title">4 Steps in Clinical Case Evaluation</h2>
            <p className="steps-subtitle">
              From bedside patient history to grounded diagnostic hypotheses and investigation plans.
            </p>
          </div>

          <div className="steps-cards-grid">
            {/* Step Card 1 */}
            <div className="step-card" onClick={onStartPracticing} role="button" tabIndex={0}>
              <div className="step-icon-wrap">
                <FileText size={26} className="step-icon" />
              </div>
              <h3 className="step-card-title">1. Case Presentation</h3>
              <p className="step-card-desc">
                Input demographics, chronicity, chief complaints, risk factors, and bedside physical findings.
              </p>
            </div>

            {/* Step Card 2 - FEATURED BLUE HIGHLIGHTED CARD */}
            <div className="step-card step-card-featured" onClick={onStartPracticing} role="button" tabIndex={0}>
              <div className="step-icon-wrap featured-icon-wrap">
                <BookOpen size={26} className="step-icon-featured" />
              </div>
              <h3 className="step-card-title featured-title">2. Textbook RAG Search</h3>
              <p className="step-card-desc featured-desc">
                ChromaDB semantically retrieves relevant pathophysiology and diagnostic criteria from gold-standard textbooks.
              </p>
            </div>

            {/* Step Card 3 */}
            <div className="step-card" onClick={onStartPracticing} role="button" tabIndex={0}>
              <div className="step-icon-wrap">
                <Target size={26} className="step-icon" />
              </div>
              <h3 className="step-card-title">3. Formulate Differentials</h3>
              <p className="step-card-desc">
                Synthesize the most probable diagnosis and ranked differentials supported by textbook clues.
              </p>
            </div>

            {/* Step Card 4 */}
            <div className="step-card" onClick={onStartPracticing} role="button" tabIndex={0}>
              <div className="step-icon-wrap">
                <CheckCircle2 size={26} className="step-icon" />
              </div>
              <h3 className="step-card-title">4. Diagnostic Next Steps</h3>
              <p className="step-card-desc">
                Obtain recommended bedside tests, laboratory workup, and diagnostic confidence rating.
              </p>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
