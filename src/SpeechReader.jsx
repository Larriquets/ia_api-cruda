import { useEffect, useRef, useState } from 'react'
import { useT } from './i18n/useT.js'

// Lector text-to-speech de las páginas de docs (/recorrido, /docs,
// /como-funciona, /tutos/*) y de las demos animadas /demo/*, pensado para
// que un no-programador pueda ESCUCHAR la
// página en vez de leerla. Usa la Web Speech API nativa del browser
// (window.speechSynthesis) — sin librería ni API externa, fiel a
// "la simplicidad es el material".
//
// Lee, en orden de DOM, los <h2>/<summary>/<p>/<li> que cuelgan de
// `containerSelector` (el .docs-main del body), un fragmento por utterance.
// Trocear así evita el bug de Chrome que corta los utterances largos (~15s)
// y permite resaltar y auto-scrollear el párrafo que se está leyendo.

const HL_CLASS = 'speech-reading'
// Quita emojis del texto que se manda al TTS: leídos en voz alta ("cohete",
// "marca de verificación") son ruido. El resaltado visual los conserva.
// También los chevrones ▸/▾ de los <summary> plegables de /docs.
const stripEmoji = (s) =>
  s.replace(/\p{Extended_Pictographic}/gu, '').replace(/[▸▾]/g, '').replace(/\s+/g, ' ').trim()

// En /docs las secciones son <details> colapsables: si el fragmento que toca
// leer está adentro de uno cerrado, lo abrimos para que el resaltado y el
// auto-scroll se vean. En páginas sin <details> no hace nada.
const openAncestorDetails = (el) => {
  let d = el.closest('details')
  while (d) {
    d.open = true
    d = d.parentElement?.closest('details')
  }
}

function pickVoice(voices, lang) {
  if (lang === 'en') {
    return (
      voices.find((v) => /en-US/i.test(v.lang)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
      null
    )
  }
  // Español: priorizar rioplatense, después LatAm, después cualquier es-*
  return (
    voices.find((v) => /es-AR/i.test(v.lang)) ||
    voices.find((v) => /es-419|es-MX|es-US/i.test(v.lang)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('es')) ||
    null
  )
}

export default function SpeechReader({ containerSelector, lang }) {
  const { t } = useT()
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const [status, setStatus] = useState('idle') // 'idle' | 'playing' | 'paused'
  const [rate, setRate] = useState(1)
  const [voices, setVoices] = useState([])

  const chunksRef = useRef([]) // [{ el, text }]
  const indexRef = useRef(0)
  const sessionRef = useRef(0) // invalida callbacks de utterances viejos
  const rateRef = useRef(rate)
  rateRef.current = rate

  // Cargar voces (llegan async en varios browsers).
  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const load = () => setVoices(synth.getVoices())
    load()
    synth.addEventListener?.('voiceschanged', load)
    return () => synth.removeEventListener?.('voiceschanged', load)
  }, [supported])

  const clearHighlight = () => {
    document.querySelectorAll('.' + HL_CLASS).forEach((el) => el.classList.remove(HL_CLASS))
  }

  const hardStop = () => {
    sessionRef.current += 1 // cualquier onend pendiente queda invalidado
    if (supported) window.speechSynthesis.cancel()
    clearHighlight()
    setStatus('idle')
  }

  // Parar el audio al desmontar o cambiar de idioma (el texto en pantalla cambió).
  useEffect(() => {
    return () => hardStop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    hardStop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const collectChunks = () => {
    const root = document.querySelector(containerSelector)
    if (!root) return []
    const nodes = root.querySelectorAll('h2, summary, p, li')
    const out = []
    nodes.forEach((el) => {
      const text = stripEmoji(el.textContent || '')
      if (text) out.push({ el, text })
    })
    return out
  }

  const speakFrom = (i) => {
    const session = sessionRef.current
    const chunks = chunksRef.current
    if (i >= chunks.length) {
      clearHighlight()
      setStatus('idle')
      return
    }
    indexRef.current = i
    const { el, text } = chunks[i]

    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'en' ? 'en-US' : 'es-AR'
    const v = pickVoice(voices, lang)
    if (v) u.voice = v
    u.rate = rateRef.current

    u.onstart = () => {
      if (session !== sessionRef.current) return
      clearHighlight()
      openAncestorDetails(el)
      el.classList.add(HL_CLASS)
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    u.onend = () => {
      if (session !== sessionRef.current) return
      speakFrom(i + 1)
    }

    window.speechSynthesis.speak(u)
  }

  const handlePlayPause = () => {
    if (!supported) return
    const synth = window.speechSynthesis

    if (status === 'playing') {
      synth.pause()
      setStatus('paused')
      return
    }
    if (status === 'paused') {
      synth.resume()
      setStatus('playing')
      return
    }
    // idle → arrancar de cero
    synth.cancel()
    sessionRef.current += 1
    chunksRef.current = collectChunks()
    if (chunksRef.current.length === 0) return
    setStatus('playing')
    speakFrom(0)
  }

  if (!supported) {
    return (
      <div className="speech-reader speech-reader-off">
        <span className="speech-reader-title">{t('speech.title')}</span>
        <p className="speech-reader-note">{t('speech.unsupported')}</p>
      </div>
    )
  }

  const playLabel =
    status === 'playing' ? t('speech.pause') : status === 'paused' ? t('speech.resume') : t('speech.listen')

  return (
    <div className="speech-reader">
      <span className="speech-reader-title">{t('speech.title')}</span>
      <div className="speech-reader-controls">
        <button
          type="button"
          className="speech-btn speech-btn-play"
          onClick={handlePlayPause}
          aria-pressed={status === 'playing'}
        >
          <span aria-hidden="true">{status === 'playing' ? '⏸' : '▶'}</span> {playLabel}
        </button>
        <button
          type="button"
          className="speech-btn speech-btn-stop"
          onClick={hardStop}
          disabled={status === 'idle'}
          title={t('speech.stop')}
        >
          <span aria-hidden="true">⏹</span>
        </button>
      </div>
      <label className="speech-reader-rate">
        <span>{t('speech.speed')}</span>
        <select value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}>
          <option value="0.8">0.8×</option>
          <option value="1">1×</option>
          <option value="1.2">1.2×</option>
          <option value="1.5">1.5×</option>
        </select>
      </label>
    </div>
  )
}
