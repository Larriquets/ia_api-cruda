import { useState, useEffect, useRef, useCallback } from 'react'
import Brand from './Brand.jsx'
import MonacoEditor from '@monaco-editor/react'
import { runClaudeAgent } from './anthropic-agent.js'
import { runOpenAIAgent } from './openai-agent.js'
import { runLmStudioAgent } from './lmstudio-agent.js'
import { AGENT_SYSTEM_PROMPT } from './agent-tools.js'
import ModeSwitch from './ModeSwitch.jsx'
import DemoBacklink from './DemoBacklink.jsx'
import ReadDocLink from './ReadDocLink.jsx'
import ConfigBar from './ConfigBar.jsx'
import LmStudioModelPicker from './LmStudioModelPicker.jsx'
import SystemEditor from './SystemEditor.jsx'
import { useT } from './i18n/useT.js'

// Presets para el agente: variantes que cambian la "personalidad" del loop
// (ritmo de iteración, verbosidad, criterio para usar las tools). Bilingüe:
// el castellano rioplatense es la base, el inglés la traducción.
const AGENT_PRESETS_ES = [
  {
    id: 'default',
    label: '🤖 Agente default',
    subtitle: 'el system base de la app',
    prompt: AGENT_SYSTEM_PROMPT,
  },
  {
    id: 'rapido',
    label: '⚡ Rápido y al toque',
    subtitle: 'cero ceremonia, mínimas iteraciones',
    prompt: `Sos un agente de programación. Usás las tools read_code y edit_code para resolver lo que te pide el usuario.
Reglas:
- Hacé el mínimo de iteraciones posibles. Si podés resolver con 1 edit, hacé 1 edit.
- No expliques nada antes ni después salvo que te lo pidan.
- No leas el código si ya lo viste en este turno o en el contexto previo.`,
  },
  {
    id: 'paranoico',
    label: '🛡 Paranoico (lee antes de editar)',
    subtitle: 'siempre read_code primero',
    prompt: `Sos un agente de programación conservador.
Reglas innegociables:
- ANTES de cualquier edit_code, llamá a read_code para confirmar el estado actual del archivo, aunque creas que ya lo sabés.
- Hacé cambios pequeños y atómicos: una sola intención por edit.
- Después del último edit, llamá a read_code una vez más para verificar el resultado y reportarlo.`,
  },
  {
    id: 'narrador',
    label: '🎙 Narrador en castellano',
    subtitle: 'cuenta qué hace antes de cada tool',
    prompt: `Sos un agente de programación didáctico. Usás read_code y edit_code para resolver el pedido.
Reglas:
- Antes de CADA llamada a tool, escribí una oración breve en castellano rioplatense explicando qué vas a hacer y por qué.
- Después de cada tool_result, comentá en una oración qué viste.
- Al final dejá un resumen en 2-3 bullets de qué cambiaste.`,
  },
]

const AGENT_PRESETS_EN = [
  {
    id: 'default',
    label: '🤖 Default agent',
    subtitle: "the app's base system",
    prompt: AGENT_SYSTEM_PROMPT,
  },
  {
    id: 'rapido',
    label: '⚡ Fast and to the point',
    subtitle: 'zero ceremony, minimal iterations',
    prompt: `You are a coding agent. You use the read_code and edit_code tools to solve what the user asks.
Rules:
- Do the fewest iterations possible. If you can solve it with 1 edit, do 1 edit.
- Don't explain anything before or after unless asked.
- Don't read the code if you already saw it this turn or in the previous context.`,
  },
  {
    id: 'paranoico',
    label: '🛡 Paranoid (reads before editing)',
    subtitle: 'always read_code first',
    prompt: `You are a conservative coding agent.
Non-negotiable rules:
- BEFORE any edit_code, call read_code to confirm the current state of the file, even if you think you already know it.
- Make small, atomic changes: a single intent per edit.
- After the last edit, call read_code once more to verify the result and report it.`,
  },
  {
    id: 'narrador',
    label: '🎙 Narrator in English',
    subtitle: 'tells what it does before each tool',
    prompt: `You are a didactic coding agent. You use read_code and edit_code to solve the request.
Rules:
- Before EACH tool call, write a short sentence in English explaining what you're going to do and why.
- After each tool_result, comment in one sentence what you saw.
- At the end, leave a summary in 2-3 bullets of what you changed.`,
  },
]

