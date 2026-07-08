/**
 * Sub-barra de configuración del request, debajo del header.
 * Se usa en los modos que tienen selectores (Chat, Editor, Agente, AGENTS.md).
 * Comunica visualmente que estos controles afectan lo que se manda al API,
 * y separa la navegación (en el header) de la configuración del modo actual.
 */
import { useT } from './i18n/useT.js'

export default function ConfigBar({ children }) {
  const { t } = useT()
  return (
    <div className="config-bar" role="region" aria-label={t('configbar.region')}>
      <span className="config-bar-label">{t('configbar.label')}</span>
      <div className="config-bar-controls">{children}</div>
    </div>
  )
}
