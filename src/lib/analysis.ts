import type { AnalysisResult, AnalysisStage, Clip } from '../types'
import { clamp, formatTime, uid } from './format'

const ANALYSIS_BUCKET_SECONDS = 0.1
const MAX_DISPLAY_BARS = 360

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = clamp((sorted.length - 1) * p, 0, sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function movingAverage(values: number[], radius: number): number[] {
  const output = new Array<number>(values.length).fill(0)
  let sum = 0
  let count = 0
  for (let index = 0; index < values.length + radius; index += 1) {
    if (index < values.length) {
      sum += values[index]
      count += 1
    }
    const remove = index - radius * 2 - 1
    if (remove >= 0) {
      sum -= values[remove]
      count -= 1
    }
    const target = index - radius
    if (target >= 0 && target < values.length) {
      output[target] = count > 0 ? sum / count : 0
    }
  }
  return output
}

interface AudioFingerprint {
  buckets: number[]
  duration: number
}

async function fingerprintAudio(file: File): Promise<AudioFingerprint | null> {
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null

  let context: AudioContext | null = null
  try {
    const bytes = await file.arrayBuffer()
    context = new AudioContextClass()
    const buffer = await context.decodeAudioData(bytes)
    const duration = buffer.duration
    const channelA = buffer.getChannelData(0)
    const channelB = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null
    const bucketSize = Math.max(1, Math.floor(buffer.sampleRate * ANALYSIS_BUCKET_SECONDS))
    const bucketCount = Math.ceil(channelA.length / bucketSize)
    const buckets = new Array<number>(bucketCount).fill(0)

    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
      const start = bucket * bucketSize
      const end = Math.min(start + bucketSize, channelA.length)
      let sum = 0
      for (let index = start; index < end; index += 1) {
        const left = channelA[index]
        const right = channelB ? channelB[index] : left
        const mono = (left + right) * 0.5
        sum += mono * mono
      }
      buckets[bucket] = Math.sqrt(sum / Math.max(1, end - start))
    }

    const sorted = [...buckets].sort((a, b) => a - b)
    const noiseFloor = percentile(sorted, 0.18)
    const loud = percentile(sorted, 0.97)
    const floor = noiseFloor * 0.72
    const span = Math.max(loud - floor, 0.00005)

    const normalized = buckets.map((value) => clamp((value - floor) / span, 0, 1))
    return { buckets: normalized, duration }
  } catch {
    return null
  } finally {
    if (context) {
      await context.close().catch(() => undefined)
    }
  }
}

function compactWaveform(buckets: number[]): number[] {
  if (buckets.length <= MAX_DISPLAY_BARS) {
    return buckets.map((value) => clamp(value, 0.025, 1))
  }
  const output: number[] = []
  const groupSize = buckets.length / MAX_DISPLAY_BARS
  for (let index = 0; index < MAX_DISPLAY_BARS; index += 1) {
    const start = Math.floor(index * groupSize)
    const end = Math.max(start + 1, Math.floor((index + 1) * groupSize))
    let max = 0
    let sum = 0
    for (let cursor = start; cursor < end && cursor < buckets.length; cursor += 1) {
      max = Math.max(max, buckets[cursor])
      sum += buckets[cursor]
    }
    const average = sum / Math.max(1, end - start)
    output.push(clamp(max * 0.65 + average * 0.35, 0.025, 1))
  }
  return output
}

interface WindowCandidate {
  startSeconds: number
  endSeconds: number
  average: number
  peak: number
  score: number
}

function pickHighlights(
  buckets: number[],
  duration: number,
  count: number,
): WindowCandidate[] {
  const bucketDuration = ANALYSIS_BUCKET_SECONDS
  const targetLength = clamp(duration * 0.23, 9, 24)
  const targetBuckets = Math.max(8, Math.round(targetLength / bucketDuration))
  const stepBuckets = Math.max(1, Math.round(1 / bucketDuration))
  if (buckets.length <= targetBuckets + 2) {
    const average = buckets.reduce((sum, value) => sum + value, 0) / Math.max(1, buckets.length)
    return [
      {
        startSeconds: 0,
        endSeconds: duration,
        average,
        peak: Math.max(...buckets, 0),
        score: average,
      },
    ]
  }

  const candidates: WindowCandidate[] = []
  const maxStart = buckets.length - targetBuckets
  for (let start = 0; start <= maxStart; start += stepBuckets) {
    let sum = 0
    let peak = 0
    for (let cursor = start; cursor < start + targetBuckets; cursor += 1) {
      sum += buckets[cursor]
      peak = Math.max(peak, buckets[cursor])
    }
    const average = sum / targetBuckets
    candidates.push({
      startSeconds: start * bucketDuration,
      endSeconds: Math.min(duration, (start + targetBuckets) * bucketDuration),
      average,
      peak,
      score: average * 0.72 + peak * 0.28,
    })
  }

  const ranked = [...candidates].sort((a, b) => b.score - a.score)
  const chosen: WindowCandidate[] = []
  const minGap = Math.min(2.2, Math.max(0.8, targetLength * 0.1))
  for (const candidate of ranked) {
    if (chosen.length >= count) break
    const overlaps = chosen.some(
      (existing) =>
        candidate.startSeconds < existing.endSeconds + minGap &&
        candidate.endSeconds > existing.startSeconds - minGap,
    )
    if (!overlaps) chosen.push(candidate)
  }

  return chosen
}

