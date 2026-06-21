import { useCallback, useRef, useState } from 'react'
import Brand from './Brand.jsx'
import { runClaudeAgent } from './anthropic-agent.js'
import { runOpenAIAgent } from './openai-agent.js'
import { runLmStudioAgent } from './lmstudio-agent.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import LmStudioModelPicker from './LmStudioModelPicker.jsx'

// Lab de especificidad del pedido: corre la MISMA tarea agéntica dos veces —
// una con un pedido vago ("agregale que se pueda sacar plata") y otra con un
// pedido con criterios de éxito explícitos — y verifica AMBOS resultados contra
// la misma checklist determinística (regex sobre el código final, como los
// tests de /agents-md-skills). La lección: la IA no lee tu mente — lee tu
// pedido. Los criterios que no viajan en el prompt quedan librados al azar.

const PROVIDER_KEY = 'espec_provider'
const PROMPT_VAGO_KEY = 'espec_prompt_vago'
const PROMPT_ESPECIFICO_KEY = 'espec_prompt_especifico'
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

const DEFAULT_VAGO = 'Agregale que se pueda sacar plata.'

const DEFAULT_ESPECIFICO = `Agregá un método público boolean retirar(double monto) a la clase:
- Si monto <= 0: no toques el saldo y devolvé false.
- Si monto > saldo: no toques el saldo y devolvé false.
- En cualquier otro caso: restá monto del saldo y devolvé true.
No modifiques depositar() ni getSaldo().`

