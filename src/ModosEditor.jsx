import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import { useT } from './i18n/useT.js'

/**
 * Comparador animado de los 2 modos del Editor de código:
 *  - Sin contexto:  cada Aplicar manda solo system + userMsg (que adentro
 *                   embebe el código actual + la instrucción). No hay historial.
 *  - Con contexto:  el cliente acumula history[] (user + assistant del turno
 *                   anterior) y lo manda completo en cada Aplicar.
 *
 * El guion son 3 instrucciones encadenadas sobre el mismo archivo Java.
 * Las respuestas de la IA están mockeadas a propósito: la página es
 * pedagógica, no consume API. Bilingüe ES/EN.
 */

const SYSTEM_TEXT_ES = 'Sos un asistente de código. Devolvé únicamente código en un bloque ``` con el lenguaje correspondiente. Sin explicaciones.'
const SYSTEM_TEXT_EN = 'You are a code assistant. Return only code in a ``` block with the corresponding language. No explanations.'

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
// Bilingüe: el copy y los strings/comentarios del Java generado pasan por L().
function buildScript(L) {
  return [
    {
      instruction: L('Agregá otra clase llamada Cliente con un nombre.', 'Add another class called Cliente with a name.'),
      // La respuesta de la IA (siempre es código en un bloque). Lo extraemos con
      // extractCodeBlock y reemplaza el editor.
      replyConContexto: CODE_AFTER_T1,
      replySinContexto: CODE_AFTER_T1,
    },
    {
      instruction: L('Sumale a esa clase un método saludar() que imprima el nombre.', 'Add a saludar() method to that class that prints the name.'),
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
        System.out.println("${L('Hola, soy ', "Hi, I'm ")}" + nombre);
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
        System.out.println("${L('Hola desde CuentaBancaria', 'Hi from CuentaBancaria')}");
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
      instruction: L('¿En qué clase pusiste el método saludar?', 'Which class did you put the saludar method in?'),
      // CON contexto: la IA sabe que lo puso en Cliente porque tiene el historial.
      // Pero ojo: la IA está configurada para devolver SOLO código. Así que devuelve
      // un comentario dentro de un bloque. Ese mismatch entre "instrucción de
      // pregunta" y "system que pide solo código" también es pedagógico.
      replyConContexto: `// ${L('Lo puse en la clase Cliente.', 'I put it in the Cliente class.')}
public class Cliente {
    public void saludar() { /* ... */ }
}`,
      // SIN contexto: la IA no puede responder porque no tiene memoria de qué
      // hizo. Improvisa devolviendo algo genérico.
      replySinContexto: `// ${L('No tengo registro del turno anterior. En el código que veo, saludar() no aparece.', "I have no record of the previous turn. In the code I see, saludar() doesn't appear.")}
public class CuentaBancaria {
    // ...
}`,
    },
  ]
}

const estTokens = (s) => Math.max(1, Math.ceil((s || '').length / 4))

// Construye el userMsg que el Editor real arma — un solo string que embebe
// instrucción + código actual. Ver buildUserMessage() en Editor.jsx.
function buildUserMessage(instruction, code, L) {
  return L(
    `Lenguaje: java\n\nInstrucción:\n${instruction}\n\nCódigo actual:\n\`\`\`java\n${code}\n\`\`\``,
    `Language: java\n\nInstruction:\n${instruction}\n\nCurrent code:\n\`\`\`java\n${code}\n\`\`\``,
  )
}

// Estado en cada modo después de N turnos (turn = cantidad completada, 0..3).
//
// Sin contexto: el editor se va actualizando turno a turno (porque "Aplicar"
// reemplaza el código), pero el messages[] que viaja siempre es [system, user].
// El user de cada turno embebe el código del editor en ESE momento.
//
// Con contexto: igual al anterior con el editor, PERO además acumula history.
// El messages[] del turno N es [system, ...history(2*(N-1) msgs), userN].
function buildSnapshots(turn, script, systemText, L) {
  let editorConContexto = INITIAL_CODE
  let editorSinContexto = INITIAL_CODE
  const conMessagesByTurn = []
  const sinMessagesByTurn = []
  const history = [] // se va llenando solo en "Con contexto"

  for (let i = 0; i < turn; i += 1) {
    const step = script[i]
    // CON CONTEXTO: el messages[] del turno i es system + history acumulado + nuevo user
    const userMsgCon = {
      role: 'user',
      content: buildUserMessage(step.instruction, editorConContexto, L),
    }
    const conMsgsThisTurn = [
      { role: 'system', content: systemText },
      ...history,
      userMsgCon,
    ]
    conMessagesByTurn.push(conMsgsThisTurn)

    // SIN CONTEXTO: el messages[] del turno i es solo system + el user de ese turno
    const userMsgSin = {
      role: 'user',
      content: buildUserMessage(step.instruction, editorSinContexto, L),
    }
    const sinMsgsThisTurn = [
      { role: 'system', content: systemText },
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
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const SYSTEM_TEXT = lang === 'en' ? SYSTEM_TEXT_EN : SYSTEM_TEXT_ES
  const SCRIPT = buildScript(L)

  const [turn, setTurn] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [lastTurnAt, setLastTurnAt] = useState(0)
  const autoTimerRef = useRef(null)

  const snap = buildSnapshots(turn, SCRIPT, SYSTEM_TEXT, L)
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
  }, [autoPlaying, turn, SCRIPT.length])

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
          <span className="docs-header-subtitle">{L('sin contexto vs con contexto, lado a lado', 'no context vs with context, side by side')}</span>
        </h1>
        <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <DocsNav current="demo-editor" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('Misma sesión de edición, dos modos. Mirá cómo el modo', 'Same editing session, two modes. Watch how the')} <b>{L('sin contexto', 'no context')}</b> {L('hace que la IA se desvíe en el segundo turno porque', 'mode makes the AI go off track on the second turn because')} <b>{L('no tiene cómo saber', 'it has no way to know')}</b> {L('a qué te referís cuando decís', 'what you mean when you say')} <i>{L('"esa clase"', '"that class"')}</i>.
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('La pregunta del millón (versión Editor)', 'The million-dollar question (Editor edition)')}</h2>
            <p>
              {L('En el', 'In the')} <a href="/editor">Editor</a> {L('hay un checkbox:', "there's a checkbox:")} <b>{L('"mantener contexto"', '"keep context"')}</b>.
              {L('¿Qué cambia? Mucho. Esta página simula la misma serie de 3 instrucciones sobre el mismo archivo Java en los dos modos, y muestra lado a lado qué JSON sale del navegador en cada caso y cómo termina el archivo.', ' What changes? A lot. This page simulates the same series of 3 instructions over the same Java file in both modes, and shows side by side what JSON leaves the browser in each case and how the file ends up.')}
            </p>
            <div className="prov-callout">
              <p>
                {L('Las respuestas de la IA acá están', "The AI's responses here are")} <b>{L('mockeadas', 'mocked')}</b> {L('(no consumen API). El foco pedagógico es lo que viaja en el', "(they don't consume API). The teaching focus is what travels in the")} <code>POST</code> {L('y cómo evoluciona el editor. Para ver el request real, andá al', 'and how the editor evolves. To see the real request, go to')} <a href="/editor">/editor</a>.
              </p>
            </div>
          </section>

          {/* ============== CONTROLES ============== */}
          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">{L('Turno:', 'Turn:')}</span>
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={`mch-progress-dot${turn >= n ? ' is-done' : ''}`}
                    aria-label={`${L('turno', 'turn')} ${n} ${turn >= n ? L('completado', 'completed') : L('pendiente', 'pending')}`}
                  >
                    {n}
                  </span>
                ))}
                <span className="mch-progress-meta">
                  {isFresh && L('— el editor está en estado inicial', '— the editor is in its initial state')}
                  {!isFresh && !isDone && L(`— turno ${turn} de 3 aplicado`, `— turn ${turn} of 3 applied`)}
                  {isDone && L('— sesión completa', '— session complete')}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                  title={L('Avanza un turno: muestra el POST que sale en cada modo y cómo queda el editor', 'Advances one turn: shows the POST that goes out in each mode and how the editor ends up')}
                >
                  ▶ {L('Siguiente edición', 'Next edit')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((v) => !v)}
                  disabled={isDone}
                  title={L('Encadena las 3 ediciones con un delay', 'Chains the 3 edits with a delay')}
                >
                  {autoPlaying ? L('⏸ Pausar', '⏸ Pause') : L('▶▶ Auto', '▶▶ Auto')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={turn === 0 && !autoPlaying}
                  title={L('Volver al estado inicial', 'Back to the initial state')}
                >
                  ↺ {L('Reiniciar', 'Reset')}
                </button>
              </div>
            </div>

            <div className="mch-prompt-preview">
              <span className="mch-prompt-label">{L('Próxima instrucción:', 'Next instruction:')}</span>
              {isDone ? (
                <span className="mch-prompt-text mch-prompt-empty">
                  {L('(no hay más turnos en el guion — tocá Reiniciar para volver a empezar)', '(no more turns in the script — hit Reset to start over)')}
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
                  name={L('Sin contexto', 'No context')}
                  endpoint="POST /v1/chat/completions"
                  color="crudo"
                  badge="keep_context = false"
                />
                <div className="mch-col-desc">
                  {L('Cada "Aplicar" manda', 'Each "Apply" sends')} <b>{L('solo', 'only')}</b> {L('system + un único', 'system + a single')} <code>user</code> {L('que embebe la instrucción y el código actual.', 'that embeds the instruction and the current code.')} <b>{L('Sin', 'No')}</b> {L('historial.', 'history.')}
                </div>

                <div className="mch-payload">
                  <div className="mch-payload-label">
                    {L('messages[] del último POST', 'messages[] of the last POST')}
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
                      {L('(aún no se mandó nada — tocá "Siguiente edición")', '(nothing sent yet — hit "Next edit")')}
                    </div>
                  )}
                </div>

                <StatBar
                  msgCount={snap.sinLastMessages?.length || 0}
                  tokenCount={tokensOfMessages(snap.sinLastMessages)}
                />

                <EditorPreview
                  label={L('Estado del editor después del turno:', 'Editor state after the turn:')}
                  code={snap.editorSinContexto}
                />

                <div className="mch-takeaway">
                  {turn === 0 && L('↑ El archivo arranca igual en los dos modos.', '↑ The file starts the same in both modes.')}
                  {turn === 1 && L('↑ Primera edición: la IA tiene info suficiente, los dos modos coinciden.', '↑ First edit: the AI has enough info, both modes match.')}
                  {turn === 2 && (
                    <>
                      <b>{L('¡Boom!', 'Boom!')}</b> {L('"Esa clase" para la IA es ambiguo: como solo ve el código, le mete', '"That class" is ambiguous for the AI: since it only sees the code, it adds')} <code>saludar()</code> {L('a', 'to')} <b>CuentaBancaria</b>, {L('no a Cliente.', 'not Cliente.')}
                    </>
                  )}
                  {turn === 3 && (
                    <>
                      <b>{L('Game over.', 'Game over.')}</b> {L('La pregunta "¿en qué clase pusiste el método?" no tiene respuesta — la IA', 'The question "which class did you put the method in?" has no answer — the AI')} <b>{L('nunca recibió', 'never received')}</b> {L('que en el turno anterior había puesto un método.', 'that it had added a method on the previous turn.')}
                    </>
                  )}
                </div>
              </div>

              {/* ---- CON CONTEXTO ---- */}
              <div className="mch-col mch-col-conversacion">
                <ColumnHeader
                  emoji="🟢"
                  name={L('Con contexto', 'With context')}
                  endpoint="POST /v1/chat/completions"
                  color="conversacion"
                  badge="keep_context = true"
                />
                <div className="mch-col-desc">
                  {L('El cliente', 'The client')} <b>{L('acumula', 'accumulates')}</b> <code>history[]</code> {L('con cada par (user, assistant) y lo reenvía completo en cada "Aplicar".', 'with each (user, assistant) pair and resends it whole on each "Apply".')}
                </div>

                <div className="mch-payload">
                  <div className="mch-payload-label">
                    {L('messages[] del último POST', 'messages[] of the last POST')}
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
                      {L('(aún no se mandó nada — tocá "Siguiente edición")', '(nothing sent yet — hit "Next edit")')}
                    </div>
                  )}
                </div>

                <StatBar
                  msgCount={snap.conLastMessages?.length || 0}
                  tokenCount={tokensOfMessages(snap.conLastMessages)}
                />

                <EditorPreview
                  label={L('Estado del editor después del turno:', 'Editor state after the turn:')}
                  code={snap.editorConContexto}
                />

                <div className="mch-takeaway">
                  {turn === 0 && L('↑ El archivo arranca igual en los dos modos.', '↑ The file starts the same in both modes.')}
                  {turn === 1 && L('↑ Primera edición. Después de "Aplicar" se guardan user + assistant en history.', '↑ First edit. After "Apply" the user + assistant are saved in history.')}
                  {turn === 2 && (
                    <>
                      {L('↑ "Esa clase" ahora se resuelve bien porque la IA ve en', '↑ "That class" now resolves correctly because the AI sees in')}
                      <code> history </code> {L('que recién creó Cliente.', 'that it just created Cliente.')}
                    </>
                  )}
                  {turn === 3 && (
                    <>
                      <b>{L('Memoria útil.', 'Useful memory.')}</b> {L('La IA puede responder porque tiene el assistant anterior en', 'The AI can answer because it has the previous assistant in')} <code>history</code>. {L('Costo: el POST crece turno a turno.', 'Cost: the POST grows turn by turn.')}
                    </>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('El código viaja embebido en el', 'The code travels embedded in the')} <code>user</code></b>, {L('no como campo aparte. La API no tiene noción de "archivo": para ella es texto en un mensaje. Por eso "el contexto" del Editor en realidad son las', 'not as a separate field. The API has no notion of "file": to it, it\'s text in a message. That\'s why the Editor\'s "context" is really the')} <i>{L('instrucciones anteriores y sus respuestas', 'previous instructions and their responses')}</i>, {L('no el código en sí.', 'not the code itself.')}
              </li>
              <li>
                <b>{L('Cada "Aplicar" reemplaza el editor entero.', 'Each "Apply" replaces the whole editor.')}</b> {L('El modelo devuelve el archivo completo en un bloque', 'The model returns the whole file in a')} <code>```</code> {L('— no hace diff. Por eso el Editor cuesta más tokens que un agente con tool', 'block — it doesn\'t diff. That\'s why the Editor costs more tokens than an agent with the')} <code>edit_code(old,new)</code> {L('(mirá', 'tool (see')} <a href="/loop-agentico">/loop-agentico</a>).
              </li>
              <li>
                <b>{L('Sin contexto, las referencias se rompen.', 'Without context, references break.')}</b> {L('Frases como "esa clase", "el método que agregaste", "como te dije antes" requieren historial. Si no, la IA improvisa con lo único que ve: el código actual.', 'Phrases like "that class", "the method you added", "as I told you before" require history. Otherwise the AI improvises with the only thing it sees: the current code.')}
              </li>
              <li>
                <b>{L('Con contexto el costo crece rápido.', 'With context the cost grows fast.')}</b> {L('Cada turno suma el código completo otra vez (porque está embebido en el user del turno anterior). Después de N turnos, el POST tiene ~N copias del código. Para sesiones largas, mejor el modo agéntico.', 'Each turn adds the whole code again (because it\'s embedded in the previous turn\'s user). After N turns, the POST has ~N copies of the code. For long sessions, the agentic mode is better.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para ver esto con un request', 'To see this with a')} <i>{L('real', 'real')}</i> {L('request, andá al', 'request, go to the')} <a href="/editor">Editor</a> {L('y prendé/apagá el checkbox "mantener contexto" mientras mirás el panel "Request → API (crudo)". Para entender la anatomía completa del POST,', 'and toggle the "keep context" checkbox while you watch the "Request → API (raw)" panel. To understand the full anatomy of the POST,')}{' '}
              <a href="/como-funciona">/como-funciona</a>.
            </p>
          </section>

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
          </footer>

        </div>
      </div>
    </div>
  )
}
