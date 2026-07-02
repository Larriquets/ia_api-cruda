import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import SpeechReader from './SpeechReader.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/agents-md-skills
 *
 * Comparador guiado entre dos formas de pasar UNA regla del proyecto:
 *  - SIN skills: AGENTS.md "fat" — la regla viaja inline junto a otras 8 reglas.
 *    El system es pesado y la regla puntual se diluye entre el ruido.
 *  - CON skills: AGENTS.md actua como indice. El cuerpo del skill NO viaja en
 *    el system hasta que la IA llama load_skill(id). Y mas importante:
 *    run_skill_test(id) verifica la regla con codigo JS deterministico.
 *
 * El skill unico es un TEST DE ARQUITECTURA: todo metodo public de la clase
 * tiene que llevar el prefijo "bco_". El test corre regex sobre el archivo
 * y devuelve PASS o lista concreta de violaciones. Bilingue ES/EN.
 */

const INITIAL_CODE = `public class CuentaBancaria {
    private double saldo;

    public void bco_depositar(double monto) {
        saldo += monto;
    }
}`

// Resultado SIN skills: la IA agrego "retirar" sin prefijo bco_.
// Cumple la consigna pero viola la regla de arquitectura.
const WITHOUT_CODE = `public class CuentaBancaria {
    private double saldo;

    public void bco_depositar(double monto) {
        saldo += monto;
    }

    public void retirar(double monto) {
        saldo -= monto;
    }
}`

// CON skills, primer intento (FAIL): la IA edito igual sin prefijo.
const WITH_FAIL_CODE = WITHOUT_CODE

// CON skills, despues del fix (PASS): renombro a bco_retirar.
const WITH_PASS_CODE = `public class CuentaBancaria {
    private double saldo;

    public void bco_depositar(double monto) {
        saldo += monto;
    }

    public void bco_retirar(double monto) {
        saldo -= monto;
    }
}`

// AGENTS.md "fat" — la regla del prefijo aparece entre otras 7 reglas.
// La columna SIN inyecta esto entero en el system de cada request. Bilingue.
const AGENTS_MD_FAT_ES = `# AGENTS.md (modo fat)

## Convenciones obligatorias del proyecto Banco
- Antes de editar, llama a assess_impact y pedi aprobacion humana.
- Rechaza montos invalidos con IllegalArgumentException.
- Toda clase de dominio (Cuenta, Cliente, Movimiento) vive en com.banco.
- Sin strings hardcoded: literales con mas de 1 caracter en una constante.
- Sin numeros magicos: literales distintos de 0/1/-1 en private static final.
- Metodos cortos: maximo 15 lineas por metodo.

## Convencion de nombres
- Todo metodo public de la clase debe llevar el prefijo bco_ en su nombre.
- Ejemplos: bco_depositar, bco_retirar, bco_transferir.

## Reglas de seguridad
- No exponer el saldo crudo: siempre via getSaldo().
- No usar System.out.println en codigo productivo.
- La respuesta final con forma de Conventional Commit.
`

const AGENTS_MD_FAT_EN = `# AGENTS.md (fat mode)

## Mandatory conventions for the Banco project
- Before editing, call assess_impact and ask for human approval.
- Reject invalid amounts with IllegalArgumentException.
- Every domain class (Cuenta, Cliente, Movimiento) lives in com.banco.
- No hardcoded strings: literals with more than 1 char go in a constant.
- No magic numbers: literals other than 0/1/-1 in private static final.
- Short methods: maximum 15 lines per method.

## Naming convention
- Every public method of the class must carry the bco_ prefix in its name.
- Examples: bco_depositar, bco_retirar, bco_transferir.

## Security rules
- Don't expose the raw balance: always via getSaldo().
- Don't use System.out.println in production code.
- The final response in Conventional Commit shape.
`

