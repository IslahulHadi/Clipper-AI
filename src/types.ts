export type AspectRatio = '9:16' | '1:1' | '16:9'

export interface MediaInfo {
  name: string
  size: number
  type: string
  duration: number
  width: number
  height: number
  url: string
}

export interface Clip {
  id: string
  start: number
  end: number
  score: number | null
  energy: number
  title: string
  tag: string
  selected: boolean
  thumbnail?: string
  manual?: boolean
  hook?: string
}

export interface AnalysisResult {
  duration: number
  waveform: number[]
  clips: Clip[]
  audioAnalyzed: boolean
  bucketSeconds: number
}

export type AnalysisStage =
  | 'reading'
  | 'audio'
  | 'detecting'
  | 'thumbnails'
  | 'ready'

export interface ExportResult {
  blob: Blob
  extension: string
  duration: number
}
