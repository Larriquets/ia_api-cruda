import { useState, useEffect, useRef, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { runClaudeAgent } from './anthropic-agent.js'
import { runOpenAIAgent } from './openai-agent.js'
import { runLmStudioAgent } from './lmstudio-agent.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'

const CODE_KEY = 'agente_code_snapshot'
const LANG_KEY = 'agente_language'
const PROVIDER_KEY = 'chat_provider'
const LOGS_KEY = 'agente_logs'
const COLS_KEY = 'agente_cols'
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
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
]

const SUGGESTED_PROMPTS = [
  'Renombrá la variable saldo a balance en toda la clase, incluyendo getters/setters.',
  'Agregá un método retirar(monto) que reste del saldo solo si hay fondos suficientes; si no, no haga nada.',
  'Agregá validación a depositar(): que ignore montos negativos.',
]

const DEFAULT_COLS = [0.42, 0.32, 0.26]
const MIN_COL = 0.12

export default function EditorAgente() {
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
    setLoading(true)
    setError(null)
    setFinalText('')
    setSteps([])
    setRawHistory([])
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

    try {
      const runFn =
        provider === 'anthropic'
          ? runClaudeAgent
          : provider === 'lmstudio'
            ? runLmStudioAgent
            : runOpenAIAgent
      const { finalText: ft, code: finalCode, iterations } = await runFn(
        {
          userInstruction: instruction,
          initialCode: code,
          language,
          maxIterations: 8,
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
    appendLog('info', 'Editor reseteado al ejemplo')
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
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

  return (
    <div className="app editor-page">
      <header className="header">
        <h1>
          <span className="brand">API a la vista</span>
          <span className="brand-subtitle">— modo <span className="brand-mode">Agente</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="agente" />
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
        <button onClick={handleResetCode} className="clear-btn" type="button">
          Reset código
        </button>
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
            <div className="suggested-steps">
              <div className="suggested-steps-title">Probá una de estas instrucciones:</div>
              <ol className="suggested-steps-list">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="suggested-step-btn"
                      onClick={() => setInstruction(p)}
                      disabled={loading}
                    >
                      {p}
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
            <span className="context-meta">
              {rawHistory.length === 0 ? 'sin actividad' : `${rawHistory.length} iteración(es)`}
            </span>
          </div>
          <div className="ctx-tip" style={{ marginTop: 0 }}>
            💡 <b>El prompt crece turno a turno.</b> Mirá cómo en cada iteración el array
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
                      {reqMsgCount} msg(s) · {entry.response ? `stop=${entry.response.stop_reason ?? entry.response.choices?.[0]?.finish_reason ?? '?'}` : 'esperando…'}
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
