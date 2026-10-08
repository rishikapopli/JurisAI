# JURISAI Phase 1

Local development application using Python, SQLite, and the included frontend. Each account starts with an empty workspace.

## Run

From the project root, install the optional PDF extractor and start the server:

```powershell
py -m pip install -r requirements.txt
py backend/server.py
```

Open `http://127.0.0.1:8787/`. Register an account, enter the development verification code shown by the app, then upload files from **Documents → Upload Document**.

## Document handling

- Accepts PDF, DOCX, UTF-8 TXT, PNG, JPG, and TIFF files up to 50 MB.
- Checks extension, file signature, and basic structure; rejects mismatches and incomplete files.
- Computes and stores SHA-256, file size, and available PDF/DOCX metadata and text.
- Serves authenticated inline viewing for PDF and supported images; provides a text viewer for DOCX/TXT and authenticated original downloads.
- Persists upload, archive/restore, and delete operations in SQLite and stores uploaded files under `backend/uploads/`.
- Antivirus is **not configured by default**. To enable ClamAV daemon scanning, set `JURISAI_CLAMD_HOST` and optionally `JURISAI_CLAMD_PORT` (default `3310`) before startup. Upload is rejected if a configured scanner is unavailable or reports a threat.

`pypdf` enables PDF text extraction. If it is unavailable, the PDF can still be validated and viewed, but extracted text is not provided. Images are not OCR processed.

## Not implemented

LLM/RAG, OCR, prompt-injection detection, sensitive-data detection/redaction, legislation integration, comparison, generated reports, email delivery, and Google authentication are not enabled. The interface does not show seeded workspace, document, activity, notification, or research records.
