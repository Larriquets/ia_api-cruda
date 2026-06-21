import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * Comparador animado de los 3 modos del Chat:
 *  - Crudo:        cada turno manda solo system + último user. La IA no recuerda.
 *  - Conversación: el cliente acumula messages[] y lo reenvía completo cada turno.
 *  - Persistente:  (solo OpenAI) el historial vive en el server, el cliente
 *                  manda solo el último mensaje + un conversation_id.
 *
 * El guion son 3 turnos fijos. Las respuestas de la IA están mockeadas a
 * propósito: la página es pedagógica, no consume API. Bilingüe ES/EN.
 */

const SYSTEM_TEXT_ES = 'Eres un asistente útil que responde en español de forma clara y concisa.'
const SYSTEM_TEXT_EN = 'You are a helpful assistant that answers clearly and concisely in English.'

// El guion: 3 turnos. user es lo que escribe el alumno. assistant es lo que
// el modelo "respondería" en cada modo. En Crudo, el modelo no tiene memoria
// del nombre, así que la respuesta del turno 3 cambia.
const SCRIPT_ES = [
  {
    user: 'Hola, me llamo Mati.',
    assistantConversation: '¡Hola, Mati! ¿En qué te ayudo?',
    assistantCrudo:        '¡Hola, Mati! ¿En qué te ayudo?',
    assistantPersistente:  '¡Hola, Mati! ¿En qué te ayudo?',
  },
  {
    user: 'Estoy aprendiendo cómo funciona la API de los modelos.',
    assistantConversation: 'Buenísimo. ¿Querés que arranquemos por el array messages o por las tools?',
    assistantCrudo:        'Buenísimo. ¿Querés que arranquemos por el array messages o por las tools?',
    assistantPersistente:  'Buenísimo, Mati. ¿Querés que arranquemos por el array messages o por las tools?',
  },
  {
    user: '¿Cómo me llamo?',
    assistantConversation: 'Te llamás Mati.',
    assistantCrudo:        'No tengo cómo saberlo: en este turno solo recibí tu último mensaje.',
    assistantPersistente:  'Te llamás Mati.',
  },
]

const SCRIPT_EN = [
  {
    user: 'Hi, my name is Mati.',
    assistantConversation: 'Hi, Mati! How can I help?',
    assistantCrudo:        'Hi, Mati! How can I help?',
    assistantPersistente:  'Hi, Mati! How can I help?',
  },
  {
    user: "I'm learning how the models' API works.",
    assistantConversation: 'Great. Want to start with the messages array or with the tools?',
    assistantCrudo:        'Great. Want to start with the messages array or with the tools?',
    assistantPersistente:  'Great, Mati. Want to start with the messages array or with the tools?',
  },
  {
    user: 'What is my name?',
    assistantConversation: 'Your name is Mati.',
    assistantCrudo:        'I have no way to know: this turn I only received your last message.',
    assistantPersistente:  'Your name is Mati.',
  },
]

const estTokens = (s) => Math.max(1, Math.ceil((s || '').length / 4))

// Una "snapshot" representa lo que efectivamente viaja en el POST de ese turno
// para cada modo. La función las construye en base al turno actual (0..3, donde
// 0 = todavía no se mandó nada).
function buildSnapshots(turn, script, systemText) {
  const sys = { role: 'system', content: systemText }

  // Para Crudo y Conversación armamos el array messages[].
  const conversationMsgs = [sys]
  for (let i = 0; i < turn; i += 1) {
    conversationMsgs.push({ role: 'user', content: script[i].user })
    conversationMsgs.push({ role: 'assistant', content: script[i].assistantConversation })
  }

  // En Crudo, solo viaja system + el último user (sin assistant: el cliente
  // no acumula).
  let crudoMsgs
  if (turn === 0) {
    crudoMsgs = [sys]
  } else {
    crudoMsgs = [sys, { role: 'user', content: script[turn - 1].user }]
  }

  // Persistente: el cliente solo manda el último user message. El system viaja
  // como `instructions` en el shape de /v1/responses, no como messages[0].
  let persistenteBody
  if (turn === 0) {
    persistenteBody = null
  } else {
    persistenteBody = {
      conversation: 'conv_abc123…',
      instructions: systemText,
      input: script[turn - 1].user,
    }
  }

  return { crudoMsgs, conversationMsgs, persistenteBody }
}

