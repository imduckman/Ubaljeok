# 우발적 (偶發的)

6명이 6주 동안 개발하는 위치 기반 사진 공유 + 그룹 땅따먹기 서비스의 초기 Monorepo입니다.

## 1주 차 목표
- 공통 폴더 구조 확정
- 프론트/백엔드 최소 실행 코드 제공
- Docker Compose 5개 서비스 기본 연결
- 협업 문서 및 PR/CI 기본 틀 마련

## 프로젝트 구조
```text
ubaljeok/
├── frontend/                  # React + Vite + TypeScript
├── backend/                   # FastAPI + SQLAlchemy + Alembic
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── core/
│   ├── alembic/
│   └── tests/
├── worker/                    # Redis/RQ 비동기 작업 워커
├── infra/
│   └── nginx/                 # Nginx 정적 서빙 + API 프록시
├── .github/
│   ├── workflows/ci.yml       # 기본 품질 검사
│   └── PULL_REQUEST_TEMPLATE.md
├── API.md                     # API 계약 초안
├── RULES.md                   # Git 협업 규칙
├── Guide.md                   # 팀원·AI 작업 절차 및 실행 안내
├── compose.yaml               # 개발용 통합 실행
├── .env.example
└── README.md
```

## 기술 스택 (Week 1 반영)
- Frontend: React, Vite, TypeScript, Vitest
- Backend: FastAPI, SQLAlchemy, Alembic, pytest
- Infra: Docker, Docker Compose, Nginx
- Data/Queue: PostgreSQL(PostGIS), Redis, RQ
- Video 파이프라인 준비: worker 컨테이너에 FFmpeg 확장 가능 구조

## 빠른 시작
### 1) 환경 변수 준비
```bash
cp .env.example .env
```

### 2) 프론트엔드 로컬 실행
```bash
cd frontend
npm install
npm run dev
```

### 3) 백엔드 로컬 실행
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
- Health check: `http://localhost:8000/health`

### 4) Docker Compose 통합 실행
```bash
docker compose -f compose.yaml up --build
```
- 공개 포트: nginx만 외부 공개 (`http://localhost:${NGINX_PORT:-80}`)
- 내부 연결: `nginx -> api`, `api/worker -> db/redis`
- DB 테이블 생성·갱신(처음 실행하거나 마이그레이션이 추가됐을 때):
  ```bash
  docker compose exec api alembic upgrade head
  ```

## 기본 검증 명령
```bash
# frontend
cd frontend
npm run lint
npm run test -- --run
npm run build

# backend
cd backend
pytest
```

## 문서
- 협업 규칙: [`RULES.md`](./RULES.md)
- 팀원·AI 작업 가이드: [`Guide.md`](./Guide.md)
- API 초안: [`API.md`](./API.md)
