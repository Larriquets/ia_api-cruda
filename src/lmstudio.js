// Wrapper para LM Studio local (http://localhost:1234 por defecto).
// LM Studio expone un endpoint compatible con OpenAI en /v1/chat/completions,
// así que el payload es idéntico al de openai.js: {model, messages, temperature}.
// No hay API key real — LM Studio ignora el header Authorization, pero algunos
// SDKs se quejan si no está, así que mandamos un placeholder.

// Preferencia: localStorage (lo elige el usuario en la UI) → env var (.env.local) → default.
// Si el ID no coincide con un modelo cargado en LM Studio, vas a recibir un 404 "Model not found".
// Probá el botón "Detectar" en la ConfigBar (modo LM Studio) para ver qué hay cargado.
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

// LM Studio devuelve {"error":"Model reloaded."} cuando recarga el modelo en mitad de
// un request (Auto-Evict, cambio de modelo, etc.). Detectamos ese caso y dejamos
// que el caller reintente: la 2da llamada suele encontrar el modelo ya cargado.
const isModelReloadedError = (data) => {
  const msg = data?.error?.message || data?.error || ''
  return typeof msg === 'string' && /model\s+reloaded/i.test(msg)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function sendLmStudioMessage(messages, { onLog, onRawRequest, onRawResponse, temperature = 0.7 } = {}) {
  const host = getHost()
  const model = getModel()
  const url = buildUrl('/v1/chat/completions')

  if (!model) {
    const msg = 'No hay modelo configurado para LM Studio. Elegilo en la ConfigBar (botón "Detectar") o seteá VITE_LMSTUDIO_MODEL.'
    onLog?.('error', msg)
    throw new Error(msg)
  }

  onLog?.('info', `Modelo local (LM Studio): ${model}`)
  onLog?.('info', `Host LM Studio: ${host} (sin API key real — corre en tu máquina)`)
  onLog?.('info', `Temperatura: ${temperature}`)

  // LM Studio acepta exactamente el shape de OpenAI
  const body = {
    model,
    messages,
    temperature,
    stream: false,
  }

  const requestPayload = {
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer lm-studio',
    },
    body,
  }

  onRawRequest?.(requestPayload)
  onLog?.('info', `Enviando ${messages.length} mensaje(s) — stream=false para respuesta única`)
  onLog?.('send', `POST ${url}`)

  const MAX_ATTEMPTS = 2
  let response, data
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const startedAt = performance.now()
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer lm-studio',
        },
        body: JSON.stringify(body),
      })
    } catch (networkErr) {
      onLog?.('error', `Error de red: ${networkErr.message}`)
      onLog?.(
        'error',
        `¿Está corriendo el server de LM Studio? Abrí LM Studio → Developer → Status: Running. Si ves CORS, habilitalo en Server Settings.`,
      )
      throw networkErr
    }

    const elapsed = (performance.now() - startedAt).toFixed(0)
    onLog?.('info', `Respuesta HTTP ${response.status} en ${elapsed} ms`)

    data = await response.json().catch(() => ({}))

    // LM Studio puede devolver "Model reloaded." con HTTP 200 o 4xx — chequeamos siempre.
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
    onLog?.('error', `LM Studio devolvió "Model reloaded" incluso con HTTP 200 tras reintento. Desactivá Auto-Evict.`)
    throw new Error('LM Studio: Model reloaded')
  }

  const reply = (data?.choices?.[0]?.message?.content || '').trim()

  if (data.usage) {
    onLog?.(
      'info',
      `Tokens — prompt: ${data.usage.prompt_tokens ?? '?'}, completion: ${data.usage.completion_tokens ?? '?'}, total: ${data.usage.total_tokens ?? '?'}`,
    )
  }
  const finish = data?.choices?.[0]?.finish_reason
  if (finish) onLog?.('info', `finish_reason: ${finish}`)
  onLog?.('success', `Respuesta recibida (${reply.length} caracteres)`)

  return reply
}

// Bonus: lista los modelos cargados en LM Studio. No se usa en la UI pero queda
// expuesto para debug desde la consola.
export async function listLmStudioModels({ onLog } = {}) {
  const url = buildUrl('/v1/models')
  onLog?.('send', `GET ${url}`)
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return data.data || []
}

export { SYSTEM_PROMPT }
