import os
import re
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
KNOWLEDGE_DIR = Path(__file__).parent / "rag_knowledge"
CHROMA_DIR = Path(__file__).parent / "chroma_db"

_collection = None
_embed_model = None


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


def _get_collection():
    global _collection
    if _collection is not None:
        return _collection
    import chromadb
    from sentence_transformers import SentenceTransformer

    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    class STEmbedder:
        def __init__(self):
            self.model = SentenceTransformer("all-MiniLM-L6-v2")

        def name(self):
            return "all-MiniLM-L6-v2"

        def __call__(self, input):
            return self.model.encode(input).tolist()

    _collection = client.get_or_create_collection(
        name="agroai",
        embedding_function=STEmbedder(),
        metadata={"hnsw:space": "cosine"},
    )

    if _collection.count() == 0:
        logger.info("Building vector index...")
        chunks, ids = _load_chunks()
        for i in range(0, len(chunks), 40):
            _collection.add(documents=chunks[i:i + 40], ids=ids[i:i + 40])
        logger.info(f"Index ready — {len(chunks)} chunks.")

    return _collection


def _load_chunks(chunk_size=250, overlap=50):
    chunks, ids = [], []
    counter = 0
    for md_file in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip() and not p.strip().startswith("#")]
        for para in paragraphs:
            words = para.split()
            start = 0
            while start < len(words):
                chunks.append(" ".join(words[start:start + chunk_size]))
                ids.append(f"chunk_{counter}")
                counter += 1
                start += chunk_size - overlap
    return chunks, ids


def query(user_question: str, top_k: int = 4) -> str:
    collection = _get_collection()
    q_embedding = _get_embed_model().encode([user_question]).tolist()
    results = collection.query(query_embeddings=q_embedding, n_results=top_k)
    context_chunks = results["documents"][0] if results["documents"] else []

    if not context_chunks:
        return "I don't have enough information to answer that. Please ask about crops, soil, irrigation, government schemes, pest control, or organic farming."

    context = "\n\n".join(context_chunks)

    if not GROQ_API_KEY:
        return f"Based on my knowledge: {context_chunks[0][:500]}"

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "1. Core Principle: Zero Fabrication Policy\n"
                        "The system must:\n"
                        "- Never fabricate data.\n"
                        "- Never invent scheme benefits, subsidy percentages, eligibility, deadlines, or URLs.\n"
                        "- Never invent fertilizer dosages.\n"
                        "- Never assume pesticide concentration.\n"
                        "- Never create scientific study references.\n"
                        "- Never guess yield numbers.\n"
                        "If information is not found in retrieved documents:\n"
                        "Explicitly state: 'This specific information was not found in the retrieved documents.'\n"
                        "Then provide clearly labeled general best-practice guidance separately.\n\n"
                        "2. Mandatory Response Structure (Non-Negotiable)\n"
                        "Every response must strictly follow this structure and use rich Markdown formatting (**bolding**, bullets, clear line breaks):\n"
                        "## Title *(in H2 format)*\n\n"
                        "**Summary:** *(2-3 lines)*\n\n"
                        "### 🔍 Retrieved Information\n"
                        "*(Only facts present in retrieved documents. Use bullet points `-`. No added assumptions.)*\n\n"
                        "### 🛠️ Actionable Recommendations\n"
                        "*(Based only on retrieved evidence. Use bullet points. If partially inferred, label bullet as: 'General Best Practice (Not from retrieved document)')*\n\n"
                        "### ⚠️ Precautions / Safety Notes\n"
                        "*(Use bullet points. Bold important words.)*\n\n"
                        "### ❓ Missing Information\n"
                        "*(If Applicable)*\n\n"
                        "Never merge sections. Always double-space between sections.\n\n"
                        "3. Strict RAG Grounding Rules\n"
                        "Prioritize retrieved content over model knowledge. Avoid expanding beyond retrieved scope. "
                        "Avoid filling gaps with assumptions. Avoid confident tone when uncertain. "
                        "If retrieval is weak or incomplete: Clearly acknowledge limitation and do not attempt to compensate with invented details."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {user_question}",
                },
            ],
            temperature=0.3,
            max_tokens=1024,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq error: {e}")
        return context_chunks[0][:500]
