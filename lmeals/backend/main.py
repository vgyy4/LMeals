from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

from fastapi import Request

@app.middleware("http")
async def strip_double_slashes(request: Request, call_next):
    if "//" in request.scope["path"]:
        request.scope["path"] = request.scope["path"].replace("//", "/")
    response = await call_next(request)
    return response

from routers import recipes, allergens, meal_plan, shopping_list

from routers import settings
import assets
import os

# Determine static directory (backend/static in dev, /app/static in container)
static_dir = assets.STATIC_DIR if os.path.exists(assets.STATIC_DIR) else "/app/static"
print(f"DEBUG: Using static directory: {static_dir}")
print(f"DEBUG: Static directory exists: {os.path.exists(static_dir)}")
if os.path.exists(static_dir):
    print(f"DEBUG: Static directory contents: {os.listdir(static_dir)}")
    images_dir = os.path.join(static_dir, "images", "recipes", "candidates")
    print(f"DEBUG: Candidates directory: {images_dir}")
    print(f"DEBUG: Candidates exists: {os.path.exists(images_dir)}")
    if os.path.exists(images_dir):
        print(f"DEBUG: Candidates listing: {os.listdir(images_dir)[:5] if os.listdir(images_dir) else 'empty'}")

app.include_router(recipes.router, prefix="/api", tags=["recipes"])
app.include_router(allergens.router, prefix="/api", tags=["allergens"])
app.include_router(meal_plan.router, prefix="/api", tags=["meal_plan"])
app.include_router(shopping_list.router, prefix="/api", tags=["shopping_list"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

app.mount("/api/static", StaticFiles(directory=static_dir), name="static")
print(f"DEBUG: Mounted /api/static -> {static_dir}")

import os

# Serve frontend static files
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Check if the requested path corresponds to a real file in the static directory
    static_file_path = os.path.join("static", full_path)
    if full_path and os.path.isfile(static_file_path):
        return FileResponse(static_file_path)
    # Default to index.html for SPA routing
    return FileResponse("static/index.html")
