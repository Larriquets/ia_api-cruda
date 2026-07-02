import Brand from './Brand.jsx'
import ModeSwitch from './ModeSwitch.jsx'
import { PREGUNTAS } from './preguntas.js'
import { useT } from './i18n/useT.js'

// Landing de dos puertas (`/`): la misma app, dos profundidades.
// Puerta 1 → recorrido guiado + demos sin API, nombradas por la pregunta
// humana (no por la tecnología). Puerta 2 → los modos y labs reales, con
// keys y JSON crudo. Cada puerta linkea a la otra: la separación es una
// escalera a la vista, no un muro.

const TALLER = [
  { emoji: '💻', href: '/editor', labelKey: 'entrada.tEditorLabel', subKey: 'entrada.tEditorSub' },
  { emoji: '🤖', href: '/loop-agentico', labelKey: 'entrada.tLoopLabel', subKey: 'entrada.tLoopSub' },
  { emoji: '🪟', href: '/ventana-contexto', labelKey: 'entrada.tCtxwinLabel', subKey: 'entrada.tCtxwinSub' },
  { emoji: '🎲', href: '/logprobs', labelKey: 'entrada.tLogprobsLabel', subKey: 'entrada.tLogprobsSub' },
  { emoji: '🔌', href: '/mcp', labelKey: 'entrada.tMcpLabel', subKey: 'entrada.tMcpSub' },
  { emoji: '📚', href: '/docs', labelKey: 'entrada.tDocsLabel', subKey: 'entrada.tDocsSub' },
]

export default function Entrada() {
  const { t } = useT()
  return (
    <div className="entrada">
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label={t('entrada.brandHome')}>
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <Brand />
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">{t('entrada.subtitle')}</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="entrada" />
        </div>
      </header>

      <main className="entrada-main">
        <section className="entrada-hero">
          <h2>{t('entrada.heroTitle')}</h2>
          <p>{t('entrada.heroSub')}</p>
        </section>

        <div className="entrada-doors">
          <section className="entrada-door entrada-door-entender" aria-labelledby="door-entender">
            <div className="entrada-door-kicker">{t('entrada.door1Kicker')}</div>
            <h3 id="door-entender">{t('entrada.door1Title')}</h3>
            <p className="entrada-door-desc">{t('entrada.door1Desc')}</p>
            <a href="/recorrido" className="try-mode-cta-btn entrada-door-cta">
              <span className="try-mode-cta-emoji">🧭</span>
              <span>{t('entrada.door1Cta')}</span>
              <span className="try-mode-cta-arrow">→</span>
            </a>
            <div className="entrada-door-alt">{t('entrada.door1Alt')}</div>
            <ul className="entrada-links">
              {PREGUNTAS.map((q) => (
                <li key={q.href}>
                  <a href={q.href} className="entrada-link">
                    <span className="entrada-link-emoji">{q.emoji}</span>
                    <span className="entrada-link-body">
                      <b>{t(q.labelKey)}</b>
                      <span className="entrada-link-sub">{t(q.subKey)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="entrada-door entrada-door-taller" aria-labelledby="door-taller">
            <div className="entrada-door-kicker">{t('entrada.door2Kicker')}</div>
            <h3 id="door-taller">{t('entrada.door2Title')}</h3>
            <p className="entrada-door-desc">{t('entrada.door2Desc')}</p>
            <a href="/chat" className="try-mode-cta-btn entrada-door-cta">
              <span className="try-mode-cta-emoji">💬</span>
              <span>{t('entrada.door2Cta')}</span>
              <span className="try-mode-cta-arrow">→</span>
            </a>
            <div className="entrada-door-alt">{t('entrada.door2Alt')}</div>
            <ul className="entrada-links">
              {TALLER.map((m) => (
                <li key={m.href}>
                  <a href={m.href} className="entrada-link">
                    <span className="entrada-link-emoji">{m.emoji}</span>
                    <span className="entrada-link-body">
                      <b>{t(m.labelKey)}</b>
                      <span className="entrada-link-sub">{t(m.subKey)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="entrada-foot">
          <p>
            {t('entrada.footNote')}{' '}
            <a href="/como-funciona" className="entrada-foot-link">{t('entrada.footLink')}</a>
          </p>
        </footer>
      </main>
    </div>
  )
}
