import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '../../../shared/components/ui/BottomSheet'
import { Button } from '../../../shared/components/ui/Button'
import { formatCoinChange } from '../domain/Wallet'
import styles from './Wallet.module.css'

/** 작은 코인이 튀어 나가는 방향(px)·크기·늦게 출발하는 시간(초). 매번 같은 모양으로 터진다. */
const BURST_COINS = [
  { dx: -78, dy: -46, size: 14, delay: 0 },
  { dx: 82, dy: -40, size: 12, delay: 0.03 },
  { dx: -46, dy: -78, size: 10, delay: 0.06 },
  { dx: 50, dy: -82, size: 14, delay: 0.02 },
  { dx: 0, dy: -96, size: 12, delay: 0.05 },
  { dx: -104, dy: -6, size: 10, delay: 0.08 },
  { dx: 106, dy: 2, size: 10, delay: 0.04 },
  { dx: -70, dy: 30, size: 12, delay: 0.07 },
  { dx: 72, dy: 34, size: 12, delay: 0.01 },
  { dx: 24, dy: -60, size: 8, delay: 0.1 },
]

/** 큰 코인 뒤에서 작은 코인이 폭죽처럼 한 번 터진다. "동작 줄이기" 설정이면 보이지 않는다. */
function CoinBurst() {
  return (
    <span className={styles.burst}>
      {BURST_COINS.map((coin, index) => (
        <span
          key={index}
          className={styles.burstCoin}
          style={
            {
              '--dx': `${coin.dx}px`,
              '--dy': `${coin.dy}px`,
              width: coin.size,
              height: coin.size,
              animationDelay: `${coin.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}

export interface CoinReward {
  groupName: string
  regionCode: string
  regionName: string
  amount: number
  balance: number
}

/** 새 동네를 처음 방문해 코인을 받은 순간의 큰 카드 (화면 시안 "6. 코인 획득 순간") */
export function CoinRewardSheet({ reward, onClose }: { reward: CoinReward; onClose: () => void }) {
  const navigate = useNavigate()

  const goToRegion = () => {
    onClose()
    navigate('/map', { state: { focusRegion: { regionCode: reward.regionCode, name: reward.regionName } } })
  }

  return (
    <BottomSheet isOpen title="새 동네 발견" onClose={onClose}>
      <div className={styles.reward}>
        <div className={styles.coinStage} aria-hidden="true">
          <CoinBurst />
          <span className={styles.bigCoin}>
            <span className={styles.bigCoinRing} />
          </span>
        </div>
        <p className={styles.rewardLabel}>{reward.regionName} 첫 방문</p>
        <p className={styles.rewardAmount}>{formatCoinChange(reward.amount)}</p>
        <p className={styles.walletChip}>
          {reward.groupName} 지갑 <strong>{reward.balance}</strong>
          <span className={styles.gain}>({formatCoinChange(reward.amount)})</span>
        </p>
        <p className={styles.rewardNote}>이제 {reward.regionName}에 건물을 살 수 있어요.</p>
      </div>
      <div className={styles.rewardActions}>
        <Button variant="secondary" onClick={onClose}>
          나중에
        </Button>
        <Button variant="primary" onClick={goToRegion}>
          동네 보러 가기
        </Button>
      </div>
    </BottomSheet>
  )
}
