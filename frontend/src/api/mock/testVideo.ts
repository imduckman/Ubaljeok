/**
 * 가짜 서버용 테스트 영상 만들기.
 * 고른 사진을 한 장씩 보여주는 짧은 세로 영상(WebM)을 브라우저 안에서 녹화한다.
 * 화면 구석에 '테스트 영상' 표시를 넣어 실제 AI 결과와 헷갈리지 않게 한다.
 * 녹화를 지원하지 않는 환경(테스트 등)에서는 null을 돌려준다.
 */

export interface TestVideoFrame {
  imageUrl: string
  title: string
  date: string
}

const WIDTH = 360
const HEIGHT = 640
const SECONDS_PER_PHOTO = 1.4
const FPS = 30

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, zoom: number) {
  const scale = Math.max(WIDTH / image.width, HEIGHT / image.height) * zoom
  const width = image.width * scale
  const height = image.height * scale
  context.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height)
}

function drawFrame(context: CanvasRenderingContext2D, frame: TestVideoFrame, image: HTMLImageElement | null, progress: number) {
  context.fillStyle = '#0e0f14'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  if (image) drawCover(context, image, 1 + progress * 0.08)

  // 아래쪽 글자 받침
  const shade = context.createLinearGradient(0, HEIGHT * 0.6, 0, HEIGHT)
  shade.addColorStop(0, 'rgba(14,15,20,0)')
  shade.addColorStop(1, 'rgba(14,15,20,0.7)')
  context.fillStyle = shade
  context.fillRect(0, HEIGHT * 0.6, WIDTH, HEIGHT * 0.4)

  context.fillStyle = '#ffffff'
  context.font = '800 30px Pretendard Variable, sans-serif'
  context.fillText(frame.title, 24, HEIGHT - 64)
  context.font = '600 16px Pretendard Variable, sans-serif'
  context.fillText(frame.date, 24, HEIGHT - 36)

  // 테스트 영상 표시
  context.fillStyle = 'rgba(255,184,0,0.95)'
  context.beginPath()
  context.roundRect(16, 16, 96, 30, 8)
  context.fill()
  context.fillStyle = '#6b4a00'
  context.font = '800 14px Pretendard Variable, sans-serif'
  context.fillText('테스트 영상', 28, 36)

  // 장면 전환: 앞뒤로 살짝 어둡게
  const fade = progress < 0.12 ? 1 - progress / 0.12 : progress > 0.88 ? (progress - 0.88) / 0.12 : 0
  if (fade > 0) {
    context.fillStyle = `rgba(14,15,20,${fade * 0.8})`
    context.fillRect(0, 0, WIDTH, HEIGHT)
  }
}

export async function createTestVideo(frames: TestVideoFrame[]): Promise<string | null> {
  if (typeof MediaRecorder === 'undefined' || typeof document === 'undefined' || frames.length === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context || typeof canvas.captureStream !== 'function') return null

  const images = await Promise.all(frames.map((frame) => loadImage(frame.imageUrl)))
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type))
  if (!mimeType) return null

  drawFrame(context, frames[0], images[0], 0)
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(canvas.captureStream(FPS), { mimeType })
  } catch {
    return null
  }

  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })

  const totalMs = frames.length * SECONDS_PER_PHOTO * 1000
  recorder.start(250)
  const startedAt = performance.now()

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - startedAt
      if (elapsed >= totalMs) return resolve()
      const index = Math.min(Math.floor(elapsed / (SECONDS_PER_PHOTO * 1000)), frames.length - 1)
      const progress = (elapsed - index * SECONDS_PER_PHOTO * 1000) / (SECONDS_PER_PHOTO * 1000)
      drawFrame(context, frames[index], images[index], progress)
      // 탭이 숨겨져도 녹화가 멈추지 않게 타이머로 그린다
      setTimeout(tick, 1000 / FPS)
    }
    tick()
  })

  recorder.stop()
  await stopped
  return URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }))
}
