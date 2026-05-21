import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'

/**
 * Comparador animado de los 2 modos del Editor de código:
 *  - Sin contexto:  cada Aplicar manda solo system + userMsg (que adentro
 *                   embebe el código actual + la instrucción). No hay historial.
 *  - Con contexto:  el cliente acumula history[] (user + assistant del turno
 *                   anterior) y lo manda completo en cada Aplicar.
 *
 * El guion son 3 instrucciones encadenadas sobre el mismo archivo Java.
 * Las respuestas de la IA están mockeadas a propósito: la página es
 * pedagógica, no consume API.
 */

const SYSTEM_TEXT = 'Sos un asistente de código. Devolvé únicamente código en un bloque ``` con el lenguaje correspondiente. Sin explicaciones.'

// El archivo inicial. Se va modificando turno a turno.
const INITIAL_CODE = `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }
}`

// Versión del archivo después de "agregar otra clase".
const CODE_AFTER_T1 = `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }
}

public class Cliente {
    private String nombre;

    public Cliente(String nombre) {
        this.nombre = nombre;
    }
}`

// El guion: 3 turnos. `user` es la instrucción que escribe el alumno en el
// textarea de instrucción del Editor. Las respuestas son código (bloques ```).
const SCRIPT = [
  {
    instruction: 'Agregá otra clase llamada Cliente con un nombre.',
    // La respuesta de la IA (siempre es código en un bloque). Lo extraemos con
    // extractCodeBlock y reemplaza el editor.
    replyConContexto: CODE_AFTER_T1,
    replySinContexto: CODE_AFTER_T1,
  },
  {
    instruction: 'Sumale a esa clase un método saludar() que imprima el nombre.',
    // CON contexto: la IA "se acuerda" que la clase nueva se llama Cliente y
    // que el método saludar() es sobre Cliente.
    replyConContexto: `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }
}

public class Cliente {
    private String nombre;

    public Cliente(String nombre) {
        this.nombre = nombre;
    }

    public void saludar() {
        System.out.println("Hola, soy " + nombre);
    }
}`,
    // SIN contexto: la IA no sabe qué clase es "esa clase". Se la juega y le
    // mete saludar() a CuentaBancaria, que es la única que ve en el código.
    replySinContexto: `public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }

    public void saludar() {
        System.out.println("Hola desde CuentaBancaria");
    }
}

public class Cliente {
    private String nombre;

    public Cliente(String nombre) {
        this.nombre = nombre;
    }
}`,
  },
  {
    instruction: '¿En qué clase pusiste el método saludar?',
    // CON contexto: la IA sabe que lo puso en Cliente porque tiene el historial.
    // Pero ojo: la IA está configurada para devolver SOLO código. Así que devuelve
    // un comentario dentro de un bloque. Ese mismatch entre "instrucción de
    // pregunta" y "system que pide solo código" también es pedagógico.
    replyConContexto: `// Lo puse en la clase Cliente.
public class Cliente {
    public void saludar() { /* ... */ }
}`,
    // SIN contexto: la IA no puede responder porque no tiene memoria de qué
    // hizo. Improvisa devolviendo algo genérico.
    replySinContexto: `// No tengo registro del turno anterior. En el código que veo, saludar() no aparece.
public class CuentaBancaria {
    // ...
}`,
  },
]

const estTokens = (s) => Math.max(1, Math.ceil((s || '').length / 4))

// Construye el userMsg que el Editor real arma — un solo string que embebe
// instrucción + código actual. Ver buildUserMessage() en Editor.jsx.
function buildUserMessage(instruction, code) {
  return `Lenguaje: java\n\nInstrucción:\n${instruction}\n\nCódigo actual:\n\`\`\`java\n${code}\n\`\`\``
}

