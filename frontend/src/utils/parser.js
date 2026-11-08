/**
 * Robust parser that extracts the exact format from backend/app.py:
 * - MOST LIKELY
 * - WHY
 * - DIFFERENTIALS
 * - NEXT
 * - CONFIDENCE
 * - CONFIDENCE REASON
 * Handles markdown formatting (e.g. **MOST LIKELY:**, bullet points, numbers) cleanly.
 */
export function parseClinicalReasoning(rawText) {
  if (!rawText) return null;

  const result = {
    mostLikely: "",
    why: [],
    differentials: [],
    nextSteps: [],
    confidence: "Moderate",
    confidenceReason: "",
    raw: rawText
  };

  try {
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);

    let currentSection = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Clean markdown stars, hashes, and backticks for robust header detection
      const cleanHeader = line.replace(/[*#_`]/g, '').trim();

      // Check for CONFIDENCE REASON first (since it starts with CONFIDENCE)
      if (/^CONFIDENCE REASON:?/i.test(cleanHeader)) {
        currentSection = "CONFIDENCE REASON";
        const val = cleanHeader.replace(/^CONFIDENCE REASON:?/i, "").replace(/^[\[\]]/g, "").trim();
        if (val) result.confidenceReason = val;
        continue;
      }

      if (/^CONFIDENCE:?/i.test(cleanHeader)) {
        currentSection = "CONFIDENCE";
        const val = cleanHeader.replace(/^CONFIDENCE:?/i, "").replace(/^[\[\]]/g, "").trim();
        if (val) result.confidence = val;
        continue;
      }

      if (/^MOST LIKELY:?/i.test(cleanHeader)) {
        currentSection = "MOST LIKELY";
        const inlineVal = cleanHeader.replace(/^MOST LIKELY:?/i, "").replace(/^[\[\]]/g, "").trim();
        if (inlineVal) result.mostLikely = inlineVal;
        continue;
      }

      if (/^WHY:?/i.test(cleanHeader)) {
        currentSection = "WHY";
        const inlineVal = cleanHeader.replace(/^WHY:?/i, "").replace(/^[\[\]]/g, "").trim();
        if (inlineVal) {
          const item = inlineVal.replace(/^[•\-\*\d\.\)]\s*/, '').trim();
          if (item) result.why.push(item);
        }
        continue;
      }

      if (/^DIFFERENTIALS:?/i.test(cleanHeader)) {
        currentSection = "DIFFERENTIALS";
        continue;
      }

      if (/^NEXT:?/i.test(cleanHeader)) {
        currentSection = "NEXT";
        continue;
      }

      // Clean line content
      const cleanContent = line.replace(/^[*#_`]/g, '').replace(/[*_`]$/g, '').trim();

      // Populate based on active section
      if (currentSection === "MOST LIKELY" && !result.mostLikely) {
        result.mostLikely = cleanHeader.replace(/^[\[\]]/g, "").trim();
      } else if (currentSection === "WHY") {
        const item = cleanHeader.replace(/^[•\-\*\d\.\)]\s*/, '').replace(/^[\[\]]/g, "").trim();
        if (item) result.why.push(item);
      } else if (currentSection === "DIFFERENTIALS") {
        const cleaned = cleanHeader.replace(/^\d+[\.\)]\s*/, "").replace(/^[•\-\*]\s*/, "").trim();
        if (cleaned) {
          const parts = cleaned.split(/—|–|-|:/);
          if (parts.length > 1) {
            result.differentials.push({
              name: parts[0].trim(),
              reason: parts.slice(1).join("-").trim()
            });
          } else {
            result.differentials.push({
              name: cleaned,
              reason: ""
            });
          }
        }
      } else if (currentSection === "NEXT") {
        const cleaned = cleanHeader.replace(/^\d+[\.\)]\s*/, "").replace(/^[•\-\*]\s*/, "").trim();
        if (cleaned) {
          result.nextSteps.push(cleaned);
        }
      } else if (currentSection === "CONFIDENCE REASON") {
        const cleaned = cleanHeader.replace(/^[\[\]]/g, "").trim();
        if (cleaned) {
          result.confidenceReason += (result.confidenceReason ? " " : "") + cleaned;
        }
      }
    }
  } catch (err) {
    console.error("Error parsing clinical reasoning:", err);
  }

  // Fallback regex if MOST LIKELY was inline or missed
  if (!result.mostLikely) {
    const match = rawText.match(/MOST LIKELY:?\s*[*_`]*([^\n*#]+)/i);
    if (match) result.mostLikely = match[1].replace(/^[\[\]]/g, "").trim();
  }

  // Ensure mostLikely has a default only if completely blank
  if (!result.mostLikely) {
    result.mostLikely = "Clinical Diagnostic Assessment";
  }

  return result;
}

export const SAMPLE_CASE = {
  age: "56",
  ageUnit: "Years",
  gender: "Male",
  chiefComplaint: "Productive cough for 2 months with fever and weight loss",
  history: `56-year-old male construction worker.
Productive cough for 2 months.
Fever for 6 weeks with evening rise.
Progressive breathlessness for 3 weeks.
Left-sided pleuritic chest pain for 2 weeks.
Occasional streaky hemoptysis for 10 days.
Weight loss of 5 kg over 2 months.
Decreased appetite and night sweats.
Brother was treated for tuberculosis 1 year ago.
Diabetes mellitus for 6 years with irregular control.
Smokes 15 cigarettes per day for 30 years.
Works around construction dust.
No previous history of tuberculosis, COPD or asthma.
No physical examination or investigations are available.`
};

export const SAMPLE_PEDIATRIC_CASE = {
  age: "3",
  ageUnit: "Years",
  gender: "Male",
  chiefComplaint: "Barking cough, stridor, and respiratory distress for 2 days",
  history: `3-year-old male toddler brought by parents to emergency triage.
Barking, seal-like cough for 2 days, worse at night.
Inspiratory stridor audible at rest with hoarseness of voice when crying.
Mild runny nose, low-grade fever (100.6°F), and sore throat for preceding 3 days.
No history of choking, sudden foreign body aspiration, or drooling.
Child is fully immunized up to date (including Hib and pneumococcal conjugate vaccine).
Birth History: Full term normal vaginal delivery, birth weight 3.1 kg, cried immediately at birth.
No prior episodes of asthma, wheezing, or recurrent chest infections.
Examination Findings:
Child conscious, irritable, sitting upright.
Inspiratory stridor with mild suprasternal and subcostal indrawing.
Heart rate: 124 bpm, Respiratory rate: 36/min, Temperature: 100.4°F, SpO2: 96% on room air.
Throat examination: mild erythema, no uvular deviation or pseudomembrane seen.
Lungs: Bilateral transmitted upper airway sounds, no focal wheeze or crepitations.`
};
