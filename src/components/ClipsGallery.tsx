import { useMemo, useRef, useState } from 'react'
import {
  Clock3,
  Download,
  Flame,
  ListOrdered,
  LoaderCircle,
  Pencil,
  Plus,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import type { AnalysisResult, Clip, MediaInfo } from '../types'
import { downloadBlob, formatBytes, formatTime, safeFileStem } from '../lib/format'
import { exportClip } from '../lib/exporter'

interface ClipsGalleryProps {
  project: MediaInfo
  analysis: AnalysisResult
  onEdit: (clipId: string) => void
  onAddManual: () => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}

type SortMode = 'score' | 'time'

function scoreTone(score: number | null): string {
  if (score === null) return 'manual'
  if (score >= 94) return 'hot'
  if (score >= 88) return 'warm'
  return 'solid'
}

interface ClipCardProps {
  clip: Clip
  rank: number
  url: string
  exporting: boolean
  progress: number
  busy: boolean
  onEdit: () => void
  onExport: () => void
}

function ClipCard({ clip, rank, url, exporting, progress, busy, onEdit, onExport }: ClipCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovering, setHovering] = useState(false)
  const duration = clip.end - clip.start
  const tone = scoreTone(clip.score)

  function startPreview() {
    const video = videoRef.current
    if (!video) return
    setHovering(true)
    video.currentTime = clip.start
    void video.play().catch(() => undefined)
  }

  function stopPreview() {
    const video = videoRef.current
    setHovering(false)
    if (!video) return
    video.pause()
    video.currentTime = clip.start
  }

  return (
    <article className="cg-card">
      <div
        className="cg-thumb"
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
        onClick={onEdit}
        role="button"
        tabIndex={0}
        aria-label={`Edit ${clip.title}`}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onEdit()
          }
        }}
      >
        <video
          ref={videoRef}
          src={url}
          muted
          playsInline
          preload="metadata"
          onTimeUpdate={(event) => {
            if (event.currentTarget.currentTime >= clip.end) {
              event.currentTarget.currentTime = clip.start
            }
          }}
        />
        {clip.thumbnail && !hovering ? <img src={clip.thumbnail} alt="" draggable={false} /> : null}
        <span className="cg-rank">#{rank}</span>
        <span className={`cg-score cg-score-${tone}`}>
          {clip.score ?? '—'}
          <small>{clip.score === null ? 'manual' : '/100'}</small>
        </span>
        <span className="cg-duration">
          <Clock3 size={11} />
          {formatTime(duration)}
        </span>
        {exporting ? (
          <div className="cg-exporting">
            <LoaderCircle size={18} className="spin" />
            <span>{Math.round(progress * 100)}%</span>
            <i style={{ width: `${progress * 100}%` }} />
          </div>
        ) : null}
      </div>

      <div className="cg-body">
        <div className="cg-meta">
          <span className={`cg-tag cg-tag-${tone}`}>
            {tone === 'hot' ? <Flame size={11} /> : null}
            {clip.tag}
          </span>
          <span className="cg-range">
            {formatTime(clip.start)} – {formatTime(clip.end)}
          </span>
        </div>
        <h3 title={clip.title}>{clip.title}</h3>
        {clip.energy > 0 ? (
          <div className="cg-energy" title={`Energi audio ${clip.energy}%`}>
            <span className="cg-energy-label">Energi</span>
            <span className="cg-energy-track">
              <span style={{ width: `${Math.min(100, clip.energy)}%` }} />
            </span>
            <span className="cg-energy-value">{clip.energy}</span>
          </div>
        ) : null}
        <div className="cg-actions">
          <button type="button" className="cg-btn cg-btn-white" onClick={onEdit} disabled={busy}>
            <Pencil size={13} />
            Edit
          </button>
          <button type="button" className="cg-btn" onClick={onExport} disabled={busy}>
            <Download size={13} />
            Unduh
          </button>
        </div>
      </div>
    </article>
  )
}

