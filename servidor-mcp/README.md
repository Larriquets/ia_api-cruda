# Servidor MCP de juguete

Un servidor MCP (Model Context Protocol) escrito a mano en un solo archivo, **sin SDK ni dependencias**, para que veas qué hay abajo del protocolo: un servidor HTTP + mensajes JSON-RPC 2.0.

## Correrlo

```
npm run mcp
```

(o directamente `node servidor-mcp/server.js`). Queda escuchando en `http://localhost:3100/mcp`.

Después abrí **http://localhost:5173/mcp** en la app (con `npm run dev` corriendo) y seguí el ciclo de vida paso a paso: `initialize` → `tools/list` → `tools/call`.

## Qué implementa

| Método JSON-RPC | Qué hace |
|---|---|
| `initialize` | Handshake: negocia versión del protocolo y se presenta |
| `notifications/initialized` | Notificación del cliente (se responde `202` sin body) |
| `tools/list` | Devuelve las tools con su `inputSchema` (JSON Schema) |
| `tools/call` | Ejecuta una tool y devuelve `content[]` |
| `ping` | Devuelve `{}` |

Tools de demo: `get_clima` (falso, determinista), `cotizacion_dolar` (falso), `guardar_nota` / `leer_notas` (estado en memoria del server — se pierde al reiniciar, y esa es la gracia: el estado vive del lado del servidor).

## Probarlo sin la app

```
curl -X POST http://localhost:3100/mcp -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"
```

## Qué NO implementa (a propósito)

- Transporte stdio (el que usan Claude Desktop / Claude Code para servers locales).
- El stream SSE del transporte Streamable HTTP (server → cliente).
- `resources/*`, `prompts/*`, sesiones, auth.

Es la versión mínima que alcanza para entender el protocolo.
