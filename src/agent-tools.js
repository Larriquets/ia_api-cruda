// Definiciones compartidas por los wrappers agénticos (Anthropic + OpenAI).
// La idea: un único set de "herramientas" que el modelo puede llamar sobre el código.

export const AGENT_SYSTEM_PROMPT = `Sos un asistente de programación que edita código a través de herramientas.
Tenés un único archivo virtual con el código actual. Para modificarlo:

1. Si necesitás ver el código, llamá a la herramienta "read_code".
2. Para editarlo, llamá a "edit_code" con un fragmento exacto a reemplazar (old_string)
   y el reemplazo (new_string). El old_string DEBE coincidir literal con una porción única del código.
3. Podés llamar varias herramientas seguidas en distintos turnos antes de terminar.
4. Cuando ya no necesités hacer más cambios, respondé con un texto breve en español
   describiendo qué hiciste. Eso termina el loop.

Reglas:
- No reescribas el archivo completo de una. Hacé cambios quirúrgicos con edit_code.
- Si pedís reemplazar algo que no existe, vas a recibir un error y tenés que reintentar.
- Sé conciso en tus mensajes de texto.`

// Schema "neutro" — cada wrapper lo adapta al shape de su API.
export const AGENT_TOOL_DEFS = [
  {
    name: 'read_code',
    description: 'Devuelve el contenido actual del archivo de código.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
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
  },
]

// Ejecuta una herramienta sobre el "estado mundo" (un getter/setter del código).
// Devuelve {result, isError} — result siempre como string para que cualquier API lo acepte.
export function runAgentTool(name, input, getCode, setCode) {
  if (name === 'read_code') {
    return { result: getCode(), isError: false }
  }
  if (name === 'edit_code') {
    const { old_string, new_string } = input || {}
    if (typeof old_string !== 'string' || typeof new_string !== 'string') {
      return { result: 'Error: edit_code requiere old_string y new_string como strings.', isError: true }
    }
    const code = getCode()
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
    setCode(next)
    return { result: `OK: reemplazado (${old_string.length} → ${new_string.length} chars).`, isError: false }
  }
  return { result: `Error: tool desconocida "${name}".`, isError: true }
}
