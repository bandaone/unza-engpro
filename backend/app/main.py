from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from .routers import core, entities, timetable, export
from .routers import auth as auth_router
from .routers import validation as validation_router
from .routers import issues as issues_router

app = FastAPI(title="Automated Timetable System", version="0.1.0")

# In production, we don't need CORS as frontend and backend are served from the same origin
if os.getenv("ENVIRONMENT") == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# API routes
app.include_router(core.router, prefix="/api")
app.include_router(auth_router.router, prefix="/api")
app.include_router(entities.router, prefix="/api")
app.include_router(timetable.router, prefix="/api")
app.include_router(validation_router.router, prefix="/api")
app.include_router(issues_router.router, prefix="/api")
app.include_router(export.router, prefix="/api")

# Serve static files and frontend
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
assets_dir = os.path.join(static_dir, "assets")

# Create static directories if they don't exist
os.makedirs(static_dir, exist_ok=True)
os.makedirs(assets_dir, exist_ok=True)

# Mount static files
app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    try:
        # First try to serve the exact file
        frontend_path = os.path.join(static_dir, full_path)
        if os.path.exists(frontend_path) and not os.path.isdir(frontend_path):
            return FileResponse(frontend_path)
        
        # If file doesn't exist or is a directory, serve index.html
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        # If no static files exist yet, return a temporary response
        return {"message": "Frontend not built yet. Please build and copy frontend files to the static directory."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
