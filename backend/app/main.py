from fastapi import FastAPI

from app.regions import router as regions_router

app = FastAPI(title="Ubaljeok API", version="0.1.0")
app.include_router(regions_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
