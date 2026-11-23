import { Chip } from '../../../shared/components/ui/Chip'
import { ProgressBar } from '../../../shared/components/ui/ProgressBar'
import { RESULT_MISSING, STYLE_OPTIONS, statusText, stepOf, type DiaryJob, type GroupPhoto } from '../domain/Video'
import styles from './Video.module.css'

const FAILURE_TEXT: Record<string, string> = {
  PROVIDER_REJECTED: '영상 서비스가 이 사진으로는 만들 수 없다고 했어요.',
  PROVIDER_TIMEOUT: '영상 서비스가 너무 오래 걸려서 멈췄어요.',
  DOWNLOAD_FAILED: '완성된 영상을 받아오지 못했어요.',
  EDIT_FAILED: '사진을 이어 붙이는 중에 문제가 생겼어요.',
  [RESULT_MISSING]: '완성된 영상 파일을 찾지 못했어요.',
}

interface DiaryJobViewProps {
  job: DiaryJob
  representative: GroupPhoto | undefined
}

/** 만드는 중 · 완성 · 실패 화면의 본문 */
export function DiaryJobView({ job, representative }: DiaryJobViewProps) {
  const styleLabel = STYLE_OPTIONS.find((option) => option.value === job.style)?.label
  const step = stepOf(job.status)

  // 결과 파일이 없는 '완료'는 normalizeJob에서 실패로 바뀌어 여기로 오지 않는다
  if (job.status === 'completed' && job.resultUrl) {
    return (
      <div className={styles.resultCard}>
        <video className={styles.player} src={job.resultUrl} controls playsInline loop aria-label="완성된 영상 일기" />
        <div className={styles.resultMeta}>
          {job.mode === 'mock' ? <Chip tone="gold">테스트 영상</Chip> : null}
          {styleLabel ? <Chip>{styleLabel}</Chip> : null}
        </div>
        {job.mode === 'mock' ? (
          <p className={styles.mockNote}>실제 AI 대신 고른 사진을 이어 붙인 테스트 영상이에요.</p>
        ) : null}
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div className={styles.failCard} role="alert">
        <p className={styles.failTitle}>{statusText('failed')}</p>
        <p className={styles.failText}>{FAILURE_TEXT[job.errorCode ?? ''] ?? '잠시 후 다시 시도해 주세요.'}</p>
        <p className={styles.failText}>고른 사진과 스타일은 그대로 남아 있어요.</p>
      </div>
    )
  }

  return (
    <div className={styles.progressCard}>
      {representative ? (
        <div className={styles.progressPhoto}>
          <img src={representative.fileUrl} alt="대표 사진" />
          <span className={styles.progressPulse} aria-hidden="true" />
        </div>
      ) : null}
      <div role="status">
        <ProgressBar label={statusText(job.status)} caption={step ? `${step}/3` : undefined} steps={{ total: 3, current: step ?? 1 }} />
      </div>
      <p className={styles.progressHint}>몇 분 걸릴 수 있어요. 다 만들어지면 여기서 바로 볼 수 있어요.</p>
    </div>
  )
}
