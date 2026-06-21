# Arquitectura — La IA Cruda

UI pedagógica de chat que habla directo a OpenAI, Anthropic, Ollama y LM Studio desde el browser, exponiendo a la vista todo lo que el navegador suele esconder: el JSON crudo del request, el response sin parsear, el array `messages[]` que viaja, los tokens consumidos y un log paso a paso del proceso.

Este documento describe **cómo está armada la app**. Para el "porqué" pedagógico de cada decisión, ver [CLAUDE.md](../CLAUDE.md).

---

## 1. Stack

| Pieza | Versión | Para qué |
|---|---|---|
| React | 18.3 | UI |
| Vite | 5.4 | Dev server + bundler |
| @monaco-editor/react | 4.7 | Editor de código en `/editor`, `/loop-agentico`, `/agents-md*` |
| gpt-tokenizer | 3.4 | BPE de OpenAI (o200k_base / cl100k_base) corriendo 100% local en `/tokens` — sin API |
| `fetch` nativo | — | Todas las llamadas HTTP. No hay SDKs de provider. |

Sin TypeScript, sin lint, sin tests (hay un único `anthropic.test.js` suelto), sin formatter. Es deliberado: la idea es que el alumno lea código JS plano y vea el `fetch` crudo.

Scripts (todos vía Vite):

```
npm run dev      # vite, puerto 5173
npm run build    # bundle producción
npm run preview  # servir el build
```

---

## 2. Routing manual (sin react-router)

[vite.config.js](../vite.config.js) define un middleware `spaFallback` que reescribe a `/` cualquier URL sin extensión. El router corre entonces **en el browser**, en [App.jsx](../src/App.jsx): el state `page` se inicializa con una cadena de `if` sobre `window.location.pathname`, y más abajo una cadena equivalente de `if (page === …)` devuelve el componente de página. (Referenciar por nombre, no por línea: ambos bloques se mueven con cada feature.)

```
window.location.pathname → state `page` → if-chain → componente de página
```

[ModeSwitch.jsx](../src/ModeSwitch.jsx) renderiza el header con `<a href="/ruta">` (no `<Link>` ni `pushState`), forzando recarga completa. Esto es intencional: el alumno ve el `pathname` cambiar en la barra de direcciones y cada página arranca con state limpio salvo lo que vive en `localStorage`.

### Mapa de rutas

| Ruta | Componente | Modo |
|---|---|---|
| `/` | [App.jsx](../src/App.jsx) | Chat (3 modos de contexto + system editable + temperatura) |
| `/editor` | [Editor.jsx](../src/Editor.jsx) | Código + instrucción → respuesta |
| `/loop-agentico` | [LoopAgentico.jsx](../src/LoopAgentico.jsx) | Loop agéntico con tool-use |
| `/agents-md` | [EditorAgentsMd.jsx](../src/EditorAgentsMd.jsx) (`withSkills=false`) | Agente + AGENTS.md inyectado al system |
| `/agents-md-skills` | [EditorAgentsMd.jsx](../src/EditorAgentsMd.jsx) (`withSkills=true`) | Agente + AGENTS.md + tools `load_skill` / `run_skill_test` |
| `/ventana-contexto` | [VentanaContexto.jsx](../src/VentanaContexto.jsx) | FIFO / sliding window / compaction en vivo |
| `/prompt-injection` | [PromptInjection.jsx](../src/PromptInjection.jsx) | System vs datos no confiables |
| `/razonamiento` | [Razonamiento.jsx](../src/Razonamiento.jsx) | Razonadores: OpenAI (`reasoning.effort`), Claude (extended thinking) y LM Studio (`<think>` tags, streaming) |
| `/tokens` | [Tokens.jsx](../src/Tokens.jsx) | Tokenizer visual 100% local (BPE, IDs, bytes, costos) — sin API |
| `/logprobs` | [Logprobs.jsx](../src/Logprobs.jsx) | Probabilidad token por token (`logprobs` de OpenAI) |
| `/mcp` | [Mcp.jsx](../src/Mcp.jsx) | Inspector MCP: JSON-RPC paso a paso contra un server local de juguete |
| `/ruido` | [Ruido.jsx](../src/Ruido.jsx) | Context rot: misma tarea agéntica con y sin `tool_result` inflados |
| `/especificidad` | [Especificidad.jsx](../src/Especificidad.jsx) | Misma tarea agéntica con pedido vago vs pedido con criterios explícitos, verificada con checklist determinística |
| `/contexto` | [Contexto.jsx](../src/Contexto.jsx) | Vista en vivo del array `messages[]` del Chat |
| `/proveedores` | [Proveedores.jsx](../src/Proveedores.jsx) | Comparación OpenAI vs Claude |
| `/docs` | [Docs.jsx](../src/Docs.jsx) | Material de clase |
| `/como-funciona` | [ComoFunciona.jsx](../src/ComoFunciona.jsx) | Explicación guiada: las tres piezas de cada POST (system / context / user) |
| `/recorrido` | [Recorrido.jsx](../src/Recorrido.jsx) | Recorrido guiado para NO programadores: 6 paradas con metáfora + CTA "probalo de verdad" a cada lab. Prosa en [content/RecorridoBody.jsx](../src/content/RecorridoBody.jsx) |
| `/demo/chat` | [ModosChat.jsx](../src/ModosChat.jsx) | Comparador animado de los 3 modos del Chat (sin API) |
| `/demo/editor` | [ModosEditor.jsx](../src/ModosEditor.jsx) | Comparador animado de los 2 modos del Editor (sin API) |
| `/demo/loop` | [ComoEdita.jsx](../src/ComoEdita.jsx) | Demo de cómo la IA "edita código" vía `tool_use` (sin API) |
| `/demo/agents-md` | [ModosAgentsMd.jsx](../src/ModosAgentsMd.jsx) | Comparador AGENTS.md (sin API) |
| `/demo/agents-md-skills` | [ModosAgentsMdSkills.jsx](../src/ModosAgentsMdSkills.jsx) | Comparador AGENTS.md "fat" vs skill con test (sin API) |

