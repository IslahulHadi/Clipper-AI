import { Check, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react'
import type { AnalysisStage } from '../types'
import { formatBytes } from '../lib/format'

interface AnalyzingOverlayProps {
  fileName: string
  fileSize: number
  progress: number
  stage: AnalysisStage
  clipCount: number
}

const STAGE_COPY: Record<AnalysisStage, string> = {
  reading: 'Membaca struktur video…',
  audio: 'Menganalisis energi audio…',
  detecting: 'Mencari momen dengan retensi terbaik…',
  thumbnails: 'Menyiapkan preview klip…',
  ready: 'Klip kamu sudah siap.',
}

const STAGES: { key: AnalysisStage; label: string }[] = [
  { key: 'reading', label: 'Baca video' },
  { key: 'audio', label: 'Analisis audio' },
  { key: 'detecting', label: 'Susun klip' },
]

const STAGE_ORDER: Record<AnalysisStage, number> = {
  reading: 0,
  audio: 1,
  detecting: 2,
  thumbnails: 3,
  ready: 3,
}

const BARS = Array.from({ length: 72 }, (_, index) => {
  const wave =
    18 +
    Math.abs(Math.sin(index * 0.37)) * 38 +
    Math.abs(Math.sin(index * 0.11 + 1.7)) * 26
  return Math.round(Math.min(88, wave))
})

export function AnalyzingOverlay({
  fileName,
  fileSize,
  progress,
  stage,
  clipCount,
}: AnalyzingOverlayProps) {
  const activeStage = STAGE_ORDER[stage]
  const percent = Math.round(Math.min(100, Math.max(0, progress)))

  return (
    <div className="analysis-backdrop" role="dialog" aria-modal="true" aria-label="Menganalisis video">
      <div className="analysis-card">
        <div className="analysis-head">
          <span className="scan-badge">
            <span className="scan-pulse" />
            AI SCAN
          </span>
          <span className="analysis-local">
            <LockKeyhole size={12} /> LOKAL
          </span>
        </div>

        <div className="scan-visual" aria-hidden="true">
          <div className="scan-grid" />
          <div className="scan-bars">
            {BARS.map((height, index) => (
              <span
                key={index}
                className={`scan-bar${index / BARS.length <= progress / 100 ? ' is-hot' : ''}`}
                style={{
                  height: `${height}%`,
                  animationDelay: `${(index % 13) * -90}ms`,
                }}
              />
            ))}
          </div>
          <div className="scan-line" />
          <span className="scan-corner scan-corner-tl" />
          <span className="scan-corner scan-corner-tr" />
          <span className="scan-corner scan-corner-bl" />
          <span className="scan-corner scan-corner-br" />
        </div>

        <div className="analysis-copy">
          <div>
            <p className="analysis-kicker">
              <Sparkles size={13} />
              CLIPPER ENGINE
            </p>
            <h2>{STAGE_COPY[stage]}</h2>
            <p className="analysis-file" title={fileName}>
              {fileName} <span>· {formatBytes(fileSize)}</span>
            </p>
          </div>
          <div className="analysis-percent">
            {percent}
            <span>%</span>
          </div>
        </div>

        <div className="progress-track" aria-hidden="true">
          <span className="progress-fill" style={{ width: `${percent}%` }} />
        </div>

        <div className="analysis-steps">
          {STAGES.map((item, index) => {
            const complete = activeStage > index
            const active = activeStage === index
            return (
              <div
                key={item.key}
                className={`analysis-step${complete ? ' is-complete' : ''}${active ? ' is-active' : ''}`}
              >
                <span className="analysis-step-icon">
                  {complete ? (
                    <Check size={11} />
                  ) : active ? (
                    <LoaderCircle size={11} className="spin" />
                  ) : (
                    <span className="step-empty" />
                  )}
                </span>
                {item.label}
              </div>
            )
          })}
          <span className="analysis-count">
            {clipCount > 0 ? `${clipCount} klip ditemukan` : 'Menyiapkan…'}
          </span>
        </div>
      </div>
    </div>
  )
}
