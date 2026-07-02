import { useEffect, useRef, useState } from 'react'
import { useT } from './i18n/useT.js'
import LanguageToggle from './LanguageToggle.jsx'
import { PREGUNTAS } from './preguntas.js'
import { MODOS, LABS } from './taller.js'

/**
 * Switch de modos del header.
 * "Entender" (puerta 1: recorrido + tutos sin API, nombrados por pregunta),
 * "Modos", "Labs" (puerta 2) y "Docs" son dropdowns.
 *
 * @param {string} active - "entrada" | "chat" | "editor" | "loop-agentico" | "agents-md" | "agents-md-skills" | "ventana-contexto" | "prompt-injection" | "razonamiento" | "logprobs" | "mcp" | "ruido" | "rag" | "especificidad" | "docs"
 */
export default function ModeSwitch({ active }) {
  const { t } = useT()
  const [entenderOpen, setEntenderOpen] = useState(false)
  const [modesOpen, setModesOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [labOpen, setLabOpen] = useState(false)
  const entenderDropdownRef = useRef(null)
  const modesDropdownRef = useRef(null)
  const dropdownRef = useRef(null)
  const labDropdownRef = useRef(null)

  // Cierra el dropdown al hacer click afuera.
  useEffect(() => {
    if (!entenderOpen) return
    const onDocClick = (e) => {
      if (entenderDropdownRef.current && !entenderDropdownRef.current.contains(e.target)) {
        setEntenderOpen(false)
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') setEntenderOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [entenderOpen])

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
  const activeMode = MODOS.find((mode) => mode.key === active)
  const modesActive = Boolean(activeMode)
  const modesClsBase = `app-mode-btn${modesActive ? ' active' : ''}`
  const modesButtonLabel = modesActive ? `${activeMode.emoji} ${t(activeMode.labelKey)}` : t('modeswitch.modesBtn')
  const labActive = LABS.some((lab) => lab.key === active)
  const labClsBase = `app-mode-btn${labActive ? ' active' : ''}`

  return (
    <div className="app-mode-switch">
      <span className="app-mode-switch-label" aria-hidden="true">{t('modeswitch.label')}</span>
      <div className="app-mode-dropdown" ref={entenderDropdownRef}>
        <button
          type="button"
          className="app-mode-btn app-mode-dropdown-btn"
          onClick={() => setEntenderOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={entenderOpen}
          title={t('modeswitch.entenderTitle')}
        >
          {t('modeswitch.entenderBtn')} <span className="app-mode-dropdown-chev">{entenderOpen ? '▴' : '▾'}</span>
        </button>
        {entenderOpen && (
          <div className="app-mode-menu" role="menu">
            <a href="/recorrido" className="app-mode-menu-item" role="menuitem">
              <b>{t('modeswitch.recorridoLabel')}</b>
              <span className="app-mode-menu-sub">{t('modeswitch.recorridoSub')}</span>
            </a>
            <div className="app-mode-menu-divider" />
            <div className="app-mode-menu-section">{t('modeswitch.entenderSection')}</div>
            {PREGUNTAS.map((q) => (
              <a key={q.href} href={q.href} className="app-mode-menu-item" role="menuitem">
                <b>{q.emoji} {t(q.labelKey)}</b>
                <span className="app-mode-menu-sub">{t(q.subKey)}</span>
              </a>
            ))}
          </div>
        )}
      </div>
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
            {MODOS.map((mode) => (
              <a
                key={mode.key}
                href={mode.href}
                className="app-mode-menu-item"
                role="menuitem"
                title={t(mode.titleKey)}
                {...aria(mode.key)}
              >
                <b>{mode.emoji} {t(mode.labelKey)}</b>
                <span className="app-mode-menu-sub">{t(mode.subKey)}</span>
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
            {LABS.map((lab) => (
              <a
                key={lab.key}
                href={lab.href}
                className="app-mode-menu-item"
                role="menuitem"
                {...aria(lab.key)}
              >
                <b>{lab.emoji} {t(lab.labelKey)}</b>
                <span className="app-mode-menu-sub">{t(lab.subKey)}</span>
              </a>
            ))}
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
