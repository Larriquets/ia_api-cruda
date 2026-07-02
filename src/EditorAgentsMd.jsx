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
import { useT } from './i18n/useT.js'

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

// AGENTS.md y skills semilla: copy visible y editable. Bilingüe — castellano
// rioplatense base, inglés traducción. Se elige por idioma en el initial load.
const DEFAULT_AGENTS_MD_ES = `# AGENTS.md

## Reglas obligatorias
- NO se pueden hacer cambios sin medir antes el impacto del cambio en el código usando \`assess_impact\`.
- Toda clase, función/método o propiedad/campo que se cree debe tener sí o sí el prefijo \`bco_\` en su nombre.
  Ejemplos: \`bco_CuentaBancaria\`, \`bco_Retirar\`, \`bco_Saldo\`.

## Niveles de impacto
- \`low\`: cambio puntual de bajo riesgo, sin tocar firmas públicas ni crear tipos nuevos.
- \`medium\`: varios edits relacionados o una clase nueva chica, sin romper APIs existentes.
- \`high\`: rompe firmas públicas, cambia el modelo de datos, hace un refactor estructural o agrega varias clases relacionadas.
`

const DEFAULT_AGENTS_MD_EN = `# AGENTS.md

## Mandatory rules
- NO changes can be made without first measuring the change's impact on the code using \`assess_impact\`.
- Every class, function/method or property/field that gets created MUST have the \`bco_\` prefix in its name.
  Examples: \`bco_CuentaBancaria\`, \`bco_Retirar\`, \`bco_Saldo\`.

## Impact levels
- \`low\`: small, low-risk change, without touching public signatures or creating new types.
- \`medium\`: several related edits or a small new class, without breaking existing APIs.
- \`high\`: breaks public signatures, changes the data model, does a structural refactor or adds several related classes.
`

const LEGACY_AGENTS_MD_MARKERS = [
  '# Convenciones del proyecto Banco',
  'SaldoInsuficienteException',
  'arch_check',
  'Skills disponibles',
]
// Marcadores independientes del idioma: ambos viven en el AGENTS.md ES y EN.
const REQUIRED_AGENTS_MD_MARKERS = [
  'assess_impact',
  'bco_',
]

const SKILLS_KEY = 'agentmd_skills_v1'

