import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Demo inline de la parada "Predictor" del /recorrido.
// Sin API: distribuciones pre-horneadas que ilustran tres casos —
// una frase obvia (segura), una abierta (se reparte = ahí inventa) y una
// trampa fáctica (una opción plausible-pero-falsa rankeada alto = alucinación).

const SENTENCES = [
  {
    id: 'obvia',
    es: 'El sol sale por el ___',
    en: 'The sun rises in the ___',
    kind: 'segura',
    options: [
      { es: 'este', en: 'east', prob: 0.94 },
      { es: 'oriente', en: 'orient', prob: 0.04 },
      { es: 'horizonte', en: 'horizon', prob: 0.02 },
    ],
    note: {
      es: 'Hecho conocido: una opción se lleva casi toda la probabilidad. Acá la IA acierta casi siempre.',
      en: 'A known fact: one option takes almost all the probability. Here the AI gets it right almost always.',
    },
  },
  {
    id: 'abierta',
    es: 'Mi color favorito es el ___',
    en: 'My favorite color is ___',
    kind: 'repartida',
    options: [
      { es: 'azul', en: 'blue', prob: 0.31 },
      { es: 'rojo', en: 'red', prob: 0.24 },
      { es: 'verde', en: 'green', prob: 0.19 },
      { es: 'negro', en: 'black', prob: 0.15 },
      { es: 'violeta', en: 'purple', prob: 0.11 },
    ],
    note: {
      es: 'No hay respuesta correcta: la probabilidad se reparte. Cada vez puede salir distinto — es una lotería.',
      en: 'There’s no right answer: probability spreads out. Each time it can come out different — it’s a lottery.',
    },
  },
  {
    id: 'trampa',
    es: 'La capital de Australia es ___',
    en: 'The capital of Australia is ___',
    kind: 'trampa',
    options: [
      { es: 'Sídney', en: 'Sydney', prob: 0.52, wrong: true },
      { es: 'Camberra', en: 'Canberra', prob: 0.36, right: true },
      { es: 'Melbourne', en: 'Melbourne', prob: 0.12 },
    ],
    note: {
      es: 'Trampa clásica: la opción más probable (Sídney) es la INCORRECTA — la correcta es Camberra. La IA elige lo que “suena” bien, no lo que es verdad. Así alucina con seguridad.',
      en: 'Classic trap: the most likely option (Sydney) is WRONG — the right answer is Canberra. The AI picks what “sounds” right, not what’s true. That’s how it hallucinates confidently.',
    },
  },
]

export default function DemoPredictor() {
  const { lang } = useT()
  const L = (o) => (lang === 'en' ? o.en : o.es)

  const [sel, setSel] = useState(SENTENCES[0])
  const [revealed, setRevealed] = useState(false)

  const pick = (s) => { setSel(s); setRevealed(false) }

  const t = {
    head: lang === 'en' ? 'The guess-the-word game' : 'El juego de adivinar la palabra',
    tagline: lang === 'en' ? 'deep down, it guesses the next word' : 'en el fondo, adivina la próxima palabra',
    choose: lang === 'en' ? 'Pick a sentence:' : 'Elegí una frase:',
    reveal: lang === 'en' ? '🔮 What does the AI guess?' : '🔮 ¿Qué adivina la IA?',
    again: lang === 'en' ? 'Pick another' : 'Probá otra',
    chose: lang === 'en' ? 'it picked this' : 'eligió esta',
    wrong: lang === 'en' ? '✗ wrong!' : '✗ ¡incorrecta!',
    right: lang === 'en' ? '✓ the true one' : '✓ la verdadera',
  }

  const sorted = [...sel.options].sort((a, b) => b.prob - a.prob)
  const top = sorted[0]

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">🔮</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-demo-presets">
        <span className="recorrido-demo-presets-label">{t.choose}</span>
        {SENTENCES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`recorrido-demo-chip${sel.id === s.id ? ' is-active' : ''}`}
            onClick={() => pick(s)}
          >
            {L(s)}
          </button>
        ))}
      </div>

      <div className="recorrido-predictor-sentence">{L(sel)}</div>

      {!revealed ? (
        <div className="recorrido-demo-actions">
          <button type="button" className="recorrido-demo-btn" onClick={() => setRevealed(true)}>{t.reveal}</button>
        </div>
      ) : (
        <>
          <div className="recorrido-bars">
            {sorted.map((o, i) => (
              <div key={i} className={`recorrido-bar-row${o.wrong ? ' is-wrong' : ''}${o.right ? ' is-right' : ''}`}>
                <span className="recorrido-bar-word">{L(o)}</span>
                <div className="recorrido-bar-track">
                  <div className="recorrido-bar-fill" style={{ width: `${Math.round(o.prob * 100)}%` }} />
                </div>
                <span className="recorrido-bar-pct">{Math.round(o.prob * 100)}%</span>
                {o === top && <span className="recorrido-bar-tag">← {t.chose}</span>}
                {o.wrong && <span className="recorrido-bar-flag recorrido-flag-wrong">{t.wrong}</span>}
                {o.right && <span className="recorrido-bar-flag recorrido-flag-right">{t.right}</span>}
              </div>
            ))}
          </div>
          <div className="recorrido-demo-tip">💡 {L(sel.note)}</div>
          <div className="recorrido-demo-actions">
            <button type="button" className="recorrido-demo-btn-ghost" onClick={() => setRevealed(false)}>{t.again}</button>
          </div>
        </>
      )}
    </div>
  )
}
