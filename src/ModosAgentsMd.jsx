import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/agents-md
 *
 * Comparador guiado: mismo agente, mismo codigo, mismo prompt humano.
 * La unica variable es si el AGENTS.md se concatena al system prompt.
 * No consume API; todos los pasos estan mockeados para explicar el mecanismo.
 * Bilingue ES/EN.
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

function buildAgentsLines(L) {
  return [
    { key: 'title', text: '# AGENTS.md' },
    { key: 'blank-1', text: '' },
    { key: 'section', text: L('## Reglas obligatorias', '## Mandatory rules') },
    { key: 'impact', text: L('- Antes de editar, medir impacto con assess_impact.', '- Before editing, measure impact with assess_impact.') },
    { key: 'prefix', text: L('- Todo metodo nuevo debe usar el prefijo bco_.', '- Every new method must use the bco_ prefix.') },
    { key: 'validation', text: L('- Rechazar montos invalidos con IllegalArgumentException.', '- Reject invalid amounts with IllegalArgumentException.') },
  ]
}

function buildWithoutSteps(L) {
  return [
    {
      at: 0,
      actor: 'user',
      tag: 'user',
      title: L('Usuario', 'User'),
      body: L('Agrega un metodo retirar(monto).', 'Add a retirar(monto) method.'),
      code: INITIAL_CODE,
      highlightLines: [],
    },
    {
      at: 1,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'read_code()',
      note: L('Necesito ver el codigo.', 'I need to see the code.'),
      code: INITIAL_CODE,
      highlightLines: [],
    },
    {
      at: 2,
      actor: 'code',
      tag: 'tool_result',
      title: L('Tu codigo', 'Your code'),
      body: L('Devuelve CuentaBancaria.java completo.', 'Returns the whole CuentaBancaria.java.'),
      code: INITIAL_CODE,
      highlightLines: [],
    },
    {
      at: 4,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'edit_code(...)',
      note: L('Agrego retirar directo. No tengo reglas extra.', 'I add retirar directly. I have no extra rules.'),
      code: INITIAL_CODE,
      highlightLines: [],
    },
    {
      at: 5,
      actor: 'code',
      tag: 'tool_result',
      title: L('Tu codigo', 'Your code'),
      body: L('OK. Codigo actualizado.', 'OK. Code updated.'),
      code: WITHOUT_CODE,
      highlightLines: [7, 8, 9],
    },
    {
      at: 7,
      actor: 'ai',
      tag: 'text',
      title: L('IA', 'AI'),
      body: L('Listo, agregue retirar(monto).', 'Done, I added retirar(monto).'),
      code: WITHOUT_CODE,
      highlightLines: [],
    },
  ]
}

function buildWithSteps(L) {
  return [
    {
      at: 0,
      actor: 'user',
      tag: 'user',
      title: L('Usuario', 'User'),
      body: L('Agrega un metodo retirar(monto).', 'Add a retirar(monto) method.'),
      code: INITIAL_CODE,
      highlightLines: [],
    },
    {
      at: 1,
      actor: 'request',
      tag: 'system',
      title: 'Request',
      body: 'system = AGENT_SYSTEM_PROMPT + AGENTS.md',
      note: L('El archivo de reglas viaja pegado al system.', 'The rules file travels attached to the system.'),
      code: INITIAL_CODE,
      highlightLines: [],
      rules: ['impact', 'prefix', 'validation'],
    },
    {
      at: 2,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'assess_impact({ level: "medium" })',
      note: L('Primero mide impacto porque AGENTS.md lo exige.', 'It measures impact first because AGENTS.md requires it.'),
      code: INITIAL_CODE,
      highlightLines: [],
      rules: ['impact'],
    },
    {
      at: 3,
      actor: 'code',
      tag: 'tool_result',
      title: L('Tu codigo', 'Your code'),
      body: L('Impacto medium. Plan aprobado.', 'Medium impact. Plan approved.'),
      code: INITIAL_CODE,
      highlightLines: [],
      rules: ['impact'],
    },
    {
      at: 4,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'read_code()',
      note: L('Ahora si lee el archivo.', 'Now it does read the file.'),
      code: INITIAL_CODE,
      highlightLines: [],
    },
    {
      at: 5,
      actor: 'code',
      tag: 'tool_result',
      title: L('Tu codigo', 'Your code'),
      body: L('Devuelve CuentaBancaria.java completo.', 'Returns the whole CuentaBancaria.java.'),
      code: INITIAL_CODE,
      highlightLines: [],
    },
    {
      at: 6,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'edit_code(...)',
      note: L('Agrego bco_retirar con validacion.', 'I add bco_retirar with validation.'),
      code: INITIAL_CODE,
      highlightLines: [],
      rules: ['prefix', 'validation'],
    },
    {
      at: 7,
      actor: 'code',
      tag: 'tool_result',
      title: L('Tu codigo', 'Your code'),
      body: L('OK. Codigo actualizado con reglas del proyecto.', 'OK. Code updated with the project rules.'),
      code: WITH_CODE,
      highlightLines: [7, 8, 9, 10, 11, 12],
      rules: ['prefix', 'validation'],
    },
    {
      at: 8,
      actor: 'ai',
      tag: 'text',
      title: L('IA', 'AI'),
      body: L('Listo, agregue bco_retirar(monto) respetando AGENTS.md.', 'Done, I added bco_retirar(monto) respecting AGENTS.md.'),
      code: WITH_CODE,
      highlightLines: [],
      rules: ['prefix', 'validation'],
    },
  ]
}

