import { MAX_TOLL, type RegionDetail, type RegionOwnership } from '../../visit/domain/RegionDetail'
import { describeOwnership } from '../../visit/domain/ownershipText'
import { PropertyActions } from './PropertyActions'
import styles from './PropertyGrowthCard.module.css'

interface PropertyGrowthCardProps {
  detail: RegionDetail
  ownership: RegionOwnership
  /** 있으면 아래에 건물 구매·랜드마크 구매 버튼을 넣는다. */
  groupId?: number
  onOwnershipChange?: (ownership: RegionOwnership) => void
}

/**
 * 건물 관리 탭: 로그인 그림처럼 세 칸짜리 길 위에서 우리 땅이 자라는 모습.
 * 칸은 땅 → 건물 → 랜드마크. 이미 가진 단계는 진한 색, 다음 단계 칸은 연한 핑크로 둥실 떠 있다.
 * 색: 우리 그룹은 핑크, 다른 그룹은 인디고 (스타일가이드).
 */
export function PropertyGrowthCard({ detail, ownership, groupId, onOwnershipChange }: PropertyGrowthCardProps) {
  const { title, note } = describeOwnership(ownership)
  const isOursLandmark = ownership.status === 'ours' && ownership.level === 'landmark'

  return (
    <section className={styles.card} aria-label={`${detail.region.name} 건물 관리`}>
      <div className={styles.stage}>
        <GrowthScene ownership={ownership} />
      </div>
      <p className={styles.bubble}>{bubbleText(ownership)}</p>

      <p className={styles.title}>{title}</p>
      <p className={styles.note}>{note}</p>

      {isOursLandmark ? (
        <p className={styles.done}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
            <path d="M17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3" />
          </svg>
          통행료 최대 {MAX_TOLL} 받는 중
        </p>
      ) : groupId !== undefined && onOwnershipChange ? (
        <div className={styles.actions}>
          <PropertyActions groupId={groupId} detail={detail} ownership={ownership} onOwnershipChange={onOwnershipChange} />
        </div>
      ) : null}
    </section>
  )
}

function bubbleText(ownership: RegionOwnership): string {
  switch (ownership.status) {
    case 'unowned':
      return '여기 우리 집 지어요!'
    case 'ours':
      return ownership.level === 'landmark' ? '우리 랜드마크 완성!' : '이제 깃발 꽂을 차례!'
    case 'theirs':
      return `${ownership.ownerGroupName}의 땅이에요`
  }
}

type TileTone = 'gray' | 'next' | 'ours' | 'theirs'

/** 그림 크기 비율 (1 = 박스를 꽉 채움) */
const SCENE_SCALE = 0.72

/* 세 칸의 위치 (viewBox 240×150 기준, 오른쪽으로 갈수록 한 칸씩 높아진다) */
const TILES = [
  { x: -14, y: 92 },
  { x: 92, y: 74 },
  { x: 198, y: 56 },
] as const

function GrowthScene({ ownership }: { ownership: RegionOwnership }) {
  // 가진 단계 수: 땅만(주인 없음이지만 방문함) 1, 건물 2, 랜드마크 3
  const owned = ownership.status === 'unowned' ? 1 : ownership.level === 'landmark' ? 3 : 2
  const doneTone: TileTone = ownership.status === 'theirs' ? 'theirs' : 'ours'
  // 다음 단계 칸은 우리 그룹이 아직 키울 수 있을 때만 (다른 그룹 땅이면 회색)
  const nextIndex = ownership.status === 'theirs' || owned === 3 ? -1 : owned
  const toneOf = (index: number): TileTone => (index < owned ? doneTone : index === nextIndex ? 'next' : 'gray')
  const houseTone = ownership.status === 'theirs' ? 'theirs' : 'ours'

  return (
    <svg className={styles.scene} viewBox="0 0 240 150" role="img" aria-label={sceneLabel(ownership)}>
      <SkyDecor />
      {/* 박스(viewBox) 크기는 그대로 두고, 안의 그림만 가운데를 기준으로 줄인다. 아래쪽에 붙여서 위는 하늘 장식 자리 */}
      <g transform={`translate(120 88) scale(${SCENE_SCALE}) translate(-116 -75)`}>
      {/* 칸과 칸을 잇는 다리: 이어서 가진 칸 사이는 우리 색, 다음 칸으로 가는 다리는 연한 핑크 */}
      {TILES.slice(1).map((tile, index) => (
        <Bridge key={`bridge-${index}`} from={TILES[index]} to={tile} tone={toneOf(index + 1)} />
      ))}
      {TILES.map((tile, index) => (
        <g key={index} className={index === nextIndex ? styles.floating : undefined}>
          <Tile x={tile.x} y={tile.y} tone={toneOf(index)} />
          {/* 다음 단계 칸 위의 점선 그림: 2번 칸이면 지을 집, 3번 칸이면 꽂을 깃발 */}
          {index === nextIndex && index === 1 ? <House x={99} y={34} variant="ghost" /> : null}
          {index === nextIndex && index === 2 ? <Flag x={216} y={10} variant="ghost" /> : null}
        </g>
      ))}

      {owned >= 2 ? <House x={99} y={34} variant={houseTone} /> : null}
      {owned === 3 ? <Flag x={214} y={6} variant={ownership.status === 'theirs' ? 'theirs' : 'gold'} /> : null}

      {ownership.status === 'theirs' ? (
        <Pawn x={182} y={owned === 3 ? 62 : 60} width={20} tone="indigo" face="smile" />
      ) : owned === 1 ? (
        <>
          <Pawn x={2} y={56} width={26} tone="pink" face="wow" />
          <Pawn x={-24} y={66} width={18} tone="gold" face="smile" />
          <Pawn x={32} y={66} width={17} tone="indigo" face="smile" />
        </>
      ) : owned === 2 ? (
        <>
          {/* 건물 보유: 친구 둘은 1번 칸, 핑크 말은 2번 칸(집 앞) */}
          <Pawn x={-6} y={68} width={18} tone="gold" face="smile" />
          <Pawn x={16} y={70} width={17} tone="indigo" face="smile" />
          <Pawn x={126} y={56} width={20} tone="pink" face="smile" />
        </>
      ) : (
        <>
          {/* 랜드마크 보유: 친구 둘은 2번 칸(집 양옆), 핑크 말은 3번 칸(깃발 옆) */}
          <Pawn x={88} y={57} width={18} tone="gold" face="smile" />
          <Pawn x={136} y={58} width={17} tone="indigo" face="smile" />
          <Pawn x={226} y={26} width={26} tone="pink" face="joy" />
        </>
      )}
      </g>
    </svg>
  )
}

