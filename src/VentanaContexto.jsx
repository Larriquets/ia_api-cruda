import { useCallback, useEffect, useRef, useState } from 'react'
import { sendChatMessage } from './openai.js'
import { sendClaudeMessage } from './anthropic.js'
import { sendLmStudioMessage } from './lmstudio.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import LmStudioModelPicker from './LmStudioModelPicker.jsx'
import WelcomeModal from './WelcomeModal.jsx'
import SystemEditor from './SystemEditor.jsx'
import TemperatureControl from './TemperatureControl.jsx'
import { CHAT_DEFAULT_SYSTEM, CHAT_PRESETS } from './system-presets.js'
import {
  applyFifo,
  applySlidingWindow,
  applyCompaction,
  countMessagesTokens,
  estimateTokens,
  annotateMessages,
} from './context-window.js'

const MESSAGES_KEY = 'ctxwin_messages'
const STRATEGY_KEY = 'ctxwin_strategy'
const LIMIT_KEY = 'ctxwin_limit_tokens'
const WINDOW_TURNS_KEY = 'ctxwin_window_turns'
const PROVIDER_KEY = 'ctxwin_provider'
const SYSTEM_KEY = 'ctxwin_system_prompt'
const SYSTEM_OPEN_KEY = 'ctxwin_system_open'
const TEMP_KEY = 'ctxwin_temperature'
const LOGS_KEY = 'ctxwin_logs'
const LOGS_MAX = 500

const SUMMARIZER_SYSTEM =
  'Sos un resumidor de conversaciones. Te paso una conversación entre user y assistant. ' +
  'Devolveme un resumen de 2-3 oraciones máximo que preserve: nombres propios, números, ' +
  'decisiones tomadas, y pendientes mencionados. Sin prosa decorativa, sin saludos, sin ' +
  'meta-comentarios. Empezá directo: "El usuario..."'

const STRATEGIES = {
  fifo: { label: 'FIFO', sub: 'borra los más viejos' },
  window: { label: 'Sliding window', sub: 'últimos N turnos' },
  compaction: { label: 'Compaction', sub: 'resume con IA' },
}

const PROVIDER_LABELS = {
  openai: '🟢 OpenAI',
  anthropic: '🟠 Claude',
  lmstudio: '🔵 LM Studio',
}

const buildInitialMessages = (systemPrompt) => [
  { role: 'system', content: systemPrompt || CHAT_DEFAULT_SYSTEM },
]

