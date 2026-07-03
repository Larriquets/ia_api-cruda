import { useCallback, useEffect, useRef, useState } from 'react'
import BrandHome from './BrandHome.jsx'
import { mcpInitialize, mcpListTools, mcpCallTool, DEFAULT_MCP_HOST, MCP_PROTOCOL_VERSION } from './mcp-client.js'
import { runMcpAgent, MCP_AGENT_DEFAULT_SYSTEM } from './mcp-agent.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import WelcomeModal from './WelcomeModal.jsx'
import DemoBacklink from './DemoBacklink.jsx'

const HOST_KEY = 'mcp_host'
const LOGS_KEY = 'mcp_logs'
const PROVIDER_KEY = 'mcp_provider'
const AGENT_SYSTEM_KEY = 'mcp_agent_system'
const LOGS_MAX = 300

const AGENT_PRESETS = [
  {
    id: 'doble',
    label: '🌦️+💵 Dos tools',
    text: '¿Qué clima hace en Rosario y a cuánto está el dólar blue? Respondé en una sola oración.',
    hint: 'Obliga dos tool calls distintas. Mirá si las pide juntas en un turno o de a una.',
  },
  {
    id: 'notas',
    label: '📝 Estado en el server',
    text: "Guardá una nota que diga 'traer mate el viernes' y después leeme todas las notas guardadas.",
    hint: 'Tool calls secuenciales: la segunda depende del efecto de la primera.',
  },
  {
    id: 'sintool',
    label: '🤔 Sin tools',
    text: '¿Cuánto es 7 × 8? Respondé solo el número.',
    hint: 'Nada que ver con las tools — a ver si el modelo llama alguna al pedo.',
  },
]

