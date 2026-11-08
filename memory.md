# Project Memory: Medico Clinical Reasoning (RAG)

## 1. Project Overview & Objective
**Medico Clinical Reasoning** is a specialized Retrieval-Augmented Generation (RAG) educational application tailored for medical students. It assists students in formulating diagnostic hypotheses and sharpening clinical reasoning when presented with a patient's case history.

- **Primary Goal:** Take raw patient clinical history and symptoms, retrieve relevant diagnostic criteria and pathophysiological insights from verified clinical textbooks, and generate a concise, grounded clinical assessment with differential diagnoses.
- **Audience:** Medical students practicing independent clinical reasoning.
- **Safety/Disclaimer:** Educational tool; explicit warnings against replacing professional diagnosis.

---

## 2. Directory Structure

```text
d:/Web Dev/RAG/
├── memory.md                           # Comprehensive memory/reference file (this file)
├── backend/                            # Main Flask + RAG backend directory
│   ├── .git/                           # Git version control
    ├── .gitignore                      # Ignores venv/, __pycache__/, .env
    ├── README.md                       # Project overview and workflow diagram
    ├── requirements.txt                # Python package dependencies
    ├── app.py                          # Flask web application & API backend
    ├── rag_test.py                     # Standalone CLI test script with sample patient case
    ├── create_chunks.py                # ETL script: extracts text from PDFs & loads ChromaDB
    ├── search_books.py                 # Interactive CLI tool to test vector DB search
    ├── read_books.py                   # Diagnostic script to test PDF reading/text extraction
    ├── books/                          # Source medical textbooks (PDF format)
    │   ├── Bedside_Clinics_in_Medicine_with_COLOUR_Photos_and_Clinical_Integration.pdf
    │   ├── Hutchinson's Clinical Methods (24th Ed).pdf
    │   └── PJ Mehta- Clinical Medicine.pdf
    ├── chroma_db/                      # Persistent Chroma vector database
    │   ├── chroma.sqlite3              # Metadata & collection index SQLite DB (~63 MB)
    │   └── <uuid>/                     # Vector index binaries
    └── templates/                      # Flask UI templates
        └── index.html                  # Minimalist web frontend interface
```

---

## 3. Technology Stack & Dependencies

- **Language & Runtime:** Python 3.x
- **Web Framework:** Flask (`app.py`), Gunicorn (`gunicorn==23.0.0`) for production WSGI
- **LLM / Generation:** Google GenAI SDK (`google-genai`), using model `gemini-3.6-flash`
- **Vector Database:** `chromadb` (PersistentClient in `./chroma_db`)
- **Embedding Model:** ChromaDB default ONNX-backed embedding (`all-MiniLM-L6-v2`)
- **PDF Extraction:** `pypdf` (`PdfReader`)
- **Text Chunking:** `langchain-text-splitters` (`RecursiveCharacterTextSplitter`)
- **Environment Management:** `python-dotenv` (`load_dotenv()`)

---

## 4. Architectural Components & Data Flow

### A. Offline Ingestion (ETL Pipeline: `create_chunks.py`)
1. Reads all PDF files inside the `books/` directory.
2. Extracts page texts using `pypdf.PdfReader`.
3. Splits text using `RecursiveCharacterTextSplitter`:
   - `chunk_size = 1500` characters
   - `chunk_overlap = 200` characters
4. Assigns IDs in format `<filename>_<chunk_index>`.
5. Attaches metadata: `{"book": filename}`.
6. Stores chunks in Chroma collection: `"medical_books"`.

### B. Online Query Execution (Flask API: `app.py` & `rag_test.py`)
1. **Input:** Patient clinical history entered via UI (`index.html`) or passed via POST `/analyse`.
2. **Retrieval:**
   - ChromaDB queries the `medical_books` collection with `query_texts=[history]`.
   - Fetches top `n_results=5` chunks matching semantic similarity.
3. **Context Construction:**
   - Assembles retrieved chunks into `textbook_context` with source attribution (Book name).
4. **Prompt Assembly & Guardrails:**
   - Passes patient history + textbook context to Gemini.
   - Constrained to max 120 words.
   - Forbids quoting directly or inventing findings.
   - Enforces strict structured output format:
     - `MOST LIKELY:` [Primary Diagnosis]
     - `WHY:` [2 short lines of strongest clues]
     - `DIFFERENTIALS:` [3 numbered diagnoses with brief reasons]
     - `NEXT:` [Max 3 investigations or exam steps]
     - `CONFIDENCE:` [High / Moderate / Low]
     - `CONFIDENCE REASON:` [1 short sentence]
