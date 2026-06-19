import { useEffect, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'
import { DocsBodyEs, DocsBodyEn } from './content/DocsBody.jsx'

const TOC_ITEMS = [
  { id: 'api-es-todo',     emoji: '🌐', label: 'Toda IA es API',          en: 'All AI is API' },
  { id: 'recien-nacida',   emoji: '🧠', label: 'IA recién nacida',        en: 'Newborn AI' },
  {
    id: 'de-que-se-trata', emoji: '📦', label: 'Modos', en: 'Modes',
    children: [
      { id: 'modo-chat',     emoji: '💬', label: '1) Chat',           en: '1) Chat' },
      { id: 'modo-editor',   emoji: '💻', label: '2) Editor',         en: '2) Editor' },
      { id: 'modo-loop',     emoji: '🤖', label: '3) Loop Agéntico',  en: '3) Agentic Loop' },
      { id: 'modo-agentsmd', emoji: '📋', label: '4) AGENTS.md',      en: '4) AGENTS.md' },
      { id: 'modo-skills',   emoji: '✨', label: '5) Skills',         en: '5) Skills' },
    ],
  },
  { id: 'controles',       emoji: '🎛', label: 'Controles del request', en: 'Request controls' },
  {
    id: 'labs', emoji: '🧪', label: 'Labs', en: 'Labs', headerOnly: true,
    children: [
      { id: 'modo-ventana',      emoji: '🪟', label: '6) Ventana de contexto', en: '6) Context window' },
      { id: 'modo-injection',    emoji: '🛡', label: '7) Prompt injection',    en: '7) Prompt injection' },
      { id: 'modo-razonamiento', emoji: '🧠', label: '8) Razonamiento',        en: '8) Reasoning' },
    ],
  },
  { id: 'vs-agentes',      emoji: '🛠️', label: 'vs Cursor / CC / Codex', en: 'vs Cursor / CC / Codex' },
  { id: 'glosario',        emoji: '📖', label: 'Glosario',                en: 'Glossary' },
]

const flattenToc = (items) =>
  items.flatMap((item) => [
    ...(item.headerOnly ? [] : [item]),
    ...(item.children ? flattenToc(item.children) : []),
  ])
const TOC_FLAT = flattenToc(TOC_ITEMS)

const childIdsOf = (item) =>
  item.children?.flatMap((child) => [child.id, ...(child.children ? childIdsOf(child) : [])]) ?? []

const renderTocItem = (item, depth, activeSection, onClick, openGroups, onToggleGroup, lang) => {
  const childClass = depth === 0 ? '' : ' docs-toc-link-child'
  const activeClass = activeSection === item.id ? ' is-active' : ''
  const labelNode = (
    <>
      <span className="docs-toc-emoji">{item.emoji}</span>
      <span className="docs-toc-label">{lang === 'en' ? (item.en ?? item.label) : item.label}</span>
    </>
  )
  const hasChildren = !!item.children?.length
  const isOpen = hasChildren ? openGroups[item.id] !== false : true
  const chevron = hasChildren ? (
    <span className={`docs-toc-chev${isOpen ? ' is-open' : ''}`} aria-hidden="true">▸</span>
  ) : null

  return (
    <div key={item.id} className="docs-toc-group">
      {item.headerOnly ? (
        <button
          type="button"
          className={`docs-toc-link docs-toc-link-header docs-toc-toggle${childClass}`}
          aria-expanded={isOpen}
          onClick={() => onToggleGroup(item.id)}
        >
          {chevron}
          {labelNode}
        </button>
      ) : hasChildren ? (
        <div className="docs-toc-row">
          <a
            href={`#${item.id}`}
            className={`docs-toc-link${childClass}${activeClass}`}
            aria-current={activeSection === item.id ? 'location' : undefined}
            onClick={(event) => onClick(event, item.id)}
          >
            {labelNode}
          </a>
          <button
            type="button"
            className="docs-toc-chev-btn"
            aria-label={isOpen ? (lang === 'en' ? 'Collapse' : 'Colapsar') : (lang === 'en' ? 'Expand' : 'Expandir')}
            aria-expanded={isOpen}
            onClick={() => onToggleGroup(item.id)}
          >
            {chevron}
          </button>
        </div>
      ) : (
        <a
          href={`#${item.id}`}
          className={`docs-toc-link${childClass}${activeClass}`}
          aria-current={activeSection === item.id ? 'location' : undefined}
          onClick={(event) => onClick(event, item.id)}
        >
          {labelNode}
        </a>
      )}
      {hasChildren && isOpen && (
        <div className="docs-toc-children">
          {item.children.map((child) =>
            renderTocItem(child, depth + 1, activeSection, onClick, openGroups, onToggleGroup, lang),
          )}
        </div>
      )}
    </div>
  )
}

// Mapa { childId -> parentId } para los grupos plegables.
// Sirve para auto-abrir el grupo cuando una de sus subsecciones se activa.
const PARENT_OF = (() => {
  const map = {}
  for (const item of TOC_ITEMS) {
    if (item.children) for (const id of childIdsOf(item)) map[id] = item.id
  }
  return map
})()

export default function Docs() {
  const { t, lang } = useT()
  const [activeSection, setActiveSection] = useState(TOC_FLAT[0].id)
  const [openGroups, setOpenGroups] = useState({})

  const handleToggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: prev[id] === false }))
  }

  const ensureGroupOpen = (childId) => {
    const parent = PARENT_OF[childId]
    if (!parent) return
    setOpenGroups((prev) => (prev[parent] === false ? { ...prev, [parent]: true } : prev))
  }

  useEffect(() => {
    const sectionIds = TOC_FLAT.map((item) => item.id)

    const openSection = (id) => {
      const section = document.getElementById(id)
      const details = section?.querySelector(':scope > details')
      if (details) details.open = true
      return section
    }

    // Hash inicial — viene de un link externo tipo /docs#modo-editor.
    // Hay que abrir el <details> de esa sección ANTES de scrollear, sino
    // el navegador no puede llegar (sección colapsada = sin altura).
    const initialHashId = window.location.hash.replace('#', '')
    const initialId = sectionIds.includes(initialHashId) ? initialHashId : TOC_FLAT[0].id
    setActiveSection(initialId)
    ensureGroupOpen(initialId)
    const initialSection = openSection(initialId)

    // Si vinimos con hash, forzamos scroll después de que el browser
    // reflow-eó la apertura del <details>. Dos rAF + el container scrollable
    // de docs (.criollo-content), porque scrollIntoView del default puede
    // chocar con el header sticky.
    if (initialHashId && initialSection) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          initialSection.scrollIntoView({ behavior: 'auto', block: 'start' })
        })
      })
    }

    const handleHashChange = () => {
      const id = window.location.hash.replace('#', '')
      if (!sectionIds.includes(id)) return
      setActiveSection(id)
      ensureGroupOpen(id)
      const section = openSection(id)
      requestAnimationFrame(() => {
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id)
          ensureGroupOpen(visibleEntry.target.id)
        }
      },
      {
        rootMargin: '-18% 0px -65% 0px',
        threshold: [0, 0.1, 0.25],
      }
    )

    // Conectamos el observer recién después del scroll inicial, así no
    // pisa el activeSection que setamos a partir del hash.
    const observerDelay = setTimeout(() => {
      sectionIds.forEach((id) => {
        const section = document.getElementById(id)
        if (section) observer.observe(section)
      })
    }, initialHashId ? 600 : 0)

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      clearTimeout(observerDelay)
      observer.disconnect()
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const handleTocClick = (event, id) => {
    event.preventDefault()
    const section = document.getElementById(id)
    const details = section?.querySelector(':scope > details')

    if (details) details.open = true
    setActiveSection(id)
    ensureGroupOpen(id)
    window.history.pushState(null, '', `#${id}`)
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /docs
          <span className="docs-header-subtitle">{lang === 'en' ? 'what each app mode does' : 'qué hace cada modo de la app'}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">

        {/* ============== SIDEBAR (sticky) ============== */}
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <DocsNav current="docs" />
          <nav className="docs-toc" aria-label={t('docpage.pageIndexAria')}>
            <div className="docs-toc-title">{t('docpage.onThisPage')}</div>
            {TOC_ITEMS.map((item) =>
              renderTocItem(item, 0, activeSection, handleTocClick, openGroups, handleToggleGroup, lang),
            )}
          </nav>
        </aside>

        {lang === 'en' ? <DocsBodyEn /> : <DocsBodyEs />}
      </div>
    </div>
  )
}