function tokensOfMessages(msgs) {
  return msgs.reduce((acc, m) => acc + estTokens(m.content), 0)
}

function tokensOfPersistente(body) {
  if (!body) return 0
  return estTokens(body.instructions) + estTokens(body.input) + estTokens(body.conversation)
}

function MessageRow({ msg, justAppeared }) {
  return (
    <div className={`mch-msg mch-msg-${msg.role}${justAppeared ? ' mch-msg-new' : ''}`}>
      <span className={`mch-role mch-role-${msg.role}`}>{msg.role}</span>
      <span className="mch-content">{msg.content}</span>
    </div>
  )
}

function ColumnHeader({ emoji, name, endpoint, color }) {
  return (
    <div className={`mch-col-header mch-col-header-${color}`}>
      <div className="mch-col-title">{emoji} {name}</div>
      <code className="mch-col-endpoint">{endpoint}</code>
    </div>
  )
}

function StatBar({ msgCount, tokenCount, msgLabel }) {
  return (
    <div className="mch-stats">
      <span className="mch-stat">
        <span className="mch-stat-num">{msgCount}</span> {msgLabel}
      </span>
      <span className="mch-stat-sep">·</span>
      <span className="mch-stat">
        ~<span className="mch-stat-num">{tokenCount}</span> tokens
      </span>
    </div>
  )
}

