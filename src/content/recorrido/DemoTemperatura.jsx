import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Demo inline de la parada "Temperatura" del /recorrido.
// Sin API: una distribución pre-horneada y la perilla frío/normal/caliente
// que la afila o la achata. El botón "sacar una respuesta" sortea de verdad
// (Math.random) para que se VEA la repetición en frío y la variedad en caliente.

const OPTIONS = [
  { es: 'espumante', en: 'sparkling wine', prob: 0.4 },
  { es: 'vino', en: 'wine', prob: 0.25 },
  { es: 'sidra', en: 'cider', prob: 0.2 },
  { es: 'cerveza', en: 'beer', prob: 0.1 },
  { es: 'fernet', en: 'fernet', prob: 0.05 },
]

const TEMPS = [
  {
    id: 'frio', t: 0, emoji: '🧊',
    es: 'Fría (0)', en: 'Cold (0)',
    note: {
      es: 'Perilla fría: gana SIEMPRE la más probable. Misma pregunta, misma respuesta. Ideal para tareas repetibles.',
      en: 'Cold dial: the most likely option ALWAYS wins. Same question, same answer. Great for repeatable tasks.',
    },
  },
  {
    id: 'normal', t: 1, emoji: '🌡️',
    es: 'Normal (1)', en: 'Normal (1)',
    note: {
      es: 'Así viene la mayoría de los chats: casi siempre la top, cada tanto otra. Por eso "regenerar" puede cambiar la respuesta.',
      en: 'How most chats ship: usually the top one, every so often another. That\'s why "regenerate" can change the answer.',
    },
  },
  {
    id: 'caliente', t: 2, emoji: '🔥',
    es: 'Caliente (2)', en: 'Hot (2)',
    note: {
      es: 'Perilla caliente: las de abajo tienen chance en serio. Más sorpresa y variedad… y más riesgo de cualquier cosa.',
      en: 'Hot dial: the underdogs get a real shot. More surprise and variety… and more risk of anything at all.',
    },
  },
]

// Reparte la probabilidad según la temperatura: T=0 es determinístico (gana
// la top), T>0 eleva cada prob a 1/T y renormaliza — la misma idea que el
// softmax con temperatura del modelo real, sin logits de por medio.
function applyTemp(options, t) {
  if (t === 0) {
    const maxProb = Math.max(...options.map((o) => o.prob))
    return options.map((o) => ({ ...o, prob: o.prob === maxProb ? 1 : 0 }))
  }
  const weights = options.map((o) => Math.pow(o.prob, 1 / t))
  const total = weights.reduce((a, b) => a + b, 0)
  return options.map((o, i) => ({ ...o, prob: weights[i] / total }))
}

function sample(options) {
  let r = Math.random()
  for (const o of options) {
    r -= o.prob
    if (r <= 0) return o
  }
  return options[options.length - 1]
}

export default function DemoTemperatura() {
  const { lang } = useT()
  const L = (o) => (lang === 'en' ? o.en : o.es)

  const [temp, setTemp] = useState(TEMPS[1])
  const [draws, setDraws] = useState([])

  const pickTemp = (tm) => { setTemp(tm); setDraws([]) }

  const adjusted = applyTemp(OPTIONS, temp.t)
  const sorted = [...adjusted].sort((a, b) => b.prob - a.prob)
  const top = sorted[0]

  const roll = () => {
    const winner = sample(adjusted)
    setDraws((d) => [...d, winner].slice(-8))
  }

  const t = {
    head: lang === 'en' ? 'The randomness dial' : 'La perilla del azar',
    tagline: lang === 'en' ? 'temperature tunes the lottery' : 'la temperatura regula la lotería',
    choose: lang === 'en' ? 'Set the dial:' : 'Elegí la perilla:',
    sentence: lang === 'en' ? 'For the year-end toast we\'re buying ___' : 'Para el brindis de fin de año compramos ___',
    roll: lang === 'en' ? '🎲 Ask again' : '🎲 Preguntale de nuevo',
    drawsLabel: lang === 'en' ? 'What came out:' : 'Qué fue saliendo:',
    chose: lang === 'en' ? 'the favorite' : 'la favorita',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">🎲</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-demo-presets">
        <span className="recorrido-demo-presets-label">{t.choose}</span>
        {TEMPS.map((tm) => (
          <button
            key={tm.id}
            type="button"
            className={`recorrido-demo-chip${temp.id === tm.id ? ' is-active' : ''}`}
            onClick={() => pickTemp(tm)}
          >
            {tm.emoji} {L(tm)}
          </button>
        ))}
      </div>

      <div className="recorrido-predictor-sentence">{t.sentence}</div>

      <div className="recorrido-bars">
        {sorted.map((o, i) => (
          <div key={i} className="recorrido-bar-row">
            <span className="recorrido-bar-word">{L(o)}</span>
            <div className="recorrido-bar-track">
              <div className="recorrido-bar-fill" style={{ width: `${Math.round(o.prob * 100)}%` }} />
            </div>
            <span className="recorrido-bar-pct">{Math.round(o.prob * 100)}%</span>
            {o === top && <span className="recorrido-bar-tag">← {t.chose}</span>}
          </div>
        ))}
      </div>

      <div className="recorrido-demo-actions">
        <button type="button" className="recorrido-demo-btn" onClick={roll}>{t.roll}</button>
      </div>

      {draws.length > 0 && (
        <div className="recorrido-temp-draws">
          <span className="recorrido-temp-draws-label">{t.drawsLabel}</span>
          {draws.map((d, i) => (
            <span key={i} className={`recorrido-temp-draw${i === draws.length - 1 ? ' is-last' : ''}`}>
              {L(d)}
            </span>
          ))}
        </div>
      )}

      <div className="recorrido-demo-tip">💡 {L(temp.note)}</div>
    </div>
  )
}
