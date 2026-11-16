/** 지원 지역의 행정동 하나 (API.md `GET /api/regions`) */
export interface Region {
  /** 행정안전부 10자리 행정동 코드 */
  regionCode: string
  name: string
  sigunguName: string
}
