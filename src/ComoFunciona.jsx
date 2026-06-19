import { useEffect, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'
import { ComoFuncionaBodyEs, ComoFuncionaBodyEn } from './content/ComoFuncionaBody.jsx'

const TOC_ITEMS = [
  { id: 'tesis',          emoji: '🎯', es: 'La tesis',                    en: 'The thesis' },
  { id: 'tres-piezas',    emoji: '🧩', es: 'Tres piezas en cada POST',    en: 'Three pieces in every POST' },
  { id: 'system',         emoji: '🧠', es: '1) System prompt',            en: '1) System prompt' },
  { id: 'context',        emoji: '💬', es: '2) Context (messages[])',     en: '2) Context (messages[])' },
  { id: 'tools',          emoji: '🛠️', es: '3) Tools (code)',             en: '3) Tools (code)' },
  { id: 'prompt-front',   emoji: '⌨️', es: 'El prompt del front',         en: 'The front-end prompt' },
  { id: 'donde-vive',     emoji: '📦', es: 'Dónde vive cada cosa',        en: 'Where each thing lives' },
  { id: 'flujos',         emoji: '🔁', es: 'Tres flujos completos',       en: 'Three complete flows' },
  { id: 'reglas',         emoji: '📌', es: 'Reglas que aplican siempre',  en: 'Rules that always apply' },
]

export default function ComoFunciona() {
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
          /como-funciona
          <span className="docs-header-subtitle">{lang === 'en' ? 'system / context / tools in the POST' : 'system / context / tools en el POST'}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <DocsNav current="como-funciona" />
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

        {lang === 'en' ? <ComoFuncionaBodyEn /> : <ComoFuncionaBodyEs />}
      </div>
    </div>
  )
}
