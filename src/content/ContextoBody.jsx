// Cuerpo de /contexto en ES (base de verdad) y EN. La sección "foto en vivo"
// es interactiva: el host (Contexto.jsx) mantiene el estado del snapshot y lo
// pasa por props. Los `id` de sección son anclas internas: idénticos en ambos idiomas.

export function ContextoBodyEs({ messages, totalTokens, updatedAt, autoRefresh, setAutoRefresh, readSnapshot, estimateTokens }) {
  return (
    <div className="docs-main">

      <section className="criollo-section" id="tesis">
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

      <section className="criollo-section" id="chat">
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
            <b>Crudo</b> — se manda el <code>system</code> + el último user message,
            sin historial. Demuestra que sin acumular la conversación el modelo no
            recuerda nada de los turnos anteriores, aunque sí mantiene la personalidad
            que le da el <code>system</code>.
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

      <section className="criollo-section snapshot-section" id="snapshot">
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

      <section className="criollo-section" id="editor">
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

      <section className="criollo-section" id="loop">
        <h2>3) Loop Agéntico — el contexto que crece solo</h2>
        <p>
          En <a href="/loop-agentico" target="_blank" rel="noreferrer"><code>/loop-agentico</code></a>{' '}
          el modelo tiene tools (<code>read_code</code>, <code>edit_code</code>, etc.) y
          corre en un loop: llama una tool, recibe el resultado, decide qué hacer, llama
          otra, y así. <b>Cada <code>tool_result</code> se queda en el historial</b> para
          que el modelo lo "recuerde" en el siguiente paso.
        </p>
        <p>
          Acá pasa algo que en el chat no se nota: <b>el contexto crece sin que vos
          escribas nada</b>. Un loop de 10 pasos puede dejar el array con 30+ mensajes,
          porque cada paso suma un <code>assistant</code> (la decisión), un <code>tool_call</code>{' '}
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
          Esto es lo que el lab <a href="/ruido" target="_blank" rel="noreferrer"><code>/ruido</code></a>{' '}
          simula a propósito: la función <code>bloatToolResult</code> en{' '}
          <code>src/noise.js</code> infla cada <code>tool_result</code> con logs falsos,
          y podés correr la misma tarea con y sin ruido para comparar. Es la misma
          degradación que ocurre naturalmente en agentes reales después de muchos pasos.
        </p>
      </section>

      <section className="criollo-section" id="agents-md">
        <h2>4) AGENTS.md — el contexto como instrucción inyectada</h2>
        <p>
          En <a href="/agents-md" target="_blank" rel="noreferrer"><code>/agents-md</code></a>{' '}
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
          Esto demuestra el ángulo más político del contexto: <b>quien controla el{' '}
          <code>system</code> controla al agente</b>. Si alguien puede inyectar texto en
          tu system prompt, puede cambiar tu producto sin tocar tu modelo.
        </p>
      </section>

      <section className="criollo-section" id="costo">
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

      <section className="criollo-section" id="conclusion">
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
        <a href="/" className="clear-btn">← Modos</a>
      </footer>

    </div>
  )
}

