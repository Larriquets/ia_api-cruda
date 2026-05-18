import { useCallback, useEffect, useRef, useState } from 'react'
import {
  sendReasoningMessage,
  REASONING_MODELS,
  REASONING_EFFORTS,
} from './openai-reasoning.js'
import {
  sendClaudeReasoningMessage,
  ANTHROPIC_REASONING_MODELS,
  ANTHROPIC_BUDGETS,
} from './anthropic-reasoning.js'
import ModeSwitch from './ModeSwitch.jsx'
import ReadDocLink from './ReadDocLink.jsx'
import ConfigBar from './ConfigBar.jsx'
import WelcomeModal from './WelcomeModal.jsx'

const PROVIDER_KEY = 'razon_provider'
const MODEL_OPENAI_KEY = 'razon_model_openai'
const MODEL_ANTHROPIC_KEY = 'razon_model_anthropic'
const EFFORT_KEY = 'razon_effort'
const SUMMARY_KEY = 'razon_summary'
const INSTRUCTIONS_KEY = 'razon_instructions'
const LOGS_KEY = 'razon_logs'
const KEEP_CONTEXT_KEY = 'razon_keep_context'
const HISTORY_KEY = 'razon_history'
const LOGS_MAX = 300
const HISTORY_MAX = 40

const DEFAULT_INSTRUCTIONS =
  'Sos un asistente que piensa paso a paso antes de responder. ' +
  'Respondé en castellano rioplatense, de forma clara y directa.'

