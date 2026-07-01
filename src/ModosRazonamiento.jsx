import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/razonamiento — cómo un modelo razonador piensa antes de responder.
 *
 * Animación en 4 pasos de la MISMA pregunta contra OpenAI y Claude, sin API:
 * requests, thinking, respuesta y usage están mockeados (calcados de corridas
 * reales del lab /razonamiento). El foco pedagógico es doble: los tokens de
 * pensamiento se facturan aunque no se vean, y cada proveedor los expone
 * distinto — OpenAI esconde (resumen + encrypted_content), Claude muestra
 * (thinking entero + signature).
 * Bilingüe ES/EN con el helper L() inline, como el resto de los /demo/*.
 */

const QUESTION_ES =
  'Tres amigos —Ana, Beto y Carla— tienen distintas profesiones: médica, ingeniera y abogada. ' +
  'Sabemos: (1) Ana no es médica. (2) Beto no es ni médico ni abogado. (3) Carla no es ingeniera. ' +
  '¿Qué profesión tiene cada uno?'
const QUESTION_EN =
  'Three friends —Ana, Beto and Carla— have different professions: doctor, engineer and lawyer. ' +
  'We know: (1) Ana is not the doctor. (2) Beto is neither the doctor nor the lawyer. (3) Carla is not the engineer. ' +
  'What does each one do?'

const SYSTEM_ES = 'Pensá paso a paso antes de responder.'
const SYSTEM_EN = 'Think step by step before answering.'

const ANSWER_ES = 'Ana es abogada, Beto es ingeniero y Carla es médica.'
const ANSWER_EN = 'Ana is the lawyer, Beto is the engineer and Carla is the doctor.'

// Lo único que OpenAI expone del razonamiento: un resumen opcional.
const SUMMARY_ES =
  'Asigné profesiones por descarte: la pista (2) le deja a Beto una sola opción, ingeniero; ' +
  'con las pistas (1) y (3), Ana queda como abogada y Carla como médica. ' +
  'Verifiqué la asignación final contra las tres pistas.'
const SUMMARY_EN =
  'Assigned professions by elimination: clue (2) leaves Beto exactly one option, engineer; ' +
  'with clues (1) and (3), Ana ends up the lawyer and Carla the doctor. ' +
  'I checked the final assignment against all three clues.'

// Claude devuelve el thinking ENTERO, no un resumen.
const THINKING_ES = `Tengo tres personas (Ana, Beto, Carla) y tres profesiones (médica, ingeniera, abogada). Voy pista por pista.

Pista (2): Beto no es médico ni abogado. De tres profesiones le queda exactamente una: Beto es ingeniero.

Pista (3): Carla no es ingeniera. Consistente — ingeniero ya es Beto. Carla queda entre médica y abogada.

Pista (1): Ana no es médica. Ingeniera tampoco puede ser (es Beto). Entonces Ana es abogada.

Solo queda una profesión libre: Carla es médica.

Verifico contra las tres pistas: Ana abogada (no médica ✓), Beto ingeniero (ni médico ni abogado ✓), Carla médica (no ingeniera ✓). Cierra.`
const THINKING_EN = `I have three people (Ana, Beto, Carla) and three professions (doctor, engineer, lawyer). Going clue by clue.

Clue (2): Beto is neither the doctor nor the lawyer. Out of three professions exactly one is left: Beto is the engineer.

Clue (3): Carla is not the engineer. Consistent — Beto already took it. Carla is down to doctor or lawyer.

Clue (1): Ana is not the doctor. She can't be the engineer either (that's Beto). So Ana is the lawyer.

Only one profession is left: Carla is the doctor.

Checking against all three clues: Ana lawyer (not doctor ✓), Beto engineer (neither doctor nor lawyer ✓), Carla doctor (not engineer ✓). It holds.`

// Usage calcado de corridas reales del lab /razonamiento.
const USAGE_OPENAI = { input: 94, output: 389, reasoning: 320, total: 483 }
const USAGE_ANTHROPIC = { input: 108, output: 442, total: 550 }

const TOTAL_STEPS = 4

const snippet = (text, max = 72) => (text.length > max ? `${text.slice(0, max)}…` : text)

