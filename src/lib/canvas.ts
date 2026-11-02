import type { AspectRatio } from '../types'

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
}

function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
      if (lines.length === maxLines - 1) break
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines
}

export function drawHookOverlay(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  aspect: AspectRatio,
): void {
  const content = text.trim()
  if (!content) return

  const gradient = context.createLinearGradient(0, 0, 0, height * 0.52)
  gradient.addColorStop(0, 'rgba(3, 4, 3, 0.82)')
  gradient.addColorStop(0.55, 'rgba(3, 4, 3, 0.38)')
  gradient.addColorStop(1, 'rgba(3, 4, 3, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height * 0.52)

  const base = aspect === '16:9' ? height : width
  const fontSize = Math.round(base * 0.068)
  const marginX = Math.round(width * 0.085)
  const top = Math.round(height * 0.1)
  const barWidth = Math.round(width * 0.075)

  context.fillStyle = '#A78BFA'
  context.fillRect(marginX, top, barWidth, Math.max(5, Math.round(height * 0.004)))

  context.font = `800 ${fontSize}px "Instrument Sans Variable", "Instrument Sans", Arial, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.fillStyle = '#FFFFFF'
  context.shadowColor = 'rgba(0, 0, 0, 0.45)'
  context.shadowBlur = Math.round(fontSize * 0.22)
  context.shadowOffsetY = Math.round(fontSize * 0.04)

  const lines = wrapLines(context, content.toUpperCase(), width - marginX * 2, 3)
  const lineHeight = Math.round(fontSize * 1.04)
  lines.forEach((line, index) => {
    context.fillText(line, marginX, top + fontSize * 0.72 + index * lineHeight)
  })
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetY = 0
}
