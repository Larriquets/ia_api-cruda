/**
 * Loop agéntico con tools MCP — el cierre conceptual de /mcp.
 *
 * Acá se juntan las dos conversaciones que el alumno ya vio por separado:
 *
 *   browser ↔ API del modelo   (loop tool-use, igual que /loop-agentico)
 *   browser ↔ servidor MCP     (tools/call, igual que el paso 3 manual)
 *
 * La diferencia con los agentes de /loop-agentico: las tools NO salen de
 * agent-tools.js (hardcodeadas en la app) sino del tools/list del servidor
 * MCP, y ejecutarlas es hacer tools/call por HTTP. El modelo nunca toca el
 * server: ELIGE la tool y los argumentos; el CLIENTE (este archivo) ejecuta.
 *
 * Mismo contrato de hooks que el resto: {onLog, onRawRequest, onRawResponse}.
 * Los hooks se pasan también a mcpCallTool — por eso los paneles de request
 * crudo alternan entre la API del modelo y el servidor MCP: ESA alternancia
 * es la lección.
 */

import { mcpCallTool } from './mcp-client.js'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

export const MCP_AGENT_DEFAULT_SYSTEM =
  'Sos un asistente con acceso a herramientas externas vía MCP. Usá las herramientas cuando el pedido lo necesite — no inventes datos que una tool te puede dar. Cuando termines, respondé breve y en castellano rioplatense.'

// Las tools MCP traen inputSchema en JSON Schema. La conversión al shape de
// cada proveedor es casi un renombre de campos — ese es el punto de MCP.
export const toOpenAITools = (mcpTools) =>
  mcpTools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }))

export const toAnthropicTools = (mcpTools) =>
  mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }))

/**
 * Ejecuta una tool pedida por el modelo, vía MCP. Si el server devuelve un
 * error de protocolo (tool inexistente, etc.) lo convertimos en tool_result
 * con error para que el modelo lo lea y pueda recuperarse.
 */
async function ejecutarViaMcp(host, name, args, hooks) {
  const { onLog } = hooks
  onLog?.('info', `El modelo pidió "${name}" — el CLIENTE la ejecuta contra el servidor MCP (tools/call)`)
  try {
    return await mcpCallTool(host, name, args, hooks)
  } catch (err) {
    return { text: `Error: ${err.message}`, isError: true }
  }
}

/**
 * Punto de entrada. Despacha al loop del proveedor elegido.
 * Devuelve { finalText, iterations, stopReason, toolCallCount, usage }.
 */
export async function runMcpAgent(
  { provider, task, host, mcpTools, system = '', model = null, maxIterations = 6, temperature = 0.2 },
  hooks = {},
) {
  const effectiveSystem = system.trim() ? system : MCP_AGENT_DEFAULT_SYSTEM
  const params = { task, host, mcpTools, system: effectiveSystem, model, maxIterations, temperature }
  return provider === 'anthropic'
    ? runClaudeMcpAgent(params, hooks)
    : runOpenAIMcpAgent(params, hooks)
}

