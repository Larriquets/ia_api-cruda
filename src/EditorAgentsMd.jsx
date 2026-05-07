import { useState, useEffect, useRef, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { runClaudeAgent } from './anthropic-agent.js'
import { runOpenAIAgent } from './openai-agent.js'
import ModeSwitch from './ModeSwitch.jsx'

const CODE_KEY = 'agentmd_code_snapshot'
const AGENTS_KEY = 'agentmd_agents_md'
const PROVIDER_KEY = 'chat_provider'
const LOGS_KEY = 'agentmd_logs'
const COLS_KEY = 'agentmd_cols'
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

const DEFAULT_AGENTS_MD = `# Convenciones del proyecto Banco

## Estilo de código
- Los campos privados de las clases del modelo usan prefijo \`_\` (ej: \`_saldo\`, \`_cliente\`).
- Los métodos públicos validan inputs ANTES de modificar estado. Si el input es inválido,
  lanzan \`IllegalArgumentException\` con un mensaje claro en español.
- Nunca uses \`System.out.println\` para logging — siempre usá \`log.info(...)\`,
  \`log.warn(...)\`, etc. (asumí que la clase tiene un campo \`log\` ya inyectado).

## Naming
- Los métodos públicos son verbos en infinitivo en español: \`depositar\`, \`retirar\`, \`consultarSaldo\`.
- Los getters siguen la convención Java estándar: \`getSaldo()\`, \`getCliente()\`.

## Reglas de negocio
- Un monto siempre debe ser estrictamente positivo (\`> 0\`). Cero o negativo es inválido.
- Las operaciones que retiran fondos verifican primero que haya saldo suficiente;
  si no, lanzan \`SaldoInsuficienteException\`.
`

const SUGGESTED_PROMPTS = [
  'Agregá un método retirar(monto).',
  'Agregá un método transferir(destino, monto) que retire de esta cuenta y deposite en otra.',
  'Agregá validación al método depositar para que rechace montos inválidos.',
]

const DEFAULT_COLS = [0.32, 0.42, 0.26]
const MIN_COL = 0.12

export default function EditorAgentsMd() {
  const [code, setCode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CODE
    return localStorage.getItem(CODE_KEY) ?? DEFAULT_CODE
  })
  const [agentsMd, setAgentsMd] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_AGENTS_MD
    return localStorage.getItem(AGENTS_KEY) ?? DEFAULT_AGENTS_MD
  })
  const [useAgentsMd, setUseAgentsMd] = useState(true)
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'anthropic'
    return localStorage.getItem(PROVIDER_KEY) || 'anthropic'
  })
  const [instruction, setInstruction] = useState(SUGGESTED_PROMPTS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [finalText, setFinalText] = useState('')
  const [steps, setSteps] = useState([])
  const [rawHistory, setRawHistory] = useState([])
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [iterCount, setIterCount] = useState(0)
  // Resultado de la comparación: { withCode, withoutCode, withIters, withoutIters, withInitial }
  const [compareResult, setCompareResult] = useState(null)
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
    try { localStorage.setItem(AGENTS_KEY, agentsMd) } catch { /* noop */ }
  }, [agentsMd])
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

  // Devuelve los hooks UI estándar para una corrida de agente.
  const buildHooks = useCallback(
    (codeSetter) => ({
      onLog: appendLog,
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
      onRawResponse: (res) =>
        setRawHistory((prev) => {
          if (prev.length === 0) return prev
          const next = prev.slice()
          next[next.length - 1] = { ...next[next.length - 1], response: res }
          return next
        }),
      onStep: (step) => setSteps((prev) => [...prev, step]),
      onCodeChange: codeSetter,
    }),
    [appendLog],
  )

  // Corrida normal (con o sin AGENTS.md según toggle).
  const handleSend = async () => {
    if (!instruction.trim() || loading) return
    setLoading(true)
    setError(null)
    setFinalText('')
    setSteps([])
    setRawHistory([])
    setCollapsed(new Set())
    setIterCount(0)
    setCompareResult(null)

    appendLog('user', `Instrucción: "${instruction.trim().slice(0, 100)}${instruction.length > 100 ? '…' : ''}"`)
    appendLog('info', `Lenguaje: java · Tamaño código inicial: ${code.length} chars`)
    appendLog('info', `AGENTS.md: ${useAgentsMd ? 'INCLUIDO en system prompt' : 'IGNORADO (toggle off)'}`)
    appendLog('info', `Proveedor: ${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}`)

    try {
      const runFn = provider === 'anthropic' ? runClaudeAgent : runOpenAIAgent
      const { finalText: ft, code: finalCode, iterations } = await runFn(
        {
          userInstruction: instruction,
          initialCode: code,
          language: 'java',
          maxIterations: 8,
          extraSystem: useAgentsMd ? agentsMd : '',
        },
        buildHooks(setCode),
      )
      setFinalText(ft)
      setIterCount(iterations)
      appendLog('success', `Agente terminó. ${finalCode.length} chars finales, ${iterations} iter.`)
    } catch (err) {
      setError(err.message || 'Error al ejecutar el agente')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Comparación: corre la MISMA instrucción dos veces (con y sin AGENTS.md)
  // partiendo del MISMO código inicial, y muestra los dos resultados lado a lado.
  const handleCompare = async () => {
    if (!instruction.trim() || loading) return
    setLoading(true)
    setError(null)
    setFinalText('')
    setSteps([])
    setRawHistory([])
    setCollapsed(new Set())
    setIterCount(0)
    setCompareResult(null)

    const initialSnapshot = code

    appendLog('user', `🔬 COMPARACIÓN — instrucción: "${instruction.trim().slice(0, 80)}…"`)
    appendLog('info', `Código inicial común (${initialSnapshot.length} chars). Ejecutando dos corridas independientes.`)

    const runFn = provider === 'anthropic' ? runClaudeAgent : runOpenAIAgent

    try {
      // 1) CON AGENTS.md
      appendLog('info', '═══ Corrida 1 de 2: CON AGENTS.md ═══')
      let codeWith = initialSnapshot
      const resultWith = await runFn(
        {
          userInstruction: instruction,
          initialCode: initialSnapshot,
          language: 'java',
          maxIterations: 8,
          extraSystem: agentsMd,
        },
        {
          ...buildHooks((c) => { codeWith = c }),
        },
      )

      // 2) SIN AGENTS.md
      appendLog('info', '═══ Corrida 2 de 2: SIN AGENTS.md ═══')
      let codeWithout = initialSnapshot
      const resultWithout = await runFn(
        {
          userInstruction: instruction,
          initialCode: initialSnapshot,
          language: 'java',
          maxIterations: 8,
          extraSystem: '',
        },
        {
          ...buildHooks((c) => { codeWithout = c }),
        },
      )

      setCompareResult({
        withCode: codeWith,
        withoutCode: codeWithout,
        withIters: resultWith.iterations,
        withoutIters: resultWithout.iterations,
        withInitial: initialSnapshot,
      })
      appendLog('success', `Comparación lista. CON: ${codeWith.length} chars / ${resultWith.iterations} iter — SIN: ${codeWithout.length} chars / ${resultWithout.iterations} iter`)
      // Dejamos el código del editor en el estado original para que el usuario
      // pueda elegir cuál aplicar manualmente.
      setCode(initialSnapshot)
    } catch (err) {
      setError(err.message || 'Error en la comparación')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCompareResult = (which) => {
    if (!compareResult) return
    const next = which === 'with' ? compareResult.withCode : compareResult.withoutCode
    setCode(next)
    appendLog('info', `Aplicado al editor el resultado ${which === 'with' ? 'CON' : 'SIN'} AGENTS.md`)
  }

  const handleResetAll = () => {
    setCode(DEFAULT_CODE)
    setAgentsMd(DEFAULT_AGENTS_MD)
    setSteps([])
    setFinalText('')
    setRawHistory([])
    setCompareResult(null)
    appendLog('info', 'Todo reseteado al ejemplo')
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  // Resizers (idem otras páginas)
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

  const stepsByIter = steps.reduce((acc, s) => {
    const key = s.n
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div className="app editor-page">
      <header className="header">
        <h1>📋 AGENTS.md — instrucciones persistentes para el agente</h1>
        <div className="header-actions">
          <ModeSwitch active="agents-md" />
          <label className="hdr-select">
            <span className="hdr-select-label">Proveedor</span>
            <select
              value={provider}
              onChange={(e) => {
                const next = e.target.value
                setProvider(next)
                localStorage.setItem(PROVIDER_KEY, next)
                appendLog('info', `Proveedor cambiado a ${next === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}`)
              }}
              className={`hdr-select-input provider-select-${provider}`}
              disabled={loading}
            >
              <option value="anthropic">🟠 Claude (Anthropic)</option>
              <option value="openai">🟢 OpenAI</option>
            </select>
          </label>
          <button onClick={handleResetAll} className="clear-btn" type="button" disabled={loading}>
            Reset todo
          </button>
        </div>
      </header>

      <div
        className="layout editor-layout editor-layout-resizable"
        ref={layoutRef}
        style={{
          gridTemplateColumns: `${cols[0]}fr 6px ${cols[1]}fr 6px ${cols[2]}fr`,
        }}
      >
        {/* Panel 1 — AGENTS.md */}
        <section className="panel editor-panel">
          <div className="panel-title">
            <span>AGENTS.md</span>
            <label className="agentmd-toggle">
              <input
                type="checkbox"
                checked={useAgentsMd}
                onChange={(e) => setUseAgentsMd(e.target.checked)}
                disabled={loading}
              />
              <span>{useAgentsMd ? 'incluido' : 'ignorado'}</span>
            </label>
          </div>
          <div className="monaco-wrap">
            <MonacoEditor
              height="100%"
              language="markdown"
              value={agentsMd}
              onChange={(v) => setAgentsMd(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: loading,
              }}
            />
          </div>
          <div className="ctx-tip" style={{ borderRadius: 0 }}>
            💡 Este archivo se inyecta en el <code>system</code> prompt del agente
            <b> en cada request</b>. La IA "no aprende" tu proyecto — vos le mandás
            estas reglas todas las veces. Es la única forma porque la IA es
            <b> virgen en cada llamada</b>.
          </div>
        </section>

        <div
          className="col-resizer"
          onMouseDown={startResize(0)}
          onDoubleClick={handleResetCols}
          title="Arrastrá para redimensionar · doble clic = reset"
        />

        {/* Panel 2 — Código + Prompt + Timeline */}
        <section className="panel instr-panel">
          <div className="panel-title">
            <span>Código + instrucción</span>
            <span className={`provider-badge provider-badge-${provider}`}>
              {provider === 'anthropic' ? '🟠 Claude' : '🟢 OpenAI'}
            </span>
          </div>
          <div style={{ flex: '0 0 38%', minHeight: 0, display: 'flex', flexDirection: 'column', borderBottom: '1px solid #334155' }}>
            <MonacoEditor
              height="100%"
              language="java"
              value={code}
              onChange={(v) => setCode(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: loading,
              }}
            />
          </div>
          <div className="instr-body" style={{ flex: 1 }}>
            <div className="suggested-steps">
              <div className="suggested-steps-title">Probá una instrucción y mirá cómo cambia con/sin AGENTS.md:</div>
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
            </div>
            <textarea
              className="instr-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="¿Qué querés que haga el agente?"
              disabled={loading}
              style={{ minHeight: 60 }}
            />
            <div className="instr-actions">
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !instruction.trim()}
                className="instr-send-btn"
              >
                {loading ? 'Trabajando…' : `🤖 Mandar (${useAgentsMd ? 'CON' : 'SIN'} AGENTS.md)`}
              </button>
              <button
                type="button"
                onClick={handleCompare}
                disabled={loading || !instruction.trim()}
                className="instr-apply-btn"
                title="Corre la misma instrucción dos veces — una con AGENTS.md, otra sin — y muestra los resultados lado a lado"
              >
                🔬 Comparar con/sin
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            {compareResult && (
              <div className="compare-panel">
                <div className="compare-header">
                  <span>🔬 Resultado de la comparación</span>
                  <button
                    type="button"
                    className="docs-link"
                    onClick={() => setCompareResult(null)}
                  >
                    cerrar
                  </button>
                </div>
                <div className="compare-grid">
                  <div className="compare-col compare-col-with">
                    <div className="compare-col-title">
                      ✅ CON AGENTS.md
                      <span className="compare-col-meta">{compareResult.withIters} iter · {compareResult.withCode.length} chars</span>
                    </div>
                    <pre className="compare-code">{compareResult.withCode}</pre>
                    <button
                      type="button"
                      className="instr-apply-btn"
                      style={{ width: '100%' }}
                      onClick={() => handleApplyCompareResult('with')}
                    >
                      ✓ Aplicar este al editor
                    </button>
                  </div>
                  <div className="compare-col compare-col-without">
                    <div className="compare-col-title">
                      ❌ SIN AGENTS.md
                      <span className="compare-col-meta">{compareResult.withoutIters} iter · {compareResult.withoutCode.length} chars</span>
                    </div>
                    <pre className="compare-code">{compareResult.withoutCode}</pre>
                    <button
                      type="button"
                      className="instr-apply-btn"
                      style={{ width: '100%' }}
                      onClick={() => handleApplyCompareResult('without')}
                    >
                      ✓ Aplicar este al editor
                    </button>
                  </div>
                </div>
                <div className="ctx-tip" style={{ marginTop: 8 }}>
                  💡 Mismo prompt humano, mismo código inicial, mismo modelo.
                  La <b>única</b> diferencia es el contenido del system prompt.
                  Por eso AGENTS.md no es un detalle — es <b>cómo le enseñás</b>
                  a la IA las convenciones de tu proyecto.
                </div>
              </div>
            )}

            <div className="reply-section" style={{ minHeight: 100 }}>
              <div className="reply-header">
                <span>Timeline del agente</span>
                <span className="context-meta">
                  {iterCount > 0 ? `${iterCount} iteración(es)` : 'sin actividad'}
                </span>
              </div>
              <div className="reply-content" ref={stepsRef}>
                {Object.keys(stepsByIter).length === 0 && !finalText && !compareResult && (
                  <span className="empty">Mandá una instrucción o usá "Comparar con/sin" para ver el efecto del AGENTS.md.</span>
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
                    <div className="agent-final-title">✓ Respuesta final</div>
                    <div className="agent-final-text">{finalText}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div
          className="col-resizer"
          onMouseDown={startResize(1)}
          onDoubleClick={handleResetCols}
          title="Arrastrá para redimensionar · doble clic = reset"
        />

        {/* Panel 3 — Historial Raw + Log */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Historial Request/Response</span>
            <span className="context-meta">
              {rawHistory.length === 0 ? 'sin actividad' : `${rawHistory.length} req`}
            </span>
          </div>
          <div className="ctx-tip" style={{ marginTop: 0 }}>
            💡 Mirá el campo <code>system</code> de cada request — ahí vas a ver
            tu AGENTS.md inyectado en cada llamada (cuando el toggle está ON).
          </div>

          <div className="raw-history" ref={rawHistoryRef}>
            {rawHistory.length === 0 && (
              <div className="empty" style={{ padding: 12 }}>Sin requests todavía.</div>
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
                  >
                    <span className="raw-iter-chev">{isCollapsed ? '▸' : '▾'}</span>
                    <span className="raw-iter-label">Iter #{entry.iter}</span>
                    <span className="raw-iter-meta">
                      {reqMsgCount} msg(s) · {entry.response ? `stop=${entry.response.stop_reason ?? entry.response.choices?.[0]?.finish_reason ?? '?'}` : '…'}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <>
                      <div className="raw-iter-subtitle">→ Request</div>
                      <pre className="raw raw-compact raw-nested">{JSON.stringify(entry.request, null, 2)}</pre>
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
  if (step.type === 'iteration_start' || step.type === 'final_text') return null
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
  return null
}
