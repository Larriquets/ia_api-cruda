import { useState, useEffect, useRef, useCallback } from 'react'
import Brand from './Brand.jsx'
import MonacoEditor from '@monaco-editor/react'
import { sendChatMessage } from './openai.js'
import { sendClaudeMessage } from './anthropic.js'
import { sendLmStudioMessage } from './lmstudio.js'
import ModeSwitch from './ModeSwitch.jsx'
import DemoBacklink from './DemoBacklink.jsx'
import ReadDocLink from './ReadDocLink.jsx'
import ConfigBar from './ConfigBar.jsx'
import LmStudioModelPicker from './LmStudioModelPicker.jsx'
import SystemEditor from './SystemEditor.jsx'
import { EDITOR_DEFAULT_SYSTEM, EDITOR_PRESETS } from './system-presets.js'
import { useT } from './i18n/useT.js'

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

// Los pasos sugeridos son copy visible: bilingüe ES (base) / EN (traducción).
const SUGGESTED_STEPS_ES = [
  'Agregá otra clase a este código.',
  '¿Cómo se llama la clase que agregaste?',
  'Creá un objeto de la clase que creaste, instanciala.',
]

const SUGGESTED_STEPS_EN = [
  'Add another class to this code.',
  'What is the name of the class you added?',
  'Create an object of the class you created, instantiate it.',
]

// Extrae el primer bloque ```...``` de un texto. Si no hay bloque, devuelve el texto entero.
function extractCodeBlock(text) {
  if (!text) return ''
  const match = text.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/)
  return match ? match[1] : text
}

