import { useMemo, useState } from 'react'
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base'
import { useT } from '../../i18n/useT.js'

// Demo inline de la parada "Tokens" del /recorrido, para NO programadores.
// Tokeniza 100% local (mismo BPE que /tokens, sin API ni key) pero sin chrome
// técnico: solo el contraste "letras que ves vos" vs "pedacitos que ve la IA".
// Texto bilingüe inline {es,en} como TOC_ITEMS, idiom de esta feature.

const PALETTE = ['#fca5a5', '#fcd34d', '#86efac', '#7dd3fc', '#c4b5fd', '#f9a8d4']

const PRESETS = [
  {
    id: 'palabra',
    es: 'internacionalmente',
    en: 'internationally',
    tip: { es: 'Una palabra larga se parte en varios pedacitos.', en: 'A long word splits into several chunks.' },
  },
  {
    id: 'numero',
    es: 'El total fue 9.847.231 pesos',
    en: 'The total was 9,847,231 dollars',
    tip: { es: 'Los números se cortan en pedazos arbitrarios. Por eso la IA es mala para la aritmética exacta.', en: 'Numbers get cut into arbitrary pieces. That’s why AI is bad at exact arithmetic.' },
  },
  {
    id: 'emoji',
    es: 'Buenísimo 🎉🇦🇷',
    en: 'Awesome 🎉🇬🇧',
    tip: { es: 'Un emoji puede ocupar varios pedacitos y hasta partirse al medio.', en: 'An emoji can take several chunks and even split down the middle.' },
  },
]

const displayToken = (token) => token.replace(/ /g, '␣').replace(/\n/g, '⏎') || '∅'

export default function DemoTokens() {
  const { lang } = useT()
  const L = (o) => (lang === 'en' ? o.en : o.es)

  const [text, setText] = useState(lang === 'en' ? PRESETS[0].en : PRESETS[0].es)
  const [tip, setTip] = useState(null)

  const tokens = useMemo(() => {
    try {
      return encode(text).map((id) => decode([id]))
    } catch {
      return []
    }
  }, [text])

  const t = {
    head: lang === 'en' ? 'See it the way the AI does' : 'Velo como lo ve la IA',
    tagline: lang === 'en' ? 'it reads chunks, not letters' : 'lee pedacitos, no letras',
    try: lang === 'en' ? 'Try one:' : 'Probá uno:',
    placeholder: lang === 'en' ? 'Type anything and watch it break into chunks…' : 'Escribí cualquier cosa y mirala partirse en pedacitos…',
    youSee: lang === 'en' ? 'What you see' : 'Lo que ves vos',
    aiSees: lang === 'en' ? 'What the AI sees' : 'Lo que ve la IA',
    letters: lang === 'en' ? 'letters' : 'letras',
    chunks: lang === 'en' ? 'chunks' : 'pedacitos',
    moral: lang === 'en'
      ? 'The AI never sees the letters inside a chunk — that’s why counting characters or doing exact math is hard for it.'
      : 'La IA nunca ve las letras de adentro de un pedacito — por eso contar caracteres o hacer cuentas exactas le cuesta.',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">🧩</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-demo-presets">
        <span className="recorrido-demo-presets-label">{t.try}</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="recorrido-demo-chip"
            onClick={() => { setText(L(p)); setTip(L(p.tip)) }}
          >
            {L(p)}
          </button>
        ))}
      </div>

      <input
        type="text"
        className="recorrido-demo-input"
        value={text}
        onChange={(e) => { setText(e.target.value); setTip(null) }}
        placeholder={t.placeholder}
      />

      <div className="recorrido-demo-split">
        <div className="recorrido-demo-col">
          <div className="recorrido-demo-col-label">👁️ {t.youSee} · {text.length} {t.letters}</div>
          <div className="recorrido-demo-letters">
            {text.split('').map((ch, i) => (
              <span key={i} className="recorrido-demo-letter">{ch === ' ' ? '␣' : ch}</span>
            ))}
          </div>
        </div>
        <div className="recorrido-demo-col">
          <div className="recorrido-demo-col-label">🤖 {t.aiSees} · {tokens.length} {t.chunks}</div>
          <div className="recorrido-demo-chunks">
            {tokens.map((tok, i) => (
              <span
                key={i}
                className="recorrido-demo-chunk"
                style={{ background: PALETTE[i % PALETTE.length] }}
              >
                {displayToken(tok)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {tip && <div className="recorrido-demo-tip">💡 {tip}</div>}
      <div className="recorrido-demo-moral">{t.moral}</div>
    </div>
  )
}
