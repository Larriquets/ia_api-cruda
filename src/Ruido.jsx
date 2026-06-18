import { useCallback, useMemo, useRef, useState } from 'react'
import { runClaudeAgent } from './anthropic-agent.js'
import { runOpenAIAgent } from './openai-agent.js'
import { runLmStudioAgent } from './lmstudio-agent.js'
import { applyNoise, bloatToolResult } from './noise.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import LmStudioModelPicker from './LmStudioModelPicker.jsx'

// Lab de context rot: corre la MISMA tarea agéntica dos veces — una limpia y
// otra con cada tool_result inflado por bloatToolResult (src/noise.js) — y
// compara cuánto crece el contexto y cuánto le cuesta al agente terminar.
// El ruido es determinista (seed visible), así dos corridas son comparables.

const PROVIDER_KEY = 'ruido_provider'
const SEED_KEY = 'ruido_seed'
const INTENSITY_KEY = 'ruido_intensity'
const LOGS_MAX = 300

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

const SUGGESTED_PROMPTS = [
  'Agregá un método retirar(monto) que reste del saldo solo si hay fondos suficientes; si no, no haga nada.',
  'Renombrá la variable saldo a balance en toda la clase, incluyendo getters/setters.',
  'Agregá validación a depositar(): que ignore montos negativos. Después verificá releyendo el código.',
]

const INTENSITIES = [
  { value: 1, label: '1 — suave' },
  { value: 2, label: '2 — medio' },
  { value: 3, label: '3 — denso' },
]

// Tool result de muestra para la vista previa del ruido (no viaja a ningún API).
const SAMPLE_TOOL_RESULT = 'OK — edit aplicado. La clase quedó con 14 líneas y el método retirar(monto) agregado.'

const estimateTokens = (value) => Math.ceil(JSON.stringify(value ?? '').length / 4)
const fmtTokens = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

const EMPTY_RUN = {
  status: 'idle', // idle | running | done | error
  iters: [], // { iter, tokens, msgs, tools: [], noiseTokens }
  finalText: '',
  iterations: 0,
  totalNoiseTokens: 0,
  error: null,
}

const MODE_LABEL = { clean: 'limpia', noisy: 'con ruido' }

