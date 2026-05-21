import { useEffect, useState } from 'react'
import ModeSwitch from './ModeSwitch.jsx'
import DocsNav from './DocsNav.jsx'

const TOC_ITEMS = [
  { id: 'tesis',          emoji: '🎯', label: 'La tesis' },
  { id: 'tres-piezas',    emoji: '🧩', label: 'Tres piezas en cada POST' },
  { id: 'system',         emoji: '🧠', label: '1) System prompt' },
  { id: 'context',        emoji: '💬', label: '2) Context (messages[])' },
  { id: 'tools',          emoji: '🛠️', label: '3) Tools (code)' },
  { id: 'prompt-front',   emoji: '⌨️', label: 'El prompt del front' },
  { id: 'donde-vive',     emoji: '📦', label: 'Dónde vive cada cosa' },
  { id: 'flujos',         emoji: '🔁', label: 'Tres flujos completos' },
  { id: 'reglas',         emoji: '📌', label: 'Reglas que aplican siempre' },
]

export default function ComoFunciona() {
  const [activeSection, setActiveSection] = useState(TOC_ITEMS[0].id)

  useEffect(() => {
    const ids = TOC_ITEMS.map((i) => i.id)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible?.target?.id) setActiveSection(visible.target.id)
      },
      { rootMargin: '-18% 0px -65% 0px', threshold: [0, 0.1, 0.25] },
    )

    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const handleTocClick = (event, id) => {
    event.preventDefault()
    setActiveSection(id)
    window.history.pushState(null, '', `#${id}`)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label="Ir al inicio">
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <span className="brand">La IA Cruda</span>
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// todo es contexto · modo <span className="brand-mode">⚙️ Cómo funciona</span> · system / context / tools y los prompts del front</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="docs" />
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label="Navegación de documentación">
          <DocsNav current="como-funciona" />
          <nav className="docs-toc" aria-label="Índice de la página">
            <div className="docs-toc-title">En esta página</div>
            {TOC_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`docs-toc-link${activeSection === item.id ? ' is-active' : ''}`}
                aria-current={activeSection === item.id ? 'location' : undefined}
                onClick={(e) => handleTocClick(e, item.id)}
              >
                <span className="docs-toc-emoji">{item.emoji}</span>
                <span className="docs-toc-label">{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="docs-main">

          {/* ============== TESIS ============== */}
          <section className="criollo-section" id="tesis">
            <h2>🎯 La tesis</h2>
            <p>
              Cuando vos escribís algo en el chat y apretás <b>Enviar</b>, no pasa magia: el navegador
              arma un <code>POST</code> con un JSON, lo manda al proveedor (OpenAI, Anthropic, LM
              Studio…) y espera la respuesta. Ese JSON tiene <b>tres piezas</b> que esta app expone
              en vivo:
            </p>
            <ol>
              <li><b>System prompt</b> — la "personalidad" o las reglas del asistente.</li>
              <li><b>Context</b> — el array <code>messages[]</code> con el historial.</li>
              <li><b>Tools</b> — funciones (código tuyo) que la IA puede pedir que ejecutes.</li>
            </ol>
            <p>
              Todo lo que ves en la UI (la cajita de texto, los presets, el botón de Tools, el editor
              de código) termina en una de esas tres piezas. <b>El prompt que escribís en el front es
              solo una entrada de <code>messages[]</code></b> — la pieza más chica del payload, casi
              siempre.
            </p>
            <div className="prov-callout">
              <p>
                Si entendés cómo se arma cada pieza y dónde termina en el JSON, dejás de pensar en
                "hablar con la IA" y empezás a pensar en <b>diseñar el payload</b>. Esa es la
                disciplina real.
              </p>
            </div>
          </section>

          {/* ============== TRES PIEZAS ============== */}
          <section className="criollo-section" id="tres-piezas">
            <h2>🧩 Las tres piezas, juntas en un solo POST</h2>
            <p>
              Antes de entrar en cada una, mirá el JSON completo que sale del navegador en una
              corrida del Loop Agéntico. Es lo más parecido a una "foto entera" de lo que la IA recibe:
            </p>

            <div className="cf-json-legend">
              <span className="cf-json-legend-item cf-pill-system">🧠 system</span>
              <span className="cf-json-legend-item cf-pill-context">💬 context (messages[])</span>
              <span className="cf-json-legend-item cf-pill-tools">🛠️ tools</span>
            </div>

            <pre className="cf-json">
              <code>
                <span className="cf-json-url">POST https://api.openai.com/v1/chat/completions</span>
                {'\n\n'}
                {'{\n'}
                {'  "model": '}<span className="cf-json-str">"gpt-4o-mini"</span>{',\n'}
                {'  "temperature": '}<span className="cf-json-num">0.7</span>{',\n'}

                <span className="cf-hl cf-hl-context" data-tag="💬 context">
                  {'  "messages": [\n'}
                  <span className="cf-hl-nested cf-hl-system" data-tag="🧠 system">
                    {'    { "role": "system",    "content": "Sos un asistente de programación..." },\n'}
                  </span>
                  {'    { "role": "user",      "content": "Renombrá saldo a balance." },\n'}
                  {'    { "role": "assistant", "content": null,\n'}
                  {'      "tool_calls": [{ "id": "call_1",\n'}
                  {'                       "function": { "name": "edit_code",\n'}
                  {'                                     "arguments": "{\\"old_string\\":\\"saldo\\",\\"new_string\\":\\"balance\\"}" }}] },\n'}
                  {'    { "role": "tool", "tool_call_id": "call_1",\n'}
                  {'      "content": "OK: reemplazado..." }\n'}
                  {'  ],\n'}
                </span>

                <span className="cf-hl cf-hl-tools" data-tag="🛠️ tools">
                  {'  "tools": [\n'}
                  {'    { "type": "function",\n'}
                  {'      "function": { "name": "read_code",  "description": "...", "parameters": {...} } },\n'}
                  {'    { "type": "function",\n'}
                  {'      "function": { "name": "edit_code",  "description": "...", "parameters": {...} } }\n'}
                  {'  ]\n'}
                </span>
                {'}'}
              </code>
            </pre>
            <p>
              Tres claves del JSON, tres responsables distintos:
            </p>
            <ul>
              <li><code>messages[0]</code> con <code>role:"system"</code> — lo arma la app (con presets o lo que escribiste en el editor de system).</li>
              <li>El resto de <code>messages[]</code> — historial + tu último prompt + (en agentes) las tools que pidió la IA y los resultados que devolvió <i>tu</i> código.</li>
              <li><code>tools[]</code> — definiciones JSON de funciones que tu app declara que puede ejecutar. La IA <b>no</b> las corre — las <i>pide</i>.</li>
            </ul>
          </section>

          {/* ============== SYSTEM PROMPT ============== */}
          <section className="criollo-section" id="system">
            <h2>🧠 1) System prompt — la personalidad del asistente</h2>
            <h3>Qué es</h3>
            <p>
              Un texto fijo que viaja como <b>primer elemento</b> de <code>messages[]</code> con
              <code> role:"system"</code>. La IA lo lee antes que nada y lo trata como "instrucciones
              base" — tienen más autoridad que cualquier <code>user</code> message que venga después.
            </p>
            <pre className="cf-json">
              <code>
                <span className="cf-hl cf-hl-system" data-tag="🧠 system">
                  {'{ "role": "system",\n'}
                  {'  "content": "Eres un asistente útil que responde en español de forma clara y concisa." }\n'}
                </span>
              </code>
            </pre>
            <h3>Cómo se arma en esta app</h3>
            <ul>
              <li>
                En el <b>Chat</b> (<code>/</code>) viene de <a href="/" target="_blank" rel="noreferrer">el editor "System prompt"</a>{' '}
                (plegable, arriba del chat). Hay presets — pirata, JSON estricto, profesor sarcástico —
                que demuestran cómo el <b>mismo "hola"</b> produce respuestas opuestas con system
                distintos. Probalos.
              </li>
              <li>
                En el <b>Loop Agéntico</b> y en <b>AGENTS.md</b> el system base es más largo: arranca
                con un texto que le explica a la IA cómo usar las tools (cuándo llamar <code>edit_code</code>,
                cuándo <code>read_code</code>, cuándo terminar). Si activás AGENTS.md, todo el contenido
                de ese archivo se <b>concatena</b> al system base.
              </li>
              <li>
                En el modo <b>persistente</b> (solo OpenAI, <code>/v1/responses</code>) el system NO
                viaja como <code>messages[0]</code> — viaja como un campo aparte llamado{' '}
                <code>instructions</code>. Es la misma idea, otro lugar en el JSON.
              </li>
            </ul>
            <h3>Regla pedagógica</h3>
            <div className="prov-callout">
              <p>
                El <code>system</code> es <b>invariante</b> en cada turno: va en el primer slot de
                <code> messages[]</code> y <b>nunca se poda</b>, ni siquiera cuando la app recorta el
                historial para no pasarse de la ventana de contexto. Si fuera al revés, la
                "personalidad" del bot se perdería apenas la conversación creciera — y eso sería
                catastrófico.
              </p>
            </div>
          </section>

          {/* ============== CONTEXT ============== */}
          <section className="criollo-section" id="context">
            <h2>💬 2) Context — el array <code>messages[]</code></h2>
            <h3>Qué es</h3>
            <p>
              Una lista ordenada de turnos. Después del <code>system</code>, vienen los pares
              <code> user</code> / <code>assistant</code> que conforman la conversación. <b>Acá adentro
              también está tu prompt del front</b>: lo que escribiste en la cajita de "Escribe tu
              mensaje" se convierte en un objeto <code>{`{ role:"user", content:"..." }`}</code> y se
              empuja al array antes de mandar el request.
            </p>
            <pre className="cf-json">
              <code>
                <span className="cf-hl cf-hl-context" data-tag="💬 context">
                  {'messages: [\n'}
                  <span className="cf-hl-nested cf-hl-system" data-tag="🧠 system">
                    {'  { "role": "system",    "content": "Eres un asistente útil..." },        '}<span className="cf-json-note">← personalidad</span>{'\n'}
                  </span>
                  {'  { "role": "user",      "content": "Hola, me llamo Mati." },             '}<span className="cf-json-note">← turno 1 (vos)</span>{'\n'}
                  {'  { "role": "assistant", "content": "¡Hola Mati! ¿En qué te ayudo?" },    '}<span className="cf-json-note">← turno 1 (IA)</span>{'\n'}
                  {'  { "role": "user",      "content": "¿Cómo me llamaba?" }                 '}<span className="cf-json-note">← turno 2 (vos, AHORA)</span>{'\n'}
                  {']\n'}
                </span>
              </code>
            </pre>
            <p>
              En el turno 2 la IA "se acuerda" de tu nombre porque vos le <b>reenviaste</b> los tres
              mensajes anteriores. No es memoria del modelo — es <b>repetición</b> tuya. Si en el
              turno 2 mandás solamente el último <code>user</code>, la IA no tiene cómo saber tu
              nombre.
            </p>
            <h3>Cómo se arma en esta app</h3>
            <ul>
              <li>
                <b>Modo Crudo (Chat)</b> — el array que sale tiene <i>solo</i> el system y el
                último <code>user</code>. Demuestra la amnesia.
              </li>
              <li>
                <b>Modo Conversación (Chat)</b> — el array crece turno a turno. React state lo
                acumula y la app lo reenvía completo en cada POST.
              </li>
              <li>
                <b>Modo Persistente (Chat)</b> — el array vive del lado del server (OpenAI), tu
                cliente solo manda el último mensaje + un <code>conversation_id</code>. La amnesia
                la rompe OpenAI, no la API en sí.
              </li>
              <li>
                <b>Loop Agéntico</b> — el array crece <i>solo</i>, sin que vos escribas nada. Cada
                vuelta del loop suma un <code>assistant</code> con <code>tool_calls</code> + un
                <code> tool</code> con el resultado. Por eso un solo prompt humano puede generar 10
                mensajes nuevos en el array.
              </li>
            </ul>
            <p>
              Para ver el array literal en cualquier momento, abrí{' '}
              <a href="/contexto" target="_blank" rel="noreferrer">/contexto</a>: tiene una "foto en
              vivo" del <code>messages[]</code> del chat actual.
            </p>
          </section>

          {/* ============== TOOLS ============== */}
          <section className="criollo-section" id="tools">
            <h2>🛠️ 3) Tools — el código que la IA puede pedir</h2>
            <h3>Qué es</h3>
            <p>
              Un array de <b>definiciones</b> de funciones que tu app declara que puede ejecutar.
              Cada definición tiene un <i>name</i>, una <i>description</i> (lenguaje natural, así
              la IA entiende cuándo usarla) y un <i>schema</i> de parámetros (JSON Schema).
            </p>
            <div className="prov-callout">
              <p>
                <b>Clave:</b> la IA <b>no ejecuta código</b>. Lee las definiciones, decide si
                necesita una tool, y en su respuesta te <i>pide</i> que la ejecutes vos. Tu app la
                corre localmente y le devuelve el resultado como un mensaje más del array. Esa ida y
                vuelta se repite hasta que la IA dice "ya está".
              </p>
            </div>
            <h3>Cómo viajan en el JSON</h3>
            <p>Las tools van en un campo de nivel raíz, <b>fuera</b> de <code>messages[]</code>:</p>
            <pre className="cf-json">
              <code>
                {'{\n'}
                {'  "model": '}<span className="cf-json-str">"gpt-4o-mini"</span>{',\n'}
                {'  "messages": [ ... ],\n'}
                <span className="cf-hl cf-hl-tools" data-tag="🛠️ tools">
                  {'  "tools": [\n'}
                  {'    {\n'}
                  {'      "type": "function",\n'}
                  {'      "function": {\n'}
                  {'        "name": "edit_code",\n'}
                  {'        "description": "Reemplaza una ocurrencia exacta de old_string por new_string...",\n'}
                  {'        "parameters": {\n'}
                  {'          "type": "object",\n'}
                  {'          "properties": {\n'}
                  {'            "old_string": { "type": "string", "description": "Texto exacto a reemplazar" },\n'}
                  {'            "new_string": { "type": "string", "description": "Texto de reemplazo" }\n'}
                  {'          },\n'}
                  {'          "required": ["old_string", "new_string"]\n'}
                  {'        }\n'}
                  {'      }\n'}
                  {'    }\n'}
                  {'  ]\n'}
                </span>
                {'}'}
              </code>
            </pre>
            <h3>El loop, paso a paso</h3>
            <ol>
              <li>Mandás el POST inicial con <code>messages</code> + <code>tools</code>.</li>
              <li>
                La IA responde con <code>{`finish_reason: "tool_calls"`}</code> (OpenAI) o
                <code> {`stop_reason: "tool_use"`}</code> (Anthropic) y un bloque con el nombre de la
                tool + los argumentos.
              </li>
              <li>Tu app ejecuta la tool localmente (es <i>código tuyo</i>, no del modelo).</li>
              <li>
                Empujás dos mensajes nuevos al array: el <code>assistant</code> con el pedido y un
                <code> tool</code> con el resultado.
              </li>
              <li>Mandás un nuevo POST con el array crecido. La IA ve el resultado y decide.</li>
              <li>
                Termina cuando <code>finish_reason</code> ya no es <code>tool_calls</code> — la IA
                contesta con texto plano.
              </li>
            </ol>
            <h3>Las tools de esta app</h3>
            <p>Están todas definidas en un único archivo neutral, <code>src/agent-tools.js</code>:</p>
            <ul>
              <li><code>read_code</code> — devuelve el código actual completo.</li>
              <li><code>edit_code</code> — reemplaza un fragmento exacto (valida que sea único).</li>
              <li><code>assess_impact</code> — pide aprobación humana antes de tocar nada (opt-in).</li>
              <li><code>load_skill</code> — trae a contexto el body de una "skill" listada en AGENTS.md.</li>
              <li><code>run_skill_test</code> — corre un test determinista (JS) sobre el código actual.</li>
            </ul>
            <h3>Diferencias por proveedor (mismo concepto, distinto shape)</h3>
            <div className="prov-table-wrap">
              <table className="prov-table">
                <thead>
                  <tr>
                    <th>Aspecto</th>
                    <th className="prov-col-openai">OpenAI / LM Studio</th>
                    <th className="prov-col-claude">Anthropic (Claude)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Definir tool</td>
                    <td><code>{`{type:"function", function:{name, description, parameters}}`}</code></td>
                    <td><code>{`{name, description, input_schema}`}</code></td>
                  </tr>
                  <tr>
                    <td>Pedido de la IA</td>
                    <td><code>tool_calls[]</code> con <code>arguments</code> <i>como string JSON</i></td>
                    <td><code>content[]</code> con bloques <code>type:"tool_use"</code></td>
                  </tr>
                  <tr>
                    <td>Resultado tuyo</td>
                    <td>Mensaje <code>role:"tool"</code> + <code>tool_call_id</code></td>
                    <td>Mensaje <code>role:"user"</code> con bloque <code>type:"tool_result"</code></td>
                  </tr>
                  <tr>
                    <td>Señal de "terminé"</td>
                    <td><code>finish_reason !== "tool_calls"</code></td>
                    <td><code>stop_reason !== "tool_use"</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Por eso esta app tiene <code>src/agent-tools.js</code> con definiciones <i>neutras</i> y
              cada wrapper (<code>anthropic-agent.js</code>, <code>openai-agent.js</code>,
              <code> lmstudio-agent.js</code>) las traduce al shape del proveedor en el borde. La UI
              y la lógica del loop no ramifican.
            </p>
          </section>

          {/* ============== PROMPT DEL FRONT ============== */}
          <section className="criollo-section" id="prompt-front">
            <h2>⌨️ El prompt del front — ¿dónde termina lo que escribís?</h2>
            <p>
              Hay <b>varias cajitas de texto</b> en la UI. Cada una termina en un lugar distinto del
              JSON. Conviene tener el mapa claro:
            </p>
            <div className="prov-table-wrap">
              <table className="prov-table">
                <thead>
                  <tr>
                    <th>Caja en la UI</th>
                    <th>Termina en…</th>
                    <th>¿Persiste entre turnos?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>"System prompt" (editor plegable)</td>
                    <td><code>messages[0]</code> con <code>role:"system"</code></td>
                    <td>Sí. Va en cada request.</td>
                  </tr>
                  <tr>
                    <td>"Escribe tu mensaje…" (composer)</td>
                    <td>Último elemento de <code>messages[]</code> con <code>role:"user"</code></td>
                    <td>Depende del modo (Crudo no, Conversación sí, Persistente sí en server).</td>
                  </tr>
                  <tr>
                    <td>Editor de código (modos /editor, /loop-agentico)</td>
                    <td>Pegado dentro del <code>content</code> del <code>user</code> o expuesto vía la tool <code>read_code</code></td>
                    <td>Sí, mientras lo edites. Las tools lo leen "en vivo".</td>
                  </tr>
                  <tr>
                    <td>AGENTS.md (modo /agents-md*)</td>
                    <td>Concatenado al final del <code>system</code> en cada request</td>
                    <td>Sí, viaja completo cada vuelta del loop.</td>
                  </tr>
                  <tr>
                    <td>Skills (body, modo /agents-md-skills)</td>
                    <td>Llega al array <b>solo</b> cuando la IA llama <code>load_skill(id)</code></td>
                    <td>Una vez cargado, queda en <code>messages[]</code> hasta el final de la corrida.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="prov-callout">
              <p>
                <b>Idea para fijar:</b> tu prompt del composer es <i>una entrada más</i> de
                <code> messages[]</code>. Suele ser la más corta. La "personalidad", las reglas del
                proyecto y las tools disponibles ya estaban definidas antes de que vos escribieras
                nada. Lo que decís pesa poco frente al andamiaje.
              </p>
            </div>
          </section>

          {/* ============== DÓNDE VIVE CADA COSA ============== */}
          <section className="criollo-section" id="donde-vive">
            <h2>📦 Dónde vive cada pieza (código del repo)</h2>
            <p>
              Los tres bloques están separados en archivos distintos para que se vea con la mano.
              Si querés saltar al código que arma cada pieza:
            </p>
            <ul>
              <li>
                <b>System</b> — defaults y presets en <code>src/system-presets.js</code>. El editor
                visual es <code>src/SystemEditor.jsx</code> (lo comparten Chat, Editor, Loop, etc.).
                En agentes, el system base vive en <code>AGENT_SYSTEM_PROMPT</code> dentro de
                <code> src/agent-tools.js</code>.
              </li>
              <li>
                <b>Context</b> — la lógica de "qué mando" vive en cada modo: <code>App.jsx</code>{' '}
                arma el <code>payload</code> del Chat según el modo (Crudo / Conversación /
                Persistente). En agentes lo arma el wrapper (<code>openai-agent.js</code>,
                <code> anthropic-agent.js</code>, <code>lmstudio-agent.js</code>). El recorte por
                ventana de contexto está en <code>src/context-window.js</code> (FIFO, sliding window,
                compaction).
              </li>
              <li>
                <b>Tools</b> — definiciones <i>neutras</i> en <code>src/agent-tools.js</code>{' '}
                (<code>getAgentToolDefs</code>, <code>runAgentTool</code>). Tests deterministas para
                skills en <code>src/skill-tests.js</code>.
              </li>
              <li>
                <b>Wrappers de proveedor</b> — cada uno enmascara la key con <code>maskKey()</code> y
                expone los hooks de debug (<code>onLog</code>, <code>onRawRequest</code>,
                <code> onRawResponse</code>) que alimentan los paneles de la UI:
                <code> src/openai.js</code>, <code>src/anthropic.js</code>,
                <code> src/ollama.js</code>, <code>src/lmstudio.js</code>.
              </li>
            </ul>
          </section>

          {/* ============== TRES FLUJOS ============== */}
          <section className="criollo-section" id="flujos">
            <h2>🔁 Tres flujos completos, lado a lado</h2>

            <h3>A) Chat simple (modo Conversación)</h3>
            <ol>
              <li>Escribís <code>"Hola"</code> en el composer.</li>
              <li>
                <code>App.jsx</code> arma{' '}
                <code>{`payload = [system, ...messages, {role:"user", content:"Hola"}]`}</code>.
              </li>
              <li>
                <code>sendChatMessage(payload)</code> (en <code>openai.js</code>) hace
                <code> POST /v1/chat/completions</code> con ese array como <code>messages</code>.
                No hay <code>tools</code>.
              </li>
              <li>La IA contesta texto. Tu app empuja un <code>assistant</code> al array.</li>
              <li>Listo, esperás el próximo turno.</li>
            </ol>

            <h3>B) Loop Agéntico (con tools)</h3>
            <ol>
              <li>Escribís <code>"Renombrá saldo a balance"</code>.</li>
              <li>
                El wrapper agéntico hace el primer POST con <code>messages</code> +
                <code> tools: getAgentToolDefs()</code>.
              </li>
              <li>
                IA responde <code>{`finish_reason:"tool_calls"`}</code> pidiendo
                <code> edit_code({`{old:"saldo", new:"balance"}`})</code>.
              </li>
              <li>
                <code>runAgentTool("edit_code", input, state)</code> ejecuta el reemplazo sobre el
                string del editor.
              </li>
              <li>
                Se empujan al array: el <code>assistant</code> con el pedido y un <code>tool</code>{' '}
                con <code>"OK: reemplazado..."</code>.
              </li>
              <li>
                Segundo POST con el array crecido. La IA puede pedir otra tool (ej. renombrar
                <code> getSaldo</code> también) o cerrar con un texto.
              </li>
              <li>El loop termina cuando <code>finish_reason !== "tool_calls"</code>.</li>
            </ol>

            <h3>C) Agente + Skills (lazy-loading)</h3>
            <ol>
              <li>
                System arranca con AGENTS.md + un <b>índice</b> corto de skills (id + descripción +
                marca <code>[test ✓]</code> si hay test). Los bodies <b>NO</b> viajan.
              </li>
              <li>Escribís un pedido.</li>
              <li>
                IA mira el índice y, si decide que un skill aplica, pide
                <code> load_skill(id="X")</code>.
              </li>
              <li>
                <code>runAgentTool</code> devuelve el body markdown de ese skill como
                <code> tool_result</code>. Recién ahí entra al contexto.
              </li>
              <li>
                Después de cada <code>edit_code</code>, la IA llama <code>run_skill_test(id)</code>{' '}
                — que <b>no</b> es un prompt, es código JS determinista (regex sobre el archivo) que
                devuelve <code>PASS</code> o lista de violaciones.
              </li>
              <li>Si <code>FAIL</code>, la IA itera. Si <code>PASS</code>, termina.</li>
            </ol>
            <div className="prov-callout">
              <p>
                <b>Por qué importa la separación</b> <code>load_skill</code> (prompt) vs.
                <code> run_skill_test</code> (código): muestra la diferencia entre "instrucciones
                que la IA lee" e "instrucciones que la IA ejecuta y obedece bajo penalidad de
                FAIL". Una sugiere, la otra verifica.
              </p>
            </div>
          </section>

          {/* ============== REGLAS QUE APLICAN SIEMPRE ============== */}
          <section className="criollo-section" id="reglas">
            <h2>📌 Reglas que aplican siempre (mirá los paneles)</h2>
            <ul>
              <li>
                <b>El system es invariante en el turno.</b> Si el alumno deja el editor de system
                vacío, la app manda el default — nunca string vacío. <code>messages[0]</code> con
                <code> role:"system"</code> <b>nunca se poda</b>, ni siquiera cuando se llena la
                ventana de contexto.
              </li>
              <li>
                <b>La key nunca aparece completa en los paneles.</b> El header
                <code> Authorization</code> que ves en "Request crudo" está enmascarado vía
                <code> maskKey()</code> (primeros 7 + últimos 4). El <code>fetch</code> real usa la
                key entera, pero la UI no la muestra.
              </li>
              <li>
                <b>Todo viaja en shape OpenAI in-app.</b> El array canónico es
                <code> {`[{role, content}]`}</code>. Anthropic separa el system aparte del
                <code> messages</code> — esa conversión vive en <code>toAnthropicPayload()</code> en
                <code> src/anthropic.js</code>, en el <i>borde</i> del wrapper. Adentro de la app no
                hay ramas por proveedor.
              </li>
              <li>
                <b>Las tools las define tu app, no el modelo.</b> Si quitás <code>edit_code</code>{' '}
                del array <code>tools</code>, la IA no puede pedirla aunque "quiera". El modelo solo
                conoce las tools que vos declaraste en <i>este</i> request.
              </li>
              <li>
                <b>Tres paneles para ver todo crudo:</b> el del medio ("Request → API" y "Response ←
                API") muestra el JSON literal con el array <code>messages[]</code> y
                <code> tools[]</code>. El de la derecha ("Log") tiene timestamps, tokens y errores.
                Si algo te sorprende, ahí está la verdad.
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Para profundizar: <a href="/docs" target="_blank" rel="noreferrer">/docs</a> arma el
              recorrido pedagógico modo por modo;{' '}
              <a href="/contexto" target="_blank" rel="noreferrer">/contexto</a> te muestra el array
              en vivo;{' '}
              <a href="/proveedores" target="_blank" rel="noreferrer">/proveedores</a> compara
              OpenAI vs Claude pieza por pieza.
            </p>
          </section>

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">← Volver al chat</a>
          </footer>

        </div>
      </div>
    </div>
  )
}
