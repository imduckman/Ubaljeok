# API 계약 초안 (Week 1)

## 공통
- Base URL: `/api`
- 인증: Week 1 미적용 (향후 JWT 예정)
- 응답 형식: `application/json`

## Health Check
### `GET /api/health`
서비스 상태 확인

#### Response 200
```json
{
  "status": "ok"
}
```

## 예정 엔드포인트 (초안)
- `POST /api/auth/login`
- `POST /api/groups`
- `POST /api/groups/join`
- `POST /api/photos`
- `GET /api/visits/map`
- `POST /api/game/buildings/purchase`
- `POST /api/diary/jobs`
