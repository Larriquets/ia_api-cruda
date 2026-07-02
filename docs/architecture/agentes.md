# Agentes (loop function-calling)

> Parte de [docs/ARCHITECTURE.md](../ARCHITECTURE.md). Acá vive el detalle del loop agéntico, las herramientas, el human-in-the-loop y el lazy-loading de skills.

## Arquitectura común

[agent-tools.js](../../src/agent-tools.js) define **un único set de herramientas neutras** que cada wrapper adapta al shape de su API:

```
agent-tools.js (defs neutras)
   │
   ├─ getAgentToolDefs({ includeImpact, includeSkills }) → array de {name, description, parameters}
   ├─ runAgentTool(name, input, state) → {result, isError}
   ├─ AGENT_SYSTEM_PROMPT (prompt base)
   ├─ buildSkillsIndex(skills) (índice corto para el system)
   └─ NEEDS_HUMAN_APPROVAL (sentinel para pausar el loop)
```

Cada wrapper agéntico (`*-agent.js`) traduce el shape:

| Wrapper | Tools shape |
|---|---|
| [anthropic-agent.js](../../src/anthropic-agent.js) | `{name, description, input_schema}`; respuesta en `content[]` con `tool_use` blocks; resultados en `role:'user'` con bloques `tool_result` |
| [openai-agent.js](../../src/openai-agent.js) | `{type:'function', function:{name, description, parameters}}`; respuesta en `tool_calls[]` con `arguments` **como string JSON** (hay que `JSON.parse`); resultados como mensajes `role:'tool'` con `tool_call_id` |
| [lmstudio-agent.js](../../src/lmstudio-agent.js) | Igual que OpenAI (LM Studio expone shape compatible) |

## Herramientas disponibles

| Tool | Para qué | Disponible en |
|---|---|---|
| `read_code` | Devuelve el código actual completo | Siempre |
| `edit_code` | Reemplaza un fragmento (`old_string` → `new_string`); valida que `old_string` aparezca exactamente una vez | Siempre |
| `assess_impact` | Pide al humano que apruebe un plan antes de editar; usa el sentinel `NEEDS_HUMAN_APPROVAL` | Opt-in (`requireImpactApproval`) |
| `load_skill` | Trae el body markdown de un skill a contexto; el body NO viaja en el system inicial | Solo `/agents-md-skills` |
| `run_skill_test` | Corre un test JS determinístico sobre el código (regex sobre código Java); devuelve PASS o violaciones concretas | Solo `/agents-md-skills` |

## Loop

Pseudocódigo común a los tres wrappers:

```
mientras iter < maxIterations:
  POST API con system + messages + tools
  si stop_reason !== 'tool_use' (Anthropic) o finish_reason !== 'tool_calls' (OpenAI/LM Studio):
    extraer texto final, break
  para cada tool_use:
    result = runAgentTool(name, input, state)
    si noise.enabled: result = bloatToolResult(result, ...)
    push tool_result al messages[]
  iter += 1
```

`state` es el objeto compartido entre llamadas:

```js
{
  getCode(), setCode(next),         // archivo virtual único
  approved, requireImpactApproval,  // gating por assess_impact
  awaitApproval(payload),           // async, dispara UI human-in-the-loop
  skills, loadedSkillIds,           // tracking de skills cargados
}
```

## Human-in-the-loop

`assess_impact` devuelve `NEEDS_HUMAN_APPROVAL` (Symbol). El wrapper detecta el sentinel y llama a `state.awaitApproval(payload)`, que la UI implementa mostrando un modal. Si el humano cancela, el siguiente `edit_code` falla porque `state.approved === false`.

## Skills (lazy-loading)

Patrón clave en `/agents-md-skills`:

1. **El AGENTS.md** solo lista skills disponibles (id + descripción corta + flag `[test ✓]`) vía `buildSkillsIndex`. **Los bodies NO viajan en el system inicial.**
2. **La IA decide** llamar a `load_skill(id)` cuando juzga que un skill aplica al pedido. Recién ahí el body markdown completo entra al contexto.
3. **Si el skill tiene test** (registry en [skill-tests.js](../../src/skill-tests.js)), después de cada `edit_code` y antes de terminar la corrida la IA debe correr `run_skill_test(id)`. El test es código JS que evalúa el código (regex sobre Java) y devuelve `PASS` o lista de violaciones concretas.

Pedagógicamente importa que `load_skill` (prompt) y `run_skill_test` (código verificable) estén separadas: muestra la diferencia entre "instrucciones que la IA lee" e "instrucciones que la IA ejecuta y obedece bajo penalidad de FAIL".

## Continuación de conversación agéntica

Los wrappers aceptan `previousMessages` para retomar una conversación. `LoopAgentico` persiste el thread en `localStorage.agente_context_thread` y lo pasa en cada nueva instrucción.

## Reglas al extender

- Proveedores agénticos nuevos siguen el contrato de [agent-tools.js](../../src/agent-tools.js): defs neutras + `runAgentTool`, y respetan el sentinel `NEEDS_HUMAN_APPROVAL`.
- Los wrappers agénticos exponen el mismo contrato de hooks de debug que los de chat (ver [proveedores.md](proveedores.md#contrato-del-wrapper)).
