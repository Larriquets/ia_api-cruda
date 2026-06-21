import { useEffect, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import SpeechReader from './SpeechReader.jsx'
import { useT } from './i18n/useT.js'
import { RecorridoBodyEs, RecorridoBodyEn } from './content/RecorridoBody.jsx'

// Recorrido guiado para profesionales NO técnicos: encadena los conceptos
// clave (predictor, tokens, memoria, ventana, especificidad, ruido) con
// metáforas y un botón "probalo de verdad" hacia cada lab real. La prosa vive
// en content/RecorridoBody.jsx; acá solo el andamiaje (TOC + header), igual
// que ComoFunciona.jsx.

const TOC_ITEMS = [
  { id: 'intro',     emoji: '🎯', es: 'Antes de empezar',       en: 'Before we start' },
  { id: 'predictor', emoji: '🔮', es: '1) Adivina la palabra',   en: '1) Guesses the word' },
  { id: 'tokens',    emoji: '🧩', es: '2) Lee pedacitos',        en: '2) Reads chunks' },
  { id: 'memoria',   emoji: '✉️', es: '3) No te recuerda',       en: "3) No memory" },
  { id: 'ventana',   emoji: '🧹', es: '4) Escritorio finito',    en: '4) A finite desk' },
  { id: 'pedido',    emoji: '🎯', es: '5) Lee tu pedido',        en: '5) Reads your request' },
  { id: 'ruido',     emoji: '🗑️', es: '6) Basura entra, sale',   en: '6) Garbage in, out' },
  { id: 'llevar',    emoji: '✅', es: 'Qué llevarte',            en: 'What to take away' },
]

export default function Recorrido() {
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
          /recorrido
          <span className="docs-header-subtitle">{lang === 'en' ? 'AI for non-programmers, in 6 stops' : 'la IA para no programadores, en 6 paradas'}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="recorrido" />
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

        {lang === 'en' ? <RecorridoBodyEn /> : <RecorridoBodyEs />}
      </div>
    </div>
  )
}
