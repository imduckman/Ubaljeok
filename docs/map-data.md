# 수원시 행정동 경계 자료

우발적 MVP는 [admdongkor](https://github.com/vuski/admdongkor)의 `ver20261001`에서 수원시 행정동 44개를 사용한다. 원본 경계 좌표는 보존한다. 원자료는 통계지리정보서비스(SGIS, 공공누리 제1유형), 가공 자료는 vuski/admdongkor(CC BY 4.0)에서 제공한다.

지도·백엔드·수동 선택 목록의 공통 키는 행정안전부 `adm_cd2`의 **10자리 문자열 `regionCode`**다. 통계청 `adm_cd`는 출처 대조에 사용한다. 프론트 조회 응답과 PostGIS 적재 데이터의 버전을 맞춘다.

- [경계 데이터 구조·버전 변경](../backend/app/data/README.md)
- [데이터 라이선스 전문](../frontend/public/data/LICENSE-DATA.txt)
- [사진·지도 구현 기준](./MVP-IMPLEMENTATION.md#3-사진지도)
