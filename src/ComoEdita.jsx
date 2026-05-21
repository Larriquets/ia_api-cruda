import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'

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
 * Java. Sin API real — la página es pedagógica.
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
const STEPS = [
  {
    actor: 'user',
    label: 'TÚ',
    bubble: { kind: 'text', text: 'Renombrá saldo a balance en toda la clase.' },
    fileAfter: FILE_V0,
    highlightLines: [],
    flash: false,
    narrator: null,
  },
  {
    actor: 'ai',
    label: 'IA',
    bubble: {
      kind: 'tool_use',
      tool: 'read_code',
      args: {},
      hint: 'Necesito ver el código antes de tocarlo.',
    },
    fileAfter: FILE_V0,
    highlightLines: [],
    flash: false,
    narrator: {
      title: 'La IA no abrió tu archivo.',
      body: 'Te lo pidió. Lo que escupió fue texto pidiéndole a tu código que ejecute la función read_code. La IA no tiene acceso a disco — solo escribe texto.',
    },
  },
  {
    actor: 'code',
    label: 'TU CÓDIGO',
    bubble: {
      kind: 'tool_result',
      summary: 'Acá tenés el archivo entero',
      content: FILE_V0,
    },
    fileAfter: FILE_V0,
    highlightLines: [],
    flash: true,
    narrator: null,
  },
  {
    actor: 'ai',
    label: 'IA',
    bubble: {
      kind: 'tool_use',
      tool: 'edit_code',
      args: { old: 'double saldo;', new: 'double balance;' },
      hint: 'Reemplazá la declaración del campo.',
    },
    fileAfter: FILE_V0,
    highlightLines: [],
    flash: false,
    narrator: {
      title: 'La IA no editó nada.',
      body: 'Solo dijo en texto: "reemplazá esto por esto". El reemplazo lo hace tu código en el paso siguiente — la IA literalmente no puede escribir en el archivo.',
    },
  },
  {
    actor: 'code',
    label: 'TU CÓDIGO',
    bubble: {
      kind: 'tool_result',
      summary: 'OK, reemplazado. Acá va el archivo nuevo',
      content: FILE_V1,
    },
    fileAfter: FILE_V1,
    highlightLines: [2],
    flash: false,
    narrator: {
      title: 'Tu código devolvió el archivo entero ya modificado.',
      body: 'La IA no lo cambió: lo recibe ya cambiado, como texto, y mira si quedó como pidió. En la próxima iteración va a ver que todavía queda un saldo sin renombrar.',
    },
  },
  {
    actor: 'ai',
    label: 'IA',
    bubble: {
      kind: 'tool_use',
      tool: 'edit_code',
      args: { old: 'saldo += monto;', new: 'balance += monto;' },
      hint: 'Falta el del método. Reemplazá también acá.',
    },
    fileAfter: FILE_V1,
    highlightLines: [],
    flash: false,
    narrator: null,
  },
  {
    actor: 'code',
    label: 'TU CÓDIGO',
    bubble: {
      kind: 'tool_result',
      summary: 'OK, reemplazado. Acá va el archivo nuevo',
      content: FILE_V2,
    },
    fileAfter: FILE_V2,
    highlightLines: [5],
    flash: false,
    narrator: null,
  },
  {
    actor: 'ai',
    label: 'IA',
    bubble: {
      kind: 'text',
      text: 'Listo, renombré saldo a balance en los dos lugares.',
      stopReason: 'end_turn',
    },
    fileAfter: FILE_V2,
    highlightLines: [],
    flash: false,
    narrator: {
      title: 'La IA decidió terminar.',
      body: 'Después del último tool_result miró el archivo, vio que no quedaba ningún saldo, y eligió no pedir más herramientas. Eso es lo que se ve en el response como stop_reason: "end_turn".',
    },
  },
]

