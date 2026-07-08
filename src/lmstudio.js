// Wrapper para LM Studio local (http://localhost:1234 por defecto).
// LM Studio expone un endpoint compatible con OpenAI en /v1/chat/completions.
// No hay API key real — LM Studio ignora el header Authorization.
//
// Soporta dos modos:
//   - Streaming (stream: true): si se pasa `onToken`, el wrapper parsea los
//     chunks SSE y llama onToken(delta) por cada fragmento de texto. Primera
//     palabra aparece de inmediato — la percepción de velocidad mejora mucho
//     con modelos CoT que generan muchos tokens antes de responder.
//   - Bloqueo (stream: false): fallback sin onToken. Mantiene el retry de
//     "Model reloaded" que no aplica al modo streaming.

export const LMSTUDIO_MODEL_KEY = 'lmstudio_model'
export const LMSTUDIO_HOST_KEY = 'lmstudio_host'

const getHost = () => {
  const fromLs = typeof window !== 'undefined' ? localStorage.getItem(LMSTUDIO_HOST_KEY) : null
  const raw = fromLs || import.meta.env.VITE_LMSTUDIO_HOST || 'http://localhost:1234'
  return raw.replace(/\/$/, '')
}
const getModel = () => {
  const fromLs = typeof window !== 'undefined' ? localStorage.getItem(LMSTUDIO_MODEL_KEY) : null
  return fromLs || import.meta.env.VITE_LMSTUDIO_MODEL || ''
}

export { getHost as getLmStudioHost, getModel as getLmStudioModel }

const SYSTEM_PROMPT = 'Eres un asistente útil que responde en español de forma clara y concisa.'

const buildUrl = (path) => `${getHost()}${path}`

const isModelReloadedError = (data) => {
  const msg = data?.error?.message || data?.error || ''
  return typeof msg === 'string' && /model\s+reloaded/i.test(msg)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const FETCH_HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer lm-studio' }

// Lee un ReadableStream de SSE y llama onChunk(parsedJson) por cada evento data.
// Devuelve cuando el stream termina o llega [DONE].
async function readSSE(response, onChunk) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() // conservar línea incompleta
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') return
        try { onChunk(JSON.parse(payload)) } catch { /* chunk malformado */ }
      }
    }
  } finally {
    try { reader.releaseLock() } catch { /* noop */ }
  }
}

