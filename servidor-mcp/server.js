/**
 * Servidor MCP de juguete — La IA Cruda
 * =====================================
 *
 * Un servidor MCP (Model Context Protocol) escrito A MANO, sin SDK ni
 * dependencias. La idea es que veas que abajo de tanto nombre fancy hay:
 *
 *   1. Un servidor HTTP común y corriente (transporte "Streamable HTTP").
 *   2. Mensajes JSON-RPC 2.0: { jsonrpc, id, method, params }.
 *   3. Tres métodos que importan: initialize, tools/list y tools/call.
 *
 * Eso es TODO el protocolo (en su versión mínima). Correlo con:
 *
 *   node servidor-mcp/server.js
 *
 * y abrí http://localhost:5173/mcp en la app para inspeccionarlo.
 */

import http from 'node:http'

const PORT = process.env.MCP_PORT || 3100

// Versión del protocolo que soportamos. El cliente propone una en
// `initialize` y el servidor contesta cuál va a usar (negociación).
const PROTOCOL_VERSION = '2025-06-18'

// ---------------------------------------------------------------------------
// Estado del servidor: vive en la MEMORIA de este proceso.
// Si reiniciás el server, las notas desaparecen. Eso es parte de la lección:
// las tools MCP pueden tener estado propio, del lado del SERVIDOR.
// ---------------------------------------------------------------------------
const notas = []

// ---------------------------------------------------------------------------
// Las herramientas. Cada una declara su inputSchema en JSON Schema — el MISMO
// formato que usan OpenAI y Anthropic para sus tool definitions. No es
// casualidad: MCP estandariza justamente eso.
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: 'get_clima',
    description:
      'Devuelve el clima actual de una ciudad (datos falsos pero deterministas: la misma ciudad da siempre lo mismo).',
    inputSchema: {
      type: 'object',
      properties: {
        ciudad: { type: 'string', description: 'Nombre de la ciudad, ej: "Rosario"' },
      },
      required: ['ciudad'],
    },
  },
  {
    name: 'cotizacion_dolar',
    description: 'Devuelve la cotización del dólar (valores falsos, fijos, para la demo).',
    inputSchema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', description: '"oficial" o "blue"', enum: ['oficial', 'blue'] },
      },
      required: ['tipo'],
    },
  },
  {
    name: 'guardar_nota',
    description:
      'Guarda una nota en la memoria del servidor. El estado vive acá, no en el browser ni en el modelo.',
    inputSchema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Contenido de la nota' },
      },
      required: ['texto'],
    },
  },
  {
    name: 'leer_notas',
    description: 'Devuelve todas las notas guardadas en este servidor (se pierden al reiniciarlo).',
    inputSchema: { type: 'object', properties: {} },
  },
]

// Hash mínimo para que el clima falso sea determinista por ciudad.
const hashCiudad = (s) => {
  let h = 0
  for (const ch of s.toLowerCase().trim()) h = (h * 31 + ch.charCodeAt(0)) % 1000
  return h
}

// La implementación real de cada tool. Devuelve un string; el caller lo
// envuelve en el shape `content: [{type:'text', text}]` que pide el protocolo.
function ejecutarTool(name, args = {}) {
  switch (name) {
    case 'get_clima': {
      const ciudad = String(args.ciudad || '').trim()
      if (!ciudad) throw new Error('Falta el parámetro "ciudad"')
      const h = hashCiudad(ciudad)
      const temp = 8 + (h % 28) // 8..35 °C
      const estados = ['despejado', 'parcialmente nublado', 'nublado', 'lluvioso', 'ventoso']
      const estado = estados[h % estados.length]
      return `Clima en ${ciudad}: ${temp}°C, ${estado}, humedad ${40 + (h % 55)}%. (dato falso de demo)`
    }
    case 'cotizacion_dolar': {
      const tipo = args.tipo === 'blue' ? 'blue' : 'oficial'
      const valor = tipo === 'blue' ? 1485 : 1320
      return `Dólar ${tipo}: $${valor} ARS. (valor falso de demo, no salgas a comprar con esto)`
    }
    case 'guardar_nota': {
      const texto = String(args.texto || '').trim()
      if (!texto) throw new Error('Falta el parámetro "texto"')
      notas.push({ id: notas.length + 1, texto, creada: new Date().toISOString() })
      return `Nota #${notas.length} guardada en la memoria del servidor. Total: ${notas.length} nota(s).`
    }
    case 'leer_notas': {
      if (notas.length === 0) return 'No hay notas guardadas. Probá guardar_nota primero.'
      return notas.map((n) => `#${n.id} [${n.creada}] ${n.texto}`).join('\n')
    }
    default:
      // Tool inexistente: error de PROTOCOLO (el cliente pidió algo que no existe).
      return null
  }
}

