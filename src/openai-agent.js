// Wrapper "agéntico" para OpenAI: implementa el loop function-calling
// sobre /v1/chat/completions. Misma firma que anthropic-agent.js para
// que la UI no tenga que distinguir.
//
// Diferencias con Anthropic:
// - Tools: { type: 'function', function: { name, description, parameters } }
// - Respuesta: choices[0].message.tool_calls[] con
//     { id, type: 'function', function: { name, arguments: <string JSON> } }
//   ⚠ arguments viene como STRING — hay que JSON.parse manual.
// - Resultado: nuevo mensaje con role 'tool', tool_call_id, content (string).
// - Termina cuando finish_reason !== 'tool_calls' (típicamente 'stop').

import { AGENT_SYSTEM_PROMPT, AGENT_TOOL_DEFS, runAgentTool } from './agent-tools.js'

const CHAT_URL = 'https://api.openai.com/v1/chat/completions'

const getApiKey = () => import.meta.env.VITE_OPENAI_API_KEY
const getModel = () => import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

// Adaptamos las defs neutras al shape de OpenAI.
const OPENAI_TOOLS = AGENT_TOOL_DEFS.map((t) => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}))

export async function runOpenAIAgent(
  { userInstruction, initialCode, language, maxIterations = 8, extraSystem = '' },
  { onLog, onRawRequest, onRawResponse, onStep, onCodeChange } = {},
) {
  const apiKey = getApiKey()
  const model = getModel()

  if (!apiKey) {
    onLog?.('error', 'Falta VITE_OPENAI_API_KEY en .env')
    throw new Error('Falta VITE_OPENAI_API_KEY en el archivo .env')
  }
  onLog?.('info', `Modo AGENTE (OpenAI) — modelo: ${model}`)
  onLog?.('info', `API key OpenAI detectada (${maskKey(apiKey)})`)

  let code = initialCode
  const getCode = () => code
  const setCode = (next) => {
    code = next
    onCodeChange?.(next)
  }

  const fullSystem = extraSystem
    ? `${AGENT_SYSTEM_PROMPT}\n\n## Instrucciones específicas del proyecto (AGENTS.md):\n${extraSystem}`
    : AGENT_SYSTEM_PROMPT

  // OpenAI mete el system prompt como primer mensaje (no aparte como Anthropic).
  const messages = [
    { role: 'system', content: fullSystem },
    {
      role: 'user',
      content: `Lenguaje: ${language}\n\nInstrucción:\n${userInstruction.trim()}\n\nCódigo inicial:\n\`\`\`${language}\n${initialCode}\n\`\`\`\n\nUsá las herramientas para inspeccionar y editar el código según lo pedido. Cuando termines, respondé con un texto breve.`,
    },
  ]

  let iter = 0
  let finalText = ''
  let finishReason = 'unknown'

  while (iter < maxIterations) {
    iter += 1
    onStep?.({ n: iter, type: 'iteration_start' })
    onLog?.('info', `— Iteración #${iter} (OpenAI) — enviando ${messages.length} mensaje(s)`)

    const body = {
      model,
      messages,
      tools: OPENAI_TOOLS,
      temperature: 0.2,
    }

    onRawRequest?.({
      method: 'POST',
      url: CHAT_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${maskKey(apiKey)}`,
      },
      body,
    })
    onLog?.('send', `POST ${CHAT_URL} (iter ${iter})`)

    const t0 = performance.now()
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
    const elapsed = (performance.now() - t0).toFixed(0)
    onLog?.('info', `HTTP ${response.status} en ${elapsed} ms`)

    const data = await response.json().catch(() => ({}))
    onRawResponse?.(data)

    if (!response.ok) {
      const detail = data?.error?.message || `HTTP ${response.status}`
      onLog?.('error', `OpenAI rechazó la solicitud: ${detail}`)
      throw new Error(`OpenAI: ${detail}`)
    }

    if (data.usage) {
      onLog?.(
        'info',
        `Tokens iter ${iter} — prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}`,
      )
    }

    const choice = data.choices?.[0]
    finishReason = choice?.finish_reason || 'unknown'
    onLog?.('info', `finish_reason: ${finishReason}`)

    const assistantMsg = choice?.message
    if (!assistantMsg) {
      onLog?.('error', 'Respuesta sin choices[0].message — rompe el loop')
      break
    }

    // Acumulamos el turno del assistant tal cual (OpenAI lo necesita literal,
    // incluyendo tool_calls, para que los tool results posteriores tengan referencia).
    messages.push(assistantMsg)

    if (finishReason !== 'tool_calls' || !Array.isArray(assistantMsg.tool_calls) || assistantMsg.tool_calls.length === 0) {
      finalText = (assistantMsg.content || '').trim()
      onStep?.({ n: iter, type: 'final_text', text: finalText })
      onLog?.('success', `Loop terminado en ${iter} iteración(es) — finish_reason=${finishReason}`)
      break
    }

    onLog?.('info', `OpenAI pidió ${assistantMsg.tool_calls.length} tool call(s) en este turno`)

    for (const tc of assistantMsg.tool_calls) {
      const name = tc.function?.name
      let parsed
      try {
        parsed = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch {
        parsed = {}
      }

      onStep?.({ n: iter, type: 'tool_use', name, input: parsed, id: tc.id })
      onLog?.('info', `→ tool_use: ${name}(${JSON.stringify(parsed).slice(0, 80)})`)

      const { result, isError } = runAgentTool(name, parsed, getCode, setCode)
      onStep?.({ n: iter, type: 'tool_result', name, content: result, isError, id: tc.id })
      onLog?.(isError ? 'error' : 'info', `← tool_result (${name}): ${String(result).slice(0, 80)}`)

      // OpenAI: cada result va como un mensaje role:'tool' con tool_call_id.
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: String(result),
      })
    }
  }

  if (iter >= maxIterations && finishReason === 'tool_calls') {
    onLog?.('error', `Cota de seguridad: alcanzadas ${maxIterations} iteraciones sin que la IA termine`)
  }

  return { finalText: finalText.trim(), code, iterations: iter, stopReason: finishReason }
}
