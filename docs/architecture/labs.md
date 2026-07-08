# Labs: experimentos aislados

> Parte de [docs/ARCHITECTURE.md](../ARCHITECTURE.md). Cada lab es una página independiente que aísla un concepto. Acá vive el detalle de cada uno.

## Razonamiento (`/razonamiento`)

Experimento aislado para que el alumno vea cómo los **modelos razonadores** "piensan" antes de responder y, sobre todo, cómo cada proveedor decide qué exponer y qué esconder.

Soporta **tres proveedores en la misma página** con selector arriba — la idea es que el alumno pruebe la misma pregunta con todos y vea el contraste:

| Proveedor | Wrapper | Endpoint | Qué expone | Control |
|---|---|---|---|---|
| OpenAI | [openai-reasoning.js](../../src/openai-reasoning.js) | `POST /v1/responses` | Solo **resumen** opcional del razonamiento (`output[].type:'reasoning'`, `summary[]`). El crudo nunca sale. A veces el resumen llega vacío. | `reasoning.effort` (minimal/low/medium/high) + `reasoning.summary` (auto/concise/detailed) |
| Anthropic | [anthropic-reasoning.js](../../src/anthropic-reasoning.js) | `POST /v1/messages` | El **thinking entero**, en texto plano, dentro de `content[].type:'thinking'`. Cada bloque firmado (`signature`). | `thinking.budget_tokens` (mapeado desde el mismo `effort`: 1k/2k/5k/12k) |
| LM Studio | [lmstudio-reasoning.js](../../src/lmstudio-reasoning.js) | `POST localhost:1234/v1/chat/completions` (shape OpenAI) | El **thinking entero** que el modelo local (DeepSeek-R1, QwQ, Qwen3, etc.) emite dentro de `<think>...</think>` en el propio texto. No es un campo de la API: el wrapper lo separa con un parser de streaming (`ThinkStreamParser`) que tolera etiquetas partidas entre chunks. | Ninguno nativo: `effort` se acepta y se loguea pero no viaja al server. `max_tokens: 16384` fijo. |

LM Studio es además el único de los tres con **streaming hacia la UI**: el wrapper acepta `onTextChunk` / `onThinkingStart` / `onThinkingChunk` / `onThinkingEnd` y, si alguno está presente, manda `stream: true`. Usa el modelo y host compartidos de LM Studio (`getLmStudioModel` / `getLmStudioHost`) — no tiene env var de razonamiento propia.

### Shape canónico de la UI

Los tres wrappers devuelven el **mismo shape** para que la UI no ramifique:

```js
{
  text: string,              // respuesta final visible
  reasoningBlocks: [{
    id, summary, encrypted,  // OpenAI
    signature, redacted,     // Claude
  }],
  usage: { input_tokens, output_tokens, total_tokens, output_tokens_details? },
  raw: data,
}
```

### Reglas críticas

- **OpenAI**: no acepta `temperature` (los razonadores la rechazan). No usa `VITE_OPENAI_MODEL` (que apunta a `gpt-4o-mini`, no razonador): usa `VITE_OPENAI_REASONING_MODEL` o el dropdown.
- **Anthropic**: cuando `thinking` está habilitado, `temperature` **debe ser 1** (la API lo exige) y `max_tokens > budget_tokens`. Haiku NO razona — usa Sonnet 3.7+ u Opus 4+ vía `VITE_ANTHROPIC_REASONING_MODEL`.
- **LM Studio**: requiere un modelo razonador local cargado que emita `<think>` tags; con un modelo común la página funciona igual pero sin panel de pensamiento. Si no hay modelo configurado, el wrapper falla rápido y orienta al botón "Detectar".
- **Contraste pedagógico**: el panel de pensamiento usa color violeta para OpenAI y naranja para Claude (matchea con la paleta del provider-badge del resto de la app). El alumno ve de un vistazo qué proveedor está usando.
- **Tabla de tokens diferenciada**: en OpenAI se muestra `reasoning_tokens` separado (`usage.output_tokens_details.reasoning_tokens`); en Claude no se puede — el thinking entra dentro de `output_tokens` sin desglose, y la UI lo aclara explícitamente.

