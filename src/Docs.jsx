import ModeSwitch from './ModeSwitch.jsx'
import DocsNav from './DocsNav.jsx'

export default function Docs() {
  return (
    <div className="criollo">
      <header className="header">
        <h1>
          <img src="/logo.png" alt="" className="brand-logo" />
          <span className="brand-braces">{'{'}</span>
          <span className="brand">La IA Cruda</span>
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// todo es contexto · modo <span className="brand-mode">📚 Docs</span> · qué hace cada modo</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="docs" />
        </div>
      </header>

      <div className="criollo-content">

        {/* ============== MENÚ DE DOCS ============== */}
        <DocsNav current="docs" />

        {/* ============== TODA IA ES UNA API ============== */}
        <section className="criollo-section">
          <h2>🌐 Arranquemos por lo importante: toda IA pasa por una API</h2>
          <p>
            <b>Toda interacción humano↔IA pasa por una API.</b> ChatGPT, Claude.ai, Copilot,
            Cursor, el chat de tu banco — son UIs que por debajo le pegan HTTP al mismo
            endpoint que vas a usar vos en este curso. La única diferencia es de capas: esos
            productos te esconden el JSON, te ponen markdown lindo y manejan la sesión por
            vos. <b>Acá lo ves crudo.</b>
          </p>
          <div className="prov-callout">
            <p>
              <b>Si entendés este POST, entendés cómo funciona cualquier producto de IA del
              mercado por dentro.</b> La inteligencia está en el modelo; el producto es <b>cómo
              armás el JSON</b> y <b>cómo presentás la respuesta</b>. Lo único que cambia entre
              ChatGPT y Cursor y el bot de tu banco es <i>qué</i> meten en <code>messages[]</code>
              y <i>qué tools</i> declaran.
            </p>
          </div>
          <p>
            <b>La finalidad de esta app, en sus cuatro etapas, es esa.</b> Cada modo le saca
            una capa más al producto comercial para que veas el POST que está abajo:
          </p>
          <ol>
            <li>
              <b>💬 Chat</b> — lo mismo que ChatGPT, pero te muestra el array <code>messages[]</code>
              que viaja en cada turno. Ahí ves el "recuerdo" de la conversación con la mano.
            </li>
            <li>
              <b>💻 Editor</b> — lo que hace cualquier asistente de código de un solo turno
              (Copilot inline, "Edit with AI" de VS Code). Le pegás código + instrucción, te
              vuelve código. Sin magia.
            </li>
            <li>
              <b>🤖 Loop Agéntico</b> — lo que hace Cursor, Claude Code, Copilot Agent: declarar
              tools, dejar que la IA las pida, ejecutarlas, devolverle el resultado, repetir.
              Acá ves cada vuelta del loop.
            </li>
            <li>
              <b>📋 Agente + reglas</b> — el truco del <code>AGENTS.md</code> / <code>CLAUDE.md</code>
              / <code>.cursorrules</code>: un archivo de texto que se concatena al system prompt
              en cada request. Acá lo ves inyectarse en vivo.
            </li>
            <li>
              <b>📋 Agente + 🧪 skills</b> — el mismo agente con <code>AGENTS.md</code>, pero le
              sumás dos tools: <code>load_skill</code> (carga una skill on-demand al contexto) y
              <code>run_skill_test</code> (corre un test determinista para validar). Es el patrón
              de Claude Code skills / Cursor rules cargables: la IA decide cuándo necesita el
              detalle, no se lo metés todo de entrada.
            </li>
          </ol>
          <p>
            Lo que sigue abajo (la IA es recién nacida, el contexto, las tools, AGENTS.md) son
            <b> consecuencias</b> de esta primera idea.
          </p>
        </section>

        {/* ============== LA IA ES RECIEN NACIDA ============== */}
        <section className="criollo-section">
          <h2>🧠 El concepto que une todo: la IA es "recién nacida" en cada request</h2>
          <p>
            Si te llevás <b>una sola idea</b> de toda esta app, que sea esta. Es lo que más
            cuesta internalizar y lo que explica el 80% de las cosas que parecen raras.
          </p>

          <div className="prov-callout">
            <p>
              <b>Cada request a la IA es una IA recién nacida.</b> No tiene memoria de la
              request anterior. No sabe que hablaste con ella hace 5 segundos. No sabe que
              sos vos. No sabe que existió un mensaje previo. Lo único que sabe es <b>lo
              que está en el body del POST de este request</b>.
            </p>
          </div>

          <h3>Qué quiere decir "recién nacida"</h3>
          <p>Cada vez que hacés <code>POST /v1/messages</code>, del otro lado pasa esto:</p>
          <ol>
            <li>Se levanta una instancia del modelo (o se le asigna una a tu request).</li>
            <li>Lee el JSON que mandaste — <code>system</code>, <code>messages</code>, <code>tools</code>.</li>
            <li>Genera una respuesta.</li>
            <li><b>Termina. Se olvida de todo.</b> La instancia se va.</li>
          </ol>
          <p>
            No hay "sesión". No hay un <code>userId</code> que el modelo recuerde. No hay un
            cache mental con tu nombre. La próxima request es <b>otra instancia</b>, leyendo
            otro JSON, sin nada en común con la anterior salvo lo que <b>vos</b> le pongas
            en <code>messages</code>.
          </p>

          <h3>Por qué hace falta hacerlo así</h3>
          <ul>
            <li><b>Escalabilidad:</b> cualquier servidor puede atender cualquier request. No hay sticky sessions.</li>
            <li><b>Determinismo:</b> la respuesta depende <b>solo</b> del input. Sin estado oculto.</li>
            <li><b>Privacidad:</b> si no guardan estado, no hay nada que filtrar después.</li>
            <li><b>Simpleza para el cliente:</b> tu código tiene <b>toda</b> la verdad. No hay "dos fuentes de verdad" entre cliente y server.</li>
          </ul>

          <details className="docs-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>La excepción: <code>/v1/responses</code> de OpenAI</span>
            </summary>
            <div className="docs-collapsible-body">
              <p>
                Lo único que rompe esto en esta app es el modo "persistente" del chat. OpenAI
                agregó una API alternativa donde <b>ellos sí te guardan el historial</b> del
                lado server. Vos solo mandás el último mensaje + un <code>conversation_id</code>.
              </p>
              <p>
                Pero ojo: eso es <b>azúcar sintáctica</b>. Por debajo, OpenAI hace lo mismo — toma
                tu nuevo mensaje, lo concatena con el historial que tienen guardado, y arma un
                prompt completo internamente. <b>La IA sigue siendo "recién nacida" en cada inferencia.</b>
                La diferencia es solo <i>dónde vive</i> el array <code>messages</code>: en tu
                cliente (clásico) o en el server de OpenAI (persistente).
              </p>
              <p>
                <b>Anthropic no tiene equivalente.</b> Por eso Claude es siempre 100% del lado
                cliente — la "amnesia" es total y absoluta en cada request.
              </p>
            </div>
          </details>

          <details className="docs-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>Implicaciones prácticas (5)</span>
            </summary>
            <div className="docs-collapsible-body">
              <h4>1) Por qué los chats largos cuestan más cada turno</h4>
              <p>
                Cada turno mandás <b>todo</b> el historial otra vez. Si la conversación tiene 50
                mensajes, la request 51 manda los 50 anteriores + el nuevo. Pagás por todos los
                tokens de input cada vez. Por eso aparecen features como <b>prompt caching</b>
                (Anthropic descuenta los tokens repetidos si los detecta) y <b>compaction</b>
                (resumir partes viejas).
              </p>

              <h4>2) Por qué podés "borrar" el historial editando el array</h4>
              <p>
                Si querés que la IA "olvide" algo que dijo, podés simplemente <b>sacar ese turno
                del array</b> <code>messages</code> antes de mandar el próximo request. La IA no
                se va a quejar — no tiene cómo darse cuenta. Para ella la conversación <b>es</b>
                lo que le mandás.
              </p>

              <h4>3) Por qué podés mentirle sobre lo que dijo</h4>
              <p>
                Análogo a lo anterior: podrías editar un mensaje <code>role: "assistant"</code>
                en el array y poner cualquier cosa. La IA va a tomar eso como "lo que dijo en el
                turno anterior" y seguir desde ahí. Es una técnica conocida como <b>assistant
                prefilling</b>.
              </p>

              <h4>4) Por qué no hay forma de "entrenar" a la IA con tu conversación</h4>
              <p>
                La IA no aprende de tus chats. No hay un modelo "tuyo" que se va personalizando.
                Cada request: instancia recién nacida, mismo modelo que el de cualquier otro usuario del
                planeta. Si querés que "aprenda" tus preferencias, las metés en el system prompt
                o en el historial — pero eso lo cargás <b>vos</b>, cada vez.
              </p>

              <h4>5) Por qué el Loop Agéntico funciona</h4>
              <p>
                Justamente porque la IA es recién nacida, vos podés <b>fabricar</b> una historia
                conversacional que incluya tool calls que ella "hizo" y tool results que tu código
                generó. La IA, al recibir ese historial, lo toma como suyo y sigue desde ahí.
                Esto es <i>literalmente</i> lo que ves en el panel "Historial Request/Response"
                del Loop Agéntico.
              </p>
            </div>
          </details>

          <div className="prov-callout">
            <p>
              <b>El modelo mental para guardar:</b> la IA es como una <b>función pura</b>.
              Dado el mismo input, da la misma distribución de output. No tiene side effects
              ni memoria. <b>Vos</b> sos el que mantiene el estado, lo persiste, lo edita, lo
              manda. La IA es <i>un cerebro alquilado por 200 milisegundos</i>.
            </p>
          </div>
          <p>
            Esa frase es literal. Tu request dura ~200ms-2s, durante los cuales una GPU ejecuta
            inferencia con tu prompt como entrada. Cuando termina, esa GPU pasa a atender la
            request de otro usuario. <b>Todo lo que la IA "sabe" sobre vos está en el JSON que
            le mandaste.</b> Fin.
          </p>
          <p>
            Por eso <a href="/contexto" target="_blank" rel="noreferrer"><b>/contexto</b></a> es
            una página tan importante de esta app: te muestra <b>literalmente</b> todo lo que
            la IA va a saber en la próxima request del chat. <b>No hay nada más.</b> Lo que
            está ahí, eso sabe. Lo que no está ahí, no existe para ella.
          </p>
        </section>

        {/* ============== INTRO ============== */}
        <section className="criollo-section">
          <h2>De qué se trata esta app</h2>
          <p>
            Es un laboratorio para <b>ver qué pasa realmente</b> cuando hablás con una IA.
            No es un chat pulido — la idea es exponer todo: el JSON que se manda, el JSON
            que vuelve, los tokens que se gastan, el contexto que se acumula, las herramientas
            que la IA puede llamar.
          </p>
          <p>
            Hay <b>cinco modos</b>, cada uno enseña un concepto distinto:
          </p>
          <ol>
            <li><b>💬 Chat</b> — cómo funciona una conversación con LLM y qué es el "contexto".</li>
            <li><b>💻 Editor</b> — cómo se le pide a una IA que modifique código (un solo turno).</li>
            <li><b>🤖 Loop Agéntico</b> — cómo la IA puede usar <i>herramientas</i> y encadenar acciones.</li>
            <li><b>📋 Agente + reglas</b> — cómo "enseñarle" a la IA las convenciones de tu proyecto vía <code>AGENTS.md</code>.</li>
            <li><b>📋 Agente + 🧪 skills</b> — cómo la IA carga "skills" on-demand (<code>load_skill</code> + <code>run_skill_test</code>) en vez de cargarle todo de entrada.</li>
          </ol>
          <div className="prov-callout">
            <p>
              💡 <b>Tip pedagógico:</b> abrí cualquier modo y siempre mirá el panel de la
              <b> derecha</b>. Ahí está la "verdad cruda" — el JSON real que viaja por HTTP.
              Todo lo lindo de la izquierda es solo presentación.
            </p>
          </div>
        </section>

        {/* ============== CHAT ============== */}
        <section className="criollo-section">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>1) 💬 Chat — el modo clásico</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/" target="_blank" rel="noreferrer"><code>http://localhost:5173/</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Una conversación de toda la vida con la IA. Escribís, te responde, escribís de
            nuevo, te responde de nuevo. La diferencia con ChatGPT/Claude.ai común es que acá
            podés ver <b>todo lo que la app le manda al modelo</b>.
          </p>

          <h3>El concepto que enseña: <i>el contexto</i></h3>
          <p>
            Las APIs de LLM son <b>stateless</b> (sin memoria). Cada vez que mandás un mensaje,
            tu navegador le manda al modelo <b>toda la conversación de nuevo</b> — no porque sea
            lento, sino porque <b>el modelo no recuerda nada</b> entre requests. El "recuerdo"
            es el array <code>messages[]</code> que vos le mandás cada vez.
          </p>
          <p>
            Por eso si la conversación se pone larga, gastás cada vez más tokens: porque cada
            request manda <b>todo el historial</b>, no solo tu última pregunta.
          </p>

          <h3>Modos del chat</h3>
          <ul>
            <li>
              <b>OpenAI clásico</b> — usa <code>/v1/chat/completions</code>. Cada request manda
              system + historial completo + tu nuevo mensaje.
            </li>
            <li>
              <b>OpenAI persistente</b> — usa <code>/v1/responses</code> + <code>/v1/conversations</code>.
              OpenAI te guarda el historial en sus servidores; vos solo mandás el último mensaje
              + un <code>conversation_id</code>. <i>Excepción</i> al stateless de arriba.
            </li>
            <li>
              <b>Anthropic (Claude)</b> — usa <code>/v1/messages</code>. Siempre stateless,
              siempre mandás todo. Claude no tiene API persistente.
            </li>
            <li>
              <b>Modo "raw"</b> — manda el <code>system</code> + tu último mensaje, sin
              historial previo. Sirve para ver cómo responde la IA cuando no acumula la
              conversación, pero seguís controlando su "personalidad" desde el system.
            </li>
          </ul>

          <h3>Qué mirar</h3>
          <ul>
            <li><b>Panel del medio (Request → API):</b> el JSON que sale. Fijate cómo crece <code>messages[]</code> con cada turno.</li>
            <li><b>Panel del medio (Response ← API):</b> lo que vuelve, incluyendo <code>usage</code> con los tokens consumidos.</li>
            <li><b>Panel derecho (Log):</b> timestamps, latencia, tokens, errores.</li>
            <li><b>Páginas auxiliares:</b> <a href="/contexto" target="_blank" rel="noreferrer">/contexto</a> (vista en vivo del array <code>messages</code>) y <a href="/proveedores" target="_blank" rel="noreferrer">/proveedores</a> (comparación OpenAI vs Anthropic).</li>
          </ul>
            </div>
          </details>
        </section>

        {/* ============== EDITOR ============== */}
        <section className="criollo-section">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>2) 💻 Editor — IA modifica código (un turno)</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/editor" target="_blank" rel="noreferrer"><code>http://localhost:5173/editor</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Un editor de código (Monaco — el mismo de VS Code) + una caja para pedirle algo
            a la IA <i>sobre ese código</i>. Le mandás el código + la instrucción, te devuelve
            código modificado, lo aplicás manualmente con un botón.
          </p>

          <h3>El concepto que enseña: <i>el código es contexto</i></h3>
          <p>
            La IA <b>no tiene "acceso" a tu archivo</b> — vos le pegás el código en el prompt,
            y ella te devuelve texto. El editor es solo presentación: lo que importa es que
            el código viaja como un string dentro del campo <code>messages[].content</code>.
          </p>
          <p>
            Esto significa que <b>todo</b> lo que está en el código es contexto: nombres de
            variables, comentarios, espacios. Si la IA "adivina" algo aparentemente sin
            información, fijate si la pista no estaba escondida en el código.
          </p>

          <h3>Modos del editor</h3>
          <ul>
            <li>
              <b>Sin contexto</b> — cada instrucción es independiente. El system prompt + tu
              código + tu instrucción. La IA no recuerda lo que pasó antes.
            </li>
            <li>
              <b>Con contexto</b> — guardás un historial de instrucciones/respuestas previas.
              Ideal para encadenar pasos donde el segundo depende del primero (ej: "agregá una
              clase" → "instanciá <i>esa</i> clase"). Sin contexto, el "esa" no se entiende.
            </li>
          </ul>

          <h3>Por qué es solo "un turno"</h3>
          <p>
            Mandás → recibís → aplicás (o no) → fin. La IA <b>no puede</b> volver a ver tu
            código después de responder, ni hacer dos cambios en una sola operación. Si querés
            otro cambio, mandás otra instrucción. Esa limitación es la que rompe el Loop Agéntico.
          </p>

          <h3>Qué mirar</h3>
          <ul>
            <li><b>Panel del medio:</b> probá los 3 pasos sugeridos en orden, primero <i>Con contexto</i> y después <i>Sin contexto</i> — vas a ver cómo cambia el resultado.</li>
            <li><b>Panel derecho:</b> el array <code>messages[]</code> que se mandó. <b>Todo</b> ese texto es lo que la IA usó para responderte.</li>
            <li><b>Botón "Aplicar al editor":</b> reemplaza el código actual con el bloque <code>```...```</code> que vino en la respuesta. Si no aplicás, la respuesta se descarta.</li>
          </ul>
            </div>
          </details>
        </section>

        {/* ============== LOOP AGÉNTICO ============== */}
        <section className="criollo-section">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>3) 🤖 Loop Agéntico — IA con herramientas (loop)</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/loop-agentico" target="_blank" rel="noreferrer"><code>http://localhost:5173/loop-agentico</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Igual al Editor por fuera (Monaco + prompt), pero por dentro <b>cambia todo</b>.
            En vez de pedirle a la IA que devuelva código, le damos <b>herramientas</b> que
            puede llamar — <code>read_code</code> (leer el archivo) y <code>edit_code</code>
            (reemplazar un fragmento) — y la dejamos trabajar en un loop.
          </p>

          <h3>El concepto que enseña: <i>tool use</i> (function calling)</h3>
          <p>
            Las APIs modernas de LLM permiten declarar herramientas en cada request. La IA
            no las ejecuta — las <b>pide</b>, y tu código las ejecuta y le devuelve el
            resultado. Esa ida y vuelta se repite hasta que la IA dice "ya está".
          </p>
          <div className="prov-callout">
            <p>
              <b>Modelo mental:</b> la IA es un cerebro sin manos. Pide acciones; tu código
              son las manos que las ejecutan y reportan el resultado. <b>Un solo prompt humano
              = N requests internas</b> (a veces 2, a veces 6, depende).
            </p>
          </div>

          <h3>El loop, paso a paso</h3>
          <ol>
            <li>Vos mandás una instrucción (ej. "renombrá saldo a balance").</li>
            <li>El navegador arma un <code>POST /v1/messages</code> con la instrucción + la lista de tools.</li>
            <li>La IA responde con <code>stop_reason: "tool_use"</code> y un bloque pidiendo <code>edit_code(old="saldo", new="balance")</code>.</li>
            <li>El navegador ejecuta esa tool localmente sobre el string del código, devuelve <code>"OK: reemplazado"</code>.</li>
            <li>El navegador arma un <b>nuevo</b> request — el array <code>messages</code> ahora incluye la pedido de la IA + el resultado que tu código generó.</li>
            <li>La IA ve el resultado y o bien pide <i>otra</i> tool (ej: ahora <code>getSaldo</code> → <code>getBalance</code>) o bien dice "listo, terminé" con un texto final.</li>
            <li>El loop termina cuando <code>stop_reason !== "tool_use"</code>.</li>
          </ol>

          <h3>Comparación rápida con el Editor común</h3>
          <div className="prov-table-wrap">
            <table className="prov-table">
              <thead>
                <tr>
                  <th>Aspecto</th>
                  <th className="prov-col-openai">💻 Editor</th>
                  <th className="prov-col-claude">🤖 Loop Agéntico</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Requests por prompt humano</td>
                  <td>1</td>
                  <td>N (loop)</td>
                </tr>
                <tr>
                  <td>Quién aplica los cambios</td>
                  <td>Vos (botón "Aplicar")</td>
                  <td>El loop, automático</td>
                </tr>
                <tr>
                  <td>Tipo de respuesta</td>
                  <td>Bloque <code>```código```</code></td>
                  <td><code>tool_use</code> blocks</td>
                </tr>
                <tr>
                  <td>La IA puede ver el resultado de su acción</td>
                  <td>❌ No</td>
                  <td>✅ Sí (vía <code>tool_result</code>)</td>
                </tr>
                <tr>
                  <td>Cambios complejos en un solo prompt</td>
                  <td>❌ Difícil</td>
                  <td>✅ Natural</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Qué mirar</h3>
          <ul>
            <li><b>Editor (panel izq.):</b> el código se modifica solo, en vivo, cada vez que la IA llama <code>edit_code</code>. Eso es <i>tu</i> código ejecutando la tool.</li>
            <li><b>Timeline (panel medio):</b> cada iteración del loop con sus <code>tool_use</code> (azul) y <code>tool_result</code> (verde). Al final, el texto que la IA da por respuesta.</li>
            <li><b>Historial (panel der.):</b> ⭐ <b>la joya pedagógica</b>. Cada iteración apilada y expandible. Comparando la #1 vs la #2 ves <i>literal</i> cómo el array <code>messages</code> creció con el <code>tool_use</code> del assistant + el <code>tool_result</code> que tu código devolvió.</li>
            <li><b>Selector de proveedor:</b> probá la misma instrucción con OpenAI y con Claude — el shape del JSON es completamente distinto (<code>tools.input_schema</code> vs <code>tools.function.parameters</code>, <code>tool_use</code> vs <code>tool_calls</code> con <code>arguments</code> stringificado), pero el concepto es idéntico.</li>
          </ul>

          <h3>Esto es lo que hacen Cursor, Claude Code, Copilot Agent, Aider…</h3>
          <p>
            Todos los "agentes de código" modernos funcionan así. La diferencia con esta app
            es que ellos exponen muchas más tools (<code>read_file</code>, <code>write_file</code>,
            <code>run_command</code>, <code>search</code>, <code>grep</code>…) y trabajan sobre el
            sistema de archivos real, no sobre un string en memoria. La idea de fondo es la misma:
            <b> declarar herramientas, dejar que la IA las pida, ejecutarlas localmente, devolverle
            el resultado, repetir.</b>
          </p>
            </div>
          </details>
        </section>

        {/* ============== AGENTS.MD ============== */}
        <section className="criollo-section">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>4) 📋 AGENTS.md — instrucciones persistentes para el agente</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/agents-md" target="_blank" rel="noreferrer"><code>http://localhost:5173/agents-md</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Es el Loop Agéntico, pero con una columna extra: un editor para un archivo
            <code> AGENTS.md</code>. Lo que escribís ahí se inyecta en el <code>system</code>
            prompt del agente <b>en cada request</b> del loop. Y hay un botón
            <b> "Comparar con/sin"</b> que corre la misma instrucción dos veces — una con el
            AGENTS.md activado, otra ignorándolo — y muestra los dos resultados lado a lado.
          </p>

          <h3>El concepto que enseña: <i>cómo le enseñás convenciones a una IA recién nacida</i></h3>
          <p>
            Esto cierra el círculo de toda la app. Si la IA es <b>recién nacida en cada request</b>
            (sección 🧠 de arriba), <b>¿cómo hacés para que respete tus convenciones?</b>
            ¿Cómo le decís que <i>en este proyecto</i> los campos privados llevan <code>_</code>,
            que el logging va por <code>log.info()</code>, que los métodos públicos son verbos
            en infinitivo en español?
          </p>
          <div className="prov-callout">
            <p>
              <b>Respuesta:</b> no le enseñás nada. Le mandás esas reglas, <b>una y otra vez,
              en cada request</b>, dentro del system prompt. AGENTS.md es <b>el truco más
              tonto que funciona</b>: un archivo de texto que tu cliente concatena al system
              en cada llamada a la API. La IA <b>no</b> "carga tu proyecto". Vos le pegás un
              manual de bienvenida en cada turno, y ella actúa como si "supiera" tu proyecto.
            </p>
          </div>

          <h3>Por qué importa (y por qué la demo es una comparación)</h3>
          <p>
            Sin AGENTS.md, la IA usa convenciones <i>genéricas</i> (Java estándar, Spring
            estándar, REST estándar). Con AGENTS.md respeta las convenciones <i>tuyas</i>.
            La diferencia es brutal y sólo se entiende viéndola en vivo. Por eso la demo es:
          </p>
          <ol>
            <li>Mismo prompt humano: <i>"Agregá un método transferir(destino, monto)"</i>.</li>
            <li>Mismo código inicial.</li>
            <li>Mismo modelo, misma temperatura, misma seed implícita.</li>
            <li>La <b>única</b> variable que cambia: si el AGENTS.md va o no en el system.</li>
          </ol>
          <p>
            El botón "Comparar con/sin" hace exactamente eso: dos corridas independientes,
            mismas condiciones excepto el AGENTS.md, dos códigos finales lado a lado. Vas a
            ver cómo la versión "CON" usa el prefijo <code>_</code> en campos privados,
            valida inputs, lanza <code>IllegalArgumentException</code>, loguea con
            <code> log.info</code> — y la versión "SIN" hace lo mismo que cualquier IA con
            cualquier código Java en internet.
          </p>

          <h3>Esto es lo que hacen Cursor, Claude Code, Aider, Continue…</h3>
          <p>
            Todos tienen su versión: <code>AGENTS.md</code> (estándar de OpenAI),
            <code> CLAUDE.md</code> (Anthropic / Claude Code), <code>.cursorrules</code> (Cursor),
            <code> .aider.conf</code>. <b>Mismo concepto.</b> Un archivo de texto que el cliente
            agrega al system prompt en cada llamada. Algunos buscan jerárquicamente (uno por
            carpeta), otros tienen plantillas, pero el truco de fondo es siempre el mismo:
            <i> mandar las convenciones del proyecto en cada request</i>.
          </p>
          <p>
            En este mismo repo, mirá <a href="https://github.com/anthropics/claude-code/blob/main/CLAUDE.md" target="_blank" rel="noreferrer">cualquier CLAUDE.md de un proyecto open source</a>:
            son archivos que describen comandos, convenciones, arquitectura, gotchas. Esa
            descripción se la "explican" a la IA <b>cada vez</b> que la invocan.
          </p>

          <h3>Qué mirar en el modo</h3>
          <ul>
            <li><b>Toggle "incluido / ignorado"</b> arriba del editor de AGENTS.md — desactivá para hacer una corrida sin él, comparalo manualmente con una activada.</li>
            <li><b>Botón "🔬 Comparar con/sin":</b> el corazón de la demo. Misma instrucción, dos resultados.</li>
            <li><b>Panel derecho (Historial Request/Response):</b> abrí cualquier request y mirá el campo <code>system</code> — cuando el toggle está ON, ves todo el AGENTS.md inyectado ahí. <b>Cada</b> request lo lleva.</li>
            <li><b>Costo:</b> AGENTS.md grandes hacen que <b>cada</b> request gaste más tokens (porque va completo cada vez). Por eso conviene ser conciso. Prompt caching de Anthropic descuenta el 90% si los detecta repetidos — pero igual son tokens.</li>
          </ul>
            </div>
          </details>
        </section>

        {/* ============== AGENTS.MD + SKILLS ============== */}
        <section className="criollo-section">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>5) 📋 Agente + 🧪 skills — cargar reglas on-demand</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/agents-md-skills" target="_blank" rel="noreferrer"><code>http://localhost:5173/agents-md-skills</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Es el mismo agente del modo 4 (con AGENTS.md inyectado en el system), pero se le
            suman <b>dos tools nuevas</b>: <code>load_skill</code> (carga el cuerpo de una skill
            on-demand al contexto) y <code>run_skill_test</code> (corre un test determinista
            asociado a esa skill para validar lo que hizo). El AGENTS.md ahora <b>no</b> contiene
            las reglas detalladas — contiene un <i>índice</i> de skills disponibles con su
            descripción corta, y la IA decide cuándo necesita cargar el detalle.
          </p>

          <h3>El concepto que enseña: <i>contexto bajo demanda</i></h3>
          <p>
            Si AGENTS.md (sección 4) es "mandá <b>todas</b> las reglas en cada request", skills
            es "mandá un <b>índice</b> de reglas y dejá que la IA pida sólo las que necesita".
            Es la misma idea de las APIs REST descubribles: en vez de mandar todo el manual
            cada vez, mandás el catálogo y un mecanismo para ir a buscar el detalle.
          </p>
          <div className="prov-callout">
            <p>
              <b>Por qué importa:</b> AGENTS.md grandes (cientos de líneas con reglas de
              estilo, seguridad, dominio, deploy…) hacen que <b>cada</b> request cargue todo
              eso, aunque la tarea sea trivial. Con skills, el sistema mete sólo el índice
              (chico) en el system, y el cuerpo de cada skill viaja únicamente cuando la IA
              decide que lo necesita.
            </p>
          </div>

          <h3>El loop, paso a paso</h3>
          <ol>
            <li>El system arranca con AGENTS.md <b>+ un índice</b> de skills disponibles (ej: <code>commit-message</code>, <code>jdoc-style</code>, <code>null-checks</code>) con una línea de descripción cada una.</li>
            <li>Vos mandás una instrucción (ej. "agregá un método que transfiera saldo").</li>
            <li>La IA mira el índice, decide que necesita la skill <code>null-checks</code> para validar inputs, y pide <code>load_skill(id="null-checks")</code>.</li>
            <li>Tu código devuelve el cuerpo de esa skill como <code>tool_result</code>. <b>Ahora</b> esas reglas viven en el contexto.</li>
            <li>La IA edita el código aplicando las reglas, y opcionalmente llama <code>run_skill_test(id="null-checks")</code> para verificar que su cambio respeta la skill.</li>
            <li>El test determinista (definido en <code>src/skill-tests.js</code>, indexado por id de skill) corre sobre el código resultante y devuelve <code>pass</code> / <code>fail</code> con detalle.</li>
            <li>Si falla, la IA itera. Si pasa, termina.</li>
          </ol>

          <h3>Comparación con el modo 4 (AGENTS.md solo)</h3>
          <div className="prov-table-wrap">
            <table className="prov-table">
              <thead>
                <tr>
                  <th>Aspecto</th>
                  <th className="prov-col-openai">📋 AGENTS.md solo</th>
                  <th className="prov-col-claude">📋 AGENTS.md + 🧪 skills</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Qué viaja en el system</td>
                  <td>Todas las reglas, completas</td>
                  <td>Índice + descripciones cortas</td>
                </tr>
                <tr>
                  <td>Cuándo se carga el detalle</td>
                  <td>Siempre, en cada request</td>
                  <td>Sólo si la IA lo pide</td>
                </tr>
                <tr>
                  <td>Tokens fijos por turno</td>
                  <td>Altos (crecen con el AGENTS.md)</td>
                  <td>Bajos (sólo índice)</td>
                </tr>
                <tr>
                  <td>Validación del resultado</td>
                  <td>Ojo humano</td>
                  <td><code>run_skill_test</code> determinista</td>
                </tr>
                <tr>
                  <td>Decisión "qué regla aplicar"</td>
                  <td>La IA filtra del bloque entero</td>
                  <td>La IA elige del índice antes de cargar</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Qué mirar en el modo</h3>
          <ul>
            <li><b>Panel de skills (izq.):</b> el índice editable. Cada skill tiene id, descripción corta y cuerpo. Lo que viaja en el system es sólo lo de arriba — el cuerpo viaja sólo cuando la IA llama <code>load_skill</code>.</li>
            <li><b>Historial Request/Response (der.):</b> ⭐ mirá cómo en la <b>primera</b> request el system es chico (índice solamente). Después de un <code>load_skill</code>, el array <code>messages</code> incluye el cuerpo completo como <code>tool_result</code> — pero el system <i>sigue chico</i>. <b>Esa es la diferencia clave.</b></li>
            <li><b><code>run_skill_test</code>:</b> después de editar, la IA muchas veces decide validarse a sí misma. Vas a ver llamadas a la tool con su <code>pass</code>/<code>fail</code>. Si falla, suele reintentar.</li>
            <li><b>Esto es lo que hace Claude Code:</b> el sistema de Skills de Claude Code es <i>literalmente</i> esto — un índice de skills disponibles en el system, y la tool para cargar el detalle cuando hace falta. Cursor rules cargables siguen el mismo patrón.</li>
          </ul>
            </div>
          </details>
        </section>

        {/* ============== ESTA APP vs AGENTES PRODUCTIVOS ============== */}
        <section className="criollo-section">
          <h2>🛠️ Esta app vs. Claude Code / Cursor / Codex</h2>
          <p>
            Pregunta que aparece sola después de jugar con el Loop Agéntico: <i>¿esto es lo
            mismo que Claude Code? ¿que Cursor? ¿que Codex?</i> La respuesta corta es <b>no, pero
            están construidos sobre exactamente lo que ves acá</b>. Esta sección existe para que
            cuando vuelvas a tu Cursor / Claude Code / Codex de todos los días, sepas qué está
            pasando por debajo y puedas usarlos mejor.
          </p>

          <h3>Las tres capas</h3>
          <ol>
            <li>
              <b>La API</b> (<code>/v1/chat/completions</code>, <code>/v1/messages</code>) —
              el motor HTTP. Stateless, sin manos. Le mandás JSON, te devuelve JSON. No lee tus
              archivos, no corre comandos, no recuerda nada entre requests. <b>Es el ladrillo.</b>
            </li>
            <li>
              <b>Esta app</b> — una linterna apuntando a la API. No agrega inteligencia, solo
              expone el JSON crudo, el contexto que se acumula, el loop de tool-use, los tokens.
              Sirve para <b>entender</b>.
            </li>
            <li>
              <b>Claude Code, Cursor, Codex / Copilot</b> — agentes productivos construidos
              <i>encima</i> de esa misma API. Le agregaron tools reales (filesystem, shell, git),
              gestión de contexto largo, permisos, UX de IDE / terminal. Sirven para <b>trabajar</b>.
            </li>
          </ol>

          <div className="prov-callout">
            <p>
              <b>Lo que ves en el Loop Agéntico es, en miniatura, lo que hace Claude Code cuando
              te responde.</b> Mismo loop, mismo <code>tool_use</code> → <code>tool_result</code>,
              mismo <code>messages[]</code> que crece. La diferencia son las tools (
              <code>Read</code>, <code>Edit</code>, <code>Bash</code>, <code>Grep</code>… vs. dos
              tools sobre un string) y la UX alrededor.
            </p>
          </div>

          <h3>Comparación lado a lado</h3>
          <div className="prov-table-wrap">
            <table className="prov-table">
              <thead>
                <tr>
                  <th>Aspecto</th>
                  <th className="prov-col-openai">Esta app</th>
                  <th className="prov-col-claude">Claude Code / Cursor / Codex</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Qué es</td>
                  <td>Cliente HTTP educativo</td>
                  <td>Agente de programación productivo</td>
                </tr>
                <tr>
                  <td>Tools disponibles</td>
                  <td>2-5 simuladas sobre un snippet en memoria</td>
                  <td>Decenas, sobre filesystem, git, shell reales</td>
                </tr>
                <tr>
                  <td>Sobre qué actúa</td>
                  <td>Un string de código en <code>localStorage</code></td>
                  <td>Tu repo, tu terminal, tu IDE</td>
                </tr>
                <tr>
                  <td>Gestión de contexto</td>
                  <td>Vos lo ves crudo y lo manejás</td>
                  <td>Automática (compaction, caching, file pinning)</td>
                </tr>
                <tr>
                  <td>Permisos / aprobaciones</td>
                  <td>Sentinel <code>NEEDS_HUMAN_APPROVAL</code> manual</td>
                  <td>Sistema de permisos, modos (plan, accept-edits), hooks</td>
                </tr>
                <tr>
                  <td>Archivo de reglas</td>
                  <td><code>AGENTS.md</code> en el editor de la app</td>
                  <td><code>CLAUDE.md</code>, <code>AGENTS.md</code>, <code>.cursorrules</code> en tu repo</td>
                </tr>
                <tr>
                  <td>Para qué sirve</td>
                  <td><b>Entender</b> cómo funciona por debajo</td>
                  <td><b>Trabajar</b> sobre código real</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Qué te llevás de acá para usar mejor tu agente</h3>
          <p>
            Cada modo de esta app te muestra una capa que en Claude Code / Cursor / Codex queda
            tapada. Cuando volvés a tu herramienta de todos los días, ya sabés qué está pasando:
          </p>
          <ul>
            <li>
              <b>💬 Chat → el contexto se paga.</b> Cuando tu Cursor "se vuelve lento" o "olvida
              cosas viejas", es porque el <code>messages[]</code> creció. Saber esto te explica
              por qué conviene abrir chats nuevos para tareas nuevas, y por qué los modelos con
              ventana de contexto más grande no son <i>gratis</i>: cada token de historial se cobra
              en cada turno.
            </li>
            <li>
              <b>💻 Editor → el código es contexto, nada más.</b> Cuando le pegás un snippet a
              Copilot Chat o le pedís a Cursor que mire un archivo, lo único que la IA "ve" es
              ese texto dentro de <code>messages[].content</code>. No "abre" tu archivo, no
              "entiende" tu proyecto — lee strings. Esto cambia cómo redactás prompts y por qué
              <i> qué le pegás</i> importa más que <i>cómo se lo pedís</i>.
            </li>
            <li>
              <b>🤖 Loop Agéntico → tu agente es un cerebro sin manos.</b> Cuando Claude Code
              dice "voy a leer X archivo" y después "voy a editar Y", son dos vueltas del loop
              que viste acá. Saber esto te ayuda a leer mejor lo que hace tu agente, a entender
              por qué a veces se traba ("se quedó pidiendo una tool que falla") y por qué tareas
              grandes consumen muchos turnos (= muchos tokens, = plata).
            </li>
            <li>
              <b>📋 AGENTS.md → las reglas viajan en cada request.</b> Tu <code>CLAUDE.md</code> /
              <code> .cursorrules</code> <b>no</b> "entrena" a la IA. Se concatena al system prompt
              en cada llamada. Por eso conviene que sea conciso (cada token cuenta, cada turno) y
              específico (lo genérico ya lo sabe el modelo). La comparación "con/sin" del modo 4
              es <i>literal</i> lo que ganás o perdés cuando lo escribís bien o mal.
            </li>
          </ul>

          <div className="prov-callout">
            <p>
              <b>Modelo mental para usuarios de agentes:</b> tu Cursor / Claude Code / Codex es
              <i> esta app con muchas más tools y una UX prolija arriba</i>. Si entendés qué pasa
              en el panel derecho del Loop Agéntico, entendés qué está haciendo tu agente cuando
              "piensa". Si entendés por qué el array <code>messages[]</code> crece, entendés por
              qué tu sesión larga cuesta más y responde peor. <b>Ese es el objetivo de la app.</b>
            </p>
          </div>
        </section>

        {/* ============== APENDICE ============== */}
        <section className="criollo-section">
          <h2>Glosario rápido</h2>
          <ul>
            <li><b>Token</b> — la unidad mínima de texto que procesa el modelo. Un token ≈ 4 caracteres en español. Se cobra por token.</li>
            <li><b>Stateless</b> — sin memoria entre requests. Cada llamada es independiente; el "recuerdo" lo armás vos mandando el historial.</li>
            <li><b>System prompt</b> — instrucciones globales que le das a la IA (su "personalidad" o reglas). Va al principio del array <code>messages</code> con <code>role: "system"</code> (o aparte en el caso de Claude).</li>
            <li><b>Tool use / function calling</b> — feature de la API que permite declarar funciones que la IA puede pedir. Ella no las ejecuta, solo las pide.</li>
            <li><b>Loop agéntico</b> — el ciclo de pedir tool → ejecutar → devolver resultado → repetir, hasta que la IA termina.</li>
            <li><b>stop_reason / finish_reason</b> — por qué el modelo paró. <code>"end_turn"</code>/<code>"stop"</code> = terminó normal; <code>"tool_use"</code>/<code>"tool_calls"</code> = pidió una herramienta; <code>"max_tokens"</code> = se cortó.</li>
          </ul>
        </section>

      </div>
    </div>
  )
}
