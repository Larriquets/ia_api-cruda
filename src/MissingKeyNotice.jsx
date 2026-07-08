import { useT } from './i18n/useT.js'

/**
 * Aviso amable de key faltante, al CARGAR el lab — no recién al enviar.
 * Sin esto, el que cruza desde el recorrido ("probalo de verdad en el taller")
 * escribe su mensaje, aprieta Enviar y recibe un error de desarrollador
 * ("Falta VITE_..._API_KEY en el archivo .env") sin ninguna salida.
 *
 * No toca los wrappers ni el contrato de hooks: lee el mismo import.meta.env
 * que ellos y solo renderiza el callout cuando la key del proveedor falta.
 *
 * @param {string} provider - 'openai' | 'anthropic' | 'lmstudio' | 'ollama'.
 *   Los proveedores locales no usan key: no renderiza nada.
 * @param {string} [demoHref] - ruta de la demo gemela (la misma que recibe DemoBacklink)
 */

const KEYS = {
  openai: { value: import.meta.env.VITE_OPENAI_API_KEY, label: 'OpenAI' },
  anthropic: { value: import.meta.env.VITE_ANTHROPIC_API_KEY, label: 'Anthropic' },
}

export default function MissingKeyNotice({ provider, demoHref }) {
  const { t } = useT()
  const entry = KEYS[provider]
  if (!entry || entry.value) return null
  return (
    <div className="missing-key-notice" role="status">
      <span className="missing-key-emoji" aria-hidden="true">🔑</span>
      <div className="missing-key-body">
        <b className="missing-key-title">{t('missingkey.title', { provider: entry.label })}</b>
        <p className="missing-key-text">{t('missingkey.body')}</p>
        <div className="missing-key-actions">
          {demoHref && (
            <a href={demoHref} className="missing-key-demo">🎬 {t('missingkey.demoCta')} →</a>
          )}
          <a href="/recorrido" className="missing-key-tour">{t('missingkey.tourCta')} →</a>
        </div>
      </div>
    </div>
  )
}
