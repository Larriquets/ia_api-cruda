# Arquitectura — La IA Cruda

UI pedagógica de chat que habla directo a OpenAI, Anthropic, Ollama y LM Studio desde el browser, exponiendo a la vista todo lo que el navegador suele esconder: el JSON crudo del request, el response sin parsear, el array `messages[]` que viaja, los tokens consumidos y un log paso a paso del proceso.

Este documento es el **índice y mapa general**. El detalle de cada área vive en archivos separados bajo [docs/architecture/](architecture/). Para el "porqué" pedagógico de cada decisión, ver [CLAUDE.md](../CLAUDE.md).

---

## Documentos de detalle

| Documento | Qué cubre |
|---|---|
| [stack-y-routing.md](architecture/stack-y-routing.md) | Stack (React + Vite, sin SDKs), routing manual sin react-router, landing de dos puertas, cómo agregar una ruta |
| [proveedores.md](architecture/proveedores.md) | Los 4 proveedores y sus endpoints, shape canónico OpenAI, contrato de hooks de debug (`onLog`/`onRawRequest`/`onRawResponse`), env vars, gotchas de CORS y LM Studio |
| [chat.md](architecture/chat.md) | Los 3 modos de contexto del Chat (Crudo / Conversación / Persistente), modo Ruido, system prompt editable compartido, diagrama de flujo de un envío |
| [agentes.md](architecture/agentes.md) | Loop function-calling, defs neutras de `agent-tools.js`, human-in-the-loop (`NEEDS_HUMAN_APPROVAL`), skills con lazy-loading y tests |
| [ventana-contexto.md](architecture/ventana-contexto.md) | Estrategias de poda: FIFO, sliding window, compaction; invariante del system |
| [labs.md](architecture/labs.md) | Los experimentos aislados: `/razonamiento`, `/logprobs`, `/mcp`, `/tokens`, `/ruido`, `/especificidad`, `/rag` |
| [i18n.md](architecture/i18n.md) | Sistema ES/EN sin librería: claves `t()` vs módulos de contenido por idioma, bits funcionales lang-aware, cobertura |
| [recorrido-y-demos.md](architecture/recorrido-y-demos.md) | La capa "Entender": `/recorrido` con mini-demos inline, tutos `/tutos/*` por pregunta, demos animadas `/demo/*`, puente lab ↔ demo, lector TTS |
| [localstorage.md](architecture/localstorage.md) | Todas las claves de `localStorage` por modo |

---

## Vista de pájaro

```
                         ┌──────────────────────────────┐
                         │  /  Entrada.jsx (dos puertas)│
                         └──────┬────────────────┬──────┘
                    "Entender"  │                │  "Taller"
                                ▼                ▼
             /recorrido + /tutos/* (sin API)   /chat + labs (API real)
                                               + /demo/* (sin API)
                                │                │
                     TryModeCTA ├───────────────►│
                                │◄───────────────┤ DemoBacklink
                                                 │
                                                 ▼
                              wrappers (src/*.js) ── fetch ──► APIs
                              mismo contrato de hooks de debug
                              → paneles Request / Response / Log
```

- **Routing manual**: `pathname` → if-chain en [App.jsx](../src/App.jsx) + links duros en [ModeSwitch.jsx](../src/ModeSwitch.jsx). Sin react-router, deliberado.
- **Shape canónico OpenAI** in-app; cada wrapper adapta al wire-format en su borde.
- **Todos los wrappers** (chat, agente, razonamiento, embeddings, MCP) exponen el mismo contrato de hooks de debug para que los paneles funcionen sin ramificar la UI.

---

## Mapa de rutas

