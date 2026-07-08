import BrandHome from './BrandHome.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { PREGUNTAS } from './preguntas.js'
import { MODOS, LABS, DEMOS } from './taller.js'
import { useT } from './i18n/useT.js'

// Landing de dos puertas (`/`): la misma app, dos profundidades.
// Puerta 1 → recorrido guiado + tutos sin API, nombrados por la pregunta
// humana (no por la tecnología). Puerta 2 → los modos, labs y demos animadas,
// con keys y JSON crudo. Cada puerta linkea a la otra: la separación es una
// escalera a la vista, no un muro. Las listas de cada puerta salen de
// preguntas.js y taller.js — las mismas fuentes que los dropdowns del
// header, para que no se desincronicen.

function EntradaLink({ emoji, href, labelKey, label, subKey, t }) {
  return (
    <li>
      <a href={href} className="entrada-link">
        <span className="entrada-link-emoji">{emoji}</span>
        <span className="entrada-link-body">
          <b>{labelKey ? t(labelKey) : label}</b>
          <span className="entrada-link-sub">{t(subKey)}</span>
        </span>
      </a>
    </li>
  )
}

export default function Entrada() {
  const { t } = useT()
  return (
    <div className="entrada">
      <header className="header">
        <h1>
          <BrandHome />
          <span className="brand-subtitle">{t('entrada.subtitle')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
        </div>
      </header>

      <main className="entrada-main">
        <section className="entrada-hero">
          <h2>{t('entrada.heroTitle')}</h2>
          <p>{t('entrada.heroSub')}</p>
          <p className="entrada-hero-mapa">
            <a href="/mapa">{t('entrada.mapaLink')}</a>
          </p>
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
                <EntradaLink key={q.href} {...q} t={t} />
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
            <div className="entrada-links-title">{t('modeswitch.modesBtn')}</div>
            <ul className="entrada-links">
              {MODOS.map((m) => (
                <EntradaLink key={m.href} {...m} t={t} />
              ))}
            </ul>
            {/* Labs y demos colapsados por defecto: la puerta 2 desplegada entera
                es una pared de ~30 ítems con jerga que intimida al que todavía
                está eligiendo puerta. Los 5 modos alcanzan como vidriera. */}
            <details className="entrada-collapse">
              <summary className="entrada-links-title">
                {t('modeswitch.labsBtn')}
                <span className="entrada-collapse-hint">{t('entrada.verTodos', { count: LABS.length })}</span>
              </summary>
              <ul className="entrada-links">
                {LABS.map((m) => (
                  <EntradaLink key={m.href} {...m} t={t} />
                ))}
              </ul>
            </details>
            <details className="entrada-collapse">
              <summary className="entrada-links-title">
                {t('entrada.tDemosTitle')}
                <span className="entrada-collapse-hint">{t('entrada.verTodos', { count: DEMOS.length + 1 })}</span>
              </summary>
              <ul className="entrada-links">
                {DEMOS.map((m) => (
                  <EntradaLink key={m.href} {...m} t={t} />
                ))}
                <EntradaLink emoji="📚" href="/docs" labelKey="entrada.tDocsLabel" subKey="entrada.tDocsSub" t={t} />
              </ul>
            </details>
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
