import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.services.seed_data import seed_database

# Routers
from backend.app.api.auth import router as auth_router
from backend.app.api.users import router as users_router
from backend.app.api.meta import router as meta_router
from backend.app.api.documents import router as documents_router
from backend.app.api.security import router as security_router
from backend.app.api.analysis import router as analysis_router
from backend.app.api.compare import router as compare_router
from backend.app.api.legal import router as legal_router
from backend.app.api.research import router as research_router
from backend.app.api.evidence import router as evidence_router
from backend.app.api.reviews import router as reviews_router
from backend.app.api.reports import router as reports_router
from backend.app.api.audit import router as audit_router
from backend.app.api.system import router as system_router
from backend.app.api.search import router as search_router
from backend.app.api.help import router as help_router
from backend.app.api.translate import router as translate_router
from backend.app.api.adversarial_trust import router as adv_trust_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    # Seed data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers under /api
api_prefix = "/api"
app.include_router(auth_router, prefix=api_prefix)
app.include_router(users_router, prefix=api_prefix)
app.include_router(meta_router, prefix=api_prefix)
app.include_router(documents_router, prefix=api_prefix)
app.include_router(security_router, prefix=api_prefix)
app.include_router(analysis_router, prefix=api_prefix)
app.include_router(compare_router, prefix=api_prefix)
app.include_router(legal_router, prefix=api_prefix)
app.include_router(research_router, prefix=api_prefix)
app.include_router(evidence_router, prefix=api_prefix)
app.include_router(reviews_router, prefix=api_prefix)
app.include_router(reports_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(system_router, prefix=api_prefix)
app.include_router(search_router, prefix=api_prefix)
app.include_router(help_router, prefix=api_prefix)
app.include_router(translate_router, prefix=api_prefix)
app.include_router(adv_trust_router, prefix=api_prefix)

# Mount assets directory
assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../..", "assets"))
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Serve HTML root files
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))

@app.get("/")
def get_index():
    index_file = os.path.join(root_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "JURISAI Backend Operational"}

@app.get("/app.html")
def get_app():
    return FileResponse(os.path.join(root_dir, "app.html"))

@app.get("/signin.html")
def get_signin():
    return FileResponse(os.path.join(root_dir, "signin.html"))

@app.get("/signup.html")
def get_signup():
    return FileResponse(os.path.join(root_dir, "signup.html"))

@app.get("/reset-password.html")
def get_reset_password():
    reset_file = os.path.join(root_dir, "reset-password.html")
    if os.path.exists(reset_file):
        return FileResponse(reset_file)
    return FileResponse(os.path.join(root_dir, "signin.html"))

@app.get("/design-system.html")
def get_design_system():
    return FileResponse(os.path.join(root_dir, "design-system.html"))