### Agregar una ruta nueva

1. Crear el componente en `src/`.
2. En [App.jsx](../src/App.jsx), sumar el `if` en el inicializador del state `page` (mapea `pathname` → nombre de página) **y** el `if (page === …)` en el bloque de render condicional.
3. Agregar el link en [ModeSwitch.jsx](../src/ModeSwitch.jsx).

No introducir `react-router`. El routing crudo es parte del material didáctico.

---

## 3. Proveedores

Cuatro proveedores, todos llamados directo desde el browser con `fetch`. La key sale de `import.meta.env` — por eso **no se puede deployar con keys reales**: el bundle las expone.

| Proveedor | Endpoint | Estado del contexto | Wrapper chat | Wrapper agente |
|---|---|---|---|---|
| OpenAI classic | `POST api.openai.com/v1/chat/completions` | Cliente manda `messages[]` completo cada turno | [openai.js](../src/openai.js) (`sendChatMessage`) | [openai-agent.js](../src/openai-agent.js) (`runOpenAIAgent`) |
| OpenAI persistent | `POST /v1/responses` + `/v1/conversations` | Servidor (OpenAI), ID en `localStorage` | [openai.js](../src/openai.js) (`sendResponseMessage`) | — |
| Anthropic | `POST api.anthropic.com/v1/messages` | Stateless, browser-direct con `anthropic-dangerous-direct-browser-access:true` | [anthropic.js](../src/anthropic.js) (`sendClaudeMessage`) | [anthropic-agent.js](../src/anthropic-agent.js) (`runClaudeAgent`) |
| Ollama | `POST localhost:11434/api/chat` | Stateless, local, sin auth | [ollama.js](../src/ollama.js) (`sendOllamaMessage`) | — |
| LM Studio | `POST localhost:1234/v1/chat/completions` (shape OpenAI) | Stateless, local, header `Authorization` placeholder | [lmstudio.js](../src/lmstudio.js) (`sendLmStudioMessage`, streaming opcional vía `onToken`) | [lmstudio-agent.js](../src/lmstudio-agent.js) (`runLmStudioAgent`) |

**Nota Ollama:** el wrapper existe y funciona, pero el selector de proveedor del Chat hoy ofrece solo OpenAI / Anthropic / LM Studio. Quedan referencias a `provider === 'ollama'` en App.jsx que son código legado.

**Selector de modelo en el Chat:** [openai.js](../src/openai.js) y [anthropic.js](../src/anthropic.js) exportan `OPENAI_CHAT_MODELS` / `ANTHROPIC_CHAT_MODELS` y aceptan `model` como override opcional (fallback a la env var). La ConfigBar del Chat muestra un dropdown según el proveedor, persistido en `chat_model_openai` / `chat_model_anthropic`.

### Shape canónico

In-app **todo viaja en el shape de OpenAI**: `[{role: 'system'|'user'|'assistant', content: string}]`. La adaptación al wire-format ocurre en el borde del wrapper:

- **OpenAI / Ollama / LM Studio** lo aceptan tal cual.
- **Anthropic** separa `system` de `messages[]`. La conversión vive en `toAnthropicPayload` ([anthropic.js](../src/anthropic.js)): filtra los `role: 'system'` (los concatena con `\n\n`) y deja solo `user`/`assistant` en `messages`.

### Contrato del wrapper

Todos los wrappers — chat y agente — aceptan el mismo objeto de hooks de debug como segundo argumento:

```js
sendXxxMessage(messages, {
  onLog,          // (level, message) — alimenta el panel de log
  onRawRequest,   // (payload) — alimenta el panel "Request crudo"
  onRawResponse,  // (data)    — alimenta el panel "Response crudo"
  temperature,    // 0..2 (clampeado a [0,1] en Anthropic)
  model,          // override opcional del modelo (fallback a la env var)
})
```

Algunos wrappers suman **callbacks de streaming opcionales** sobre este contrato base — el contrato de hooks de debug se mantiene igual:

- [lmstudio.js](../src/lmstudio.js): `onToken(delta)` — si se pasa, el wrapper manda `stream: true` y parsea los chunks SSE. App.jsx lo usa en el Chat: agrega un placeholder de assistant y lo va completando token a token.
- Los wrappers de razonamiento con streaming (`lmstudio-reasoning.js`): `onTextChunk`, `onThinkingStart`, `onThinkingChunk`, `onThinkingEnd` (ver §7.5).

**Reglas críticas:**

- `onRawRequest` recibe el header `Authorization` **enmascarado** vía `maskKey()` (los primeros 7 y los últimos 4 caracteres). El `fetch` real usa la key entera. Nunca loguear la key completa.
- `temperature` default 0.7. Anthropic clampa a `[0, 1]` y registra el clamp en el log. Ollama la mete en `options.temperature` (no a nivel root).
- Si un wrapper agréga un campo nuevo (ej. `instructions` en `/v1/responses`), debe seguir respetando el contrato de hooks para que los paneles funcionen sin tocar UI.

### Variables de entorno

| Var | Default | Para qué |
|---|---|---|
| `VITE_OPENAI_API_KEY` | (requerido) | Bearer en `Authorization` |
| `VITE_OPENAI_MODEL` | `gpt-4o-mini` | Modelo OpenAI para Chat / Editor / Agentes (NO razonador) |
| `VITE_OPENAI_REASONING_MODEL` | `gpt-5-mini` | Modelo default de `/razonamiento` (también editable desde la UI). Debe ser un razonador: `gpt-5*`, `o1*`, `o3*`, `o4*` |
| `VITE_ANTHROPIC_API_KEY` | (requerido) | `x-api-key` |
| `VITE_ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` | Modelo Claude para Chat (Haiku no razona) |
| `VITE_ANTHROPIC_REASONING_MODEL` | `claude-sonnet-4-5` | Modelo default de `/razonamiento` lado Claude. Debe soportar extended thinking (Sonnet 3.7+, Opus 4+) |
| `VITE_OLLAMA_HOST` | `http://localhost:11434` | Host Ollama |
| `VITE_OLLAMA_MODEL` | `gemma3:4b` | Modelo Ollama |
| `VITE_LMSTUDIO_HOST` | `http://localhost:1234` | Host LM Studio (también editable desde UI) |
| `VITE_LMSTUDIO_MODEL` | `''` | Modelo LM Studio (también seleccionable desde UI) |

