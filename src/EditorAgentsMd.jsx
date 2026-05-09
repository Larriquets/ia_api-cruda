import { useState, useEffect, useRef, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { runClaudeAgent } from './anthropic-agent.js'
import { runOpenAIAgent } from './openai-agent.js'
import { AGENT_SYSTEM_PROMPT } from './agent-tools.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'

const CODE_KEY = 'agentmd_code_snapshot'
const AGENTS_KEY = 'agentmd_agents_md_v4'
const PROVIDER_KEY = 'chat_provider'
const LOGS_KEY = 'agentmd_logs'
const COLS_KEY = 'agentmd_cols'
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

const DEFAULT_AGENTS_MD = `# AGENTS.md

## Reglas obligatorias
- NO se pueden hacer cambios sin medir antes el impacto del cambio en el código usando \`assess_impact\`.
- Toda clase, función/método o propiedad/campo que se cree debe tener sí o sí el prefijo \`bco_\` en su nombre.
  Ejemplos: \`bco_CuentaBancaria\`, \`bco_Retirar\`, \`bco_Saldo\`.

## Niveles de impacto
- \`low\`: cambio puntual de bajo riesgo, sin tocar firmas públicas ni crear tipos nuevos.
- \`medium\`: varios edits relacionados o una clase nueva chica, sin romper APIs existentes.
- \`high\`: rompe firmas públicas, cambia el modelo de datos, hace un refactor estructural o agrega varias clases relacionadas.
`

const LEGACY_AGENTS_MD_MARKERS = [
  '# Convenciones del proyecto Banco',
  'SaldoInsuficienteException',
  'arch_check',
  'Skills disponibles',
]
const REQUIRED_AGENTS_MD_MARKERS = [
  'assess_impact',
  'prefijo `bco_`',
]

const SKILLS_KEY = 'agentmd_skills_v1'

const DEFAULT_SKILLS = [
  {
    id: 'arch-check',
    name: 'Test de arquitectura',
    description: 'Reglas de arquitectura para clases Java: sin strings hardcoded, métodos cortos, sin refs fantasma.',
    body: `# Skill: arch-check (test de arquitectura)

Aplicá estas tres reglas al código actual. Después de cada \`edit_code\`, releé el código con \`read_code\` y verificá que cada regla siga cumpliéndose. Si encontrás una violación, corregila con otro \`edit_code\`.

## Reglas

1. **Sin strings hardcodeados.** Todo literal \`"..."\` con más de 1 carácter debe vivir en una constante \`private static final String\` declarada al tope de la clase. Ejemplo: en vez de \`throw new IllegalArgumentException("Monto inválido")\`, declarar \`private static final String ERR_MONTO_INVALIDO = "Monto inválido"\` y usar la constante.

2. **Métodos cortos.** Ningún método debe pasar de 15 líneas (sin contar la firma ni la llave de cierre). Si un método queda largo, extraé sub-métodos privados con nombres descriptivos.

3. **Sin referencias fantasma.** No usés \`this.X\` ni \`X(...)\` (siendo X un nombre simple) si \`X\` no está declarado como campo o método en la clase actual. Si necesitás un campo nuevo, declaralo primero. Si te equivocaste de nombre, corregilo.

## Cómo aplicarlo

- Antes de hacer \`edit_code\`, mirá si tu cambio podría introducir una violación de las 3 reglas. Si sí, prevenila desde el primer edit (ej: declarar la constante antes que el throw que la usa).
- Después de cada \`edit_code\`, hacé \`read_code\` y revisá las 3 reglas mentalmente sobre el código completo.
- Antes de terminar la corrida, hacé un último \`read_code\` y confirmá que las 3 reglas se cumplen. Si no, corregí.`,
  },
]

function loadInitialSkills() {
  if (typeof window === 'undefined') return DEFAULT_SKILLS
  try {
    const raw = localStorage.getItem(SKILLS_KEY)
    if (!raw) return DEFAULT_SKILLS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SKILLS
    // Validación básica de shape — si no, reset al default.
    const ok = parsed.every((s) => s && typeof s.id === 'string' && typeof s.body === 'string')
    return ok ? parsed : DEFAULT_SKILLS
  } catch {
    return DEFAULT_SKILLS
  }
}

function loadInitialAgentsMd() {
  if (typeof window === 'undefined') return DEFAULT_AGENTS_MD
  const stored = localStorage.getItem(AGENTS_KEY)
  if (!stored) return DEFAULT_AGENTS_MD
  const isLegacy = LEGACY_AGENTS_MD_MARKERS.some((marker) => stored.includes(marker))
  const isMissingRequiredRule = REQUIRED_AGENTS_MD_MARKERS.some((marker) => !stored.includes(marker))
  if (isLegacy || isMissingRequiredRule) {
    localStorage.setItem(AGENTS_KEY, DEFAULT_AGENTS_MD)
    return DEFAULT_AGENTS_MD
  }
  return stored
}

const SUGGESTED_PROMPTS = [
  'Agregá un método retirar(monto).',
  'Agregá un método transferir(destino, monto) que retire de esta cuenta y deposite en otra.',
  'Agregá validación al método depositar para que rechace montos inválidos.',
  'Agregá una clase Cliente con campos privados nombre, dni y email, su constructor y getters. Después agregá un campo cliente a CuentaBancaria con su getter.',
  'Agregá una clase Movimiento con campos privados tipo, monto y fecha. Después agregá una lista de movimientos a CuentaBancaria y registrá un movimiento cada vez que se deposita.',
]

const DEFAULT_COLS = [0.32, 0.42, 0.26]
const MIN_COL = 0.12

export default function EditorAgentsMd({ withSkills = true }) {
  const [code, setCode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CODE
    return localStorage.getItem(CODE_KEY) ?? DEFAULT_CODE
  })
  const [agentsMd, setAgentsMd] = useState(() => {
    return loadInitialAgentsMd()
  })
  const [skills, setSkills] = useState(() => loadInitialSkills())
  const [expandedSkillId, setExpandedSkillId] = useState(null)
  const [skillsMenuOpen, setSkillsMenuOpen] = useState(false)
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'anthropic'
    return localStorage.getItem(PROVIDER_KEY) || 'anthropic'
  })
  const [instruction, setInstruction] = useState(SUGGESTED_PROMPTS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [finalText, setFinalText] = useState('')
  const [steps, setSteps] = useState([])
  const [rawHistory, setRawHistory] = useState([])
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [iterCount, setIterCount] = useState(0)
  // lastMode codifica la corrida pasada: 'with' | 'without' | null.
  // El subtoggle de skill se trackea aparte (se mantiene entre corridas).
  const [lastMode, setLastMode] = useState(null)
  const [lastWithSkill, setLastWithSkill] = useState(false)
  const [skillEnabled, setSkillEnabled] = useState(true)
  // Aprobación humana del plan que la IA propone vía assess_impact.
  // pending: { level, summary, plan, resolve } cuando hay un assess_impact en vuelo.
  const [pendingApproval, setPendingApproval] = useState(null)
  const [logs, setLogs] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOGS_KEY)
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

  const logRef = useRef(null)
  const stepsRef = useRef(null)
  const layoutRef = useRef(null)
  const rawHistoryRef = useRef(null)
  const approvalRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(CODE_KEY, code) } catch { /* noop */ }
  }, [code])
  useEffect(() => {
    try { localStorage.setItem(AGENTS_KEY, agentsMd) } catch { /* noop */ }
  }, [agentsMd])
  useEffect(() => {
    try { localStorage.setItem(SKILLS_KEY, JSON.stringify(skills)) } catch { /* noop */ }
  }, [skills])
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
    stepsRef.current?.scrollTo({ top: stepsRef.current.scrollHeight })
  }, [steps])
  useEffect(() => {
    rawHistoryRef.current?.scrollTo({ top: rawHistoryRef.current.scrollHeight, behavior: 'smooth' })
  }, [rawHistory.length])
  useEffect(() => {
    if (pendingApproval) {
      // Scroll para que el banner (con botones Proseguir/Cancelar) quede visible.
      approvalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [pendingApproval])

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString('es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  // Cuando la IA llama assess_impact, el wrapper invoca esta función esperando
  // que la resolvamos con true (proseguir) o false (cancelar). Acá la convertimos
  // en una promesa que se resuelve cuando el usuario clickea uno de los dos botones.
  const requestApproval = useCallback(
    (payload) =>
      new Promise((resolve) => {
        appendLog('info', `🛑 Pausa para aprobación humana — impacto=${payload.level}`)
        setPendingApproval({ ...payload, resolve })
      }),
    [appendLog],
  )

  // Devuelve los hooks UI estándar para una corrida de agente.
  const buildHooks = useCallback(
    (codeSetter) => ({
      onLog: appendLog,
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
      onRawResponse: (res) =>
        setRawHistory((prev) => {
          if (prev.length === 0) return prev
          const next = prev.slice()
          next[next.length - 1] = { ...next[next.length - 1], response: res }
          return next
        }),
      onStep: (step) => setSteps((prev) => [...prev, step]),
      onCodeChange: codeSetter,
      onAwaitApproval: requestApproval,
    }),
    [appendLog, requestApproval],
  )

  const handleApprovalDecision = (approved) => {
    setPendingApproval((prev) => {
      if (!prev) return null
      appendLog(approved ? 'success' : 'info', approved ? '✓ Plan aprobado por el humano — el agente continúa.' : '✗ Plan cancelado por el humano — el agente debe terminar sin editar.')
      try { prev.resolve(approved) } catch { /* noop */ }
      return null
    })
  }

  // Manda la instrucción y, según `withAgents`, incluye o no el AGENTS.md
  // en el system prompt. Si YA hubo una corrida previa (lastMode !== null),
  // reseteamos el código al ejemplo base antes de mandar — así la próxima
  // opción (CON o SIN) arranca del mismo estado limpio y se puede comparar.
  // En la primera corrida respetamos lo que el usuario tenga en el editor.
  const handleSend = async (withAgents) => {
    if (!instruction.trim() || loading) return
    // El skill solo aplica si AGENTS.md está activo (skill es sub-tema de AGENTS.md)
    // y si esta página tiene la sección de Skills habilitada (modo "AGENTS.md + Skills").
    const withSkill = withAgents && withSkills && skillEnabled
    setLoading(true)
    setError(null)
    setFinalText('')
    setSteps([])
    setRawHistory([])
    setCollapsed(new Set())
    setIterCount(0)
    // Si quedó una aprobación pendiente de una corrida anterior (no debería,
    // pero por las dudas), la resolvemos como cancelada antes de arrancar.
    setPendingApproval((prev) => {
      if (prev) try { prev.resolve(false) } catch { /* noop */ }
      return null
    })

    const hadPreviousRun = lastMode !== null
    const codeForRun = hadPreviousRun ? DEFAULT_CODE : code
    if (hadPreviousRun) {
      setCode(DEFAULT_CODE)
      appendLog('info', `Reset: ya hubo una corrida previa, vuelvo el código al ejemplo base (${DEFAULT_CODE.length} chars) para arrancar limpio.`)
    }
    setLastMode(withAgents ? 'with' : 'without')
    setLastWithSkill(withSkill)

    appendLog('user', `Instrucción: "${instruction.trim().slice(0, 100)}${instruction.length > 100 ? '…' : ''}"`)
    appendLog('info', `Lenguaje: java · Tamaño código inicial: ${codeForRun.length} chars`)
    appendLog('info', `AGENTS.md: ${withAgents ? 'INCLUIDO en system prompt' : 'IGNORADO (envío sin AGENTS.md)'}`)
    if (withAgents && withSkills) {
      appendLog('info', `Skills: ${withSkill ? `${skills.length} skill(s) disponibles vía load_skill / run_skill_test` : 'DESHABILITADOS (toggle off)'}`)
    }
    appendLog('info', `Proveedor: ${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}`)

    try {
      const runFn = provider === 'anthropic' ? runClaudeAgent : runOpenAIAgent
      const { finalText: ft, code: finalCode, iterations } = await runFn(
        {
          userInstruction: instruction,
          initialCode: codeForRun,
          language: 'java',
          maxIterations: 8,
          extraSystem: withAgents ? agentsMd : '',
          requireImpactApproval: withAgents,
          skills: withSkill ? skills : [],
          useSkills: withSkill,
        },
        buildHooks(setCode),
      )
      setFinalText(ft)
      setIterCount(iterations)
      appendLog('success', `Agente terminó. ${finalCode.length} chars finales, ${iterations} iter. Código del editor actualizado.`)
    } catch (err) {
      setError(err.message || 'Error al ejecutar el agente')
      appendLog('error', err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleResetAll = () => {
    setCode(DEFAULT_CODE)
    setAgentsMd(DEFAULT_AGENTS_MD)
    setSkills(DEFAULT_SKILLS)
    setExpandedSkillId(null)
    setSteps([])
    setFinalText('')
    setRawHistory([])
    setLastMode(null)
    appendLog('info', 'Todo reseteado al ejemplo')
  }

  const handleUpdateSkill = (id, patch) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  const handleDeleteSkill = (id) => {
    setSkills((prev) => prev.filter((s) => s.id !== id))
    setExpandedSkillId((curr) => (curr === id ? null : curr))
    appendLog('info', `Skill "${id}" eliminado`)
  }
  const handleAddSkill = () => {
    let newId = 'nuevo-skill'
    let i = 1
    while (skills.some((s) => s.id === newId)) {
      i += 1
      newId = `nuevo-skill-${i}`
    }
    const blank = {
      id: newId,
      name: 'Skill nuevo',
      description: 'Descripción corta — esto es lo único que ve la IA en el AGENTS.md.',
      body: '# Skill nuevo\n\nReglas detalladas que la IA recibe cuando llama a load_skill.',
    }
    setSkills((prev) => [...prev, blank])
    setExpandedSkillId(newId)
    setSkillsMenuOpen(true)
    appendLog('info', `Skill "${newId}" creado`)
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  // Resizers (idem otras páginas)
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

  const stepsByIter = steps.reduce((acc, s) => {
    const key = s.n
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div className="app editor-page">
      <header className="header">
        <h1>
          <span className="brand">API a la vista</span>
          <span className="brand-subtitle">— modo <span className="brand-mode">{withSkills ? 'AGENTS.md + Skills' : 'AGENTS.md'}</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active={withSkills ? 'agents-md-skills' : 'agents-md'} />
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
              appendLog('info', `Proveedor cambiado a ${next === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI'}`)
            }}
            className={`hdr-select-input provider-select-${provider}`}
            disabled={loading}
          >
            <option value="anthropic">🟠 Claude (Anthropic)</option>
            <option value="openai">🟢 OpenAI</option>
          </select>
        </label>
        <button onClick={handleResetAll} className="clear-btn" type="button" disabled={loading}>
          Reset todo
        </button>
      </ConfigBar>

      <div
        className="layout editor-layout editor-layout-resizable"
        ref={layoutRef}
        style={{
          gridTemplateColumns: `${cols[0]}fr 6px ${cols[1]}fr 6px ${cols[2]}fr`,
        }}
      >
        {/* Panel 1 — AGENTS.md */}
        <section className="panel editor-panel">
          <div className="panel-title">
            <span>AGENTS.md</span>
            <button
              type="button"
              className="docs-link"
              onClick={() => { setAgentsMd(DEFAULT_AGENTS_MD); appendLog('info', 'AGENTS.md reseteado al ejemplo de fábrica') }}
              disabled={loading}
              title="Vuelve al AGENTS.md de ejemplo precargado"
            >
              ejemplo
            </button>
          </div>
          <div className="monaco-wrap">
            <MonacoEditor
              height="100%"
              language="markdown"
              value={agentsMd}
              onChange={(v) => setAgentsMd(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: loading,
              }}
            />
          </div>
          <div className="ctx-tip" style={{ borderRadius: 0 }}>
            💡 Este archivo se inyecta en el <code>system</code> prompt del agente
            <b> en cada request</b>. La IA "no aprende" tu proyecto — vos le mandás
            estas reglas todas las veces. Es la única forma porque la IA es
            <b> virgen en cada llamada</b>.
          </div>

          {withSkills && (
          <details
            className="docs-collapsible skills-collapsible"
            open={skillsMenuOpen}
            onToggle={(e) => setSkillsMenuOpen(e.currentTarget.open)}
          >
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>📚 Skills disponibles ({skills.length})</span>
            </summary>
            <div className="docs-collapsible-body">
              <div className="ctx-tip" style={{ marginTop: 0 }}>
                💡 Los skills <b>NO viajan en el system prompt</b>. Solo se inyecta una lista corta
                <i> (id + descripción)</i> debajo del AGENTS.md. La IA decide cuándo aplica un skill
                y lo carga llamando a <code>load_skill(id)</code> — recién ahí su contenido entra al
                contexto. Mirá el panel <b>Historial Request/Response</b>: vas a ver el system prompt
                inicial chico, y cómo aparece un <code>tool_result</code> con el body del skill cuando
                la IA lo trae a contexto.
              </div>
              <div className="skills-list">
                {skills.length === 0 && (
                  <div className="empty" style={{ padding: 8 }}>
                    Sin skills definidos. Tocá <b>+ skill</b> para crear uno.
                  </div>
                )}
                {skills.map((skill) => {
                  const isExpanded = expandedSkillId === skill.id
                  return (
                    <div key={skill.id} className={`skill-card ${isExpanded ? 'skill-card-expanded' : ''}`}>
                      <button
                        type="button"
                        className="skill-card-header"
                        onClick={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                        disabled={loading}
                      >
                        <span className="skill-card-chev">{isExpanded ? '▾' : '▸'}</span>
                        <span className="skill-card-id"><code>{skill.id}</code></span>
                        <span className="skill-card-name">{skill.name}</span>
                      </button>
                      {isExpanded && (
                        <div className="skill-card-body">
                          <label className="skill-field">
                            <span className="skill-field-label">id</span>
                            <input
                              type="text"
                              className="skill-field-input"
                              value={skill.id}
                              onChange={(e) => handleUpdateSkill(skill.id, { id: e.target.value })}
                              disabled={loading}
                            />
                          </label>
                          <label className="skill-field">
                            <span className="skill-field-label">nombre</span>
                            <input
                              type="text"
                              className="skill-field-input"
                              value={skill.name}
                              onChange={(e) => handleUpdateSkill(skill.id, { name: e.target.value })}
                              disabled={loading}
                            />
                          </label>
                          <label className="skill-field">
                            <span className="skill-field-label">descripción (esto va al AGENTS.md)</span>
                            <textarea
                              className="skill-field-input skill-field-textarea-sm"
                              value={skill.description}
                              onChange={(e) => handleUpdateSkill(skill.id, { description: e.target.value })}
                              disabled={loading}
                              rows={2}
                            />
                          </label>
                          <label className="skill-field">
                            <span className="skill-field-label">body (lo que recibe la IA cuando hace load_skill)</span>
                            <textarea
                              className="skill-field-input skill-field-textarea-lg"
                              value={skill.body}
                              onChange={(e) => handleUpdateSkill(skill.id, { body: e.target.value })}
                              disabled={loading}
                              rows={10}
                            />
                          </label>
                          <div className="skill-card-actions">
                            <button
                              type="button"
                              className="docs-link skill-delete-btn"
                              onClick={() => handleDeleteSkill(skill.id)}
                              disabled={loading}
                            >
                              eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="skills-actions">
                <button
                  type="button"
                  className="docs-link"
                  onClick={handleAddSkill}
                  disabled={loading}
                >
                  + skill
                </button>
                <button
                  type="button"
                  className="docs-link"
                  onClick={() => { setSkills(DEFAULT_SKILLS); setExpandedSkillId(null); appendLog('info', 'Skills reseteados al ejemplo de fábrica') }}
                  disabled={loading}
                >
                  ejemplo
                </button>
              </div>
            </div>
          </details>
          )}

          <details className="docs-collapsible base-prompt-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🔧 System prompt BASE del agente (antes del AGENTS.md)</span>
            </summary>
            <div className="docs-collapsible-body">
              <div className="ctx-tip" style={{ marginTop: 0 }}>
                💡 Esto es lo que el agente recibe SIEMPRE, además de tu AGENTS.md.
                Define cómo usa las herramientas base (<code>read_code</code> y{' '}
                <code>edit_code</code>). Cuando enviás CON AGENTS.md, se agrega{' '}
                <code>assess_impact</code> y la aprobación humana antes de editar.
                Read-only, no se puede modificar desde la UI.
              </div>
              <pre className="base-prompt-body">{AGENT_SYSTEM_PROMPT}</pre>
            </div>
          </details>
        </section>

        <div
          className="col-resizer"
          onMouseDown={startResize(0)}
          onDoubleClick={handleResetCols}
          title="Arrastrá para redimensionar · doble clic = reset"
        />

        {/* Panel 2 — Código + Prompt + Timeline */}
        <section className="panel instr-panel">
          <div className="panel-title">
            <span>Código + instrucción</span>
            <span className={`provider-badge provider-badge-${provider}`}>
              {provider === 'anthropic' ? '🟠 Claude' : '🟢 OpenAI'}
            </span>
          </div>
          <div style={{ flex: '0 0 38%', minHeight: 0, display: 'flex', flexDirection: 'column', borderBottom: '1px solid #334155' }}>
            <MonacoEditor
              height="100%"
              language="java"
              value={code}
              onChange={(v) => setCode(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: loading,
              }}
            />
          </div>
          <div className="instr-body" style={{ flex: 1 }}>
            <div className="suggested-steps">
              <div className="suggested-steps-title">Probá una instrucción y mirá cómo cambia con/sin AGENTS.md:</div>
              <ol className="suggested-steps-list">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="suggested-step-btn"
                      onClick={() => setInstruction(p)}
                      disabled={loading}
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <textarea
              className="instr-input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="¿Qué querés que haga el agente?"
              disabled={loading}
              style={{ minHeight: 60 }}
            />
            {/*
              Toggle del sub-tema "skill" del AGENTS.md.
              Solo modula el botón CON AGENTS.md (sin AGENTS.md no hay skills, igual
              que en el resto de la conceptualización: skill es subtema de AGENTS.md).
            */}
            {withSkills && (
              <label className="skill-toggle" title="Si está activo, la IA recibe las tools load_skill y run_skill_test cuando enviás CON AGENTS.md.">
                <input
                  type="checkbox"
                  checked={skillEnabled}
                  onChange={(e) => setSkillEnabled(e.target.checked)}
                  disabled={loading}
                />
                <span className="skill-toggle-label">
                  <b>🧪 Skills</b>
                  <span className="skill-toggle-meta">
                    {skillEnabled
                      ? `activos (${skills.length}) — solo cuando enviás CON AGENTS.md`
                      : 'apagados — la IA va a usar AGENTS.md pero sin tools de skill'}
                  </span>
                </span>
              </label>
            )}

            <div className="instr-actions">
              <button
                type="button"
                onClick={() => handleSend(true)}
                disabled={loading || !instruction.trim()}
                className="instr-send-btn"
                title={
                  withSkills
                    ? (skillEnabled
                      ? 'AGENTS.md inyectado + tools de skill (load_skill, run_skill_test) habilitadas. La IA debería autoverificar después de editar.'
                      : 'AGENTS.md inyectado, pero el toggle de skills está apagado: la IA no recibe tools de skill.')
                    : 'AGENTS.md inyectado en el system prompt. Sin skills (estás en el modo solo AGENTS.md).'
                }
              >
                {loading && lastMode === 'with'
                  ? 'Trabajando…'
                  : `✅ Enviar CON AGENTS.md${withSkills && skillEnabled ? ' + 🧪 skill' : ''}`}
              </button>
              <button
                type="button"
                onClick={() => handleSend(false)}
                disabled={loading || !instruction.trim()}
                className="instr-apply-btn"
                title="Manda la instrucción sin incluir el AGENTS.md — solo el system base del agente. Los skills tampoco aplican (son sub-tema de AGENTS.md)."
              >
                {loading && lastMode === 'without' ? 'Trabajando…' : '❌ Enviar SIN AGENTS.md'}
              </button>
            </div>

            {pendingApproval && (
              <div ref={approvalRef} className={`approval-banner approval-${pendingApproval.level}`}>
                <div className="approval-header">
                  <span className="approval-badge">
                    {pendingApproval.level === 'low' && '🟢 Impacto BAJO'}
                    {pendingApproval.level === 'medium' && '🟡 Impacto MEDIO'}
                    {pendingApproval.level === 'high' && '🔴 Impacto ALTO'}
                  </span>
                  <span className="approval-title">El agente pide permiso para editar</span>
                </div>
                <div className="approval-section">
                  <div className="approval-label">Resumen</div>
                  <div className="approval-body">{pendingApproval.summary}</div>
                </div>
                <div className="approval-section">
                  <div className="approval-label">Plan</div>
                  <pre className="approval-plan">{pendingApproval.plan}</pre>
                </div>
                <div className="approval-actions">
                  <button
                    type="button"
                    className="instr-send-btn"
                    onClick={() => handleApprovalDecision(true)}
                  >
                    ✓ Proseguir
                  </button>
                  <button
                    type="button"
                    className="instr-apply-btn"
                    onClick={() => handleApprovalDecision(false)}
                  >
                    ✗ Cancelar
                  </button>
                </div>
              </div>
            )}

            {lastMode && !loading && (
              <div className="ctx-tip" style={{ marginTop: 8 }}>
                💡 Última corrida: <b>
                  {lastMode === 'with'
                    ? lastWithSkill ? 'CON AGENTS.md + 🧪 skill' : 'CON AGENTS.md (sin skill)'
                    : 'SIN AGENTS.md'}
                </b>.
                El código del editor ya fue actualizado. Probá la otra opción con la misma instrucción
                {lastMode === 'with' && withSkills && (
                  <> — y, dentro de CON AGENTS.md, prendé/apagá el toggle <b>🧪 Skills</b> para ver
                  cómo la IA llama (o no) a <code>run_skill_test</code> después de editar</>
                )}
                .
              </div>
            )}

            {error && <div className="error">{error}</div>}

            <div className="reply-section" style={{ minHeight: 100 }}>
              <div className="reply-header">
                <span>Timeline del agente</span>
                <span className="context-meta">
                  {iterCount > 0 ? `${iterCount} iteración(es)` : 'sin actividad'}
                </span>
              </div>
              <div className="reply-content" ref={stepsRef}>
                {Object.keys(stepsByIter).length === 0 && !finalText && (
                  <span className="empty">Mandá una instrucción con uno de los dos botones para ver el efecto del AGENTS.md.</span>
                )}
                {Object.entries(stepsByIter).map(([iter, group]) => (
                  <div key={iter} className="agent-iter">
                    <div className="agent-iter-title">— Iteración #{iter} —</div>
                    {group.map((s, idx) => (
                      <AgentStep key={idx} step={s} />
                    ))}
                  </div>
                ))}
                {finalText && (
                  <div className="agent-final">
                    <div className="agent-final-title">✓ Respuesta final</div>
                    <div className="agent-final-text">{finalText}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div
          className="col-resizer"
          onMouseDown={startResize(1)}
          onDoubleClick={handleResetCols}
          title="Arrastrá para redimensionar · doble clic = reset"
        />

        {/* Panel 3 — Historial Raw + Log */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Historial Request/Response</span>
            <span className="context-meta">
              {rawHistory.length === 0 ? 'sin actividad' : `${rawHistory.length} req`}
            </span>
          </div>
          <div className="ctx-tip" style={{ marginTop: 0 }}>
            💡 Mirá el campo <code>system</code> de cada request — ahí vas a ver
            tu AGENTS.md inyectado en cada llamada cuando usás CON AGENTS.md.
          </div>

          <div className="raw-history" ref={rawHistoryRef}>
            {rawHistory.length === 0 && (
              <div className="empty" style={{ padding: 12 }}>Sin requests todavía.</div>
            )}
            {rawHistory.map((entry) => {
              const isCollapsed = collapsed.has(entry.iter)
              const reqMsgCount = entry.request?.body?.messages?.length ?? '?'
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
                  >
                    <span className="raw-iter-chev">{isCollapsed ? '▸' : '▾'}</span>
                    <span className="raw-iter-label">Iter #{entry.iter}</span>
                    {entry.label && (
                      <span className={`raw-iter-badge raw-iter-badge-${entry.label === 'CON' ? 'with' : 'without'}`}>
                        {entry.label === 'CON' ? '✅ CON' : '❌ SIN'}
                      </span>
                    )}
                    <span className="raw-iter-meta">
                      {reqMsgCount} msg(s) · {entry.response ? `stop=${entry.response.stop_reason ?? entry.response.choices?.[0]?.finish_reason ?? '?'}` : '…'}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <>
                      <div className="raw-iter-subtitle">→ Request</div>
                      <pre className="raw raw-compact raw-nested">{JSON.stringify(entry.request, null, 2)}</pre>
                      <div className="raw-iter-subtitle">← Response</div>
                      <pre className="raw raw-compact raw-nested">
                        {entry.response ? JSON.stringify(entry.response, null, 2) : '// esperando…'}
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

function AgentStep({ step }) {
  if (step.type === 'iteration_start' || step.type === 'final_text') return null
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
  return null
}
