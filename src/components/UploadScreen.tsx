import { useState } from 'react'
import {
  ArrowRight,
  AudioLines,
  Clapperboard,
  Crop,
  LoaderCircle,
  ShieldCheck,
  Upload,
} from 'lucide-react'

interface UploadScreenProps {
  onBrowse: () => void
  onFile: (file: File) => void
  onDemo: () => void
  demoLoading: boolean
}

const FEATURES = [
  { icon: AudioLines, label: 'Analisis audio' },
  { icon: Crop, label: 'Auto reframe 9:16' },
  { icon: ShieldCheck, label: 'Tanpa watermark' },
]

export function UploadScreen({ onBrowse, onFile, onDemo, demoLoading }: UploadScreenProps) {
  const [dragging, setDragging] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    setDragDepth(0)
    const file = event.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <main className="upload-page">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="upload-grid" aria-hidden="true" />

      <section className="upload-copy">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          <span>AI CLIP STUDIO</span>
          <span className="eyebrow-divider" />
          <span className="eyebrow-muted">LOCAL FIRST</span>
        </div>

        <h1 className="hero-title">
          Satu video.
          <br />
          <span className="marker">Banyak klip</span>
          <br />
          yang pantas viral.
        </h1>

        <p className="hero-copy">
          Unggah video panjang, biarkan Clipper AI menemukan momen paling kuat,
          lalu potong otomatis ke format vertikal. Semua terjadi di browser — tanpa
          antre, tanpa upload ke server.
        </p>

        <div className="hero-actions">
          <button type="button" className="button button-primary" onClick={onBrowse}>
            <Upload size={17} />
            Pilih video
            <ArrowRight size={16} className="button-arrow" />
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={onDemo}
            disabled={demoLoading}
          >
            {demoLoading ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Clapperboard size={16} />
            )}
            {demoLoading ? 'Menyiapkan demo…' : 'Coba video contoh'}
          </button>
        </div>

        <div className="feature-row">
          {FEATURES.map(({ icon: Icon, label }) => (
            <span className="feature-chip" key={label}>
              <Icon size={14} />
              {label}
            </span>
          ))}
        </div>

        <div className="upload-steps" aria-label="Tiga langkah">
          <span className="step">
            <b>01</b> Upload
          </span>
          <span className="step-line" />
          <span className="step">
            <b>02</b> AI scan
          </span>
          <span className="step-line" />
          <span className="step">
            <b>03</b> Ekspor
          </span>
        </div>
      </section>

      <section className="drop-section">
        <div
          className={`drop-card${dragging ? ' is-dragging' : ''}`}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragDepth((depth) => depth + 1)
            setDragging(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault()
            const next = Math.max(0, dragDepth - 1)
            setDragDepth(next)
            if (next === 0) setDragging(false)
          }}
          onDrop={handleDrop}
          onClick={onBrowse}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onBrowse()
            }
          }}
          aria-label="Tarik video ke sini atau klik untuk memilih file"
        >
          <span className="corner corner-tl" aria-hidden="true" />
          <span className="corner corner-tr" aria-hidden="true" />
          <span className="corner corner-bl" aria-hidden="true" />
          <span className="corner corner-br" aria-hidden="true" />

          <div className="drop-head">
            <span className="drop-label">
              <span className="drop-label-dot" />
              DROP ZONE
            </span>
            <span className="drop-local">
              <ShieldCheck size={12} /> ON DEVICE
            </span>
          </div>

          <div className="drop-center">
            <div className={`drop-orbit${dragging ? ' is-active' : ''}`}>
              <span className="orbit-ring orbit-ring-one" />
              <span className="orbit-ring orbit-ring-two" />
              <span className="drop-icon">
                <Upload size={24} strokeWidth={1.8} />
              </span>
            </div>
            <h2>{dragging ? 'Lepaskan videonya' : 'Tarik video ke sini'}</h2>
            <p>
              atau <span>klik untuk memilih</span> dari perangkat
            </p>
            <span className="drop-formats">MP4 · MOV · WEBM · MAKS 1 GB</span>
          </div>

          <div className="drop-foot">
            <div className="drop-spec">
              <span className="mono-label">OUTPUT</span>
              <span>9:16 · 1:1 · 16:9</span>
            </div>
            <div className="drop-spec drop-spec-right">
              <span className="mono-label">QUALITY</span>
              <span>1080p / 30 fps</span>
            </div>
          </div>
        </div>

        <p className="drop-privacy">
          <ShieldCheck size={14} />
          File video tidak pernah meninggalkan perangkatmu.
        </p>
      </section>

      <div className="upload-footer">
        <span>CLIPPER STUDIO</span>
        <span className="footer-line" />
        <span>BUILD 0.1 — PROTOTYPE</span>
        <span className="upload-footer-right">BROWSER-NATIVE VIDEO EDITOR</span>
      </div>
    </main>
  )
}
