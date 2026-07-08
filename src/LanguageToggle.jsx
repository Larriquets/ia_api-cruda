import { useT } from './i18n/useT.js'

// Toggle ES | EN del header. Persiste vía setLang (localStorage.lang).
// Como la navegación fuerza recarga completa, el idioma sobrevive entre páginas.
export default function LanguageToggle() {
  const { lang, setLang, t } = useT()

  return (
    <div className="lang-toggle" role="group" aria-label={t('toggle.aria')}>
      <button
        type="button"
        className={`lang-toggle-btn${lang === 'es' ? ' active' : ''}`}
        aria-pressed={lang === 'es'}
        onClick={() => setLang('es')}
        title={t('toggle.titleEs')}
      >
        {t('toggle.es')}
      </button>
      <button
        type="button"
        className={`lang-toggle-btn${lang === 'en' ? ' active' : ''}`}
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
        title={t('toggle.titleEn')}
      >
        {t('toggle.en')}
      </button>
    </div>
  )
}
