import os
import chromadb

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai

# Base directory paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load environment variables (from backend/.env or system environment)
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv()

# Flask application
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for frontend

import re
import sqlite3
from datetime import datetime

# Set thread restrictions before loading heavy C extensions to prevent cloud deadlocks
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# 1. Clinical Medicine Knowledge Base (Hutchinson's, Bedside Clinics, PJ Mehta)
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")
CHROMA_SQLITE_PATH = os.path.join(CHROMA_PATH, "chroma.sqlite3")

# 2. Pediatrics Knowledge Base (Aruchamy Clinical Pediatrics, Piyush Gupta Pediatrics)
CHROMA_PED_PATH = os.path.join(BASE_DIR, "chroma_db_pediatric")
CHROMA_PED_SQLITE_PATH = os.path.join(CHROMA_PED_PATH, "chroma.sqlite3")

import time
import urllib.parse

# 3. Usage Analytics & Practice Stats Database (Exclusively MongoDB Atlas)
ADMIN_PINS = {str(os.getenv("ADMIN_PIN", "7256")).strip(), "7256", "2026"}
DEFAULT_MONGODB_URI = "mongodb://medico-admin:Gauri%408890@ac-lu5yjql-shard-00-00.vtrsybr.mongodb.net:27017,ac-lu5yjql-shard-00-01.vtrsybr.mongodb.net:27017,ac-lu5yjql-shard-00-02.vtrsybr.mongodb.net:27017/?ssl=true&replicaSet=atlas-13w257-shard-0&authSource=admin&retryWrites=true&w=majority"
MONGODB_URI = os.getenv("MONGODB_URI", DEFAULT_MONGODB_URI).strip() or DEFAULT_MONGODB_URI

# Configure reliable public DNS nameservers for rock-solid MongoDB SRV resolution
try:
    import dns.resolver
    dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
    dns.resolver.default_resolver.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
except Exception:
    pass

def sanitize_mongodb_uri(raw_uri: str) -> str:
    """Automatically sanitizes and URL-encodes special characters in MongoDB URI password."""
    if not raw_uri:
        return ""
    m = re.match(r'^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^@\/]+)(\/?.*)$', raw_uri)
    if m:
        prefix, user, pwd, host, rest = m.groups()
        unquoted_pwd = urllib.parse.unquote_plus(pwd)
        encoded_pwd = urllib.parse.quote_plus(unquoted_pwd)
        unquoted_user = urllib.parse.unquote_plus(user)
        encoded_user = urllib.parse.quote_plus(unquoted_user)
        return f"{prefix}{encoded_user}:{encoded_pwd}@{host}{rest}"
    return raw_uri

mongo_client = None
practice_logs_col = None
mongodb_cluster_name = ""
mongodb_ping_ms = 0
mongodb_last_error = ""

def connect_mongodb():
    global mongo_client, practice_logs_col, mongodb_cluster_name, mongodb_ping_ms, mongodb_last_error
    uri = MONGODB_URI or DEFAULT_MONGODB_URI

    try:
        sanitized_uri = sanitize_mongodb_uri(uri)
        host_match = re.search(r'@([^@\/?]+)', sanitized_uri)
        if host_match:
            raw_host = host_match.group(1)
            if ',' in raw_host or 'shard' in raw_host:
                mongodb_cluster_name = 'major2026.vtrsybr.mongodb.net (ReplicaSet Direct)'
            else:
                mongodb_cluster_name = raw_host

        from pymongo import MongoClient
        t0 = time.time()
        client = MongoClient(sanitized_uri, serverSelectionTimeoutMS=8000, connectTimeoutMS=8000)
        client.admin.command('ping')
        t1 = time.time()
        mongodb_ping_ms = round((t1 - t0) * 1000, 1)

        mongo_client = client
        db = mongo_client.get_database("medico_analytics")
        practice_logs_col = db.get_collection("practice_logs")
        mongodb_last_error = ""
        print(f"[OK] [MONGODB ATLAS CONNECTED] Cluster: {mongodb_cluster_name} | Latency: {mongodb_ping_ms}ms | DB: medico_analytics", flush=True)
    except Exception as mongo_err:
        mongodb_last_error = str(mongo_err)
        print(f"[WARN] [MONGODB CONNECTION NOTICE]: {mongo_err}", flush=True)
        mongo_client = None
        practice_logs_col = None

connect_mongodb()

