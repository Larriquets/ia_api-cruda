import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/mcp — el protocolo de tools, paso a paso.
 *
 * Animación en 4 pasos, sin API ni server: los mensajes JSON-RPC están
 * mockeados (calcados del intercambio real del lab /mcp contra el server
 * de juguete). El foco: MCP es un enchufe estándar — descubrir tools,
 * pedirlas por JSON y leer el resultado.
 */

const TOTAL_STEPS = 4

export default function ModosMcp() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)

  const [step, setStep] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const autoTimerRef = useRef(null)

  const isDone = step >= TOTAL_STEPS
  const isFresh = step === 0

  const advance = () => {
    if (isDone) return
    setStep((s) => s + 1)
  }

  const reset = () => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = null
    setAutoPlaying(false)
    setStep(0)
  }

  useEffect(() => {
    if (!autoPlaying) return
    if (step >= TOTAL_STEPS) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS))
    }, 2400)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, step])

  const stepNames = [
    L('Conectar (initialize)', 'Connect (initialize)'),
    L('Descubrir las tools (tools/list)', 'Discover the tools (tools/list)'),
    L('Pedir una (tools/call)', 'Call one (tools/call)'),
    L('El resultado vuelve al modelo', 'The result goes back to the model'),
  ]

  // Mensajes JSON-RPC del intercambio, calcados del lab /mcp.
  const exchange = [
    {
      dir: 'out',
      label: `→ ${L('app al server', 'app to server')}`,
      json: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"clientInfo":{"name":"la-ia-cruda"}}}',
      note: L('La app golpea la puerta del server MCP: "hola, hablo JSON-RPC, ¿qué tenés?"', 'The app knocks on the MCP server\'s door: "hi, I speak JSON-RPC, what have you got?"'),
    },
    {
      dir: 'in',
      label: `← ${L('server a la app', 'server to app')}`,
      json: '{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"sumar","description":"Suma dos números","inputSchema":{"a":"number","b":"number"}},{"name":"clima","description":"Clima actual de una ciudad","inputSchema":{"ciudad":"string"}}]}}',
      note: L('El server publica su catálogo: dos tools, cada una con nombre, descripción y qué argumentos espera. Esto es lo que después se le muestra al modelo.', 'The server publishes its catalog: two tools, each with a name, a description and the arguments it expects. This is what gets shown to the model later.'),
    },
    {
      dir: 'out',
      label: `→ ${L('la IA eligió, la app la pide', 'the AI chose, the app calls it')}`,
      json: '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"clima","arguments":{"ciudad":"Buenos Aires"}}}',
      note: L('Ojo al orden: el modelo leyó el catálogo y respondió "usá clima con ciudad=Buenos Aires" — texto. La que manda este JSON al server es la app.', 'Mind the order: the model read the catalog and replied "use clima with ciudad=Buenos Aires" — text. The one sending this JSON to the server is the app.'),
    },
    {
      dir: 'in',
      label: `← ${L('el resultado', 'the result')}`,
      json: '{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"22°C, despejado"}]}}',
      note: L('La app pega este resultado en la conversación y el modelo redacta la respuesta final: "En Buenos Aires hay 22°C y está despejado."', 'The app pastes this result into the conversation and the model writes the final answer: "It\'s 22°C and clear in Buenos Aires."'),
    },
  ]

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/mcp
          <span className="docs-header-subtitle">{L('el protocolo de tools, paso a paso', 'the tool protocol, step by step')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <DocsNav current="demo-mcp" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('MCP es el "USB de las tools": un protocolo estándar para que cualquier IA descubra y use las herramientas de cualquier server. Esta demo muestra el intercambio completo, mensaje por mensaje.', 'MCP is the "USB of tools": a standard protocol so any AI can discover and use any server\'s tools. This demo shows the full exchange, message by message.')}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('Un enchufe estándar para herramientas', 'A standard plug for tools')}</h2>
            <p>
              {L('Sin MCP, cada app inventa su propia forma de conectar la IA con calendarios, bases de datos o APIs. Con MCP, el server publica sus tools en un formato estándar y cualquier cliente las descubre y las llama igual: con', 'Without MCP, every app invents its own way to connect the AI to calendars, databases or APIs. With MCP, the server publishes its tools in a standard format and any client discovers and calls them the same way: with')} <b>JSON-RPC</b> — {L('mensajitos JSON numerados, ida y vuelta.', 'little numbered JSON messages, back and forth.')}
            </p>
            <div className="prov-callout">
              <p>
                {L('Los mensajes de esta página están', 'The messages on this page are')} <b>{L('mockeados', 'mocked')}</b> {L('(calcados del intercambio real contra el server de juguete). Para mandarlos de verdad — con el server corriendo y el JSON crudo a la vista — andá al lab', '(traced from the real exchange against the toy server). To send them for real — with the server running and the raw JSON in sight — go to the lab')} <a href="/mcp">/mcp</a>.
              </p>
            </div>
          </section>

          {/* ============== CONTROLES ============== */}
          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">{L('Paso:', 'Step:')}</span>
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={`mch-progress-dot${step >= n ? ' is-done' : ''}`}>{n}</span>
                ))}
                <span className="mch-progress-meta">
                  {isFresh && L('— todavía no pasó nada', '— nothing happened yet')}
                  {!isFresh && !isDone && `— ${stepNames[step - 1]}`}
                  {isDone && L('— intercambio completo', '— exchange complete')}
                </span>
              </div>
              <div className="mch-buttons">
                <button type="button" className="mch-btn mch-btn-primary" onClick={advance} disabled={isDone || autoPlaying}>
                  ▶ {L('Siguiente paso', 'Next step')}
                </button>
                <button type="button" className="mch-btn" onClick={() => setAutoPlaying((v) => !v)} disabled={isDone}>
                  {autoPlaying ? L('⏸ Pausar', '⏸ Pause') : L('▶▶ Auto', '▶▶ Auto')}
                </button>
                <button type="button" className="mch-btn" onClick={reset} disabled={step === 0 && !autoPlaying}>
                  ↺ {L('Reiniciar', 'Reset')}
                </button>
              </div>
            </div>

            <div className="mch-prompt-preview">
              <span className="mch-prompt-label">{L('Lo que pidió el usuario:', 'What the user asked:')}</span>
              <span className="mch-prompt-text">"{L('¿Qué clima hace en Buenos Aires?', "What's the weather in Buenos Aires?")}"</span>
            </div>
          </section>

          {/* ============== EL INTERCAMBIO ============== */}
          <section className="criollo-section">
            {exchange.map((msg, i) => (
              step >= i + 1 && (
                <div key={i} className="mtk-block">
                  <div className="mrg-col-title">{i + 1} · {stepNames[i]}</div>
                  <div className="mch-payload">
                    <div className="mch-payload-label">{msg.label}</div>
                    <div className="mch-msglist">
                      <div className={`mch-msg ${msg.dir === 'out' ? 'mch-msg-user' : 'mch-msg-system'}${step === i + 1 ? ' mch-msg-new' : ''}`}>
                        <span className={`mch-role ${msg.dir === 'out' ? 'mch-role-user' : 'mch-role-system'}`}>
                          {msg.dir === 'out' ? 'app →' : '← server'}
                        </span>
                        <span className="mch-content mrg-user-content">{msg.json}</span>
                      </div>
                    </div>
                  </div>
                  {step === i + 1 && <div className="mch-takeaway">{msg.note}</div>}
                </div>
              )
            ))}

            {step >= 4 && (
              <div className="mch-reply">
                <div className="mch-reply-label">{L('Respuesta final de la IA:', "AI's final answer:")}</div>
                <div className="mch-reply-text">🤖 {L('En Buenos Aires hay 22°C y está despejado.', "It's 22°C and clear in Buenos Aires.")}</div>
              </div>
            )}
          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('Es todo texto', "It's all text")}</b>: {L('descubrir tools, pedirlas y leer resultados son mensajitos JSON. No hay magia ni conexión especial con el modelo.', 'discovering tools, calling them and reading results are little JSON messages. No magic, no special wire to the model.')}
              </li>
              <li>
                <b>{L('El modelo nunca toca el server', 'The model never touches the server')}</b>: {L('lee el catálogo, elige por escrito, y la app ejecuta. El mismo ciclo agéntico de siempre, con protocolo estándar.', 'it reads the catalog, chooses in writing, and the app executes. The same agentic loop as always, with a standard protocol.')}
              </li>
              <li>
                <b>{L('Estándar = intercambiable', 'Standard = interchangeable')}</b>: {L('el mismo server MCP le sirve a Claude, a un agente tuyo o a cualquier cliente. Escribís la tool una vez.', 'the same MCP server works for Claude, for your own agent, or any client. You write the tool once.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para correr el intercambio de verdad — levantando el server de juguete con', 'To run the exchange for real — spinning up the toy server with')} <code>npm run mcp</code> {L('y disparando cada mensaje vos — andá al lab', 'and firing each message yourself — go to the lab')}{' '}
              <a href="/mcp">/mcp</a>. {L('Y para ver el ciclo agéntico completo,', 'And to see the full agentic loop,')}{' '}
              <a href="/demo/loop">/demo/loop</a>.
            </p>
          </section>

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
          </footer>

        </div>
      </div>
    </div>
  )
}
