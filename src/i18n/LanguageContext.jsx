import { createContext, useCallback, useMemo, useState } from 'react'
import { es } from './es.js'
import { en } from './en.js'

// i18n minimalista, sin librería: un Context + dos diccionarios planos.
// La idea pedagógica es que el alumno pueda LEER cómo funciona un i18n
// (lookup por ruta con puntos + fallback + interpolación) en ~30 líneas,
// en vez de tratarlo como magia de una dependencia externa.

const DICTS = { es, en }
const STORAGE_KEY = 'lang'

export const LanguageContext = createContext({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
})

// Resuelve 'chat.send' contra el objeto anidado del diccionario.
const lookup = (dict, key) =>
  key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)

// Reemplaza {nombre} por vars.nombre.
const interpolate = (str, vars) =>
  !vars ? str : str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))

const readInitialLang = () => {
  if (typeof window === 'undefined') return 'es'
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'en' || saved === 'es' ? saved : 'es'
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang)

  const setLang = useCallback((next) => {
    if (next !== 'es' && next !== 'en') return
    setLangState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* noop */ }
    if (typeof document !== 'undefined') document.documentElement.lang = next
  }, [])

  const t = useCallback((key, vars) => {
    // dict activo → fallback a ES → la propia key (visible: falta traducir).
    const hit = lookup(DICTS[lang], key)
    const value = hit !== undefined ? hit : lookup(DICTS.es, key)
    if (typeof value !== 'string') return key
    return interpolate(value, vars)
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