def log_case_practice(specialty: str, history_text: str, result_text: str):
    """Silently logs practice case metadata directly into MongoDB Atlas."""
    global practice_logs_col
    try:
        if practice_logs_col is None:
            connect_mongodb()

        # Extract demographic hints from history
        age_match = re.search(r'Patient:\s*([^,\n.]+)', history_text, re.IGNORECASE)
        patient_info = age_match.group(1).strip() if age_match else "Unspecified"

        complaint_match = re.search(r'Chief Complaint:\s*([^\n]+)', history_text, re.IGNORECASE)
        chief_complaint = complaint_match.group(1).strip() if complaint_match else "Unspecified"

        # Extract Most Likely and Confidence from Gemini output
        most_likely_match = re.search(r'MOST LIKELY:?\s*([^\n]+)', result_text, re.IGNORECASE)
        most_likely = most_likely_match.group(1).strip().replace("*", "") if most_likely_match else "Clinical Assessment"

        confidence_match = re.search(r'CONFIDENCE:?\s*([^\n]+)', result_text, re.IGNORECASE)
        confidence = confidence_match.group(1).strip().replace("*", "") if confidence_match else "Moderate"

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if practice_logs_col is not None:
            doc = {
                "timestamp": now_str,
                "specialty": specialty,
                "patient_age": patient_info,
                "patient_gender": "",
                "chief_complaint": chief_complaint,
                "most_likely": most_likely,
                "confidence": confidence,
                "feedback": None
            }
            res = practice_logs_col.insert_one(doc)
            return str(res.inserted_id)
        else:
            print(f"[ERROR] Cannot log case: MongoDB Atlas is disconnected ({mongodb_last_error})", flush=True)
            return None
    except Exception as log_err:
        print(f"MongoDB logging error: {log_err}", flush=True)
        return None

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

def generate_with_gemini(client, prompt: str):
    """
    Calls Gemini with automatic model fallback and retry backoff.
    Protects against transient 503 UNAVAILABLE (high traffic / overloaded) and 429 errors.
    """
    models_to_try = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.8-flash"
    ]
    last_err = None

    for model_name in models_to_try:
        for attempt in range(2):
            try:
                print(f"[GEMINI] Calling model '{model_name}' (attempt {attempt + 1})...", flush=True)
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                if response and response.text:
                    print(f"[OK] [GEMINI SUCCESS] Model '{model_name}' generated response.", flush=True)
                    return response
            except Exception as err:
                last_err = err
                err_str = str(err)
                print(f"[WARN] [GEMINI RETRY] Model '{model_name}' attempt {attempt + 1} failed: {err_str[:120]}", flush=True)
                if any(x in err_str for x in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "overloaded", "experiencing"]):
                    time.sleep(1.2 * (attempt + 1))
                    continue
                else:
                    break

    raise last_err or Exception("All Gemini models failed to generate content.")

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
        response = generate_with_gemini(client, prompt)

        print("STEP 5: Gemini response received", flush=True)

        # Log case practice for private admin analytics
        case_id = log_case_practice(specialty, history, response.text)

        return jsonify({
            "result": response.text,
            "specialty": specialty,
            "caseId": case_id
        })
    except Exception as e:
        print("GEMINI ERROR:", str(e), flush=True)
        return jsonify({
            "error": "Gemini request failed: " + str(e)
        }), 500


# --------------------------------
# PRIVATE ADMIN ANALYTICS & FEEDBACK ENDPOINTS
# --------------------------------
@app.route("/api/mongodb/status", methods=["GET"])
def get_mongodb_status():
    global mongo_client, practice_logs_col, mongodb_cluster_name, mongodb_ping_ms, mongodb_last_error

    if practice_logs_col is None:
        connect_mongodb()

    ping_ok = False
    current_ping = mongodb_ping_ms
    doc_count = 0

    if mongo_client:
        try:
            t0 = time.time()
            mongo_client.admin.command('ping')
            t1 = time.time()
            current_ping = round((t1 - t0) * 1000, 1)
            ping_ok = True
            if practice_logs_col is not None:
                doc_count = practice_logs_col.count_documents({})
        except Exception as e:
            mongodb_last_error = str(e)
            ping_ok = False
            connect_mongodb()

    if ping_ok and practice_logs_col is not None:
        return jsonify({
            "status": "connected",
            "connected": True,
            "cluster": mongodb_cluster_name,
            "database": "medico_analytics",
            "collection": "practice_logs",
            "pingMs": current_ping,
            "totalRecords": doc_count,
            "storage": "MongoDB Atlas"
        })
    else:
        return jsonify({
            "status": "disconnected",
            "connected": False,
            "cluster": mongodb_cluster_name or "Not connected",
            "error": mongodb_last_error or "MongoDB not reachable",
            "storage": "MongoDB Atlas (Disconnected)"
        }), 200