// AGENTS.md "indice" — solo lista el skill disponible.
// La columna CON inyecta esto en el system. El body del skill se carga
// despues con load_skill.
const AGENTS_MD_INDEX_ES = `# AGENTS.md

## Reglas obligatorias
- Antes de editar, llama a assess_impact y pedi aprobacion.

## Skills disponibles
- arch-prefijo-bco [test ✓] — convencion de nombres del proyecto.
`

const AGENTS_MD_INDEX_EN = `# AGENTS.md

## Mandatory rules
- Before editing, call assess_impact and ask for approval.

## Available skills
- arch-prefijo-bco [test ✓] — project naming convention.
`

// Unico skill del demo: regla de arquitectura verificable por regex.
const SKILL_ES = {
  id: 'arch-prefijo-bco',
  name: 'Convencion de nombres',
  hasTest: true,
  description: 'Todo metodo public de la clase debe arrancar con bco_.',
  body: `# Skill: arch-prefijo-bco (test de arquitectura)

Todo metodo public de la clase debe llevar el prefijo "bco_" en su nombre.

## Test deterministico
run_skill_test("arch-prefijo-bco") corre la siguiente regex sobre el archivo:

    /public\\s+\\w+\\s+(\\w+)\\s*\\(/g

Para cada metodo capturado, verifica que el nombre arranque con "bco_".
Si alguno no cumple, devuelve FAIL con la lista de nombres violatorios.

## Ejemplos
- OK:   public void bco_retirar(double monto)
- FAIL: public void retirar(double monto)
- OK:   public double getSaldo()  → (no aplica: getter, sin parametros)`,
}

const SKILL_EN = {
  id: 'arch-prefijo-bco',
  name: 'Naming convention',
  hasTest: true,
  description: 'Every public method of the class must start with bco_.',
  body: `# Skill: arch-prefijo-bco (architecture test)

Every public method of the class must carry the "bco_" prefix in its name.

## Deterministic test
run_skill_test("arch-prefijo-bco") runs the following regex over the file:

    /public\\s+\\w+\\s+(\\w+)\\s*\\(/g

For each captured method, it checks that the name starts with "bco_".
If any doesn't, it returns FAIL with the list of violating names.

## Examples
- OK:   public void bco_retirar(double monto)
- FAIL: public void retirar(double monto)
- OK:   public double getSaldo()  → (n/a: getter, no parameters)`,
}

// Aproximaciones de chars del system base (neutro respecto del idioma).
const BASE_SYSTEM_CHARS = 500

function buildWithoutSteps(L, fatSystemChars) {
  return [
    {
      at: 0,
      actor: 'user',
      tag: 'user',
      title: L('Usuario', 'User'),
      body: L('Agrega un metodo retirar(monto).', 'Add a retirar(monto) method.'),
      code: INITIAL_CODE,
      highlightLines: [],
      systemChars: 0,
    },
    {
      at: 1,
      actor: 'request',
      tag: 'system',
      title: 'Request',
      body: L('system = base + AGENTS.md FAT', 'system = base + FAT AGENTS.md'),
      note: L(`Todas las reglas viajan inline. ${fatSystemChars} chars de system.`, `All rules travel inline. ${fatSystemChars} chars of system.`),
      code: INITIAL_CODE,
      highlightLines: [],
      systemChars: fatSystemChars,
    },
    {
      at: 2,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'read_code()',
      code: INITIAL_CODE,
      highlightLines: [],
      systemChars: fatSystemChars,
    },
    {
      at: 3,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'edit_code(...)',
      note: L('Agrega "retirar(monto)" — sin prefijo bco_. La regla estaba al medio del AGENTS.md y se le paso.', 'Adds "retirar(monto)" — no bco_ prefix. The rule was in the middle of the AGENTS.md and it missed it.'),
      code: INITIAL_CODE,
      highlightLines: [],
      systemChars: fatSystemChars,
    },
    {
      at: 4,
      actor: 'code',
      tag: 'tool_result',
      title: L('Tu codigo', 'Your code'),
      body: L('OK. Codigo actualizado.', 'OK. Code updated.'),
      code: WITHOUT_CODE,
      highlightLines: [7, 8, 9],
      systemChars: fatSystemChars,
    },
    {
      at: 5,
      actor: 'ai',
      tag: 'text',
      title: L('IA', 'AI'),
      body: L('Listo, agregue retirar(monto).', 'Done, I added retirar(monto).'),
      note: L('Da la corrida por terminada. Nadie verifico la regla — y se violo.', 'It calls the run finished. Nobody checked the rule — and it got violated.'),
      code: WITHOUT_CODE,
      highlightLines: [7],
      systemChars: fatSystemChars,
    },
  ]
}

