import { useEffect, useRef, useState } from 'react'

/**
 * Switch de modos del header. Reutilizable entre Chat / Editor / Loop Agéntico / Docs.
 * "AGENTS.md" y "Docs" son dropdowns. AGENTS.md tiene dos variantes: solo y con Skills.
 *
 * @param {string} active - "chat" | "editor" | "loop-agentico" | "agents-md" | "agents-md-skills" | "docs"
 */
export default function ModeSwitch({ active }) {
  const [docsOpen, setDocsOpen] = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const agentsDropdownRef = useRef(null)

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

  useEffect(() => {
    if (!agentsOpen) return
    const onDocClick = (e) => {
      if (agentsDropdownRef.current && !agentsDropdownRef.current.contains(e.target)) {
        setAgentsOpen(false)
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') setAgentsOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [agentsOpen])

  const cls = (mode) => `app-mode-btn${active === mode ? ' active' : ''}`
  const aria = (mode) => (active === mode ? { 'aria-current': 'page' } : {})
  const agentsActive = active === 'agents-md' || active === 'agents-md-skills'
  const agentsClsBase = `app-mode-btn${agentsActive ? ' active' : ''}`

  return (
    <div className="app-mode-switch">
      <a
        href="/"
        className={cls('chat')}
        {...aria('chat')}
        title="Chat directo a OpenAI / Claude. Mostrá los 3 modos de contexto: crudo, conversación y persistente."
      >
        💬 Chat
      </a>
      <a
        href="/editor"
        className={cls('editor')}
        {...aria('editor')}
        title="Editor de código + IA. Le pasás un fragmento y una instrucción, te devuelve código modificado. Con o sin contexto."
      >
        💻 Editor
      </a>
      <a
        href="/loop-agentico"
        className={cls('loop-agentico')}
        {...aria('loop-agentico')}
        title="Loop agéntico con tool-use. La IA decide qué herramientas usar (leer/editar el código) y ejecuta múltiples pasos sola."
      >
        🤖 Loop Agéntico
      </a>
      <div className="app-mode-dropdown" ref={agentsDropdownRef}>
        <button
          type="button"
          className={`${agentsClsBase} app-mode-dropdown-btn`}
          {...(agentsActive ? { 'aria-current': 'page' } : {})}
          onClick={() => setAgentsOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={agentsOpen}
          title="AGENTS.md: instrucciones persistentes que el agente sigue siempre. Elegí solo AGENTS.md o sumá Skills."
        >
          📋 AGENTS.md <span className="app-mode-dropdown-chev">{agentsOpen ? '▴' : '▾'}</span>
        </button>
        {agentsOpen && (
          <div className="app-mode-menu" role="menu">
            <a
              href="/agents-md"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('agents-md')}
            >
              <b>📋 Solo AGENTS.md</b>
              <span className="app-mode-menu-sub">reglas en el system prompt</span>
            </a>
            <a
              href="/agents-md-skills"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('agents-md-skills')}
            >
              <b>📋 AGENTS.md + 🧪 Skills</b>
              <span className="app-mode-menu-sub">suma load_skill / run_skill_test</span>
            </a>
          </div>
        )}
      </div>

      <div className="app-mode-dropdown app-mode-dropdown-divided" ref={dropdownRef}>
        <button
          type="button"
          className={`${cls('docs')} app-mode-dropdown-btn`}
          {...aria('docs')}
          onClick={() => setDocsOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={docsOpen}
          title="Material de la clase: resumen de los modos y anexos pedagógicos (contexto en vivo, OpenAI vs Claude, la API en argentino)."
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
            <div className="app-mode-menu-section">Anexos</div>
            <a href="/contexto" className="app-mode-menu-item" role="menuitem">
              <b>🧠 /contexto</b>
              <span className="app-mode-menu-sub">vista en vivo del array messages</span>
            </a>
            <a href="/proveedores" className="app-mode-menu-item" role="menuitem">
              <b>⚖️ /proveedores</b>
              <span className="app-mode-menu-sub">OpenAI vs Anthropic</span>
            </a>
            <a href="/criollo" className="app-mode-menu-item" role="menuitem">
              <b>🧉 /criollo</b>
              <span className="app-mode-menu-sub">la API en argentino</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