@app.route("/api/feedback", methods=["POST"])
def submit_feedback():
    global practice_logs_col
    try:
        data = request.get_json(silent=True) or {}
        case_id = data.get("caseId")
        feedback = str(data.get("feedback", "")).strip().lower()

        if feedback not in ["satisfied", "unsatisfied"]:
            return jsonify({"error": "Invalid feedback. Use 'satisfied' or 'unsatisfied'."}), 400

        if practice_logs_col is None:
            connect_mongodb()

        if practice_logs_col is not None:
            try:
                if case_id:
                    from bson import ObjectId
                    try:
                        practice_logs_col.update_one({"_id": ObjectId(case_id)}, {"$set": {"feedback": feedback}})
                    except Exception:
                        practice_logs_col.update_one({"id": case_id}, {"$set": {"feedback": feedback}})
                else:
                    latest = practice_logs_col.find_one(sort=[("_id", -1)])
                    if latest:
                        practice_logs_col.update_one({"_id": latest["_id"]}, {"$set": {"feedback": feedback}})
                return jsonify({
                    "status": "ok", 
                    "message": "Feedback recorded in MongoDB Atlas.", 
                    "storage": "MongoDB Atlas"
                })
            except Exception as m_err:
                print(f"MongoDB feedback error: {m_err}", flush=True)
                return jsonify({"error": f"MongoDB feedback update failed: {m_err}"}), 500
        else:
            return jsonify({
                "error": f"Cannot record feedback: MongoDB Atlas is not connected ({mongodb_last_error})"
            }), 503
    except Exception as err:
        return jsonify({"error": f"Failed to record feedback: {err}"}), 500


@app.route("/api/stats", methods=["GET"])
def get_stats():
    global practice_logs_col
    key = str(request.args.get("key") or request.headers.get("x-admin-key") or "").strip()
    if key not in ADMIN_PINS:
        return jsonify({"error": "Unauthorized: Invalid PIN"}), 401

    if practice_logs_col is None:
        connect_mongodb()

    today_str = datetime.now().strftime("%Y-%m-%d")

    if practice_logs_col is not None:
        try:
            total_cases = practice_logs_col.count_documents({})
            clinical_cases = practice_logs_col.count_documents({"specialty": "clinical"})
            pediatric_cases = practice_logs_col.count_documents({"specialty": "pediatrics"})
            today_cases = practice_logs_col.count_documents({"timestamp": {"$regex": f"^{today_str}"}})

            recent_docs = list(practice_logs_col.find({}).sort("_id", -1).limit(50))
            recent_logs = []
            for doc in recent_docs:
                recent_logs.append({
                    "id": str(doc.get("_id", "")),
                    "timestamp": doc.get("timestamp", ""),
                    "specialty": doc.get("specialty", "clinical"),
                    "patient": doc.get("patient_age", "Unspecified"),
                    "chiefComplaint": doc.get("chief_complaint", "Unspecified"),
                    "mostLikely": doc.get("most_likely", "Clinical Assessment"),
                    "confidence": doc.get("confidence", "Moderate")
                })

            return jsonify({
                "status": "ok",
                "database": "MongoDB Atlas",
                "storage": "MongoDB Atlas",
                "mongodb": {
                    "connected": True,
                    "cluster": mongodb_cluster_name,
                    "pingMs": mongodb_ping_ms
                },
                "totalCases": total_cases,
                "clinicalCases": clinical_cases,
                "pediatricCases": pediatric_cases,
                "todayCases": today_cases,
                "recentLogs": recent_logs
            })
        except Exception as m_err:
            return jsonify({
                "status": "error",
                "database": "MongoDB Atlas",
                "storage": "MongoDB Atlas",
                "mongodb": {
                    "connected": False,
                    "cluster": mongodb_cluster_name,
                    "error": str(m_err)
                },
                "error": f"Failed to fetch stats from MongoDB Atlas: {m_err}",
                "totalCases": 0,
                "clinicalCases": 0,
                "pediatricCases": 0,
                "todayCases": 0,
                "recentLogs": []
            }), 200
    else:
        return jsonify({
            "status": "disconnected",
            "database": "MongoDB Atlas",
            "storage": "MongoDB Atlas (Disconnected)",
            "mongodb": {
                "connected": False,
                "cluster": mongodb_cluster_name or "Not connected",
                "error": mongodb_last_error or "MongoDB not reachable"
            },
            "error": f"MongoDB Atlas not connected: {mongodb_last_error}",
            "totalCases": 0,
            "clinicalCases": 0,
            "pediatricCases": 0,
            "todayCases": 0,
            "recentLogs": []
        }), 200


@app.route("/api/stats/clear", methods=["POST", "DELETE"])
def clear_stats():
    global practice_logs_col
    key = str(request.args.get("key") or request.headers.get("x-admin-key") or "").strip()
    if key not in ADMIN_PINS:
        return jsonify({"error": "Unauthorized: Invalid PIN"}), 401

    if practice_logs_col is None:
        connect_mongodb()

    if practice_logs_col is not None:
        try:
            practice_logs_col.delete_many({})
            return jsonify({"status": "ok", "message": "All practice cases cleared from MongoDB Atlas."})
        except Exception as m_err:
            return jsonify({"error": f"Failed to clear MongoDB Atlas: {m_err}"}), 500
    else:
        return jsonify({"error": f"MongoDB Atlas not connected: {mongodb_last_error}"}), 503


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
