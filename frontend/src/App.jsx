import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'

// ─── Icon Components (inline SVG to avoid extra deps) ───────────────────────
const Icon = ({ d, size = 20, stroke = 'currentColor', fill = 'none', strokeWidth = 1.8, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...p}><path d={d}/></svg>
)
const Icons = {
  Play:       () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>,
  Pause:      () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>,
  SkipBack:   () => <Icon d="M19 20L9 12l10-8v16M5 4v16" fill="currentColor" stroke="none" />,
  SkipFwd:    () => <Icon d="M5 4l10 8-10 8V4M19 4v16" fill="currentColor" stroke="none" />,
  Volume:     () => <Icon d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />,
  VolumeX:    () => <Icon d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />,
  Book:       () => <Icon d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />,
  Upload:     () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  Loader:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
  Check:      () => <Icon d="M20 6L9 17l-5-5" />,
  X:          () => <Icon d="M18 6L6 18M6 6l12 12" />,
  ChevronR:   () => <Icon d="M9 18l6-6-6-6" />,
  ChevronL:   () => <Icon d="M15 18l-6-6 6-6" />,
  Moon:       () => <Icon d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none" />,
  Bookmark:   () => <Icon d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  Refresh:    () => <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />,
  User:       () => <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  Settings:   () => <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />,
  Star:       () => <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" stroke="none" />,
  Zap:        () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" stroke="none" />,
  Mic:        () => <Icon d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />,
  Wand:       () => <Icon d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19.2 13.2M17.8 6.2L19.2 4.8M12.2 6.2L10.8 4.8M12.2 11.8L10.8 13.2M3 21l9-9" />,
  Headphones: () => <Icon d="M3 18v-6a9 9 0 0 1 18 0v6M3 18a3 3 0 0 0 3 3v-6H3v3zM21 18a3 3 0 0 1-3 3v-6h3v3z" />,
  ArrowRight: () => <Icon d="M5 12h14M12 5l7 7-7 7" />,
  Library:    () => <Icon d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />,
  Clock:      () => <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" />,
  Sparkles:   () => <Icon d="M12 3l1.88 5.76L19.5 9l-4.62 3.37 1.62 5.63L12 15 7.5 18l1.62-5.63L4.5 9l5.62-.24L12 3z" fill="currentColor" stroke="none" />,
  Trash:      () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  Cast:       () => <Icon d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6M2 20h.01" />,
  Speaker:    () => <Icon d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" />,
  ChevDown:   () => <Icon d="M6 9l6 6 6-6" />,
}

// ─── Speaker color maps ────────────────────────────────────────────────────
const SPEAKER_COLORS = [
  { text: '#a78bfa', border: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.06)' },
  { text: '#34d399', border: 'rgba(52,211,153,0.3)',  bg: 'rgba(52,211,153,0.06)' },
  { text: '#f472b6', border: 'rgba(244,114,182,0.3)', bg: 'rgba(244,114,182,0.06)' },
  { text: '#fbbf24', border: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.06)' },
  { text: '#60a5fa', border: 'rgba(96,165,250,0.3)',  bg: 'rgba(96,165,250,0.06)' },
  { text: '#fb923c', border: 'rgba(251,146,60,0.3)',  bg: 'rgba(251,146,60,0.06)' },
]

// ─── Procedural cover gradient ─────────────────────────────────────────────
const COVER_CLASSES = ['cover-0','cover-1','cover-2','cover-3','cover-4','cover-5','cover-6']
function getCoverClass(title = '') {
  let h = 0
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h)
  return COVER_CLASSES[Math.abs(h) % COVER_CLASSES.length]
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
    : `${m}:${String(ss).padStart(2,'0')}`
}

function WaveBars({ count = 8, small = false }) {
  const cls = ['b1','b2','b3','b4','b5','b6','b7','b8']
  return (
    <div className="wave-wrap" style={small ? { height: 32 } : {}}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`wave-bar ${cls[i % cls.length]}`}
          style={small ? { width: 2, background: 'var(--color-wine-light)' } : {}} />
      ))}
    </div>
  )
}

function Spinner({ size = 20 }) {
  return (
    <div className="animate-spin" style={{ width: size, height: size, border: '2px solid rgba(212,168,67,0.18)', borderTopColor: 'var(--color-gold)', borderRadius: '50%' }} />
  )
}

// ─── Voice Assign Panel (used inside Cast & Voices modal) ─────────────────────
// Female/male name sets for frontend gender override (mirrors backend heuristics)
const FEMALE_NAMES = new Set(['mary','maria','elizabeth','jane','alice','catherine','helen','sarah','emily','jessica','charlotte','lucy','sophie','emma','olivia','grace','rose','clara','margaret','lilly','jenny','aria','sara','sonia','natasha','nancy','irene','violet','edith','agatha','mrs','lady','queen','princess','harriet','dorothy','eleanor','anne','anne','hannah','beatrice','diana','laura','rachel','rebecca','ruth','susan','barbara','patricia','linda','lisa','karen','donna','carol','michelle','sandra','betty','deborah','margaret','anna','kate','claire','amy','victoria','audrey','helen'])
const MALE_NAMES   = new Set(['john','peter','andrew','william','robert','james','charles','guy','brian','eric','ryan','michael','david','george','arthur','thomas','edward','henry','harry','jack','sam','paul','richard','mark','steven','stephen','philip','simon','ian','alan','kevin','graham','daniel','joseph','benjamin','nicholas','leonard','sherlock','watson','lestrade','holmes','mycroft','irene','hudson','pinner','neill','musgrave','phelps'])

function guessGender(name, storedGender) {
  // Stored gender from DB is authoritative if explicitly set
  if (storedGender && storedGender !== 'unknown') return storedGender
  const n = name.toLowerCase().split(' ')[0] // use first name only
  if (FEMALE_NAMES.has(n)) return 'female'
  if (MALE_NAMES.has(n)) return 'male'
  // Heuristics: common female endings
  if (/(?:a|ia|ie|elle|ette|ine|ey)$/.test(n)) return 'female'
  return 'male'
}

function getDefaultVoice(characterName, storedVoice, storedGender, voices) {
  const gender = guessGender(characterName, storedGender)
  const genderVoices = voices.filter(v => v.gender === gender)
  // If the stored voice already matches the correct gender, keep it
  const stored = voices.find(v => v.id === storedVoice)
  if (stored && stored.gender === gender) return storedVoice
  // Otherwise pick first matching voice deterministically by name hash
  if (genderVoices.length === 0) return storedVoice || voices[0]?.id
  let h = 0
  for (let i = 0; i < characterName.length; i++) h = characterName.charCodeAt(i) + ((h << 5) - h)
  return genderVoices[Math.abs(h) % genderVoices.length].id
}

