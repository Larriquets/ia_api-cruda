// Wrapper para Ollama local (http://localhost:11434).
// Reusa el formato OpenAI ({role, content}) — Ollama acepta system/user/assistant tal cual.
// No hay API key: el servidor es local. Si el modelo no está bajado, Ollama responde 404
// con "model 'X' not found, try pulling it first" — lo capturamos para dar un mensaje claro.

const getHost = () =>
  (import.meta.env.VITE_OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '')
const getModel = () => import.meta.env.VITE_OLLAMA_MODEL || 'gemma3:4b'

const SYSTEM_PROMPT = 'Eres un asistente útil que responde en español de forma clara y concisa.'

const buildUrl = (path) => `${getHost()}${path}`

export async function sendOllamaMessage(messages, { onLog, onRawRequest, onRawResponse, temperature = 0.7 } = {}) {
  const host = getHost()
  const model = getModel()
  const url = buildUrl('/api/chat')

  onLog?.('info', `Modelo local (Ollama): ${model}`)
  onLog?.('info', `Host Ollama: ${host} (sin API key — corre en tu máquina)`)
  onLog?.('info', `Temperatura: ${temperature}`)

  // Ollama acepta el mismo shape de messages que OpenAI; la temperatura va en options.
  const body = {
    model,
    messages,
    stream: false,
    options: { temperature },
  }

  const requestPayload = {
    method: 'POST',
    url,
    headers: { 'Content-Type': 'application/json' },
    body,
  }

  onRawRequest?.(requestPayload)
  onLog?.('info', `Enviando ${messages.length} mensaje(s) — stream=false para respuesta única`)
  onLog?.('send', `POST ${url}`)

  const startedAt = performance.now()

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    onLog?.('error', `Error de red: ${networkErr.message}`)
    onLog?.(
      'error',
      `¿Está corriendo Ollama? Probá "ollama serve" en otra terminal. Si ves CORS, arrancalo con OLLAMA_ORIGINS=* ollama serve`,
    )
    throw networkErr
  }

  const elapsed = (performance.now() - startedAt).toFixed(0)
  onLog?.('info', `Respuesta HTTP ${response.status} en ${elapsed} ms`)

  const data = await response.json().catch(() => ({}))
  onRawResponse?.(data)

  if (!response.ok) {
    const detail = data?.error || `HTTP ${response.status}`
    onLog?.('error', `Ollama rechazó la solicitud: ${detail}`)
    if (/not found/i.test(detail)) {
      onLog?.('error', `El modelo no está descargado. Corré: ollama pull ${model}`)
    }
    throw new Error(`Ollama: ${detail}`)
  }

  const reply = (data?.message?.content || '').trim()

  // Ollama devuelve métricas en nanosegundos + conteos de tokens
  if (data.prompt_eval_count != null || data.eval_count != null) {
    onLog?.(
      'info',
      `Tokens — prompt: ${data.prompt_eval_count ?? '?'}, completion: ${data.eval_count ?? '?'}`,
    )
  }
  if (data.total_duration != null) {
    const ms = (data.total_duration / 1e6).toFixed(0)
    onLog?.('info', `Tiempo total local: ${ms} ms (incluye carga del modelo si es la 1ra vez)`)
  }
  if (data.done_reason) {
    onLog?.('info', `done_reason: ${data.done_reason}`)
  }
  onLog?.('success', `Respuesta recibida (${reply.length} caracteres)`)

  return reply
}

// Bonus: chequeo rápido de que Ollama está vivo y lista los modelos disponibles.
// No lo usamos automáticamente, pero queda exportado por si querés debuggear desde la consola.
export async function listOllamaModels({ onLog } = {}) {
  const url = buildUrl('/api/tags')
  onLog?.('send', `GET ${url}`)
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data.models || []
}

export { SYSTEM_PROMPT }
