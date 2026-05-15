import { useEffect, useState } from 'react'
import DocsNav from './DocsNav.jsx'

const STORAGE_KEY = 'chat_context_snapshot'

export default function Contexto({ onBack }) {
  const [snapshot, setSnapshot] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const readSnapshot = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setSnapshot(JSON.parse(raw))
      } else {
        setSnapshot(null)
      }
    } catch {
      setSnapshot(null)
    }
  }

  useEffect(() => {
    readSnapshot()
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) readSnapshot()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(readSnapshot, 1500)
    return () => clearInterval(id)
  }, [autoRefresh])

  const estimateTokens = (text) => Math.ceil((text || '').length / 4)
  const messages = snapshot?.messages || []
  const totalTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0)
  const updatedAt = snapshot?.updatedAt
    ? new Date(snapshot.updatedAt).toLocaleString('es-AR')
    : null

  return (
    <div className="criollo">
      <header className="header">
        <h1>Contexto — lo único que el modelo "sabe"</h1>
        <button onClick={onBack} className="clear-btn" type="button">← Volver al chat</button>
      </header>

      <div className="criollo-content">
        <DocsNav current="contexto" />

        <section className="criollo-section">
          <h2>La tesis</h2>
          <p>
            <b>El modelo es stateless.</b> Entre dos requests no recuerda nada: ni quién sos,
            ni qué le pediste hace un minuto, ni qué te respondió. Cada llamada a la API es
            una conversación nueva con un amnésico.
          </p>
          <p>
            Lo único que el modelo "sabe" en este turno es <b>exactamente lo que vos le
            mandaste en el payload</b>. Si no está en el JSON que sale del navegador, no
            existe para el modelo.
          </p>
          <p>
            Por eso esta app tiene <b>cuatro modos</b> en el menú principal. No son cuatro
            features distintas: son <b>cuatro ángulos del mismo problema</b>. Cada uno te
            muestra cómo el contexto se construye, crece, se inyecta o se ensucia — y cómo
            eso determina la respuesta.
          </p>
          <div className="criollo-quote">
{`Chat            → el contexto como historial conversacional
Editor          → el contexto como payload mínimo (código + instrucción)
Loop Agéntico   → el contexto que crece solo (tool_results acumulados)
AGENTS.md       → el contexto como instrucción inyectada en system`}
          </div>
          <p>
            Si entendés cómo cada modo arma su <code>messages[]</code>, entendés la API.
            El resto son detalles.
          </p>
        </section>

        <section className="criollo-section">
          <h2>1) Chat — el contexto como historial</h2>
          <p>
            El caso clásico. Vos escribís, el modelo responde, vos respondés a la respuesta.
            La app guarda cada turno en un array <code>messages[]</code> y en el próximo
            request <b>lo manda entero</b>. El cliente es la memoria.
          </p>
          <p>El array empieza con un <code>system</code> y va creciendo de a dos:</p>
          <div className="criollo-quote">
{`[
  { role: "system",    content: "Sos un asistente útil..." },
  { role: "user",      content: "Hola" },
  { role: "assistant", content: "¡Hola! ¿En qué te ayudo?" },
  { role: "user",      content: "¿Cómo te llamabas?" }   ← turno actual
]`}
          </div>
          <p>
            En el cuarto turno, el modelo "se acuerda" del saludo porque vos le reenviaste
            los tres turnos anteriores. No es memoria — es <b>repetición</b>.
          </p>

          <h3>Los tres sub-modos del chat (segmented control)</h3>
          <ul>
            <li>
              <b>Crudo</b> — se manda solo el último user message. Sin <code>system</code>,
              sin historial. Demuestra que sin contexto el modelo no recuerda nada, ni
              siquiera quién es.
            </li>
            <li>
              <b>Conversación</b> — el array crece y se reenvía completo. Vos sos la memoria.
              Es lo que hace cualquier app de chat con LLMs hoy.
            </li>
            <li>
              <b>Persistente</b> — solo OpenAI. El historial vive en el server
              (<code>/v1/responses</code> + Conversations API), vos solo mandás el último
              mensaje y un <code>conversation_id</code>. Mismo resultado para el usuario,
              arquitectura distinta: la memoria es del proveedor.
            </li>
          </ul>
          <p>
            <b>Probalo:</b> hacé la misma pregunta en Crudo y en Conversación. La respuesta
            cambia. Eso es el contexto haciendo su trabajo.
          </p>
        </section>

        <section className="criollo-section snapshot-section">
          <div className="snapshot-banner">
            <h2 className="snapshot-title">📸 Foto en vivo del contexto del chat</h2>
            <div className="snapshot-controls">
              <span className={`live-dot ${autoRefresh ? 'live-on' : 'live-off'}`}></span>
              <label className="live-label">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>{autoRefresh ? 'Live (1.5s)' : 'Manual'}</span>
              </label>
              <button onClick={readSnapshot} className="clear-btn" type="button">
                ↻ Refrescar
              </button>
            </div>
          </div>

          <p className="snapshot-intro">
            Acá ves <b>exactamente</b> el array <code>messages[]</code> que la app va a
            mandarle al proveedor en el próximo request. Mandá mensajes en la pestaña del
            chat y mirá cómo crece. Cambiá entre Crudo / Conversación y mirá cómo cambia
            lo que se envía.
          </p>

          <div className="snapshot-stats">
            <div className="stat">
              <div className="stat-num">{messages.length}</div>
              <div className="stat-label">mensajes</div>
            </div>
            <div className="stat">
              <div className="stat-num">≈ {totalTokens}</div>
              <div className="stat-label">tokens estimados</div>
            </div>
            <div className="stat">
              <div className="stat-num stat-time">{updatedAt || '—'}</div>
              <div className="stat-label">última actualización</div>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="snapshot-empty">
              <p><b>Todavía no hay nada guardado.</b></p>
              <ol>
                <li>Andá a la pestaña del chat (la que dice "{'{'} La IA Cruda {'}'} · modo Chat")</li>
                <li>Escribí cualquier mensaje y mandalo</li>
                <li>Volvé acá: si tenés "Live" activado, aparece solo</li>
              </ol>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>
                Si seguís sin ver nada, fijate que ambas pestañas estén en
                <code> http://localhost:5173</code> (mismo origen — localStorage no se comparte
                entre orígenes distintos).
              </p>
            </div>
          ) : (
            <>
              <div className="ctx-snapshot">
                {messages.map((m, i) => (
                  <div key={i} className={`ctx-msg ctx-${m.role}`}>
                    <span className="ctx-role">{m.role}</span>
                    <span className="ctx-content">{m.content}</span>
                    <span className="ctx-tokens">≈{estimateTokens(m.content)}t</span>
                  </div>
                ))}
              </div>
              <p className="snapshot-hint">
                💡 El snapshot se guarda en <code>localStorage</code> cada vez que el chat
                cambia. Con "Live" activado se relee cada 1.5s.
              </p>
              <div className="prov-callout" style={{ marginTop: 12 }}>
                <p>
                  ⚠️ <b>Heads up — esto es una elección de tutorial, no una recomendación.</b>{' '}
                  Esta app guarda <b>todo</b> el contexto (mensajes, historial, AGENTS.md,
                  logs) en <code>localStorage</code> del navegador. Es lo más simple para que
                  veas el array <code>messages[]</code> con tus propios ojos y para que dos
                  pestañas se sincronicen sin servidor. <b>En una app real no se hace así.</b>
                </p>
                <p style={{ marginTop: 8 }}>
                  Por qué no: <code>localStorage</code> es sincrónico, tiene ~5MB de tope,
                  vive en el navegador (se pierde si el usuario limpia el cache o cambia de
                  máquina), no encripta nada, y <b>no debería tocar PII ni tokens de sesión</b>.
                  En producción el contexto vive donde corresponde según el caso:
                </p>
                <ul style={{ marginTop: 4 }}>
                  <li><b>Historial de chat</b> — base de datos del lado server, atada al userId.</li>
                  <li><b>Tokens / API keys</b> — nunca en el browser; van en el server (env vars, secret manager).</li>
                  <li><b>Estado de UI efímero</b> — memoria de la app o IndexedDB si pesa.</li>
                  <li><b>Conversaciones largas</b> — Conversations API del proveedor (OpenAI), o tu propia tabla con resúmenes/embeddings.</li>
                </ul>
                <p style={{ marginTop: 8 }}>
                  Acá uso <code>localStorage</code> a propósito: cero backend, todo inspeccionable
                  desde DevTools (<code>Application → Storage → Local Storage</code>), y vos podés
                  borrar/editar el contexto a mano para experimentar. Es <b>didáctico</b>, no
                  arquitectura.
                </p>
              </div>
            </>
          )}
        </section>

        <section className="criollo-section">
          <h2>2) Editor — el contexto como payload mínimo</h2>
          <p>
            En <a href="/editor" target="_blank" rel="noreferrer"><code>/editor</code></a> no
            hay charla. Hay <b>un bloque de código + una instrucción</b>. El payload se arma
            en el momento y, por defecto, no acumula historial. El contexto del próximo
            request lo armás vos eligiendo qué código pegás y qué instrucción escribís.
          </p>
          <p>
            Esto demuestra algo que no se ve en el chat: <b>"contexto" no quiere decir
            "conversación"</b>. Un bloque de código pegado en el <code>system</code> es
            contexto. Un <code>AGENTS.md</code> de 200 líneas es contexto. Un PDF parseado
            y embebido en el <code>user</code> es contexto. Es <i>todo</i> lo que entra al
            payload.
          </p>
          <p>
            El toggle <b>"keep context"</b> activa el modo conversacional sobre el editor:
            cada iteración se queda en el array, así podés decir "y ahora agregale tests"
            sin volver a pegar el código. Es el mismo mecanismo del Chat, aplicado a otro
            flujo.
          </p>
        </section>

        <section className="criollo-section">
          <h2>3) Loop Agéntico — el contexto que crece solo</h2>
          <p>
            En <a href="/loop-agentico" target="_blank" rel="noreferrer"><code>/loop-agentico</code></a>
            el modelo tiene tools (<code>read_code</code>, <code>edit_code</code>, etc.) y
            corre en un loop: llama una tool, recibe el resultado, decide qué hacer, llama
            otra, y así. <b>Cada <code>tool_result</code> se queda en el historial</b> para
            que el modelo lo "recuerde" en el siguiente paso.
          </p>
          <p>
            Acá pasa algo que en el chat no se nota: <b>el contexto crece sin que vos
            escribas nada</b>. Un loop de 10 pasos puede dejar el array con 30+ mensajes,
            porque cada paso suma un <code>assistant</code> (la decisión), un <code>tool_call</code>
            y un <code>tool_result</code>. El historial se hincha solo.
          </p>
          <p>
            Y acá aparece el problema real: <b>context rot</b>. Cuando el contexto se llena
            de logs viejos, outputs de tools que ya no importan y decisiones de pasos
            anteriores, el modelo empieza a confundirse, repite trabajo, ignora la consigna
            original. La performance no degrada porque el modelo se canse — degrada porque
            le estás dando demasiado material irrelevante donde buscar la respuesta.
          </p>
          <p>
            Esto es lo que el <b>modo Ruido</b> de esta app simula a propósito: la función
            <code> bloatToolResult</code> en <code>src/noise.js</code> infla cada
            <code> tool_result</code> con logs falsos. Es la misma degradación que ocurre
            naturalmente en agentes reales después de muchos pasos.
          </p>
        </section>

        <section className="criollo-section">
          <h2>4) AGENTS.md — el contexto como instrucción inyectada</h2>
          <p>
            En <a href="/agents-md" target="_blank" rel="noreferrer"><code>/agents-md</code></a>
            el contexto se construye distinto: hay un archivo <code>AGENTS.md</code> con
            reglas y, opcionalmente, "skills" (recetas con tests). <b>Todo eso se inyecta
            al <code>system</code> prompt antes del user message.</b>
          </p>
          <div className="criollo-quote">
{`[
  { role: "system", content: "<prompt base del agente>
                              ---
                              # AGENTS.md
                              <reglas obligatorias>
                              ---
                              # Skill: arch-check
                              <recetas con tests>" },
  { role: "user",   content: "Agregá un método retirar(monto)..." }
]`}
          </div>
          <p>
            El user prompt es el mismo de siempre. Lo que cambia es <b>quién es el agente</b>:
            con un <code>AGENTS.md</code> distinto, la misma pregunta produce una respuesta
            distinta. No porque el modelo "haya aprendido" nada nuevo — porque el contexto
            que vos armaste lo configuró para responder así.
          </p>
          <p>
            Esto demuestra el ángulo más político del contexto: <b>quien controla el
            <code>system</code> controla al agente</b>. Si alguien puede inyectar texto en
            tu system prompt, puede cambiar tu producto sin tocar tu modelo.
          </p>
        </section>

        <section className="criollo-section">
          <h2>El contexto cuesta — quién paga</h2>
          <p>Una vez que entendés que todo es contexto, aparece la pregunta: ¿cuánto cuesta?</p>
          <ul>
            <li>
              <b>Tokens de input — cada llamada.</b> En modo Conversación, en el turno 50
              estás mandando los 50 turnos anteriores. Te facturan por <b>input</b> los 50
              cada vez. El costo de una conversación larga crece más rápido de lo que parece.
            </li>
            <li>
              <b>Latencia.</b> Más tokens de input = más tiempo procesando el prompt antes
              de empezar a generar. Se nota a partir de los miles de tokens.
            </li>
            <li>
              <b>Ventana de contexto.</b> Cada modelo tiene un límite. Si te pasás, el
              endpoint devuelve <code>400</code>. Las ventanas varían entre 8k y 1M+ tokens
              según el modelo — mirá la doc del proveedor que estés usando.
            </li>
            <li>
              <b>Calidad.</b> Más tokens no es mejor. Más allá de cierto punto, el modelo
              empieza a perderse (context rot). Por eso las estrategias serias de agentes
              <i> resumen</i> o <i>recortan</i> el historial cada tantos pasos.
            </li>
          </ul>
          <p>
            <b>Modo Persistente</b> mueve la factura del costo de transporte (no mandás el
            historial entero por la red), pero no del costo de procesamiento: el modelo
            sigue procesando todo el historial del lado del server.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Conclusión</h2>
          <p>
            Los cuatro modos de esta app cuentan la misma historia desde cuatro ángulos:
          </p>
          <ul>
            <li><b>Chat</b> — el contexto crece turno a turno y vos lo ves.</li>
            <li><b>Editor</b> — el contexto es lo que pegás en el payload, no hace falta una conversación.</li>
            <li><b>Loop Agéntico</b> — el contexto crece solo cuando hay tools; eventualmente se ensucia y la performance cae.</li>
            <li><b>AGENTS.md</b> — el contexto del <code>system</code> redefine al agente sin tocar el modelo.</li>
          </ul>
          <p>
            Distintos flujos, mismo principio: <b>el modelo no sabe nada que no esté en el
            payload</b>. Ingeniería con LLMs es, en su mayor parte, ingeniería del contexto.
          </p>
        </section>

        <footer className="criollo-footer">
          <button onClick={onBack} className="clear-btn" type="button">← Volver al chat</button>
        </footer>
      </div>
    </div>
  )
}