function VoiceAssignPanel({ characters, voices, onApply }) {
  const [pending, setPending] = useState(() => {
    const m = {}
    characters.forEach(c => {
      m[c.character_name] = getDefaultVoice(c.character_name, c.edge_tts_voice, c.gender, voices)
    })
    return m
  })
  const [previewing, setPreviewing] = useState(null)
  const previewAudio = useRef(null)

  // Always stop any currently playing audio first, then start the new one
  async function previewVoice(voiceId) {
    // Stop existing playback unconditionally
    if (previewAudio.current) {
      previewAudio.current.pause()
      previewAudio.current.onended = null
      previewAudio.current = null
    }
    // If clicking the same voice that was playing → just stop
    if (previewing === voiceId) {
      setPreviewing(null)
      return
    }
    setPreviewing(voiceId)
    try {
      const audio = new Audio(`/api/voices/${voiceId}/preview`)
      previewAudio.current = audio
      await audio.play()
      audio.onended = () => { setPreviewing(null); previewAudio.current = null }
    } catch { setPreviewing(null) }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewAudio.current) { previewAudio.current.pause(); previewAudio.current = null }
    }
  }, [])

  const genderIcon = (g) => g === 'female' ? '♀' : '♂'

  return (
    <div>
      {characters.map(c => {
        const detectedGender = guessGender(c.character_name, c.gender)
        const selectedVoice = pending[c.character_name] || ''
        // Sort voices: matching gender first, other gender after (with optgroup)
        const matchVoices = voices.filter(v => v.gender === detectedGender)
        const otherVoices = voices.filter(v => v.gender !== detectedGender)
        const isPlaying = previewing === selectedVoice

        return (
          <div key={c.character_name} style={{ marginBottom: 20, padding: '16px 18px', background: 'var(--color-surface-raised)', borderRadius: 12, border: `1px solid ${detectedGender === 'female' ? 'rgba(244,114,182,0.2)' : 'rgba(96,165,250,0.15)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Avatar with gender colour */}
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: detectedGender === 'female' ? 'linear-gradient(135deg,#9d174d,#f472b6)' : 'linear-gradient(135deg,var(--color-wine),var(--color-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                  {c.character_name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{c.character_name}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: detectedGender === 'female' ? '#f472b6' : 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {genderIcon(detectedGender)} {detectedGender} · {c.line_count || 0} lines
                  </div>
                </div>
              </div>
              {/* Preview toggle button */}
              <button
                onClick={() => previewVoice(selectedVoice)}
                style={{ background: isPlaying ? '#be185d' : 'var(--color-gold-subtle)', border: `1px solid ${isPlaying ? '#be185d' : 'rgba(212,168,67,0.2)'}`, borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: isPlaying ? '#fff' : 'var(--color-gold)', cursor: 'pointer', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', flexShrink: 0 }}
              >
                <Icons.Speaker />
                {isPlaying ? 'Stop' : 'Preview'}
              </button>
            </div>

            {/* Voice dropdown — correct gender voices listed first */}
            <select
              value={selectedVoice}
              onChange={e => {
                // Stop preview when changing voice
                if (previewAudio.current) { previewAudio.current.pause(); previewAudio.current.onended = null; previewAudio.current = null; setPreviewing(null) }
                setPending(prev => ({ ...prev, [c.character_name]: e.target.value }))
              }}
              style={{ width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', cursor: 'pointer', outline: 'none' }}
            >
              <optgroup label={`— ${detectedGender === 'female' ? '♀ Female voices (recommended)' : '♂ Male voices (recommended)'}`}>
                {matchVoices.map(v => (
                  <option key={v.id} value={v.id}>{genderIcon(v.gender)} {v.name} — {v.description} ({v.locale})</option>
                ))}
              </optgroup>
              <optgroup label={`— ${detectedGender === 'female' ? '♂ Male voices' : '♀ Female voices'}`}>
                {otherVoices.map(v => (
                  <option key={v.id} value={v.id}>{genderIcon(v.gender)} {v.name} — {v.description} ({v.locale})</option>
                ))}
              </optgroup>
            </select>
          </div>
        )
      })}

      <button
        onClick={() => onApply(pending)}
        style={{ width: '100%', background: 'linear-gradient(135deg, var(--color-wine), var(--color-gold-dark))', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-ui)', letterSpacing: '0.04em', marginTop: 8 }}
      >
        🎙️ Apply &amp; Regenerate Audiobook
      </button>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)', marginTop: 8 }}>
        This will re-generate all chapter audio with the corrected voices.
      </div>
    </div>
  )
}

function LandingPage({ onGetStarted }) {
  function scrollToDemo() {
    const el = document.getElementById('how-it-works')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* NAV */}
      <nav className="nav-blur" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-wine), var(--color-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}>
            <Icons.Headphones />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em', fontStyle: 'italic' }}>Narrato</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-ghost" style={{ padding: '8px 18px', fontSize: 13 }} onClick={scrollToDemo}>
            How it works
          </button>
          <button className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }} onClick={onGetStarted}>
            Open Studio →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', padding: '120px 24px 100px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Background orbs — warm theatrical glow */}
        <div className="orb orb-purple animate-float" style={{ width: 600, height: 600, top: -200, left: '50%', marginLeft: -300 }} />
        <div className="orb orb-amber" style={{ width: 300, height: 300, top: 100, right: '10%', opacity: 0.3, filter: 'blur(110px)' }} />
        <div className="orb orb-blue" style={{ width: 250, height: 250, bottom: -50, left: '8%', opacity: 0.18, filter: 'blur(90px)' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 860, margin: '0 auto' }}>
          {/* Editorial badge — not purple pill */}
          <div className="animate-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid var(--color-border-strong)', borderRadius: 4, padding: '5px 14px', marginBottom: 32 }}>
            <Icons.Sparkles style={{ width: 12, height: 12, color: 'var(--color-gold)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-ui)' }}>AI-Powered · Free Forever · No Account Required</span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up delay-100" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem, 6.5vw, 5.2rem)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 24px', color: 'var(--color-text)' }}>
            Turn Any Book Into a{' '}
            <span className="text-gradient">Cinematic</span>{' '}
            Audiobook
          </h1>

          {/* Sub */}
          <p className="animate-fade-up delay-200" style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', lineHeight: 1.75, maxWidth: 540, margin: '0 auto 40px' }}>
            Upload a PDF or EPUB. Our AI splits chapters, assigns voices to characters,
            and generates word-synced audio — in minutes.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up delay-300" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ padding: '15px 36px', fontSize: 16 }} onClick={onGetStarted}>
              Start for Free — No Sign Up
            </button>
            <button className="btn-ghost" style={{ padding: '15px 32px', fontSize: 16 }} onClick={scrollToDemo}>
              How it works ↓
            </button>
          </div>

          {/* Social proof — warm text row */}
          <div className="animate-fade-up delay-400" style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
              <strong style={{ color: 'var(--color-gold)', fontWeight: 700 }}>100% free</strong> · No account · No credit card · Works on any book
            </span>
          </div>
        </div>

        {/* Mockup / Hero UI preview — warm dark */}
        <div className="animate-fade-up delay-500" style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '72px auto 0', perspective: 1200 }}>
          <div className="mockup-glow" style={{ borderRadius: 20, overflow: 'hidden', background: 'var(--color-surface)', border: '1px solid var(--color-border)', transform: 'rotateX(4deg)', transformOrigin: 'center top' }}>
            {/* Mock player chrome */}
            <div style={{ background: 'var(--color-surface-raised)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              <span style={{ marginLeft: 16, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>narrato.app/studio</span>
            </div>
            {/* Mock player body */}
            <div style={{ display: 'flex', height: 380 }}>
              {/* Sidebar */}
              <div style={{ width: 220, borderRight: '1px solid var(--color-border)', padding: '16px 0', background: 'rgba(19,15,10,0.6)' }}>
                <div style={{ padding: '8px 16px', marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>Book Directory</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Memoirs of Sherlock Holmes</div>
                </div>
                {['Adventure I. Silver Blaze','Adventure II. The Yellow Face','Adventure III. The Stock-Broker','Adventure IV. The Gloria Scott','Adventure V. The Musgrave Ritual'].map((ch, i) => (
                  <div key={i} style={{ padding: '8px 16px', fontSize: 11, fontFamily: 'var(--font-ui)', color: i === 0 ? 'var(--color-gold)' : 'var(--color-text-muted)', background: i === 0 ? 'rgba(212,168,67,0.08)' : 'transparent', borderLeft: i === 0 ? '2px solid var(--color-gold)' : '2px solid transparent', marginBottom: 2, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Ch {i+1}. {ch.split('.')[1]?.trim().slice(0,20) || ch.slice(0,20)}</span>
                    {i === 0 && <div className="play-bars"><div className="play-bar p1"/><div className="play-bar p2"/><div className="play-bar p3"/></div>}
                  </div>
                ))}
              </div>
              {/* Reader */}
              <div style={{ flex: 1, padding: '24px 32px', overflow: 'hidden', background: 'rgba(19,15,10,0.3)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-wine-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>Holmes</div>
                <div style={{ fontFamily: 'var(--font-reading)', fontSize: 16, lineHeight: 1.9, color: 'var(--color-text-secondary)' }}>
                  <span>"I am afraid, Watson, that </span>
                  <span style={{ background: 'var(--color-gold)', color: '#130F0A', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>I shall have</span>
                  <span> to go," said he. "It is a capital mistake to theorize </span>
                  <span style={{ borderBottom: '2px solid rgba(212,168,67,0.35)' }}>before one</span>
                  <span style={{ borderBottom: '2px solid rgba(212,168,67,0.35)' }}> has data.</span>
                  <span> Insensibly one begins to twist facts to suit theories, instead of theories to suit facts."</span>
                </div>
              </div>
            </div>
            {/* Player Controls */}
            <div style={{ borderTop: '1px solid var(--color-border)', padding: '14px 32px', background: 'rgba(19,15,10,0.85)', display: 'flex', alignItems: 'center', gap: 20 }}>
              <WaveBars count={6} small />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>12:43</span>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.SkipBack /></div>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-gold)', color: '#130F0A' }}><Icons.Pause /></div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.SkipFwd /></div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>50:21</span>
                </div>
                <div style={{ height: 4, background: 'rgba(240,232,216,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', background: 'linear-gradient(90deg, var(--color-gold-dark), var(--color-gold))', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: '32px 24px', background: 'rgba(30,23,17,0.5)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 0 }}>
          {[
            { n: '2,400+', l: 'Audiobooks Created' },
            { n: '7', l: 'AI Voices Available' },
            { n: '100%', l: 'Free to Use' },
            { n: '<5 min', l: 'Average Generation' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '16px 24px', borderRight: i < 3 ? '1px solid var(--color-border)' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--color-gold)', marginBottom: 4, letterSpacing: '-0.03em' }}>{s.n}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-ui)' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="badge badge-purple" style={{ display: 'inline-flex', marginBottom: 20 }}>Features</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-text)' }}>
            Everything you need for a{' '}
            <span className="text-gradient">great listen</span>
          </h2>
          <p style={{ marginTop: 16, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', fontSize: '1.05rem', maxWidth: 460, marginInline: 'auto', lineHeight: 1.75 }}>
            Narrato combines AI narration with smart text parsing to create an experience rivaling professional audiobooks.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {[
            {
              icon: '🎭', color: 'var(--color-wine)',
              title: 'Multi-Character Voices',
              desc: 'AI detects named characters using NLP and assigns each a unique voice — Holmes sounds different from Watson.',
            },
            {
              icon: '✨', color: 'var(--color-gold)',
              title: 'Word-Level Sync',
              desc: 'Every word is highlighted in real-time as it plays — Spotify Lyrics style, but for books.',
            },
            {
              icon: '📚', color: 'var(--color-forest)',
              title: 'Smart Chapter Detection',
              desc: 'Automatically splits PDFs and EPUBs into chapters using heading detection and structure analysis.',
            },
            {
              icon: '⚡', color: 'var(--color-gold-dark)',
              title: 'Edge TTS Engine',
              desc: 'Powered by Microsoft Edge TTS — natural, expressive voices at zero cost. No API keys needed.',
            },
            {
              icon: '🎛️', color: 'var(--color-ember)',
              title: 'Full Playback Control',
              desc: 'Variable speed, volume, sleep timer, bookmarks, and per-word seeking — the full audiobook experience.',
            },
            {
              icon: '💾', color: 'var(--color-wine-light)',
              title: 'Persistent Storage',
              desc: 'All audio is generated once and stored locally. Reopen your audiobook anytime — no re-generation.',
            },
          ].map((f, i) => (
            <div key={i} className="glass-card" style={{ padding: '28px 28px' }}>
              <div style={{ fontSize: 26, marginBottom: 16, width: 50, height: 50, background: 'var(--color-surface-raised)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>{f.title}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.97rem', color: 'var(--color-text-secondary)', lineHeight: 1.72 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 24px 100px', background: 'linear-gradient(180deg, transparent 0%, rgba(139,45,107,0.04) 50%, transparent 100%)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div className="badge badge-purple" style={{ display: 'inline-flex', marginBottom: 20 }}>How it works</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 60px', color: 'var(--color-text)' }}>
            From book to audiobook in 3 steps
          </h2>

          {[
            { n: '01', icon: '📄', title: 'Upload your book', desc: 'Drag and drop any PDF or EPUB file. Narrato extracts clean text, detects chapters, and identifies named characters using natural language processing.' },
            { n: '02', icon: '🤖', title: 'AI generates audio', desc: 'Each chapter is synthesized with character-aware voices. Narration, dialogue, and descriptions all get the right voice. Progress is shown in real-time.' },
            { n: '03', icon: '🎧', title: 'Listen with word sync', desc: 'Open the immersive reader-player. Follow along with the highlighted text, skip to any word, or just close your eyes and listen.' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 28, textAlign: 'left', marginBottom: i < 2 ? 40 : 0, paddingBottom: i < 2 ? 40 : 0, borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: 'var(--color-gold)', flexShrink: 0 }}>{s.n}</div>
                {i < 2 && <div style={{ width: 1, flex: 1, background: 'linear-gradient(to bottom, var(--color-gold), var(--color-wine), transparent)', opacity: 0.35, marginTop: 8 }} />}
              </div>
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>Step {s.n}</div>
                <div style={{ fontWeight: 600, fontSize: '1.3rem', color: 'var(--color-text)', marginBottom: 10, fontFamily: 'var(--font-display)' }}>{s.title}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding: '80px 24px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(139,45,107,0.25) 0%, rgba(212,168,67,0.12) 100%)', border: '1px solid var(--color-border-strong)', borderRadius: 24, padding: '64px 40px', position: 'relative', overflow: 'hidden' }}>
          <div className="orb orb-purple" style={{ width: 300, height: 300, top: -100, left: '50%', marginLeft: -150, opacity: 0.35, filter: 'blur(70px)' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🎙️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 16px', color: 'var(--color-text)', fontStyle: 'italic' }}>
              Ready to listen to your library?
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', fontSize: '1.05rem', marginBottom: 32, maxWidth: 440, marginInline: 'auto', lineHeight: 1.7 }}>
              No account. No credit card. No limits. Just upload your book and start listening.
            </p>
            <button className="btn-primary" style={{ padding: '16px 40px', fontSize: 15 }} onClick={onGetStarted}>
              Open Narrato Studio →
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '32px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, maxWidth: 1100, margin: '0 auto', color: 'var(--color-text-muted)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, var(--color-wine), var(--color-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🎧</div>
          <span style={{ fontWeight: 600, fontStyle: 'italic', fontFamily: 'var(--font-display)', color: 'var(--color-text-secondary)' }}>Narrato</span>
        </div>
        <span>Built with Edge TTS · spaCy NLP · FastAPI · React</span>
        <span>© 2025 Narrato Studio. Free &amp; Open.</span>
      </footer>
    </div>
  )
}

// ─── Mini Player (persistent bottom bar) ─────────────────────────────────────
function MiniPlayer({ book, chapter, isPlaying, currentTime, duration, onTogglePlay, onSeek, onSkip, onGoToPlayer, getCoverClass, fmtTime }) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(22,16,11,0.97)',
      backdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--color-border-strong)',
      boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
    }}>
      {/* Progress bar — full width at very top */}
      <div style={{ height: 3, background: 'rgba(240,232,216,0.07)', position: 'relative', cursor: 'pointer' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          onSeek(ratio * duration)
        }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-gold-dark), var(--color-gold))', transition: 'width 0.25s linear', borderRadius: '0 2px 2px 0' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 24px', gap: 16 }}>

        {/* Left: cover + info (clickable → go to player) */}
        <button onClick={onGoToPlayer} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
          {/* Mini book cover */}
          <div className={getCoverClass(book?.title || '')} style={{ width: 42, height: 52, borderRadius: 7, flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.5)', position: 'relative' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>
              {chapter.title}
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
              {book?.title} · Ch {chapter.chapter_num}
            </div>
          </div>
        </button>

        {/* Center: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={() => onSkip(-1)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>
            <Icons.SkipBack />
          </button>

          <button onClick={onTogglePlay} style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--color-gold)', border: 'none', color: '#130F0A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(212,168,67,0.3)', transition: 'transform 0.1s', flexShrink: 0 }}>
            {isPlaying ? <Icons.Pause /> : <Icons.Play />}
          </button>

          <button onClick={() => onSkip(1)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>
            <Icons.SkipFwd />
          </button>
        </div>

        {/* Right: time + open player */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.04em', minWidth: 70, textAlign: 'right' }}>
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>
          <button onClick={onGoToPlayer} style={{ background: 'var(--color-gold-subtle)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--color-gold)', cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icons.ArrowRight />
            <span>Open Player</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('landing') // landing | library | processing | player
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [activeChapter, setActiveChapter] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null) // book id awaiting delete confirm
  const [showVoiceModal, setShowVoiceModal] = useState(false)  // cast & voices modal

  // Player state
  const [chapters, setChapters] = useState([])
  const [timestamps, setTimestamps] = useState([])
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [volume, setVolume] = useState(0.85)
  const [isMuted, setIsMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeSpeaker, setActiveSpeaker] = useState('Narrator')
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(null)
  const [savedBookmark, setSavedBookmark] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  // Customizer / character state
  const [characters, setCharacters] = useState([])
  const [voices, setVoices] = useState([])

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Poll intervals (ref to avoid stale closures)
  const pollRef = useRef({})

  // Refs
  const audioRef = useRef(null)
  const wordRefs = useRef([])
  const textPanelRef = useRef(null)
  const sleepTimerId = useRef(null)
  const sleepCountdownId = useRef(null)
  const fileInputRef = useRef(null)

  const API = ''

  // ── Mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBooks()
    fetchVoices()
    return () => {
      Object.values(pollRef.current).forEach(clearInterval)
      if (sleepTimerId.current) clearTimeout(sleepTimerId.current)
      if (sleepCountdownId.current) clearInterval(sleepCountdownId.current)
    }
  }, [])

  // ── Delete book ──────────────────────────────────────────────────────────
  async function handleDeleteBook(bookId) {
    try {
      const r = await fetch(`${API}/api/books/${bookId}`, { method: 'DELETE' })
      if (r.ok) {
        setBooks(prev => prev.filter(b => b.id !== bookId))
        if (selectedBook?.id === bookId) { setSelectedBook(null); setView('library') }
      }
    } catch {}
    setConfirmDeleteId(null)
  }

  // ── Poll processing books ────────────────────────────────────────────────
  useEffect(() => {
    const processing = books.filter(b => b.status === 'queued' || b.status.startsWith('processing'))
    const cur = pollRef.current
    Object.keys(cur).forEach(id => {
      if (!processing.some(b => b.id === id)) { clearInterval(cur[id]); delete cur[id] }
    })
    processing.forEach(b => {
      if (!cur[b.id]) cur[b.id] = setInterval(() => pollBookStatus(b.id), 5000)
    })
  }, [books])

  // ── Sleep countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (sleepTimerRemaining !== null && sleepTimerRemaining > 0) {
      sleepCountdownId.current = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev <= 1) { clearInterval(sleepCountdownId.current); handlePause(); return null }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (sleepCountdownId.current) clearInterval(sleepCountdownId.current) }
  }, [sleepTimerRemaining])

  // ── API calls ─────────────────────────────────────────────────────────────
  async function fetchBooks() {
    try {
      const r = await fetch(`${API}/api/books`)
      if (r.ok) setBooks(await r.json())
    } catch {}
  }

  async function fetchVoices() {
    try {
      const r = await fetch(`${API}/api/voices`)
      if (r.ok) setVoices(await r.json())
    } catch {}
  }

  async function pollBookStatus(bookId) {
    try {
      const r = await fetch(`${API}/api/books/${bookId}/status`)
      if (r.status === 404) {
        if (pollRef.current[bookId]) { clearInterval(pollRef.current[bookId]); delete pollRef.current[bookId] }
        if (selectedBook?.id === bookId) { setSelectedBook(null); setView('library') }
        fetchBooks(); return
      }
      if (!r.ok) return
      const d = await r.json()
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...d } : b))
      if (selectedBook?.id === bookId) setSelectedBook(prev => ({ ...prev, ...d }))
      if (d.status === 'complete') { fetchBooks(); if (selectedBook?.id === bookId) loadBookDetails(bookId) }
    } catch {}
  }

  async function loadBookDetails(bookId) {
    try {
      const r = await fetch(`${API}/api/books/${bookId}`)
      if (r.status === 404) { setSelectedBook(null); setChapters([]); setView('library'); fetchBooks(); return }
      if (r.ok) {
        const d = await r.json()
        setSelectedBook(d.book)
        setChapters(d.chapters)
        const cr = await fetch(`${API}/api/books/${bookId}/characters`)
        if (cr.ok) setCharacters(await cr.json())
      }
    } catch {}
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload(file) {
    if (!file) return
    const allowed = ['application/pdf', 'application/epub+zip', '']
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf','epub'].includes(ext)) { setUploadError('Only PDF and EPUB files are supported.'); return }
    setUploadError('')
    setIsUploading(true)
    setUploadMsg('Parsing book structure…')
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch(`${API}/api/books/upload`, { method: 'POST', body: form })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Upload failed')
      setUploadMsg('Book ingested! Generating audio…')
      await fetchBooks()
      const newBook = d
      setSelectedBook({ id: d.book_id, title: d.title || file.name, status: 'queued', current_chapter: 0, total_chapters: d.total_chapters || 0, author: d.author || 'Unknown' })
      setView('processing')
    } catch (e) {
      setUploadError(e.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileDrop(e) {
    e.preventDefault(); setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  // ── Playback ──────────────────────────────────────────────────────────────
  async function startPlayback(chapter) {
    setActiveChapter(chapter)
    setCurrentWordIdx(-1)
    setTimestamps([])
    setCurrentTime(0)
    setDuration(0)
    try {
      const [ar, tr] = await Promise.all([
        fetch(`${API}/api/chapters/${chapter.id}/audio`),
        fetch(`${API}/api/chapters/${chapter.id}/timestamps`)
      ])
      if (ar.ok) {
        const ad = await ar.json()
        if (audioRef.current) {
          audioRef.current.src = ad.audio_url
          audioRef.current.playbackRate = playbackRate
          audioRef.current.volume = isMuted ? 0 : volume
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
        }
      }
      if (tr.ok) {
        const td = await tr.json()
        setTimestamps(Array.isArray(td) ? td : (td.words || []))
      }
    } catch {}
  }

  function handleTimeUpdate() {
    const el = audioRef.current
    if (!el) return
    const ms = el.currentTime * 1000
    setCurrentTime(el.currentTime)
    if (timestamps.length > 0) {
      let idx = timestamps.findIndex(w => ms < w.start_ms + w.duration_ms)
      if (idx < 0) idx = timestamps.length - 1
      if (idx !== currentWordIdx) {
        setCurrentWordIdx(idx)
        setActiveSpeaker(timestamps[idx]?.speaker || 'Narrator')
        const el2 = wordRefs.current[idx]
        if (el2 && textPanelRef.current) {
          const pRect = textPanelRef.current.getBoundingClientRect()
          const wRect = el2.getBoundingClientRect()
          const mid = (wRect.top + wRect.bottom) / 2 - pRect.top
          if (mid < pRect.height * 0.3 || mid > pRect.height * 0.7) {
            el2.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        }
      }
    }
  }

  function handleAudioLoaded() { if (audioRef.current) setDuration(audioRef.current.duration) }
  function handleSeek(t) {
    if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t) }
  }
  function handleWordClick(idx) {
    if (timestamps[idx] && audioRef.current) {
      audioRef.current.currentTime = timestamps[idx].start_ms / 1000
      if (!isPlaying) audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }
  function handlePlay() {
    audioRef.current?.play()
    setIsPlaying(true)
  }
  function handlePause() {
    audioRef.current?.pause()
    setIsPlaying(false)
  }
  function togglePlay() { isPlaying ? handlePause() : handlePlay() }

  function skipChapter(dir) {
    if (!activeChapter) return
    const next = chapters.find(c => c.chapter_num === activeChapter.chapter_num + dir && c.status === 'complete')
    if (next) startPlayback(next)
  }

  async function handleCancelGeneration() {
    if (!selectedBook) return
    try { await fetch(`${API}/api/books/${selectedBook.id}/cancel`, { method: 'POST' }) }
    catch {}
    fetchBooks()
    setSelectedBook(prev => prev ? { ...prev, status: 'stopped' } : prev)
  }

  async function handleResumeGeneration() {
    if (!selectedBook) return
    try { await fetch(`${API}/api/books/${selectedBook.id}/resume`, { method: 'POST' }) }
    catch {}
    setSelectedBook(prev => prev ? { ...prev, status: 'queued' } : prev)
    fetchBooks()
  }

  function handleSleepTimer(mins) {
    if (sleepTimerId.current) clearTimeout(sleepTimerId.current)
    if (sleepCountdownId.current) clearInterval(sleepCountdownId.current)
    setSleepTimerRemaining(mins * 60)
    sleepTimerId.current = setTimeout(() => { handlePause(); setSleepTimerRemaining(null) }, mins * 60 * 1000)
  }

  function handleSaveBookmark() {
    setSavedBookmark({ chapter: activeChapter?.id, time: currentTime, word: currentWordIdx })
  }

  // ── Computed: grouped text blocks with sentence paragraphs ────────────────

  const groupedBlocks = useMemo(() => {
    if (!timestamps.length) return []
    const raw = []
    let cur = null
    timestamps.forEach((w, i) => {
      const prev = i > 0 ? timestamps[i-1] : null
      const gap = prev ? (w.start_ms - (prev.start_ms + prev.duration_ms)) > 1200 : false
      if (!cur || cur.speaker !== w.speaker || gap) {
        if (cur) raw.push(cur)
        cur = { speaker: w.speaker, type: w.speaker === 'Narrator' ? 'narration' : 'dialogue', words: [] }
      }
      cur.words.push({ ...w, idx: i })
    })
    if (cur) raw.push(cur)

    const SENT_END = /[.!?]["'\u2019\u201d)\]]*$/
    const blocks = []
    raw.forEach(block => {
      let para = []
      block.words.forEach((w, wi) => {
        para.push(w)
        const ends = SENT_END.test(w.word)
        const last = wi === block.words.length - 1
        if (ends || last) {
          blocks.push({ speaker: block.speaker, type: block.type, words: para })
          para = []
        }
      })
      if (para.length) blocks.push({ speaker: block.speaker, type: block.type, words: para })
    })
    return blocks
  }, [timestamps])

  const sentenceRange = useMemo(() => {
    if (currentWordIdx < 0 || !timestamps.length) return [-1,-1]
    let s = currentWordIdx, e = currentWordIdx
    while (s > 0 && !/[.!?]/.test(timestamps[s-1].word)) s--
    while (e < timestamps.length-1 && !/[.!?]/.test(timestamps[e].word)) e++
    return [s, e]
  }, [currentWordIdx, timestamps])

  const speakerColorMap = useMemo(() => {
    const m = {}
    characters.forEach((c, i) => { m[c.character_name] = SPEAKER_COLORS[i % SPEAKER_COLORS.length] })
    return m
  }, [characters])

  return (
    <>
      {view === 'landing' && (
        <LandingPage onGetStarted={() => { setView('library'); fetchBooks() }} />
      )}

      {/* Main navigation, shown on all views except Landing */}
      {view !== 'landing' && (
        <nav className="nav-blur" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, zIndex: 40 }}>
          <button onClick={() => setView('landing')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, var(--color-wine), var(--color-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              🎧
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em', fontStyle: 'italic' }}>Narrato</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {view !== 'library' && (
              <button className="btn-ghost" style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => setView('library')}>
                ← Library
              </button>
            )}
            {view === 'library' && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                {books.length} book{books.length === 1 ? '' : 's'} in library
              </span>
            )}
          </div>
        </nav>
      )}

      {/* Library View */}
      {view === 'library' && (() => {
        const totalHours = books.reduce((acc, b) => acc + (b.estimated_audio_hours || 0), 0);
        const readyBooks = books.filter(b => b.status === 'complete');
        const miniPlayerVisible = activeChapter && (isPlaying || currentTime > 0);
        return (
          <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
            <div className="scrollbar" style={{ flex: 1, overflowY: 'auto', padding: `32px 32px ${miniPlayerVisible ? '110px' : '60px'}` }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Drag-drop Upload dropzone */}
                <div
                  className={`drop-zone${dragActive ? ' drag-over' : ''}`}
                  style={{ padding: '48px 32px', textAlign: 'center', marginBottom: 48, cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleFileDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.epub"
                    style={{ display: 'none' }}
                    onChange={e => handleUpload(e.target.files[0])}
                  />
                  {isUploading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                      <WaveBars count={8} />
                      <div style={{ fontWeight: 600, color: 'var(--color-gold)', fontSize: 15, fontFamily: 'var(--font-ui)' }}>
                        {uploadMsg}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                        This may take a moment…
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 4 }}>
                        📖
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                        Drop your book here
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                        PDF or EPUB · Any size · Completely free
                      </div>
                      <button className="btn-primary" style={{ marginTop: 8, padding: '10px 24px', fontSize: 14 }}>
                        Choose File
                      </button>
                      {uploadError && (
                        <div style={{ color: 'var(--color-ember)', fontSize: 13, marginTop: 4, fontFamily: 'var(--font-ui)' }}>
                          ⚠ {uploadError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats row */}
                {books.length > 0 && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Total Books', value: books.length },
                      { label: 'Ready', value: readyBooks.length },
                      { label: 'Hours of Audio', value: `${totalHours.toFixed(1)}h` }
                    ].map((stat, t) => (
                      <div key={t} className="stat-card" style={{ minWidth: 140, borderColor: t === 2 ? 'rgba(212,168,67,0.2)' : undefined }}>
                        <div style={{ fontSize: t === 2 ? 28 : 24, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--color-gold)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                          {stat.value}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-ui)', marginTop: 4 }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Header */}
                {books.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, fontStyle: 'italic', color: 'var(--color-text)' }}>
                      Your Library
                    </h2>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                      {books.length} title{books.length === 1 ? '' : 's'}
                    </span>
                  </div>
                )}

                {/* Library books grid */}
                {books.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-2)' }}>
                      Your library is empty
                    </div>
                    <div style={{ fontSize: 13 }}>
                      Upload a PDF or EPUB book above to get started
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 24 }}>
                    {books.map(book => {
                      const isProcessing = book.status === 'queued' || book.status.startsWith('processing');
                      const isStopped = book.status === 'stopped';
                      const isError = book.status === 'error';
                      const isComplete = book.status === 'complete';
                      const pct = book.total_chapters ? Math.round((book.current_chapter / book.total_chapters) * 100) : 0;
                      const isDeleting = confirmDeleteId === book.id;

                      return (
                        <div key={book.id} style={{ position: 'relative' }}>
                          {/* Delete Confirmation Overlay */}
                          {isDeleting && (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(19,15,10,0.96)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
                              <div style={{ fontSize: 22 }}>🗑️</div>
                              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
                                Remove <strong style={{ color: 'var(--color-text)' }}>{book.title}</strong> from library?
                              </div>
                              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                                <button
                                  onClick={() => handleDeleteBook(book.id)}
                                  style={{ flex: 1, background: 'var(--color-ember)', border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }}
                                  style={{ flex: 1, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Trash Delete button */}
                          {!isDeleting && (
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDeleteId(book.id) }}
                              title="Remove from library"
                              style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, width: 28, height: 28, borderRadius: 8, background: 'rgba(19,15,10,0.82)', border: '1px solid rgba(240,232,216,0.12)', display: 'flex', alignItems: 'center', justifycontent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)', opacity: 0, transition: 'opacity 0.2s', padding: 0 }}
                              className="book-delete-btn"
                            >
                              <Icons.Trash />
                            </button>
                          )}

                          {/* Card body */}
                          <div
                            onClick={() => {
                              if (!isDeleting) {
                                if (isProcessing || isStopped) {
                                  setSelectedBook(book);
                                  setView('processing');
                                } else if (!isError) {
                                  loadBookDetails(book.id);
                                  setView('player');
                                }
                              }
                            }}
                            style={{ cursor: isError ? 'default' : 'pointer' }}
                          >
                            <div className={`book-cover ${getCoverClass(book.title)}`} style={{ aspectRatio: '3/4', marginBottom: 10 }}>
                              <div style={{ position: 'absolute', inset: 0, padding: '16px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 2 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic' }}>
                                  {book.title}
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-ui)' }}>
                                  {book.author}
                                </div>
                              </div>

                              {/* Generating Overlay */}
                              {isProcessing && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,7,4,0.85)', backdropFilter: 'blur(4px)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                  <WaveBars count={5} small />
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gold)', fontFamily: 'var(--font-ui)' }}>
                                    Generating…
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                                    Ch {book.current_chapter}/{book.total_chapters || '?'}
                                  </div>
                                  <div style={{ width: '70%', height: 3, background: 'rgba(240,232,216,0.08)', borderRadius: 2 }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-gold-dark), var(--color-gold))', borderRadius: 2, transition: 'width 0.5s ease' }} />
                                  </div>
                                </div>
                              )}

                              {/* Paused Overlay */}
                              {isStopped && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,7,4,0.85)', backdropFilter: 'blur(4px)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <div style={{ fontSize: 24 }}>⏸</div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gold)', fontFamily: 'var(--font-ui)' }}>
                                    Paused
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                                    {pct}% complete
                                  </div>
                                </div>
                              )}

                              {/* Error Overlay */}
                              {isError && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,7,4,0.88)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <div style={{ fontSize: 24 }}>⚠️</div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ember)', fontFamily: 'var(--font-ui)' }}>
                                    Failed
                                  </div>
                                </div>
                              )}
                            </div>

                            <div style={{ padding: '0 2px' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)' }}>
                                {book.title}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
                                {book.author}
                              </div>
                              {isComplete && (
                                <div style={{ fontSize: 10, color: 'var(--color-forest)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-ui)' }}>
                                  ✓ {book.total_chapters} ch · {book.estimated_audio_hours?.toFixed(1)}h
                                </div>
                              )}
                              {isProcessing && (
                                <div style={{ fontSize: 10, color: 'var(--color-gold)', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
                                  {pct}% done
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Processing View */}
      {view === 'processing' && selectedBook && (() => {
        const isStopped = selectedBook.status === 'stopped';
        const pct = selectedBook.percent_complete || (selectedBook.total_chapters ? Math.round(((selectedBook.current_chapter - 0.5) / selectedBook.total_chapters) * 100) : 0);
        const statusText = isStopped
          ? 'Stopped'
          : selectedBook.status === 'queued'
          ? 'In queue…'
          : selectedBook.status === 'complete'
          ? 'Complete!'
          : `Chapter ${selectedBook.current_chapter} of ${selectedBook.total_chapters}`;

        return (
          <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
            <div className="scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <div style={{ maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div className={`${getCoverClass(selectedBook.title)}`} style={{ width: 80, height: 110, borderRadius: 12, flexShrink: 0, boxShadow: 'var(--shadow-lg)' }} />
                  <div>
                    <div className={`badge-status ${isStopped ? 'badge-status-amber' : selectedBook.status === 'complete' ? 'badge-status-green' : 'badge-status-wine'}`} style={{ marginBottom: 10, display: 'inline-flex' }}>
                      {isStopped ? '⏸ Stopped' : selectedBook.status === 'complete' ? '✓ Complete' : '⚡ Generating'}
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 600, margin: '0 0 4px', letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
                      {selectedBook.title}
                    </h1>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                      by {selectedBook.author}
                    </div>
                  </div>
                </div>

                {!isStopped && selectedBook.status !== 'complete' && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <WaveBars count={12} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Status', value: statusText, color: isStopped ? 'var(--color-gold)' : selectedBook.status === 'complete' ? 'var(--color-forest)' : 'var(--color-wine-light)' },
                    { label: 'Progress', value: `${pct}%`, color: 'var(--color-gold)' },
                    { label: 'Chapters', value: `${selectedBook.current_chapter || 0} / ${selectedBook.total_chapters || '?'}`, color: 'var(--color-text)' },
                    { label: 'ETA', value: selectedBook.eta_minutes != null && selectedBook.eta_minutes >= 0 ? `~${selectedBook.eta_minutes} min` : '—', color: 'var(--color-text)' }
                  ].map((stat, t) => (
                    <div key={t} className="stat-card">
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'var(--font-ui)' }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: stat.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                    <span>Start</span>
                    <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{pct}% Complete</span>
                    <span>Finish</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {isStopped ? (
                    <>
                      <button className="btn-primary" style={{ flex: 1 }} onClick={handleResumeGeneration}>
                        ▶ Resume Generation
                      </button>
                      <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setView('library')}>
                        Return to Library
                      </button>
                    </>
                  ) : (
                    <>
                      {selectedBook.current_chapter > 0 && (
                        <button className="btn-green" style={{ flex: 1 }} onClick={() => { loadBookDetails(selectedBook.id); setView('player') }}>
                          🎧 Listen to Ready Chapters
                        </button>
                      )}
                      <button className="btn-ghost" style={{ flex: 1, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }} onClick={handleCancelGeneration}>
                        ⏹ Stop Generation
                      </button>
                    </>
                  )}
                </div>

                {selectedBook.status !== 'stopped' && (
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', textAlign: 'center' }} onClick={() => setView('library')}>
                    ← Back to Library (generation continues in background)
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Player View */}
      {view === 'player' && selectedBook && (() => {
        const activeColor = speakerColorMap[activeSpeaker] || SPEAKER_COLORS[0];
        const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
        const paragraphGroups = [];
        groupedBlocks.forEach(block => {
          const last = paragraphGroups[paragraphGroups.length - 1];
          if (last && last.speaker === block.speaker && last.type === block.type) {
            last.paragraphs.push(block.words);
          } else {
            paragraphGroups.push({
              speaker: block.speaker,
              type: block.type,
              paragraphs: [block.words]
            });
          }
        });

        async function handleApplyVoices(voiceAssignments) {
          const updatedCharacters = characters.map(c => ({
            character_name: c.character_name,
            edge_tts_voice: voiceAssignments[c.character_name] || c.edge_tts_voice
          }));
          try {
            const response = await fetch(`/api/books/${selectedBook.id}/characters`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedCharacters)
            });
            if (response.ok) {
              setShowVoiceModal(false);
              setSelectedBook(prev => ({ ...prev, status: 'queued', current_chapter: 0 }));
              setView('processing');
              fetchBooks();
            }
          } catch {}
        }

        return (
          <>
            {showVoiceModal && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,7,4,0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 20, padding: 32, maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }} className="scrollbar">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>
                        Cast & Voices
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--color-text)', fontStyle: 'italic' }}>
                        Assign voices to characters
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
                        Changes will regenerate the audiobook audio.
                      </div>
                    </div>
                    <button onClick={() => setShowVoiceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, marginTop: -4 }}>
                      <Icons.X />
                    </button>
                  </div>
                  <VoiceAssignPanel characters={characters} voices={voices} onApply={handleApplyVoices} />
                </div>
              </div>
            )}

            <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* Book Directory sidebar */}
                <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--color-border)', background: 'rgba(19,15,10,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>
                      Book Directory
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                      {selectedBook.title}
                    </div>
                  </div>

                  <div className="scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                    {chapters.map(ch => {
                      const isActive = activeChapter?.id === ch.id;
                      const isReady = ch.status === 'complete';
                      return (
                        <button
                          key={ch.id}
                          disabled={!isReady}
                          onClick={() => isReady && startPlayback(ch)}
                          className={`chapter-item${isActive ? ' active' : ''}`}
                          style={{ width: '100%', padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: isActive ? '1px solid rgba(212,168,67,0.22)' : '1px solid transparent', color: isReady ? isActive ? 'var(--color-gold)' : 'var(--color-text-secondary)' : 'var(--color-text-muted)', cursor: isReady ? 'pointer' : 'default', borderRadius: 10, marginBottom: 2 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0, fontFamily: 'var(--font-ui)' }}>
                              {ch.chapter_num}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)' }}>
                              {ch.title}
                            </span>
                          </div>
                          {isActive && isPlaying ? (
                            <div className="play-bars" style={{ flexShrink: 0 }}>
                              <div className="play-bar p1" />
                              <div className="play-bar p2" />
                              <div className="play-bar p3" />
                            </div>
                          ) : isReady ? null : (
                            <Spinner size={12} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Immersive Text Reader */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(19,15,10,0.7)' }}>
                    <div>
                      {activeChapter ? (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 700, color: activeColor.text, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2, fontFamily: 'var(--font-ui)' }}>
                            {activeSpeaker}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                            {activeChapter.title}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                          Select a chapter to start listening
                        </div>
                      )}
                    </div>

                    {sleepTimerRemaining !== null && (
                      <div className="badge badge-amber">
                        🌙 {Math.floor(sleepTimerRemaining / 60)}:{String(sleepTimerRemaining % 60).padStart(2, '0')}
                      </div>
                    )}

                    {characters.length > 0 && (
                      <button
                        onClick={() => setShowVoiceModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-gold-subtle)', border: '1px solid rgba(212,168,67,0.22)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--color-gold)', cursor: 'pointer', fontFamily: 'var(--font-ui)', marginLeft: 8, flexShrink: 0 }}
                        title="Change character voices"
                      >
                        <Icons.Cast />
                        <span>Cast & Voices</span>
                      </button>
                    )}
                  </div>

                  <div
                    ref={textPanelRef}
                    className="scrollbar"
                    style={{ flex: 1, overflowY: 'auto', padding: '40px 48px 80px', fontFamily: 'var(--font-reading)', fontSize: 18, lineHeight: 1.9, color: 'var(--color-text-secondary)' }}
                  >
                    {activeChapter && (
                      <div style={{ maxWidth: 680, margin: '0 auto 40px', display: 'flex', gap: 20, alignItems: 'flex-start', padding: '20px 24px', background: 'rgba(30,23,17,0.6)', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                        <div className={getCoverClass(selectedBook.title)} style={{ width: 60, height: 84, borderRadius: 8, flexShrink: 0, boxShadow: 'var(--shadow-md)', position: 'relative' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--font-ui)' }}>
                            Chapter {activeChapter.chapter_num}
                          </div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.3 }}>
                            {activeChapter.title}
                          </div>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {selectedBook.title} · {selectedBook.author}
                          </div>
                          {timestamps.length > 0 && (
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 6, display: 'flex', gap: 12 }}>
                              <span>📖 {timestamps.length} words</span>
                              <span>🎵 {fmtTime(duration)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {timestamps.length === 0 ? (
                      <div style={{ height: activeChapter ? '50%' : '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', gap: 16 }}>
                        <div style={{ fontSize: 48 }}>📖</div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                          {activeChapter ? 'Loading audio…' : 'Select a chapter to start listening'}
                        </div>
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-body)' }}>
                          Words will highlight in real-time as audio plays
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 680, margin: '0 auto' }}>
                        {paragraphGroups.map((group, t) => {
                          const speakerColor = group.speaker === 'Narrator' ? null : speakerColorMap[group.speaker] || SPEAKER_COLORS[0];
                          return (
                            <div
                              key={t}
                              style={{
                                paddingLeft: group.type === 'dialogue' ? 20 : 0,
                                borderLeft: group.type === 'dialogue' ? `2px solid ${speakerColor?.border || 'transparent'}` : 'none',
                                background: group.type === 'dialogue' ? speakerColor?.bg : 'transparent',
                                borderRadius: group.type === 'dialogue' ? '0 12px 12px 0' : 0,
                                paddingTop: group.type === 'dialogue' ? 12 : 0,
                                paddingRight: group.type === 'dialogue' ? 16 : 0,
                                paddingBottom: group.type === 'dialogue' ? 12 : 0
                              }}
                            >
                              {group.type === 'dialogue' && (
                                <div style={{ fontSize: 10, fontWeight: 800, color: speakerColor?.text, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                                  {group.speaker}
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                {group.paragraphs.map((para, n) => (
                                  <p key={n} style={{ margin: 0, color: group.type === 'dialogue' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)' }}>
                                    {para.map((w, wordIdx) => {
                                      const isCurrent = w.idx === currentWordIdx;
                                      const inSentence = w.idx >= sentenceRange[0] && w.idx <= sentenceRange[1] && !isCurrent;
                                      return (
                                        <span
                                          key={wordIdx}
                                          ref={el => (wordRefs.current[w.idx] = el)}
                                          onClick={() => handleWordClick(w.idx)}
                                          className={`word${isCurrent ? ' active' : inSentence ? ' sentence' : ''}`}
                                        >
                                          {w.word}
                                        </span>
                                      );
                                    })}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Player bottom control bar */}
                  <div style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(19,15,10,0.92)', backdropFilter: 'blur(20px)', padding: '16px 32px 20px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, minWidth: 38, textAlign: 'right', fontFamily: 'var(--font-ui)' }}>
                        {fmtTime(currentTime)}
                      </span>
                      <div style={{ flex: 1, position: 'relative', height: 4 }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(240,232,216,0.08)', borderRadius: 2 }} />
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-gold-dark), var(--color-gold))', borderRadius: 2, transition: 'width 0.2s linear' }} />
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          step={0.1}
                          onChange={e => handleSeek(parseFloat(e.target.value))}
                          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 20, top: -8 }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, minWidth: 38, fontFamily: 'var(--font-ui)' }}>
                        {fmtTime(duration)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <button
                          className="ctrl-btn"
                          onClick={() => {
                            const nextMuted = !isMuted;
                            setIsMuted(nextMuted);
                            if (audioRef.current) audioRef.current.volume = nextMuted ? 0 : volume;
                          }}
                        >
                          {isMuted ? <Icons.VolumeX /> : <Icons.Volume />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.02}
                          value={isMuted ? 0 : volume}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            if (audioRef.current) audioRef.current.volume = val;
                            setIsMuted(val === 0);
                          }}
                          style={{ width: 80 }}
                        />
                        <button
                          onClick={() => {
                            const rates = [0.75, 1, 1.25, 1.5, 1.75, 2];
                            const ni = (rates.indexOf(playbackRate) + 1) % rates.length;
                            setPlaybackRate(rates[ni]);
                            if (audioRef.current) audioRef.current.playbackRate = rates[ni];
                          }}
                          style={{ background: 'var(--color-gold-subtle)', border: '1px solid rgba(212,168,67,0.22)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--color-gold)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
                        >
                          {playbackRate}×
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button className="ctrl-btn" onClick={() => skipChapter(-1)}>
                          <Icons.SkipBack />
                        </button>
                        <button className="ctrl-btn-main" onClick={togglePlay}>
                          {isPlaying ? <Icons.Pause /> : <Icons.Play />}
                        </button>
                        <button className="ctrl-btn" onClick={() => skipChapter(1)}>
                          <Icons.SkipFwd />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                        <button className="ctrl-btn" title="Save Bookmark" onClick={handleSaveBookmark}>
                          <Icons.Bookmark />
                        </button>
                        <button
                          className="ctrl-btn"
                          title="Sleep Timer"
                          onClick={() => {
                            const opts = [15, 30, 45, 60];
                            const cur = sleepTimerRemaining !== null ? Math.ceil(sleepTimerRemaining / 60) : 0;
                            const ni = opts.findIndex(o => o > cur);
                            if (ni < 0 || sleepTimerRemaining !== null) {
                              clearTimeout(sleepTimerId.current);
                              clearInterval(sleepCountdownId.current);
                              setSleepTimerRemaining(null);
                            } else {
                              handleSleepTimer(opts[ni]);
                            }
                          }}
                          style={{ color: sleepTimerRemaining ? '#fbbf24' : undefined }}
                        >
                          <Icons.Moon />
                        </button>
                        <button className="ctrl-btn" onClick={() => loadBookDetails(selectedBook.id)}>
                          <Icons.Refresh />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Mini Player persistent bar across library / processing views */}
      {view !== 'landing' && view !== 'player' && activeChapter && (isPlaying || currentTime > 0) && (
        <MiniPlayer
          book={selectedBook}
          chapter={activeChapter}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onSkip={skipChapter}
          onGoToPlayer={() => setView('player')}
          getCoverClass={getCoverClass}
          fmtTime={fmtTime}
        />
      )}

      {/* Single persistent root audio tag */}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleAudioLoaded}
        onEnded={() => {
          if (activeChapter && activeChapter.chapter_num < chapters.length) {
            const next = chapters.find(c => c.chapter_num === activeChapter.chapter_num + 1 && c.status === 'complete');
            if (next) startPlayback(next);
            else setIsPlaying(false);
          } else {
            setIsPlaying(false);
          }
        }}
      />
    </>
  );
}
