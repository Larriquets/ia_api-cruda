// Wrapper agéntico para LM Studio local: misma firma que openai-agent.js / anthropic-agent.js.
// LM Studio expone /v1/chat/completions con el shape de OpenAI, incluyendo tool calling,
// así que el loop es idéntico al de OpenAI — solo cambia la URL y desaparece la API key real.
//
// ⚠ Pedagógicamente importante: no todos los modelos locales soportan tool calling.
// Si el modelo no responde con `tool_calls`, el loop termina en la primera iteración con el
// texto plano de la IA. En la UI lo verás como "finish_reason=stop" sin pasos intermedios.

import { AGENT_SYSTEM_PROMPT, buildSkillsIndex, getAgentToolDefs, runAgentTool } from './agent-tools.js'
import { getLmStudioHost as getHost, getLmStudioModel as getModel } from './lmstudio.js'

// LM Studio devuelve {"error":"Model reloaded."} cuando recarga el modelo en mitad de
// un request (Auto-Evict, cambio de modelo, etc.). Reintentamos 1 vez por iteración.
const isModelReloadedError = (data) => {
  const msg = data?.error?.message || data?.error || ''
  return typeof msg === 'string' && /model\s+reloaded/i.test(msg)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function runLmStudioAgent(
  { userInstruction, initialCode, language, maxIterations = 8, extraSystem = '', requireImpactApproval = false, skills = [], useSkills = false },
  { onLog, onRawRequest, onRawResponse, onStep, onCodeChange, onAwaitApproval } = {},
) {
  const host = getHost()
  const model = getModel()
  const chatUrl = `${host}/v1/chat/completions`

  if (!model) {
    const msg = 'No hay modelo configurado para LM Studio. Elegilo en la ConfigBar (botón "Detectar") o seteá VITE_LMSTUDIO_MODEL.'
    onLog?.('error', msg)
    throw new Error(msg)
  }

  onLog?.('info', `Modo AGENTE (LM Studio local) — modelo: ${model}`)
  onLog?.('info', `Host: ${host} (sin API key real). Si el modelo no soporta tools, el loop termina en 1 iter.`)

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
      if (typeof onAwaitApproval !== 'function') return true
      return await onAwaitApproval(payload)
    },
    skills,
    loadedSkillIds: new Set(),
  }
  const skillsAvailable = useSkills && skills.length > 0
  const tools = getAgentToolDefs({ includeImpact: requireImpactApproval, includeSkills: skillsAvailable }).map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))

  const skillsIndex = skillsAvailable ? buildSkillsIndex(skills) : ''
  let fullSystem = AGENT_SYSTEM_PROMPT
  if (extraSystem) {
    fullSystem += `\n\n## Instrucciones específicas del proyecto (AGENTS.md):\n${extraSystem}`
  }
  if (skillsIndex) {
    fullSystem += `\n\n${skillsIndex}`
  }

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
    onLog?.('info', `— Iteración #${iter} (LM Studio) — enviando ${messages.length} mensaje(s)`)

    const body = {
      model,
      messages,
      tools,
      temperature: 0.2,
    }

    onRawRequest?.({
      method: 'POST',
      url: chatUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer lm-studio',
      },
      body,
    })
    onLog?.('send', `POST ${chatUrl} (iter ${iter})`)

    const MAX_ATTEMPTS = 2
    let response, data
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const t0 = performance.now()
      try {
        response = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer lm-studio',
          },
          body: JSON.stringify(body),
        })
      } catch (networkErr) {
        onLog?.('error', `Error de red: ${networkErr.message}`)
        onLog?.('error', `¿Está corriendo el server de LM Studio? Developer → Status: Running. Habilitá CORS en Server Settings si lo bloquea el browser.`)
        throw networkErr
      }
      const elapsed = (performance.now() - t0).toFixed(0)
      onLog?.('info', `HTTP ${response.status} en ${elapsed} ms`)

      data = await response.json().catch(() => ({}))

      if (isModelReloadedError(data) && attempt < MAX_ATTEMPTS) {
        onLog?.('info', `LM Studio recargó el modelo — reintentando iter ${iter} en 1.5s (intento ${attempt}/${MAX_ATTEMPTS})`)
        await wait(1500)
        continue
      }
      break
    }

    onRawResponse?.(data)

    if (!response.ok) {
      const detail = data?.error?.message || data?.error || `HTTP ${response.status}`
      onLog?.('error', `LM Studio rechazó la solicitud: ${detail}`)
      if (isModelReloadedError(data)) {
        onLog?.('error', `Persistió "Model reloaded" tras reintento. Desactivá Auto-Evict en Developer → Idle TTL.`)
      }
      throw new Error(`LM Studio: ${detail}`)
    }

    if (isModelReloadedError(data)) {
      onLog?.('error', `LM Studio devolvió "Model reloaded" incluso con HTTP 200 tras reintento. Desactivá Auto-Evict.`)
      throw new Error('LM Studio: Model reloaded')
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

    messages.push(assistantMsg)

    if (finishReason !== 'tool_calls' || !Array.isArray(assistantMsg.tool_calls) || assistantMsg.tool_calls.length === 0) {
      finalText = (assistantMsg.content || '').trim()
      onStep?.({ n: iter, type: 'final_text', text: finalText })
      onLog?.('success', `Loop terminado en ${iter} iteración(es) — finish_reason=${finishReason}`)
      break
    }

    onLog?.('info', `LM Studio pidió ${assistantMsg.tool_calls.length} tool call(s) en este turno`)

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

      const { result, isError } = await runAgentTool(name, parsed, toolState)
      onStep?.({ n: iter, type: 'tool_result', name, content: result, isError, id: tc.id })
      onLog?.(isError ? 'error' : 'info', `← tool_result (${name}): ${String(result).slice(0, 80)}`)

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
