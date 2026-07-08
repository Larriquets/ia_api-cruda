# Recorrido para no programadores y demos sin API

> Parte de [docs/ARCHITECTURE.md](../ARCHITECTURE.md). Acá vive el detalle de la capa "Entender": el recorrido guiado, los tutos `/tutos/*`, las mini-demos inline, las demos animadas `/demo/*` (hoy colgadas de la puerta 2) y el lector TTS.

**Identidad visual**: la puerta 1 se distingue con el verde `#22c55e` (el mismo de la puerta "Entender" en la landing). Se aplica con la clase `.puerta1` en el root de [Recorrido.jsx](../../src/Recorrido.jsx) y [Tutos.jsx](../../src/Tutos.jsx) + un bloque de overrides al final de [styles.css](../../src/styles.css): header, TOC, nav lateral, CTAs de la escalera, pager y mini-demos viran del azul genérico al verde. Los azules semánticos no se tocan (carta `user`, links de prosa celestes). Página nueva de la puerta 1 → sumarle `.puerta1` al root y hereda el acento.

## Recorrido (`/recorrido`)

Página narrada pensada como **puerta de entrada para profesionales no técnicos** que ya usan IA en el trabajo y quieren intuición sobre por qué falla, alucina o "se olvida". No es una versión simplificada de la app: es la **misma verdad** contada con metáforas, y cada parada termina con la misma escalera de dos escalones que los tutos (`ParadaCTA` en [RecorridoBody.jsx](../../src/content/RecorridoBody.jsx), clases `.tuto-next-links`): 🎬 la demo animada sin API y 🔬 el lab real. Copy de la escalera vía namespace `recorrido.*` del i18n.

### Estructura

Mismo patrón que `/como-funciona`: el andamiaje (header + TOC con scroll-spy vía `IntersectionObserver`) vive en [Recorrido.jsx](../../src/Recorrido.jsx); la prosa vive en **módulos de contenido por idioma** [content/RecorridoBody.jsx](../../src/content/RecorridoBody.jsx) (`RecorridoBodyEs` / `RecorridoBodyEn`), elegidos por `lang`. Los `id` de sección son anclas internas, **idénticas en ambos idiomas**.

Las 7 paradas: predictor de tokens → temperatura (la perilla del azar) → tokens → memoria (carta nueva) → ventana de contexto → especificidad → ruido, cada una con su escalera demo → lab: `/demo/logprobs` → `/logprobs` (predictor y temperatura comparten escalera: el lab de logprobs tiene el `TemperatureControl`), `/demo/tokens` → `/tokens`, `/demo/chat` → `/chat` (modo Crudo), `/demo/ventana-contexto` → `/ventana-contexto`, `/demo/especificidad` → `/especificidad`, `/demo/ruido` → `/ruido`. Después de las paradas hay una **yapa de seguridad** (`#seguridad`: confidencialidad de lo que se pega + prompt injection, con link a `/demo/prompt-injection`) y el cierre "Qué llevarte" (`#llevar`), que deriva a los tutos que el recorrido no cubre (`/tutos/fuentes`, `/tutos/piensa`, `/tutos/agentes`, `/tutos/reglas`) y, como salida secundaria, a `/como-funciona`.

Navegación: se llega desde la puerta "Entender" de la landing (`/`). No aparece en el header de la puerta 2 (`ModeSwitch`) ni en [DocsNav.jsx](../../src/DocsNav.jsx): la puerta 1 tiene su propia nav. El sidebar del recorrido muestra [TutosNav.jsx](../../src/TutosNav.jsx) (los tutos de `PREGUNTAS`, la misma nav lateral que los tutos), no el `DocsNav` de los anexos técnicos.

### Mini-demos inline

Cada parada del recorrido embebe una **mini-demo interactiva sin API** que vive en [src/content/recorrido/](../../src/content/recorrido/):

| Componente | Parada | Qué muestra |
|---|---|---|
| `DemoPredictor.jsx` | Predictor de tokens | La próxima palabra elegida por probabilidad |
| `DemoTemperatura.jsx` | Temperatura | La perilla frío/normal/caliente afilando o achatando la lotería, con sorteo real (`Math.random`) |
| `DemoTokens.jsx` | Tokens | Texto partiéndose en piezas |
| `DemoMemoria.jsx` | Memoria | Cada request es una carta nueva |
| `DemoVentana.jsx` | Ventana de contexto | Mensajes que quedan afuera al podar |
| `DemoPedido.jsx` | Especificidad | Pedido vago vs pedido con criterios |
| `DemoRuido.jsx` | Ruido | Señal vs relleno en el contexto |

Son componentes autocontenidos (estado local, sin `localStorage`, sin fetch), montados por `RecorridoBody` en ambos idiomas.

