import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'

/**
 * /demo/agents-md
 *
 * Comparador guiado: mismo agente, mismo codigo, mismo prompt humano.
 * La unica variable es si el AGENTS.md se concatena al system prompt.
 * No consume API; todos los pasos estan mockeados para explicar el mecanismo.
 */

const INITIAL_CODE = `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }
}`

const WITHOUT_CODE = `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }

    public void retirar(double monto) {
        saldo -= monto;
    }
}`

const WITH_CODE = `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }

    public void bco_retirar(double monto) {
        if (monto <= 0) {
            throw new IllegalArgumentException("Monto invalido");
        }
        saldo -= monto;
    }
}`

const AGENTS_LINES = [
  { key: 'title', text: '# AGENTS.md' },
  { key: 'blank-1', text: '' },
  { key: 'section', text: '## Reglas obligatorias' },
  { key: 'impact', text: '- Antes de editar, medir impacto con assess_impact.' },
  { key: 'prefix', text: '- Todo metodo nuevo debe usar el prefijo bco_.' },
  { key: 'validation', text: '- Rechazar montos invalidos con IllegalArgumentException.' },
]

const WITHOUT_STEPS = [
  {
    at: 0,
    actor: 'user',
    tag: 'user',
    title: 'Usuario',
    body: 'Agrega un metodo retirar(monto).',
    code: INITIAL_CODE,
    highlightLines: [],
  },
  {
    at: 1,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'read_code()',
    note: 'Necesito ver el codigo.',
    code: INITIAL_CODE,
    highlightLines: [],
  },
  {
    at: 2,
    actor: 'code',
    tag: 'tool_result',
    title: 'Tu codigo',
    body: 'Devuelve CuentaBancaria.java completo.',
    code: INITIAL_CODE,
    highlightLines: [],
  },
  {
    at: 4,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'edit_code(...)',
    note: 'Agrego retirar directo. No tengo reglas extra.',
    code: INITIAL_CODE,
    highlightLines: [],
  },
  {
    at: 5,
    actor: 'code',
    tag: 'tool_result',
    title: 'Tu codigo',
    body: 'OK. Codigo actualizado.',
    code: WITHOUT_CODE,
    highlightLines: [7, 8, 9],
  },
  {
    at: 7,
    actor: 'ai',
    tag: 'text',
    title: 'IA',
    body: 'Listo, agregue retirar(monto).',
    code: WITHOUT_CODE,
    highlightLines: [],
  },
]

const WITH_STEPS = [
  {
    at: 0,
    actor: 'user',
    tag: 'user',
    title: 'Usuario',
    body: 'Agrega un metodo retirar(monto).',
    code: INITIAL_CODE,
    highlightLines: [],
  },
  {
    at: 1,
    actor: 'request',
    tag: 'system',
    title: 'Request',
    body: 'system = AGENT_SYSTEM_PROMPT + AGENTS.md',
    note: 'El archivo de reglas viaja pegado al system.',
    code: INITIAL_CODE,
    highlightLines: [],
    rules: ['impact', 'prefix', 'validation'],
  },
  {
    at: 2,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'assess_impact({ level: "medium" })',
    note: 'Primero mide impacto porque AGENTS.md lo exige.',
    code: INITIAL_CODE,
    highlightLines: [],
    rules: ['impact'],
  },
  {
    at: 3,
    actor: 'code',
    tag: 'tool_result',
    title: 'Tu codigo',
    body: 'Impacto medium. Plan aprobado.',
    code: INITIAL_CODE,
    highlightLines: [],
    rules: ['impact'],
  },
  {
    at: 4,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'read_code()',
    note: 'Ahora si lee el archivo.',
    code: INITIAL_CODE,
    highlightLines: [],
  },
  {
    at: 5,
    actor: 'code',
    tag: 'tool_result',
    title: 'Tu codigo',
    body: 'Devuelve CuentaBancaria.java completo.',
    code: INITIAL_CODE,
    highlightLines: [],
  },
  {
    at: 6,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'edit_code(...)',
    note: 'Agrego bco_retirar con validacion.',
    code: INITIAL_CODE,
    highlightLines: [],
    rules: ['prefix', 'validation'],
  },
  {
    at: 7,
    actor: 'code',
    tag: 'tool_result',
    title: 'Tu codigo',
    body: 'OK. Codigo actualizado con reglas del proyecto.',
    code: WITH_CODE,
    highlightLines: [7, 8, 9, 10, 11, 12],
    rules: ['prefix', 'validation'],
  },
  {
    at: 8,
    actor: 'ai',
    tag: 'text',
    title: 'IA',
    body: 'Listo, agregue bco_retirar(monto) respetando AGENTS.md.',
    code: WITH_CODE,
    highlightLines: [],
    rules: ['prefix', 'validation'],
  },
]

