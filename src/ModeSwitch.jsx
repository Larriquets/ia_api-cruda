import { useEffect, useRef, useState } from 'react'

/**
 * Switch de modos del header. Reutilizable entre Chat / Editor / Loop Agéntico / Docs.
 * "Agente + reglas" y "Docs" son dropdowns. El primero tiene dos variantes: solo reglas o con Skills.
 *
 * @param {string} active - "chat" | "editor" | "loop-agentico" | "agents-md" | "agents-md-skills" | "ventana-contexto" | "prompt-injection" | "razonamiento" | "docs"
 */
export default function ModeSwitch({ active }) {
  const [docsOpen, setDocsOpen] = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const [labOpen, setLabOpen] = useState(false)
  const dropdownRef = useRef(null)
  const agentsDropdownRef = useRef(null)
  const labDropdownRef = useRef(null)

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

  useEffect(() => {
    if (!labOpen) return
    const onDocClick = (e) => {
      if (labDropdownRef.current && !labDropdownRef.current.contains(e.target)) {
        setLabOpen(false)
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') setLabOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [labOpen])

  const cls = (mode) => `app-mode-btn${active === mode ? ' active' : ''}`
  const aria = (mode) => (active === mode ? { 'aria-current': 'page' } : {})
  const agentsActive = active === 'agents-md' || active === 'agents-md-skills'
  const agentsClsBase = `app-mode-btn${agentsActive ? ' active' : ''}`
  const labActive = active === 'ventana-contexto' || active === 'prompt-injection' || active === 'razonamiento'
  const labClsBase = `app-mode-btn${labActive ? ' active' : ''}`

  return (
    <div className="app-mode-switch">
      <span className="app-mode-switch-label" aria-hidden="true">MODO:</span>
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
          title="Agente con reglas persistentes (AGENTS.md) inyectadas al system prompt. Elegí solo reglas o sumá Skills."
        >
          📋 Agente + reglas <span className="app-mode-dropdown-chev">{agentsOpen ? '▴' : '▾'}</span>
        </button>
        {agentsOpen && (
          <div className="app-mode-menu" role="menu">
            <a
              href="/agents-md"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('agents-md')}
            >
              <b>📋 Agente + reglas</b>
              <span className="app-mode-menu-sub">AGENTS.md en el system prompt</span>
            </a>
            <a
              href="/agents-md-skills"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('agents-md-skills')}
            >
              <b>📋 Agente + 🧪 skills</b>
              <span className="app-mode-menu-sub">suma load_skill / run_skill_test</span>
            </a>
          </div>
        )}
      </div>

      <div className="app-mode-dropdown" ref={labDropdownRef}>
        <button
          type="button"
          className={`${labClsBase} app-mode-dropdown-btn`}
          {...(labActive ? { 'aria-current': 'page' } : {})}
          onClick={() => setLabOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={labOpen}
          title="Experimentos pedagógicos sueltos: cosas que aíslan un concepto puntual de la API."
        >
          🧪 Labs <span className="app-mode-dropdown-chev">{labOpen ? '▴' : '▾'}</span>
        </button>
        {labOpen && (
          <div className="app-mode-menu" role="menu">
            <a
              href="/razonamiento"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('razonamiento')}
            >
              <b>🧠 Razonamiento</b>
              <span className="app-mode-menu-sub">modelos que "piensan" antes de responder</span>
            </a>
            <a
              href="/ventana-contexto"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('ventana-contexto')}
            >
              <b>🪟 Ventana de contexto</b>
              <span className="app-mode-menu-sub">FIFO / window / compaction en vivo</span>
            </a>
            <a
              href="/prompt-injection"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('prompt-injection')}
            >
              <b>🛡 Prompt injection</b>
              <span className="app-mode-menu-sub">system vs datos no confiables</span>
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
            <a href="/como-funciona" className="app-mode-menu-item" role="menuitem">
              <b>⚙️ /como-funciona</b>
              <span className="app-mode-menu-sub">system / context / tools en el POST</span>
            </a>
            <a href="/modos-editor" className="app-mode-menu-item" role="menuitem">
              <b>🎬 /modos-editor</b>
              <span className="app-mode-menu-sub">sin contexto vs con contexto, animado</span>
            </a>
            <a href="/contexto" className="app-mode-menu-item" role="menuitem">
              <b>🧠 /contexto</b>
              <span className="app-mode-menu-sub">vista en vivo del array messages</span>
            </a>
            <a href="/proveedores" className="app-mode-menu-item" role="menuitem">
              <b>⚖️ /proveedores</b>
              <span className="app-mode-menu-sub">OpenAI vs Anthropic</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
