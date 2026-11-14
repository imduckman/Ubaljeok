from fastapi import FastAPI

from app.api import auth, groups, photos, regions, visits
from app.core.errors import register_error_handlers

app = FastAPI(title="Ubaljeok API", version="0.1.0")

register_error_handlers(app)

# nginx가 /api/ 를 떼고 전달하므로 여기서는 /api 없이 등록한다.
# 예) 브라우저 /api/auth/login → api 서비스 /auth/login
app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(regions.router)
app.include_router(photos.router)
app.include_router(visits.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
