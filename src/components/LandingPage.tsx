import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  AudioLines,
  BadgeCheck,
  Captions,
  Check,
  ChevronDown,
  Clapperboard,
  CloudOff,
  Crop,
  Download,
  Gauge,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Scissors,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react'

interface LandingPageProps {
  onBrowse: () => void
  onFile: (file: File) => void
  onUrl: (url: string) => Promise<void>
  onDemo: () => void
  demoLoading: boolean
}

const DEMO_SRC = `${import.meta.env.BASE_URL}demo.mp4`

const ROTATING_WORDS = ['klip viral', 'Reels siap posting', 'Shorts yang ditonton', 'konten seminggu']

type ShowcaseMode = 'clipping' | 'reframe' | 'score' | 'hook' | 'export'

const SHOWCASE_TABS: {
  key: ShowcaseMode
  label: string
  icon: typeof Scissors
  title: string
  copy: string
}[] = [
  {
    key: 'clipping',
    label: 'AI clipping',
    icon: Scissors,
    title: 'Satu video panjang, banyak klip pendek',
    copy: 'Clipper AI memindai seluruh video dan memotong momen terkuat menjadi klip 10–60 detik.',
  },
  {
    key: 'reframe',
    label: 'AI reframe',
    icon: Crop,
    title: 'Pas di setiap layar',
    copy: 'Ubah video lebar ke 9:16, 1:1, atau 16:9, lalu geser fokus crop agar subjek tetap di tengah.',
  },
  {
    key: 'score',
    label: 'Skor viral',
    icon: Gauge,
    title: 'Tahu klip mana yang layak diunggah duluan',
    copy: 'Setiap klip diberi skor 0–100 dari energi dan puncak audio, lalu diurutkan dari yang paling kuat.',
  },
  {
    key: 'hook',
    label: 'Hook overlay',
    icon: Captions,
    title: 'Tahan penonton di 3 detik pertama',
    copy: 'Tambahkan teks hook besar yang dibakar langsung ke video saat ekspor.',
  },
  {
    key: 'export',
    label: 'Ekspor 1080p',
    icon: Download,
    title: 'Ekspor nyata, langsung dari browser',
    copy: 'Render klip 1080p lengkap dengan audio — MP4 di Chrome modern, fallback WebM. Tanpa watermark.',
  },
]

const SHOWCASE_CLIPS = [
  { t: 9, score: 98, platform: 'TikTok', hook: 'Detik pertama menentukan segalanya' },
  { t: 26, score: 97, platform: 'Reels', hook: 'Ini bagian yang paling ramai' },
  { t: 41, score: 93, platform: 'Shorts', hook: 'Jangan skip bagian ini' },
  { t: 17, score: 91, platform: 'LinkedIn', hook: 'Satu ide, banyak klip' },
  { t: 33, score: 88, platform: 'X', hook: 'Potong yang penting saja' },
]

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'LinkedIn', 'X', 'Facebook', 'Snapchat Spotlight']

const STEPS = [
  {
    icon: Upload,
    title: 'Tarik video',
    copy: 'Podcast, vlog, webinar, gaming, atau rekaman mentah apa pun. Hingga 1 GB, langsung dari perangkat.',
  },
  {
    icon: ScanLine,
    title: 'AI memindai',
    copy: 'Energi audio dianalisis per 100 ms. Kandidat terbaik dipilih tanpa saling tumpang tindih.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Edit & ekspor',
    copy: 'Rapikan titik potong di timeline, atur frame dan hook, lalu ekspor 1080p dalam satu klik.',
  },
]

const EDITOR_POINTS = [
  'Trim presisi di atas waveform audio',
  'Tambah klip manual dari titik mana pun',
  'Panduan safe area untuk TikTok & Reels',
  'Shortcut keyboard: Spasi, ← dan →',
]

const STATS = [
  { value: '0 MB', label: 'diunggah ke server' },
  { value: '100 ms', label: 'resolusi analisis audio' },
  { value: '3', label: 'format frame siap pakai' },
  { value: '1080p', label: 'ekspor tanpa watermark' },
]

