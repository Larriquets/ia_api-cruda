// Modo Ruido — inyecta relleno determinista en el payload para mostrar
// cómo el contexto se hincha y el modelo pierde precisión.
//
// Determinista: dado el mismo seed y la misma cantidad de mensajes,
// produce siempre el mismo ruido. Así el alumno puede comparar corridas.

const FILLERS = [
  'Nota al margen: el operador del sistema recuerda que los lunes el café de la oficina está más cargado de lo habitual.',
  'Recordatorio administrativo: el formulario A-7 debe presentarse antes del cierre de cada trimestre fiscal según la circular 1998/B.',
  'Dato irrelevante: el promedio histórico de lluvia en mayo en la región pampeana ronda los 70 milímetros mensuales.',
  'Aside: en 1834 un cartógrafo prusiano describió por primera vez la curvatura aparente del horizonte sobre la llanura.',
  'Información de archivo: el inventario de marzo registró 412 unidades de papelería sin clasificar en el depósito B.',
  'Apunte secundario: los manuales de operación del modelo 1972 indicaban una temperatura de calibración de 18 grados Celsius.',
  'Glosa: la palabra "tangencial" proviene del latín tangere, que significa tocar, rozar o estar en contacto leve.',
  'Memo interno: la reunión de coordinación se reprograma sujeta a disponibilidad de la sala C según política vigente.',
  'Comentario al pasar: ciertos manuscritos del siglo XV mencionan procedimientos de archivo que hoy resultan curiosos pero inoperantes.',
  'Inciso: el catálogo regional de fauna lista 47 especies de aves migratorias que cruzan el corredor entre marzo y septiembre.',
  'Pie de página: la edición revisada del informe 2003 corrigió tres erratas tipográficas sin alterar el contenido sustantivo.',
  'Tangente: las primeras máquinas de escribir QWERTY se diseñaron para ralentizar al mecanógrafo y evitar atascos en las varillas.',
]

// PRNG determinista (mulberry32) sembrado con el seed que el usuario ve.
function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Cuántos párrafos de relleno meter según el turno (crece con cada turno
// para que el contexto se note "hincharse").
function fillersForTurn(turnIndex, intensity) {
  // intensity: 1 (suave) | 2 (medio) | 3 (denso)
  const base = Math.min(1 + turnIndex, 6)
  return Math.max(1, Math.round(base * intensity * 0.5))
}

// Genera el ruido que se inyecta al final del último user message.
// El resto del payload queda intacto (mismo system, mismo historial).
export function applyNoise(messages, { seed = 42, intensity = 2 } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { noisy: messages, injected: [], stats: emptyStats() }
  }

  // Contar el turno de usuario actual (sirve para que el ruido crezca).
  const userTurns = messages.filter((m) => m.role === 'user').length
  const turnIndex = Math.max(0, userTurns - 1)

  const rng = makeRng(seed + turnIndex * 31)
  const count = fillersForTurn(turnIndex, intensity)
  const injected = []
  const used = new Set()

  for (let i = 0; i < count; i++) {
    let pick = Math.floor(rng() * FILLERS.length)
    let guard = 0
    while (used.has(pick) && guard < FILLERS.length) {
      pick = (pick + 1) % FILLERS.length
      guard++
    }
    used.add(pick)
    injected.push(FILLERS[pick])
  }

  const noisy = messages.map((m, i) => {
    if (i !== messages.length - 1 || m.role !== 'user') return m
    const noiseBlock = injected.join('\n\n')
    return {
      ...m,
      content: `${m.content}\n\n${noiseBlock}`,
    }
  })

  return { noisy, injected, stats: computeStats(messages, noisy) }
}

function emptyStats() {
  return {
    signalChars: 0,
    noiseChars: 0,
    signalTokens: 0,
    noiseTokens: 0,
    totalTokens: 0,
    noisePct: 0,
  }
}

const estTokens = (s) => Math.ceil((s || '').length / 4)

// === Ruido para AGENTES: tool output bloat ===
//
// Simula un tool que devuelve más texto del que necesita (logs verbosos,
// warnings irrelevantes, hexdumps, metadata). Es la causa #1 real de que un
// agente "se pierda" después de varios pasos: cada tool_result queda en el
// historial para siempre, y el modelo termina nadando en logs.
//
// Estos fragmentos imitan el ruido que aparece naturalmente en un terminal,
// para que el modelo no sospeche que es un experimento.

