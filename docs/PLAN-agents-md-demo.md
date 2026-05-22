# Plan: `/demo/agents-md` - por que AGENTS.md cambia el comportamiento del agente

> Documento de planificacion. Todavia no hay codigo.
>
> **Pregunta que la pagina tiene que contestar al alumno:** "Si la IA nace de cero en cada request, como hago para que respete las reglas de mi proyecto?". Esa es la unica pregunta.

---

## 1. La idea-fuerza unica

AGENTS.md no entrena a la IA. No le instala memoria. No hace que el modelo "conozca" tu repo.

AGENTS.md es mas simple:

```
system base del agente
       +
texto completo de AGENTS.md
       +
historial del loop
       +
instruccion del usuario
       =
request que lee una IA recien nacida
```

La pagina tiene que dejar grabada esta frase:

**AGENTS.md es texto que tu app vuelve a mandar en cada request para que una IA sin memoria actue como si conociera las reglas del proyecto.**

El concepto a destruir: **"la IA aprendio mis convenciones"**.  
La verdad: **"mi cliente se las repite en el system prompt cada vez"**.

Todo lo demas es secundario.

---

## 2. Donde encaja en la linea de demos

La linea actual ya tiene:

| Demo | Pregunta que responde |
|---|---|
| `/demo/chat` | Que cambia entre no mandar historial, mandarlo desde el cliente o delegarlo al proveedor. |
| `/demo/editor` | Que cambia entre editar codigo sin contexto y editar acumulando historial. |
| `/demo/loop` | Como una IA pide herramientas y tu codigo ejecuta los cambios. |

Entonces `/demo/agents-md` no debe volver a explicar tool-use desde cero. Debe asumir que el alumno ya entendio `/demo/loop` y mostrar **que cambia cuando el system incluye reglas del proyecto**.

La demo debe ser:

```
mismo codigo inicial
mismo prompt humano
mismo loop mockeado
unica variable: AGENTS.md incluido o ignorado
```

---

## 3. La pantalla

Una sola pantalla comparativa, sin API real.

```
/demo/agents-md
AGENTS.md no entrena: se inyecta en cada request

[Intro corta]
"Mismo agente, misma tarea, mismo codigo. A la izquierda corre sin AGENTS.md.
A la derecha corre con AGENTS.md. La unica diferencia es el system prompt."

[Controles]
[Siguiente] [Auto] [Reiniciar]
Paso 2 de 6

┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ AGENTS.md                    │ SIN AGENTS.md                 │ CON AGENTS.md                 │
│ reglas visibles              │ corrida generica              │ corrida con reglas             │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ # AGENTS.md                  │ system: base                  │ system: base + AGENTS.md       │
│ - medir impacto antes        │ tool_use: read_code           │ tool_use: assess_impact        │
│ - prefijo bco_ en nuevos     │ tool_use: edit_code           │ tool_result: impacto medium    │
│ - pedir aprobacion humana    │ final: Metodo retirar agregado│ tool_use: edit_code            │
│                              │                               │ final: bco_retirar agregado    │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────┘

[Narrador inferior]
"Aca esta la diferencia: sin AGENTS.md el agente fue directo a editar.
Con AGENTS.md primero pidio assess_impact porque esa regla viajo en el system."
```

### Por que tres columnas

- **Izquierda: AGENTS.md.** El alumno ve las reglas que se estan inyectando. No es magia ni estado oculto: es texto.
- **Centro: SIN AGENTS.md.** El agente actua con convenciones genericas.
- **Derecha: CON AGENTS.md.** El agente obedece reglas que no estaban en el prompt humano.

No conviene dos columnas solamente porque el archivo de reglas tiene que estar siempre visible. La demo se trata de ver el causal: **esta linea del AGENTS.md explica esta decision del agente**.

---

## 4. Guion fijo

Prompt humano fijo:

> "Agrega un metodo retirar(monto)."

Codigo inicial:

```java
public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }
}
```

AGENTS.md fijo:

```md
# AGENTS.md

## Reglas obligatorias
- Antes de editar, medir impacto con assess_impact.
- Todo metodo nuevo debe usar el prefijo bco_.
- Rechazar montos invalidos con IllegalArgumentException.
```