const PRESETS = [
  {
    id: 'matematica',
    label: '🧮 Problema matemático',
    text: 'Un tren sale de la estación A a las 14:35 viajando a 80 km/h hacia la estación B. Otro tren sale de B a las 15:10 viajando a 95 km/h hacia A. La distancia entre A y B es 420 km. ¿A qué hora se cruzan y a cuántos km de A?',
  },
  {
    id: 'logica',
    label: '🧩 Acertijo lógico',
    text: 'Tres amigos —Ana, Beto y Carla— tienen distintas profesiones: médica, ingeniera y abogada. Sabemos: (1) Ana no es médica. (2) Beto no es ni médico ni abogado. (3) Carla no es ingeniera. ¿Qué profesión tiene cada uno?',
  },
  {
    id: 'codigo',
    label: '💻 Código (Java)',
    text: `Leé este código Java paso a paso. Decime qué hace, encontrá el bug y mostrame el fix.

\`\`\`java
public class Promedio {
    public static double promedio(int[] nums) {
        int suma = 0;
        for (int i = 1; i <= nums.length; i++) {
            suma = suma + nums[i];
        }
        return suma / nums.length;
    }

    public static void main(String[] args) {
        int[] notas = {8, 6, 10, 7};
        System.out.println(promedio(notas));
    }
}
\`\`\`

Esperado: el promedio de {8, 6, 10, 7} debería ser 7.75.`,
  },
  {
    id: 'planificacion',
    label: '🗺 Planificación',
    text: 'Quiero aprender React en 4 semanas dedicándole 1 hora por día. Vengo de JS vanilla pero nunca toqué frameworks. Armame un plan semana por semana con objetivos concretos y proyecto final.',
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

export default function Razonamiento() {
  const [provider, setProvider] = useState(() => {
    const saved = localStorage.getItem(PROVIDER_KEY)
    return saved === 'anthropic' ? 'anthropic' : 'openai'
  })
  const [modelOpenAI, setModelOpenAI] = useState(
    () => localStorage.getItem(MODEL_OPENAI_KEY) || 'gpt-5-mini',
  )
  const [modelAnthropic, setModelAnthropic] = useState(
    () => localStorage.getItem(MODEL_ANTHROPIC_KEY) || 'claude-sonnet-4-5',
  )
  const [effort, setEffort] = useState(
    () => localStorage.getItem(EFFORT_KEY) || 'medium',
  )
  const [summary, setSummary] = useState(
    () => localStorage.getItem(SUMMARY_KEY) || 'detailed',
  )
  const [instructions, setInstructions] = useState(
    () => localStorage.getItem(INSTRUCTIONS_KEY) ?? DEFAULT_INSTRUCTIONS,
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rawRequest, setRawRequest] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [reply, setReply] = useState('')
  const [reasoningBlocks, setReasoningBlocks] = useState([])
  const [usage, setUsage] = useState(null)
  const [elapsedMs, setElapsedMs] = useState(null)
  const [logs, setLogs] = useState(() => safeReadJSON(LOGS_KEY) || [])
  const [keepContext, setKeepContext] = useState(
    () => localStorage.getItem(KEEP_CONTEXT_KEY) === 'true',
  )
  const [history, setHistory] = useState(() => safeReadJSON(HISTORY_KEY) || [])

  const logRef = useRef(null)
  const replyRef = useRef(null)

  useEffect(() => { localStorage.setItem(PROVIDER_KEY, provider) }, [provider])
  useEffect(() => { localStorage.setItem(MODEL_OPENAI_KEY, modelOpenAI) }, [modelOpenAI])
  useEffect(() => { localStorage.setItem(MODEL_ANTHROPIC_KEY, modelAnthropic) }, [modelAnthropic])
  useEffect(() => { localStorage.setItem(EFFORT_KEY, effort) }, [effort])
  useEffect(() => { localStorage.setItem(SUMMARY_KEY, summary) }, [summary])
  useEffect(() => { localStorage.setItem(INSTRUCTIONS_KEY, instructions) }, [instructions])
  useEffect(() => {
    try {
      const trimmed = logs.slice(-LOGS_MAX)
      localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed))
    } catch { /* noop */ }
  }, [logs])
  useEffect(() => { localStorage.setItem(KEEP_CONTEXT_KEY, String(keepContext)) }, [keepContext])
  useEffect(() => {
    try {
      const trimmed = history.slice(-HISTORY_MAX)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
    } catch { /* noop */ }
  }, [history])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  useEffect(() => {
    replyRef.current?.scrollTo({ top: replyRef.current.scrollHeight, behavior: 'smooth' })
  }, [reply, reasoningBlocks])

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setLoading(true)
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    setReply('')
    setReasoningBlocks([])
    setUsage(null)
    setElapsedMs(null)
    appendLog('user', `Pregunta: "${text}"`)
    appendLog('info', keepContext
      ? `Modo CON CONTEXTO — incluyendo ${history.length} mensaje(s) previos del historial`
      : 'Modo SIN CONTEXTO — cada pregunta es independiente')

    const startedAt = performance.now()

    const userMsg = { role: 'user', content: text }
    // Con contexto mandamos array de mensajes (multi-turn). Sin contexto mandamos solo el string.
    // No reenviamos los bloques thinking previos — solo turnos user/assistant con texto final.
    const payload = keepContext ? [...history, userMsg] : text

    try {
      const commonArgs = {
        effort,
        instructions: instructions.trim() || DEFAULT_INSTRUCTIONS,
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
      }
      const result = provider === 'anthropic'
        ? await sendClaudeReasoningMessage(payload, { ...commonArgs, model: modelAnthropic })
        : await sendReasoningMessage(payload, { ...commonArgs, model: modelOpenAI, summary })

      setReply(result.text)
      setReasoningBlocks(result.reasoningBlocks)
      setUsage(result.usage)
      setElapsedMs(Math.round(performance.now() - startedAt))
      if (keepContext) {
        setHistory((h) => [...h, userMsg, { role: 'assistant', content: result.text }])
        appendLog('success', `Respuesta agregada al historial (${history.length + 2} mensajes en total)`)
      } else {
        appendLog('success', 'Respuesta lista (no se guardó en historial)')
      }
    } catch (err) {
      const providerLabel = provider === 'anthropic' ? 'Anthropic' : 'OpenAI'
      setError(err.message || `Error al contactar a ${providerLabel}`)
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setReply('')
    setReasoningBlocks([])
    setUsage(null)
    setElapsedMs(null)
    setRawRequest(null)
    setRawResponse(null)
    setError(null)
    appendLog('info', 'Respuesta limpiada')
  }

  const handleClearHistory = () => {
    setHistory([])
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* noop */ }
    appendLog('info', 'Historial del razonador vaciado')
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  const reasoningTokens = usage?.output_tokens_details?.reasoning_tokens ?? 0
  const outputTokens = usage?.output_tokens ?? 0
  const inputTokens = usage?.input_tokens ?? 0
  const totalTokens = usage?.total_tokens ?? 0
  const visibleOutputTokens = Math.max(0, outputTokens - reasoningTokens)
  const reasoningRatio = outputTokens > 0
    ? Math.round((reasoningTokens / outputTokens) * 100)
    : 0

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
          <span className="brand-subtitle">// experimento · <span className="brand-mode">Razonamiento</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="razonamiento" />
        </div>
      </header>

      <ConfigBar>
        <label className="hdr-select">
          <span className="hdr-select-label">Proveedor</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={loading}
            className={`hdr-select-input provider-select-${provider}`}
            title="OpenAI esconde el razonamiento (solo resumen opcional). Claude muestra el thinking entero."
          >
            <option value="openai">🟢 OpenAI (esconde el pensamiento)</option>
            <option value="anthropic">🟠 Claude (muestra el pensamiento)</option>
          </select>
        </label>

        <label className="hdr-select">
          <span className="hdr-select-label">Modo</span>
          <select
            value={keepContext ? 'with' : 'without'}
            onChange={(e) => {
              const next = e.target.value === 'with'
              setKeepContext(next)
              appendLog('info', next
                ? 'Modo CON CONTEXTO activado — las próximas preguntas incluirán el historial'
                : 'Modo SIN CONTEXTO activado — cada pregunta será independiente')
            }}
            disabled={loading}
            className={`hdr-select-input mode-select-${keepContext ? 'persistent' : 'conversation'}`}
            title="Sin contexto: cada pregunta es independiente. Con contexto: el razonador recuerda los turnos anteriores (solo el texto final, no los bloques thinking previos)."
          >
            <option value="without">Sin contexto</option>
            <option value="with">Con contexto</option>
          </select>
        </label>

        {provider === 'openai' ? (
          <label className="hdr-select">
            <span className="hdr-select-label">Modelo</span>
            <select
              value={modelOpenAI}
              onChange={(e) => setModelOpenAI(e.target.value)}
              disabled={loading}
              className="hdr-select-input"
              title="Solo modelos razonadores de OpenAI. gpt-4o-mini NO es razonador."
            >
              {REASONING_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="hdr-select">
            <span className="hdr-select-label">Modelo</span>
            <select
              value={modelAnthropic}
              onChange={(e) => setModelAnthropic(e.target.value)}
              disabled={loading}
              className="hdr-select-input"
              title="Solo modelos con extended thinking. Haiku NO razona."
            >
              {ANTHROPIC_REASONING_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
              ))}
            </select>
          </label>
        )}

        <label className="hdr-select">
          <span className="hdr-select-label">Effort</span>
          <select
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
            disabled={loading}
            className="hdr-select-input"
            title={provider === 'anthropic'
              ? 'En Claude se traduce a thinking.budget_tokens (minimal=1k, low=2k, medium=5k, high=12k).'
              : "En OpenAI es reasoning.effort. Más effort = más tokens de razonamiento = más caro y más lento."}
          >
            {(provider === 'anthropic' ? ANTHROPIC_BUDGETS : REASONING_EFFORTS).map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} — {opt.sub}
                {provider === 'anthropic' && opt.tokens ? ` (${opt.tokens}t)` : ''}
              </option>
            ))}
          </select>
        </label>

        {provider === 'openai' && (
          <label className="hdr-select">
            <span className="hdr-select-label">Summary</span>
            <select
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={loading}
              className="hdr-select-input"
              title="Si OpenAI te devuelve un resumen del razonamiento. El razonamiento crudo NUNCA se expone."
            >
              <option value="detailed">detailed (más texto — default)</option>
              <option value="auto">auto</option>
              <option value="concise">concise</option>
            </select>
          </label>
        )}

        <button onClick={handleClear} className="clear-btn" type="button" disabled={loading}>
          Limpiar
        </button>

        <ReadDocLink section="modo-razonamiento" />
      </ConfigBar>

      <div className="layout">
        {/* Panel 1 — Composer */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>Pregunta para el razonador</span>
            <span className="context-meta">
              {provider === 'anthropic'
                ? '/v1/messages · thinking.budget_tokens'
                : '/v1/responses · reasoning.effort'}
            </span>
          </div>

          <div className="razon-presets">
            <span className="razon-presets-label">Probá uno:</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="razon-preset-btn"
                onClick={() => setInput(p.text)}
                disabled={loading}
                title={p.text}
              >
                {p.label}
              </button>
            ))}
          </div>

          <details className="razon-instructions">
            <summary>Instructions (system del modelo razonador)</summary>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder={DEFAULT_INSTRUCTIONS}
            />
            <div className="razon-foot">
              En <code>/v1/responses</code> el system viaja como <code>instructions</code>, no como <code>messages[0]</code>.
            </div>
          </details>

          <form onSubmit={handleSend} className="razon-composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hacele una pregunta que requiera pensar — un acertijo, un problema, un análisis…"
              disabled={loading}
              rows={5}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? 'Pensando…' : 'Enviar al razonador'}
            </button>
          </form>

          {error && <div className="error">{error}</div>}

          <div className="razon-result" ref={replyRef}>
            {loading && (
              <div className="razon-thinking razon-thinking-loading">
                <div className="razon-thinking-header">
                  <span>🧠 Razonando…</span>
                  <span className="context-meta">esperando bloques type:'reasoning'</span>
                </div>
                <div className="razon-thinking-dots"><span></span><span></span><span></span></div>
                <div className="razon-thinking-empty" style={{ marginTop: 8 }}>
                  El modelo está pensando. Como no usamos streaming, recién vas a ver el razonamiento cuando llegue toda la respuesta.
                </div>
              </div>
            )}

            {!loading && reply === '' && reasoningBlocks.length === 0 && (
              <div className="empty">
                Hacé una pregunta. Probá la <b>misma pregunta con OpenAI y con Claude</b> para ver el contraste: OpenAI te muestra solo un resumen del razonamiento (y a veces nada), Claude te muestra el <b>thinking entero</b>.
              </div>
            )}

            {!loading && reasoningBlocks.length > 0 && (
              <div className={`razon-thinking razon-thinking-${provider}`}>
                <div className="razon-thinking-header">
                  <span>
                    🧠 {provider === 'anthropic' ? 'Thinking (crudo)' : 'Razonamiento (resumen)'}
                  </span>
                  <span className="context-meta">
                    {reasoningBlocks.length} bloque(s)
                    {reasoningTokens > 0 ? ` · ${reasoningTokens} token(s)` : ''}
                  </span>
                </div>
                {provider === 'anthropic' && (
                  <div className="razon-thinking-note">
                    Claude devuelve el razonamiento <b>completo</b>, no un resumen. Cada bloque viene firmado (<code>signature</code>) para que puedas reenviarlo en multi-turn.
                  </div>
                )}
                {reasoningBlocks.map((block, i) => (
                  <div key={block.id || i} className="razon-thinking-block">
                    <div className="razon-thinking-block-meta">
                      <span className="razon-thinking-tag">bloque #{i + 1}</span>
                      {block.id && <span className="razon-thinking-id">id: <code>{block.id.slice(0, 18)}…</code></span>}
                      {block.signature && <span className="razon-thinking-id" title="Firma criptográfica del bloque thinking. Necesaria para reenviar el bloque en multi-turn.">✍ signature</span>}
                      {block.redacted && <span className="razon-thinking-enc" title="Claude redactó este bloque por safety. Es opaco pero podés reenviarlo tal cual.">🔒 redacted_thinking</span>}
                      {block.encrypted && !block.redacted && <span className="razon-thinking-enc" title="OpenAI devolvió el razonamiento cifrado para que puedas reusarlo en otra request sin volver a pagarlo">🔒 encrypted_content</span>}
                    </div>
                    {block.summary
                      ? <pre className="razon-thinking-text">{block.summary}</pre>
                      : provider === 'anthropic'
                        ? <div className="razon-thinking-empty">
                            <b>Bloque redactado por safety.</b><br/>
                            Claude detectó algo que prefiere no mostrar pero te dejó el bloque opaco para que puedas reenviarlo en multi-turn sin perder el contexto del pensamiento.
                          </div>
                        : <div className="razon-thinking-empty">
                            <b>OpenAI no devolvió texto en este bloque.</b><br/>
                            El razonamiento crudo nunca se expone — la API solo te devuelve un <b>resumen</b> opcional. A veces decide no resumir nada y solo te deja el conteo de tokens (mirá arriba: <b>{reasoningTokens}</b> tokens pensó igual). El razonamiento real quedó guardado en <code>encrypted_content</code>, opaco para vos.<br/><br/>
                            Probá: cambiar a <b>Claude</b> en el selector de arriba para ver el thinking entero, o subir <code>effort</code> a <code>high</code>.
                          </div>
                    }
                  </div>
                ))}
              </div>
            )}

            {!loading && reply && (
              <div className="razon-answer">
                <div className="razon-answer-header">
                  <span>💬 Respuesta final</span>
                  <span className="context-meta">{reply.length} chars · {visibleOutputTokens} token(s) visibles</span>
                </div>
                <pre className="razon-answer-text">{reply}</pre>
              </div>
            )}
          </div>

          {usage && (
            <div className="razon-usage">
              <div className="razon-usage-row">
                <span>Tokens input</span>
                <span><b>{inputTokens}</b></span>
              </div>
              <div className="razon-usage-row">
                <span>Tokens output total</span>
                <span><b>{outputTokens}</b></span>
              </div>
              {provider === 'openai' ? (
                <>
                  <div className="razon-usage-row razon-usage-thinking">
                    <span>↳ de razonamiento</span>
                    <span><b>{reasoningTokens}</b> ({reasoningRatio}% del output)</span>
                  </div>
                  <div className="razon-usage-row">
                    <span>↳ visibles para el usuario</span>
                    <span><b>{visibleOutputTokens}</b></span>
                  </div>
                </>
              ) : (
                <div className="razon-usage-row razon-usage-thinking">
                  <span>↳ de los cuales, thinking</span>
                  <span><i>Claude no separa thinking de output en usage — todo viene en output_tokens</i></span>
                </div>
              )}
              <div className="razon-usage-row">
                <span>Total facturado</span>
                <span><b>{totalTokens}</b> token(s)</span>
              </div>
              {elapsedMs != null && (
                <div className="razon-usage-row">
                  <span>Latencia total</span>
                  <span><b>{elapsedMs}</b> ms</span>
                </div>
              )}
              <div className="razon-usage-foot">
                {provider === 'openai'
                  ? 'Los tokens de razonamiento se facturan como output aunque el usuario no los vea. Es la diferencia clave entre un chat normal y un razonador.'
                  : 'Claude mete el thinking dentro de output_tokens. Sabés cuántos pensó porque vos definiste budget_tokens, pero la API no te lo separa.'}
              </div>
            </div>
          )}

        </section>

        {/* Panel 2 — Request/Response crudo */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Request → {provider === 'anthropic' ? '/v1/messages' : '/v1/responses'}</span>
            <span className="panel-links">
              <a
                href={provider === 'anthropic'
                  ? 'https://docs.anthropic.com/en/api/messages'
                  : 'https://platform.openai.com/docs/api-reference/responses/create'}
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
            <span>Response ← API</span>
            <span className="panel-links">
              <a
                href={provider === 'anthropic'
                  ? 'https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking'
                  : 'https://platform.openai.com/docs/guides/reasoning'}
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title="Guía oficial sobre razonamiento"
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

          {rawResponse && provider === 'openai' && (
            <details className="field-guide">
              <summary>¿Qué hay de nuevo acá vs un chat normal? (OpenAI)</summary>
              <ul>
                <li><code>output[]</code> trae items con <code>type:'reasoning'</code> ANTES del <code>type:'message'</code> final.</li>
                <li><code>output[].summary[]</code> es lo único expuesto del razonamiento — los <i>tokens crudos</i> de pensamiento nunca se devuelven.</li>
                <li><code>output[].encrypted_content</code> es el razonamiento cifrado: lo usás para reanudar el pensamiento en otra request sin pagarlo de nuevo.</li>
                <li><code>usage.output_tokens_details.reasoning_tokens</code> — los tokens de pensamiento que igual te facturan.</li>
                <li><code>reasoning.effort</code> en el request — minimal/low/medium/high. Cambia cuántos tokens piensa.</li>
                <li>NO hay <code>temperature</code>: los razonadores la ignoran/rechazan. Su variabilidad la maneja el effort.</li>
              </ul>
            </details>
          )}

          {rawResponse && provider === 'anthropic' && (
            <details className="field-guide">
              <summary>¿Qué hay de nuevo acá vs un chat normal? (Claude)</summary>
              <ul>
                <li><code>content[]</code> trae bloques con <code>type:'thinking'</code> ANTES de los <code>type:'text'</code>.</li>
                <li><code>content[].thinking</code> es el texto del razonamiento <b>entero</b>, no un resumen. Esa es la gran diferencia con OpenAI.</li>
                <li><code>content[].signature</code> firma el bloque para que lo puedas reenviar en multi-turn sin que Claude desconfíe.</li>
                <li><code>thinking.budget_tokens</code> en el request — define cuánto puede pensar. <code>max_tokens</code> DEBE ser mayor que el budget.</li>
                <li><code>temperature</code> tiene que ser 1 — la API lo exige cuando thinking está habilitado.</li>
                <li>A veces aparece <code>type:'redacted_thinking'</code>: bloque opaco que filtró safety. Lo podés reenviar tal cual.</li>
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
