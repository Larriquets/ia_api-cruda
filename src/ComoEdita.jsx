import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import SpeechReader from './SpeechReader.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/loop — cómo una IA "edita código" sin abrir tu archivo.
 *
 * Idea-fuerza única: la IA solo genera texto. Cuando dice "edito tu código",
 * en realidad escupe un `tool_use` describiendo el cambio. Tu código (el
 * browser) es quien aplica el reemplazo sobre el string del archivo y le
 * devuelve el archivo entero como `tool_result`. La IA lo lee y decide si
 * pide otro cambio o termina.
 *
 * Mock fijo. Sin variantes. Una corrida de 7 pasos sobre el mismo archivo
 * Java. Sin API real — la página es pedagógica. Bilingüe ES/EN.
 */

// El archivo arranca con `saldo` en dos lugares: el campo y el cuerpo de
// `depositar`. Eso obliga al loop a hacer dos `edit_code` y deja claro que
// la IA itera.
const FILE_V0 = `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }
}`

const FILE_V1 = `public class CuentaBancaria {
    private double balance;

    public void depositar(double monto) {
        saldo += monto;
    }
}`

const FILE_V2 = `public class CuentaBancaria {
    private double balance;

    public void depositar(double monto) {
        balance += monto;
    }
}`

// El guion de la corrida. Cada paso tiene:
//  - actor: 'user' | 'ai' | 'code' — quién habla en el diálogo
//  - bubble: qué se muestra en la burbuja
//  - fileAfter: cómo queda el archivo después de este paso
//  - highlightLines: líneas (1-based) que se animan como "recién cambiadas"
//  - flash: si true, el archivo entero pulsa (lo leyeron, no lo cambiaron)
//  - narrator: opcional, el mensaje interpretativo del narrador inferior
// El copy es bilingüe: castellano rioplatense base + traducción EN vía L().
function buildSteps(L) {
  return [
    {
      actor: 'user',
      label: L('TÚ', 'YOU'),
      bubble: { kind: 'text', text: L('Renombrá saldo a balance en toda la clase.', 'Rename saldo to balance across the whole class.') },
      fileAfter: FILE_V0,
      highlightLines: [],
      flash: false,
      narrator: null,
    },
    {
      actor: 'ai',
      label: L('IA', 'AI'),
      bubble: {
        kind: 'tool_use',
        tool: 'read_code',
        args: {},
        hint: L('Necesito ver el código antes de tocarlo.', 'I need to see the code before touching it.'),
      },
      fileAfter: FILE_V0,
      highlightLines: [],
      flash: false,
      narrator: {
        title: L('La IA no abrió tu archivo.', "The AI didn't open your file."),
        body: L('Te lo pidió. Lo que escupió fue texto pidiéndole a tu código que ejecute la función read_code. La IA no tiene acceso a disco — solo escribe texto.', 'It asked for it. What it spat out was text asking your code to run the read_code function. The AI has no disk access — it only writes text.'),
      },
    },
    {
      actor: 'code',
      label: L('TU CÓDIGO', 'YOUR CODE'),
      bubble: {
        kind: 'tool_result',
        summary: L('Acá tenés el archivo entero', "Here's the whole file"),
        content: FILE_V0,
      },
      fileAfter: FILE_V0,
      highlightLines: [],
      flash: true,
      narrator: null,
    },
    {
      actor: 'ai',
      label: L('IA', 'AI'),
      bubble: {
        kind: 'tool_use',
        tool: 'edit_code',
        args: { old: 'double saldo;', new: 'double balance;' },
        hint: L('Reemplazá la declaración del campo.', 'Replace the field declaration.'),
      },
      fileAfter: FILE_V0,
      highlightLines: [],
      flash: false,
      narrator: {
        title: L('La IA no editó nada.', "The AI didn't edit anything."),
        body: L('Solo dijo en texto: "reemplazá esto por esto". El reemplazo lo hace tu código en el paso siguiente — la IA literalmente no puede escribir en el archivo.', 'It only said in text: "replace this with that". Your code does the replacement in the next step — the AI literally cannot write to the file.'),
      },
    },
    {
      actor: 'code',
      label: L('TU CÓDIGO', 'YOUR CODE'),
      bubble: {
        kind: 'tool_result',
        summary: L('OK, reemplazado. Acá va el archivo nuevo', "OK, replaced. Here's the new file"),
        content: FILE_V1,
      },
      fileAfter: FILE_V1,
      highlightLines: [2],
      flash: false,
      narrator: {
        title: L('Tu código devolvió el archivo entero ya modificado.', 'Your code returned the whole file already modified.'),
        body: L('La IA no lo cambió: lo recibe ya cambiado, como texto, y mira si quedó como pidió. En la próxima iteración va a ver que todavía queda un saldo sin renombrar.', "The AI didn't change it: it receives it already changed, as text, and checks whether it came out as requested. On the next iteration it'll see there's still a saldo left to rename."),
      },
    },
    {
      actor: 'ai',
      label: L('IA', 'AI'),
      bubble: {
        kind: 'tool_use',
        tool: 'edit_code',
        args: { old: 'saldo += monto;', new: 'balance += monto;' },
        hint: L('Falta el del método. Reemplazá también acá.', 'The one in the method is missing. Replace it here too.'),
      },
      fileAfter: FILE_V1,
      highlightLines: [],
      flash: false,
      narrator: null,
    },
    {
      actor: 'code',
      label: L('TU CÓDIGO', 'YOUR CODE'),
      bubble: {
        kind: 'tool_result',
        summary: L('OK, reemplazado. Acá va el archivo nuevo', "OK, replaced. Here's the new file"),
        content: FILE_V2,
      },
      fileAfter: FILE_V2,
      highlightLines: [5],
      flash: false,
      narrator: null,
    },
    {
      actor: 'ai',
      label: L('IA', 'AI'),
      bubble: {
        kind: 'text',
        text: L('Listo, renombré saldo a balance en los dos lugares.', 'Done, I renamed saldo to balance in both places.'),
        stopReason: 'end_turn',
      },
      fileAfter: FILE_V2,
      highlightLines: [],
      flash: false,
      narrator: {
        title: L('La IA decidió terminar.', 'The AI decided to stop.'),
        body: L('Después del último tool_result miró el archivo, vio que no quedaba ningún saldo, y eligió no pedir más herramientas. Eso es lo que se ve en el response como stop_reason: "end_turn".', 'After the last tool_result it looked at the file, saw no saldo was left, and chose not to request any more tools. That\'s what shows up in the response as stop_reason: "end_turn".'),
      },
    },
  ]
}

