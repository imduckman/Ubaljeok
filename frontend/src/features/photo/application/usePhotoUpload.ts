import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadPhoto } from '../../../api/endpoints/photos'
import { ApiError, getErrorMessage } from '../../../shared/types/api'
import { MAX_PHOTOS_PER_UPLOAD, validatePhotoFile, type UploadPhotoResponse } from '../domain/Photo'

/**
 * ready: 올릴 준비됨 / invalid: 올리기 전에 걸러짐(JPEG 아님 등) / uploading: 올리는 중
 * done: 올림 / needsRegion: 위치가 없어 동네를 골라야 함 / failed: 실패
 */
export type UploadItemStatus = 'ready' | 'invalid' | 'uploading' | 'done' | 'needsRegion' | 'failed'

export interface UploadItem {
  id: string
  file: File
  previewUrl: string
  status: UploadItemStatus
  /** invalid·failed·needsRegion일 때 보여줄 문구 */
  message?: string
  /** failed일 때 다시 올리기를 보여줄지 */
  retryable?: boolean
  result?: UploadPhotoResponse
}

export type UploadPhase = 'selecting' | 'uploading' | 'finished'

let itemSequence = 0

/** 서버 오류를 사진 한 장의 상태로 바꾼다 (API.md `POST /api/photos` Errors) */
function toFailedState(error: unknown): Pick<UploadItem, 'status' | 'message' | 'retryable'> {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'REGION_REQUIRED':
        return { status: 'needsRegion', message: '위치 정보가 없어요. 동네를 골라주면 지도에 남아요.' }
      case 'DUPLICATE_PHOTO':
        return { status: 'failed', message: '이미 이 그룹에 올린 사진이에요', retryable: false }
      case 'UNSUPPORTED_FORMAT':
        return { status: 'failed', message: 'JPEG 사진만 올릴 수 있어요', retryable: false }
      case 'FILE_TOO_LARGE':
        return { status: 'failed', message: '사진 용량이 너무 커요', retryable: false }
      case 'NOT_GROUP_MEMBER':
        return { status: 'failed', message: '이 그룹에 사진을 올릴 수 없어요', retryable: false }
      case 'UNKNOWN_REGION':
        return { status: 'needsRegion', message: '지원하지 않는 동네예요. 다른 동네를 골라주세요.' }
    }
  }
  return { status: 'failed', message: getErrorMessage(error, '사진을 올리지 못했어요. 다시 시도해 주세요.'), retryable: true }
}

export function usePhotoUpload(groupId: number | null) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [phase, setPhase] = useState<UploadPhase>('selecting')
  const [notice, setNotice] = useState<string | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  // 버튼을 눌렀을 때 최신 목록을 읽기 위한 사본. 화면을 그린 뒤에 맞춰 둔다.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // 화면을 떠나면 미리보기 주소를 정리한다
  useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), [])

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }, [])

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files)
    const room = MAX_PHOTOS_PER_UPLOAD - itemsRef.current.length
    const accepted = incoming.slice(0, Math.max(room, 0))
    setNotice(
      incoming.length > accepted.length ? `한 번에 ${MAX_PHOTOS_PER_UPLOAD}장까지 올릴 수 있어요. 나머지는 다음에 올려주세요.` : null,
    )
    const created = accepted.map<UploadItem>((file) => {
      const problem = validatePhotoFile(file)
      return {
        id: `photo-${++itemSequence}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: problem ? 'invalid' : 'ready',
        message: problem ?? undefined,
      }
    })
    setItems((current) => [...current, ...created])
    setPhase('selecting')
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((item) => item.id !== id)
    })
    setNotice(null)
  }, [])

  const uploadOne = useCallback(
    async (item: UploadItem, regionCode?: string) => {
      if (groupId === null) return
      patch(item.id, { status: 'uploading', message: undefined })
      try {
        const result = await uploadPhoto({ groupId, file: item.file, regionCode })
        patch(item.id, { status: 'done', result })
      } catch (error) {
        patch(item.id, toFailedState(error))
      }
    },
    [groupId, patch],
  )

  /** 준비된 사진을 한 장씩 차례로 올린다 */
  const startUpload = useCallback(async () => {
    const queue = itemsRef.current.filter((item) => item.status === 'ready')
    if (queue.length === 0 || groupId === null) return
    setPhase('uploading')
    setProgress({ done: 0, total: queue.length })
    for (const [index, item] of queue.entries()) {
      await uploadOne(item)
      setProgress({ done: index + 1, total: queue.length })
    }
    setPhase('finished')
  }, [groupId, uploadOne])

  const retryItem = useCallback((id: string) => {
    const item = itemsRef.current.find((candidate) => candidate.id === id)
    if (item) void uploadOne(item)
  }, [uploadOne])

  const assignRegion = useCallback((id: string, regionCode: string) => {
    const item = itemsRef.current.find((candidate) => candidate.id === id)
    if (item) void uploadOne(item, regionCode)
  }, [uploadOne])

  const reset = useCallback(() => {
    itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    setItems([])
    setNotice(null)
    setProgress({ done: 0, total: 0 })
    setPhase('selecting')
  }, [])

  const readyCount = items.filter((item) => item.status === 'ready').length
  const invalidCount = items.filter((item) => item.status === 'invalid').length

  return { items, phase, notice, progress, readyCount, invalidCount, addFiles, removeItem, startUpload, retryItem, assignRegion, reset }
}