/** 위쪽 빈 하늘: 로그인 그림의 주사위 + 구름 + 반짝이는 코인 (장식이라 읽어주지 않는다) */
function SkyDecor() {
  return (
    <g aria-hidden="true">
      {/* 구름 */}
      <g className={styles.cloud}>
        <ellipse cx="96" cy="22" rx="16" ry="7" fill="var(--paper)" />
        <ellipse cx="106" cy="17" rx="10" ry="7" fill="var(--paper)" />
      </g>
      <g className={`${styles.cloud} ${styles.cloudSlow}`}>
        <ellipse cx="150" cy="30" rx="12" ry="5" fill="var(--paper)" />
        <ellipse cx="157" cy="26" rx="7" ry="5" fill="var(--paper)" />
      </g>
      {/* 주사위: 로그인 그림과 같은 흰 주사위, 가운데 점만 핑크 */}
      <g className={styles.dice}>
        <g transform="translate(22 8) rotate(-12 12 12)">
          <rect x="0" y="3" width="24" height="24" rx="6" fill="var(--line-strong)" />
          <rect x="0" y="0" width="24" height="24" rx="6" fill="var(--paper)" />
          <circle cx="7" cy="7" r="2.4" fill="var(--ink)" />
          <circle cx="12" cy="12" r="2.4" fill="var(--us)" />
          <circle cx="17" cy="17" r="2.4" fill="var(--ink)" />
        </g>
      </g>
      {/* 코인 두 개 */}
      <g className={styles.coin}>
        <circle cx="204" cy="17" r="7" fill="var(--coin-dark)" />
        <circle cx="204" cy="15.5" r="7" fill="var(--coin)" />
        <circle cx="204" cy="15.5" r="3.6" fill="none" stroke="var(--coin-light)" strokeWidth="1.6" />
      </g>
      <g className={`${styles.coin} ${styles.coinLate}`}>
        <circle cx="222" cy="31" r="5" fill="var(--coin-dark)" />
        <circle cx="222" cy="30" r="5" fill="var(--coin)" />
        <circle cx="222" cy="30" r="2.4" fill="none" stroke="var(--coin-light)" strokeWidth="1.3" />
      </g>
    </g>
  )
}

function sceneLabel(ownership: RegionOwnership): string {
  switch (ownership.status) {
    case 'unowned':
      return '세 칸 중 첫 칸이 우리 땅이고, 다음 칸에 지을 집이 점선으로 떠 있어요'
    case 'ours':
      return ownership.level === 'landmark'
        ? '세 칸이 모두 우리 색이고, 집 옆에 금색 깃발이 꽂혀 있어요'
        : '두 칸이 우리 색이고 집이 서 있어요. 다음 칸에 꽂을 깃발이 점선으로 떠 있어요'
    case 'theirs':
      return `${ownership.ownerGroupName}의 ${ownership.level === 'landmark' ? '랜드마크' : '건물'}이 서 있어요`
  }
}

