// Wrapper para LM Studio local (http://localhost:1234 por defecto).
// LM Studio expone un endpoint compatible con OpenAI en /v1/chat/completions,
// así que el payload es idéntico al de openai.js: {model, messages, temperature}.
// No hay API key real — LM Studio ignora el header Authorization, pero algunos
// SDKs se quejan si no está, así que mandamos un placeholder.

const getHost = () =>
  (import.meta.env.VITE_LMSTUDIO_HOST || 'http://localhost:1234').replace(/\/$/, '')
const getModel = () => import.meta.env.VITE_LMSTUDIO_MODEL || 'google/gemma-4-e4b'

const SYSTEM_PROMPT = 'Eres un asistente útil que responde en español de forma clara y concisa.'

const buildUrl = (path) => `${getHost()}${path}`

export async function sendLmStudioMessage(messages, { onLog, onRawRequest, onRawResponse } = {}) {
  const host = getHost()
  const model = getModel()
  const url = buildUrl('/v1/chat/completions')

  onLog?.('info', `Modelo local (LM Studio): ${model}`)
  onLog?.('info', `Host LM Studio: ${host} (sin API key real — corre en tu máquina)`)

  // LM Studio acepta exactamente el shape de OpenAI
  const body = {
    model,
    messages,
    temperature: 0.7,
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

  const startedAt = performance.now()

  let response
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

  const data = await response.json().catch(() => ({}))
  onRawResponse?.(data)

  if (!response.ok) {
    const detail = data?.error?.message || data?.error || `HTTP ${response.status}`
    onLog?.('error', `LM Studio rechazó la solicitud: ${detail}`)
    if (/model.*not.*found/i.test(detail)) {
      onLog?.('error', `El modelo "${model}" no está cargado. Cargalo en LM Studio → Developer.`)
    }
    throw new Error(`LM Studio: ${detail}`)
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