### Gotchas

- **Anthropic CORS** funciona porque mandamos `anthropic-dangerous-direct-browser-access: true`. Sin ese header, el browser rebota.
- **Ollama CORS** suele bloquear el browser. Arrancar con `OLLAMA_ORIGINS=* ollama serve`.
- **LM Studio "Model reloaded"**: cuando LM Studio recarga el modelo en mitad de un request (Auto-Evict), devuelve `{"error":"Model reloaded."}` a veces con HTTP 200. [lmstudio.js](../src/lmstudio.js) detecta el caso y reintenta una vez (solo en modo bloqueante; el retry no aplica al streaming). Si persiste, hay que desactivar Auto-Evict en LM Studio.
- **LM Studio sin modelo**: si no hay modelo en `localStorage.lmstudio_model` ni en `VITE_LMSTUDIO_MODEL`, el wrapper falla rápido con mensaje claro y orienta al botón "Detectar" de la `ConfigBar`.

---

## 4. Modos de contexto del Chat (`/`)

El Chat soporta **tres modos mutuamente excluyentes**, controlados por el segmented control de [App.jsx](../src/App.jsx) (states `rawMode` / `persistentMode`). La lógica de envío vive en `handleSend`, en el mismo archivo.

### Crudo (`rawMode = true`)
Cada turno se manda `system + último user message`, sin historial previo. Tanto el assistant como el client se "olvidan" entre turnos. Demuestra: **la API no tiene memoria**. El system editable sigue viajando, así que la "personalidad" se mantiene.

### Conversación (`rawMode = false`, `persistentMode = false`)
El cliente acumula `messages[]` en React state y lo reenvía completo en cada request. Es el modelo mental por defecto del alumno: "el assistant me recuerda" — pero el panel de contexto deja claro que la memoria está en el cliente, no en el servidor.

### Persistente (`persistentMode = true`)
**Solo OpenAI.** Forzado a `off` cuando `provider !== 'openai'`. Usa `/v1/responses` + Conversations API:
- Primer turno: `POST /v1/conversations` → guarda el `id` en `localStorage.openai_conversation_id`.
- Turnos siguientes: `POST /v1/responses` con `{conversation, input, instructions}`. El cliente solo manda el último user message.
- El system viaja como `instructions` (no como `messages[0]`).
- Botón "↻ refrescar" lee el historial real con `GET /v1/conversations/{id}/items`.
- Botón "↻ nueva conv. servidor" descarta el ID local y crea uno nuevo en el próximo envío.

### Modo Ruido (transversal)
`applyNoise` ([noise.js](../src/noise.js)) inyecta relleno determinista al final del último `user` message. La cantidad de párrafos crece con cada turno (`fillersForTurn`). PRNG: mulberry32 sembrado con `seed + turnIndex * 31` — la misma intensidad + seed produce siempre el mismo ruido. **El system y los turnos previos quedan intactos.**

Para agentes existe `bloatToolResult` (mismo archivo): infla cada `tool_result` con líneas de log falsas (`[INFO] reconciling internal cache state…`). Es la causa #1 real de que un agente "se pierda" después de varios pasos. Los tres wrappers agénticos aceptan `noise: {enabled, seed, intensity}` y emiten `onNoise(stats)` por cada tool_result inflado.