// Lo que el humano quería DE VERDAD, escrito como checks verificables.
// Se corre sobre el código final de cada corrida — mismo espíritu que
// run_skill_test: criterio que la IA no puede "interpretar", solo cumplir.
const CRITERIA = [
  {
    id: 'existe-retirar',
    label: 'Existe un método retirar(…)',
    test: (code) => /\bretirar\s*\(/.test(code),
  },
  {
    id: 'devuelve-boolean',
    label: 'retirar devuelve boolean (quien llama sabe si salió)',
    test: (code) => /boolean\s+retirar\s*\(/.test(code),
  },
  {
    id: 'rechaza-invalidos',
    label: 'Rechaza montos inválidos (monto <= 0)',
    test: (code) => /monto\s*<=\s*0/.test(code),
  },
  {
    id: 'rechaza-sin-fondos',
    label: 'No deja retirar más que el saldo',
    test: (code) =>
      /monto\s*>\s*saldo|saldo\s*<\s*monto|monto\s*<=\s*saldo|saldo\s*>=\s*monto|saldo\s*-\s*monto\s*<\s*0/.test(code),
  },
  {
    id: 'no-rompe-existente',
    label: 'No tocó depositar() ni getSaldo()',
    test: (code) => code.includes('saldo += monto;') && /public\s+double\s+getSaldo\s*\(\)/.test(code),
  },
]

const runChecks = (code) => CRITERIA.map((c) => ({ id: c.id, label: c.label, pass: c.test(code || '') }))

const estimateTokens = (value) => Math.ceil(JSON.stringify(value ?? '').length / 4)
const fmtTokens = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

const EMPTY_RUN = {
  status: 'idle', // idle | running | done | error
  iters: [], // { iter, tokens, msgs, tools: [] }
  finalText: '',
  code: '',
  checks: null,
  iterations: 0,
  error: null,
}

const MODE_LABEL = { vago: 'vaga', especifico: 'específica' }

export default function Especificidad() {
  const [provider, setProvider] = useState(() => {
    const saved = localStorage.getItem(PROVIDER_KEY)
    return ['openai', 'anthropic', 'lmstudio'].includes(saved) ? saved : 'anthropic'
  })
  const [promptVago, setPromptVago] = useState(() => localStorage.getItem(PROMPT_VAGO_KEY) || DEFAULT_VAGO)
  const [promptEspecifico, setPromptEspecifico] = useState(
    () => localStorage.getItem(PROMPT_ESPECIFICO_KEY) || DEFAULT_ESPECIFICO,
  )
  const [runs, setRuns] = useState({ vago: EMPTY_RUN, especifico: EMPTY_RUN })
  const [loading, setLoading] = useState(null) // null | 'vago' | 'especifico' | 'both'
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

  const promptFor = (mode) => (mode === 'vago' ? promptVago : promptEspecifico)

  const runOne = async (mode) => {
    const instruction = promptFor(mode).trim()
    patchRun(mode, { ...EMPTY_RUN, status: 'running' })

    const tag = mode === 'vago' ? '🌫️' : '🎯'
    appendLog('user', `${tag} Corrida ${MODE_LABEL[mode]} — "${instruction.slice(0, 80)}${instruction.length > 80 ? '…' : ''}"`)

    const runFn =
      provider === 'anthropic'
        ? runClaudeAgent
        : provider === 'lmstudio'
          ? runLmStudioAgent
          : runOpenAIAgent

    try {
      const { finalText, code, iterations } = await runFn(
        {
          userInstruction: instruction,
          initialCode: DEFAULT_CODE,
          language: 'java',
          maxIterations: 8,
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
        },
      )

      const checks = runChecks(code)
      const passed = checks.filter((c) => c.pass).length
      patchRun(mode, { status: 'done', finalText, code, checks, iterations })
      appendLog(
        passed === CRITERIA.length ? 'success' : 'info',
        `Corrida ${MODE_LABEL[mode]}: ${iterations} iteración(es) · checklist ${passed}/${CRITERIA.length}`,
      )
    } catch (err) {
      patchRun(mode, { status: 'error', error: err.message || 'Error desconocido' })
      appendLog('error', `[${MODE_LABEL[mode]}] ${err.message || 'Error desconocido'}`)
      throw err
    }
  }

  const canRun = promptVago.trim() && promptEspecifico.trim()

  const handleRun = async (mode) => {
    if (loading || !promptFor(mode).trim()) return
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
    if (loading || !canRun) return
    setLoading('both')
    try {
      await runOne('vago')
      await runOne('especifico')
    } catch {
      // ya logueado y reflejado en el estado de la corrida
    } finally {
      setLoading(null)
    }
  }

  const clearLogs = () => setLogs([])

  const maxIterTokens = Math.max(
    1,
    ...runs.vago.iters.map((i) => i.tokens),
    ...runs.especifico.iters.map((i) => i.tokens),
  )
  const totals = (run) => run.iters.reduce((sum, i) => sum + i.tokens, 0)
  const passedCount = (run) => (run.checks ? run.checks.filter((c) => c.pass).length : 0)
  const bothDone = runs.vago.status === 'done' && runs.especifico.status === 'done'

  return (
    <div className="app ruido-page">
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label="Ir al inicio">
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <Brand />
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// experimento · <span className="brand-mode">Especificidad del pedido</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="especificidad" />
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

        <div className="config-bar-actions">
          <a
            href="/como-funciona"
            target="_blank"
            rel="noopener noreferrer"
            className="read-doc-link"
            title="Cómo funciona: las tres piezas de cada POST (abre en otra pestaña)"
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
            <span className="context-meta">la IA no lee tu mente — lee tu pedido</span>
          </div>

          <div className="ctx-tip">
            💡 La misma tarea corre dos veces sobre el mismo código, con el mismo modelo. La única
            diferencia es <b>tu mensaje</b>. Abajo está lo que el humano quería <b>de verdad</b>,
            escrito como checklist verificable (regex sobre el código final, igual que{' '}
            <code>run_skill_test</code>). Fijate cuántos de esos criterios viajan en cada prompt —
            los que no viajan, quedan librados a la suerte.
          </div>

          <div className="ruido-block">
            <div className="ruido-block-title">Código inicial (fijo para las dos corridas)</div>
            <pre className="ruido-code">{DEFAULT_CODE}</pre>
          </div>

          <div className="ruido-block">
            <div className="ruido-block-title">Lo que el humano quería (checklist verificable)</div>
            <ul className="espec-criteria">
              {CRITERIA.map((c) => (
                <li key={c.id} className="espec-criteria-item">
                  <span className="espec-criteria-id">{c.id}</span>
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="espec-prompt espec-prompt-vago">
            <div className="espec-prompt-label">🌫️ Pedido vago</div>
            <textarea
              className="instr-input"
              value={promptVago}
              onChange={(e) => {
                setPromptVago(e.target.value)
                localStorage.setItem(PROMPT_VAGO_KEY, e.target.value)
              }}
              placeholder="El pedido como sale sin pensar…"
              disabled={loading !== null}
              rows={2}
            />
          </div>

          <div className="espec-prompt espec-prompt-especifico">
            <div className="espec-prompt-label">🎯 Pedido con criterio de éxito explícito</div>
            <textarea
              className="instr-input"
              value={promptEspecifico}
              onChange={(e) => {
                setPromptEspecifico(e.target.value)
                localStorage.setItem(PROMPT_ESPECIFICO_KEY, e.target.value)
              }}
              placeholder="El mismo pedido, con los criterios adentro…"
              disabled={loading !== null}
              rows={6}
            />
          </div>

          <div className="instr-actions">
            <button
              type="button"
              onClick={() => handleRun('vago')}
              disabled={loading !== null || !promptVago.trim()}
              className="instr-apply-btn"
              title="Corre el agente con el pedido vago."
            >
              {loading === 'vago' ? 'Corriendo…' : '🌫️ Corrida vaga'}
            </button>
            <button
              type="button"
              onClick={() => handleRun('especifico')}
              disabled={loading !== null || !promptEspecifico.trim()}
              className="instr-apply-btn"
              title="Corre el agente con el pedido específico."
            >
              {loading === 'especifico' ? 'Corriendo…' : '🎯 Corrida específica'}
            </button>
            <button
              type="button"
              onClick={handleCompare}
              disabled={loading !== null || !canRun}
              className="instr-send-btn"
              title="Corre las dos una atrás de la otra, mismo modelo y mismo código."
            >
              {loading === 'both' ? 'Comparando…' : '⚖️ Comparar las dos →'}
            </button>
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

        {/* Panel 2 — Corrida vaga */}
        <section className="panel ruido-run-panel">
          <RunBody
            title="🌫️ Corrida vaga"
            run={runs.vago}
            maxIterTokens={maxIterTokens}
            emptyHint="Corré el pedido vago para ver qué entiende la IA sin criterios."
          />
        </section>

        {/* Panel 3 — Corrida específica + veredicto */}
        <section className="panel ruido-run-panel">
          <RunBody
            title="🎯 Corrida específica"
            run={runs.especifico}
            maxIterTokens={maxIterTokens}
            emptyHint="Corré el pedido específico y comparalo contra el vago."
          />
          {bothDone && (
            <div className="ruido-verdict">
              <div className="ruido-verdict-title">⚖️ Veredicto</div>
              <div className="ruido-verdict-row">
                <span>Checklist cumplida</span>
                <b>{passedCount(runs.vago)}/{CRITERIA.length} → {passedCount(runs.especifico)}/{CRITERIA.length}</b>
              </div>
              <div className="ruido-verdict-row">
                <span>Iteraciones</span>
                <b>{runs.vago.iterations} → {runs.especifico.iterations}</b>
              </div>
              <div className="ruido-verdict-row">
                <span>Tokens enviados (suma de requests)</span>
                <b>{fmtTokens(totals(runs.vago))}t → {fmtTokens(totals(runs.especifico))}t</b>
              </div>
              <div className="ruido-verdict-foot">
                Mismo modelo, mismo código, misma checklist. Lo único que cambió fue cuántos
                criterios viajaron en el prompt. Con el pedido vago la IA tuvo que <b>adivinar</b> el
                resto — a veces acierta, a veces no, y nunca sabés cuál te tocó. Corré la vaga
                varias veces: el resultado cambia. La específica, no. Eso es comunicarse con una IA.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function RunBody({ title, run, maxIterTokens, emptyHint }) {
  const totalTokens = run.iters.reduce((sum, i) => sum + i.tokens, 0)
  const passed = run.checks ? run.checks.filter((c) => c.pass).length : 0
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

        {run.checks && (
          <div className="espec-checks">
            <div className="espec-checks-title">
              Checklist: {passed}/{run.checks.length} criterio(s) cumplido(s)
            </div>
            {run.checks.map((c) => (
              <div key={c.id} className={`espec-check ${c.pass ? 'espec-check-pass' : 'espec-check-fail'}`}>
                <span className="espec-check-mark">{c.pass ? '✓' : '✗'}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        )}

        {run.status === 'error' && <div className="error">{run.error}</div>}

        {run.code && (
          <details className="espec-code-details">
            <summary>Ver código final</summary>
            <pre className="ruido-code espec-code-final">{run.code}</pre>
          </details>
        )}

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