export default function Ruido() {
  const [provider, setProvider] = useState(() => {
    const saved = localStorage.getItem(PROVIDER_KEY)
    return ['openai', 'anthropic', 'lmstudio'].includes(saved) ? saved : 'anthropic'
  })
  const [seed, setSeed] = useState(() => {
    const parsed = parseInt(localStorage.getItem(SEED_KEY), 10)
    return Number.isFinite(parsed) ? parsed : 42
  })
  const [intensity, setIntensity] = useState(() => {
    const parsed = parseInt(localStorage.getItem(INTENSITY_KEY), 10)
    return [1, 2, 3].includes(parsed) ? parsed : 2
  })
  const [noisyInstruction, setNoisyInstruction] = useState(false)
  const [instruction, setInstruction] = useState(SUGGESTED_PROMPTS[0])
  const [previewTurn, setPreviewTurn] = useState(3)
  const [runs, setRuns] = useState({ clean: EMPTY_RUN, noisy: EMPTY_RUN })
  const [loading, setLoading] = useState(null) // null | 'clean' | 'noisy' | 'both'
  const [logs, setLogs] = useState([])
  const logRef = useRef(null)

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev.slice(-(LOGS_MAX - 1)), { level, message, timestamp }])
    queueMicrotask(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }))
  }, [])

  const patchRun = useCallback((mode, patch) => {
    setRuns((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], ...(typeof patch === 'function' ? patch(prev[mode]) : patch) },
    }))
  }, [])

  // Vista previa del ruido sobre un tool_result de muestra, coloreando señal vs relleno.
  const preview = useMemo(() => {
    const { noisy, stats } = bloatToolResult(SAMPLE_TOOL_RESULT, {
      seed,
      intensity,
      turnIndex: previewTurn - 1,
    })
    const idx = noisy.indexOf(SAMPLE_TOOL_RESULT)
    return {
      before: noisy.slice(0, idx),
      signal: SAMPLE_TOOL_RESULT,
      after: noisy.slice(idx + SAMPLE_TOOL_RESULT.length),
      stats,
    }
  }, [seed, intensity, previewTurn])

  const runOne = async (mode) => {
    const withNoise = mode === 'noisy'
    patchRun(mode, { ...EMPTY_RUN, status: 'running' })

    const tag = withNoise ? '🔊' : '✨'
    appendLog('user', `${tag} Corrida ${MODE_LABEL[mode]} — "${instruction.trim().slice(0, 80)}${instruction.length > 80 ? '…' : ''}"`)

    let userInstruction = instruction
    if (withNoise && noisyInstruction) {
      const { noisy, injected } = applyNoise(
        [{ role: 'user', content: instruction }],
        { seed, intensity },
      )
      userInstruction = noisy[0].content
      appendLog('info', `Instrucción inflada con ${injected.length} párrafo(s) de relleno (applyNoise)`)
    }

    const runFn =
      provider === 'anthropic'
        ? runClaudeAgent
        : provider === 'lmstudio'
          ? runLmStudioAgent
          : runOpenAIAgent

    try {
      const { finalText, iterations } = await runFn(
        {
          userInstruction,
          initialCode: DEFAULT_CODE,
          language: 'java',
          maxIterations: 8,
          noise: withNoise ? { enabled: true, seed, intensity } : null,
        },
        {
          onLog: (level, message) => appendLog(level, `[${MODE_LABEL[mode]}] ${message}`),
          onRawRequest: (req) =>
            patchRun(mode, (run) => ({
              iters: [
                ...run.iters,
                {
                  iter: run.iters.length + 1,
                  tokens: estimateTokens(req),
                  msgs: req?.body?.messages?.length ?? 0,
                  tools: [],
                  noiseTokens: 0,
                },
              ],
            })),
          onStep: (step) => {
            if (step.type !== 'tool_use') return
            patchRun(mode, (run) => {
              const iters = run.iters.slice()
              const last = iters[iters.length - 1]
              if (!last) return {}
              iters[iters.length - 1] = { ...last, tools: [...last.tools, step.name] }
              return { iters }
            })
          },
          onNoise: (ev) =>
            patchRun(mode, (run) => {
              const iters = run.iters.slice()
              const last = iters[iters.length - 1]
              if (last) {
                iters[iters.length - 1] = { ...last, noiseTokens: last.noiseTokens + ev.noiseTokens }
              }
              return { iters, totalNoiseTokens: run.totalNoiseTokens + ev.noiseTokens }
            }),
        },
      )

      patchRun(mode, { status: 'done', finalText, iterations })
      appendLog('success', `Corrida ${MODE_LABEL[mode]} terminó en ${iterations} iteración(es)`)
    } catch (err) {
      patchRun(mode, { status: 'error', error: err.message || 'Error desconocido' })
      appendLog('error', `[${MODE_LABEL[mode]}] ${err.message || 'Error desconocido'}`)
      throw err
    }
  }

  const handleRun = async (mode) => {
    if (loading || !instruction.trim()) return
    setLoading(mode)
    try {
      await runOne(mode)
    } catch {
      // ya logueado y reflejado en el estado de la corrida
    } finally {
      setLoading(null)
    }
  }

  const handleCompare = async () => {
    if (loading || !instruction.trim()) return
    setLoading('both')
    try {
      await runOne('clean')
      await runOne('noisy')
    } catch {
      // ya logueado y reflejado en el estado de la corrida
    } finally {
      setLoading(null)
    }
  }

  const clearLogs = () => setLogs([])

  // Escala compartida para las barras: el request más gordo de las dos corridas.
  const maxIterTokens = Math.max(
    1,
    ...runs.clean.iters.map((i) => i.tokens),
    ...runs.noisy.iters.map((i) => i.tokens),
  )
  const totals = (run) => run.iters.reduce((sum, i) => sum + i.tokens, 0)
  const bothDone = runs.clean.status === 'done' && runs.noisy.status === 'done'

  return (
    <div className="app ruido-page">
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label="Ir al inicio">
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <span className="brand">La IA Cruda</span>
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// experimento · <span className="brand-mode">Ruido en el contexto</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="ruido" />
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
              appendLog('info', `Proveedor cambiado a ${next}`)
            }}
            className={`hdr-select-input provider-select-${provider}`}
            disabled={loading !== null}
          >
            <option value="anthropic">🟠 Claude (Anthropic)</option>
            <option value="openai">🟢 OpenAI</option>
            <option value="lmstudio">🔵 LM Studio (local)</option>
          </select>
        </label>

        {provider === 'lmstudio' && <LmStudioModelPicker onLog={appendLog} />}

        <label className="hdr-select">
          <span className="hdr-select-label">Seed</span>
          <input
            type="number"
            className="hdr-select-input ruido-seed-input"
            value={seed}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10) || 0
              setSeed(next)
              localStorage.setItem(SEED_KEY, String(next))
            }}
            disabled={loading !== null}
            title="Mismo seed = mismo ruido. Cambialo para ver otro relleno, repetilo para comparar corridas."
          />
        </label>

        <label className="hdr-select">
          <span className="hdr-select-label">Intensidad</span>
          <select
            value={intensity}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10)
              setIntensity(next)
              localStorage.setItem(INTENSITY_KEY, String(next))
            }}
            className="hdr-select-input"
            disabled={loading !== null}
            title="Cuántas líneas de log falso se meten en cada tool_result. Crece además con cada iteración."
          >
            {INTENSITIES.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </label>

        <div className="config-bar-actions">
          <a
            href="/contexto#loop"
            target="_blank"
            rel="noopener noreferrer"
            className="read-doc-link"
            title="Abre la explicación de context rot en /contexto (otra pestaña)"
          >
            📖 Leer doc
          </a>
        </div>
      </ConfigBar>

      <div className="layout ruido-layout">
        {/* Panel 1 — El experimento */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>El experimento</span>
            <span className="context-meta">context rot reproducible</span>
          </div>

          <div className="ctx-tip">
            💡 La misma tarea corre dos veces sobre el mismo código. En la corrida con ruido,
            cada <code>tool_result</code> vuelve envuelto en logs falsos (<code>bloatToolResult</code>{' '}
            de <code>src/noise.js</code>) que se quedan en el historial para siempre. Eso es{' '}
            <b>context rot</b>: el agente no se cansa — nada en material irrelevante.
          </div>

          <div className="ruido-block">
            <div className="ruido-block-title">Código inicial (fijo para las dos corridas)</div>
            <pre className="ruido-code">{DEFAULT_CODE}</pre>
          </div>

          <div className="suggested-steps">
            <div className="suggested-steps-title">Probá una de estas instrucciones:</div>
            <ol className="suggested-steps-list">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="suggested-step-btn"
                    onClick={() => setInstruction(prompt)}
                    disabled={loading !== null}
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <textarea
            className="instr-input"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="¿Qué tiene que hacer el agente con la clase CuentaBancaria?"
            disabled={loading !== null}
          />

          <label
            className={`promptinj-toggle${noisyInstruction ? ' active' : ''}`}
            title="Además del ruido en tool_results, infla tu instrucción con párrafos irrelevantes (applyNoise). Es el tercer sabor de ruido: el que mete el propio usuario."
          >
            <input
              type="checkbox"
              checked={noisyInstruction}
              onChange={(e) => setNoisyInstruction(e.target.checked)}
              disabled={loading !== null}
            />
            <span>Inflar también la instrucción (ruido del usuario)</span>
          </label>

          <div className="instr-actions">
            <button
              type="button"
              onClick={() => handleRun('clean')}
              disabled={loading !== null || !instruction.trim()}
              className="instr-apply-btn"
              title="Corre el agente sin tocar los tool_results."
            >
              {loading === 'clean' ? 'Corriendo…' : '✨ Corrida limpia'}
            </button>
            <button
              type="button"
              onClick={() => handleRun('noisy')}
              disabled={loading !== null || !instruction.trim()}
              className="instr-apply-btn"
              title="Corre el agente inflando cada tool_result con logs falsos."
            >
              {loading === 'noisy' ? 'Corriendo…' : '🔊 Corrida con ruido'}
            </button>
            <button
              type="button"
              onClick={handleCompare}
              disabled={loading !== null || !instruction.trim()}
              className="instr-send-btn"
              title="Corre la limpia y la ruidosa una atrás de la otra, con el mismo seed."
            >
              {loading === 'both' ? 'Comparando…' : '⚖️ Comparar las dos →'}
            </button>
          </div>

          <div className="ruido-block">
            <div className="ruido-block-title">
              Vista previa del ruido (sin API) — turno
              <input
                type="range"
                min="1"
                max="8"
                value={previewTurn}
                onChange={(e) => setPreviewTurn(parseInt(e.target.value, 10))}
                className="ruido-turn-slider"
              />
              #{previewTurn}
            </div>
            <pre className="ruido-preview">
              {preview.before && <span className="ruido-preview-noise">{preview.before}</span>}
              <span className="ruido-preview-signal">{preview.signal}</span>
              {preview.after && <span className="ruido-preview-noise">{preview.after}</span>}
            </pre>
            <div className="ruido-preview-meter">
              <span className="ruido-preview-signal">■ señal {preview.stats.signalTokens}t</span>
              <span className="ruido-preview-noise">■ ruido +{preview.stats.noiseTokens}t ({preview.stats.noisePct}%)</span>
              <span className="context-meta">el relleno crece con cada turno</span>
            </div>
          </div>

          <div className="panel-title panel-title-sub">
            <span>Log</span>
            <span className="panel-links">
              <span className="context-meta">{logs.length} línea(s)</span>
              {logs.length > 0 && (
                <button type="button" onClick={clearLogs} className="docs-link">vaciar</button>
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

        {/* Panel 2 — Corrida limpia */}
        <RunPanel
          title="✨ Corrida limpia"
          run={runs.clean}
          maxIterTokens={maxIterTokens}
          emptyHint="Corré la versión limpia para tener la línea de base."
        />

        {/* Panel 3 — Corrida con ruido + veredicto */}
        <section className="panel ruido-run-panel">
          <RunBody
            title="🔊 Corrida con ruido"
            run={runs.noisy}
            maxIterTokens={maxIterTokens}
            emptyHint="Corré la versión con ruido y comparala contra la limpia."
          />
          {bothDone && (
            <div className="ruido-verdict">
              <div className="ruido-verdict-title">⚖️ Veredicto</div>
              <div className="ruido-verdict-row">
                <span>Iteraciones</span>
                <b>{runs.clean.iterations} → {runs.noisy.iterations}</b>
              </div>
              <div className="ruido-verdict-row">
                <span>Tokens enviados (suma de requests)</span>
                <b>{fmtTokens(totals(runs.clean))}t → {fmtTokens(totals(runs.noisy))}t</b>
              </div>
              <div className="ruido-verdict-row">
                <span>Ruido puro inyectado</span>
                <b>+{fmtTokens(runs.noisy.totalNoiseTokens)}t</b>
              </div>
              <div className="ruido-verdict-foot">
                Mismo modelo, misma tarea, mismo código. La única diferencia es la basura en
                los <code>tool_result</code>. Compará las respuestas finales: ¿el agente con
                ruido tardó más, repitió trabajo o se distrajo? Eso, a escala de cientos de
                pasos, es lo que la poda de <a href="/ventana-contexto">/ventana-contexto</a> intenta curar.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function RunPanel({ title, run, maxIterTokens, emptyHint }) {
  return (
    <section className="panel ruido-run-panel">
      <RunBody title={title} run={run} maxIterTokens={maxIterTokens} emptyHint={emptyHint} />
    </section>
  )
}

function RunBody({ title, run, maxIterTokens, emptyHint }) {
  const totalTokens = run.iters.reduce((sum, i) => sum + i.tokens, 0)
  return (
    <>
      <div className="panel-title">
        <span>{title}</span>
        <span className="context-meta">
          {run.status === 'idle' && 'sin corrida'}
          {run.status === 'running' && 'corriendo…'}
          {run.status === 'done' && `${run.iterations} iteración(es) · ${fmtTokens(totalTokens)}t enviados`}
          {run.status === 'error' && 'error'}
        </span>
      </div>

      <div className="ruido-run-body">
        {run.iters.length === 0 && run.status !== 'error' && (
          <div className="empty" style={{ padding: 12 }}>{emptyHint}</div>
        )}

        {run.iters.length > 0 && (
          <div className="ruido-iters">
            {run.iters.map((it) => (
              <div key={it.iter} className="ruido-iter">
                <div className="ruido-iter-head">
                  <span className="ruido-iter-label">#{it.iter}</span>
                  <span className="ruido-iter-meta">
                    {it.msgs} msg(s) · ≈{fmtTokens(it.tokens)}t
                    {it.tools.length > 0 && <> · {it.tools.join(' → ')}</>}
                  </span>
                  {it.noiseTokens > 0 && (
                    <span className="ruido-iter-noise">+{fmtTokens(it.noiseTokens)}t ruido</span>
                  )}
                </div>
                <div className="ruido-iter-bar-track">
                  <div
                    className="ruido-iter-bar"
                    style={{ width: `${Math.max(2, Math.round((it.tokens / maxIterTokens) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {run.status === 'error' && <div className="error">{run.error}</div>}

        {run.finalText && (
          <div className="agent-final">
            <div className="agent-final-title">✓ Respuesta final</div>
            <div className="agent-final-text">{run.finalText}</div>
          </div>
        )}
      </div>
    </>
  )
}
