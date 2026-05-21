import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'

/**
 * Comparador animado de los 3 modos del Chat:
 *  - Crudo:        cada turno manda solo system + último user. La IA no recuerda.
 *  - Conversación: el cliente acumula messages[] y lo reenvía completo cada turno.
 *  - Persistente:  (solo OpenAI) el historial vive en el server, el cliente
 *                  manda solo el último mensaje + un conversation_id.
 *
 * El guion son 3 turnos fijos. Las respuestas de la IA están mockeadas a
 * propósito: la página es pedagógica, no consume API.
 */

const SYSTEM_TEXT = 'Eres un asistente útil que responde en español de forma clara y concisa.'

// El guion: 3 turnos. user es lo que escribe el alumno. assistant es lo que
// el modelo "respondería" en cada modo. En Crudo, el modelo no tiene memoria
// del nombre, así que la respuesta del turno 3 cambia.
const SCRIPT = [
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

const estTokens = (s) => Math.max(1, Math.ceil((s || '').length / 4))

// Una "snapshot" representa lo que efectivamente viaja en el POST de ese turno
// para cada modo. La función las construye en base al turno actual (0..3, donde
// 0 = todavía no se mandó nada).
function buildSnapshots(turn) {
  const sys = { role: 'system', content: SYSTEM_TEXT }

  // Para Crudo y Conversación armamos el array messages[].
  const conversationMsgs = [sys]
  for (let i = 0; i < turn; i += 1) {
    conversationMsgs.push({ role: 'user', content: SCRIPT[i].user })
    conversationMsgs.push({ role: 'assistant', content: SCRIPT[i].assistantConversation })
  }

  // En Crudo, solo viaja system + el último user (sin assistant: el cliente
  // no acumula).
  let crudoMsgs
  if (turn === 0) {
    crudoMsgs = [sys]
  } else {
    crudoMsgs = [sys, { role: 'user', content: SCRIPT[turn - 1].user }]
  }

  // Persistente: el cliente solo manda el último user message. El system viaja
  // como `instructions` en el shape de /v1/responses, no como messages[0].
  let persistenteBody
  if (turn === 0) {
    persistenteBody = null
  } else {
    persistenteBody = {
      conversation: 'conv_abc123…',
      instructions: SYSTEM_TEXT,
      input: SCRIPT[turn - 1].user,
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

export default function ModosChat() {
  // turn = cantidad de turnos completados. 0 = todavía no se mandó nada,
  // 1 = se mandó el primero, etc. Máximo 3.
  const [turn, setTurn] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  // Cuando un turno acaba de avanzar, marcamos `lastTurnAt` para animar fade-in
  // de los mensajes nuevos. Se resetea después de un rato.
  const [lastTurnAt, setLastTurnAt] = useState(0)
  const autoTimerRef = useRef(null)

  const { crudoMsgs, conversationMsgs, persistenteBody } = buildSnapshots(turn)
  const lastUserText = turn > 0 ? SCRIPT[turn - 1].user : null
  const lastAssistantCrudo = turn > 0 ? SCRIPT[turn - 1].assistantCrudo : null
  const lastAssistantConv  = turn > 0 ? SCRIPT[turn - 1].assistantConversation : null
  const lastAssistantPers  = turn > 0 ? SCRIPT[turn - 1].assistantPersistente : null

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

  // Auto-play: encadena los 3 turnos con un delay generoso para que el alumno
  // alcance a leer cada paso.
  useEffect(() => {
    if (!autoPlaying) return
    if (turn >= SCRIPT.length) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setTurn((t) => Math.min(t + 1, SCRIPT.length))
      setLastTurnAt(Date.now())
    }, 1800)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, turn])

  // El "justAppeared" se aplica a los mensajes agregados en el último turno.
  // Como simplificación, lo aplicamos a los últimos N mensajes según el modo
  // y según la marca de tiempo. Se desactiva sola al cambiar `turn`.
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
          <span className="docs-header-subtitle">crudo vs conversación vs persistente, lado a lado</span>
        </h1>
        <a href="/" className="clear-btn">← Modos</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label="Navegación de documentación">
          <DocsNav current="demo-chat" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">¿Para qué sirve esta página?</div>
            <p>
              Misma conversación, tres modos. Mirá cómo crece — o no — el array
              <code> messages[]</code> que viaja en cada <code>POST</code>. Si
              entendés esto, entendiste el 80% de la API de chat.
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 La pregunta del millón</h2>
            <p>
              ¿La IA <b>se acuerda</b> de lo que le dijiste antes? La respuesta corta es: <b>no</b>.
              La respuesta larga es: depende de <b>quién</b> guarda el historial. Esta página simula
              la misma conversación de 3 turnos en los 3 modos del Chat y muestra, lado a lado, qué
              JSON sale del navegador en cada turno.
            </p>
            <div className="prov-callout">
              <p>
                Las respuestas de la IA acá están <b>mockeadas</b> (no consumen API). El foco
                pedagógico es lo que viaja en el <code>POST</code>, no la respuesta. Para ver el
                request real, andá al <a href="/">Chat</a>.
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
                  {isFresh && '— todavía no se mandó nada'}
                  {!isFresh && !isDone && `— turno ${turn} de 3 completado`}
                  {isDone && '— conversación completa'}
                </span>
              </div>
              <div className="mch-buttons">
                <button
                  type="button"
                  className="mch-btn mch-btn-primary"
                  onClick={advance}
                  disabled={isDone || autoPlaying}
                  title="Avanza un turno: muestra el POST que sale en cada modo"
                >
                  ▶ Siguiente turno
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={() => setAutoPlaying((v) => !v)}
                  disabled={isDone}
                  title="Encadena los 3 turnos con un delay"
                >
                  {autoPlaying ? '⏸ Pausar' : '▶▶ Auto'}
                </button>
                <button
                  type="button"
                  className="mch-btn"
                  onClick={reset}
                  disabled={turn === 0 && !autoPlaying}
                  title="Volver al turno 0"
                >
                  ↺ Reiniciar
                </button>
              </div>
            </div>

            <div className="mch-prompt-preview">
              <span className="mch-prompt-label">Próximo mensaje del usuario:</span>
              {isDone ? (
                <span className="mch-prompt-text mch-prompt-empty">
                  (no hay más turnos en el guion — tocá Reiniciar para volver a empezar)
                </span>
              ) : (
                <span className="mch-prompt-text">
                  "{SCRIPT[turn].user}"
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
                  name="Crudo"
                  endpoint="POST /v1/chat/completions"
                  color="crudo"
                />
                <div className="mch-col-desc">
                  Cada turno mando <b>solo</b> el system + el último <code>user</code>.
                  El cliente <b>no</b> acumula historial.
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

                <StatBar msgCount={crudoMsgs.length} tokenCount={tokensOfMessages(crudoMsgs)} />

                {lastAssistantCrudo && (
                  <div className="mch-reply">
                    <div className="mch-reply-label">Respuesta de la IA:</div>
                    <div className="mch-reply-text">🤖 {lastAssistantCrudo}</div>
                  </div>
                )}

                <div className="mch-takeaway">
                  {turn < 3 && '↑ Acordate: cada turno arranca de cero.'}
                  {turn === 3 && (
                    <>
                      <b>¿Viste?</b> En el turno 3 la IA no sabe tu nombre.
                      No es que se haya "olvidado": <b>nunca lo recibió</b>.
                    </>
                  )}
                </div>
              </div>

              {/* ---- CONVERSACIÓN ---- */}
              <div className="mch-col mch-col-conversacion">
                <ColumnHeader
                  emoji="🟢"
                  name="Conversación"
                  endpoint="POST /v1/chat/completions"
                  color="conversacion"
                />
                <div className="mch-col-desc">
                  El cliente <b>acumula</b> <code>messages[]</code> en React state y lo
                  reenvía completo en cada turno.
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
                />

                {lastAssistantConv && (
                  <div className="mch-reply">
                    <div className="mch-reply-label">Respuesta de la IA:</div>
                    <div className="mch-reply-text">🤖 {lastAssistantConv}</div>
                  </div>
                )}

                <div className="mch-takeaway">
                  {turn < 3 && '↑ El array crece turno a turno. Cada POST es más grande.'}
                  {turn === 3 && (
                    <>
                      <b>La memoria la pone tu app</b>, no el modelo. Si dejás de
                      reenviar el historial, la IA se "olvida" en el acto.
                    </>
                  )}
                </div>
              </div>

              {/* ---- PERSISTENTE ---- */}
              <div className="mch-col mch-col-persistente">
                <ColumnHeader
                  emoji="🔵"
                  name="Persistente"
                  endpoint="POST /v1/responses"
                  color="persistente"
                />
                <div className="mch-col-desc">
                  Solo OpenAI. El historial vive en el <b>server</b>. El cliente solo manda el
                  último mensaje + un <code>conversation_id</code>.
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
                        ↑ Solo viaja el <b>último</b> mensaje. El historial está en{' '}
                        <code>api.openai.com</code> bajo ese <code>conversation_id</code>.
                      </div>
                    </div>
                  ) : (
                    <div className="mch-pers-empty">
                      (aún no se mandó nada — todavía no existe conversation_id)
                    </div>
                  )}
                </div>

                <StatBar
                  msgCount={persistenteBody ? 1 : 0}
                  tokenCount={tokensOfPersistente(persistenteBody)}
                />

                {lastAssistantPers && (
                  <div className="mch-reply">
                    <div className="mch-reply-label">Respuesta de la IA:</div>
                    <div className="mch-reply-text">🤖 {lastAssistantPers}</div>
                  </div>
                )}

                <div className="mch-takeaway">
                  {turn < 3 && '↑ El POST queda chico aunque la charla crezca.'}
                  {turn === 3 && (
                    <>
                      <b>La memoria también es del cliente</b>… pero en este caso
                      el cliente es <b>OpenAI</b>. Tu app solo guarda el ID.
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
                <b>La API de chat es stateless</b>. Si querés que la IA recuerde, alguien tiene
                que guardar el historial y reenviarlo. Ese "alguien" es el cliente
                (Conversación) o el server del proveedor (Persistente).
              </li>
              <li>
                <b>El <code>system</code> viaja en todos los modos</b>. En Crudo y Conversación
                como <code>messages[0]</code>. En Persistente como campo aparte
                (<code>instructions</code>).
              </li>
              <li>
                <b>Cada modo tiene un costo de tokens distinto.</b> En Crudo cada turno es chico
                pero la IA es tonta. En Conversación cada turno crece y se paga el historial
                entero. En Persistente OpenAI te cobra igual los tokens del historial — solo te
                ahorra el ancho de banda del cliente.
              </li>
              <li>
                <b>Persistente es lock-in</b>. El endpoint <code>/v1/responses</code> y la
                Conversations API son OpenAI-only. Si mañana querés cambiar a Claude, el
                historial guardado en OpenAI no se mueve.
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Para ver esto con un request <i>real</i>, andá al <a href="/">Chat</a> y mirá el
              panel "Request → API (crudo)" mientras cambiás de modo con el segmented control de
              arriba. Para entender la anatomía completa del POST,{' '}
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
