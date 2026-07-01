import { useEffect, useRef, useState } from 'react'
import { useT } from './i18n/useT.js'
import LanguageToggle from './LanguageToggle.jsx'

/**
 * Switch de modos del header.
 * "Modos", "Labs" y "Docs" son dropdowns.
 *
 * @param {string} active - "chat" | "editor" | "loop-agentico" | "agents-md" | "agents-md-skills" | "ventana-contexto" | "prompt-injection" | "razonamiento" | "logprobs" | "mcp" | "ruido" | "rag" | "especificidad" | "docs"
 */
export default function ModeSwitch({ active }) {
  const { t } = useT()
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
      label: t('modeswitch.chatLabel'),
      desc: t('modeswitch.chatDesc'),
      title: t('modeswitch.chatTitle'),
    },
    {
      key: 'editor',
      href: '/editor',
      label: t('modeswitch.editorLabel'),
      desc: t('modeswitch.editorDesc'),
      title: t('modeswitch.editorTitle'),
    },
    {
      key: 'loop-agentico',
      href: '/loop-agentico',
      label: t('modeswitch.loopLabel'),
      desc: t('modeswitch.loopDesc'),
      title: t('modeswitch.loopTitle'),
    },
    {
      key: 'agents-md',
      href: '/agents-md',
      label: t('modeswitch.agentsLabel'),
      desc: t('modeswitch.agentsDesc'),
      title: t('modeswitch.agentsTitle'),
    },
    {
      key: 'agents-md-skills',
      href: '/agents-md-skills',
      label: t('modeswitch.skillsLabel'),
      desc: t('modeswitch.skillsDesc'),
      title: t('modeswitch.skillsTitle'),
    },
  ]
  const activeMode = modes.find((mode) => mode.key === active) || modes[0]
  const modesActive = modes.some((mode) => mode.key === active)
  const modesClsBase = `app-mode-btn${modesActive ? ' active' : ''}`
  const modesButtonLabel = modesActive ? activeMode.label : t('modeswitch.modesBtn')
  const labActive = active === 'ventana-contexto' || active === 'prompt-injection' || active === 'razonamiento' || active === 'logprobs' || active === 'tokens' || active === 'mcp' || active === 'ruido' || active === 'rag' || active === 'especificidad'
  const labClsBase = `app-mode-btn${labActive ? ' active' : ''}`

  return (
    <div className="app-mode-switch">
      <span className="app-mode-switch-label" aria-hidden="true">{t('modeswitch.label')}</span>
      <div className="app-mode-dropdown" ref={modesDropdownRef}>
        <button
          type="button"
          className={`${modesClsBase} app-mode-dropdown-btn`}
          {...(modesActive ? { 'aria-current': 'page' } : {})}
          onClick={() => setModesOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={modesOpen}
          title={t('modeswitch.modesTitle')}
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
          title={t('modeswitch.labsTitle')}
        >
          {t('modeswitch.labsBtn')} <span className="app-mode-dropdown-chev">{labOpen ? '▴' : '▾'}</span>
        </button>
        {labOpen && (
          <div className="app-mode-menu" role="menu">
            <a
              href="/razonamiento"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('razonamiento')}
            >
              <b>{t('modeswitch.razonLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.razonDesc')}</span>
            </a>
            <a
              href="/tokens"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('tokens')}
            >
              <b>{t('modeswitch.tokensLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.tokensDesc')}</span>
            </a>
            <a
              href="/logprobs"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('logprobs')}
            >
              <b>{t('modeswitch.logprobsLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.logprobsDesc')}</span>
            </a>
            <a
              href="/mcp"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('mcp')}
            >
              <b>{t('modeswitch.mcpLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.mcpDesc')}</span>
            </a>
            <a
              href="/ventana-contexto"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('ventana-contexto')}
            >
              <b>{t('modeswitch.ctxwinLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.ctxwinDesc')}</span>
            </a>
            <a
              href="/rag"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('rag')}
            >
              <b>{t('modeswitch.ragLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.ragDesc')}</span>
            </a>
            <a
              href="/ruido"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('ruido')}
            >
              <b>{t('modeswitch.ruidoLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.ruidoDesc')}</span>
            </a>
            <a
              href="/especificidad"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('especificidad')}
            >
              <b>{t('modeswitch.especLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.especDesc')}</span>
            </a>
            <a
              href="/prompt-injection"
              className="app-mode-menu-item"
              role="menuitem"
              {...aria('prompt-injection')}
            >
              <b>{t('modeswitch.piLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.piDesc')}</span>
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
          title={t('modeswitch.docsTitle')}
        >
          {t('modeswitch.docsBtn')} <span className="app-mode-dropdown-chev">{docsOpen ? '▴' : '▾'}</span>
        </button>
        {docsOpen && (
          <div className="app-mode-menu" role="menu">
            <a href="/docs" className="app-mode-menu-item" role="menuitem">
              <b>{t('modeswitch.docsMain')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.docsMainSub')}</span>
            </a>
            <div className="app-mode-menu-divider" />
            <div className="app-mode-menu-section">{t('modeswitch.annexes')}</div>
            <a href="/recorrido" className="app-mode-menu-item" role="menuitem">
              <b>{t('modeswitch.recorridoLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.recorridoSub')}</span>
            </a>
            <a href="/como-funciona" className="app-mode-menu-item" role="menuitem">
              <b>{t('modeswitch.comoFuncLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.comoFuncSub')}</span>
            </a>
            <a href="/contexto" className="app-mode-menu-item" role="menuitem">
              <b>{t('modeswitch.contextoLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.contextoSub')}</span>
            </a>
            <a href="/proveedores" className="app-mode-menu-item" role="menuitem">
              <b>{t('modeswitch.provLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.provSub')}</span>
            </a>
          </div>
        )}
      </div>

      <LanguageToggle />
    </div>
  )
}
