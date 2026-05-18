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

[vite.config.js](../vite.config.js) define un middleware `spaFallback` que reescribe a `/` cualquier URL sin extensión. El router corre entonces **en el browser**, en [App.jsx:85-97](../src/App.jsx#L85-L97):

```
window.location.pathname → switch → componente de página
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
| `/razonamiento` | [Razonamiento.jsx](../src/Razonamiento.jsx) | Modelos razonadores de OpenAI con `reasoning_effort` |
| `/contexto` | [Contexto.jsx](../src/Contexto.jsx) | Vista en vivo del array `messages[]` del Chat |
| `/proveedores` | [Proveedores.jsx](../src/Proveedores.jsx) | Comparación OpenAI vs Claude |
| `/criollo` | (página presentacional) | Glosario de la API en lunfardo |
| `/docs` | [Docs.jsx](../src/Docs.jsx) | Material de clase |

### Agregar una ruta nueva

1. Crear el componente en `src/`.
2. Sumar el case al `switch` de `page` en [App.jsx:85-97](../src/App.jsx#L85-L97) y al render condicional en [App.jsx:320-346](../src/App.jsx#L320-L346).
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
| LM Studio | `POST localhost:1234/v1/chat/completions` (shape OpenAI) | Stateless, local, header `Authorization` placeholder | [lmstudio.js](../src/lmstudio.js) (`sendLmStudioMessage`) | [lmstudio-agent.js](../src/lmstudio-agent.js) (`runLmStudioAgent`) |

### Shape canónico

In-app **todo viaja en el shape de OpenAI**: `[{role: 'system'|'user'|'assistant', content: string}]`. La adaptación al wire-format ocurre en el borde del wrapper:

- **OpenAI / Ollama / LM Studio** lo aceptan tal cual.
- **Anthropic** separa `system` de `messages[]`. La conversión vive en [`toAnthropicPayload`](../src/anthropic.js#L13-L22): filtra los `role: 'system'` (los concatena con `\n\n`) y deja solo `user`/`assistant` en `messages`.

### Contrato del wrapper

Todos los wrappers — chat y agente — aceptan el mismo objeto de hooks de debug como segundo argumento:

```js
sendXxxMessage(messages, {
  onLog,          // (level, message) — alimenta el panel de log
  onRawRequest,   // (payload) — alimenta el panel "Request crudo"
  onRawResponse,  // (data)    — alimenta el panel "Response crudo"
  temperature,    // 0..2 (clampeado a [0,1] en Anthropic)
})
```

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
- **LM Studio "Model reloaded"**: cuando LM Studio recarga el modelo en mitad de un request (Auto-Evict), devuelve `{"error":"Model reloaded."}` a veces con HTTP 200. [lmstudio.js:104-110](../src/lmstudio.js#L104-L110) detecta el caso y reintenta una vez. Si persiste, hay que desactivar Auto-Evict en LM Studio.
- **LM Studio sin modelo**: si no hay modelo en `localStorage.lmstudio_model` ni en `VITE_LMSTUDIO_MODEL`, el wrapper falla rápido con mensaje claro y orienta al botón "Detectar" de la `ConfigBar`.

---

## 4. Modos de contexto del Chat (`/`)

El Chat soporta **tres modos mutuamente excluyentes**, controlados por el segmented control en [App.jsx:427-492](../src/App.jsx#L427-L492). La lógica de envío vive en `handleSend` ([App.jsx:196-288](../src/App.jsx#L196-L288)).

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
[`applyNoise`](../src/noise.js#L44-L79) inyecta relleno determinista al final del último `user` message. La cantidad de párrafos crece con cada turno (`fillersForTurn`). Controles de seed e intensidad en la UI. PRNG: mulberry32 sembrado con `seed + turnIndex * 31` — la misma intensidad + seed produce siempre el mismo ruido. **El system y los turnos previos quedan intactos.**

Para agentes existe [`bloatToolResult`](../src/noise.js#L129-L172): infla cada `tool_result` con líneas de log falsas (`[INFO] reconciling internal cache state…`). Es la causa #1 real de que un agente "se pierda" después de varios pasos.

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

Soporta **dos proveedores en la misma página** con selector arriba — la idea es que el alumno pruebe la misma pregunta con ambos y vea el contraste:

| Proveedor | Wrapper | Endpoint | Qué expone | Control |
|---|---|---|---|---|
| OpenAI | [openai-reasoning.js](../src/openai-reasoning.js) | `POST /v1/responses` | Solo **resumen** opcional del razonamiento (`output[].type:'reasoning'`, `summary[]`). El crudo nunca sale. A veces el resumen llega vacío. | `reasoning.effort` (minimal/low/medium/high) + `reasoning.summary` (auto/concise/detailed) |
| Anthropic | [anthropic-reasoning.js](../src/anthropic-reasoning.js) | `POST /v1/messages` | El **thinking entero**, en texto plano, dentro de `content[].type:'thinking'`. Cada bloque firmado (`signature`). | `thinking.budget_tokens` (mapeado desde el mismo `effort`: 1k/2k/5k/12k) |

### Shape canónico de la UI

Los dos wrappers devuelven el **mismo shape** para que la UI no ramifique:

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
- **Contraste pedagógico**: el panel de pensamiento usa color violeta para OpenAI y naranja para Claude (matchea con la paleta del provider-badge del resto de la app). El alumno ve de un vistazo qué proveedor está usando.
- **Tabla de tokens diferenciada**: en OpenAI se muestra `reasoning_tokens` separado (`usage.output_tokens_details.reasoning_tokens`); en Claude no se puede — el thinking entra dentro de `output_tokens` sin desglose, y la UI lo aclara explícitamente.

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
| `chat_provider` | `'openai' \| 'anthropic' \| 'ollama' \| 'lmstudio'` (compartido entre modos) |
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

### LM Studio

`lmstudio_host`, `lmstudio_model`.

---

## 10. Convenciones para extender

Tomado de [CLAUDE.md](../CLAUDE.md), repetido acá porque toca arquitectura:

- **Copy en castellano rioplatense.** La UI es material de clase.
- **Nunca loguear/mostrar la key completa.** Usar siempre `maskKey()` del wrapper correspondiente. El `fetch` real usa la key entera; el `onRawRequest` muestra solo la enmascarada.
- **Integraciones nuevas** (chat o agente) exponen el mismo `{onLog, onRawRequest, onRawResponse}` para que los paneles sigan funcionando sin tocar UI.
- **Shape canónico OpenAI** (`{role, content}`) como representación in-app. Adaptar en el borde del wrapper, como hace `toAnthropicPayload`.
- **Sin react-router.** Routing manual en [App.jsx:85-97](../src/App.jsx#L85-L97) + [ModeSwitch.jsx](../src/ModeSwitch.jsx). Es deliberado para que el alumno vea el `pathname` crudo.
- **Proveedores agénticos nuevos:** seguir el contrato de [agent-tools.js](../src/agent-tools.js) (defs neutras + `runAgentTool`) y respetar el sentinel `NEEDS_HUMAN_APPROVAL` para human-in-the-loop.
- **Sin tests/lint/TS/formatter.** No agregar pipeline sin hablarlo — la simplicidad del setup es parte del material.
