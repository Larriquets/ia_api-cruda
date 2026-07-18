// Cuerpo de prosa de /ides, en ES (base de verdad) y EN.
// El andamiaje (TOC, observer, header) vive en Ides.jsx; acá solo el
// contenido, que el host elige según `lang`. Los `id` de sección son
// anclas internas: se mantienen idénticos en ambos idiomas.
//
// La tesis de la página: un IDE agéntico (Cursor, Claude Code, Copilot…)
// no agrega conceptos nuevos — es una UI linda arriba del mismo POST que
// el resto de la app ya enseña. Cada feature se mapea a su lab.

export function IdesBodyEs() {
  return (
    <div className="docs-main">

      {/* ============== TESIS ============== */}
      <section className="criollo-section" id="tesis">
        <h2>🎯 Tu IDE es esta app con maquillaje</h2>
        <p>
          Cursor, Claude Code, Copilot, Windsurf… todos los IDEs agénticos hacen exactamente lo
          mismo que venís viendo en esta app: arman un <code>POST</code> con <b>system</b>,{' '}
          <b>context</b> (<code>messages[]</code>) y <b>tools</b>, lo mandan al proveedor y
          ejecutan lo que el modelo pide. La diferencia es que el IDE te esconde el JSON atrás
          de una UI cómoda — y esta página lo destapa.
        </p>
        <div className="prov-callout">
          <p>
            Si ya pasaste por los labs, acá no hay nada nuevo que aprender: hay algo mejor —
            darte cuenta de que <b>ya sabés cómo funciona tu IDE por dentro</b>. Y si entendés el
            mecanismo, las "buenas prácticas" dejan de ser recetas de LinkedIn y pasan a ser
            consecuencias obvias.
          </p>
        </div>
      </section>

      {/* ============== MAPA DE PIEZAS ============== */}
      <section className="criollo-section" id="mapa-piezas">
        <h2>🗺 Cada feature del IDE, destapada</h2>
        <p>
          La columna izquierda es lo que ves en el IDE. La del medio, lo que es por abajo. La
          derecha, dónde verlo crudo en esta app:
        </p>
        <div className="prov-table-wrap">
          <table className="prov-table">
            <thead>
              <tr>
                <th>Lo que ves en el IDE</th>
                <th>Lo que es por abajo</th>
                <th>Dónde verlo crudo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>El chat del agente ("Composer", "Agent"…)</td>
                <td>Un <code>messages[]</code> con system + historial + tools</td>
                <td><a href="/demo/ide">/demo/ide</a> · <a href="/como-funciona">/como-funciona</a></td>
              </tr>
              <tr>
                <td>Rules (<code>.cursorrules</code>, <code>CLAUDE.md</code>, <code>AGENTS.md</code>)</td>
                <td>Texto inyectado al system prompt en cada request</td>
                <td><a href="/agents-md">/agents-md</a></td>
              </tr>
              <tr>
                <td>@-mencionar un archivo</td>
                <td>El contenido del archivo pegado entero al contexto</td>
                <td><a href="/contexto">/contexto</a></td>
              </tr>
              <tr>
                <td>"Codebase context" / índice del repo</td>
                <td>Embeddings + top-K por similitud (RAG)</td>
                <td><a href="/rag">/rag</a></td>
              </tr>
              <tr>
                <td>El agente edita archivos y corre comandos</td>
                <td>Loop de <code>tool_use</code>: el modelo pide, el IDE ejecuta</td>
                <td><a href="/loop-agentico">/loop-agentico</a> · <a href="/demo/loop">/demo/loop</a></td>
              </tr>
              <tr>
                <td>Modo "thinking" / razonamiento extendido</td>
                <td>Tokens de razonamiento antes de la respuesta</td>
                <td><a href="/razonamiento">/razonamiento</a></td>
              </tr>
              <tr>
                <td>Conectar el IDE a servicios externos</td>
                <td>MCP: <code>tools/list</code> + <code>tools/call</code> por JSON-RPC</td>
                <td><a href="/mcp">/mcp</a></td>
              </tr>
              <tr>
                <td>El chat largo que "se pone tonto"</td>
                <td>Ventana de contexto desbordada + ruido acumulado</td>
                <td><a href="/ventana-contexto">/ventana-contexto</a> · <a href="/ruido">/ruido</a></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Esa tabla es la página entera, comprimida. Lo que sigue son las tres piezas donde más
          se gana (o se pierde) calidad, y las prácticas que se caen de maduro.
        </p>
      </section>

      {/* ============== REGLAS ============== */}
      <section className="criollo-section" id="reglas">
        <h2>📋 Rules: el system prompt que escribís vos</h2>
        <p>
          Cuando Cursor lee tu <code>.cursorrules</code>, o Claude Code tu <code>CLAUDE.md</code>,
          no está "configurando" nada: está <b>concatenando ese texto al system prompt</b> de cada
          request. Es la misma jugada que el lab <a href="/agents-md">/agents-md</a> muestra en
          crudo: mismo modelo, mismas tools, y el comportamiento cambia porque cambió el texto
          que viaja primero.
        </p>
        <p>
          De ahí salen dos consecuencias que ningún tutorial te cuenta como mecanismo:
        </p>
        <ul>
          <li>
            <b>Las reglas viajan siempre, las uses o no.</b> Cada línea de tu archivo de reglas
            son tokens que pagás en <i>todos</i> los requests — y atención que le sacás al resto
            del contexto. Regla que no aplica a la tarea = ruido pago.
          </li>
          <li>
            <b>Regla gorda pierde contra regla corta + material bajo demanda.</b> Por eso existen
            las skills: instrucciones que se cargan solo cuando hacen falta. La comparación está
            animada en <a href="/demo/agents-md-skills">/demo/agents-md-skills</a>.
          </li>
        </ul>
      </section>

      {/* ============== CONTEXTO ============== */}
      <section className="criollo-section" id="contexto-ide">
        <h2>💬 El contexto: lo que el IDE mete al POST sin avisarte</h2>
        <p>
          El prompt que tipeás es la parte más chica del payload. Antes de mandarlo, el IDE le
          suma: las rules, el archivo abierto, lo que @-mencionaste, resultados de búsquedas en
          el índice del repo, el historial del chat y los resultados de cada tool que corrió. Todo
          eso compite por la misma <a href="/ventana-contexto">ventana de contexto</a>.
        </p>
        <p>
          Y acá aparece el fenómeno que el lab <a href="/ruido">/ruido</a> mide con precisión: no
          hace falta desbordar la ventana para perder calidad. <b>Alcanza con enterrar el dato
          importante entre logs, archivos enormes y turnos viejos</b> para que el modelo empiece a
          pifiar. El chat de IDE que "se puso tonto" después de una hora no se rompió: se llenó
          de ruido.
        </p>
      </section>

      {/* ============== AGENTE ============== */}
      <section className="criollo-section" id="agente">
        <h2>🤖 El agente que "edita": nadie le dio las llaves</h2>
        <p>
          Cuando el IDE "edita un archivo" o "corre un test", el modelo no tocó tu disco. El
          modelo <b>escribió un pedido</b> — un <code>tool_call</code> con nombre y argumentos — y
          el IDE decidió ejecutarlo, metió el resultado de vuelta en <code>messages[]</code> y
          volvió a llamar al modelo. Ese ciclo es el lab <a href="/loop-agentico">/loop-agentico</a>{' '}
          tal cual, y la versión animada está en <a href="/demo/loop">/demo/loop</a>.
        </p>
        <p>
          Por eso el botón de "aprobar" antes de cada comando no es paranoia decorativa: es el
          único punto del ciclo donde hay un humano entre el pedido del modelo y tu máquina. En
          esta app ese punto tiene hasta nombre propio: el sentinel <code>NEEDS_HUMAN_APPROVAL</code>.
        </p>
      </section>

      {/* ============== PRÁCTICAS ============== */}
      <section className="criollo-section" id="practicas">
        <h2>📌 Buenas prácticas, fundadas en el mecanismo</h2>
        <p>
          Ninguna de estas es una opinión: cada una se deduce de un lab que ya viste.
        </p>
        <ol>
          <li>
            <b>Reglas cortas, estables y que apliquen siempre.</b> Viajan en cada POST; lo
            situacional va en el prompt o en una skill, no en las rules.
            (<a href="/agents-md">/agents-md</a>)
          </li>
          <li>
            <b>Un chat por tarea.</b> El historial es contexto: la tarea anterior es ruido para
            la siguiente. Chat nuevo = ventana limpia.
            (<a href="/ventana-contexto">/ventana-contexto</a>, <a href="/ruido">/ruido</a>)
          </li>
          <li>
            <b>Pasá los archivos justos, no el repo entero.</b> Cada @-mención pega el archivo
            completo al payload: más contexto no es más inteligencia, es más ruido y más plata.
            (<a href="/contexto">/contexto</a>, <a href="/tokens">/tokens</a>)
          </li>
          <li>
            <b>Pedí con criterios verificables.</b> "Arreglalo" rinde peor que "que pase tal
            test, sin tocar tal módulo" — mismo modelo, distinto pedido.
            (<a href="/especificidad">/especificidad</a>)
          </li>
          <li>
            <b>Para lo difícil: plan primero, o modo thinking.</b> Pedir un plan antes del código
            es comprarle tokens de razonamiento al problema, no al tipeo.
            (<a href="/razonamiento">/razonamiento</a>)
          </li>
          <li>
            <b>Revisá cada diff antes de aprobar.</b> El modelo pide, el IDE ejecuta, y el único
            control de calidad entre ambos sos vos.
            (<a href="/loop-agentico">/loop-agentico</a>)
          </li>
          <li>
            <b>Desconfiá de lo que el agente lee.</b> Un README, un issue o una web pueden traer
            instrucciones escondidas que el modelo va a leer como si fueran tuyas.
            (<a href="/prompt-injection">/prompt-injection</a>)
          </li>
        </ol>
      </section>

      {/* ============== CIERRE ============== */}
      <section className="criollo-section demo-closing" id="cierre">
        <h2>🚀 Verlo con tus propios ojos</h2>
        <p>
          La demo animada arma el POST de un IDE paso a paso, sin API ni key. Y si querés el
          ciclo real — con tu key y el JSON crudo a la vista — el lab del loop agéntico es
          literalmente un mini-IDE.
        </p>
        <div className="demo-closing-ctas">
          <a href="/demo/ide" className="demo-closing-cta">
            <span className="demo-closing-cta-emoji">🎬</span>
            <span>
              <b>El POST que arma tu IDE, paso a paso</b>
              <span className="demo-closing-cta-sub">→ /demo/ide</span>
            </span>
          </a>
          <a href="/loop-agentico" className="demo-closing-cta">
            <span className="demo-closing-cta-emoji">🔬</span>
            <span>
              <b>El mismo ciclo, de verdad y con tu key</b>
              <span className="demo-closing-cta-sub">→ /loop-agentico</span>
            </span>
          </a>
        </div>
      </section>

    </div>
  )
}

