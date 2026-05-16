import { useState, useEffect, useRef, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { sendChatMessage } from './openai.js'
import { sendClaudeMessage } from './anthropic.js'
import { sendLmStudioMessage } from './lmstudio.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import LmStudioModelPicker from './LmStudioModelPicker.jsx'
import SystemEditor from './SystemEditor.jsx'
import { EDITOR_DEFAULT_SYSTEM, EDITOR_PRESETS } from './system-presets.js'

const CODE_KEY = 'editor_code_snapshot'
const LANG_KEY = 'editor_language'
const PROVIDER_KEY = 'chat_provider'
const LOGS_KEY = 'editor_logs'
const KEEP_CONTEXT_KEY = 'editor_keep_context'
const HISTORY_KEY = 'editor_history'
const COLS_KEY = 'editor_cols'
const SYSTEM_KEY = 'editor_system_prompt'
const SYSTEM_OPEN_KEY = 'editor_system_open'
const LOGS_MAX = 500
const HISTORY_MAX = 40

// Anchos por defecto de las 3 columnas (en fracciones — deben sumar 1)
const DEFAULT_COLS = [0.42, 0.29, 0.29]
const MIN_COL = 0.12 // 12% mínimo por columna

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

const SUGGESTED_STEPS = [
  'Agregá otra clase a este código.',
  '¿Cómo se llama la clase que agregaste?',
  'Creá un objeto de la clase que creaste, instanciala.',
]

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
    if (typeof window === 'undefined') return 'java'
    return localStorage.getItem(LANG_KEY) || 'java'
  })
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'openai'
    return localStorage.getItem(PROVIDER_KEY) || 'openai'
  })
  const [instruction, setInstruction] = useState('Agregá otra clase a este código.')
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
  const [keepContext, setKeepContext] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(KEEP_CONTEXT_KEY) === 'true'
  })
  const [history, setHistory] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
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
  const [systemPrompt, setSystemPrompt] = useState(() => {
    if (typeof window === 'undefined') return EDITOR_DEFAULT_SYSTEM
    return localStorage.getItem(SYSTEM_KEY) ?? EDITOR_DEFAULT_SYSTEM
  })
  const [systemOpen, setSystemOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SYSTEM_OPEN_KEY) === '1'
  })

  const logRef = useRef(null)
  const layoutRef = useRef(null)

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
    try { localStorage.setItem(KEEP_CONTEXT_KEY, String(keepContext)) } catch { /* noop */ }
  }, [keepContext])

  useEffect(() => {
    try {
      const trimmed = history.slice(-HISTORY_MAX)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
    } catch { /* noop */ }
  }, [history])

  useEffect(() => {
    try { localStorage.setItem(COLS_KEY, JSON.stringify(cols)) } catch { /* noop */ }
  }, [cols])

  useEffect(() => {
    try { localStorage.setItem(SYSTEM_KEY, systemPrompt) } catch { /* noop */ }
  }, [systemPrompt])

  useEffect(() => {
    try { localStorage.setItem(SYSTEM_OPEN_KEY, systemOpen ? '1' : '0') } catch { /* noop */ }
  }, [systemOpen])

  // Redimensionado de columnas: dividerIndex 0 = entre col 0 y 1, 1 = entre col 1 y 2.
  const startResize = (dividerIndex) => (e) => {
    e.preventDefault()
    const layout = layoutRef.current
    if (!layout) return
    const rect = layout.getBoundingClientRect()
    const totalWidth = rect.width
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
      if (newA < MIN_COL) {
        newB -= (MIN_COL - newA)
        newA = MIN_COL
      }
      if (newB < MIN_COL) {
        newA -= (MIN_COL - newB)
        newB = MIN_COL
      }
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
    appendLog('info', keepContext
      ? `Modo CON CONTEXTO — incluyendo ${history.length} mensaje(s) previos del historial`
      : 'Modo SIN CONTEXTO — cada instrucción es independiente')

    const effectiveSystem = systemPrompt.trim() ? systemPrompt : EDITOR_DEFAULT_SYSTEM
    if (effectiveSystem !== EDITOR_DEFAULT_SYSTEM) {
      appendLog('info', `System prompt personalizado (${effectiveSystem.length} chars)`)
    }
    const userMsg = { role: 'user', content: buildUserMessage() }
    const messages = keepContext
      ? [{ role: 'system', content: effectiveSystem }, ...history, userMsg]
      : [{ role: 'system', content: effectiveSystem }, userMsg]

    try {
      const sendFn =
        provider === 'anthropic'
          ? sendClaudeMessage
          : provider === 'lmstudio'
            ? sendLmStudioMessage
            : sendChatMessage
      const providerLabel =
        provider === 'anthropic'
          ? 'Anthropic (Claude)'
          : provider === 'lmstudio'
            ? 'LM Studio (local)'
            : 'OpenAI'
      appendLog('info', `Proveedor: ${providerLabel}`)

      const result = await sendFn(messages, {
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
      })

      setReply(result)
      if (keepContext) {
        setHistory((h) => [...h, userMsg, { role: 'assistant', content: result }])
        appendLog('success', `Respuesta agregada al historial (${history.length + 2} mensajes en total)`)
      } else {
        appendLog('success', 'Respuesta recibida (no se guardó en historial)')
      }
    } catch (err) {
      setError(err.message || 'Error al contactar la API')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = () => {
    setHistory([])
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* noop */ }
    appendLog('info', 'Historial del editor vaciado')
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
        <h1>
          <img src="/logo.png" alt="" className="brand-logo" />
          <span className="brand-braces">{'{'}</span>
          <span className="brand">La IA Cruda</span>
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// todo es contexto · modo <span className="brand-mode">Editor</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="editor" />
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
          >
            <option value="openai">🟢 OpenAI</option>
            <option value="anthropic">🟠 Claude (Anthropic)</option>
            <option value="lmstudio">🔵 LM Studio (local)</option>
          </select>
        </label>

        {provider === 'lmstudio' && <LmStudioModelPicker onLog={appendLog} />}

        <label className="hdr-select">
          <span className="hdr-select-label">Modo</span>
          <select
            value={keepContext ? 'with' : 'without'}
            onChange={(e) => {
              const next = e.target.value === 'with'
              setKeepContext(next)
              appendLog('info', next
                ? 'Modo CON CONTEXTO activado — los próximos requests incluirán el historial'
                : 'Modo SIN CONTEXTO activado — cada request será independiente')
            }}
            className={`hdr-select-input mode-select-${keepContext ? 'persistent' : 'conversation'}`}
            title="Sin contexto: cada instrucción es independiente. Con contexto: la IA recuerda las instrucciones anteriores."
          >
            <option value="without">Sin contexto</option>
            <option value="with">Con contexto</option>
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
      </ConfigBar>

      <div
        className="layout editor-layout editor-layout-resizable"
        ref={layoutRef}
        style={{
          gridTemplateColumns: `${cols[0]}fr 6px ${cols[1]}fr 6px ${cols[2]}fr`,
        }}
      >
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

        <div
          className="col-resizer"
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startResize(0)}
          onDoubleClick={handleResetCols}
          title="Arrastrá para redimensionar · doble clic = reset"
        />

        {/* Panel 2 — Instrucción + respuesta */}
        <section className="panel instr-panel">
          <div className="panel-title">
            <span>Instrucción → IA</span>
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
              defaultPrompt={EDITOR_DEFAULT_SYSTEM}
              open={systemOpen}
              onToggleOpen={setSystemOpen}
              disabled={loading}
              presets={EDITOR_PRESETS}
              onLog={appendLog}
              hint="Viaja como messages[0] (role:system) en cada request. Probá presets para ver cómo cambia el estilo del código generado."
            />
            <div className="suggested-steps">
              <div className="suggested-steps-title">
                Probá esta secuencia (clic en cada paso para cargarlo):
              </div>
              <ol className="suggested-steps-list">
                {SUGGESTED_STEPS.map((step, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="suggested-step-btn"
                      onClick={() => setInstruction(step)}
                      disabled={loading}
                      title="Cargar esta instrucción en el campo"
                    >
                      {step}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="suggested-steps-foot">
                Probá los 2 pasos <b>Con contexto</b> → la IA recuerda el nombre que ella misma eligió.
                Después vaciá historial, pasá a <b>Sin contexto</b> y mandá solo el #2 → la IA no tiene cómo saber qué clase agregó.
              </div>
            </div>
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

          <div className={`context-section ${keepContext ? '' : 'context-raw-warning'}`}>
            <div className="context-header">
              <span className="context-title">
                {keepContext ? 'Contexto del editor (historial)' : 'Contexto del editor'}
              </span>
              <span className="context-header-right">
                <span className={`context-meta ${keepContext ? '' : 'context-meta-warn'}`}>
                  {keepContext
                    ? `${history.length} mensaje(s) · ≈ ${history.reduce((s, m) => s + Math.ceil((m.content || '').length / 4), 0)} tokens`
                    : 'desactivado (sin contexto)'}
                </span>
                {keepContext && history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="docs-link"
                    title="Vacía el historial guardado del editor"
                  >
                    vaciar
                  </button>
                )}
              </span>
            </div>
            {keepContext ? (
              <>
                <div className="context-list">
                  {history.length === 0 ? (
                    <div className="empty" style={{ fontSize: 12 }}>
                      Sin historial todavía. El primer envío inicia el contexto.
                    </div>
                  ) : (
                    history.map((m, i) => (
                      <div key={i} className={`ctx-msg ctx-${m.role}`}>
                        <span className="ctx-role">{m.role}</span>
                        <span className="ctx-content">{m.content}</span>
                        <span className="ctx-tokens">≈{Math.ceil((m.content || '').length / 4)}t</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="context-foot">
                  El próximo request mandará: <code>system</code> + estos {history.length} mensaje(s) + tu instrucción nueva con el código actual.
                </div>
              </>
            ) : (
              <div className="context-foot">
                Cada instrucción se manda sola: <code>system</code> + tu instrucción + código. La IA no recuerda lo anterior.
              </div>
            )}
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

        {/* Panel 3 — Raw + Log apilados */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Request → API</span>
          </div>
          <pre className="raw raw-compact">
            {rawRequest ? JSON.stringify(rawRequest, null, 2) : '// Sin request todavía'}
          </pre>
          {rawRequest && (
            <div className="ctx-tip">
              💡 Mirá el <code>messages[]</code> de arriba: <b>todo</b> lo que ves ahí es lo que
              la IA usa para responder. Comentarios del código, nombres de variables, instrucción,
              system prompt — todo es contexto. Si "adivina" algo aparentemente sin contexto, fijate
              si la pista no estaba metida en el código.
            </div>
          )}
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
