export interface VideoMetadata {
  duration: number
  width: number
  height: number
}

function waitForEvent(
  target: HTMLMediaElement,
  event: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`Timed out waiting for ${event}`))
    }, timeoutMs)
    const onEvent = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }
    const onError = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('Video tidak dapat dibaca oleh browser ini.'))
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      target.removeEventListener(event, onEvent)
      target.removeEventListener('error', onError)
    }
    target.addEventListener(event, onEvent, { once: true })
    target.addEventListener('error', onError, { once: true })
  })
}

export async function readVideoMetadata(url: string): Promise<VideoMetadata> {
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.src = url
  try {
    await waitForEvent(video, 'loadedmetadata', 12_000)
    return {
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: video.videoWidth,
      height: video.videoHeight,
    }
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}

export function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  cropX = 0.5,
): void {
  if (sourceWidth <= 0 || sourceHeight <= 0) return
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  const x = (targetWidth - width) * cropX
  const y = (targetHeight - height) * 0.5
  context.drawImage(source, x, y, width, height)
}

export function drawFrameFromVideo(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  cropX = 0.5,
): void {
  drawCover(
    context,
    video,
    video.videoWidth,
    video.videoHeight,
    targetWidth,
    targetHeight,
    cropX,
  )
}

export function drawThumbnailFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  cropX = 0.5,
): void {
  context.fillStyle = '#090b08'
  context.fillRect(0, 0, targetWidth, targetHeight)
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return

  drawFrameFromVideo(context, video, targetWidth, targetHeight, cropX)

  const shade = context.createLinearGradient(0, targetHeight * 0.45, 0, targetHeight)
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
  context.fillStyle = shade
  context.fillRect(0, 0, targetWidth, targetHeight)
}

export async function createThumbnails(
  url: string,
  clips: { id: string; start: number; end: number }[],
  onThumbnail: (id: string, dataUrl: string) => void,
  cropX = 0.5,
): Promise<void> {
  if (clips.length === 0) return
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = url
  const canvas = document.createElement('canvas')
  canvas.width = 540
  canvas.height = 960
  const context = canvas.getContext('2d')
  if (!context) return

  try {
    await waitForEvent(video, 'loadeddata', 15_000)
    for (const clip of clips) {
      const target = Math.min(
        Math.max(clip.start + (clip.end - clip.start) * 0.45, 0),
        Math.max(0, video.duration - 0.15),
      )
      try {
        const seeked = waitForEvent(video, 'seeked', 5_000)
        video.currentTime = target
        await seeked
        context.clearRect(0, 0, canvas.width, canvas.height)
        drawThumbnailFrame(context, video, canvas.width, canvas.height, cropX)
        onThumbnail(clip.id, canvas.toDataURL('image/jpeg', 0.86))
      } catch {
        // A single unseekable frame should not prevent the rest of the analysis.
      }
    }
  } catch {
    // Thumbnails are a progressive enhancement.
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogv|ogg)$/i.test(file.name)
}