function buildWithSteps(L, { indexSystemChars, fatSystemChars, skillBodyChars }) {
  return [
    {
      at: 0,
      actor: 'user',
      tag: 'user',
      title: L('Usuario', 'User'),
      body: L('Agrega un metodo retirar(monto).', 'Add a retirar(monto) method.'),
      code: INITIAL_CODE,
      highlightLines: [],
      systemChars: 0,
      loaded: false,
    },
    {
      at: 1,
      actor: 'request',
      tag: 'system',
      title: 'Request',
      body: L('system = base + AGENTS.md INDICE', 'system = base + INDEX AGENTS.md'),
      note: L(`Solo viaja el indice. ${indexSystemChars} chars de system (${fatSystemChars - indexSystemChars} chars menos que el fat).`, `Only the index travels. ${indexSystemChars} chars of system (${fatSystemChars - indexSystemChars} chars less than the fat one).`),
      code: INITIAL_CODE,
      highlightLines: [],
      systemChars: indexSystemChars,
      loaded: false,
    },
    {
      at: 2,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'edit_code(...)',
      note: L('Tambien metio "retirar" sin prefijo. Pero esta corrida tiene un skill con test — y la IA lo sabe.', 'It also added "retirar" with no prefix. But this run has a skill with a test — and the AI knows it.'),
      code: INITIAL_CODE,
      highlightLines: [],
      systemChars: indexSystemChars,
      loaded: false,
    },
    {
      at: 3,
      actor: 'code',
      tag: 'tool_result',
      title: L('Tu codigo', 'Your code'),
      body: L('OK. Codigo actualizado.', 'OK. Code updated.'),
      code: WITH_FAIL_CODE,
      highlightLines: [7, 8, 9],
      systemChars: indexSystemChars,
      loaded: false,
    },
    {
      at: 4,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'run_skill_test("arch-prefijo-bco")',
      note: L('Antes de cerrar la corrida, dispara el test deterministico del skill.', 'Before closing the run, it fires the skill\'s deterministic test.'),
      code: WITH_FAIL_CODE,
      highlightLines: [7],
      systemChars: indexSystemChars,
      loaded: true,
    },
    {
      at: 5,
      actor: 'code',
      tag: 'tool_result',
      title: 'Test',
      body: L('FAIL: metodo "retirar" no lleva prefijo bco_.', 'FAIL: method "retirar" has no bco_ prefix.'),
      note: L('Resultado deterministico. La IA no puede improvisar que paso — tiene que corregir.', "Deterministic result. The AI can't improvise that it passed — it has to fix it."),
      code: WITH_FAIL_CODE,
      highlightLines: [7],
      systemChars: indexSystemChars + skillBodyChars,
      loaded: true,
      isError: true,
    },
    {
      at: 6,
      actor: 'ai',
      tag: 'tool_use',
      title: L('IA', 'AI'),
      body: 'edit_code(...)',
      note: L('Renombra retirar → bco_retirar.', 'Renames retirar → bco_retirar.'),
      code: WITH_FAIL_CODE,
      highlightLines: [],
      systemChars: indexSystemChars + skillBodyChars,
      loaded: true,
    },
    {
      at: 7,
      actor: 'code',
      tag: 'tool_result',
      title: L('Tu codigo', 'Your code'),
      body: 'OK. run_skill_test("arch-prefijo-bco") → PASS.',
      code: WITH_PASS_CODE,
      highlightLines: [7],
      systemChars: indexSystemChars + skillBodyChars,
      loaded: true,
    },
  ]
}

