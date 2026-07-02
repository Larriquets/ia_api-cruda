# Chat: modos de contexto y system prompt editable

> Parte de [docs/ARCHITECTURE.md](../ARCHITECTURE.md). Acá vive el detalle de los tres modos del Chat (`/chat`), el modo Ruido transversal, el system prompt editable compartido y el diagrama de flujo de un envío.

## Modos de contexto del Chat (`/chat`)

El Chat soporta **tres modos mutuamente excluyentes**, controlados por el segmented control de [App.jsx](../../src/App.jsx) (states `rawMode` / `persistentMode`). La lógica de envío vive en `handleSend`, en el mismo archivo.

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

`applyNoise` ([noise.js](../../src/noise.js)) inyecta relleno determinista al final del último `user` message. La cantidad de párrafos crece con cada turno (`fillersForTurn`). PRNG: mulberry32 sembrado con `seed + turnIndex * 31` — la misma intensidad + seed produce siempre el mismo ruido. **El system y los turnos previos quedan intactos.**

Para agentes existe `bloatToolResult` (mismo archivo): infla cada `tool_result` con líneas de log falsas (`[INFO] reconciling internal cache state…`). Es la causa #1 real de que un agente "se pierda" después de varios pasos. Los tres wrappers agénticos aceptan `noise: {enabled, seed, intensity}` y emiten `onNoise(stats)` por cada tool_result inflado.

Ambas funciones se ejercitan desde el lab [`/ruido`](labs.md#ruido-en-el-contexto-ruido) (controles de seed e intensidad en su ConfigBar). El toggle "Ruido en instrucciones" de `/loop-agentico` es otra cosa: solo muestra prompts sugeridos ambiguos, no toca el payload.

## System prompt editable

[SystemEditor.jsx](../../src/SystemEditor.jsx) es un componente plegable compartido por Chat, Editor, Loop Agéntico y Ventana de Contexto. Cada modo lo monta con sus propios defaults y presets.

| Modo | Default + presets | Storage |
|---|---|---|
| Chat (`/chat`) | `CHAT_DEFAULT_SYSTEM` + `CHAT_PRESETS` ([system-presets.js](../../src/system-presets.js)): pirata, JSON estricto, profesor sarcástico, solo emojis | `chat_system_prompt`, `chat_system_open` |
| Editor (`/editor`) | `EDITOR_DEFAULT_SYSTEM` + `EDITOR_PRESETS`: sobre-comentado, lunfardo, paranoico de seguridad, minimalista | `editor_system_prompt`, `editor_system_open` |
| Loop Agéntico (`/loop-agentico`) | `AGENT_SYSTEM_PROMPT` ([agent-tools.js](../../src/agent-tools.js)) + `AGENT_PRESETS` inline en `LoopAgentico.jsx`: rápido, paranoico, narrador | `agente_system_override`, `agente_system_open` |
| Ventana de contexto (`/ventana-contexto`) | `CHAT_DEFAULT_SYSTEM` + `CHAT_PRESETS` | `ctxwin_system_prompt`, `ctxwin_system_open` |

**Reglas para extender:**

- Si el alumno deja el textarea vacío, mandar el default — nunca string vacío. Validar con `.trim()`.
- En Chat: los tres modos respetan el system. La diferencia es el historial (Crudo no acumula, Conversación sí en cliente, Persistente sí en servidor).
- En Chat persistente: el system viaja como `instructions` a `/v1/responses`, NO como `messages[0]`.
- Los defaults y presets son lang-aware: `getChatDefaultSystem(lang)`, `getChatPresets(lang)`, etc. (ver [i18n.md](i18n.md)).

## Diagrama de flujo (Chat — modo Conversación)

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
