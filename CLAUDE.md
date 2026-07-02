# CLAUDE.md

## Propósito
UI de chat pedagógica que habla directo a OpenAI, Anthropic, Ollama y LM Studio desde el browser.
Expone JSON crudo de request/response, contexto acumulado, tokens y log de proceso.
UI en castellano rioplatense .

## Arquitectura detallada
**Antes de tocar arquitectura, routing, proveedores, agentes o ventana de contexto, leé [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).** Es el índice: mapa de rutas, vista de pájaro y convenciones. El detalle por área vive en [docs/architecture/](docs/architecture/): [stack-y-routing](docs/architecture/stack-y-routing.md), [proveedores](docs/architecture/proveedores.md), [chat](docs/architecture/chat.md), [agentes](docs/architecture/agentes.md), [ventana-contexto](docs/architecture/ventana-contexto.md), [labs](docs/architecture/labs.md), [i18n](docs/architecture/i18n.md), [recorrido-y-demos](docs/architecture/recorrido-y-demos.md), [localstorage](docs/architecture/localstorage.md). Este archivo es solo el "qué tenés que saber siempre" — el resto vive ahí.

## Setup crítico (no obvio)
- **Keys vía `import.meta.env` → van al bundle. NO deployar.**
- **LM Studio**: arrancar el server en LM Studio → Developer (puerto 1234 por defecto). Modelo seleccionable desde la UI (botón "Detectar" en la ConfigBar) o `VITE_LMSTUDIO_MODEL`. Si recarga modelo en mitad del request, el wrapper reintenta una vez.
- **MCP**: `/mcp` necesita el server de juguete corriendo: `npm run mcp` (puerto 3100, [servidor-mcp/server.js](servidor-mcp/server.js), sin deps ni SDK — eso es deliberado). El JSON-RPC vive solo en [mcp-client.js](src/mcp-client.js). (Ver [labs.md](docs/architecture/labs.md#mcp-mcp).)
- Sin tests, lint, TS ni formatter configurados — **no agregar pipeline sin hablarlo**, la simplicidad es parte del material.
- Editor de código basado en `@monaco-editor/react`.

## Reglas no negociables al extender
Si vas a tocar la app, estas reglas mandan siempre. El detalle de cómo aplicarlas está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

- **Copy bilingüe ES/EN.** El castellano rioplatense es la **base de verdad**; el inglés es la traducción. Nada de strings hardcodeados nuevos: todo texto visible va por `t('namespace.clave')` del i18n ([src/i18n/](src/i18n/)), con la entrada ES (rioplatense) en [es.js](src/i18n/es.js) y su traducción en [en.js](src/i18n/en.js). El toggle ES|EN vive en el header (vía `ModeSwitch`) y persiste en `localStorage.lang`. (Ver [i18n.md](docs/architecture/i18n.md).)
- **Nunca loguear/mostrar la key completa.** Usar `maskKey()` del wrapper. El `fetch` real usa la key entera; `onRawRequest` muestra la enmascarada. (Ver [proveedores.md](docs/architecture/proveedores.md).)
- **Integraciones nuevas** (chat o agente) exponen el mismo `{onLog, onRawRequest, onRawResponse, temperature}` para no romper los paneles de debug. (Ver [proveedores.md](docs/architecture/proveedores.md#contrato-del-wrapper).)
- **Shape canónico OpenAI** (`{role, content}`) in-app. Adaptar al wire-format en el borde del wrapper, como hace `toAnthropicPayload`. (Ver [proveedores.md](docs/architecture/proveedores.md#shape-canónico).)
- **Sin react-router.** Routing manual en [App.jsx](src/App.jsx) (if-chain sobre `pathname`) + [ModeSwitch.jsx](src/ModeSwitch.jsx). Es deliberado para que el alumno vea el `pathname` crudo. Si agregás un modo nuevo, sumalo en ambos lados. (Ver [stack-y-routing.md](docs/architecture/stack-y-routing.md).)
- **Proveedores agénticos nuevos** siguen el contrato de [agent-tools.js](src/agent-tools.js): defs neutras + `runAgentTool`, y respetar el sentinel `NEEDS_HUMAN_APPROVAL`. (Ver [agentes.md](docs/architecture/agentes.md).)
- **System prompt editable**: si el alumno deja el textarea vacío, mandar el default — nunca string vacío. Validar con `.trim()`. En Chat persistente el system viaja como `instructions` a `/v1/responses`, NO como `messages[0]`. (Ver [chat.md](docs/architecture/chat.md#system-prompt-editable).)
- **Ventana de contexto**: `messages[0]` con `role:'system'` nunca se poda. (Ver [ventana-contexto.md](docs/architecture/ventana-contexto.md).)
- **Razonadores**: tres wrappers aparte ([openai-reasoning.js](src/openai-reasoning.js), [anthropic-reasoning.js](src/anthropic-reasoning.js), [lmstudio-reasoning.js](src/lmstudio-reasoning.js)). OpenAI y Anthropic con env vars propias (`VITE_OPENAI_REASONING_MODEL`, `VITE_ANTHROPIC_REASONING_MODEL`); LM Studio usa el modelo compartido de LM Studio y separa el thinking parseando `<think>` tags, con streaming. En OpenAI no mandar `temperature`; en Claude exige `temperature=1` y `max_tokens>budget_tokens`. Haiku no razona. Los tres devuelven el mismo shape `{text, reasoningBlocks, usage}` para que la UI no ramifique. (Ver [labs.md](docs/architecture/labs.md#razonamiento-razonamiento).)
