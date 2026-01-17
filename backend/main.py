from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

from routers import recipes, allergens, meal_plan, shopping_list

app.include_router(recipes.router, prefix="/api", tags=["recipes"])
app.include_router(allergens.router, prefix="/api", tags=["allergens"])
app.include_router(meal_plan.router, prefix="/api", tags=["meal_plan"])
app.include_router(meal_plan.router, prefix="/api", tags=["meal_plan"])
app.include_router(shopping_list.router, prefix="/api", tags=["shopping_list"])

from routers import settings
app.include_router(settings.router, prefix="/api", tags=["settings"])

# Serve frontend static files
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    return FileResponse("static/index.html")
