/**
 * Sub-barra de configuración del request, debajo del header.
 * Se usa en los modos que tienen selectores (Chat, Editor, Agente, AGENTS.md).
 * Comunica visualmente que estos controles afectan lo que se manda al API,
 * y separa la navegación (en el header) de la configuración del modo actual.
 */
export default function ConfigBar({ children }) {
  return (
    <div className="config-bar" role="region" aria-label="Configuración del request">
      <span className="config-bar-label">⚙ Config del request</span>
      <div className="config-bar-controls">{children}</div>
    </div>
  )
}
