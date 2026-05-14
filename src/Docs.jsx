import ModeSwitch from './ModeSwitch.jsx'
import DocsNav from './DocsNav.jsx'

export default function Docs() {
  return (
    <div className="criollo">
      <header className="header">
        <h1>
          <span className="brand">API a la vista</span>
          <span className="brand-subtitle">— modo <span className="brand-mode">📚 Docs</span> · qué hace cada modo</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="docs" />
        </div>
      </header>

      <div className="criollo-content">

        {/* ============== MENÚ DE DOCS ============== */}
        <DocsNav current="docs" />

        {/* ============== LA IA ES VIRGEN ============== */}
        <section className="criollo-section">
          <h2>🧠 El concepto que une todo: la IA es "virgen" en cada request</h2>
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

          <h3>Qué quiere decir "virgen"</h3>
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
                prompt completo internamente. <b>La IA sigue siendo "virgen" en cada inferencia.</b>
                La diferencia es solo <i>dónde vive</i> el array <code>messages</code>: en tu
                cliente (clásico) o en el server de OpenAI (persistente).
              </p>
              <p>
                <b>Anthropic no tiene equivalente.</b> Por eso Claude es siempre 100% del lado
                cliente — la "virginidad" es total y absoluta en cada request.
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
                Cada request: instancia virgen, mismo modelo que el de cualquier otro usuario del
                planeta. Si querés que "aprenda" tus preferencias, las metés en el system prompt
                o en el historial — pero eso lo cargás <b>vos</b>, cada vez.
              </p>

              <h4>5) Por qué el Loop Agéntico funciona</h4>
              <p>
                Justamente porque la IA es virgen, vos podés <b>fabricar</b> una historia
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
            Hay <b>cuatro modos</b>, cada uno enseña un concepto distinto:
          </p>
          <ol>
            <li><b>💬 Chat</b> — cómo funciona una conversación con LLM y qué es el "contexto".</li>
            <li><b>💻 Editor</b> — cómo se le pide a una IA que modifique código (un solo turno).</li>
            <li><b>🤖 Loop Agéntico</b> — cómo la IA puede usar <i>herramientas</i> y encadenar acciones.</li>
            <li><b>📋 AGENTS.md</b> — cómo "enseñarle" a la IA las convenciones de tu proyecto.</li>
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
          <h2>1) 💬 Chat — el modo clásico</h2>
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
              <b>Modo "raw"</b> — manda solo tu último mensaje, sin system ni historial.
              Sirve para ver cómo responde la IA sin contexto de ningún tipo.
            </li>
          </ul>

          <h3>Qué mirar</h3>
          <ul>
            <li><b>Panel del medio (Request → API):</b> el JSON que sale. Fijate cómo crece <code>messages[]</code> con cada turno.</li>
            <li><b>Panel del medio (Response ← API):</b> lo que vuelve, incluyendo <code>usage</code> con los tokens consumidos.</li>
            <li><b>Panel derecho (Log):</b> timestamps, latencia, tokens, errores.</li>
            <li><b>Páginas auxiliares:</b> <a href="/contexto" target="_blank" rel="noreferrer">/contexto</a> (vista en vivo del array <code>messages</code>) y <a href="/proveedores" target="_blank" rel="noreferrer">/proveedores</a> (comparación OpenAI vs Anthropic).</li>
          </ul>
        </section>

        {/* ============== EDITOR ============== */}
        <section className="criollo-section">
          <h2>2) 💻 Editor — IA modifica código (un turno)</h2>
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
        </section>

        {/* ============== LOOP AGÉNTICO ============== */}
        <section className="criollo-section">
          <h2>3) 🤖 Loop Agéntico — IA con herramientas (loop)</h2>
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
        </section>

        {/* ============== AGENTS.MD ============== */}
        <section className="criollo-section">
          <h2>4) 📋 AGENTS.md — instrucciones persistentes para el agente</h2>
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

          <h3>El concepto que enseña: <i>cómo le enseñás convenciones a una IA virgen</i></h3>
          <p>
            Esto cierra el círculo de toda la app. Si la IA es <b>virgen en cada request</b>
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

        <section className="criollo-section">
          <h2>Páginas auxiliares</h2>
          <ul>
            <li><a href="/contexto" target="_blank" rel="noreferrer"><b>/contexto</b></a> — vista en vivo del array <code>messages</code> que tiene el chat ahora mismo (se sincroniza por <code>localStorage</code>).</li>
            <li><a href="/proveedores" target="_blank" rel="noreferrer"><b>/proveedores</b></a> — comparación OpenAI vs Anthropic: dónde vive el contexto, qué endpoint usa cada uno.</li>
            <li><a href="/criollo" target="_blank" rel="noreferrer"><b>/criollo</b></a> — la API explicada en argentino bien jerga.</li>
          </ul>
        </section>

      </div>
    </div>
  )
}
