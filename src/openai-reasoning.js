// Wrapper para los modelos *razonadores* de OpenAI (gpt-5-mini, o4-mini, o3-mini, o1-mini).
// Usa el endpoint /v1/responses porque es el que expone reasoning estructurado
// (bloques `output[].type === 'reasoning'` con `summary[]` aparte del texto final)
// y el contador de `reasoning_tokens` en `usage`.
//
// Importante: este wrapper es un experimento aislado del Chat — no comparte modelo con
// el resto de la app (gpt-4o-mini, que NO soporta reasoning). Usa su propia env var.

const RESPONSES_URL = 'https://api.openai.com/v1/responses'

const getApiKey = () => import.meta.env.VITE_OPENAI_API_KEY
const getDefaultModel = () => import.meta.env.VITE_OPENAI_REASONING_MODEL || 'gpt-5-mini'

const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

export const REASONING_MODELS = [
  { id: 'gpt-5-mini', label: 'gpt-5-mini', noteKey: 'models.fastCheapDefault' },
  { id: 'gpt-5', label: 'gpt-5', noteKey: 'models.bigReasoner' },
  { id: 'o4-mini', label: 'o4-mini', noteKey: 'models.stablePrevGen' },
  { id: 'o3-mini', label: 'o3-mini', noteKey: 'models.olderCheaper' },
  { id: 'o1-mini', label: 'o1-mini', noteKey: 'models.firstReasoners' },
]

export const REASONING_EFFORTS = [
  { id: 'minimal', label: 'minimal', sub: 'casi sin pensar' },
  { id: 'low', label: 'low', sub: 'piensa poco' },
  { id: 'medium', label: 'medium', sub: 'default razonable' },
  { id: 'high', label: 'high', sub: 'piensa fuerte' },
]

export async function sendReasoningMessage(
  userInput,
  {
    model,
    instructions,
    effort = 'medium',
    summary = 'auto',
    onLog,
    onRawRequest,
    onRawResponse,
  } = {},
) {
  const apiKey = getApiKey()
  const modelId = model || getDefaultModel()

  onLog?.('info', `Modelo razonador: ${modelId}`)
  onLog?.('info', `reasoning.effort = "${effort}" · reasoning.summary = "${summary}"`)

  if (!apiKey) {
    onLog?.('error', 'Falta VITE_OPENAI_API_KEY en .env')
    throw new Error('Falta VITE_OPENAI_API_KEY en el archivo .env')
  }
  onLog?.('info', `API key detectada (${maskKey(apiKey)})`)

  // /v1/responses acepta `input` como string (one-shot) o como array de mensajes
  // {role, content} (multi-turn). Reenviamos el array cuando viene historial — los
  // bloques de reasoning previos NO se mandan: vienen cifrados en encrypted_content
  // y el alumno tampoco los ve, así que el contexto que viaja es solo
  // user+assistant final, igual que en un chat clásico.
  if (Array.isArray(userInput)) {
    onLog?.('info', `Modo CON CONTEXTO — input es array de ${userInput.length} mensaje(s)`)
  }

  // Los razonadores no aceptan temperature (la API la ignora o rechaza según versión).
  // No la mandamos a propósito — el alumno va a ver que el body es más chico que en Chat.
  const body = {
    model: modelId,
    input: userInput,
    reasoning: { effort, summary },
  }
  if (instructions && instructions.trim()) {
    body.instructions = instructions
  }

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
  onLog?.('send', `POST ${RESPONSES_URL}`)
  onLog?.('info', 'El modelo va a "pensar" antes de responder — esto puede tardar más que un chat normal')

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
    if (/temperature|unsupported|not\s+supported/i.test(detail)) {
      onLog?.('info', 'Pista: los modelos razonadores no aceptan algunos parámetros del Chat clásico (temperature, top_p, etc.)')
    }
    if (/model|does\s+not\s+exist/i.test(detail)) {
      onLog?.('info', 'Pista: verificá que el modelo elegido sea uno razonador (gpt-5*, o1*, o3*, o4*) y que tu cuenta tenga acceso')
    }
    throw new Error(`OpenAI: ${detail}`)
  }

  const extracted = extractReasoningPayload(data)

  const usage = data.usage
  if (usage) {
    const reasoningTokens = usage.output_tokens_details?.reasoning_tokens ?? 0
    onLog?.(
      'info',
      `Tokens — input: ${usage.input_tokens} · output: ${usage.output_tokens} (de los cuales ${reasoningTokens} fueron de razonamiento) · total: ${usage.total_tokens}`,
    )
  }
  onLog?.('success', `Respuesta recibida (${extracted.text.length} caracteres, ${extracted.reasoningBlocks.length} bloque(s) de razonamiento)`)

  return extracted
}

// Parsea el `output[]` de /v1/responses separando los bloques de razonamiento
// (type: 'reasoning', con summary[] adentro) del texto final (type: 'message').
function extractReasoningPayload(data) {
  const out = Array.isArray(data.output) ? data.output : []
  const reasoningBlocks = []
  let text = ''

  for (const item of out) {
    if (item.type === 'reasoning') {
      const summaries = Array.isArray(item.summary) ? item.summary : []
      const pieces = summaries
        .map((s) => (typeof s === 'string' ? s : s?.text || ''))
        .filter(Boolean)
      reasoningBlocks.push({
        id: item.id,
        summary: pieces.join('\n\n'),
        encrypted: Boolean(item.encrypted_content),
      })
    } else if (item.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === 'output_text' && c.text) text += c.text
      }
    }
  }

  // Fallback por si la API expone output_text aplanado (algunas versiones lo hacen).
  if (!text && data.output_text) text = data.output_text

  return {
    text: text.trim(),
    reasoningBlocks,
    usage: data.usage || null,
    raw: data,
  }
}