const CODE_KEY = 'agente_code_snapshot'
const LANG_KEY = 'agente_language'
const PROVIDER_KEY = 'chat_provider'
const LOGS_KEY = 'agente_logs'
const COLS_KEY = 'agente_cols'
const AGENT_CONTEXT_KEY = 'agente_context_thread'
const SYSTEM_KEY = 'agente_system_override'
const SYSTEM_OPEN_KEY = 'agente_system_open'
const LOGS_MAX = 500

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

// Prompts sugeridos: copy visible (y la instrucción real que viaja al agente).
// Referencian identificadores del código (saldo, depositar, retirar), que se
// dejan tal cual en ambos idiomas porque son nombres reales en el Java.
const SUGGESTED_PROMPTS_ES = [
  'Renombrá la variable saldo a balance en toda la clase, incluyendo getters/setters.',
  'Agregá un método retirar(monto) que reste del saldo solo si hay fondos suficientes; si no, no haga nada.',
  'Agregá validación a depositar(): que ignore montos negativos.',
]

const SUGGESTED_PROMPTS_EN = [
  'Rename the variable saldo to balance across the whole class, including getters/setters.',
  'Add a retirar(monto) method that subtracts from saldo only if there are enough funds; otherwise, do nothing.',
  'Add validation to depositar(): make it ignore negative amounts.',
]

const NOISY_SUGGESTED_PROMPTS_ES = [
  'No sé bien qué está mal, pero el saldo a veces queda raro. Cambiá lo mínimo, aunque si hace falta rearmá la clase. Que quede más profesional y no rompas nada.',
  'Agregá retirar, transferir, validar negativos y algún log útil. Pero no quiero logs en producción. Ah, y mantené los nombres actuales salvo los que estén feos.',
  'El usuario no debería poder sacar más plata de la que tiene, excepto cuando sea una cuenta especial. Todavía no existe cuenta especial, pero dejalo preparado sin complicarlo.',
  'Hacé que depositar sea seguro, rápido y fácil de leer. Si ves getters/setters malos cambialos, pero no cambies la API porque hay tests viejos que no te paso.',
  'Me dijeron que balance suena mejor que saldo, pero en español también está bien. Elegí vos. Lo importante es que después se entienda y compile.',
  'Arreglá todo lo que parezca deuda técnica en esta clase. No agregues demasiadas cosas nuevas, salvo validaciones, errores claros, comentarios y compatibilidad futura.',
]

const NOISY_SUGGESTED_PROMPTS_EN = [
  "I'm not sure what's wrong, but saldo sometimes ends up weird. Change the minimum, though rebuild the class if needed. Make it more professional and don't break anything.",
  "Add retirar, transferir, validate negatives and some useful log. But I don't want logs in production. Oh, and keep the current names except the ugly ones.",
  "The user shouldn't be able to withdraw more money than they have, except when it's a special account. Special account doesn't exist yet, but leave it ready without overcomplicating it.",
  "Make depositar safe, fast and easy to read. If you see bad getters/setters change them, but don't change the API because there are old tests I'm not giving you.",
  'They told me balance sounds better than saldo, but in Spanish it works too. You decide. The important thing is that it reads well afterwards and compiles.',
  'Fix everything that looks like technical debt in this class. Don\'t add too many new things, except validations, clear errors, comments and future compatibility.',
]

const CONTEXT_BUDGET_TOKENS = 8000
const DEFAULT_COLS = [0.42, 0.32, 0.26]
const MIN_COL = 0.12
const estimateTokens = (value) => Math.ceil(JSON.stringify(value ?? '').length / 4)
const EMPTY_AGENT_CONTEXT = { provider: null, language: null, messages: [] }

