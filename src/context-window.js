// Lógica pura de gestión de ventana de contexto.
// Tres estrategias para podar messages[] cuando supera un límite de tokens.
// Invariante: messages[0] con role:"system" NUNCA se toca — el system editable
// del alumno siempre debe llegar al modelo, aunque el resto se pode.

export const estimateTokens = (text) => Math.ceil((text || '').length / 4)

export const countMessagesTokens = (messages) =>
  messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)

const splitSystem = (messages) => {
  if (messages.length > 0 && messages[0].role === 'system') {
    return { system: messages[0], rest: messages.slice(1) }
  }
  return { system: null, rest: messages.slice() }
}

const withSystem = (system, rest) => (system ? [system, ...rest] : rest)

// ============== FIFO ==============
// Va sacando mensajes desde el más viejo (después del system) hasta entrar en el límite.
// Brutal: corta a mitad de un turno si hace falta. Eso mismo lo hace pedagógico.
export function applyFifo(messages, limitTokens) {
  const { system, rest } = splitSystem(messages)
  const systemTokens = system ? estimateTokens(system.content) : 0

  const trimmedRest = rest.slice()
  const dropped = []

  while (
    trimmedRest.length > 0 &&
    systemTokens + countMessagesTokens(trimmedRest) > limitTokens
  ) {
    dropped.push({ message: trimmedRest.shift(), reason: 'fifo' })
  }

  return {
    trimmed: withSystem(system, trimmedRest),
    dropped,
    summary: null,
  }
}

// ============== Sliding window ==============
// Mantiene los últimos N turnos (un turno = user + assistant consecutivos).
// Si el último mensaje es user solo (esperando respuesta), también cuenta.
export function applySlidingWindow(messages, maxTurns) {
  const { system, rest } = splitSystem(messages)

  // Reconstruir turnos desde el final.
  const turns = []
  let buffer = []
  for (let i = rest.length - 1; i >= 0; i--) {
    buffer.unshift(rest[i])
    if (rest[i].role === 'user') {
      turns.unshift(buffer)
      buffer = []
    }
  }
  // Mensajes sueltos al inicio (assistant sin user previo, raro pero posible).
  if (buffer.length > 0) turns.unshift(buffer)

  const kept = turns.slice(-maxTurns).flat()
  const droppedMessages = turns.slice(0, -maxTurns).flat()
  const dropped = droppedMessages.map((m) => ({ message: m, reason: 'window' }))

  return {
    trimmed: withSystem(system, kept),
    dropped,
    summary: null,
  }
}

// ============== Compaction ==============
// Si total > límite, pide a la IA un resumen de los N turnos más viejos y los
// reemplaza por UN mensaje con prefijo "[RESUMEN PREVIO]:" (role:user para
// compatibilidad total con Claude/OpenAI/LM Studio).
//
// summarizerFn: async (messagesToSummarize) => string
//   Recibe los mensajes a resumir (sin el system) y devuelve el texto del resumen.
//   Se inyecta para no acoplar este módulo a ningún provider concreto.
export async function applyCompaction(messages, limitTokens, summarizerFn) {
  const { system, rest } = splitSystem(messages)
  const systemTokens = system ? estimateTokens(system.content) : 0
  const totalRestTokens = countMessagesTokens(rest)

  if (systemTokens + totalRestTokens <= limitTokens) {
    return { trimmed: messages, dropped: [], summary: null }
  }

  // Estrategia: agarro los 2 turnos más nuevos como "frescos" y resumo todo lo
  // anterior. Si con eso no alcanza, caigo a FIFO sobre el resultado.
  const freshCount = Math.min(4, rest.length) // ~2 turnos = 4 mensajes
  const toSummarize = rest.slice(0, rest.length - freshCount)
  const fresh = rest.slice(rest.length - freshCount)

  if (toSummarize.length === 0) {
    // Nada que resumir — los frescos ya pasan el límite. FIFO fallback.
    return applyFifo(messages, limitTokens)
  }

  let summaryText
  try {
    summaryText = await summarizerFn(toSummarize)
  } catch {
    // Si el resumen falla, fallback transparente a FIFO.
    const fifo = applyFifo(messages, limitTokens)
    return { ...fifo, summary: null, compactionError: true }
  }

  const summaryMessage = {
    role: 'user',
    content: `[RESUMEN PREVIO]: ${summaryText}`,
  }

  const compacted = [summaryMessage, ...fresh]
  const dropped = toSummarize.map((m) => ({ message: m, reason: 'compacted' }))

  // Si aún con el resumen nos pasamos, FIFO sobre el resultado.
  if (systemTokens + countMessagesTokens(compacted) > limitTokens) {
    const fifo = applyFifo(withSystem(system, compacted), limitTokens)
    return {
      trimmed: fifo.trimmed,
      dropped: [...dropped, ...fifo.dropped],
      summary: summaryText,
    }
  }

  return {
    trimmed: withSystem(system, compacted),
    dropped,
    summary: summaryText,
  }
}

// Helper para la UI: dado el array completo (lo que el alumno ve) y el podado
// (lo que viaja), devuelve metadata por mensaje para pintar el panel Memoria.
export function annotateMessages(full, trimmed) {
  const trimmedSet = new Set(trimmed.map((m) => `${m.role}::${m.content}`))
  return full.map((m) => ({
    message: m,
    inRequest: trimmedSet.has(`${m.role}::${m.content}`),
  }))
}