const TOTAL_STEPS = 8

function buildNarrator(L, { fatSystemChars, indexSystemChars }) {
  return {
    '-1': {
      title: L('Una sola regla, dos formas de pasarla.', 'A single rule, two ways to pass it.'),
      body: L('La regla es: "todo metodo public lleva prefijo bco_". A la izquierda esta el skill que la verifica. En el centro corre con AGENTS.md fat (regla escondida entre otras 8). A la derecha corre con skill + test.', 'The rule is: "every public method carries the bco_ prefix". On the left is the skill that verifies it. In the center it runs with a fat AGENTS.md (rule hidden among 8 others). On the right it runs with skill + test.'),
    },
    1: {
      title: L('Diferencia de chars del primer request.', 'Char difference in the first request.'),
      body: L(`Fat = ${fatSystemChars} chars. Indice = ${indexSystemChars} chars. El body del skill todavia no viaja en el modo CON.`, `Fat = ${fatSystemChars} chars. Index = ${indexSystemChars} chars. The skill body doesn't travel yet in the WITH mode.`),
    },
    2: {
      title: L('Las dos editan igual.', 'Both edit the same.'),
      body: L('Las dos columnas metieron "retirar" sin prefijo. Hasta aca no hay diferencia visible.', 'Both columns added "retirar" with no prefix. So far there\'s no visible difference.'),
    },
    4: {
      title: L('run_skill_test no es un prompt, es JS.', "run_skill_test isn't a prompt, it's JS."),
      body: L('Es la regex del skill corriendo sobre el archivo. Devuelve PASS o FAIL concreto. Un AGENTS.md por mas largo que sea no te da esto.', "It's the skill's regex running over the file. It returns a concrete PASS or FAIL. A longer AGENTS.md won't give you this."),
    },
    5: {
      title: L('FAIL verificable.', 'Verifiable FAIL.'),
      body: L('El test dice exactamente que metodo viola la regla. La IA tiene que corregir y volver a correr.', 'The test says exactly which method violates the rule. The AI has to fix it and run again.'),
    },
    7: {
      title: L('PASS verificable.', 'Verifiable PASS.'),
      body: L('La regla quedo cumplida y verificada por codigo. SIN cerro con la regla violada y nadie se entero.', 'The rule ended up met and verified by code. WITHOUT closed with the rule violated and nobody noticed.'),
    },
  }
}

function latestStep(steps, step) {
  return steps.filter((item) => item.at <= step).at(-1) || null
}

function visibleSteps(steps, step) {
  return steps.filter((item) => item.at <= step)
}

function CodeView({ code, highlightLines }) {
  return (
    <pre className="mag-code">
      {code.split('\n').map((line, index) => {
        const lineNo = index + 1
        const highlighted = highlightLines.includes(lineNo)
        return (
          <span key={lineNo} className={`mag-code-line${highlighted ? ' is-highlighted' : ''}`}>
            <span className="mag-code-lineno">{String(lineNo).padStart(2, ' ')}</span>
            <span className="mag-code-text">{line || ' '}</span>
          </span>
        )
      })}
    </pre>
  )
}

function AgentBubble({ item, isNew }) {
  return (
    <div className={`mag-bubble mag-bubble-${item.actor}${item.isError ? ' mag-bubble-error' : ''}${isNew ? ' is-new' : ''}`}>
      <div className="mag-bubble-head">
        <span className="mag-bubble-title">{item.title}</span>
        <span className={`mag-bubble-tag mag-bubble-tag-${item.tag}`}>{item.tag}</span>
      </div>
      <div className="mag-bubble-body">
        <code>{item.body}</code>
      </div>
      {item.note && <div className="mag-bubble-note">{item.note}</div>}
    </div>
  )
}

