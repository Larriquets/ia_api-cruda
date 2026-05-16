# CLAUDE.md

## Propósito
UI de chat pedagógica que habla directo a OpenAI, Anthropic, Ollama y LM Studio desde el browser.
El objetivo es exponer JSON crudo de request/response, contexto acumulado, tokens y log de proceso.
La app tiene cuatro modos navegables (Chat, Editor, Agente, AGENTS.md) más Docs.
UI en castellano (registro argentino, incluye página `/criollo` que explica la API en lunfardo).

## Setup crítico (no obvio)
- Keys vía `import.meta.env` → van al bundle. NO deployar.
- Ollama: requiere `ollama serve` + modelo pulleado; si el browser pega CORS, arrancar con `OLLAMA_ORIGINS=*`.
- LM Studio: arrancar el server en LM Studio → Developer (puerto 1234 por defecto). El modelo se elige desde la UI (botón "Detectar" en la ConfigBar) o vía `VITE_LMSTUDIO_MODEL`. Si recarga modelo en mitad del request, el wrapper reintenta una vez.
- Sin tests, lint, TS ni formatter configurados.
- Editor de código basado en `@monaco-editor/react`.

## Arquitectura
React 18 + Vite, SPA sin router. Routing manual: `vite.config.js` tiene un `spaFallback` middleware
y cada página decide a qué componente renderizar mirando `window.location.pathname`. Navegación entre
modos via `<a href>` (mismo tab) usando [ModeSwitch.jsx](src/ModeSwitch.jsx) en el header.

### Modos de la app
| Ruta | Componente | Qué demuestra |
|---|---|---|
| `/` | [App.jsx](src/App.jsx) | Chat con 4 modos de contexto (ver abajo) |
| `/editor` | [Editor.jsx](src/Editor.jsx) | Código + instrucción → respuesta, con/sin contexto acumulado |
| `/loop-agentico` | [LoopAgentico.jsx](src/LoopAgentico.jsx) | Loop agéntico con tool-use (function-calling) |
| `/agents-md` | [EditorAgentsMd.jsx](src/EditorAgentsMd.jsx) | Agente + `AGENTS.md` inyectado al system prompt |
| `/agents-md-skills` | [EditorAgentsMd.jsx](src/EditorAgentsMd.jsx) | AGENTS.md + tools `load_skill` / `run_skill_test` |
| `/docs`, `/contexto`, `/proveedores`, `/criollo` | páginas presentacionales | Material de clase |

### Cuatro proveedores
| Proveedor | Endpoint | Estado | Wrapper chat | Wrapper agente |
|---|---|---|---|---|
| OpenAI classic | `POST /v1/chat/completions` | full `messages[]` cada vez | [src/openai.js](src/openai.js) | [src/openai-agent.js](src/openai-agent.js) |
| OpenAI persistent | `POST /v1/responses` + `/conversations` | server-side, ID en localStorage | [src/openai.js](src/openai.js) | — |
| Anthropic | `POST /v1/messages` | stateless, browser-direct (`anthropic-dangerous-direct-browser-access`) | [src/anthropic.js](src/anthropic.js) | [src/anthropic-agent.js](src/anthropic-agent.js) |
| Ollama | `POST /api/chat` con `stream:false` | stateless, local, sin auth | [src/ollama.js](src/ollama.js) | — |
| LM Studio | `POST /v1/chat/completions` (shape OpenAI) | stateless, local, header `Authorization` placeholder | [src/lmstudio.js](src/lmstudio.js) | [src/lmstudio-agent.js](src/lmstudio-agent.js) |

Formato canónico in-app: `messages[]` shape de OpenAI (`{role, content}` con `role: 'system'`).
`toAnthropicPayload` en `src/anthropic.js` extrae el `system` y deja sólo user/assistant en `messages`.
Ollama y LM Studio aceptan el shape tal cual.

### Cuatro modos de contexto en el Chat (mutuamente excluyentes)
Segmented control en [App.jsx](src/App.jsx) — solo uno activo a la vez.
- **Crudo** — `system` + último user message, sin historial previo. Cada turno arranca limpio pero mantiene la "personalidad" del system.
- **Conversación** — cliente acumula `messages[]` y lo reenvía completo cada request.
- **Persistente** — `/v1/responses` + Conversations API; el contexto vive en OpenAI. Forzado a off cuando `provider !== 'openai'`.
- **Ruido** — inyecta relleno determinista al final del último user message vía [applyNoise](src/noise.js). Controles de seed e intensidad en la UI. Demuestra cómo el contexto sucio degrada la respuesta.