// ---------------------------------------------------------------------------
// Despacho JSON-RPC: acá está el corazón del "servidor MCP". Tres ifs.
// ---------------------------------------------------------------------------
function atenderMensaje(msg) {
  const { id, method, params = {} } = msg

  // Las NOTIFICACIONES no tienen `id` y no esperan respuesta.
  // El cliente manda `notifications/initialized` al terminar el handshake.
  if (id === undefined) {
    console.log(`  ← notificación: ${method} (no se responde)`)
    return undefined
  }

  if (method === 'initialize') {
    // Handshake: el cliente se presenta y propone una versión del protocolo.
    console.log(`  ← initialize de "${params.clientInfo?.name || '???'}" (propone ${params.protocolVersion})`)
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'servidor-mcp-la-ia-cruda', version: '0.1.0' },
        instructions:
          'Servidor de juguete para la clase. Tiene clima falso, dólar falso y notas en memoria.',
      },
    }
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} }
  }

  if (method === 'tools/list') {
    // Descubrimiento: el cliente pregunta qué tools hay. Acá viajan los
    // inputSchema — esto es lo que después se traduce a tool defs del modelo.
    console.log(`  ← tools/list → devolviendo ${TOOLS.length} tool(s)`)
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params
    console.log(`  ← tools/call: ${name}(${JSON.stringify(args)})`)

    if (!TOOLS.some((t) => t.name === name)) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Tool desconocida: "${name}"` },
      }
    }

    try {
      const texto = ejecutarTool(name, args)
      // Las tools devuelven `content[]` con bloques tipados, igual que los
      // mensajes de Claude. `isError:false` = la ejecución salió bien.
      return {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: texto }], isError: false },
      }
    } catch (err) {
      // Error de EJECUCIÓN (la tool existe pero falló): va en result con
      // isError:true, NO como error JSON-RPC. Así el modelo puede leerlo.
      return {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true },
      }
    }
  }

  // Método que no implementamos (resources/list, prompts/list, etc.)
  console.log(`  ← método no soportado: ${method}`)
  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Método no soportado: "${method}"` },
  }
}

// ---------------------------------------------------------------------------
// Transporte: HTTP pelado. El cliente hace POST /mcp con un mensaje JSON-RPC
// y recibe la respuesta como JSON. CORS abierto porque nos llama un browser.
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id')

  // Preflight del browser (lo manda solo antes del POST cross-origin).
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Probá POST /mcp — es el único endpoint que hay.' }))
    return
  }

  // El transporte Streamable HTTP completo también soporta GET (abre un
  // stream SSE para que el server empuje mensajes). Este server de juguete
  // no lo necesita: solo request/response.
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Solo POST. (El GET/SSE del transporte completo no está implementado acá.)' }))
    return
  }

  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    let msg
    try {
      msg = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }))
      return
    }

    const respuesta = atenderMensaje(msg)

    if (respuesta === undefined) {
      // Notificación: se acepta y listo, sin body (así lo pide la spec).
      res.writeHead(202)
      res.end()
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(respuesta))
  })
})

server.listen(PORT, () => {
  console.log('┌──────────────────────────────────────────────────────┐')
  console.log('│  Servidor MCP de juguete — La IA Cruda               │')
  console.log(`│  Escuchando en  http://localhost:${PORT}/mcp            │`)
  console.log(`│  Protocolo: ${PROTOCOL_VERSION} · Tools: ${TOOLS.length}                    │`)
  console.log('│  Abrí http://localhost:5173/mcp para inspeccionarlo  │')
  console.log('└──────────────────────────────────────────────────────┘')
})
