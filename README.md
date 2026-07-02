# La IA Cruda

UI de chat **pedagógica** que habla directo con OpenAI, Anthropic, Ollama y LM Studio desde el browser, exponiendo a la vista todo lo que las apps de chat suelen esconder: el JSON crudo del request, el response sin parsear, el array `messages[]` que viaja en cada envío, los tokens consumidos y un log paso a paso del proceso.

La tesis didáctica es una sola: **el modelo no se acuerda de nada — la "memoria" es un array que alguien reenvía**. Todo lo demás (ventana de contexto, agentes, RAG, razonadores, MCP) se construye sobre esa verdad, mostrándola en vez de contarla.

> Este documento explica **qué es la app y qué enseña**. El detalle técnico (rutas, wrappers, convenciones para extender) vive en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Para quién es

La landing (`/`) tiene **dos puertas**, una por audiencia:

- **"Entender"** — para profesionales **no técnicos** que ya usan IA en el trabajo y quieren intuición sobre por qué falla, alucina o "se olvida". Entra por `/recorrido` (un recorrido guiado de 6 paradas con metáforas y mini-demos interactivas) y por los tutos `/tutos/*`, una página por pregunta humana ("¿se acuerda de lo que le digo?", "¿qué es un token?"), cada una con su mini-demo — **sin necesitar key ni configuración**.
- **"Taller"** — para gente técnica (o alumnos de programación) que quiere ver el mecanismo real: el Chat y los labs pegan contra las APIs de verdad, con paneles de Request / Response / Log crudos en cada envío. **Todo modo y lab tiene su demo gemela animada en `/demo/*`** (sin API), para ver el mecanismo antes de traer keys.

Las capas están puenteadas en ambos sentidos: cada tuto y demo tiene un botón "probalo de verdad" hacia el lab real, y cada lab tiene un backlink hacia su versión animada. Nadie queda encerrado en su nivel.

Toda la UI es **bilingüe castellano rioplatense / inglés** (toggle ES|EN en el header), y el recorrido y los tutos se pueden **escuchar** con un lector text-to-speech nativo del browser.

---

## Qué enseña

Cada concepto tiene su lugar en la app. La progresión sugerida va de arriba hacia abajo:

| Concepto | Dónde se ve | Qué demuestra |
|---|---|---|
| El modelo predice tokens, no "piensa" | `/tokens`, `/logprobs` | Tokenizer visual 100% local (BPE, IDs, bytes, costos) y la probabilidad token por token de una respuesta real |
| La API no tiene memoria | `/chat` en modo **Crudo** vs **Conversación** vs **Persistente** | El mismo chat con tres manejos de contexto: sin historial, historial acumulado en el cliente, historial guardado en el servidor (OpenAI Conversations) |
| El contexto es un array visible | `/contexto`, `/como-funciona` | Vista en vivo del `messages[]` del Chat y explicación guiada de las tres piezas de cada POST (system / contexto / user) |
| El system prompt manda | System editable en Chat, Editor y agentes (con presets: pirata, JSON estricto, etc.) | Cambiar la "personalidad" sin tocar el modelo |
| La ventana de contexto se llena | `/ventana-contexto` | Estrategias de poda en vivo: FIFO, sliding window, compaction — y por qué el system nunca se poda |
| El ruido degrada al modelo (context rot) | `/ruido`, modo Ruido del Chat | La misma tarea agéntica con y sin `tool_result` inflados con logs falsos: la causa #1 real de que un agente "se pierda" |
| Pedir bien cambia el resultado | `/especificidad` | La misma tarea con un pedido vago vs uno con criterios explícitos, verificada con una checklist determinística |
| Cómo funciona un agente | `/loop-agentico`, `/demo/loop` | El loop de function-calling completo, con human-in-the-loop para acciones sensibles |
| Reglas y skills para agentes | `/agents-md`, `/agents-md-skills` | Qué cambia cuando el agente recibe un AGENTS.md, y cuándo conviene una skill con test en vez de instrucciones "gordas" |
| Instrucciones vs datos no confiables | `/prompt-injection` | Por qué el contenido externo puede secuestrar al modelo |
| RAG sin humo | `/rag`, `/demo/rag` | Embeddings y similitud coseno calculados en el browser, top-K inyectado al prompt a la vista |
| Modelos razonadores | `/razonamiento`, `/demo/razonamiento` | OpenAI (`reasoning.effort`), Claude (extended thinking) y LM Studio (`<think>` tags) lado a lado: qué expone cada uno |
| MCP por dentro | `/mcp` | Inspector JSON-RPC paso a paso contra un server de juguete local, sin SDK |
| Los proveedores difieren en el borde | `/proveedores`, selector de proveedor del Chat | Mismo shape canónico in-app, wire-formats distintos (OpenAI vs Anthropic) |

Además hay material de clase navegable en `/docs`.

---

## Alcance y decisiones deliberadas

Esta app es **material de clase, no un producto para producción**. Varias "faltas" son decisiones pedagógicas:

- **Sin backend.** El browser llama a las APIs directo con `fetch`, sin SDKs, para que el request se vea entero. Consecuencia crítica: **las keys entran al bundle vía `import.meta.env` → no se puede deployar con keys reales.** Uso local solamente.
- **Sin react-router.** Routing manual (if-chain sobre `pathname`) para que el alumno vea el `pathname` crudo.
- **Sin tests, lint, TypeScript ni formatter.** La simplicidad del setup es parte del material.
- **El server MCP de juguete no usa SDK ni dependencias** — el JSON-RPC se ve a mano.
- **Nunca se muestra una key completa**: los paneles de debug la enmascaran siempre.

Qué queda **fuera de alcance**: deploy público, multi-usuario, autenticación, persistencia más allá de `localStorage`, y cualquier optimización que esconda el mecanismo que se quiere enseñar.

---

## Cómo correrla

Requisitos: Node.js y una key de OpenAI y/o Anthropic (solo para la capa "Taller"; la capa "Entender" y `/tokens` funcionan sin ninguna key).

```bash
npm install
npm run dev
```

Configurar las keys en un `.env` local (recordá: **no deployar**):

```bash
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Opcionales según qué labs quieras usar:

| Para | Hace falta |
|---|---|
| `/mcp` | `npm run mcp` en otra terminal (server de juguete en el puerto 3100) |
| Proveedor LM Studio | LM Studio con el server local activo (puerto 1234) y un modelo cargado — se detecta desde la UI |
| Proveedor Ollama | `OLLAMA_ORIGINS=* ollama serve` (el wrapper existe; hoy no está en el selector del Chat) |
| `/razonamiento` | Modelos razonadores: `VITE_OPENAI_REASONING_MODEL` / `VITE_ANTHROPIC_REASONING_MODEL` (hay defaults) |

La lista completa de variables de entorno y sus defaults está en [docs/architecture/proveedores.md](docs/architecture/proveedores.md#variables-de-entorno).

---

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — índice técnico: mapa completo de rutas, vista de pájaro, convenciones para extender.
- [docs/architecture/](docs/architecture/) — detalle por área: proveedores, chat, agentes, ventana de contexto, labs, i18n, recorrido y demos, localStorage.
- [CLAUDE.md](CLAUDE.md) — reglas no negociables para tocar el código.
