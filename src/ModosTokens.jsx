import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import SpeechReader from './SpeechReader.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base'

/**
 * /demo/tokens — qué es un token y por qué te lo cobran.
 *
 * Animación en 4 pasos, sin API: la tokenización es REAL (el mismo BPE
 * o200k_base del lab /tokens, corriendo local en el browser), pero sobre
 * una frase fija para que la animación cuente siempre la misma historia.
 * Bilingüe ES/EN con el helper L() inline, como el resto de los /demo/*.
 */

const PHRASE_ES = '¡Hola! ¿Cuánto me cuesta escribirte esto, inteligencia artificial?'
const PHRASE_EN = 'Hello! How much does it cost me to write this to you, artificial intelligence?'

// Precio de lista por 1M de tokens de INPUT (junio 2026), el mismo del lab.
const PRICE_MINI = { model: 'gpt-4o-mini', perMillion: 0.15 }

const COLORS = ['#93c5fd', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd', '#f9a8d4', '#7dd3fc', '#fdba74']

const TOTAL_STEPS = 4

export default function ModosTokens() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const phrase = lang === 'en' ? PHRASE_EN : PHRASE_ES

  // Tokenización real, local: ids del BPE y el texto de cada pieza.
  const ids = encode(phrase)
  const pieces = ids.map((id) => decode([id]))

  const [step, setStep] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const autoTimerRef = useRef(null)

  const isDone = step >= TOTAL_STEPS
  const isFresh = step === 0

  const advance = () => {
    if (isDone) return
    setStep((s) => s + 1)
  }

  const reset = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoPlaying(false)
    setStep(0)
  }

  useEffect(() => {
    if (!autoPlaying) return
    if (step >= TOTAL_STEPS) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS))
    }, 2200)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, step])

  const stepNames = [
    L('Tu frase', 'Your sentence'),
    L('Cortarla en piezas', 'Chop it into pieces'),
    L('Cada pieza es un número', 'Each piece is a number'),
    L('La cuenta', 'The bill'),
  ]

  const cost = (ids.length / 1_000_000) * PRICE_MINI.perMillion

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/tokens
          <span className="docs-header-subtitle">{L('qué es un token y por qué te lo cobran', 'what a token is and why you pay for it')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="demo-tokens" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('La IA nunca ve tus letras: ve piezas numeradas. Esta demo corta una frase de verdad (con el mismo tokenizador de OpenAI, corriendo acá en tu browser) y te muestra qué se cobra.', 'The AI never sees your letters: it sees numbered pieces. This demo chops a real sentence (with the same OpenAI tokenizer, running right here in your browser) and shows you what gets billed.')}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('El texto que ves no es el texto que ve', "The text you see isn't the text it sees")}</h2>
            <p>
              {L('Antes de procesar cualquier cosa, el modelo corta tu texto en piezas llamadas', 'Before processing anything, the model chops your text into pieces called')} <b>tokens</b>: {L('a veces una palabra entera, a veces un pedazo, a veces un signo solo. Y el precio de usar la API se mide exactamente ahí: por token, ida y vuelta.', 'sometimes a whole word, sometimes a chunk, sometimes a lone symbol. And the price of using the API is measured exactly there: per token, both ways.')}
            </p>
            <div className="prov-callout">
              <p>
                {L('La tokenización de esta página es', 'The tokenization on this page is')} <b>{L('real', 'real')}</b> ({L('el BPE', 'the BPE')} <code>o200k_base</code> {L('de OpenAI, corriendo local, sin API). Para tokenizar TU texto, comparar encodings y ver bytes e IDs, andá al lab', 'from OpenAI, running locally, no API). To tokenize YOUR text, compare encodings and see bytes and IDs, go to the lab')} <a href="/tokens">/tokens</a>.
              </p>
            </div>
          </section>

          {/* ============== CONTROLES ============== */}
          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">{L('Paso:', 'Step:')}</span>
                {[1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className={`mch-progress-dot${step >= n ? ' is-done' : ''}`}
                    aria-label={`${L('paso', 'step')} ${n} ${step >= n ? L('completado', 'completed') : L('pendiente', 'pending')}`}
                  >
                    {n}
                  </span>
                ))}
                <span className="mch-progress-meta">
                  {isFresh && L('— todavía no pasó nada', '— nothing happened yet')}
                  {!isFresh && !isDone && `— ${stepNames[step - 1]}`}
                  {isDone && L('— cuenta cerrada', '— bill settled')}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                  title={L('Avanza un paso', 'Advances one step')}
                >
                  ▶ {L('Siguiente paso', 'Next step')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((v) => !v)}
                  disabled={isDone}
                  title={L('Encadena los 4 pasos con un delay', 'Chains the 4 steps with a delay')}
                >
                  {autoPlaying ? L('⏸ Pausar', '⏸ Pause') : L('▶▶ Auto', '▶▶ Auto')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={step === 0 && !autoPlaying}
                  title={L('Volver al paso 0', 'Back to step 0')}
                >
                  ↺ {L('Reiniciar', 'Reset')}
                </button>
              </div>
            </div>
          </section>

          {/* ============== PASOS ============== */}
          <section className="criollo-section">

            {step >= 1 && (
              <div className="mtk-block">
                <div className="mrg-col-title">1 · {L('Tu frase, como la ves vos', 'Your sentence, as you see it')}</div>
                <div className="mtk-phrase">"{phrase}"</div>
                {step === 1 && (
                  <div className="mch-takeaway">
                    {L('Para vos son palabras con acentos, signos y espacios. Para el modelo, todavía no es nada: primero hay que cortarla.', "To you it's words with accents, punctuation and spaces. To the model it's nothing yet: first it must be chopped.")}
                  </div>
                )}
              </div>
            )}

            {step >= 2 && (
              <div className="mtk-block">
                <div className="mrg-col-title">2 · {L('Cortada en piezas (tokens)', 'Chopped into pieces (tokens)')}</div>
                <div className="mtk-pieces">
                  {pieces.map((p, i) => (
                    <span key={i} className="recorrido-demo-chunk" style={{ background: COLORS[i % COLORS.length] }}>
                      {p.replace(/ /g, '␣')}
                    </span>
                  ))}
                </div>
                {step === 2 && (
                  <div className="mch-takeaway">
                    <b>{ids.length} tokens.</b> {L('Fijate: hay palabras enteras, palabras partidas y el espacio viaja pegado a la pieza (␣). Este corte lo hizo el tokenizador real de OpenAI, acá en tu browser.', 'Notice: some words are whole, some are split, and the space travels glued to its piece (␣). This cut was made by the real OpenAI tokenizer, right here in your browser.')}
                  </div>
                )}
              </div>
            )}

            {step >= 3 && (
              <div className="mtk-block">
                <div className="mrg-col-title">3 · {L('Lo que el modelo ve de verdad', 'What the model actually sees')}</div>
                <div className="mtk-pieces">
                  {ids.map((id, i) => (
                    <span key={i} className="mtk-piece">
                      <span className="recorrido-demo-chunk" style={{ background: COLORS[i % COLORS.length] }}>
                        {pieces[i].replace(/ /g, '␣')}
                      </span>
                      <code className="mtk-id">{id}</code>
                    </span>
                  ))}
                </div>
                {step === 3 && (
                  <div className="mch-takeaway">
                    {L('Cada pieza es un número de un diccionario de ~200.000. El modelo trabaja con esos números: por eso no sabe contar las letras de "inteligencia" — nunca las vio.', "Each piece is a number from a ~200,000-entry dictionary. The model works with those numbers: that's why it can't count the letters in \"intelligence\" — it never saw them.")}
                  </div>
                )}
              </div>
            )}

            {step >= 4 && (
              <div className="mtk-block">
                <div className="mrg-col-title">4 · {L('La cuenta', 'The bill')}</div>
                <div className="mtk-bill">
                  <div className="mtk-bill-row">
                    <span>{L('Tu frase', 'Your sentence')}</span>
                    <b>{ids.length} tokens</b>
                  </div>
                  <div className="mtk-bill-row">
                    <span>{PRICE_MINI.model} ({L('entrada', 'input')})</span>
                    <b>US$ {PRICE_MINI.perMillion} {L('por millón', 'per million')}</b>
                  </div>
                  <div className="mtk-bill-row mtk-bill-total">
                    <span>{L('Esta frase te cuesta', 'This sentence costs you')}</span>
                    <b>≈ US$ {cost.toFixed(8)}</b>
                  </div>
                </div>
                <div className="mch-takeaway">
                  <b>{L('Parece regalado, pero se acumula:', 'Looks like pennies, but it compounds:')}</b> {L('también se cobran los tokens que la IA responde (más caros), y en un chat cada mensaje nuevo re-manda TODA la charla anterior. Una conversación larga paga la historia completa una y otra vez.', "the tokens the AI answers with are billed too (at a higher rate), and in a chat every new message re-sends the WHOLE previous conversation. A long chat pays for its full history again and again.")}
                </div>
              </div>
            )}

          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('El token es la unidad de todo', 'The token is the unit of everything')}</b>: {L('del precio, del límite de contexto y de la velocidad. Cuando algo es "muy largo" para la IA, se mide en tokens, no en palabras.', 'of price, of the context limit, and of speed. When something is "too long" for the AI, it\'s measured in tokens, not words.')}
              </li>
              <li>
                <b>{L('El castellano gasta más', 'Spanish costs more')}</b>. {L('El diccionario BPE se entrenó mayormente en inglés: la misma idea en castellano suele salir más cara en tokens.', 'The BPE dictionary was trained mostly on English: the same idea in Spanish usually costs more tokens.')}
              </li>
              <li>
                <b>{L('Por eso falla en letras y aritmética', "That's why it fails at letters and arithmetic")}</b>. {L('"987654321" se parte en pedazos arbitrarios; las letras de adentro de una palabra son invisibles.', '"987654321" gets split into arbitrary chunks; the letters inside a word are invisible.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para jugar con TU texto — comparar encodings, ver bytes, IDs y costos por modelo — andá al lab', 'To play with YOUR text — compare encodings, see bytes, IDs and per-model costs — go to the lab')}{' '}
              <a href="/tokens">/tokens</a>. {L('Y para entender por qué la charla entera se re-manda cada vez,', 'And to understand why the whole chat gets re-sent every time,')}{' '}
              <a href="/demo/chat">/demo/chat</a>.
            </p>
          </section>

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
          </footer>

        </div>
      </div>
    </div>
  )
}
