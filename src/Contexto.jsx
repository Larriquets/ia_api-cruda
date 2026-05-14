import { useEffect, useState } from 'react'
import DocsNav from './DocsNav.jsx'

const STORAGE_KEY = 'chat_context_snapshot'

export default function Contexto({ onBack }) {
  const [snapshot, setSnapshot] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const readSnapshot = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setSnapshot(JSON.parse(raw))
      } else {
        setSnapshot(null)
      }
    } catch {
      setSnapshot(null)
    }
  }

  useEffect(() => {
    readSnapshot()
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) readSnapshot()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(readSnapshot, 1500)
    return () => clearInterval(id)
  }, [autoRefresh])

  const estimateTokens = (text) => Math.ceil((text || '').length / 4)
  const messages = snapshot?.messages || []
  const totalTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0)
  const updatedAt = snapshot?.updatedAt
    ? new Date(snapshot.updatedAt).toLocaleString('es-AR')
    : null

  return (
    <div className="criollo">
      <header className="header">
        <h1>Contexto acumulado — qué se guardó y cómo</h1>
        <button onClick={onBack} className="clear-btn" type="button">← Volver al chat</button>
      </header>

      <div className="criollo-content">
        <DocsNav current="contexto" />

        <section className="criollo-section">
          <h2>¿Qué es el "contexto"?</h2>
          <p>
            El contexto es <b>la conversación completa que se le manda a OpenAI en cada llamada</b>.
            Como el modelo no tiene memoria entre requests, vos sos quien tiene que recordársela.
          </p>
          <p>
            Cada vez que escribís algo nuevo, la app arma un array <code>messages[]</code> que
            incluye TODO lo anterior + tu mensaje nuevo, y lo manda entero al endpoint.
          </p>
        </section>

        <section className="criollo-section">
          <h2>¿Dónde se guarda?</h2>
          <p>
            En el <b>estado de React</b> (<code>useState</code>), en la variable <code>messages</code>
            del componente <code>App</code>. Es memoria del navegador, en RAM.
          </p>
          <ul>
            <li><b>No se persiste en disco</b> — si recargás la página, se borra y arranca de cero.</li>
            <li><b>No se manda a ningún servidor propio</b> — solo viaja a OpenAI cuando hacés submit.</li>
            <li><b>No es una base de datos</b> — es una lista en memoria, nada más.</li>
          </ul>
        </section>

        <section className="criollo-section">
          <h2>¿Cómo crece?</h2>
          <p>El array empieza con un mensaje <code>system</code> que define la personalidad del asistente:</p>
          <div className="criollo-quote">
            {`[
  { role: "system", content: "Eres un asistente útil..." }
]`}
          </div>
          <p>Cuando escribís algo, se agrega tu mensaje:</p>
          <div className="criollo-quote">
            {`[
  { role: "system", content: "..." },
  { role: "user", content: "Hola" }
]`}
          </div>
          <p>Cuando OpenAI responde, también se guarda la respuesta:</p>
          <div className="criollo-quote">
            {`[
  { role: "system", content: "..." },
  { role: "user", content: "Hola" },
  { role: "assistant", content: "¡Hola! ¿En qué te ayudo?" }
]`}
          </div>
          <p>
            Y así sucesivamente. <b>Cada turno crece de a 2</b> (tu mensaje + la respuesta).
            En el próximo envío se manda TODO lo anterior + el nuevo user message.
          </p>
        </section>

        <section className="criollo-section snapshot-section">
          <div className="snapshot-banner">
            <h2 className="snapshot-title">📸 Foto en vivo del contexto de tu chat</h2>
            <div className="snapshot-controls">
              <span className={`live-dot ${autoRefresh ? 'live-on' : 'live-off'}`}></span>
              <label className="live-label">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>{autoRefresh ? 'Live (1.5s)' : 'Manual'}</span>
              </label>
              <button onClick={readSnapshot} className="clear-btn" type="button">
                ↻ Refrescar
              </button>
            </div>
          </div>

          <p className="snapshot-intro">
            Esta sección es <b>el corazón de la página</b>: muestra exactamente lo que la app está
            guardando en memoria y va a mandarle a OpenAI en el próximo request. Mandá mensajes en
            la otra pestaña y mirá cómo este array crece en vivo.
          </p>

          <div className="snapshot-stats">
            <div className="stat">
              <div className="stat-num">{messages.length}</div>
              <div className="stat-label">mensajes</div>
            </div>
            <div className="stat">
              <div className="stat-num">≈ {totalTokens}</div>
              <div className="stat-label">tokens estimados</div>
            </div>
            <div className="stat">
              <div className="stat-num stat-time">{updatedAt || '—'}</div>
              <div className="stat-label">última actualización</div>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="snapshot-empty">
              <p><b>Todavía no hay nada guardado.</b></p>
              <ol>
                <li>Andá a la pestaña del chat (la que dice "API a la vista — modo Chat")</li>
                <li>Escribí cualquier mensaje y mandalo</li>
                <li>Volvé acá: si tenés "Live" activado, aparece solo</li>
              </ol>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>
                Si seguís sin ver nada, fijate que ambas pestañas estén en
                <code> http://localhost:5173</code> (mismo origen — localStorage no se comparte
                entre orígenes distintos).
              </p>
            </div>
          ) : (
            <>
              <div className="ctx-snapshot">
                {messages.map((m, i) => (
                  <div key={i} className={`ctx-msg ctx-${m.role}`}>
                    <span className="ctx-role">{m.role}</span>
                    <span className="ctx-content">{m.content}</span>
                    <span className="ctx-tokens">≈{estimateTokens(m.content)}t</span>
                  </div>
                ))}
              </div>
              <p className="snapshot-hint">
                💡 El snapshot se guarda en <code>localStorage</code> cada vez que cambia el chat.
                Si tenés "Live" activado se relee cada 1.5s automáticamente.
              </p>
            </>
          )}
        </section>

        <section className="criollo-section">
          <h2>¿Por qué importa el tamaño?</h2>
          <p>
            Cada modelo tiene un <b>límite de contexto</b> medido en tokens. Si te pasás, OpenAI
            te tira error <code>400</code>. Algunos límites comunes:
          </p>
          <ul>
            <li><code>gpt-4o-mini</code> — 128.000 tokens</li>
            <li><code>gpt-4o</code> — 128.000 tokens</li>
            <li><code>gpt-3.5-turbo</code> — 16.385 tokens</li>
          </ul>
          <p>
            Además, <b>te facturan por tokens de input en cada llamada</b>. Si tenés una
            conversación de 50 turnos, en el turno 50 estás pagando los 50 turnos completos
            de input cada vez. Por eso conviene a veces resetear o resumir.
          </p>
        </section>

        <section className="criollo-section">
          <h2>Modo crudo vs. modo conversación</h2>
          <ul>
            <li>
              <b>Modo conversación (default):</b> el array <code>messages</code> crece y se
              manda completo en cada request. El bot tiene contexto.
            </li>
            <li>
              <b>Modo crudo (toggle "API cruda"):</b> se envía solo el mensaje actual,
              el array es siempre de 1 elemento. El bot no recuerda nada.
            </li>
          </ul>
        </section>

        <section className="criollo-section">
          <h2>¿Cómo lo borrás?</h2>
          <ul>
            <li>Botón <b>"Limpiar"</b> arriba a la derecha → resetea el array al estado inicial (solo el system).</li>
            <li><b>F5 / recargar</b> → borra todo (incluso el snapshot guardado).</li>
            <li>Cerrar la pestaña → idem.</li>
          </ul>
        </section>

        <footer className="criollo-footer">
          <button onClick={onBack} className="clear-btn" type="button">← Volver al chat</button>
        </footer>
      </div>
    </div>
  )
}
