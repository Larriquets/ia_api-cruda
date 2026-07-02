import LanguageToggle from './LanguageToggle.jsx'
import SpeechReader from './SpeechReader.jsx'
import TutosNav from './TutosNav.jsx'
import { useT } from './i18n/useT.js'
import { PREGUNTAS } from './preguntas.js'
import { TutoMemoriaEs, TutoMemoriaEn } from './content/tutos/TutoMemoria.jsx'
import { TutoTokensEs, TutoTokensEn } from './content/tutos/TutoTokens.jsx'
import { TutoInventaEs, TutoInventaEn } from './content/tutos/TutoInventa.jsx'
import { TutoFuentesEs, TutoFuentesEn } from './content/tutos/TutoFuentes.jsx'
import { TutoPiensaEs, TutoPiensaEn } from './content/tutos/TutoPiensa.jsx'
import { TutoAgentesEs, TutoAgentesEn } from './content/tutos/TutoAgentes.jsx'
import { TutoReglasEs, TutoReglasEn } from './content/tutos/TutoReglas.jsx'

// Tutos (`/tutos/*`): la capa más accesible de la puerta 1, una página por
// pregunta humana de PREGUNTAS. Cada tuto = prosa con metáfora + mini-demo
// interactiva sin API + escalera hacia abajo (demo animada y lab real).
// El cuerpo por idioma vive en content/tutos/; acá solo el andamiaje.

const TUTOS = {
  memoria: {
    qKey: 'entrada.qMemoriaLabel',
    Es: TutoMemoriaEs,
    En: TutoMemoriaEn,
    demoHref: '/demo/chat',
    labHref: '/chat',
  },
  tokens: {
    qKey: 'entrada.qTokensLabel',
    Es: TutoTokensEs,
    En: TutoTokensEn,
    demoHref: '/demo/tokens',
    labHref: '/tokens',
  },
  inventa: {
    qKey: 'entrada.qInventaLabel',
    Es: TutoInventaEs,
    En: TutoInventaEn,
    demoHref: '/demo/logprobs',
    labHref: '/logprobs',
  },
  fuentes: {
    qKey: 'entrada.qRagLabel',
    Es: TutoFuentesEs,
    En: TutoFuentesEn,
    demoHref: '/demo/rag',
    labHref: '/rag',
  },
  piensa: {
    qKey: 'entrada.qPiensaLabel',
    Es: TutoPiensaEs,
    En: TutoPiensaEn,
    demoHref: '/demo/razonamiento',
    labHref: '/razonamiento',
  },
  agentes: {
    qKey: 'entrada.qHaceLabel',
    Es: TutoAgentesEs,
    En: TutoAgentesEn,
    demoHref: '/demo/loop',
    labHref: '/loop-agentico',
  },
  reglas: {
    qKey: 'entrada.qReglasLabel',
    Es: TutoReglasEs,
    En: TutoReglasEn,
    demoHref: '/demo/agents-md',
    labHref: '/agents-md',
  },
}

export default function Tutos({ tema }) {
  const { t, lang } = useT()
  const tuto = TUTOS[tema]
  const Body = lang === 'en' ? tuto.En : tuto.Es
  const current = `/tutos/${tema}`

  // Pager horizontal: la puerta 1 como camino, en el orden pedagógico de PREGUNTAS.
  const idx = PREGUNTAS.findIndex((q) => q.href === current)
  const prev = idx > 0 ? PREGUNTAS[idx - 1] : null
  const next = idx >= 0 && idx < PREGUNTAS.length - 1 ? PREGUNTAS[idx + 1] : null

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          {current}
          <span className="docs-header-subtitle">{t(tuto.qKey)}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('tutos.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <TutosNav current={current} />
        </aside>

        <div className="docs-main">
          <Body />

          <section className="criollo-section tuto-next">
            <h2>{t('tutos.nextTitle')}</h2>
            <div className="tuto-next-links">
              {tuto.demoHref && (
                <a href={tuto.demoHref} className="try-mode-cta-btn">
                  <span className="try-mode-cta-emoji">🎬</span>
                  <span>{t('tutos.nextDemo')}</span>
                  <span className="try-mode-cta-arrow">→</span>
                </a>
              )}
              <a href={tuto.labHref} className="try-mode-cta-btn">
                <span className="try-mode-cta-emoji">🔬</span>
                <span>{t('tutos.nextLab')}</span>
                <span className="try-mode-cta-arrow">→</span>
              </a>
            </div>
          </section>

          <nav className="tuto-pager" aria-label={t('tutos.pagerAria')}>
            {prev ? (
              <a href={prev.href} className="tuto-pager-link tuto-pager-prev">
                <span className="tuto-pager-kicker">← {t('tutos.pagerPrev')}</span>
                <span className="tuto-pager-q">{prev.emoji} {t(prev.labelKey)}</span>
              </a>
            ) : <span />}
            {next && (
              <a href={next.href} className="tuto-pager-link tuto-pager-next">
                <span className="tuto-pager-kicker">{t('tutos.pagerNext')} →</span>
                <span className="tuto-pager-q">{next.emoji} {t(next.labelKey)}</span>
              </a>
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}