export async function sendLmStudioMessage(messages, { onLog, onRawRequest, onRawResponse, temperature = 0.7, onToken } = {}) {
  const host = getHost()
  const model = getModel()
  const url = buildUrl('/v1/chat/completions')

  if (!model) {
    const msg = 'No hay modelo configurado para LM Studio. Elegilo en la ConfigBar (botón "Detectar") o seteá VITE_LMSTUDIO_MODEL.'
    onLog?.('error', msg)
    throw new Error(msg)
  }

  const useStream = typeof onToken === 'function'

  onLog?.('info', `Modelo local (LM Studio): ${model}`)
  onLog?.('info', `Host LM Studio: ${host} (sin API key — corre en tu máquina)`)
  onLog?.('info', `Temperatura: ${temperature}`)

  // max_tokens evita generación infinita en modelos CoT que usan todo el contexto
  // disponible si no se limita. LM Studio lo setea vía el slider de la UI.
  const body = { model, messages, temperature, stream: useStream, max_tokens: 8192 }

  onRawRequest?.({
    method: 'POST', url,
    headers: FETCH_HEADERS,
    body,
  })
  onLog?.('info', `Enviando ${messages.length} mensaje(s) — stream=${useStream} · max_tokens=8192`)
  onLog?.('send', `POST ${url}`)

  if (useStream) {
    // ── Modo streaming ─────────────────────────────────────────────────────
    const startedAt = performance.now()
    let response
    try {
      response = await fetch(url, { method: 'POST', headers: FETCH_HEADERS, body: JSON.stringify(body) })
    } catch (networkErr) {
      onLog?.('error', `Error de red: ${networkErr.message}`)
      onLog?.('error', `¿Está corriendo LM Studio? Abrí LM Studio → Developer → Status: Running. Si ves CORS, habilitalo en Server Settings.`)
      throw networkErr
    }

    const elapsed = (performance.now() - startedAt).toFixed(0)
    onLog?.('info', `HTTP ${response.status} · streaming iniciado en ${elapsed} ms`)

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      onRawResponse?.(errData)
      const detail = errData?.error?.message || errData?.error || `HTTP ${response.status}`
      onLog?.('error', `LM Studio rechazó la solicitud: ${detail}`)
      throw new Error(`LM Studio: ${detail}`)
    }

    let fullText = ''
    let lastUsage = null
    const rawChunks = []

    await readSSE(response, (chunk) => {
      rawChunks.push(chunk)
      const delta = chunk?.choices?.[0]?.delta?.content
      if (delta) { fullText += delta; onToken(delta) }
      if (chunk?.usage) lastUsage = chunk.usage
    })

    onRawResponse?.(rawChunks)

    if (lastUsage) {
      onLog?.('info', `Tokens — prompt: ${lastUsage.prompt_tokens ?? '?'}, completion: ${lastUsage.completion_tokens ?? '?'}, total: ${lastUsage.total_tokens ?? '?'}`)
    }
    onLog?.('success', `Respuesta completa (${fullText.length} caracteres)`)
    return fullText
  }

  // ── Modo bloqueante (fallback, mantiene retry de "Model reloaded") ──────
  const MAX_ATTEMPTS = 2
  let response, data
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const startedAt = performance.now()
    try {
      response = await fetch(url, { method: 'POST', headers: FETCH_HEADERS, body: JSON.stringify(body) })
    } catch (networkErr) {
      onLog?.('error', `Error de red: ${networkErr.message}`)
      onLog?.('error', `¿Está corriendo LM Studio? Abrí LM Studio → Developer → Status: Running. Si ves CORS, habilitalo en Server Settings.`)
      throw networkErr
    }

    const elapsed = (performance.now() - startedAt).toFixed(0)
    onLog?.('info', `Respuesta HTTP ${response.status} en ${elapsed} ms`)

    data = await response.json().catch(() => ({}))

    if (isModelReloadedError(data) && attempt < MAX_ATTEMPTS) {
      onLog?.('info', `LM Studio recargó el modelo en mitad del request — reintentando en 1.5s (intento ${attempt}/${MAX_ATTEMPTS})`)
      await wait(1500)
      continue
    }
    break
  }

  onRawResponse?.(data)

  if (!response.ok) {
    const detail = data?.error?.message || data?.error || `HTTP ${response.status}`
    onLog?.('error', `LM Studio rechazó la solicitud: ${detail}`)
    if (/model.*not.*found/i.test(detail)) {
      onLog?.('error', `El modelo "${model}" no está cargado. Cargalo en LM Studio → Developer.`)
    }
    if (isModelReloadedError(data)) {
      onLog?.('error', `Persistió "Model reloaded" tras reintento. Desactivá Auto-Evict en LM Studio → Developer → Idle TTL.`)
    }
    throw new Error(`LM Studio: ${detail}`)
  }

  if (isModelReloadedError(data)) {
    onLog?.('error', `LM Studio devolvió "Model reloaded" incluso con HTTP 200. Desactivá Auto-Evict.`)
    throw new Error('LM Studio: Model reloaded')
  }

  const reply = (data?.choices?.[0]?.message?.content || '').trim()

  if (data.usage) {
    onLog?.('info', `Tokens — prompt: ${data.usage.prompt_tokens ?? '?'}, completion: ${data.usage.completion_tokens ?? '?'}, total: ${data.usage.total_tokens ?? '?'}`)
  }
  const finish = data?.choices?.[0]?.finish_reason
  if (finish) onLog?.('info', `finish_reason: ${finish}`)
  onLog?.('success', `Respuesta recibida (${reply.length} caracteres)`)

  return reply
}

export async function listLmStudioModels({ onLog } = {}) {
  const url = buildUrl('/v1/models')
  onLog?.('send', `GET ${url}`)
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return data.data || []
}

export { SYSTEM_PROMPT }
