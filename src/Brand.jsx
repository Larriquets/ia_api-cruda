import { useT } from './i18n/useT.js'

// Marca compartida del header y el modal. Bilingüe ES/EN: el castellano
// rioplatense es la base de verdad, "Raw AI" es la traducción. Un solo lugar
// para que el toggle ES|EN la cambie en todas las páginas de una.
export default function Brand() {
  const { t } = useT()
  return <span className="brand">{t('app.brand')}</span>
}