const FAQS = [
  {
    q: 'Bagaimana Clipper AI bekerja?',
    a: 'Clipper AI mendekode audio videomu di browser, menghitung energi per 100 ms, lalu memberi skor pada setiap kandidat klip. Klip terbaik yang tidak saling tumpang tindih dipilih, diberi thumbnail, dan siap diedit di studio.',
  },
  {
    q: 'Video apa saja yang bisa diunggah?',
    a: 'MP4, MOV, M4V, WebM, dan OGV hingga 1 GB. Video dengan banyak percakapan, tawa, atau perubahan nada biasanya menghasilkan highlight paling kuat.',
  },
  {
    q: 'Apakah videoku dikirim ke server?',
    a: 'Tidak. Analisis, preview, dan ekspor semuanya berjalan di perangkatmu memakai Web Audio, Canvas, dan MediaRecorder. File tidak pernah meninggalkan browser.',
  },
  {
    q: 'Bisa pakai link YouTube atau TikTok?',
    a: 'Belum. Platform tersebut tidak mengizinkan browser mengambil file videonya secara langsung. Kamu bisa menempel link langsung ke file video (.mp4/.webm) yang mengizinkan akses, atau unduh videonya lalu upload.',
  },
  {
    q: 'Apakah Clipper AI gratis?',
    a: 'Ya. Tidak perlu akun, tidak ada kuota, dan hasil ekspor tidak diberi watermark.',
  },
  {
    q: 'Browser apa yang paling baik?',
    a: 'Chrome atau Edge terbaru untuk ekspor MP4/H.264 yang paling mulus. Browser lain akan memakai WebM bila MP4 tidak didukung.',
  },
]

const WAVE = Array.from({ length: 64 }, (_, index) =>
  Math.round(22 + Math.abs(Math.sin(index * 0.41)) * 46 + Math.abs(Math.sin(index * 0.13 + 2)) * 28),
)

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function LogoMark() {
  return (
    <span className="lp-logo">
      <span className="lp-logo-mark" aria-hidden="true">
        <Scissors size={16} strokeWidth={2.4} />
      </span>
      <span className="lp-logo-word">Clipper AI</span>
    </span>
  )
}

