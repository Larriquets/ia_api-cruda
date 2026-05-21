import { useEffect, useRef, useState } from 'react'

/**
 * Switch de modos del header.
 * "Modos", "Labs" y "Docs" son dropdowns.
 *
 * @param {string} active - "chat" | "editor" | "loop-agentico" | "agents-md" | "agents-md-skills" | "ventana-contexto" | "prompt-injection" | "razonamiento" | "docs"
 */
export default function ModeSwitch({ active }) {
  const [modesOpen, setModesOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [labOpen, setLabOpen] = useState(false)
  const modesDropdownRef = useRef(null)
  const dropdownRef = useRef(null)
  const labDropdownRef = useRef(null)

  // Cierra el dropdown al hacer click afuera.
  useEffect(() => {
    if (!modesOpen) return
    const onDocClick = (e) => {
      if (modesDropdownRef.current && !modesDropdownRef.current.contains(e.target)) {
        setModesOpen(false)
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') setModesOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [modesOpen])

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
  const modes = [
    {
      key: 'chat',
      href: '/',
      label: '💬 Chat',
      desc: 'contexto crudo, conversación y persistente',
      title: 'Chat directo a OpenAI / Claude. Mostrá los 3 modos de contexto: crudo, conversación y persistente.',
    },
    {
      key: 'editor',
      href: '/editor',
      label: '💻 Editor',
      desc: 'código como contexto, con o sin historial',
      title: 'Editor de código + IA. Le pasás un fragmento y una instrucción, te devuelve código modificado. Con o sin contexto.',
    },
    {
      key: 'loop-agentico',
      href: '/loop-agentico',
      label: '🤖 Loop Agéntico',
      desc: 'tool-use para leer y editar código',
      title: 'Loop agéntico con tool-use. La IA decide qué herramientas usar (leer/editar el código) y ejecuta múltiples pasos sola.',
    },
    {
      key: 'agents-md',
      href: '/agents-md',
      label: '📋 Agente + reglas',
      desc: 'AGENTS.md inyectado al system prompt',
      title: 'Agente con reglas persistentes (AGENTS.md) inyectadas al system prompt.',
    },
    {
      key: 'agents-md-skills',
      href: '/agents-md-skills',
      label: '📋 Agente + 🧪 skills',
      desc: 'reglas persistentes más herramientas tipo skill',
      title: 'Agente con reglas persistentes y Skills disponibles como herramientas.',
    },
  ]
  const activeMode = modes.find((mode) => mode.key === active) || modes[0]
  const modesActive = modes.some((mode) => mode.key === active)
  const modesClsBase = `app-mode-btn${modesActive ? ' active' : ''}`
  const modesButtonLabel = modesActive ? activeMode.label : '🎛️ Modos'
  const labActive = active === 'ventana-contexto' || active === 'prompt-injection' || active === 'razonamiento'
  const labClsBase = `app-mode-btn${labActive ? ' active' : ''}`

  return (
    <div className="app-mode-switch">
      <span className="app-mode-switch-label" aria-hidden="true">MODO:</span>
      <div className="app-mode-dropdown" ref={modesDropdownRef}>
        <button
          type="button"
          className={`${modesClsBase} app-mode-dropdown-btn`}
          {...(modesActive ? { 'aria-current': 'page' } : {})}
          onClick={() => setModesOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={modesOpen}
          title="Modos principales de la app: Chat, Editor y Loop Agéntico."
        >
          {modesButtonLabel} <span className="app-mode-dropdown-chev">{modesOpen ? '▴' : '▾'}</span>
        </button>
        {modesOpen && (
          <div className="app-mode-menu" role="menu">
            {modes.map((mode) => (
              <a
                key={mode.key}
                href={mode.href}
                className="app-mode-menu-item"
                role="menuitem"
                title={mode.title}
                {...aria(mode.key)}
              >
                <b>{mode.label}</b>
                <span className="app-mode-menu-sub">{mode.desc}</span>
              </a>
            ))}
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