function FileView({ code, highlightLines, flashKey }) {
  // Cada vez que el flashKey cambia, animamos un pulse sobre el <pre>.
  const lines = code.split('\n')
  return (
    <pre className={`ce-file ce-file-flash-${flashKey || 0}`} key={`flash-${flashKey || 0}`}>
      {lines.map((line, i) => {
        const lineNo = i + 1
        const isHighlight = highlightLines.includes(lineNo)
        return (
          <span key={lineNo} className={`ce-file-line${isHighlight ? ' ce-file-line-new' : ''}`}>
            <span className="ce-file-lineno">{String(lineNo).padStart(2, ' ')}</span>
            <span className="ce-file-linetext">{line || ' '}</span>
          </span>
        )
      })}
    </pre>
  )
}

function Bubble({ step, isNew }) {
  const { actor, label, bubble } = step
  const cls = `ce-bubble ce-bubble-${actor}${isNew ? ' ce-bubble-new' : ''}`
  return (
    <div className={cls}>
      <div className="ce-bubble-head">
        <span className={`ce-bubble-label ce-bubble-label-${actor}`}>
          {actor === 'user' && '👤'}
          {actor === 'ai' && '🤖'}
          {actor === 'code' && '⚙️'}
          {' '}{label}
        </span>
        {bubble.kind === 'tool_use' && (
          <span className="ce-bubble-tag ce-bubble-tag-toolcall">tool_use</span>
        )}
        {bubble.kind === 'tool_result' && (
          <span className="ce-bubble-tag ce-bubble-tag-toolresult">tool_result</span>
        )}
        {bubble.kind === 'text' && (
          <span className="ce-bubble-tag ce-bubble-tag-text">text</span>
        )}
      </div>
      <div className="ce-bubble-body">
        {bubble.kind === 'text' && (
          <>
            <div className="ce-bubble-text">{bubble.text}</div>
            {bubble.stopReason && (
              <div className="ce-bubble-stop">
                stop_reason: <code>"{bubble.stopReason}"</code>
              </div>
            )}
          </>
        )}
        {bubble.kind === 'tool_use' && (
          <>
            <div className="ce-bubble-tool">
              <code>{bubble.tool}</code>(
              {Object.keys(bubble.args).length === 0 ? (
                <span className="ce-bubble-args-empty">)</span>
              ) : (
                <span className="ce-bubble-args">
                  {Object.entries(bubble.args).map(([k, v], i, arr) => (
                    <span key={k}>
                      <span className="ce-bubble-arg-key">{k}</span>
                      {': '}
                      <span className="ce-bubble-arg-val">"{v}"</span>
                      {i < arr.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                  )
                </span>
              )}
            </div>
            {bubble.hint && <div className="ce-bubble-hint">↳ {bubble.hint}</div>}
          </>
        )}
        {bubble.kind === 'tool_result' && (
          <>
            <div className="ce-bubble-result-summary">{bubble.summary}</div>
            <pre className="ce-bubble-result-content">{bubble.content}</pre>
          </>
        )}
      </div>
    </div>
  )
}

export default function ComoEdita() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const STEPS = buildSteps(L)
  const TOTAL_STEPS = STEPS.length

  // step = índice del paso actualmente "completado". -1 = nada todavía,
  // muestra el archivo inicial sin burbujas.
  const [step, setStep] = useState(-1)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [lastAdvanceAt, setLastAdvanceAt] = useState(0)
  const autoTimerRef = useRef(null)
  const dialogRef = useRef(null)
  // Contador de "flashes" sobre el archivo para forzar re-mount del <pre>.
  const flashCounterRef = useRef(0)

  // En cada paso 'code' con flash=true, incrementamos el contador (sirve para
  // re-disparar la animación de pulse del archivo).
  const visibleSteps = step >= 0 ? STEPS.slice(0, step + 1) : []
  const currentStepObj = step >= 0 ? STEPS[step] : null

  // El archivo se muestra como esté después del paso actual.
  const fileNow = currentStepObj?.fileAfter ?? FILE_V0
  const highlight = currentStepObj?.highlightLines ?? []
  const flashKey = currentStepObj?.flash ? flashCounterRef.current : 0

  // Scroll del diálogo a la última burbuja al avanzar.
  useEffect(() => {
    if (!dialogRef.current) return
    dialogRef.current.scrollTo({
      top: dialogRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [step])

  const advance = () => {
    if (step >= TOTAL_STEPS - 1) return
    setStep((s) => {
      const next = s + 1
      if (STEPS[next].flash) {
        flashCounterRef.current += 1
      }
      return next
    })
    setLastAdvanceAt(Date.now())
  }

  const goBack = () => {
    if (step < 0) return
    setStep((s) => s - 1)
    setLastAdvanceAt(0)
  }

  const reset = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoPlaying(false)
    setStep(-1)
    setLastAdvanceAt(0)
  }

  useEffect(() => {
    if (!autoPlaying) return
    if (step >= TOTAL_STEPS - 1) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setStep((s) => {
        const next = Math.min(s + 1, TOTAL_STEPS - 1)
        if (STEPS[next].flash) {
          flashCounterRef.current += 1
        }
        return next
      })
      setLastAdvanceAt(Date.now())
    }, 2600)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, step])

  const isDone = step >= TOTAL_STEPS - 1
  const isFresh = step < 0
  const stepLabel = isFresh ? 0 : step + 1
  const narrator = currentStepObj?.narrator || null

  // ¿Es "nueva" la última burbuja? La animamos con fade-in si pasó poco tiempo
  // desde el último avance.
  const justAdvanced = lastAdvanceAt && Date.now() - lastAdvanceAt < 1500

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/loop
          <span className="docs-header-subtitle">
            {L('cómo una IA "edita código" sin nunca abrir tu archivo', 'how an AI "edits code" without ever opening your file')}
          </span>
        </h1>
        <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="demo-loop" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('Es la rampa al loop agéntico. Una corrida sola, paso a paso, para destruir la idea de que "la IA edita tu código". La IA solo genera texto. El que edita es tu código.', 'It\'s the on-ramp to the agentic loop. A single run, step by step, to destroy the idea that "the AI edits your code". The AI only generates text. The one who edits is your code.')}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('La pregunta que esta página contesta', 'The question this page answers')}</h2>
            <p>
              <b>{L('"Si la IA solo genera texto, ¿cómo hace para tocar mi código?"', '"If the AI only generates text, how does it touch my code?"')}</b>
            </p>
            <p>
              {L('Respuesta corta:', 'Short answer:')} <b>{L('no lo toca', "it doesn't")}</b>. {L('La IA escribe un pedido estructurado (un', 'The AI writes a structured request (a')} <code>tool_use</code>) {L('que dice "reemplazá X por Y". Tu código lee ese pedido, encuentra X en el string del archivo, lo reemplaza, y le devuelve el archivo entero a la IA en otro mensaje', 'that says "replace X with Y". Your code reads that request, finds X in the file string, replaces it, and returns the whole file to the AI in another message')}
              (<code>tool_result</code>). {L('La IA lee ese archivo nuevo y decide si pide otra edición o si terminó.', 'The AI reads that new file and decides whether to request another edit or whether it\'s done.')}
            </p>
            <div className="prov-callout">
              <p>
                {L('Esta página no consume API. Mostramos', "This page doesn't consume API. We show")} <b>{L('una', 'one')}</b> {L('corrida mockeada con el prompt fijo:', 'mocked run with the fixed prompt:')} <i>{L('"Renombrá saldo a balance en toda la clase"', '"Rename saldo to balance across the whole class"')}</i>. {L('Para ver una corrida real (con el JSON crudo y todo), andá a', 'To see a real run (with the raw JSON and all), go to')} <a href="/loop-agentico">/loop-agentico</a>.
              </p>
            </div>
          </section>

          {/* ============== CONTROLES ============== */}
          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">{L('Paso:', 'Step:')}</span>
                <span className="ce-progress-now">{stepLabel}</span>
                <span className="mch-progress-meta">{L('de', 'of')} {TOTAL_STEPS}</span>
                <span className="mch-progress-meta">
                  {isFresh && L('— tocá ▶ Empezar para arrancar', '— hit ▶ Start to begin')}
                  {!isFresh && !isDone && `— ${currentStepObj.label} ${currentStepObj.actor === 'user' ? L('mandó la consigna', 'sent the request') : currentStepObj.actor === 'ai' ? L('pidió algo', 'asked for something') : L('respondió', 'responded')}`}
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
                  {isFresh ? L('▶ Empezar', '▶ Start') : L('▶ Siguiente', '▶ Next')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={goBack}
                  disabled={isFresh || autoPlaying}
                  title={L('Volver un paso atrás', 'Go back one step')}
                >
                  ◀ {L('Atrás', 'Back')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((v) => !v)}
                  disabled={isDone}
                  title={L('Encadena los pasos automáticamente', 'Chains the steps automatically')}
                >
                  {autoPlaying ? L('⏸ Pausar', '⏸ Pause') : L('▶▶ Auto', '▶▶ Auto')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={isFresh && !autoPlaying}
                  title={L('Volver al estado inicial', 'Back to the initial state')}
                >
                  ↺ {L('Reiniciar', 'Reset')}
                </button>
              </div>
            </div>
          </section>

          {/* ============== 2 COLUMNAS ============== */}
          <section className="criollo-section">
            <div className="ce-grid">

              {/* ---- COL IZQUIERDA: el archivo ---- */}
              <div className="ce-col ce-col-file">
                <div className="ce-col-header">
                  <span className="ce-col-emoji">📄</span>
                  <span className="ce-col-title">CuentaBancaria.java</span>
                  <span className="ce-col-sub">{L('el archivo en disco', 'the file on disk')}</span>
                </div>
                <FileView
                  code={fileNow}
                  highlightLines={highlight}
                  flashKey={flashKey}
                />
                <div className="ce-col-foot">
                  {L('↑ Esto es tu archivo. La IA', '↑ This is your file. The AI')} <b>{L('no', "doesn't")}</b> {L('lo abre ni lo lee del disco — lo recibe como texto adentro de un', 'open it or read it from disk — it receives it as text inside a')} <code>tool_result</code>.
                </div>
              </div>

              {/* ---- COL DERECHA: el diálogo ---- */}
              <div className="ce-col ce-col-dialog">
                <div className="ce-col-header">
                  <span className="ce-col-emoji">💬</span>
                  <span className="ce-col-title">{L('Diálogo IA ↔ Tu código', 'Dialogue AI ↔ Your code')}</span>
                  <span className="ce-col-sub">{L('tres actores hablando por turnos', 'three actors taking turns')}</span>
                </div>
                <div className="ce-dialog" ref={dialogRef}>
                  {visibleSteps.length === 0 && (
                    <div className="ce-dialog-empty">
                      {L('(todavía no empezó — tocá', "(it hasn't started yet — hit")} <b>{L('▶ Empezar', '▶ Start')}</b>)
                    </div>
                  )}
                  {visibleSteps.map((s, i) => (
                    <Bubble
                      key={i}
                      step={s}
                      isNew={i === visibleSteps.length - 1 && justAdvanced}
                    />
                  ))}
                </div>
                <div className="ce-col-foot">
                  {L('↑ Cada burbuja es', '↑ Each bubble is')} <b>{L('un mensaje en el array', 'a message in the')} <code>messages[]</code> {L('array', 'array')}</b>. {L('Las burbujas verdes (tu código) son lo que normalmente vive invisible adentro del browser.', 'The green bubbles (your code) are what normally lives invisible inside the browser.')}
                </div>
              </div>

            </div>
          </section>

          {/* ============== NARRADOR ============== */}
          <section className="criollo-section">
            <div className={`ce-narrator${narrator ? ' ce-narrator-active' : ''}`}>
              <div className="ce-narrator-step">
                {isFresh
                  ? L('PASO 0 — todavía no empezó la corrida', "STEP 0 — the run hasn't started yet")
                  : `${L('PASO', 'STEP')} ${stepLabel} ${L('de', 'of')} ${TOTAL_STEPS} — ${narratorFactual(currentStepObj, L)}`}
              </div>
              {narrator && (
                <div className="ce-narrator-body">
                  <span className="ce-narrator-arrow">↑</span>
                  <span>
                    <b>{narrator.title}</b> {narrator.body}
                  </span>
                </div>
              )}
              {!narrator && !isFresh && (
                <div className="ce-narrator-body ce-narrator-body-quiet">
                  {L('(no hay nota especial en este paso — seguí avanzando)', '(no special note on this step — keep going)')}
                </div>
              )}
            </div>
          </section>

          {/* ============== CIERRE ============== */}
          {isDone && (
            <section className="criollo-section ce-closing" id="cierre">
              <h2>📌 {L('Lo que importa', 'What matters')}</h2>
              <ol>
                <li>
                  <b>{L('La IA solo genera texto.', 'The AI only generates text.')}</b> {L('Cuando "edita código", lo que hace es escribir un pedido estructurado', 'When it "edits code", what it does is write a structured request')} (<code>tool_use</code>) {L('describiendo el cambio. Tu código aplica el cambio sobre el string del archivo.', 'describing the change. Your code applies the change to the file string.')}
                </li>
                <li>
                  <b>{L('La IA no ve tu disco.', "The AI doesn't see your disk.")}</b> {L('El archivo viaja como texto en cada', 'The file travels as text in every')} <code>tool_result</code>. {L('Si lo borrás del state, la IA no tiene cómo recuperarlo. Si querés que vea otro archivo, lo tenés que pasar también.', "If you delete it from state, the AI has no way to recover it. If you want it to see another file, you have to pass that too.")}
                </li>
                <li>
                  <b>{L('El loop existe porque la IA itera.', 'The loop exists because the AI iterates.')}</b> {L('No hace todo en una llamada. Pide ver, mira el resultado, pide editar, mira cómo quedó, pide editar otra vez, hasta decidir terminar. Eso es el', "It doesn't do everything in one call. It asks to see, looks at the result, asks to edit, looks at how it came out, asks to edit again, until it decides to stop. That's the")} <code>stop_reason: "end_turn"</code>.
                </li>
              </ol>
              <div className="ce-closing-ctas">
                <a href="/loop-agentico" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">🤖</span>
                  <span>
                    <b>{L('¿Querés ver el JSON crudo de una corrida real?', 'Want to see the raw JSON of a real run?')}</b>
                    <span className="ce-closing-cta-sub">→ /loop-agentico</span>
                  </span>
                </a>
                <a href="/agents-md-skills" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">📋</span>
                  <span>
                    <b>{L('¿Y con reglas (AGENTS.md, skills)?', 'And with rules (AGENTS.md, skills)?')}</b>
                    <span className="ce-closing-cta-sub">→ /agents-md-skills</span>
                  </span>
                </a>
                <a href="/demo/editor" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">🎬</span>
                  <span>
                    <b>{L('¿En qué cambia con el Editor (que NO es agéntico)?', 'How does it change with the Editor (which is NOT agentic)?')}</b>
                    <span className="ce-closing-cta-sub">→ /demo/editor</span>
                  </span>
                </a>
              </div>
              <p className="ce-closing-note">
                {L('Heads up: esta corrida tiene 7 pasos. Una real puede tener 2 o 15 — depende de la complejidad del cambio. El mecanismo es el mismo.', 'Heads up: this run has 7 steps. A real one can have 2 or 15 — it depends on the complexity of the change. The mechanism is the same.')}
              </p>
            </section>
          )}

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
          </footer>

        </div>
      </div>
    </div>
  )
}

// Línea factual del narrador: qué pasó en este paso, sin interpretación.
function narratorFactual(step, L) {
  if (!step) return ''
  const { actor, bubble } = step
  if (actor === 'user') return L('Vos mandaste la consigna', 'You sent the request')
  if (actor === 'ai') {
    if (bubble.kind === 'text') return L(`La IA mandó texto y terminó (${bubble.stopReason})`, `The AI sent text and stopped (${bubble.stopReason})`)
    if (bubble.kind === 'tool_use') {
      const args = Object.entries(bubble.args)
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ')
      return L(`La IA pidió: ${bubble.tool}(${args})`, `The AI requested: ${bubble.tool}(${args})`)
    }
  }
  if (actor === 'code') {
    return L('Tu código ejecutó la función y devolvió el resultado', 'Your code ran the function and returned the result')
  }
  return ''
}
