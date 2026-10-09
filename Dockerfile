# ==============================================================================
# JURISAI — Containerfile / Dockerfile
# Multi-stage lightweight Python 3.12 image for JURISAI backend & static frontend
# ==============================================================================
FROM python:3.12-slim AS base

WORKDIR /app

# Install system dependencies (build tools, libmagic, poppler for PDF tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    file \
    libmagic1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application backend and frontend assets
COPY backend/ ./backend/
COPY assets/ ./assets/
COPY *.html ./
COPY *.js ./
COPY *.json ./
COPY *.png ./

# Create data and storage directories
RUN mkdir -p data/storage/quarantine data/storage/verified data/storage/reports

# Expose port
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV DATABASE_URL=sqlite+aiosqlite:///./data/jurisai.db

# Seed database on startup if not initialized, then run uvicorn
CMD ["sh", "-c", "python -m backend.app.services.seed_data && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"]