const NARRATOR = {
  '-1': {
    title: 'Misma tarea, dos contextos.',
    body: 'Toca Empezar. La columna SIN corre con el system base. La columna CON recibe el system base mas AGENTS.md.',
  },
  1: {
    title: 'AGENTS.md no esta cargado en la IA.',
    body: 'Esta pegado al system prompt de este request. En el proximo request hay que mandarlo otra vez.',
  },
  2: {
    title: 'Esta tool call no salio del prompt humano.',
    body: 'El usuario pidio retirar(monto). assess_impact aparece porque esa regla viajo dentro del AGENTS.md.',
  },
  4: {
    title: 'Sin AGENTS.md, el agente usa defaults genericos.',
    body: 'La corrida SIN va directo a editar. No sabe que tu proyecto exige medir impacto ni prefijos.',
  },
  7: {
    title: 'Mismo modelo, mismo prompt, distinto system.',
    body: 'La diferencia de comportamiento viene del contexto que tu app decidio mandar.',
  },
}

const TOTAL_STEPS = 9

function latestStep(steps, step) {
  return steps.filter((item) => item.at <= step).at(-1) || null
}

function visibleSteps(steps, step) {
  return steps.filter((item) => item.at <= step)
}

function CodeView({ code, highlightLines }) {
  return (
    <pre className="mag-code">
      {code.split('\n').map((line, index) => {
        const lineNo = index + 1
        const highlighted = highlightLines.includes(lineNo)
        return (
          <span key={lineNo} className={`mag-code-line${highlighted ? ' is-highlighted' : ''}`}>
            <span className="mag-code-lineno">{String(lineNo).padStart(2, ' ')}</span>
            <span className="mag-code-text">{line || ' '}</span>
          </span>
        )
      })}
    </pre>
  )
}

function AgentBubble({ item, isNew }) {
  return (
    <div className={`mag-bubble mag-bubble-${item.actor}${isNew ? ' is-new' : ''}`}>
      <div className="mag-bubble-head">
        <span className="mag-bubble-title">{item.title}</span>
        <span className={`mag-bubble-tag mag-bubble-tag-${item.tag}`}>{item.tag}</span>
      </div>
      <div className="mag-bubble-body">
        <code>{item.body}</code>
      </div>
      {item.note && <div className="mag-bubble-note">{item.note}</div>}
    </div>
  )
}

function RunColumn({ title, subtitle, tone, steps, step, lastAdvanceAt }) {
  const shown = visibleSteps(steps, step)
  const latest = latestStep(steps, step)
  const code = latest?.code ?? INITIAL_CODE
  const highlightLines = latest?.highlightLines ?? []
  const justAdvanced = lastAdvanceAt && Date.now() - lastAdvanceAt < 1400

  return (
    <div className={`mag-run mag-run-${tone}`}>
      <div className="mag-run-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="mag-timeline">
        {shown.length === 0 && (
          <div className="mag-empty">(todavia no empezo)</div>
        )}
        {shown.map((item, index) => (
          <AgentBubble
            key={`${item.at}-${item.tag}-${index}`}
            item={item}
            isNew={index === shown.length - 1 && justAdvanced}
          />
        ))}
      </div>
      <div className="mag-code-wrap">
        <div className="mag-code-label">Codigo en este punto</div>
        <CodeView code={code} highlightLines={highlightLines} />
      </div>
    </div>
  )
}