export function ContextoBodyEn({ messages, totalTokens, updatedAt, autoRefresh, setAutoRefresh, readSnapshot, estimateTokens }) {
  return (
    <div className="docs-main">

      <section className="criollo-section" id="tesis">
        <h2>The thesis</h2>
        <p>
          <b>The model is stateless.</b> Between two requests it remembers nothing: not who you are,
          not what you asked a minute ago, not what it answered. Every API call is
          a brand-new conversation with an amnesiac.
        </p>
        <p>
          The only thing the model "knows" this turn is <b>exactly what you sent it in the
          payload</b>. If it's not in the JSON leaving the browser, it doesn't
          exist for the model.
        </p>
        <p>
          That's why this app has <b>four modes</b> in the main menu. They're not four
          different features: they're <b>four angles on the same problem</b>. Each one
          shows you how context is built, grows, gets injected or gets polluted — and how
          that determines the answer.
        </p>
        <div className="criollo-quote">
{`Chat            → context as conversational history
Editor          → context as minimal payload (code + instruction)
Agentic Loop    → context that grows on its own (accumulated tool_results)
AGENTS.md       → context as an instruction injected into system`}
        </div>
        <p>
          If you understand how each mode builds its <code>messages[]</code>, you understand the API.
          The rest is details.
        </p>
      </section>

      <section className="criollo-section" id="chat">
        <h2>1) Chat — context as history</h2>
        <p>
          The classic case. You type, the model responds, you respond to the response.
          The app stores each turn in a <code>messages[]</code> array and on the next
          request <b>sends it whole</b>. The client is the memory.
        </p>
        <p>The array starts with a <code>system</code> and grows two at a time:</p>
        <div className="criollo-quote">
{`[
  { role: "system",    content: "You are a helpful assistant..." },
  { role: "user",      content: "Hi" },
  { role: "assistant", content: "Hi! How can I help?" },
  { role: "user",      content: "What was your name again?" }   ← current turn
]`}
        </div>
        <p>
          On the fourth turn, the model "remembers" the greeting because you resent
          the three previous turns. It's not memory — it's <b>repetition</b>.
        </p>

        <h3>The chat's three sub-modes (segmented control)</h3>
        <ul>
          <li>
            <b>Raw</b> — it sends the <code>system</code> + the last user message,
            no history. It shows that without accumulating the conversation the model
            remembers nothing of the previous turns, though it does keep the personality
            the <code>system</code> gives it.
          </li>
          <li>
            <b>Conversation</b> — the array grows and is resent whole. You are the memory.
            It's what any LLM chat app does today.
          </li>
          <li>
            <b>Persistent</b> — OpenAI only. The history lives on the server
            (<code>/v1/responses</code> + Conversations API), you only send the last
            message and a <code>conversation_id</code>. Same result for the user,
            different architecture: the memory belongs to the provider.
          </li>
        </ul>
        <p>
          <b>Try it:</b> ask the same question in Raw and in Conversation. The answer
          changes. That's context doing its job.
        </p>
      </section>

      <section className="criollo-section snapshot-section" id="snapshot">
        <div className="snapshot-banner">
          <h2 className="snapshot-title">📸 Live snapshot of the chat context</h2>
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
              ↻ Refresh
            </button>
          </div>
        </div>

        <p className="snapshot-intro">
          Here you see <b>exactly</b> the <code>messages[]</code> array the app will
          send the provider on the next request. Send messages in the chat tab and
          watch it grow. Switch between Raw / Conversation and watch what gets sent change.
        </p>

        <div className="snapshot-stats">
          <div className="stat">
            <div className="stat-num">{messages.length}</div>
            <div className="stat-label">messages</div>
          </div>
          <div className="stat">
            <div className="stat-num">≈ {totalTokens}</div>
            <div className="stat-label">estimated tokens</div>
          </div>
          <div className="stat">
            <div className="stat-num stat-time">{updatedAt || '—'}</div>
            <div className="stat-label">last update</div>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="snapshot-empty">
            <p><b>Nothing saved yet.</b></p>
            <ol>
              <li>Go to the chat tab (the one that says "{'{'} La IA Cruda {'}'} · Chat mode")</li>
              <li>Type any message and send it</li>
              <li>Come back here: if you have "Live" enabled, it shows up on its own</li>
            </ol>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              If you still see nothing, check that both tabs are on
              <code> http://localhost:5173</code> (same origin — localStorage isn't shared
              across different origins).
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
              💡 The snapshot is saved to <code>localStorage</code> every time the chat
              changes. With "Live" on it's re-read every 1.5s.
            </p>
            <div className="prov-callout" style={{ marginTop: 12 }}>
              <p>
                ⚠️ <b>Heads up — this is a tutorial choice, not a recommendation.</b>{' '}
                This app stores <b>all</b> the context (messages, history, AGENTS.md,
                logs) in the browser's <code>localStorage</code>. It's the simplest way for you to
                see the <code>messages[]</code> array with your own eyes and for two
                tabs to sync without a server. <b>You don't do this in a real app.</b>
              </p>
              <p style={{ marginTop: 8 }}>
                Why not: <code>localStorage</code> is synchronous, has a ~5MB cap,
                lives in the browser (lost if the user clears the cache or switches
                machines), encrypts nothing, and <b>should never touch PII or session tokens</b>.
                In production, context lives where it belongs depending on the case:
              </p>
              <ul style={{ marginTop: 4 }}>
                <li><b>Chat history</b> — server-side database, tied to the userId.</li>
                <li><b>Tokens / API keys</b> — never in the browser; they go on the server (env vars, secret manager).</li>
                <li><b>Ephemeral UI state</b> — app memory or IndexedDB if it's heavy.</li>
                <li><b>Long conversations</b> — the provider's Conversations API (OpenAI), or your own table with summaries/embeddings.</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                Here I use <code>localStorage</code> on purpose: zero backend, everything inspectable
                from DevTools (<code>Application → Storage → Local Storage</code>), and you can
                delete/edit the context by hand to experiment. It's <b>didactic</b>, not
                architecture.
              </p>
            </div>
          </>
        )}
      </section>

      <section className="criollo-section" id="editor">
        <h2>2) Editor — context as minimal payload</h2>
        <p>
          In <a href="/editor" target="_blank" rel="noreferrer"><code>/editor</code></a> there's
          no chat. There's <b>a block of code + an instruction</b>. The payload is built
          on the spot and, by default, accumulates no history. You build the next
          request's context by choosing what code you paste and what instruction you write.
        </p>
        <p>
          This shows something the chat doesn't: <b>"context" doesn't mean
          "conversation"</b>. A block of code pasted into the <code>system</code> is
          context. A 200-line <code>AGENTS.md</code> is context. A parsed PDF
          embedded in the <code>user</code> is context. It's <i>everything</i> that enters the
          payload.
        </p>
        <p>
          The <b>"keep context"</b> toggle enables conversational mode over the editor:
          each iteration stays in the array, so you can say "and now add tests"
          without re-pasting the code. It's the same mechanism as the Chat, applied to another
          flow.
        </p>
      </section>

      <section className="criollo-section" id="loop">
        <h2>3) Agentic Loop — context that grows on its own</h2>
        <p>
          In <a href="/loop-agentico" target="_blank" rel="noreferrer"><code>/loop-agentico</code></a>{' '}
          the model has tools (<code>read_code</code>, <code>edit_code</code>, etc.) and
          runs in a loop: it calls a tool, gets the result, decides what to do, calls
          another, and so on. <b>Each <code>tool_result</code> stays in the history</b> so
          the model "remembers" it in the next step.
        </p>
        <p>
          Here something happens that the chat doesn't reveal: <b>context grows without you
          typing anything</b>. A 10-step loop can leave the array with 30+ messages,
          because each step adds an <code>assistant</code> (the decision), a <code>tool_call</code>{' '}
          and a <code>tool_result</code>. The history inflates on its own.
        </p>
        <p>
          And here's the real problem: <b>context rot</b>. When context fills
          up with old logs, tool outputs that no longer matter, and decisions from previous
          steps, the model starts getting confused, repeats work, ignores the original
          task. Performance doesn't degrade because the model gets tired — it degrades because
          you're giving it too much irrelevant material to search for the answer in.
        </p>
        <p>
          This is what the <a href="/ruido" target="_blank" rel="noreferrer"><code>/ruido</code></a>{' '}
          lab simulates on purpose: the <code>bloatToolResult</code> function in{' '}
          <code>src/noise.js</code> inflates each <code>tool_result</code> with fake logs,
          and you can run the same task with and without noise to compare. It's the same
          degradation that happens naturally in real agents after many steps.
        </p>
      </section>

      <section className="criollo-section" id="agents-md">
        <h2>4) AGENTS.md — context as an injected instruction</h2>
        <p>
          In <a href="/agents-md" target="_blank" rel="noreferrer"><code>/agents-md</code></a>{' '}
          context is built differently: there's an <code>AGENTS.md</code> file with
          rules and, optionally, "skills" (recipes with tests). <b>All of that is injected
          into the <code>system</code> prompt before the user message.</b>
        </p>
        <div className="criollo-quote">
{`[
  { role: "system", content: "<agent base prompt>
                              ---
                              # AGENTS.md
                              <mandatory rules>
                              ---
                              # Skill: arch-check
                              <recipes with tests>" },
  { role: "user",   content: "Add a withdraw(amount) method..." }
]`}
        </div>
        <p>
          The user prompt is the same as always. What changes is <b>who the agent is</b>:
          with a different <code>AGENTS.md</code>, the same question produces a different
          answer. Not because the model "learned" anything new — because the context
          you built configured it to respond that way.
        </p>
        <p>
          This shows the most political angle of context: <b>whoever controls the{' '}
          <code>system</code> controls the agent</b>. If someone can inject text into
          your system prompt, they can change your product without touching your model.
        </p>
      </section>

      <section className="criollo-section" id="costo">
        <h2>Context costs — who pays</h2>
        <p>Once you understand that everything is context, the question appears: how much does it cost?</p>
        <ul>
          <li>
            <b>Input tokens — every call.</b> In Conversation mode, on turn 50
            you're sending the 50 previous turns. You're billed for <b>input</b> on all 50
            every time. The cost of a long conversation grows faster than it seems.
          </li>
          <li>
            <b>Latency.</b> More input tokens = more time processing the prompt before
            it starts generating. It shows from thousands of tokens onward.
          </li>
          <li>
            <b>Context window.</b> Every model has a limit. If you go over, the
            endpoint returns <code>400</code>. Windows vary between 8k and 1M+ tokens
            depending on the model — check the docs of the provider you're using.
          </li>
          <li>
            <b>Quality.</b> More tokens isn't better. Past a certain point, the model
            starts getting lost (context rot). That's why serious agent strategies
            <i> summarize</i> or <i>trim</i> the history every so many steps.
          </li>
        </ul>
        <p>
          <b>Persistent mode</b> shifts the transport cost (you don't send the
          whole history over the network), but not the processing cost: the model
          still processes the whole history on the server side.
        </p>
      </section>

      <section className="criollo-section" id="conclusion">
        <h2>Conclusion</h2>
        <p>
          The app's four modes tell the same story from four angles:
        </p>
        <ul>
          <li><b>Chat</b> — context grows turn by turn and you see it.</li>
          <li><b>Editor</b> — context is what you paste into the payload, no conversation needed.</li>
          <li><b>Agentic Loop</b> — context grows on its own when there are tools; eventually it gets polluted and performance drops.</li>
          <li><b>AGENTS.md</b> — the <code>system</code> context redefines the agent without touching the model.</li>
        </ul>
        <p>
          Different flows, same principle: <b>the model knows nothing that isn't in the
          payload</b>. Engineering with LLMs is, for the most part, engineering the context.
        </p>
      </section>

      <footer className="criollo-footer">
        <a href="/" className="clear-btn">← Modes</a>
      </footer>

    </div>
  )
}
