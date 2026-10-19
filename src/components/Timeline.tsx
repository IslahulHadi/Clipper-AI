import { useEffect, useRef, useState } from 'react'
import { Scissors } from 'lucide-react'
import type { Clip } from '../types'
import { clamp, formatTime, formatTimeCompact } from '../lib/format'

type TrimSide = 'start' | 'end'

interface TimelineProps {
  waveform: number[]
  duration: number
  clips: Clip[]
  activeClip: Clip
  currentTime: number
  onSeek: (time: number) => void
  onTrim: (clipId: string, side: TrimSide, time: number) => void
  onSelect: (clipId: string) => void
}

const TICKS = [0, 0.25, 0.5, 0.75, 1]

export function Timeline({
  waveform,
  duration,
  clips,
  activeClip,
  currentTime,
  onSeek,
  onTrim,
  onSelect,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const onTrimRef = useRef(onTrim)
  const [drag, setDrag] = useState<TrimSide | null>(null)
  const safeDuration = Math.max(duration, 0.1)

  useEffect(() => {
    onTrimRef.current = onTrim
  }, [onTrim])

  useEffect(() => {
    if (!drag) return
    const handleMove = (event: PointerEvent) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return
      const time = clamp(((event.clientX - rect.left) / rect.width) * safeDuration, 0, safeDuration)
      onTrimRef.current(activeClip.id, drag, Math.round(time * 10) / 10)
    }
    const handleUp = () => setDrag(null)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
    window.addEventListener('pointercancel', handleUp, { once: true })
    document.body.classList.add('is-trimming')
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      document.body.classList.remove('is-trimming')
    }
  }, [drag, activeClip.id, safeDuration])

  const seekFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const time = clamp(((clientX - rect.left) / rect.width) * safeDuration, 0, safeDuration)
    onSeek(time)
  }

  const nudge = (side: TrimSide, delta: number) => {
    const value = side === 'start' ? activeClip.start + delta : activeClip.end + delta
    onTrim(activeClip.id, side, Math.round(value * 10) / 10)
  }

  return (
    <section className="timeline" aria-label="Timeline video">
      <div className="timeline-head">
        <div className="timeline-title">
          <span className="mono-label">TIMELINE</span>
          <span className="timeline-trim-hint">
            <Scissors size={11} />
            Tarik handle untuk trim
          </span>
        </div>
        <div className="timeline-readout">
          <span>
            IN <b>{formatTime(activeClip.start, true)}</b>
          </span>
          <span>
            OUT <b>{formatTime(activeClip.end, true)}</b>
          </span>
          <span className="timeline-now">{formatTime(currentTime, true)}</span>
        </div>
      </div>

      <div className="timeline-ruler" aria-hidden="true">
        {TICKS.map((tick) => (
          <span
            key={tick}
            className="ruler-tick"
            style={{ left: `${tick * 100}%` }}
          >
            <i />
            <em>{formatTimeCompact(safeDuration * tick)}</em>
          </span>
        ))}
      </div>

      <div
        ref={trackRef}
        className={`timeline-track${drag ? ' is-dragging' : ''}`}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          seekFromPointer(event.clientX)
        }}
      >
        <div className="waveform" aria-hidden="true">
          {waveform.map((value, index) => {
            const at = ((index + 0.5) / waveform.length) * safeDuration
            const inClip = at >= activeClip.start && at <= activeClip.end
            return (
              <span
                key={index}
                className={`wave-bar${inClip ? ' is-in-clip' : ''}`}
                style={{ height: `${Math.max(6, value * 100)}%` }}
              />
            )
          })}
        </div>

        {clips.map((clip, index) => {
          const left = (clip.start / safeDuration) * 100
          const width = ((clip.end - clip.start) / safeDuration) * 100
          const active = clip.id === activeClip.id
          return (
            <div
              key={clip.id}
              className={`timeline-clip${active ? ' is-active' : ''}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              onPointerDown={(event) => {
                event.stopPropagation()
                if (event.button !== 0) return
                onSelect(clip.id)
              }}
            >
              <span className="timeline-clip-label">{String(index + 1).padStart(2, '0')}</span>
              {active ? (
                <>
                  <div
                    className="trim-handle trim-handle-start"
                    role="slider"
                    tabIndex={0}
                    aria-label="Geser titik mulai klip"
                    aria-valuemin={0}
                    aria-valuemax={activeClip.end - 2}
                    aria-valuenow={activeClip.start}
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      event.preventDefault()
                      setDrag('start')
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowLeft') nudge('start', -0.5)
                      if (event.key === 'ArrowRight') nudge('start', 0.5)
                    }}
                  >
                    <span />
                  </div>
                  <div
                    className="trim-handle trim-handle-end"
                    role="slider"
                    tabIndex={0}
                    aria-label="Geser titik selesai klip"
                    aria-valuemin={activeClip.start + 2}
                    aria-valuemax={safeDuration}
                    aria-valuenow={activeClip.end}
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      event.preventDefault()
                      setDrag('end')
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowLeft') nudge('end', -0.5)
                      if (event.key === 'ArrowRight') nudge('end', 0.5)
                    }}
                  >
                    <span />
                  </div>
                </>
              ) : null}
            </div>
          )
        })}

        <div
          className="playhead"
          style={{ left: `${(currentTime / safeDuration) * 100}%` }}
          aria-hidden="true"
        >
          <span className="playhead-cap" />
          <span className="playhead-line" />
        </div>

        <div className="timeline-inout-note" aria-hidden="true">
          {drag ? `TRIM ${formatTime(drag === 'start' ? activeClip.start : activeClip.end, true)}` : ''}
        </div>
      </div>
    </section>
  )
}