Ambas funciones se ejercitan desde el lab [`/ruido`](#79-ruido-en-el-contexto-ruido) (controles de seed e intensidad en su ConfigBar). El toggle "Ruido en instrucciones" de `/loop-agentico` es otra cosa: solo muestra prompts sugeridos ambiguos, no toca el payload.

---

## 5. System prompt editable

[SystemEditor.jsx](../src/SystemEditor.jsx) es un componente plegable compartido por Chat, Editor, Loop Agéntico y Ventana de Contexto. Cada modo lo monta con sus propios defaults y presets.

| Modo | Default + presets | Storage |
|---|---|---|
| Chat (`/`) | `CHAT_DEFAULT_SYSTEM` + `CHAT_PRESETS` ([system-presets.js](../src/system-presets.js)): pirata, JSON estricto, profesor sarcástico, solo emojis | `chat_system_prompt`, `chat_system_open` |
| Editor (`/editor`) | `EDITOR_DEFAULT_SYSTEM` + `EDITOR_PRESETS`: sobre-comentado, lunfardo, paranoico de seguridad, minimalista | `editor_system_prompt`, `editor_system_open` |
| Loop Agéntico (`/loop-agentico`) | `AGENT_SYSTEM_PROMPT` ([agent-tools.js](../src/agent-tools.js)) + `AGENT_PRESETS` inline en `LoopAgentico.jsx`: rápido, paranoico, narrador | `agente_system_override`, `agente_system_open` |
| Ventana de contexto (`/ventana-contexto`) | `CHAT_DEFAULT_SYSTEM` + `CHAT_PRESETS` | `ctxwin_system_prompt`, `ctxwin_system_open` |

**Reglas para extender:**

- Si el alumno deja el textarea vacío, mandar el default — nunca string vacío. Validar con `.trim()`.
- En Chat: los tres modos respetan el system. La diferencia es el historial (Crudo no acumula, Conversación sí en cliente, Persistente sí en servidor).
- En Chat persistente: el system viaja como `instructions` a `/v1/responses`, NO como `messages[0]`.

---

## 6. Agentes (loop function-calling)

### Arquitectura común

[agent-tools.js](../src/agent-tools.js) define **un único set de herramientas neutras** que cada wrapper adapta al shape de su API:

```
agent-tools.js (defs neutras)
   │
   ├─ getAgentToolDefs({ includeImpact, includeSkills }) → array de {name, description, parameters}
   ├─ runAgentTool(name, input, state) → {result, isError}
   ├─ AGENT_SYSTEM_PROMPT (prompt base)
   ├─ buildSkillsIndex(skills) (índice corto para el system)
   └─ NEEDS_HUMAN_APPROVAL (sentinel para pausar el loop)
```

Cada wrapper agéntico (`*-agent.js`) traduce el shape:

| Wrapper | Tools shape |
|---|---|
| `anthropic-agent.js` | `{name, description, input_schema}`; respuesta en `content[]` con `tool_use` blocks; resultados en `role:'user'` con bloques `tool_result` |
| `openai-agent.js` | `{type:'function', function:{name, description, parameters}}`; respuesta en `tool_calls[]` con `arguments` **como string JSON** (hay que `JSON.parse`); resultados como mensajes `role:'tool'` con `tool_call_id` |
| `lmstudio-agent.js` | Igual que OpenAI (LM Studio expone shape compatible) |

### Herramientas disponibles

| Tool | Para qué | Disponible en |
|---|---|---|
| `read_code` | Devuelve el código actual completo | Siempre |
| `edit_code` | Reemplaza un fragmento (`old_string` → `new_string`); valida que `old_string` aparezca exactamente una vez | Siempre |
| `assess_impact` | Pide al humano que apruebe un plan antes de editar; usa el sentinel `NEEDS_HUMAN_APPROVAL` | Opt-in (`requireImpactApproval`) |
| `load_skill` | Trae el body markdown de un skill a contexto; el body NO viaja en el system inicial | Solo `/agents-md-skills` |
| `run_skill_test` | Corre un test JS determinístico sobre el código (regex sobre código Java); devuelve PASS o violaciones concretas | Solo `/agents-md-skills` |

### Loop

Pseudocódigo común a los tres wrappers (`anthropic-agent.js`, `openai-agent.js`, `lmstudio-agent.js`):

```
mientras iter < maxIterations:
  POST API con system + messages + tools
  si stop_reason !== 'tool_use' (Anthropic) o finish_reason !== 'tool_calls' (OpenAI/LM Studio):
    extraer texto final, break
  para cada tool_use:
    result = runAgentTool(name, input, state)
    si noise.enabled: result = bloatToolResult(result, ...)
    push tool_result al messages[]
  iter += 1
```

`state` es el objeto compartido entre llamadas:
```js
{
  getCode(), setCode(next),         // archivo virtual único
  approved, requireImpactApproval,  // gating por assess_impact
  awaitApproval(payload),           // async, dispara UI human-in-the-loop
  skills, loadedSkillIds,           // tracking de skills cargados
}
```

### Human-in-the-loop

`assess_impact` devuelve `NEEDS_HUMAN_APPROVAL` (Symbol). El wrapper detecta el sentinel y llama a `state.awaitApproval(payload)`, que la UI implementa mostrando un modal. Si el humano cancela, el siguiente `edit_code` falla porque `state.approved === false`.

### Skills (lazy-loading)

Patrón clave en `/agents-md-skills`:

1. **El AGENTS.md** solo lista skills disponibles (id + descripción corta + flag `[test ✓]`) vía `buildSkillsIndex`. **Los bodies NO viajan en el system inicial.**
2. **La IA decide** llamar a `load_skill(id)` cuando juzga que un skill aplica al pedido. Recién ahí el body markdown completo entra al contexto.
3. **Si el skill tiene test** (registry en [skill-tests.js](../src/skill-tests.js)), después de cada `edit_code` y antes de terminar la corrida la IA debe correr `run_skill_test(id)`. El test es código JS que evalúa el código (regex sobre Java) y devuelve `PASS` o lista de violaciones concretas.

Pedagógicamente importa que `load_skill` (prompt) y `run_skill_test` (código verificable) estén separadas: muestra la diferencia entre "instrucciones que la IA lee" e "instrucciones que la IA ejecuta y obedece bajo penalidad de FAIL".

### Continuación de conversación agéntica

Los wrappers aceptan `previousMessages` para retomar una conversación. `LoopAgentico` persiste el thread en `localStorage.agente_context_thread` y lo pasa en cada nueva instrucción.

---

## 7. Ventana de contexto (`/ventana-contexto`)

Lógica pura en [context-window.js](../src/context-window.js). Tres estrategias para podar `messages[]` cuando supera un límite de tokens:

| Estrategia | Función | Qué hace |
|---|---|---|
| **FIFO** | `applyFifo(messages, limitTokens)` | Saca mensajes del más viejo al más nuevo hasta entrar en el límite. Puede cortar a mitad de turno. |
| **Sliding window** | `applySlidingWindow(messages, maxTurns)` | Conserva los últimos N turnos completos (turno = user + assistant). |
| **Compaction** | `applyCompaction(messages, limitTokens, summarizerFn)` | Toma los 2 turnos más nuevos como "frescos", pide a la IA un resumen del resto, lo inyecta como `role:'user'` con prefijo `[RESUMEN PREVIO]:`. Si aún se pasa, fallback a FIFO. |

**Invariante crítico:** `messages[0]` con `role:'system'` **nunca** se toca. El system editable siempre debe llegar al modelo, aunque el resto se pode.

`summarizerFn` se inyecta para no acoplar el módulo a ningún provider. `VentanaContexto.jsx` arma uno usando el provider activo del Chat.

`annotateMessages(full, trimmed)` etiqueta cada mensaje del array completo con `inRequest: bool` para que la UI pinte cuáles viajan y cuáles quedan fuera.

---

## 7.5. Razonamiento (`/razonamiento`)

Experimento aislado para que el alumno vea cómo los **modelos razonadores** "piensan" antes de responder y, sobre todo, cómo cada proveedor decide qué exponer y qué esconder.

Soporta **tres proveedores en la misma página** con selector arriba — la idea es que el alumno pruebe la misma pregunta con todos y vea el contraste:

| Proveedor | Wrapper | Endpoint | Qué expone | Control |
|---|---|---|---|---|
| OpenAI | [openai-reasoning.js](../src/openai-reasoning.js) | `POST /v1/responses` | Solo **resumen** opcional del razonamiento (`output[].type:'reasoning'`, `summary[]`). El crudo nunca sale. A veces el resumen llega vacío. | `reasoning.effort` (minimal/low/medium/high) + `reasoning.summary` (auto/concise/detailed) |
| Anthropic | [anthropic-reasoning.js](../src/anthropic-reasoning.js) | `POST /v1/messages` | El **thinking entero**, en texto plano, dentro de `content[].type:'thinking'`. Cada bloque firmado (`signature`). | `thinking.budget_tokens` (mapeado desde el mismo `effort`: 1k/2k/5k/12k) |
| LM Studio | [lmstudio-reasoning.js](../src/lmstudio-reasoning.js) | `POST localhost:1234/v1/chat/completions` (shape OpenAI) | El **thinking entero** que el modelo local (DeepSeek-R1, QwQ, Qwen3, etc.) emite dentro de `<think>...</think>` en el propio texto. No es un campo de la API: el wrapper lo separa con un parser de streaming (`ThinkStreamParser`) que tolera etiquetas partidas entre chunks. | Ninguno nativo: `effort` se acepta y se loguea pero no viaja al server. `max_tokens: 16384` fijo. |

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

## 7.6. Logprobs (`/logprobs`)

Experimento aislado para mostrar que **la IA es un predictor de tokens**: la respuesta se renderiza token por token, cada uno coloreado por la probabilidad que el modelo le asignó, y al tocar un token se ven las alternativas (`top_logprobs`) que el modelo consideró en ese paso.

- Wrapper: [openai-logprobs.js](../src/openai-logprobs.js) (`sendLogprobsMessage`). Mismo contrato de hooks de debug que el resto.
- Endpoint: `POST /v1/chat/completions` con `logprobs: true` y `top_logprobs: N` (selector en la UI, 3–20).
- **Solo OpenAI**: Anthropic no expone logprobs en su API — la página lo dice explícitamente (decisión de producto, mismo contraste pedagógico que en `/razonamiento`). Los razonadores de OpenAI (gpt-5, o-*) tampoco devuelven logprobs, por eso el selector reusa `OPENAI_CHAT_MODELS`.
- El wrapper devuelve shape propio para que la UI no parsee el response: `{text, tokens: [{token, logprob, prob, alternatives}], usage, raw}`. `prob = Math.exp(logprob)`.
- `max_tokens: 300` fijo en el wrapper: con logprobs el response crece rápido (cada token viaja con sus N alternativas) y para la clase alcanzan respuestas cortas.
- La temperatura conecta con la lección de sampling: con temperatura alta el token elegido puede no estar en el top-N, y la UI lo señala.
- Espacios y saltos de línea se muestran como `␣` y `⏎` — son parte del token.

## 7.7. MCP (`/mcp`)

Experimento aislado para entender el **Model Context Protocol** desde el JSON: un inspector que habla JSON-RPC 2.0 a mano contra un servidor MCP de juguete que corre local.

### Piezas

| Pieza | Archivo | Qué hace |
|---|---|---|
| Server de juguete | [servidor-mcp/server.js](../servidor-mcp/server.js) | Node puro, sin deps ni SDK. `npm run mcp` → escucha en `http://localhost:3100/mcp`. Implementa `initialize`, `notifications/initialized`, `tools/list`, `tools/call` y `ping` sobre HTTP (transporte Streamable HTTP mínimo, sin SSE ni sesiones). CORS abierto. |
| Cliente | [mcp-client.js](../src/mcp-client.js) | `mcpInitialize`, `mcpListTools`, `mcpCallTool`. Mismo contrato de hooks `{onLog, onRawRequest, onRawResponse}` que el resto de los wrappers. Sin key (server local sin auth). |
| Agente | [mcp-agent.js](../src/mcp-agent.js) | `runMcpAgent({provider, task, host, mcpTools, system})` — loop tool-use (OpenAI o Claude) donde las tool defs salen del `tools/list` y la ejecución es `mcpCallTool` por HTTP. Conversores `toOpenAITools` / `toAnthropicTools` exportados. |
| UI | [Mcp.jsx](../src/Mcp.jsx) | Stepper de 4 pasos: handshake → descubrimiento → invocación manual con formulario generado desde el `inputSchema` → loop agéntico con timeline modelo/server. |

### Tools del server de demo

`get_clima` (falso, determinista por hash de ciudad), `cotizacion_dolar` (falso), `guardar_nota` / `leer_notas` (estado **en memoria del proceso del server** — se pierde al reiniciar; ese es el punto pedagógico: las tools MCP pueden tener estado del lado del servidor).

### Puntos pedagógicos clave

- **En los pasos 1–3 no participa ningún modelo de IA.** MCP es una conversación cliente ↔ servidor de tools; el alumno hace de "modelo" eligiendo la tool y armando los argumentos a mano.
- Los `inputSchema` de `tools/list` son **JSON Schema** — el mismo formato de las tool defs de OpenAI/Anthropic. La conversión al shape del proveedor es un renombre de campos (`toOpenAITools` / `toAnthropicTools` en `mcp-agent.js`).
- **Paso 4 (loop agéntico)**: el modelo (OpenAI o Claude, mismo loop que §6) recibe las tools descubiertas y cuando emite `tool_use`, el cliente ejecuta `tools/call` contra el server. Los hooks de debug se comparten, así que los paneles de request/response **alternan entre la API del modelo (con key enmascarada) y el server MCP (sin key)** — esa alternancia es la lección central: el modelo nunca habla con el server. Modelos: `VITE_OPENAI_MODEL` / `VITE_ANTHROPIC_MODEL` (los mismos del Chat). Errores de `tools/call` vuelven al modelo como tool_result con error para que pueda recuperarse.
- Errores en dos niveles: error **de protocolo** (`error.code` JSON-RPC, ej. tool inexistente → `-32602`) vs error **de ejecución** (`result.isError: true`, pensado para que el modelo lo lea y reaccione).
- El transporte stdio (Claude Desktop / Claude Code) no se implementa: desde un browser no se puede spawnear procesos. La página y el README lo aclaran.

### Reglas al extender

- El JSON-RPC vive **solo** dentro de `mcp-client.js`; hacia la UI salen objetos planos (`{text, isError, content}`).
- El server de juguete se mantiene **sin dependencias** — un solo archivo legible es parte del material.

## 7.8. Tokens (`/tokens`)

Experimento aislado para mostrar **qué es un token antes de hablar de predecirlos**: el alumno pega texto y lo ve partirse en tokens en vivo, con los IDs numéricos que realmente viajan al modelo. En el orden de la clase va **antes** de `/logprobs` (primero "el texto se convierte en piezas", después "el modelo predice la próxima pieza").

- **No hay wrapper ni API**: la tokenización corre entera en el browser con [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) (el BPE real de OpenAI). Por eso la página tiene 2 paneles y no 3 — no hay log porque no hay proceso que loguear. Es la única página de la app sin contrato de hooks, y es deliberado.
- **Dos encodings seleccionables**: `o200k_base` (gpt-4o/gpt-5) y `cl100k_base` (gpt-4/3.5). La UI muestra el conteo en ambos para que se vea que el tokenizer es parte del modelo, no del texto.
- **Token seleccionado**: texto, ID, bytes UTF-8. Si el token corta un carácter multi-byte (emoji), `decode([id])` da `�` y la UI lo explica.
- **Tabla de costos**: precio de lista por 1M de tokens de input × tokens del texto, por request y ×1.000 requests. Para los modelos de Anthropic el conteo es aproximado (tokenizer no público) y la tabla lo aclara con asterisco — el exacto lo da `/v1/messages/count_tokens`.
- Reusa el lenguaje visual de `/logprobs` (`lp-strip`, `lp-token`, `␣`/`⏎`) a propósito, pero con colores alternados sin significado — la página aclara la diferencia.
- Presets pedagógicos: castellano vs inglés (el castellano gasta más tokens), números (se parten arbitrariamente — por eso la aritmética falla), palabras largas, emojis, código.

## 7.9. Ruido en el contexto (`/ruido`)

Lab de **context rot reproducible**: corre la misma tarea agéntica dos veces — una limpia y otra con cada `tool_result` inflado por `bloatToolResult` ([noise.js](../src/noise.js)) — y compara iteraciones, tokens enviados por request y respuesta final. Es la demo en vivo de lo que [`/contexto#loop`](../src/Contexto.jsx) explica en teoría.

- **Reusa los tres wrappers agénticos** ([openai-agent.js](../src/openai-agent.js), [anthropic-agent.js](../src/anthropic-agent.js), [lmstudio-agent.js](../src/lmstudio-agent.js)) pasándoles `noise: {enabled, seed, intensity}`; las stats por tool_result llegan vía el callback `onNoise`.
- **Determinismo visible**: seed e intensidad en la ConfigBar. Mismo seed + intensidad = mismo ruido, así las corridas son comparables (mulberry32, ver §4 Modo Ruido).
- **Vista previa sin API**: un `tool_result` de muestra coloreado señal vs relleno, con slider de turno para ver que el ruido crece por iteración.
- **Toggle "inflar también la instrucción"**: usa `applyNoise` ([noise.js](../src/noise.js)) sobre el user message — el tercer sabor de ruido (el que mete el propio usuario).
- El código inicial y la tarea son fijos por diseño: la única variable del experimento es el ruido. No persiste historial entre corridas.

## 7.10. Especificidad del pedido (`/especificidad`)

Lab espejo de `/ruido`, pero sobre el **mensaje del humano**: corre la misma tarea agéntica dos veces — una con un pedido vago ("agregale que se pueda sacar plata") y otra con un pedido que lleva los criterios de éxito adentro — y verifica **ambos** códigos finales contra la misma checklist determinística. La lección: la IA no lee tu mente, lee tu pedido; los criterios que no viajan en el prompt quedan librados al azar.

- **Reusa los tres wrappers agénticos** ([openai-agent.js](../src/openai-agent.js), [anthropic-agent.js](../src/anthropic-agent.js), [lmstudio-agent.js](../src/lmstudio-agent.js)) sin ruido. Usa el `code` final que devuelve el wrapper.
- **La checklist (`CRITERIA`, inline en [Especificidad.jsx](../src/Especificidad.jsx))** representa "lo que el humano quería de verdad": funciones `test(code)` con regex sobre el código Java final, mismo espíritu que [skill-tests.js](../src/skill-tests.js). Se muestra ANTES de correr, para que el alumno compare cuántos criterios viajan en cada prompt.
- **Los dos prompts son editables** (persistidos en localStorage) — el docente puede armar sus propias variantes. El código inicial es fijo: la única variable del experimento es la especificidad del pedido.
- **Veredicto** cuando hay dos corridas: criterios cumplidos (X/5 → Y/5), iteraciones y tokens enviados. El copy invita a correr la vaga varias veces para ver que su resultado es lotería, mientras la específica es estable.
- Pedagógicamente cierra el triángulo con `/ruido` (ruido en tool_results) y el toggle de instrucción inflada (ruido del usuario): acá el problema no es exceso de contexto sino **falta de contexto** — criterios implícitos.

---

## 8. Diagrama de flujo (Chat — modo Conversación)

```
┌────────────────────┐
│  App.jsx           │
│  ─ messages[]      │
│  ─ systemPrompt    │
│  ─ temperature     │
│  ─ provider        │
└─────────┬──────────┘
          │ handleSend()
          ▼
┌────────────────────────────────┐
│  payload = [                   │
│    {role:'system', content},   │
│    ...messages,                │
│    {role:'user', content:text} │
│  ]                             │
└─────────┬──────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  sendFn por provider:                       │
│    openai     → src/openai.js               │
│    anthropic  → src/anthropic.js            │
│      └─ toAnthropicPayload(messages)        │
│         (extrae system, deja user/assist)   │
│    ollama     → src/ollama.js               │
│    lmstudio   → src/lmstudio.js             │
└─────────┬───────────────────────────────────┘
          │
          ▼  hooks de debug
┌─────────┼───────────────────────────────────┐
│         ▼                                   │
│   onRawRequest(payload con key enmascarada) │──→ Panel "Request crudo"
│   onLog('send', `POST ${url}`)              │──→ Panel "Log"
│   fetch(url, {... key real ...})            │
│   onRawResponse(data)                       │──→ Panel "Response crudo"
│   onLog('info', `tokens ...`)               │──→ Panel "Log"
│         │                                   │
│         ▼                                   │
│   return reply (string)                     │
└─────────┬───────────────────────────────────┘
          │
          ▼
   setMessages([...messages, user, assistant])
          │
          ▼
   localStorage.chat_context_snapshot
   (la página /contexto lo lee via storage event)
```

---

## 9. localStorage — claves activas

Cada modo persiste su propio estado para no pisarse con los otros.

### Chat (`/`)

| Key | Contenido |
|---|---|
| `chat_context_snapshot` | `{messages, updatedAt}` — leído por `/contexto` con `storage` events para sync entre tabs |
| `chat_logs` | Log capado a `LOGS_MAX = 500` líneas |
| `openai_conversation_id` | ID de la conversación persistente en OpenAI |
| `chat_provider` | `'openai' \| 'anthropic' \| 'lmstudio'` (compartido entre modos; un `'ollama'` guardado de versiones viejas se descarta) |
| `chat_model_openai` | Modelo OpenAI elegido en el dropdown del Chat (fallback a `VITE_OPENAI_MODEL`) |
| `chat_model_anthropic` | Modelo Claude elegido en el dropdown del Chat (fallback a `VITE_ANTHROPIC_MODEL`) |
| `chat_system_prompt` | System editable del Chat |
| `chat_system_open` | Estado plegado del editor de system |
| `chat_temperature` | Slider 0–2, default 0.7 |

### Editor (`/editor`)

`code`, `lang`, `keep_context`, `history`, `cols`, logs, `editor_system_prompt`, `editor_system_open`.

### Loop Agéntico (`/loop-agentico`)

`agente_context_thread` (retomar conversación), `agente_code_snapshot`, `agente_language`, `agente_logs`, `agente_cols`, `agente_system_override`, `agente_system_open`.

### AGENTS.md (`/agents-md*`)

`agentmd_code_snapshot`, `agentmd_agents_md_v4`, `agentmd_skills_v1`, `agentmd_logs`, `agentmd_cols`.

### Ventana de contexto (`/ventana-contexto`)

`ctxwin_messages`, `ctxwin_strategy`, `ctxwin_limit_tokens`, `ctxwin_window_turns`, `ctxwin_provider`, `ctxwin_system_prompt`, `ctxwin_system_open`, `ctxwin_temperature`, `ctxwin_logs`.

### Razonamiento (`/razonamiento`)

`razon_provider`, `razon_model_openai`, `razon_model_anthropic`, `razon_effort`, `razon_summary`, `razon_instructions`, `razon_logs`.

### Logprobs (`/logprobs`)

`logprobs_model`, `logprobs_temperature`, `logprobs_top`, `logprobs_system`, `logprobs_logs`.

### Tokens (`/tokens`)

`tokens_text`, `tokens_encoding`.

### MCP (`/mcp`)

`mcp_host`, `mcp_logs`, `mcp_provider`, `mcp_agent_system`.

### Ruido (`/ruido`)

`ruido_provider`, `ruido_seed`, `ruido_intensity`.

### Especificidad (`/especificidad`)

`espec_provider`, `espec_prompt_vago`, `espec_prompt_especifico`.

### LM Studio

`lmstudio_host`, `lmstudio_model`.

---

## 10. Convenciones para extender

Tomado de [CLAUDE.md](../CLAUDE.md), repetido acá porque toca arquitectura:

- **Copy en castellano rioplatense.** La UI es material de clase.
- **Nunca loguear/mostrar la key completa.** Usar siempre `maskKey()` del wrapper correspondiente. El `fetch` real usa la key entera; el `onRawRequest` muestra solo la enmascarada.
- **Integraciones nuevas** (chat o agente) exponen el mismo `{onLog, onRawRequest, onRawResponse}` para que los paneles sigan funcionando sin tocar UI.
- **Shape canónico OpenAI** (`{role, content}`) como representación in-app. Adaptar en el borde del wrapper, como hace `toAnthropicPayload`.
- **Sin react-router.** Routing manual en [App.jsx](../src/App.jsx) (if-chain sobre `pathname`, ver §2) + [ModeSwitch.jsx](../src/ModeSwitch.jsx). Es deliberado para que el alumno vea el `pathname` crudo.
- **Proveedores agénticos nuevos:** seguir el contrato de [agent-tools.js](../src/agent-tools.js) (defs neutras + `runAgentTool`) y respetar el sentinel `NEEDS_HUMAN_APPROVAL` para human-in-the-loop.
- **Sin tests/lint/TS/formatter.** No agregar pipeline sin hablarlo — la simplicidad del setup es parte del material.
- **Copy bilingüe ES/EN vía `t()`.** Texto visible nuevo no se hardcodea: se agrega como clave en [es.js](../src/i18n/es.js) (base de verdad, rioplatense) + [en.js](../src/i18n/en.js), y se usa con `t('namespace.clave')`. (Ver §11.)

---

## 11. i18n (ES/EN)

i18n minimalista **sin librería** — coherente con "la simplicidad es el material". Tres piezas en [src/i18n/](../src/i18n/):

| Pieza | Archivo | Qué hace |
|---|---|---|
| Provider + lógica | [LanguageContext.jsx](../src/i18n/LanguageContext.jsx) | Context con `{ lang, setLang, t }`. `lang` se inicializa desde `localStorage.lang` (default `'es'`). `setLang` persiste y setea `document.documentElement.lang`. `t(key, vars?)` resuelve la ruta con puntos (`'chat.send'`), interpola `{var}`, y cae a ES si falta la clave en EN, o a la propia key si falta en ambos (visible = falta traducir). |
| Hook | [useT.js](../src/i18n/useT.js) | `const { t, lang, setLang } = useT()`. |
| Diccionarios | [es.js](../src/i18n/es.js) / [en.js](../src/i18n/en.js) | Objetos anidados por namespace de componente (`app.*`, `modeswitch.*`, `temp.*`, `welcome.*`, …). ES es la base de verdad. |

- **Montaje**: `<LanguageProvider>` envuelve `<App/>` en [main.jsx](../src/main.jsx).
- **Toggle**: [LanguageToggle.jsx](../src/LanguageToggle.jsx) (botones ES|EN), montado dentro de [ModeSwitch.jsx](../src/ModeSwitch.jsx) → aparece en el header de **todas** las páginas. Como la navegación fuerza recarga completa, el idioma sobrevive vía `localStorage.lang` sin tocar la cadena de routing por `pathname`.
- **Bits funcionales lang-aware** (no son solo chrome):
  - System prompts / presets: [system-presets.js](../src/system-presets.js) expone `getChatDefaultSystem(lang)`, `getChatPresets(lang)`, `getEditorDefaultSystem(lang)`, `getEditorPresets(lang)` + helpers `isDefaultChatSystem` / `isDefaultEditorSystem`. Los exports ES sin sufijo se mantienen por compatibilidad. El default EN pide responder en inglés.
  - **Swap de default al cambiar idioma**: si el system actual es todavía un default (de cualquier idioma) o está vacío, App.jsx lo swapea al default del nuevo idioma; si el alumno lo personalizó, se respeta (regla `.trim()` intacta).
  - `appendLog` formatea el timestamp con `en-US`/`es-AR` según `lang`.
- **Cobertura actual (Fase 1)**: infra + chrome interactivo del Chat ([App.jsx](../src/App.jsx)) y todos los componentes compartidos. Pendiente (Fase 2): la prosa larga de [Docs.jsx](../src/Docs.jsx), [ComoFunciona.jsx](../src/ComoFunciona.jsx), demos y los párrafos explicativos de cada lab — recomendado migrarlos como **módulos de contenido por idioma** (no como miles de claves `t()`).

---

## 12. Recorrido para no programadores (`/recorrido`) + lector TTS

Página narrada pensada como **puerta de entrada para profesionales no técnicos** que ya usan IA en el trabajo y quieren intuición sobre por qué falla, alucina o "se olvida". No es una versión simplificada de la app: es la **misma verdad** contada con metáforas, y cada parada termina con un botón "probalo de verdad" ([TryModeCTA.jsx](../src/TryModeCTA.jsx)) que lleva al lab real.

### Estructura

Mismo patrón que `/como-funciona` (§route map): el andamiaje (header + TOC con scroll-spy vía `IntersectionObserver`) vive en [Recorrido.jsx](../src/Recorrido.jsx); la prosa vive en **módulos de contenido por idioma** [content/RecorridoBody.jsx](../src/content/RecorridoBody.jsx) (`RecorridoBodyEs` / `RecorridoBodyEn`), elegidos por `lang`. Los `id` de sección son anclas internas, **idénticas en ambos idiomas**. Las 6 paradas: predictor de tokens → tokens → memoria (carta nueva) → ventana de contexto → especificidad → ruido, cada una con su CTA a `/logprobs`, `/tokens`, `/` (modo Crudo), `/ventana-contexto`, `/especificidad`, `/ruido`.

Navegación: link en el dropdown **Docs** de [ModeSwitch.jsx](../src/ModeSwitch.jsx) (primer anexo) y en [DocsNav.jsx](../src/DocsNav.jsx).

### Lector text-to-speech

[SpeechReader.jsx](../src/SpeechReader.jsx) permite **escuchar** el recorrido. Usa la **Web Speech API nativa** del browser (`window.speechSynthesis`) — sin librería ni API externa, coherente con "la simplicidad es el material". Montado en el `aside` sticky del sidebar (queda visible al scrollear).

Cómo funciona:

- **Trocea por fragmento**: lee los `h2`/`p`/`li` que cuelgan de `containerSelector` (`.docs-main`) en orden de DOM, **un `SpeechSynthesisUtterance` por elemento**. Trocear así evita el bug de Chrome que corta los utterances largos (~15s) y permite **resaltar** (clase `.speech-reading`) y auto-scrollear el fragmento en curso.
- **Voz por idioma**: `pickVoice` prioriza `es-AR` → LatAm → cualquier `es-*` en español, y `en-US` → cualquier `en-*` en inglés. Las voces llegan async en varios browsers → se escucha `voiceschanged`. Caveat: las voces dependen del SO; si no hay voz del idioma instalada, el SO puede caer a otra.
- **Saca emojis** del texto que va al motor (`stripEmoji`, vía `\p{Extended_Pictographic}`) para no leerlos en voz alta; el resaltado visual los conserva.
- **Controles**: play/pause/resume (`speechSynthesis.pause()`/`.resume()`), stop, y selector de velocidad (`rate`, 0.8×–1.5×).
- **Robustez de callbacks**: un `sessionRef` (contador) invalida los `onend`/`onstart` de utterances viejos tras un stop/cambio de idioma, para que `cancel()` no dispare la cadena `speakFrom` siguiente. Se hace `hardStop()` al desmontar y al cambiar `lang` (el texto en pantalla cambió).
- **No persiste nada** en `localStorage` (estado efímero de reproducción). Si el browser no soporta `speechSynthesis`, muestra un aviso (`speech.unsupported`) en vez de un botón muerto.

i18n: namespace `speech.*` en [es.js](../src/i18n/es.js) / [en.js](../src/i18n/en.js). Estilos: bloque `.speech-reader` + `.speech-reading` en [styles.css](../src/styles.css).