### Corrida SIN AGENTS.md

| Paso | Actor | Que se ve | Resultado |
|---|---|---|---|
| 0 | Usuario | "Agrega un metodo retirar(monto)." | Codigo base |
| 1 | IA | `tool_use: read_code()` | Pide ver el archivo |
| 2 | Codigo | `tool_result: <codigo base>` | Devuelve el codigo |
| 3 | IA | `tool_use: edit_code(...)` | Agrega `retirar(double monto)` |
| 4 | Codigo | `tool_result: OK + codigo nuevo` | Codigo queda generico |
| 5 | IA | `text: "Listo..."` | Termina |

Codigo final SIN:

```java
public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }

    public void retirar(double monto) {
        saldo -= monto;
    }
}
```

### Corrida CON AGENTS.md

| Paso | Actor | Que se ve | Resultado |
|---|---|---|---|
| 0 | Usuario | "Agrega un metodo retirar(monto)." | Codigo base |
| 1 | Request | `system = base + AGENTS.md` | Se resalta la inyeccion |
| 2 | IA | `tool_use: assess_impact(...)` | Obedece la regla "medir antes" |
| 3 | Codigo | `tool_result: medium + aprobado` | Simula aprobacion humana |
| 4 | IA | `tool_use: read_code()` | Lee el archivo |
| 5 | Codigo | `tool_result: <codigo base>` | Devuelve el codigo |
| 6 | IA | `tool_use: edit_code(...)` | Agrega `bco_retirar` con validacion |
| 7 | Codigo | `tool_result: OK + codigo nuevo` | Codigo queda con convenciones |
| 8 | IA | `text: "Listo..."` | Termina |

Codigo final CON:

```java
public class CuentaBancaria {
    private double saldo;

    public void depositar(double monto) {
        saldo += monto;
    }

    public void bco_retirar(double monto) {
        if (monto <= 0) {
            throw new IllegalArgumentException("Monto invalido");
        }
        saldo -= monto;
    }
}
```

---

## 5. Momentos pedagogicos que deben frenarse

El narrador inferior debe tener mensajes fuertes en cuatro momentos:

| Momento | Mensaje |
|---|---|
| Al mostrar el request CON | **AGENTS.md no esta "cargado" en la IA.** Esta pegado al system prompt de este request. En el proximo request hay que mandarlo otra vez. |
| Cuando CON llama `assess_impact` | **Esta tool call no salio del prompt humano.** Salio de una regla del AGENTS.md. |
| Cuando SIN edita directo | **Sin AGENTS.md, el agente usa defaults genericos.** No sabe que tu proyecto exige medir impacto ni prefijos. |
| Al ver los dos codigos finales | **Mismo modelo, mismo prompt, distinto system.** La diferencia de comportamiento viene del contexto que tu app decidio mandar. |

---

## 6. Que NO va en esta pagina

Para no pisar otros modos, esto queda afuera:

- No llamar API real.
- No selector de provider.
- No skills.
- No `run_skill_test`.
- No edicion libre de AGENTS.md.
- No timeline completa de `/agents-md` real.
- No tokens detallados.
- No comparar muchos prompts.
- No explicar otra vez como `edit_code` modifica strings; eso ya lo enseña `/demo/loop`.

La pagina es una demo guiada, no un segundo `/agents-md`.

---

## 7. Detalles visuales

### Columna AGENTS.md

Mostrar el archivo como bloque markdown oscuro, con resaltado por regla:

- Regla activa en amarillo cuando se ve en el `system`.
- Regla `assess_impact` en verde cuando el agente llama esa tool.
- Regla `bco_` en verde cuando aparece `bco_retirar`.
- Regla de validacion en verde cuando aparece `IllegalArgumentException`.

### Columnas SIN / CON

Cada columna mezcla dos cosas:

1. **Mini timeline** arriba: burbujas `tool_use`, `tool_result`, `text`.
2. **Codigo final actual** abajo: un `<pre>` con highlights de lineas nuevas.

El contraste tiene que ser visible sin leer todo:

- SIN: gris / azul, mas directo, menos pasos.
- CON: verde / amarillo, mas pasos, reglas marcadas.

### Request/system preview

En el paso clave, mostrar una banda compacta:

```js
system: AGENT_SYSTEM_PROMPT
      + "\n\n"
      + AGENTS_MD
```

No mostrar el JSON completo. Solo esa suma. El punto pedagogico es la concatenacion.

---

## 8. Cierre: los 3 bullets que se lleva el alumno

Al terminar la corrida aparece "Lo que importa":

1. **AGENTS.md viaja en el system prompt.** No entrena al modelo ni queda guardado dentro de la IA.
2. **La misma instruccion produce decisiones distintas si cambia el contexto.** En este caso, `assess_impact`, `bco_` y la validacion aparecen porque fueron reglas enviadas.
3. **El costo es repeticion.** Si el loop tiene 6 requests, AGENTS.md viaja 6 veces. Conviene que sea corto, concreto y accionable.

CTAs:

- "Ver el modo real editable -> `/agents-md`"
- "Ver la misma idea con skills -> `/agents-md-skills`"
- "Ver como se ejecutan las tools -> `/demo/loop`"

---

## 9. Plan de implementacion

### Etapa 1 - demo estatica navegable

- Crear `src/ModosAgentsMd.jsx`.
- Agregar ruta `/demo/agents-md` en `App.jsx`.
- Agregar link en `DocsNav` dentro de `DEMO_LINKS`.
- Agregar boton "Ver Demo" en `EditorAgentsMd.jsx` cuando `withSkills=false`.
- Crear arrays mock:
  - `AGENTS_MD_TEXT`
  - `INITIAL_CODE`
  - `WITHOUT_STEPS`
  - `WITH_STEPS`
  - `NARRATOR_BY_STEP`
- Render 3 columnas: AGENTS.md / SIN / CON.
- Botones `Siguiente`, `Auto`, `Reiniciar`.

**Salida:** el alumno puede avanzar paso a paso y ver que CON tiene decisiones que SIN no tiene.

### Etapa 2 - highlights pedagogicos

- Resaltar reglas del AGENTS.md segun el paso.
- Resaltar la concatenacion `system base + AGENTS.md`.
- Resaltar diferencias en codigo final:
  - `retirar` vs `bco_retirar`
  - ausencia/presencia de `IllegalArgumentException`
  - ausencia/presencia de `assess_impact`
- Agregar narrador inferior con los 4 mensajes clave.

**Salida:** la pagina explica causalidad, no solo muestra diferencias.

### Etapa 3 - integracion docs y pulido

- Agregar CTA en seccion `modo-agentsmd` de `Docs.jsx` apuntando a `/demo/agents-md`.
- Revisar copy existente que menciona "Comparar con/sin" para que coincida con la UI real actual.
- Reutilizar clases `mch-*` y/o `ce-*` donde alcance; agregar prefijo propio `mag-*` para lo especifico.
- Responsive:
  - desktop: 3 columnas.
  - tablet/mobile: AGENTS.md arriba, SIN y CON apilados.
- Verificar con Playwright:
  - `/demo/agents-md` carga sin errores.
  - controles avanzan y reinician.
  - no hay overflow horizontal en 1365px y 390px.

---

## 10. Riesgos

| Riesgo | Mitigacion |
|---|---|
| Que parezca una feature distinta del modo real | Mantener el mismo vocabulario visual: `AGENTS.md`, `system`, `assess_impact`, `tool_use`, `tool_result`. |
| Que el alumno crea que AGENTS.md solo sirve para Java | El cierre debe decir que el ejemplo es Java, pero el mecanismo aplica a cualquier repo: reglas de arquitectura, comandos, estilos, nombres. |
| Que la comparacion sea demasiado obvia | Bien. Esta demo es de primer contacto. El modo real `/agents-md` queda para experimentar con providers y prompts propios. |
| Que repita `/demo/loop` | No explicar el mecanismo de edicion; solo mostrar que el system cambia las decisiones del loop. |

---

## 11. Proximo paso

Implementar Etapa 1:

1. `src/ModosAgentsMd.jsx`
2. ruta `/demo/agents-md`
3. link en `DocsNav`
4. boton de demo en `/agents-md`
5. CSS minimo con prefijo `mag-*`

Despues de eso, correr `npm run dev` y revisar la pagina en desktop/mobile antes de pulir animaciones.