// ---------------------------------------------------------------------------
// OpenAI: tools como {type:'function'}, arguments llega como STRING JSON,
// resultados como mensajes role:'tool'. Termina cuando finish_reason !== 'tool_calls'.
// ---------------------------------------------------------------------------
async function runOpenAIMcpAgent(
  { task, host, mcpTools, system, model, maxIterations, temperature },
  { onLog, onRawRequest, onRawResponse, onStep } = {},
) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  const effectiveModel = model || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
  if (!apiKey) {
    onLog?.('error', 'Falta VITE_OPENAI_API_KEY en .env')
    throw new Error('Falta VITE_OPENAI_API_KEY en el archivo .env')
  }
  onLog?.('info', `Agente MCP (OpenAI) — modelo: ${effectiveModel} · ${mcpTools.length} tool(s) del servidor MCP`)

  const tools = toOpenAITools(mcpTools)
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: task.trim() },
  ]
  const hooks = { onLog, onRawRequest, onRawResponse }

  let iter = 0
  let finalText = ''
  let finishReason = 'unknown'
  let toolCallCount = 0
  const usage = { input: 0, output: 0 }

  while (iter < maxIterations) {
    iter += 1
    onStep?.({ n: iter, type: 'iteration_start' })
    onLog?.('info', `— Iteración #${iter} — POST a la API del MODELO con ${messages.length} mensaje(s) + ${tools.length} tool def(s)`)

    const body = { model: effectiveModel, messages, tools, temperature }
    onRawRequest?.({
      method: 'POST',
      url: OPENAI_URL,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${maskKey(apiKey)}` },
      body,
    })
    onLog?.('send', `POST ${OPENAI_URL} (iter ${iter})`)

    const t0 = performance.now()
    let response
    try {
      response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      })
    } catch (networkErr) {
      onLog?.('error', `Error de red: ${networkErr.message}`)
      throw networkErr
    }
    onLog?.('info', `HTTP ${response.status} en ${(performance.now() - t0).toFixed(0)} ms`)

    const data = await response.json().catch(() => ({}))
    onRawResponse?.(data)

    if (!response.ok) {
      const detail = data?.error?.message || `HTTP ${response.status}`
      onLog?.('error', `OpenAI rechazó la solicitud: ${detail}`)
      throw new Error(`OpenAI: ${detail}`)
    }

    if (data.usage) {
      usage.input += data.usage.prompt_tokens || 0
      usage.output += data.usage.completion_tokens || 0
    }

    const choice = data.choices?.[0]
    finishReason = choice?.finish_reason || 'unknown'
    const assistantMsg = choice?.message
    if (!assistantMsg) {
      onLog?.('error', 'Respuesta sin choices[0].message — rompe el loop')
      break
    }
    messages.push(assistantMsg)

    if (finishReason !== 'tool_calls' || !Array.isArray(assistantMsg.tool_calls) || assistantMsg.tool_calls.length === 0) {
      finalText = (assistantMsg.content || '').trim()
      onStep?.({ n: iter, type: 'final_text', text: finalText })
      onLog?.('success', `Loop terminado en ${iter} iteración(es) — finish_reason=${finishReason}`)
      break
    }

    for (const tc of assistantMsg.tool_calls) {
      const name = tc.function?.name
      let args
      try {
        args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch {
        args = {}
      }
      toolCallCount += 1
      onStep?.({ n: iter, type: 'tool_use', name, input: args })

      const { text, isError } = await ejecutarViaMcp(host, name, args, hooks)
      onStep?.({ n: iter, type: 'tool_result', name, content: text, isError })

      messages.push({ role: 'tool', tool_call_id: tc.id, content: text })
    }
  }

  if (iter >= maxIterations && finishReason === 'tool_calls') {
    onLog?.('error', `Cota de seguridad: alcanzadas ${maxIterations} iteraciones sin que la IA termine`)
  }

  return { finalText, iterations: iter, stopReason: finishReason, toolCallCount, usage }
}

// ---------------------------------------------------------------------------
// Anthropic: tools con input_schema, respuesta en content[] con bloques
// tool_use, resultados como role:'user' con bloques tool_result.
// Termina cuando stop_reason !== 'tool_use'.
// ---------------------------------------------------------------------------
async function runClaudeMcpAgent(
  { task, host, mcpTools, system, model, maxIterations, temperature },
  { onLog, onRawRequest, onRawResponse, onStep } = {},
) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const effectiveModel = model || import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
  if (!apiKey) {
    onLog?.('error', 'Falta VITE_ANTHROPIC_API_KEY en .env')
    throw new Error('Falta VITE_ANTHROPIC_API_KEY en el archivo .env')
  }
  onLog?.('info', `Agente MCP (Claude) — modelo: ${effectiveModel} · ${mcpTools.length} tool(s) del servidor MCP`)

  const tools = toAnthropicTools(mcpTools)
  const messages = [{ role: 'user', content: task.trim() }]
  const hooks = { onLog, onRawRequest, onRawResponse }
  const clampedTemp = Math.min(Math.max(temperature, 0), 1)

  let iter = 0
  let finalText = ''
  let stopReason = 'unknown'
  let toolCallCount = 0
  const usage = { input: 0, output: 0 }

  while (iter < maxIterations) {
    iter += 1
    onStep?.({ n: iter, type: 'iteration_start' })
    onLog?.('info', `— Iteración #${iter} — POST a la API del MODELO con ${messages.length} mensaje(s) + ${tools.length} tool def(s)`)

    const body = { model: effectiveModel, system, messages, tools, max_tokens: 1024, temperature: clampedTemp }
    onRawRequest?.({
      method: 'POST',
      url: ANTHROPIC_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': maskKey(apiKey),
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body,
    })
    onLog?.('send', `POST ${ANTHROPIC_URL} (iter ${iter})`)

    const t0 = performance.now()
    let response
    try {
      response = await fetch(ANTHROPIC_URL, {
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
      throw networkErr
    }
    onLog?.('info', `HTTP ${response.status} en ${(performance.now() - t0).toFixed(0)} ms`)

    const data = await response.json().catch(() => ({}))
    onRawResponse?.(data)

    if (!response.ok) {
      const detail = data?.error?.message || `HTTP ${response.status}`
      onLog?.('error', `Anthropic rechazó la solicitud: ${detail}`)
      throw new Error(`Anthropic: ${detail}`)
    }

    if (data.usage) {
      usage.input += data.usage.input_tokens || 0
      usage.output += data.usage.output_tokens || 0
    }

    stopReason = data.stop_reason || 'unknown'
    const assistantContent = Array.isArray(data.content) ? data.content : []
    messages.push({ role: 'assistant', content: assistantContent })

    if (stopReason !== 'tool_use') {
      for (const block of assistantContent) {
        if (block.type === 'text' && block.text) finalText += block.text
      }
      finalText = finalText.trim()
      onStep?.({ n: iter, type: 'final_text', text: finalText })
      onLog?.('success', `Loop terminado en ${iter} iteración(es) — stop_reason=${stopReason}`)
      break
    }

    const toolResults = []
    for (const tu of assistantContent.filter((b) => b.type === 'tool_use')) {
      toolCallCount += 1
      onStep?.({ n: iter, type: 'tool_use', name: tu.name, input: tu.input })

      const { text, isError } = await ejecutarViaMcp(host, tu.name, tu.input, hooks)
      onStep?.({ n: iter, type: 'tool_result', name: tu.name, content: text, isError })

      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: text, is_error: isError })
    }
    messages.push({ role: 'user', content: toolResults })
  }

  if (iter >= maxIterations && stopReason === 'tool_use') {
    onLog?.('error', `Cota de seguridad: alcanzadas ${maxIterations} iteraciones sin que la IA termine`)
  }

  return { finalText, iterations: iter, stopReason, toolCallCount, usage }
}
