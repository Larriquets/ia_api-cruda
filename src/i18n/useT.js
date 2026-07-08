import { useContext } from 'react'
import { LanguageContext } from './LanguageContext.jsx'

// Hook fino: const { t, lang, setLang } = useT()
export function useT() {
  return useContext(LanguageContext)
}