export default function LoopAgentico() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const AGENT_PRESETS = lang === 'en' ? AGENT_PRESETS_EN : AGENT_PRESETS_ES
  const SUGGESTED_PROMPTS = lang === 'en' ? SUGGESTED_PROMPTS_EN : SUGGESTED_PROMPTS_ES
  const NOISY_SUGGESTED_PROMPTS = lang === 'en' ? NOISY_SUGGESTED_PROMPTS_EN : NOISY_SUGGESTED_PROMPTS_ES

  const [code, setCode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CODE
    return localStorage.getItem(CODE_KEY) ?? DEFAULT_CODE
  })
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'java'
    return localStorage.getItem(LANG_KEY) || 'java'
  })
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'anthropic'
    // Default a Anthropic en agente: Claude rinde mejor con tool-use estructurado.
    return localStorage.getItem(PROVIDER_KEY) || 'anthropic'
  })
  const [instruction, setInstruction] = useState(() => SUGGESTED_PROMPTS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [finalText, setFinalText] = useState('')
  const [steps, setSteps] = useState([])
  // Historial de pares request/response — uno por iteración. Pedagógicamente clave:
  // muestra cómo el prompt crece turno a turno con los tool_result acumulados.
  const [rawHistory, setRawHistory] = useState([])
  // Iteraciones colapsadas (Set de números). Default: todas expandidas excepto las
  // anteriores cuando llega una nueva, para que el usuario vea la última activa.
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [iterCount, setIterCount] = useState(0)
  const [logs, setLogs] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOGS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [noiseMode, setNoiseMode] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(() => {
    if (typeof window === 'undefined') return AGENT_SYSTEM_PROMPT
    return localStorage.getItem(SYSTEM_KEY) ?? AGENT_SYSTEM_PROMPT
  })
  const [systemOpen, setSystemOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SYSTEM_OPEN_KEY) === '1'
  })
  const [agentContext, setAgentContext] = useState(() => {
    if (typeof window === 'undefined') return EMPTY_AGENT_CONTEXT
    try {
      const raw = localStorage.getItem(AGENT_CONTEXT_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      if (!parsed || !Array.isArray(parsed.messages)) return EMPTY_AGENT_CONTEXT
      return parsed
    } catch {
      return EMPTY_AGENT_CONTEXT
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

  const logRef = useRef(null)
  const stepsRef = useRef(null)
  const layoutRef = useRef(null)
  const rawHistoryRef = useRef(null)

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
    try { localStorage.setItem(COLS_KEY, JSON.stringify(cols)) } catch { /* noop */ }
  }, [cols])
  useEffect(() => {
    try { localStorage.setItem(AGENT_CONTEXT_KEY, JSON.stringify(agentContext)) } catch { /* noop */ }
  }, [agentContext])
  useEffect(() => {
    try { localStorage.setItem(SYSTEM_KEY, systemPrompt) } catch { /* noop */ }
  }, [systemPrompt])
  useEffect(() => {
    try { localStorage.setItem(SYSTEM_OPEN_KEY, systemOpen ? '1' : '0') } catch { /* noop */ }
  }, [systemOpen])
  useEffect(() => {
    stepsRef.current?.scrollTo({ top: stepsRef.current.scrollHeight })
  }, [steps])
  useEffect(() => {
    rawHistoryRef.current?.scrollTo({ top: rawHistoryRef.current.scrollHeight, behavior: 'smooth' })
  }, [rawHistory.length])

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  const handleSend = async () => {
    if (!instruction.trim() || loading) return
    const contextMatches = agentContext.provider === provider && agentContext.language === language
    const previousMessages = contextMatches ? agentContext.messages : []
    setLoading(true)
    setError(null)
    setFinalText('')
    setSteps([])
    setCollapsed(new Set())
    setIterCount(0)

    const instrPreview = `${instruction.trim().slice(0, 100)}${instruction.length > 100 ? '…' : ''}`
    appendLog('user', L(`Instrucción: "${instrPreview}"`, `Instruction: "${instrPreview}"`))
    appendLog('info', L(
      `Lenguaje: ${language} · Tamaño código inicial: ${code.length} chars`,
      `Language: ${language} · Initial code size: ${code.length} chars`,
    ))
    const providerLabel =
      provider === 'anthropic'
        ? 'Anthropic (Claude)'
        : provider === 'lmstudio'
          ? 'LM Studio (local)'
          : 'OpenAI'
    appendLog('info', L(`Proveedor: ${providerLabel}`, `Provider: ${providerLabel}`))
    if (previousMessages.length > 0) {
      appendLog('info', L(
        `Contexto previo incluido: ${previousMessages.length} mensaje(s)`,
        `Previous context included: ${previousMessages.length} message(s)`,
      ))
    } else if (agentContext.messages.length > 0) {
      appendLog('info', L(
        'Contexto previo ignorado porque cambió el proveedor o el lenguaje',
        'Previous context ignored because the provider or the language changed',
      ))
    }

    try {
      const runFn =
        provider === 'anthropic'
          ? runClaudeAgent
          : provider === 'lmstudio'
            ? runLmStudioAgent
            : runOpenAIAgent
      const trimmed = systemPrompt.trim()
      const systemOverride = trimmed && trimmed !== AGENT_SYSTEM_PROMPT.trim() ? systemPrompt : null
      if (systemOverride) {
        appendLog('info', L(
          `System prompt personalizado (${systemPrompt.length} chars)`,
          `Custom system prompt (${systemPrompt.length} chars)`,
        ))
      }
      const { finalText: ft, code: finalCode, iterations, messages: resultMessages = [] } = await runFn(
        {
          userInstruction: instruction,
          initialCode: code,
          language,
          maxIterations: 8,
          previousMessages,
          systemOverride,
        },
        {
          onLog: appendLog,
          // En cada iteración: request llega primero → empuja entry nueva.
          // Auto-colapsamos las iteraciones previas para que solo la actual quede expandida.
          onRawRequest: (req) =>
            setRawHistory((prev) => {
              const nextN = prev.length + 1
              setCollapsed((c) => {
                const ns = new Set(c)
                for (let i = 1; i < nextN; i++) ns.add(i)
                return ns
              })
              return [...prev, { iter: nextN, request: req, response: null }]
            }),
          // Response llega después → mergea sobre la última entry.
          onRawResponse: (res) =>
            setRawHistory((prev) => {
              if (prev.length === 0) return prev
              const next = prev.slice()
              next[next.length - 1] = { ...next[next.length - 1], response: res }
              return next
            }),
          onStep: (step) => setSteps((prev) => [...prev, step]),
          onCodeChange: setCode,
        },
      )

      setFinalText(ft)
      setIterCount(iterations)
      setAgentContext({ provider, language, messages: resultMessages })
      appendLog('success', L(
        `Agente terminó. Código final: ${finalCode.length} chars, ${iterations} iteración(es).`,
        `Agent finished. Final code: ${finalCode.length} chars, ${iterations} iteration(s).`,
      ))
    } catch (err) {
      setError(err.message || L('Error al ejecutar el agente', 'Error running the agent'))
      appendLog('error', err.message || L('Error desconocido', 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleResetCode = () => {
    setCode(DEFAULT_CODE)
    setSteps([])
    setFinalText('')
    setAgentContext(EMPTY_AGENT_CONTEXT)
    setRawHistory([])
    setCollapsed(new Set())
    setIterCount(0)
    appendLog('info', L('Editor reseteado al ejemplo y contexto del agente vaciado', 'Editor reset to the sample and agent context cleared'))
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  const handleClearAgentContext = () => {
    setAgentContext(EMPTY_AGENT_CONTEXT)
    setRawHistory([])
    setCollapsed(new Set())
    setIterCount(0)
    appendLog('info', L('Contexto del agente vaciado', 'Agent context cleared'))
  }

  // Resizers
  const startResize = (dividerIndex) => (e) => {
    e.preventDefault()
    const layout = layoutRef.current
    if (!layout) return
    const totalWidth = layout.getBoundingClientRect().width
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
      if (newA < MIN_COL) { newB -= (MIN_COL - newA); newA = MIN_COL }
      if (newB < MIN_COL) { newA -= (MIN_COL - newB); newB = MIN_COL }
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

  // Agrupamos los steps por iteración para visualizarlos como turnos.
  const stepsByIter = steps.reduce((acc, s) => {
    const key = s.n
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})
  const suggestedPrompts = noiseMode
    ? [
        ...SUGGESTED_PROMPTS.map((prompt) => ({ prompt, noisy: false })),
        ...NOISY_SUGGESTED_PROMPTS.map((prompt) => ({ prompt, noisy: true })),
      ]
    : SUGGESTED_PROMPTS.map((prompt) => ({ prompt, noisy: false }))
  const activeContextMessages =
    agentContext.provider === provider && agentContext.language === language
      ? agentContext.messages
      : []
  const latestRequest = rawHistory[rawHistory.length - 1]?.request
  const contextTokens = latestRequest
    ? estimateTokens(latestRequest)
    : activeContextMessages.length > 0
      ? estimateTokens(activeContextMessages)
      : 0
  const contextPct = Math.min(100, Math.round((contextTokens / CONTEXT_BUDGET_TOKENS) * 100))
  const contextState =
    contextPct >= 80 ? 'high' :
      contextPct >= 55 ? 'medium' :
        'low'

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
          <span className="brand-subtitle">{t('app.subtitlePre')}<span className="brand-mode">{L('Loop Agéntico', 'Agentic Loop')}</span>{t('app.subtitlePost')}</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="loop-agentico" />
        </div>
      </header>

      <DemoBacklink href="/demo/loop" />

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
            disabled={loading}
            title={L('OpenAI usa /chat/completions con function calling; Anthropic usa /messages con tool_use; LM Studio reusa el shape de OpenAI sobre tu modelo local. Mismo concepto, distinto shape.', 'OpenAI uses /chat/completions with function calling; Anthropic uses /messages with tool_use; LM Studio reuses OpenAI\'s shape over your local model. Same concept, different shape.')}
          >
            <option value="anthropic">🟠 Claude (Anthropic)</option>
            <option value="openai">🟢 OpenAI</option>
            <option value="lmstudio">🔵 LM Studio (local)</option>
          </select>
        </label>

        {provider === 'lmstudio' && <LmStudioModelPicker onLog={appendLog} />}

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
        <label
          className={`noise-toggle${noiseMode ? ' active' : ''}`}
          title={L('Si está activo, aparecen instrucciones ambiguas y ruidosas como las que escribiría un usuario apurado.', 'When active, ambiguous and noisy instructions appear, like the ones a rushed user would write.')}
        >
          <input
            type="checkbox"
            checked={noiseMode}
            onChange={(e) => {
              setNoiseMode(e.target.checked)
              appendLog('info', e.target.checked
                ? L('Modo RUIDO activado — se muestran instrucciones ambiguas de mal usuario', 'NOISE mode enabled — ambiguous bad-user instructions are shown')
                : L('Modo RUIDO desactivado', 'NOISE mode disabled'))
            }}
            disabled={loading}
          />
          <span>🔊 {L('Ruido en instrucciones', 'Noise in instructions')}</span>
        </label>

        <button
          onClick={handleClearAgentContext}
          className="clear-btn"
          type="button"
          disabled={loading || (agentContext.messages.length === 0 && rawHistory.length === 0)}
          title={L('Borra el thread guardado del agente y el historial raw visible', 'Deletes the agent saved thread and the visible raw history')}
        >
          {L('Vaciar contexto', 'Clear context')}
        </button>

        <button onClick={handleResetCode} className="clear-btn" type="button">
          {L('Reset código', 'Reset code')}
        </button>

        <div className="config-bar-actions">
          <a
            href="/demo/loop"
            target="_blank"
            rel="noopener noreferrer"
            className="read-doc-link view-demo-link"
            title={L('Abre la demo automática del Loop Agéntico en otra pestaña', 'Opens the automatic Agentic Loop demo in a new tab')}
          >
            ✂️ {L('Ver Demo', 'View Demo')}
          </a>
          <ReadDocLink section="modo-loop" />
        </div>
      </ConfigBar>

      <div
        className="layout editor-layout editor-layout-resizable"
        ref={layoutRef}
        style={{
          gridTemplateColumns: `${cols[0]}fr 6px ${cols[1]}fr 6px ${cols[2]}fr`,
        }}
      >
        {/* Panel 1 — Editor */}
        <section className="panel editor-panel">
          <div className="panel-title">
            <span>{L('Editor (estado vivo)', 'Editor (live state)')}</span>
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
                readOnly: loading,
              }}
            />
          </div>
          <div className="ctx-tip" style={{ borderRadius: 0 }}>
            💡 {L('Mientras el agente corre, vas a ver cómo el código se modifica acá en tiempo real cada vez que la IA llama a', 'While the agent runs, you\'ll see the code change here in real time every time the AI calls')} <code>edit_code</code>. <b>{L('Un solo prompt', 'A single prompt')}</b> {L('puede generar varias ediciones.', 'can generate several edits.')}
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

        {/* Panel 2 — Prompt + timeline */}
        <section className="panel instr-panel">
          <div className="panel-title">
            <span>{L('Prompt → Loop agéntico', 'Prompt → Agentic loop')}</span>
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
              defaultPrompt={AGENT_SYSTEM_PROMPT}
              open={systemOpen}
              onToggleOpen={setSystemOpen}
              disabled={loading}
              presets={AGENT_PRESETS}
              onLog={appendLog}
              hint={L('Reemplaza el system base que viaja en cada iteración del loop. Vacío = se usa el default.', 'Replaces the base system that travels in every loop iteration. Empty = the default is used.')}
            />
            <div className="suggested-steps">
              <div className="suggested-steps-title">{L('Probá una de estas instrucciones:', 'Try one of these instructions:')}</div>
              <ol className="suggested-steps-list">
                {suggestedPrompts.map(({ prompt, noisy }, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className={`suggested-step-btn${noisy ? ' suggested-step-btn-noisy' : ''}`}
                      onClick={() => setInstruction(prompt)}
                      disabled={loading}
                      title={noisy ? L('Instrucción ambigua o ruidosa, parecida a la de un usuario apurado', 'Ambiguous or noisy instruction, like a rushed user\'s') : undefined}
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="suggested-steps-foot">
                {L('A diferencia del editor común, acá', 'Unlike the regular editor, here')} <b>{L('la IA no devuelve un bloque de código', 'the AI does not return a code block')}</b>: {L('llama a herramientas', 'it calls tools')} (<code>read_code</code>, <code>edit_code</code>) {L('y el código se modifica solo. Mirá la timeline de la derecha para ver las idas y vueltas.', 'and the code changes on its own. Watch the timeline on the right to see the back-and-forth.')}
              </div>
            </div>
            <textarea
              className="instr-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={L('¿Qué querés que haga el agente con tu código?', 'What do you want the agent to do with your code?')}
              disabled={loading}
            />
            <div className="instr-actions">
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !instruction.trim()}
                className="instr-send-btn"
              >
                {loading ? L('Agente trabajando…', 'Agent working…') : L('🤖 Mandar al agente →', '🤖 Send to the agent →')}
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="reply-section">
              <div className="reply-header">
                <span>{L('Timeline del agente', 'Agent timeline')}</span>
                <span className="context-meta">
                  {iterCount > 0 ? L(`${iterCount} iteración(es)`, `${iterCount} iteration(s)`) : L('sin actividad', 'no activity')}
                </span>
              </div>
              <div className="reply-content" ref={stepsRef}>
                {Object.keys(stepsByIter).length === 0 && !finalText && (
                  <span className="empty">{L('La actividad del agente va a aparecer acá: cada llamada a herramienta y su resultado.', "The agent's activity will appear here: each tool call and its result.")}</span>
                )}
                {Object.entries(stepsByIter).map(([iter, group]) => (
                  <div key={iter} className="agent-iter">
                    <div className="agent-iter-title">— {L('Iteración', 'Iteration')} #{iter} —</div>
                    {group.map((s, idx) => (
                      <AgentStep key={idx} step={s} />
                    ))}
                  </div>
                ))}
                {finalText && (
                  <div className="agent-final">
                    <div className="agent-final-title">✓ {L('Respuesta final del agente', "Agent's final response")}</div>
                    <div className="agent-final-text">{finalText}</div>
                  </div>
                )}
              </div>
            </div>
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

        {/* Panel 3 — Historial Raw + Log */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>{L('Historial Request/Response', 'Request/Response history')}</span>
            <span className="agent-context-title">
              <span className="context-meta">
                {rawHistory.length === 0
                  ? activeContextMessages.length > 0
                    ? L(`${activeContextMessages.length} msg(s) guardado(s)`, `${activeContextMessages.length} saved msg(s)`)
                    : L('sin actividad', 'no activity')
                  : L(`${rawHistory.length} iteración(es) · ${activeContextMessages.length} msg(s) guardado(s)`, `${rawHistory.length} iteration(s) · ${activeContextMessages.length} saved msg(s)`)}
              </span>
              <span
                className={`context-dial context-dial-${contextState}`}
                style={{ '--ctx-pct': `${contextPct}%` }}
                title={L(`Último request: ≈${contextTokens} tokens de ${CONTEXT_BUDGET_TOKENS}`, `Last request: ≈${contextTokens} tokens of ${CONTEXT_BUDGET_TOKENS}`)}
              >
                <span className="context-dial-ring">
                  <span className="context-dial-value">{contextPct}%</span>
                </span>
                <span className="context-dial-label">{L('contexto', 'context')}</span>
              </span>
            </span>
          </div>
          <div className="ctx-tip" style={{ marginTop: 0 }}>
            💡 <b>{L('El prompt crece turno a turno.', 'The prompt grows turn by turn.')}</b> {L('Mirá cómo en cada iteración el array', 'See how in each iteration the')}{' '}
            <code>messages</code> {L('incluye los', 'array includes the')} <code>tool_result</code> {L('del turno anterior — eso es lo que hace que la IA pueda encadenar llamadas.', 'from the previous turn — that is what lets the AI chain calls.')} <b>{L('Un solo prompt', 'A single prompt')}</b> {L('tuyo, N requests internas.', 'from you, N internal requests.')}
          </div>

          <div className="raw-history" ref={rawHistoryRef}>
            {rawHistory.length === 0 && (
              <div className="empty" style={{ padding: 12 }}>{L('Mandale una instrucción al agente para ver el historial.', 'Send an instruction to the agent to see the history.')}</div>
            )}
            {rawHistory.map((entry) => {
              const isCollapsed = collapsed.has(entry.iter)
              const reqMsgCount = entry.request?.body?.messages?.length ?? '?'
              const reqTokens = estimateTokens(entry.request)
              return (
                <div key={entry.iter} className={`raw-iter ${isCollapsed ? 'raw-iter-collapsed' : ''}`}>
                  <button
                    type="button"
                    className="raw-iter-header"
                    onClick={() =>
                      setCollapsed((c) => {
                        const ns = new Set(c)
                        if (ns.has(entry.iter)) ns.delete(entry.iter)
                        else ns.add(entry.iter)
                        return ns
                      })
                    }
                    title={L('Click para expandir/colapsar', 'Click to expand/collapse')}
                  >
                    <span className="raw-iter-chev">{isCollapsed ? '▸' : '▾'}</span>
                    <span className="raw-iter-label">{L('Iteración', 'Iteration')} #{entry.iter}</span>
                    <span className="raw-iter-meta">
                      {reqMsgCount} msg(s) · ≈{reqTokens}t · {entry.response ? `stop=${entry.response.stop_reason ?? entry.response.choices?.[0]?.finish_reason ?? '?'}` : L('esperando…', 'waiting…')}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <>
                      <div className="raw-iter-subtitle">→ Request</div>
                      <pre className="raw raw-compact raw-nested">
                        {JSON.stringify(entry.request, null, 2)}
                      </pre>
                      <div className="raw-iter-subtitle">← Response</div>
                      <pre className="raw raw-compact raw-nested">
                        {entry.response ? JSON.stringify(entry.response, null, 2) : L('// esperando…', '// waiting…')}
                      </pre>
                    </>
                  )}
                </div>
              )
            })}
          </div>

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

function AgentStep({ step }) {
  if (step.type === 'iteration_start') {
    return null // ya lo mostramos como header de grupo
  }
  if (step.type === 'tool_use') {
    return (
      <div className="agent-step agent-step-tool-use">
        <div className="agent-step-header">→ tool_use: <code>{step.name}</code></div>
        {step.input && Object.keys(step.input).length > 0 && (
          <pre className="agent-step-body">{JSON.stringify(step.input, null, 2)}</pre>
        )}
      </div>
    )
  }
  if (step.type === 'tool_result') {
    return (
      <div className={`agent-step agent-step-tool-result ${step.isError ? 'agent-step-error' : ''}`}>
        <div className="agent-step-header">
          ← tool_result ({step.name}) {step.isError ? '⚠ error' : ''}
        </div>
        <pre className="agent-step-body">{String(step.content)}</pre>
      </div>
    )
  }
  if (step.type === 'final_text') {
    return null // se muestra abajo, fuera del grupo
  }
  return null
}
