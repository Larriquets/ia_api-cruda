// Wrapper de razonamiento para LM Studio local.
// LM Studio usa /v1/chat/completions (shape OpenAI) — no tiene reasoning nativo.
// Muchos modelos razonadores locales (DeepSeek-R1, QwQ, Qwen3-CoT, etc.) exponen
// el thinking dentro de etiquetas <think>...</think> en el texto de respuesta.
//
// Soporta streaming (onTextChunk / onThinkingStart / onThinkingChunk / onThinkingEnd):
//   - Los deltas de texto fuera de <think> llaman onTextChunk(delta).
//   - Los deltas dentro de <think> llaman onThinkingChunk(delta), con
//     onThinkingStart() al abrir y onThinkingEnd() al cerrar cada bloque.
//   - Detecta correctamente etiquetas que llegan partidas entre chunks.
// Devuelve el mismo shape que los otros wrappers: { text, reasoningBlocks, usage, raw }.

import { getLmStudioHost, getLmStudioModel } from './lmstudio.js'


const FETCH_HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer lm-studio' }

// ── Parser de <think> en streaming ─────────────────────────────────────────
// Maneja etiquetas que llegan partidas entre chunks (ej: '<thi' + 'nk>').
// Estado: 'text' | 'in-think'
class ThinkStreamParser {
  constructor({ onText, onThinkingStart, onThinkingChunk, onThinkingEnd } = {}) {
    this.state = 'text'
    this.pending = '' // buffer de caracteres que podrían ser parte de una etiqueta
    this.cb = { onText, onThinkingStart, onThinkingChunk, onThinkingEnd }
  }

  feed(delta) {
    this.pending += delta
    this._flush()
  }

  // Encuentra la posición más a la derecha en `str` donde empieza un prefijo de `tag`.
  // Devuelve -1 si no hay ningún prefijo parcial (el pending es seguro de emitir completo).
  _partialStart(tag) {
    for (let i = Math.max(0, this.pending.length - tag.length + 1); i < this.pending.length; i++) {
      if (tag.startsWith(this.pending.slice(i))) return i
    }
    return -1
  }

  _flush() {
    const { onText, onThinkingStart, onThinkingChunk, onThinkingEnd } = this.cb

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!this.pending) break

      if (this.state === 'text') {
        const idx = this.pending.indexOf('<think>')
        if (idx === -1) {
          const p = this._partialStart('<think>')
          if (p > 0) {
            // Hay texto seguro antes del posible inicio de etiqueta
            const safe = this.pending.slice(0, p)
            if (safe) onText?.(safe)
            this.pending = this.pending.slice(p)
            break // esperar más chunks
          } else if (p === 0) {
            break // todo el pending es un posible prefijo de la etiqueta
          } else {
            onText?.(this.pending)
            this.pending = ''
            break
          }
        } else {
          if (idx > 0) onText?.(this.pending.slice(0, idx))
          this.pending = this.pending.slice(idx + '<think>'.length)
          this.state = 'in-think'
          onThinkingStart?.()
        }
      } else {
        const idx = this.pending.indexOf('</think>')
        if (idx === -1) {
          const p = this._partialStart('</think>')
          if (p > 0) {
            const safe = this.pending.slice(0, p)
            if (safe) onThinkingChunk?.(safe)
            this.pending = this.pending.slice(p)
            break
          } else if (p === 0) {
            break
          } else {
            onThinkingChunk?.(this.pending)
            this.pending = ''
            break
          }
        } else {
          if (idx > 0) onThinkingChunk?.(this.pending.slice(0, idx))
          this.pending = this.pending.slice(idx + '</think>'.length)
          this.state = 'text'
          onThinkingEnd?.()
        }
      }
    }
  }

  // Emitir lo que quedó en el buffer al fin del stream
  end() {
    if (!this.pending) return
    if (this.state === 'text') {
      this.cb.onText?.(this.pending)
    } else {
      this.cb.onThinkingChunk?.(this.pending)
    }
    this.pending = ''
  }
}

// ── readSSE helper ──────────────────────────────────────────────────────────
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
      buf = lines.pop()
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

