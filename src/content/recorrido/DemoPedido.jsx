import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Demo inline de la parada "Pedido" del /recorrido.
// Sin API: tarea cotidiana (resumir una reseña). El pedido vago rota entre
// 3 salidas distintas en cada clic (lotería); el específico da siempre la
// misma (estable). Moraleja: lo que no va en el pedido queda librado al azar.

const REVIEW = {
  es: '«Pedí el combo a las 9. Tardó una hora y llegó frío. El repartidor, muy amable igual. La comida rica cuando la calenté. No sé si vuelvo a pedir.»',
  en: '«Ordered the combo at 9. It took an hour and arrived cold. The delivery guy was very nice though. The food was tasty once I heated it. Not sure I’ll order again.»',
}

const VAGUE_PROMPT = { es: 'Resumime esta reseña.', en: 'Summarize this review.' }
const SPECIFIC_PROMPT = {
  es: 'Resumí la reseña en 1 oración, tono neutro, sin adjetivos, mencionando solo el problema principal.',
  en: 'Summarize the review in 1 sentence, neutral tone, no adjectives, mentioning only the main problem.',
}

// El vago rota: cada clic da algo distinto (largo, foco y tono cambian).
const VAGUE_OUTPUTS = [
  { es: 'El cliente está chocho con la atención del repartidor, ¡un amor! La comida estaba riquísima.', en: 'The customer is thrilled with the delivery guy, what a sweetheart! The food was delicious.' },
  { es: 'Reseña negativa: demora de una hora, comida fría y dudas sobre volver a pedir. Aunque el reparto fue amable.', en: 'Negative review: one-hour delay, cold food and doubts about ordering again. Though delivery was friendly.' },
  { es: 'El usuario relata su experiencia con el pedido del combo, los tiempos de entrega y la temperatura de la comida.', en: 'The user describes their experience with the combo order, delivery times and food temperature.' },
]

const SPECIFIC_OUTPUT = {
  es: 'El pedido llegó frío y con una hora de demora.',
  en: 'The order arrived cold and an hour late.',
}

export default function DemoPedido() {
  const { lang } = useT()
  const L = (o) => (lang === 'en' ? o.en : o.es)

  const [vagueIdx, setVagueIdx] = useState(null) // null | 0..2
  const [vagueRuns, setVagueRuns] = useState(0)
  const [specificShown, setSpecificShown] = useState(false)

  const runVague = () => {
    setVagueIdx((prev) => {
      const next = prev == null ? 0 : (prev + 1) % VAGUE_OUTPUTS.length
      return next
    })
    setVagueRuns((n) => n + 1)
  }

  const t = {
    head: lang === 'en' ? 'Vague vs. specific' : 'Vago vs. específico',
    tagline: lang === 'en' ? 'it reads your request, not your mind' : 'lee tu pedido, no tu mente',
    review: lang === 'en' ? '📝 The review to summarize' : '📝 La reseña a resumir',
    vague: lang === 'en' ? '🌫️ Vague request' : '🌫️ Pedido vago',
    specific: lang === 'en' ? '🎯 Specific request' : '🎯 Pedido específico',
    runVague: lang === 'en' ? 'Run it' : 'Probalo',
    runVagueAgain: lang === 'en' ? 'Run it again' : 'Probalo de nuevo',
    runSpecific: lang === 'en' ? 'Run it' : 'Probalo',
    runSpecificAgain: lang === 'en' ? 'Run it again' : 'Probalo de nuevo',
    result: lang === 'en' ? 'Result' : 'Resultado',
    runsLabel: lang === 'en' ? 'run #' : 'corrida #',
    lottery: lang === 'en' ? '⚠️ Different every time — a lottery' : '⚠️ Distinto cada vez — una lotería',
    stable: lang === 'en' ? '✓ Same every time — stable' : '✓ Igual siempre — estable',
    moral: lang === 'en'
      ? 'Same review, same AI. The only difference is your request. The vague one leaves the criteria to chance; the specific one puts them inside the request — so the answer is stable.'
      : 'Misma reseña, misma IA. Lo único que cambia es tu pedido. El vago deja los criterios al azar; el específico los mete adentro del pedido — por eso la respuesta es estable.',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">🎯</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-review">
        <div className="recorrido-review-label">{t.review}</div>
        <div className="recorrido-review-text">{L(REVIEW)}</div>
      </div>

      <div className="recorrido-versus">
        {/* Vago */}
        <div className="recorrido-versus-col recorrido-versus-vague">
          <div className="recorrido-versus-title">{t.vague}</div>
          <div className="recorrido-versus-prompt">“{L(VAGUE_PROMPT)}”</div>
          <button type="button" className="recorrido-demo-btn" onClick={runVague}>
            {vagueIdx == null ? t.runVague : t.runVagueAgain}
          </button>
          {vagueIdx != null && (
            <div className="recorrido-versus-result">
              <div className="recorrido-versus-result-label">{t.result} · {t.runsLabel}{vagueRuns}</div>
              <div className="recorrido-card recorrido-card-assistant">
                <span className="recorrido-card-text">{L(VAGUE_OUTPUTS[vagueIdx])}</span>
              </div>
              {vagueRuns >= 2 && <div className="recorrido-versus-flag recorrido-flag-wrong">{t.lottery}</div>}
            </div>
          )}
        </div>

        {/* Específico */}
        <div className="recorrido-versus-col recorrido-versus-specific">
          <div className="recorrido-versus-title">{t.specific}</div>
          <div className="recorrido-versus-prompt">“{L(SPECIFIC_PROMPT)}”</div>
          <button type="button" className="recorrido-demo-btn" onClick={() => setSpecificShown(true)}>
            {specificShown ? t.runSpecificAgain : t.runSpecific}
          </button>
          {specificShown && (
            <div className="recorrido-versus-result">
              <div className="recorrido-versus-result-label">{t.result}</div>
              <div className="recorrido-card recorrido-card-assistant">
                <span className="recorrido-card-text">{L(SPECIFIC_OUTPUT)}</span>
              </div>
              <div className="recorrido-versus-flag recorrido-flag-right">{t.stable}</div>
            </div>
          )}
        </div>
      </div>

      <div className="recorrido-demo-moral">{t.moral}</div>
    </div>
  )
}
