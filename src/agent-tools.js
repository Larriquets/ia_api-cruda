// Definiciones compartidas por los wrappers agénticos (Anthropic + OpenAI).
// La idea: un único set de "herramientas" que el modelo puede llamar sobre el código.

export const AGENT_SYSTEM_PROMPT = `Sos un asistente de programación que edita código a través de herramientas.
Tenés un único archivo virtual con el código actual. Para modificarlo:

1. Si necesitás ver el código, llamá a la herramienta "read_code".
2. Para editarlo, llamá a "edit_code" con un fragmento exacto a reemplazar (old_string)
   y el reemplazo (new_string). El old_string DEBE coincidir literal con una porción única del código.
3. Podés llamar varias herramientas seguidas en distintos turnos antes de terminar.
4. Cuando termines, respondé con un texto breve en español describiendo qué hiciste. Eso termina el loop.

Reglas IMPORTANTES:
- SIEMPRE que el usuario te pida agregar, modificar o crear código, DEBÉS aplicar el cambio
  llamando a "edit_code". NO describas el cambio en texto ni respondas con código en un bloque.
  El único output válido para una modificación es la llamada a la herramienta.
- No reescribas el archivo completo de una. Hacé cambios quirúrgicos con edit_code.
- Si "edit_code" falla (old_string no encontrado o ambiguo), reintentá con un fragmento
  más específico — NO te rindas ni respondas en texto.
- DESPUÉS de cada edit_code exitoso, el tool_result te devuelve el código COMPLETO
  actualizado. ANTES de llamar a edit_code de nuevo, leé ese código y basá el próximo
  old_string en lo que efectivamente está ahí ahora — NO en lo que vos creés que está
  o en el código original. Tu old_string del próximo edit DEBE existir literal en el
  código que acabás de recibir, si no vas a duplicar bloques o corromper la estructura.
- Sé conciso en tus mensajes de texto finales.`

// Sentinel: cuando una tool devuelve este resultado, el wrapper sabe que tiene
// que pausar el loop y pedir confirmación al humano (en vez de devolver el
// tool_result al modelo automáticamente como con las otras tools).
export const NEEDS_HUMAN_APPROVAL = Symbol('NEEDS_HUMAN_APPROVAL')

const READ_CODE_TOOL_DEF = {
  name: 'read_code',
  description: 'Devuelve el contenido actual del archivo de código.',
  parameters: {
    type: 'object',
    properties: {},
  },
}

const ASSESS_IMPACT_TOOL_DEF = {
  name: 'assess_impact',
  description:
    'Evalúa el impacto del cambio y pide aprobación al humano para seguir. ' +
    'Usala cuando las instrucciones del proyecto lo exijan. El humano puede aprobar o cancelar. ' +
    'Niveles: "low" (cambios puntuales sin tocar APIs), "medium" (varios edits o ' +
    'clase nueva chica), "high" (rompe APIs, refactor estructural, varias clases nuevas).',
  parameters: {
    type: 'object',
    properties: {
      level: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Nivel de impacto del cambio propuesto',
      },
      summary: {
        type: 'string',
        description: 'Resumen en 1-2 frases de qué vas a hacer',
      },
      plan: {
        type: 'string',
        description: 'Plan paso a paso de los edits que vas a aplicar (lista en texto)',
      },
    },
    required: ['level', 'summary', 'plan'],
  },
}

const EDIT_CODE_TOOL_DEF = {
  name: 'edit_code',
  description:
    'Reemplaza una ocurrencia exacta de old_string por new_string en el archivo. ' +
    'old_string debe ser un fragmento único y exacto del código actual.',
  parameters: {
    type: 'object',
    properties: {
      old_string: { type: 'string', description: 'Texto exacto a reemplazar' },
      new_string: { type: 'string', description: 'Texto de reemplazo' },
    },
    required: ['old_string', 'new_string'],
  },
}