function AgentsMdPanel({ activeRules }) {
  return (
    <div className="mag-agents-panel">
      <div className="mag-agents-header">
        <h3>AGENTS.md</h3>
        <p>reglas que se concatenan al system</p>
      </div>
      <pre className="mag-agents-file">
        {AGENTS_LINES.map((line, index) => {
          const active = activeRules.includes(line.key)
          return (
            <span key={`${line.key}-${index}`} className={`mag-agents-line${active ? ' is-active' : ''}`}>
              {line.text || ' '}
            </span>
          )
        })}
      </pre>
      <div className="mag-system-preview">
        <div className="mag-system-title">Request CON AGENTS.md</div>
        <code>system = AGENT_SYSTEM_PROMPT + "\n\n" + AGENTS_MD</code>
      </div>
      <div className="mag-agents-foot">
        La IA no aprende estas reglas. Tu app se las repite en cada request.
      </div>
    </div>
  )
}

function activeRulesFor(step) {
  const withStep = latestStep(WITH_STEPS, step)
  if (withStep?.rules?.length) return withStep.rules
  if (step >= 1) return ['impact', 'prefix', 'validation']
  return []
}

export default function ModosAgentsMd() {
  const [step, setStep] = useState(-1)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [lastAdvanceAt, setLastAdvanceAt] = useState(0)
  const autoTimerRef = useRef(null)

  const isFresh = step < 0
  const isDone = step >= TOTAL_STEPS - 1
  const narrator = NARRATOR[String(step)] || null
  const activeRules = activeRulesFor(step)

  const advance = () => {
    if (isDone) return
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1))
    setLastAdvanceAt(Date.now())
  }

  const goBack = () => {
    if (isFresh) return
    setStep((current) => current - 1)
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
    if (isDone) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1))
      setLastAdvanceAt(Date.now())
    }, 2300)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, isDone, step])

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/agents-md
          <span className="docs-header-subtitle">
            AGENTS.md no entrena: se inyecta en cada request
          </span>
        </h1>
        <a href="/" className="clear-btn">Volver</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label="Navegacion de demos">
          <DocsNav current="demo-agents-md" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">Para que sirve esta pagina</div>
            <p>
              Compara dos corridas mockeadas. Mismo agente y misma tarea:
              solo cambia si el <code>AGENTS.md</code> viaja dentro del
              <code> system</code>.
            </p>
          </div>
        </aside>

        <div className="docs-main">
          <section className="criollo-section" id="intro">
            <h2>La pregunta</h2>
            <p>
              Si la IA nace de cero en cada request, <b>como hace para respetar
              reglas de tu proyecto?</b> No las aprende. Tu app se las vuelve a
              mandar en el <code>system</code>.
            </p>
            <div className="prov-callout">
              <p>
                La demo usa un prompt fijo: <i>"Agrega un metodo retirar(monto)."</i>
                A la izquierda ves el AGENTS.md. En el centro corre el agente sin
                esas reglas. A la derecha corre con esas reglas inyectadas.
              </p>
            </div>
          </section>

          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">Paso:</span>
                <span className="ce-progress-now">{isFresh ? 0 : step + 1}</span>
                <span className="mch-progress-meta">de {TOTAL_STEPS}</span>
                <span className="mch-progress-meta">
                  {isFresh && '- toca Empezar para comparar'}
                  {!isFresh && !isDone && '- comparacion en curso'}
                  {isDone && '- comparacion completa'}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                >
                  {isFresh ? 'Empezar' : 'Siguiente'}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={goBack}
                  disabled={isFresh || autoPlaying}
                >
                  Atras
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((value) => !value)}
                  disabled={isDone}
                >
                  {autoPlaying ? 'Pausar' : 'Auto'}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={isFresh && !autoPlaying}
                >
                  Reiniciar
                </button>
              </div>
            </div>
          </section>

          <section className="criollo-section">
            <div className="mag-grid">
              <AgentsMdPanel activeRules={activeRules} />
              <RunColumn
                title="SIN AGENTS.md"
                subtitle="system base solamente"
                tone="without"
                steps={WITHOUT_STEPS}
                step={step}
                lastAdvanceAt={lastAdvanceAt}
              />
              <RunColumn
                title="CON AGENTS.md"
                subtitle="system base + reglas del proyecto"
                tone="with"
                steps={WITH_STEPS}
                step={step}
                lastAdvanceAt={lastAdvanceAt}
              />
            </div>
          </section>

          <section className="criollo-section">
            <div className={`ce-narrator${narrator ? ' ce-narrator-active' : ''}`}>
              <div className="ce-narrator-step">
                {isFresh
                  ? 'PASO 0 - listo para empezar'
                  : `PASO ${step + 1} de ${TOTAL_STEPS} - ${stepSummary(step)}`}
              </div>
              {(narrator || NARRATOR['-1']) && (
                <div className="ce-narrator-body">
                  <span className="ce-narrator-arrow">^</span>
                  <span>
                    <b>{(narrator || NARRATOR['-1']).title}</b>{' '}
                    {(narrator || NARRATOR['-1']).body}
                  </span>
                </div>
              )}
            </div>
          </section>

          {isDone && (
            <section className="criollo-section ce-closing" id="cierre">
              <h2>Lo que importa</h2>
              <ol>
                <li>
                  <b>AGENTS.md viaja en el system prompt.</b> No entrena al
                  modelo ni queda guardado dentro de la IA.
                </li>
                <li>
                  <b>La misma instruccion produce decisiones distintas si cambia
                  el contexto.</b> En este ejemplo, <code>assess_impact</code>,
                  <code> bco_</code> y la validacion aparecen porque fueron reglas
                  enviadas.
                </li>
                <li>
                  <b>El costo es repeticion.</b> Si el loop tiene 6 requests,
                  AGENTS.md viaja 6 veces. Conviene que sea corto, concreto y
                  accionable.
                </li>
              </ol>
              <div className="ce-closing-ctas">
                <a href="/agents-md" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">A</span>
                  <span>
                    <b>Ver el modo real editable</b>
                    <span className="ce-closing-cta-sub">/agents-md</span>
                  </span>
                </a>
                <a href="/agents-md-skills" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">S</span>
                  <span>
                    <b>Ver la misma idea con skills</b>
                    <span className="ce-closing-cta-sub">/agents-md-skills</span>
                  </span>
                </a>
                <a href="/demo/agents-md-skills" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">D</span>
                  <span>
                    <b>Demo: lazy load + test deterministico</b>
                    <span className="ce-closing-cta-sub">/demo/agents-md-skills</span>
                  </span>
                </a>
                <a href="/demo/loop" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">L</span>
                  <span>
                    <b>Ver como se ejecutan las tools</b>
                    <span className="ce-closing-cta-sub">/demo/loop</span>
                  </span>
                </a>
              </div>
            </section>
          )}

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">Volver</a>
          </footer>
        </div>
      </div>
    </div>
  )
}

function stepSummary(step) {
  if (step === 0) return 'misma consigna para las dos corridas'
  if (step === 1) return 'solo CON recibe AGENTS.md en el system'
  if (step === 2) return 'CON pide assess_impact'
  if (step === 3) return 'CON recibe aprobacion de impacto'
  if (step === 4) return 'SIN empieza a editar directo'
  if (step === 5) return 'SIN queda con codigo generico'
  if (step === 6) return 'CON edita usando reglas'
  if (step === 7) return 'CON queda con codigo convencional'
  return 'ambas corridas terminaron'
}
