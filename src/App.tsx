import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import type { AnalysisResult, AnalysisStage, Clip, MediaInfo } from './types'
import { analyzeVideo, createManualClip } from './lib/analysis'
import { createThumbnails, isVideoFile, readVideoMetadata } from './lib/media'
import { formatBytes, formatTime } from './lib/format'
import { Topbar } from './components/Topbar'
import { LandingPage } from './components/LandingPage'
import { AnalyzingOverlay } from './components/AnalyzingOverlay'
import { ClipsGallery } from './components/ClipsGallery'
import { Studio } from './components/Studio'

type Phase = 'idle' | 'analyzing' | 'clips' | 'editor'

const UNSUPPORTED_HOSTS = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|vimeo\.com|twitch\.tv|drive\.google\.com)/i

interface ToastState {
  id: number
  message: string
  tone: 'success' | 'error'
}

const MAX_FILE_SIZE = 1024 * 1024 * 1024
const MIN_ANALYSIS_TIME = 3200

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [project, setProject] = useState<MediaInfo | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('reading')
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [editClipId, setEditClipId] = useState<string | undefined>(undefined)

  const inputRef = useRef<HTMLInputElement>(null)
  const jobRef = useRef(0)
  const previousUrlRef = useRef<string | null>(null)

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ id: Date.now(), message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (phase !== 'analyzing') return
    const startedAt = performance.now()
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt
      setAnalysisProgress((previous) =>
        Math.max(previous, Math.min(92, (elapsed / MIN_ANALYSIS_TIME) * 92)),
      )
    }, 90)
    return () => window.clearInterval(timer)
  }, [phase])

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  async function handleFile(file: File) {
    if (!isVideoFile(file)) {
      notify('Format belum didukung. Gunakan MP4, MOV, atau WebM.', 'error')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      notify('Ukuran video melebihi 1 GB. Coba file yang lebih kecil.', 'error')
      return
    }

    const job = jobRef.current + 1
    jobRef.current = job

    if (previousUrlRef.current) {
      window.setTimeout(() => URL.revokeObjectURL(previousUrlRef.current ?? ''), 800)
    }

    const url = URL.createObjectURL(file)
    previousUrlRef.current = url
    const baseProject: MediaInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      duration: 0,
      width: 0,
      height: 0,
      url,
    }

    setProject(baseProject)
    setAnalysis(null)
    setAnalysisProgress(1)
    setAnalysisStage('reading')
    setPhase('analyzing')

    try {
      const metadata = await readVideoMetadata(url)
      if (job !== jobRef.current) return
      if (!metadata.duration || metadata.duration < 0.5) {
        throw new Error('Video terlalu pendek atau tidak memiliki durasi yang valid.')
      }
      const nextProject = { ...baseProject, ...metadata }
      setProject(nextProject)

      const startedAt = performance.now()
      const result = await analyzeVideo({
        file,
        duration: metadata.duration,
        onStage: (stage) => {
          if (job === jobRef.current) setAnalysisStage(stage)
        },
      })
      if (job !== jobRef.current) return

      setAnalysis(result)
      setAnalysisStage('thumbnails')
      await createThumbnails(url, result.clips, (id, dataUrl) => {
        setAnalysis((previous) =>
          previous
            ? {
                ...previous,
                clips: previous.clips.map((clip) =>
                  clip.id === id ? { ...clip, thumbnail: dataUrl } : clip,
                ),
              }
            : previous,
        )
      })

      const elapsed = performance.now() - startedAt
      if (elapsed < MIN_ANALYSIS_TIME) {
        await wait(MIN_ANALYSIS_TIME - elapsed)
      }
      if (job !== jobRef.current) return

      setAnalysisStage('ready')
      setAnalysisProgress(100)
      await wait(420)
      if (job !== jobRef.current) return
      setEditClipId(undefined)
      setPhase('clips')
      window.scrollTo({ top: 0 })
    } catch (error) {
      if (job !== jobRef.current) return
      URL.revokeObjectURL(url)
      previousUrlRef.current = null
      setProject(null)
      setAnalysis(null)
      setPhase('idle')
      notify(
        error instanceof Error
          ? error.message
          : 'Video gagal diproses. Coba file lain atau browser lain.',
        'error',
      )
    }
  }

  async function handleDemo() {
    if (demoLoading) return
    setDemoLoading(true)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}demo.mp4`)
      if (!response.ok) throw new Error('Video contoh tidak ditemukan.')
      const blob = await response.blob()
      const file = new File([blob], 'clipper-demo.mp4', { type: 'video/mp4' })
      await handleFile(file)
    } catch {
      notify('Video contoh gagal dimuat. Coba pilih video dari perangkat.', 'error')
    } finally {
      setDemoLoading(false)
    }
  }

  async function handleUrl(value: string) {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      notify('Link tidak valid. Tempel URL lengkap yang diawali https://', 'error')
      return
    }
    if (UNSUPPORTED_HOSTS.test(url.hostname)) {
      notify('Link platform sosial belum bisa diambil langsung dari browser. Unduh videonya, lalu upload file.', 'error')
      return
    }
    try {
      const response = await fetch(url.href)
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const name = decodeURIComponent(url.pathname.split('/').pop() || 'video-link.mp4')
      const file = new File([blob], name, { type: blob.type || 'video/mp4' })
      await handleFile(file)
    } catch {
      notify('Video dari link ini tidak bisa diambil (CORS atau bukan file video). Coba upload file.', 'error')
    }
  }

  function openClip(clipId: string) {
    setEditClipId(clipId)
    setPhase('editor')
    window.scrollTo({ top: 0 })
  }

  function addManualFromGallery() {
    if (!analysis || !project) return
    const manual: Clip = {
      ...createManualClip(project.duration, project.duration * 0.3),
      thumbnail: analysis.clips[0]?.thumbnail,
    }
    setAnalysis({ ...analysis, clips: [...analysis.clips, manual] })
    openClip(manual.id)
  }

  function backToGallery(clips: Clip[]) {
    setAnalysis((previous) => (previous ? { ...previous, clips } : previous))
    setPhase('clips')
    window.scrollTo({ top: 0 })
  }

  function goHome() {
    if (phase === 'analyzing') return
    if (phase !== 'idle' && !window.confirm('Kembali ke beranda? Klip yang belum diekspor akan hilang.')) return
    jobRef.current += 1
    setPhase('idle')
    setAnalysis(null)
    setProject(null)
  }

  const inWorkspace = Boolean(project && analysis && (phase === 'clips' || phase === 'editor'))

  return (
    <div className={`app-shell${inWorkspace ? '' : ' is-landing'}`}>
      {inWorkspace ? (
        <Topbar
          projectName={project?.name}
          projectMeta={project?.duration ? `${formatTime(project.duration)} · ${formatBytes(project.size)}` : undefined}
          section={phase === 'editor' ? 'Editor' : 'Klip'}
          onHome={goHome}
          onReplace={openPicker}
        />
      ) : null}

      {phase === 'editor' && analysis && project ? (
        <Studio
          key={`${project.url}-${editClipId ?? ''}`}
          project={project}
          analysis={analysis}
          initialClipId={editClipId}
          onBack={backToGallery}
          onReplace={openPicker}
          onNotify={notify}
        />
      ) : phase === 'clips' && analysis && project ? (
        <ClipsGallery
          project={project}
          analysis={analysis}
          onEdit={openClip}
          onAddManual={addManualFromGallery}
          onNotify={notify}
        />
      ) : (
        <LandingPage
          onBrowse={openPicker}
          onFile={handleFile}
          onUrl={handleUrl}
          onDemo={handleDemo}
          demoLoading={demoLoading}
        />
      )}

      {phase === 'analyzing' && project ? (
        <AnalyzingOverlay
          fileName={project.name}
          fileSize={project.size}
          progress={analysisProgress}
          stage={analysisStage}
          clipCount={analysis?.clips.length ?? 0}
        />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mp4,.mov,.m4v,.webm,.ogv"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void handleFile(file)
        }}
      />

      {toast ? (
        <div className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
          <span className="toast-icon">
            {toast.tone === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          </span>
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
          >
            <X size={13} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