function buildNarrator(L) {
  return {
    '-1': {
      title: L('Misma tarea, dos contextos.', 'Same task, two contexts.'),
      body: L('Toca Empezar. La columna SIN corre con el system base. La columna CON recibe el system base mas AGENTS.md.', 'Hit Start. The WITHOUT column runs with the base system. The WITH column receives the base system plus AGENTS.md.'),
    },
    1: {
      title: L('AGENTS.md no esta cargado en la IA.', "AGENTS.md isn't loaded into the AI."),
      body: L('Esta pegado al system prompt de este request. En el proximo request hay que mandarlo otra vez.', 'It\'s attached to this request\'s system prompt. On the next request it has to be sent again.'),
    },
    2: {
      title: L('Esta tool call no salio del prompt humano.', "This tool call didn't come from the human prompt."),
      body: L('El usuario pidio retirar(monto). assess_impact aparece porque esa regla viajo dentro del AGENTS.md.', 'The user asked for retirar(monto). assess_impact appears because that rule traveled inside AGENTS.md.'),
    },
    4: {
      title: L('Sin AGENTS.md, el agente usa defaults genericos.', 'Without AGENTS.md, the agent uses generic defaults.'),
      body: L('La corrida SIN va directo a editar. No sabe que tu proyecto exige medir impacto ni prefijos.', "The WITHOUT run goes straight to editing. It doesn't know your project requires measuring impact or prefixes."),
    },
    7: {
      title: L('Mismo modelo, mismo prompt, distinto system.', 'Same model, same prompt, different system.'),
      body: L('La diferencia de comportamiento viene del contexto que tu app decidio mandar.', 'The behavior difference comes from the context your app decided to send.'),
    },
  }
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

function RunColumn({ title, subtitle, tone, steps, step, lastAdvanceAt, codeLabel, emptyLabel }) {
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
          <div className="mag-empty">{emptyLabel}</div>
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
        <div className="mag-code-label">{codeLabel}</div>
        <CodeView code={code} highlightLines={highlightLines} />
      </div>
    </div>
  )
}

function AgentsMdPanel({ activeRules, agentsLines, L }) {
  return (
    <div className="mag-agents-panel">
      <div className="mag-agents-header">
        <h3>AGENTS.md</h3>
        <p>{L('reglas que se concatenan al system', 'rules concatenated to the system')}</p>
      </div>
      <pre className="mag-agents-file">
        {agentsLines.map((line, index) => {
          const active = activeRules.includes(line.key)
          return (
            <span key={`${line.key}-${index}`} className={`mag-agents-line${active ? ' is-active' : ''}`}>
              {line.text || ' '}
            </span>
          )
        })}
      </pre>
      <div className="mag-system-preview">
        <div className="mag-system-title">{L('Request CON AGENTS.md', 'Request WITH AGENTS.md')}</div>
        <code>system = AGENT_SYSTEM_PROMPT + "\n\n" + AGENTS_MD</code>
      </div>
      <div className="mag-agents-foot">
        {L('La IA no aprende estas reglas. Tu app se las repite en cada request.', "The AI doesn't learn these rules. Your app repeats them on every request.")}
      </div>
    </div>
  )
}

