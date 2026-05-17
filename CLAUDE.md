# CLAUDE.md

## Propósito
UI de chat pedagógica que habla directo a OpenAI, Anthropic, Ollama y LM Studio desde el browser.
Expone JSON crudo de request/response, contexto acumulado, tokens y log de proceso.
UI en castellano rioplatense (incluye `/criollo` con la API explicada en lunfardo).

## Arquitectura detallada
**Antes de tocar arquitectura, routing, proveedores, agentes o ventana de contexto, leé [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).** Ahí está el mapa completo: rutas, wrappers, contrato de hooks, shape canónico, loop agéntico, skills lazy-load, estrategias de poda y todas las claves de `localStorage`. Este archivo es solo el "qué tenés que saber siempre" — el resto vive ahí.

## Setup crítico (no obvio)
- **Keys vía `import.meta.env` → van al bundle. NO deployar.**
- **Ollama**: requiere `ollama serve` + modelo pulleado. Si el browser pega CORS, arrancar con `OLLAMA_ORIGINS=*`.
- **LM Studio**: arrancar el server en LM Studio → Developer (puerto 1234 por defecto). Modelo seleccionable desde la UI (botón "Detectar" en la ConfigBar) o `VITE_LMSTUDIO_MODEL`. Si recarga modelo en mitad del request, el wrapper reintenta una vez.
- Sin tests, lint, TS ni formatter configurados — **no agregar pipeline sin hablarlo**, la simplicidad es parte del material.
- Editor de código basado en `@monaco-editor/react`.

## Reglas no negociables al extender
Si vas a tocar la app, estas reglas mandan siempre. El detalle de cómo aplicarlas está en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

- **Copy en castellano rioplatense.** La UI es material de clase.
- **Nunca loguear/mostrar la key completa.** Usar `maskKey()` del wrapper. El `fetch` real usa la key entera; `onRawRequest` muestra la enmascarada. (Ver §3 de ARCHITECTURE.md.)
- **Integraciones nuevas** (chat o agente) exponen el mismo `{onLog, onRawRequest, onRawResponse, temperature}` para no romper los paneles de debug. (Ver §3.)
- **Shape canónico OpenAI** (`{role, content}`) in-app. Adaptar al wire-format en el borde del wrapper, como hace `toAnthropicPayload`. (Ver §3.)
- **Sin react-router.** Routing manual en [App.jsx](src/App.jsx) (switch sobre `pathname`) + [ModeSwitch.jsx](src/ModeSwitch.jsx). Es deliberado para que el alumno vea el `pathname` crudo. Si agregás un modo nuevo, sumalo en ambos lados. (Ver §2.)
- **Proveedores agénticos nuevos** siguen el contrato de [agent-tools.js](src/agent-tools.js): defs neutras + `runAgentTool`, y respetar el sentinel `NEEDS_HUMAN_APPROVAL`. (Ver §6.)
- **System prompt editable**: si el alumno deja el textarea vacío, mandar el default — nunca string vacío. Validar con `.trim()`. En Chat persistente el system viaja como `instructions` a `/v1/responses`, NO como `messages[0]`. (Ver §5.)
- **Ventana de contexto**: `messages[0]` con `role:'system'` nunca se poda. (Ver §7.)
