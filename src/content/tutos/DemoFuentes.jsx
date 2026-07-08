import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Mini-demo del tuto "¿De dónde saca lo que responde?" (/tutos/fuentes).
// Sin API: elegís una pregunta y se ve el ranking de fichas del archivo
// (barras de parecido) y cuáles viajan pegadas en la carta. La verdad:
// la IA no "busca" nada — la app busca antes y le pega lo que encontró.

const PREGUNTAS = [
  {
    id: 'devolucion',
    q: { es: '¿Puedo devolver un producto?', en: 'Can I return a product?' },
    fichas: [
      { texto: { es: 'Las devoluciones se aceptan hasta 30 días después de la compra.', en: 'Returns are accepted up to 30 days after purchase.' }, score: 92 },
      { texto: { es: 'El envío estándar demora de 3 a 5 días hábiles.', en: 'Standard shipping takes 3 to 5 business days.' }, score: 34 },
      { texto: { es: 'El local abre de lunes a sábado de 9 a 18.', en: 'The store is open Monday to Saturday, 9 to 18.' }, score: 12 },
    ],
    respuesta: {
      es: 'Sí: tenés hasta 30 días desde la compra para devolverlo.',
      en: 'Yes: you have up to 30 days from purchase to return it.',
    },
  },
  {
    id: 'envio',
    q: { es: '¿Cuánto tarda en llegar mi pedido?', en: 'How long until my order arrives?' },
    fichas: [
      { texto: { es: 'El envío estándar demora de 3 a 5 días hábiles.', en: 'Standard shipping takes 3 to 5 business days.' }, score: 95 },
      { texto: { es: 'El local abre de lunes a sábado de 9 a 18.', en: 'The store is open Monday to Saturday, 9 to 18.' }, score: 28 },
      { texto: { es: 'Las devoluciones se aceptan hasta 30 días después de la compra.', en: 'Returns are accepted up to 30 days after purchase.' }, score: 19 },
    ],
    respuesta: {
      es: 'El envío estándar tarda entre 3 y 5 días hábiles.',
      en: 'Standard shipping takes between 3 and 5 business days.',
    },
  },
]

export default function DemoFuentes() {
  const { lang } = useT()
  const [elegida, setElegida] = useState(null)
  const L = (o) => (lang === 'en' ? o.en : o.es)

  const t = {
    head: lang === 'en' ? 'Search first, ask later' : 'Primero buscar, después preguntar',
    tagline: lang === 'en' ? 'the AI doesn’t search — the app does' : 'la IA no busca — busca la app',
    pick: lang === 'en' ? 'Pick a question:' : 'Elegí una pregunta:',
    ranking: lang === 'en' ? '📇 The app compares your question against its file cards' : '📇 La app compara tu pregunta contra sus fichas',
    goes: lang === 'en' ? 'goes in the letter' : 'va a la carta',
    stays: lang === 'en' ? 'stays out' : 'queda afuera',
    envelope: lang === 'en' ? '✉️ What travels to the AI' : '✉️ Lo que viaja a la IA',
    answer: lang === 'en' ? '🤖 The AI answers' : '🤖 La IA contesta',
    roleUser: lang === 'en' ? 'you' : 'vos',
    ficha: lang === 'en' ? 'card' : 'ficha',
    moral: lang === 'en'
      ? 'The AI never opened a drawer: the app measured which cards resemble your question, pasted the best one into the letter, and the AI answered reading that. If the file has no good card, the AI improvises — that’s where inventions come from.'
      : 'La IA nunca abrió ningún cajón: la app midió qué fichas se parecen a tu pregunta, pegó la mejor en la carta, y la IA respondió leyendo eso. Si el archivo no tiene una ficha buena, la IA improvisa — de ahí salen los inventos.',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">📇</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-demo-presets">
        <span className="recorrido-demo-presets-label">{t.pick}</span>
        {PREGUNTAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`recorrido-demo-chip${elegida?.id === p.id ? ' is-active' : ''}`}
            onClick={() => setElegida(p)}
          >
            {L(p.q)}
          </button>
        ))}
      </div>

      {elegida && (
        <>
          <div className="recorrido-envelope">
            <div className="recorrido-envelope-label">{t.ranking}</div>
            <div className="recorrido-bars">
              {elegida.fichas.map((f, i) => (
                <div key={i} className="recorrido-bar-row">
                  <span className="recorrido-bar-word">{t.ficha} {i + 1}</span>
                  <span className="recorrido-bar-track">
                    <span className="recorrido-bar-fill" style={{ width: `${f.score}%` }} />
                  </span>
                  <span className="recorrido-bar-pct">{f.score}%</span>
                  <span className={`recorrido-bar-flag ${i === 0 ? 'recorrido-flag-right' : 'recorrido-flag-wrong'}`}>
                    {i === 0 ? `✓ ${t.goes}` : t.stays}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="recorrido-envelope">
            <div className="recorrido-envelope-label">{t.envelope}</div>
            <div className="recorrido-card recorrido-card-system">
              <span className="recorrido-card-role">{t.ficha}</span>
              <span className="recorrido-card-text">{L(elegida.fichas[0].texto)}</span>
            </div>
            <div className="recorrido-card recorrido-card-user">
              <span className="recorrido-card-role">{t.roleUser}</span>
              <span className="recorrido-card-text">{L(elegida.q)}</span>
            </div>
          </div>

          <div className="recorrido-answer">
            <div className="recorrido-answer-label">{t.answer}</div>
            <div className="recorrido-card recorrido-card-assistant">
              <span className="recorrido-card-role">IA</span>
              <span className="recorrido-card-text">{L(elegida.respuesta)}</span>
            </div>
          </div>

          <div className="recorrido-demo-moral">{t.moral}</div>
        </>
      )}
    </div>
  )
}