/** 앞 칸의 오른쪽 옆면에서 다음 칸의 왼쪽 옆면으로 비스듬히 걸친 나무다리 */
function Bridge({ from, to, tone }: { from: { x: number; y: number }; to: { x: number; y: number }; tone: TileTone }) {
  const x1 = from.x + 58
  const y1 = from.y + 16
  const x2 = to.x
  const y2 = to.y + 16
  const thickness = 10
  const planks = [0.25, 0.5, 0.75].map((t) => ({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }))
  return (
    <g>
      <polygon points={`${x1},${y1 + 3} ${x2},${y2 + 3} ${x2},${y2 + thickness + 3} ${x1},${y1 + thickness + 3}`} className={styles[`edge_${tone}`]} />
      <polygon points={`${x1},${y1} ${x2},${y2} ${x2},${y2 + thickness} ${x1},${y1 + thickness}`} className={styles[`top_${tone}`]} />
      {planks.map((plank) => (
        <line
          key={plank.x}
          x1={plank.x}
          y1={plank.y + 1.5}
          x2={plank.x}
          y2={plank.y + thickness - 1.5}
          className={styles[`plank_${tone}`]}
        />
      ))}
    </g>
  )
}

function Tile({ x, y, tone }: { x: number; y: number; tone: TileTone }) {
  return (
    <>
      <rect x={x} y={y + 6} width="58" height="46" rx="12" className={styles[`edge_${tone}`]} />
      <rect x={x} y={y} width="58" height="46" rx="12" className={styles[`top_${tone}`]} />
    </>
  )
}

/** 집: 50×46 그림을 44×42 크기로 놓는다 */
function House({ x, y, variant }: { x: number; y: number; variant: 'ours' | 'theirs' | 'ghost' }) {
  const transform = `translate(${x} ${y}) scale(0.88 0.913)`
  if (variant === 'ghost') {
    return (
      <g transform={transform} className={styles.ghost}>
        <rect x="9" y="18" width="32" height="28" rx="4" />
        <polygon points="3,22 25,2 47,22" />
      </g>
    )
  }
  return (
    <g transform={transform}>
      <rect x="9" y="18" width="32" height="28" rx="4" fill="var(--paper)" />
      <polygon points="3,22 25,2 47,22" className={styles[`roof_${variant}`]} />
      <rect x="21" y="30" width="8" height="16" rx="2" className={styles[`door_${variant}`]} />
    </g>
  )
}

/** 깃발: 30×50 그림 */
function Flag({ x, y, variant }: { x: number; y: number; variant: 'gold' | 'theirs' | 'ghost' }) {
  if (variant === 'ghost') {
    return (
      <g transform={`translate(${x} ${y}) scale(0.87 0.92)`} className={styles.ghost}>
        <line x1="4" y1="48" x2="4" y2="3" />
        <polygon points="5,4 29,12 5,20" />
      </g>
    )
  }
  return (
    <g transform={`translate(${x} ${y}) scale(0.93 1)`}>
      <line x1="4" y1="48" x2="4" y2="3" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
      <polygon points="5,4 29,12 5,20" className={`${styles.flag} ${styles[`flag_${variant}`]}`} />
    </g>
  )
}

/* 공용 Character와 같은 말 (둥근 막대 3:4, 같은 색). 그림 안에 놓아야 해서 여기서 직접 그린다 */
const PAWN_COLORS = {
  pink: { body: '#F2426D', face: '#FFFFFF' },
  gold: { body: '#FFB800', face: '#5C3D00' },
  indigo: { body: '#4F62F2', face: '#FFFFFF' },
} as const

function Pawn({ x, y, width, tone, face }: { x: number; y: number; width: number; tone: keyof typeof PAWN_COLORS; face: 'smile' | 'wow' | 'joy' }) {
  const { body, face: faceColor } = PAWN_COLORS[tone]
  return (
    <g transform={`translate(${x} ${y}) scale(${width / 36})`}>
      {/* 흰 테두리: 같은 핑크 칸 위에 서도 말이 묻히지 않게 */}
      <rect width="36" height="48" rx="18" fill={body} stroke="var(--paper)" strokeWidth="3" />
      {face === 'joy' ? (
        <>
          <path d="M8 21 Q12 15 16 21 M20 21 Q24 15 28 21" fill="none" stroke={faceColor} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M11 27 Q18 36 25 27 Z" fill={faceColor} />
        </>
      ) : face === 'wow' ? (
        <>
          <circle cx="12" cy="19" r="3.4" fill={faceColor} />
          <circle cx="24" cy="19" r="3.4" fill={faceColor} />
          <ellipse cx="18" cy="30" rx="4" ry="4.5" fill={faceColor} />
        </>
      ) : (
        <>
          <circle cx="12" cy="20" r="2.8" fill={faceColor} />
          <circle cx="24" cy="20" r="2.8" fill={faceColor} />
          <path d="M13 28 Q18 32 23 28" fill="none" stroke={faceColor} strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
    </g>
  )
}
