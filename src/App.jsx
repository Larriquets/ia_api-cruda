import { useState, useRef, useEffect, useCallback } from 'react'
import {
  sendChatMessage,
  sendResponseMessage,
  createConversation,
  fetchConversationItems,
} from './openai.js'
import { sendClaudeMessage } from './anthropic.js'
import Criollo from './Criollo.jsx'
import Contexto from './Contexto.jsx'
import Proveedores from './Proveedores.jsx'
import Editor from './Editor.jsx'
import EditorAgente from './EditorAgente.jsx'
import EditorAgentsMd from './EditorAgentsMd.jsx'
import Docs from './Docs.jsx'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import WelcomeModal from './WelcomeModal.jsx'

const CONTEXT_STORAGE_KEY = 'chat_context_snapshot'
const CONV_ID_KEY = 'openai_conversation_id'
const PROVIDER_KEY = 'chat_provider'
const LOGS_KEY = 'chat_logs'
const LOGS_MAX = 500

const initialMessages = [
  { role: 'system', content: 'Eres un asistente útil que responde en español de forma clara y concisa.' },
]

export default function App() {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rawRequest, setRawRequest] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [logs, setLogs] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOGS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [rawMode, setRawMode] = useState(true)
  const [persistentMode, setPersistentMode] = useState(false)
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'openai'
    return localStorage.getItem(PROVIDER_KEY) || 'openai'
  })
  const [conversationId, setConversationId] = useState(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CONV_ID_KEY) || null
  })
  const [serverHistory, setServerHistory] = useState([])
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 'chat'
    if (window.location.pathname === '/criollo') return 'criollo'
    if (window.location.pathname === '/contexto') return 'contexto'
    if (window.location.pathname === '/proveedores') return 'proveedores'
    if (window.location.pathname === '/editor') return 'editor'
    if (window.location.pathname === '/editor-agente') return 'editor-agente'
    if (window.location.pathname === '/agents-md') return 'agents-md'
    if (window.location.pathname === '/docs') return 'docs'
    return 'chat'
  })
  const chatRef = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  useEffect(() => {
    try {
      localStorage.setItem(
        CONTEXT_STORAGE_KEY,
        JSON.stringify({ messages, updatedAt: Date.now() })
      )
    } catch {
      // localStorage lleno o no disponible
    }

    console.groupCollapsed(
      `%c[CONTEXTO] ${messages.length} mensaje(s)`,
      'color:#fbbf24;font-weight:600'
    )
    console.table(
      messages.map((m, i) => ({
        '#': i,
        role: m.role,
        content: m.content.length > 80 ? m.content.slice(0, 77) + '...' : m.content,
        chars: m.content.length,
      }))
    )
    console.log('Array completo:', messages)
    console.groupEnd()
  }, [messages])

  useEffect(() => {
    try {
      const trimmed = logs.slice(-LOGS_MAX)
      localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed))
    } catch {
      // localStorage lleno o no disponible
    }
  }, [logs])

  useEffect(() => {
    if (persistentMode && conversationId) {
      refreshServerHistory(conversationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistentMode])

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  const ensureConversationId = async () => {
    if (conversationId) return conversationId
    appendLog('info', 'Sin conversation_id — creando nueva conversación en OpenAI…')
    const id = await createConversation({ onLog: appendLog })
    setConversationId(id)
    localStorage.setItem(CONV_ID_KEY, id)
    return id
  }

  const refreshServerHistory = async (id) => {
    try {
      const items = await fetchConversationItems(id, { onLog: appendLog })
      setServerHistory(items)
    } catch (err) {
      appendLog('error', `No se pudo refrescar historial: ${err.message}`)
    }
  }

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

    try {
      if (persistentMode && provider === 'openai') {
        appendLog('info', 'Modo PERSISTENTE activo — usando /v1/responses + Conversations API')

        const id = await ensureConversationId()

        setMessages((prev) => [...prev, { role: 'user', content: text }])

        const reply = await sendResponseMessage(text, id, {
          onLog: appendLog,
          onRawRequest: setRawRequest,
          onRawResponse: setRawResponse,
        })

        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        appendLog('success', 'Mensaje agregado al chat')

        refreshServerHistory(id)
      } else {
        const payload = rawMode
          ? [{ role: 'user', content: text }]
          : [...messages, { role: 'user', content: text }]

        if (!rawMode) {
          setMessages([...messages, { role: 'user', content: text }])
        } else {
          setMessages([...initialMessages, { role: 'user', content: text }])
        }

        if (rawMode) {
          appendLog('info', 'Modo CRUDO activo — enviando solo este mensaje, sin system ni historial')
        } else {
          appendLog('info', `Modo conversación — enviando ${payload.length} mensaje(s) (system + historial + nuevo)`)
        }

        const sendFn = provider === 'anthropic' ? sendClaudeMessage : sendChatMessage
        appendLog('info', `Proveedor: ${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}`)

        const reply = await sendFn(payload, {
          onLog: appendLog,
          onRawRequest: setRawRequest,
          onRawResponse: setRawResponse,
        })

        if (rawMode) {
          setMessages([
            ...initialMessages,
            { role: 'user', content: text },
            { role: 'assistant', content: reply },
          ])
        } else {
          setMessages([...messages, { role: 'user', content: text }, { role: 'assistant', content: reply }])
        }
        appendLog('success', 'Mensaje agregado al chat')
      }
    } catch (err) {
      setError(err.message || 'Error al contactar OpenAI')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages(initialMessages)
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    setServerHistory([])
    appendLog('info', 'Conversación local reiniciada (logs preservados)')
  }

  const handleClearLogs = () => {
    setLogs([])
    try {
      localStorage.removeItem(LOGS_KEY)
    } catch { /* noop */ }
  }

  const handleNewConversation = () => {
    localStorage.removeItem(CONV_ID_KEY)
    setConversationId(null)
    setServerHistory([])
    setMessages(initialMessages)
    appendLog('info', 'Conversation_id descartado — la próxima llamada creará uno nuevo')
  }

  const visibleMessages = messages.filter((m) => m.role !== 'system')

  const estimateTokens = (text) => Math.ceil((text || '').length / 4)
  const contextTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)

  const goHome = () => { window.location.href = '/' }
  if (page === 'criollo') {
    return <><WelcomeModal /><Criollo onBack={goHome} /></>
  }
  if (page === 'contexto') {
    return <><WelcomeModal /><Contexto onBack={goHome} /></>
  }
  if (page === 'proveedores') {
    return <><WelcomeModal /><Proveedores onBack={goHome} /></>
  }
  if (page === 'editor') {
    return <><WelcomeModal /><Editor onBack={goHome} /></>
  }
  if (page === 'editor-agente') {
    return <><WelcomeModal /><EditorAgente /></>
  }
  if (page === 'agents-md') {
    return <><WelcomeModal /><EditorAgentsMd /></>
  }
  if (page === 'docs') {
    return <><WelcomeModal /><Docs /></>
  }

  return (
    <div className="app">
      <WelcomeModal />
      <header className="header">
        <h1>Chat IA — request, response y contexto a la vista</h1>
        <div className="header-actions">
          <ModeSwitch active="chat" />
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
              if (next === 'anthropic' && persistentMode) {
                setPersistentMode(false)
                appendLog('info', 'Modo persistente desactivado (Claude no soporta Conversations API)')
              }
              appendLog('info', `Proveedor cambiado a ${next === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}`)
            }}
            className={`hdr-select-input provider-select-${provider}`}
          >
            <option value="openai">🟢 OpenAI</option>
            <option value="anthropic">🟠 Claude (Anthropic)</option>
          </select>
        </label>

        <button onClick={handleClear} className="clear-btn" type="button">Limpiar</button>
      </ConfigBar>

      <div className="layout">
        {/* Panel 1 — Chat */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>Chat</span>
            <span className="panel-provider">
              <span className={`provider-badge provider-badge-${provider}`}>
                {provider === 'anthropic' ? '🟠 Claude' : '🟢 OpenAI'}
              </span>
              <a
                href="/proveedores"
                target="_blank"
                rel="noopener noreferrer"
                className="hdr-aux-link"
                title="Compara OpenAI vs Claude (abre en otra pestaña)"
              >
                comparar 🔀
              </a>
            </span>
          </div>

          <div className="mode-segmented" role="tablist" aria-label="Modo de envío">
            <span className="mode-segmented-label">Modo</span>
            <button
              type="button"
              role="tab"
              aria-selected={rawMode}
              className={`mode-seg-btn mode-seg-raw${rawMode ? ' active' : ''}`}
              onClick={() => {
                if (rawMode) return
                setPersistentMode(false)
                setRawMode(true)
                appendLog('info', 'Modo CRUDO — sin system, sin historial')
              }}
              title="Cada mensaje se envía solo, sin system ni historial. Demuestra que la API no recuerda nada."
            >
              Crudo
              <span className="mode-seg-sub">sin contexto</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!rawMode && !persistentMode}
              className={`mode-seg-btn mode-seg-conversation${!rawMode && !persistentMode ? ' active' : ''}`}
              onClick={() => {
                if (!rawMode && !persistentMode) return
                setPersistentMode(false)
                setRawMode(false)
                appendLog('info', 'Modo CONVERSACIÓN — system + historial completo en cada request')
              }}
              title="El cliente acumula messages[] y los reenvía en cada request."
            >
              Conversación
              <span className="mode-seg-sub">cliente</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={persistentMode}
              disabled={provider === 'anthropic'}
              className={`mode-seg-btn mode-seg-persistent${persistentMode ? ' active' : ''}`}
              onClick={() => {
                if (persistentMode) return
                setPersistentMode(true)
                setRawMode(false)
                appendLog('info', 'Modo PERSISTENTE — el contexto vive en OpenAI (/v1/responses)')
              }}
              title={provider === 'anthropic'
                ? 'Solo OpenAI — Claude no tiene Conversations API'
                : 'OpenAI guarda el historial. El cliente solo manda el último mensaje.'}
            >
              Persistente
              <span className="mode-seg-sub">
                {provider === 'anthropic' ? 'solo OpenAI' : 'servidor'}
              </span>
            </button>
            {persistentMode && (
              <button
                onClick={handleNewConversation}
                className="mode-seg-aux"
                type="button"
                title="Descarta el conversation_id actual y crea uno nuevo en el próximo envío"
              >
                ↻ nueva conv. servidor
              </button>
            )}
          </div>

          <div className="chat" ref={chatRef}>
            {visibleMessages.length === 0 && (
              <div className="empty">Escribe un mensaje para comenzar.</div>
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

          {!rawMode && !persistentMode && (
            <div className="context-section">
              <div className="context-header">
                <span className="context-title">Contexto acumulado (cliente)</span>
                <span className="context-header-right">
                  <span className="context-meta">
                    {messages.length} mensaje(s) · ≈ {contextTokens} tokens
                  </span>
                  <a
                    href="/contexto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="docs-link criollo-link"
                    title="Ver detalle: qué se guardó y cómo (abre en otra pestaña)"
                  >
                    explicar 📖
                  </a>
                </span>
              </div>
              <div className="context-list">
                {messages.map((m, i) => (
                  <div key={i} className={`ctx-msg ctx-${m.role}`}>
                    <span className="ctx-role">{m.role}</span>
                    <span className="ctx-content">{m.content}</span>
                    <span className="ctx-tokens">≈{estimateTokens(m.content)}t</span>
                  </div>
                ))}
              </div>
              <div className="context-foot">
                Esto es exactamente lo que se manda en <code>messages[]</code> en el próximo request.
              </div>
            </div>
          )}

          {persistentMode && (
            <div className="context-section context-server">
              <div className="context-header">
                <span className="context-title">Contexto en SERVIDOR (OpenAI)</span>
                <span className="context-header-right">
                  <span className="context-meta">
                    {conversationId
                      ? `${serverHistory.length} item(s) · ${conversationId.slice(0, 12)}…`
                      : 'sin conversación aún'}
                  </span>
                  {conversationId && (
                    <button
                      type="button"
                      onClick={() => refreshServerHistory(conversationId)}
                      className="docs-link criollo-link"
                      title="Trae el historial guardado en OpenAI vía GET /v1/conversations/{id}/items"
                    >
                      ↻ refrescar
                    </button>
                  )}
                </span>
              </div>
              {conversationId ? (
                <>
                  <div className="context-list">
                    {serverHistory.length === 0 && (
                      <div className="empty" style={{ fontSize: 12 }}>
                        Mandá un mensaje o tocá "↻ refrescar" para ver el historial guardado en OpenAI.
                      </div>
                    )}
                    {serverHistory.map((item, i) => {
                      const role = item.role || item.type || '?'
                      const content = Array.isArray(item.content)
                        ? item.content.map((c) => c.text || c.input_text || c.output_text || '').join(' ')
                        : (item.content || JSON.stringify(item))
                      return (
                        <div key={item.id || i} className={`ctx-msg ctx-${role}`}>
                          <span className="ctx-role">{role}</span>
                          <span className="ctx-content">{content}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="context-foot">
                    Estos mensajes viven en <code>api.openai.com</code> bajo el ID
                    <code>{conversationId}</code>. Tu app solo manda el último mensaje.
                  </div>
                </>
              ) : (
                <div className="context-foot">
                  Cuando mandes el primer mensaje se va a crear una conversación en OpenAI
                  (<code>POST /v1/conversations</code>) y se guardará el ID en localStorage.
                </div>
              )}
            </div>
          )}

          {rawMode && (
            <div className="context-section context-raw-warning">
              <div className="context-header">
                <span className="context-title">Contexto acumulado</span>
                <span className="context-header-right">
                  <span className="context-meta context-meta-warn">desactivado (modo crudo)</span>
                  <a
                    href="/contexto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="docs-link criollo-link"
                    title="Ver detalle: qué se guardó y cómo (abre en otra pestaña)"
                  >
                    explicar 📖
                  </a>
                </span>
              </div>
              <div className="context-foot">
                En modo crudo cada mensaje se envía solo, sin <code>system</code> ni historial.
              </div>
            </div>
          )}
        </section>

        {/* Panel 2 — Request/Response crudo */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Request → API (crudo)</span>
            <span className="panel-links">
              <a
                href="/criollo"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link criollo-link"
                title="Explicación a nivel usuario, sin tecnicismos (abre en otra pestaña)"
              >
                criollo 🧉
              </a>
              <a
                href="https://platform.openai.com/docs/api-reference/chat/create"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title="Documentación oficial: parámetros del request"
              >
                docs ↗
              </a>
            </span>
          </div>
          <pre className="raw">
            {rawRequest
              ? JSON.stringify(rawRequest, null, 2)
              : '// Aún no se envió ningún request'}
          </pre>
          <div className="panel-title panel-title-sub">
            <span>Response ← API (crudo)</span>
            <span className="panel-links">
              <a
                href="/criollo"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link criollo-link"
                title="Explicación a nivel usuario, sin tecnicismos (abre en otra pestaña)"
              >
                criollo 🧉
              </a>
              <a
                href="https://platform.openai.com/docs/api-reference/chat/object"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title="Documentación oficial: campos del response (id, choices, usage, etc.)"
              >
                docs ↗
              </a>
            </span>
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
                <li><code>id</code> — identificador único de la respuesta.</li>
                <li><code>object</code> — tipo de objeto, siempre <code>chat.completion</code>.</li>
                <li><code>created</code> — timestamp Unix (segundos) de cuándo se generó.</li>
                <li><code>model</code> — modelo que efectivamente respondió.</li>
                <li><code>choices[]</code> — lista de respuestas generadas (normalmente 1).</li>
                <li><code>choices[].message.role</code> — rol del autor (<code>assistant</code>).</li>
                <li><code>choices[].message.content</code> — el texto que el modelo devuelve.</li>
                <li><code>choices[].finish_reason</code> — por qué terminó: <code>stop</code>, <code>length</code>, <code>content_filter</code>, etc.</li>
                <li><code>choices[].index</code> — índice dentro del array de choices.</li>
                <li><code>usage.prompt_tokens</code> — tokens consumidos por el input.</li>
                <li><code>usage.completion_tokens</code> — tokens consumidos por la respuesta.</li>
                <li><code>usage.total_tokens</code> — suma de los dos anteriores (lo que te facturan).</li>
                <li><code>system_fingerprint</code> — hash de la config interna del modelo (útil para reproducibilidad).</li>
              </ul>
              <a
                href="https://platform.openai.com/docs/api-reference/chat/object"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
              >
                Ver referencia completa ↗
              </a>
            </details>
          )}
        </section>

        {/* Panel 3 — Log de proceso */}
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
                  title="Borra el log y elimina la entrada de localStorage"
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
