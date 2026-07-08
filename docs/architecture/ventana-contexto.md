# Ventana de contexto (`/ventana-contexto`)

> Parte de [docs/ARCHITECTURE.md](../ARCHITECTURE.md). Acá vive el detalle de las estrategias de poda del contexto.

Lógica pura en [context-window.js](../../src/context-window.js). Tres estrategias para podar `messages[]` cuando supera un límite de tokens:

| Estrategia | Función | Qué hace |
|---|---|---|
| **FIFO** | `applyFifo(messages, limitTokens)` | Saca mensajes del más viejo al más nuevo hasta entrar en el límite. Puede cortar a mitad de turno. |
| **Sliding window** | `applySlidingWindow(messages, maxTurns)` | Conserva los últimos N turnos completos (turno = user + assistant). |
| **Compaction** | `applyCompaction(messages, limitTokens, summarizerFn)` | Toma los 2 turnos más nuevos como "frescos", pide a la IA un resumen del resto, lo inyecta como `role:'user'` con prefijo `[RESUMEN PREVIO]:`. Si aún se pasa, fallback a FIFO. |

**Invariante crítico:** `messages[0]` con `role:'system'` **nunca** se toca. El system editable siempre debe llegar al modelo, aunque el resto se pode.

`summarizerFn` se inyecta para no acoplar el módulo a ningún provider. [VentanaContexto.jsx](../../src/VentanaContexto.jsx) arma uno usando el provider activo del Chat.

`annotateMessages(full, trimmed)` etiqueta cada mensaje del array completo con `inRequest: bool` para que la UI pinte cuáles viajan y cuáles quedan fuera.
