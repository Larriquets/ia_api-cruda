import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Demo inline de la parada "Ruido" del /recorrido.
// Sin API: la misma pregunta puntual en dos modos. Limpio = solo la línea
// relevante → respuesta nítida. Con ruido = la línea enterrada en relleno →
// respuesta vaga. Moraleja: más contexto no es mejor contexto.

const NEEDLE = { es: 'El teléfono de la oficina es 4321-8765.', en: 'The office phone number is 4321-8765.' }

const FILLER = {
  es: [
    'La empresa fue fundada en 1998 con la misión de mejorar procesos.',
    'Nuestros valores son la transparencia, la colaboración y la mejora continua.',
    'El horario de atención puede variar según la temporada del año.',
    'Contamos con oficinas en varias ciudades de la región.',
    'El equipo de soporte trabaja de lunes a viernes.',
    'La política de devoluciones está detallada en el anexo C.',
    'Agradecemos su preferencia y confianza a lo largo de los años.',
  ],
  en: [
    'The company was founded in 1998 with a mission to improve processes.',
    'Our values are transparency, collaboration and continuous improvement.',
    'Opening hours may vary depending on the season.',
    'We have offices in several cities across the region.',
    'The support team works Monday to Friday.',
    'The returns policy is detailed in appendix C.',
    'We thank you for your preference and trust over the years.',
  ],
}

const QUESTION = { es: '¿Cuál es el teléfono de la oficina?', en: 'What’s the office phone number?' }
const ANSWER_CLEAN = { es: 'El teléfono de la oficina es 4321-8765.', en: 'The office phone number is 4321-8765.' }
const ANSWER_NOISY = {
  es: 'No encuentro un teléfono claro en el texto. Quizás puedas revisar el horario de atención o contactar al equipo de soporte.',
  en: 'I can’t find a clear phone number in the text. You might want to check the opening hours or contact the support team.',
}

export default function DemoRuido() {
  const { lang } = useT()
  const L = (o) => (lang === 'en' ? o.en : o.es)
  const [noisy, setNoisy] = useState(false)

  const filler = FILLER[lang === 'en' ? 'en' : 'es']

  const t = {
    head: lang === 'en' ? 'A needle in a haystack' : 'La aguja en el pajar',
    tagline: lang === 'en' ? 'more context isn’t better context' : 'más contexto no es mejor contexto',
    clean: lang === 'en' ? 'Clean (just the relevant line)' : 'Limpio (solo la línea relevante)',
    noisy: lang === 'en' ? 'With noise (buried in filler)' : 'Con ruido (enterrada en relleno)',
    context: lang === 'en' ? '📄 What you give the AI' : '📄 Lo que le das a la IA',
    question: lang === 'en' ? '❓ Your question' : '❓ Tu pregunta',
    answer: lang === 'en' ? '🤖 The AI answers' : '🤖 La IA contesta',
    moral: lang === 'en'
      ? 'Same question, same AI. Buried in filler, the relevant line gets diluted and the answer turns vague. Give it only what it needs — not the whole document.'
      : 'Misma pregunta, misma IA. Enterrada en relleno, la línea relevante se diluye y la respuesta se vuelve vaga. Dale solo lo que necesita — no el documento entero.',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">🗑️</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-segmented">
        <button
          type="button"
          className={`recorrido-seg${!noisy ? ' is-active' : ''}`}
          onClick={() => setNoisy(false)}
        >
          🧹 {t.clean}
        </button>
        <button
          type="button"
          className={`recorrido-seg${noisy ? ' is-active' : ''}`}
          onClick={() => setNoisy(true)}
        >
          🗑️ {t.noisy}
        </button>
      </div>

      <div className="recorrido-haystack">
        <div className="recorrido-haystack-label">{t.context}</div>
        {noisy ? (
          <div className="recorrido-haystack-body">
            {filler.slice(0, 3).map((line, i) => (
              <p key={`a${i}`} className="recorrido-haystack-noise">{line}</p>
            ))}
            <p className="recorrido-haystack-needle is-buried">{L(NEEDLE)}</p>
            {filler.slice(3).map((line, i) => (
              <p key={`b${i}`} className="recorrido-haystack-noise">{line}</p>
            ))}
          </div>
        ) : (
          <div className="recorrido-haystack-body">
            <p className="recorrido-haystack-needle">{L(NEEDLE)}</p>
          </div>
        )}
      </div>

      <div className="recorrido-answer">
        <div className="recorrido-answer-label">{t.question}</div>
        <div className="recorrido-card recorrido-card-user">
          <span className="recorrido-card-text">{L(QUESTION)}</span>
        </div>
        <div className="recorrido-answer-label">{t.answer}</div>
        <div className={`recorrido-card recorrido-card-assistant${noisy ? ' recorrido-card-bad' : ''}`}>
          <span className="recorrido-card-text">{noisy ? L(ANSWER_NOISY) : L(ANSWER_CLEAN)}</span>
        </div>
      </div>

      <div className="recorrido-demo-moral">{t.moral}</div>
    </div>
  )
}
