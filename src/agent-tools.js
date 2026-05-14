// Definiciones compartidas por los wrappers agénticos (Anthropic + OpenAI).
// La idea: un único set de "herramientas" que el modelo puede llamar sobre el código.

import { hasSkillTest, runSkillTest } from './skill-tests.js'

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

// load_skill — patrón "lazy" de carga de instrucciones extra.
// El AGENTS.md solo lista los skills disponibles (id + descripción corta).
// Las reglas detalladas de cada skill NO viajan en el system prompt: la IA
// las trae a contexto solo cuando decide que un skill aplica, llamando a
// load_skill(id). Esto simula el comportamiento de Claude (skills) y de los
// editores tipo Cursor (rules) — y se ve clarito en el panel Raw cómo el
// contexto crece recién cuando el skill se carga.
const LOAD_SKILL_TOOL_DEF = {
  name: 'load_skill',
  description:
    'Trae a contexto las reglas detalladas de un skill listado en AGENTS.md. ' +
    'Devuelve el cuerpo completo (markdown) del skill — leélo y seguí sus reglas. ' +
    'REGLA: para CADA skill listado en "Skills disponibles" SIN la marca [test ✓], ' +
    'DEBÉS llamar a load_skill al menos una vez antes de terminar la corrida si su descripción ' +
    'sugiere que podría aplicar al pedido del usuario. Para skills CON [test ✓] solo cargá load_skill ' +
    'si necesitás ver sus reglas — el test ya las verifica determinísticamente.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Identificador del skill, tal como aparece en la sección "Skills disponibles" del AGENTS.md.',
      },
    },
    required: ['id'],
  },
}

// run_skill_test — chequeo determinístico en código JS.
// Es la parte VERIFICABLE del skill: corre regex sobre el código actual y
// devuelve PASS o lista concreta de violaciones. Pedagógicamente importa
// que esté separada de load_skill (que es solo prompt) para mostrar la
// diferencia entre "instrucciones que la IA lee" e "instrucciones que la IA
// ejecuta y obedece bajo penalidad de FAIL".
const RUN_SKILL_TEST_TOOL_DEF = {
  name: 'run_skill_test',
  description:
    'Corre el TEST determinístico de un skill sobre el código actual y devuelve PASS o ' +
    'una lista de violaciones concretas (no es un prompt — es código JS que evalúa el código). ' +
    'OBLIGATORIO: después de cada edit_code y SIEMPRE antes de terminar, llamá a run_skill_test ' +
    'para cada skill marcado con [test ✓] en la lista de "Skills disponibles". ' +
    'NO llames a run_skill_test sobre skills sin [test ✓] — esos no tienen test, ' +
    'cargalos con load_skill y seguí su contenido manualmente. ' +
    'Si run_skill_test devuelve violaciones, corregí con más edit_code y volvé a correr el test hasta que diga PASS.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Identificador del skill cuyo test querés correr.',
      },
    },
    required: ['id'],
  },
}

// Schema "neutro" — cada wrapper lo adapta al shape de su API.
export function getAgentToolDefs({ includeImpact = false, includeSkills = false } = {}) {
  const tools = [READ_CODE_TOOL_DEF]
  if (includeImpact) tools.push(ASSESS_IMPACT_TOOL_DEF)
  tools.push(includeImpact ? EDIT_CODE_WITH_IMPACT_TOOL_DEF : EDIT_CODE_TOOL_DEF)
  if (includeSkills) {
    tools.push(LOAD_SKILL_TOOL_DEF)
    tools.push(RUN_SKILL_TEST_TOOL_DEF)
  }
  return tools
}

export const AGENT_TOOL_DEFS = getAgentToolDefs({ includeImpact: true, includeSkills: true })

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
  if (name === 'load_skill') {
    const id = typeof input?.id === 'string' ? input.id.trim() : ''
    if (!id) {
      return { result: 'Error: load_skill requiere un id (string).', isError: true }
    }
    const skill = state.skills?.find((s) => s.id === id)
    if (!skill) {
      const available = (state.skills || []).map((s) => s.id).join(', ') || '(ninguno)'
      return {
        result: `Error: no existe ningún skill con id="${id}". Skills disponibles: ${available}.`,
        isError: true,
      }
    }
    state.loadedSkillIds = state.loadedSkillIds || new Set()
    state.loadedSkillIds.add(id)
    return {
      result: `# Skill cargado: ${skill.name} (id=${skill.id})\n\n${skill.body}\n\n— Aplicá estas reglas en los próximos edit_code y antes de terminar.`,
      isError: false,
    }
  }
  if (name === 'run_skill_test') {
    const id = typeof input?.id === 'string' ? input.id.trim() : ''
    if (!id) {
      return { result: 'Error: run_skill_test requiere un id (string).', isError: true }
    }
    const skill = state.skills?.find((s) => s.id === id)
    if (!skill) {
      const available = (state.skills || []).map((s) => s.id).join(', ') || '(ninguno)'
      return {
        result: `Error: no existe ningún skill con id="${id}". Skills disponibles: ${available}.`,
        isError: true,
      }
    }
    if (!hasSkillTest(id)) {
      return {
        result: `Error: el skill "${id}" no tiene un test determinístico implementado. Solo podés guiarte por su body (load_skill).`,
        isError: true,
      }
    }
    const violations = runSkillTest(id, state.getCode())
    state.lastTestRun = { id, violations, at: Date.now() }
    if (!violations || violations.length === 0) {
      return {
        result: `✓ PASS — el test del skill "${id}" no encontró violaciones.`,
        isError: false,
      }
    }
    const body = violations.map((v, i) => `  ${i + 1}. [${v.rule}] ${v.message}`).join('\n')
    return {
      result:
        `✗ FAIL — el test del skill "${id}" encontró ${violations.length} violación(es):\n${body}\n\n` +
        'Corregí cada una con edit_code y volvé a correr run_skill_test hasta que pase.',
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

// Helper que arma la sección "Skills disponibles" inyectada en el system prompt
// junto con el AGENTS.md. Mostrar acá solo el id + descripción corta es la clave
// de la economía de contexto: el body completo de cada skill viaja recién cuando
// la IA lo pide con load_skill(id). Si el skill tiene test determinístico, lo
// marcamos con [test] para que la IA sepa que puede correr run_skill_test.
export function buildSkillsIndex(skills) {
  if (!skills || skills.length === 0) return ''
  const lines = skills.map((s) => {
    const testFlag = hasSkillTest(s.id) ? ' [test ✓]' : ''
    return `- \`${s.id}\`${testFlag} — ${s.description}`
  })
  return [
    '## Skills disponibles',
    'Estos skills NO están cargados todavía. Cada uno tiene reglas que se aplican al trabajo que estás por hacer.',
    '',
    'REGLAS de uso (OBLIGATORIO):',
    '- Skills marcados con `[test ✓]`: corré `run_skill_test(id)` después de cada `edit_code` y antes de terminar.',
    '  Si querés ver las reglas del skill para no violarlas, podés también `load_skill(id)`.',
    '- Skills SIN `[test ✓]`: antes de terminar la corrida, llamá a `load_skill(id)` al menos una vez si su',
    '  descripción sugiere que podría aplicar al pedido del usuario. NO corras `run_skill_test` sobre estos —',
    '  no tienen test, fallaría. Cargá el skill y seguí su contenido manualmente.',
    '- Si después de leer el body de un skill ves que no aplica, decilo brevemente en tu respuesta final y seguí.',
    '',
    ...lines,
  ].join('\n')
}
