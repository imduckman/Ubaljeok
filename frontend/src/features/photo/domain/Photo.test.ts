import { describeIneligibleReason, formatVisitDate, validatePhotoFile } from './Photo'

const fileOf = (name: string, type: string, size = 1024) => new File([new Uint8Array(size)], name, { type })

describe('validatePhotoFile', () => {
  it('JPEG는 통과시킨다', () => {
    expect(validatePhotoFile(fileOf('a.jpg', 'image/jpeg'))).toBeNull()
    expect(validatePhotoFile(fileOf('b.JPEG', ''))).toBeNull()
  })

  it('JPEG가 아니면 막는다', () => {
    expect(validatePhotoFile(fileOf('a.png', 'image/png'))).toBe('JPEG 사진만 올릴 수 있어요')
    expect(validatePhotoFile(fileOf('a.heic', 'image/heic'))).toBe('JPEG 사진만 올릴 수 있어요')
  })

  it('15MB보다 크면 막는다', () => {
    expect(validatePhotoFile(fileOf('big.jpg', 'image/jpeg', 15 * 1024 * 1024 + 1))).toBe('15MB보다 큰 사진은 올릴 수 없어요')
  })
})

describe('describeIneligibleReason', () => {
  it('코인 대상이면 문구가 없다', () => {
    expect(describeIneligibleReason(null)).toBeNull()
  })

  it('이유마다 안내 문구를 준다', () => {
    expect(describeIneligibleReason('older_than_30_days')).toBe('30일이 지난 사진이라 코인은 받을 수 없어요')
    expect(describeIneligibleReason('no_gps')).toContain('직접 고른 동네')
  })
})

it('방문 날짜를 화면용으로 바꾼다', () => {
  expect(formatVisitDate('2026-11-05')).toBe('11월 5일')
})