| Ruta | Componente | Modo |
|---|---|---|
| `/` | [Entrada.jsx](../src/Entrada.jsx) | Landing de dos puertas: "Entender" (recorrido + tutos por pregunta, sin API) vs "Taller" (modos, labs y demos) |
| `/tutos/{memoria,tokens,inventa,fuentes,piensa,agentes,reglas}` | [Tutos.jsx](../src/Tutos.jsx) | Tutos para no programadores: una página por pregunta humana, prosa + mini-demo sin API + escalera a demo y lab |
| `/chat` | [App.jsx](../src/App.jsx) | Chat (3 modos de contexto + system editable + temperatura) |
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
| `/rag` | [Rag.jsx](../src/Rag.jsx) | Mini-RAG: embeddings + similitud coseno en el browser + top-K inyectado al prompt |
| `/contexto` | [Contexto.jsx](../src/Contexto.jsx) | Vista en vivo del array `messages[]` del Chat |
| `/proveedores` | [Proveedores.jsx](../src/Proveedores.jsx) | Comparación OpenAI vs Claude |
| `/docs` | [Docs.jsx](../src/Docs.jsx) | Material de clase |
| `/como-funciona` | [ComoFunciona.jsx](../src/ComoFunciona.jsx) | Explicación guiada: las tres piezas de cada POST (system / context / user) |
| `/recorrido` | [Recorrido.jsx](../src/Recorrido.jsx) | Recorrido guiado para NO programadores: 6 paradas con metáfora + mini-demo inline + CTA "probalo de verdad" a cada lab |
| `/demo/chat` | [ModosChat.jsx](../src/ModosChat.jsx) | Comparador animado de los 3 modos del Chat (sin API) |
| `/demo/editor` | [ModosEditor.jsx](../src/ModosEditor.jsx) | Comparador animado de los 2 modos del Editor (sin API) |
| `/demo/loop` | [ComoEdita.jsx](../src/ComoEdita.jsx) | Demo de cómo la IA "edita código" vía `tool_use` (sin API) |
| `/demo/rag` | [ModosRag.jsx](../src/ModosRag.jsx) | Demo animada de RAG en 4 pasos: indexar → vectorizar pregunta → ranking → POST (sin API) |
| `/demo/tokens` | [ModosTokens.jsx](../src/ModosTokens.jsx) | Demo animada de tokens en 4 pasos: frase → piezas → IDs → la cuenta (BPE real local, sin API) |
| `/demo/logprobs` | [ModosLogprobs.jsx](../src/ModosLogprobs.jsx) | Demo animada de la lotería del próximo token: candidatos, barras y la frase completándose (sin API) |
| `/demo/mcp` | [ModosMcp.jsx](../src/ModosMcp.jsx) | Demo animada del intercambio JSON-RPC de MCP: initialize → tools/list → tools/call → resultado (sin API) |
| `/demo/ventana-contexto` | [ModosVentana.jsx](../src/ModosVentana.jsx) | Demo animada del desborde de ventana: FIFO vs compaction, system fijado (sin API) |
| `/demo/ruido` | [ModosRuido.jsx](../src/ModosRuido.jsx) | Demo animada de context rot: el mismo dato limpio vs enterrado en logs (sin API) |
| `/demo/especificidad` | [ModosEspecificidad.jsx](../src/ModosEspecificidad.jsx) | Demo animada de pedido vago vs criterios explícitos, con checklist (sin API) |
| `/demo/prompt-injection` | [ModosInjection.jsx](../src/ModosInjection.jsx) | Demo animada de prompt injection: el mail con orden escondida, sin y con defensa (sin API) |
| `/demo/razonamiento` | [ModosRazonamiento.jsx](../src/ModosRazonamiento.jsx) | Demo animada: OpenAI vs Claude "pensando" — qué expone cada uno (sin API) |
| `/demo/agents-md` | [ModosAgentsMd.jsx](../src/ModosAgentsMd.jsx) | Comparador AGENTS.md (sin API) |
| `/demo/agents-md-skills` | [ModosAgentsMdSkills.jsx](../src/ModosAgentsMdSkills.jsx) | Comparador AGENTS.md "fat" vs skill con test (sin API) |

Cómo agregar una ruta: ver [stack-y-routing.md](architecture/stack-y-routing.md#agregar-una-ruta-nueva).

---

## Convenciones para extender

Tomado de [CLAUDE.md](../CLAUDE.md), repetido acá porque toca arquitectura:

- **Copy en castellano rioplatense.** La UI es material de clase.
- **Copy bilingüe ES/EN vía `t()` o módulos por idioma.** Texto visible nuevo no se hardcodea: chrome interactivo como clave en [es.js](../src/i18n/es.js) (base de verdad, rioplatense) + [en.js](../src/i18n/en.js); prosa larga como módulos de contenido por idioma. (Ver [i18n.md](architecture/i18n.md).)
- **Nunca loguear/mostrar la key completa.** Usar siempre `maskKey()` del wrapper correspondiente. El `fetch` real usa la key entera; el `onRawRequest` muestra solo la enmascarada.
- **Integraciones nuevas** (chat o agente) exponen el mismo `{onLog, onRawRequest, onRawResponse}` para que los paneles sigan funcionando sin tocar UI. (Ver [proveedores.md](architecture/proveedores.md#contrato-del-wrapper).)
- **Shape canónico OpenAI** (`{role, content}`) como representación in-app. Adaptar en el borde del wrapper, como hace `toAnthropicPayload`.
- **Sin react-router.** Routing manual en [App.jsx](../src/App.jsx) (if-chain sobre `pathname`) + [ModeSwitch.jsx](../src/ModeSwitch.jsx). Es deliberado para que el alumno vea el `pathname` crudo.
- **Proveedores agénticos nuevos:** seguir el contrato de [agent-tools.js](../src/agent-tools.js) (defs neutras + `runAgentTool`) y respetar el sentinel `NEEDS_HUMAN_APPROVAL` para human-in-the-loop. (Ver [agentes.md](architecture/agentes.md).)
- **System prompt editable:** si el alumno deja el textarea vacío, mandar el default — nunca string vacío. Validar con `.trim()`. (Ver [chat.md](architecture/chat.md#system-prompt-editable).)
- **Ventana de contexto:** `messages[0]` con `role:'system'` nunca se poda. (Ver [ventana-contexto.md](architecture/ventana-contexto.md).)
- **Sin tests/lint/TS/formatter.** No agregar pipeline sin hablarlo — la simplicidad del setup es parte del material.
