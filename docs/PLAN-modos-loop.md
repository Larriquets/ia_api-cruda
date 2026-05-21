# Plan: `/demo/loop` — cómo una IA edita código, paso a paso

> Documento de planificación. Todavía no hay código.
>
> **Pregunta que la página tiene que contestar al alumno:** "¿Cómo hace la IA para tocar mi código si solo sabe generar texto?". Esa única pregunta. Todo lo demás es ruido.

---

## 1. La idea-fuerza única

**El alumno cree que la IA "abre el archivo y lo edita".** No. La IA solo genera texto. Lo que pasa atrás es:

```
IA escupe texto que dice "reemplazá X por Y"
       ↓
TU CÓDIGO lee ese texto, encuentra X en el string, lo cambia por Y
       ↓
TU CÓDIGO le devuelve a la IA el archivo entero ya modificado, también como texto
       ↓
IA lee ese texto y decide si terminó o si pide otro cambio
```

El concepto a destruir: **"la IA edita código"**. La verdad: **la IA pide ediciones; las hace tu código**.

Eso, y solo eso, es lo que esta página tiene que dejar grabado. Si después de mirarla 3 minutos el alumno puede explicar esa frase con sus palabras, ganamos. Todo lo demás (loop largo, AGENTS.md, skills, aprobación humana, ruido) son cosas que ya viven en `/loop-agentico` y `/agents-md-skills`. Acá no van.

---

## 2. Qué corté del plan anterior y por qué

El plan anterior tenía 5 escenarios (default / paranoico / AGENTS.md / skills / human-in-the-loop). Lo tiro entero. Razones:

| Cortado | Por qué |
|---|---|
| 5 escenarios distintos | Dispersa el foco. El alumno termina entendiendo "hay variantes" en vez de entender el mecanismo. |
| Toggle Anthropic / OpenAI shape | Eso pertenece a `/proveedores`, no acá. Distrae del "qué hace la IA". |
| Tokens acumulados | Métrica avanzada. Acá no importa cuánto cuesta — importa qué pasa. |
| Layout 3 columnas | Una columna era de tokens/state, otra de JSON crudo. Demasiado para una idea sola. Va a 2 columnas. |
| `assess_impact` / human-in-the-loop | Es una variante del loop, no parte del mecanismo base. |

Lo que **queda** del plan anterior: mocks fijos (no llamar API), foco en `tool_use` + `tool_result` como las dos piezas que tiene que ver el alumno, y la convicción de que el `messages[]` muta entre iteraciones.

---

## 3. La animación, en una sola pantalla

Pensar la página como **una animación guiada de UNA edición**. Sin escenarios, sin selector. Una corrida, comentada paso a paso, con un narrador en el costado que explica qué está pasando.

