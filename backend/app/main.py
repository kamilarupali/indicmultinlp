from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routes import analyze, assistant, datasets, experiments, intent, language, models, sentiment, translate, tts
from app.utils.config import settings
from app.utils.paths import FRONTEND_DIST

app = FastAPI(title="IndicMultiNLP API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
for router in (
    analyze.router,
    language.router,
    sentiment.router,
    intent.router,
    models.router,
    experiments.router,
    datasets.router,
    translate.router,
    assistant.router,
    tts.router,
):
    app.include_router(router, prefix="/api")


@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/api/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}


if (FRONTEND_DIST / "index.html").is_file():
    if (FRONTEND_DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    async def serve_spa(full_path: str = ""):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API route not found")
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        return {"name": "IndicMultiNLP API", "docs": "/docs", "status": "ok"}

