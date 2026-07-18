import { useEffect, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import SpeechReader from './SpeechReader.jsx'
import { useT } from './i18n/useT.js'
import { IdesBodyEs, IdesBodyEn } from './content/IdesBody.jsx'

// /ides — anexo de docs: el IDE agéntico (Cursor, Claude Code, Copilot…)
// destapado como lo que es: una UI arriba del mismo POST que enseña la app.
// Mismo andamiaje que /como-funciona: TOC con scroll-spy + cuerpo por idioma.

const TOC_ITEMS = [
  { id: 'tesis',        emoji: '🎯', es: 'Tu IDE, con maquillaje',        en: 'Your IDE, wearing makeup' },
  { id: 'mapa-piezas',  emoji: '🗺', es: 'Cada feature, destapada',       en: 'Every feature, uncovered' },
  { id: 'reglas',       emoji: '📋', es: 'Rules = system prompt',         en: 'Rules = system prompt' },
  { id: 'contexto-ide', emoji: '💬', es: 'Lo que mete al POST',           en: 'What goes into the POST' },
  { id: 'agente',       emoji: '🤖', es: 'El agente que "edita"',         en: 'The agent that "edits"' },
  { id: 'practicas',    emoji: '📌', es: 'Buenas prácticas',              en: 'Best practices' },
  { id: 'cierre',       emoji: '🚀', es: 'Verlo en vivo',                 en: 'See it live' },
]

export default function Ides() {
  const { t, lang } = useT()
  const [activeSection, setActiveSection] = useState(TOC_ITEMS[0].id)

  useEffect(() => {
    const ids = TOC_ITEMS.map((i) => i.id)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible?.target?.id) setActiveSection(visible.target.id)
      },
      { rootMargin: '-18% 0px -65% 0px', threshold: [0, 0.1, 0.25] },
    )

    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const handleTocClick = (event, id) => {
    event.preventDefault()
    setActiveSection(id)
    window.history.pushState(null, '', `#${id}`)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /ides
          <span className="docs-header-subtitle">{lang === 'en' ? 'what Cursor & friends really send' : 'lo que Cursor y compañía mandan de verdad'}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="ides" />
          <nav className="docs-toc" aria-label={t('docpage.pageIndexAria')}>
            <div className="docs-toc-title">{t('docpage.onThisPage')}</div>
            {TOC_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`docs-toc-link${activeSection === item.id ? ' is-active' : ''}`}
                aria-current={activeSection === item.id ? 'location' : undefined}
                onClick={(e) => handleTocClick(e, item.id)}
              >
                <span className="docs-toc-emoji">{item.emoji}</span>
                <span className="docs-toc-label">{lang === 'en' ? item.en : item.es}</span>
              </a>
            ))}
          </nav>
        </aside>

        {lang === 'en' ? <IdesBodyEn /> : <IdesBodyEs />}
      </div>
    </div>
  )
}
