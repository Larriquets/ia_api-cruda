import { useEffect, useRef, useState } from 'react'

/**
 * Switch de modos del header. Reutilizable entre Chat / Editor / Agente / Docs.
 * "Docs" es un dropdown con submenú a las páginas auxiliares.
 *
 * @param {string} active - "chat" | "editor" | "agente" | "docs"
 */
export default function ModeSwitch({ active }) {
  const [docsOpen, setDocsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Cierra el dropdown al hacer click afuera.
  useEffect(() => {
    if (!docsOpen) return
    const onDocClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDocsOpen(false)
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') setDocsOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [docsOpen])

  const cls = (mode) => `app-mode-btn${active === mode ? ' active' : ''}`
  const aria = (mode) => (active === mode ? { 'aria-current': 'page' } : {})

  return (
    <div className="app-mode-switch">
      <a href="/" className={cls('chat')} {...aria('chat')}>💬 Chat</a>
      <a href="/editor" className={cls('editor')} {...aria('editor')}>💻 Editor</a>
      <a href="/editor-agente" className={cls('agente')} {...aria('agente')}>🤖 Agente</a>
      <a href="/agents-md" className={cls('agents-md')} {...aria('agents-md')}>📋 AGENTS.md</a>

      <div className="app-mode-dropdown" ref={dropdownRef}>
        <button
          type="button"
          className={`${cls('docs')} app-mode-dropdown-btn`}
          {...aria('docs')}
          onClick={() => setDocsOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={docsOpen}
        >
          📚 Docs <span className="app-mode-dropdown-chev">{docsOpen ? '▴' : '▾'}</span>
        </button>
        {docsOpen && (
          <div className="app-mode-menu" role="menu">
            <a href="/docs" className="app-mode-menu-item" role="menuitem">
              <b>📚 Docs principal</b>
              <span className="app-mode-menu-sub">resumen de los 3 modos</span>
            </a>
            <div className="app-mode-menu-divider" />
            <a href="/contexto" target="_blank" rel="noreferrer" className="app-mode-menu-item" role="menuitem">
              <b>🧠 /contexto</b>
              <span className="app-mode-menu-sub">vista en vivo del array messages</span>
            </a>
            <a href="/proveedores" target="_blank" rel="noreferrer" className="app-mode-menu-item" role="menuitem">
              <b>⚖️ /proveedores</b>
              <span className="app-mode-menu-sub">OpenAI vs Anthropic</span>
            </a>
            <a href="/criollo" target="_blank" rel="noreferrer" className="app-mode-menu-item" role="menuitem">
              <b>🧉 /criollo</b>
              <span className="app-mode-menu-sub">la API en argentino</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
