"""
CookPilot backend — app factory.

Registers all API routers, CORS middleware, SQLite DB init,
and ChromaDB knowledge-base indexing on startup.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from db.connection import db_init
from rag import kb_store

# API routers
from api.parse import router as parse_router
from api.dietitian import router as dietitian_router
from api.chef import router as chef_router
from api.engineer import router as engineer_router
from api.profiles import router as profiles_router
from api.settings import router as settings_router
from api.rag import router as rag_router
from api.batch import router as batch_router


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="CookPilot API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse_router)
app.include_router(dietitian_router)
app.include_router(chef_router)
app.include_router(engineer_router)
app.include_router(profiles_router)
app.include_router(settings_router)
app.include_router(rag_router)
app.include_router(batch_router)


# ── Startup ───────────────────────────────────────────────────────────────────

KB_DIR = Path(__file__).resolve().parent / "knowledgebases"
KB_EXTENSIONS = {".md", ".txt", ".pdf", ".docx"}


@app.on_event("startup")
def startup() -> None:
    """Initialize DB tables and index all knowledge base files."""
    db_init()
    _index_knowledge_bases()


def _index_knowledge_bases() -> None:
    if not KB_DIR.exists():
        print(f"[RAG] Warning: knowledgebases/ not found at {KB_DIR}")
        return

    indexed = 0
    for f in sorted(KB_DIR.rglob("*")):
        if f.is_file() and f.suffix.lower() in KB_EXTENSIONS:
            rel_path = f"knowledgebases/{f.relative_to(KB_DIR)}"
            try:
                n = kb_store.index_kb(rel_path)
                print(f"[RAG] Indexed {f.relative_to(KB_DIR)}: {n} chunks")
                indexed += 1
            except Exception as e:
                print(f"[RAG] Warning: failed to index {f.relative_to(KB_DIR)}: {e}")

    if indexed == 0:
        print("[RAG] Warning: no KB files found in knowledgebases/")


# ── Health + debug endpoints ──────────────────────────────────────────────────


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {"ok": True, "db_path": settings.db_path}


@app.get("/debug/kbs")
def debug_list_kbs() -> dict:
    """List all KB files in knowledgebases/ and their indexing status."""
    if not KB_DIR.exists():
        return {"error": "knowledgebases/ directory not found"}

    files = []
    for f in sorted(KB_DIR.rglob("*")):
        if f.is_file() and f.suffix.lower() in KB_EXTENSIONS:
            rel = f"knowledgebases/{f.relative_to(KB_DIR)}"
            files.append({
                "path": rel,
                "name": str(f.relative_to(KB_DIR)),
                "type": f.suffix.lower(),
                "size_kb": round(f.stat().st_size / 1024, 1),
                "indexed": f"kb_{f.stem}" in kb_store._stores,
            })

    return {"kb_dir": str(KB_DIR), "files": files}


@app.get("/debug/chunks")
def debug_list_chunks(kb_path: str = "knowledgebases/dietitian_kb.md") -> dict:
    """View all indexed chunks for a given KB file."""
    try:
        chunks = kb_store.list_all_chunks(kb_path)
        return {"kb_path": kb_path, "total_chunks": len(chunks), "chunks": chunks}
    except FileNotFoundError as e:
        return {"error": str(e)}
