const EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'

const getApiKey = () => import.meta.env.VITE_OPENAI_API_KEY

const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

export const EMBEDDING_MODEL = 'text-embedding-3-small'

// Los text-embedding-3 aceptan `dimensions`: OpenAI trunca (y renormaliza) el
// vector del lado del servidor. Pedagógicamente clave: con 64 dimensiones el
// response crudo se puede LEER; 1536 es el tamaño real de producción.
export const EMBEDDING_DIMENSIONS = [64, 256, 1536]

export async function embedTexts(texts, { onLog, onRawRequest, onRawResponse, dimensions = 64 } = {}) {
  const apiKey = getApiKey()

  if (!apiKey) {
    onLog?.('error', 'Falta VITE_OPENAI_API_KEY en .env')
    throw new Error('Falta VITE_OPENAI_API_KEY en el archivo .env')
  }
  onLog?.('info', `API key detectada (${maskKey(apiKey)})`)
  onLog?.('info', `Embeddings: ${texts.length} texto(s) → vector(es) de ${dimensions} dimensiones`)

  const body = { model: EMBEDDING_MODEL, input: texts, dimensions }

  const requestPayload = {
    method: 'POST',
    url: EMBEDDINGS_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${maskKey(apiKey)}`,
    },
    body,
  }

  onRawRequest?.(requestPayload)
  onLog?.('send', `POST ${EMBEDDINGS_URL}`)

  const startedAt = performance.now()

  let response
  try {
    response = await fetch(EMBEDDINGS_URL, {
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

  // data.data[] trae {index, embedding}; ordenamos por index por las dudas.
  const embeddings = (data.data || [])
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)

  const usage = data.usage
  if (usage) {
    onLog?.('info', `Tokens — input: ${usage.prompt_tokens}, total: ${usage.total_tokens} (los embeddings no generan tokens de salida)`)
  }
  onLog?.('success', `${embeddings.length} vector(es) recibido(s)`)

  return { embeddings, usage, raw: data }
}

// Similitud coseno entre dos vectores. Los embeddings de OpenAI ya vienen con
// norma 1, así que el producto punto alcanzaría — dividimos por las normas
// igual para que la fórmula completa quede a la vista del alumno.
export function cosineSimilarity(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
