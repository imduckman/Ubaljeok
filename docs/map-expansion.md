# 남한 행정동 경계 확장

현재 /map에서는 수원시 경계 44개를 제공한다. [지역 설정](../frontend/src/pages/mapRegions.ts)에 표시 이름, 초기 범위(WGS84 경도·위도 순서), 경계 조회 함수를 선언한다. [지도 컴포넌트](../frontend/src/pages/RegionBoundaryMap.tsx)는 설정을 받아 렌더링한다. 실제 모드는 인증된 GeoJSON API를, Mock 모드는 로컬 경계 응답을 사용한다.

## 전국 데이터 적재 절차

1. 전국 읍면동 GeoJSON 원본의 버전을 고정한다. 원본 URL, 파일 해시, 라이선스와 출처 표기 문구를 PR에 기록한다. [경계 데이터 원본](https://github.com/vuski/admdongkor)
2. 검증용 임시 테이블에 먼저 가져온다. 좌표계는 EPSG:4326을 사용하고, Polygon과 MultiPolygon을 확인한다. 빈 도형, 유효하지 않은 도형, 행정동 코드 누락 및 중복이 있는지 검사한다. 지도와 백엔드의 공통 키인 regionCode에는 원본 adm_cd2의 10자리 문자열을 사용한다.
3. 운영용 PostGIS 모델에는 내부 지역 ID와 경계 버전을 기록한다. 버전별 행정동 코드 유일성과 경계의 공간 인덱스(GiST)를 구성한다. 검증이 끝나면 트랜잭션으로 새 버전을 활성화한다. 분동·합동·코드 변경 시 기존 방문이 참조하는 지역과 판정 버전을 보존한다.
4. 수원 44개를 기존 데이터와 대조하고 다른 시·군·구, 섬 지역, 경계선 위 좌표를 확인한다. 전환 오류 시 이전 활성 경계 버전으로 돌아갈 수 있게 한다.

## 지도에 제공하는 방식

- 시범 지역을 추가하는 단계에서는 지역별 GeoJSON URL로 제공한다. 지도 경계와 그룹별 방문·소유 데이터는 regionCode로 연결한다.
- 전국 단계에서는 낮은 확대 수준에서 시·도와 시·군·구, 높은 확대 수준에서 행정동 경계를 벡터 타일로 제공한다. 화면에 필요한 타일만 요청하도록 하고 지역 코드와 출처 표기를 유지한다. 사진 GPS 판정에는 PostGIS의 원본 경계를 사용한다. [MapLibre 대용량 데이터 가이드](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/) · [PostGIS 벡터 타일](https://postgis.net/docs/ST_AsMVT.html)