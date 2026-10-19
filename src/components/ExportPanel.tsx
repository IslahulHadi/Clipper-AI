import { Download, LoaderCircle, LockKeyhole, Scissors, Sparkles, Trash2 } from 'lucide-react'
import type { AspectRatio, Clip } from '../types'
import { formatTime } from '../lib/format'

const ASPECTS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: '9:16', label: '9:16', hint: 'Reels · TikTok' },
  { value: '1:1', label: '1:1', hint: 'Feed' },
  { value: '16:9', label: '16:9', hint: 'YouTube' },
]

interface ExportPanelProps {
  clip: Clip
  clipIndex: number
  aspect: AspectRatio
  onAspect: (aspect: AspectRatio) => void
  cropX: number
  onCropX: (value: number) => void
  hookEnabled: boolean
  onHookEnabled: (value: boolean) => void
  hookText: string
  onHookText: (value: string) => void
  formatLabel: string
  exporting: boolean
  progress: number
  onExport: () => void
  onDelete: () => void
  onRename: (value: string) => void
  disabled?: boolean
}

export function ExportPanel({
  clip,
  clipIndex,
  aspect,
  onAspect,
  cropX,
  onCropX,
  hookEnabled,
  onHookEnabled,
  hookText,
  onHookText,
  formatLabel,
  exporting,
  progress,
  onExport,
  onDelete,
  onRename,
  disabled,
}: ExportPanelProps) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)

  return (
    <aside className="export-panel">
      <div className="export-head">
        <div>
          <p className="panel-kicker">
            <Sparkles size={12} />
            OUTPUT
          </p>
          <h2 className="panel-title">Ekspor klip</h2>
        </div>
        <span className="clip-counter">KLIP {String(clipIndex + 1).padStart(2, '0')}</span>
      </div>

      <div className="active-clip-block">
        <label className="field-label" htmlFor="clip-title">
          JUDUL KLIP
        </label>
        <input
          id="clip-title"
          className="clip-title-input"
          value={clip.title}
          onChange={(event) => onRename(event.target.value)}
          maxLength={48}
          spellCheck={false}
        />
        <div className="trim-summary">
          <span>
            <Scissors size={12} />
            {formatTime(clip.start, true)} → {formatTime(clip.end, true)}
          </span>
          <b>{formatTime(clip.end - clip.start)} dtk</b>
          <button
            type="button"
            className="icon-button danger"
            onClick={onDelete}
            title="Hapus klip"
            aria-label="Hapus klip"
            disabled={disabled || exporting}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="export-section">
        <div className="section-label">
          <span>FORMAT FRAME</span>
          <span className="section-value">{aspect}</span>
        </div>
        <div className="aspect-grid">
          {ASPECTS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`aspect-tile${aspect === item.value ? ' is-active' : ''}`}
              onClick={() => onAspect(item.value)}
              aria-pressed={aspect === item.value}
            >
              <span className={`aspect-glyph aspect-glyph-${item.value.replace(':', '-')}`}>
                <i />
              </span>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="export-section">
        <div className="section-label">
          <span>FOKUS CROP</span>
          <span className="section-value">{Math.round(cropX * 100)}%</span>
        </div>
        <div className="crop-control">
          <span>Kiri</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(cropX * 100)}
            onChange={(event) => onCropX(Number(event.target.value) / 100)}
            aria-label="Posisi fokus crop horizontal"
          />
          <span>Kanan</span>
        </div>
        <p className="field-help">Geser untuk menentukan bagian video yang tetap di frame.</p>
      </div>

      <div className="export-section">
        <div className="hook-row">
          <div>
            <span className="section-label section-label-plain">HOOK OVERLAY</span>
            <p className="field-help">Teks besar di bagian atas video.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hookEnabled}
            aria-label="Aktifkan hook overlay"
            className={`switch${hookEnabled ? ' is-on' : ''}`}
            onClick={() => onHookEnabled(!hookEnabled)}
          >
            <span />
          </button>
        </div>
        <div className={`hook-editor${hookEnabled ? ' is-enabled' : ''}`}>
          <textarea
            value={hookText}
            onChange={(event) => onHookText(event.target.value)}
            placeholder="Tulis hook singkat…"
            maxLength={72}
            rows={2}
            disabled={!hookEnabled}
            aria-label="Teks hook overlay"
          />
          <span className="char-count">{hookText.length}/72</span>
        </div>
      </div>

      <div className="export-summary">
        <div>
          <span className="mono-label">FORMAT</span>
          <strong>
            {formatLabel} · 1080p
          </strong>
        </div>
        <div>
          <span className="mono-label">DURASI</span>
          <strong>{formatTime(clip.end - clip.start, true)}</strong>
        </div>
        <div>
          <span className="mono-label">FPS</span>
          <strong>30</strong>
        </div>
      </div>

      <div className="export-action">
        <button
          type="button"
          className={`export-button${exporting ? ' is-exporting' : ''}`}
          onClick={onExport}
          disabled={exporting || disabled}
        >
          {exporting ? (
            <>
              <LoaderCircle size={17} className="spin" />
              Merender klip… {percent}%
            </>
          ) : (
            <>
              <Download size={17} />
              Ekspor klip
              <span className="export-ext">.{formatLabel.toLowerCase()}</span>
            </>
          )}
        </button>
        {exporting ? (
          <div className="export-progress" aria-hidden="true">
            <span style={{ width: `${Math.max(3, percent)}%` }} />
          </div>
        ) : null}
        <p className="export-note">
          <LockKeyhole size={12} />
          Dirender di browser. Tidak ada file yang diunggah.
        </p>
      </div>
    </aside>
  )
}
