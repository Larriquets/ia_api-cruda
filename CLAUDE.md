# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

A pedagogical / debugging-focused chat UI that talks directly to **OpenAI**, **Anthropic**, and a local **Ollama** server from the browser. The point is not to be a polished chat — it's to expose what is actually being sent and received: raw request JSON, raw response JSON, accumulated context, token estimates, and a persisted process log. UI copy is in Spanish (Argentinian register, including a `/criollo` page that explains the API in slang).

## Commands

```
npm run dev       # vite dev server on http://localhost:5173
npm run build     # production build
npm run preview   # preview built bundle
```

There is no test runner, linter, type-checker, or formatter configured.

## Required env vars (Vite-prefixed, baked into client bundle)

```
VITE_OPENAI_API_KEY=...
VITE_OPENAI_MODEL=gpt-4o-mini            # optional, default gpt-4o-mini
VITE_ANTHROPIC_API_KEY=...
VITE_ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # optional

VITE_OLLAMA_HOST=http://localhost:11434          # optional, default localhost:11434
VITE_OLLAMA_MODEL=gemma3:4b                       # optional, default gemma3:4b
```

Because the keys are exposed via `import.meta.env`, they ship to the browser. This is a local-dev tool — do not deploy as-is.

Ollama has no API key — it's a local runtime. Requires `ollama serve` running and the model pulled (`ollama pull gemma3:4b`). If the browser hits CORS, start it with `OLLAMA_ORIGINS=*`.

## Architecture

Single-page React 18 app, Vite-bundled, no router library. State lives entirely in [src/App.jsx](src/App.jsx); other files are either presentational pages or thin API wrappers.

### Routing — DIY in vite.config.js + App.jsx
- [vite.config.js](vite.config.js) defines an inline `spaFallback` middleware that rewrites any extensionless URL to `/` so deep links work in dev.
- [src/App.jsx](src/App.jsx) reads `window.location.pathname` once on mount and switches between `<App>`, `<Criollo>`, `<Contexto>`, `<Proveedores>`. Navigation between these is by `<a target="_blank">` opening a new tab — no client-side router, no history API.

### Three providers, four send flows
The UI multiplexes between four distinct request flows:

1. **OpenAI classic** — `POST /v1/chat/completions`. Full `messages[]` (system + history + new) sent every time. Implemented in [src/openai.js:11](src/openai.js#L11) `sendChatMessage`.
2. **OpenAI persistent** — `POST /v1/responses` with a `conversation` ID. Only the new user message is sent; OpenAI keeps the history. Conversation is created lazily via `POST /v1/conversations` ([src/openai.js:80](src/openai.js#L80)) and the ID is persisted in `localStorage` under `openai_conversation_id`. History can be re-fetched with `GET /v1/conversations/{id}/items` ([src/openai.js:179](src/openai.js#L179)).
3. **Anthropic** — `POST /v1/messages`. Stateless, browser-direct (uses the `anthropic-dangerous-direct-browser-access: true` header). Implemented in [src/anthropic.js:24](src/anthropic.js#L24).
4. **Ollama (local)** — `POST http://localhost:11434/api/chat`. Stateless, no auth. Sends `stream: false` to get a single JSON response instead of NDJSON. Implemented in [src/ollama.js](src/ollama.js) `sendOllamaMessage`. Accepts the OpenAI-shaped `messages[]` (system/user/assistant) as-is.

The OpenAI-shaped `messages[]` (with `role: 'system'`) is the canonical in-app format. [src/anthropic.js:13](src/anthropic.js#L13) `toAnthropicPayload` adapts it to Claude's format (system extracted out, only user/assistant in `messages`); Ollama needs no adapter.

The two toggles `persistentMode` and `rawMode` are mutually exclusive in the UI; persistent mode is force-disabled whenever `provider !== 'openai'` because only OpenAI has a Conversations API. Raw mode sends only the current user message with no system and no history — useful for showing what a context-less call looks like.

### API wrappers expose hooks, not just return values
`sendChatMessage`, `sendClaudeMessage`, and `sendOllamaMessage` all accept `{ onLog, onRawRequest, onRawResponse }` callbacks. The wrappers stream debug events out as the request progresses (key masked, model chosen, request built, HTTP status, latency, token usage). Anything new added here should follow the same pattern — the three debug panels in `App.jsx` depend on it. The `onRawRequest` payload always carries a **masked** Authorization header (`maskKey()`) so the displayed JSON is safe to share/screenshot, while the actual `fetch` uses the real key.

### Persisted state (localStorage keys)
- `chat_context_snapshot` — current `messages[]` array, written on every change in [src/App.jsx:68](src/App.jsx#L68). The `/contexto` page reads this and listens for `storage` events to live-update across tabs.
- `chat_logs` — process log, capped at `LOGS_MAX = 500` entries.
- `openai_conversation_id` — persistent-mode conversation ID.
- `chat_provider` — `'openai'`, `'anthropic'`, or `'ollama'`.

### Pages
- [src/App.jsx](src/App.jsx) — three-panel debug UI (chat / raw req-res / log).
- [src/Criollo.jsx](src/Criollo.jsx) — explains the OpenAI API in Argentinian Spanish slang.
- [src/Contexto.jsx](src/Contexto.jsx) — live view of the `chat_context_snapshot` localStorage entry.
- [src/Proveedores.jsx](src/Proveedores.jsx) — comparison page: where context lives in OpenAI vs Anthropic vs Ollama (local).

## Conventions when extending

- All UI strings are in Spanish — keep new copy in Spanish.
- Never log or display the full API key; use `maskKey()` from the relevant wrapper.
- New API integrations should expose the same `{ onLog, onRawRequest, onRawResponse }` hook surface so the debug panels keep working.
- Keep the OpenAI `messages[]` shape (`{role, content}`) as the canonical in-app representation and adapt at the wrapper boundary, the way `toAnthropicPayload` does.
