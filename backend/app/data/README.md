# 수원시 행정동 경계 데이터

`suwon-ver20261001.geojson`은 수원시 행정동 44개를 담은 파일입니다. 경계 좌표, 이름, 두 행정동 코드가 [admdongkor ver20261001 원본](https://github.com/vuski/admdongkor/blob/master/ver20261001/HangJeongDong_ver20261001.geojson)의 수원시 항목과 일치함을 확인했습니다.

원자료는 [통계청 통계지리정보서비스(SGIS)](https://sgis.kostat.go.kr)의 행정동 경계이며 [공공누리 제1유형](https://www.kogl.or.kr/info/licenseType1.do)을 따릅니다. 가공 데이터 제공자는 [vuski/admdongkor](https://github.com/vuski/admdongkor)이며 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)으로 배포합니다. 출처 표시 조건은 [LICENSE-DATA](https://github.com/vuski/admdongkor/blob/master/LICENSE-DATA)를 참고합니다.

## 버전 변경

- 파일명과 API의 `dataset.source_version`에 원본 버전을 기록합니다. 프로젝트에서 데이터에 적용한 변경은 Git 이력으로 추적합니다.
- 경계를 갱신할 때는 파일, `regions.py`의 `SOURCE_VERSION`, API 문서와 테스트를 같은 PR에서 갱신합니다. PR에 원본 출처와 바뀐 동·코드·경계를 기록해 지도·백엔드 담당자가 확인할 수 있게 합니다.