const DEFAULT_SKILLS_ES = [
  {
    id: 'arch-check',
    name: 'Test de arquitectura',
    enabled: true,
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
  {
    id: 'no-magic-numbers',
    name: 'Sin números mágicos',
    enabled: true,
    description: 'Todo literal numérico (≠ 0, 1, -1) debe vivir en una constante static final con nombre descriptivo.',
    body: `# Skill: no-magic-numbers (sin números mágicos)

Ningún literal numérico suelto en el cuerpo del código. Todo número distinto de \`0\`, \`1\` y \`-1\` debe declararse como constante \`private static final\` con un nombre que explique qué representa.

## Regla

- ❌ Mal: \`if (intentos > 3) { ... }\`
- ✅ Bien: declarar \`private static final int MAX_INTENTOS = 3;\` y usar \`if (intentos > MAX_INTENTOS) { ... }\`.

- ❌ Mal: \`double comision = monto * 0.05;\`
- ✅ Bien: \`private static final double TASA_COMISION = 0.05;\` y \`double comision = monto * TASA_COMISION;\`.

## Excepciones permitidas

- \`0\`, \`1\` y \`-1\` están OK porque suelen representar identidad/vacío/sentinel y no aportan claridad como constantes.
- La propia línea \`static final\` no se considera violación (es la declaración de la constante).

## Cómo aplicarlo

- Antes de cada \`edit_code\`, fijate si vas a introducir un número distinto de 0/1/-1. Si sí, primero agregá la constante (o reutilizá una existente) y después usala.
- Después de cada \`edit_code\`, corré \`run_skill_test("no-magic-numbers")\` y si devuelve FAIL, corregí con otro \`edit_code\` y volvé a correr el test hasta que pase.`,
  },
  {
    id: 'commit-style',
    name: 'Mensaje de commit (Conventional Commits)',
    enabled: true,
    description: 'La respuesta final tiene que tener forma de commit message: tipo(scope): sujeto corto + cuerpo con el porqué.',
    body: `# Skill: commit-style (mensaje de commit)

Tu respuesta final (el texto que cierra el loop, no las llamadas a tools) tiene que tener forma de **Conventional Commit**, no de párrafo prosaico.

## Formato obligatorio

\`\`\`
<tipo>(<scope opcional>): <sujeto en imperativo, ≤ 72 chars>

<cuerpo: 1-3 oraciones explicando POR QUÉ se hizo el cambio,
no qué — el diff ya muestra el qué>
\`\`\`

## Tipos permitidos

- \`feat\`: agregás funcionalidad nueva (método, clase, comportamiento).
- \`fix\`: arreglás un bug o comportamiento incorrecto.
- \`refactor\`: cambiás estructura sin alterar comportamiento externo.
- \`docs\`: solo comentarios / documentación.
- \`test\`: solo tests.
- \`chore\`: tareas que no entran en las anteriores (renombres, formato).

## Ejemplos

- ✅ \`feat(cuenta): agregar método retirar con validación de saldo\\n\\nEl método rechaza montos negativos y montos mayores al saldo actual para mantener la invariante de saldo no negativo.\`
- ✅ \`refactor(cuenta): extraer validación de monto a método privado\\n\\nLa lógica se repetía en depositar y retirar; centralizarla reduce el riesgo de divergencia.\`
- ❌ \`Agregué un método para retirar plata de la cuenta. Hace lo que pediste y valida que el monto sea positivo y que haya saldo suficiente.\` (es un párrafo, no un commit message)

## Cómo aplicarlo

- Este skill NO tiene test determinístico — no llames a \`run_skill_test\` sobre él.
- Cargalo con \`load_skill("commit-style")\` antes de redactar tu respuesta final.
- En el último mensaje del loop (sin llamadas a tools), seguí el formato al pie de la letra.`,
  },
]

const DEFAULT_SKILLS_EN = [
  {
    id: 'arch-check',
    name: 'Architecture test',
    enabled: true,
    description: 'Architecture rules for Java classes: no hardcoded strings, short methods, no phantom references.',
    body: `# Skill: arch-check (architecture test)

Apply these three rules to the current code. After each \`edit_code\`, re-read the code with \`read_code\` and verify that each rule still holds. If you find a violation, fix it with another \`edit_code\`.

## Rules

1. **No hardcoded strings.** Every literal \`"..."\` with more than 1 character must live in a \`private static final String\` constant declared at the top of the class. Example: instead of \`throw new IllegalArgumentException("Monto inválido")\`, declare \`private static final String ERR_MONTO_INVALIDO = "Monto inválido"\` and use the constant.

2. **Short methods.** No method may exceed 15 lines (not counting the signature or the closing brace). If a method gets long, extract private sub-methods with descriptive names.

3. **No phantom references.** Don't use \`this.X\` or \`X(...)\` (X being a simple name) if \`X\` is not declared as a field or method in the current class. If you need a new field, declare it first. If you got the name wrong, fix it.

## How to apply it

- Before doing \`edit_code\`, check whether your change could introduce a violation of the 3 rules. If so, prevent it from the first edit (e.g. declare the constant before the throw that uses it).
- After each \`edit_code\`, do \`read_code\` and review the 3 rules mentally over the complete code.
- Before finishing the run, do one last \`read_code\` and confirm the 3 rules hold. If not, fix.`,
  },
  {
    id: 'no-magic-numbers',
    name: 'No magic numbers',
    enabled: true,
    description: 'Every numeric literal (≠ 0, 1, -1) must live in a named static final constant.',
    body: `# Skill: no-magic-numbers

No loose numeric literal in the body of the code. Every number other than \`0\`, \`1\` and \`-1\` must be declared as a \`private static final\` constant with a name that explains what it represents.

## Rule

- ❌ Bad: \`if (intentos > 3) { ... }\`
- ✅ Good: declare \`private static final int MAX_INTENTOS = 3;\` and use \`if (intentos > MAX_INTENTOS) { ... }\`.

- ❌ Bad: \`double comision = monto * 0.05;\`
- ✅ Good: \`private static final double TASA_COMISION = 0.05;\` and \`double comision = monto * TASA_COMISION;\`.

## Allowed exceptions

- \`0\`, \`1\` and \`-1\` are OK because they usually represent identity/empty/sentinel and don't add clarity as constants.
- The \`static final\` line itself is not considered a violation (it's the constant declaration).

## How to apply it

- Before each \`edit_code\`, check whether you're about to introduce a number other than 0/1/-1. If so, first add the constant (or reuse an existing one) and then use it.
- After each \`edit_code\`, run \`run_skill_test("no-magic-numbers")\` and if it returns FAIL, fix with another \`edit_code\` and re-run the test until it passes.`,
  },
  {
    id: 'commit-style',
    name: 'Commit message (Conventional Commits)',
    enabled: true,
    description: 'The final response must look like a commit message: type(scope): short subject + body with the why.',
    body: `# Skill: commit-style (commit message)

Your final response (the text that closes the loop, not the tool calls) must take the shape of a **Conventional Commit**, not a prose paragraph.

## Mandatory format

\`\`\`
<type>(<optional scope>): <subject in imperative, ≤ 72 chars>

<body: 1-3 sentences explaining WHY the change was made,
not what — the diff already shows the what>
\`\`\`

## Allowed types

- \`feat\`: you add new functionality (method, class, behavior).
- \`fix\`: you fix a bug or incorrect behavior.
- \`refactor\`: you change structure without altering external behavior.
- \`docs\`: comments / documentation only.
- \`test\`: tests only.
- \`chore\`: tasks that don't fit the above (renames, formatting).

## Examples

- ✅ \`feat(cuenta): add retirar method with balance validation\\n\\nThe method rejects negative amounts and amounts greater than the current balance to keep the non-negative balance invariant.\`
- ✅ \`refactor(cuenta): extract amount validation into a private method\\n\\nThe logic was repeated in depositar and retirar; centralizing it reduces the risk of divergence.\`
- ❌ \`I added a method to withdraw money from the account. It does what you asked and validates that the amount is positive and that there's enough balance.\` (it's a paragraph, not a commit message)

## How to apply it

- This skill has NO deterministic test — don't call \`run_skill_test\` on it.
- Load it with \`load_skill("commit-style")\` before drafting your final response.
- In the last message of the loop (no tool calls), follow the format to the letter.`,
  },
]

function loadInitialSkills(lang) {
  const DEFAULT = lang === 'en' ? DEFAULT_SKILLS_EN : DEFAULT_SKILLS_ES
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(SKILLS_KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT
    // Validación básica de shape — si no, reset al default.
    const ok = parsed.every((s) => s && typeof s.id === 'string' && typeof s.body === 'string')
    if (!ok) return DEFAULT
    // Migración soft: si el storage tiene EXACTAMENTE el default viejo
    // (un único `arch-check` que la persona nunca tocó), lo reemplazamos
    // por el nuevo default. Si tiene skills custom o editados, respetamos.
    const isOldDefault = parsed.length === 1 && parsed[0].id === 'arch-check' && !parsed[0].draft
    if (isOldDefault) return DEFAULT
    // Migración: skills viejos sin `enabled` se asumen habilitados (retro-compat).
    return parsed.map((s) => ({ ...s, enabled: s.enabled !== false }))
  } catch {
    return DEFAULT
  }
}

function loadInitialAgentsMd(lang) {
  const DEFAULT = lang === 'en' ? DEFAULT_AGENTS_MD_EN : DEFAULT_AGENTS_MD_ES
  if (typeof window === 'undefined') return DEFAULT
  const stored = localStorage.getItem(AGENTS_KEY)
  if (!stored) return DEFAULT
  const isLegacy = LEGACY_AGENTS_MD_MARKERS.some((marker) => stored.includes(marker))
  const isMissingRequiredRule = REQUIRED_AGENTS_MD_MARKERS.some((marker) => !stored.includes(marker))
  if (isLegacy || isMissingRequiredRule) {
    localStorage.setItem(AGENTS_KEY, DEFAULT)
    return DEFAULT
  }
  return stored
}

// Prompts sugeridos: copy visible y la instrucción real que viaja. Referencian
// identificadores reales del Java (retirar, depositar, Cliente…), que quedan tal cual.
const SUGGESTED_PROMPTS_ES = [
  'Agregá un método retirar(monto).',
  'Agregá un método transferir(destino, monto) que retire de esta cuenta y deposite en otra.',
  'Agregá validación al método depositar para que rechace montos inválidos.',
  'Agregá una clase Cliente con campos privados nombre, dni y email, su constructor y getters. Después agregá un campo cliente a CuentaBancaria con su getter.',
  'Agregá una clase Movimiento con campos privados tipo, monto y fecha. Después agregá una lista de movimientos a CuentaBancaria y registrá un movimiento cada vez que se deposita.',
]

const SUGGESTED_PROMPTS_EN = [
  'Add a retirar(monto) method.',
  'Add a transferir(destino, monto) method that withdraws from this account and deposits into another.',
  'Add validation to the depositar method so it rejects invalid amounts.',
  'Add a Cliente class with private fields nombre, dni and email, its constructor and getters. Then add a cliente field to CuentaBancaria with its getter.',
  'Add a Movimiento class with private fields tipo, monto and fecha. Then add a list of movimientos to CuentaBancaria and record a movimiento every time a deposit happens.',
]

const DEFAULT_COLS = [0.32, 0.42, 0.26]
const MIN_COL = 0.12

export default function EditorAgentsMd({ withSkills = true }) {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const DEFAULT_AGENTS_MD = lang === 'en' ? DEFAULT_AGENTS_MD_EN : DEFAULT_AGENTS_MD_ES
  const DEFAULT_SKILLS = lang === 'en' ? DEFAULT_SKILLS_EN : DEFAULT_SKILLS_ES
  const SUGGESTED_PROMPTS = lang === 'en' ? SUGGESTED_PROMPTS_EN : SUGGESTED_PROMPTS_ES

  const [code, setCode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CODE
    return localStorage.getItem(CODE_KEY) ?? DEFAULT_CODE
  })
  const [agentsMd, setAgentsMd] = useState(() => {
    return loadInitialAgentsMd(lang)
  })
  const [skills, setSkills] = useState(() => loadInitialSkills(lang))
  const [expandedSkillId, setExpandedSkillId] = useState(null)
  const [skillsMenuOpen, setSkillsMenuOpen] = useState(false)
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'anthropic'
    return localStorage.getItem(PROVIDER_KEY) || 'anthropic'
  })
  const [instruction, setInstruction] = useState(() => SUGGESTED_PROMPTS[0])
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
        appendLog('info', L(`🛑 Pausa para aprobación humana — impacto=${payload.level}`, `🛑 Pause for human approval — impact=${payload.level}`))
        setPendingApproval({ ...payload, resolve })
      }),
    [appendLog, lang],
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
      appendLog(approved ? 'success' : 'info', approved
        ? L('✓ Plan aprobado por el humano — el agente continúa.', '✓ Plan approved by the human — the agent continues.')
        : L('✗ Plan cancelado por el humano — el agente debe terminar sin editar.', '✗ Plan canceled by the human — the agent must finish without editing.'))
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
      appendLog('info', L(
        `Reset: ya hubo una corrida previa, vuelvo el código al ejemplo base (${DEFAULT_CODE.length} chars) para arrancar limpio.`,
        `Reset: there was a previous run, reverting the code to the base sample (${DEFAULT_CODE.length} chars) to start clean.`,
      ))
    }
    setLastMode(withAgents ? 'with' : 'without')
    setLastWithSkill(withSkill)

    const instrPreview = `${instruction.trim().slice(0, 100)}${instruction.length > 100 ? '…' : ''}`
    appendLog('user', L(`Instrucción: "${instrPreview}"`, `Instruction: "${instrPreview}"`))
    appendLog('info', L(`Lenguaje: java · Tamaño código inicial: ${codeForRun.length} chars`, `Language: java · Initial code size: ${codeForRun.length} chars`))
    appendLog('info', L(
      `AGENTS.md: ${withAgents ? 'INCLUIDO en system prompt' : 'IGNORADO (envío sin AGENTS.md)'}`,
      `AGENTS.md: ${withAgents ? 'INCLUDED in system prompt' : 'IGNORED (sent without AGENTS.md)'}`,
    ))
    const confirmedSkills = skills.filter((s) => !s.draft)
    const enabledSkills = confirmedSkills.filter((s) => s.enabled !== false)
    const draftCount = skills.length - confirmedSkills.length
    if (withAgents && withSkills) {
      if (!withSkill) {
        appendLog('info', L('Skills: DESHABILITADOS (toggle off)', 'Skills: DISABLED (toggle off)'))
      } else if (enabledSkills.length === 0) {
        const detail = draftCount > 0
          ? L(`(${confirmedSkills.length} confirmado(s) tildado(s)=0, ${draftCount} en borrador sin agregar)`, `(${confirmedSkills.length} confirmed checked=0, ${draftCount} in draft not added)`)
          : L(`(${skills.length} definido(s), 0 tildado(s))`, `(${skills.length} defined, 0 checked)`)
        appendLog('info', L(
          `Skills: toggle ON pero NINGÚN skill listo para viajar ${detail} — la IA no recibe load_skill / run_skill_test`,
          `Skills: toggle ON but NO skill ready to travel ${detail} — the AI doesn't receive load_skill / run_skill_test`,
        ))
      } else {
        const ids = enabledSkills.map((s) => s.id).join(', ')
        const draftNote = draftCount > 0 ? L(` (${draftCount} borrador(es) ignorado(s))`, ` (${draftCount} draft(s) ignored)`) : ''
        appendLog('info', L(
          `Skills: ${enabledSkills.length}/${confirmedSkills.length} tildado(s) viajan vía load_skill / run_skill_test → [${ids}]${draftNote}`,
          `Skills: ${enabledSkills.length}/${confirmedSkills.length} checked travel via load_skill / run_skill_test → [${ids}]${draftNote}`,
        ))
      }
    }
    const providerLabel =
      provider === 'anthropic'
        ? 'Anthropic (Claude)'
        : provider === 'lmstudio'
          ? 'LM Studio (local)'
          : 'OpenAI'
    appendLog('info', L(`Proveedor: ${providerLabel}`, `Provider: ${providerLabel}`))

    try {
      const runFn =
        provider === 'anthropic'
          ? runClaudeAgent
          : provider === 'lmstudio'
            ? runLmStudioAgent
            : runOpenAIAgent
      const { finalText: ft, code: finalCode, iterations } = await runFn(
        {
          userInstruction: instruction,
          initialCode: codeForRun,
          language: 'java',
          maxIterations: 8,
          extraSystem: withAgents ? agentsMd : '',
          requireImpactApproval: withAgents,
          skills: withSkill ? enabledSkills : [],
          useSkills: withSkill,
        },
        buildHooks(setCode),
      )
      setFinalText(ft)
      setIterCount(iterations)
      appendLog('success', L(
        `Agente terminó. ${finalCode.length} chars finales, ${iterations} iter. Código del editor actualizado.`,
        `Agent finished. ${finalCode.length} final chars, ${iterations} iter. Editor code updated.`,
      ))
    } catch (err) {
      setError(err.message || L('Error al ejecutar el agente', 'Error running the agent'))
      appendLog('error', err.message || L('Error desconocido', 'Unknown error'))
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
    appendLog('info', L('Todo reseteado al ejemplo', 'Everything reset to the sample'))
  }

  const handleUpdateSkill = (id, patch) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    if (patch.id !== undefined && patch.id !== id) {
      setExpandedSkillId((curr) => (curr === id ? patch.id : curr))
    }
  }
  const handleDeleteSkill = (id) => {
    setSkills((prev) => prev.filter((s) => s.id !== id))
    setExpandedSkillId((curr) => (curr === id ? null : curr))
    appendLog('info', L(`Skill "${id}" eliminado`, `Skill "${id}" deleted`))
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
      name: L('Skill nuevo', 'New skill'),
      description: L('Descripción corta — esto es lo único que ve la IA en el AGENTS.md.', 'Short description — this is the only thing the AI sees in AGENTS.md.'),
      body: L('# Skill nuevo\n\nReglas detalladas que la IA recibe cuando llama a load_skill.', '# New skill\n\nDetailed rules the AI receives when it calls load_skill.'),
      enabled: true,
      draft: true,
    }
    setSkills((prev) => [...prev, blank])
    setExpandedSkillId(newId)
    setSkillsMenuOpen(true)
    appendLog('info', L(
      `Skill "${newId}" en borrador — editalo y tocá "Agregar a la lista" para que viaje a la API`,
      `Skill "${newId}" in draft — edit it and hit "Add to the list" so it travels to the API`,
    ))
  }

  const handleConfirmDraftSkill = (id) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, draft: false } : s)))
    appendLog('success', L(
      `Skill "${id}" agregado — va a viajar al prompt en la próxima corrida CON AGENTS.md (si está tildado)`,
      `Skill "${id}" added — it will travel to the prompt on the next run WITH AGENTS.md (if checked)`,
    ))
  }

  const handleDiscardDraftSkill = (id) => {
    setSkills((prev) => prev.filter((s) => s.id !== id))
    setExpandedSkillId((curr) => (curr === id ? null : curr))
    appendLog('info', L(`Borrador de skill "${id}" descartado`, `Draft skill "${id}" discarded`))
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
          <a href="/" className="brand-home" aria-label={L('Ir al inicio', 'Go to home')}>
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <Brand />
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">{t('app.subtitlePre')}<span className="brand-mode">{withSkills ? L('Agente + skills', 'Agent + skills') : L('Agente + reglas', 'Agent + rules')}</span>{t('app.subtitlePost')}</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active={withSkills ? 'agents-md-skills' : 'agents-md'} />
        </div>
      </header>

      <DemoBacklink href={withSkills ? '/demo/agents-md-skills' : '/demo/agents-md'} />

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
          >
            <option value="anthropic">🟠 Claude (Anthropic)</option>
            <option value="openai">🟢 OpenAI</option>
            <option value="lmstudio">🔵 LM Studio (local)</option>
          </select>
        </label>

        {provider === 'lmstudio' && <LmStudioModelPicker onLog={appendLog} />}

        <button onClick={handleResetAll} className="clear-btn" type="button" disabled={loading}>
          {L('Reset todo', 'Reset all')}
        </button>

        <div className="config-bar-actions">
          <a
            href={withSkills ? '/demo/agents-md-skills' : '/demo/agents-md'}
            target="_blank"
            rel="noreferrer"
            className="read-doc-link view-demo-link"
            title={
              withSkills
                ? L('Abre la demo automatica de AGENTS.md + skills en otra pestaña', 'Opens the automatic AGENTS.md + skills demo in a new tab')
                : L('Abre la demo automatica de AGENTS.md en otra pestaña', 'Opens the automatic AGENTS.md demo in a new tab')
            }
          >
            {L('Ver Demo', 'View Demo')}
          </a>
          <ReadDocLink section={withSkills ? 'modo-skills' : 'modo-agentsmd'} />
        </div>
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
              onClick={() => { setAgentsMd(DEFAULT_AGENTS_MD); appendLog('info', L('AGENTS.md reseteado al ejemplo de fábrica', 'AGENTS.md reset to the factory sample')) }}
              disabled={loading}
              title={L('Vuelve al AGENTS.md de ejemplo precargado', 'Goes back to the preloaded sample AGENTS.md')}
            >
              {L('ejemplo', 'sample')}
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
            💡 {L('Este archivo se inyecta en el', 'This file is injected into the agent\'s')} <code>system</code> {L('prompt del agente', 'prompt')}
            <b> {L('en cada request', 'on every request')}</b>. {L('La IA "no aprende" tu proyecto — vos le mandás estas reglas todas las veces. Es la única forma porque la IA es', 'The AI does not "learn" your project — you send it these rules every single time. It\'s the only way because the AI is')}
            <b> {L('recién nacida en cada llamada', 'newborn on every call')}</b>.
          </div>

          {withSkills && (
          <details
            className="docs-collapsible skills-collapsible"
            open={skillsMenuOpen}
            onToggle={(e) => setSkillsMenuOpen(e.currentTarget.open)}
          >
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>{(() => {
                const confirmed = skills.filter((s) => !s.draft)
                const checked = confirmed.filter((s) => s.enabled !== false).length
                const drafts = skills.filter((s) => s.draft).length
                const checkedWord = L(confirmed.length === 1 ? 'tildado' : 'tildados', 'checked')
                const draftPart = drafts > 0 ? ` · ${drafts} ${L('borrador', drafts === 1 ? 'draft' : 'drafts')}` : ''
                return `📚 ${L('Skills disponibles', 'Available skills')} (${checked}/${confirmed.length} ${checkedWord}${draftPart})`
              })()}</span>
            </summary>
            <div className="docs-collapsible-body">
              <div className="ctx-tip" style={{ marginTop: 0 }}>
                💡 {L('Los skills', 'Skills')} <b>{L('NO viajan en el system prompt', 'do NOT travel in the system prompt')}</b>. {L('Solo se inyecta una lista corta', 'Only a short list is injected')}
                <i> ({L('id + descripción', 'id + description')})</i> {L('debajo del AGENTS.md — y', 'below the AGENTS.md — and')} <b>{L('solo de los skills tildados y agregados', 'only the checked and added skills')}</b>.
                {L('Los', 'The')} <b>{L('borradores', 'drafts')}</b> {L('no viajan hasta que toques', "don't travel until you hit")} <b>{L('Agregar a la lista', 'Add to the list')}</b>. {L('La IA decide cuándo aplica un skill y lo carga llamando a', 'The AI decides when a skill applies and loads it by calling')} <code>load_skill(id)</code> — {L('recién ahí su contenido entra al contexto.', 'only then does its content enter the context.')}
              </div>
              <div className="skills-list">
                {skills.length === 0 && (
                  <div className="empty" style={{ padding: 8 }}>
                    {L('Sin skills definidos. Tocá', 'No skills defined. Hit')} <b>{L('+ Agregar skill', '+ Add skill')}</b> {L('para crear uno.', 'to create one.')}
                  </div>
                )}
                {skills.map((skill) => {
                  const isExpanded = expandedSkillId === skill.id
                  const isEnabled = skill.enabled !== false
                  const isDraft = !!skill.draft
                  return (
                    <div key={skill.id} className={`skill-card ${isExpanded ? 'skill-card-expanded' : ''} ${isEnabled ? '' : 'skill-card-disabled'} ${isDraft ? 'skill-card-draft' : ''}`}>
                      <div className="skill-card-header-row">
                        <label
                          className="skill-card-checkbox"
                          title={isDraft
                            ? L('Skill en borrador: no viaja al prompt hasta que toques "Agregar a la lista".', 'Draft skill: it doesn\'t travel to the prompt until you hit "Add to the list".')
                            : isEnabled
                              ? L('Tildado: este skill se inyecta en el AGENTS.md y la IA puede hacer load_skill.', 'Checked: this skill is injected into AGENTS.md and the AI can call load_skill.')
                              : L('Destildado: la IA no ve este skill — no aparece en la lista que va al system prompt.', 'Unchecked: the AI doesn\'t see this skill — it\'s not in the list that goes to the system prompt.')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              handleUpdateSkill(skill.id, { enabled: e.target.checked })
                              appendLog('info', L(
                                `Skill "${skill.id}" ${e.target.checked ? 'TILDADO' : 'destildado'} — se aplica en la próxima corrida`,
                                `Skill "${skill.id}" ${e.target.checked ? 'CHECKED' : 'unchecked'} — applies on the next run`,
                              ))
                            }}
                            disabled={loading || isDraft}
                          />
                        </label>
                        <button
                          type="button"
                          className="skill-card-header"
                          onClick={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                          disabled={loading}
                        >
                          <span className="skill-card-chev">{isExpanded ? '▾' : '▸'}</span>
                          <span className="skill-card-id"><code>{skill.id}</code></span>
                          <span className="skill-card-name">{skill.name}</span>
                          {isDraft && <span className="skill-card-draft-badge">{L('borrador', 'draft')}</span>}
                          {!isDraft && !isEnabled && <span className="skill-card-off-badge">{L('apagado', 'off')}</span>}
                        </button>
                      </div>
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
                            <span className="skill-field-label">{L('nombre', 'name')}</span>
                            <input
                              type="text"
                              className="skill-field-input"
                              value={skill.name}
                              onChange={(e) => handleUpdateSkill(skill.id, { name: e.target.value })}
                              disabled={loading}
                            />
                          </label>
                          <label className="skill-field">
                            <span className="skill-field-label">{L('descripción (esto va al AGENTS.md)', 'description (this goes into AGENTS.md)')}</span>
                            <textarea
                              className="skill-field-input skill-field-textarea-sm"
                              value={skill.description}
                              onChange={(e) => handleUpdateSkill(skill.id, { description: e.target.value })}
                              disabled={loading}
                              rows={2}
                            />
                          </label>
                          <label className="skill-field">
                            <span className="skill-field-label">{L('body (lo que recibe la IA cuando hace load_skill)', 'body (what the AI receives when it calls load_skill)')}</span>
                            <textarea
                              className="skill-field-input skill-field-textarea-lg"
                              value={skill.body}
                              onChange={(e) => handleUpdateSkill(skill.id, { body: e.target.value })}
                              disabled={loading}
                              rows={10}
                            />
                          </label>
                          {isDraft ? (
                            <>
                              <div className="ctx-tip skill-draft-tip">
                                💡 {L('Este skill está en', 'This skill is in')} <b>{L('borrador', 'draft')}</b>: <b>{L('no viaja al prompt', "it doesn't travel to the prompt")}</b> {L('todavía. Terminá de editar id/nombre/descripción/body y tocá', 'yet. Finish editing id/name/description/body and hit')} <b>{L('Agregar a la lista', 'Add to the list')}</b>.
                              </div>
                              <div className="skill-card-actions">
                                <button
                                  type="button"
                                  className="docs-link skill-delete-btn"
                                  onClick={() => handleDiscardDraftSkill(skill.id)}
                                  disabled={loading}
                                >
                                  {L('descartar', 'discard')}
                                </button>
                                <button
                                  type="button"
                                  className="skill-confirm-btn"
                                  onClick={() => handleConfirmDraftSkill(skill.id)}
                                  disabled={loading}
                                  title={L('Confirma el skill y lo agrega a la lista. A partir de acá, si está tildado, viaja al system prompt en la próxima corrida CON AGENTS.md.', 'Confirms the skill and adds it to the list. From here on, if checked, it travels to the system prompt on the next run WITH AGENTS.md.')}
                                >
                                  ✓ {L('Agregar a la lista', 'Add to the list')}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="skill-card-actions">
                              <button
                                type="button"
                                className="docs-link skill-delete-btn"
                                onClick={() => handleDeleteSkill(skill.id)}
                                disabled={loading}
                              >
                                {L('eliminar', 'delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="skills-actions">
                <button
                  type="button"
                  className="skill-add-btn"
                  onClick={handleAddSkill}
                  disabled={loading}
                  title={L('Crea un skill en BORRADOR. Editá id/nombre/descripción/body y tocá \'Agregar a la lista\' para confirmarlo. Hasta entonces no viaja al prompt.', 'Creates a DRAFT skill. Edit id/name/description/body and hit \'Add to the list\' to confirm it. Until then it doesn\'t travel to the prompt.')}
                >
                  {L('+ Nuevo skill (borrador)', '+ New skill (draft)')}
                </button>
                <button
                  type="button"
                  className="docs-link"
                  onClick={() => { setSkills(DEFAULT_SKILLS); setExpandedSkillId(null); appendLog('info', L('Skills reseteados al ejemplo de fábrica', 'Skills reset to the factory sample')) }}
                  disabled={loading}
                >
                  {L('reset al ejemplo', 'reset to sample')}
                </button>
              </div>
            </div>
          </details>
          )}

          <details className="docs-collapsible base-prompt-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🔧 {L('System prompt BASE del agente (antes del AGENTS.md)', "Agent's BASE system prompt (before the AGENTS.md)")}</span>
            </summary>
            <div className="docs-collapsible-body">
              <div className="ctx-tip" style={{ marginTop: 0 }}>
                💡 {L('Esto es lo que el agente recibe SIEMPRE, además de tu AGENTS.md. Define cómo usa las herramientas base', 'This is what the agent receives ALWAYS, on top of your AGENTS.md. It defines how it uses the base tools')} (<code>read_code</code> {L('y', 'and')}{' '}
                <code>edit_code</code>). {L('Cuando enviás CON AGENTS.md, se agrega', 'When you send WITH AGENTS.md, it adds')}{' '}
                <code>assess_impact</code> {L('y la aprobación humana antes de editar. Read-only, no se puede modificar desde la UI.', 'and human approval before editing. Read-only, it can\'t be modified from the UI.')}
              </div>
              <pre className="base-prompt-body">{AGENT_SYSTEM_PROMPT}</pre>
            </div>
          </details>
        </section>

        <div
          className="col-resizer"
          onMouseDown={startResize(0)}
          onDoubleClick={handleResetCols}
          title={L('Arrastrá para redimensionar · doble clic = reset', 'Drag to resize · double-click = reset')}
        />

        {/* Panel 2 — Código + Prompt + Timeline */}
        <section className="panel instr-panel">
          <div className="panel-title">
            <span>{L('Código + instrucción', 'Code + instruction')}</span>
            <span className={`provider-badge provider-badge-${provider}`}>
              {provider === 'anthropic'
                ? '🟠 Claude'
                : provider === 'lmstudio'
                  ? '🔵 LM Studio'
                  : '🟢 OpenAI'}
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
              <div className="suggested-steps-title">{L('Sugerencias rápidas — clic para cargar (si tenés algo escrito, te pide confirmación):', 'Quick suggestions — click to load (if you have something written, it asks for confirmation):')}</div>
              <ol className="suggested-steps-list">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="suggested-step-btn"
                      onClick={() => {
                        const current = instruction.trim()
                        const isSuggestion = SUGGESTED_PROMPTS.some((s) => s.trim() === current)
                        if (current && !isSuggestion) {
                          const ok = window.confirm(L(
                            `Ya escribiste algo en el chat:\n\n"${current.slice(0, 100)}${current.length > 100 ? '…' : ''}"\n\n¿Pisarlo con la sugerencia?`,
                            `You already wrote something in the chat:\n\n"${current.slice(0, 100)}${current.length > 100 ? '…' : ''}"\n\nOverwrite it with the suggestion?`,
                          ))
                          if (!ok) return
                        }
                        setInstruction(p)
                      }}
                      disabled={loading}
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <label className="instr-input-label">
              <span className="instr-input-label-text">
                ✍️ {L('Chat — escribí tu propia instrucción (este texto es el que se va a enviar)', 'Chat — write your own instruction (this text is what gets sent)')}
              </span>
              <textarea
                className="instr-input"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={L('¿Qué querés que haga el agente? Podés escribir libremente acá.', 'What do you want the agent to do? You can write freely here.')}
                disabled={loading}
                style={{ minHeight: 96 }}
              />
            </label>
            {/*
              Toggle del sub-tema "skill" del AGENTS.md.
              Solo modula el botón CON AGENTS.md (sin AGENTS.md no hay skills, igual
              que en el resto de la conceptualización: skill es subtema de AGENTS.md).
            */}
            {withSkills && (
              <label className="skill-toggle" title={L('Si está activo, la IA recibe las tools load_skill y run_skill_test cuando enviás CON AGENTS.md.', 'When active, the AI receives the load_skill and run_skill_test tools when you send WITH AGENTS.md.')}>
                <input
                  type="checkbox"
                  checked={skillEnabled}
                  onChange={(e) => setSkillEnabled(e.target.checked)}
                  disabled={loading}
                />
                <span className="skill-toggle-label">
                  <b>🧪 Skills</b>
                  <span className="skill-toggle-meta">
                    {(() => {
                      if (!skillEnabled) return L('apagados — la IA va a usar AGENTS.md pero sin tools de skill', 'off — the AI will use AGENTS.md but without skill tools')
                      const confirmados = skills.filter((s) => !s.draft)
                      const tildados = confirmados.filter((s) => s.enabled !== false).length
                      const borradores = skills.length - confirmados.length
                      const borradorNote = borradores > 0 ? L(` · ${borradores} borrador no agregado`, ` · ${borradores} draft not added`) : ''
                      if (tildados === 0) return L(
                        `0 tildados de ${confirmados.length}${borradorNote} — tildá un skill en el panel AGENTS.md para que viaje al prompt`,
                        `0 checked of ${confirmados.length}${borradorNote} — check a skill in the AGENTS.md panel so it travels to the prompt`,
                      )
                      return L(
                        `${tildados} tildado(s) de ${confirmados.length}${borradorNote} — solo los tildados viajan al prompt cuando enviás CON AGENTS.md`,
                        `${tildados} checked of ${confirmados.length}${borradorNote} — only the checked ones travel to the prompt when you send WITH AGENTS.md`,
                      )
                    })()}
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
                      ? L('AGENTS.md inyectado + tools de skill (load_skill, run_skill_test) habilitadas. La IA debería autoverificar después de editar.', 'AGENTS.md injected + skill tools (load_skill, run_skill_test) enabled. The AI should self-verify after editing.')
                      : L('AGENTS.md inyectado, pero el toggle de skills está apagado: la IA no recibe tools de skill.', 'AGENTS.md injected, but the skills toggle is off: the AI doesn\'t receive skill tools.'))
                    : L('AGENTS.md inyectado en el system prompt. Sin skills (estás en el modo solo AGENTS.md).', 'AGENTS.md injected into the system prompt. No skills (you\'re in AGENTS.md-only mode).')
                }
              >
                {loading && lastMode === 'with'
                  ? L('Trabajando…', 'Working…')
                  : `✅ ${L('Enviar CON AGENTS.md', 'Send WITH AGENTS.md')}${withSkills && skillEnabled ? ' + 🧪 skill' : ''}`}
              </button>
              <button
                type="button"
                onClick={() => handleSend(false)}
                disabled={loading || !instruction.trim()}
                className="instr-apply-btn"
                title={L('Manda la instrucción sin incluir el AGENTS.md — solo el system base del agente. Los skills tampoco aplican (son sub-tema de AGENTS.md).', 'Sends the instruction without including AGENTS.md — only the agent\'s base system. Skills don\'t apply either (they\'re a sub-topic of AGENTS.md).')}
              >
                {loading && lastMode === 'without' ? L('Trabajando…', 'Working…') : `❌ ${L('Enviar SIN AGENTS.md', 'Send WITHOUT AGENTS.md')}`}
              </button>
            </div>

            {pendingApproval && (
              <div ref={approvalRef} className={`approval-banner approval-${pendingApproval.level}`}>
                <div className="approval-header">
                  <span className="approval-badge">
                    {pendingApproval.level === 'low' && L('🟢 Impacto BAJO', '🟢 LOW impact')}
                    {pendingApproval.level === 'medium' && L('🟡 Impacto MEDIO', '🟡 MEDIUM impact')}
                    {pendingApproval.level === 'high' && L('🔴 Impacto ALTO', '🔴 HIGH impact')}
                  </span>
                  <span className="approval-title">{L('El agente pide permiso para editar', 'The agent asks for permission to edit')}</span>
                </div>
                <div className="approval-section">
                  <div className="approval-label">{L('Resumen', 'Summary')}</div>
                  <div className="approval-body">{pendingApproval.summary}</div>
                </div>
                <div className="approval-section">
                  <div className="approval-label">{L('Plan', 'Plan')}</div>
                  <pre className="approval-plan">{pendingApproval.plan}</pre>
                </div>
                <div className="approval-actions">
                  <button
                    type="button"
                    className="instr-send-btn"
                    onClick={() => handleApprovalDecision(true)}
                  >
                    ✓ {L('Proseguir', 'Proceed')}
                  </button>
                  <button
                    type="button"
                    className="instr-apply-btn"
                    onClick={() => handleApprovalDecision(false)}
                  >
                    ✗ {L('Cancelar', 'Cancel')}
                  </button>
                </div>
              </div>
            )}

            {lastMode && !loading && (
              <div className="ctx-tip" style={{ marginTop: 8 }}>
                💡 {L('Última corrida:', 'Last run:')} <b>
                  {lastMode === 'with'
                    ? lastWithSkill ? L('CON AGENTS.md + 🧪 skill', 'WITH AGENTS.md + 🧪 skill') : L('CON AGENTS.md (sin skill)', 'WITH AGENTS.md (no skill)')
                    : L('SIN AGENTS.md', 'WITHOUT AGENTS.md')}
                </b>.
                {' '}{L('El código del editor ya fue actualizado. Probá la otra opción con la misma instrucción', 'The editor code was already updated. Try the other option with the same instruction')}
                {lastMode === 'with' && withSkills && (
                  <> — {L('y, dentro de CON AGENTS.md, prendé/apagá el toggle', 'and, within WITH AGENTS.md, turn the')} <b>🧪 Skills</b> {L('para ver cómo la IA llama (o no) a', 'toggle on/off to see how the AI calls (or not)')} <code>run_skill_test</code> {L('después de editar', 'after editing')}</>
                )}
                .
              </div>
            )}

            {error && <div className="error">{error}</div>}

            <div className="reply-section" style={{ minHeight: 100 }}>
              <div className="reply-header">
                <span>{L('Timeline del agente', 'Agent timeline')}</span>
                <span className="context-meta">
                  {iterCount > 0 ? L(`${iterCount} iteración(es)`, `${iterCount} iteration(s)`) : L('sin actividad', 'no activity')}
                </span>
              </div>
              <div className="reply-content" ref={stepsRef}>
                {Object.keys(stepsByIter).length === 0 && !finalText && (
                  <span className="empty">{L('Mandá una instrucción con uno de los dos botones para ver el efecto del AGENTS.md.', 'Send an instruction with one of the two buttons to see the effect of AGENTS.md.')}</span>
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
                    <div className="agent-final-title">✓ {L('Respuesta final', 'Final response')}</div>
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
          title={L('Arrastrá para redimensionar · doble clic = reset', 'Drag to resize · double-click = reset')}
        />

        {/* Panel 3 — Historial Raw + Log */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>{L('Historial Request/Response', 'Request/Response history')}</span>
            <span className="context-meta">
              {rawHistory.length === 0 ? L('sin actividad', 'no activity') : `${rawHistory.length} req`}
            </span>
          </div>
          <div className="ctx-tip" style={{ marginTop: 0 }}>
            💡 {L('Mirá el campo', 'Look at the')} <code>system</code> {L('de cada request — ahí vas a ver tu AGENTS.md inyectado en cada llamada cuando usás CON AGENTS.md.', 'field of each request — there you\'ll see your AGENTS.md injected on every call when you use WITH AGENTS.md.')}
          </div>

          <div className="raw-history" ref={rawHistoryRef}>
            {rawHistory.length === 0 && (
              <div className="empty" style={{ padding: 12 }}>{L('Sin requests todavía.', 'No requests yet.')}</div>
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
                    <span className="raw-iter-label">{L('Iter', 'Iter')} #{entry.iter}</span>
                    {entry.label && (
                      <span className={`raw-iter-badge raw-iter-badge-${entry.label === 'CON' ? 'with' : 'without'}`}>
                        {entry.label === 'CON' ? L('✅ CON', '✅ WITH') : L('❌ SIN', '❌ WITHOUT')}
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
