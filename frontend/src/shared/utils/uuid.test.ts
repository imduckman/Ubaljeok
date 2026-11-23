import { createUuid } from './uuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('createUuid', () => {
  it('UUID v4 모양을 만든다', () => {
    expect(createUuid()).toMatch(UUID_V4)
  })

  it('randomUUID가 없는 환경(HTTP 접속)에서도 만든다', () => {
    const original = crypto.randomUUID
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      const a = createUuid()
      const b = createUuid()
      expect(a).toMatch(UUID_V4)
      expect(a).not.toBe(b)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
    }
  })
})
