import DocsNav from './DocsNav.jsx'

export default function Criollo({ onBack }) {
  return (
    <div className="criollo">
      <header className="header">
        <h1>Criollo — la API contada como Dios manda</h1>
        <button onClick={onBack} className="clear-btn" type="button">← Volver al chat</button>
      </header>

      <div className="criollo-content">
        <DocsNav current="criollo" />

        <section className="criollo-section">
          <h2>De qué carajo estamos hablando</h2>
          <p>
            Arranquemos por lo importante: <b>toda interacción humano↔IA pasa por una API</b>.
            ChatGPT, Claude.ai, Copilot, Cursor, el chat de tu banco — son <b>UIs</b> que por debajo
            le pegan HTTP al mismo endpoint que vas a usar vos en este curso. La única diferencia es
            de capas: esos productos te esconden el JSON, te ponen markdown lindo y manejan la sesión
            por vos. Acá lo ves crudo. Si entendés este POST, entendés cómo funciona
            <i>cualquier</i> producto de IA del mercado por dentro.
          </p>
          <p>
            Una "API de chat" es un endpoint HTTP que recibe un JSON con una lista de mensajes y te
            devuelve otro JSON con la próxima respuesta del modelo. Punto. No hay sesión, no hay
            websocket, no hay magia: es <code>POST</code> y listo. Toda la estructura conversacional
            la armás vos del lado del cliente.
          </p>
          <p>
            Esta app habla con cuatro proveedores que se manejan parecido pero no son intercambiables
            tal cual:
          </p>
          <ul>
            <li><b>OpenAI</b> — <code>POST https://api.openai.com/v1/chat/completions</code> (clásico) o <code>/v1/responses</code> (con estado server-side).</li>
            <li><b>Anthropic</b> — <code>POST https://api.anthropic.com/v1/messages</code>, stateless puro, browser-direct con flag.</li>
            <li><b>Ollama</b> — <code>POST http://localhost:11434/api/chat</code>, local, sin auth.</li>
            <li><b>LM Studio</b> — <code>POST http://localhost:1234/v1/chat/completions</code>, copia el shape de OpenAI.</li>
          </ul>
        </section>

        <section className="criollo-section">
          <h2>El request mínimo (OpenAI / LM Studio)</h2>
          <p>
            Tres campos y arrancás. Lo demás es ajuste fino.
          </p>
          <pre className="criollo-code">{`POST /v1/chat/completions
Host: api.openai.com
Authorization: Bearer sk-...
Content-Type: application/json

{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "Sos un asistente útil." },
    { "role": "user",   "content": "¿Qué hora es en Buenos Aires?" }
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "top_p": 1,
  "frequency_penalty": 0,
  "presence_penalty": 0,
  "stream": false
}`}</pre>
          <p>
            Los roles válidos son <code>system</code>, <code>user</code>, <code>assistant</code>,
            <code>tool</code> (para devolver el resultado de una function call) y, en modelos nuevos,
            <code>developer</code> (reemplaza a <code>system</code> en la familia <code>o1</code>/<code>o3</code>).
            El orden importa: <code>system</code> arriba, después intercalado user/assistant cronológico.
          </p>
        </section>

        <section className="criollo-section">
          <h2>El mismo pedido en Anthropic</h2>
          <p>
            Claude tira un shape distinto: <b>el <code>system</code> sale del array</b> y se manda
            como campo top-level. Adentro de <code>messages</code> solo van <code>user</code> y
            <code>assistant</code>, alternados. Si mandás dos <code>user</code> seguidos te tira 400.
          </p>
          <pre className="criollo-code">{`POST /v1/messages
Host: api.anthropic.com
x-api-key: sk-ant-...
anthropic-version: 2023-06-01
anthropic-dangerous-direct-browser-access: true
Content-Type: application/json

{
  "model": "claude-haiku-4-5-20251001",
  "system": "Sos un asistente útil.",
  "messages": [
    { "role": "user", "content": "¿Qué hora es en Buenos Aires?" }
  ],
  "max_tokens": 1024,
  "temperature": 0.7
}`}</pre>
          <p>
            La conversión <code>messages[]</code> estilo OpenAI → payload Anthropic está en
            <code>toAnthropicPayload()</code> de <code>src/anthropic.js</code>: filtra los
            <code>system</code>, los concatena con <code>\n\n</code>, y deja el resto. Es el adaptador
            de borde: el formato canónico in-app sigue siendo el de OpenAI.
          </p>
          <p>
            El header <code>anthropic-dangerous-direct-browser-access: true</code> existe porque
            Anthropic, por default, rechaza requests con <code>Origin</code> de navegador para que no
            expongas la key. Con ese flag te deja, pero la key viaja en el bundle — sirve para clase,
            no para producción.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Response: qué te llega</h2>
          <p>OpenAI <code>chat/completions</code>:</p>
          <pre className="criollo-code">{`{
  "id": "chatcmpl-9xY...",
  "object": "chat.completion",
  "created": 1715000000,
  "model": "gpt-4o-mini-2024-07-18",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Son las 14:30..." },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 28,
    "completion_tokens": 12,
    "total_tokens": 40
  }
}`}</pre>
          <p>Anthropic <code>/v1/messages</code>:</p>
          <pre className="criollo-code">{`{
  "id": "msg_01ABC...",
  "type": "message",
  "role": "assistant",
  "model": "claude-haiku-4-5-20251001",
  "content": [
    { "type": "text", "text": "Son las 14:30..." }
  ],
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 28, "output_tokens": 12 }
}`}</pre>
          <p>
            Diferencias claves: Claude devuelve <code>content</code> como <b>array de bloques
            tipados</b> (<code>text</code>, <code>tool_use</code>, <code>thinking</code>), no un string
            pelado. Si pedís tool-use, en el mismo response te llegan ambos bloques juntos.
            <code>stop_reason</code> en Anthropic es el equivalente a <code>finish_reason</code> en
            OpenAI, con valores propios: <code>end_turn</code>, <code>tool_use</code>,
            <code>max_tokens</code>, <code>stop_sequence</code>.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Statelessness y por qué reenviás todo</h2>
          <p>
            Los tres endpoints stateless (OpenAI classic, Anthropic, Ollama, LM Studio) <b>no guardan
            nada</b> entre requests. Cada llamada es un POST independiente. Si querés que el modelo
            "recuerde", el cliente acumula <code>messages[]</code> y lo manda completo cada vez. El
            costo crece lineal con la conversación porque <code>prompt_tokens</code> incluye todo el
            historial.
          </p>
          <p>
            La excepción es OpenAI <code>/v1/responses</code> + Conversations API: el server-side
            mantiene el contexto y vos solo mandás el último turno + un <code>conversation</code> ID.
            Ahorra ancho de banda y normaliza el truncado, pero te atás al proveedor. En esta app
            está en el modo "Persistente" del segmented control del Chat.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Tokens, tokenizadores y plata</h2>
          <p>
            Un token es la unidad sub-word con la que el modelo opera. Cada familia tiene su
            tokenizador:
          </p>
          <ul>
            <li><b>OpenAI GPT-4/4o</b> — <code>o200k_base</code> (BPE).</li>
            <li><b>OpenAI GPT-3.5</b> — <code>cl100k_base</code>.</li>
            <li><b>Anthropic</b> — tokenizador propio, no público; aproximación 1 token ≈ 3.5 chars en español.</li>
            <li><b>Llama / Mistral</b> — SentencePiece BPE, vocab ~32k–128k según versión.</li>
          </ul>
          <p>
            <code>prompt_tokens</code> + <code>completion_tokens</code> = lo que te facturan. Los
            precios son por millón de tokens y cobran distinto input vs output (output suele ser
            3–5× más caro). Si usás <b>prompt caching</b> de Anthropic, los tokens cacheados se cobran
            ~10% del precio de input — clave si tenés un system prompt grande y conversaciones largas.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Parámetros de sampling, en serio</h2>
          <ul>
            <li>
              <code>temperature</code> (0–2 OpenAI, 0–1 Anthropic) — escala los logits antes del
              softmax. 0 ≈ greedy decoding determinista; valores altos aplanan la distribución y
              aumentan variabilidad. No es "creatividad", es <b>entropía de muestreo</b>.
            </li>
            <li>
              <code>top_p</code> (nucleus sampling) — corta la distribución al subconjunto mínimo
              que acumula <code>p</code> de probabilidad. <code>top_p: 0.1</code> es muy
              conservador. Tocá uno u otro, no los dos.
            </li>
            <li>
              <code>frequency_penalty</code> / <code>presence_penalty</code> (OpenAI) — penalizan
              tokens ya emitidos. Útil contra loops repetitivos en outputs largos.
            </li>
            <li>
              <code>max_tokens</code> / <code>max_completion_tokens</code> — techo del output, no del
              total. Si el modelo lo toca, <code>finish_reason: "length"</code>. Reservá margen
              porque la ventana de contexto incluye input + output.
            </li>
            <li>
              <code>stop</code> — array de hasta 4 strings; el modelo corta apenas genera uno. Útil
              para forzar formatos.
            </li>
            <li>
              <code>seed</code> (OpenAI) — best-effort para outputs reproducibles. No es garantía
              fuerte: <code>system_fingerprint</code> en el response te dice si el backend cambió.
            </li>
          </ul>
        </section>

        <section className="criollo-section">
          <h2>Streaming (SSE)</h2>
          <p>
            Con <code>stream: true</code> el servidor responde con
            <code>Content-Type: text/event-stream</code> y te tira chunks incrementales. Cada chunk
            es una línea <code>data: {`{...}`}</code> seguida de doble newline. El último es
            <code>data: [DONE]</code> en OpenAI o un evento <code>message_stop</code> en Anthropic.
          </p>
          <pre className="criollo-code">{`data: {"choices":[{"delta":{"content":"Son "}}]}
data: {"choices":[{"delta":{"content":"las "}}]}
data: {"choices":[{"delta":{"content":"14:30."}}]}
data: [DONE]`}</pre>
          <p>
            En el browser se consume con <code>fetch</code> + <code>response.body.getReader()</code>
            o con la <code>EventSource</code> API (esta última no soporta headers custom, así que
            para APIs con <code>Authorization</code> usás fetch + reader). Esta app no usa streaming:
            todos los wrappers mandan <code>stream:false</code> para mostrar el JSON crudo entero.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Tool use / function calling</h2>
          <p>
            Le declarás al modelo un set de funciones con JSON Schema. El modelo, en vez de
            responder texto, devuelve una "intención de llamada" con los argumentos. <b>El modelo no
            ejecuta nada</b> — vos ejecutás del lado del cliente y le devolvés el resultado en otro
            request. Loop hasta que el modelo decida que terminó.
          </p>
          <p>OpenAI lo expresa así:</p>
          <pre className="criollo-code">{`{
  "model": "gpt-4o-mini",
  "messages": [...],
  "tools": [{
    "type": "function",
    "function": {
      "name": "read_code",
      "description": "Lee un archivo del workspace",
      "parameters": {
        "type": "object",
        "properties": { "path": { "type": "string" } },
        "required": ["path"]
      }
    }
  }],
  "tool_choice": "auto"
}`}</pre>
          <p>
            La respuesta del modelo trae <code>choices[0].message.tool_calls</code>, un array con
            <code>id</code>, <code>function.name</code> y <code>function.arguments</code> (string
            JSON, ojo: hay que parsearlo). En el siguiente request agregás un mensaje con
            <code>role: "tool"</code>, <code>tool_call_id</code> y <code>content</code> con el
            resultado.
          </p>
          <p>
            Anthropic es análogo pero con bloques tipados: el modelo te devuelve
            <code>{`{ "type": "tool_use", "id": "...", "name": "...", "input": {...} }`}</code> dentro
            del array <code>content</code>, y vos respondés con un user message que contiene un
            bloque <code>{`{ "type": "tool_result", "tool_use_id": "...", "content": "..." }`}</code>.
            La definición de las tools va en el campo top-level <code>tools</code> con
            <code>input_schema</code> (no <code>parameters</code>).
          </p>
          <p>
            En esta app, los modos <code>/loop-agentico</code>, <code>/agents-md</code> y
            <code>/agents-md-skills</code> implementan este loop. Las defs neutras viven en
            <code>src/agent-tools.js</code> y cada wrapper agéntico (<code>openai-agent.js</code>,
            <code>anthropic-agent.js</code>, <code>lmstudio-agent.js</code>) las adapta al shape de
            su proveedor.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Autenticación, real</h2>
          <ul>
            <li><b>OpenAI</b> — <code>Authorization: Bearer sk-...</code>. Opcional <code>OpenAI-Organization</code> y <code>OpenAI-Project</code> para scoping.</li>
            <li><b>Anthropic</b> — <code>x-api-key: sk-ant-...</code> + <code>anthropic-version: 2023-06-01</code> (obligatorio, identifica el contrato de la API).</li>
            <li><b>Ollama</b> — sin auth, server local. Si querés exponerlo en LAN, hay que ponerlo detrás de un proxy con auth.</li>
            <li><b>LM Studio</b> — acepta cualquier <code>Authorization</code>, es placeholder. El server local no valida.</li>
          </ul>
          <p>
            <b>Riesgo</b>: las APIs cloud son <code>browser-blocked</code> por default vía CORS.
            OpenAI te lo permite pero <b>la key viaja al cliente</b> y queda en el bundle de Vite (es
            <code>import.meta.env.VITE_*</code>). Esto está OK para demos pedagógicas, no para
            producción. En prod ponés un backend que recibe la consulta del browser y reenvía con la
            key del lado servidor — sin exponer jamás el secreto.
          </p>
        </section>

        <section className="criollo-section">
          <h2>CORS, lo que rompe en local</h2>
          <p>
            <b>Ollama</b> bloquea origins distintos de <code>localhost</code> por default. Si la app
            la servís desde <code>http://localhost:5173</code> y Ollama desde
            <code>http://localhost:11434</code>, técnicamente son origins distintos. Solución:
            arrancar Ollama con <code>OLLAMA_ORIGINS=*</code> (o whitelist específica) en el
            environment antes de <code>ollama serve</code>.
          </p>
          <p>
            <b>LM Studio</b> permite CORS por default desde el panel Developer. Si lo bloquea, está
            en la configuración del server local.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Rate limits y headers de respuesta</h2>
          <p>
            Las APIs cloud devuelven headers que vale la pena loguear:
          </p>
          <ul>
            <li><code>x-ratelimit-limit-requests</code>, <code>x-ratelimit-remaining-requests</code> — cuántas requests/minuto te quedan.</li>
            <li><code>x-ratelimit-limit-tokens</code>, <code>x-ratelimit-remaining-tokens</code> — idem para tokens.</li>
            <li><code>x-ratelimit-reset-*</code> — cuándo se resetea la ventana.</li>
            <li><code>retry-after</code> — cuando llega un 429, te dicen acá cuántos segundos esperar.</li>
            <li>OpenAI: <code>openai-processing-ms</code>, <code>openai-request-id</code> (este último cruzalo con soporte si algo se rompe).</li>
            <li>Anthropic: <code>request-id</code>, <code>anthropic-ratelimit-*</code>.</li>
          </ul>
          <p>
            Para retries: backoff exponencial con jitter sobre 429 y 5xx, respetando
            <code>retry-after</code>. No reintentes 4xx (excepto 408/429): es bug tuyo o del payload.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Errores: códigos y qué significan en este stack</h2>
          <ul>
            <li><b>400</b> — payload mal formado: <code>messages</code> vacío, dos <code>user</code> seguidos en Claude, <code>tool_call_id</code> que no matchea, JSON Schema inválido en <code>tools</code>.</li>
            <li><b>401</b> — key inválida, revocada o con typo. Verificá <code>Authorization</code>/<code>x-api-key</code>.</li>
            <li><b>403</b> — la key es válida pero no tiene permiso para ese recurso (modelo restringido, org wrong).</li>
            <li><b>404</b> — endpoint o modelo inexistente. Ojo con typos en el ID del modelo.</li>
            <li><b>413</b> — payload demasiado grande (sobre todo con visión / archivos).</li>
            <li><b>422</b> — Anthropic la usa para semántica: rol inválido, system donde no va, etc.</li>
            <li><b>429</b> — rate limit. Mirá <code>retry-after</code>. Si es por "tokens per minute", esperá; si es por "requests per minute", también, pero la causa es distinta.</li>
            <li><b>500 / 502 / 503</b> — upstream caído. Reintento con backoff.</li>
            <li><b>529</b> — Anthropic, "overloaded". Es 503 con otro número, mismo tratamiento.</li>
          </ul>
        </section>

        <section className="criollo-section">
          <h2>Ventana de contexto y truncado</h2>
          <p>
            Cada modelo tiene un techo de tokens combinados (input + output). GPT-4o-mini: 128k;
            Claude Haiku 4.5: 200k; Llama 3.1: 128k según deployment. Si te pasás, te tira 400 con
            <code>context_length_exceeded</code> (OpenAI) o equivalente.
          </p>
          <p>
            Estrategias clásicas cuando la conversación crece: <b>sliding window</b> (descartás los
            mensajes más viejos), <b>summarization</b> (cada N turnos, reemplazás el historial por un
            resumen generado por el mismo modelo), o <b>RAG</b> (movés el contenido fuera del
            contexto y lo traés on-demand vía retrieval). La app no aplica ninguna porque el objetivo
            es que veas el contexto crudo crecer.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Lo que pasa cuando apretás Enter, paso a paso</h2>
          <ol className="criollo-steps">
            <li>El componente del chat lee el input y pushea <code>{`{ role: 'user', content }`}</code> al state <code>messages[]</code>.</li>
            <li>Según el modo de contexto (Crudo / Conversación / Persistente), arma el array que se manda: solo el último user, todo el historial, o solo el último + conversation ID.</li>
            <li>Llama al wrapper del proveedor activo (<code>sendChatMessage</code>, <code>sendClaudeMessage</code>, etc.). El wrapper hace el adapter de borde (ej. <code>toAnthropicPayload</code> para Claude).</li>
            <li>Construye <code>fetch</code> con headers correctos y <code>JSON.stringify(body)</code>. Notifica al panel de UI vía <code>onRawRequest</code> con la key <b>enmascarada</b> (<code>maskKey</code>) — el fetch real lleva la key entera.</li>
            <li>Espera el response, lo parsea como JSON, lo emite por <code>onRawResponse</code> para que el panel lo muestre, y devuelve el string del content al componente.</li>
            <li>El chat pushea <code>{`{ role: 'assistant', content }`}</code> al state y persiste el snapshot en <code>localStorage</code> (clave <code>chat_context_snapshot</code>). La página <code>/contexto</code> lo escucha vía <code>storage</code> events.</li>
          </ol>
        </section>

        <footer className="criollo-footer">
          <button onClick={onBack} className="clear-btn" type="button">← Volver al chat</button>
        </footer>
      </div>
    </div>
  )
}
