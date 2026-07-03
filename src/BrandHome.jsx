import { useT } from './i18n/useT.js'
import Brand from './Brand.jsx'

// Marca clickeable de los headers: logo + { La IA Cruda }, todo link al inicio.
// Convención estándar (la marca es el botón de inicio), así el header no
// necesita un botón 🏠 aparte. El modal de bienvenida usa <Brand /> pelado.
export default function BrandHome() {
  const { t } = useT()
  return (
    <a href="/" className="brand-home" aria-label={t('app.brandHome')}>
      <img src="/logo.png" alt="" className="brand-logo" />
      <span className="brand-braces">{'{'}</span>
      <Brand />
      <span className="brand-braces">{'}'}</span>
    </a>
  )
}
