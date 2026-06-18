/**
 * Link "Leer doc" que se renderiza dentro del ConfigBar.
 * Se ancla al borde derecho (margin-left:auto) y abre /docs en otra pestaña
 * saltando a la sección correspondiente del modo actual.
 *
 * @param {string} section - id de la sección destino dentro de /docs (sin "#")
 * @param {string} [label] - texto opcional; por defecto "Leer doc"
 */
import { useT } from './i18n/useT.js'

export default function ReadDocLink({ section, label }) {
  const { t } = useT()
  return (
    <a
      href={`/docs#${section}`}
      target="_blank"
      rel="noopener noreferrer"
      className="read-doc-link"
      title={t('readdoc.title')}
    >
      📖 {label || t('readdoc.label')}
    </a>
  )
}