const TOTAL_STEPS = STEPS.length

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
            cómo una IA "edita código" sin nunca abrir tu archivo
          </span>
        </h1>
        <a href="/" className="clear-btn">← Modos</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label="Navegación de documentación">
          <DocsNav current="demo-loop" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">¿Para qué sirve esta página?</div>
            <p>
              Es la rampa al loop agéntico. Una corrida sola, paso a paso, para
              destruir la idea de que "la IA edita tu código". La IA solo
              genera texto. El que edita es tu código.
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 La pregunta que esta página contesta</h2>
            <p>
              <b>"Si la IA solo genera texto, ¿cómo hace para tocar mi código?"</b>
            </p>
            <p>
              Respuesta corta: <b>no lo toca</b>. La IA escribe un pedido
              estructurado (un <code>tool_use</code>) que dice "reemplazá X por Y".
              Tu código lee ese pedido, encuentra X en el string del archivo, lo
              reemplaza, y le devuelve el archivo entero a la IA en otro mensaje
              (<code>tool_result</code>). La IA lee ese archivo nuevo y decide si
              pide otra edición o si terminó.
            </p>
            <div className="prov-callout">
              <p>
                Esta página no consume API. Mostramos <b>una</b> corrida
                mockeada con el prompt fijo: <i>"Renombrá saldo a balance en
                toda la clase"</i>. Para ver una corrida real (con el JSON
                crudo y todo), andá a <a href="/loop-agentico">/loop-agentico</a>.
              </p>
            </div>
          </section>

          {/* ============== CONTROLES ============== */}
          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">Paso:</span>
                <span className="ce-progress-now">{stepLabel}</span>
                <span className="mch-progress-meta">de {TOTAL_STEPS}</span>
                <span className="mch-progress-meta">
                  {isFresh && '— tocá ▶ Empezar para arrancar'}
                  {!isFresh && !isDone && `— ${currentStepObj.label} ${currentStepObj.actor === 'user' ? 'mandó la consigna' : currentStepObj.actor === 'ai' ? 'pidió algo' : 'respondió'}`}
                  {isDone && '— corrida completa'}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                  title="Avanza un paso de la corrida"
                >
                  {isFresh ? '▶ Empezar' : '▶ Siguiente'}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={goBack}
                  disabled={isFresh || autoPlaying}
                  title="Volver un paso atrás"
                >
                  ◀ Atrás
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((v) => !v)}
                  disabled={isDone}
                  title="Encadena los pasos automáticamente"
                >
                  {autoPlaying ? '⏸ Pausar' : '▶▶ Auto'}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={isFresh && !autoPlaying}
                  title="Volver al estado inicial"
                >
                  ↺ Reiniciar
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
                  <span className="ce-col-sub">el archivo en disco</span>
                </div>
                <FileView
                  code={fileNow}
                  highlightLines={highlight}
                  flashKey={flashKey}
                />
                <div className="ce-col-foot">
                  ↑ Esto es tu archivo. La IA <b>no</b> lo abre ni lo lee del
                  disco — lo recibe como texto adentro de un <code>tool_result</code>.
                </div>
              </div>

              {/* ---- COL DERECHA: el diálogo ---- */}
              <div className="ce-col ce-col-dialog">
                <div className="ce-col-header">
                  <span className="ce-col-emoji">💬</span>
                  <span className="ce-col-title">Diálogo IA ↔ Tu código</span>
                  <span className="ce-col-sub">tres actores hablando por turnos</span>
                </div>
                <div className="ce-dialog" ref={dialogRef}>
                  {visibleSteps.length === 0 && (
                    <div className="ce-dialog-empty">
                      (todavía no empezó — tocá <b>▶ Empezar</b>)
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
                  ↑ Cada burbuja es <b>un mensaje en el array <code>messages[]</code></b>.
                  Las burbujas verdes (tu código) son lo que normalmente vive
                  invisible adentro del browser.
                </div>
              </div>

            </div>
          </section>

          {/* ============== NARRADOR ============== */}
          <section className="criollo-section">
            <div className={`ce-narrator${narrator ? ' ce-narrator-active' : ''}`}>
              <div className="ce-narrator-step">
                {isFresh
                  ? 'PASO 0 — todavía no empezó la corrida'
                  : `PASO ${stepLabel} de ${TOTAL_STEPS} — ${narratorFactual(currentStepObj)}`}
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
                  (no hay nota especial en este paso — seguí avanzando)
                </div>
              )}
            </div>
          </section>

          {/* ============== CIERRE ============== */}
          {isDone && (
            <section className="criollo-section ce-closing" id="cierre">
              <h2>📌 Lo que importa</h2>
              <ol>
                <li>
                  <b>La IA solo genera texto.</b> Cuando "edita código", lo que
                  hace es escribir un pedido estructurado (<code>tool_use</code>)
                  describiendo el cambio. Tu código aplica el cambio sobre el
                  string del archivo.
                </li>
                <li>
                  <b>La IA no ve tu disco.</b> El archivo viaja como texto en
                  cada <code>tool_result</code>. Si lo borrás del state, la IA no
                  tiene cómo recuperarlo. Si querés que vea otro archivo, lo
                  tenés que pasar también.
                </li>
                <li>
                  <b>El loop existe porque la IA itera.</b> No hace todo en una
                  llamada. Pide ver, mira el resultado, pide editar, mira cómo
                  quedó, pide editar otra vez, hasta decidir terminar. Eso es
                  el <code>stop_reason: "end_turn"</code>.
                </li>
              </ol>
              <div className="ce-closing-ctas">
                <a href="/loop-agentico" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">🤖</span>
                  <span>
                    <b>¿Querés ver el JSON crudo de una corrida real?</b>
                    <span className="ce-closing-cta-sub">→ /loop-agentico</span>
                  </span>
                </a>
                <a href="/agents-md-skills" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">📋</span>
                  <span>
                    <b>¿Y con reglas (AGENTS.md, skills)?</b>
                    <span className="ce-closing-cta-sub">→ /agents-md-skills</span>
                  </span>
                </a>
                <a href="/demo/editor" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">🎬</span>
                  <span>
                    <b>¿En qué cambia con el Editor (que NO es agéntico)?</b>
                    <span className="ce-closing-cta-sub">→ /demo/editor</span>
                  </span>
                </a>
              </div>
              <p className="ce-closing-note">
                Heads up: esta corrida tiene 7 pasos. Una real puede tener 2 o
                15 — depende de la complejidad del cambio. El mecanismo es el
                mismo.
              </p>
            </section>
          )}

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">← Modos</a>
          </footer>

        </div>
      </div>
    </div>
  )
}

// Línea factual del narrador: qué pasó en este paso, sin interpretación.
function narratorFactual(step) {
  if (!step) return ''
  const { actor, bubble } = step
  if (actor === 'user') return 'Vos mandaste la consigna'
  if (actor === 'ai') {
    if (bubble.kind === 'text') return `La IA mandó texto y terminó (${bubble.stopReason})`
    if (bubble.kind === 'tool_use') {
      const args = Object.entries(bubble.args)
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ')
      return `La IA pidió: ${bubble.tool}(${args})`
    }
  }
  if (actor === 'code') {
    return 'Tu código ejecutó la función y devolvió el resultado'
  }
  return ''
}
