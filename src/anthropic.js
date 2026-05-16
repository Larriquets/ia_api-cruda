const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const getApiKey = () => import.meta.env.VITE_ANTHROPIC_API_KEY
const getModel = () => import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'

const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

const SYSTEM_PROMPT = 'Eres un asistente útil que responde en español de forma clara y concisa.'

// Convierte el formato OpenAI ({role: 'system'|'user'|'assistant', content}) al formato Claude
// Claude separa el system prompt fuera de messages[] y solo acepta user/assistant adentro.
export function toAnthropicPayload(messages) {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const system = systemMessages.length ? systemMessages.join('\n\n') : SYSTEM_PROMPT

  const claudeMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }))

  return { system, messages: claudeMessages }
}

export async function sendClaudeMessage(messages, { onLog, onRawRequest, onRawResponse, temperature = 0.7 } = {}) {
  const apiKey = getApiKey()
  const model = getModel()

  onLog?.('info', `Modelo Claude: ${model}`)

  if (!apiKey) {
    onLog?.('error', 'Falta VITE_ANTHROPIC_API_KEY en .env')
    throw new Error('Falta VITE_ANTHROPIC_API_KEY en el archivo .env')
  }
  onLog?.('info', `API key Anthropic detectada (${maskKey(apiKey)})`)
  // Claude clampa temperature a [0, 1]. La UI permite hasta 2 (OpenAI/LM Studio),
  // así que truncamos acá para no recibir un 400 — pero registramos el clamp.
  const claudeTemp = Math.min(1, Math.max(0, temperature))
  if (claudeTemp !== temperature) {
    onLog?.('info', `Temperatura ${temperature} clampada a ${claudeTemp} (Claude solo acepta 0–1)`)
  } else {
    onLog?.('info', `Temperatura: ${claudeTemp}`)
  }

  const { system, messages: claudeMessages } = toAnthropicPayload(messages)

  const body = {
    model,
    system,
    messages: claudeMessages,
    max_tokens: 1024,
    temperature: claudeTemp,
  }

  const requestPayload = {
    method: 'POST',
    url: MESSAGES_URL,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': maskKey(apiKey),
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body,
  }

  onRawRequest?.(requestPayload)
  onLog?.('info', `Enviando ${claudeMessages.length} mensaje(s) + system prompt aparte`)
  onLog?.('send', `POST ${MESSAGES_URL}`)

  const startedAt = performance.now()

  let response
  try {
    response = await fetch(MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    onLog?.('error', `Error de red: ${networkErr.message}`)
    onLog?.('error', 'Si ves CORS, Anthropic bloquea por default — fijate la nota en la consola')
    throw networkErr
  }

  const elapsed = (performance.now() - startedAt).toFixed(0)
  onLog?.('info', `Respuesta HTTP ${response.status} en ${elapsed} ms`)

  const data = await response.json().catch(() => ({}))
  onRawResponse?.(data)

  if (!response.ok) {
    const detail = data?.error?.message || `HTTP ${response.status}`
    onLog?.('error', `Anthropic rechazó la solicitud: ${detail}`)
    throw new Error(`Anthropic: ${detail}`)
  }

  const reply = extractClaudeText(data)
  const usage = data.usage
  if (usage) {
    onLog?.('info', `Tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}`)
  }
  if (data.stop_reason) {
    onLog?.('info', `stop_reason: ${data.stop_reason}`)
  }
  onLog?.('success', `Respuesta recibida (${reply.length} caracteres)`)

  return reply
}

function extractClaudeText(data) {
  if (!Array.isArray(data.content)) return ''
  for (const block of data.content) {
    if (block.type === 'text' && block.text) return block.text.trim()
  }
  return ''
}