## Logprobs (`/logprobs`)

Experimento aislado para mostrar que **la IA es un predictor de tokens**: la respuesta se renderiza token por token, cada uno coloreado por la probabilidad que el modelo le asignó, y al tocar un token se ven las alternativas (`top_logprobs`) que el modelo consideró en ese paso.

- Wrapper: [openai-logprobs.js](../../src/openai-logprobs.js) (`sendLogprobsMessage`). Mismo contrato de hooks de debug que el resto.
- Endpoint: `POST /v1/chat/completions` con `logprobs: true` y `top_logprobs: N` (selector en la UI, 3–20).
- **Solo OpenAI**: Anthropic no expone logprobs en su API — la página lo dice explícitamente (decisión de producto, mismo contraste pedagógico que en `/razonamiento`). Los razonadores de OpenAI (gpt-5, o-*) tampoco devuelven logprobs, por eso el selector reusa `OPENAI_CHAT_MODELS`.
- El wrapper devuelve shape propio para que la UI no parsee el response: `{text, tokens: [{token, logprob, prob, alternatives}], usage, raw}`. `prob = Math.exp(logprob)`.
- `max_tokens: 300` fijo en el wrapper: con logprobs el response crece rápido (cada token viaja con sus N alternativas) y para la clase alcanzan respuestas cortas.
- La temperatura conecta con la lección de sampling: con temperatura alta el token elegido puede no estar en el top-N, y la UI lo señala.
- Espacios y saltos de línea se muestran como `␣` y `⏎` — son parte del token.

## MCP (`/mcp`)

Experimento aislado para entender el **Model Context Protocol** desde el JSON: un inspector que habla JSON-RPC 2.0 a mano contra un servidor MCP de juguete que corre local.

### Piezas

| Pieza | Archivo | Qué hace |
|---|---|---|
| Server de juguete | [servidor-mcp/server.js](../../servidor-mcp/server.js) | Node puro, sin deps ni SDK. `npm run mcp` → escucha en `http://localhost:3100/mcp`. Implementa `initialize`, `notifications/initialized`, `tools/list`, `tools/call` y `ping` sobre HTTP (transporte Streamable HTTP mínimo, sin SSE ni sesiones). CORS abierto. |
| Cliente | [mcp-client.js](../../src/mcp-client.js) | `mcpInitialize`, `mcpListTools`, `mcpCallTool`. Mismo contrato de hooks `{onLog, onRawRequest, onRawResponse}` que el resto de los wrappers. Sin key (server local sin auth). |
| Agente | [mcp-agent.js](../../src/mcp-agent.js) | `runMcpAgent({provider, task, host, mcpTools, system})` — loop tool-use (OpenAI o Claude) donde las tool defs salen del `tools/list` y la ejecución es `mcpCallTool` por HTTP. Conversores `toOpenAITools` / `toAnthropicTools` exportados. |
| UI | [Mcp.jsx](../../src/Mcp.jsx) | Stepper de 4 pasos: handshake → descubrimiento → invocación manual con formulario generado desde el `inputSchema` → loop agéntico con timeline modelo/server. |

### Tools del server de demo

`get_clima` (falso, determinista por hash de ciudad), `cotizacion_dolar` (falso), `guardar_nota` / `leer_notas` (estado **en memoria del proceso del server** — se pierde al reiniciar; ese es el punto pedagógico: las tools MCP pueden tener estado del lado del servidor).

### Puntos pedagógicos clave

