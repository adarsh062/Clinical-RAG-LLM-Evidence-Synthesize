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

# Base directory paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")

# Initialize ChromaDB
collection = None
try:
    if os.path.exists(CHROMA_PATH):
        chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
        collection = chroma_client.get_collection(name="medical_books")
        print(f"SUCCESS: ChromaDB collection 'medical_books' loaded from {CHROMA_PATH}", flush=True)
    else:
        print(f"WARNING: ChromaDB directory not found at {CHROMA_PATH}", flush=True)
except Exception as e:
    print(f"CHROMA INITIALIZATION WARNING: {e}", flush=True)

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

# Home page
@app.route("/")
def home():
    return render_template("index.html")

# Health check
@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "chromadb_ready": collection is not None,
        "gemini_ready": bool(os.getenv("GEMINI_API_KEY"))
    })

# Clinical analysis
@app.route("/analyse", methods=["POST"])
def analyse():
    data = request.get_json(silent=True) or {}
    history = data.get("history", "").strip()

    if not history:
        return jsonify({
            "error": "Please enter the patient's history."
        }), 400

    print("STEP 1: History received", flush=True)

    # --------------------------------
    # VERIFY CHROMA DB COLLECTION
    # --------------------------------
    if not collection:
        return jsonify({
            "error": "ChromaDB medical_books collection is not initialized on the server."
        }), 500

    # --------------------------------
    # SEARCH MEDICAL TEXTBOOKS
    # --------------------------------
    try:
        results = collection.query(
            query_texts=[history],
            n_results=5
        )
        print("STEP 2: Chroma search completed", flush=True)
    except Exception as e:
        print("CHROMA ERROR:", str(e), flush=True)
        return jsonify({
            "error": "Textbook search failed: " + str(e)
        }), 500

    # --------------------------------
    # PREPARE TEXTBOOK CONTEXT
    # --------------------------------
    textbook_context = ""
    print(f"STEP 3: Preparing context from {len(results['documents'][0])} textbook passages:", flush=True)
    for i, document in enumerate(results["documents"][0]):
        book = results["metadatas"][0][i].get("book", "Medical Textbook")
        print(f"   -> [Book {i + 1}]: {book} | Length: {len(document)} chars", flush=True)
        textbook_context += f"""
SOURCE {i + 1}
BOOK: {book}

{document}
"""

    print("STEP 3: Textbook context prepared and injected into Gemini prompt", flush=True)

    # --------------------------------
    # GEMINI PROMPT
    # --------------------------------
    prompt = f"""
You are a clinical reasoning assistant for a medical student.

Use the patient's history and the retrieved textbook material to make
a DIRECT clinical prediction.

PATIENT HISTORY:

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

    # --------------------------------
    # GEMINI INVOCATION
    # --------------------------------
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
            "result": response.text
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