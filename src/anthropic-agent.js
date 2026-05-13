// Wrapper "agéntico" para Claude: implementa el loop tool-use sobre /v1/messages.
// Pedagógico: cada iteración llama a la API; los onStep / onCodeChange permiten
// ver desde la UI cómo la IA llama N herramientas en un solo prompt.

import { AGENT_SYSTEM_PROMPT, buildSkillsIndex, getAgentToolDefs, runAgentTool } from './agent-tools.js'

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const getApiKey = () => import.meta.env.VITE_ANTHROPIC_API_KEY
const getModel = () => import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const maskKey = (k) => `${k.slice(0, 7)}…${k.slice(-4)}`

/**
 * Loop agéntico Claude.
 * Ver doc en EditorAgente.jsx — devuelve {finalText, code, iterations, stopReason}.
 */
export async function runClaudeAgent(
  { userInstruction, initialCode, language, maxIterations = 8, extraSystem = '', requireImpactApproval = false, skills = [], useSkills = false, previousMessages = [] },
  { onLog, onRawRequest, onRawResponse, onStep, onCodeChange, onAwaitApproval } = {},
) {
  const apiKey = getApiKey()
  const model = getModel()

  if (!apiKey) {
    onLog?.('error', 'Falta VITE_ANTHROPIC_API_KEY en .env')
    throw new Error('Falta VITE_ANTHROPIC_API_KEY en el archivo .env')
  }
  onLog?.('info', `Modo AGENTE (Anthropic) — modelo: ${model}`)
  onLog?.('info', `API key Anthropic detectada (${maskKey(apiKey)})`)

  let code = initialCode
  const toolState = {
    getCode: () => code,
    setCode: (next) => {
      code = next
      onCodeChange?.(next)
    },
    approved: false,
    requireImpactApproval,
    awaitApproval: async (payload) => {
      if (typeof onAwaitApproval !== 'function') {
        // Sin UI — por defecto aprobamos para no romper corridas headless.
        return true
      }
      return await onAwaitApproval(payload)
    },
    skills,
    loadedSkillIds: new Set(),
  }
  const skillsAvailable = useSkills && skills.length > 0
  // Adaptamos las defs neutras al shape de Anthropic (input_schema en lugar de parameters).
  const tools = getAgentToolDefs({ includeImpact: requireImpactApproval, includeSkills: skillsAvailable }).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))

  const messages = [
    ...previousMessages,
    {
      role: 'user',
      content: `Lenguaje: ${language}\n\nInstrucción:\n${userInstruction.trim()}\n\nCódigo inicial:\n\`\`\`${language}\n${initialCode}\n\`\`\`\n\nUsá las herramientas para inspeccionar y editar el código según lo pedido. Cuando termines, respondé con un texto breve.`,
    },
  ]

  let iter = 0
  let finalText = ''
  let stopReason = 'unknown'

  while (iter < maxIterations) {
    iter += 1
    onStep?.({ n: iter, type: 'iteration_start' })
    onLog?.('info', `— Iteración #${iter} (Claude) — enviando ${messages.length} mensaje(s)`)

    // System prompt = base + (opcional) AGENTS.md + (opcional) índice de skills.
    // Los bodies de skills NO viajan acá: viajan recién cuando la IA llama
    // load_skill — así el contexto arranca chico y crece bajo demanda.
    const skillsIndex = skillsAvailable ? buildSkillsIndex(skills) : ''
    let fullSystem = AGENT_SYSTEM_PROMPT
    if (extraSystem) {
      fullSystem += `\n\n## Instrucciones específicas del proyecto (AGENTS.md):\n${extraSystem}`
    }
    if (skillsIndex) {
      fullSystem += `\n\n${skillsIndex}`
    }

    const body = {
      model,
      system: fullSystem,
      messages,
      tools,
      max_tokens: 1024,
    }

    onRawRequest?.({
      method: 'POST',
      url: MESSAGES_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': maskKey(apiKey),
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body,
    })
    onLog?.('send', `POST ${MESSAGES_URL} (iter ${iter})`)

    const t0 = performance.now()
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
      throw networkErr
    }
    const elapsed = (performance.now() - t0).toFixed(0)
    onLog?.('info', `HTTP ${response.status} en ${elapsed} ms`)

    const data = await response.json().catch(() => ({}))
    onRawResponse?.(data)

    if (!response.ok) {
      const detail = data?.error?.message || `HTTP ${response.status}`
      onLog?.('error', `Anthropic rechazó la solicitud: ${detail}`)
      throw new Error(`Anthropic: ${detail}`)
    }

    if (data.usage) {
      onLog?.('info', `Tokens iter ${iter} — input: ${data.usage.input_tokens}, output: ${data.usage.output_tokens}`)
    }

    stopReason = data.stop_reason || 'unknown'
    onLog?.('info', `stop_reason: ${stopReason}`)

    const assistantContent = Array.isArray(data.content) ? data.content : []
    messages.push({ role: 'assistant', content: assistantContent })

    if (stopReason !== 'tool_use') {
      for (const block of assistantContent) {
        if (block.type === 'text' && block.text) finalText += block.text
      }
      onStep?.({ n: iter, type: 'final_text', text: finalText })
      onLog?.('success', `Loop terminado en ${iter} iteración(es) — stop_reason=${stopReason}`)
      break
    }

    const toolUses = assistantContent.filter((b) => b.type === 'tool_use')
    onLog?.('info', `Claude pidió ${toolUses.length} tool call(s) en este turno`)

    const toolResults = []
    for (const tu of toolUses) {
      onStep?.({ n: iter, type: 'tool_use', name: tu.name, input: tu.input, id: tu.id })
      onLog?.('info', `→ tool_use: ${tu.name}(${JSON.stringify(tu.input).slice(0, 80)})`)

      const { result, isError } = await runAgentTool(tu.name, tu.input, toolState)
      onStep?.({ n: iter, type: 'tool_result', name: tu.name, content: result, isError, id: tu.id })
      onLog?.(isError ? 'error' : 'info', `← tool_result (${tu.name}): ${String(result).slice(0, 80)}`)

      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: result,
        is_error: isError,
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  if (iter >= maxIterations && stopReason === 'tool_use') {
    onLog?.('error', `Cota de seguridad: alcanzadas ${maxIterations} iteraciones sin que la IA termine`)
  }

  return { finalText: finalText.trim(), code, iterations: iter, stopReason, messages }
}