## Tutos (`/tutos/*`)

La capa más accesible de la puerta 1: **una página por pregunta humana** de `PREGUNTAS`. Cada tuto = prosa corta con la metáfora de la carta + una **mini-demo interactiva sin API** + escalera hacia abajo (CTA a la demo animada y al lab real). El andamiaje (header, nav lateral, CTAs) vive en [Tutos.jsx](../../src/Tutos.jsx) (registro `TUTOS` por slug); el cuerpo por idioma en [src/content/tutos/](../../src/content/tutos/) (`TutoXxxEs` / `TutoXxxEn`, mismo patrón que `RecorridoBody`).

| Ruta | Pregunta | Mini-demo | Escalera (demo → lab) |
|---|---|---|---|
| `/tutos/memoria` | ¿Se acuerda de lo que le digo? | `DemoMemoria` (reusada del recorrido) | `/demo/chat` → `/chat` |
| `/tutos/tokens` | ¿Qué es un token? | `DemoTokens` (reusada del recorrido) | `/demo/tokens` → `/tokens` |
| `/tutos/inventa` | ¿Por qué inventa cosas? | `DemoPredictor` (reusada del recorrido) | `/demo/logprobs` → `/logprobs` |
| `/tutos/fuentes` | ¿De dónde saca lo que responde? | `DemoFuentes` (nueva) | `/demo/rag` → `/rag` |
| `/tutos/piensa` | ¿"Piensa" antes de responder? | `DemoPiensa` (nueva) | `/demo/razonamiento` → `/razonamiento` |
| `/tutos/agentes` | ¿Cómo hace cosas? | `DemoAgente` (nueva) | `/demo/loop` → `/loop-agentico` |
| `/tutos/reglas` | ¿Cómo se le dan reglas? | `DemoReglas` (nueva) | `/demo/agents-md` → `/agents-md` |

Las mini-demos nuevas viven en [src/content/tutos/](../../src/content/tutos/) y reusan las clases CSS `recorrido-*` (mismo lenguaje visual que las del recorrido). No persisten nada en `localStorage`.

Al pie de cada tuto hay un **pager anterior/siguiente** (`.tuto-pager` en [Tutos.jsx](../../src/Tutos.jsx)) que sigue el orden de `PREGUNTAS`: la puerta 1 se puede recorrer como camino, no solo como menú. La escalera hacia abajo (demo → lab) sigue estando justo antes.

## Landing de dos puertas (`/`)

