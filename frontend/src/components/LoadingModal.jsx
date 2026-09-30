import React, { useEffect, useState } from 'react';
import { BrainCircuit, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoadingModal() {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    { title: "Analyzing patient symptoms and timeline...", icon: BrainCircuit },
    { title: "Querying ChromaDB across medical textbooks...", icon: BookOpen },
    { title: "Retrieving relevant clinical passages & criteria...", icon: Sparkles },
    { title: "Formulating differentials & clinical reasoning...", icon: CheckCircle2 }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="pulse-loader-ring">
          <BrainCircuit size={36} className="loader-brain-icon" />
        </div>

        <h3 className="loading-title">Generating Clinical Reasoning</h3>
        <p className="loading-status-text">{steps[stepIndex].title}</p>

        <div className="loading-steps-dots">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