function SystemCharsBadge({ chars, baseline, lang }) {
  if (!chars) {
    return <span className="mag-sys-chars mag-sys-chars-idle">system: — chars</span>
  }
  const tone = baseline && chars > baseline ? 'warn' : 'ok'
  return (
    <span className={`mag-sys-chars mag-sys-chars-${tone}`}>
      system: <b>{chars.toLocaleString(lang === 'en' ? 'en-US' : 'es-AR')}</b> chars
    </span>
  )
}

function RunColumn({ title, subtitle, tone, steps, step, lastAdvanceAt, baselineChars, codeLabel, emptyLabel, lang }) {
  const shown = visibleSteps(steps, step)
  const latest = latestStep(steps, step)
  const code = latest?.code ?? INITIAL_CODE
  const highlightLines = latest?.highlightLines ?? []
  const systemChars = latest?.systemChars ?? 0
  const justAdvanced = lastAdvanceAt && Date.now() - lastAdvanceAt < 1400

  return (
    <div className={`mag-run mag-run-${tone}`}>
      <div className="mag-run-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <SystemCharsBadge chars={systemChars} baseline={baselineChars} lang={lang} />
      </div>
      <div className="mag-timeline">
        {shown.length === 0 && (
          <div className="mag-empty">{emptyLabel}</div>
        )}
        {shown.map((item, index) => (
          <AgentBubble
            key={`${item.at}-${item.tag}-${index}`}
            item={item}
            isNew={index === shown.length - 1 && justAdvanced}
          />
        ))}
      </div>
      <div className="mag-code-wrap">
        <div className="mag-code-label">{codeLabel}</div>
        <CodeView code={code} highlightLines={highlightLines} />
      </div>
    </div>
  )
}

function SkillPanel({ loaded, fatOpen, setFatOpen, agentsMdIndex, agentsMdFat, skill, L }) {
  return (
    <div className="mag-agents-panel">
      <div className="mag-agents-header">
        <h3>AGENTS.md + skill</h3>
        <p>{L('indice corto + 1 skill con test deterministico', 'short index + 1 skill with a deterministic test')}</p>
      </div>
      <pre className="mag-agents-file mag-agents-file-index">{agentsMdIndex}</pre>

      <div className="mag-skills-catalog">
        <div className="mag-skills-catalog-title">{L('Skill del lado CON', 'Skill on the WITH side')}</div>
        <div className={`mag-skill-card${loaded ? ' is-loaded' : ''}`}>
          <div className="mag-skill-head">
            <code className="mag-skill-id">{skill.id}</code>
            <span className="mag-skill-test">test ✓</span>
            <span className={`mag-skill-badge mag-skill-badge-${loaded ? 'loaded' : 'idle'}`}>
              {loaded ? L('cargado en contexto', 'loaded in context') : L('no cargado', 'not loaded')}
            </span>
          </div>
          <div className="mag-skill-desc">{skill.description}</div>
          {loaded && (
            <pre className="mag-skill-body">{skill.body}</pre>
          )}
        </div>
      </div>

      <details
        className="mag-fat-details"
        open={fatOpen}
        onToggle={(e) => setFatOpen(e.currentTarget.open)}
      >
        <summary>
          <span className="mag-fat-chev">{fatOpen ? '▾' : '▸'}</span>
          <span>{L('AGENTS.md FAT (el del lado SIN)', 'FAT AGENTS.md (the WITHOUT side one)')}</span>
          <span className="mag-fat-chars">{agentsMdFat.length} {L('chars inline', 'chars inline')}</span>
        </summary>
        <pre className="mag-agents-file mag-agents-file-fat">{agentsMdFat}</pre>
      </details>

      <div className="mag-agents-foot">
        {L('El body del skill NO viaja en el system. Solo entra al contexto cuando la IA llama load_skill(id) o run_skill_test(id). El test vive en codigo, no en prompt.', "The skill body does NOT travel in the system. It only enters the context when the AI calls load_skill(id) or run_skill_test(id). The test lives in code, not in a prompt.")}
      </div>
    </div>
  )
}