```
┌──────────────────────────────────────────────────────────────────────┐
│ /demo/loop                                                           │
│ cómo una IA edita código sin nunca "abrir" tu archivo               │
└──────────────────────────────────────────────────────────────────────┘

┌── Intro (corta) ─────────────────────────────────────────────────────┐
│ "Pediste: renombrá saldo a balance. ¿Cómo lo hace la IA?            │
│  Mirá los 4 pasos."                                                  │
│                                                                      │
│  [▶ Empezar]  [↺ Reiniciar]                                          │
└──────────────────────────────────────────────────────────────────────┘

┌── 2 columnas grandes ────────────────────────────────────────────────┐
│                                                                      │
│  COL IZQUIERDA: el archivo                COL DERECHA: el diálogo   │
│  ──────────────────────                   ──────────────────────    │
│                                                                      │
│  ┌─────────────────────────────────┐     ┌──────────────────────┐  │
│  │ class CuentaBancaria {          │     │ 👤 TÚ                │  │
│  │   double saldo;                 │     │ "Renombrá saldo      │  │
│  │   void depositar(double m) {    │     │  a balance."         │  │
│  │     saldo += m;                 │     │                      │  │
│  │   }                             │     │ ⏳ esperando…        │  │
│  │ }                               │     └──────────────────────┘  │
│  └─────────────────────────────────┘                                │
│                                                                      │
│  [el código se va modificando         [el diálogo va sumando        │
│   con highlights paso a paso]          burbujas paso a paso]        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌── Narrador (barra inferior fija) ────────────────────────────────────┐
│  PASO 3 de 6 — La IA pidió: edit_code(old="saldo", new="balance")   │
│  ↑ Fijate: NO te devolvió el archivo nuevo. Te pidió que tu         │
│    código haga el reemplazo.                                         │
│  [◀ Atrás]  [▶ Siguiente]                                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Por qué dos columnas y no tres

- **Izquierda: el archivo.** Es lo que el alumno espera ver. Es "su" archivo. Lo va a mirar para confirmar que cambió o no.
- **Derecha: el diálogo IA ↔ código.** Burbujas de chat con tres tipos de actor:
  - 👤 **TÚ** (el alumno) — solo en el paso 0.
  - 🤖 **IA** — burbujas con `tool_use(...)` que se ven como pedidos en texto, no como código abstracto.
  - ⚙️ **TU CÓDIGO** — burbujas con `tool_result(...)`, en otro color, dejando explícito que ESTE ES OTRO ACTOR.

La clave pedagógica es **el código del navegador como tercer personaje del diálogo**. El alumno tiene que verlo como un actor visible, no como infraestructura invisible.

No hay columna de "messages[] crudo". Eso ya está en `/loop-agentico` real. Acá no aporta.

---

## 4. El guion: una corrida de 6 pasos

Mock fijo. Sin variantes. El prompt fijo es **"Renombrá saldo a balance en toda la clase"**. El archivo arranca con un campo `saldo` y un método `depositar` que lo usa — dos lugares para cambiar. Por qué dos: para que el loop tenga dos `edit_code` y se vea que **la IA itera**.

| Paso | Actor | Burbuja en el diálogo | Cambio en el archivo |
|---|---|---|---|
| 0 | 👤 TÚ | "Renombrá saldo a balance en toda la clase." | — |
| 1 | 🤖 IA | `tool_use: read_code()` <br>_"Necesito ver el código antes de tocarlo"_ | — |
| 2 | ⚙️ TU CÓDIGO | `tool_result: <el archivo completo>` <br>_"Acá tenés"_ | Highlight de "leído" en el archivo |
| 3 | 🤖 IA | `tool_use: edit_code(old="double saldo;", new="double balance;")` <br>_"Reemplazá la declaración"_ | — |
| 4 | ⚙️ TU CÓDIGO | `tool_result: OK reemplazado + <archivo completo nuevo>` | **Archivo muta**: `saldo` → `balance` en la declaración. Línea en verde. |
| 5 | 🤖 IA | `tool_use: edit_code(old="saldo += m;", new="balance += m;")` | — |
| 6 | ⚙️ TU CÓDIGO | `tool_result: OK reemplazado + <archivo completo nuevo>` | **Archivo muta** otra vez. Otra línea en verde. |
| 7 | 🤖 IA | `text: "Listo, renombré saldo a balance en los dos lugares."` <br>`stop_reason: end_turn` | — |

(Son "8 pasos" si contás el 0 — pero el alumno cuenta 6 pasos del loop, lo cual está bien narrativamente.)

### Tres momentos donde paramos y narramos

El narrador (barra inferior) tiene mensajes específicos en tres puntos clave:

| Después del paso | Mensaje del narrador |
|---|---|
| 1 (la IA pidió `read_code`) | "**La IA no abrió tu archivo.** Te _pidió_ que se lo des. Es texto pidiéndole a tu código que ejecute una función." |
| 3 (la IA pidió `edit_code`) | "**La IA no editó nada.** Solo dijo en texto: 'reemplazá esto por esto'. El reemplazo lo hace tu código en el paso siguiente." |
| 4 (tu código devolvió el archivo modificado) | "**Tu código devolvió el archivo entero ya cambiado.** La IA no lo modificó: lo recibe ya modificado y mira si quedó como pedía." |

Esos tres mensajes son **el contenido educativo** de toda la página. Todo lo demás es vehículo.

---

## 5. Detalles visuales

### El diálogo (col derecha)

Las burbujas son chat-style. Tres colores fuertes y distinguibles:

- 👤 **TÚ:** fondo gris claro, borde a la derecha. _(Una sola burbuja, al inicio.)_
- 🤖 **IA:** fondo violeta tenue (matchea el badge de Anthropic en `/razonamiento`). Tres elementos visibles dentro:
  - Un tag arriba que dice `tool_use` o `text`.
  - El nombre de la herramienta (`read_code`, `edit_code`) en monospace.
  - Los argumentos en JSON formateado, indentado.
- ⚙️ **TU CÓDIGO:** fondo verde tenue (matchea `mch-msg-system` o similar). Tag `tool_result`. Adentro un preview corto del contenido devuelto (con "..." si es largo), con un botón "ver completo" colapsable.

El truco pedagógico está en **dibujar la burbuja de "TU CÓDIGO" exactamente con la misma jerarquía visual que la de "IA"**. Al alumno tiene que pegarle a primera vista que son DOS interlocutores conversando.

### El archivo (col izquierda)

Un `<pre>` con highlight de Java muy básico (no hace falta Monaco — la página es pedagógica, no editor). Tres estados visuales:

- **Inicial:** todo en color base.
- **Después de `read_code`:** un sutil "flash" del archivo entero (pulse rápido), indicando que se leyó. Sin cambios.
- **Después de `edit_code`:** la línea modificada se anima con un highlight verde + tachado en rojo de lo viejo encima por 1s, después se asienta como verde, después color normal.

### El narrador (barra inferior)

Tres líneas:

```
PASO 3 de 6 — La IA pidió: edit_code("saldo", "balance")
↑ La IA NO te devolvió el archivo nuevo. Pidió que tu código haga el reemplazo.
[◀ Atrás]  [▶ Siguiente]  [▶▶ Auto]
```

Linea 1 es factual ("qué pasó"). Línea 2 es interpretativa ("qué significa") — solo aparece en los 3 pasos clave (§4). Las otras veces queda vacía o con un texto neutro.

---

## 6. Lo que NO va en esta página

Para mantener el foco, esto explícitamente **no** entra:

- ❌ Selector de proveedor (Anthropic vs OpenAI vs LM Studio).
- ❌ Tokens, ni acumulados ni por iteración.
- ❌ El JSON crudo del `POST` (eso es `/loop-agentico` real).
- ❌ `system` prompt visible. (Lo asumimos como dado y lo tapamos.)
- ❌ `tools[]` array visible. (Idem.)
- ❌ AGENTS.md, skills, `run_skill_test`, `assess_impact`. **Nada de esto.**
- ❌ Variantes / escenarios / presets.
- ❌ Ruido (`bloatToolResult`).
- ❌ Edición manual del prompt del usuario.

Si el alumno quiere todo eso, ya está en `/loop-agentico` real, en `/agents-md-skills`, en `/ventana-contexto`. Esta página es **el primer contacto con el concepto**. Es la rampa.

---

## 7. Cierre — los 3 bullets que se lleva el alumno

Al final de la corrida (después del paso 6), aparece una sección "Lo que importa":

1. **La IA solo genera texto.** Cuando "edita código", lo que en realidad hace es escribir un pedido en formato estructurado (`tool_use`) describiendo el cambio. Tu código es quien aplica el cambio sobre el string del archivo.
2. **La IA no ve tu disco.** El archivo viaja como texto en cada `tool_result`. Si lo borrás del state, la IA no tiene cómo recuperarlo. Si querés que vea otro archivo, lo tenés que pasar también.
3. **El loop existe porque la IA itera.** No hace todo en una llamada. Pide ver, mira el resultado, pide editar, mira cómo quedó, pide editar otra vez, hasta que decide terminar. Ese "decide terminar" es el `stop_reason: end_turn`.

Y debajo: **CTAs claras a las páginas siguientes**:

- "¿Querés ver el JSON crudo de una corrida real? → [/loop-agentico](/loop-agentico)"
- "¿Querés ver cómo cambia con reglas (AGENTS.md, skills)? → [/agents-md-skills](/agents-md-skills)"
- "¿Querés ver la diferencia con el Editor (que NO es agéntico)? → [/demo/editor](/demo/editor)"

Eso último — el link a `/demo/editor` — es importante pedagógicamente. Cierra la trilogía Chat → Editor → Loop.

---

## 8. Plan de implementación

3 etapas, mucho más cortas que el plan anterior.

### Etapa 1 — el guion + las dos columnas estáticas (1-2 hs)
- Crear `src/ComoEdita.jsx`.
- Ruta `/demo/loop` en `App.jsx`. Link en `DocsNav` + dropdown Docs (siguiendo el patrón de `/demo/editor`).
- Mock fijo de los 7 pasos como array de objetos.
- Layout 2 columnas con `<pre>` izquierda y lista de burbujas derecha.
- Botones ▶ siguiente / ◀ atrás / ↺ reset / ▶▶ auto.
- Highlight verde básico en la línea editada (sin animación todavía).

**Salida:** alumno puede ir paso a paso y ver cómo crece el diálogo y muta el archivo. Concepto entendido.

### Etapa 2 — narrador + las 3 frases clave (30 min)
- Barra inferior fija con el narrador.
- Las 3 frases interpretativas en los pasos 1, 3, 4.
- Sección "Lo que importa" al final con los 3 bullets + CTAs.

**Salida:** la página enseña, no solo muestra.

### Etapa 3 — pulido visual (1 hs)
- Animación del highlight verde en `edit_code` (pulse + tachado).
- Pulse sutil en el archivo entero cuando ocurre `read_code`.
- Fade-in de cada burbuja nueva en el diálogo.
- Auto-play con timing apropiado para que se alcance a leer cada burbuja.

**Salida:** la página se siente _pensada_, no funcional-bruta.

---

## 9. Riesgos (acotados, porque la página es chica)

| Riesgo | Mitigación |
|---|---|
| Mocks divergen del shape real | Es texto pedagógico, no JSON crudo. Aunque el shape real cambie, las burbujas siguen siendo coherentes con el concepto. Bajo riesgo. |
| El alumno cree que el loop siempre es así de corto (5 iters) | El narrador final aclara: "una corrida real puede tener 2 o 15 iteraciones, según la complejidad." Y el CTA a `/loop-agentico` lo manda al real. |
| El alumno no entiende qué es `tool_use` | Por eso usamos el lenguaje de "burbuja de chat" en vez de "tool call". "TÚ → IA → TU CÓDIGO → IA → …" es metáfora suficiente. El JSON formal viene después. |

---

## 10. Próximo paso

Si te cierra el enfoque, arranco con Etapa 1: archivo `ComoEdita.jsx` + ruta + mock estático + las 2 columnas. Te aviso cuando esté navegable.

Tres cosas a confirmar antes:

1. ¿Te cierra el nombre `/demo/loop`? Otras opciones: `/edit-flow`, `/dialogo`, o quedarse en una ruta menos descriptiva.
2. ¿Te cierra que sean **6-7 pasos fijos** sin variantes? (vs hacer el guion configurable).
3. ¿Te cierra que el archivo de la corrida sea Java? (consistente con el resto de la app). Podría ser JS o algo más universal — pero Java mantiene la línea narrativa.
