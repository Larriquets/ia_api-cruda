import { useState, useEffect, useRef, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { runClaudeAgent } from './anthropic-agent.js'
import { runOpenAIAgent } from './openai-agent.js'
import { runLmStudioAgent } from './lmstudio-agent.js'
import { AGENT_SYSTEM_PROMPT } from './agent-tools.js'
import ModeSwitch from './ModeSwitch.jsx'
import ReadDocLink from './ReadDocLink.jsx'
import ConfigBar from './ConfigBar.jsx'
import LmStudioModelPicker from './LmStudioModelPicker.jsx'
import SystemEditor from './SystemEditor.jsx'

// Presets para el agente: variantes que cambian la "personalidad" del loop
// (ritmo de iteración, verbosidad, criterio para usar las tools).
const AGENT_PRESETS = [
  {
    id: 'default',
    label: '🤖 Agente default',
    subtitle: 'el system base de la app',
    prompt: AGENT_SYSTEM_PROMPT,
  },
  {
    id: 'rapido',
    label: '⚡ Rápido y al toque',
    subtitle: 'cero ceremonia, mínimas iteraciones',
    prompt: `Sos un agente de programación. Usás las tools read_code y edit_code para resolver lo que te pide el usuario.
Reglas:
- Hacé el mínimo de iteraciones posibles. Si podés resolver con 1 edit, hacé 1 edit.
- No expliques nada antes ni después salvo que te lo pidan.
- No leas el código si ya lo viste en este turno o en el contexto previo.`,
  },
  {
    id: 'paranoico',
    label: '🛡 Paranoico (lee antes de editar)',
    subtitle: 'siempre read_code primero',
    prompt: `Sos un agente de programación conservador.
Reglas innegociables:
- ANTES de cualquier edit_code, llamá a read_code para confirmar el estado actual del archivo, aunque creas que ya lo sabés.
- Hacé cambios pequeños y atómicos: una sola intención por edit.
- Después del último edit, llamá a read_code una vez más para verificar el resultado y reportarlo.`,
  },
  {
    id: 'narrador',
    label: '🎙 Narrador en castellano',
    subtitle: 'cuenta qué hace antes de cada tool',
    prompt: `Sos un agente de programación didáctico. Usás read_code y edit_code para resolver el pedido.
Reglas:
- Antes de CADA llamada a tool, escribí una oración breve en castellano rioplatense explicando qué vas a hacer y por qué.
- Después de cada tool_result, comentá en una oración qué viste.
- Al final dejá un resumen en 2-3 bullets de qué cambiaste.`,
  },
]

const CODE_KEY = 'agente_code_snapshot'
const LANG_KEY = 'agente_language'
const PROVIDER_KEY = 'chat_provider'
const LOGS_KEY = 'agente_logs'
const COLS_KEY = 'agente_cols'
const AGENT_CONTEXT_KEY = 'agente_context_thread'
const SYSTEM_KEY = 'agente_system_override'
const SYSTEM_OPEN_KEY = 'agente_system_open'
const LOGS_MAX = 500

const DEFAULT_CODE = `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }

    public double getSaldo() {
        return saldo;
    }
}
`

const LANGUAGES = [
  { id: 'java', label: 'Java' },
]

const SUGGESTED_PROMPTS = [
  'Renombrá la variable saldo a balance en toda la clase, incluyendo getters/setters.',
  'Agregá un método retirar(monto) que reste del saldo solo si hay fondos suficientes; si no, no haga nada.',
  'Agregá validación a depositar(): que ignore montos negativos.',
]

const NOISY_SUGGESTED_PROMPTS = [
  'No sé bien qué está mal, pero el saldo a veces queda raro. Cambiá lo mínimo, aunque si hace falta rearmá la clase. Que quede más profesional y no rompas nada.',
  'Agregá retirar, transferir, validar negativos y algún log útil. Pero no quiero logs en producción. Ah, y mantené los nombres actuales salvo los que estén feos.',
  'El usuario no debería poder sacar más plata de la que tiene, excepto cuando sea una cuenta especial. Todavía no existe cuenta especial, pero dejalo preparado sin complicarlo.',
  'Hacé que depositar sea seguro, rápido y fácil de leer. Si ves getters/setters malos cambialos, pero no cambies la API porque hay tests viejos que no te paso.',
  'Me dijeron que balance suena mejor que saldo, pero en español también está bien. Elegí vos. Lo importante es que después se entienda y compile.',
  'Arreglá todo lo que parezca deuda técnica en esta clase. No agregues demasiadas cosas nuevas, salvo validaciones, errores claros, comentarios y compatibilidad futura.',
]

const CONTEXT_BUDGET_TOKENS = 8000
const DEFAULT_COLS = [0.42, 0.32, 0.26]
const MIN_COL = 0.12
const estimateTokens = (value) => Math.ceil(JSON.stringify(value ?? '').length / 4)
const EMPTY_AGENT_CONTEXT = { provider: null, language: null, messages: [] }

export default function LoopAgentico() {
  const [code, setCode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CODE
    return localStorage.getItem(CODE_KEY) ?? DEFAULT_CODE
  })
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'java'
    return localStorage.getItem(LANG_KEY) || 'java'
  })
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'anthropic'
    // Default a Anthropic en agente: Claude rinde mejor con tool-use estructurado.
    return localStorage.getItem(PROVIDER_KEY) || 'anthropic'
  })
  const [instruction, setInstruction] = useState(SUGGESTED_PROMPTS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [finalText, setFinalText] = useState('')
  const [steps, setSteps] = useState([])
  // Historial de pares request/response — uno por iteración. Pedagógicamente clave:
  // muestra cómo el prompt crece turno a turno con los tool_result acumulados.
  const [rawHistory, setRawHistory] = useState([])
  // Iteraciones colapsadas (Set de números). Default: todas expandidas excepto las
  // anteriores cuando llega una nueva, para que el usuario vea la última activa.
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [iterCount, setIterCount] = useState(0)
  const [logs, setLogs] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOGS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [noiseMode, setNoiseMode] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(() => {
    if (typeof window === 'undefined') return AGENT_SYSTEM_PROMPT
    return localStorage.getItem(SYSTEM_KEY) ?? AGENT_SYSTEM_PROMPT
  })
  const [systemOpen, setSystemOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SYSTEM_OPEN_KEY) === '1'
  })
  const [agentContext, setAgentContext] = useState(() => {
    if (typeof window === 'undefined') return EMPTY_AGENT_CONTEXT
    try {
      const raw = localStorage.getItem(AGENT_CONTEXT_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      if (!parsed || !Array.isArray(parsed.messages)) return EMPTY_AGENT_CONTEXT
      return parsed
    } catch {
      return EMPTY_AGENT_CONTEXT
    }
  })
  const [cols, setCols] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_COLS
    try {
      const raw = localStorage.getItem(COLS_KEY)
      if (!raw) return DEFAULT_COLS
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length !== 3) return DEFAULT_COLS
      return parsed
    } catch {
      return DEFAULT_COLS
    }
  })

  const logRef = useRef(null)
  const stepsRef = useRef(null)
  const layoutRef = useRef(null)
  const rawHistoryRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(CODE_KEY, code) } catch { /* noop */ }
  }, [code])
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, language) } catch { /* noop */ }
  }, [language])
  useEffect(() => {
    try {
      const trimmed = logs.slice(-LOGS_MAX)
      localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed))
    } catch { /* noop */ }
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])
  useEffect(() => {
    try { localStorage.setItem(COLS_KEY, JSON.stringify(cols)) } catch { /* noop */ }
  }, [cols])
  useEffect(() => {
    try { localStorage.setItem(AGENT_CONTEXT_KEY, JSON.stringify(agentContext)) } catch { /* noop */ }
  }, [agentContext])
  useEffect(() => {
    try { localStorage.setItem(SYSTEM_KEY, systemPrompt) } catch { /* noop */ }
  }, [systemPrompt])
  useEffect(() => {
    try { localStorage.setItem(SYSTEM_OPEN_KEY, systemOpen ? '1' : '0') } catch { /* noop */ }
  }, [systemOpen])
  useEffect(() => {
    stepsRef.current?.scrollTo({ top: stepsRef.current.scrollHeight })
  }, [steps])
  useEffect(() => {
    rawHistoryRef.current?.scrollTo({ top: rawHistoryRef.current.scrollHeight, behavior: 'smooth' })
  }, [rawHistory.length])

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  const handleSend = async () => {
    if (!instruction.trim() || loading) return
    const contextMatches = agentContext.provider === provider && agentContext.language === language
    const previousMessages = contextMatches ? agentContext.messages : []
    setLoading(true)
    setError(null)
    setFinalText('')
    setSteps([])
    setCollapsed(new Set())
    setIterCount(0)

    appendLog('user', `Instrucción: "${instruction.trim().slice(0, 100)}${instruction.length > 100 ? '…' : ''}"`)
    appendLog('info', `Lenguaje: ${language} · Tamaño código inicial: ${code.length} chars`)
    const providerLabel =
      provider === 'anthropic'
        ? 'Anthropic (Claude)'
        : provider === 'lmstudio'
          ? 'LM Studio (local)'
          : 'OpenAI'
    appendLog('info', `Proveedor: ${providerLabel}`)
    if (previousMessages.length > 0) {
      appendLog('info', `Contexto previo incluido: ${previousMessages.length} mensaje(s)`)
    } else if (agentContext.messages.length > 0) {
      appendLog('info', 'Contexto previo ignorado porque cambió el proveedor o el lenguaje')
    }

    try {
      const runFn =
        provider === 'anthropic'
          ? runClaudeAgent
          : provider === 'lmstudio'
            ? runLmStudioAgent
            : runOpenAIAgent
      const trimmed = systemPrompt.trim()
      const systemOverride = trimmed && trimmed !== AGENT_SYSTEM_PROMPT.trim() ? systemPrompt : null
      if (systemOverride) {
        appendLog('info', `System prompt personalizado (${systemPrompt.length} chars)`)
      }
      const { finalText: ft, code: finalCode, iterations, messages: resultMessages = [] } = await runFn(
        {
          userInstruction: instruction,
          initialCode: code,
          language,
          maxIterations: 8,
          previousMessages,
          systemOverride,
        },
        {
          onLog: appendLog,
          // En cada iteración: request llega primero → empuja entry nueva.
          // Auto-colapsamos las iteraciones previas para que solo la actual quede expandida.
          onRawRequest: (req) =>
            setRawHistory((prev) => {
              const nextN = prev.length + 1
              setCollapsed((c) => {
                const ns = new Set(c)
                for (let i = 1; i < nextN; i++) ns.add(i)
                return ns
              })
              return [...prev, { iter: nextN, request: req, response: null }]
            }),
          // Response llega después → mergea sobre la última entry.
          onRawResponse: (res) =>
            setRawHistory((prev) => {
              if (prev.length === 0) return prev
              const next = prev.slice()
              next[next.length - 1] = { ...next[next.length - 1], response: res }
              return next
            }),
          onStep: (step) => setSteps((prev) => [...prev, step]),
          onCodeChange: setCode,
        },
      )

      setFinalText(ft)
      setIterCount(iterations)
      setAgentContext({ provider, language, messages: resultMessages })
      appendLog('success', `Agente terminó. Código final: ${finalCode.length} chars, ${iterations} iteración(es).`)
    } catch (err) {
      setError(err.message || 'Error al ejecutar el agente')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleResetCode = () => {
    setCode(DEFAULT_CODE)
    setSteps([])
    setFinalText('')
    setAgentContext(EMPTY_AGENT_CONTEXT)
    setRawHistory([])
    setCollapsed(new Set())
    setIterCount(0)
    appendLog('info', 'Editor reseteado al ejemplo y contexto del agente vaciado')
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  const handleClearAgentContext = () => {
    setAgentContext(EMPTY_AGENT_CONTEXT)
    setRawHistory([])
    setCollapsed(new Set())
    setIterCount(0)
    appendLog('info', 'Contexto del agente vaciado')
  }

  // Resizers
  const startResize = (dividerIndex) => (e) => {
    e.preventDefault()
    const layout = layoutRef.current
    if (!layout) return
    const totalWidth = layout.getBoundingClientRect().width
    const startX = e.clientX
    const startCols = cols.slice()
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const deltaFrac = dx / totalWidth
      const a = dividerIndex
      const b = dividerIndex + 1
      let newA = startCols[a] + deltaFrac
      let newB = startCols[b] - deltaFrac
      if (newA < MIN_COL) { newB -= (MIN_COL - newA); newA = MIN_COL }
      if (newB < MIN_COL) { newA -= (MIN_COL - newB); newB = MIN_COL }
      const next = startCols.slice()
      next[a] = newA
      next[b] = newB
      setCols(next)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
  const handleResetCols = () => setCols(DEFAULT_COLS)

  // Agrupamos los steps por iteración para visualizarlos como turnos.
  const stepsByIter = steps.reduce((acc, s) => {
    const key = s.n
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})
  const suggestedPrompts = noiseMode
    ? [
        ...SUGGESTED_PROMPTS.map((prompt) => ({ prompt, noisy: false })),
        ...NOISY_SUGGESTED_PROMPTS.map((prompt) => ({ prompt, noisy: true })),
      ]
    : SUGGESTED_PROMPTS.map((prompt) => ({ prompt, noisy: false }))
  const activeContextMessages =
    agentContext.provider === provider && agentContext.language === language
      ? agentContext.messages
      : []
  const latestRequest = rawHistory[rawHistory.length - 1]?.request
  const contextTokens = latestRequest
    ? estimateTokens(latestRequest)
    : activeContextMessages.length > 0
      ? estimateTokens(activeContextMessages)
      : 0
  const contextPct = Math.min(100, Math.round((contextTokens / CONTEXT_BUDGET_TOKENS) * 100))
  const contextState =
    contextPct >= 80 ? 'high' :
      contextPct >= 55 ? 'medium' :
        'low'

  return (
    <div className="app editor-page">
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label="Ir al inicio">
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <span className="brand">La IA Cruda</span>
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// todo es contexto · modo <span className="brand-mode">Loop Agéntico</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="loop-agentico" />
        </div>
      </header>

      <ConfigBar>
        <label className="hdr-select">
          <span className="hdr-select-label">Proveedor</span>
          <select
            value={provider}
            onChange={(e) => {
              const next = e.target.value
              setProvider(next)
              localStorage.setItem(PROVIDER_KEY, next)
              const label =
                next === 'anthropic'
                  ? 'Anthropic (Claude)'
                  : next === 'lmstudio'
                    ? 'LM Studio (local)'
                    : 'OpenAI'
              appendLog('info', `Proveedor cambiado a ${label}`)
            }}
            className={`hdr-select-input provider-select-${provider}`}
            disabled={loading}
            title="OpenAI usa /chat/completions con function calling; Anthropic usa /messages con tool_use; LM Studio reusa el shape de OpenAI sobre tu modelo local. Mismo concepto, distinto shape."
          >
            <option value="anthropic">🟠 Claude (Anthropic)</option>
            <option value="openai">🟢 OpenAI</option>
            <option value="lmstudio">🔵 LM Studio (local)</option>
          </select>
        </label>

        {provider === 'lmstudio' && <LmStudioModelPicker onLog={appendLog} />}

        <label className="hdr-select">
          <span className="hdr-select-label">Lenguaje</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="hdr-select-input"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </label>
        <label
          className={`noise-toggle${noiseMode ? ' active' : ''}`}
          title="Si está activo, aparecen instrucciones ambiguas y ruidosas como las que escribiría un usuario apurado."
        >
          <input
            type="checkbox"
            checked={noiseMode}
            onChange={(e) => {
              setNoiseMode(e.target.checked)
              appendLog('info', e.target.checked
                ? 'Modo RUIDO activado — se muestran instrucciones ambiguas de mal usuario'
                : 'Modo RUIDO desactivado')
            }}
            disabled={loading}
          />
          <span>🔊 Ruido en instrucciones</span>
        </label>

        <button
          onClick={handleClearAgentContext}
          className="clear-btn"
          type="button"
          disabled={loading || (agentContext.messages.length === 0 && rawHistory.length === 0)}
          title="Borra el thread guardado del agente y el historial raw visible"
        >
          Vaciar contexto
        </button>

        <button onClick={handleResetCode} className="clear-btn" type="button">
          Reset código
        </button>

        <div className="config-bar-actions">
          <a
            href="/demo/loop"
            target="_blank"
            rel="noopener noreferrer"
            className="read-doc-link view-demo-link"
            title="Abre la demo automática del Loop Agéntico en otra pestaña"
          >
            ✂️ Ver Demo
          </a>
          <ReadDocLink section="modo-loop" />
        </div>
      </ConfigBar>

      <div
        className="layout editor-layout editor-layout-resizable"
        ref={layoutRef}
        style={{
          gridTemplateColumns: `${cols[0]}fr 6px ${cols[1]}fr 6px ${cols[2]}fr`,
        }}
      >
        {/* Panel 1 — Editor */}
        <section className="panel editor-panel">
          <div className="panel-title">
            <span>Editor (estado vivo)</span>
            <span className="context-meta">
              {code.length} chars · ≈ {Math.ceil(code.length / 4)} tokens
            </span>
          </div>
          <div className="monaco-wrap">
            <MonacoEditor
              height="100%"
              language={language}
              value={code}
              onChange={(v) => setCode(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
                readOnly: loading,
              }}
            />
          </div>
          <div className="ctx-tip" style={{ borderRadius: 0 }}>
            💡 Mientras el agente corre, vas a ver cómo el código se modifica acá en tiempo real
            cada vez que la IA llama a <code>edit_code</code>. <b>Un solo prompt</b> puede generar
            varias ediciones.
          </div>
        </section>

        <div
          className="col-resizer"
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startResize(0)}
          onDoubleClick={handleResetCols}
          title="Arrastrá para redimensionar · doble clic = reset"
        />

        {/* Panel 2 — Prompt + timeline */}
        <section className="panel instr-panel">
          <div className="panel-title">
            <span>Prompt → Loop agéntico</span>
            <span className={`provider-badge provider-badge-${provider}`}>
              {provider === 'anthropic'
                ? '🟠 Claude'
                : provider === 'lmstudio'
                  ? '🔵 LM Studio'
                  : '🟢 OpenAI'}
            </span>
          </div>
          <div className="instr-body">
            <SystemEditor
              value={systemPrompt}
              onChange={setSystemPrompt}
              defaultPrompt={AGENT_SYSTEM_PROMPT}
              open={systemOpen}
              onToggleOpen={setSystemOpen}
              disabled={loading}
              presets={AGENT_PRESETS}
              onLog={appendLog}
              hint="Reemplaza el system base que viaja en cada iteración del loop. Vacío = se usa el default."
            />
            <div className="suggested-steps">
              <div className="suggested-steps-title">Probá una de estas instrucciones:</div>
              <ol className="suggested-steps-list">
                {suggestedPrompts.map(({ prompt, noisy }, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className={`suggested-step-btn${noisy ? ' suggested-step-btn-noisy' : ''}`}
                      onClick={() => setInstruction(prompt)}
                      disabled={loading}
                      title={noisy ? 'Instrucción ambigua o ruidosa, parecida a la de un usuario apurado' : undefined}
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="suggested-steps-foot">
                A diferencia del editor común, acá <b>la IA no devuelve un bloque de código</b>:
                llama a herramientas (<code>read_code</code>, <code>edit_code</code>) y el código
                se modifica solo. Mirá la timeline de la derecha para ver las idas y vueltas.
              </div>
            </div>
            <textarea
              className="instr-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="¿Qué querés que haga el agente con tu código?"
              disabled={loading}
            />
            <div className="instr-actions">
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !instruction.trim()}
                className="instr-send-btn"
              >
                {loading ? 'Agente trabajando…' : '🤖 Mandar al agente →'}
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="reply-section">
              <div className="reply-header">
                <span>Timeline del agente</span>
                <span className="context-meta">
                  {iterCount > 0 ? `${iterCount} iteración(es)` : 'sin actividad'}
                </span>
              </div>
              <div className="reply-content" ref={stepsRef}>
                {Object.keys(stepsByIter).length === 0 && !finalText && (
                  <span className="empty">La actividad del agente va a aparecer acá: cada llamada a herramienta y su resultado.</span>
                )}
                {Object.entries(stepsByIter).map(([iter, group]) => (
                  <div key={iter} className="agent-iter">
                    <div className="agent-iter-title">— Iteración #{iter} —</div>
                    {group.map((s, idx) => (
                      <AgentStep key={idx} step={s} />
                    ))}
                  </div>
                ))}
                {finalText && (
                  <div className="agent-final">
                    <div className="agent-final-title">✓ Respuesta final del agente</div>
                    <div className="agent-final-text">{finalText}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div
          className="col-resizer"
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startResize(1)}
          onDoubleClick={handleResetCols}
          title="Arrastrá para redimensionar · doble clic = reset"
        />

        {/* Panel 3 — Historial Raw + Log */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Historial Request/Response</span>
            <span className="agent-context-title">
              <span className="context-meta">
                {rawHistory.length === 0
                  ? activeContextMessages.length > 0
                    ? `${activeContextMessages.length} msg(s) guardado(s)`
                    : 'sin actividad'
                  : `${rawHistory.length} iteración(es) · ${activeContextMessages.length} msg(s) guardado(s)`}
              </span>
              <span
                className={`context-dial context-dial-${contextState}`}
                style={{ '--ctx-pct': `${contextPct}%` }}
                title={`Último request: ≈${contextTokens} tokens de ${CONTEXT_BUDGET_TOKENS}`}
              >
                <span className="context-dial-ring">
                  <span className="context-dial-value">{contextPct}%</span>
                </span>
                <span className="context-dial-label">contexto</span>
              </span>
            </span>
          </div>
          <div className="ctx-tip" style={{ marginTop: 0 }}>
            💡 <b>El prompt crece turno a turno.</b> Mirá cómo en cada iteración el array{' '}
            <code>messages</code> incluye los <code>tool_result</code> del turno anterior — eso
            es lo que hace que la IA pueda encadenar llamadas. <b>Un solo prompt</b> tuyo, N
            requests internas.
          </div>

          <div className="raw-history" ref={rawHistoryRef}>
            {rawHistory.length === 0 && (
              <div className="empty" style={{ padding: 12 }}>Mandale una instrucción al agente para ver el historial.</div>
            )}
            {rawHistory.map((entry) => {
              const isCollapsed = collapsed.has(entry.iter)
              const reqMsgCount = entry.request?.body?.messages?.length ?? '?'
              const reqTokens = estimateTokens(entry.request)
              return (
                <div key={entry.iter} className={`raw-iter ${isCollapsed ? 'raw-iter-collapsed' : ''}`}>
                  <button
                    type="button"
                    className="raw-iter-header"
                    onClick={() =>
                      setCollapsed((c) => {
                        const ns = new Set(c)
                        if (ns.has(entry.iter)) ns.delete(entry.iter)
                        else ns.add(entry.iter)
                        return ns
                      })
                    }
                    title="Click para expandir/colapsar"
                  >
                    <span className="raw-iter-chev">{isCollapsed ? '▸' : '▾'}</span>
                    <span className="raw-iter-label">Iteración #{entry.iter}</span>
                    <span className="raw-iter-meta">
                      {reqMsgCount} msg(s) · ≈{reqTokens}t · {entry.response ? `stop=${entry.response.stop_reason ?? entry.response.choices?.[0]?.finish_reason ?? '?'}` : 'esperando…'}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <>
                      <div className="raw-iter-subtitle">→ Request</div>
                      <pre className="raw raw-compact raw-nested">
                        {JSON.stringify(entry.request, null, 2)}
                      </pre>
                      <div className="raw-iter-subtitle">← Response</div>
                      <pre className="raw raw-compact raw-nested">
                        {entry.response ? JSON.stringify(entry.response, null, 2) : '// esperando…'}
                      </pre>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="panel-title panel-title-sub">
            <span>Log</span>
            <span className="panel-links">
              <span className="context-meta">{logs.length} línea(s)</span>
              {logs.length > 0 && (
                <button type="button" onClick={handleClearLogs} className="docs-link">vaciar</button>
              )}
            </span>
          </div>
          <div className="log log-compact" ref={logRef}>
            {logs.length === 0 && <div className="empty">Sin actividad todavía.</div>}
            {logs.map((entry, i) => (
              <div key={i} className={`log-line log-${entry.level}`}>
                <span className="log-time">{entry.timestamp}</span>
                <span className="log-level">[{entry.level}]</span>
                <span className="log-msg">{entry.message}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function AgentStep({ step }) {
  if (step.type === 'iteration_start') {
    return null // ya lo mostramos como header de grupo
  }
  if (step.type === 'tool_use') {
    return (
      <div className="agent-step agent-step-tool-use">
        <div className="agent-step-header">→ tool_use: <code>{step.name}</code></div>
        {step.input && Object.keys(step.input).length > 0 && (
          <pre className="agent-step-body">{JSON.stringify(step.input, null, 2)}</pre>
        )}
      </div>
    )
  }
  if (step.type === 'tool_result') {
    return (
      <div className={`agent-step agent-step-tool-result ${step.isError ? 'agent-step-error' : ''}`}>
        <div className="agent-step-header">
          ← tool_result ({step.name}) {step.isError ? '⚠ error' : ''}
        </div>
        <pre className="agent-step-body">{String(step.content)}</pre>
      </div>
    )
  }
  if (step.type === 'final_text') {
    return null // se muestra abajo, fuera del grupo
  }
  return null
}