- **En los pasos 1–3 no participa ningún modelo de IA.** MCP es una conversación cliente ↔ servidor de tools; el alumno hace de "modelo" eligiendo la tool y armando los argumentos a mano.
- Los `inputSchema` de `tools/list` son **JSON Schema** — el mismo formato de las tool defs de OpenAI/Anthropic. La conversión al shape del proveedor es un renombre de campos (`toOpenAITools` / `toAnthropicTools` en `mcp-agent.js`).
- **Paso 4 (loop agéntico)**: el modelo (OpenAI o Claude, mismo loop que [agentes.md](agentes.md)) recibe las tools descubiertas y cuando emite `tool_use`, el cliente ejecuta `tools/call` contra el server. Los hooks de debug se comparten, así que los paneles de request/response **alternan entre la API del modelo (con key enmascarada) y el server MCP (sin key)** — esa alternancia es la lección central: el modelo nunca habla con el server. Modelos: `VITE_OPENAI_MODEL` / `VITE_ANTHROPIC_MODEL` (los mismos del Chat). Errores de `tools/call` vuelven al modelo como tool_result con error para que pueda recuperarse.
- Errores en dos niveles: error **de protocolo** (`error.code` JSON-RPC, ej. tool inexistente → `-32602`) vs error **de ejecución** (`result.isError: true`, pensado para que el modelo lo lea y reaccione).
- El transporte stdio (Claude Desktop / Claude Code) no se implementa: desde un browser no se puede spawnear procesos. La página y el README lo aclaran.

### Reglas al extender

- El JSON-RPC vive **solo** dentro de `mcp-client.js`; hacia la UI salen objetos planos (`{text, isError, content}`).
- El server de juguete se mantiene **sin dependencias** — un solo archivo legible es parte del material.

## Tokens (`/tokens`)

Experimento aislado para mostrar **qué es un token antes de hablar de predecirlos**: el alumno pega texto y lo ve partirse en tokens en vivo, con los IDs numéricos que realmente viajan al modelo. En el orden de la clase va **antes** de `/logprobs` (primero "el texto se convierte en piezas", después "el modelo predice la próxima pieza").

- **No hay wrapper ni API**: la tokenización corre entera en el browser con [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) (el BPE real de OpenAI). Por eso la página tiene 2 paneles y no 3 — no hay log porque no hay proceso que loguear. Es la única página de la app sin contrato de hooks, y es deliberado.
- **Dos encodings seleccionables**: `o200k_base` (gpt-4o/gpt-5) y `cl100k_base` (gpt-4/3.5). La UI muestra el conteo en ambos para que se vea que el tokenizer es parte del modelo, no del texto.
- **Token seleccionado**: texto, ID, bytes UTF-8. Si el token corta un carácter multi-byte (emoji), `decode([id])` da `�` y la UI lo explica.
- **Tabla de costos**: precio de lista por 1M de tokens de input × tokens del texto, por request y ×1.000 requests. Para los modelos de Anthropic el conteo es aproximado (tokenizer no público) y la tabla lo aclara con asterisco — el exacto lo da `/v1/messages/count_tokens`.
- Reusa el lenguaje visual de `/logprobs` (`lp-strip`, `lp-token`, `␣`/`⏎`) a propósito, pero con colores alternados sin significado — la página aclara la diferencia.
- Presets pedagógicos: castellano vs inglés (el castellano gasta más tokens), números (se parten arbitrariamente — por eso la aritmética falla), palabras largas, emojis, código.

## Ruido en el contexto (`/ruido`)

Lab de **context rot reproducible**: corre la misma tarea agéntica dos veces — una limpia y otra con cada `tool_result` inflado por `bloatToolResult` ([noise.js](../../src/noise.js)) — y compara iteraciones, tokens enviados por request y respuesta final. Es la demo en vivo de lo que [`/contexto#loop`](../../src/Contexto.jsx) explica en teoría.

