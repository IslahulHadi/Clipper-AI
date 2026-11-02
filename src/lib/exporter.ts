import type { AspectRatio, Clip, ExportResult } from '../types'
import { ASPECT_DIMENSIONS, drawHookOverlay } from './canvas'
import { clamp } from './format'
import { drawFrameFromVideo } from './media'

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

function chooseMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const mime of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime
    } catch {
      // Keep testing the remaining candidates.
    }
  }
  return ''
}

function extensionForMime(mime: string): string {
  return mime.includes('mp4') ? 'mp4' : 'webm'
}

export function getExportFormat(): { mimeType: string; extension: string; label: string } {
  const mimeType = chooseMimeType()
  const extension = mimeType ? extensionForMime(mimeType) : 'webm'
  return {
    mimeType,
    extension,
    label: mimeType ? extension.toUpperCase() : '—',
  }
}

export interface ExportClipOptions {
  url: string
  clip: Clip
  aspect: AspectRatio
  cropX: number
  hookText: string
  onProgress?: (progress: number) => void
}

export async function exportClip({
  url,
  clip,
  aspect,
  cropX,
  hookText,
  onProgress,
}: ExportClipOptions): Promise<ExportResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Browser ini belum mendukung perekaman video.')
  }

  const mimeType = chooseMimeType()
  if (!mimeType) throw new Error('Browser ini belum mendukung format ekspor video.')

  const dimensions = ASPECT_DIMENSIONS[aspect]
  const video = document.createElement('video')
  video.preload = 'auto'
  video.playsInline = true
  video.volume = 1
  video.muted = false
  video.src = url

  const canvas = document.createElement('canvas')
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Canvas tidak tersedia di browser ini.')

  let audioContext: AudioContext | null = null
  let destination: MediaStreamAudioDestinationNode | null = null
  let source: MediaElementAudioSourceNode | null = null
  let recorder: MediaRecorder | null = null
  let animationFrame = 0
  let finished = false
  let lastProgressSent = 0
  let safetyTimer = 0
  let checkTimer = 0

  const cleanup = () => {
    window.clearTimeout(safetyTimer)
    window.clearInterval(checkTimer)
    window.cancelAnimationFrame(animationFrame)
    try {
      video.pause()
    } catch {
      // Ignore media teardown errors.
    }
    video.removeAttribute('src')
    video.load()
    try {
      source?.disconnect()
      destination?.disconnect()
    } catch {
      // Ignore audio graph teardown errors.
    }
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close().catch(() => undefined)
    }
  }

  try {
    // AudioContext is created while the click that triggered the export is still
    // considered a user gesture, which keeps playback from being blocked later.
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioContext = new AudioContextClass()
      await audioContext.resume().catch(() => undefined)
    }

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Video terlalu lama dimuat.')), 15_000)
      const done = () => {
        window.clearTimeout(timer)
        video.removeEventListener('loadeddata', done)
        video.removeEventListener('error', fail)
        resolve()
      }
      const fail = () => {
        window.clearTimeout(timer)
        video.removeEventListener('loadeddata', done)
        video.removeEventListener('error', fail)
        reject(new Error('Video tidak dapat dibaca untuk ekspor.'))
      }
      video.addEventListener('loadeddata', done, { once: true })
      video.addEventListener('error', fail, { once: true })
    })

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Gagal melompat ke titik klip.')), 8_000)
      const done = () => {
        window.clearTimeout(timer)
        video.removeEventListener('seeked', done)
        resolve()
      }
      video.addEventListener('seeked', done, { once: true })
      video.currentTime = clamp(clip.start, 0, Math.max(0, video.duration - 0.05))
    })

    await document.fonts.ready.catch(() => undefined)

    const renderFrame = () => {
      context.fillStyle = '#050505'
      context.fillRect(0, 0, canvas.width, canvas.height)
      drawFrameFromVideo(context, video, canvas.width, canvas.height, cropX)
      if (hookText.trim()) {
        drawHookOverlay(context, hookText, canvas.width, canvas.height, aspect)
      }
    }

    renderFrame()

    const stream = canvas.captureStream(30)
    if (audioContext) {
      try {
        source = audioContext.createMediaElementSource(video)
        destination = audioContext.createMediaStreamDestination()
        source.connect(destination)
        destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track))
      } catch {
        // If audio routing fails, export a silent but valid clip.
      }
    }

    const chunks: BlobPart[] = []
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: aspect === '16:9' ? 10_000_000 : 8_000_000,
    })
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data)
    })

    const result = new Promise<ExportResult>((resolve, reject) => {
      if (!recorder) {
        reject(new Error('Perekam video gagal dibuat.'))
        return
      }
      recorder.addEventListener(
        'stop',
        () => {
          const blob = new Blob(chunks, { type: recorder?.mimeType || mimeType })
          if (blob.size === 0) {
            reject(new Error('Hasil ekspor kosong. Coba lagi.'))
            return
          }
          resolve({
            blob,
            extension: extensionForMime(recorder?.mimeType || mimeType),
            duration: clip.end - clip.start,
          })
        },
        { once: true },
      )
      recorder.addEventListener(
        'error',
        () => reject(new Error('Perekaman video gagal. Coba browser lain.')),
        { once: true },
      )
    })

    const finish = () => {
      if (finished) return
      finished = true
      window.clearInterval(checkTimer)
      window.clearTimeout(safetyTimer)
      window.cancelAnimationFrame(animationFrame)
      try {
        video.pause()
      } catch {
        // Ignore.
      }
      if (recorder && recorder.state !== 'inactive') {
        window.setTimeout(() => recorder?.stop(), 120)
      } else {
        recorder?.stop()
      }
      onProgress?.(1)
    }

    const loop = () => {
      if (finished) return
      renderFrame()
      const progress = clamp((video.currentTime - clip.start) / Math.max(0.1, clip.end - clip.start), 0, 1)
      const now = performance.now()
      if (now - lastProgressSent > 120) {
        lastProgressSent = now
        onProgress?.(progress)
      }
      if (video.currentTime >= clip.end - 0.02 || video.ended) {
        finish()
        return
      }
      animationFrame = window.requestAnimationFrame(loop)
    }

    recorder.start(200)
    onProgress?.(0)
    try {
      await video.play()
    } catch {
      throw new Error('Playback diblokir browser. Klik tombol ekspor sekali lagi.')
    }

    checkTimer = window.setInterval(() => {
      if (finished) return
      if (video.currentTime >= clip.end - 0.03 || video.ended) finish()
    }, 90)

    safetyTimer = window.setTimeout(
      () => {
        if (!finished) finish()
      },
      Math.ceil((clip.end - clip.start + 20) * 1000),
    )

    animationFrame = window.requestAnimationFrame(loop)
    const exportResult = await result
    cleanup()
    return exportResult
  } catch (error) {
    cleanup()
    throw error
  }
}
