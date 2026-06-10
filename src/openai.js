const CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const RESPONSES_URL = 'https://api.openai.com/v1/responses'
const CONVERSATIONS_URL = 'https://api.openai.com/v1/conversations'

const getApiKey = () => import.meta.env.VITE_OPENAI_API_KEY
const getModel = () => import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'

const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

// Modelos de chat seleccionables desde la UI. Solo modelos no-razonadores:
// los razonadores (gpt-5 y familia o-*) viven en /razonamiento y no aceptan
// temperature, así que romperían el control de temperatura de esta página.
export const OPENAI_CHAT_MODELS = [
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini', note: 'barato — recomendado para clase' },
  { id: 'gpt-4o', label: 'gpt-4o', note: 'más capaz' },
  { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini', note: 'rápido, contexto grande' },
  { id: 'gpt-4.1', label: 'gpt-4.1', note: 'el más capaz (no razonador)' },
]

// ============== /chat/completions (modo clásico) ==============
export async function sendChatMessage(messages, { onLog, onRawRequest, onRawResponse, temperature = 0.7, model: modelOverride } = {}) {
  const apiKey = getApiKey()
  const model = modelOverride || getModel()

  onLog?.('info', `Modelo seleccionado: ${model}`)

  if (!apiKey) {
    onLog?.('error', 'Falta VITE_OPENAI_API_KEY en .env')
    throw new Error('Falta VITE_OPENAI_API_KEY en el archivo .env')
  }
  onLog?.('info', `API key detectada (${maskKey(apiKey)})`)
  onLog?.('info', `Temperatura: ${temperature}`)

  const body = { model, messages, temperature }

  const requestPayload = {
    method: 'POST',
    url: CHAT_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${maskKey(apiKey)}`,
    },
    body,
  }

  onRawRequest?.(requestPayload)
  onLog?.('info', `Construyendo request con ${messages.length} mensaje(s) en el historial`)
  onLog?.('send', `POST ${CHAT_URL}`)

  const startedAt = performance.now()

  let response
  try {
    response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    onLog?.('error', `Error de red: ${networkErr.message}`)
    throw networkErr
  }

  const elapsed = (performance.now() - startedAt).toFixed(0)
  onLog?.('info', `Respuesta HTTP ${response.status} en ${elapsed} ms`)

  const data = await response.json().catch(() => ({}))
  onRawResponse?.(data)

  if (!response.ok) {
    const detail = data?.error?.message || `HTTP ${response.status}`
    onLog?.('error', `OpenAI rechazó la solicitud: ${detail}`)
    throw new Error(`OpenAI: ${detail}`)
  }

  const reply = data.choices?.[0]?.message?.content?.trim() ?? ''
  const usage = data.usage
  if (usage) {
    onLog?.('info', `Tokens — prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`)
  }
  onLog?.('success', `Respuesta recibida (${reply.length} caracteres)`)

  return reply
}

// ============== /conversations + /responses (modo persistente) ==============

export async function createConversation({ onLog } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Falta VITE_OPENAI_API_KEY')

  onLog?.('send', `POST ${CONVERSATIONS_URL} (crear conversación)`)

  const res = await fetch(CONVERSATIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({}),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data?.error?.message || `HTTP ${res.status}`
    onLog?.('error', `No se pudo crear conversación: ${detail}`)
    throw new Error(detail)
  }

  onLog?.('success', `Conversación creada: ${data.id}`)
  return data.id
}

export async function sendResponseMessage(
  text,
  conversationId,
  { onLog, onRawRequest, onRawResponse, instructions, temperature = 0.7, model: modelOverride } = {},
) {
  const apiKey = getApiKey()
  const model = modelOverride || getModel()

  onLog?.('info', `Modelo: ${model} (modo persistente)`)
  onLog?.('info', `Conversation ID: ${conversationId}`)
  onLog?.('info', `Temperatura: ${temperature}`)

  if (!apiKey) throw new Error('Falta VITE_OPENAI_API_KEY')

  const body = {
    model,
    conversation: conversationId,
    input: text,
    temperature,
  }
  if (instructions) body.instructions = instructions

  const requestPayload = {
    method: 'POST',
    url: RESPONSES_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${maskKey(apiKey)}`,
    },
    body,
  }

  onRawRequest?.(requestPayload)
  onLog?.('info', 'Solo se envía el mensaje nuevo — el historial vive en OpenAI')
  onLog?.('send', `POST ${RESPONSES_URL}`)

  const startedAt = performance.now()

  let response
  try {
    response = await fetch(RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    onLog?.('error', `Error de red: ${networkErr.message}`)
    throw networkErr
  }

  const elapsed = (performance.now() - startedAt).toFixed(0)
  onLog?.('info', `Respuesta HTTP ${response.status} en ${elapsed} ms`)

  const data = await response.json().catch(() => ({}))
  onRawResponse?.(data)

  if (!response.ok) {
    const detail = data?.error?.message || `HTTP ${response.status}`
    onLog?.('error', `OpenAI rechazó la solicitud: ${detail}`)
    throw new Error(`OpenAI: ${detail}`)
  }

  const reply = extractResponseText(data)
  const usage = data.usage
  if (usage) {
    onLog?.('info', `Tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}, total: ${usage.total_tokens}`)
  }
  onLog?.('success', `Respuesta recibida (${reply.length} caracteres)`)

  return reply
}

export async function fetchConversationItems(conversationId, { onLog } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Falta VITE_OPENAI_API_KEY')

  const url = `${CONVERSATIONS_URL}/${conversationId}/items?order=asc&limit=100`
  onLog?.('send', `GET ${url}`)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data?.error?.message || `HTTP ${res.status}`
    onLog?.('error', `No se pudo leer la conversación: ${detail}`)
    throw new Error(detail)
  }

  onLog?.('success', `Historial servidor: ${data.data?.length || 0} item(s)`)
  return data.data || []
}

function extractResponseText(data) {
  if (data.output_text) return data.output_text.trim()

  const out = data.output || []
  for (const item of out) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === 'output_text' && c.text) return c.text.trim()
      }
    }
  }
  return ''
}