- **Reusa los tres wrappers agénticos** ([openai-agent.js](../../src/openai-agent.js), [anthropic-agent.js](../../src/anthropic-agent.js), [lmstudio-agent.js](../../src/lmstudio-agent.js)) pasándoles `noise: {enabled, seed, intensity}`; las stats por tool_result llegan vía el callback `onNoise`.
- **Determinismo visible**: seed e intensidad en la ConfigBar. Mismo seed + intensidad = mismo ruido, así las corridas son comparables (mulberry32, ver [chat.md — Modo Ruido](chat.md#modo-ruido-transversal)).
- **Vista previa sin API**: un `tool_result` de muestra coloreado señal vs relleno, con slider de turno para ver que el ruido crece por iteración.
- **Toggle "inflar también la instrucción"**: usa `applyNoise` ([noise.js](../../src/noise.js)) sobre el user message — el tercer sabor de ruido (el que mete el propio usuario).
- El código inicial y la tarea son fijos por diseño: la única variable del experimento es el ruido. No persiste historial entre corridas.

## Especificidad del pedido (`/especificidad`)

Lab espejo de `/ruido`, pero sobre el **mensaje del humano**: corre la misma tarea agéntica dos veces — una con un pedido vago ("agregale que se pueda sacar plata") y otra con un pedido que lleva los criterios de éxito adentro — y verifica **ambos** códigos finales contra la misma checklist determinística. La lección: la IA no lee tu mente, lee tu pedido; los criterios que no viajan en el prompt quedan librados al azar.

- **Reusa los tres wrappers agénticos** sin ruido. Usa el `code` final que devuelve el wrapper.
- **La checklist (`CRITERIA`, inline en [Especificidad.jsx](../../src/Especificidad.jsx))** representa "lo que el humano quería de verdad": funciones `test(code)` con regex sobre el código Java final, mismo espíritu que [skill-tests.js](../../src/skill-tests.js). Se muestra ANTES de correr, para que el alumno compare cuántos criterios viajan en cada prompt.
- **Los dos prompts son editables** (persistidos en localStorage) — el docente puede armar sus propias variantes. El código inicial es fijo: la única variable del experimento es la especificidad del pedido.
- **Veredicto** cuando hay dos corridas: criterios cumplidos (X/5 → Y/5), iteraciones y tokens enviados. El copy invita a correr la vaga varias veces para ver que su resultado es lotería, mientras la específica es estable.
- Pedagógicamente cierra el triángulo con `/ruido` (ruido en tool_results) y el toggle de instrucción inflada (ruido del usuario): acá el problema no es exceso de contexto sino **falta de contexto** — criterios implícitos.

## Mini-RAG (`/rag`)

Experimento aislado para mostrar **cómo se decide qué entra al contexto cuando los datos no caben**: una biblioteca de documentos se convierte en vectores (`/v1/embeddings`), la pregunta también, la búsqueda por similitud coseno corre **en el browser**, y solo los top-K documentos viajan pegados al user message de un chat común.

- **Wrapper**: [openai-embeddings.js](../../src/openai-embeddings.js) (`embedTexts`, `cosineSimilarity`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`). Mismo contrato de hooks de debug que el resto. Modelo fijo `text-embedding-3-small`.
- **Solo OpenAI**: Anthropic no expone endpoint de embeddings (recomienda proveedores externos como Voyage) — la página lo dice explícitamente, mismo contraste pedagógico que `/logprobs`.
- **`dimensions` seleccionable (64/256/1536)**: los text-embedding-3 aceptan truncar el vector del lado del servidor. Default 64 para que el response crudo se pueda **leer** en el panel; 1536 es el tamaño real de producción.
- **La biblioteca default es de una empresa ficticia** (datos que el modelo no puede tener de entrenamiento): si la respuesta final es correcta, la única explicación es la recuperación. Incluye un preset "trampa" cuya respuesta no está en la biblioteca, para ver al system prompt admitiendo el faltante. Contenido por idioma como módulos (`CONTENT.es` / `CONTENT.en` en [Rag.jsx](../../src/Rag.jsx)), no claves `t()`.
- **El paso de chat reusa `sendChatMessage`** ([openai.js](../../src/openai.js)) con `temperature: 0.2` fija: el modelo no sabe que hubo búsqueda — solo ve texto inyectado. Los paneles crudos **alternan entre `/v1/embeddings` y `/v1/chat/completions`** (misma lección de alternancia que `/mcp`: mirar el campo `url`).
- **Índice con detección de staleness**: el índice guarda la foto de la biblioteca (`docTexts` + `dims`); si el alumno edita un doc o cambia `dimensions`, la UI exige reindexar antes de preguntar.
- Puntos pedagógicos: el ranking se calcula client-side (la API embebe, no busca), el system default ordena responder SOLO desde los docs inyectados, y la tabla de usage muestra que indexar se paga una vez mientras que preguntar embebe solo la pregunta.
