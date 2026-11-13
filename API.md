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

## 행정동 조회

아래 경로는 Nginx 경유 기준입니다. FastAPI에 직접 요청할 때는 `/api`를 제외합니다. 두 조회는 인증 없이 호출할 수 있습니다.

| 경로 | 응답 |
| --- | --- |
| `GET /api/regions` | `application/json`. 선택 목록에 사용할 행정동 이름과 공통 행정동 코드 |
| `GET /api/regions/geojson` | `application/geo+json`. 지도에 표시할 수원시 행정동 44개의 GeoJSON `FeatureCollection` |

두 응답의 최상위 `dataset`에는 `source_version`, `status`, `source_url`, `license_url`, `attribution`이 있습니다. 현재 원본 버전은 `ver20261001`이며 `status`는 `active`입니다. 지도에서 `attribution`과 출처 링크를 표시할 수 있습니다.

`/api/regions`의 `regions` 배열 항목 예시입니다.

```json
{
  "name": "경기도 수원시장안구 파장동",
  "region_code": "4111156000",
  "adm_cd": "31011540",
  "adm_cd2": "4111156000"
}
```

GeoJSON의 각 `Feature.properties`에는 같은 `region_code`와 이름(`adm_nm`)이 들어 있습니다. 지도·API의 공통 키인 `region_code`는 원본 `adm_cd2`의 10자리 문자열입니다. `adm_cd`와 `adm_cd2`는 원본 필드입니다.

검증한 수원시 부분집합을 API 이미지에 포함합니다. 원본과 라이선스는 [데이터 출처 문서](./backend/app/data/README.md)를 참고합니다.

## 예정 엔드포인트 (초안)
- `POST /api/auth/login`
- `POST /api/groups`
- `POST /api/groups/join`
- `POST /api/photos`
- `GET /api/visits/map`
- `POST /api/game/buildings/purchase`
- `POST /api/diary/jobs`
