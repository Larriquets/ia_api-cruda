import { useState, useEffect } from 'react'
import Brand from './Brand.jsx'
import { useT } from './i18n/useT.js'

const DISMISS_KEY = 'welcome_dismissed_v1'
// sessionStorage: cerrar el modal (aunque sea sin tildar "no volver a mostrar")
// alcanza para no verlo más en esta sesión — la navegación es full page load.
const SESSION_KEY = 'welcome_dismissed_session'

const STEPS = [
  { emoji: '💬', titleKey: 'welcome.chatTitle', descKey: 'welcome.chatDesc', href: '/chat' },
  { emoji: '💻', titleKey: 'welcome.editorTitle', descKey: 'welcome.editorDesc', href: '/editor' },
  { emoji: '🤖', titleKey: 'welcome.loopTitle', descKey: 'welcome.loopDesc', href: '/loop-agentico' },
  { emoji: '📋', titleKey: 'welcome.agentsTitle', descKey: 'welcome.agentsDesc', href: '/agents-md' },
  { emoji: '🧪', titleKey: 'welcome.skillsTitle', descKey: 'welcome.skillsDesc', href: '/agents-md-skills' },
]

export default function WelcomeModal() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === 'true'
        || sessionStorage.getItem(SESSION_KEY) === 'true'
      if (!dismissed) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dontShowAgain])

  const handleClose = () => {
    try { sessionStorage.setItem(SESSION_KEY, 'true') } catch { /* noop */ }
    if (dontShowAgain) {
      try { localStorage.setItem(DISMISS_KEY, 'true') } catch { /* noop */ }
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-modal">
        <div className="welcome-header">
          <h2 id="welcome-title">
            <img src="/logo.png" alt="" className="brand-logo" />
            <span className="brand-braces">{'{'}</span>
            <Brand />
            <span className="brand-braces">{'}'}</span>
            <span className="brand-subtitle">{t('welcome.subtitle')}</span>
          </h2>
          <button
            type="button"
            className="welcome-close"
            onClick={handleClose}
            aria-label={t('welcome.close')}
          >
            ×
          </button>
        </div>

        <p className="welcome-intro">
          {t('welcome.intro')}
        </p>

        <ol className="welcome-steps">
          {STEPS.map((step, i) => (
            <li key={step.href} className="welcome-step">
              <div className="welcome-step-num">{i + 1}</div>
              <div className="welcome-step-body">
                <div className="welcome-step-title">
                  <span className="welcome-step-emoji">{step.emoji}</span>
                  <b>{t(step.titleKey)}</b>
                </div>
                <div className="welcome-step-desc">{t(step.descKey)}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="welcome-footer">
          <label className="welcome-checkbox">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <span>{t('welcome.dontShow')}</span>
          </label>
          <button
            type="button"
            className="welcome-cta"
            onClick={handleClose}
          >
            {t('welcome.cta')}
          </button>
        </div>
      </div>
    </div>
  )
}
