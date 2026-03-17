"""
RAG source management endpoints.
GET    /api/rag/sources
POST   /api/rag/sources/upload
PUT    /api/rag/sources/{filename}/toggle
DELETE /api/rag/sources/{filename}
"""
from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from typing import List

from schemas.settings import RAGSource
from db.repositories.settings import get_settings_record, save_settings_record
import services.rag as rag_service

router = APIRouter()


_KB_DIR = Path(__file__).resolve().parent.parent / "knowledgebases"
_ALLOWED_EXTENSIONS = {".md", ".txt", ".pdf", ".docx"}


@router.get("/api/rag/sources", response_model=List[RAGSource])
async def list_rag_sources() -> List[RAGSource]:
    return rag_service.list_sources()


_ALLOWED_FOLDERS = {"", "nutrition", "recipe"}


@router.post("/api/rag/sources/upload", response_model=RAGSource, status_code=201)
async def upload_rag_source(
    file: UploadFile = File(...),
    folder: str = Form(default=""),
) -> RAGSource:
    """Upload a new knowledge base file and index it.

    folder: optional subfolder inside knowledgebases/ — "" | "nutrition" | "recipe"
    """
    if folder not in _ALLOWED_FOLDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid folder '{folder}'. Allowed: {sorted(_ALLOWED_FOLDERS)}",
        )

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {sorted(_ALLOWED_EXTENSIONS)}",
        )

    target_dir = (_KB_DIR / folder) if folder else _KB_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    dest = target_dir / (file.filename or "upload.md")

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Index the uploaded file
    from rag import kb_store
    rel_from_kb = str(dest.relative_to(_KB_DIR))  # e.g. "nutrition/dietitian_kb.md"
    rel_path = f"knowledgebases/{rel_from_kb}"
    try:
        n = kb_store.index_kb(rel_path, force=True)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Indexing failed: {e}") from e

    return RAGSource(
        filename=rel_from_kb,
        enabled=False,
        size_bytes=dest.stat().st_size,
        chunk_count=n,
    )


@router.put("/api/rag/sources/{filename:path}/toggle", response_model=RAGSource)
async def toggle_rag_source(filename: str) -> RAGSource:
    sources = rag_service.list_sources()
    target = next((s for s in sources if s.filename == filename), None)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Source '{filename}' not found")

    # Toggle in settings
    settings = get_settings_record()
    enabled_set = set(settings.rag_sources_enabled)
    if filename in enabled_set:
        enabled_set.discard(filename)
    else:
        enabled_set.add(filename)
    settings.rag_sources_enabled = sorted(enabled_set)
    save_settings_record(settings)

    target.enabled = filename in enabled_set
    return target


@router.delete("/api/rag/sources/{filename:path}", status_code=204)
async def delete_rag_source(filename: str) -> None:
    """Remove from enabled list (physical file deletion not implemented)."""
    settings = get_settings_record()
    enabled_set = set(settings.rag_sources_enabled)
    enabled_set.discard(filename)
    settings.rag_sources_enabled = sorted(enabled_set)
    save_settings_record(settings)
