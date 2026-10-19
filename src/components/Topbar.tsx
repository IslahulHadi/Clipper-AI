import { ChevronRight, Scissors, ShieldCheck, Upload } from 'lucide-react'

interface TopbarProps {
  projectName?: string
  projectMeta?: string
  onReplace?: () => void
}

export function Topbar({ projectName, projectMeta, onReplace }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Scissors size={18} strokeWidth={2.3} />
        </span>
        <span className="brand-word">
          clipper<span className="brand-tld">.ai</span>
        </span>
        <span className="beta-pill">BETA</span>
      </div>

      <div className="topbar-center">
        {projectName ? (
          <div className="breadcrumb">
            <span>Studio</span>
            <ChevronRight size={13} />
            <strong title={projectName}>{projectName}</strong>
            {projectMeta ? <span className="breadcrumb-meta">{projectMeta}</span> : null}
          </div>
        ) : (
          <div className="breadcrumb breadcrumb-idle">
            <span className="breadcrumb-dot" />
            <span>AI CLIP STUDIO</span>
            <span className="breadcrumb-sep">/</span>
            <strong>LOCAL FIRST</strong>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <div className="local-badge" title="Video diproses di perangkat ini">
          <ShieldCheck size={14} />
          <span>Diproses lokal</span>
        </div>
        {projectName && onReplace ? (
          <button type="button" className="replace-button" onClick={onReplace}>
            <Upload size={14} />
            <span>Ganti video</span>
          </button>
        ) : (
          <span className="version-tag">v0.1</span>
        )}
      </div>
    </header>
  )
}