export function IdesBodyEn() {
  return (
    <div className="docs-main">

      {/* ============== THESIS ============== */}
      <section className="criollo-section" id="tesis">
        <h2>🎯 Your IDE is this app wearing makeup</h2>
        <p>
          Cursor, Claude Code, Copilot, Windsurf… every agentic IDE does exactly what you've been
          watching in this app: it builds a <code>POST</code> with <b>system</b>, <b>context</b>{' '}
          (<code>messages[]</code>) and <b>tools</b>, sends it to the provider and executes
          whatever the model asks for. The difference is the IDE hides the JSON behind a
          comfortable UI — and this page lifts the hood.
        </p>
        <div className="prov-callout">
          <p>
            If you've been through the labs, there's nothing new to learn here — there's
            something better: realizing <b>you already know how your IDE works inside</b>. And
            once you get the mechanism, "best practices" stop being LinkedIn recipes and become
            obvious consequences.
          </p>
        </div>
      </section>

      {/* ============== PIECE MAP ============== */}
      <section className="criollo-section" id="mapa-piezas">
        <h2>🗺 Every IDE feature, uncovered</h2>
        <p>
          Left column: what you see in the IDE. Middle: what it is underneath. Right: where to
          see it raw in this app:
        </p>
        <div className="prov-table-wrap">
          <table className="prov-table">
            <thead>
              <tr>
                <th>What you see in the IDE</th>
                <th>What it is underneath</th>
                <th>Where to see it raw</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>The agent chat ("Composer", "Agent"…)</td>
                <td>A <code>messages[]</code> with system + history + tools</td>
                <td><a href="/demo/ide">/demo/ide</a> · <a href="/como-funciona">/como-funciona</a></td>
              </tr>
              <tr>
                <td>Rules (<code>.cursorrules</code>, <code>CLAUDE.md</code>, <code>AGENTS.md</code>)</td>
                <td>Text injected into the system prompt on every request</td>
                <td><a href="/agents-md">/agents-md</a></td>
              </tr>
              <tr>
                <td>@-mentioning a file</td>
                <td>The file's content pasted whole into the context</td>
                <td><a href="/contexto">/contexto</a></td>
              </tr>
              <tr>
                <td>"Codebase context" / repo index</td>
                <td>Embeddings + top-K by similarity (RAG)</td>
                <td><a href="/rag">/rag</a></td>
              </tr>
              <tr>
                <td>The agent edits files and runs commands</td>
                <td><code>tool_use</code> loop: the model asks, the IDE executes</td>
                <td><a href="/loop-agentico">/loop-agentico</a> · <a href="/demo/loop">/demo/loop</a></td>
              </tr>
              <tr>
                <td>"Thinking" mode / extended reasoning</td>
                <td>Reasoning tokens before the answer</td>
                <td><a href="/razonamiento">/razonamiento</a></td>
              </tr>
              <tr>
                <td>Plugging the IDE into external services</td>
                <td>MCP: <code>tools/list</code> + <code>tools/call</code> over JSON-RPC</td>
                <td><a href="/mcp">/mcp</a></td>
              </tr>
              <tr>
                <td>The long chat that "gets dumb"</td>
                <td>Overflowed context window + accumulated noise</td>
                <td><a href="/ventana-contexto">/ventana-contexto</a> · <a href="/ruido">/ruido</a></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          That table is the whole page, compressed. What follows are the three pieces where most
          quality is won (or lost), and the practices that fall out of them naturally.
        </p>
      </section>

      {/* ============== RULES ============== */}
      <section className="criollo-section" id="reglas">
        <h2>📋 Rules: the system prompt you get to write</h2>
        <p>
          When Cursor reads your <code>.cursorrules</code>, or Claude Code your{' '}
          <code>CLAUDE.md</code>, it isn't "configuring" anything: it's <b>concatenating that
          text into the system prompt</b> of every request. Same move the{' '}
          <a href="/agents-md">/agents-md</a> lab shows raw: same model, same tools, and the
          behavior changes because the text that travels first changed.
        </p>
        <p>
          Two consequences follow that no tutorial explains as mechanism:
        </p>
        <ul>
          <li>
            <b>Rules travel always, whether you use them or not.</b> Every line of your rules
            file is tokens you pay on <i>every</i> request — and attention you steal from the
            rest of the context. A rule that doesn't apply to the task = paid noise.
          </li>
          <li>
            <b>A fat rule loses to a short rule + material on demand.</b> That's why skills
            exist: instructions loaded only when needed. The comparison is animated at{' '}
            <a href="/demo/agents-md-skills">/demo/agents-md-skills</a>.
          </li>
        </ul>
      </section>

      {/* ============== CONTEXT ============== */}
      <section className="criollo-section" id="contexto-ide">
        <h2>💬 The context: what the IDE puts in the POST without telling you</h2>
        <p>
          The prompt you type is the smallest part of the payload. Before sending it, the IDE
          adds: the rules, the open file, whatever you @-mentioned, search results from the repo
          index, the chat history and the result of every tool it ran. All of it competes for the
          same <a href="/ventana-contexto">context window</a>.
        </p>
        <p>
          And here shows up the phenomenon the <a href="/ruido">/ruido</a> lab measures
          precisely: you don't need to overflow the window to lose quality. <b>Burying the
          important fact under logs, huge files and stale turns is enough</b> for the model to
          start missing. The IDE chat that "got dumb" after an hour didn't break: it filled up
          with noise.
        </p>
      </section>

      {/* ============== AGENT ============== */}
      <section className="criollo-section" id="agente">
        <h2>🤖 The agent that "edits": nobody gave it the keys</h2>
        <p>
          When the IDE "edits a file" or "runs a test", the model never touched your disk. The
          model <b>wrote a request</b> — a <code>tool_call</code> with a name and arguments — and
          the IDE chose to execute it, pasted the result back into <code>messages[]</code> and
          called the model again. That cycle is the <a href="/loop-agentico">/loop-agentico</a>{' '}
          lab verbatim, and the animated version lives at <a href="/demo/loop">/demo/loop</a>.
        </p>
        <p>
          That's why the "approve" button before each command isn't decorative paranoia: it's the
          only point in the cycle with a human between the model's request and your machine. In
          this app that point even has a name: the <code>NEEDS_HUMAN_APPROVAL</code> sentinel.
        </p>
      </section>

      {/* ============== PRACTICES ============== */}
      <section className="criollo-section" id="practicas">
        <h2>📌 Best practices, grounded in the mechanism</h2>
        <p>
          None of these is an opinion: each one follows from a lab you've already seen.
        </p>
        <ol>
          <li>
            <b>Short, stable rules that always apply.</b> They travel on every POST; situational
            stuff goes in the prompt or a skill, not in the rules.
            (<a href="/agents-md">/agents-md</a>)
          </li>
          <li>
            <b>One chat per task.</b> History is context: the previous task is noise for the next
            one. New chat = clean window.
            (<a href="/ventana-contexto">/ventana-contexto</a>, <a href="/ruido">/ruido</a>)
          </li>
          <li>
            <b>Pass the exact files, not the whole repo.</b> Each @-mention pastes the entire
            file into the payload: more context isn't more intelligence, it's more noise and more
            money. (<a href="/contexto">/contexto</a>, <a href="/tokens">/tokens</a>)
          </li>
          <li>
            <b>Ask with verifiable criteria.</b> "Fix it" performs worse than "make this test
            pass, without touching that module" — same model, different request.
            (<a href="/especificidad">/especificidad</a>)
          </li>
          <li>
            <b>For hard problems: plan first, or thinking mode.</b> Asking for a plan before code
            buys reasoning tokens for the problem, not the typing.
            (<a href="/razonamiento">/razonamiento</a>)
          </li>
          <li>
            <b>Review every diff before approving.</b> The model asks, the IDE executes, and the
            only quality gate between them is you.
            (<a href="/loop-agentico">/loop-agentico</a>)
          </li>
          <li>
            <b>Distrust what the agent reads.</b> A README, an issue or a web page can carry
            hidden instructions the model will read as if they were yours.
            (<a href="/prompt-injection">/prompt-injection</a>)
          </li>
        </ol>
      </section>

      {/* ============== CLOSING ============== */}
      <section className="criollo-section demo-closing" id="cierre">
        <h2>🚀 See it with your own eyes</h2>
        <p>
          The animated demo builds an IDE's POST step by step, no API, no key. And if you want
          the real cycle — with your key and the raw JSON in sight — the agentic loop lab is
          literally a mini-IDE.
        </p>
        <div className="demo-closing-ctas">
          <a href="/demo/ide" className="demo-closing-cta">
            <span className="demo-closing-cta-emoji">🎬</span>
            <span>
              <b>The POST your IDE builds, step by step</b>
              <span className="demo-closing-cta-sub">→ /demo/ide</span>
            </span>
          </a>
          <a href="/loop-agentico" className="demo-closing-cta">
            <span className="demo-closing-cta-emoji">🔬</span>
            <span>
              <b>The same cycle, for real and with your key</b>
              <span className="demo-closing-cta-sub">→ /loop-agentico</span>
            </span>
          </a>
        </div>
      </section>

    </div>
  )
}