const HIGHLIGHT_TITLES = [
  'Puncak energi',
  'Momen paling rame',
  'Bagian paling intens',
  'Highlight utama',
  'Penutup yang kuat',
  'Momen tak terduga',
]

function buildClipsFromFingerprint(buckets: number[], duration: number): Clip[] {
  const count =
    duration < 16 ? 1 : duration < 45 ? 2 : duration < 110 ? 3 : duration < 260 ? 4 : 5
  const windows = pickHighlights(buckets, duration, count)
  if (windows.length === 0) return []

  const maxMean = Math.max(...windows.map((window) => window.average), 0.001)
  const maxScore = Math.max(...windows.map((window) => window.score), 0.001)
  const minScore = Math.min(...windows.map((window) => window.score), maxScore)
  const span = Math.max(maxScore - minScore, 0.0001)

  const ranked = [...windows].sort((a, b) => b.score - a.score)
  const titleById = new Map<WindowCandidate, string>()
  ranked.forEach((window, index) => {
    titleById.set(window, HIGHLIGHT_TITLES[index % HIGHLIGHT_TITLES.length])
  })

  return [...windows]
    .sort((a, b) => a.startSeconds - b.startSeconds)
    .map((window, index) => {
      const relative = (window.score - minScore) / span
      const score = Math.round(84 + relative * 14)
      const energy = Math.round(55 + (window.average / maxMean) * 44)
      const start = Math.round(window.startSeconds * 10) / 10
      const end = Math.round(Math.min(duration, start + (window.endSeconds - window.startSeconds)) * 10) / 10
      return {
        id: uid(),
        start,
        end: Math.max(start + 1, end),
        score,
        energy: clamp(energy, 40, 99),
        title: titleById.get(window) ?? `Highlight ${index + 1}`,
        tag: score >= 94 ? 'Top pick' : score >= 88 ? 'Potensi tinggi' : 'Solid',
        selected: index === 0,
      }
    })
}

function fallbackWaveform(seed: number): number[] {
  let state = Math.max(1, Math.floor(seed % 2147483647))
  const random = () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
  return Array.from({ length: 220 }, (_, index) => {
    const swell = 0.2 + 0.42 * Math.abs(Math.sin(index / 17 + 1.4))
    const detail = 0.18 * Math.abs(Math.sin(index / 4.3))
    return clamp(swell + detail * random() + 0.08, 0.06, 0.98)
  })
}

function buildFallbackClips(duration: number): Clip[] {
  const count = duration < 18 ? 1 : duration < 70 ? 3 : 4
  const target = clamp(duration * 0.28, 8, 22)
  const gap = count > 1 ? (duration - target * count) / (count - 1) : 0
  return Array.from({ length: count }, (_, index) => {
    const start = Math.max(0, Math.round((index * (target + Math.max(0, gap))) * 10) / 10)
    const end = Math.min(duration, Math.round((start + target) * 10) / 10)
    const score = 89 - index * 3
    return {
      id: uid(),
      start,
      end,
      score,
      energy: score,
      title: HIGHLIGHT_TITLES[index % HIGHLIGHT_TITLES.length],
      tag: index === 0 ? 'Top pick' : 'Potensi tinggi',
      selected: index === 0,
    }
  })
}

export interface AnalyzeVideoOptions {
  file: File
  duration: number
  onStage?: (stage: AnalysisStage) => void
}

export async function analyzeVideo({
  file,
  duration,
  onStage,
}: AnalyzeVideoOptions): Promise<AnalysisResult> {
  onStage?.('reading')
  await wait(80)

  onStage?.('audio')
  const fingerprint = await fingerprintAudio(file)

  if (!fingerprint) {
    const clips = buildFallbackClips(duration)
    onStage?.('detecting')
    await wait(420)
    return {
      duration,
      waveform: fallbackWaveform(file.size + file.name.length * 97),
      clips,
      audioAnalyzed: false,
      bucketSeconds: duration / 220,
    }
  }

  onStage?.('detecting')
  const smooth = movingAverage(fingerprint.buckets, 5)
  const waveform = compactWaveform(smooth)
  const clips = buildClipsFromFingerprint(smooth, duration)
  await wait(280)

  return {
    duration,
    waveform,
    clips,
    audioAnalyzed: true,
    bucketSeconds: duration / Math.max(waveform.length, 1),
  }
}

export function createManualClip(duration: number, at: number): Clip {
  const length = Math.min(15, Math.max(6, duration * 0.2))
  const start = clamp(at - length * 0.35, 0, Math.max(0, duration - length))
  const end = Math.min(duration, start + length)
  return {
    id: uid(),
    start: Math.round(start * 10) / 10,
    end: Math.round(end * 10) / 10,
    score: null,
    energy: 0,
    title: 'Klip manual',
    tag: 'Manual',
    selected: true,
    manual: true,
  }
}

export function clipRangeLabel(clip: Clip): string {
  return `${formatTime(clip.start, true)} – ${formatTime(clip.end, true)}`
}
