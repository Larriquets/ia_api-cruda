import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import SpeechReader from './SpeechReader.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/rag — cómo hace la IA para responder sobre TUS documentos.
 *
 * Animación en 4 pasos de una corrida RAG, sin API: los vectores, los scores
 * y la respuesta están mockeados (calcados de una corrida real del lab /rag).
 * El foco pedagógico es el orden de los pasos y QUÉ viaja en el POST final.
 * Bilingüe ES/EN con el helper L() inline, como el resto de los /demo/*.
 */

// Biblioteca acortada del lab /rag (empresa ficticia: el modelo no puede
// saber estos datos). Scores y vectores calcados de una corrida real.
const DOCS_ES = [
  'Los empleados tienen 19 días hábiles de vacaciones por año. Los días no usados vencen el 31 de marzo.',
  'El horario de oficina es de 9:14 a 17:44. Los viernes se sale a las 15:14.',
  'El comedor sirve milanesas los miércoles. El menú vegetariano se pide al interno 404.',
  'La impresora del piso 3 se llama ROBUSTA-9. La clave de color la tiene Marta, de Compras.',
]

const DOCS_EN = [
  'Employees get 19 business days of vacation per year. Unused days expire on March 31st.',
  'Office hours are 9:14 to 17:44. On Fridays everyone leaves at 15:14.',
  'The cafeteria serves milanesas on Wednesdays. The vegetarian menu is ordered at extension 404.',
  'The 3rd-floor printer is called ROBUSTA-9. Marta, from Purchasing, has the color password.',
]

const QUESTION_ES = '¿Cuántos días de vacaciones tengo y cuándo vencen?'
const QUESTION_EN = 'How many vacation days do I get and when do they expire?'

const ANSWER_ES = 'Tenés 19 días hábiles de vacaciones por año, y los no usados vencen el 31 de marzo.'
const ANSWER_EN = 'You get 19 business days of vacation per year, and unused days expire on March 31st.'

const SYSTEM_ES = 'Respondé usando SOLO la información de los documentos provistos. Si la respuesta no figura ahí, decilo y no inventes.'
const SYSTEM_EN = 'Answer using ONLY the information in the provided documents. If the answer is not there, say so and make nothing up.'

const VECTORS = [
  '[0.07, 0.15, 0.13, -0.09, …]',
  '[-0.09, 0.31, 0.27, -0.11, …]',
  '[-0.16, -0.09, 0.10, -0.17, …]',
  '[0.07, 0.09, 0.11, -0.21, …]',
]
const QUESTION_VECTOR = '[0.05, 0.18, 0.11, -0.07, …]'

const SCORES = [0.53, 0.44, 0.1, -0.03]
const TOP_K = 2
const TOTAL_STEPS = 4

const snippet = (text, max = 46) => (text.length > max ? `${text.slice(0, max)}…` : text)

