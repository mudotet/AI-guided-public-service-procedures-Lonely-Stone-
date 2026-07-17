import re
import unicodedata
from collections.abc import Iterable
from typing import Any


def _document_key(name: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", name)).strip().casefold()


def deduplicate_documents(documents: Iterable[Any]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for document in documents:
        key = _document_key(document.name)
        if key not in merged:
            merged[key] = {
                "code": document.code,
                "name": document.name,
                "description": document.description,
                "required": document.required,
                "legal_basis": [document.legal_basis],
            }
            continue
        current = merged[key]
        current["required"] = current["required"] or document.required
        if document.legal_basis not in current["legal_basis"]:
            current["legal_basis"].append(document.legal_basis)
        if not current["description"] and document.description:
            current["description"] = document.description
    return list(merged.values())