5. **LLM Invocation:** `client.interactions.create(model="gemini-3.6-flash", input=prompt)`.
6. **Response Delivery:** Returns JSON response to frontend, rendered in `<pre id="result">`.

---

## 5. Key Scripts Breakdown

| File | Purpose | Key Details |
|---|---|---|
| [`app.py`](file:///d:/Web%20Dev/RAG/medico-clinical-reasoning/app.py) | Web server & API | Exposes `/`, `/health`, and `/analyse`. Connects ChromaDB and Gemini client. |
| [`rag_test.py`](file:///d:/Web%20Dev/RAG/medico-clinical-reasoning/rag_test.py) | Standalone validation | Tests end-to-end RAG flow on a hardcoded TB/respiratory clinical case without web server. |
| [`create_chunks.py`](file:///d:/Web%20Dev/RAG/medico-clinical-reasoning/create_chunks.py) | Database builder | Chunks books and populates `chroma_db`. Run only when modifying or adding books. |
| [`search_books.py`](file:///d:/Web%20Dev/RAG/medico-clinical-reasoning/search_books.py) | Vector retrieval test | Command-line prompt to query the collection and inspect top 5 raw book snippets. |
| [`read_books.py`](file:///d:/Web%20Dev/RAG/medico-clinical-reasoning/read_books.py) | PDF extractor test | Verifies that PyPDF can parse pages and extract characters from files in `books/`. |
| [`templates/index.html`](file:///d:/Web%20Dev/RAG/medico-clinical-reasoning/templates/index.html) | User interface | Single page with textarea, submit button, and vanilla JS `fetch()` call. |

---

## 6. Environment & Configuration Requirements

- **Environment Variable:** `GEMINI_API_KEY` (must be defined in `medico-clinical-reasoning/.env` or system environment).
- **Default Port:** `5000` (or configured via `PORT` environment variable).
- **Model Name:** `gemini-3.6-flash` (via Google GenAI SDK `client.interactions.create`).

---

## 7. Frontend React Application (`frontend/`)

A Vite + React frontend application created directly in `d:/Web Dev/RAG/frontend`. It provides an evidence-based clinical reasoning interface strictly tailored for medical students and clinicians, grounded in verified medical textbooks.

### Core User Flow & UI Architecture:
1. **Home / Landing Page (`HomePage.jsx`)**:
   - Modern medical layout with generous rounded containers (`32px` - `36px`) and cohesive soft palette (`#f6f8fb`).
   - **Hero Banner Card**:
     - Headline: *"Empowering Diagnostic Minds Through Clinical AI 💊"*.
     - Audience Badge: *"Exclusively for Medical Students & Clinicians"*.
     - Subtitle: *"Formulate grounded diagnostic hypotheses, differentials, and evidence-backed next steps using verified clinical textbooks."*
     - CTA Pill Button: **Start Case Practice →** (navigates directly to Case Entry).
     - Hero Visual: Vector illustration of doctor taking patient blood pressure (`hero-doctor.png`).
   - **Bridge & Stats Section**:
     - *"Your Bridge to Evidence-Based Medicine — Sharpen Your Diagnostic Skills"* with **Explore Clinical Reasoning ▷** action.
     - Verified Textbooks Card: Showcases the 3 indexed clinical textbooks with 3,000+ chunks in ChromaDB.
     - Diagnostic Alignment Gauge: Circular progress ring with **88% Textbook Grounding Alignment**.
   - **Verified Textbooks & RAG Stack Banner**:
     - High-contrast chartreuse lime pill banner showcasing:
       - 📘 *Hutchinson's Clinical Methods (24th Ed)*
       - 🩺 *Bedside Clinics in Medicine*
       - 📖 *PJ Mehta Practical Medicine*
       - ⚡ *ChromaDB Vector Store*
       - 🧠 *Gemini 3.6 Flash Engine*
   - **4 Steps in Clinical Case Evaluation**:
     - Step 1: **Case Presentation** (demographics, history, vitals).
     - Step 2: **Textbook RAG Search** (featured royal blue card with semantic ChromaDB retrieval).
     - Step 3: **Formulate Differentials** (primary hypothesis + ranked differentials with clues).
     - Step 4: **Diagnostic Next Steps** (actionable bedside tests, labs, confidence score).
2. **Case Form (`CaseForm.jsx`)**:
   - Matches the main landing page aesthetic with clean top navigation, white card container, and dark pill action buttons.
   - 1-Click **Load Sample TB Case** button (preloads the standard 56-year-old construction worker TB case from `rag_test.py`).
   - Patient Information: Age, Biological Sex, Chief Complaint.
   - Detailed Clinical History textarea with quick section tags (`[Symptoms]`, `[Past History]`, `[Exam Findings]`, `[Medications]`).
   - **Analyze Case with Textbook RAG →** button with loading state.
3. **Clinical Results Dashboard (`ClinicalResults.jsx`)**:
   - Consistent rounded card architecture matching the landing page.
   - **Primary Hypothesis Hero Card** (matching home page hero banner with `#e9eff5`, rounded `36px`, bold typography, confidence indicator, and action pills).
   - **3 Core Clinical Cards** (matching the 4-steps card style: Key Diagnostic Clues, Differential Diagnoses 1-2-3, Recommended Next Steps).
   - **Case Profile Details** (compact case summary at the bottom).

### Frontend Files Directory:
```text
frontend/
├── src/
│   ├── assets/
│   │   ├── hero-doctor.png             # User-provided vector doctor & patient illustration
│   │   └── hero-books.png              # Textbook background asset
│   ├── components/
│   │   ├── Navbar.jsx                  # Clean header navigation with Clinical RAG branding
│   │   ├── HomePage.jsx                # Medical student landing page matching reference design
│   │   ├── CaseForm.jsx                # Patient clinical case entry form
│   │   ├── ClinicalResults.jsx         # Diagnostic reasoning dashboard & textbook sources
│   │   └── LoadingModal.jsx            # Progress dialog during ChromaDB + Gemini inference
│   ├── utils/
│   │   └── parser.js                   # Output parser & sample test cases
│   ├── App.jsx                         # Main view controller (home -> form -> output)
│   ├── index.css                       # Landing page styles & core tokens
│   ├── workspace.css                   # Unified clinical dashboard & results styles
│   └── main.jsx                        # React root entry
├── vite.config.js                      # Configured with proxy to port 5000 (/analyse, /health)
└── package.json                        # Dependencies: React 19, Lucide React, Vite 8
```


---

## 8. Running the System

1. **Start the Flask RAG Backend** (Optional/Standard):
   ```powershell
   cd "d:\Web Dev\RAG\backend"
   python app.py
   ```
2. **Start the React Frontend Dev Server**:
   ```powershell
   cd "d:\Web Dev\RAG\frontend"
   npm run dev
   ```
   *Frontend is accessible at `http://localhost:5174/` or `http://localhost:5173/`.*


---

## 9. Multi-Specialty Architecture & Pediatrics Module
- **Sections Supported:**
  1. `Clinical Medicine` (Adult / General Inpatient & Outpatient)
  2. `Pediatrics` (Neonatal, Infant & Child Health)
- **Workflow & Key Additions:**
  - `frontend/src/assets/hero-pediatrics.png`: Clean 2D flat vector medical illustration matching `hero-doctor.png`, depicting a friendly pediatrician with stethoscope examining a toddler holding a teddy bear.
  - `activeSection` state in `App.jsx` (`'clinical'` or `'pediatrics'`).
  - Home and Navbar remain clean and minimal exactly as before.
  - Clicking "Practice Case" or "Start Case Practice" displays a simple 2-option modal:
    1. **Clinical Medicine**
    2. **Pediatrics**
  - Clicking either option opens the form for that section directly.
  - Pediatric form supports age in years/months/weeks and 1-click sample pediatric case (Croup / Stridor).
    - Case form header toggle with age units (`Years`, `Months`, `Weeks`, `Days`) and pediatric quick-append tags.
    - Sample case data for both Clinical (Adult TB) and Pediatrics (Toddler Croup/Stridor) in `parser.js`.


---

## 10. Pediatric Knowledge Base & Dual-Server Setup
- **Database Path:** `backend/chroma_db_pediatric/chroma.sqlite3` (~25.8 MB)
- **Indexed Chunks:** 2,886 chunks
- **Textbooks:**
  - *Aruchamy Clinical Pediatrics* (3rd Ed) — 1,659 chunks
  - *Piyush Gupta Clinical Pediatrics* (4th Ed) — 1,227 chunks
- **Ingestion Script:** `backend/create_pediatric_chunks.py`
- **Dual Server Configuration:**
  - Render Service 1 (Clinical): `VITE_BACKEND_URL`
  - Render Service 2 (Pediatrics): `VITE_PEDIATRIC_BACKEND_URL`
  - Zero memory contention on Render free tier (512MB RAM isolated per specialty).