export default function Editor({ onBack }) {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const SUGGESTED_STEPS = lang === 'en' ? SUGGESTED_STEPS_EN : SUGGESTED_STEPS_ES

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
  const [instruction, setInstruction] = useState(() => SUGGESTED_STEPS[0])
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
    return L(
      `Lenguaje: ${language}\n\nInstrucción:\n${instruction.trim()}\n\nCódigo actual:\n\`\`\`${language}\n${code}\n\`\`\``,
      `Language: ${language}\n\nInstruction:\n${instruction.trim()}\n\nCurrent code:\n\`\`\`${language}\n${code}\n\`\`\``,
    )
  }

  const handleSend = async () => {
    if (!instruction.trim() || loading) return
    setLoading(true)
    setError(null)
    setReply('')
    setRawRequest(null)
    setRawResponse(null)

    const instrPreview = `${instruction.trim().slice(0, 80)}${instruction.length > 80 ? '…' : ''}`
    appendLog('user', L(`Instrucción: "${instrPreview}"`, `Instruction: "${instrPreview}"`))
    appendLog('info', L(
      `Lenguaje: ${language} · Tamaño código: ${code.length} chars`,
      `Language: ${language} · Code size: ${code.length} chars`,
    ))
    appendLog('info', keepContext
      ? L(
          `Modo CON CONTEXTO — incluyendo ${history.length} mensaje(s) previos del historial`,
          `WITH CONTEXT mode — including ${history.length} previous message(s) from history`,
        )
      : L('Modo SIN CONTEXTO — cada instrucción es independiente', 'NO CONTEXT mode — each instruction is independent'))

    const effectiveSystem = systemPrompt.trim() ? systemPrompt : EDITOR_DEFAULT_SYSTEM
    if (effectiveSystem !== EDITOR_DEFAULT_SYSTEM) {
      appendLog('info', L(
        `System prompt personalizado (${effectiveSystem.length} chars)`,
        `Custom system prompt (${effectiveSystem.length} chars)`,
      ))
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
      appendLog('info', L(`Proveedor: ${providerLabel}`, `Provider: ${providerLabel}`))

      const result = await sendFn(messages, {
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
      })

      setReply(result)
      if (keepContext) {
        setHistory((h) => [...h, userMsg, { role: 'assistant', content: result }])
        appendLog('success', L(
          `Respuesta agregada al historial (${history.length + 2} mensajes en total)`,
          `Response added to history (${history.length + 2} messages total)`,
        ))
      } else {
        appendLog('success', L('Respuesta recibida (no se guardó en historial)', 'Response received (not saved to history)'))
      }
    } catch (err) {
      setError(err.message || L('Error al contactar la API', 'Error contacting the API'))
      appendLog('error', err.message || L('Error desconocido', 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = () => {
    setHistory([])
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* noop */ }
    appendLog('info', L('Historial del editor vaciado', 'Editor history cleared'))
  }

  const handleApply = () => {
    const block = extractCodeBlock(reply)
    if (!block.trim()) {
      appendLog('error', L('No se encontró código en la respuesta', 'No code found in the response'))
      return
    }
    setCode(block)
    appendLog('success', L('Código del editor reemplazado con la respuesta', 'Editor code replaced with the response'))
  }

  const handleClearCode = () => {
    setCode('')
    appendLog('info', L('Editor vaciado', 'Editor cleared'))
  }

  const handleResetCode = () => {
    setCode(DEFAULT_CODE)
    appendLog('info', L('Editor reseteado al ejemplo', 'Editor reset to the sample'))
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  return (
    <div className="app editor-page">
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label={L('Ir al inicio', 'Go to home')}>
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <Brand />
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">{t('app.subtitlePre')}<span className="brand-mode">Editor</span>{t('app.subtitlePost')}</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="editor" />
        </div>
      </header>

      <DemoBacklink href="/demo/editor" />

      <ConfigBar>
        <label className="hdr-select">
          <span className="hdr-select-label">{t('app.provider')}</span>
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
              appendLog('info', L(`Proveedor cambiado a ${label}`, `Provider changed to ${label}`))
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
          <span className="hdr-select-label">{t('app.modeLabel')}</span>
          <select
            value={keepContext ? 'with' : 'without'}
            onChange={(e) => {
              const next = e.target.value === 'with'
              setKeepContext(next)
              appendLog('info', next
                ? L('Modo CON CONTEXTO activado — los próximos requests incluirán el historial', 'WITH CONTEXT mode enabled — the next requests will include the history')
                : L('Modo SIN CONTEXTO activado — cada request será independiente', 'NO CONTEXT mode enabled — each request will be independent'))
            }}
            className={`hdr-select-input mode-select-${keepContext ? 'persistent' : 'conversation'}`}
            title={L('Sin contexto: cada instrucción es independiente. Con contexto: la IA recuerda las instrucciones anteriores.', 'No context: each instruction is independent. With context: the AI remembers previous instructions.')}
          >
            <option value="without">{L('Sin contexto', 'No context')}</option>
            <option value="with">{L('Con contexto', 'With context')}</option>
          </select>
        </label>

        <label className="hdr-select">
          <span className="hdr-select-label">{L('Lenguaje', 'Language')}</span>
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

        <button onClick={handleResetCode} className="clear-btn" type="button" title={L('Volver al código de ejemplo', 'Back to the sample code')}>
          Reset
        </button>
        <button onClick={handleClearCode} className="clear-btn" type="button">
          {L('Vaciar editor', 'Clear editor')}
        </button>

        <div className="config-bar-actions">
          <a
            href="/demo/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="read-doc-link view-demo-link"
            title={L('Abre la demo automática del Editor en otra pestaña', 'Opens the automatic Editor demo in a new tab')}
          >
            🎬 {L('Ver Demo', 'View Demo')}
          </a>
          <ReadDocLink section="modo-editor" />
        </div>
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
          title={L('Arrastrá para redimensionar · doble clic = reset', 'Drag to resize · double-click = reset')}
        />

        {/* Panel 2 — Instrucción + respuesta */}
        <section className="panel instr-panel">
          <div className="panel-title">
            <span>{L('Instrucción → IA', 'Instruction → AI')}</span>
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
              hint={L('Viaja como messages[0] (role:system) en cada request. Probá presets para ver cómo cambia el estilo del código generado.', 'Travels as messages[0] (role:system) in every request. Try presets to see how the generated code style changes.')}
            />
            <div className="suggested-steps">
              <div className="suggested-steps-title">
                {L('Probá esta secuencia (clic en cada paso para cargarlo):', 'Try this sequence (click each step to load it):')}
              </div>
              <ol className="suggested-steps-list">
                {SUGGESTED_STEPS.map((step, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="suggested-step-btn"
                      onClick={() => setInstruction(step)}
                      disabled={loading}
                      title={L('Cargar esta instrucción en el campo', 'Load this instruction into the field')}
                    >
                      {step}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="suggested-steps-foot">
                {L('Probá los 2 pasos', 'Try the 2 steps')} <b>{L('Con contexto', 'With context')}</b> {L('→ la IA recuerda el nombre que ella misma eligió. Después vaciá historial, pasá a', '→ the AI remembers the name it chose itself. Then clear the history, switch to')} <b>{L('Sin contexto', 'No context')}</b> {L('y mandá solo el #2 → la IA no tiene cómo saber qué clase agregó.', 'and send only #2 → the AI has no way to know which class it added.')}
              </div>
            </div>
            <textarea
              className="instr-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={L('¿Qué querés que haga la IA con tu código? (ej: \'agregale validación\', \'explicá la función X\', \'escribí tests\')', 'What do you want the AI to do with your code? (e.g. \'add validation\', \'explain function X\', \'write tests\')')}
              disabled={loading}
            />
            <div className="instr-actions">
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !instruction.trim()}
                className="instr-send-btn"
              >
                {loading ? L('Pensando…', 'Thinking…') : L('Mandar a la IA →', 'Send to the AI →')}
              </button>
              {reply && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="instr-apply-btn"
                  title={L('Reemplaza el contenido del editor con el bloque de código de la respuesta', 'Replaces the editor content with the code block from the response')}
                >
                  ✓ {L('Aplicar al editor', 'Apply to editor')}
                </button>
              )}
            </div>

            {error && <div className="error">{error}</div>}

            <div className="reply-section">
              <div className="reply-header">
                <span>{L('Respuesta', 'Response')}</span>
                {reply && (
                  <span className="context-meta">{reply.length} chars</span>
                )}
              </div>
              <div className="reply-content">
                {reply ? reply : <span className="empty">{L('La respuesta de la IA aparecerá acá.', "The AI's response will appear here.")}</span>}
              </div>
            </div>
          </div>

          <div className={`context-section ${keepContext ? '' : 'context-raw-warning'}`}>
            <div className="context-header">
              <span className="context-title">
                {keepContext ? L('Contexto del editor (historial)', 'Editor context (history)') : L('Contexto del editor', 'Editor context')}
              </span>
              <span className="context-header-right">
                <span className={`context-meta ${keepContext ? '' : 'context-meta-warn'}`}>
                  {keepContext
                    ? L(
                        `${history.length} mensaje(s) · ≈ ${history.reduce((s, m) => s + Math.ceil((m.content || '').length / 4), 0)} tokens`,
                        `${history.length} message(s) · ≈ ${history.reduce((s, m) => s + Math.ceil((m.content || '').length / 4), 0)} tokens`,
                      )
                    : L('desactivado (sin contexto)', 'disabled (no context)')}
                </span>
                {keepContext && history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="docs-link"
                    title={L('Vacía el historial guardado del editor', 'Clears the editor saved history')}
                  >
                    {L('vaciar', 'clear')}
                  </button>
                )}
              </span>
            </div>
            {keepContext ? (
              <>
                <div className="context-list">
                  {history.length === 0 ? (
                    <div className="empty" style={{ fontSize: 12 }}>
                      {L('Sin historial todavía. El primer envío inicia el contexto.', 'No history yet. The first send starts the context.')}
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
                  {L('El próximo request mandará:', 'The next request will send:')} <code>system</code> {L(`+ estos ${history.length} mensaje(s) + tu instrucción nueva con el código actual.`, `+ these ${history.length} message(s) + your new instruction with the current code.`)}
                </div>
              </>
            ) : (
              <div className="context-foot">
                {L('Cada instrucción se manda sola:', 'Each instruction is sent on its own:')} <code>system</code> {L('+ tu instrucción + código. La IA no recuerda lo anterior.', '+ your instruction + code. The AI does not remember anything before.')}
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
          title={L('Arrastrá para redimensionar · doble clic = reset', 'Drag to resize · double-click = reset')}
        />

        {/* Panel 3 — Raw + Log apilados */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Request → API</span>
          </div>
          <pre className="raw raw-compact">
            {rawRequest ? JSON.stringify(rawRequest, null, 2) : L('// Sin request todavía', '// No request yet')}
          </pre>
          {rawRequest && (
            <div className="ctx-tip">
              💡 {L('Mirá el', 'Look at the')} <code>messages[]</code> {L('de arriba:', 'above:')} <b>{L('todo', 'everything')}</b> {L('lo que ves ahí es lo que la IA usa para responder. Comentarios del código, nombres de variables, instrucción, system prompt — todo es contexto. Si "adivina" algo aparentemente sin contexto, fijate si la pista no estaba metida en el código.', 'you see there is what the AI uses to respond. Code comments, variable names, instruction, system prompt — it is all context. If it "guesses" something seemingly out of nowhere, check whether the hint was buried in the code.')}
            </div>
          )}
          <div className="panel-title panel-title-sub">
            <span>Response ← API</span>
          </div>
          <pre className="raw raw-compact">
            {rawResponse ? JSON.stringify(rawResponse, null, 2) : L('// Sin respuesta todavía', '// No response yet')}
          </pre>
          <div className="panel-title panel-title-sub">
            <span>Log</span>
            <span className="panel-links">
              <span className="context-meta">{L(`${logs.length} línea(s)`, `${logs.length} line(s)`)}</span>
              {logs.length > 0 && (
                <button type="button" onClick={handleClearLogs} className="docs-link">{L('vaciar', 'clear')}</button>
              )}
            </span>
          </div>
          <div className="log log-compact" ref={logRef}>
            {logs.length === 0 && <div className="empty">{L('Sin actividad todavía.', 'No activity yet.')}</div>}
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
