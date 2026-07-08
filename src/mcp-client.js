/**
 * Cliente MCP mínimo — habla JSON-RPC 2.0 sobre HTTP con un servidor MCP.
 *
 * Punto pedagógico central: este cliente NO habla con ningún modelo de IA.
 * MCP es una conversación browser ↔ servidor de tools. El modelo, si aparece,
 * aparece después: el CLIENTE le presenta las tools descubiertas acá y el
 * CLIENTE ejecuta los tools/call cuando el modelo los pide.
 *
 * No hay API key: el server de juguete es local y sin auth. En servers MCP
 * remotos reales esto se resuelve con OAuth — la mecánica JSON-RPC es igual.
 *
 * Mismo contrato de hooks de debug que el resto de los wrappers de la app:
 * { onLog, onRawRequest, onRawResponse }.
 */

export const MCP_PROTOCOL_VERSION = '2025-06-18'
export const DEFAULT_MCP_HOST = 'http://localhost:3100/mcp'

// JSON-RPC exige un `id` único por request para correlacionar la respuesta.
// Con HTTP request/response parece redundante (la respuesta viene en el mismo
// round-trip), pero el protocolo soporta transportes donde no lo es (stdio, SSE).
let nextId = 1

/**
 * Manda UN mensaje JSON-RPC al servidor y devuelve el `result`.
 * Si `notification` es true no se manda `id` y no se espera respuesta.
 */
async function rpc(host, method, params, { onLog, onRawRequest, onRawResponse } = {}, { notification = false } = {}) {
  const body = { jsonrpc: '2.0' }
  if (!notification) body.id = nextId++
  body.method = method
  if (params !== undefined) body.params = params

  onRawRequest?.({
    method: 'POST',
    url: host,
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  onLog?.('send', `POST ${host} → ${method}${notification ? ' (notificación, sin id)' : ` (id ${body.id})`}`)

  const startedAt = performance.now()
  let response
  try {
    response = await fetch(host, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    onLog?.('error', `No se pudo conectar a ${host} — ¿está corriendo el server? Probá: node servidor-mcp/server.js`)
    throw new Error(`No hay servidor MCP en ${host}. Arrancalo con "npm run mcp" y reintentá.`)
  }

  const elapsed = (performance.now() - startedAt).toFixed(0)
  onLog?.('info', `HTTP ${response.status} en ${elapsed} ms`)

  if (notification) {
    // La spec pide 202 Accepted sin body para las notificaciones.
    onRawResponse?.({ '//': `HTTP ${response.status} sin body — las notificaciones JSON-RPC no llevan respuesta` })
    return undefined
  }

  const data = await response.json().catch(() => ({}))
  onRawResponse?.(data)

  if (data.error) {
    onLog?.('error', `El servidor devolvió error JSON-RPC ${data.error.code}: ${data.error.message}`)
    throw new Error(`MCP: ${data.error.message}`)
  }
  if (!response.ok) {
    onLog?.('error', `HTTP ${response.status}`)
    throw new Error(`MCP: HTTP ${response.status}`)
  }

  return data.result
}

/**
 * Paso 1 del ciclo de vida: handshake.
 * Cliente y servidor negocian versión del protocolo e intercambian
 * capacidades. Después el cliente confirma con `notifications/initialized`.
 */
export async function mcpInitialize(host, hooks = {}) {
  const { onLog } = hooks
  onLog?.('info', 'Iniciando handshake MCP — el cliente se presenta y propone una versión del protocolo')

  const result = await rpc(host, 'initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'la-ia-cruda-browser', version: '0.1.0' },
  }, hooks)

  onLog?.('success', `Servidor: "${result.serverInfo?.name}" v${result.serverInfo?.version} · protocolo ${result.protocolVersion}`)
  if (result.capabilities?.tools) {
    onLog?.('info', 'El servidor declara capability "tools" — podemos pedir tools/list')
  }

  // El handshake se cierra con una notificación (sin id, sin respuesta).
  await rpc(host, 'notifications/initialized', undefined, hooks, { notification: true })
  onLog?.('info', 'Notificación initialized enviada — handshake completo')

  return result
}

/**
 * Paso 2: descubrimiento. El servidor lista sus tools con `inputSchema`
 * (JSON Schema — el mismo formato de las tool defs de OpenAI/Anthropic).
 */
export async function mcpListTools(host, hooks = {}) {
  const { onLog } = hooks
  const result = await rpc(host, 'tools/list', undefined, hooks)
  const tools = result.tools || []
  onLog?.('success', `El servidor expone ${tools.length} tool(s): ${tools.map((t) => t.name).join(', ')}`)
  return tools
}

/**
 * Paso 3: invocación. Devuelve shape plano para que la UI no parsee:
 * { text, isError, content }.
 */
export async function mcpCallTool(host, name, args, hooks = {}) {
  const { onLog } = hooks
  onLog?.('info', `Invocando tool "${name}" con argumentos ${JSON.stringify(args)}`)

  const result = await rpc(host, 'tools/call', { name, arguments: args }, hooks)

  const content = result.content || []
  const text = content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')

  if (result.isError) {
    onLog?.('error', `La tool falló (isError:true): ${text}`)
  } else {
    onLog?.('success', `Tool "${name}" ejecutada OK (${text.length} caracteres)`)
  }

  return { text, isError: Boolean(result.isError), content }
}