export default function VentanaContexto() {
  const [systemPrompt, setSystemPrompt] = useState(
    () => localStorage.getItem(SYSTEM_KEY) ?? CHAT_DEFAULT_SYSTEM,
  )
  const [systemOpen, setSystemOpen] = useState(
    () => localStorage.getItem(SYSTEM_OPEN_KEY) === '1',
  )
  const [temperature, setTemperature] = useState(() => {
    const raw = localStorage.getItem(TEMP_KEY)
    const parsed = raw != null ? parseFloat(raw) : NaN
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : 0.7
  })
  const [provider, setProvider] = useState(() => {
    const saved = localStorage.getItem(PROVIDER_KEY)
    return ['openai', 'anthropic', 'lmstudio'].includes(saved) ? saved : 'openai'
  })
  const [strategy, setStrategy] = useState(
    () => localStorage.getItem(STRATEGY_KEY) || 'fifo',
  )
  const [limitTokens, setLimitTokens] = useState(() => {
    const raw = parseInt(localStorage.getItem(LIMIT_KEY), 10)
    return Number.isFinite(raw) && raw >= 50 ? raw : 300
  })
  const [windowTurns, setWindowTurns] = useState(() => {
    const raw = parseInt(localStorage.getItem(WINDOW_TURNS_KEY), 10)
    return Number.isFinite(raw) && raw >= 1 ? raw : 3
  })

  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(MESSAGES_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* noop */ }
    return buildInitialMessages(localStorage.getItem(SYSTEM_KEY) ?? CHAT_DEFAULT_SYSTEM)
  })
  const [lastDropped, setLastDropped] = useState([])
  const [lastSummary, setLastSummary] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rawRequest, setRawRequest] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [logs, setLogs] = useState(() => {
    try {
      const raw = localStorage.getItem(LOGS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const chatRef = useRef(null)
  const logRef = useRef(null)

  // ============== persistencia ==============
  useEffect(() => { localStorage.setItem(SYSTEM_KEY, systemPrompt) }, [systemPrompt])
  useEffect(() => { localStorage.setItem(SYSTEM_OPEN_KEY, systemOpen ? '1' : '0') }, [systemOpen])
  useEffect(() => { localStorage.setItem(TEMP_KEY, String(temperature)) }, [temperature])
  useEffect(() => { localStorage.setItem(PROVIDER_KEY, provider) }, [provider])
  useEffect(() => { localStorage.setItem(STRATEGY_KEY, strategy) }, [strategy])
  useEffect(() => { localStorage.setItem(LIMIT_KEY, String(limitTokens)) }, [limitTokens])
  useEffect(() => { localStorage.setItem(WINDOW_TURNS_KEY, String(windowTurns)) }, [windowTurns])

  useEffect(() => {
    try { localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages)) } catch { /* noop */ }
  }, [messages])

  useEffect(() => {
    try {
      const trimmed = logs.slice(-LOGS_MAX)
      localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed))
    } catch { /* noop */ }
  }, [logs])

  // Mantener el system de messages[0] sincronizado con el editor.
  useEffect(() => {
    setMessages((prev) => {
      const effective = systemPrompt.trim() ? systemPrompt : CHAT_DEFAULT_SYSTEM
      if (prev.length > 0 && prev[0].role === 'system') {
        if (prev[0].content === effective) return prev
        const next = prev.slice()
        next[0] = { role: 'system', content: effective }
        return next
      }
      return [{ role: 'system', content: effective }, ...prev]
    })
  }, [systemPrompt])

  // Autoscroll.
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  // ============== summarizer (para compaction) ==============
  // Hace un request adicional pidiéndole a la IA que resuma los turnos viejos.
  // Usa el provider actualmente seleccionado — si estás en LM Studio con un
  // modelo chiquito, el resumen va a ser peor, y eso también enseña.
  const summarizeWith = useCallback(async (toSummarize) => {
    const summaryPayload = [
      { role: 'system', content: SUMMARIZER_SYSTEM },
      {
        role: 'user',
        content:
          'Resumí esta conversación:\n\n' +
          toSummarize.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n'),
      },
    ]
    const sendFn =
      provider === 'anthropic' ? sendClaudeMessage
        : provider === 'lmstudio' ? sendLmStudioMessage
          : sendChatMessage
    appendLog('info', `[compaction] Pidiendo resumen al modelo (${toSummarize.length} mensaje(s) a comprimir)`)
    const summary = await sendFn(summaryPayload, {
      onLog: (lvl, msg) => appendLog(lvl, `[compaction] ${msg}`),
      temperature: 0.3,
    })
    return summary
  }, [provider, appendLog])

  // ============== aplicar estrategia ==============
  const applyStrategy = useCallback(async (msgs) => {
    if (strategy === 'fifo') return applyFifo(msgs, limitTokens)
    if (strategy === 'window') return applySlidingWindow(msgs, windowTurns)
    if (strategy === 'compaction') return await applyCompaction(msgs, limitTokens, summarizeWith)
    return { trimmed: msgs, dropped: [], summary: null }
  }, [strategy, limitTokens, windowTurns, summarizeWith])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    appendLog('user', `Usuario envía: "${text}"`)

    const fullWithNew = [...messages, { role: 'user', content: text }]
    setMessages(fullWithNew)

    try {
      const totalBefore = countMessagesTokens(fullWithNew)
      appendLog('info', `Contexto antes de podar: ${totalBefore} tokens (límite: ${limitTokens})`)

      const { trimmed, dropped, summary, compactionError } = await applyStrategy(fullWithNew)
      setLastDropped(dropped)
      setLastSummary(summary)

      if (compactionError) {
        appendLog('error', 'Compaction falló — usando FIFO como fallback')
      }
      if (dropped.length > 0) {
        appendLog('info', `Estrategia ${strategy.toUpperCase()} podó ${dropped.length} mensaje(s) (${countMessagesTokens(dropped.map((d) => d.message))} tokens)`)
      } else {
        appendLog('info', 'Contexto entra sin podar — nada que quitar')
      }

      const sendFn =
        provider === 'anthropic' ? sendClaudeMessage
          : provider === 'lmstudio' ? sendLmStudioMessage
            : sendChatMessage
      appendLog('info', `Proveedor: ${PROVIDER_LABELS[provider]} — enviando ${trimmed.length} mensaje(s)`)

      const reply = await sendFn(trimmed, {
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
        temperature,
      })

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      appendLog('success', 'Respuesta agregada al historial completo')
    } catch (err) {
      setError(err.message || 'Error al contactar al proveedor')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages(buildInitialMessages(systemPrompt))
    setLastDropped([])
    setLastSummary(null)
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    appendLog('info', 'Conversación reiniciada')
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  const handleForceCompact = async () => {
    if (loading || strategy !== 'compaction') return
    if (messages.length < 5) {
      appendLog('info', 'No hay suficientes mensajes viejos para compactar todavía')
      return
    }
    setLoading(true)
    try {
      const { trimmed, dropped, summary } = await applyCompaction(messages, 1, summarizeWith)
      setMessages(trimmed)
      setLastDropped(dropped)
      setLastSummary(summary)
      appendLog('success', `Compaction forzado: ${dropped.length} mensaje(s) resumidos`)
    } catch (err) {
      appendLog('error', `Compaction forzado falló: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const totalTokens = countMessagesTokens(messages)
  const pctFull = Math.min(100, Math.round((totalTokens / limitTokens) * 100))
  const overLimit = totalTokens > limitTokens

  // Para el panel "Memoria": predecir qué se podaría si mandara AHORA otro turno.
  // Esto da una visión "futura" — qué va a sobrevivir al próximo request.
  const previewTrimmed = (() => {
    if (strategy === 'fifo') return applyFifo(messages, limitTokens).trimmed
    if (strategy === 'window') return applySlidingWindow(messages, windowTurns).trimmed
    // Para compaction no podemos previsualizar sin llamar a la IA — mostramos full.
    return messages
  })()
  const annotated = annotateMessages(messages, previewTrimmed)

  const visibleMessages = messages.filter((m) => m.role !== 'system')

  return (
    <div className="app">
      <WelcomeModal />
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label="Ir al inicio">
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <span className="brand">La IA Cruda</span>
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// experimento · <span className="brand-mode">🪟 Ventana de contexto</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="ventana-contexto" />
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
              appendLog('info', `Proveedor cambiado a ${PROVIDER_LABELS[next]}`)
            }}
            className={`hdr-select-input provider-select-${provider}`}
          >
            <option value="openai">🟢 OpenAI</option>
            <option value="anthropic">🟠 Claude (Anthropic)</option>
            <option value="lmstudio">🔵 LM Studio (local)</option>
          </select>
        </label>

        {provider === 'lmstudio' && <LmStudioModelPicker onLog={appendLog} />}

        <button onClick={handleClear} className="clear-btn" type="button">Limpiar</button>
      </ConfigBar>

      <div className="layout">
        {/* Panel 1 — Chat + controles de ventana */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>Chat con ventana de contexto</span>
            <span className="panel-provider">
              <span className={`provider-badge provider-badge-${provider}`}>
                {PROVIDER_LABELS[provider]}
              </span>
            </span>
          </div>

          {/* Selector de estrategia */}
          <div className="mode-segmented" role="tablist" aria-label="Estrategia">
            <span className="mode-segmented-label">Estrategia</span>
            {Object.entries(STRATEGIES).map(([id, info]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={strategy === id}
                className={`mode-seg-btn mode-seg-${id}${strategy === id ? ' active' : ''}`}
                onClick={() => {
                  setStrategy(id)
                  appendLog('info', `Estrategia: ${info.label}`)
                }}
                title={info.sub}
              >
                {info.label}
                <span className="mode-seg-sub">{info.sub}</span>
              </button>
            ))}
            {strategy === 'compaction' && (
              <button
                onClick={handleForceCompact}
                className="mode-seg-aux"
                type="button"
                disabled={loading}
                title="Pide un resumen a la IA ahora, sin esperar a que se llene"
              >
                ⚡ Forzar compactación
              </button>
            )}
          </div>

          {/* Slider de límite */}
          <div className="ctxwin-controls">
            <label className="ctxwin-slider">
              <span className="ctxwin-slider-label">
                Límite: <b>{limitTokens}</b> tokens
              </span>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={limitTokens}
                onChange={(e) => setLimitTokens(parseInt(e.target.value, 10))}
              />
            </label>
            {strategy === 'window' && (
              <label className="ctxwin-slider">
                <span className="ctxwin-slider-label">
                  Últimos <b>{windowTurns}</b> turnos
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={windowTurns}
                  onChange={(e) => setWindowTurns(parseInt(e.target.value, 10))}
                />
              </label>
            )}
          </div>

          {/* Barra de tokens */}
          <div className={`ctxwin-meter${overLimit ? ' over' : ''}`}>
            <div className="ctxwin-meter-bar">
              <div className="ctxwin-meter-fill" style={{ width: `${pctFull}%` }} />
            </div>
            <div className="ctxwin-meter-label">
              <span><b>{totalTokens}</b> / {limitTokens} tokens</span>
              {overLimit && <span className="ctxwin-meter-warn">⚠ se va a podar en el próximo envío</span>}
            </div>
          </div>

          <SystemEditor
            value={systemPrompt}
            onChange={setSystemPrompt}
            defaultPrompt={CHAT_DEFAULT_SYSTEM}
            open={systemOpen}
            onToggleOpen={setSystemOpen}
            disabled={loading}
            presets={CHAT_PRESETS}
            onLog={appendLog}
            hint="El system NUNCA se poda — siempre llega al modelo aunque el resto se borre."
          />

          <TemperatureControl
            value={temperature}
            onChange={setTemperature}
            disabled={loading}
            clampedTo={provider === 'anthropic' ? 1 : null}
          />

          <div className="chat" ref={chatRef}>
            {visibleMessages.length === 0 && (
              <div className="empty">Empezá a charlar. Con límite bajo (300t) vas a ver podar en 3-4 turnos.</div>
            )}
            {visibleMessages.map((msg, i) => (
              <div key={i} className={`bubble bubble-${msg.role}`}>
                <div className="role">{msg.role === 'user' ? 'Tú' : 'Asistente'}</div>
                <div className="content">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="bubble bubble-assistant">
                <div className="role">Asistente</div>
                <div className="content">Escribiendo…</div>
              </div>
            )}
            {error && <div className="error">{error}</div>}
          </div>

          <form onSubmit={handleSend} className="composer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje…"
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()}>Enviar</button>
          </form>
        </section>

        {/* Panel 2 — Request crudo */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Request → API (crudo, ya podado)</span>
          </div>
          <pre className="raw">
            {rawRequest
              ? JSON.stringify(rawRequest, null, 2)
              : '// Aún no se envió ningún request'}
          </pre>
          <div className="panel-title panel-title-sub">
            <span>Response ← API</span>
          </div>
          <pre className="raw">
            {rawResponse
              ? JSON.stringify(rawResponse, null, 2)
              : '// Aún no hay respuesta'}
          </pre>
        </section>

        {/* Panel 3 — Memoria (la joya pedagógica) */}
        <section className="panel log-panel">
          <div className="panel-title">
            <span>🧠 Memoria</span>
            <span className="panel-links">
              <span className="context-meta">
                {messages.length} total · {annotated.filter((a) => a.inRequest).length} viajan
              </span>
            </span>
          </div>

          <div className="ctxwin-memory">
            <div className="ctxwin-memory-hint">
              Lo que <b>vos guardás</b> vs. lo que <b>viaja al modelo</b> en el próximo request.
              Los grises ya no existen para la IA.
            </div>

            {annotated.map(({ message, inRequest }, i) => {
              const tokens = estimateTokens(message.content)
              const isSummary = message.content.startsWith('[RESUMEN PREVIO]:')
              return (
                <div
                  key={i}
                  className={`ctxwin-msg ctxwin-${message.role}${inRequest ? '' : ' ctxwin-dropped'}${isSummary ? ' ctxwin-summary' : ''}`}
                >
                  <span className="ctxwin-msg-idx">[{i}]</span>
                  <span className="ctxwin-msg-role">
                    {isSummary ? '📝 resumen' : message.role}
                  </span>
                  <span className="ctxwin-msg-content">{message.content}</span>
                  <span className="ctxwin-msg-tokens">~{tokens}t</span>
                </div>
              )
            })}

            {lastDropped.length > 0 && (
              <div className="ctxwin-dropped-section">
                <div className="ctxwin-dropped-title">
                  Último envío: {lastDropped.length} mensaje(s) podado(s) por <b>{strategy}</b>
                </div>
                {lastSummary && (
                  <div className="ctxwin-summary-preview">
                    <b>Resumen generado:</b> {lastSummary}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="panel-title panel-title-sub">
            <span>Log</span>
            {logs.length > 0 && (
              <button type="button" onClick={handleClearLogs} className="docs-link">vaciar</button>
            )}
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