export default function ModosRazonamiento() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const question = lang === 'en' ? QUESTION_EN : QUESTION_ES
  const systemText = lang === 'en' ? SYSTEM_EN : SYSTEM_ES
  const answer = lang === 'en' ? ANSWER_EN : ANSWER_ES
  const summaryText = lang === 'en' ? SUMMARY_EN : SUMMARY_ES
  const thinkingText = lang === 'en' ? THINKING_EN : THINKING_ES

  // step = pasos completados. 0 = nada, 1 = request armado,
  // 2 = el modelo está pensando, 3 = respuesta + thinking, 4 = usage.
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
    L('Armar el request', 'Build the request'),
    L('El modelo piensa', 'The model thinks'),
    L('Llega la respuesta', 'The answer arrives'),
    L('La cuenta de tokens', 'The token bill'),
  ]

  const qShort = snippet(question)
  const reasoningRatio = Math.round((USAGE_OPENAI.reasoning / USAGE_OPENAI.output) * 100)
  const visibleTokens = USAGE_OPENAI.output - USAGE_OPENAI.reasoning

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/razonamiento
          <span className="docs-header-subtitle">{L('cómo un modelo razonador piensa antes de responder', 'how a reasoning model thinks before answering')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <DocsNav current="demo-razonamiento" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('Un modelo razonador escribe un borrador de pensamiento ANTES de la respuesta. Esos tokens se facturan aunque no los veas. Esta demo corre la misma pregunta contra OpenAI y Claude para mostrar quién te deja ver ese pensamiento y quién no.', 'A reasoning model writes a draft of thought BEFORE the answer. Those tokens get billed even if you never see them. This demo runs the same question against OpenAI and Claude to show who lets you see that thinking and who doesn\'t.')}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('Pensar antes de responder', 'Thinking before answering')}</h2>
            <p>
              {L('Un chat normal arranca a escribir la respuesta token por token, de una. Un modelo razonador primero genera', 'A regular chat starts writing the answer token by token, right away. A reasoning model first generates')} <b>{L('tokens de razonamiento', 'reasoning tokens')}</b>: {L('un borrador interno donde prueba caminos, descarta y verifica — y recién después escribe la respuesta final. Eso lo hace mejor en acertijos, matemática y código… y más caro y más lento. Acá corremos la', 'an internal draft where it tries paths, discards and verifies — and only then writes the final answer. That makes it better at riddles, math and code… and more expensive and slower. Here we run the')} <b>{L('misma pregunta', 'same question')}</b> {L('contra los dos proveedores para ver la diferencia clave: OpenAI esconde el pensamiento, Claude lo muestra entero.', 'against both providers to see the key difference: OpenAI hides the thinking, Claude shows it whole.')}
            </p>
            <div className="prov-callout">
              <p>
                {L('Los requests, el thinking y los tokens de esta página están', 'The requests, thinking and token counts on this page are')} <b>{L('mockeados', 'mocked')}</b> {L('(calcados de corridas reales, pero sin consumir API). Para hacerlo de verdad, con tu pregunta y requests reales, andá al lab', '(traced from real runs, but consuming no API). To do it for real, with your own question and real requests, go to the lab')} <a href="/razonamiento">/razonamiento</a>.
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
                  title={L('Avanza un paso de la corrida', 'Advances one step of the run')}
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
              <span className="mch-prompt-label">{L('La pregunta (la misma para los dos):', 'The question (same for both):')}</span>
              <span className="mch-prompt-text">"{question}"</span>
            </div>
          </section>

          {/* ============== DOS COLUMNAS: OPENAI vs CLAUDE ============== */}
          <section className="criollo-section">
            <div className="mch-grid mrz-grid">

              {/* ---- OPENAI ---- */}
              <div className="mch-col">
                <div className="mch-col-header mch-col-header-openai">
                  <div className="mch-col-title">🟢 OpenAI — {L('esconde el pensamiento', 'hides the thinking')}</div>
                  <span className="mch-col-endpoint">POST /v1/responses · reasoning.effort</span>
                </div>
                <div className="mch-col-desc">
                  {L('Razona en secreto: expone un', 'Reasons in secret: it exposes an optional')} <b>{L('resumen opcional', 'summary')}</b> {L('y el conteo de tokens. El razonamiento crudo nunca sale de OpenAI — viaja cifrado.', 'of the thinking plus the token count. The raw reasoning never leaves OpenAI — it travels encrypted.')}
                </div>

                <div className="mch-payload">
                  {step === 0 && (
                    <div className="mch-prompt-empty">{L('Todavía no viajó nada.', 'Nothing traveled yet.')}</div>
                  )}

                  {step >= 1 && (
                    <>
                      <div className="mch-payload-label">request</div>
                      <pre className={`mrz-json${step === 1 && justNow ? ' mrg-vec-new' : ''}`}>
{`{
  "model": "gpt-5-mini",
  `}<span className="mrz-hl">{`"reasoning": { "effort": "medium", "summary": "detailed" }`}</span>{`,
  "instructions": ${JSON.stringify(systemText)},
  "input": ${JSON.stringify(qShort)}
}`}
                      </pre>
                      <div className="mrz-json-note">
                        {L('Sin', 'No')} <code>temperature</code>: {L('los razonadores la rechazan. La perilla es', 'reasoning models reject it. The knob is')} <code>reasoning.effort</code>.
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <div className="mrz-wait">
                      <div className="razon-thinking-dots"><span></span><span></span><span></span></div>
                      <span>{L('Generando tokens de razonamiento que NUNCA vas a ver…', 'Generating reasoning tokens you will NEVER see…')}</span>
                    </div>
                  )}

                  {step >= 3 && (
                    <div className={`mrz-think mrz-think-openai${step === 3 && justNow ? ' mrg-vec-new' : ''}`}>
                      <div className="mrz-think-head">
                        <span className="mrz-think-tag">type: 'reasoning'</span>
                        <span className="mrz-think-tag mrz-think-tag-lock" title={L('El razonamiento crudo, cifrado. Opaco para vos: sirve para reanudar el pensamiento en otra request sin pagarlo de nuevo.', 'The raw reasoning, encrypted. Opaque to you: it lets you resume the thinking in another request without paying for it again.')}>🔒 encrypted_content</span>
                        <span className="mrz-think-note">{L('resumen — lo único expuesto', 'summary — all you get')}</span>
                      </div>
                      <pre className="mrz-think-text">{summaryText}</pre>
                    </div>
                  )}

                  {step >= 3 && (
                    <div className={`mch-reply${step === 3 && justNow ? ' mch-msg-new' : ''}`}>
                      <div className="mch-reply-label">{L('Respuesta final', 'Final answer')}</div>
                      <div className="mch-reply-text">🤖 {answer}</div>
                    </div>
                  )}

                  {step >= 4 && (
                    <div className={`razon-usage${justNow ? ' mrg-vec-new' : ''}`}>
                      <div className="razon-usage-row">
                        <span>{L('Tokens input', 'Input tokens')}</span>
                        <span><b>{USAGE_OPENAI.input}</b></span>
                      </div>
                      <div className="razon-usage-row">
                        <span>{L('Tokens output total', 'Total output tokens')}</span>
                        <span><b>{USAGE_OPENAI.output}</b></span>
                      </div>
                      <div className="razon-usage-row razon-usage-thinking">
                        <span>↳ {L('de razonamiento (invisibles)', 'reasoning (invisible)')}</span>
                        <span><b>{USAGE_OPENAI.reasoning}</b> ({reasoningRatio}% {L('del output', 'of output')})</span>
                      </div>
                      <div className="razon-usage-row">
                        <span>↳ {L('visibles para el usuario', 'visible to the user')}</span>
                        <span><b>{visibleTokens}</b></span>
                      </div>
                      <div className="mrz-bar" aria-hidden="true">
                        <div className="mrz-bar-think" style={{ width: `${reasoningRatio}%` }} />
                        <div className="mrz-bar-visible" style={{ width: `${100 - reasoningRatio}%` }} />
                      </div>
                      <div className="mrz-bar-legend">
                        <span><span className="mrz-dot mrz-dot-think" />{L('pensamiento (no lo viste)', 'thinking (you never saw it)')}</span>
                        <span><span className="mrz-dot mrz-dot-visible" />{L('respuesta visible', 'visible answer')}</span>
                      </div>
                      <div className="razon-usage-row">
                        <span>{L('Total facturado', 'Total billed')}</span>
                        <span><b>{USAGE_OPENAI.total}</b> token(s)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mch-takeaway">
                  {step === 0 && L('↑ Tocá "Siguiente paso" para armar el request.', '↑ Hit "Next step" to build the request.')}
                  {step === 1 && (
                    <>
                      <b>{L('Paso 1 — el request.', 'Step 1 — the request.')}</b> {L('El pensamiento se pide con', 'Thinking is requested with')} <code>reasoning.effort</code>: {L('más effort = más tokens de pensamiento = más caro y más lento.', 'more effort = more thinking tokens = pricier and slower.')}
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <b>{L('Paso 2 — pensando.', 'Step 2 — thinking.')}</b> {L('Los tokens que está generando ahora no se van a mostrar nunca… pero se facturan igual, como output.', 'The tokens it\'s generating right now will never be shown… but they get billed anyway, as output.')}
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <b>{L('Paso 3 — resumen, no razonamiento.', 'Step 3 — a summary, not the reasoning.')}</b> {L('Lo único expuesto es un', 'The only thing exposed is an optional')} <code>summary</code> {L('opcional (a veces ni eso). El pensamiento crudo quedó en', '(sometimes not even that). The raw thinking stayed inside')} <code>encrypted_content</code>, {L('opaco para vos.', 'opaque to you.')}
                    </>
                  )}
                  {step >= 4 && (
                    <>
                      <b>{L('Paso 4 — la factura.', 'Step 4 — the bill.')}</b> {L(`${USAGE_OPENAI.reasoning} de ${USAGE_OPENAI.output} tokens de output fueron pensamiento invisible: pagaste un ${reasoningRatio}% que jamás viste.`, `${USAGE_OPENAI.reasoning} of ${USAGE_OPENAI.output} output tokens were invisible thinking: you paid for ${reasoningRatio}% you never saw.`)}
                    </>
                  )}
                </div>
              </div>

              {/* ---- CLAUDE ---- */}
              <div className="mch-col">
                <div className="mch-col-header mch-col-header-anthropic">
                  <div className="mch-col-title">🟠 Claude — {L('muestra el pensamiento', 'shows the thinking')}</div>
                  <span className="mch-col-endpoint">POST /v1/messages · thinking.budget_tokens</span>
                </div>
                <div className="mch-col-desc">
                  {L('Razona a la vista: devuelve el', 'Reasons in the open: it returns the')} <b>thinking {L('entero', 'in full')}</b> {L('antes de la respuesta, con una firma para poder reenviarlo en multi-turn.', 'before the answer, with a signature so you can send it back in multi-turn.')}
                </div>

                <div className="mch-payload">
                  {step === 0 && (
                    <div className="mch-prompt-empty">{L('Todavía no viajó nada.', 'Nothing traveled yet.')}</div>
                  )}

                  {step >= 1 && (
                    <>
                      <div className="mch-payload-label">request</div>
                      <pre className={`mrz-json${step === 1 && justNow ? ' mrg-vec-new' : ''}`}>
{`{
  "model": "claude-sonnet-4-5",
  "max_tokens": 16000,
  "temperature": 1,
  `}<span className="mrz-hl">{`"thinking": { "type": "enabled", "budget_tokens": 5000 }`}</span>{`,
  "system": ${JSON.stringify(systemText)},
  "messages": [{ "role": "user", "content": ${JSON.stringify(qShort)} }]
}`}
                      </pre>
                      <div className="mrz-json-note">
                        <code>temperature</code> {L('DEBE ser 1 y', 'MUST be 1 and')} <code>max_tokens</code> {L('mayor que el budget — la API lo exige.', 'greater than the budget — the API demands it.')}
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <div className="mrz-wait">
                      <div className="razon-thinking-dots"><span></span><span></span><span></span></div>
                      <span>{L('Generando el mismo tipo de tokens… que después te muestra TODOS.', 'Generating the same kind of tokens… which it will later show you IN FULL.')}</span>
                    </div>
                  )}

                  {step >= 3 && (
                    <div className={`mrz-think mrz-think-anthropic${step === 3 && justNow ? ' mrg-vec-new' : ''}`}>
                      <div className="mrz-think-head">
                        <span className="mrz-think-tag">type: 'thinking'</span>
                        <span className="mrz-think-tag" title={L('Firma criptográfica del bloque. Sirve para reenviarlo en multi-turn sin que Claude desconfíe.', 'Cryptographic signature of the block. It lets you send it back in multi-turn without Claude distrusting it.')}>✍ signature</span>
                        <span className="mrz-think-note">{L('el razonamiento completo', 'the complete reasoning')}</span>
                      </div>
                      <pre className="mrz-think-text">{thinkingText}</pre>
                    </div>
                  )}

                  {step >= 3 && (
                    <div className={`mch-reply${step === 3 && justNow ? ' mch-msg-new' : ''}`}>
                      <div className="mch-reply-label">{L('Respuesta final', 'Final answer')}</div>
                      <div className="mch-reply-text">🤖 {answer}</div>
                    </div>
                  )}

                  {step >= 4 && (
                    <div className={`razon-usage${justNow ? ' mrg-vec-new' : ''}`}>
                      <div className="razon-usage-row">
                        <span>{L('Tokens input', 'Input tokens')}</span>
                        <span><b>{USAGE_ANTHROPIC.input}</b></span>
                      </div>
                      <div className="razon-usage-row">
                        <span>{L('Tokens output total', 'Total output tokens')}</span>
                        <span><b>{USAGE_ANTHROPIC.output}</b></span>
                      </div>
                      <div className="razon-usage-row razon-usage-thinking">
                        <span>↳ {L('de los cuales, thinking', 'of which, thinking')}</span>
                        <span><i>{L('sin desglose — viene adentro de output_tokens', 'no breakdown — it comes inside output_tokens')}</i></span>
                      </div>
                      <div className="mrz-bar" aria-hidden="true">
                        <div className="mrz-bar-mixed" />
                      </div>
                      <div className="mrz-bar-legend">
                        <span><span className="mrz-dot mrz-dot-mixed" />{L('thinking + respuesta, mezclados en la factura', 'thinking + answer, blended on the bill')}</span>
                      </div>
                      <div className="razon-usage-row">
                        <span>{L('Total facturado', 'Total billed')}</span>
                        <span><b>{USAGE_ANTHROPIC.total}</b> token(s)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mch-takeaway">
                  {step === 0 && L('↑ Misma pregunta, mismo botón: los dos arrancan juntos.', '↑ Same question, same button: both start together.')}
                  {step === 1 && (
                    <>
                      <b>{L('Paso 1 — el request.', 'Step 1 — the request.')}</b> {L('Acá el pensamiento se pide con', 'Here thinking is requested with')} <code>thinking.budget_tokens</code>: {L('un tope de cuánto puede pensar, en tokens.', 'a cap on how much it can think, in tokens.')}
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <b>{L('Paso 2 — pensando.', 'Step 2 — thinking.')}</b> {L('Mismo mecanismo que enfrente. La diferencia no es CÓMO piensa: es qué te dejan ver después.', 'Same mechanism as across the aisle. The difference isn\'t HOW it thinks: it\'s what you get to see afterwards.')}
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <b>{L('Paso 3 — thinking entero.', 'Step 3 — the whole thinking.')}</b> {L('No es un resumen: es el razonamiento completo, firmado', 'Not a summary: the complete reasoning, signed')} (<code>signature</code>) {L('para poder reenviarlo en multi-turn.', 'so you can send it back in multi-turn.')}
                    </>
                  )}
                  {step >= 4 && (
                    <>
                      <b>{L('Paso 4 — la factura.', 'Step 4 — the bill.')}</b> {L('El thinking viene adentro de', 'The thinking comes inside')} <code>output_tokens</code>, {L('sin desglose: sabés cuánto podía pensar porque vos le pusiste el budget.', 'with no breakdown: you know how much it could think because you set the budget.')}
                    </>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('Pensar cuesta tokens', 'Thinking costs tokens')}</b>. {L('Se facturan como output aunque no los veas. En la corrida de OpenAI, el 82% del output fue pensamiento invisible.', 'They\'re billed as output even if you never see them. In the OpenAI run, 82% of the output was invisible thinking.')}
              </li>
              <li>
                <b>{L('Cada proveedor expone distinto', 'Each provider exposes it differently')}</b>. {L('OpenAI te da un resumen opcional (a veces nada) y cifra el resto; Claude te muestra todo y lo firma. El mecanismo de fondo es el mismo.', 'OpenAI gives you an optional summary (sometimes nothing) and encrypts the rest; Claude shows you everything and signs it. The underlying mechanism is the same.')}
              </li>
              <li>
                <b>{L('El effort/budget es una perilla', 'Effort/budget is a knob')}</b>. {L('Más pensamiento = mejor en problemas duros, más caro y más lento. Para "hola, ¿cómo estás?" no hace falta un razonador.', 'More thinking = better on hard problems, pricier and slower. For "hi, how are you?" you don\'t need a reasoner.')}
              </li>
              <li>
                <b>{L('No todos los modelos razonan', 'Not every model reasons')}</b>. {L('gpt-4o-mini no razona; Haiku tampoco. Elegir modelo también es elegir si puede pensar antes de responder.', 'gpt-4o-mini doesn\'t reason; neither does Haiku. Picking a model is also picking whether it can think before answering.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para hacer esto con requests reales — tu propia pregunta, cambiar el effort y ver el JSON crudo — andá al lab', 'To do this with real requests — your own question, changing the effort and seeing the raw JSON — go to the lab')}{' '}
              <a href="/razonamiento">/razonamiento</a>. {L('Y si querés entender qué es exactamente un token de los que acá se facturan,', 'And if you want to understand what exactly one of these billed tokens is,')}{' '}
              <a href="/tokens">/tokens</a>.
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