const TOOL_BLOAT_LINES = [
  '[INFO]  reconciling internal cache state… 4192 entries scanned, 0 stale.',
  '[DEBUG] segment 0x4a2c8f1e flushed at offset 0x18 (deferred write OK).',
  '[INFO]  loader: resolved 47 transitive imports in 38ms (cached: 41).',
  '[WARN]  deprecated flag `--legacy-resolver` detected; ignored for this run.',
  '[DEBUG] gc: minor cycle freed 312 KiB across 8 arenas (heap=24.1 MiB).',
  '[INFO]  watcher: tracking 1284 paths under /workspace (poll fallback off).',
  '[DEBUG] socket fd=14 keepalive=1 nodelay=1 linger=0 reuseaddr=1.',
  '[INFO]  telemetry payload dropped (rate-limited; next attempt in 30s).',
  '[DEBUG] resolver: trying ./node_modules/.pnpm/store/v3 (miss); fallback OK.',
  '[INFO]  parser: 0 errors, 3 hints (unused-import × 2, naming-style × 1).',
  '[DEBUG] manifest hash bb1f3c0a9d… matches lockfile; integrity OK.',
  '[INFO]  worker pool: 4 idle / 0 busy / 0 queued (capacity 8).',
  '[DEBUG] tls handshake completed (TLS 1.3, X25519, ALPN=h2).',
  '[INFO]  config: 12 keys loaded from .env, 4 from defaults, 0 overridden.',
  '[DEBUG] event loop lag: avg 0.4ms p95 1.2ms p99 3.1ms over 60s window.',
]

function fillersForToolBloat(turnIndex, intensity) {
  const base = Math.min(2 + turnIndex, 8)
  return Math.max(2, Math.round(base * intensity * 0.6))
}

// Envuelve un tool_result (string) con ruido determinista. El resultado real
// queda intacto, pero le concatenamos líneas de "log" antes y después.
export function bloatToolResult(result, { seed = 42, intensity = 2, turnIndex = 0 } = {}) {
  const original = String(result ?? '')
  const rng = makeRng(seed + turnIndex * 53)
  const count = fillersForToolBloat(turnIndex, intensity)

  const before = []
  const after = []
  const used = new Set()
  for (let i = 0; i < count; i++) {
    let pick = Math.floor(rng() * TOOL_BLOAT_LINES.length)
    let guard = 0
    while (used.has(pick) && guard < TOOL_BLOAT_LINES.length) {
      pick = (pick + 1) % TOOL_BLOAT_LINES.length
      guard++
    }
    used.add(pick)
    if (i % 2 === 0) before.push(TOOL_BLOAT_LINES[pick])
    else after.push(TOOL_BLOAT_LINES[pick])
  }

  const noisy = [
    ...before,
    original,
    ...after,
  ].join('\n')

  const signalTokens = estTokens(original)
  const totalTokens = estTokens(noisy)
  const noiseTokens = Math.max(0, totalTokens - signalTokens)
  const noisePct = totalTokens > 0 ? Math.round((noiseTokens / totalTokens) * 100) : 0

  return {
    noisy,
    stats: {
      signalChars: original.length,
      noiseChars: noisy.length - original.length,
      signalTokens,
      noiseTokens,
      totalTokens,
      noisePct,
      injectedLines: count,
    },
  }
}

function computeStats(original, noisy) {
  const signalChars = original.reduce((s, m) => s + (m.content?.length || 0), 0)
  const noisyChars = noisy.reduce((s, m) => s + (m.content?.length || 0), 0)
  const noiseChars = Math.max(0, noisyChars - signalChars)
  const signalTokens = estTokens(original.map((m) => m.content).join(' '))
  const totalTokens = estTokens(noisy.map((m) => m.content).join(' '))
  const noiseTokens = Math.max(0, totalTokens - signalTokens)
  const noisePct = totalTokens > 0 ? Math.round((noiseTokens / totalTokens) * 100) : 0
  return { signalChars, noiseChars, signalTokens, noiseTokens, totalTokens, noisePct }
}