function activeRulesFor(step, withSteps) {
  const withStep = latestStep(withSteps, step)
  if (withStep?.rules?.length) return withStep.rules
  if (step >= 1) return ['impact', 'prefix', 'validation']
  return []
}

export default function ModosAgentsMd() {
  const { lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const AGENTS_LINES = buildAgentsLines(L)
  const WITHOUT_STEPS = buildWithoutSteps(L)
  const WITH_STEPS = buildWithSteps(L)
  const NARRATOR = buildNarrator(L)

  const [step, setStep] = useState(-1)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [lastAdvanceAt, setLastAdvanceAt] = useState(0)
  const autoTimerRef = useRef(null)

  const isFresh = step < 0
  const isDone = step >= TOTAL_STEPS - 1
  const narrator = NARRATOR[String(step)] || null
  const activeRules = activeRulesFor(step, WITH_STEPS)

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
            {L('AGENTS.md no entrena: se inyecta en cada request', "AGENTS.md doesn't train: it's injected on every request")}
          </span>
        </h1>
        <a href="/" className="clear-btn">{L('Volver', 'Back')}</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={L('Navegacion de demos', 'Demos navigation')}>
          <DocsNav current="demo-agents-md" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('Para que sirve esta pagina', "What's this page for?")}</div>
            <p>
              {L('Compara dos corridas mockeadas. Mismo agente y misma tarea: solo cambia si el', 'Compares two mocked runs. Same agent and same task: the only change is whether')} <code>AGENTS.md</code> {L('viaja dentro del', 'travels inside the')}
              <code> system</code>.
            </p>
          </div>
        </aside>

        <div className="docs-main">
          <section className="criollo-section" id="intro">
            <h2>{L('La pregunta', 'The question')}</h2>
            <p>
              {L('Si la IA nace de cero en cada request,', 'If the AI is born from scratch on every request,')} <b>{L('como hace para respetar reglas de tu proyecto?', 'how does it respect your project rules?')}</b> {L('No las aprende. Tu app se las vuelve a mandar en el', "It doesn't learn them. Your app sends them again in the")} <code>system</code>.
            </p>
            <div className="prov-callout">
              <p>
                {L('La demo usa un prompt fijo:', 'The demo uses a fixed prompt:')} <i>{L('"Agrega un metodo retirar(monto)."', '"Add a retirar(monto) method."')}</i>
                {L(' A la izquierda ves el AGENTS.md. En el centro corre el agente sin esas reglas. A la derecha corre con esas reglas inyectadas.', ' On the left you see the AGENTS.md. In the center the agent runs without those rules. On the right it runs with those rules injected.')}
              </p>
            </div>
          </section>

          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">{L('Paso:', 'Step:')}</span>
                <span className="ce-progress-now">{isFresh ? 0 : step + 1}</span>
                <span className="mch-progress-meta">{L('de', 'of')} {TOTAL_STEPS}</span>
                <span className="mch-progress-meta">
                  {isFresh && L('- toca Empezar para comparar', '- hit Start to compare')}
                  {!isFresh && !isDone && L('- comparacion en curso', '- comparison in progress')}
                  {isDone && L('- comparacion completa', '- comparison complete')}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                >
                  {isFresh ? L('Empezar', 'Start') : L('Siguiente', 'Next')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={goBack}
                  disabled={isFresh || autoPlaying}
                >
                  {L('Atras', 'Back')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((value) => !value)}
                  disabled={isDone}
                >
                  {autoPlaying ? L('Pausar', 'Pause') : L('Auto', 'Auto')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={isFresh && !autoPlaying}
                >
                  {L('Reiniciar', 'Reset')}
                </button>
              </div>
            </div>
          </section>

          <section className="criollo-section">
            <div className="mag-grid">
              <AgentsMdPanel activeRules={activeRules} agentsLines={AGENTS_LINES} L={L} />
              <RunColumn
                title={L('SIN AGENTS.md', 'WITHOUT AGENTS.md')}
                subtitle={L('system base solamente', 'base system only')}
                tone="without"
                steps={WITHOUT_STEPS}
                step={step}
                lastAdvanceAt={lastAdvanceAt}
                codeLabel={L('Codigo en este punto', 'Code at this point')}
                emptyLabel={L('(todavia no empezo)', "(hasn't started yet)")}
              />
              <RunColumn
                title={L('CON AGENTS.md', 'WITH AGENTS.md')}
                subtitle={L('system base + reglas del proyecto', 'base system + project rules')}
                tone="with"
                steps={WITH_STEPS}
                step={step}
                lastAdvanceAt={lastAdvanceAt}
                codeLabel={L('Codigo en este punto', 'Code at this point')}
                emptyLabel={L('(todavia no empezo)', "(hasn't started yet)")}
              />
            </div>
          </section>

          <section className="criollo-section">
            <div className={`ce-narrator${narrator ? ' ce-narrator-active' : ''}`}>
              <div className="ce-narrator-step">
                {isFresh
                  ? L('PASO 0 - listo para empezar', 'STEP 0 - ready to start')
                  : `${L('PASO', 'STEP')} ${step + 1} ${L('de', 'of')} ${TOTAL_STEPS} - ${stepSummary(step, L)}`}
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
              <h2>{L('Lo que importa', 'What matters')}</h2>
              <ol>
                <li>
                  <b>{L('AGENTS.md viaja en el system prompt.', 'AGENTS.md travels in the system prompt.')}</b> {L('No entrena al modelo ni queda guardado dentro de la IA.', "It doesn't train the model nor stay stored inside the AI.")}
                </li>
                <li>
                  <b>{L('La misma instruccion produce decisiones distintas si cambia el contexto.', 'The same instruction produces different decisions if the context changes.')}</b> {L('En este ejemplo,', 'In this example,')} <code>assess_impact</code>,
                  <code> bco_</code> {L('y la validacion aparecen porque fueron reglas enviadas.', 'and the validation appear because they were rules that got sent.')}
                </li>
                <li>
                  <b>{L('El costo es repeticion.', 'The cost is repetition.')}</b> {L('Si el loop tiene 6 requests, AGENTS.md viaja 6 veces. Conviene que sea corto, concreto y accionable.', 'If the loop has 6 requests, AGENTS.md travels 6 times. Better keep it short, concrete and actionable.')}
                </li>
              </ol>
              <div className="ce-closing-ctas">
                <a href="/agents-md" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">A</span>
                  <span>
                    <b>{L('Ver el modo real editable', 'See the real editable mode')}</b>
                    <span className="ce-closing-cta-sub">/agents-md</span>
                  </span>
                </a>
                <a href="/agents-md-skills" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">S</span>
                  <span>
                    <b>{L('Ver la misma idea con skills', 'See the same idea with skills')}</b>
                    <span className="ce-closing-cta-sub">/agents-md-skills</span>
                  </span>
                </a>
                <a href="/demo/agents-md-skills" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">D</span>
                  <span>
                    <b>{L('Demo: lazy load + test deterministico', 'Demo: lazy load + deterministic test')}</b>
                    <span className="ce-closing-cta-sub">/demo/agents-md-skills</span>
                  </span>
                </a>
                <a href="/demo/loop" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">L</span>
                  <span>
                    <b>{L('Ver como se ejecutan las tools', 'See how the tools run')}</b>
                    <span className="ce-closing-cta-sub">/demo/loop</span>
                  </span>
                </a>
              </div>
            </section>
          )}

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">{L('Volver', 'Back')}</a>
          </footer>
        </div>
      </div>
    </div>
  )
}

function stepSummary(step, L) {
  if (step === 0) return L('misma consigna para las dos corridas', 'same prompt for both runs')
  if (step === 1) return L('solo CON recibe AGENTS.md en el system', 'only WITH receives AGENTS.md in the system')
  if (step === 2) return L('CON pide assess_impact', 'WITH calls assess_impact')
  if (step === 3) return L('CON recibe aprobacion de impacto', 'WITH gets impact approval')
  if (step === 4) return L('SIN empieza a editar directo', 'WITHOUT starts editing directly')
  if (step === 5) return L('SIN queda con codigo generico', 'WITHOUT ends with generic code')
  if (step === 6) return L('CON edita usando reglas', 'WITH edits using the rules')
  if (step === 7) return L('CON queda con codigo convencional', 'WITH ends with conventional code')
  return L('ambas corridas terminaron', 'both runs finished')
}
