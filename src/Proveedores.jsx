import DocsNav from './DocsNav.jsx'

const TOC_ITEMS = [
  { id: 'frase',         emoji: '🎯', label: 'En una frase' },
  { id: 'tabla',         emoji: '📊', label: 'Tabla comparativa' },
  { id: 'flujo-openai',  emoji: '🟢', label: 'Flujo OpenAI persistente' },
  { id: 'flujo-claude',  emoji: '🟠', label: 'Flujo Claude' },
  { id: 'no-guardar',    emoji: '🔒', label: '"No guardar" ≠ "nada"' },
  { id: 'que-conviene',  emoji: '🤔', label: 'Qué te conviene' },
  { id: 'codigo',        emoji: '💻', label: 'Lo que cambia en el código' },
  { id: 'response',      emoji: '📥', label: 'Response distinto' },
  { id: 'cors',          emoji: '🚧', label: 'CORS con Claude' },
  { id: 'lmstudio',      emoji: '🔵', label: 'LM Studio (local)' },
  { id: 'resumen',       emoji: '📌', label: 'Resumiendo' },
]

export default function Proveedores() {
  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /proveedores
          <span className="docs-header-subtitle">OpenAI vs Anthropic — dónde vive el contexto</span>
        </h1>
        <a href="/" className="clear-btn">← Modos</a>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label="Navegación de documentación">
          <DocsNav current="proveedores" />
          <nav className="docs-toc" aria-label="Índice de la página">
            <div className="docs-toc-title">En esta página</div>
            {TOC_ITEMS.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="docs-toc-link">
                <span className="docs-toc-emoji">{item.emoji}</span>
                <span className="docs-toc-label">{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="docs-main">

        <section className="criollo-section" id="frase">
          <h2>El concepto en una frase</h2>
          <div className="prov-callout">
            <p>
              <b>OpenAI te ofrece guardar los mensajes en sus servidores y rearmarte el array en cada turno (feature opcional).</b>
              <br />
              <b>Anthropic no te guarda nada — el array lo armás siempre vos.</b>
              <br />
              <b>LM Studio tampoco — el modelo corre en tu máquina y el historial lo administra el cliente.</b>
            </p>
            <p className="prov-callout-aside">
              Ojo: en los tres casos el modelo es stateless. Lo único que cambia es <b>quién administra el historial</b>,
              no si "el LLM se acuerda". Más abajo está el detalle.
            </p>
          </div>
          <p>
            Anthropic decidió por diseño que su API sea 100% stateless: cada request es un
            evento aislado, sin noción de "conversación". OpenAI tiene los dos modos disponibles
            (clásico y persistente). LM Studio es stateless también, pero además corre
            en tu propia máquina — ni siquiera sale a internet.
          </p>
        </section>

        <section className="criollo-section" id="tabla">
          <h2>Tabla comparativa rápida</h2>
          <div className="prov-table-wrap">
            <table className="prov-table">
              <thead>
                <tr>
                  <th>Aspecto</th>
                  <th className="prov-col-openai">OpenAI</th>
                  <th className="prov-col-claude">Anthropic (Claude)</th>
                  <th className="prov-col-lmstudio">LM Studio (local)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Endpoint clásico (cliente manda todo)</td>
                  <td>✅ <code>/v1/chat/completions</code></td>
                  <td>✅ <code>/v1/messages</code></td>
                  <td>✅ <code>/v1/chat/completions</code> (shape de OpenAI)</td>
                </tr>
                <tr>
                  <td>Endpoint persistente (server guarda contexto)</td>
                  <td>✅ <code>/v1/responses</code> + Conversations API</td>
                  <td>❌ no existe</td>
                  <td>❌ no existe</td>
                </tr>
                <tr>
                  <td>Tabla "conversations" en su DB</td>
                  <td>Sí, si usás <code>/responses</code></td>
                  <td>Nunca</td>
                  <td>Nunca (no hay DB de nadie)</td>
                </tr>
                <tr>
                  <td>Logs de requests sueltos (abuse monitoring)</td>
                  <td>30 días</td>
                  <td>30 días</td>
                  <td>Ninguno (corre en tu máquina)</td>
                </tr>
                <tr>
                  <td>Si reportan tu API por abuso</td>
                  <td>Hasta 30 días extra</td>
                  <td>Hasta 2 años</td>
                  <td>N/A — no hay proveedor</td>
                </tr>
                <tr>
                  <td>Entrenan con tu data (API directa)</td>
                  <td>NO</td>
                  <td>NO</td>
                  <td>NO (no sale de tu máquina)</td>
                </tr>
                <tr>
                  <td>Entrenan con tu data (apps consumer)</td>
                  <td>ChatGPT free/plus: SÍ por default</td>
                  <td>Claude.ai: NO nunca</td>
                  <td>N/A</td>
                </tr>
                <tr>
                  <td>Cliente puede llamar desde el navegador</td>
                  <td>Sí (sin restricción CORS)</td>
                  <td>Bloqueado por default (necesita header especial)</td>
                  <td>Sí, pero hay que habilitar CORS desde Server Settings</td>
                </tr>
                <tr>
                  <td>API key</td>
                  <td>Obligatoria</td>
                  <td>Obligatoria</td>
                  <td>No (LM Studio acepta un placeholder)</td>
                </tr>
                <tr>
                  <td>Costo por token</td>
                  <td>Sí</td>
                  <td>Sí</td>
                  <td>Gratis — lo que pagás es luz y RAM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="criollo-section" id="flujo-openai">
          <h2>El flujo cuando hablás con OpenAI (modo persistente)</h2>
          <div className="prov-flow">
            <div className="prov-flow-line">
              <span className="prov-actor">Tu navegador</span>
              <span className="prov-arrow">→</span>
              <span className="prov-step">manda solo el mensaje nuevo + conversation_id</span>
            </div>
            <div className="prov-flow-line">
              <span className="prov-actor">api.openai.com</span>
              <span className="prov-arrow">↓</span>
              <span className="prov-step">lee mensajes anteriores de SU base de datos</span>
            </div>
            <div className="prov-flow-line">
              <span className="prov-actor">api.openai.com</span>
              <span className="prov-arrow">↓</span>
              <span className="prov-step">arma el array internamente y se lo pasa al modelo</span>
            </div>
            <div className="prov-flow-line">
              <span className="prov-actor">api.openai.com</span>
              <span className="prov-arrow">↓</span>
              <span className="prov-step">guarda tu mensaje + la respuesta en SU base de datos</span>
            </div>
            <div className="prov-flow-line">
              <span className="prov-actor">Tu navegador</span>
              <span className="prov-arrow">←</span>
              <span className="prov-step">recibe la respuesta</span>
            </div>
          </div>
          <p>
            La conversación queda viva en servidores de OpenAI. Cerrás la pestaña, recargás,
            mandás el <code>conversation_id</code> y seguís donde estabas. <b>El contexto vive en OpenAI.</b>
          </p>

          <div className="prov-callout">
            <p>
              <b>⚠️ Ojo con la palabra "persistente": el modelo NO se acuerda de nada.</b>
            </p>
            <p>
              Suena a que GPT "recuerda" entre turnos, pero internamente sigue siendo el mismo
              loop stateless de siempre. Lo único que cambia es <b>quién arma el array</b>:
            </p>
            <ul>
              <li><b>Modo clásico:</b> vos mandás el <code>messages[]</code> completo cada turno.</li>
              <li><b>Modo persistente:</b> OpenAI guarda los mensajes en SU base de datos y los <b>rehidrata</b> en cada llamada antes de pasárselos al modelo.</li>
            </ul>
            <p>
              El modelo recibe exactamente el mismo array en los dos casos. No hay "memoria" mágica
              del lado del LLM — hay un wrapper server-side que te ahorra remandar bytes desde el cliente.
            </p>
            <p>
              <b>Importante:</b> te cobran los <code>input_tokens</code> del historial completo igual,
              en cada turno. El modo persistente <b>no es prompt caching</b> (eso es otra feature,
              con descuento por reusar prefijos y TTL de minutos). Acá no te ahorrás plata, te ahorrás
              transporte y manejo de estado en el cliente.
            </p>
          </div>
        </section>

        <section className="criollo-section" id="flujo-claude">
          <h2>El flujo cuando hablás con Claude (siempre)</h2>
          <div className="prov-flow prov-flow-claude">
            <div className="prov-flow-line">
              <span className="prov-actor">Tu navegador</span>
              <span className="prov-arrow">↓</span>
              <span className="prov-step">arma el array messages[] con TODO el historial</span>
            </div>
            <div className="prov-flow-line">
              <span className="prov-actor">Tu navegador</span>
              <span className="prov-arrow">→</span>
              <span className="prov-step">manda el array completo + tu mensaje nuevo</span>
            </div>
            <div className="prov-flow-line">
              <span className="prov-actor">api.anthropic.com</span>
              <span className="prov-arrow">↓</span>
              <span className="prov-step">procesa el request como evento aislado</span>
            </div>
            <div className="prov-flow-line">
              <span className="prov-actor">api.anthropic.com</span>
              <span className="prov-arrow">↓</span>
              <span className="prov-step">loguea el request 30 días (no como conversación, como log suelto)</span>
            </div>
            <div className="prov-flow-line">
              <span className="prov-actor">Tu navegador</span>
              <span className="prov-arrow">←</span>
              <span className="prov-step">recibe la respuesta y la guarda en SU array</span>
            </div>
          </div>
          <p>
            Anthropic ve cada llamada como un evento aislado. <b>No tiene noción de "tu conversación con id X".</b>{' '}
            Si querés persistencia, te la armás vos (localStorage, IndexedDB, backend propio, lo que sea).
          </p>
        </section>

        <section className="criollo-section" id="no-guardar">
          <h2>"No guardar contexto" ≠ "No guardar nada"</h2>
          <p>Cuidado con este matiz. Anthropic <b>sí loguea cada request</b> por 30 días para detectar abuso. Lo que NO hace es:</p>
          <ul>
            <li>❌ Encadenar tus llamadas como "conversación X"</li>
            <li>❌ Ofrecerte una API para listar tus chats anteriores</li>
            <li>❌ Tenerlos disponibles en una tabla <code>conversations</code></li>
          </ul>
          <p>Lo que SÍ hace:</p>
          <ul>
            <li>✅ Guardar logs sueltos de cada request (input + output) por 30 días</li>
            <li>✅ Procesarlos automáticamente para detectar contenido prohibido</li>
            <li>✅ Si te reportan o flaggean, retener hasta 2 años</li>
          </ul>
          <p>
            Es decir: <b>privacidad mejor pero no perfecta</b>. Si pegás algo sensible en una llamada,
            queda en logs 30 días igual. Para borrado total inmediato necesitás Zero Data Retention
            (contrato enterprise).
          </p>
        </section>

        <section className="criollo-section" id="que-conviene">
          <h2>¿Qué te conviene a vos?</h2>
          <h3 className="prov-h3">Te conviene OpenAI con modo persistente si:</h3>
          <ul>
            <li>Querés persistencia automática sin armar backend</li>
            <li>Tus conversaciones son largas (te ahorra remandar tokens en cada turno)</li>
            <li>Querés multi-dispositivo "gratis" guardando solo el <code>conversation_id</code></li>
            <li>No te molesta que tus chats vivan en servers de OpenAI</li>
          </ul>

          <h3 className="prov-h3">Te conviene Claude (Anthropic) si:</h3>
          <ul>
            <li>Privacidad por diseño es importante para tu caso</li>
            <li>Querés ser dueño total de los datos</li>
            <li>No querés lock-in con un proveedor (poder migrar fácil)</li>
            <li>Te interesa el "extended thinking" (chain-of-thought visible)</li>
            <li>Tu app ya tiene su propia DB y la persistencia la manejás vos igual</li>
          </ul>

          <h3 className="prov-h3">Te conviene OpenAI con modo clásico si:</h3>
          <ul>
            <li>El proyecto es chico y la persistencia local te alcanza</li>
            <li>Querés el costo más bajo (gpt-4o-mini es lo más barato del mercado)</li>
            <li>Querés total control del contexto en cliente, como Claude, pero con OpenAI</li>
          </ul>
        </section>

        <section className="criollo-section" id="codigo">
          <h2>Lo que cambia en el código</h2>
          <p>Probá mandar el mismo mensaje con cada proveedor y mirá el panel "Request crudo":</p>

          <h3 className="prov-h3">OpenAI</h3>
          <div className="criollo-quote">
            {`POST https://api.openai.com/v1/chat/completions
Authorization: Bearer sk-...

{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system",    "content": "Eres útil" },
    { "role": "user",      "content": "Hola" },
    { "role": "assistant", "content": "Hola, ¿cómo estás?" },
    { "role": "user",      "content": "¿Cómo me llamo?" }
  ],
  "temperature": 0.7
}`}
          </div>

          <h3 className="prov-h3">Claude</h3>
          <div className="criollo-quote">
            {`POST https://api.anthropic.com/v1/messages
x-api-key: sk-ant-...
anthropic-version: 2023-06-01

{
  "model": "claude-haiku-4-5-20251001",
  "system": "Eres útil",
  "messages": [
    { "role": "user",      "content": "Hola" },
    { "role": "assistant", "content": "Hola, ¿cómo estás?" },
    { "role": "user",      "content": "¿Cómo me llamo?" }
  ],
  "max_tokens": 1024,
  "temperature": 0.7
}`}
          </div>

          <p>Diferencias clave:</p>
          <ul>
            <li><b>Auth:</b> <code>Authorization: Bearer</code> vs <code>x-api-key</code></li>
            <li><b>System prompt:</b> dentro de <code>messages[]</code> vs campo top-level <code>system</code></li>
            <li><b>max_tokens:</b> opcional en OpenAI, <b>obligatorio</b> en Claude</li>
            <li><b>Header de versión:</b> Claude exige <code>anthropic-version</code></li>
            <li><b>Roles válidos en messages[]:</b> OpenAI acepta system/user/assistant; Claude solo user/assistant</li>
          </ul>
        </section>

        <section className="criollo-section" id="response">
          <h2>Y el response también es distinto</h2>
          <h3 className="prov-h3">OpenAI</h3>
          <div className="criollo-quote">
            {`{
  "choices": [{
    "message": { "role": "assistant", "content": "Te llamás Lari" },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 32,
    "completion_tokens": 6,
    "total_tokens": 38
  }
}`}
          </div>
          <p>Para sacar el texto: <code>data.choices[0].message.content</code></p>

          <h3 className="prov-h3">Claude</h3>
          <div className="criollo-quote">
            {`{
  "id": "msg_abc",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Te llamás Lari" }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 32,
    "output_tokens": 6
  }
}`}
          </div>
          <p>
            Para sacar el texto: <code>data.content[0].text</code> (es un array de bloques,
            no un string). Tokens: <code>input_tokens</code>/<code>output_tokens</code> en vez de{' '}
            <code>prompt_tokens</code>/<code>completion_tokens</code>.
          </p>
        </section>

        <section className="criollo-section" id="cors">
          <h2>El detalle de CORS con Claude</h2>
          <p>
            Anthropic <b>bloquea por default</b> las llamadas desde el navegador. Lo hace porque
            si lo permitiera, los devs estarían tentados a poner la API key en el frontend
            (cualquiera puede inspeccionar y robarla).
          </p>
          <p>
            Para que esta app funcione, tuve que mandar el header{' '}
            <code>anthropic-dangerous-direct-browser-access: true</code>. Es la "puerta trasera"
            oficial. Su nombre dice todo: <b>está bien para una demo local, no para producción.</b>
          </p>
          <p>
            En producción la solución es un backend mínimo que reciba el mensaje del navegador,
            agregue la API key del lado servidor, y haga el llamado a Anthropic. La key nunca
            viaja al cliente.
          </p>
        </section>

        <section className="criollo-section" id="lmstudio">
          <h2>🔵 Y el tercer caso: LM Studio (modelo local)</h2>
          <p>
            Esta app también soporta un tercer "proveedor" que es radicalmente distinto:
            <b> el modelo corre en tu propia máquina</b>. No hay servers de nadie en el medio.
          </p>
          <p>
            <a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer">LM Studio</a> es
            una app de escritorio que descarga y corre modelos open-weight (Llama de Meta, Qwen,
            Mistral, etc.) y expone un server HTTP <b>compatible con la API de OpenAI</b>. Lo prendés
            desde Developer → Start Server y queda escuchando en <code>http://localhost:1234</code>.
          </p>
          <ul>
            <li><b>Interfaz gráfica:</b> descargás modelos, ajustás parámetros y mirás métricas desde la app, sin terminal.</li>
            <li><b>Endpoint compatible con OpenAI:</b> expone <code>/v1/chat/completions</code> con el mismo shape que <code>api.openai.com</code>. Si ya tenés código para OpenAI, lo apuntás a <code>http://localhost:1234</code> y anda igual.</li>
            <li><b>Server opt-in:</b> no levanta server automático al abrir la app. Hay que prender "Start Server" a mano.</li>
          </ul>

          <h3 className="prov-h3">El request en este caso</h3>
          <div className="criollo-quote">
            {`POST http://localhost:1234/v1/chat/completions
Authorization: Bearer lm-studio   ← placeholder, no se valida

{
  "model": "qwen2.5-coder-7b-instruct",
  "messages": [
    { "role": "system",    "content": "Eres útil" },
    { "role": "user",      "content": "Hola" },
    { "role": "assistant", "content": "Hola, ¿cómo estás?" },
    { "role": "user",      "content": "¿Cómo me llamo?" }
  ],
  "temperature": 0.7,
  "stream": false
}`}
          </div>
          <p>
            Notá que el header <code>Authorization</code> está pero el valor es un placeholder —
            LM Studio ignora la key. Algunos SDKs se rompen si el header no existe, así que conviene
            mandar algo aunque sea cosmético.
          </p>

          <h3 className="prov-h3">Qué cambia respecto a OpenAI / Claude</h3>
          <ul>
            <li><b>Sin API key real:</b> el server es tuyo. El header <code>Authorization</code> existe sólo porque algunos SDKs se rompen sin él.</li>
            <li><b>Sin red:</b> el request va a localhost. Funciona offline.</li>
            <li><b>Sin facturación:</b> usa tu CPU/GPU. Lo que pagás es luz y RAM.</li>
            <li><b>Privacidad total:</b> el prompt nunca sale de tu máquina.</li>
            <li><b>Sin Conversations API:</b> es stateless como Claude — el contexto lo armás vos.</li>
            <li><b>Elegir modelo:</b> se carga uno por vez desde la GUI. En la ConfigBar de esta app hay un botón "Detectar" que lista los cargados via <code>GET /v1/models</code>.</li>
            <li><b>Auto-Evict:</b> por default LM Studio descarga el modelo tras unos minutos de idle. Si pasa en mitad de un request te tira <code>"Model reloaded."</code> — el wrapper reintenta una vez, pero conviene desactivarlo en Developer → Idle TTL.</li>
          </ul>
        </section>

        <section className="criollo-section" id="resumen">
          <h2>Resumiendo todo</h2>
          <div className="prov-summary">
            <div className="prov-card prov-card-openai">
              <div className="prov-card-title">🟢 OpenAI</div>
              <p>"Te damos un modelo, y opcionalmente te guardamos el contexto en nuestros servers."</p>
              <ul>
                <li>Tiene Conversations API</li>
                <li>Más conveniente para apps simples</li>
                <li>Más feature-rich pero más lock-in</li>
              </ul>
            </div>
            <div className="prov-card prov-card-claude">
              <div className="prov-card-title">🟠 Anthropic (Claude)</div>
              <p>"Te damos un modelo. Vos guardá el contexto donde quieras. Nosotros no lo administramos."</p>
              <ul>
                <li>Stateless por diseño</li>
                <li>Privacy-first, sin lock-in</li>
                <li>Más laburo pero vos sos dueño total</li>
              </ul>
            </div>
            <div className="prov-card prov-card-lmstudio">
              <div className="prov-card-title">🔵 LM Studio (local)</div>
              <p>"El modelo corre en tu máquina, con GUI y endpoint OpenAI-compatible. Ni siquiera salimos a internet."</p>
              <ul>
                <li>Sin API key real, sin facturación, sin red</li>
                <li>Drop-in replacement de la API de OpenAI en <code>localhost:1234</code></li>
                <li>Hay que prender el server a mano (Developer → Start Server)</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="criollo-footer">
          <a href="/" className="clear-btn">← Modos</a>
        </footer>

        </div>
      </div>
    </div>
  )
}