export default function ModosRag() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const docs = lang === 'en' ? DOCS_EN : DOCS_ES
  const question = lang === 'en' ? QUESTION_EN : QUESTION_ES
  const answer = lang === 'en' ? ANSWER_EN : ANSWER_ES
  const systemText = lang === 'en' ? SYSTEM_EN : SYSTEM_ES

  // step = pasos completados. 0 = nada, 1 = biblioteca indexada,
  // 2 = pregunta vectorizada, 3 = ranking calculado, 4 = POST + respuesta.
  const [step, setStep] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [lastStepAt, setLastStepAt] = useState(0)
  const autoTimerRef = useRef(null)

  const isDone = step >= TOTAL_STEPS
  const isFresh = step === 0

  const advance = () => {
    if (isDone) return
    setStep((s) => s + 1)
    setLastStepAt(Date.now())
  }

  const reset = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoPlaying(false)
    setStep(0)
    setLastStepAt(0)
  }

  useEffect(() => {
    if (!autoPlaying) return
    if (step >= TOTAL_STEPS) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS))
      setLastStepAt(Date.now())
    }, 2200)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, step])

  const justNow = lastStepAt && Date.now() - lastStepAt < 2500

  const stepNames = [
    L('Indexar la biblioteca', 'Index the library'),
    L('Vectorizar la pregunta', 'Vectorize the question'),
    L('Medir parecido', 'Measure similarity'),
    L('Armar el POST y responder', 'Build the POST and answer'),
  ]

  // Ranking ordenado por score (los datos ya vienen en ese orden).
  const ranking = SCORES.map((score, i) => ({ i, score }))

  const userContent = `${L('[DOCUMENTOS RECUPERADOS]', '[RETRIEVED DOCUMENTS]')}\n\n[DOC 1] ${docs[0]}\n\n[DOC 2] ${docs[1]}\n\n${L('[PREGUNTA]', '[QUESTION]')}\n${question}`

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/rag
          <span className="docs-header-subtitle">{L('cómo la IA responde sobre TUS documentos', 'how the AI answers about YOUR documents')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="demo-rag" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('Cuando un chatbot "lee tu PDF", no lo lee: alguien busca los pedacitos más parecidos a tu pregunta y se los pega en el prompt. Esta demo muestra esa búsqueda, paso a paso.', 'When a chatbot "reads your PDF", it doesn\'t: someone finds the pieces most similar to your question and pastes them into the prompt. This demo shows that search, step by step.')}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('El truco detrás de "leé mi documento"', 'The trick behind "read my document"')}</h2>
            <p>
              {L('La IA no conoce tus archivos y no puede tragarse la biblioteca entera en cada pregunta. Lo que hace un producto tipo "chateá con tu PDF" es', 'The AI doesn\'t know your files and can\'t swallow the whole library on every question. What a "chat with your PDF" product does is')} <b>{L('buscar primero, preguntar después', 'search first, ask later')}</b>: {L('convierte cada documento en un vector (una lista de números que ubica su significado en un mapa), convierte tu pregunta en otro, mide qué documentos quedan más cerca y le manda al modelo', 'it turns each document into a vector (a list of numbers placing its meaning on a map), turns your question into another one, measures which documents land closest, and sends the model')} <b>{L('solo esos', 'only those')}</b>. {L('Eso se llama RAG.', "That's called RAG.")}
            </p>
            <div className="prov-callout">
              <p>
                {L('Los vectores, scores y respuesta de esta página están', 'The vectors, scores and answer on this page are')} <b>{L('mockeados', 'mocked')}</b> {L('(calcados de una corrida real, pero sin consumir API). Para hacerlo de verdad, con requests reales, andá al lab', '(traced from a real run, but consuming no API). To do it for real, with real requests, go to the lab')} <a href="/rag">/rag</a>.
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
                  {isDone && L('— corrida completa', '— run complete')}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                  title={L('Avanza un paso de la corrida RAG', 'Advances one step of the RAG run')}
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

            <div className="mch-prompt-preview">
              <span className="mch-prompt-label">{L('La pregunta del usuario:', "The user's question:")}</span>
              <span className="mch-prompt-text">"{question}"</span>
            </div>
          </section>

          {/* ============== DOS COLUMNAS ============== */}
          <section className="criollo-section">
            <div className="mrg-grid">

              {/* ---- BIBLIOTECA ---- */}
              <div className="mch-col">
                <div className="mrg-col-title">📚 {L('Tu biblioteca', 'Your library')}</div>
                <div className="mch-col-desc">
                  {L('Datos internos de una empresa ficticia. La IA no los conoce: no estaban en su entrenamiento.', "A fictional company's internal facts. The AI doesn't know them: they weren't in its training.")}
                </div>

                <div className="mrg-docs">
                  {docs.map((doc, i) => (
                    <div key={i} className={`mrg-doc${step >= 3 ? (i < TOP_K ? ' mrg-doc-in' : ' mrg-doc-out') : ''}`}>
                      <div className="mrg-doc-head">
                        <span className="mrg-doc-label">DOC #{i + 1}</span>
                        {step >= 1 && (
                          <code className={`mrg-vec${step === 1 && justNow ? ' mrg-vec-new' : ''}`}>{VECTORS[i]}</code>
                        )}
                      </div>
                      <div className="mrg-doc-text">{doc}</div>
                    </div>
                  ))}
                </div>

                <div className="mch-takeaway">
                  {step === 0 && L('↑ Todavía son solo texto. Tocá "Siguiente paso" para indexarlos.', '↑ They\'re still just text. Hit "Next step" to index them.')}
                  {step === 1 && (
                    <>
                      <b>{L('Paso 1 — indexar.', 'Step 1 — index.')}</b> {L('Cada documento pasó por /v1/embeddings y volvió como un vector: coordenadas de su significado. Esto se hace UNA vez, no en cada pregunta.', 'Each document went through /v1/embeddings and came back as a vector: coordinates of its meaning. This happens ONCE, not on every question.')}
                    </>
                  )}
                  {step === 2 && L('↑ La biblioteca ya está indexada. Ahora le toca a la pregunta →', '↑ The library is indexed. Now it\'s the question\'s turn →')}
                  {step >= 3 && (
                    <>
                      <b>{L('Verde = viaja.', 'Green = travels.')}</b> {L('Los otros dos documentos quedan afuera del prompt: la IA jamás los va a ver.', 'The other two documents stay out of the prompt: the AI will never see them.')}
                    </>
                  )}
                </div>
              </div>

              {/* ---- LO QUE VIAJA ---- */}
              <div className="mch-col">
                <div className="mrg-col-title">✉️ {L('Lo que viaja a la IA', 'What travels to the AI')}</div>
                <div className="mch-col-desc">
                  {L('La pregunta, el ranking y el POST final. Fijate cuánto de la biblioteca llega de verdad al modelo.', 'The question, the ranking and the final POST. Notice how much of the library actually reaches the model.')}
                </div>

                {step >= 2 && (
                  <div className={`mrg-doc mrg-q${step === 2 && justNow ? ' mrg-vec-new' : ''}`}>
                    <div className="mrg-doc-head">
                      <span className="mrg-doc-label">{L('PREGUNTA', 'QUESTION')}</span>
                      <code className="mrg-vec">{QUESTION_VECTOR}</code>
                    </div>
                    <div className="mrg-doc-text">"{question}"</div>
                  </div>
                )}
                {step === 2 && (
                  <div className="mch-takeaway">
                    <b>{L('Paso 2 — mismo mapa.', 'Step 2 — same map.')}</b> {L('La pregunta se convierte en un vector con el MISMO modelo de embeddings. Si no, las coordenadas no serían comparables.', 'The question becomes a vector with the SAME embeddings model. Otherwise the coordinates wouldn\'t be comparable.')}
                  </div>
                )}

                {step >= 3 && (
                  <>
                    <div className="mrg-rank-title">{L('📐 Parecido pregunta ↔ documento', '📐 Similarity question ↔ document')}</div>
                    <div className="rag-rank">
                      {ranking.map(({ i, score }, pos) => (
                        <div key={i} className={`rag-rank-row${pos < TOP_K ? ' rag-rank-in' : ''}`}>
                          <span className="rag-rank-doc" title={docs[i]}>DOC #{i + 1} · {snippet(docs[i])}</span>
                          <div className="rag-rank-bar-track">
                            <div className="rag-rank-bar" style={{ width: `${Math.max(2, score * 100)}%` }} />
                          </div>
                          <span className="rag-rank-score">{score.toFixed(2)}</span>
                          <span className={`rag-rank-tag${pos < TOP_K ? ' rag-rank-tag-in' : ''}`}>
                            {pos < TOP_K ? L('→ viaja', '→ travels') : L('afuera', 'out')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {step === 3 && (
                  <div className="mch-takeaway">
                    <b>{L('Paso 3 — medir.', 'Step 3 — measure.')}</b> {L('Esta cuenta (similitud coseno) pasa en TU máquina: la IA no participa. Ganan los 2 documentos más cercanos.', 'This math (cosine similarity) runs on YOUR machine: the AI takes no part. The 2 closest documents win.')}
                  </div>
                )}

                {step >= 4 && (
                  <>
                    <div className="mch-payload">
                      <div className="mch-payload-label">POST /v1/chat/completions · messages[]</div>
                      <div className="mch-msglist">
                        <div className={`mch-msg mch-msg-system${justNow ? ' mch-msg-new' : ''}`}>
                          <span className="mch-role mch-role-system">system</span>
                          <span className="mch-content">{systemText}</span>
                        </div>
                        <div className={`mch-msg mch-msg-user${justNow ? ' mch-msg-new' : ''}`}>
                          <span className="mch-role mch-role-user">user</span>
                          <span className="mch-content mrg-user-content">{userContent}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mch-reply">
                      <div className="mch-reply-label">{L('Respuesta de la IA:', "AI's response:")}</div>
                      <div className="mch-reply-text">🤖 {answer}</div>
                    </div>

                    <div className="mch-takeaway">
                      <b>{L('Paso 4 — un POST común.', 'Step 4 — a plain POST.')}</b> {L('El modelo no sabe que hubo una búsqueda: recibe texto pegado en el mensaje, como cualquier chat. La respuesta correcta salió de DOC #1 — no de su "memoria".', 'The model doesn\'t know a search happened: it receives text pasted into the message, like any chat. The correct answer came from DOC #1 — not from its "memory".')}
                    </div>
                  </>
                )}
              </div>

            </div>
          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section demo-closing" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('La "memoria" no está en el modelo', 'The "memory" isn\'t in the model')}</b>. {L('Está en quién decide qué entra al contexto. Cambiá la búsqueda y cambia la respuesta, con el mismo modelo.', 'It\'s in whoever decides what enters the context. Change the search and the answer changes, same model.')}
              </li>
              <li>
                <b>{L('Un embedding no tiene palabras adentro', 'An embedding has no words inside')}</b>. {L('Es una lista de números: la posición del significado del texto en un mapa. Textos parecidos caen cerca.', 'It\'s a list of numbers: the position of the text\'s meaning on a map. Similar texts land close.')}
              </li>
              <li>
                <b>{L('La búsqueda pasa fuera de la IA', 'The search happens outside the AI')}</b>. {L('El modelo de chat solo ve el resultado final pegado en el prompt. Si la búsqueda trae el documento equivocado, la IA responde mal con total confianza.', 'The chat model only sees the final result pasted into the prompt. If the search fetches the wrong document, the AI answers wrong with full confidence.')}
              </li>
              <li>
                <b>{L('Por eso es barato', 'That\'s why it\'s cheap')}</b>. {L('De 4 documentos viajaron 2. Con una biblioteca de 10.000, también viajan 2 — indexar se paga una vez, preguntar cuesta casi lo mismo siempre.', 'Out of 4 documents, 2 traveled. With a library of 10,000, still 2 travel — indexing is paid once, asking costs about the same every time.')}
              </li>
            </ul>
            <div className="demo-closing-ctas">
              <a href="/rag" className="demo-closing-cta">
                <span className="demo-closing-cta-emoji">📚</span>
                <span>
                  <b>{L('¿Querés hacerlo con requests reales — tu biblioteca y la pregunta trampa?', 'Want to do it with real requests — your library and the trap question?')}</b>
                  <span className="demo-closing-cta-sub">→ /rag</span>
                </span>
              </a>
              <a href="/ruido" className="demo-closing-cta">
                <span className="demo-closing-cta-emoji">🔊</span>
                <span>
                  <b>{L('¿Por qué la IA responde mal cuando el contexto viene sucio?', 'Why does the AI answer badly when the context comes in dirty?')}</b>
                  <span className="demo-closing-cta-sub">→ /ruido</span>
                </span>
              </a>
            </div>
          </section>

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
          </footer>

        </div>
      </div>
    </div>
  )
}
