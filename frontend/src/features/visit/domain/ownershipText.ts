import { MAX_TOLL, type RegionOwnership } from './RegionDetail'

/** 소유 상태의 제목과 설명 (건물 관리 탭의 성장 길 카드에서도 쓴다) */
export function describeOwnership(ownership: RegionOwnership): { title: string; note: string } {
  switch (ownership.status) {
    case 'unowned':
      return { title: '아직 주인이 없는 동네예요', note: '방문한 그룹은 이 동네에 건물을 구매할 수 있어요.' }
    case 'ours':
      return ownership.level === 'landmark'
        ? { title: '우리 그룹 랜드마크', note: `다른 그룹이 이 동네 사진을 올리면 통행료를 최대 ${MAX_TOLL}코인 받아요.` }
        : { title: '우리 그룹 건물', note: '랜드마크를 구매하면 통행료를 받을 수 있어요.' }
    case 'theirs':
      return ownership.level === 'landmark'
        ? {
            title: `${ownership.ownerGroupName}의 랜드마크`,
            note: `이 동네 사진을 올리면 통행료를 최대 ${MAX_TOLL}코인 내요.`,
          }
        : { title: `${ownership.ownerGroupName}의 건물`, note: '이미 주인이 있어서 살 수 없어요.' }
  }
}
