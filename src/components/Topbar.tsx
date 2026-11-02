import { ChevronRight, Scissors, ShieldCheck, Upload } from 'lucide-react'

interface TopbarProps {
  projectName?: string
  projectMeta?: string
  section?: string
  onHome?: () => void
  onReplace?: () => void
}

export function Topbar({ projectName, projectMeta, section, onHome, onReplace }: TopbarProps) {
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onHome} aria-label="Kembali ke beranda">
        <span className="brand-mark" aria-hidden="true">
          <Scissors size={17} strokeWidth={2.4} />
        </span>
        <span className="brand-word">Clipper AI</span>
        <span className="beta-pill">BETA</span>
      </button>

      <div className="topbar-center">
        {projectName ? (
          <div className="breadcrumb">
            <span>{section ?? 'Studio'}</span>
            <ChevronRight size={13} />
            <strong title={projectName}>{projectName}</strong>
            {projectMeta ? <span className="breadcrumb-meta">{projectMeta}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="topbar-right">
        <div className="local-badge" title="Video diproses di perangkat ini">
          <ShieldCheck size={14} />
          <span>Diproses lokal</span>
        </div>
        {onReplace ? (
          <button type="button" className="replace-button" onClick={onReplace}>
            <Upload size={14} />
            <span>Video baru</span>
          </button>
        ) : null}
      </div>
    </header>
  )
}
