import { useState, useEffect } from 'react'

const DISMISS_KEY = 'welcome_dismissed_v1'

const STEPS = [
  {
    emoji: '💬',
    title: 'Chat',
    desc: 'Chat directo a OpenAI / Claude. Mostrá los 3 modos de contexto: crudo, conversación y persistente.',
    href: '/',
  },
  {
    emoji: '💻',
    title: 'Editor',
    desc: 'Editor de código + IA. Le pasás un fragmento y una instrucción, te devuelve código modificado. Con o sin contexto.',
    href: '/editor',
  },
  {
    emoji: '🤖',
    title: 'Loop Agéntico',
    desc: 'Loop con tool-use. La IA decide qué herramientas usar (leer/editar el código) y ejecuta múltiples pasos sola.',
    href: '/loop-agentico',
  },
  {
    emoji: '📋',
    title: 'AGENTS.md',
    desc: 'Instrucciones persistentes que el agente sigue siempre (estilo, restricciones, convenciones del proyecto).',
    href: '/agents-md',
    subSteps: [
      {
        emoji: '🧪',
        title: 'Skills',
        desc: 'Sub-tema de AGENTS.md. Una vez que entendés cómo funciona AGENTS.md, probá los Skills: instrucciones cargadas bajo demanda + un test determinístico que la IA corre después de editar.',
      },
    ],
  },
]

export default function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === 'true'
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
            <span className="brand">API a la vista</span>
            <span className="brand-subtitle">— request, response y contexto, todo crudo</span>
          </h2>
          <button
            type="button"
            className="welcome-close"
            onClick={handleClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <p className="welcome-intro">
          Esta app no esconde nada: ves el JSON que sale, el JSON que vuelve, y cómo se acumula el
          contexto entre llamadas. Tiene 4 modos — cada uno muestra una capa distinta de cómo se
          trabaja con la API de un LLM. Recorrelos en orden.
        </p>

        <ol className="welcome-steps">
          {STEPS.map((step, i) => (
            <li key={step.href} className="welcome-step">
              <div className="welcome-step-num">{i + 1}</div>
              <div className="welcome-step-body">
                <div className="welcome-step-title">
                  <span className="welcome-step-emoji">{step.emoji}</span>
                  <b>{step.title}</b>
                </div>
                <div className="welcome-step-desc">{step.desc}</div>
                {step.subSteps && (
                  <ul className="welcome-substeps">
                    {step.subSteps.map((sub) => (
                      <li key={sub.title} className="welcome-substep">
                        <span className="welcome-substep-emoji">{sub.emoji}</span>
                        <div>
                          <b>{sub.title}</b>
                          <div className="welcome-step-desc">{sub.desc}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
            <span>No volver a mostrar</span>
          </label>
          <button
            type="button"
            className="welcome-cta"
            onClick={handleClose}
          >
            Empezar →
          </button>
        </div>
      </div>
    </div>
  )
}