// ── Wrapper principal ───────────────────────────────────────────────────────
export async function sendLmStudioReasoningMessage(
  userInput,
  {
    instructions,
    effort = 'medium',
    onLog,
    onRawRequest,
    onRawResponse,
    // callbacks de streaming (opcionales)
    onTextChunk,        // (delta) → texto de respuesta final
    onThinkingStart,    // () → abrió un bloque <think>
    onThinkingChunk,    // (delta) → texto dentro de <think>
    onThinkingEnd,      // () → cerró </think>
  } = {},
) {
  const host = getLmStudioHost()
  const model = getLmStudioModel()
  const url = `${host}/v1/chat/completions`

  if (!model) {
    const msg = 'No hay modelo configurado para LM Studio. Elegilo en la ConfigBar (botón "Detectar") o seteá VITE_LMSTUDIO_MODEL.'
    onLog?.('error', msg)
    throw new Error(msg)
  }

  const useStream = typeof onTextChunk === 'function' || typeof onThinkingChunk === 'function'

  onLog?.('info', `Modelo local (LM Studio): ${model}`)
  onLog?.('info', `Host LM Studio: ${host} (sin API key — corre en tu máquina)`)
  onLog?.('info', `Effort "${effort}" · stream=${useStream} · max_tokens=16384`)

  const systemContent = (instructions || '').trim() ||
    'Sos un asistente que piensa paso a paso antes de responder. Respondé en castellano rioplatense, de forma clara y directa.'

  let messages
  if (Array.isArray(userInput)) {
    const hasSystem = userInput.length > 0 && userInput[0].role === 'system'
    messages = hasSystem
      ? userInput
      : [{ role: 'system', content: systemContent }, ...userInput]
  } else {
    messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: userInput },
    ]
  }

  // max_tokens es crítico con modelos CoT: sin él LM Studio usa el máximo del
  // modelo (32k–128k) y el thinking chain nunca termina. 16k permite razonamiento
  // extenso sin colgarse.
  const body = { model, messages, temperature: 0.6, stream: useStream, max_tokens: 16384 }

  onRawRequest?.({ method: 'POST', url, headers: FETCH_HEADERS, body })
  onLog?.('info', `Enviando ${messages.length} mensaje(s) — esperando bloques <think>...</think> · stream=${useStream}`)
  onLog?.('send', `POST ${url}`)

  const startedAt = performance.now()
  let response
  try {
    response = await fetch(url, { method: 'POST', headers: FETCH_HEADERS, body: JSON.stringify(body) })
  } catch (networkErr) {
    onLog?.('error', `Error de red: ${networkErr.message}`)
    onLog?.('error', `¿Está corriendo LM Studio? Abrí LM Studio → Developer → Status: Running.`)
    throw networkErr
  }

  const elapsed = (performance.now() - startedAt).toFixed(0)
  onLog?.('info', `HTTP ${response.status} en ${elapsed} ms${useStream ? ' · streaming' : ''}`)

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    onRawResponse?.(errData)
    const detail = errData?.error?.message || errData?.error || `HTTP ${response.status}`
    onLog?.('error', `LM Studio rechazó: ${detail}`)
    throw new Error(`LM Studio: ${detail}`)
  }

  // ── Acumuladores compartidos (usados tanto en streaming como en bloqueo) ──
  const thinkingBlocks = []
  let currentThinkText = ''
  let responseText = ''
  let lastUsage = null

  if (useStream) {
    // ── Streaming ────────────────────────────────────────────────────────────
    const rawChunks = []

    const parser = new ThinkStreamParser({
      onText: (chunk) => {
        responseText += chunk
        onTextChunk?.(chunk)
      },
      onThinkingStart: () => {
        thinkingBlocks.push({ id: `lm-think-${thinkingBlocks.length}`, summary: '' })
        currentThinkText = ''
        onThinkingStart?.()
      },
      onThinkingChunk: (chunk) => {
        currentThinkText += chunk
        if (thinkingBlocks.length > 0) {
          thinkingBlocks[thinkingBlocks.length - 1].summary = currentThinkText
        }
        onThinkingChunk?.(chunk)
      },
      onThinkingEnd: () => {
        currentThinkText = ''
        onThinkingEnd?.()
      },
    })

    await readSSE(response, (chunk) => {
      rawChunks.push(chunk)
      const delta = chunk?.choices?.[0]?.delta?.content
      if (delta) parser.feed(delta)
      if (chunk?.usage) lastUsage = chunk.usage
    })

    parser.end()
    onRawResponse?.(rawChunks)
  } else {
    // ── Bloqueo (fallback sin callbacks de streaming) ────────────────────────
    const data = await response.json().catch(() => ({}))
    onRawResponse?.(data)

    const rawText = (data?.choices?.[0]?.message?.content || '').trim()
    lastUsage = data?.usage ?? null

    // Parseo completo a fin del stream (mismo resultado que el parser haría)
    const thinkRe = /<think>([\s\S]*?)<\/think>/gi
    let match
    while ((match = thinkRe.exec(rawText)) !== null) {
      const content = match[1].trim()
      if (content) thinkingBlocks.push({ id: `lm-think-${thinkingBlocks.length}`, summary: content })
    }
    responseText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  }

  if (lastUsage) {
    onLog?.('info', `Tokens — prompt: ${lastUsage.prompt_tokens ?? '?'}, completion: ${lastUsage.completion_tokens ?? '?'}, total: ${lastUsage.total_tokens ?? '?'}`)
  }

  if (thinkingBlocks.length > 0) {
    onLog?.('success', `Thinking detectado: ${thinkingBlocks.length} bloque(s) <think> en el output`)
  } else {
    onLog?.('info', `No se encontraron bloques <think>. El modelo puede no tener reasoning explícito.`)
  }
  onLog?.('success', `Respuesta recibida (${responseText.length} caracteres)`)

  const usage = lastUsage
    ? {
        input_tokens: lastUsage.prompt_tokens ?? 0,
        output_tokens: lastUsage.completion_tokens ?? 0,
        total_tokens: lastUsage.total_tokens ?? 0,
      }
    : null

  return { text: responseText, reasoningBlocks: thinkingBlocks, usage, raw: null }
}