const EDIT_CODE_WITH_IMPACT_TOOL_DEF = {
  ...EDIT_CODE_TOOL_DEF,
  description:
    `${EDIT_CODE_TOOL_DEF.description} Si las instrucciones del proyecto exigen medir impacto, ` +
    'primero llamá a assess_impact.',
}

// Schema "neutro" — cada wrapper lo adapta al shape de su API.
export function getAgentToolDefs({ includeImpact = false } = {}) {
  return includeImpact
    ? [READ_CODE_TOOL_DEF, ASSESS_IMPACT_TOOL_DEF, EDIT_CODE_WITH_IMPACT_TOOL_DEF]
    : [READ_CODE_TOOL_DEF, EDIT_CODE_TOOL_DEF]
}

export const AGENT_TOOL_DEFS = getAgentToolDefs({ includeImpact: true })

// Ejecuta una herramienta sobre el "estado mundo".
// `state` es un objeto compartido entre llamadas con campos:
//   - getCode(): string actual del código
//   - setCode(next): persiste un nuevo código
//   - approved: bool — si el humano ya aprobó el plan en esta corrida
//   - awaitApproval(payload): async, dispara la UI de aprobación y resuelve
//     con true (proseguir) o false (cancelar). Solo se llama desde assess_impact.
// Devuelve {result, isError}. Si la tool necesita pausar el loop (assess_impact),
// devuelve además `result: NEEDS_HUMAN_APPROVAL` y el wrapper se encarga.
export async function runAgentTool(name, input, state) {
  if (name === 'read_code') {
    return { result: state.getCode(), isError: false }
  }
  if (name === 'assess_impact') {
    const { level, summary, plan } = input || {}
    if (!['low', 'medium', 'high'].includes(level)) {
      return { result: 'Error: level debe ser "low", "medium" o "high".', isError: true }
    }
    if (typeof summary !== 'string' || typeof plan !== 'string') {
      return { result: 'Error: summary y plan deben ser strings.', isError: true }
    }
    const approved = await state.awaitApproval({ level, summary, plan })
    state.approved = approved
    if (approved) {
      return {
        result: `Humano APROBÓ el plan (impacto=${level}). Podés proceder con los edit_code ahora.`,
        isError: false,
      }
    }
    return {
      result: `Humano CANCELÓ el plan. NO apliques ningún edit_code. Terminá la corrida con un mensaje breve.`,
      isError: false,
    }
  }
  if (name === 'edit_code') {
    const { old_string, new_string } = input || {}
    if (typeof old_string !== 'string' || typeof new_string !== 'string') {
      return { result: 'Error: edit_code requiere old_string y new_string como strings.', isError: true }
    }
    if (state.requireImpactApproval && !state.approved) {
      return {
        result: 'Error: antes de edit_code tenés que llamar a assess_impact y recibir aprobación humana.',
        isError: true,
      }
    }
    const code = state.getCode()
    const idx = code.indexOf(old_string)
    if (idx === -1) {
      return {
        result: `Error: no se encontró old_string en el código actual. Probá leerlo otra vez con read_code.`,
        isError: true,
      }
    }
    if (code.indexOf(old_string, idx + 1) !== -1) {
      return {
        result: `Error: old_string aparece más de una vez. Hacé el fragmento más específico para que sea único.`,
        isError: true,
      }
    }
    const next = code.slice(0, idx) + new_string + code.slice(idx + old_string.length)
    state.setCode(next)
    // Devolvemos el código COMPLETO post-edit. Si no, el modelo edita a ciegas:
    // encadena edits sobre un estado imaginario y termina duplicando bloques o
    // ignorando convenciones (ej. prefijo _) porque no "ve" su propio output.
    return {
      result: `OK: reemplazado (${old_string.length} → ${new_string.length} chars). Código completo después del cambio:\n\n${next}`,
      isError: false,
    }
  }
  return { result: `Error: tool desconocida "${name}".`, isError: true }
}
