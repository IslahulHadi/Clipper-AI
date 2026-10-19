import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Grid2X2,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { AspectRatio, Clip, MediaInfo } from '../types'
import type { AnalysisResult } from '../types'
import { createManualClip } from '../lib/analysis'
import { clamp, downloadBlob, formatBytes, formatTime, safeFileStem } from '../lib/format'
import { exportClip, getExportFormat } from '../lib/exporter'
import { ClipPanel } from './ClipPanel'
import { ExportPanel } from './ExportPanel'
import { Timeline } from './Timeline'

interface StudioProps {
  project: MediaInfo
  analysis: AnalysisResult
  onReplace: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}

export function Studio({ project, analysis, onReplace, onNotify }: StudioProps) {
  const [clips, setClips] = useState<Clip[]>(() =>
    analysis.clips.map((clip, index) => ({ ...clip, selected: index === 0 })),
  )
  const [activeId, setActiveId] = useState(analysis.clips[0]?.id ?? '')
  const [aspect, setAspect] = useState<AspectRatio>('9:16')
  const [cropX, setCropX] = useState(0.5)
  const [hookEnabled, setHookEnabled] = useState(false)
  const [guides, setGuides] = useState(false)
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [showCover, setShowCover] = useState(true)
  const [currentTime, setCurrentTime] = useState(analysis.clips[0]?.start ?? 0)
  const [videoReady, setVideoReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const format = useMemo(() => getExportFormat(), [])

  const activeClip = clips.find((clip) => clip.id === activeId) ?? clips[0]
  const activeIndex = Math.max(0, clips.findIndex((clip) => clip.id === activeClip?.id))
  const hookText = activeClip?.hook ?? ''

  useEffect(() => {
    const video = videoRef.current
    return () => {
      video?.pause()
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    setPlaying(false)
    setShowCover(true)
    video.currentTime = activeClip.start
    setCurrentTime(activeClip.start)
    // Only reset the playhead when the selected clip changes, not while trimming.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        togglePlayback()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        seekTo(Math.max(0, currentTime - 1))
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        seekTo(Math.min(project.duration, currentTime + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  if (!activeClip) {
    return (
      <div className="empty-studio">
        <p>Tidak ada klip yang bisa ditampilkan.</p>
        <button type="button" className="button button-primary" onClick={onReplace}>
          Pilih video lain
        </button>
      </div>
    )
  }

  function updateClip(id: string, patch: Partial<Clip>) {
    setClips((previous) => previous.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)))
  }

  function seekTo(time: number) {
    const video = videoRef.current
    if (!video) return
    const next = clamp(time, 0, project.duration)
    setShowCover(false)
    video.currentTime = next
    setCurrentTime(next)
  }

  function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      setShowCover(false)
      let startAt = video.currentTime
      if (startAt < activeClip.start || startAt >= activeClip.end - 0.05) {
        startAt = activeClip.start
      }
      video.currentTime = startAt
      setCurrentTime(startAt)
      void video.play().catch(() => {
        onNotify('Browser memblokir playback. Klik tombol play sekali lagi.', 'error')
      })
    } else {
      video.pause()
    }
  }

  function selectClip(id: string) {
    if (exporting) return
    if (id === activeId) {
      seekTo(activeClip.start)
      return
    }
    setActiveId(id)
  }

  function handleTrim(clipId: string, side: 'start' | 'end', time: number) {
    const clip = clips.find((item) => item.id === clipId)
    if (!clip) return
    let nextStart = clip.start
    let nextEnd = clip.end
    if (side === 'start') {
      nextStart = Math.round(clamp(time, 0, clip.end - 2) * 10) / 10
    } else {
      nextEnd = Math.round(clamp(time, clip.start + 2, project.duration) * 10) / 10
    }
    updateClip(clipId, { start: nextStart, end: nextEnd })
    const video = videoRef.current
    if (video) {
      video.pause()
      setPlaying(false)
      setShowCover(false)
      const preview = side === 'start' ? nextStart : nextEnd
      video.currentTime = preview
      setCurrentTime(preview)
    }
  }

  function addManualClip() {
    if (exporting) return
    const manual = createManualClip(project.duration, currentTime || activeClip.start)
    const withThumb = { ...manual, thumbnail: activeClip.thumbnail }
    setClips((previous) => [...previous, withThumb])
    setActiveId(withThumb.id)
    onNotify('Klip manual ditambahkan. Atur titik potong di timeline.')
  }

  function deleteActiveClip() {
    if (clips.length <= 1) {
      onNotify('Minimal satu klip harus tersisa.', 'error')
      return
    }
    const removeIndex = clips.findIndex((clip) => clip.id === activeClip.id)
    const nextClip = clips[removeIndex + 1] ?? clips[removeIndex - 1]
    setClips((previous) => previous.filter((clip) => clip.id !== activeClip.id))
    if (nextClip) setActiveId(nextClip.id)
    onNotify('Klip dihapus.')
  }

  function handleHookText(value: string) {
    updateClip(activeClip.id, { hook: value })
  }

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    setExportProgress(0)
    videoRef.current?.pause()
    try {
      const result = await exportClip({
        url: project.url,
        clip: activeClip,
        aspect,
        cropX,
        hookText: hookEnabled ? hookText : '',
        onProgress: setExportProgress,
      })
      const number = String(activeIndex + 1).padStart(2, '0')
      const filename = `${safeFileStem(project.name)}-clip-${number}.${result.extension}`
      downloadBlob(result.blob, filename)
      onNotify(`Klip tersimpan · ${formatBytes(result.blob.size)} · ${result.extension.toUpperCase()}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Ekspor gagal. Coba lagi dengan klip yang lebih pendek.'
      onNotify(message, 'error')
    } finally {
      setExporting(false)
      setExportProgress(0)
    }
  }

  async function goFullscreen() {
    try {
      await previewRef.current?.requestFullscreen()
    } catch {
      onNotify('Fullscreen tidak tersedia di browser ini.', 'error')
    }
  }

  const clipProgress = clamp(
    (currentTime - activeClip.start) / Math.max(0.1, activeClip.end - activeClip.start),
    0,
    1,
  )

  return (
    <div className="studio">
      <ClipPanel
        clips={clips}
        activeId={activeClip.id}
        audioAnalyzed={analysis.audioAnalyzed}
        onSelect={selectClip}
        onAdd={addManualClip}
        disabled={exporting}
      />

      <main className="stage">
        <div className="stage-toolbar">
          <div className="stage-toolbar-left">
            <span className="mono-label">PREVIEW</span>
            <span className="stage-divider" />
            <span className="stage-clip-title">{activeClip.title}</span>
          </div>
          <div className="stage-toolbar-right">
            <button
              type="button"
              className={`guide-button${guides ? ' is-on' : ''}`}
              onClick={() => setGuides((value) => !value)}
              title="Tampilkan safe area"
            >
              <Grid2X2 size={13} />
              Safe area
            </button>
            <span className="format-chip">
              {aspect} · 1080p
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={goFullscreen}
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        <div className="preview-area">
          {activeClip.thumbnail ? (
            <img className="preview-ambient" src={activeClip.thumbnail} alt="" aria-hidden="true" />
          ) : null}
          <div className="preview-aura" aria-hidden="true" />
          <div
            className={`preview-frame${videoReady ? ' is-ready' : ''}`}
            data-aspect={aspect}
            ref={previewRef}
          >
            <video
              ref={videoRef}
              src={project.url}
              poster={activeClip.thumbnail}
              playsInline
              preload="auto"
              muted={muted}
              style={{ objectPosition: `${cropX * 100}% 50%` }}
              onLoadedMetadata={(event) => {
                setVideoReady(true)
                event.currentTarget.currentTime = activeClip.start
                setCurrentTime(activeClip.start)
              }}
              onTimeUpdate={(event) => {
                const time = event.currentTarget.currentTime
                setCurrentTime(time)
                if (playing && time >= activeClip.end - 0.03) {
                  event.currentTarget.pause()
                  event.currentTarget.currentTime = activeClip.end
                  setCurrentTime(activeClip.end)
                }
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}              onEnded={() => setPlaying(false)}
              onClick={togglePlayback}
            />

            {showCover && activeClip.thumbnail ? (
              <img
                className="preview-cover"
                src={activeClip.thumbnail}
                alt=""
                draggable={false}
                style={{ objectPosition: `${cropX * 100}% 50%` }}
              />
            ) : null}

            <div className="preview-vignette" aria-hidden="true" />

            {hookEnabled && hookText.trim() ? (
              <div className="hook-preview" aria-hidden="true">
                <span className="hook-bar" />
                <p>{hookText}</p>
              </div>
            ) : null}

            {guides && aspect === '9:16' ? (
              <div className="safe-area" aria-hidden="true">
                <span className="safe-area-label">SAFE AREA</span>
              </div>
            ) : null}

            <div className="preview-topline">
              <span>
                <Sparkles size={10} />
                AI PREVIEW
              </span>
              <span>{formatTime(currentTime, true)}</span>
            </div>

            {!playing ? (
              <button
                type="button"
                className="preview-play"
                onClick={togglePlayback}
                aria-label="Putar preview klip"
              >
                <Play size={20} fill="currentColor" />
              </button>
            ) : null}

            <div className="preview-progress" aria-hidden="true">
              <span style={{ width: `${clipProgress * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="player-controls">
          <button
            type="button"
            className="play-button"
            onClick={togglePlayback}
            aria-label={playing ? 'Jeda' : 'Putar'}
          >
            {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>
          <div className="player-time">
            <strong>{formatTime(currentTime, true)}</strong>
            <span>/</span>
            <span>{formatTime(activeClip.end, true)}</span>
          </div>
          <span className="player-meta">
            {formatTime(activeClip.end - activeClip.start)} dtk · {aspect} · 30 fps
          </span>
          <div className="player-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => seekTo(activeClip.start)}
              title="Kembali ke awal klip"
              aria-label="Kembali ke awal klip"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className={`icon-button${muted ? ' is-muted' : ''}`}
              onClick={() => {
                const video = videoRef.current
                if (!video) return
                video.muted = !video.muted
                setMuted(video.muted)
              }}
              title={muted ? 'Nyalakan suara' : 'Bisukan'}
              aria-label={muted ? 'Nyalakan suara' : 'Bisukan'}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        <Timeline
          waveform={analysis.waveform}
          duration={project.duration}
          clips={clips}
          activeClip={activeClip}
          currentTime={currentTime}
          onSeek={seekTo}
          onTrim={handleTrim}
          onSelect={selectClip}
        />
      </main>

      <ExportPanel
        clip={activeClip}
        clipIndex={activeIndex}
        aspect={aspect}
        onAspect={setAspect}
        cropX={cropX}
        onCropX={setCropX}
        hookEnabled={hookEnabled}
        onHookEnabled={setHookEnabled}
        hookText={hookText}
        onHookText={handleHookText}
        formatLabel={format.label}
        exporting={exporting}
        progress={exportProgress}
        onExport={handleExport}
        onDelete={deleteActiveClip}
        onRename={(value) => updateClip(activeClip.id, { title: value })}
        disabled={exporting}
      />
    </div>
  )
}
