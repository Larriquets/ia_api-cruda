import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'
import { ProveedoresBodyEs, ProveedoresBodyEn } from './content/ProveedoresBody.jsx'

const TOC_ITEMS = [
  { id: 'frase',         emoji: '🎯', es: 'En una frase',                 en: 'In one sentence' },
  { id: 'tabla',         emoji: '📊', es: 'Tabla comparativa',            en: 'Comparison table' },
  { id: 'flujo-openai',  emoji: '🟢', es: 'Flujo OpenAI persistente',     en: 'OpenAI persistent flow' },
  { id: 'flujo-claude',  emoji: '🟠', es: 'Flujo Claude',                 en: 'Claude flow' },
  { id: 'no-guardar',    emoji: '🔒', es: '"No guardar" ≠ "nada"',        en: '"Not storing" ≠ "nothing"' },
  { id: 'que-conviene',  emoji: '🤔', es: 'Qué te conviene',              en: "What's right for you" },
  { id: 'codigo',        emoji: '💻', es: 'Lo que cambia en el código',   en: 'What changes in the code' },
  { id: 'response',      emoji: '📥', es: 'Response distinto',            en: 'Different response' },
  { id: 'cors',          emoji: '🚧', es: 'CORS con Claude',              en: 'CORS with Claude' },
  { id: 'lmstudio',      emoji: '🔵', es: 'LM Studio (local)',            en: 'LM Studio (local)' },
  { id: 'resumen',       emoji: '📌', es: 'Resumiendo',                   en: 'Summing up' },
]

export default function Proveedores() {
  const { t, lang } = useT()
  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /proveedores
          <span className="docs-header-subtitle">{lang === 'en' ? 'OpenAI vs Anthropic — where context lives' : 'OpenAI vs Anthropic — dónde vive el contexto'}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <DocsNav current="proveedores" />
          <nav className="docs-toc" aria-label={t('docpage.pageIndexAria')}>
            <div className="docs-toc-title">{t('docpage.onThisPage')}</div>
            {TOC_ITEMS.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="docs-toc-link">
                <span className="docs-toc-emoji">{item.emoji}</span>
                <span className="docs-toc-label">{lang === 'en' ? item.en : item.es}</span>
              </a>
            ))}
          </nav>
        </aside>

        {lang === 'en' ? <ProveedoresBodyEn /> : <ProveedoresBodyEs />}
      </div>
    </div>
  )
}
