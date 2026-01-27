from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

app.include_router(recipes.router, prefix="/api", tags=["recipes"])
app.include_router(allergens.router, prefix="/api", tags=["allergens"])
app.include_router(meal_plan.router, prefix="/api", tags=["meal_plan"])
app.include_router(shopping_list.router, prefix="/api", tags=["shopping_list"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

# Dedicated endpoint for candidate images (bypasses static mount issues)
@app.get("/api/static/images/recipes/candidates/{filename}")
async def serve_candidate_image(filename: str):
    """Serve candidate images directly to bypass StaticFiles mount issues in containers"""
    candidates_dir = os.path.join(static_dir, "images", "recipes", "candidates")
    file_path = os.path.join(candidates_dir, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Candidate image not found: {filename}")

@app.get("/api/static/images/recipes/{filename}")
async def serve_recipe_image(filename: str):
    """Serve recipe images directly to bypass StaticFiles mount issues in containers"""
    recipe_dir = os.path.join(static_dir, "images", "recipes")
    file_path = os.path.join(recipe_dir, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Recipe image not found: {filename}")

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
