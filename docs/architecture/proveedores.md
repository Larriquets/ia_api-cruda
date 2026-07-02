# Proveedores y contrato de wrappers

> Parte de [docs/ARCHITECTURE.md](../ARCHITECTURE.md). Acá vive el detalle de los cuatro proveedores, el shape canónico, el contrato de hooks de debug y las env vars.

Cuatro proveedores, todos llamados directo desde el browser con `fetch`. La key sale de `import.meta.env` — por eso **no se puede deployar con keys reales**: el bundle las expone.

| Proveedor | Endpoint | Estado del contexto | Wrapper chat | Wrapper agente |
|---|---|---|---|---|
| OpenAI classic | `POST api.openai.com/v1/chat/completions` | Cliente manda `messages[]` completo cada turno | [openai.js](../../src/openai.js) (`sendChatMessage`) | [openai-agent.js](../../src/openai-agent.js) (`runOpenAIAgent`) |
| OpenAI persistent | `POST /v1/responses` + `/v1/conversations` | Servidor (OpenAI), ID en `localStorage` | [openai.js](../../src/openai.js) (`sendResponseMessage`) | — |
| Anthropic | `POST api.anthropic.com/v1/messages` | Stateless, browser-direct con `anthropic-dangerous-direct-browser-access:true` | [anthropic.js](../../src/anthropic.js) (`sendClaudeMessage`) | [anthropic-agent.js](../../src/anthropic-agent.js) (`runClaudeAgent`) |
| Ollama | `POST localhost:11434/api/chat` | Stateless, local, sin auth | [ollama.js](../../src/ollama.js) (`sendOllamaMessage`) | — |
| LM Studio | `POST localhost:1234/v1/chat/completions` (shape OpenAI) | Stateless, local, header `Authorization` placeholder | [lmstudio.js](../../src/lmstudio.js) (`sendLmStudioMessage`, streaming opcional vía `onToken`) | [lmstudio-agent.js](../../src/lmstudio-agent.js) (`runLmStudioAgent`) |

**Nota Ollama:** el wrapper existe y funciona, pero el selector de proveedor del Chat hoy ofrece solo OpenAI / Anthropic / LM Studio. Quedan referencias a `provider === 'ollama'` en App.jsx que son código legado.

**Selector de modelo en el Chat:** [openai.js](../../src/openai.js) y [anthropic.js](../../src/anthropic.js) exportan `OPENAI_CHAT_MODELS` / `ANTHROPIC_CHAT_MODELS` y aceptan `model` como override opcional (fallback a la env var). La ConfigBar del Chat muestra un dropdown según el proveedor, persistido en `chat_model_openai` / `chat_model_anthropic`.

## Shape canónico

In-app **todo viaja en el shape de OpenAI**: `[{role: 'system'|'user'|'assistant', content: string}]`. La adaptación al wire-format ocurre en el borde del wrapper:

- **OpenAI / Ollama / LM Studio** lo aceptan tal cual.
- **Anthropic** separa `system` de `messages[]`. La conversión vive en `toAnthropicPayload` ([anthropic.js](../../src/anthropic.js)): filtra los `role: 'system'` (los concatena con `\n\n`) y deja solo `user`/`assistant` en `messages`.

## Contrato del wrapper

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

- [lmstudio.js](../../src/lmstudio.js): `onToken(delta)` — si se pasa, el wrapper manda `stream: true` y parsea los chunks SSE. App.jsx lo usa en el Chat: agrega un placeholder de assistant y lo va completando token a token.
- Los wrappers de razonamiento con streaming (`lmstudio-reasoning.js`): `onTextChunk`, `onThinkingStart`, `onThinkingChunk`, `onThinkingEnd` (ver [labs.md — Razonamiento](labs.md#razonamiento-razonamiento)).

**Reglas críticas:**

- `onRawRequest` recibe el header `Authorization` **enmascarado** vía `maskKey()` (los primeros 7 y los últimos 4 caracteres). El `fetch` real usa la key entera. Nunca loguear la key completa.
- `temperature` default 0.7. Anthropic clampa a `[0, 1]` y registra el clamp en el log. Ollama la mete en `options.temperature` (no a nivel root).
- Si un wrapper agrega un campo nuevo (ej. `instructions` en `/v1/responses`), debe seguir respetando el contrato de hooks para que los paneles funcionen sin tocar UI.

## Variables de entorno

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

## Gotchas

- **Anthropic CORS** funciona porque mandamos `anthropic-dangerous-direct-browser-access: true`. Sin ese header, el browser rebota.
- **Ollama CORS** suele bloquear el browser. Arrancar con `OLLAMA_ORIGINS=* ollama serve`.
- **LM Studio "Model reloaded"**: cuando LM Studio recarga el modelo en mitad de un request (Auto-Evict), devuelve `{"error":"Model reloaded."}` a veces con HTTP 200. [lmstudio.js](../../src/lmstudio.js) detecta el caso y reintenta una vez (solo en modo bloqueante; el retry no aplica al streaming). Si persiste, hay que desactivar Auto-Evict en LM Studio.
- **LM Studio sin modelo**: si no hay modelo en `localStorage.lmstudio_model` ni en `VITE_LMSTUDIO_MODEL`, el wrapper falla rápido con mensaje claro y orienta al botón "Detectar" de la `ConfigBar`.
