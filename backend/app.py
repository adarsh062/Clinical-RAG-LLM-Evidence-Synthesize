import os
import chromadb

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Flask application
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for frontend

import re
import sqlite3

# Set thread restrictions before loading heavy C extensions to prevent cloud deadlocks
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Base directory paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Clinical Medicine Knowledge Base (Hutchinson's, Bedside Clinics, PJ Mehta)
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")
CHROMA_SQLITE_PATH = os.path.join(CHROMA_PATH, "chroma.sqlite3")

# 2. Pediatrics Knowledge Base (Aruchamy Clinical Pediatrics, Piyush Gupta Pediatrics)
CHROMA_PED_PATH = os.path.join(BASE_DIR, "chroma_db_pediatric")
CHROMA_PED_SQLITE_PATH = os.path.join(CHROMA_PED_PATH, "chroma.sqlite3")

def retrieve_textbook_passages(query: str, specialty: str = "clinical", limit: int = 5):
    """
    Lightning-fast, bulletproof textbook retrieval directly from ChromaDB SQLite FTS.
    - Clinical mode: Searches 3,000+ chunks (Bedside Clinics, Hutchinson's, PJ Mehta)
    - Pediatrics mode: Searches 2,800+ chunks (Aruchamy Clinical Pediatrics, Piyush Gupta)
    Zero ONNX downloads, zero RAM pressure, and queries in under 10 milliseconds.
    """
    # Select appropriate database based on specialty
    target_db_path = CHROMA_PED_SQLITE_PATH if specialty == "pediatrics" else CHROMA_SQLITE_PATH

    # Fallback to general clinical database if pediatric DB not available
    if not os.path.exists(target_db_path):
        if os.path.exists(CHROMA_SQLITE_PATH):
            target_db_path = CHROMA_SQLITE_PATH
        else:
            print(f"WARNING: Neither database found ({target_db_path})", flush=True)
            return []

    conn = sqlite3.connect(target_db_path)
    cur = conn.cursor()

    # Extract relevant clinical keywords
    raw_words = re.findall(r'[a-zA-Z]{3,}', query.lower())
    stop_words = {
        'the', 'and', 'with', 'for', 'was', 'has', 'had', 'her', 'his', 
        'this', 'that', 'from', 'are', 'year', 'old', 'male', 'female', 
        'patient', 'presents', 'history', 'clinical', 'complaint', 'years',
        'specialty', 'pediatrics', 'child', 'toddler', 'infant', 'months'
    }
    keywords = [w for w in raw_words if w not in stop_words][:8]
    match_query = ' OR '.join(keywords) if keywords else 'fever OR cough OR pain OR respiratory'

    matches = []
    try:
        cur.execute(
            'SELECT rowid, string_value FROM embedding_fulltext_search WHERE embedding_fulltext_search MATCH ? LIMIT ?', 
            (match_query, limit)
        )
        matches = cur.fetchall()
    except Exception as fts_err:
        print(f"FTS search notice ({specialty}): {fts_err}", flush=True)

    # Fallback if no specific keywords matched
    if not matches:
        cur.execute(
            "SELECT id, string_value FROM embedding_metadata WHERE key = 'chroma:document' LIMIT ?", 
            (limit,)
        )
        matches = cur.fetchall()

    passages = []
    for rowid, doc in matches:
        cur.execute(
            "SELECT string_value FROM embedding_metadata WHERE id = ? AND key = 'book'", 
            (rowid,)
        )
        b = cur.fetchone()
        default_book = "Pediatric Textbook" if specialty == "pediatrics" else "Medical Textbook"
        book = b[0] if b else default_book
        passages.append({
            "book": book,
            "document": doc
        })

    conn.close()
    return passages

# Helper function to get Gemini client
def get_gemini_client():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    try:
        return genai.Client(api_key=key.strip())
    except Exception as e:
        print(f"GEMINI CLIENT INIT ERROR: {e}", flush=True)
        return None

# Home page / API status dashboard
@app.route("/")
def home():
    return render_template("index.html")

# Health check endpoint
@app.route("/health")
def health():
    clinical_ok = os.path.exists(CHROMA_SQLITE_PATH)
    pediatric_ok = os.path.exists(CHROMA_PED_SQLITE_PATH)
    return jsonify({
        "status": "ok",
        "chromadb_clinical_ready": clinical_ok,
        "chromadb_pediatric_ready": pediatric_ok,
        "gemini_ready": bool(os.getenv("GEMINI_API_KEY"))
    })

# Main clinical & pediatric analysis endpoint
@app.route("/analyse", methods=["POST"])
@app.route("/analyse-pediatric", methods=["POST"])
def analyse():
    data = request.get_json(silent=True) or {}
    history = data.get("history", "").strip()
    specialty_input = data.get("specialty", "").lower().strip()

    # Auto-detect pediatric specialty from URL path, payload, or history text
    is_pediatric = (
        request.path == "/analyse-pediatric" or 
        "pediatric" in specialty_input or 
        "specialty: pediatrics" in history.lower()
    )
    specialty = "pediatrics" if is_pediatric else "clinical"

    if not history:
        return jsonify({
            "error": "Please enter the patient's history."
        }), 400

    print(f"STEP 1: History received (Specialty: {specialty.upper()})", flush=True)

    # --------------------------------
    # RETRIEVE TEXTBOOK PASSAGES (FAST & RELIABLE)
    # --------------------------------
    passages = retrieve_textbook_passages(history, specialty=specialty, limit=5)
    print(f"STEP 2: ChromaDB search completed (Retrieved {len(passages)} {specialty} textbook passages)", flush=True)

    # --------------------------------
    # PREPARE TEXTBOOK CONTEXT
    # --------------------------------
    textbook_context = ""
    print(f"STEP 3: Preparing context from {len(passages)} passages:", flush=True)
    for i, item in enumerate(passages):
        book = item.get("book", "Medical Textbook")
        document = item.get("document", "")
        print(f"   -> [Book {i + 1}]: {book} | Length: {len(document)} chars", flush=True)
        textbook_context += f"""
SOURCE {i + 1}
BOOK: {book}

{document}
"""

    # --------------------------------
    # GEMINI PROMPT (TAILORED FOR CLINICAL OR PEDIATRICS)
    # --------------------------------
    if is_pediatric:
        system_role = "You are an expert pediatric clinical reasoning assistant for medical students and pediatric residents."
        clinical_guidance = "- Consider child age, developmental milestones, vaccination status, and pediatric emergency triage priorities."
    else:
        system_role = "You are a clinical reasoning assistant for a medical student."
        clinical_guidance = "- Consider patient age, chronicity, constitutional symptoms, and bedside physical findings."

    prompt = f"""
{system_role}

Use the patient's presentation and the retrieved textbook material to make
a DIRECT clinical prediction.

PATIENT PRESENTATION:

{history}


TEXTBOOK MATERIAL:

{textbook_context}


IMPORTANT:

- Give the most likely diagnosis directly.
- Keep the response SHORT.
- Maximum 120 words.
- Do not write a long clinical report.
- Do not repeat the entire patient history.
- Do not invent examination findings.
- Do not invent investigation results.
{clinical_guidance}
- Use the supplied textbooks to support your reasoning.
- Do not mention the textbooks or source numbers.
- Do not quote textbook passages.
- Clearly indicate uncertainty when important.
- This is an educational clinical reasoning tool, not a definitive diagnosis.


FORMAT:

MOST LIKELY:
[diagnosis]

WHY:
[maximum 2 short lines]

DIFFERENTIALS:
1. [diagnosis] — [few words]
2. [diagnosis] — [few words]
3. [diagnosis] — [few words]

NEXT:
[maximum 3 investigations or examination steps]

CONFIDENCE:
[High / Moderate / Low]

CONFIDENCE REASON:
[one short sentence]
"""

    print("STEP 4: Sending request to Gemini", flush=True)

    client = get_gemini_client()
    if not client:
        return jsonify({
            "error": "GEMINI_API_KEY environment variable is not configured on the server."
        }), 500

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )

        print("STEP 5: Gemini response received", flush=True)
        return jsonify({
            "result": response.text,
            "specialty": specialty
        })
    except Exception as e:
        print("GEMINI ERROR:", str(e), flush=True)
        return jsonify({
            "error": "Gemini request failed: " + str(e)
        }), 500


# --------------------------------
# START SERVER
# --------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
