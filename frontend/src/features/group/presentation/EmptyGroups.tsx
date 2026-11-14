import { Character } from '../../../shared/components/ui/Character'
import { MAX_GROUP_MEMBERS } from '../domain/Group'
import styles from './Group.module.css'

export function EmptyGroups({ nickname }: { nickname: string }) {
  return (
    <>
      <p className={styles.greeting}>{nickname}님, 반가워요</p>
      <h1 className={styles.title}>
        먼저 함께 걸을
        <br />
        친구들을 모아볼까요?
      </h1>
      <p className={styles.subtitle}>한 그룹에 최대 {MAX_GROUP_MEMBERS}명까지 함께해요.</p>
      <div className={styles.slots} aria-hidden="true">
        <div className={styles.slotMe}>
          <Character />
          {nickname}
        </div>
        {Array.from({ length: MAX_GROUP_MEMBERS - 1 }, (_, index) => (
          <div key={index} className={styles.slotEmpty}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        ))}
      </div>
      <p className={styles.subtitle} style={{ marginTop: 20 }}>
        그룹을 만들면 초대 코드가 생겨요. 친구에게 코드를 받았다면 바로 들어갈 수도 있어요.
      </p>
    </>
  )
}