// Estado en cada modo después de N turnos (turn = cantidad completada, 0..3).
//
// Sin contexto: el editor se va actualizando turno a turno (porque "Aplicar"
// reemplaza el código), pero el messages[] que viaja siempre es [system, user].
// El user de cada turno embebe el código del editor en ESE momento.
//
// Con contexto: igual al anterior con el editor, PERO además acumula history.
// El messages[] del turno N es [system, ...history(2*(N-1) msgs), userN].
function buildSnapshots(turn) {
  // El "código en el editor" antes del turno actual. Después del turno N, el
  // editor muestra el resultado de la replyConContexto de ese turno (porque
  // ahí asumimos que el alumno toca "Aplicar al editor").
  //
  // Para SIN contexto, el código del editor evoluciona distinto porque las
  // replies son distintas — pero para mantener el comparativo justo, mostramos
  // el código del editor "Con contexto" en ambas columnas (es el mismo editor,
  // los modos son del messages[], no del archivo). En la práctica del Editor
  // real, el alumno tendría que elegir un modo y mantenerlo. Acá modelamos:
  // "imaginá que arrancás de nuevo con cada modo, con la misma intención".
  //
  // Decisión pedagógica: cada modo lleva su propio editor. Así el alumno ve
  // cómo "sin contexto" termina dejándolo en un estado distinto del archivo
  // porque la 2ª edición se desvía.
  let editorConContexto = INITIAL_CODE
  let editorSinContexto = INITIAL_CODE
  const conMessagesByTurn = []
  const sinMessagesByTurn = []
  const history = [] // se va llenando solo en "Con contexto"

  for (let i = 0; i < turn; i += 1) {
    const step = SCRIPT[i]
    // CON CONTEXTO: el messages[] del turno i es system + history acumulado + nuevo user
    const userMsgCon = {
      role: 'user',
      content: buildUserMessage(step.instruction, editorConContexto),
    }
    const conMsgsThisTurn = [
      { role: 'system', content: SYSTEM_TEXT },
      ...history,
      userMsgCon,
    ]
    conMessagesByTurn.push(conMsgsThisTurn)

    // SIN CONTEXTO: el messages[] del turno i es solo system + el user de ese turno
    const userMsgSin = {
      role: 'user',
      content: buildUserMessage(step.instruction, editorSinContexto),
    }
    const sinMsgsThisTurn = [
      { role: 'system', content: SYSTEM_TEXT },
      userMsgSin,
    ]
    sinMessagesByTurn.push(sinMsgsThisTurn)

    // Aplicar al editor: en ambos modos el alumno toca "Aplicar" y el code se
    // reemplaza con el bloque ``` extraído de la respuesta.
    editorConContexto = step.replyConContexto
    editorSinContexto = step.replySinContexto

    // Con contexto: además, se guarda el par (user, assistant) en history.
    history.push(userMsgCon)
    history.push({ role: 'assistant', content: step.replyConContexto })
  }

  return {
    // último messages[] que viajó (turn=0 → null)
    conLastMessages: conMessagesByTurn[conMessagesByTurn.length - 1] || null,
    sinLastMessages: sinMessagesByTurn[sinMessagesByTurn.length - 1] || null,
    // estado actual del editor en cada modo
    editorConContexto,
    editorSinContexto,
    // historia acumulada en con contexto (para mostrar la barra de turnos)
    historyLength: history.length,
  }
}

function tokensOfMessages(msgs) {
  if (!msgs) return 0
  return msgs.reduce((acc, m) => acc + estTokens(m.content), 0)
}

function MessageRow({ msg, justAppeared, truncate }) {
  // El content del user del Editor es largo (system + instrucción + código).
  // Lo mostramos con saltos de línea preservados pero limitado en alto vía CSS.
  const content = truncate && msg.content.length > 300
    ? msg.content.slice(0, 300) + '\n…'
    : msg.content
  return (
    <div className={`mch-msg mch-msg-${msg.role}${justAppeared ? ' mch-msg-new' : ''}`}>
      <span className={`mch-role mch-role-${msg.role}`}>{msg.role}</span>
      <span className="mch-content meditor-content-pre">{content}</span>
    </div>
  )
}

function ColumnHeader({ emoji, name, endpoint, color, badge }) {
  return (
    <div className={`mch-col-header mch-col-header-${color}`}>
      <div className="mch-col-title">{emoji} {name} <span className="meditor-badge">{badge}</span></div>
      <code className="mch-col-endpoint">{endpoint}</code>
    </div>
  )
}

function StatBar({ msgCount, tokenCount }) {
  return (
    <div className="mch-stats">
      <span className="mch-stat">
        <span className="mch-stat-num">{msgCount}</span> msg
      </span>
      <span className="mch-stat-sep">·</span>
      <span className="mch-stat">
        ~<span className="mch-stat-num">{tokenCount}</span> tokens
      </span>
    </div>
  )
}

function EditorPreview({ code, label }) {
  return (
    <div className="meditor-preview">
      <div className="meditor-preview-label">{label}</div>
      <pre className="meditor-preview-code">{code}</pre>
    </div>
  )
}

