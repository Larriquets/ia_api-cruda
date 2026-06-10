import { useCallback, useEffect, useRef, useState } from 'react'
import { sendLogprobsMessage, TOP_LOGPROBS_OPTIONS } from './openai-logprobs.js'
import { OPENAI_CHAT_MODELS } from './openai.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import WelcomeModal from './WelcomeModal.jsx'
import TemperatureControl from './TemperatureControl.jsx'

const MODEL_KEY = 'logprobs_model'
const TEMP_KEY = 'logprobs_temperature'
const TOP_KEY = 'logprobs_top'
const SYSTEM_KEY = 'logprobs_system'
const LOGS_KEY = 'logprobs_logs'
const LOGS_MAX = 300

const DEFAULT_SYSTEM =
  'Sos un asistente conciso. Respondé en castellano rioplatense, sin vueltas y sin Markdown.'

const PRESETS = [
  {
    id: 'hecho',
    label: '🧊 Hecho duro',
    text: 'Respondé con una sola palabra: ¿a cuántos grados hierve el agua al nivel del mar?',
    hint: 'Un hecho conocido: casi todos los tokens deberían salir verdes (probabilidad altísima).',
  },
  {
    id: 'capital',
    label: '🌍 Capital trampa',
    text: '¿Cuál es la capital de Australia? Respondé solo el nombre de la ciudad.',
    hint: 'Mirá si "Sídney" aparece entre las alternativas que el modelo consideró.',
  },
  {
    id: 'creativo',
    label: '🎸 Creativo',
    text: 'Inventá un nombre original para una banda de rock. Respondé solo el nombre, nada más.',
    hint: 'Pedido creativo: la distribución se abre y aparecen tokens amarillos y rojos.',
  },
  {
    id: 'historia',
    label: '📖 Continuar historia',
    text: 'Continuá esta historia con una sola oración: "Cuando abrió la puerta del sótano, encontró…"',
    hint: 'Texto libre: alternancia de tokens seguros (conectores) y tokens dudosos (contenido).',
  },
  {
    id: 'cuenta',
    label: '🔢 Aritmética',
    text: '¿Cuánto es 7 × 8? Respondé solo el número.',
    hint: 'Casi determinista — y aun así es una predicción de tokens, no una calculadora.',
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

// Mapea probabilidad 0..1 a un color rojo→amarillo→verde para pintar el token.
const probColor = (prob) => {
  const hue = Math.round(prob * 120)
  return {
    background: `hsla(${hue}, 75%, 45%, 0.28)`,
    borderColor: `hsla(${hue}, 75%, 55%, 0.6)`,
  }
}

const pct = (prob) => `${(prob * 100).toFixed(prob >= 0.1 ? 1 : 2)}%`

// Los tokens vienen con espacios/saltos pegados ("\n", " hola"). Los hacemos
// visibles para que el alumno vea que el espacio TAMBIÉN es parte del token.
const displayToken = (token) =>
  token.replace(/ /g, '␣').replace(/\n/g, '⏎') || '∅'

export default function Logprobs() {
  const [model, setModel] = useState(
    () => localStorage.getItem(MODEL_KEY) || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
  )
  const [temperature, setTemperature] = useState(() => {
    const raw = localStorage.getItem(TEMP_KEY)
    const parsed = raw != null ? parseFloat(raw) : NaN
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : 0.7
  })
  const [topLogprobs, setTopLogprobs] = useState(() => {
    const parsed = parseInt(localStorage.getItem(TOP_KEY), 10)
    return TOP_LOGPROBS_OPTIONS.some((o) => o.id === parsed) ? parsed : 5
  })
  const [systemPrompt, setSystemPrompt] = useState(
    () => localStorage.getItem(SYSTEM_KEY) ?? DEFAULT_SYSTEM,
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rawRequest, setRawRequest] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [tokens, setTokens] = useState([])
  const [usage, setUsage] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [logs, setLogs] = useState(() => safeReadJSON(LOGS_KEY) || [])

  const logRef = useRef(null)

  useEffect(() => { localStorage.setItem(MODEL_KEY, model) }, [model])
  useEffect(() => { localStorage.setItem(TEMP_KEY, String(temperature)) }, [temperature])
  useEffect(() => { localStorage.setItem(TOP_KEY, String(topLogprobs)) }, [topLogprobs])
  useEffect(() => { localStorage.setItem(SYSTEM_KEY, systemPrompt) }, [systemPrompt])
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

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setLoading(true)
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    setTokens([])
    setUsage(null)
    setSelectedIdx(null)
    appendLog('user', `Pregunta: "${text}"`)

    const effectiveSystem = systemPrompt.trim() || DEFAULT_SYSTEM
    const messages = [
      { role: 'system', content: effectiveSystem },
      { role: 'user', content: text },
    ]

    try {
      const result = await sendLogprobsMessage(messages, {
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
        temperature,
        model,
        topLogprobs,
      })

      setTokens(result.tokens)
      setUsage(result.usage)

      // Auto-seleccionamos el token más dudoso: es el más interesante de mirar.
      if (result.tokens.length > 0) {
        let minIdx = 0
        result.tokens.forEach((t, i) => {
          if (t.prob < result.tokens[minIdx].prob) minIdx = i
        })
        setSelectedIdx(minIdx)
        appendLog('info', `Token más dudoso: "${displayToken(result.tokens[minIdx].token)}" con ${pct(result.tokens[minIdx].prob)} de probabilidad`)
      }
    } catch (err) {
      setError(err.message || 'Error al contactar a OpenAI')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setTokens([])
    setUsage(null)
    setSelectedIdx(null)
    setRawRequest(null)
    setRawResponse(null)
    setError(null)
    appendLog('info', 'Resultado limpiado')
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  const avgProb = tokens.length > 0
    ? tokens.reduce((s, t) => s + t.prob, 0) / tokens.length
    : 0
  const minToken = tokens.length > 0
    ? tokens.reduce((min, t, i) => (t.prob < tokens[min].prob ? i : min), 0)
    : null
  const selected = selectedIdx != null ? tokens[selectedIdx] : null

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
          <span className="brand-subtitle">// experimento · <span className="brand-mode">Logprobs</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="logprobs" />
        </div>
      </header>

      <ConfigBar>
        <label className="hdr-select">
          <span className="hdr-select-label">Proveedor</span>
          <select
            value="openai"
            disabled
            className="hdr-select-input provider-select-openai"
            title="Solo OpenAI: Anthropic no expone logprobs en su API. Eso también es una decisión de producto — cada proveedor elige qué mostrar."
          >
            <option value="openai">🟢 OpenAI (único que expone logprobs)</option>
          </select>
        </label>

        <label className="hdr-select">
          <span className="hdr-select-label">Modelo</span>
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              appendLog('info', `Modelo cambiado a ${e.target.value}`)
            }}
            disabled={loading}
            className="hdr-select-input"
            title="Modelos de chat clásicos. Los razonadores (gpt-5, o-*) no devuelven logprobs."
          >
            {OPENAI_CHAT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
            ))}
          </select>
        </label>

        <label className="hdr-select">
          <span className="hdr-select-label">top_logprobs</span>
          <select
            value={topLogprobs}
            onChange={(e) => setTopLogprobs(parseInt(e.target.value, 10))}
            disabled={loading}
            className="hdr-select-input"
            title="Cuántas alternativas por token devuelve la API además del token elegido. Más alternativas = response más grande."
          >
            {TOP_LOGPROBS_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>

        <button onClick={handleClear} className="clear-btn" type="button" disabled={loading}>
          Limpiar
        </button>
      </ConfigBar>

      <div className="layout">
        {/* Panel 1 — Composer + visualización */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>La IA es un predictor de tokens</span>
            <span className="context-meta">/v1/chat/completions · logprobs:true</span>
          </div>

          <div className="razon-presets">
            <span className="razon-presets-label">Probá uno:</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="razon-preset-btn"
                onClick={() => {
                  setInput(p.text)
                  appendLog('info', `Preset "${p.label}": ${p.hint}`)
                }}
                disabled={loading}
                title={p.hint}
              >
                {p.label}
              </button>
            ))}
          </div>

          <details className="razon-instructions">
            <summary>System prompt</summary>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder={DEFAULT_SYSTEM}
            />
            <div className="razon-foot">
              Si lo dejás vacío viaja el default. El system también empuja la distribución:
              probá pedir respuestas en inglés y mirá cómo cambian las alternativas.
            </div>
          </details>

          <TemperatureControl
            value={temperature}
            onChange={setTemperature}
            disabled={loading}
            clampedTo={null}
          />

          <form onSubmit={handleSend} className="razon-composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hacé una pregunta corta. Después tocá cada token de la respuesta para ver qué otras opciones consideró el modelo…"
              disabled={loading}
              rows={3}
            />
            <div className="razon-composer-actions">
              <span className="lp-temp-hint">
                Con temperatura alta el modelo elige tokens menos probables — se ve en los colores.
              </span>
              <button type="submit" disabled={loading || !input.trim()}>
                {loading ? 'Prediciendo…' : 'Enviar'}
              </button>
            </div>
          </form>

          {error && <div className="error">{error}</div>}

          <div className="lp-result">
            {!loading && tokens.length === 0 && (
              <div className="empty">
                Cada token que el modelo genera sale de una <b>distribución de probabilidad</b> sobre
                todo su vocabulario. Acá la API te muestra esa distribución: qué tan seguro estaba
                de cada token que eligió y qué alternativas descartó. Mandá un preset y tocá los tokens.
              </div>
            )}

            {loading && (
              <div className="razon-thinking razon-thinking-loading">
                <div className="razon-thinking-header">
                  <span>🎲 Prediciendo token por token…</span>
                  <span className="context-meta">esperando choices[0].logprobs.content[]</span>
                </div>
                <div className="razon-thinking-dots"><span></span><span></span><span></span></div>
              </div>
            )}

            {tokens.length > 0 && (
              <>
                <div className="lp-strip-header">
                  <span>💬 Respuesta, token por token</span>
                  <span className="context-meta">tocá un token para ver sus alternativas</span>
                </div>
                <div className="lp-strip">
                  {tokens.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`lp-token${selectedIdx === i ? ' lp-token-selected' : ''}`}
                      style={probColor(t.prob)}
                      onClick={() => setSelectedIdx(i)}
                      title={`"${displayToken(t.token)}" · ${pct(t.prob)} (logprob ${t.logprob.toFixed(3)})`}
                    >
                      {displayToken(t.token)}
                    </button>
                  ))}
                </div>

                <div className="lp-legend">
                  <span className="lp-legend-label">probabilidad del token elegido:</span>
                  <span className="lp-legend-chip" style={probColor(0.1)}>&lt;30% dudó</span>
                  <span className="lp-legend-chip" style={probColor(0.5)}>~50%</span>
                  <span className="lp-legend-chip" style={probColor(0.75)}>~75%</span>
                  <span className="lp-legend-chip" style={probColor(0.98)}>&gt;90% seguro</span>
                </div>

                {selected && (
                  <div className="lp-detail">
                    <div className="lp-detail-header">
                      <span>
                        Token #{selectedIdx + 1}: <code className="lp-detail-token">{displayToken(selected.token)}</code>
                      </span>
                      <span className="context-meta">
                        logprob {selected.logprob.toFixed(4)} → e^x = {pct(selected.prob)}
                      </span>
                    </div>
                    <div className="lp-alts">
                      {selected.alternatives.map((alt, i) => (
                        <div key={i} className={`lp-alt${alt.chosen ? ' lp-alt-chosen' : ''}`}>
                          <code className="lp-alt-token">{displayToken(alt.token)}</code>
                          <div className="lp-alt-bar-track">
                            <div
                              className="lp-alt-bar"
                              style={{ width: `${Math.max(1, alt.prob * 100)}%` }}
                            />
                          </div>
                          <span className="lp-alt-pct">{pct(alt.prob)}</span>
                          {alt.chosen && <span className="lp-alt-tag">← salió</span>}
                        </div>
                      ))}
                    </div>
                    {!selected.alternatives.some((a) => a.chosen) && selected.alternatives.length > 0 && (
                      <div className="lp-detail-foot">
                        El token que salió <b>no está en el top {topLogprobs}</b>: la temperatura ({temperature})
                        hizo que el modelo muestree una opción de la cola de la distribución.
                      </div>
                    )}
                  </div>
                )}

                <div className="razon-usage">
                  <div className="razon-usage-row">
                    <span>Tokens generados</span>
                    <span><b>{tokens.length}</b></span>
                  </div>
                  <div className="razon-usage-row">
                    <span>Confianza promedio</span>
                    <span><b>{pct(avgProb)}</b></span>
                  </div>
                  {minToken != null && (
                    <div className="razon-usage-row">
                      <span>Token más dudoso</span>
                      <span>
                        <button
                          type="button"
                          className="lp-jump-btn"
                          onClick={() => setSelectedIdx(minToken)}
                          title="Seleccionar este token para ver sus alternativas"
                        >
                          <code>{displayToken(tokens[minToken].token)}</code> · {pct(tokens[minToken].prob)}
                        </button>
                      </span>
                    </div>
                  )}
                  {usage && (
                    <div className="razon-usage-row">
                      <span>Total facturado</span>
                      <span><b>{usage.total_tokens}</b> token(s)</span>
                    </div>
                  )}
                  <div className="razon-usage-foot">
                    El modelo no "sabe" la respuesta: asigna probabilidades a ~200.000 tokens posibles
                    y muestrea uno, token por token. La temperatura decide cuánto se anima a salir
                    de los más probables.
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Panel 2 — Request/Response crudo */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Request → /v1/chat/completions</span>
            <span className="panel-links">
              <a
                href="https://platform.openai.com/docs/api-reference/chat/create#chat_create-logprobs"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title="Documentación oficial: parámetro logprobs"
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
          </div>
          <pre className="raw">
            {rawResponse
              ? JSON.stringify(rawResponse, null, 2)
              : '// Aún no hay respuesta'}
          </pre>

          {rawResponse && (
            <details className="field-guide">
              <summary>¿Qué hay de nuevo acá vs un chat normal?</summary>
              <ul>
                <li><code>logprobs: true</code> y <code>top_logprobs: N</code> en el request — sin esto, la API solo devuelve el texto final.</li>
                <li><code>choices[].logprobs.content[]</code> — un item por cada token generado, en orden.</li>
                <li><code>content[].token</code> — el texto del token. Ojo: los espacios y saltos de línea son parte del token.</li>
                <li><code>content[].logprob</code> — logaritmo natural de la probabilidad. <code>0</code> = 100% seguro, <code>-0.69</code> ≈ 50%, <code>-2.3</code> ≈ 10%.</li>
                <li><code>content[].top_logprobs[]</code> — las N alternativas más probables que el modelo consideró en ese paso, incluyan o no al token elegido.</li>
                <li><code>content[].bytes</code> — el token en bytes UTF-8 crudos (un token puede cortar un emoji a la mitad).</li>
                <li><b>Anthropic no tiene nada de esto</b>: su API no expone logprobs. Otra decisión de producto, como esconder el razonamiento.</li>
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