### System prompt editable (Chat, Editor, Loop Agéntico)
[SystemEditor.jsx](src/SystemEditor.jsx) es un componente plegable compartido. Lo consumen los tres modos con sus propios defaults y presets:
- Chat usa `CHAT_DEFAULT_SYSTEM` + `CHAT_PRESETS` de [system-presets.js](src/system-presets.js) (pirata, JSON estricto, profesor sarcástico, solo emojis).
- Editor usa `EDITOR_DEFAULT_SYSTEM` + `EDITOR_PRESETS` (sobre-comentado, lunfardo, paranoico de seguridad, minimalista).
- Loop Agéntico usa `AGENT_SYSTEM_PROMPT` de [agent-tools.js](src/agent-tools.js) + `AGENT_PRESETS` definidos inline en [LoopAgentico.jsx](src/LoopAgentico.jsx) (rápido, paranoico, narrador).

Reglas para extender:
- Si el alumno deja el textarea vacío, hay que mandar el default (no string vacío). Validar con `.trim()`.
- En el Chat los tres modos respetan el system. La diferencia es el historial: Crudo no acumula, Conversación sí (cliente), Persistente sí (servidor de OpenAI).
- En el Chat persistente, el system viaja como `instructions` a `/v1/responses` (no como `messages[0]`).

### Agentes (loop function-calling)
Cada wrapper agéntico (`*-agent.js`) implementa un loop sobre tools definidas en [agent-tools.js](src/agent-tools.js):
- `read_code`, `edit_code` — siempre disponibles.
- `assess_impact` — opt-in; pausa el loop y pide aprobación humana via sentinel `NEEDS_HUMAN_APPROVAL`.
- `load_skill`, `run_skill_test` — solo en `/agents-md-skills`. Los tests deterministas viven en [skill-tests.js](src/skill-tests.js), indexados por id de skill.
- En modo Ruido (agente), [bloatToolResult](src/noise.js) infla cada `tool_result` con logs falsos para mostrar context-bloat real.

### Wrappers exponen hooks de debug
Todos los wrappers (`sendChatMessage`, `sendClaudeMessage`, `sendOllamaMessage`, `sendLmStudioMessage`, y `runClaudeAgent` / `runOpenAIAgent` / `runLmStudioAgent`) aceptan `{ onLog, onRawRequest, onRawResponse, temperature }`. Los paneles de la UI dependen de los tres primeros. `onRawRequest` lleva el header Authorization **enmascarado** vía `maskKey()` (el `fetch` real usa la key entera).

`temperature` default 0.7. Anthropic clampa a [0, 1] dentro del wrapper y registra el clamp en el log. Ollama la mete en `options.temperature` (no a nivel root).

### Temperature (Chat)
[TemperatureControl.jsx](src/TemperatureControl.jsx) es un slider 0–2 con label cualitativo (determinístico / equilibrado / creativo / caótico). Persiste en `chat_temperature`. Si el provider clampa (Claude), muestra un hint.

### localStorage
Claves activas (cada modo persiste su propio estado para no pisarse):

**Chat (`/`)**
- `chat_context_snapshot` — `messages[]` actual; `/contexto` lo lee y escucha `storage` events para sync entre tabs.
- `chat_logs` — log capado a `LOGS_MAX = 500`.
- `openai_conversation_id` — ID de modo persistent.
- `chat_provider` — `'openai' | 'anthropic' | 'ollama' | 'lmstudio'` (compartido entre todos los modos).
- `chat_system_prompt`, `chat_system_open` — system editable del Chat y estado plegado del editor.
- `chat_temperature` — valor del slider de temperatura (0–2). Default 0.7.

**Editor (`/editor`)** — claves propias (`code`, `lang`, `keep_context`, `history`, `cols`, logs, `editor_system_prompt`, `editor_system_open`).
**Loop Agéntico (`/loop-agentico`)** — `agente_context_thread` para retomar la conversación + claves propias (`agente_code_snapshot`, `agente_language`, `agente_logs`, `agente_cols`, `agente_system_override`, `agente_system_open`).
**AGENTS.md (`/agents-md*`)** — `agentmd_code_snapshot`, `agentmd_agents_md_v4`, `agentmd_skills_v1`, `agentmd_logs`, `agentmd_cols`.
**LM Studio** — `lmstudio_host`, `lmstudio_model`.

## Convenciones al extender
- Copy en castellano rioplatense.
- Nunca loguear/mostrar la key completa; usar `maskKey()` del wrapper correspondiente.
- Integraciones nuevas (chat o agente) exponen el mismo `{ onLog, onRawRequest, onRawResponse }` para que los paneles sigan funcionando.
- Mantener el shape OpenAI `{role, content}` como representación canónica; adaptar en el borde del wrapper, como hace `toAnthropicPayload`.
- Si agregás un modo nuevo, sumalo a [ModeSwitch.jsx](src/ModeSwitch.jsx) y al switch de `page` en [App.jsx](src/App.jsx). No introducir react-router: el routing manual es deliberado para que el alumno vea el `pathname` crudo.
- Si agregás un proveedor agéntico, seguí el contrato de [agent-tools.js](src/agent-tools.js) (defs neutras + `runAgentTool`) y respetá el sentinel `NEEDS_HUMAN_APPROVAL` para human-in-the-loop.