const safeReadJSON = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function Mcp() {
  const [host, setHost] = useState(() => localStorage.getItem(HOST_KEY) || DEFAULT_MCP_HOST)
  const [serverInfo, setServerInfo] = useState(null) // result de initialize
  const [tools, setTools] = useState(null)           // null = todavía no se pidió
  const [selectedTool, setSelectedTool] = useState(null)
  const [argValues, setArgValues] = useState({})
  const [callResult, setCallResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rawRequest, setRawRequest] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [logs, setLogs] = useState(() => safeReadJSON(LOGS_KEY) || [])

  // Paso 4 — agente con tools MCP
  const [agentProvider, setAgentProvider] = useState(() => {
    const saved = localStorage.getItem(PROVIDER_KEY)
    return saved === 'anthropic' ? 'anthropic' : 'openai'
  })
  const [agentSystem, setAgentSystem] = useState(
    () => localStorage.getItem(AGENT_SYSTEM_KEY) ?? MCP_AGENT_DEFAULT_SYSTEM,
  )
  const [agentTask, setAgentTask] = useState('')
  const [agentSteps, setAgentSteps] = useState([])
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentResult, setAgentResult] = useState(null)

  const logRef = useRef(null)

  useEffect(() => { localStorage.setItem(HOST_KEY, host) }, [host])
  useEffect(() => { localStorage.setItem(PROVIDER_KEY, agentProvider) }, [agentProvider])
  useEffect(() => { localStorage.setItem(AGENT_SYSTEM_KEY, agentSystem) }, [agentSystem])
  useEffect(() => {
    try {
      const trimmed = logs.slice(-LOGS_MAX)
      localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed))
    } catch { /* noop */ }
  }, [logs])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  const hooks = {
    onLog: appendLog,
    onRawRequest: setRawRequest,
    onRawResponse: setRawResponse,
  }

  // Paso 1 — initialize
  const handleInitialize = async () => {
    setLoading(true)
    setError(null)
    setCallResult(null)
    try {
      const result = await mcpInitialize(host, hooks)
      setServerInfo(result)
      setTools(null)
      setSelectedTool(null)
    } catch (err) {
      setError(err.message)
      setServerInfo(null)
    } finally {
      setLoading(false)
    }
  }

  // Paso 2 — tools/list
  const handleListTools = async () => {
    setLoading(true)
    setError(null)
    setCallResult(null)
    try {
      const list = await mcpListTools(host, hooks)
      setTools(list)
      setSelectedTool(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Paso 3 — tools/call
  const handleCallTool = async (e) => {
    e.preventDefault()
    if (!selectedTool || loading) return
    setLoading(true)
    setError(null)
    setCallResult(null)
    try {
      const result = await mcpCallTool(host, selectedTool.name, argValues, hooks)
      setCallResult(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Paso 4 — el modelo elige las tools, el cliente las ejecuta vía MCP.
  const handleRunAgent = async (e) => {
    e.preventDefault()
    const task = agentTask.trim()
    if (!task || agentRunning || !tools || tools.length === 0) return
    setAgentRunning(true)
    setError(null)
    setAgentSteps([])
    setAgentResult(null)
    setCallResult(null)
    appendLog('user', `Tarea para el agente (${agentProvider === 'anthropic' ? 'Claude' : 'OpenAI'}): "${task}"`)

    try {
      const result = await runMcpAgent(
        {
          provider: agentProvider,
          task,
          host,
          mcpTools: tools,
          system: agentSystem,
        },
        {
          ...hooks,
          onStep: (step) => setAgentSteps((prev) => [...prev, step]),
        },
      )
      setAgentResult(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setAgentRunning(false)
    }
  }

  const selectTool = (tool) => {
    setSelectedTool(tool)
    setCallResult(null)
    // Inicializa un valor vacío por cada parámetro del inputSchema.
    const props = tool.inputSchema?.properties || {}
    const initial = {}
    Object.keys(props).forEach((k) => { initial[k] = '' })
    setArgValues(initial)
    appendLog('info', `Tool "${tool.name}" seleccionada — completá los argumentos según su inputSchema`)
  }

  const handleDisconnect = () => {
    setServerInfo(null)
    setTools(null)
    setSelectedTool(null)
    setCallResult(null)
    setAgentSteps([])
    setAgentResult(null)
    setRawRequest(null)
    setRawResponse(null)
    setError(null)
    appendLog('info', 'Estado local reiniciado. (El server ni se entera: el protocolo es stateless en este transporte.)')
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  const selectedProps = selectedTool?.inputSchema?.properties || {}
  const selectedRequired = selectedTool?.inputSchema?.required || []
  const formIncomplete = selectedRequired.some((k) => !(argValues[k] || '').trim())

  return (
    <div className="app">
      <WelcomeModal />
      <header className="header">
        <h1>
          <BrandHome />
          <span className="brand-subtitle">// experimento · <span className="brand-mode">MCP</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="mcp" />
        </div>
      </header>

      <DemoBacklink href="/demo/mcp" />

      <ConfigBar>
        <label className="hdr-select mcp-host-field">
          <span className="hdr-select-label">Servidor MCP</span>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            disabled={loading}
            className="hdr-select-input mcp-host-input"
            placeholder={DEFAULT_MCP_HOST}
            title="URL del endpoint MCP. El server de juguete corre con: npm run mcp"
          />
        </label>

        <span
          className={`mcp-status${serverInfo ? ' mcp-status-on' : ''}`}
          title={serverInfo ? 'Handshake initialize completado' : 'Todavía no se hizo el handshake'}
        >
          {serverInfo ? '● conectado' : '○ sin conectar'}
        </span>

        <button onClick={handleDisconnect} className="clear-btn" type="button" disabled={loading}>
          Reiniciar
        </button>
      </ConfigBar>

      <div className="layout">
        {/* Panel 1 — Ciclo de vida MCP */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>El protocolo, paso a paso</span>
            <span className="context-meta">JSON-RPC 2.0 · sin modelo de IA</span>
          </div>

          <div className="mcp-flow">
          {!serverInfo && !loading && (
            <div className="empty mcp-intro">
              <b>MCP (Model Context Protocol)</b> es el estándar para que las tools de un agente
              vivan en un proceso aparte — un "servidor de tools" — en vez de hardcodeadas en la app.
              Abajo de los nombres fancy hay JSON-RPC 2.0 sobre HTTP: tres métodos y listo.
              <br /><br />
              Primero arrancá el server de juguete en una terminal:
              <pre className="mcp-cmd">npm run mcp</pre>
              y después tocá el paso 1. <b>Ojo:</b> en los pasos 1 a 3 no participa ningún modelo de IA.
              Esa es la primera lección: MCP es una conversación entre tu app (el cliente) y el
              servidor de tools. El modelo entra en escena recién en el paso 4, cuando el cliente
              le presenta estas tools.
            </div>
          )}

          {/* Paso 1 — initialize */}
          <div className={`mcp-step${serverInfo ? ' mcp-step-done' : ''}`}>
            <div className="mcp-step-header">
              <span className="mcp-step-num">{serverInfo ? '✓' : '1'}</span>
              <div className="mcp-step-title">
                <b>Handshake — <code>initialize</code></b>
                <span className="mcp-step-sub">cliente y servidor negocian versión y capacidades</span>
              </div>
              <button
                type="button"
                onClick={handleInitialize}
                disabled={loading}
                className="mcp-step-btn"
              >
                {serverInfo ? 'Re-conectar' : 'Conectar'}
              </button>
            </div>
            {serverInfo && (
              <div className="mcp-server-card">
                <div className="razon-usage-row">
                  <span>Servidor</span>
                  <span><b>{serverInfo.serverInfo?.name}</b> v{serverInfo.serverInfo?.version}</span>
                </div>
                <div className="razon-usage-row">
                  <span>Protocolo negociado</span>
                  <span><b>{serverInfo.protocolVersion}</b> (propusimos {MCP_PROTOCOL_VERSION})</span>
                </div>
                <div className="razon-usage-row">
                  <span>Capacidades</span>
                  <span><code>{JSON.stringify(serverInfo.capabilities)}</code></span>
                </div>
                {serverInfo.instructions && (
                  <div className="razon-usage-foot">
                    El server además manda <code>instructions</code>: "{serverInfo.instructions}"
                    — texto pensado para inyectar al system prompt del modelo que use estas tools.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Paso 2 — tools/list */}
          <div className={`mcp-step${tools ? ' mcp-step-done' : ''}${!serverInfo ? ' mcp-step-locked' : ''}`}>
            <div className="mcp-step-header">
              <span className="mcp-step-num">{tools ? '✓' : '2'}</span>
              <div className="mcp-step-title">
                <b>Descubrimiento — <code>tools/list</code></b>
                <span className="mcp-step-sub">el server lista sus tools con inputSchema (JSON Schema)</span>
              </div>
              <button
                type="button"
                onClick={handleListTools}
                disabled={loading || !serverInfo}
                className="mcp-step-btn"
                title={!serverInfo ? 'Primero hacé el handshake (paso 1)' : 'Pedir la lista de tools'}
              >
                Descubrir
              </button>
            </div>
            {tools && (
              <div className="mcp-tool-list">
                {tools.map((tool) => (
                  <button
                    key={tool.name}
                    type="button"
                    className={`mcp-tool-card${selectedTool?.name === tool.name ? ' mcp-tool-selected' : ''}`}
                    onClick={() => selectTool(tool)}
                    disabled={loading}
                  >
                    <code className="mcp-tool-name">{tool.name}</code>
                    <span className="mcp-tool-desc">{tool.description}</span>
                    <span className="mcp-tool-params">
                      {Object.keys(tool.inputSchema?.properties || {}).length === 0
                        ? 'sin parámetros'
                        : `parámetros: ${Object.keys(tool.inputSchema.properties).join(', ')}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {tools && (
              <div className="razon-usage-foot">
                Estos <code>inputSchema</code> son JSON Schema — el mismo formato de las tool defs
                de OpenAI y Anthropic. Convertir esta lista al shape del proveedor es todo lo que
                hace falta para dárselas a un modelo.
              </div>
            )}
          </div>

          {/* Paso 3 — tools/call */}
          <div className={`mcp-step${callResult ? ' mcp-step-done' : ''}${!selectedTool ? ' mcp-step-locked' : ''}`}>
            <div className="mcp-step-header">
              <span className="mcp-step-num">{callResult ? '✓' : '3'}</span>
              <div className="mcp-step-title">
                <b>Invocación — <code>tools/call</code></b>
                <span className="mcp-step-sub">
                  {selectedTool
                    ? <>vos hacés de modelo: armá los argumentos de <code>{selectedTool.name}</code></>
                    : 'elegí una tool en el paso 2'}
                </span>
              </div>
            </div>
            {selectedTool && (
              <form onSubmit={handleCallTool} className="mcp-form">
                {Object.entries(selectedProps).map(([key, schema]) => (
                  <label key={key} className="mcp-form-field">
                    <span className="mcp-form-label">
                      <code>{key}</code>
                      {selectedRequired.includes(key) && <em> · requerido</em>}
                      {schema.description && <span className="mcp-form-hint"> — {schema.description}</span>}
                    </span>
                    {schema.enum ? (
                      <select
                        value={argValues[key] || ''}
                        onChange={(e) => setArgValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        disabled={loading}
                      >
                        <option value="">(elegí…)</option>
                        {schema.enum.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={argValues[key] || ''}
                        onChange={(e) => setArgValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        disabled={loading}
                        placeholder={schema.type || 'string'}
                      />
                    )}
                  </label>
                ))}
                {Object.keys(selectedProps).length === 0 && (
                  <div className="mcp-form-hint">Esta tool no recibe parámetros — mandala directo.</div>
                )}
                <button type="submit" disabled={loading || formIncomplete} className="mcp-step-btn">
                  {loading ? 'Llamando…' : `Llamar ${selectedTool.name}`}
                </button>
              </form>
            )}
            {callResult && (
              <div className={`mcp-result${callResult.isError ? ' mcp-result-error' : ''}`}>
                <div className="mcp-result-header">
                  <span>{callResult.isError ? '⚠️ result.isError: true' : '📦 result.content[]'}</span>
                  <span className="context-meta">esto es lo que vería el modelo como tool_result</span>
                </div>
                <pre className="mcp-result-text">{callResult.text}</pre>
              </div>
            )}
          </div>

          {/* Paso 4 — el modelo entra en escena */}
          <div className={`mcp-step mcp-step-agent${agentResult ? ' mcp-step-done' : ''}${!tools ? ' mcp-step-locked' : ''}`}>
            <div className="mcp-step-header">
              <span className="mcp-step-num">{agentResult ? '✓' : '4'}</span>
              <div className="mcp-step-title">
                <b>El modelo entra en escena — loop agéntico</b>
                <span className="mcp-step-sub">
                  ahora el modelo elige las tools; el cliente las ejecuta vía <code>tools/call</code>
                </span>
              </div>
              <select
                value={agentProvider}
                onChange={(e) => {
                  setAgentProvider(e.target.value)
                  appendLog('info', `Proveedor del agente: ${e.target.value === 'anthropic' ? 'Claude (Anthropic)' : 'OpenAI'}`)
                }}
                disabled={agentRunning}
                className={`hdr-select-input provider-select-${agentProvider}`}
                title="A qué API de modelo va el loop. Las tools son las mismas: salen del tools/list del paso 2."
              >
                <option value="openai">🟢 OpenAI</option>
                <option value="anthropic">🟠 Claude</option>
              </select>
            </div>

            {tools && (
              <>
                <div className="razon-presets">
                  <span className="razon-presets-label">Probá una:</span>
                  {AGENT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="razon-preset-btn"
                      onClick={() => {
                        setAgentTask(p.text)
                        appendLog('info', `Preset "${p.label}": ${p.hint}`)
                      }}
                      disabled={agentRunning}
                      title={p.hint}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <details className="razon-instructions">
                  <summary>System prompt del agente</summary>
                  <textarea
                    value={agentSystem}
                    onChange={(e) => setAgentSystem(e.target.value)}
                    disabled={agentRunning}
                    rows={3}
                    placeholder={MCP_AGENT_DEFAULT_SYSTEM}
                  />
                  <div className="razon-foot">
                    Si lo dejás vacío viaja el default. Las <code>instructions</code> que mandó el
                    server en el paso 1 están pensadas justamente para sumarse acá.
                  </div>
                </details>

                <form onSubmit={handleRunAgent} className="mcp-form">
                  <textarea
                    value={agentTask}
                    onChange={(e) => setAgentTask(e.target.value)}
                    placeholder="Pedile algo que necesite las tools del server: clima, dólar, notas…"
                    disabled={agentRunning}
                    rows={2}
                    className="mcp-agent-task"
                  />
                  <button type="submit" disabled={agentRunning || !agentTask.trim()} className="mcp-step-btn">
                    {agentRunning ? 'El loop está corriendo…' : 'Soltar al agente'}
                  </button>
                </form>

                {(agentSteps.length > 0 || agentRunning) && (
                  <div className="mcp-agent-timeline">
                    {agentSteps.map((step, i) => {
                      if (step.type === 'iteration_start') {
                        return (
                          <div key={i} className="mcp-agent-iter">
                            — iteración #{step.n}: POST a la API del modelo —
                          </div>
                        )
                      }
                      if (step.type === 'tool_use') {
                        return (
                          <div key={i} className="mcp-agent-step mcp-agent-tooluse">
                            <span className="mcp-agent-tag">🧠 modelo</span>
                            pide <code>{step.name}</code>({JSON.stringify(step.input)})
                          </div>
                        )
                      }
                      if (step.type === 'tool_result') {
                        return (
                          <div key={i} className={`mcp-agent-step mcp-agent-toolresult${step.isError ? ' mcp-agent-error' : ''}`}>
                            <span className="mcp-agent-tag">🔌 server MCP</span>
                            {step.content}
                          </div>
                        )
                      }
                      return null
                    })}
                    {agentRunning && <div className="razon-thinking-dots"><span></span><span></span><span></span></div>}
                  </div>
                )}

                {agentResult && (
                  <>
                    <div className="mcp-result">
                      <div className="mcp-result-header">
                        <span>💬 Respuesta final del modelo</span>
                        <span className="context-meta">
                          {agentResult.iterations} iteración(es) · {agentResult.toolCallCount} tool call(s) · {agentResult.usage.input + agentResult.usage.output} tokens
                        </span>
                      </div>
                      <pre className="mcp-result-text">{agentResult.finalText || '(sin texto final)'}</pre>
                    </div>
                    <div className="razon-usage-foot">
                      Fijate en el log y en los paneles de la derecha: los requests alternaron entre
                      la API del modelo (con key) y el servidor MCP (sin key, JSON-RPC). El modelo
                      nunca habló con el server — solo eligió tools y argumentos; el cliente hizo
                      el resto. Eso es MCP.
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          {callResult && !callResult.isError && !agentResult && (
            <div className="context-section">
              <div className="context-foot">
                💡 Recapitulando: hiciste a mano lo que un cliente MCP (Claude Desktop, Claude Code,
                esta app) hace solo: handshake, descubrir tools, invocarlas. En ningún momento
                intervino un modelo — el modelo solo <i>elige</i> qué tool llamar y con qué
                argumentos; el cliente ejecuta. Probá <code>guardar_nota</code> y después{' '}
                <code>leer_notas</code> — y cuando quieras, pasá al paso 4: que elija el modelo.
              </div>
            </div>
          )}
          </div>
        </section>

        {/* Panel 2 — Request/Response crudo */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Request crudo → server MCP o API del modelo</span>
            <span className="panel-links">
              <a
                href="https://modelcontextprotocol.io/specification"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title="Especificación oficial de MCP"
              >
                spec ↗
              </a>
            </span>
          </div>
          <pre className="raw">
            {rawRequest
              ? JSON.stringify(rawRequest, null, 2)
              : '// Aún no se envió ningún request'}
          </pre>

          <div className="panel-title panel-title-sub">
            <span>Response crudo ← server MCP o API del modelo</span>
          </div>
          <pre className="raw">
            {rawResponse
              ? JSON.stringify(rawResponse, null, 2)
              : '// Aún no hay respuesta'}
          </pre>

          {rawResponse && (
            <details className="field-guide">
              <summary>¿Qué significa cada campo?</summary>
              <ul>
                <li><code>jsonrpc: "2.0"</code> — versión de JSON-RPC. Va en TODOS los mensajes, ida y vuelta.</li>
                <li><code>id</code> — correlaciona request con response. Las <b>notificaciones</b> no llevan id y no se responden.</li>
                <li><code>method</code> — qué se pide: <code>initialize</code>, <code>tools/list</code>, <code>tools/call</code>…</li>
                <li><code>params</code> — argumentos del método (en <code>tools/call</code>: <code>name</code> + <code>arguments</code>).</li>
                <li><code>result</code> — la respuesta exitosa. Excluyente con <code>error</code>.</li>
                <li><code>error.code</code> — códigos estándar JSON-RPC: <code>-32601</code> método inexistente, <code>-32602</code> params inválidos, <code>-32700</code> JSON roto.</li>
                <li><code>result.content[]</code> — bloques tipados (<code>type:'text'</code>, también puede haber imágenes), igual que los mensajes de Claude.</li>
                <li><code>result.isError</code> — error de EJECUCIÓN de la tool. Va en <code>result</code> (no en <code>error</code>) para que el modelo pueda leerlo y reaccionar.</li>
                <li><b>No hay API key</b> — el server es local. Los servers MCP remotos usan OAuth; el JSON-RPC es idéntico.</li>
              </ul>
            </details>
          )}
        </section>

        {/* Panel 3 — Log */}
        <section className="panel log-panel">
          <div className="panel-title">
            <span>Log del proceso</span>
            <span className="panel-links">
              <span className="context-meta">
                {logs.length} línea(s) · persistido
              </span>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="docs-link"
                >
                  vaciar
                </button>
              )}
            </span>
          </div>
          <div className="log" ref={logRef}>
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