[Entrada.jsx](../../src/Entrada.jsx) es la puerta de entrada por audiencia (detalle del concepto en [stack-y-routing.md](stack-y-routing.md#dos-puertas-un-edificio)):

- **Puerta "Entender"**: CTA a `/recorrido` + la lista de tutos **nombrados por la pregunta humana** de [preguntas.js](../../src/preguntas.js) (`PREGUNTAS`: cada una → su `/tutos/*`). La misma lista alimenta la nav lateral de los tutos ([TutosNav.jsx](../../src/TutosNav.jsx)) — un solo lugar para que no se desincronicen. El header de la puerta 2 (`ModeSwitch`) no lista la puerta 1: se entra por la landing.
- **Puerta "Taller"**: CTA a `/chat` + la lista completa de [taller.js](../../src/taller.js) (`MODOS` + `LABS` + `DEMOS`, con títulos de sección) + link a `/docs`. La misma fuente alimenta los dropdowns "Modos" y "Labs" del header — espejo del patrón de `preguntas.js`. Las demos animadas cuelgan de esta puerta: son la versión guiada del taller, no la capa para no programadores (esa son los tutos).

La landing *es* la bienvenida (no hay modal de bienvenida). Copy vía namespace `entrada.*` del i18n.

## Demos animadas (`/demo/*`)

Comparadores animados **sin API ni key**: simulan el intercambio para que un no programador vea el mecanismo sin configurar nada. Cada una tiene su `TryModeCTA` al lab real.

| Ruta | Componente | Qué compara/anima |
|---|---|---|
| `/demo/chat` | [ModosChat.jsx](../../src/ModosChat.jsx) | Los 3 modos de contexto del Chat |
| `/demo/editor` | [ModosEditor.jsx](../../src/ModosEditor.jsx) | Los 2 modos del Editor |
| `/demo/loop` | [ComoEdita.jsx](../../src/ComoEdita.jsx) | Cómo la IA "edita código" vía `tool_use` |
| `/demo/rag` | [ModosRag.jsx](../../src/ModosRag.jsx) | RAG en 4 pasos: indexar → vectorizar pregunta → ranking → POST |
| `/demo/tokens` | [ModosTokens.jsx](../../src/ModosTokens.jsx) | Tokens en 4 pasos: frase → piezas → IDs → la cuenta (tokenización real con el BPE local del lab, sin API) |
| `/demo/logprobs` | [ModosLogprobs.jsx](../../src/ModosLogprobs.jsx) | La lotería del próximo token: candidatos con barras, elección y la frase completándose |
| `/demo/mcp` | [ModosMcp.jsx](../../src/ModosMcp.jsx) | El intercambio JSON-RPC completo: initialize → tools/list → tools/call → resultado |
| `/demo/ventana-contexto` | [ModosVentana.jsx](../../src/ModosVentana.jsx) | El desborde de la ventana y las dos salidas: podar (FIFO) vs resumir (compaction) |
| `/demo/ruido` | [ModosRuido.jsx](../../src/ModosRuido.jsx) | Context rot: el mismo dato, limpio vs enterrado en logs, y las dos respuestas |
| `/demo/especificidad` | [ModosEspecificidad.jsx](../../src/ModosEspecificidad.jsx) | Pedido vago vs criterios explícitos, evaluados con checklist |
| `/demo/prompt-injection` | [ModosInjection.jsx](../../src/ModosInjection.jsx) | El mail con orden escondida: ataque sin defensa y defensa en el system |
| `/demo/razonamiento` | [ModosRazonamiento.jsx](../../src/ModosRazonamiento.jsx) | OpenAI vs Claude "pensando" (qué expone cada uno) |
| `/demo/agents-md` | [ModosAgentsMd.jsx](../../src/ModosAgentsMd.jsx) | Con y sin AGENTS.md |
| `/demo/agents-md-skills` | [ModosAgentsMdSkills.jsx](../../src/ModosAgentsMdSkills.jsx) | AGENTS.md "fat" vs skill con test |

Las demos no persisten nada en `localStorage`.

### Puente lab ↔ demo

[DemoBacklink.jsx](../../src/DemoBacklink.jsx) es el camino inverso del `TryModeCTA`: una tira fina bajo el header de los labs que tienen demo gemela, para que el que entró por la puerta técnica y se perdió pueda bajar a la versión animada. Montado en: Chat → `/demo/chat`, Editor → `/demo/editor`, Loop Agéntico → `/demo/loop`, AGENTS.md → `/demo/agents-md[-skills]` (según `withSkills`), Razonamiento → `/demo/razonamiento`.

## Lector text-to-speech

[SpeechReader.jsx](../../src/SpeechReader.jsx) permite **escuchar** la página en vez de leerla. Usa la **Web Speech API nativa** del browser (`window.speechSynthesis`) — sin librería ni API externa, coherente con "la simplicidad es el material". Montado en el `aside` sticky del sidebar (queda visible al scrollear) de las páginas de docs (`/recorrido`, `/docs`, `/como-funciona`, `/proveedores`, `/contexto`, `/tutos/*`) **y de todas las demos animadas `/demo/*`**. En las demos lee lo que está en el DOM en ese momento: los pasos que todavía no se revelaron no se leen.

Cómo funciona:

- **Trocea por fragmento**: lee los `h2`/`p`/`li` que cuelgan de `containerSelector` (`.docs-main`) en orden de DOM, **un `SpeechSynthesisUtterance` por elemento**. Trocear así evita el bug de Chrome que corta los utterances largos (~15s) y permite **resaltar** (clase `.speech-reading`) y auto-scrollear el fragmento en curso.
- **Voz por idioma**: `pickVoice` prioriza `es-AR` → LatAm → cualquier `es-*` en español, y `en-US` → cualquier `en-*` en inglés. Las voces llegan async en varios browsers → se escucha `voiceschanged`. Caveat: las voces dependen del SO; si no hay voz del idioma instalada, el SO puede caer a otra.
- **Saca emojis** del texto que va al motor (`stripEmoji`, vía `\p{Extended_Pictographic}`) para no leerlos en voz alta; el resaltado visual los conserva.
- **Controles**: play/pause/resume (`speechSynthesis.pause()`/`.resume()`), stop, y selector de velocidad (`rate`, 0.8×–1.5×).
- **Robustez de callbacks**: un `sessionRef` (contador) invalida los `onend`/`onstart` de utterances viejos tras un stop/cambio de idioma, para que `cancel()` no dispare la cadena `speakFrom` siguiente. Se hace `hardStop()` al desmontar y al cambiar `lang` (el texto en pantalla cambió).
- **No persiste nada** en `localStorage` (estado efímero de reproducción). Si el browser no soporta `speechSynthesis`, muestra un aviso (`speech.unsupported`) en vez de un botón muerto.

i18n: namespace `speech.*` en [es.js](../../src/i18n/es.js) / [en.js](../../src/i18n/en.js). Estilos: bloque `.speech-reader` + `.speech-reading` en [styles.css](../../src/styles.css).
