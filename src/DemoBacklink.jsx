import { useT } from './i18n/useT.js'

/**
 * Puente lab → demo: tira fina bajo el header de los labs que tienen una
 * versión guiada sin API en /demo/*. Camino inverso del TryModeCTA
 * (demo/doc → lab): acá el que entró por la puerta técnica y se perdió
 * puede bajar a la versión animada.
 *
 * @param {string} href - ruta de la demo gemela (ej: "/demo/chat")
 */
export default function DemoBacklink({ href }) {
  const { t } = useT()
  return (
    <div className="demo-backlink" role="complementary">
      <span className="demo-backlink-emoji" aria-hidden="true">🎞️</span>
      <span className="demo-backlink-text">{t('demobacklink.text')}</span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="demo-backlink-btn">
        {t('demobacklink.link')} ↗
      </a>
    </div>
  )
}
