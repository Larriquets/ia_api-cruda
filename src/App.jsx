import { useState, useRef, useEffect, useCallback } from 'react'
import {
  sendChatMessage,
  sendResponseMessage,
  createConversation,
  fetchConversationItems,
} from './openai.js'
import Criollo from './Criollo.jsx'
import Contexto from './Contexto.jsx'

const CONTEXT_STORAGE_KEY = 'chat_context_snapshot'
const CONV_ID_KEY = 'openai_conversation_id'

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
  const [logs, setLogs] = useState([])
  const [rawMode, setRawMode] = useState(false)
  const [persistentMode, setPersistentMode] = useState(false)
  const [conversationId, setConversationId] = useState(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CONV_ID_KEY) || null
  })
  const [serverHistory, setServerHistory] = useState([])
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 'chat'
    if (window.location.pathname === '/criollo') return 'criollo'
    if (window.location.pathname === '/contexto') return 'contexto'
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
  }, [messages])

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
      if (persistentMode) {
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
        appendLog('info', 'Iniciando llamada a /v1/chat/completions…')

        const reply = await sendChatMessage(payload, {
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
    setLogs([])
    setServerHistory([])
    appendLog('info', 'Conversación local reiniciada (la del servidor sigue intacta)')
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

  if (page === 'criollo') {
    return <Criollo onBack={() => window.close()} />
  }
  if (page === 'contexto') {
    return <Contexto onBack={() => window.close()} />
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Chat IA — debug</h1>
        <div className="header-actions">
          <label className={`raw-toggle ${persistentMode ? 'persistent-toggle-on' : ''}`}>
            <input
              type="checkbox"
              checked={persistentMode}
              onChange={(e) => {
                const on = e.target.checked
                setPersistentMode(on)
                if (on && rawMode) setRawMode(false)
                appendLog('info', on
                  ? 'Modo PERSISTENTE activado — el contexto vive en OpenAI (/v1/responses)'
                  : 'Modo PERSISTENTE desactivado — vuelve a /v1/chat/completions')
              }}
            />
            <span>Modo persistente (servidor)</span>
          </label>
          <label className={`raw-toggle ${rawMode ? 'raw-toggle-on' : ''} ${persistentMode ? 'raw-toggle-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={rawMode}
              disabled={persistentMode}
              onChange={(e) => {
                const on = e.target.checked
                setRawMode(on)
                appendLog('info', on
                  ? 'API cruda ACTIVADA — sin contexto, sin system prompt'
                  : 'API cruda DESACTIVADA — vuelve a usar contexto')
              }}
            />
            <span>API cruda (sin contexto)</span>
          </label>
          <button onClick={handleClear} className="clear-btn" type="button">Limpiar</button>
          {persistentMode && (
            <button onClick={handleNewConversation} className="clear-btn" type="button" title="Descarta el conversation_id actual y crea uno nuevo en el próximo envío">
              Nueva conv. servidor
            </button>
          )}
        </div>
      </header>

      <div className="layout">
        {/* Panel 1 — Chat */}
        <section className="panel chat-panel">
          <div className="panel-title">Chat</div>
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
          <div className="panel-title">Log del proceso</div>
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