export default function ModosEditor() {
  const [turn, setTurn] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [lastTurnAt, setLastTurnAt] = useState(0)
  const autoTimerRef = useRef(null)

  const snap = buildSnapshots(turn)
  const isDone = turn >= SCRIPT.length
  const isFresh = turn === 0

  const advance = () => {
    if (turn >= SCRIPT.length) return
    setTurn((t) => t + 1)
    setLastTurnAt(Date.now())
  }

  const reset = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    setAutoPlaying(false)
    setTurn(0)
    setLastTurnAt(0)
  }

  useEffect(() => {
    if (!autoPlaying) return
    if (turn >= SCRIPT.length) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setTurn((t) => Math.min(t + 1, SCRIPT.length))
      setLastTurnAt(Date.now())
    }, 2200)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, turn])

  const isNew = (idx, total, modeNewCount) => {
    if (!lastTurnAt) return false
    if (Date.now() - lastTurnAt > 2500) return false
    return idx >= total - modeNewCount
  }

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/editor
          <span className="docs-header-subtitle">sin contexto vs con contexto, lado a lado</span>
        </h1>
        <a href="/" className="clear-btn">← Modos</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label="Navegación de documentación">
          <DocsNav current="demo-editor" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">¿Para qué sirve esta página?</div>
            <p>
              Misma sesión de edición, dos modos. Mirá cómo el modo <b>sin contexto</b>
              hace que la IA se desvíe en el segundo turno porque <b>no tiene cómo saber</b>
              a qué te referís cuando decís <i>"esa clase"</i>.
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 La pregunta del millón (versión Editor)</h2>
            <p>
              En el <a href="/editor">Editor</a> hay un checkbox: <b>"mantener contexto"</b>.
              ¿Qué cambia? Mucho. Esta página simula la misma serie de 3 instrucciones sobre el
              mismo archivo Java en los dos modos, y muestra lado a lado qué JSON sale del
              navegador en cada caso y cómo termina el archivo.
            </p>
            <div className="prov-callout">
              <p>
                Las respuestas de la IA acá están <b>mockeadas</b> (no consumen API). El foco
                pedagógico es lo que viaja en el <code>POST</code> y cómo evoluciona el editor.
                Para ver el request real, andá al <a href="/editor">/editor</a>.
              </p>
            </div>
          </section>

          {/* ============== CONTROLES ============== */}
          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">Turno:</span>
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={`mch-progress-dot${turn >= n ? ' is-done' : ''}`}
                    aria-label={`turno ${n} ${turn >= n ? 'completado' : 'pendiente'}`}
                  >
                    {n}
                  </span>
                ))}
                <span className="mch-progress-meta">
                  {isFresh && '— el editor está en estado inicial'}
                  {!isFresh && !isDone && `— turno ${turn} de 3 aplicado`}
                  {isDone && '— sesión completa'}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                  title="Avanza un turno: muestra el POST que sale en cada modo y cómo queda el editor"
                >
                  ▶ Siguiente edición
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((v) => !v)}
                  disabled={isDone}
                  title="Encadena las 3 ediciones con un delay"
                >
                  {autoPlaying ? '⏸ Pausar' : '▶▶ Auto'}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={turn === 0 && !autoPlaying}
                  title="Volver al estado inicial"
                >
                  ↺ Reiniciar
                </button>
              </div>
            </div>

            <div className="mch-prompt-preview">
              <span className="mch-prompt-label">Próxima instrucción:</span>
              {isDone ? (
                <span className="mch-prompt-text mch-prompt-empty">
                  (no hay más turnos en el guion — tocá Reiniciar para volver a empezar)
                </span>
              ) : (
                <span className="mch-prompt-text">
                  "{SCRIPT[turn].instruction}"
                </span>
              )}
            </div>
          </section>

          {/* ============== DOS COLUMNAS ============== */}
          <section className="criollo-section">
            <div className="mch-grid meditor-grid">

              {/* ---- SIN CONTEXTO ---- */}
              <div className="mch-col mch-col-crudo">
                <ColumnHeader
                  emoji="🔴"
                  name="Sin contexto"
                  endpoint="POST /v1/chat/completions"
                  color="crudo"
                  badge="keep_context = false"
                />
                <div className="mch-col-desc">
                  Cada "Aplicar" manda <b>solo</b> system + un único <code>user</code> que
                  embebe la instrucción y el código actual. <b>Sin</b> historial.
                </div>

                <div className="mch-payload">
                  <div className="mch-payload-label">
                    messages[] del último POST
                  </div>
                  {snap.sinLastMessages ? (
                    <div className="mch-msglist">
                      {snap.sinLastMessages.map((m, i) => (
                        <MessageRow
                          key={`sin-${turn}-${i}`}
                          msg={m}
                          justAppeared={isNew(i, snap.sinLastMessages.length, 1)}
                          truncate
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mch-pers-empty">
                      (aún no se mandó nada — tocá "Siguiente edición")
                    </div>
                  )}
                </div>

                <StatBar
                  msgCount={snap.sinLastMessages?.length || 0}
                  tokenCount={tokensOfMessages(snap.sinLastMessages)}
                />

                <EditorPreview
                  label="Estado del editor después del turno:"
                  code={snap.editorSinContexto}
                />

                <div className="mch-takeaway">
                  {turn === 0 && '↑ El archivo arranca igual en los dos modos.'}
                  {turn === 1 && '↑ Primera edición: la IA tiene info suficiente, los dos modos coinciden.'}
                  {turn === 2 && (
                    <>
                      <b>¡Boom!</b> "Esa clase" para la IA es ambiguo: como solo ve el código,
                      le mete <code>saludar()</code> a <b>CuentaBancaria</b>, no a Cliente.
                    </>
                  )}
                  {turn === 3 && (
                    <>
                      <b>Game over.</b> La pregunta "¿en qué clase pusiste el método?" no
                      tiene respuesta — la IA <b>nunca recibió</b> que en el turno anterior
                      había puesto un método.
                    </>
                  )}
                </div>
              </div>

              {/* ---- CON CONTEXTO ---- */}
              <div className="mch-col mch-col-conversacion">
                <ColumnHeader
                  emoji="🟢"
                  name="Con contexto"
                  endpoint="POST /v1/chat/completions"
                  color="conversacion"
                  badge="keep_context = true"
                />
                <div className="mch-col-desc">
                  El cliente <b>acumula</b> <code>history[]</code> con cada par
                  (user, assistant) y lo reenvía completo en cada "Aplicar".
                </div>

                <div className="mch-payload">
                  <div className="mch-payload-label">
                    messages[] del último POST
                    {snap.historyLength > 0 && (
                      <span className="meditor-history-pill">
                        history: {snap.historyLength} msg
                      </span>
                    )}
                  </div>
                  {snap.conLastMessages ? (
                    <div className="mch-msglist">
                      {snap.conLastMessages.map((m, i) => (
                        <MessageRow
                          key={`con-${turn}-${i}`}
                          msg={m}
                          justAppeared={isNew(i, snap.conLastMessages.length, 1)}
                          truncate
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mch-pers-empty">
                      (aún no se mandó nada — tocá "Siguiente edición")
                    </div>
                  )}
                </div>

                <StatBar
                  msgCount={snap.conLastMessages?.length || 0}
                  tokenCount={tokensOfMessages(snap.conLastMessages)}
                />

                <EditorPreview
                  label="Estado del editor después del turno:"
                  code={snap.editorConContexto}
                />

                <div className="mch-takeaway">
                  {turn === 0 && '↑ El archivo arranca igual en los dos modos.'}
                  {turn === 1 && '↑ Primera edición. Después de "Aplicar" se guardan user + assistant en history.'}
                  {turn === 2 && (
                    <>
                      ↑ "Esa clase" ahora se resuelve bien porque la IA ve en
                      <code> history </code> que recién creó Cliente.
                    </>
                  )}
                  {turn === 3 && (
                    <>
                      <b>Memoria útil.</b> La IA puede responder porque tiene el assistant
                      anterior en <code>history</code>. Costo: el POST crece turno a turno.
                    </>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 Lo que importa</h2>
            <ul>
              <li>
                <b>El código viaja embebido en el <code>user</code></b>, no como campo
                aparte. La API no tiene noción de "archivo": para ella es texto en un
                mensaje. Por eso "el contexto" del Editor en realidad son las
                <i> instrucciones anteriores y sus respuestas</i>, no el código en sí.
              </li>
              <li>
                <b>Cada "Aplicar" reemplaza el editor entero.</b> El modelo devuelve el
                archivo completo en un bloque <code>```</code> — no hace diff. Por eso el
                Editor cuesta más tokens que un agente con tool <code>edit_code(old,new)</code>
                (mirá <a href="/loop-agentico">/loop-agentico</a>).
              </li>
              <li>
                <b>Sin contexto, las referencias se rompen.</b> Frases como "esa clase",
                "el método que agregaste", "como te dije antes" requieren historial.
                Si no, la IA improvisa con lo único que ve: el código actual.
              </li>
              <li>
                <b>Con contexto el costo crece rápido.</b> Cada turno suma el código
                completo otra vez (porque está embebido en el user del turno anterior).
                Después de N turnos, el POST tiene ~N copias del código. Para sesiones
                largas, mejor el modo agéntico.
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Para ver esto con un request <i>real</i>, andá al <a href="/editor">Editor</a> y
              prendé/apagá el checkbox "mantener contexto" mientras mirás el panel
              "Request → API (crudo)". Para entender la anatomía completa del POST,{' '}
              <a href="/como-funciona">/como-funciona</a>.
            </p>
          </section>

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">← Modos</a>
          </footer>

        </div>
      </div>
    </div>
  )
}
