/**
 * CTA al final de cada doc de modo: invita a probar ese modo en la app.
 * Camino inverso del "📖 Leer doc": de la doc hacia el modo en vivo.
 *
 * @param {string} href - ruta del modo (ej: "/editor")
 * @param {string} label - nombre legible del modo (ej: "Editor")
 * @param {string} [emoji] - emoji del modo, opcional
 * @param {string} [hint] - bajada corta arriba del botón
 */
export default function TryModeCTA({ href, label, emoji = '🚀', hint }) {
  return (
    <div className="try-mode-cta" role="complementary">
      {hint && <p className="try-mode-cta-hint">{hint}</p>}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="try-mode-cta-btn"
        title={`Abre ${label} en otra pestaña`}
      >
        <span className="try-mode-cta-emoji">{emoji}</span>
        <span className="try-mode-cta-label">Probar {label} ahora</span>
        <span className="try-mode-cta-arrow">↗</span>
      </a>
    </div>
  )
}
