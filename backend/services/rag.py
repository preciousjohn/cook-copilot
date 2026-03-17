"""
RAG (Retrieval-Augmented Generation) service.
Thin wrapper around the existing KnowledgeBaseStore in rag.py.
"""
from __future__ import annotations

import sys
import os
from pathlib import Path
from typing import List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.settings import RAGSource


def list_sources(kb_dir: str = "knowledgebases") -> List[RAGSource]:
    """
    List all knowledge base files in the KB directory (recursively).
    filename is stored as the path relative to kb_dir (e.g. "nutrition/dietitian_kb.md").
    Enabled/disabled state is stored in app settings.
    """
    from db.repositories.settings import get_settings_record

    settings = get_settings_record()
    enabled_set = set(settings.rag_sources_enabled)

    sources: List[RAGSource] = []
    kb_path = Path(kb_dir)
    if not kb_path.exists():
        return sources

    for f in sorted(kb_path.rglob("*")):
        if f.is_file() and f.suffix.lower() in (".md", ".txt", ".pdf", ".docx"):
            rel = str(f.relative_to(kb_path))  # e.g. "nutrition/dietitian_kb.md"
            full_path = f"{kb_dir}/{rel}"
            chunk_count = _get_chunk_count(full_path)
            sources.append(
                RAGSource(
                    filename=rel,
                    enabled=rel in enabled_set,
                    size_bytes=f.stat().st_size,
                    chunk_count=chunk_count,
                )
            )
    return sources


def _get_chunk_count(kb_path: str) -> int:
    """Return the number of indexed chunks for a KB file, or 0 if not indexed."""
    try:
        from rag import kb_store
        chunks = kb_store.list_all_chunks(kb_path)
        return len(chunks)
    except Exception:
        return 0
