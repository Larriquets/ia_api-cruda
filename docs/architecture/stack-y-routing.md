# Stack y routing

> Parte de [docs/ARCHITECTURE.md](../ARCHITECTURE.md). Acá vive el detalle del stack técnico y del routing manual.

## Stack

| Pieza | Versión | Para qué |
|---|---|---|
| React | 18.3 | UI |
| Vite | 5.4 | Dev server + bundler |
| @monaco-editor/react | 4.7 | Editor de código en `/editor`, `/loop-agentico`, `/agents-md*` |
| gpt-tokenizer | 3.4 | BPE de OpenAI (o200k_base / cl100k_base) corriendo 100% local en `/tokens` — sin API |
| `fetch` nativo | — | Todas las llamadas HTTP. No hay SDKs de provider. |

Sin TypeScript, sin lint, sin tests (hay un único `anthropic.test.js` suelto), sin formatter. Es deliberado: la idea es que el alumno lea código JS plano y vea el `fetch` crudo.

Scripts (todos vía Vite):

```
npm run dev      # vite, puerto 5173
npm run build    # bundle producción
npm run preview  # servir el build
npm run mcp      # server MCP de juguete, puerto 3100 (para /mcp)
```

## Routing manual (sin react-router)

[vite.config.js](../../vite.config.js) define un middleware `spaFallback` que reescribe a `/` cualquier URL sin extensión. El router corre entonces **en el browser**, en [App.jsx](../../src/App.jsx): el state `page` se inicializa con una cadena de `if` sobre `window.location.pathname`, y más abajo una cadena equivalente de `if (page === …)` devuelve el componente de página. (Referenciar por nombre, no por línea: ambos bloques se mueven con cada feature.)

```
window.location.pathname → state `page` → if-chain → componente de página
```

[ModeSwitch.jsx](../../src/ModeSwitch.jsx) renderiza el header con `<a href="/ruta">` (no `<Link>` ni `pushState`), forzando recarga completa. Esto es intencional: el alumno ve el `pathname` cambiar en la barra de direcciones y cada página arranca con state limpio salvo lo que vive en `localStorage`.

## Dos puertas, un edificio

La raíz `/` es una landing ([Entrada.jsx](../../src/Entrada.jsx)) que separa la app por audiencia sin duplicar contenido:

- La puerta **"Entender"** lleva a `/recorrido` y a los tutos `/tutos/*` **nombrados por la pregunta humana** (¿por qué se olvida?, ¿qué son los tokens?, …). La lista vive en [preguntas.js](../../src/preguntas.js), compartida con el dropdown "Entender" de ModeSwitch y la nav de los tutos — un solo lugar para que no se desincronicen.
- La puerta **"Taller"** lleva al Chat (`/chat`) y a la lista completa de modos, labs y demos animadas. La lista vive en [taller.js](../../src/taller.js) (`MODOS` + `LABS` + `DEMOS`), compartida con los dropdowns "Modos" y "Labs" de ModeSwitch — mismo patrón que `preguntas.js`, un solo lugar para que no se desincronicen. Los emojis viven en el dato, no en la clave i18n.

El puente es bidireccional:

- Cada demo/doc tiene su `TryModeCTA` ([TryModeCTA.jsx](../../src/TryModeCTA.jsx)) hacia el lab real.
- Cada lab con demo gemela monta [DemoBacklink.jsx](../../src/DemoBacklink.jsx) (tira fina bajo el header) hacia su versión guiada. Hoy lo montan: Chat (`/demo/chat`), Editor (`/demo/editor`), Loop Agéntico (`/demo/loop`), AGENTS.md (`/demo/agents-md` o `/demo/agents-md-skills` según `withSkills`) y Razonamiento (`/demo/razonamiento`).

La landing no monta el `WelcomeModal` (la landing *es* la bienvenida) ni el `ModeSwitch`: su header muestra solo el toggle de idioma, porque las dos puertas *son* la navegación.

## Agregar una ruta nueva

1. Crear el componente en `src/`.
2. En [App.jsx](../../src/App.jsx), sumar el `if` en el inicializador del state `page` (mapea `pathname` → nombre de página) **y** el `if (page === …)` en el bloque de render condicional.
3. Agregar la entrada en la fuente de datos de la puerta que corresponda: [taller.js](../../src/taller.js) (`MODOS`, `LABS` o `DEMOS`) si es un modo, lab o demo animada — alimenta la landing y los dropdowns "Modos"/"Labs" de [ModeSwitch.jsx](../../src/ModeSwitch.jsx) a la vez —, o [preguntas.js](../../src/preguntas.js) si es un tuto "por pregunta" para no programadores (alimenta landing, dropdown "Entender" y la nav de [Tutos.jsx](../../src/Tutos.jsx)). Links que no son ni modo ni lab ni pregunta (ej. anexos de docs) van directo en ModeSwitch.jsx.

No introducir `react-router`. El routing crudo es parte del material didáctico.

El mapa completo de rutas vive en [docs/ARCHITECTURE.md](../ARCHITECTURE.md#mapa-de-rutas).
