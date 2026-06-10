const CHAT_URL = 'https://api.openai.com/v1/chat/completions'

const getApiKey = () => import.meta.env.VITE_OPENAI_API_KEY

const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

// Cuántas alternativas por token pedimos. La API acepta 0..20.
export const TOP_LOGPROBS_OPTIONS = [
  { id: 3, label: '3 alternativas' },
  { id: 5, label: '5 alternativas' },
  { id: 10, label: '10 alternativas' },
  { id: 20, label: '20 alternativas (máximo)' },
]

/**
 * Llama a /v1/chat/completions con logprobs activado.
 * Solo OpenAI: Anthropic no expone logprobs en su API — eso también es parte
 * de la lección (qué decide mostrar cada proveedor).
 *
 * Devuelve shape propio para que la UI no parsee el response:
 * {
 *   text: string,
 *   tokens: [{ token, logprob, prob, alternatives: [{ token, logprob, prob, chosen }] }],
 *   usage,
 *   raw,
 * }
 */
export async function sendLogprobsMessage(messages, {
  onLog,
  onRawRequest,
  onRawResponse,
  temperature = 0.7,
  model = 'gpt-4o-mini',
  topLogprobs = 5,
  maxTokens = 300,
} = {}) {
  const apiKey = getApiKey()

  if (!apiKey) {
    onLog?.('error', 'Falta VITE_OPENAI_API_KEY en .env')
    throw new Error('Falta VITE_OPENAI_API_KEY en el archivo .env')
  }
  onLog?.('info', `API key detectada (${maskKey(apiKey)})`)
  onLog?.('info', `Modelo: ${model} · temperatura: ${temperature} · top_logprobs: ${topLogprobs}`)

  const body = {
    model,
    messages,
    temperature,
    logprobs: true,
    top_logprobs: topLogprobs,
    // Limitamos el largo: con logprobs cada token vuelve con sus alternativas
    // y el response crece rápido. Para la clase alcanza con respuestas cortas.
    max_tokens: maxTokens,
  }

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
  onLog?.('info', `Request con logprobs:true — la API va a devolver la probabilidad de cada token elegido y sus ${topLogprobs} alternativas`)
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

  const choice = data.choices?.[0]
  const text = choice?.message?.content?.trim() ?? ''
  const rawTokens = choice?.logprobs?.content || []

  // logprob es ln(p) — exponenciamos para mostrar probabilidad 0..1.
  const tokens = rawTokens.map((t) => ({
    token: t.token,
    logprob: t.logprob,
    prob: Math.exp(t.logprob),
    alternatives: (t.top_logprobs || []).map((alt) => ({
      token: alt.token,
      logprob: alt.logprob,
      prob: Math.exp(alt.logprob),
      chosen: alt.token === t.token,
    })),
  }))

  if (tokens.length === 0) {
    onLog?.('error', 'El response no trajo logprobs — ¿el modelo los soporta?')
  } else {
    const avg = tokens.reduce((s, t) => s + t.prob, 0) / tokens.length
    onLog?.('info', `${tokens.length} token(s) con logprobs · confianza promedio ${(avg * 100).toFixed(1)}%`)
  }

  const usage = data.usage
  if (usage) {
    onLog?.('info', `Tokens — prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`)
  }
  onLog?.('success', `Respuesta recibida (${text.length} caracteres)`)

  return { text, tokens, usage, raw: data }
}
