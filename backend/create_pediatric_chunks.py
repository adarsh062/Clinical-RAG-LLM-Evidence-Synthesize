import os
import re
import chromadb
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

BOOKS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "books", "Pediatric")
CHROMA_PED_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db_pediatric")

class FastEmbeddingFunction(chromadb.EmbeddingFunction):
    def __init__(self):
        super().__init__()
    def __call__(self, input):
        # 384-dim dummy vector for instant FTS indexing without ONNX downloads
        return [[0.0] * 384 for _ in input]

print(f"Connecting to ChromaDB at: {CHROMA_PED_DIR}", flush=True)
chroma_client = chromadb.PersistentClient(path=CHROMA_PED_DIR)
collection = chroma_client.get_or_create_collection(
    name="pediatric_books",
    embedding_function=FastEmbeddingFunction()
)

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=200
)

# Process all PDFs in the Pediatric books folder
for filename in os.listdir(BOOKS_FOLDER):
    if not filename.lower().endswith(".pdf"):
        continue

    filepath = os.path.join(BOOKS_FOLDER, filename)
    filesize_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"\n========================================", flush=True)
    print(f"Reading: {filename} ({filesize_mb:.1f} MB)", flush=True)
    print(f"========================================", flush=True)

    try:
        reader = PdfReader(filepath)
        total_pages = len(reader.pages)
        print(f"Total pages: {total_pages}", flush=True)

        full_text = ""
        for i, page in enumerate(reader.pages):
            try:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
            except Exception as pe:
                pass

            if (i + 1) % 100 == 0 or (i + 1) == total_pages:
                print(f"Extracted {i + 1}/{total_pages} pages ({len(full_text):,} characters)...", flush=True)

        if not full_text.strip():
            print(f"NOTE: No extractable text layer found in {filename} (scanned/image PDF). Skipping.", flush=True)
            continue

        print(f"Splitting {len(full_text):,} characters into chunks...", flush=True)
        chunks = splitter.split_text(full_text)
        print(f"Total chunks created: {len(chunks)}", flush=True)

        # Batch insert chunks into ChromaDB (batch size = 500)
        batch_size = 500
        clean_book_name = filename.replace(".pdf", "").replace("_", " ").strip()

        for b_start in range(0, len(chunks), batch_size):
            b_end = min(b_start + batch_size, len(chunks))
            b_chunks = chunks[b_start:b_end]

            ids = [f"{filename}_{idx}" for idx in range(b_start, b_end)]
            metadatas = [{"book": clean_book_name} for _ in b_chunks]

            collection.add(
                ids=ids,
                documents=b_chunks,
                metadatas=metadatas
            )
            print(f"   Indexed chunks {b_start + 1} to {b_end} of {len(chunks)}...", flush=True)

        print(f"Completed {filename} -> Current total collection chunks: {collection.count()}", flush=True)

    except Exception as e:
        print(f"Error processing {filename}: {e}", flush=True)

print(f"\n========================================")
print(f"PEDIATRIC CHROMA DATABASE CREATED SUCCESSFULLY")
print(f"Total Chunks in 'pediatric_books': {collection.count()}")
print(f"Location: {CHROMA_PED_DIR}")
print(f"========================================", flush=True)

