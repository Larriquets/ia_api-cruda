import { useState, useEffect, useRef, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { sendChatMessage } from './openai.js'
import { sendClaudeMessage } from './anthropic.js'

const CODE_KEY = 'editor_code_snapshot'
const LANG_KEY = 'editor_language'
const PROVIDER_KEY = 'chat_provider'
const LOGS_KEY = 'editor_logs'
const LOGS_MAX = 500

const DEFAULT_CODE = `// Probá pedirle a la IA que mejore, explique o testee este código.
// Ejemplo de instrucción: "Agregale validación de entrada y un test"

function suma(a, b) {
  return a + b
}

console.log(suma(2, 3))
`

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'sql', label: 'SQL' },
  { id: 'shell', label: 'Shell' },
]

const SYSTEM_PROMPT = `Sos un asistente de programación. El usuario te pasa un fragmento de código y una instrucción.
Reglas:
- Si te piden modificar el código, devolvé SOLO el código resultante dentro de un bloque \`\`\`<lenguaje> ... \`\`\`. Sin explicaciones antes ni después.
- Si te piden explicar, respondé en prosa breve, en español.
- Si te piden tests, devolvé el archivo de tests dentro de un bloque \`\`\`.
- Nunca inventes APIs ni librerías que no existan.`

// Extrae el primer bloque ```...``` de un texto. Si no hay bloque, devuelve el texto entero.
function extractCodeBlock(text) {
  if (!text) return ''
  const match = text.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/)
  return match ? match[1] : text
}

export default function Editor({ onBack }) {
  const [code, setCode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CODE
    return localStorage.getItem(CODE_KEY) ?? DEFAULT_CODE
  })
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'javascript'
    return localStorage.getItem(LANG_KEY) || 'javascript'
  })
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'openai'
    return localStorage.getItem(PROVIDER_KEY) || 'openai'
  })
  const [instruction, setInstruction] = useState('Refactorizá esta función para que sea más legible y agregale comentarios explicando cada paso.')
  const [reply, setReply] = useState('')
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

  const logRef = useRef(null)

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

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  const buildUserMessage = () => {
    return `Lenguaje: ${language}\n\nInstrucción:\n${instruction.trim()}\n\nCódigo actual:\n\`\`\`${language}\n${code}\n\`\`\``
  }

  const handleSend = async () => {
    if (!instruction.trim() || loading) return
    setLoading(true)
    setError(null)
    setReply('')
    setRawRequest(null)
    setRawResponse(null)

    appendLog('user', `Instrucción: "${instruction.trim().slice(0, 80)}${instruction.length > 80 ? '…' : ''}"`)
    appendLog('info', `Lenguaje: ${language} · Tamaño código: ${code.length} chars`)

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage() },
    ]

    try {
      const sendFn = provider === 'anthropic' ? sendClaudeMessage : sendChatMessage
      appendLog('info', `Proveedor: ${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}`)

      const result = await sendFn(messages, {
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
      })

      setReply(result)
      appendLog('success', 'Respuesta recibida y mostrada')
    } catch (err) {
      setError(err.message || 'Error al contactar la API')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    const block = extractCodeBlock(reply)
    if (!block.trim()) {
      appendLog('error', 'No se encontró código en la respuesta')
      return
    }
    setCode(block)
    appendLog('success', 'Código del editor reemplazado con la respuesta')
  }

  const handleClearCode = () => {
    setCode('')
    appendLog('info', 'Editor vaciado')
  }

  const handleResetCode = () => {
    setCode(DEFAULT_CODE)
    appendLog('info', 'Editor reseteado al ejemplo')
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  return (
    <div className="app editor-page">
      <header className="header">
        <h1>Editor de código + IA</h1>
        <div className="header-actions">
          <div className="app-mode-switch">
            <a href="/" className="app-mode-btn">💬 Chat</a>
            <a href="/editor" className="app-mode-btn active" aria-current="page">💻 Editor</a>
          </div>

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
            >
              <option value="openai">🟢 OpenAI</option>
              <option value="anthropic">🟠 Claude (Anthropic)</option>
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

          <button onClick={handleResetCode} className="clear-btn" type="button" title="Volver al código de ejemplo">
            Reset
          </button>
          <button onClick={handleClearCode} className="clear-btn" type="button">
            Vaciar editor
          </button>
        </div>
      </header>

      <div className="layout editor-layout">
        {/* Panel 1 — Editor Monaco */}
        <section className="panel editor-panel">
          <div className="panel-title">
            <span>Editor</span>
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
              }}
            />
          </div>
        </section>

        {/* Panel 2 — Instrucción + respuesta */}
        <section className="panel instr-panel">
          <div className="panel-title">
            <span>Instrucción → IA</span>
            <span className={`provider-badge provider-badge-${provider}`}>
              {provider === 'anthropic' ? '🟠 Claude' : '🟢 OpenAI'}
            </span>
          </div>
          <div className="instr-body">
            <textarea
              className="instr-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="¿Qué querés que haga la IA con tu código? (ej: 'agregale validación', 'explicá la función X', 'escribí tests')"
              disabled={loading}
            />
            <div className="instr-actions">
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !instruction.trim()}
                className="instr-send-btn"
              >
                {loading ? 'Pensando…' : 'Mandar a la IA →'}
              </button>
              {reply && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="instr-apply-btn"
                  title="Reemplaza el contenido del editor con el bloque de código de la respuesta"
                >
                  ✓ Aplicar al editor
                </button>
              )}
            </div>

            {error && <div className="error">{error}</div>}

            <div className="reply-section">
              <div className="reply-header">
                <span>Respuesta</span>
                {reply && (
                  <span className="context-meta">{reply.length} chars</span>
                )}
              </div>
              <div className="reply-content">
                {reply ? reply : <span className="empty">La respuesta de la IA aparecerá acá.</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Panel 3 — Raw + Log apilados */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Request → API</span>
          </div>
          <pre className="raw raw-compact">
            {rawRequest ? JSON.stringify(rawRequest, null, 2) : '// Sin request todavía'}
          </pre>
          <div className="panel-title panel-title-sub">
            <span>Response ← API</span>
          </div>
          <pre className="raw raw-compact">
            {rawResponse ? JSON.stringify(rawResponse, null, 2) : '// Sin respuesta todavía'}
          </pre>
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
