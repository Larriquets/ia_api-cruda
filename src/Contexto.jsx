import { useEffect, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import SpeechReader from './SpeechReader.jsx'
import { useT } from './i18n/useT.js'
import { ContextoBodyEs, ContextoBodyEn } from './content/ContextoBody.jsx'

const STORAGE_KEY = 'chat_context_snapshot'

const TOC_ITEMS = [
  { id: 'tesis',         emoji: '🎯', es: 'La tesis',                  en: 'The thesis' },
  { id: 'chat',          emoji: '💬', es: '1) Chat — historial',       en: '1) Chat — history' },
  { id: 'snapshot',      emoji: '📸', es: 'Foto en vivo',              en: 'Live snapshot' },
  { id: 'editor',        emoji: '💻', es: '2) Editor — payload mínimo', en: '2) Editor — minimal payload' },
  { id: 'loop',          emoji: '🤖', es: '3) Loop — crece solo',      en: '3) Loop — grows on its own' },
  { id: 'agents-md',     emoji: '📋', es: '4) AGENTS.md',              en: '4) AGENTS.md' },
  { id: 'costo',         emoji: '💰', es: 'El contexto cuesta',        en: 'Context costs' },
  { id: 'conclusion',    emoji: '📌', es: 'Conclusión',               en: 'Conclusion' },
]

export default function Contexto() {
  const { t, lang } = useT()
  const [snapshot, setSnapshot] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const readSnapshot = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setSnapshot(JSON.parse(raw))
      } else {
        setSnapshot(null)
      }
    } catch {
      setSnapshot(null)
    }
  }

  useEffect(() => {
    readSnapshot()
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) readSnapshot()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(readSnapshot, 1500)
    return () => clearInterval(id)
  }, [autoRefresh])

  const estimateTokens = (text) => Math.ceil((text || '').length / 4)
  const messages = snapshot?.messages || []
  const totalTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0)
  const updatedAt = snapshot?.updatedAt
    ? new Date(snapshot.updatedAt).toLocaleString(lang === 'en' ? 'en-US' : 'es-AR')
    : null

  const bodyProps = { messages, totalTokens, updatedAt, autoRefresh, setAutoRefresh, readSnapshot, estimateTokens }

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /contexto
          <span className="docs-header-subtitle">{lang === 'en' ? 'live view of the chat messages array' : 'vista en vivo del array messages del chat'}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="contexto" />
          <nav className="docs-toc" aria-label={t('docpage.pageIndexAria')}>
            <div className="docs-toc-title">{t('docpage.onThisPage')}</div>
            {TOC_ITEMS.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="docs-toc-link">
                <span className="docs-toc-emoji">{item.emoji}</span>
                <span className="docs-toc-label">{lang === 'en' ? item.en : item.es}</span>
              </a>
            ))}
          </nav>
        </aside>

        {lang === 'en' ? <ContextoBodyEn {...bodyProps} /> : <ContextoBodyEs {...bodyProps} />}
      </div>
    </div>
  )
}