export function ClipsGallery({ project, analysis, onEdit, onAddManual, onNotify }: ClipsGalleryProps) {
  const [sort, setSort] = useState<SortMode>('score')
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const ranked = useMemo(() => {
    const byScore = [...analysis.clips].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    return new Map(byScore.map((clip, index) => [clip.id, index + 1]))
  }, [analysis.clips])

  const clips = useMemo(() => {
    const list = [...analysis.clips]
    if (sort === 'score') list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    else list.sort((a, b) => a.start - b.start)
    return list
  }, [analysis.clips, sort])

  const scored = analysis.clips.filter((clip) => clip.score !== null)
  const best = scored.reduce<number | null>((max, clip) => Math.max(max ?? 0, clip.score ?? 0), null)
  const totalSeconds = analysis.clips.reduce((sum, clip) => sum + (clip.end - clip.start), 0)

  async function handleExport(clip: Clip) {
    if (exportingId) return
    setExportingId(clip.id)
    setProgress(0)
    try {
      const result = await exportClip({
        url: project.url,
        clip,
        aspect: '9:16',
        cropX: 0.5,
        hookText: clip.hook ?? '',
        onProgress: setProgress,
      })
      const rank = String(ranked.get(clip.id) ?? 1).padStart(2, '0')
      downloadBlob(result.blob, `${safeFileStem(project.name)}-clip-${rank}.${result.extension}`)
      onNotify(`Klip tersimpan · ${formatBytes(result.blob.size)} · ${result.extension.toUpperCase()}`)
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Ekspor gagal. Coba lagi.', 'error')
    } finally {
      setExportingId(null)
      setProgress(0)
    }
  }

  return (
    <main className="cg">
      <div className="cg-glow" aria-hidden="true" />
      <header className="cg-head">
        <div>
          <p className="cg-kicker">
            <Sparkles size={13} /> HASIL AI
          </p>
          <h1>
            Klip asli <span>({analysis.clips.length})</span>
          </h1>
          <p className="cg-sub">
            {analysis.audioAnalyzed
              ? 'Diurutkan berdasarkan skor viral dari energi audio. Arahkan kursor untuk preview, klik untuk mengedit.'
              : 'Audio tidak terbaca, jadi video dibagi otomatis. Kamu tetap bisa trim manual di editor.'}
          </p>
        </div>

        <div className="cg-summary">
          <div>
            <strong>{best ?? '—'}</strong>
            <span>skor tertinggi</span>
          </div>
          <div>
            <strong>{formatTime(totalSeconds)}</strong>
            <span>total durasi klip</span>
          </div>
          <div>
            <strong>{formatTime(project.duration)}</strong>
            <span>video sumber</span>
          </div>
        </div>
      </header>

      {!analysis.audioAnalyzed ? (
        <div className="cg-warning">
          <TriangleAlert size={14} />
          Analisis audio dilewati untuk video ini.
        </div>
      ) : null}

      <div className="cg-toolbar">
        <div className="cg-sort" role="tablist" aria-label="Urutkan klip">
          <button
            type="button"
            role="tab"
            aria-selected={sort === 'score'}
            className={sort === 'score' ? 'is-active' : ''}
            onClick={() => setSort('score')}
          >
            <TrendingUp size={13} /> Skor tertinggi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sort === 'time'}
            className={sort === 'time' ? 'is-active' : ''}
            onClick={() => setSort('time')}
          >
            <ListOrdered size={13} /> Urutan waktu
          </button>
        </div>
        <span className="cg-format">9:16 · 1080p · tanpa watermark</span>
      </div>

      <div className="cg-grid">
        {clips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            rank={ranked.get(clip.id) ?? 1}
            url={project.url}
            exporting={exportingId === clip.id}
            progress={progress}
            busy={exportingId !== null}
            onEdit={() => onEdit(clip.id)}
            onExport={() => void handleExport(clip)}
          />
        ))}

        <button type="button" className="cg-add" onClick={onAddManual} disabled={exportingId !== null}>
          <span>
            <Plus size={20} />
          </span>
          <strong>Buat klip manual</strong>
          <small>Pilih sendiri titik potong di editor</small>
        </button>
      </div>
    </main>
  )
}
