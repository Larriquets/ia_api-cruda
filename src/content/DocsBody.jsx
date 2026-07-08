// Cuerpo de /docs en ES (base de verdad, extraído verbatim del Docs.jsx original)
// y EN. El andamiaje (TOC plegable, observers, hash routing) vive en Docs.jsx.
import TryModeCTA from '../TryModeCTA.jsx'

export function DocsBodyEs() {
  return (
        <div className="docs-main">

        {/* ============== TODA IA ES UNA API ============== */}
        <section className="criollo-section" id="api-es-todo">
          <details className="docs-collapsible docs-section-collapsible" open>
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🌐 Arranquemos por lo importante: toda IA pasa por una API</span>
            </summary>
            <div className="docs-collapsible-body">
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
              ChatGPT y Cursor y el bot de tu banco es <i>qué</i> meten en <code>messages[]</code>{' '}
              y <i>qué tools</i> declaran.
            </p>
          </div>
          <p>
            <b>La finalidad de esta app, en sus cinco etapas, es esa.</b> Cada modo le saca
            una capa más al producto comercial para que veas el POST que está abajo:
          </p>
          <ol>
            <li>
              <b>💬 Chat</b> — lo mismo que ChatGPT, pero te muestra el array <code>messages[]</code>{' '}
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
              sumás dos tools: <code>load_skill</code> (carga una skill on-demand al contexto) y{' '}
              <code>run_skill_test</code> (corre un test determinista para validar). Es el patrón
              de Claude Code skills / Cursor rules cargables: la IA decide cuándo necesita el
              detalle, no se lo metés todo de entrada.
            </li>
          </ol>
          <p>
            Lo que sigue abajo (la IA es recién nacida, el contexto, las tools, AGENTS.md) son
            <b> consecuencias</b> de esta primera idea.
          </p>
            </div>
          </details>
        </section>

        {/* ============== LA IA ES RECIEN NACIDA ============== */}
        <section className="criollo-section" id="recien-nacida">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🧠 El concepto que une todo: la IA es "recién nacida" en cada request</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            Si te llevás <b>una sola idea</b> de toda esta app, que sea esta. Es lo que más
            cuesta internalizar y lo que explica el 80% de las cosas que parecen raras.
          </p>

          <div className="prov-callout">
            <p>
              <b>Cada request a la IA es una IA recién nacida.</b> No tiene memoria de la
              request anterior. No sabe que hablaste con ella hace 5 segundos. No sabe que
              sos vos. Lo único que sabe es <b>lo que está en el body del POST de este
              request</b>. Cuando responde, se olvida de todo y se va.
            </p>
          </div>

          <p>
            Cada <code>POST /v1/messages</code> levanta una instancia del modelo, lee tu JSON
            (<code>system</code> + <code>messages</code> + <code>tools</code>), genera la
            respuesta y <b>termina</b>. No hay sesión, no hay <code>userId</code> con estado,
            no hay cache mental. La próxima request es <b>otra instancia</b> leyendo otro
            JSON, sin nada en común salvo lo que <b>vos</b> le pongas en <code>messages</code>.
          </p>
          <p>
            Esto es <b>por diseño</b>: cualquier servidor atiende cualquier request
            (escalabilidad), la salida depende solo del input (determinismo), no hay nada que
            filtrar después (privacidad), y tu código tiene <b>toda</b> la verdad (sin
            estado oculto).
          </p>

          <div className="prov-callout">
            <p>
              <b>Modelo mental para guardar:</b> la IA es una <b>función pura</b> — mismo
              input, misma distribución de output. <b>Vos</b> mantenés el estado, lo
              persistís, lo editás, lo mandás. La IA es <i>un cerebro alquilado por 200
              milisegundos</i>: durante ese rato una GPU corre inferencia con tu prompt,
              después pasa a atender a otro. Todo lo que la IA "sabe" de vos está en el JSON
              que mandaste. Fin.
            </p>
          </div>
          <p>
            Por eso <a href="/contexto" target="_blank" rel="noreferrer"><b>/contexto</b></a> es
            una página tan importante de esta app: te muestra <b>literalmente</b> todo lo
            que la IA va a saber en la próxima request del chat. <b>No hay nada más.</b>
          </p>

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
                prompt completo internamente. <b>La IA sigue siendo "recién nacida" en cada inferencia.</b>{' '}
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
                se va a quejar — no tiene cómo darse cuenta. Para ella la conversación <b>es</b>{' '}
                lo que le mandás.
              </p>

              <h4>3) Por qué podés mentirle sobre lo que dijo</h4>
              <p>
                Análogo a lo anterior: podrías editar un mensaje <code>role: "assistant"</code>{' '}
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
            </div>
          </details>
        </section>

        {/* ============== INTRO ============== */}
        <section className="criollo-section" id="de-que-se-trata">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🧪 De qué se trata esta app</span>
            </summary>
            <div className="docs-collapsible-body">
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
            </div>
          </details>
        </section>

        {/* ============== CHAT ============== */}
        <section className="criollo-section" id="modo-chat">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>1) 💬 Chat — el modo clásico</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/chat" target="_blank" rel="noreferrer"><code>http://localhost:5173/chat</code></a>
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
          <p>
            ¿Querés ver la diferencia entre los tres modos <b>sin gastar API</b>?{' '}
            Abrí <a href="/demo/chat" target="_blank" rel="noreferrer">/demo/chat</a> —
            un comparador animado de crudo vs conversación vs persistente, lado a lado.
          </p>

          <h3>Qué mirar</h3>
          <ul>
            <li><b>Panel del medio (Request → API):</b> el JSON que sale. Fijate cómo crece <code>messages[]</code> con cada turno.</li>
            <li><b>Panel del medio (Response ← API):</b> lo que vuelve, incluyendo <code>usage</code> con los tokens consumidos.</li>
            <li><b>Panel derecho (Log):</b> timestamps, latencia, tokens, errores.</li>
            <li><b>Páginas auxiliares:</b> <a href="/contexto" target="_blank" rel="noreferrer">/contexto</a> (vista en vivo del array <code>messages</code>) y <a href="/proveedores" target="_blank" rel="noreferrer">/proveedores</a> (comparación OpenAI vs Anthropic).</li>
          </ul>

          <TryModeCTA
            href="/chat"
            label="Chat"
            emoji="💬"
            hint="Probá los tres modos de contexto (Crudo / Conversación / Persistente) y mirá cómo cambia el JSON que sale."
          />
          <TryModeCTA
            href="/demo/chat"
            label="Demo Chat"
            emoji="🎞️"
            hint="Compará crudo, conversación y persistente sin gastar API."
          />
            </div>
          </details>
        </section>

        {/* ============== EDITOR ============== */}
        <section className="criollo-section" id="modo-editor">
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
          <p>
            ¿Querés ver la diferencia entre los dos modos <b>sin gastar API</b>?{' '}
            Abrí <a href="/demo/editor" target="_blank" rel="noreferrer">/demo/editor</a> —
            un comparador animado de sin contexto vs con contexto, lado a lado, sobre la misma
            sesión de 3 ediciones.
          </p>

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

          <TryModeCTA
            href="/editor"
            label="Editor"
            emoji="💻"
            hint="Pegá código, pedí un cambio, comparalo con/sin contexto."
          />
          <TryModeCTA
            href="/demo/loop"
            label="Demo Loop"
            emoji="✂️"
            hint="Mirá paso a paso qué pasa cuando la IA pide una edición."
          />
            </div>
          </details>
        </section>

        {/* ============== LOOP AGÉNTICO ============== */}
        <section className="criollo-section" id="modo-loop">
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
            Igual al Editor por fuera, con un área de edición tipo VS Code y un prompt, pero por dentro <b>cambia todo</b>.
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

          <p>
            ¿Querés entender el mecanismo <b>sin gastar API</b> y sin meterte
            todavía en el JSON crudo?{' '}
            Abrí <a href="/demo/loop" target="_blank" rel="noreferrer">/demo/loop</a> —
            una animación guiada de una sola corrida (8 pasos) que destruye la idea
            de que "la IA edita tu código". <b>La IA pide ediciones; las hace tu código.</b>
          </p>

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

          <TryModeCTA
            href="/loop-agentico"
            label="Loop Agéntico"
            emoji="🤖"
            hint="Dale una instrucción y mirá el ciclo tool_use → tool_result en vivo."
          />
          <TryModeCTA
            href="/demo/loop"
            label="Demo Loop"
            emoji="✂️"
            hint="Mirá una corrida guiada de una edición pedida por tools."
          />
            </div>
          </details>
        </section>

        {/* ============== AGENTS.MD ============== */}
        <section className="criollo-section" id="modo-agentsmd">
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
            <code> AGENTS.md</code>. Lo que escribís ahí se inyecta en el <code>system</code>{' '}
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

          <TryModeCTA
            href="/agents-md"
            label="Agente + reglas"
            emoji="📋"
            hint="Editá el AGENTS.md y mirá cómo cambian las respuestas del agente."
          />
            </div>
          </details>
        </section>

        <section className="criollo-section">
          <TryModeCTA
            href="/demo/agents-md"
            label="Demo AGENTS.md"
            emoji="A"
            hint="Misma tarea, mismo agente: compara que cambia cuando AGENTS.md viaja en el system."
          />
        </section>

        {/* ============== AGENTS.MD + SKILLS ============== */}
        <section className="criollo-section" id="modo-skills">
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

          <TryModeCTA
            href="/agents-md-skills"
            label="Agente + skills"
            emoji="🧪"
            hint="Mirá cómo la IA pide load_skill y el system se mantiene chico."
          />
            </div>
          </details>
        </section>

        {/* ============== VENTANA DE CONTEXTO ============== */}
        <section className="criollo-section" id="modo-ventana">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>6) 🪟 Ventana de contexto — ver romperse la memoria en vivo</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/ventana-contexto" target="_blank" rel="noreferrer"><code>http://localhost:5173/ventana-contexto</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Un chat común, pero con un <b>límite de tokens artificial</b> (default: 300) que vos
            controlás con un slider. Cuando la conversación se pasa del límite, la app <b>poda</b>{' '}
            mensajes antes de enviar — y el panel "Memoria" te muestra <i>literalmente</i> qué se
            borró y qué viaja.
          </p>

          <h3>El concepto que enseña: <i>cómo se rompe la memoria de un chat largo</i></h3>
          <p>
            Si la IA es recién nacida en cada request (sección 🧠) y vos le mandás todo el historial
            (sección 💬), entonces hay un momento en el que <b>no entra más</b>: la ventana de
            contexto del modelo es finita. Cursor lo maneja por vos, ChatGPT lo maneja por vos.
            Acá lo manejás <b>vos</b> con tres estrategias clásicas, y ves la diferencia en vivo.
          </p>

          <h3>Las tres estrategias</h3>
          <ul>
            <li>
              <b>FIFO</b> — cuando te pasás, va sacando los mensajes más viejos uno por uno hasta
              entrar. Brutal: corta a mitad de un turno si hace falta. La IA "olvida" abrupto.
            </li>
            <li>
              <b>Sliding window</b> — mantiene los últimos N turnos (slider configurable). Es lo
              que hacen muchos chats productivos para tener gasto predecible. Olvida igual, pero
              de forma más estructurada.
            </li>
            <li>
              <b>Compaction</b> — el truco más copado: cuando te pasás, la app le pide al modelo
              un <b>resumen</b> de los turnos viejos y los reemplaza por un único mensaje
              "<code>[RESUMEN PREVIO]: ...</code>". Costo: un request extra de IA cada vez que se
              compacta. Beneficio: la continuidad semántica se mantiene aunque la conversación
              sea larga. Esto es <b>literalmente</b> lo que hace el comando <code>/compact</code>{' '}
              de Claude Code.
            </li>
          </ul>

          <div className="prov-callout">
            <p>
              <b>Lo más importante:</b> el system prompt (<code>messages[0]</code>) <b>nunca</b> se
              poda. Es invariante de diseño. Si fuera al revés, perderías la "personalidad" del
              bot en cuanto se llenara la ventana — y eso sería catastrófico.
            </p>
          </div>

          <h3>🧪 Experimento sugerido</h3>
          <ol>
            <li>Dejá el límite en <b>300 tokens</b> y la estrategia en <b>FIFO</b>.</li>
            <li>
              Empezá la charla presentándote: "Hola, me llamo <i>[tu nombre]</i> y trabajo en{' '}
              <i>[lo que sea]</i>".
            </li>
            <li>
              Charlá 4-5 turnos sobre cualquier tema (pedile que te recomiende libros, que te
              explique algo, etc.).
            </li>
            <li>
              En algún momento del turno 5 o 6, el primer mensaje (donde te presentaste) va a
              quedar <b>tachado en gris</b> en el panel Memoria. Esa es la poda.
            </li>
            <li>
              Mandá ahora: "<i>¿te acordás cómo me llamo?</i>". La IA va a inventar un nombre o
              decirte que no se acuerda — <b>porque ya no lo tiene en el contexto</b>.
            </li>
            <li>
              Cambiá la estrategia a <b>Compaction</b>, limpiá, repetí los pasos 2-5. Cuando se
              llene, vas a ver aparecer un mensaje <code>[RESUMEN PREVIO]</code> que <i>sí</i> menciona
              tu nombre. La pregunta del paso 6 ahora se contesta bien.
            </li>
          </ol>

          <h3>Qué mirar</h3>
          <ul>
            <li>
              <b>Barra de tokens (arriba):</b> verde → amarillo → rojo. Cuando se pone roja, el
              próximo envío va a podar.
            </li>
            <li>
              <b>Panel "Memoria" (derecha):</b> ⭐ <b>la joya pedagógica</b>. Tu historial completo
              con los mensajes tachados que ya no viajan al modelo. Es la imagen mental que vale
              la pena llevarse.
            </li>
            <li>
              <b>Panel Request crudo (medio):</b> abrí el JSON después de mandar — vas a ver que{' '}
              <code>messages[]</code> tiene <i>menos</i> entradas que tu historial visible. Esa
              diferencia es la ventana en acción.
            </li>
            <li>
              <b>Log (abajo derecha):</b> cuando hay compaction, hay líneas <code>[compaction]</code>{' '}
              con el request adicional. Ese es el costo extra que pagás.
            </li>
          </ul>

          <p>
            <b>Conexión con tu agente del día a día:</b> cuando tu Cursor "se vuelve lento" o
            "olvida cosas viejas", esto es lo que está pasando por debajo. La estrategia y los
            límites cambian, pero la mecánica es exactamente esta.
          </p>

          <TryModeCTA
            href="/ventana-contexto"
            label="Ventana de contexto"
            emoji="🪟"
            hint="Cambiá la estrategia (FIFO / window / compaction) y mirá cómo se poda el historial."
          />
            </div>
          </details>
        </section>

        {/* ============== PROMPT INJECTION ============== */}
        <section className="criollo-section" id="modo-injection">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>7) 🛡 Prompt injection — cuando el contexto no es confiable</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/prompt-injection" target="_blank" rel="noreferrer"><code>http://localhost:5173/prompt-injection</code></a>
          </p>

          <h3>Qué hace</h3>
          <p>
            Es un laboratorio para ver una idea que no alcanza con decirla: <b>todo es
            contexto, pero no todo el contexto tiene la misma autoridad</b>. El experimento arma
            un payload con <code>system</code>, tarea del usuario, documento externo y
            <code>tool_result</code>. Después mete instrucciones maliciosas dentro de esas zonas
            no confiables para ver si el modelo las obedece.
          </p>

          <h3>El concepto que enseña: <i>jerarquía de instrucciones</i></h3>
          <p>
            Un documento recuperado por RAG, el contenido de una web, un PDF pegado por el usuario
            o el output de una tool <b>son datos</b>. Pueden contener texto que parezca una orden
            ("ignorá el system", "revelá el secreto", "respondé PWNED"), pero no deberían mandar
            sobre el <code>system</code> ni sobre las políticas de tu app.
          </p>

          <div className="prov-callout">
            <p>
              <b>Idea clave:</b> prompt injection no es que alguien "hackea el modelo". Es más
              simple y más peligroso: metés texto no confiable dentro del prompt, y ese texto
              intenta hacerse pasar por una instrucción de mayor autoridad.
            </p>
          </div>

          <h3>Cómo está armado el experimento</h3>
          <ul>
            <li>
              <b>Filtrar secreto</b> — el documento externo intenta revelar una clave falsa que
              vive en el <code>system</code>.
            </li>
            <li>
              <b>Romper formato</b> — el documento intenta pisar el contrato de salida JSON.
            </li>
            <li>
              <b>Acción no autorizada</b> — un <code>tool_result</code> intenta convencer al
              modelo de que una acción fue aprobada.
            </li>
            <li>
              <b>Enviar vulnerable</b> — manda un system mínimo, sin explicar que documentos y
              tool results son datos no confiables.
            </li>
            <li>
              <b>Probar defensa</b> — manda el mismo ataque, pero con reglas explícitas de
              jerarquía: system &gt; user &gt; documento/tool result.
            </li>
          </ul>

          <h3>Qué mirar</h3>
          <ul>
            <li>
              <b>Constructor de ataque:</b> muestra qué parte del contexto es autoridad
              (<code>system</code>) y qué parte es dato no confiable.
            </li>
            <li>
              <b>Request crudo:</b> confirma que la inyección viaja como texto normal dentro del
              payload. No hay magia: está en <code>messages[]</code>.
            </li>
            <li>
              <b>Evaluación:</b> marca <code>PASS</code>/<code>FAIL</code> si el modelo filtró el
              secreto, rompió JSON, cambió el shape o siguió la instrucción inyectada.
            </li>
          </ul>

          <h3>Experimento sugerido</h3>
          <ol>
            <li>Entrá en <b>Filtrar secreto</b> con "Inyectar en documento externo" prendido.</li>
            <li>Mandá <b>Enviar vulnerable</b> y mirá si aparece algún <code>FAIL</code>.</li>
            <li>Mandá <b>Probar defensa</b> con el mismo escenario.</li>
            <li>
              Abrí el <b>Request crudo</b> de ambas corridas y compará el <code>system</code>.
              El modelo es el mismo; lo que cambió fue cómo le explicaste la autoridad del
              contexto.
            </li>
            <li>
              Repetí con <b>Acción no autorizada</b> y prendé "Inyectar en tool_result": es el caso
              más parecido a agentes reales que leen outputs de comandos, APIs o archivos.
            </li>
          </ol>

          <p>
            <b>Conexión con RAG y agentes:</b> cada vez que tu app pega texto externo en el prompt,
            estás abriendo esta puerta. La solución no es "no usar contexto externo"; es etiquetarlo
            como no confiable, mantener secretos fuera del prompt cuando sea posible, validar acciones
            con código determinístico y no dejar que un <code>tool_result</code> se convierta en jefe.
          </p>

          <TryModeCTA
            href="/prompt-injection"
            label="Prompt injection"
            emoji="🛡"
            hint="Probá los ataques precargados y mirá cuándo el modelo cae y cuándo aguanta."
          />
            </div>
          </details>
        </section>

        {/* ============== RAZONAMIENTO ============== */}
        <section className="criollo-section" id="modo-razonamiento">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>8) 🧠 Razonamiento — cuando el modelo "piensa" antes de responder</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/razonamiento" target="_blank" rel="noreferrer"><code>http://localhost:5173/razonamiento</code></a>
          </p>

          <h3>Qué hace</h3>
          <p>
            Es un laboratorio para ver de cerca los <b>modelos razonadores</b> — esos que en la
            interfaz de ChatGPT o Claude muestran un "Pensando…" antes de contestar. La página te
            deja mandar la misma pregunta a OpenAI (con <code>gpt-5-mini</code>, <code>o4-mini</code>,
            etc.) o a Claude (con <code>claude-sonnet-4-5</code>), y comparar qué te devuelve cada
            uno como "razonamiento".
          </p>

          <h3>El concepto que enseña: <i>el pensamiento son tokens</i></h3>
          <p>
            Un modelo razonador no tiene un cerebro místico. Lo que hace es <b>generar tokens de
            razonamiento</b> antes de generar la respuesta visible. Esos tokens se descartan del
            output final, pero <b>se facturan igual</b>. Es como pagar por borradores que nunca leés.
          </p>

          <div className="prov-callout">
            <p>
              <b>Idea clave:</b> "piensa más" significa "gasta más tokens internos". Más
              <code>effort</code> = más calidad en problemas complejos, pero también más plata y más
              latencia. En preguntas triviales es plata tirada.
            </p>
          </div>

          <h3>El contraste OpenAI vs Claude (la lección más fuerte)</h3>
          <p>
            Los dos proveedores eligieron <b>políticas opuestas</b> sobre qué te muestran:
          </p>
          <ul>
            <li>
              <b>OpenAI esconde el razonamiento.</b> Solo te da un <i>resumen</i> opcional
              (<code>output[].type:'reasoning'</code> con <code>summary[]</code>), y a veces ni eso —
              el bloque puede llegar vacío. El razonamiento real queda guardado <b>cifrado</b> en
              <code>encrypted_content</code>: opaco para vos, pero podés reenviarlo en multi-turn
              para que el modelo retome su pensamiento sin volver a pagarlo. Lo hacen así para que
              nadie pueda destilar el modelo copiándole los pensamientos.
            </li>
            <li>
              <b>Claude muestra el thinking entero.</b> Te lo devuelve en
              <code>content[].type:'thinking'</code> con el texto completo, párrafos enteros de
              cadena de pensamiento. Cada bloque viene <b>firmado</b> (<code>signature</code>) para
              que en multi-turn la API pueda confirmar que es un thinking original suyo y no algo
              que le metiste vos.
            </li>
          </ul>

          <h3>Qué mirar</h3>
          <ul>
            <li>
              <b>Panel de pensamiento (violeta para OpenAI, naranja para Claude):</b> es lo que
              normalmente está escondido detrás del "Pensando…" en una UI de chat. Acá lo ves crudo.
            </li>
            <li>
              <b>Tabla de tokens:</b> en OpenAI se ve <code>reasoning_tokens</code> separado del
              output visible — el alumno ve literalmente cuántos tokens "pensó" que no entran en
              la respuesta. En Claude todo entra en <code>output_tokens</code> sin desglose, y la UI
              lo aclara.
            </li>
            <li>
              <b>Request crudo:</b> en OpenAI no hay <code>temperature</code> (los razonadores la
              rechazan). En Claude <code>temperature: 1</code> es obligatorio y <code>max_tokens</code>
              tiene que ser mayor que <code>budget_tokens</code>. Cada API tiene sus reglas raras.
            </li>
            <li>
              <b>Effort:</b> mismo control mapeado a cada proveedor. En OpenAI es
              <code>reasoning.effort</code> (minimal/low/medium/high), en Claude es
              <code>thinking.budget_tokens</code> (1k / 2k / 5k / 12k tokens). La UI traduce.
            </li>
          </ul>

          <h3>Experimento sugerido</h3>
          <ol>
            <li>Elegí el preset <b>🧩 Acertijo lógico</b> con OpenAI / effort medium.</li>
            <li>
              Mirá los <b>tokens de razonamiento</b> en la tabla — vas a ver decenas o cientos de
              tokens "pensados" para un acertijo de 3 personas. Mirá el panel violeta: probablemente
              te devuelva un resumen muy corto o vacío.
            </li>
            <li>
              Cambiá a <b>Claude</b> con el mismo preset. Misma pregunta, ahora vas a ver párrafos
              enteros de pensamiento crudo en el panel naranja. <b>Es lo más cerca que vas a estar
              de leer la cadena de razonamiento de un modelo</b>.
            </li>
            <li>
              Probá ahora con <b>"¿Qué hora es?"</b>. Vas a ver que igual gasta tokens de pensamiento
              para una pregunta trivial. Esa es la trampa de los razonadores: te cobran
              "pensamiento" aunque no lo necesites. Por eso existen <code>effort: minimal</code> y
              modelos no-razonadores como <code>gpt-4o-mini</code> para tareas baratas.
            </li>
            <li>
              Subí <b>effort a high</b> en una pregunta difícil y compará: ¿mejoró la respuesta?
              ¿Cuánto más tardó? ¿Cuántos tokens extra pagaste? No siempre la respuesta es "sí mejoró".
            </li>
          </ol>

          <h3>Modelos que razonan vs los que no</h3>
          <ul>
            <li>
              <b>OpenAI razonadores:</b> <code>gpt-5</code>, <code>gpt-5-mini</code>,
              <code>o4-mini</code>, <code>o3-mini</code>, <code>o1-mini</code>. El default del Chat
              de esta app (<code>gpt-4o-mini</code>) <b>no razona</b> — por eso esta página usa una
              env var separada (<code>VITE_OPENAI_REASONING_MODEL</code>).
            </li>
            <li>
              <b>Anthropic con thinking:</b> Sonnet 3.7+, Opus 4+. <b>Haiku no razona</b>. Por eso
              el Chat usa Haiku para velocidad pero esta página usa Sonnet 4.5 vía
              <code>VITE_ANTHROPIC_REASONING_MODEL</code>.
            </li>
          </ul>

          <p>
            <b>Conexión con tu agente del día a día:</b> cuando ves "Reasoning…" en Cursor, Claude
            Code o Codex, esto es exactamente lo que está pasando. Tokens internos que vos pagás,
            invisibles en la UI pero presentes en la factura. Saber esto te ayuda a elegir cuándo
            pedirle a un modelo razonador (problema complejo, riesgo de error caro) y cuándo no
            (chat casual, generación rápida, tareas determinísticas).
          </p>

          <TryModeCTA
            href="/razonamiento"
            label="Razonamiento"
            emoji="🧠"
            hint="Compará cómo OpenAI esconde el pensamiento y Claude lo muestra entero."
          />
            </div>
          </details>
        </section>

        {/* ============== CONTROLES DEL REQUEST (transversales) ============== */}
        <section className="criollo-section" id="controles">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🎛 Controles del request — perillas que cambian todo</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            Lo que viste hasta acá son <b>modos</b>: distintas formas de armar el array{' '}
            <code>messages</code>. Esta sección es sobre las <b>perillas</b> que viajan al
            costado del array y cambian cómo el modelo responde sin tocar una sola palabra
            de tu prompt. Son dos: <b>el system prompt</b> (quién es la IA) y <b>la
            temperatura</b> (cuánto se anima a desviarse).
          </p>
          <p>
            Las dos son <b>transversales</b> a los modos de chat (Crudo, Conversación,
            Persistente) y, en el caso del system, también al Editor y al Loop Agéntico.
          </p>

          <details className="docs-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>A) 🧠 System prompt editable — la "personalidad" antes del primer hola</span>
            </summary>
            <div className="docs-collapsible-body">
              <h3>Qué es</h3>
              <p>
                El <code>system</code> es el mensaje con <code>role:"system"</code> que
                viaja como <i>primer</i> ítem del array <code>messages</code>. Lo lee el
                modelo antes que cualquier user message y define cómo va a responder a{' '}
                <b>todos</b> los turnos siguientes. No es opcional ni cosmético: cambia el
                comportamiento de raíz.
              </p>
              <div className="prov-callout">
                <p>
                  <b>Idea clave:</b> el modelo es el mismo (mismo GPT, mismo Claude). Lo
                  único que cambia entre "ChatGPT", el bot de tu banco y un asistente de
                  programación es <b>qué dice el system</b>. La inteligencia es del modelo;
                  la <b>personalidad</b> es del system.
                </p>
              </div>

              <h3>Dónde aparece en la app</h3>
              <ul>
                <li>
                  <b>Chat (<code>/</code>)</b>: editor plegable arriba del input.
                  Persiste por tab y viaja en <code>messages[0]</code> en los tres modos
                  (Crudo, Conversación, Persistente — este último lo manda como{' '}
                  <code>instructions</code> en <code>/v1/responses</code>).
                </li>
                <li>
                  <b>Editor (<code>/editor</code>)</b>: el mismo editor, con presets que
                  cambian el estilo del código generado (lunfardo, paranoico de seguridad,
                  minimalista).
                </li>
                <li>
                  <b>Loop Agéntico (<code>/loop-agentico</code>)</b>: editás el system del
                  agente para cambiar cómo decide usar las tools (más rápido, más
                  paranoico, más narrador).
                </li>
              </ul>

              <h3>Los presets — el "wow" en 1 click</h3>
              <p>
                Cada modo trae 4-5 presets para que veas el efecto sin tener que escribir
                un system desde cero. Algunos del Chat:
              </p>
              <ul>
                <li><b>🏴‍☠️ Pirata bonaerense</b> — responde en jerga pirata + lunfardo.</li>
                <li><b>📦 Devuelve solo JSON</b> — cero prosa, solo un objeto.</li>
                <li><b>🎓 Profesor sarcástico</b> — te tira un palito antes de responder bien.</li>
                <li><b>😄 Solo emojis</b> — prohibido usar letras.</li>
              </ul>

              <h3>🧪 Experimento para entender</h3>
              <ol>
                <li>Abrí el chat en modo <b>Crudo</b> (sin historial).</li>
                <li>Escribí <code>hola</code> y mandalo. Mirá la respuesta.</li>
                <li>Abrí el editor de system, elegí preset <b>🏴‍☠️ Pirata bonaerense</b>.</li>
                <li>Borrá el chat (botón "Limpiar") y mandá <code>hola</code> de nuevo.</li>
                <li>
                  La respuesta debería sonar como un pirata. <b>Es el mismo modelo, el
                  mismo "hola", la misma temperatura.</b> Lo único que cambió fue una
                  línea de texto en <code>messages[0]</code>.
                </li>
                <li>
                  Bonus: en modo Crudo el system <i>también</i> viaja (es lo único que
                  acompaña al user message). Por eso podés ver el efecto sin acumular
                  historial.
                </li>
              </ol>

              <h3>Detalles raros que vale conocer</h3>
              <ul>
                <li>
                  <b>Claude separa el system</b> del array <code>messages</code>: en{' '}
                  <code>/v1/messages</code> viaja como una key aparte (<code>system: "..."</code>),
                  no como un ítem con <code>role:"system"</code>. La app lo normaliza
                  internamente — pero si mirás el JSON crudo del request en el panel
                  derecho con provider Claude, lo vas a ver afuera del array.
                </li>
                <li>
                  <b>Si dejás el textarea vacío</b>, la app manda el system default. El
                  badge "vacío → default" en el editor te avisa.
                </li>
                <li>
                  <b>Sobreescritura no destruye historial</b>: cambiar el system en
                  Conversación reescribe <code>messages[0]</code> al instante y se aplica
                  al próximo request. El historial de turnos previos sigue ahí.
                </li>
              </ul>
            </div>
          </details>

          <details className="docs-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>B) 🌡 Temperatura — la IA no es determinista (y vos podés moverle la perilla)</span>
            </summary>
            <div className="docs-collapsible-body">
              <h3>Qué es la temperatura</h3>
              <p>
                Cada vez que el modelo genera un token, en realidad calcula una
                distribución de probabilidades sobre miles de candidatos posibles. La{' '}
                <b>temperatura</b> es cuánto le permitís alejarse del más probable:
              </p>
              <ul>
                <li><b>0</b> — siempre elige el token más probable. Casi determinístico.</li>
                <li><b>0.7</b> — el default. Equilibrio entre coherencia y variedad.</li>
                <li><b>1.0</b> — se anima a tokens menos probables. Más creativo.</li>
                <li><b>2.0</b> — caótico. Suele romper la gramática.</li>
              </ul>
              <div className="prov-callout">
                <p>
                  <b>Idea clave:</b> con temperatura &gt; 0, el <b>mismo prompt produce
                  respuestas distintas cada vez</b>. No es un bug. Es así por diseño. La
                  IA <i>no</i> es una función pura.
                </p>
              </div>

              <h3>🧪 Experimento para entender</h3>
              <p>
                Usá el modo <b>Crudo</b> para esto (cada envío arranca limpio, sin
                acumular el chat) y limpiá entre prueba y prueba con el botón "Limpiar".
              </p>
              <ol>
                <li>Slider de temperatura a <b>0</b>.</li>
                <li>
                  Escribí <code>Inventá un nombre creativo para una banda de rock</code> y
                  mandalo. Anotá la respuesta.
                </li>
                <li>
                  Limpiá el chat y mandá <b>el mismo prompt</b> dos o tres veces más. Con
                  temperatura 0 deberían salir respuestas <b>casi idénticas</b>: la IA
                  siempre elige lo más probable.
                </li>
                <li>Subí el slider a <b>1.5</b> y repetí la prueba.</li>
                <li>
                  Ahora cada envío debería dar una respuesta muy distinta. Algunas
                  incluso medio delirantes. <b>Cambió la perilla, no el prompt.</b>
                </li>
                <li>
                  Subí a <b>2.0</b> y mandá de nuevo. Vas a ver respuestas que rompen
                  gramática o se van por ramas raras. Por eso 0.7 es default: el sweet
                  spot.
                </li>
              </ol>

              <h3>Detalles que vale conocer</h3>
              <ul>
                <li>
                  <b>Claude clampa a 0–1.</b> Si el slider está en 1.5 con provider
                  Claude, la app avisa con un hint amarillo y manda 1.0 al request. Es una
                  limitación del wrapper de Anthropic, no nuestra.
                </li>
                <li>
                  <b>OpenAI y LM Studio aceptan hasta 2.</b> Aprovechalos para ver el
                  caos en su máximo esplendor.
                </li>
                <li>
                  <b>Temperatura ≠ creatividad.</b> Temperatura es <i>variabilidad</i>.
                  Para tareas con una respuesta correcta (código, JSON, hechos) querés
                  bajita (0–0.3). Para brainstorming o ficción, alta (0.9–1.3).
                </li>
                <li>
                  <b>El parámetro viaja en el request.</b> Si abrís el panel "Request →
                  API (crudo)" después de mandar, vas a ver <code>"temperature": 1.5</code>{' '}
                  en el body. Con Ollama va anidado adentro de <code>options</code>.
                </li>
              </ul>

              <h3>Combinarlas: system + temperatura</h3>
              <p>
                Las dos perillas se multiplican. Un system <b>"Pirata bonaerense"</b> con
                temp <b>0</b> te da siempre la misma respuesta pirata. Con temp <b>1.5</b>,
                cada envío te da una respuesta pirata <i>distinta</i>, pero todas en
                personaje. El system define <i>quién</i> responde; la temperatura,
                <i>cuánto se anima</i> a variar dentro de ese personaje.
              </p>
            </div>
          </details>
            </div>
          </details>
        </section>

        {/* ============== ESTA APP vs AGENTES PRODUCTIVOS ============== */}
        <section className="criollo-section" id="vs-agentes">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🛠️ Esta app vs. Claude Code / Cursor / Codex</span>
            </summary>
            <div className="docs-collapsible-body">
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
              Sirve para <b>entender</b> — y también como <b>punto de partida para codear tu propia
              integración</b> contra la API (los wrappers en <code>src/openai.js</code>,{' '}
              <code>src/anthropic.js</code>, <code>src/ollama.js</code>, <code>src/lmstudio.js</code>{' '}
              son ejemplos mínimos y reusables).
            </li>
            <li>
              <b>Claude Code, Cursor, Codex / Copilot</b> — agentes productivos construidos{' '}
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
            <li>
              <b>🧑‍💻 Si vas a codear contra una API de IA, arrancá acá.</b> Los wrappers de esta app
              son el "hello world" de cada proveedor: armar el body, mandar el <code>fetch</code>,
              parsear la respuesta, manejar errores, exponer logs. Forkeás, le sacás la UI y te queda
              el cliente HTTP mínimo para meter en tu propio bot, script, backend o integración.
              No necesitás SDK: la API es JSON sobre HTTP y acá lo ves sin capas.
            </li>
          </ul>

          <div className="prov-callout">
            <p>
              <b>Modelo mental para usuarios de agentes:</b> tu Cursor / Claude Code / Codex es
              <i> esta app con muchas más tools y una UX prolija arriba</i>. Si entendés qué pasa
              en el panel derecho del Loop Agéntico, entendés qué está haciendo tu agente cuando
              "piensa". Si entendés por qué el array <code>messages[]</code> crece, entendés por
              qué tu sesión larga cuesta más y responde peor.
            </p>
            <p>
              <b>Y para quien quiere codear contra la API:</b> los cuatro wrappers de{' '}
              <code>src/</code> son tu plantilla. Mismo <code>fetch</code>, mismo body, mismo
              parseo — sin SDK, sin magia. Copiás, adaptás y ya tenés tu propia integración
              hablando con OpenAI, Anthropic, Ollama o LM Studio. <b>Ese es el doble objetivo
              de la app: entender lo que ya usás, y poder construir lo tuyo.</b>
            </p>
          </div>
            </div>
          </details>
        </section>

        {/* ============== APENDICE ============== */}
        <section className="criollo-section" id="glosario">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>📖 Glosario rápido</span>
            </summary>
            <div className="docs-collapsible-body">
          <ul>
            <li><b>Token</b> — la unidad mínima de texto que procesa el modelo. Un token ≈ 4 caracteres en español. Se cobra por token.</li>
            <li><b>Stateless</b> — sin memoria entre requests. Cada llamada es independiente; el "recuerdo" lo armás vos mandando el historial.</li>
            <li><b>System prompt</b> — instrucciones globales que le das a la IA (su "personalidad" o reglas). Va al principio del array <code>messages</code> con <code>role: "system"</code> (o aparte en el caso de Claude).</li>
            <li><b>Tool use / function calling</b> — feature de la API que permite declarar funciones que la IA puede pedir. Ella no las ejecuta, solo las pide.</li>
            <li><b>Loop agéntico</b> — el ciclo de pedir tool → ejecutar → devolver resultado → repetir, hasta que la IA termina.</li>
            <li><b>stop_reason / finish_reason</b> — por qué el modelo paró. <code>"end_turn"</code>/<code>"stop"</code> = terminó normal; <code>"tool_use"</code>/<code>"tool_calls"</code> = pidió una herramienta; <code>"max_tokens"</code> = se cortó.</li>
          </ul>
            </div>
          </details>
        </section>

        </div>
  )
}

