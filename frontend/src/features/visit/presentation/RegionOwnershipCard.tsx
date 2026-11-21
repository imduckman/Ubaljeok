import { MAX_TOLL, type RegionOwnership } from '../domain/RegionDetail'
import styles from './RegionDetail.module.css'

const BUILDING_WINDOW = { ours: 'var(--us)', theirs: 'var(--them)', unowned: 'var(--line-strong)' }

/** 동네 소유 칸. 4주차에 이 아래에 '건물 사기 / 랜드마크로 올리기' 버튼이 들어온다. */
export function RegionOwnershipCard({ ownership }: { ownership: RegionOwnership }) {
  const isLandmark = ownership.status !== 'unowned' && ownership.level === 'landmark'
  const { title, note } = describe(ownership)

  return (
    <div className={`${styles.ownership} ${styles[`ownership_${ownership.status}`]}`}>
      <span className={styles.ownershipIcon} aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 32 32">
          <path d="M7 28V11l9-6 9 6v17z" fill="var(--paper)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <rect x="12" y="14" width="3" height="3" rx="0.8" fill={BUILDING_WINDOW[ownership.status]} />
          <rect x="17" y="14" width="3" height="3" rx="0.8" fill={BUILDING_WINDOW[ownership.status]} />
          <rect x="12" y="20" width="3" height="3" rx="0.8" fill={BUILDING_WINDOW[ownership.status]} />
          <rect x="17" y="20" width="3" height="3" rx="0.8" fill={BUILDING_WINDOW[ownership.status]} />
          {isLandmark ? (
            <>
              <path d="M16 5V0.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16.6 1h6l-1.8 2 1.8 2h-6z" fill="var(--coin)" />
            </>
          ) : null}
        </svg>
      </span>
      <div className={styles.ownershipText}>
        <p className={styles.ownershipTitle}>{title}</p>
        <p className={styles.ownershipNote}>{note}</p>
      </div>
    </div>
  )
}

function describe(ownership: RegionOwnership): { title: string; note: string } {
  switch (ownership.status) {
    case 'unowned':
      return { title: '아직 주인이 없는 동네예요', note: '방문한 그룹은 이 동네에 건물을 살 수 있어요.' }
    case 'ours':
      return ownership.level === 'landmark'
        ? { title: '우리 그룹 랜드마크', note: `다른 그룹이 이 동네 사진을 올리면 통행료를 최대 ${MAX_TOLL}코인 받아요.` }
        : { title: '우리 그룹 건물', note: '랜드마크로 올리면 통행료를 받을 수 있어요.' }
    case 'theirs':
      return ownership.level === 'landmark'
        ? {
            title: `${ownership.ownerGroupName}의 랜드마크`,
            note: `이 동네 사진을 올리면 통행료를 최대 ${MAX_TOLL}코인 내요.`,
          }
        : { title: `${ownership.ownerGroupName}의 건물`, note: '이미 주인이 있어서 살 수 없어요.' }
  }
}
