import { Clock3, Plus, Sparkles, TriangleAlert } from 'lucide-react'
import type { Clip } from '../types'
import { formatTime } from '../lib/format'

interface ClipPanelProps {
  clips: Clip[]
  activeId: string
  audioAnalyzed: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  disabled?: boolean
}

export function ClipPanel({
  clips,
  activeId,
  audioAnalyzed,
  onSelect,
  onAdd,
  disabled,
}: ClipPanelProps) {
  return (
    <aside className="clips-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">
            <Sparkles size={12} />
            AI HIGHLIGHTS
          </p>
          <h2 className="panel-title">
            Klip kamu <span className="count-pill">{clips.length}</span>
          </h2>
        </div>
        <span className="panel-sort">AUDIO ↓</span>
      </div>
      <p className="panel-subtitle">
        {audioAnalyzed
          ? 'Diurutkan dari momen dengan energi audio tertinggi.'
          : 'Audio tidak terbaca — klip dibagi otomatis.'}
      </p>

      {!audioAnalyzed ? (
        <div className="audio-warning">
          <TriangleAlert size={13} />
          <span>Analisis audio dilewati. Kamu tetap bisa trim manual.</span>
        </div>
      ) : null}

      <div className="clip-list">
        {clips.map((clip, index) => {
          const active = clip.id === activeId
          return (
            <button
              key={clip.id}
              type="button"
              className={`clip-card${active ? ' is-active' : ''}`}
              onClick={() => onSelect(clip.id)}
              disabled={disabled}
              aria-pressed={active}
            >
              <div className="clip-thumb">
                {clip.thumbnail ? (
                  <img src={clip.thumbnail} alt="" draggable={false} />
                ) : (
                  <div className="clip-thumb-fallback">
                    <Sparkles size={18} />
                  </div>
                )}
                <span className="clip-score">
                  {clip.score ?? 'M'}
                  <small>{clip.score ? 'AI' : 'AN'}</small>
                </span>
                <span className="clip-duration">
                  <Clock3 size={10} />
                  {formatTime(clip.end - clip.start)}
                </span>
                <span className="clip-play" aria-hidden="true">
                  <span />
                </span>
              </div>
              <div className="clip-body">
                <div className="clip-index">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span className={`clip-tag${clip.score && clip.score >= 93 ? ' is-hot' : ''}`}>
                    {clip.tag}
                  </span>
                </div>
                <h3>{clip.title}</h3>
                <p>
                  {formatTime(clip.start, true)} — {formatTime(clip.end, true)}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="clip-panel-foot">
        <button type="button" className="add-clip-button" onClick={onAdd} disabled={disabled}>
          <Plus size={14} />
          Tambah klip manual
        </button>
        <p className="clip-hint">Pilih klip untuk preview & ekspor.</p>
      </div>
    </aside>
  )
}