export default function ModosChat() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const script = lang === 'en' ? SCRIPT_EN : SCRIPT_ES
  const systemText = lang === 'en' ? SYSTEM_TEXT_EN : SYSTEM_TEXT_ES

  // turn = cantidad de turnos completados. 0 = todavía no se mandó nada,
  // 1 = se mandó el primero, etc. Máximo 3.
  const [turn, setTurn] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  // Cuando un turno acaba de avanzar, marcamos `lastTurnAt` para animar fade-in
  // de los mensajes nuevos. Se resetea después de un rato.
  const [lastTurnAt, setLastTurnAt] = useState(0)
  const autoTimerRef = useRef(null)

  const { crudoMsgs, conversationMsgs, persistenteBody } = buildSnapshots(turn, script, systemText)
  const lastAssistantCrudo = turn > 0 ? script[turn - 1].assistantCrudo : null
  const lastAssistantConv  = turn > 0 ? script[turn - 1].assistantConversation : null
  const lastAssistantPers  = turn > 0 ? script[turn - 1].assistantPersistente : null

  const isDone = turn >= script.length
  const isFresh = turn === 0

  const advance = () => {
    if (turn >= script.length) return
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

  // Auto-play: encadena los 3 turnos con un delay generoso para que el alumno
  // alcance a leer cada paso.
  useEffect(() => {
    if (!autoPlaying) return
    if (turn >= script.length) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setTurn((t) => Math.min(t + 1, script.length))
      setLastTurnAt(Date.now())
    }, 1800)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, turn, script.length])

  // El "justAppeared" se aplica a los mensajes agregados en el último turno.
  const isNew = (idx, total, modeNewCount) => {
    if (!lastTurnAt) return false
    if (Date.now() - lastTurnAt > 2500) return false
    return idx >= total - modeNewCount
  }

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/chat
          <span className="docs-header-subtitle">{L('crudo vs conversación vs persistente, lado a lado', 'raw vs conversation vs persistent, side by side')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <DocsNav current="demo-chat" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('Misma conversación, tres modos. Mirá cómo crece — o no — el array', 'Same conversation, three modes. Watch how the array grows — or not —')}
              <code> messages[]</code> {L('que viaja en cada', 'that travels in each')} <code>POST</code>. {L('Si entendés esto, entendiste el 80% de la API de chat.', 'If you get this, you got 80% of the chat API.')}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('La pregunta del millón', 'The million-dollar question')}</h2>
            <p>
              {L('¿La IA', 'Does the AI')} <b>{L('se acuerda', 'remember')}</b> {L('de lo que le dijiste antes? La respuesta corta es:', 'what you told it before? The short answer is:')} <b>{L('no', 'no')}</b>.
              {L('La respuesta larga es: depende de', 'The long answer is: it depends on')} <b>{L('quién', 'who')}</b> {L('guarda el historial. Esta página simula la misma conversación de 3 turnos en los 3 modos del Chat y muestra, lado a lado, qué JSON sale del navegador en cada turno.', 'stores the history. This page simulates the same 3-turn conversation in the 3 Chat modes and shows, side by side, what JSON leaves the browser each turn.')}
            </p>
            <div className="prov-callout">
              <p>
                {L('Las respuestas de la IA acá están', "The AI's responses here are")} <b>{L('mockeadas', 'mocked')}</b> {L('(no consumen API). El foco pedagógico es lo que viaja en el', '(they don\'t consume API). The teaching focus is what travels in the')} <code>POST</code>, {L('no la respuesta. Para ver el request real, andá al', 'not the response. To see the real request, go to the')} <a href="/">Chat</a>.
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
                  {isFresh && L('— todavía no se mandó nada', '— nothing sent yet')}
                  {!isFresh && !isDone && L(`— turno ${turn} de 3 completado`, `— turn ${turn} of 3 completed`)}
                  {isDone && L('— conversación completa', '— conversation complete')}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                  title={L('Avanza un turno: muestra el POST que sale en cada modo', 'Advances one turn: shows the POST that goes out in each mode')}
                >
                  ▶ {L('Siguiente turno', 'Next turn')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((v) => !v)}
                  disabled={isDone}
                  title={L('Encadena los 3 turnos con un delay', 'Chains the 3 turns with a delay')}
                >
                  {autoPlaying ? L('⏸ Pausar', '⏸ Pause') : L('▶▶ Auto', '▶▶ Auto')}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={turn === 0 && !autoPlaying}
                  title={L('Volver al turno 0', 'Back to turn 0')}
                >
                  ↺ {L('Reiniciar', 'Reset')}
                </button>
              </div>
            </div>

            <div className="mch-prompt-preview">
              <span className="mch-prompt-label">{L('Próximo mensaje del usuario:', 'Next user message:')}</span>
              {isDone ? (
                <span className="mch-prompt-text mch-prompt-empty">
                  {L('(no hay más turnos en el guion — tocá Reiniciar para volver a empezar)', '(no more turns in the script — hit Reset to start over)')}
                </span>
              ) : (
                <span className="mch-prompt-text">
                  "{script[turn].user}"
                </span>
              )}
            </div>
          </section>

          {/* ============== TRES COLUMNAS ============== */}
          <section className="criollo-section">
            <div className="mch-grid">

              {/* ---- CRUDO ---- */}
              <div className="mch-col mch-col-crudo">
                <ColumnHeader
                  emoji="🔴"
                  name={L('Crudo', 'Raw')}
                  endpoint="POST /v1/chat/completions"
                  color="crudo"
                />
                <div className="mch-col-desc">
                  {L('Cada turno mando', 'Each turn I send')} <b>{L('solo', 'only')}</b> {L('el system + el último', 'the system + the last')} <code>user</code>.
                  {L('El cliente', 'The client')} <b>{L('no', "doesn't")}</b> {L('acumula historial.', 'accumulate history.')}
                </div>

                <div className="mch-payload">
                  <div className="mch-payload-label">messages[]</div>
                  <div className="mch-msglist">
                    {crudoMsgs.map((m, i) => (
                      <MessageRow
                        key={`crudo-${turn}-${i}`}
                        msg={m}
                        justAppeared={isNew(i, crudoMsgs.length, m.role === 'system' ? 0 : 1)}
                      />
                    ))}
                  </div>
                </div>

                <StatBar msgCount={crudoMsgs.length} tokenCount={tokensOfMessages(crudoMsgs)} msgLabel={L('msg', 'msg')} />

                {lastAssistantCrudo && (
                  <div className="mch-reply">
                    <div className="mch-reply-label">{L('Respuesta de la IA:', "AI's response:")}</div>
                    <div className="mch-reply-text">🤖 {lastAssistantCrudo}</div>
                  </div>
                )}

                <div className="mch-takeaway">
                  {turn < 3 && L('↑ Acordate: cada turno arranca de cero.', '↑ Remember: each turn starts from scratch.')}
                  {turn === 3 && (
                    <>
                      <b>{L('¿Viste?', 'See?')}</b> {L('En el turno 3 la IA no sabe tu nombre. No es que se haya "olvidado":', "On turn 3 the AI doesn't know your name. It's not that it \"forgot\":")} <b>{L('nunca lo recibió', 'it never received it')}</b>.
                    </>
                  )}
                </div>
              </div>

              {/* ---- CONVERSACIÓN ---- */}
              <div className="mch-col mch-col-conversacion">
                <ColumnHeader
                  emoji="🟢"
                  name={L('Conversación', 'Conversation')}
                  endpoint="POST /v1/chat/completions"
                  color="conversacion"
                />
                <div className="mch-col-desc">
                  {L('El cliente', 'The client')} <b>{L('acumula', 'accumulates')}</b> <code>messages[]</code> {L('en React state y lo reenvía completo en cada turno.', 'in React state and resends it whole each turn.')}
                </div>

                <div className="mch-payload">
                  <div className="mch-payload-label">messages[]</div>
                  <div className="mch-msglist">
                    {conversationMsgs.map((m, i) => (
                      <MessageRow
                        key={`conv-${i}`}
                        msg={m}
                        justAppeared={isNew(i, conversationMsgs.length, 2)}
                      />
                    ))}
                  </div>
                </div>

                <StatBar
                  msgCount={conversationMsgs.length}
                  tokenCount={tokensOfMessages(conversationMsgs)}
                  msgLabel={L('msg', 'msg')}
                />

                {lastAssistantConv && (
                  <div className="mch-reply">
                    <div className="mch-reply-label">{L('Respuesta de la IA:', "AI's response:")}</div>
                    <div className="mch-reply-text">🤖 {lastAssistantConv}</div>
                  </div>
                )}

                <div className="mch-takeaway">
                  {turn < 3 && L('↑ El array crece turno a turno. Cada POST es más grande.', '↑ The array grows turn by turn. Each POST is bigger.')}
                  {turn === 3 && (
                    <>
                      <b>{L('La memoria la pone tu app', 'Your app provides the memory')}</b>, {L('no el modelo. Si dejás de reenviar el historial, la IA se "olvida" en el acto.', "not the model. If you stop resending the history, the AI \"forgets\" instantly.")}
                    </>
                  )}
                </div>
              </div>

              {/* ---- PERSISTENTE ---- */}
              <div className="mch-col mch-col-persistente">
                <ColumnHeader
                  emoji="🔵"
                  name={L('Persistente', 'Persistent')}
                  endpoint="POST /v1/responses"
                  color="persistente"
                />
                <div className="mch-col-desc">
                  {L('Solo OpenAI. El historial vive en el', 'OpenAI only. The history lives on the')} <b>{L('server', 'server')}</b>. {L('El cliente solo manda el último mensaje + un', 'The client only sends the last message + a')} <code>conversation_id</code>.
                </div>

                <div className="mch-payload">
                  <div className="mch-payload-label">body</div>
                  {persistenteBody ? (
                    <div className="mch-pers-body">
                      <div className="mch-pers-row">
                        <span className="mch-pers-key">conversation:</span>
                        <span className="mch-pers-val mch-pers-id">"{persistenteBody.conversation}"</span>
                      </div>
                      <div className="mch-pers-row">
                        <span className="mch-pers-key">instructions:</span>
                        <span className="mch-pers-val mch-pers-system">
                          "{persistenteBody.instructions}"
                        </span>
                      </div>
                      <div className="mch-pers-row">
                        <span className="mch-pers-key">input:</span>
                        <span className={`mch-pers-val mch-pers-input${lastTurnAt && Date.now() - lastTurnAt < 2500 ? ' mch-msg-new' : ''}`}>
                          "{persistenteBody.input}"
                        </span>
                      </div>
                      <div className="mch-pers-foot">
                        {L('↑ Solo viaja el', '↑ Only the')} <b>{L('último', 'last')}</b> {L('mensaje. El historial está en', 'message travels. The history is in')}{' '}
                        <code>api.openai.com</code> {L('bajo ese', 'under that')} <code>conversation_id</code>.
                      </div>
                    </div>
                  ) : (
                    <div className="mch-pers-empty">
                      {L('(aún no se mandó nada — todavía no existe conversation_id)', "(nothing sent yet — no conversation_id exists yet)")}
                    </div>
                  )}
                </div>

                <StatBar
                  msgCount={persistenteBody ? 1 : 0}
                  tokenCount={tokensOfPersistente(persistenteBody)}
                  msgLabel={L('msg', 'msg')}
                />

                {lastAssistantPers && (
                  <div className="mch-reply">
                    <div className="mch-reply-label">{L('Respuesta de la IA:', "AI's response:")}</div>
                    <div className="mch-reply-text">🤖 {lastAssistantPers}</div>
                  </div>
                )}

                <div className="mch-takeaway">
                  {turn < 3 && L('↑ El POST queda chico aunque la charla crezca.', '↑ The POST stays small even as the chat grows.')}
                  {turn === 3 && (
                    <>
                      <b>{L('La memoria también es del cliente', 'The memory is the client\'s too')}</b>… {L('pero en este caso el cliente es', 'but in this case the client is')} <b>OpenAI</b>. {L('Tu app solo guarda el ID.', 'Your app only stores the ID.')}
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
                <b>{L('La API de chat es stateless', 'The chat API is stateless')}</b>. {L('Si querés que la IA recuerde, alguien tiene que guardar el historial y reenviarlo. Ese "alguien" es el cliente (Conversación) o el server del proveedor (Persistente).', "If you want the AI to remember, someone has to store the history and resend it. That \"someone\" is the client (Conversation) or the provider's server (Persistent).")}
              </li>
              <li>
                <b>{L('El', 'The')} <code>system</code> {L('viaja en todos los modos', 'travels in all modes')}</b>. {L('En Crudo y Conversación como', 'In Raw and Conversation as')} <code>messages[0]</code>. {L('En Persistente como campo aparte', 'In Persistent as a separate field')} (<code>instructions</code>).
              </li>
              <li>
                <b>{L('Cada modo tiene un costo de tokens distinto.', 'Each mode has a different token cost.')}</b> {L('En Crudo cada turno es chico pero la IA es tonta. En Conversación cada turno crece y se paga el historial entero. En Persistente OpenAI te cobra igual los tokens del historial — solo te ahorra el ancho de banda del cliente.', 'In Raw each turn is small but the AI is dumb. In Conversation each turn grows and you pay for the whole history. In Persistent OpenAI bills you the history tokens all the same — it only saves you the client bandwidth.')}
              </li>
              <li>
                <b>{L('Persistente es lock-in', 'Persistent is lock-in')}</b>. {L('El endpoint', 'The endpoint')} <code>/v1/responses</code> {L('y la Conversations API son OpenAI-only. Si mañana querés cambiar a Claude, el historial guardado en OpenAI no se mueve.', 'and the Conversations API are OpenAI-only. If tomorrow you want to switch to Claude, the history stored in OpenAI doesn\'t move.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para ver esto con un request', 'To see this with a')} <i>{L('real', 'real')}</i> {L('request, andá al', 'request, go to the')} <a href="/">Chat</a> {L('y mirá el panel "Request → API (crudo)" mientras cambiás de modo con el segmented control de arriba. Para entender la anatomía completa del POST,', 'and watch the "Request → API (raw)" panel while you switch modes with the segmented control at the top. To understand the full anatomy of the POST,')}{' '}
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
