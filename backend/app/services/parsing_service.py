import re
import os
import io
from typing import Dict, Any, List, Tuple
from pypdf import PdfReader
from docx import Document as DocxDocument

class ParsingService:
    CLAUSE_REGEX = re.compile(r"^(?:(?:clause|section|article)\s+)?([0-9]{1,2}\.[0-9]{1,2}(?:\.[0-9]+)?)\s*[:.\-–—]?\s*(.*)", re.IGNORECASE)
    SECTION_REGEX = re.compile(r"^(?:(?:clause|section|article)\s+)?([0-9]{1,2})\s*[:.\-–—]\s*(.*)", re.IGNORECASE)

    @classmethod
    def extract_text_and_pages(cls, file_bytes: bytes, filename: str) -> Tuple[str, List[Dict[str, Any]]]:
        ext = os.path.splitext(filename)[1].lower().lstrip(".")
        pages: List[Dict[str, Any]] = []
        full_text = ""

        if ext == "pdf":
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                for idx, page in enumerate(reader.pages):
                    t = page.extract_text() or ""
                    pages.append({"page_no": idx + 1, "text": t, "char_count": len(t)})
                    full_text += t + "\n\n"
            except Exception:
                pass
        elif ext in ["doc", "docx"]:
            try:
                doc = DocxDocument(io.BytesIO(file_bytes))
                paras = [p.text for p in doc.paragraphs if p.text.strip()]
                # Approximate 40 paragraphs per page
                chunk_size = 35
                for page_idx in range(0, max(1, len(paras)), chunk_size):
                    chunk = "\n".join(paras[page_idx:page_idx + chunk_size])
                    p_no = (page_idx // chunk_size) + 1
                    pages.append({"page_no": p_no, "text": chunk, "char_count": len(chunk)})
                    full_text += chunk + "\n\n"
            except Exception:
                pass
        else: # txt or fallback
            try:
                decoded = file_bytes.decode("utf-8", errors="replace")
                lines = decoded.splitlines()
                chunk_size = 50
                for page_idx in range(0, max(1, len(lines)), chunk_size):
                    chunk = "\n".join(lines[page_idx:page_idx + chunk_size])
                    p_no = (page_idx // chunk_size) + 1
                    pages.append({"page_no": p_no, "text": chunk, "char_count": len(chunk)})
                    full_text += chunk + "\n\n"
            except Exception:
                pass

        if not pages:
            pages = [{"page_no": 1, "text": full_text or "Empty document", "char_count": len(full_text)}]

        return full_text, pages

    @classmethod
    def parse_clauses_and_structure(cls, pages: List[Dict[str, Any]], filename: str) -> Dict[str, Any]:
        clauses_by_section: List[Dict[str, Any]] = []
        current_section = {"id": "1", "title": "General Terms", "page": 1, "paras": []}
        all_clauses: List[Dict[str, Any]] = []
        sec_counter = 1
        para_counter = 1

        for page in pages:
            p_no = page["page_no"]
            lines = [l.strip() for l in page["text"].split("\n") if l.strip()]

            for line in lines:
                c_match = cls.CLAUSE_REGEX.match(line)
                s_match = cls.SECTION_REGEX.match(line)

                if s_match and not c_match:
                    sec_num = s_match.group(1)
                    sec_title = s_match.group(2).strip() or f"Section {sec_num}"
                    if current_section["paras"]:
                        clauses_by_section.append(current_section)
                    sec_counter += 1
                    current_section = {"id": sec_num, "title": sec_title, "page": p_no, "paras": []}
                    continue

                if c_match:
                    ref = c_match.group(1)
                    text = line
                    current_section["paras"].append({"ref": ref, "text": text})
                    all_clauses.append({"ref": ref, "title": current_section["title"], "text": text, "page": p_no})
                else:
                    if len(line) > 25 and not line.isupper():
                        ref = f"{sec_counter}.{para_counter}"
                        para_counter += 1
                        current_section["paras"].append({"ref": ref, "text": line})
                        all_clauses.append({"ref": ref, "title": current_section["title"], "text": line, "page": p_no})

        if current_section["paras"]:
            clauses_by_section.append(current_section)

        # Fallback if no structured clauses were matched
        if not clauses_by_section or not all_clauses:
            clauses_by_section = [{
                "id": "1",
                "title": "Document Provisions",
                "page": 1,
                "paras": [
                    {"ref": "1.1", "text": pages[0]["text"][:400] if pages else "Document content"}
                ]
            }]
            all_clauses = [{"ref": "1.1", "title": "Document Provisions", "text": pages[0]["text"][:400] if pages else "", "page": 1}]

        return {
            "sections": clauses_by_section,
            "clauses": all_clauses
        }

parsing_service = ParsingService()
