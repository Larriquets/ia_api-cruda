import { PREGUNTAS } from './preguntas.js'
import { useT } from './i18n/useT.js'

// Nav lateral de la puerta 1: los tutos de PREGUNTAS, nombrados por la
// pregunta humana. La montan los tutos (filtrando el actual) y /recorrido
// (completa). Misma fuente que la landing y el dropdown "Entender".

export default function TutosNav({ current, titleKey = 'tutos.navTitle' }) {
  const { t } = useT()
  return (
    <nav className="docs-nav" aria-label={t('tutos.navAria')}>
      <div className="docs-nav-title">{t(titleKey)}</div>
      {PREGUNTAS.filter((q) => q.href !== current).map((q) => (
        <a key={q.href} href={q.href} className="docs-nav-link">
          <span className="docs-nav-emoji">{q.emoji}</span>
          <span className="docs-nav-desc">{t(q.labelKey)}</span>
        </a>
      ))}
    </nav>
  )
}
