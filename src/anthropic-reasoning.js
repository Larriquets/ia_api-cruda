// Wrapper para extended thinking de Claude.
// Claude SÍ expone el thinking crudo, a diferencia de OpenAI — esa es la lección
// pedagógica de tener los dos lado a lado.
//
// Requisitos no obvios de la API:
//   - thinking solo funciona en modelos Sonnet/Opus 3.7+ (Sonnet 4.x, Opus 4.x).
//     Haiku NO razona.
//   - Cuando thinking está enabled, temperature DEBE ser 1 (la API lo exige).
//   - max_tokens DEBE ser > budget_tokens (porque el budget se descuenta de max_tokens).
//   - thinking.budget_tokens mínimo: 1024.

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const getApiKey = () => import.meta.env.VITE_ANTHROPIC_API_KEY
const getDefaultModel = () =>
  import.meta.env.VITE_ANTHROPIC_REASONING_MODEL || 'claude-sonnet-4-5'

const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

export const ANTHROPIC_REASONING_MODELS = [
  { id: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5', note: 'Sonnet 4.5 — recomendado' },
  { id: 'claude-opus-4-1', label: 'claude-opus-4-1', note: 'Opus 4.1 — más caro' },
  { id: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet-latest', note: 'Sonnet 3.7' },
]

// Equivalentes aproximados a los "effort" de OpenAI, para que la UI sea uniforme.
export const ANTHROPIC_BUDGETS = [
  { id: 'minimal', label: 'minimal', sub: 'casi sin pensar', tokens: 1024 },
  { id: 'low', label: 'low', sub: 'piensa poco', tokens: 2048 },
  { id: 'medium', label: 'medium', sub: 'default razonable', tokens: 5000 },
  { id: 'high', label: 'high', sub: 'piensa fuerte', tokens: 12000 },
]

const budgetTokensFor = (effort) =>
  ANTHROPIC_BUDGETS.find((b) => b.id === effort)?.tokens ?? 5000

export async function sendClaudeReasoningMessage(
  userText,
  {
    model,
    instructions,
    effort = 'medium',
    onLog,
    onRawRequest,
    onRawResponse,
  } = {},
) {
  const apiKey = getApiKey()
  const modelId = model || getDefaultModel()
  const budgetTokens = budgetTokensFor(effort)
  // max_tokens > budget_tokens (sino la API rechaza). Dejamos 1500 para la respuesta visible.
  const maxTokens = budgetTokens + 1500

  onLog?.('info', `Modelo razonador: ${modelId}`)
  onLog?.('info', `thinking.budget_tokens = ${budgetTokens} (effort: "${effort}") · max_tokens = ${maxTokens}`)

  if (!apiKey) {
    onLog?.('error', 'Falta VITE_ANTHROPIC_API_KEY en .env')
    throw new Error('Falta VITE_ANTHROPIC_API_KEY en el archivo .env')
  }
  onLog?.('info', `API key Anthropic detectada (${maskKey(apiKey)})`)
  onLog?.('info', 'Con thinking habilitado, Claude exige temperature = 1 (la API lo impone)')

  const body = {
    model: modelId,
    max_tokens: maxTokens,
    temperature: 1,
    thinking: {
      type: 'enabled',
      budget_tokens: budgetTokens,
    },
    messages: [{ role: 'user', content: userText }],
  }
  if (instructions && instructions.trim()) {
    body.system = instructions
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
  onLog?.('send', `POST ${MESSAGES_URL}`)
  onLog?.('info', 'Claude va a devolver bloques thinking + text en content[] — a diferencia de OpenAI, el thinking se ve entero')

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
    onLog?.('error', 'Si ves CORS, revisá el header anthropic-dangerous-direct-browser-access')
    throw networkErr
  }

  const elapsed = (performance.now() - startedAt).toFixed(0)
  onLog?.('info', `Respuesta HTTP ${response.status} en ${elapsed} ms`)

  const data = await response.json().catch(() => ({}))
  onRawResponse?.(data)

  if (!response.ok) {
    const detail = data?.error?.message || `HTTP ${response.status}`
    onLog?.('error', `Anthropic rechazó la solicitud: ${detail}`)
    if (/thinking|extended/i.test(detail) && /not.*support|invalid/i.test(detail)) {
      onLog?.('info', 'Pista: verificá que el modelo soporte extended thinking (Sonnet 3.7+, Opus 4+). Haiku NO razona.')
    }
    throw new Error(`Anthropic: ${detail}`)
  }

  const extracted = extractClaudeReasoningPayload(data)

  const usage = data.usage
  if (usage) {
    onLog?.(
      'info',
      `Tokens — input: ${usage.input_tokens} · output: ${usage.output_tokens}` +
        (usage.cache_read_input_tokens ? ` · cache_read: ${usage.cache_read_input_tokens}` : ''),
    )
  }
  if (data.stop_reason) {
    onLog?.('info', `stop_reason: ${data.stop_reason}`)
  }
  onLog?.(
    'success',
    `Respuesta recibida (${extracted.text.length} caracteres, ${extracted.reasoningBlocks.length} bloque(s) de thinking)`,
  )

  return extracted
}

// Parsea el content[] separando bloques `thinking` del `text` final.
// A diferencia de OpenAI, acá el thinking viene COMPLETO (no resumen).
function extractClaudeReasoningPayload(data) {
  const content = Array.isArray(data.content) ? data.content : []
  const reasoningBlocks = []
  let text = ''

  for (const block of content) {
    if (block.type === 'thinking') {
      reasoningBlocks.push({
        id: null,
        summary: block.thinking || '',
        encrypted: false,
        // Claude firma cada bloque thinking. La firma es opaca para nosotros pero
        // necesaria si querés mandarle el bloque de vuelta en otra request (multi-turn).
        signature: block.signature || null,
      })
    } else if (block.type === 'redacted_thinking') {
      // Si el content trigger los filtros de safety, Claude redacta el thinking.
      // Devuelve un bloque opaco que solo podés reenviar tal cual.
      reasoningBlocks.push({
        id: null,
        summary: '',
        encrypted: true,
        signature: null,
        redacted: true,
      })
    } else if (block.type === 'text' && block.text) {
      text += block.text
    }
  }

  // Adaptamos el shape para que sea idéntico al de openai-reasoning.js y la UI
  // no tenga que ramificar. usage también lo normalizamos: output_tokens_details
  // no existe en Anthropic, así que dejamos reasoning_tokens en 0 — los tokens
  // de thinking en Anthropic ya cuentan dentro de output_tokens y NO los separa.
  const usage = data.usage
    ? {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
        total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        // Claude no expone reasoning_tokens por separado — el thinking entra en output_tokens.
        // Lo dejamos en null para que la UI sepa que no aplica el split.
        output_tokens_details: null,
      }
    : null

  return {
    text: text.trim(),
    reasoningBlocks,
    usage,
    raw: data,
  }
}
