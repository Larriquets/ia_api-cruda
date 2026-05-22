import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'

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
 * y devuelve PASS o lista concreta de violaciones.
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
// La columna SIN inyecta esto entero en el system de cada request.
const AGENTS_MD_FAT = `# AGENTS.md (modo fat)

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

// AGENTS.md "indice" — solo lista el skill disponible.
// La columna CON inyecta esto en el system. El body del skill se carga
// despues con load_skill.
const AGENTS_MD_INDEX = `# AGENTS.md

## Reglas obligatorias
- Antes de editar, llama a assess_impact y pedi aprobacion.

## Skills disponibles
- arch-prefijo-bco [test ✓] — convencion de nombres del proyecto.
`

// Unico skill del demo: regla de arquitectura verificable por regex.
const SKILL = {
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

// Aproximaciones de chars del system en cada paso, por columna.
const BASE_SYSTEM_CHARS = 500
const FAT_SYSTEM_CHARS = BASE_SYSTEM_CHARS + AGENTS_MD_FAT.length
const INDEX_SYSTEM_CHARS = BASE_SYSTEM_CHARS + AGENTS_MD_INDEX.length
const SKILL_BODY_CHARS = SKILL.body.length

const WITHOUT_STEPS = [
  {
    at: 0,
    actor: 'user',
    tag: 'user',
    title: 'Usuario',
    body: 'Agrega un metodo retirar(monto).',
    code: INITIAL_CODE,
    highlightLines: [],
    systemChars: 0,
  },
  {
    at: 1,
    actor: 'request',
    tag: 'system',
    title: 'Request',
    body: 'system = base + AGENTS.md FAT',
    note: `Todas las reglas viajan inline. ${FAT_SYSTEM_CHARS} chars de system.`,
    code: INITIAL_CODE,
    highlightLines: [],
    systemChars: FAT_SYSTEM_CHARS,
  },
  {
    at: 2,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'read_code()',
    code: INITIAL_CODE,
    highlightLines: [],
    systemChars: FAT_SYSTEM_CHARS,
  },
  {
    at: 3,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'edit_code(...)',
    note: 'Agrega "retirar(monto)" — sin prefijo bco_. La regla estaba al medio del AGENTS.md y se le paso.',
    code: INITIAL_CODE,
    highlightLines: [],
    systemChars: FAT_SYSTEM_CHARS,
  },
  {
    at: 4,
    actor: 'code',
    tag: 'tool_result',
    title: 'Tu codigo',
    body: 'OK. Codigo actualizado.',
    code: WITHOUT_CODE,
    highlightLines: [7, 8, 9],
    systemChars: FAT_SYSTEM_CHARS,
  },
  {
    at: 5,
    actor: 'ai',
    tag: 'text',
    title: 'IA',
    body: 'Listo, agregue retirar(monto).',
    note: 'Da la corrida por terminada. Nadie verifico la regla — y se violo.',
    code: WITHOUT_CODE,
    highlightLines: [7],
    systemChars: FAT_SYSTEM_CHARS,
  },
]

const WITH_STEPS = [
  {
    at: 0,
    actor: 'user',
    tag: 'user',
    title: 'Usuario',
    body: 'Agrega un metodo retirar(monto).',
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
    body: 'system = base + AGENTS.md INDICE',
    note: `Solo viaja el indice. ${INDEX_SYSTEM_CHARS} chars de system (${FAT_SYSTEM_CHARS - INDEX_SYSTEM_CHARS} chars menos que el fat).`,
    code: INITIAL_CODE,
    highlightLines: [],
    systemChars: INDEX_SYSTEM_CHARS,
    loaded: false,
  },
  {
    at: 2,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'edit_code(...)',
    note: 'Tambien metio "retirar" sin prefijo. Pero esta corrida tiene un skill con test — y la IA lo sabe.',
    code: INITIAL_CODE,
    highlightLines: [],
    systemChars: INDEX_SYSTEM_CHARS,
    loaded: false,
  },
  {
    at: 3,
    actor: 'code',
    tag: 'tool_result',
    title: 'Tu codigo',
    body: 'OK. Codigo actualizado.',
    code: WITH_FAIL_CODE,
    highlightLines: [7, 8, 9],
    systemChars: INDEX_SYSTEM_CHARS,
    loaded: false,
  },
  {
    at: 4,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'run_skill_test("arch-prefijo-bco")',
    note: 'Antes de cerrar la corrida, dispara el test deterministico del skill.',
    code: WITH_FAIL_CODE,
    highlightLines: [7],
    systemChars: INDEX_SYSTEM_CHARS,
    loaded: true,
  },
  {
    at: 5,
    actor: 'code',
    tag: 'tool_result',
    title: 'Test',
    body: 'FAIL: metodo "retirar" no lleva prefijo bco_.',
    note: 'Resultado deterministico. La IA no puede improvisar que paso — tiene que corregir.',
    code: WITH_FAIL_CODE,
    highlightLines: [7],
    systemChars: INDEX_SYSTEM_CHARS + SKILL_BODY_CHARS,
    loaded: true,
    isError: true,
  },
  {
    at: 6,
    actor: 'ai',
    tag: 'tool_use',
    title: 'IA',
    body: 'edit_code(...)',
    note: 'Renombra retirar → bco_retirar.',
    code: WITH_FAIL_CODE,
    highlightLines: [],
    systemChars: INDEX_SYSTEM_CHARS + SKILL_BODY_CHARS,
    loaded: true,
  },
  {
    at: 7,
    actor: 'code',
    tag: 'tool_result',
    title: 'Tu codigo',
    body: 'OK. run_skill_test("arch-prefijo-bco") → PASS.',
    code: WITH_PASS_CODE,
    highlightLines: [7],
    systemChars: INDEX_SYSTEM_CHARS + SKILL_BODY_CHARS,
    loaded: true,
  },
]

const TOTAL_STEPS = 8

const NARRATOR = {
  '-1': {
    title: 'Una sola regla, dos formas de pasarla.',
    body: 'La regla es: "todo metodo public lleva prefijo bco_". A la izquierda esta el skill que la verifica. En el centro corre con AGENTS.md fat (regla escondida entre otras 8). A la derecha corre con skill + test.',
  },
  1: {
    title: 'Diferencia de chars del primer request.',
    body: `Fat = ${FAT_SYSTEM_CHARS} chars. Indice = ${INDEX_SYSTEM_CHARS} chars. El body del skill todavia no viaja en el modo CON.`,
  },
  2: {
    title: 'Las dos editan igual.',
    body: 'Las dos columnas metieron "retirar" sin prefijo. Hasta aca no hay diferencia visible.',
  },
  4: {
    title: 'run_skill_test no es un prompt, es JS.',
    body: 'Es la regex del skill corriendo sobre el archivo. Devuelve PASS o FAIL concreto. Un AGENTS.md por mas largo que sea no te da esto.',
  },
  5: {
    title: 'FAIL verificable.',
    body: 'El test dice exactamente que metodo viola la regla. La IA tiene que corregir y volver a correr.',
  },
  7: {
    title: 'PASS verificable.',
    body: 'La regla quedo cumplida y verificada por codigo. SIN cerro con la regla violada y nadie se entero.',
  },
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

function SystemCharsBadge({ chars, baseline }) {
  if (!chars) {
    return <span className="mag-sys-chars mag-sys-chars-idle">system: — chars</span>
  }
  const tone = baseline && chars > baseline ? 'warn' : 'ok'
  return (
    <span className={`mag-sys-chars mag-sys-chars-${tone}`}>
      system: <b>{chars.toLocaleString('es-AR')}</b> chars
    </span>
  )
}

function RunColumn({ title, subtitle, tone, steps, step, lastAdvanceAt, baselineChars }) {
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
        <SystemCharsBadge chars={systemChars} baseline={baselineChars} />
      </div>
      <div className="mag-timeline">
        {shown.length === 0 && (
          <div className="mag-empty">(todavia no empezo)</div>
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
        <div className="mag-code-label">Codigo en este punto</div>
        <CodeView code={code} highlightLines={highlightLines} />
      </div>
    </div>
  )
}

function SkillPanel({ loaded, fatOpen, setFatOpen }) {
  return (
    <div className="mag-agents-panel">
      <div className="mag-agents-header">
        <h3>AGENTS.md + skill</h3>
        <p>indice corto + 1 skill con test deterministico</p>
      </div>
      <pre className="mag-agents-file mag-agents-file-index">{AGENTS_MD_INDEX}</pre>

      <div className="mag-skills-catalog">
        <div className="mag-skills-catalog-title">Skill del lado CON</div>
        <div className={`mag-skill-card${loaded ? ' is-loaded' : ''}`}>
          <div className="mag-skill-head">
            <code className="mag-skill-id">{SKILL.id}</code>
            <span className="mag-skill-test">test ✓</span>
            <span className={`mag-skill-badge mag-skill-badge-${loaded ? 'loaded' : 'idle'}`}>
              {loaded ? 'cargado en contexto' : 'no cargado'}
            </span>
          </div>
          <div className="mag-skill-desc">{SKILL.description}</div>
          {loaded && (
            <pre className="mag-skill-body">{SKILL.body}</pre>
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
          <span>AGENTS.md FAT (el del lado SIN)</span>
          <span className="mag-fat-chars">{AGENTS_MD_FAT.length} chars inline</span>
        </summary>
        <pre className="mag-agents-file mag-agents-file-fat">{AGENTS_MD_FAT}</pre>
      </details>

      <div className="mag-agents-foot">
        El body del skill NO viaja en el system. Solo entra al contexto cuando
        la IA llama load_skill(id) o run_skill_test(id). El test vive en codigo,
        no en prompt.
      </div>
    </div>
  )
}

function isSkillLoaded(step) {
  const withStep = latestStep(WITH_STEPS, step)
  return Boolean(withStep?.loaded)
}

export default function ModosAgentsMdSkills() {
  const [step, setStep] = useState(-1)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [lastAdvanceAt, setLastAdvanceAt] = useState(0)
  const [fatOpen, setFatOpen] = useState(false)
  const autoTimerRef = useRef(null)

  const isFresh = step < 0
  const isDone = step >= TOTAL_STEPS - 1
  const narrator = NARRATOR[String(step)] || null
  const loaded = isSkillLoaded(step)

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
            Una regla, dos formas: inline vs skill con test
          </span>
        </h1>
        <a href="/" className="clear-btn">Volver</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label="Navegacion de demos">
          <DocsNav current="demo-agents-md-skills" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">Para que sirve esta pagina</div>
            <p>
              Compara dos corridas mockeadas. Mismo agente, misma tarea, misma
              regla: <i>"todo metodo public lleva prefijo bco_"</i>. La diferencia
              es si la regla viaja como texto entre otras 8 reglas o como un
              skill con <code>run_skill_test</code>.
            </p>
          </div>
        </aside>

        <div className="docs-main">
          <section className="criollo-section" id="intro">
            <h2>La pregunta</h2>
            <p>
              Si la regla esta en el <code>AGENTS.md</code>, no alcanza? La
              IA la lee y la cumple, no? Bueno: <b>no siempre</b>. Una regla
              entre otras 8 se diluye. Y nadie verifica si se cumplio.
            </p>
            <div className="prov-callout">
              <p>
                Prompt fijo: <i>"Agrega un metodo retirar(monto)."</i> La regla
                en juego es: <b>todo metodo public tiene que arrancar con bco_</b>.
                Mirala caer en la columna del medio y mirala cumplirse en la de
                la derecha gracias al test deterministico.
              </p>
            </div>
          </section>

          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">Paso:</span>
                <span className="ce-progress-now">{isFresh ? 0 : step + 1}</span>
                <span className="mch-progress-meta">de {TOTAL_STEPS}</span>
                <span className="mch-progress-meta">
                  {isFresh && '- toca Empezar para comparar'}
                  {!isFresh && !isDone && '- comparacion en curso'}
                  {isDone && '- comparacion completa'}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                >
                  {isFresh ? 'Empezar' : 'Siguiente'}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={goBack}
                  disabled={isFresh || autoPlaying}
                >
                  Atras
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((value) => !value)}
                  disabled={isDone}
                >
                  {autoPlaying ? 'Pausar' : 'Auto'}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={isFresh && !autoPlaying}
                >
                  Reiniciar
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
              />
              <RunColumn
                title="SIN skills (AGENTS.md FAT)"
                subtitle="la regla viaja entre otras 8 reglas"
                tone="without"
                steps={WITHOUT_STEPS}
                step={step}
                lastAdvanceAt={lastAdvanceAt}
                baselineChars={INDEX_SYSTEM_CHARS}
              />
              <RunColumn
                title="CON skill (indice + test)"
                subtitle="1 skill con run_skill_test"
                tone="with"
                steps={WITH_STEPS}
                step={step}
                lastAdvanceAt={lastAdvanceAt}
                baselineChars={INDEX_SYSTEM_CHARS}
              />
            </div>
          </section>

          <section className="criollo-section">
            <div className={`ce-narrator${narrator ? ' ce-narrator-active' : ''}`}>
              <div className="ce-narrator-step">
                {isFresh
                  ? 'PASO 0 - listo para empezar'
                  : `PASO ${step + 1} de ${TOTAL_STEPS} - ${stepSummary(step)}`}
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
              <h2>Lo que importa</h2>
              <ol>
                <li>
                  <b>Una regla en prosa no es una regla verificada.</b> En el
                  modo FAT, la regla del prefijo <code>bco_</code> viajo en el
                  system pero la IA igual la violo — y nadie se entero.
                </li>
                <li>
                  <b>run_skill_test es codigo, no prompt.</b> Una regex sobre
                  el archivo devolvio FAIL concreto con el nombre del metodo
                  violatorio. La IA no puede improvisar que cumplio: el test
                  manda.
                </li>
                <li>
                  <b>Costo de tokens.</b> El primer request del modo CON fue{' '}
                  {INDEX_SYSTEM_CHARS} chars vs {FAT_SYSTEM_CHARS} del modo FAT.
                  El body del skill recien entro al contexto cuando el test
                  fallo.
                </li>
              </ol>
              <div className="ce-closing-ctas">
                <a href="/agents-md-skills" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">S</span>
                  <span>
                    <b>Ver el modo real editable</b>
                    <span className="ce-closing-cta-sub">/agents-md-skills</span>
                  </span>
                </a>
                <a href="/demo/agents-md" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">A</span>
                  <span>
                    <b>Volver al demo de AGENTS.md base</b>
                    <span className="ce-closing-cta-sub">/demo/agents-md</span>
                  </span>
                </a>
                <a href="/demo/loop" className="ce-closing-cta">
                  <span className="ce-closing-cta-emoji">L</span>
                  <span>
                    <b>Ver como se ejecutan las tools</b>
                    <span className="ce-closing-cta-sub">/demo/loop</span>
                  </span>
                </a>
              </div>
            </section>
          )}

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">Volver</a>
          </footer>
        </div>
      </div>
    </div>
  )
}

function stepSummary(step) {
  if (step === 0) return 'misma consigna para las dos corridas'
  if (step === 1) return 'fat manda todo inline; indice solo el catalogo'
  if (step === 2) return 'ambas editan y meten "retirar" sin prefijo'
  if (step === 3) return 'ambas tienen el codigo con la regla violada'
  if (step === 4) return 'CON dispara run_skill_test'
  if (step === 5) return 'FAIL deterministico — hay que corregir'
  if (step === 6) return 'CON renombra retirar → bco_retirar'
  if (step === 7) return 'PASS — la regla quedo verificada'
  return 'comparacion completa'
}