function isSkillLoaded(step, withSteps) {
  const withStep = latestStep(withSteps, step)
  return Boolean(withStep?.loaded)
}

export default function ModosAgentsMdSkills() {
  const { lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const AGENTS_MD_FAT = lang === 'en' ? AGENTS_MD_FAT_EN : AGENTS_MD_FAT_ES
  const AGENTS_MD_INDEX = lang === 'en' ? AGENTS_MD_INDEX_EN : AGENTS_MD_INDEX_ES
  const SKILL = lang === 'en' ? SKILL_EN : SKILL_ES
  const FAT_SYSTEM_CHARS = BASE_SYSTEM_CHARS + AGENTS_MD_FAT.length
  const INDEX_SYSTEM_CHARS = BASE_SYSTEM_CHARS + AGENTS_MD_INDEX.length
  const SKILL_BODY_CHARS = SKILL.body.length

  const WITHOUT_STEPS = buildWithoutSteps(L, FAT_SYSTEM_CHARS)
  const WITH_STEPS = buildWithSteps(L, { indexSystemChars: INDEX_SYSTEM_CHARS, fatSystemChars: FAT_SYSTEM_CHARS, skillBodyChars: SKILL_BODY_CHARS })
  const NARRATOR = buildNarrator(L, { fatSystemChars: FAT_SYSTEM_CHARS, indexSystemChars: INDEX_SYSTEM_CHARS })

  const [step, setStep] = useState(-1)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [lastAdvanceAt, setLastAdvanceAt] = useState(0)
  const [fatOpen, setFatOpen] = useState(false)
  const autoTimerRef = useRef(null)

  const isFresh = step < 0
  const isDone = step >= TOTAL_STEPS - 1
  const narrator = NARRATOR[String(step)] || null
  const loaded = isSkillLoaded(step, WITH_STEPS)

  const advance = () => {
    if (isDone) return
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1))
    setLastAdvanceAt(Date.now())
  }

  const goBack = () => {
    if (isFresh) return
    setStep((current) => current - 1)
    setLastAdvanceAt(0)
  }

  const reset = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoPlaying(false)
    setStep(-1)
    setLastAdvanceAt(0)
  }

  useEffect(() => {
    if (!autoPlaying) return
    if (isDone) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1))
      setLastAdvanceAt(Date.now())
    }, 2300)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, isDone, step])

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/agents-md-skills
          <span className="docs-header-subtitle">
            {L('Una regla, dos formas: inline vs skill con test', 'One rule, two ways: inline vs skill with a test')}
          </span>
        </h1>
        <a href="/" className="clear-btn">{L('Volver', 'Back')}</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={L('Navegacion de demos', 'Demos navigation')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="demo-agents-md-skills" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('Para que sirve esta pagina', "What's this page for?")}</div>
            <p>
              {L('Compara dos corridas mockeadas. Mismo agente, misma tarea, misma regla:', 'Compares two mocked runs. Same agent, same task, same rule:')} <i>{L('"todo metodo public lleva prefijo bco_"', '"every public method carries the bco_ prefix"')}</i>. {L('La diferencia es si la regla viaja como texto entre otras 8 reglas o como un skill con', 'The difference is whether the rule travels as text among 8 other rules or as a skill with')} <code>run_skill_test</code>.
            </p>
          </div>
        </aside>

        <div className="docs-main">
          <section className="criollo-section" id="intro">
            <h2>{L('La pregunta', 'The question')}</h2>
            <p>
              {L('Si la regla esta en el', 'If the rule is in the')} <code>AGENTS.md</code>, {L('no alcanza? La IA la lee y la cumple, no? Bueno:', "isn't that enough? The AI reads it and follows it, right? Well:")} <b>{L('no siempre', 'not always')}</b>. {L('Una regla entre otras 8 se diluye. Y nadie verifica si se cumplio.', 'A rule among 8 others gets diluted. And nobody checks whether it was met.')}
            </p>
            <div className="prov-callout">
              <p>
                {L('Prompt fijo:', 'Fixed prompt:')} <i>{L('"Agrega un metodo retirar(monto)."', '"Add a retirar(monto) method."')}</i> {L('La regla en juego es:', 'The rule in play is:')} <b>{L('todo metodo public tiene que arrancar con bco_', 'every public method has to start with bco_')}</b>. {L('Mirala caer en la columna del medio y mirala cumplirse en la de la derecha gracias al test deterministico.', 'Watch it fall in the middle column and watch it hold in the right one thanks to the deterministic test.')}
              </p>
            </div>
          </section>

          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">{L('Paso:', 'Step:')}</span>
                <span className="ce-progress-now">{isFresh ? 0 : step + 1}</span>
                <span className="mch-progress-meta">{L('de', 'of')} {TOTAL_STEPS}</span>
                <span className="mch-progress-meta">
                  {isFresh && L('- toca Empezar para comparar', '- hit Start to compare')}
                  {!isFresh && !isDone && L('- comparacion en curso', '- comparison in progress')}
                  {isDone && L('- comparacion completa', '- comparison complete')}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                >
                  {isFresh ? L('Empezar', 'Start') : L('Siguiente', 'Next')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={goBack}
                  disabled={isFresh || autoPlaying}
                >
                  {L('Atras', 'Back')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((value) => !value)}
                  disabled={isDone}
                >
                  {autoPlaying ? L('Pausar', 'Pause') : L('Auto', 'Auto')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={isFresh && !autoPlaying}
                >
                  {L('Reiniciar', 'Reset')}
                </button>
              </div>
            </div>
          </section>

          <section className="criollo-section">
            <div className="mag-grid">
              <SkillPanel
                loaded={loaded}
                fatOpen={fatOpen}
                setFatOpen={setFatOpen}
                agentsMdIndex={AGENTS_MD_INDEX}
                agentsMdFat={AGENTS_MD_FAT}
                skill={SKILL}
                L={L}
              />
              <RunColumn
                title={L('SIN skills (AGENTS.md FAT)', 'WITHOUT skills (FAT AGENTS.md)')}
                subtitle={L('la regla viaja entre otras 8 reglas', 'the rule travels among 8 other rules')}
                tone="without"
                steps={WITHOUT_STEPS}
                step={step}
                lastAdvanceAt={lastAdvanceAt}
                baselineChars={INDEX_SYSTEM_CHARS}
                codeLabel={L('Codigo en este punto', 'Code at this point')}
                emptyLabel={L('(todavia no empezo)', "(hasn't started yet)")}
                lang={lang}
              />
              <RunColumn
                title={L('CON skill (indice + test)', 'WITH skill (index + test)')}
                subtitle={L('1 skill con run_skill_test', '1 skill with run_skill_test')}
                tone="with"
                steps={WITH_STEPS}
                step={step}
                lastAdvanceAt={lastAdvanceAt}
                baselineChars={INDEX_SYSTEM_CHARS}
                codeLabel={L('Codigo en este punto', 'Code at this point')}
                emptyLabel={L('(todavia no empezo)', "(hasn't started yet)")}
                lang={lang}
              />
            </div>
          </section>

          <section className="criollo-section">
            <div className={`ce-narrator${narrator ? ' ce-narrator-active' : ''}`}>
              <div className="ce-narrator-step">
                {isFresh
                  ? L('PASO 0 - listo para empezar', 'STEP 0 - ready to start')
                  : `${L('PASO', 'STEP')} ${step + 1} ${L('de', 'of')} ${TOTAL_STEPS} - ${stepSummary(step, L)}`}
              </div>
              {(narrator || NARRATOR['-1']) && (
                <div className="ce-narrator-body">
                  <span className="ce-narrator-arrow">^</span>
                  <span>
                    <b>{(narrator || NARRATOR['-1']).title}</b>{' '}
                    {(narrator || NARRATOR['-1']).body}
                  </span>
                </div>
              )}
            </div>
          </section>

          {isDone && (
            <section className="criollo-section ce-closing" id="cierre">
              <h2>{L('Lo que importa', 'What matters')}</h2>
              <ol>
                <li>
                  <b>{L('Una regla en prosa no es una regla verificada.', 'A prose rule is not a verified rule.')}</b> {L('En el modo FAT, la regla del prefijo', 'In FAT mode, the')} <code>bco_</code> {L('viajo en el system pero la IA igual la violo — y nadie se entero.', 'prefix rule traveled in the system but the AI violated it anyway — and nobody noticed.')}
                </li>
                <li>
                  <b>{L('run_skill_test es codigo, no prompt.', 'run_skill_test is code, not a prompt.')}</b> {L('Una regex sobre el archivo devolvio FAIL concreto con el nombre del metodo violatorio. La IA no puede improvisar que cumplio: el test manda.', 'A regex over the file returned a concrete FAIL with the violating method name. The AI can\'t improvise that it complied: the test rules.')}
                </li>
                <li>
                  <b>{L('Costo de tokens.', 'Token cost.')}</b> {L('El primer request del modo CON fue', 'The first request of the WITH mode was')}{' '}
                  {INDEX_SYSTEM_CHARS} chars {L('vs', 'vs')} {FAT_SYSTEM_CHARS} {L('del modo FAT. El body del skill recien entro al contexto cuando el test fallo.', 'of the FAT mode. The skill body only entered the context when the test failed.')}
                </li>
              </ol>
              <div className="ce-closing-ctas">
                <a href="/agents-md-skills" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">S</span>
                  <span>
                    <b>{L('Ver el modo real editable', 'See the real editable mode')}</b>
                    <span className="ce-closing-cta-sub">/agents-md-skills</span>
                  </span>
                </a>
                <a href="/demo/agents-md" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">A</span>
                  <span>
                    <b>{L('Volver al demo de AGENTS.md base', 'Back to the base AGENTS.md demo')}</b>
                    <span className="ce-closing-cta-sub">/demo/agents-md</span>
                  </span>
                </a>
                <a href="/demo/loop" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">L</span>
                  <span>
                    <b>{L('Ver como se ejecutan las tools', 'See how the tools run')}</b>
                    <span className="ce-closing-cta-sub">/demo/loop</span>
                  </span>
                </a>
              </div>
            </section>
          )}

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">{L('Volver', 'Back')}</a>
          </footer>
        </div>
      </div>
    </div>
  )
}

function stepSummary(step, L) {
  if (step === 0) return L('misma consigna para las dos corridas', 'same prompt for both runs')
  if (step === 1) return L('fat manda todo inline; indice solo el catalogo', 'fat sends everything inline; index only the catalog')
  if (step === 2) return L('ambas editan y meten "retirar" sin prefijo', 'both edit and add "retirar" with no prefix')
  if (step === 3) return L('ambas tienen el codigo con la regla violada', 'both have the code with the rule violated')
  if (step === 4) return L('CON dispara run_skill_test', 'WITH fires run_skill_test')
  if (step === 5) return L('FAIL deterministico — hay que corregir', 'deterministic FAIL — must fix')
  if (step === 6) return L('CON renombra retirar → bco_retirar', 'WITH renames retirar → bco_retirar')
  if (step === 7) return L('PASS — la regla quedo verificada', 'PASS — the rule is now verified')
  return L('comparacion completa', 'comparison complete')
}