function PreviewTile({ time, className, children }: { time: number; className?: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLVideoElement>(null)
  return (
    <div
      className={`lp-tile${className ? ` ${className}` : ''}`}
      onMouseEnter={() => {
        const video = ref.current
        if (!video) return
        video.currentTime = time
        void video.play().catch(() => undefined)
      }}
      onMouseLeave={() => {
        const video = ref.current
        if (!video) return
        video.pause()
        video.currentTime = time
      }}
    >
      <video ref={ref} src={`${DEMO_SRC}#t=${time}`} muted playsInline preload="metadata" loop />
      {children}
    </div>
  )
}

export function LandingPage({ onBrowse, onFile, onUrl, onDemo, demoLoading }: LandingPageProps) {
  const [wordIndex, setWordIndex] = useState(0)
  const [mode, setMode] = useState<ShowcaseMode>('clipping')
  const [link, setLink] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [scrolled, setScrolled] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWordIndex((index) => (index + 1) % ROTATING_WORDS.length)
    }, 2600)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('.lp-reveal')
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.14 },
    )
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  async function submitLink(event: React.FormEvent) {
    event.preventDefault()
    const value = link.trim()
    if (!value) {
      onBrowse()
      return
    }
    setLinkLoading(true)
    try {
      await onUrl(value)
    } finally {
      setLinkLoading(false)
    }
  }

  const activeTab = SHOWCASE_TABS.find((tab) => tab.key === mode) ?? SHOWCASE_TABS[0]

  return (
    <div
      className="lp"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault()
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        const file = event.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
    >
      <button type="button" className="lp-announce" onClick={onDemo} disabled={demoLoading}>
        <span className="lp-announce-tag">BARU</span>
        Galeri klip dengan skor viral sudah hadir. Coba dengan video contoh
        <ArrowRight size={13} />
      </button>

      <header className={`lp-nav${scrolled ? ' is-scrolled' : ''}`}>
        <LogoMark />
        <nav className="lp-nav-links" aria-label="Navigasi utama">
          <button type="button" onClick={() => scrollToId('fitur')}>Fitur</button>
          <button type="button" onClick={() => scrollToId('cara-kerja')}>Cara kerja</button>
          <button type="button" onClick={() => scrollToId('privasi')}>Privasi</button>
          <button type="button" onClick={() => scrollToId('faq')}>FAQ</button>
        </nav>
        <div className="lp-nav-actions">
          <button type="button" className="lp-nav-ghost" onClick={onDemo} disabled={demoLoading}>
            Coba demo
          </button>
          <button type="button" className="lp-pill lp-pill-white lp-pill-sm" onClick={onBrowse}>
            Mulai gratis
          </button>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-glow" aria-hidden="true" />
          <p className="lp-kicker">AI VIDEO CLIPPING · 100% DI BROWSER</p>
          <h1 className="lp-hero-title">
            Ubah video panjang jadi
            <br />
            <span className="lp-rotator" aria-live="polite">
              <span className="lp-rotator-blur" aria-hidden="true" />
              <span key={wordIndex} className="lp-rotator-word">
                {ROTATING_WORDS[wordIndex]}
              </span>
            </span>{' '}
            <span className="lp-hero-tail">10x lebih cepat</span>
          </h1>
          <p className="lp-hero-copy">
            Tarik satu video, Clipper AI menemukan momen terkuat, memotong, mengatur ulang frame, dan
            menyiapkan klip siap unggah ke semua platform — tanpa upload ke server.
          </p>

          <div className="lp-hero-actions">
            <form className="lp-input" onSubmit={submitLink}>
              <Link2 size={17} className="lp-input-icon" />
              <input
                type="text"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="Tempel link video (.mp4) atau tarik file ke sini"
                aria-label="Link video"
              />
              <button type="button" className="lp-input-upload" onClick={onBrowse}>
                <Upload size={15} />
                <span>Upload</span>
              </button>
              <button type="submit" className="lp-pill lp-pill-white" disabled={linkLoading}>
                {linkLoading ? <LoaderCircle size={15} className="spin" /> : null}
                Dapatkan klip gratis
              </button>
            </form>
            <span className="lp-or">atau</span>
            <button type="button" className="lp-pill lp-pill-outline" onClick={onDemo} disabled={demoLoading}>
              {demoLoading ? <LoaderCircle size={15} className="spin" /> : <Clapperboard size={15} />}
              {demoLoading ? 'Menyiapkan…' : 'Coba video contoh'}
            </button>
          </div>
          <p className="lp-hero-note">MP4 · MOV · WEBM · maks 1 GB · Tanpa akun · Tanpa watermark</p>
        </section>

        <section className="lp-showcase" id="fitur">
          <div className={`lp-stage lp-reveal`} data-mode={mode}>
            <div className="lp-stage-glow" aria-hidden="true" />
            <div className="lp-source">
              <video src={DEMO_SRC} muted autoPlay loop playsInline preload="metadata" />
              <span className="lp-source-label">
                <Sparkles size={11} /> Video sumber
              </span>
              <span className="lp-source-time">00:50</span>
            </div>

            <div className="lp-flow" aria-hidden="true">
              <span />
              <span className="lp-flow-chip">
                <Sparkles size={12} /> {mode === 'reframe' ? 'Reframe' : mode === 'export' ? 'Render' : 'Clipper AI'}
              </span>
              <span />
            </div>

            {mode === 'reframe' ? (
              <div className="lp-reframe-row">
                {(['9:16', '1:1', '16:9'] as const).map((ratio, index) => (
                  <PreviewTile key={ratio} time={SHOWCASE_CLIPS[index].t} className={`lp-ratio lp-ratio-${index}`}>
                    <span className="lp-tile-chip">{ratio}</span>
                  </PreviewTile>
                ))}
              </div>
            ) : (
              <div className="lp-clip-row">
                {SHOWCASE_CLIPS.map((clip, index) => (
                  <PreviewTile key={clip.platform} time={clip.t} className={`lp-clip lp-clip-${index}`}>
                    {mode === 'hook' ? <p className="lp-tile-hook">{clip.hook}</p> : null}
                    <span className="lp-tile-platform">{clip.platform}</span>
                    {mode === 'export' ? (
                      <span className="lp-tile-done">
                        <Check size={11} /> 1080p
                      </span>
                    ) : (
                      <span className={`lp-tile-score${mode === 'score' ? ' is-big' : ''}`}>
                        {clip.score}
                        {mode === 'score' ? <small>/100</small> : null}
                      </span>
                    )}
                  </PreviewTile>
                ))}
              </div>
            )}

            <div className="lp-stage-caption">
              <h3>{activeTab.title}</h3>
              <p>{activeTab.copy}</p>
            </div>
          </div>

          <div className="lp-tabs" role="tablist" aria-label="Fitur">
            {SHOWCASE_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                className={`lp-tab${mode === key ? ' is-active' : ''}`}
                onClick={() => setMode(key)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="lp-platforms" aria-label="Platform tujuan">
          <p>Satu video, siap untuk setiap platform</p>
          <div className="lp-marquee">
            <div className="lp-marquee-track">
              {[...PLATFORMS, ...PLATFORMS].map((name, index) => (
                <span key={`${name}-${index}`}>{name}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head lp-reveal">
            <p className="lp-kicker">MODEL AI</p>
            <h2>AI yang memahami setiap detik videomu</h2>
            <p>Dua mesin yang bekerja bersama: satu menemukan momennya, satu memastikan ia tampil sempurna di layar mana pun.</p>
          </div>

          <div className="lp-models">
            <article className="lp-model lp-reveal">
              <div className="lp-model-visual lp-wave">
                {WAVE.map((height, index) => (
                  <span
                    key={index}
                    className={index > 9 && index < 22 ? 'is-hot' : index > 38 && index < 49 ? 'is-warm' : ''}
                    style={{ height: `${height}%` }}
                  />
                ))}
                <em className="lp-wave-badge lp-wave-badge-a">98</em>
                <em className="lp-wave-badge lp-wave-badge-b">93</em>
              </div>
              <div className="lp-model-copy">
                <span className="lp-model-icon">
                  <AudioLines size={17} />
                </span>
                <h3>HighlightScan</h3>
                <p>
                  Memindai energi audio, menormalkan noise floor, dan memberi skor setiap kandidat dari rata-rata serta
                  puncak energi. Hasilnya: momen tawa, penekanan, dan perubahan nada yang biasanya paling ditonton.
                </p>
              </div>
            </article>

            <article className="lp-model lp-reveal">
              <div className="lp-model-visual lp-crop">
                <video src={`${DEMO_SRC}#t=12`} muted autoPlay loop playsInline preload="metadata" />
                <span className="lp-crop-window" />
              </div>
              <div className="lp-model-copy">
                <span className="lp-model-icon">
                  <Crop size={17} />
                </span>
                <h3>SmartReframe</h3>
                <p>
                  Ubah video lebar ke 9:16, 1:1, atau 16:9 dalam satu klik. Geser fokus crop untuk menjaga subjek tetap
                  di tengah, lengkap dengan panduan safe area.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="lp-section" id="cara-kerja">
          <div className="lp-section-head lp-reveal">
            <p className="lp-kicker">ALUR KERJA</p>
            <h2>Proses pembuatan klipmu, kini serba otomatis</h2>
            <p>Dari video mentah ke klip siap unggah dalam tiga langkah. Tanpa antre render, tanpa menunggu upload.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map(({ icon: Icon, title, copy }, index) => (
              <article className="lp-step lp-reveal" key={title} style={{ transitionDelay: `${index * 90}ms` }}>
                <span className="lp-step-num">0{index + 1}</span>
                <span className="lp-step-icon">
                  <Icon size={19} />
                </span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-editor">
          <div className="lp-editor-copy lp-reveal">
            <p className="lp-kicker">EDITOR AI</p>
            <h2>AI yang mengedit bersamamu, bukan hanya untukmu</h2>
            <p>Biarkan AI menyiapkan potongan pertama, lalu ambil kendali penuh kapan pun kamu mau.</p>
            <ul>
              {EDITOR_POINTS.map((point) => (
                <li key={point}>
                  <Check size={14} />
                  {point}
                </li>
              ))}
            </ul>
            <button type="button" className="lp-pill lp-pill-white" onClick={onDemo} disabled={demoLoading}>
              Buka studio dengan demo
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="lp-editor-mock lp-reveal" aria-hidden="true">
            <div className="lp-mock-bar">
              <span />
              <span />
              <span />
              <em>Studio · clipper-demo.mp4</em>
            </div>
            <div className="lp-mock-body">
              <div className="lp-mock-list">
                {SHOWCASE_CLIPS.slice(0, 3).map((clip, index) => (
                  <div key={clip.platform} className={`lp-mock-item${index === 0 ? ' is-active' : ''}`}>
                    <span className="lp-mock-thumb" />
                    <div>
                      <b>{clip.score}</b>
                      <i />
                      <i />
                    </div>
                  </div>
                ))}
              </div>
              <div className="lp-mock-preview">
                <video src={`${DEMO_SRC}#t=9`} muted autoPlay loop playsInline preload="metadata" />
                <p>Detik pertama menentukan segalanya</p>
              </div>
            </div>
            <div className="lp-mock-timeline">
              {WAVE.map((height, index) => (
                <span key={index} className={index > 12 && index < 26 ? 'is-hot' : ''} style={{ height: `${height}%` }} />
              ))}
              <em />
            </div>
          </div>
        </section>

        <section className="lp-section" id="privasi">
          <div className="lp-section-head lp-reveal">
            <p className="lp-kicker">PRIVASI</p>
            <h2>Videomu tidak pernah meninggalkan perangkat</h2>
            <p>Semua pemrosesan terjadi di browser. Tidak ada server yang menyimpan, menonton, atau melatih model dengan kontenmu.</p>
          </div>
          <div className="lp-trust">
            <article className="lp-trust-card lp-reveal">
              <CloudOff size={20} />
              <h3>Tanpa upload</h3>
              <p>Analisis, preview, dan ekspor berjalan lokal memakai Web Audio, Canvas, dan MediaRecorder.</p>
            </article>
            <article className="lp-trust-card lp-reveal">
              <BadgeCheck size={20} />
              <h3>Tanpa akun & watermark</h3>
              <p>Buka, tarik video, ekspor. Klipmu tetap bersih dan sepenuhnya milikmu.</p>
            </article>
            <article className="lp-trust-card lp-reveal">
              <Zap size={20} />
              <h3>Tanpa antre</h3>
              <p>Tidak ada kuota atau antrean render di cloud. Kecepatan mengikuti perangkatmu.</p>
            </article>
          </div>
          <div className="lp-stats lp-reveal">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section lp-faq" id="faq">
          <div className="lp-section-head lp-reveal">
            <p className="lp-kicker">FAQ</p>
            <h2>Ada pertanyaan?</h2>
          </div>
          <div className="lp-faq-list">
            {FAQS.map((item, index) => {
              const open = openFaq === index
              return (
                <div key={item.q} className={`lp-faq-item${open ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                  >
                    {item.q}
                    <ChevronDown size={17} />
                  </button>
                  <div className="lp-faq-answer">
                    <p>{item.a}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="lp-cta lp-reveal">
          <div className="lp-cta-glow" aria-hidden="true" />
          <h2>Mulai buat klip pertamamu</h2>
          <p>Gratis, tanpa akun, dan videomu tetap di perangkat.</p>
          <div className="lp-cta-actions">
            <button type="button" className="lp-pill lp-pill-white" onClick={onBrowse}>
              <Upload size={15} />
              Upload video
            </button>
            <button type="button" className="lp-pill lp-pill-outline" onClick={onDemo} disabled={demoLoading}>
              {demoLoading ? <LoaderCircle size={15} className="spin" /> : <Clapperboard size={15} />}
              Coba video contoh
            </button>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <LogoMark />
          <p>Studio pemotong video AI yang berjalan sepenuhnya di browser.</p>
        </div>
        <div className="lp-footer-cols">
          <div>
            <h4>Produk</h4>
            <button type="button" onClick={() => scrollToId('fitur')}>Fitur</button>
            <button type="button" onClick={() => scrollToId('cara-kerja')}>Cara kerja</button>
            <button type="button" onClick={() => scrollToId('faq')}>FAQ</button>
          </div>
          <div>
            <h4>Proyek</h4>
            <a href="https://github.com/IslahulHadi/Clipper-AI" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://github.com/IslahulHadi/Clipper-AI#readme" target="_blank" rel="noreferrer">
              Dokumentasi
            </a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 Clipper AI</span>
          <span>
            <LockKeyhole size={12} /> Diproses lokal di perangkatmu
          </span>
        </div>
      </footer>

      {dragging ? (
        <div className="lp-dropzone" aria-hidden="true">
          <div>
            <Upload size={26} />
            <strong>Lepaskan untuk mulai</strong>
            <span>Clipper AI akan langsung memindai videomu</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
