import { useContext, useState, type ReactNode } from 'react'
import { purchaseBuilding, upgradeBuilding } from '../../../api/endpoints/game'
import { ToastContext } from '../../../shared/components/toast/toastContext'
import { Button } from '../../../shared/components/ui/Button'
import { getErrorMessage } from '../../../shared/types/api'
import { AuthContext } from '../../auth/application/authContext'
import { GroupContext } from '../../group/application/groupContext'
import { isGroupOwner } from '../../group/domain/Group'
import type { RegionDetail, RegionOwnership } from '../../visit/domain/RegionDetail'
import { WalletContext } from '../../wallet/application/walletContext'
import { formatCoinChange } from '../../wallet/domain/Wallet'
import { getPropertyAction, toOwnership } from '../domain/Property'
import styles from './PropertyActions.module.css'

interface PropertyActionsProps {
  groupId: number
  detail: RegionDetail
  ownership: RegionOwnership
  onOwnershipChange: (ownership: RegionOwnership) => void
  /** 구매 버튼 왼쪽에 나란히 둘 버튼 (예: 사진 올리기). 구매 버튼이 없으면 이것만 보여준다. */
  leading?: ReactNode
}

/**
 * 동네 상세의 소유 칸 아래: 건물 구매(100) / 랜드마크 구매(80).
 * 누를 수 없으면 이유를 보여주고, 누르면 한 번 더 확인한 뒤 사고, 지갑·소유 칸·지도를 함께 바꾼다.
 * 로그인·그룹·지갑 정보가 없는 곳(일부 테스트 등)에서는 아무것도 그리지 않는다.
 */
export function PropertyActions({ groupId, detail, ownership, onOwnershipChange, leading }: PropertyActionsProps) {
  const auth = useContext(AuthContext)
  const groups = useContext(GroupContext)
  const wallet = useContext(WalletContext)
  const toast = useContext(ToastContext)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // 같은 확인 단계에서 다시 눌러도 서버가 한 번만 처리하도록 같은 키를 쓴다.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)

  const group = groups?.groups.find((item) => item.groupId === groupId)
  if (!auth || !group || !wallet) return <>{leading}</>

  const balance = wallet.balances[groupId] ?? group.walletBalance ?? 0
  const action = getPropertyAction({
    ownership,
    hasEligibleVisit: detail.visits.some((visit) => visit.rewardEligible),
    isGroupOwner: isGroupOwner(group, auth.user?.userId),
    balance,
  })
  if (action.kind === 'none') return <>{leading}</>
  // 아직 사진을 한 장도 올리지 않은 동네에서는 건물 구매를 아예 보여주지 않는다.
  if (action.kind === 'purchase' && detail.visits.length === 0) return <>{leading}</>

  const regionName = detail.region.name
  const isPurchase = action.kind === 'purchase'
  const label = isPurchase ? '건물 구매' : '랜드마크 구매'

  const startConfirm = () => {
    setErrorMessage(null)
    setIdempotencyKey(crypto.randomUUID())
    setIsConfirming(true)
  }

  const confirm = async () => {
    if (!idempotencyKey) return
    setIsBusy(true)
    setErrorMessage(null)
    try {
      const run = isPurchase ? purchaseBuilding : upgradeBuilding
      const result = await run(groupId, detail.region.regionCode, idempotencyKey)
      wallet.applyBalance(groupId, result.walletBalance, -action.price)
      onOwnershipChange(toOwnership(result.property, groupId))
      toast?.showToast({
        tone: 'coin',
        title: `${formatCoinChange(-action.price)} 코인`,
        description: isPurchase ? `${regionName}에 건물을 구매했어요` : `${regionName}에 랜드마크를 구매했어요`,
      })
      setIsConfirming(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, isPurchase ? '건물을 구매하지 못했어요.' : '랜드마크를 구매하지 못했어요.'))
    } finally {
      setIsBusy(false)
    }
  }

  if (isConfirming) {
    return (
      <div className={styles.confirm}>
        <p className={styles.confirmTitle}>
          {isPurchase ? `${regionName}에 건물을 구매할까요?` : `${regionName}에 랜드마크를 구매할까요?`}
        </p>
        {/* 코인 계산: 지금 − 쓸 코인 = 남는 코인. 보드게임 점수판처럼 칸 세 개 */}
        <div className={styles.calc} role="group" aria-label={`지금 ${balance}코인에서 ${action.price}코인을 쓰면 ${balance - action.price}코인이 남아요`}>
          <span className={styles.calcCell} aria-hidden="true">
            <span className={styles.calcLabel}>지금</span>
            <span className={styles.calcValue}>
              <span className={styles.coinIcon} />
              {balance}
            </span>
          </span>
          <span className={styles.calcSign} aria-hidden="true">−</span>
          <span className={`${styles.calcCell} ${styles.calcSpend}`} aria-hidden="true">
            <span className={styles.calcLabel}>구매</span>
            <span className={styles.calcValue}>
              <span className={styles.coinIcon} />
              {action.price}
            </span>
          </span>
          <span className={styles.calcSign} aria-hidden="true">=</span>
          <span className={`${styles.calcCell} ${styles.calcResult}`} aria-hidden="true">
            <span className={styles.calcLabel}>남는 코인</span>
            <span className={styles.calcValue}>
              <span className={styles.coinIcon} />
              {balance - action.price}
            </span>
          </span>
        </div>
        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className={styles.confirmRow}>
          <Button variant="secondary" disabled={isBusy} onClick={() => setIsConfirming(false)}>
            취소
          </Button>
          <Button variant="primary" isLoading={isBusy} onClick={() => void confirm()}>
            구매
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.action}>
      <div className={leading ? styles.row : styles.rowSingle}>
        {leading}
        <Button variant="primary" className={styles.actionButton} disabled={action.blockedReason !== null} onClick={startConfirm}>
          {label}
          <span className={styles.pricePill}>
            <span className={styles.coinIcon} aria-hidden="true" />
            {action.price}
          </span>
        </Button>
      </div>
      {action.blockedReason ? <p className={styles.blocked}>{action.blockedReason}</p> : null}
    </div>
  )
}