export function DocsBodyEn() {
  return (
    <div className="docs-main">

      {/* ============== ALL AI IS AN API ============== */}
      <section className="criollo-section" id="api-es-todo">
        <details className="docs-collapsible docs-section-collapsible" open>
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>🌐 Let's start with what matters: all AI goes through an API</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <b>Every human↔AI interaction goes through an API.</b> ChatGPT, Claude.ai, Copilot,
          Cursor, your bank's chat — they're UIs that under the hood hit HTTP against the same
          endpoint you'll use in this course. The only difference is layers: those
          products hide the JSON, give you nice markdown and manage the session for
          you. <b>Here you see it raw.</b>
        </p>
        <div className="prov-callout">
          <p>
            <b>If you understand this POST, you understand how any AI product on the
            market works inside.</b> The intelligence is in the model; the product is <b>how
            you build the JSON</b> and <b>how you present the response</b>. The only thing that changes between
            ChatGPT and Cursor and your bank's bot is <i>what</i> they put in <code>messages[]</code>{' '}
            and <i>what tools</i> they declare.
          </p>
        </div>
        <p>
          <b>That's the purpose of this app, across its five stages.</b> Each mode peels
          one more layer off the commercial product so you see the POST underneath:
        </p>
        <ol>
          <li>
            <b>💬 Chat</b> — the same as ChatGPT, but it shows you the <code>messages[]</code> array{' '}
            that travels each turn. There you see the conversation's "memory" hands-on.
          </li>
          <li>
            <b>💻 Editor</b> — what any single-turn code assistant does
            (inline Copilot, VS Code's "Edit with AI"). You paste code + instruction, it
            returns code. No magic.
          </li>
          <li>
            <b>🤖 Agentic Loop</b> — what Cursor, Claude Code, Copilot Agent do: declare
            tools, let the AI request them, run them, return the result, repeat.
            Here you see every loop iteration.
          </li>
          <li>
            <b>📋 Agent + rules</b> — the <code>AGENTS.md</code> / <code>CLAUDE.md</code>
            / <code>.cursorrules</code> trick: a text file that's concatenated onto the system prompt
            on every request. Here you see it inject itself live.
          </li>
          <li>
            <b>📋 Agent + 🧪 skills</b> — the same agent with <code>AGENTS.md</code>, but you
            add two tools: <code>load_skill</code> (loads a skill on demand into context) and{' '}
            <code>run_skill_test</code> (runs a deterministic test to validate). It's the
            Claude Code skills / loadable Cursor rules pattern: the AI decides when it needs the
            detail, you don't push it all up front.
          </li>
        </ol>
        <p>
          What follows below (AI is newborn, context, tools, AGENTS.md) are
          <b> consequences</b> of this first idea.
        </p>
          </div>
        </details>
      </section>

      {/* ============== AI IS NEWBORN ============== */}
      <section className="criollo-section" id="recien-nacida">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>🧠 The concept that ties it all together: the AI is "newborn" on every request</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          If you take away <b>one single idea</b> from this whole app, make it this. It's what's
          hardest to internalize and what explains 80% of the things that seem weird.
        </p>

        <div className="prov-callout">
          <p>
            <b>Each request to the AI is a newborn AI.</b> It has no memory of the
            previous request. It doesn't know you talked to it 5 seconds ago. It doesn't know
            you're you. The only thing it knows is <b>what's in the body of this request's
            POST</b>. When it answers, it forgets everything and leaves.
          </p>
        </div>

        <p>
          Each <code>POST /v1/messages</code> spins up an instance of the model, reads your JSON
          (<code>system</code> + <code>messages</code> + <code>tools</code>), generates the
          response and <b>ends</b>. There's no session, no <code>userId</code> with state,
          no mental cache. The next request is <b>another instance</b> reading another
          JSON, with nothing in common except what <b>you</b> put in <code>messages</code>.
        </p>
        <p>
          This is <b>by design</b>: any server can serve any request
          (scalability), the output depends only on the input (determinism), there's nothing to
          clean up afterward (privacy), and your code has <b>all</b> the truth (no
          hidden state).
        </p>

        <div className="prov-callout">
          <p>
            <b>Mental model to keep:</b> the AI is a <b>pure function</b> — same
            input, same output distribution. <b>You</b> hold the state, persist it,
            edit it, send it. The AI is <i>a brain rented for 200
            milliseconds</i>: during that time a GPU runs inference with your prompt,
            then moves on to serve someone else. Everything the AI "knows" about you is in the JSON
            you sent. Period.
          </p>
        </div>
        <p>
          That's why <a href="/contexto" target="_blank" rel="noreferrer"><b>/contexto</b></a> is
          such an important page in this app: it shows you <b>literally</b> everything
          the AI will know on the chat's next request. <b>There's nothing more.</b>
        </p>

        <details className="docs-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>The exception: OpenAI's <code>/v1/responses</code></span>
          </summary>
          <div className="docs-collapsible-body">
            <p>
              The only thing that breaks this in this app is the chat's "persistent" mode. OpenAI
              added an alternative API where <b>they do store the history</b> on the
              server side. You only send the last message + a <code>conversation_id</code>.
            </p>
            <p>
              But careful: that's <b>syntactic sugar</b>. Underneath, OpenAI does the same — it takes
              your new message, concatenates it with the history they've stored, and builds a
              full prompt internally. <b>The AI is still "newborn" on every inference.</b>{' '}
              The only difference is <i>where</i> the <code>messages</code> array lives: in your
              client (classic) or on OpenAI's server (persistent).
            </p>
            <p>
              <b>Anthropic has no equivalent.</b> That's why Claude is always 100% client
              side — the "amnesia" is total and absolute on every request.
            </p>
          </div>
        </details>

        <details className="docs-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>Practical implications (5)</span>
          </summary>
          <div className="docs-collapsible-body">
            <h4>1) Why long chats cost more each turn</h4>
            <p>
              Each turn you send <b>all</b> the history again. If the conversation has 50
              messages, request 51 sends the previous 50 + the new one. You pay for all the
              input tokens every time. That's why features like <b>prompt caching</b>
              appear (Anthropic discounts repeated tokens if it detects them) and <b>compaction</b>
              (summarizing old parts).
            </p>

            <h4>2) Why you can "delete" history by editing the array</h4>
            <p>
              If you want the AI to "forget" something it said, you can simply <b>remove that turn
              from the</b> <code>messages</code> array before sending the next request. The AI won't
              complain — it has no way to notice. For it, the conversation <b>is</b>{' '}
              what you send it.
            </p>

            <h4>3) Why you can lie to it about what it said</h4>
            <p>
              Analogous to the above: you could edit a <code>role: "assistant"</code> message{' '}
              in the array and put anything. The AI will take that as "what it said in the
              previous turn" and continue from there. It's a known technique called <b>assistant
              prefilling</b>.
            </p>

            <h4>4) Why there's no way to "train" the AI with your conversation</h4>
            <p>
              The AI doesn't learn from your chats. There's no model "of yours" that gets personalized.
              Each request: a newborn instance, the same model as any other user on the
              planet. If you want it to "learn" your preferences, you put them in the system prompt
              or in the history — but that's loaded by <b>you</b>, every time.
            </p>

            <h4>5) Why the Agentic Loop works</h4>
            <p>
              Precisely because the AI is newborn, you can <b>fabricate</b> a conversational
              history that includes tool calls it "made" and tool results your code
              generated. The AI, on receiving that history, takes it as its own and continues from there.
              This is <i>literally</i> what you see in the "Request/Response History" panel
              of the Agentic Loop.
            </p>
          </div>
        </details>
          </div>
        </details>
      </section>

      {/* ============== INTRO ============== */}
      <section className="criollo-section" id="de-que-se-trata">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>🧪 What this app is about</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          It's a lab to <b>see what really happens</b> when you talk to an AI.
          It's not a polished chat — the idea is to expose everything: the JSON sent, the JSON
          that comes back, the tokens spent, the context that accumulates, the tools
          the AI can call.
        </p>
        <p>
          There are <b>five modes</b>, each teaches a different concept:
        </p>
        <ol>
          <li><b>💬 Chat</b> — how an LLM conversation works and what "context" is.</li>
          <li><b>💻 Editor</b> — how you ask an AI to modify code (a single turn).</li>
          <li><b>🤖 Agentic Loop</b> — how the AI can use <i>tools</i> and chain actions.</li>
          <li><b>📋 Agent + rules</b> — how to "teach" the AI your project's conventions via <code>AGENTS.md</code>.</li>
          <li><b>📋 Agent + 🧪 skills</b> — how the AI loads "skills" on demand (<code>load_skill</code> + <code>run_skill_test</code>) instead of loading everything up front.</li>
        </ol>
        <div className="prov-callout">
          <p>
            💡 <b>Teaching tip:</b> open any mode and always look at the panel on the
            <b> right</b>. That's the "raw truth" — the real JSON traveling over HTTP.
            Everything pretty on the left is just presentation.
          </p>
        </div>
          </div>
        </details>
      </section>

      {/* ============== CHAT ============== */}
      <section className="criollo-section" id="modo-chat">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>1) 💬 Chat — the classic mode</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <a href="/chat" target="_blank" rel="noreferrer"><code>http://localhost:5173/chat</code></a>
        </p>
        <h3>What it does</h3>
        <p>
          A good old conversation with the AI. You type, it responds, you type
          again, it responds again. The difference with regular ChatGPT/Claude.ai is that here
          you can see <b>everything the app sends the model</b>.
        </p>

        <h3>The concept it teaches: <i>context</i></h3>
        <p>
          LLM APIs are <b>stateless</b> (no memory). Every time you send a message,
          your browser sends the model <b>the whole conversation again</b> — not because it's
          slow, but because <b>the model remembers nothing</b> between requests. The "memory"
          is the <code>messages[]</code> array you send it each time.
        </p>
        <p>
          That's why if the conversation gets long, you spend more and more tokens: because each
          request sends <b>the whole history</b>, not just your last question.
        </p>

        <h3>Chat modes</h3>
        <ul>
          <li>
            <b>OpenAI classic</b> — uses <code>/v1/chat/completions</code>. Each request sends
            system + full history + your new message.
          </li>
          <li>
            <b>OpenAI persistent</b> — uses <code>/v1/responses</code> + <code>/v1/conversations</code>.
            OpenAI stores the history on its servers; you only send the last message
            + a <code>conversation_id</code>. <i>Exception</i> to the stateless rule above.
          </li>
          <li>
            <b>Anthropic (Claude)</b> — uses <code>/v1/messages</code>. Always stateless,
            you always send everything. Claude has no persistent API.
          </li>
          <li>
            <b>"Raw" mode</b> — sends the <code>system</code> + your last message, with no
            prior history. Useful to see how the AI responds when it doesn't accumulate the
            conversation, while you still control its "personality" from the system.
          </li>
        </ul>
        <p>
          Want to see the difference between the three modes <b>without spending API</b>?{' '}
          Open <a href="/demo/chat" target="_blank" rel="noreferrer">/demo/chat</a> —
          an animated comparator of raw vs conversation vs persistent, side by side.
        </p>

        <h3>What to watch</h3>
        <ul>
          <li><b>Middle panel (Request → API):</b> the JSON going out. Notice how <code>messages[]</code> grows with each turn.</li>
          <li><b>Middle panel (Response ← API):</b> what comes back, including <code>usage</code> with the tokens consumed.</li>
          <li><b>Right panel (Log):</b> timestamps, latency, tokens, errors.</li>
          <li><b>Auxiliary pages:</b> <a href="/contexto" target="_blank" rel="noreferrer">/contexto</a> (live view of the <code>messages</code> array) and <a href="/proveedores" target="_blank" rel="noreferrer">/proveedores</a> (OpenAI vs Anthropic comparison).</li>
        </ul>

        <TryModeCTA
          href="/chat"
          label="Chat"
          emoji="💬"
          hint="Try the three context modes (Raw / Conversation / Persistent) and watch how the JSON going out changes."
        />
        <TryModeCTA
          href="/demo/chat"
          label="Chat Demo"
          emoji="🎞️"
          hint="Compare raw, conversation and persistent without spending API."
        />
          </div>
        </details>
      </section>

      {/* ============== EDITOR ============== */}
      <section className="criollo-section" id="modo-editor">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>2) 💻 Editor — AI modifies code (one turn)</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <a href="/editor" target="_blank" rel="noreferrer"><code>http://localhost:5173/editor</code></a>
        </p>
        <h3>What it does</h3>
        <p>
          A code editor (Monaco — the same as VS Code) + a box to ask the AI something
          <i> about that code</i>. You send it the code + the instruction, it returns
          modified code, you apply it manually with a button.
        </p>

        <h3>The concept it teaches: <i>code is context</i></h3>
        <p>
          The AI <b>has no "access" to your file</b> — you paste the code into the prompt,
          and it returns text. The editor is just presentation: what matters is that
          the code travels as a string inside the <code>messages[].content</code> field.
        </p>
        <p>
          This means <b>everything</b> in the code is context: variable
          names, comments, whitespace. If the AI "guesses" something seemingly without
          information, check whether the clue wasn't hidden in the code.
        </p>

        <h3>Editor modes</h3>
        <ul>
          <li>
            <b>No context</b> — each instruction is independent. The system prompt + your
            code + your instruction. The AI doesn't remember what happened before.
          </li>
          <li>
            <b>With context</b> — you keep a history of previous instructions/responses.
            Ideal for chaining steps where the second depends on the first (e.g. "add a
            class" → "instantiate <i>that</i> class"). Without context, the "that" isn't understood.
          </li>
        </ul>
        <p>
          Want to see the difference between the two modes <b>without spending API</b>?{' '}
          Open <a href="/demo/editor" target="_blank" rel="noreferrer">/demo/editor</a> —
          an animated comparator of no-context vs with-context, side by side, over the same
          session of 3 edits.
        </p>

        <h3>Why it's only "one turn"</h3>
        <p>
          You send → receive → apply (or not) → end. The AI <b>cannot</b> see your
          code again after responding, nor make two changes in a single operation. If you want
          another change, you send another instruction. That limitation is what the Agentic Loop breaks.
        </p>

        <h3>What to watch</h3>
        <ul>
          <li><b>Middle panel:</b> try the 3 suggested steps in order, first <i>With context</i> and then <i>No context</i> — you'll see how the result changes.</li>
          <li><b>Right panel:</b> the <code>messages[]</code> array that was sent. <b>All</b> of that text is what the AI used to answer you.</li>
          <li><b>"Apply to editor" button:</b> replaces the current code with the <code>```...```</code> block that came in the response. If you don't apply, the response is discarded.</li>
        </ul>

        <TryModeCTA
          href="/editor"
          label="Editor"
          emoji="💻"
          hint="Paste code, ask for a change, compare it with/without context."
        />
        <TryModeCTA
          href="/demo/loop"
          label="Loop Demo"
          emoji="✂️"
          hint="Watch step by step what happens when the AI requests an edit."
        />
          </div>
        </details>
      </section>

      {/* ============== AGENTIC LOOP ============== */}
      <section className="criollo-section" id="modo-loop">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>3) 🤖 Agentic Loop — AI with tools (loop)</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <a href="/loop-agentico" target="_blank" rel="noreferrer"><code>http://localhost:5173/loop-agentico</code></a>
        </p>
        <h3>What it does</h3>
        <p>
          The same as the Editor on the outside, with a VS Code-like editing area and a prompt, but inside <b>everything changes</b>.
          Instead of asking the AI to return code, we give it <b>tools</b> it
          can call — <code>read_code</code> (read the file) and <code>edit_code</code>
          (replace a fragment) — and let it work in a loop.
        </p>

        <h3>The concept it teaches: <i>tool use</i> (function calling)</h3>
        <p>
          Modern LLM APIs let you declare tools on each request. The AI
          doesn't run them — it <b>requests</b> them, and your code runs them and returns the
          result. That back-and-forth repeats until the AI says "done".
        </p>
        <div className="prov-callout">
          <p>
            <b>Mental model:</b> the AI is a brain without hands. It requests actions; your code
            is the hands that run them and report the result. <b>A single human prompt
            = N internal requests</b> (sometimes 2, sometimes 6, depends).
          </p>
        </div>

        <h3>The loop, step by step</h3>
        <ol>
          <li>You send an instruction (e.g. "rename saldo to balance").</li>
          <li>The browser builds a <code>POST /v1/messages</code> with the instruction + the list of tools.</li>
          <li>The AI responds with <code>stop_reason: "tool_use"</code> and a block requesting <code>edit_code(old="saldo", new="balance")</code>.</li>
          <li>The browser runs that tool locally over the code string, returns <code>"OK: replaced"</code>.</li>
          <li>The browser builds a <b>new</b> request — the <code>messages</code> array now includes the AI's request + the result your code generated.</li>
          <li>The AI sees the result and either requests <i>another</i> tool (e.g. now <code>getSaldo</code> → <code>getBalance</code>) or says "done, finished" with a final text.</li>
          <li>The loop ends when <code>stop_reason !== "tool_use"</code>.</li>
        </ol>

        <p>
          Want to understand the mechanism <b>without spending API</b> and without diving
          into the raw JSON yet?{' '}
          Open <a href="/demo/loop" target="_blank" rel="noreferrer">/demo/loop</a> —
          a guided animation of a single run (8 steps) that destroys the idea
          that "the AI edits your code". <b>The AI requests edits; your code makes them.</b>
        </p>

        <h3>Quick comparison with the plain Editor</h3>
        <div className="prov-table-wrap">
          <table className="prov-table">
            <thead>
              <tr>
                <th>Aspect</th>
                <th className="prov-col-openai">💻 Editor</th>
                <th className="prov-col-claude">🤖 Agentic Loop</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Requests per human prompt</td>
                <td>1</td>
                <td>N (loop)</td>
              </tr>
              <tr>
                <td>Who applies the changes</td>
                <td>You ("Apply" button)</td>
                <td>The loop, automatically</td>
              </tr>
              <tr>
                <td>Response type</td>
                <td><code>```code```</code> block</td>
                <td><code>tool_use</code> blocks</td>
              </tr>
              <tr>
                <td>The AI can see the result of its action</td>
                <td>❌ No</td>
                <td>✅ Yes (via <code>tool_result</code>)</td>
              </tr>
              <tr>
                <td>Complex changes in a single prompt</td>
                <td>❌ Hard</td>
                <td>✅ Natural</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>What to watch</h3>
        <ul>
          <li><b>Editor (left panel):</b> the code modifies itself, live, every time the AI calls <code>edit_code</code>. That's <i>your</i> code running the tool.</li>
          <li><b>Timeline (middle panel):</b> each loop iteration with its <code>tool_use</code> (blue) and <code>tool_result</code> (green). At the end, the text the AI gives as the answer.</li>
          <li><b>History (right panel):</b> ⭐ <b>the teaching gem</b>. Each iteration stacked and expandable. Comparing #1 vs #2 you see <i>literally</i> how the <code>messages</code> array grew with the assistant's <code>tool_use</code> + the <code>tool_result</code> your code returned.</li>
          <li><b>Provider selector:</b> try the same instruction with OpenAI and with Claude — the JSON shape is completely different (<code>tools.input_schema</code> vs <code>tools.function.parameters</code>, <code>tool_use</code> vs <code>tool_calls</code> with stringified <code>arguments</code>), but the concept is identical.</li>
        </ul>

        <h3>This is what Cursor, Claude Code, Copilot Agent, Aider… do</h3>
        <p>
          All modern "code agents" work like this. The difference with this app
          is that they expose many more tools (<code>read_file</code>, <code>write_file</code>,
          <code>run_command</code>, <code>search</code>, <code>grep</code>…) and work over the
          real file system, not over a string in memory. The underlying idea is the same:
          <b> declare tools, let the AI request them, run them locally, return
          the result, repeat.</b>
        </p>

        <TryModeCTA
          href="/loop-agentico"
          label="Agentic Loop"
          emoji="🤖"
          hint="Give it an instruction and watch the tool_use → tool_result cycle live."
        />
        <TryModeCTA
          href="/demo/loop"
          label="Loop Demo"
          emoji="✂️"
          hint="Watch a guided run of an edit requested via tools."
        />
          </div>
        </details>
      </section>

      {/* ============== AGENTS.MD ============== */}
      <section className="criollo-section" id="modo-agentsmd">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>4) 📋 AGENTS.md — persistent instructions for the agent</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <a href="/agents-md" target="_blank" rel="noreferrer"><code>http://localhost:5173/agents-md</code></a>
        </p>
        <h3>What it does</h3>
        <p>
          It's the Agentic Loop, but with an extra column: an editor for an
          <code> AGENTS.md</code> file. What you write there is injected into the <code>system</code>{' '}
          prompt of the agent <b>on every request</b> of the loop. And there's a
          <b> "Compare with/without"</b> button that runs the same instruction twice — one with the
          AGENTS.md enabled, one ignoring it — and shows the two results side by side.
        </p>

        <h3>The concept it teaches: <i>how you teach conventions to a newborn AI</i></h3>
        <p>
          This closes the circle of the whole app. If the AI is <b>newborn on every request</b>
          (the 🧠 section above), <b>how do you make it respect your conventions?</b>
          How do you tell it that <i>in this project</i> private fields take a <code>_</code>,
          that logging goes through <code>log.info()</code>, that public methods are verbs
          in the infinitive in Spanish?
        </p>
        <div className="prov-callout">
          <p>
            <b>Answer:</b> you teach it nothing. You send it those rules, <b>over and over,
            on every request</b>, inside the system prompt. AGENTS.md is <b>the dumbest
            trick that works</b>: a text file your client concatenates onto the system
            on every API call. The AI does <b>not</b> "load your project". You paste it a
            welcome manual every turn, and it acts as if it "knew" your project.
          </p>
        </div>

        <h3>Why it matters (and why the demo is a comparison)</h3>
        <p>
          Without AGENTS.md, the AI uses <i>generic</i> conventions (standard Java, standard
          Spring, standard REST). With AGENTS.md it respects <i>your</i> conventions.
          The difference is brutal and only makes sense seeing it live. That's why the demo is:
        </p>
        <ol>
          <li>Same human prompt: <i>"Add a transferir(destino, monto) method"</i>.</li>
          <li>Same initial code.</li>
          <li>Same model, same temperature, same implicit seed.</li>
          <li>The <b>only</b> variable that changes: whether the AGENTS.md goes in the system or not.</li>
        </ol>
        <p>
          The "Compare with/without" button does exactly that: two independent runs,
          same conditions except the AGENTS.md, two final codes side by side. You'll
          see how the "WITH" version uses the <code>_</code> prefix on private fields,
          validates inputs, throws <code>IllegalArgumentException</code>, logs with
          <code> log.info</code> — and the "WITHOUT" version does the same as any AI with
          any Java code on the internet.
        </p>

        <h3>This is what Cursor, Claude Code, Aider, Continue… do</h3>
        <p>
          They all have their version: <code>AGENTS.md</code> (OpenAI's standard),
          <code> CLAUDE.md</code> (Anthropic / Claude Code), <code>.cursorrules</code> (Cursor),
          <code> .aider.conf</code>. <b>Same concept.</b> A text file that the client
          adds to the system prompt on every call. Some search hierarchically (one per
          folder), others have templates, but the underlying trick is always the same:
          <i> send the project's conventions on every request</i>.
        </p>
        <p>
          In this very repo, look at <a href="https://github.com/anthropics/claude-code/blob/main/CLAUDE.md" target="_blank" rel="noreferrer">any open source project's CLAUDE.md</a>:
          they're files that describe commands, conventions, architecture, gotchas. That
          description is "explained" to the AI <b>every time</b> it's invoked.
        </p>

        <h3>What to watch in the mode</h3>
        <ul>
          <li><b>"included / ignored" toggle</b> above the AGENTS.md editor — disable it to do a run without it, compare it manually with an enabled one.</li>
          <li><b>"🔬 Compare with/without" button:</b> the heart of the demo. Same instruction, two results.</li>
          <li><b>Right panel (Request/Response History):</b> open any request and look at the <code>system</code> field — when the toggle is ON, you see the whole AGENTS.md injected there. <b>Every</b> request carries it.</li>
          <li><b>Cost:</b> large AGENTS.md make <b>every</b> request spend more tokens (because it goes in full every time). That's why being concise pays off. Anthropic's prompt caching discounts 90% if it detects them repeated — but they're still tokens.</li>
        </ul>

        <TryModeCTA
          href="/agents-md"
          label="Agent + rules"
          emoji="📋"
          hint="Edit the AGENTS.md and watch how the agent's responses change."
        />
          </div>
        </details>
      </section>

      <section className="criollo-section">
        <TryModeCTA
          href="/demo/agents-md"
          label="AGENTS.md Demo"
          emoji="A"
          hint="Same task, same agent: compare what changes when AGENTS.md travels in the system."
        />
      </section>

      {/* ============== AGENTS.MD + SKILLS ============== */}
      <section className="criollo-section" id="modo-skills">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>5) 📋 Agent + 🧪 skills — load rules on demand</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <a href="/agents-md-skills" target="_blank" rel="noreferrer"><code>http://localhost:5173/agents-md-skills</code></a>
        </p>
        <h3>What it does</h3>
        <p>
          It's the same agent as mode 4 (with AGENTS.md injected into the system), but it
          adds <b>two new tools</b>: <code>load_skill</code> (loads a skill's body
          on demand into context) and <code>run_skill_test</code> (runs a deterministic test
          associated with that skill to validate what it did). The AGENTS.md now does <b>not</b> contain
          the detailed rules — it contains an <i>index</i> of available skills with their
          short description, and the AI decides when it needs to load the detail.
        </p>

        <h3>The concept it teaches: <i>context on demand</i></h3>
        <p>
          If AGENTS.md (section 4) is "send <b>all</b> the rules on every request", skills
          is "send an <b>index</b> of rules and let the AI request only the ones it needs".
          It's the same idea as discoverable REST APIs: instead of sending the whole manual
          every time, you send the catalog and a mechanism to go fetch the detail.
        </p>
        <div className="prov-callout">
          <p>
            <b>Why it matters:</b> large AGENTS.md (hundreds of lines with rules for
            style, security, domain, deploy…) make <b>every</b> request load all of
            that, even if the task is trivial. With skills, the system puts only the (small)
            index in the system, and each skill's body travels only when the AI
            decides it needs it.
          </p>
        </div>

        <h3>The loop, step by step</h3>
        <ol>
          <li>The system starts with AGENTS.md <b>+ an index</b> of available skills (e.g. <code>commit-message</code>, <code>jdoc-style</code>, <code>null-checks</code>) with a one-line description each.</li>
          <li>You send an instruction (e.g. "add a method that transfers a balance").</li>
          <li>The AI looks at the index, decides it needs the <code>null-checks</code> skill to validate inputs, and requests <code>load_skill(id="null-checks")</code>.</li>
          <li>Your code returns that skill's body as a <code>tool_result</code>. <b>Now</b> those rules live in the context.</li>
          <li>The AI edits the code applying the rules, and optionally calls <code>run_skill_test(id="null-checks")</code> to verify its change respects the skill.</li>
          <li>The deterministic test (defined in <code>src/skill-tests.js</code>, indexed by skill id) runs over the resulting code and returns <code>pass</code> / <code>fail</code> with detail.</li>
          <li>If it fails, the AI iterates. If it passes, it finishes.</li>
        </ol>

        <h3>Comparison with mode 4 (AGENTS.md alone)</h3>
        <div className="prov-table-wrap">
          <table className="prov-table">
            <thead>
              <tr>
                <th>Aspect</th>
                <th className="prov-col-openai">📋 AGENTS.md alone</th>
                <th className="prov-col-claude">📋 AGENTS.md + 🧪 skills</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>What travels in the system</td>
                <td>All the rules, complete</td>
                <td>Index + short descriptions</td>
              </tr>
              <tr>
                <td>When the detail is loaded</td>
                <td>Always, on every request</td>
                <td>Only if the AI requests it</td>
              </tr>
              <tr>
                <td>Fixed tokens per turn</td>
                <td>High (grow with the AGENTS.md)</td>
                <td>Low (index only)</td>
              </tr>
              <tr>
                <td>Result validation</td>
                <td>Human eye</td>
                <td>Deterministic <code>run_skill_test</code></td>
              </tr>
              <tr>
                <td>"Which rule to apply" decision</td>
                <td>The AI filters from the whole block</td>
                <td>The AI picks from the index before loading</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>What to watch in the mode</h3>
        <ul>
          <li><b>Skills panel (left):</b> the editable index. Each skill has an id, short description and body. What travels in the system is only the top part — the body travels only when the AI calls <code>load_skill</code>.</li>
          <li><b>Request/Response History (right):</b> ⭐ watch how on the <b>first</b> request the system is small (index only). After a <code>load_skill</code>, the <code>messages</code> array includes the full body as a <code>tool_result</code> — but the system <i>stays small</i>. <b>That's the key difference.</b></li>
          <li><b><code>run_skill_test</code>:</b> after editing, the AI often decides to validate itself. You'll see calls to the tool with its <code>pass</code>/<code>fail</code>. If it fails, it usually retries.</li>
          <li><b>This is what Claude Code does:</b> Claude Code's Skills system is <i>literally</i> this — an index of available skills in the system, and the tool to load the detail when needed. Loadable Cursor rules follow the same pattern.</li>
        </ul>

        <TryModeCTA
          href="/agents-md-skills"
          label="Agent + skills"
          emoji="🧪"
          hint="Watch how the AI requests load_skill and the system stays small."
        />
          </div>
        </details>
      </section>

      {/* ============== CONTEXT WINDOW ============== */}
      <section className="criollo-section" id="modo-ventana">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>6) 🪟 Context window — watch memory break live</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <a href="/ventana-contexto" target="_blank" rel="noreferrer"><code>http://localhost:5173/ventana-contexto</code></a>
        </p>
        <h3>What it does</h3>
        <p>
          A plain chat, but with an <b>artificial token limit</b> (default: 300) that you
          control with a slider. When the conversation goes over the limit, the app <b>prunes</b>{' '}
          messages before sending — and the "Memory" panel shows you <i>literally</i> what was
          deleted and what travels.
        </p>

        <h3>The concept it teaches: <i>how a long chat's memory breaks</i></h3>
        <p>
          If the AI is newborn on every request (🧠 section) and you send it the whole history
          (💬 section), then there's a moment when <b>it no longer fits</b>: the model's context
          window is finite. Cursor handles it for you, ChatGPT handles it for you.
          Here <b>you</b> handle it with three classic strategies, and you see the difference live.
        </p>

        <h3>The three strategies</h3>
        <ul>
          <li>
            <b>FIFO</b> — when you go over, it removes the oldest messages one by one until
            it fits. Brutal: it cuts mid-turn if needed. The AI "forgets" abruptly.
          </li>
          <li>
            <b>Sliding window</b> — keeps the last N turns (configurable slider). It's what
            many production chats do to have predictable spend. It forgets too, but
            in a more structured way.
          </li>
          <li>
            <b>Compaction</b> — the coolest trick: when you go over, the app asks the model
            for a <b>summary</b> of the old turns and replaces them with a single message
            "<code>[RESUMEN PREVIO]: ...</code>". Cost: an extra AI request each time it
            compacts. Benefit: semantic continuity is maintained even if the conversation
            is long. This is <b>literally</b> what Claude Code's <code>/compact</code> command{' '}
            does.
          </li>
        </ul>

        <div className="prov-callout">
          <p>
            <b>Most important:</b> the system prompt (<code>messages[0]</code>) is <b>never</b>
            pruned. It's a design invariant. If it were the other way around, you'd lose the bot's
            "personality" as soon as the window filled up — and that would be catastrophic.
          </p>
        </div>

        <h3>🧪 Suggested experiment</h3>
        <ol>
          <li>Leave the limit at <b>300 tokens</b> and the strategy at <b>FIFO</b>.</li>
          <li>
            Start the chat by introducing yourself: "Hi, my name is <i>[your name]</i> and I work in{' '}
            <i>[whatever]</i>".
          </li>
          <li>
            Chat 4-5 turns about anything (ask it to recommend books, to
            explain something, etc.).
          </li>
          <li>
            At some point on turn 5 or 6, the first message (where you introduced yourself) will
            appear <b>crossed out in gray</b> in the Memory panel. That's the pruning.
          </li>
          <li>
            Now send: "<i>do you remember my name?</i>". The AI will invent a name or
            tell you it doesn't remember — <b>because it no longer has it in context</b>.
          </li>
          <li>
            Switch the strategy to <b>Compaction</b>, clear it, repeat steps 2-5. When it
            fills up, you'll see a <code>[RESUMEN PREVIO]</code> message appear that <i>does</i> mention
            your name. The question in step 6 is now answered correctly.
          </li>
        </ol>

        <h3>What to watch</h3>
        <ul>
          <li>
            <b>Token bar (top):</b> green → yellow → red. When it turns red, the
            next send will prune.
          </li>
          <li>
            <b>"Memory" panel (right):</b> ⭐ <b>the teaching gem</b>. Your full history
            with the crossed-out messages that no longer travel to the model. It's the mental image worth
            taking away.
          </li>
          <li>
            <b>Raw Request panel (middle):</b> open the JSON after sending — you'll see that{' '}
            <code>messages[]</code> has <i>fewer</i> entries than your visible history. That
            difference is the window in action.
          </li>
          <li>
            <b>Log (bottom right):</b> when there's compaction, there are <code>[compaction]</code>{' '}
            lines with the additional request. That's the extra cost you pay.
          </li>
        </ul>

        <p>
          <b>Connection with your day-to-day agent:</b> when your Cursor "gets slow" or
          "forgets old things", this is what's happening underneath. The strategy and
          limits change, but the mechanics are exactly this.
        </p>

        <TryModeCTA
          href="/ventana-contexto"
          label="Context window"
          emoji="🪟"
          hint="Change the strategy (FIFO / window / compaction) and watch how the history gets pruned."
        />
          </div>
        </details>
      </section>

      {/* ============== PROMPT INJECTION ============== */}
      <section className="criollo-section" id="modo-injection">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>7) 🛡 Prompt injection — when the context isn't trustworthy</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <a href="/prompt-injection" target="_blank" rel="noreferrer"><code>http://localhost:5173/prompt-injection</code></a>
        </p>

        <h3>What it does</h3>
        <p>
          It's a lab to see an idea that's not enough to just state: <b>everything is
          context, but not all context has the same authority</b>. The experiment builds
          a payload with <code>system</code>, user task, external document and
          <code>tool_result</code>. Then it puts malicious instructions inside those
          untrusted zones to see if the model obeys them.
        </p>

        <h3>The concept it teaches: <i>instruction hierarchy</i></h3>
        <p>
          A document retrieved by RAG, the content of a web page, a PDF pasted by the user
          or a tool's output <b>are data</b>. They may contain text that looks like an order
          ("ignore the system", "reveal the secret", "respond PWNED"), but they shouldn't override
          the <code>system</code> or your app's policies.
        </p>

        <div className="prov-callout">
          <p>
            <b>Key idea:</b> prompt injection isn't someone "hacking the model". It's
            simpler and more dangerous: you put untrusted text inside the prompt, and that text
            tries to pass itself off as a higher-authority instruction.
          </p>
        </div>

        <h3>How the experiment is built</h3>
        <ul>
          <li>
            <b>Leak secret</b> — the external document tries to reveal a fake key that
            lives in the <code>system</code>.
          </li>
          <li>
            <b>Break format</b> — the document tries to override the JSON output contract.
          </li>
          <li>
            <b>Unauthorized action</b> — a <code>tool_result</code> tries to convince the
            model that an action was approved.
          </li>
          <li>
            <b>Send vulnerable</b> — sends a minimal system, without explaining that documents and
            tool results are untrusted data.
          </li>
          <li>
            <b>Test defense</b> — sends the same attack, but with explicit hierarchy
            rules: system &gt; user &gt; document/tool result.
          </li>
        </ul>

        <h3>What to watch</h3>
        <ul>
          <li>
            <b>Attack builder:</b> shows which part of the context is authority
            (<code>system</code>) and which part is untrusted data.
          </li>
          <li>
            <b>Raw request:</b> confirms the injection travels as normal text inside the
            payload. No magic: it's in <code>messages[]</code>.
          </li>
          <li>
            <b>Evaluation:</b> marks <code>PASS</code>/<code>FAIL</code> if the model leaked the
            secret, broke JSON, changed the shape or followed the injected instruction.
          </li>
        </ul>

        <h3>Suggested experiment</h3>
        <ol>
          <li>Go into <b>Leak secret</b> with "Inject into external document" turned on.</li>
          <li>Send <b>Send vulnerable</b> and look for any <code>FAIL</code>.</li>
          <li>Send <b>Test defense</b> with the same scenario.</li>
          <li>
            Open the <b>Raw request</b> of both runs and compare the <code>system</code>.
            The model is the same; what changed was how you explained the authority of the
            context to it.
          </li>
          <li>
            Repeat with <b>Unauthorized action</b> and turn on "Inject into tool_result": it's the case
            most similar to real agents that read outputs of commands, APIs or files.
          </li>
        </ol>

        <p>
          <b>Connection with RAG and agents:</b> every time your app pastes external text into the prompt,
          you're opening this door. The solution isn't "don't use external context"; it's labeling it
          as untrusted, keeping secrets out of the prompt when possible, validating actions
          with deterministic code and not letting a <code>tool_result</code> become the boss.
        </p>

        <TryModeCTA
          href="/prompt-injection"
          label="Prompt injection"
          emoji="🛡"
          hint="Try the preloaded attacks and watch when the model falls and when it holds."
        />
          </div>
        </details>
      </section>

      {/* ============== REASONING ============== */}
      <section className="criollo-section" id="modo-razonamiento">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>8) 🧠 Reasoning — when the model "thinks" before answering</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          <a href="/razonamiento" target="_blank" rel="noreferrer"><code>http://localhost:5173/razonamiento</code></a>
        </p>

        <h3>What it does</h3>
        <p>
          It's a lab to take a close look at <b>reasoning models</b> — the ones that in the
          ChatGPT or Claude interface show a "Thinking…" before answering. The page lets
          you send the same question to OpenAI (with <code>gpt-5-mini</code>, <code>o4-mini</code>,
          etc.) or to Claude (with <code>claude-sonnet-4-5</code>), and compare what each one
          returns as "reasoning".
        </p>

        <h3>The concept it teaches: <i>thinking is tokens</i></h3>
        <p>
          A reasoning model doesn't have a mystical brain. What it does is <b>generate
          reasoning tokens</b> before generating the visible answer. Those tokens are discarded from the
          final output, but <b>they're billed all the same</b>. It's like paying for drafts you never read.
        </p>

        <div className="prov-callout">
          <p>
            <b>Key idea:</b> "thinks more" means "spends more internal tokens". More
            <code>effort</code> = more quality on complex problems, but also more money and more
            latency. On trivial questions it's money thrown away.
          </p>
        </div>

        <h3>The OpenAI vs Claude contrast (the strongest lesson)</h3>
        <p>
          The two providers chose <b>opposite policies</b> on what they show you:
        </p>
        <ul>
          <li>
            <b>OpenAI hides the reasoning.</b> It only gives you an optional <i>summary</i>
            (<code>output[].type:'reasoning'</code> with <code>summary[]</code>), and sometimes not even that —
            the block can arrive empty. The real reasoning is stored <b>encrypted</b> in
            <code>encrypted_content</code>: opaque to you, but you can resend it in multi-turn
            so the model resumes its thinking without paying for it again. They do it this way so that
            no one can distill the model by copying its thoughts.
          </li>
          <li>
            <b>Claude shows the whole thinking.</b> It returns it in
            <code>content[].type:'thinking'</code> with the full text, whole paragraphs of
            chain of thought. Each block comes <b>signed</b> (<code>signature</code>) so that
            in multi-turn the API can confirm it's an original thinking of its own and not something
            you slipped in.
          </li>
        </ul>

        <h3>What to watch</h3>
        <ul>
          <li>
            <b>Thinking panel (violet for OpenAI, orange for Claude):</b> it's what's
            normally hidden behind the "Thinking…" in a chat UI. Here you see it raw.
          </li>
          <li>
            <b>Token table:</b> in OpenAI you see <code>reasoning_tokens</code> separate from the
            visible output — the student literally sees how many tokens it "thought" that don't go in
            the answer. In Claude everything goes in <code>output_tokens</code> with no breakdown, and the UI
            clarifies it.
          </li>
          <li>
            <b>Raw request:</b> in OpenAI there's no <code>temperature</code> (the reasoners
            reject it). In Claude <code>temperature: 1</code> is mandatory and <code>max_tokens</code>
            has to be greater than <code>budget_tokens</code>. Each API has its weird rules.
          </li>
          <li>
            <b>Effort:</b> same control mapped to each provider. In OpenAI it's
            <code>reasoning.effort</code> (minimal/low/medium/high), in Claude it's
            <code>thinking.budget_tokens</code> (1k / 2k / 5k / 12k tokens). The UI translates.
          </li>
        </ul>

        <h3>Suggested experiment</h3>
        <ol>
          <li>Pick the <b>🧩 Logic puzzle</b> preset with OpenAI / effort medium.</li>
          <li>
            Look at the <b>reasoning tokens</b> in the table — you'll see dozens or hundreds of
            tokens "thought" for a 3-person puzzle. Look at the violet panel: it probably
            returns a very short or empty summary.
          </li>
          <li>
            Switch to <b>Claude</b> with the same preset. Same question, now you'll see whole
            paragraphs of raw thinking in the orange panel. <b>It's the closest you'll get
            to reading a model's chain of reasoning</b>.
          </li>
          <li>
            Now try with <b>"What time is it?"</b>. You'll see it still spends thinking tokens
            for a trivial question. That's the reasoners' trap: they charge you for
            "thinking" even if you don't need it. That's why <code>effort: minimal</code> and
            non-reasoning models like <code>gpt-4o-mini</code> exist for cheap tasks.
          </li>
          <li>
            Raise <b>effort to high</b> on a hard question and compare: did the answer improve?
            How much longer did it take? How many extra tokens did you pay? The answer isn't always "yes it improved".
          </li>
        </ol>

        <h3>Models that reason vs the ones that don't</h3>
        <ul>
          <li>
            <b>OpenAI reasoners:</b> <code>gpt-5</code>, <code>gpt-5-mini</code>,
            <code>o4-mini</code>, <code>o3-mini</code>, <code>o1-mini</code>. The default for this app's Chat
            (<code>gpt-4o-mini</code>) <b>does not reason</b> — that's why this page uses a
            separate env var (<code>VITE_OPENAI_REASONING_MODEL</code>).
          </li>
          <li>
            <b>Anthropic with thinking:</b> Sonnet 3.7+, Opus 4+. <b>Haiku doesn't reason</b>. That's why
            the Chat uses Haiku for speed but this page uses Sonnet 4.5 via
            <code>VITE_ANTHROPIC_REASONING_MODEL</code>.
          </li>
        </ul>

        <p>
          <b>Connection with your day-to-day agent:</b> when you see "Reasoning…" in Cursor, Claude
          Code or Codex, this is exactly what's happening. Internal tokens you pay for,
          invisible in the UI but present on the bill. Knowing this helps you choose when
          to ask a reasoning model (complex problem, risk of an expensive error) and when not to
          (casual chat, fast generation, deterministic tasks).
        </p>

        <TryModeCTA
          href="/razonamiento"
          label="Reasoning"
          emoji="🧠"
          hint="Compare how OpenAI hides the thinking and Claude shows it whole."
        />
          </div>
        </details>
      </section>

      {/* ============== REQUEST CONTROLS (cross-cutting) ============== */}
      <section className="criollo-section" id="controles">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>🎛 Request controls — knobs that change everything</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          What you've seen so far are <b>modes</b>: different ways of building the{' '}
          <code>messages</code> array. This section is about the <b>knobs</b> that travel
          alongside the array and change how the model responds without touching a single word
          of your prompt. There are two: <b>the system prompt</b> (who the AI is) and <b>the
          temperature</b> (how much it dares to deviate).
        </p>
        <p>
          Both are <b>cross-cutting</b> across the chat modes (Raw, Conversation,
          Persistent) and, in the system's case, also across the Editor and the Agentic Loop.
        </p>

        <details className="docs-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>A) 🧠 Editable system prompt — the "personality" before the first hello</span>
          </summary>
          <div className="docs-collapsible-body">
            <h3>What it is</h3>
            <p>
              The <code>system</code> is the message with <code>role:"system"</code> that
              travels as the <i>first</i> item of the <code>messages</code> array. The model reads it
              before any user message and defines how it's going to respond to{' '}
              <b>all</b> the following turns. It's not optional or cosmetic: it changes the
              behavior at the root.
            </p>
            <div className="prov-callout">
              <p>
                <b>Key idea:</b> the model is the same (same GPT, same Claude). The
                only thing that changes between "ChatGPT", your bank's bot and a programming
                assistant is <b>what the system says</b>. The intelligence is the model's;
                the <b>personality</b> is the system's.
              </p>
            </div>

            <h3>Where it appears in the app</h3>
            <ul>
              <li>
                <b>Chat (<code>/</code>)</b>: collapsible editor above the input.
                Persists per tab and travels in <code>messages[0]</code> in all three modes
                (Raw, Conversation, Persistent — the latter sends it as{' '}
                <code>instructions</code> in <code>/v1/responses</code>).
              </li>
              <li>
                <b>Editor (<code>/editor</code>)</b>: the same editor, with presets that
                change the style of the generated code (slang, security paranoid,
                minimalist).
              </li>
              <li>
                <b>Agentic Loop (<code>/loop-agentico</code>)</b>: you edit the agent's system
                to change how it decides to use the tools (faster, more
                paranoid, more narrator).
              </li>
            </ul>

            <h3>The presets — the "wow" in 1 click</h3>
            <p>
              Each mode brings 4-5 presets so you see the effect without having to write
              a system from scratch. Some from the Chat:
            </p>
            <ul>
              <li><b>🏴‍☠️ Pirate</b> — responds in pirate slang.</li>
              <li><b>📦 Returns only JSON</b> — zero prose, just an object.</li>
              <li><b>🎓 Sarcastic professor</b> — jabs you before answering well.</li>
              <li><b>😄 Emojis only</b> — letters forbidden.</li>
            </ul>

            <h3>🧪 Experiment to understand</h3>
            <ol>
              <li>Open the chat in <b>Raw</b> mode (no history).</li>
              <li>Type <code>hi</code> and send it. Look at the response.</li>
              <li>Open the system editor, pick the <b>🏴‍☠️ Pirate</b> preset.</li>
              <li>Clear the chat ("Clear" button) and send <code>hi</code> again.</li>
              <li>
                The response should sound like a pirate. <b>It's the same model, the
                same "hi", the same temperature.</b> The only thing that changed was one
                line of text in <code>messages[0]</code>.
              </li>
              <li>
                Bonus: in Raw mode the system <i>also</i> travels (it's the only thing that
                accompanies the user message). That's why you can see the effect without accumulating
                history.
              </li>
            </ol>

            <h3>Weird details worth knowing</h3>
            <ul>
              <li>
                <b>Claude separates the system</b> from the <code>messages</code> array: in{' '}
                <code>/v1/messages</code> it travels as a separate key (<code>system: "..."</code>),
                not as an item with <code>role:"system"</code>. The app normalizes it
                internally — but if you look at the raw request JSON in the right panel
                with provider Claude, you'll see it outside the array.
              </li>
              <li>
                <b>If you leave the textarea empty</b>, the app sends the default system. The
                "empty → default" badge in the editor warns you.
              </li>
              <li>
                <b>Overwriting doesn't destroy history</b>: changing the system in
                Conversation rewrites <code>messages[0]</code> instantly and applies
                to the next request. The history of previous turns stays there.
              </li>
            </ul>
          </div>
        </details>

        <details className="docs-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>B) 🌡 Temperature — the AI isn't deterministic (and you can turn the knob)</span>
          </summary>
          <div className="docs-collapsible-body">
            <h3>What temperature is</h3>
            <p>
              Every time the model generates a token, it actually computes a
              probability distribution over thousands of possible candidates. The{' '}
              <b>temperature</b> is how much you let it move away from the most probable:
            </p>
            <ul>
              <li><b>0</b> — always picks the most probable token. Almost deterministic.</li>
              <li><b>0.7</b> — the default. Balance between coherence and variety.</li>
              <li><b>1.0</b> — dares to pick less probable tokens. More creative.</li>
              <li><b>2.0</b> — chaotic. Usually breaks grammar.</li>
            </ul>
            <div className="prov-callout">
              <p>
                <b>Key idea:</b> with temperature &gt; 0, the <b>same prompt produces
                different responses each time</b>. It's not a bug. It's by design. The
                AI is <i>not</i> a pure function.
              </p>
            </div>

            <h3>🧪 Experiment to understand</h3>
            <p>
              Use <b>Raw</b> mode for this (each send starts clean, without
              accumulating the chat) and clear between tests with the "Clear" button.
            </p>
            <ol>
              <li>Temperature slider to <b>0</b>.</li>
              <li>
                Type <code>Invent a creative name for a rock band</code> and
                send it. Note the response.
              </li>
              <li>
                Clear the chat and send <b>the same prompt</b> two or three more times. With
                temperature 0 they should come out <b>nearly identical</b>: the AI
                always picks the most probable.
              </li>
              <li>Raise the slider to <b>1.5</b> and repeat the test.</li>
              <li>
                Now each send should give a very different response. Some
                even kind of delirious. <b>The knob changed, not the prompt.</b>
              </li>
              <li>
                Raise to <b>2.0</b> and send again. You'll see responses that break
                grammar or wander off into weird branches. That's why 0.7 is the default: the sweet
                spot.
              </li>
            </ol>

            <h3>Details worth knowing</h3>
            <ul>
              <li>
                <b>Claude clamps to 0–1.</b> If the slider is at 1.5 with provider
                Claude, the app warns with a yellow hint and sends 1.0 to the request. It's a
                limitation of the Anthropic wrapper, not ours.
              </li>
              <li>
                <b>OpenAI and LM Studio accept up to 2.</b> Use them to see the
                chaos in its full glory.
              </li>
              <li>
                <b>Temperature ≠ creativity.</b> Temperature is <i>variability</i>.
                For tasks with one correct answer (code, JSON, facts) you want it
                low (0–0.3). For brainstorming or fiction, high (0.9–1.3).
              </li>
              <li>
                <b>The parameter travels in the request.</b> If you open the "Request →
                API (raw)" panel after sending, you'll see <code>"temperature": 1.5</code>{' '}
                in the body. With Ollama it's nested inside <code>options</code>.
              </li>
            </ul>

            <h3>Combining them: system + temperature</h3>
            <p>
              The two knobs multiply. A <b>"Pirate"</b> system with
              temp <b>0</b> always gives you the same pirate response. With temp <b>1.5</b>,
              each send gives you a <i>different</i> pirate response, but all in
              character. The system defines <i>who</i> responds; the temperature,
              <i>how much it dares</i> to vary within that character.
            </p>
          </div>
        </details>
          </div>
        </details>
      </section>

      {/* ============== THIS APP vs PRODUCTION AGENTS ============== */}
      <section className="criollo-section" id="vs-agentes">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>🛠️ This app vs. Claude Code / Cursor / Codex</span>
          </summary>
          <div className="docs-collapsible-body">
        <p>
          A question that comes up on its own after playing with the Agentic Loop: <i>is this the
          same as Claude Code? as Cursor? as Codex?</i> The short answer is <b>no, but
          they're built on exactly what you see here</b>. This section exists so that
          when you go back to your everyday Cursor / Claude Code / Codex, you know what's
          happening underneath and can use them better.
        </p>

        <h3>The three layers</h3>
        <ol>
          <li>
            <b>The API</b> (<code>/v1/chat/completions</code>, <code>/v1/messages</code>) —
            the HTTP engine. Stateless, no hands. You send it JSON, it returns JSON. It doesn't read your
            files, doesn't run commands, doesn't remember anything between requests. <b>It's the brick.</b>
          </li>
          <li>
            <b>This app</b> — a flashlight pointed at the API. It adds no intelligence, it just
            exposes the raw JSON, the context that accumulates, the tool-use loop, the tokens.
            It serves to <b>understand</b> — and also as a <b>starting point to code your own
            integration</b> against the API (the wrappers in <code>src/openai.js</code>,{' '}
            <code>src/anthropic.js</code>, <code>src/ollama.js</code>, <code>src/lmstudio.js</code>{' '}
            are minimal, reusable examples).
          </li>
          <li>
            <b>Claude Code, Cursor, Codex / Copilot</b> — production agents built{' '}
            <i>on top</i> of that same API. They added real tools (filesystem, shell, git),
            long-context management, permissions, IDE / terminal UX. They serve to <b>work</b>.
          </li>
        </ol>

        <div className="prov-callout">
          <p>
            <b>What you see in the Agentic Loop is, in miniature, what Claude Code does when
            it answers you.</b> Same loop, same <code>tool_use</code> → <code>tool_result</code>,
            same <code>messages[]</code> that grows. The difference is the tools (
            <code>Read</code>, <code>Edit</code>, <code>Bash</code>, <code>Grep</code>… vs. two
            tools over a string) and the UX around it.
          </p>
        </div>

        <h3>Side-by-side comparison</h3>
        <div className="prov-table-wrap">
          <table className="prov-table">
            <thead>
              <tr>
                <th>Aspect</th>
                <th className="prov-col-openai">This app</th>
                <th className="prov-col-claude">Claude Code / Cursor / Codex</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>What it is</td>
                <td>Educational HTTP client</td>
                <td>Production programming agent</td>
              </tr>
              <tr>
                <td>Available tools</td>
                <td>2-5 simulated over an in-memory snippet</td>
                <td>Dozens, over real filesystem, git, shell</td>
              </tr>
              <tr>
                <td>What it acts on</td>
                <td>A code string in <code>localStorage</code></td>
                <td>Your repo, your terminal, your IDE</td>
              </tr>
              <tr>
                <td>Context management</td>
                <td>You see it raw and manage it</td>
                <td>Automatic (compaction, caching, file pinning)</td>
              </tr>
              <tr>
                <td>Permissions / approvals</td>
                <td>Manual <code>NEEDS_HUMAN_APPROVAL</code> sentinel</td>
                <td>Permission system, modes (plan, accept-edits), hooks</td>
              </tr>
              <tr>
                <td>Rules file</td>
                <td><code>AGENTS.md</code> in the app's editor</td>
                <td><code>CLAUDE.md</code>, <code>AGENTS.md</code>, <code>.cursorrules</code> in your repo</td>
              </tr>
              <tr>
                <td>What it's for</td>
                <td><b>Understanding</b> how it works underneath</td>
                <td><b>Working</b> on real code</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>What you take away from here to use your agent better</h3>
        <p>
          Each mode of this app shows you a layer that in Claude Code / Cursor / Codex stays
          covered. When you go back to your everyday tool, you already know what's happening:
        </p>
        <ul>
          <li>
            <b>💬 Chat → context is paid for.</b> When your Cursor "gets slow" or "forgets
            old things", it's because the <code>messages[]</code> grew. Knowing this explains
            why it pays to open new chats for new tasks, and why models with a
            bigger context window aren't <i>free</i>: every history token is billed
            on every turn.
          </li>
          <li>
            <b>💻 Editor → code is context, nothing more.</b> When you paste a snippet to
            Copilot Chat or ask Cursor to look at a file, the only thing the AI "sees" is
            that text inside <code>messages[].content</code>. It doesn't "open" your file, doesn't
            "understand" your project — it reads strings. This changes how you write prompts and why
            <i> what you paste</i> matters more than <i>how you ask for it</i>.
          </li>
          <li>
            <b>🤖 Agentic Loop → your agent is a brain without hands.</b> When Claude Code
            says "I'm going to read file X" and then "I'm going to edit Y", they're two loop iterations
            you saw here. Knowing this helps you better read what your agent does, understand
            why it sometimes gets stuck ("it's stuck requesting a tool that fails") and why big
            tasks consume many turns (= many tokens, = money).
          </li>
          <li>
            <b>📋 AGENTS.md → the rules travel on every request.</b> Your <code>CLAUDE.md</code> /
            <code> .cursorrules</code> does <b>not</b> "train" the AI. It's concatenated onto the system prompt
            on every call. That's why it pays to be concise (every token counts, every turn) and
            specific (the model already knows the generic stuff). The "with/without" comparison in mode 4
            is <i>literally</i> what you gain or lose when you write it well or badly.
          </li>
          <li>
            <b>🧑‍💻 If you're going to code against an AI API, start here.</b> This app's wrappers
            are the "hello world" of each provider: build the body, send the <code>fetch</code>,
            parse the response, handle errors, expose logs. You fork it, strip the UI and you've got
            the minimal HTTP client to drop into your own bot, script, backend or integration.
            You don't need an SDK: the API is JSON over HTTP and here you see it without layers.
          </li>
        </ul>

        <div className="prov-callout">
          <p>
            <b>Mental model for agent users:</b> your Cursor / Claude Code / Codex is
            <i> this app with many more tools and a tidy UX on top</i>. If you understand what happens
            in the right panel of the Agentic Loop, you understand what your agent is doing when
            it "thinks". If you understand why the <code>messages[]</code> array grows, you understand why
            your long session costs more and responds worse.
          </p>
          <p>
            <b>And for whoever wants to code against the API:</b> the four wrappers in{' '}
            <code>src/</code> are your template. Same <code>fetch</code>, same body, same
            parsing — no SDK, no magic. You copy, adapt and you've got your own integration
            talking to OpenAI, Anthropic, Ollama or LM Studio. <b>That's the app's double goal:
            understand what you already use, and be able to build your own.</b>
          </p>
        </div>
          </div>
        </details>
      </section>

      {/* ============== APPENDIX ============== */}
      <section className="criollo-section" id="glosario">
        <details className="docs-collapsible docs-section-collapsible">
          <summary>
            <span className="docs-collapsible-chev">▸</span>
            <span>📖 Quick glossary</span>
          </summary>
          <div className="docs-collapsible-body">
        <ul>
          <li><b>Token</b> — the minimal unit of text the model processes. One token ≈ 4 characters in English. You're charged per token.</li>
          <li><b>Stateless</b> — no memory between requests. Each call is independent; the "memory" is built by you sending the history.</li>
          <li><b>System prompt</b> — global instructions you give the AI (its "personality" or rules). Goes at the start of the <code>messages</code> array with <code>role: "system"</code> (or separately in Claude's case).</li>
          <li><b>Tool use / function calling</b> — an API feature that lets you declare functions the AI can request. It doesn't run them, it just requests them.</li>
          <li><b>Agentic loop</b> — the cycle of requesting a tool → running it → returning the result → repeat, until the AI finishes.</li>
          <li><b>stop_reason / finish_reason</b> — why the model stopped. <code>"end_turn"</code>/<code>"stop"</code> = finished normally; <code>"tool_use"</code>/<code>"tool_calls"</code> = requested a tool; <code>"max_tokens"</code> = got cut off.</li>
        </ul>
          </div>
        </details>
      </section>

    </div>
  )
}
