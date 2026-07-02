import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import SpeechReader from './SpeechReader.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/ventana-contexto — por qué la IA "se olvida" en charlas largas.
 *
 * Animación en 4 pasos, sin API: una charla que crece hasta desbordar la
 * ventana, y las dos salidas clásicas — podar (FIFO) o resumir (compaction).
 * Invariante a la vista: el system nunca se poda.
 */

const TOTAL_STEPS = 4

export default function ModosVentana() {
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
    L('La charla entra entera', 'The chat fits whole'),
    L('La charla creció y desborda', 'The chat grew and overflows'),
    L('Salida 1: podar (FIFO)', 'Way out 1: trim (FIFO)'),
    L('Salida 2: resumir (compaction)', 'Way out 2: summarize (compaction)'),
  ]

  const system = { role: 'system', text: L('Sos un asistente de viajes. Respondé corto.', 'You are a travel assistant. Answer briefly.') }
  const msgs = [
    { role: 'user', text: L('Quiero viajar a Bariloche en julio.', 'I want to travel to Bariloche in July.') },
    { role: 'assistant', text: L('¡Buena época! Nieve casi asegurada.', 'Great season! Snow almost guaranteed.') },
    { role: 'user', text: L('Somos 4: dos adultos y dos nenas.', "We're 4: two adults and two girls.") },
    { role: 'assistant', text: L('Anotado: 4 personas, familia.', 'Noted: 4 people, a family.') },
    { role: 'user', text: L('Presupuesto: hasta $2M total.', 'Budget: up to $2M total.') },
    { role: 'assistant', text: L('Con eso hay cabañas y hotel 3★.', 'That buys cabins or a 3★ hotel.') },
    { role: 'user', text: L('¿Y las clases de ski para las nenas?', 'What about ski lessons for the girls?') },
    { role: 'assistant', text: L('Hay escuelita en el Catedral.', "There's a kids' school at Catedral.") },
    { role: 'user', text: L('Dale. ¿Me armás el itinerario final?', 'Cool. Can you build the final itinerary?') },
  ]

  // Ventana chica para que el desborde se vea: system + 5 mensajes.
  const WINDOW = 5
  const overflow = msgs.length - WINDOW // los N más viejos que no entran

  const summary = {
    role: 'system',
    text: L('Resumen: familia de 4 (2 adultos, 2 nenas), Bariloche en julio, presupuesto $2M, quieren clases de ski.', 'Summary: family of 4 (2 adults, 2 girls), Bariloche in July, $2M budget, they want ski lessons.'),
  }

  const card = (m, extra = '') => (
    <div className={`recorrido-card recorrido-card-${m.role === 'assistant' ? 'assistant' : m.role}${extra}`}>
      <span className="recorrido-card-role">{m.role === 'user' ? L('vos', 'you') : m.role === 'assistant' ? 'IA' : 'system'}</span>
      <span className="recorrido-card-text">{m.text}</span>
    </div>
  )

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/ventana-contexto
          <span className="docs-header-subtitle">{L('por qué "se olvida" en charlas largas', 'why it "forgets" in long chats')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="demo-ventana-contexto" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('La carta que viaja a la IA tiene tamaño máximo. Cuando la charla lo pasa, algo tiene que salir del sobre. Esta demo muestra qué sale, con qué estrategia, y qué se pierde en cada caso.', 'The letter traveling to the AI has a max size. When the chat exceeds it, something must leave the envelope. This demo shows what leaves, under which strategy, and what gets lost each way.')}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('El sobre tiene un tamaño máximo', 'The envelope has a maximum size')}</h2>
            <p>
              {L('En cada envío viaja TODA la conversación. Pero la ventana de contexto — el máximo de tokens que el modelo acepta — es finita. Cuando la charla la desborda, la app tiene que decidir', 'Every send carries the WHOLE conversation. But the context window — the max tokens the model accepts — is finite. When the chat overflows it, the app must decide')} <b>{L('qué mensajes sacrificar', 'which messages to sacrifice')}</b>. {L('Y eso que sale del sobre, para la IA, nunca existió.', "And whatever leaves the envelope, for the AI, never existed.")}
            </p>
            <div className="prov-callout">
              <p>
                {L('Acá la ventana está achicada a propósito (system + 5 mensajes) para que el desborde se vea. Para probar FIFO, sliding window y compaction sobre una charla real, andá al lab', 'The window here is shrunk on purpose (system + 5 messages) so the overflow is visible. To try FIFO, sliding window and compaction on a real chat, go to the lab')} <a href="/ventana-contexto">/ventana-contexto</a>.
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
                  {isDone && L('— las dos salidas, comparadas', '— both ways out, compared')}
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
          </section>

          {/* ============== PASOS ============== */}
          <section className="criollo-section">

            {step === 1 && (
              <div className="mtk-block">
                <div className="mrg-col-title">1 · {stepNames[0]}</div>
                <div className="recorrido-envelope">
                  <div className="recorrido-envelope-label">✉️ {L('Ventana: system + 5 mensajes — va todo', 'Window: system + 5 messages — everything fits')}</div>
                  {card(system, ' recorrido-card-pinned')}
                  {msgs.slice(0, 4).map((m, i) => <div key={i}>{card(m)}</div>)}
                </div>
                <div className="mch-takeaway">
                  {L('Charla corta, sobre holgado: la IA ve todo lo que se dijo. Acá "la memoria" funciona perfecto.', 'Short chat, roomy envelope: the AI sees everything said. "Memory" works perfectly here.')}
                </div>
              </div>
            )}

            {step >= 2 && (
              <div className="mtk-block">
                <div className="mrg-col-title">2 · {stepNames[1]}</div>
                <div className="recorrido-envelope">
                  <div className="recorrido-envelope-label">✉️ {L(`La charla llegó a ${msgs.length} mensajes — sobran ${overflow}`, `The chat reached ${msgs.length} messages — ${overflow} don't fit`)}</div>
                  {card(system, ' recorrido-card-pinned')}
                  {msgs.map((m, i) => <div key={i}>{card(m, step >= 2 && i < overflow ? ' recorrido-card-bad' : '')}</div>)}
                </div>
                {step === 2 && (
                  <div className="mch-takeaway">
                    <b>{L('Los rojos no entran.', "The red ones don't fit.")}</b> {L('Algo hay que hacer antes del próximo envío: la API rechaza cartas más grandes que la ventana.', 'Something must be done before the next send: the API rejects letters bigger than the window.')}
                  </div>
                )}
              </div>
            )}

            {step >= 3 && (
              <div className="mtk-block">
                <div className="mrg-col-title">3 · {stepNames[2]}</div>
                <div className="recorrido-envelope">
                  <div className="recorrido-envelope-label">✂️ {L('FIFO: vuelan los más viejos, el system queda fijado', 'FIFO: oldest fly out, system stays pinned')}</div>
                  {card(system, ' recorrido-card-pinned')}
                  {msgs.slice(overflow).map((m, i) => <div key={i}>{card(m)}</div>)}
                </div>
                {step === 3 && (
                  <div className="mch-takeaway">
                    <b>{L('Barato pero brutal:', 'Cheap but brutal:')}</b> {L('se fueron "Bariloche en julio" y "somos 4". Si ahora pedís el itinerario, la IA no sabe ni adónde van ni cuántos son — y capaz lo inventa. El system NUNCA se poda: sin él, la IA olvida hasta quién es.', '"Bariloche in July" and "we\'re 4" are gone. Ask for the itinerary now and the AI knows neither where you\'re going nor how many you are — and it may just make it up. The system message NEVER gets trimmed: without it, the AI forgets even who it is.')}
                  </div>
                )}
              </div>
            )}

            {step >= 4 && (
              <div className="mtk-block">
                <div className="mrg-col-title">4 · {stepNames[3]}</div>
                <div className="recorrido-envelope">
                  <div className="recorrido-envelope-label">🗜 {L('Compaction: lo viejo se convierte en un resumen', 'Compaction: the old part becomes a summary')}</div>
                  {card(system, ' recorrido-card-pinned')}
                  {card(summary, ' recorrido-card-faint')}
                  {msgs.slice(6).map((m, i) => <div key={i}>{card(m)}</div>)}
                </div>
                <div className="mch-takeaway">
                  <b>{L('Más caro pero conserva lo esencial:', 'Pricier but keeps the essentials:')}</b> {L('un modelo resumió los mensajes viejos en una tarjeta chica. El itinerario ahora sale bien… siempre que el resumen no haya perdido el detalle que importaba. Resumir también es apostar.', 'a model summarized the old messages into one small card. The itinerary now comes out right… as long as the summary didn\'t drop the detail that mattered. Summarizing is also a bet.')}
                </div>
              </div>
            )}

          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('"Se olvidó" = quedó fuera del sobre', '"It forgot" = it fell out of the envelope')}</b>. {L('No es mala memoria: ese mensaje literalmente no viajó en el último request.', "It's not bad memory: that message literally didn't travel in the last request.")}
              </li>
              <li>
                <b>{L('El system nunca se poda', 'The system message never gets trimmed')}</b>. {L('Es el único mensaje con asiento fijo: las reglas y la identidad viajan siempre.', "It's the only message with a reserved seat: rules and identity always travel.")}
              </li>
              <li>
                <b>{L('Toda estrategia pierde algo', 'Every strategy loses something')}</b>: {L('FIFO pierde historia, compaction pierde detalle y suma costo. Elegir ventana es elegir qué perder.', 'FIFO loses history, compaction loses detail and adds cost. Choosing a window strategy is choosing what to lose.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para ver la poda pasar en vivo sobre una charla real — con FIFO, sliding window y compaction intercambiables — andá al lab', 'To watch the trimming happen live on a real chat — with FIFO, sliding window and compaction switchable — go to the lab')}{' '}
              <a href="/ventana-contexto">/ventana-contexto</a>. {L('Y para la base de todo esto,', 'And for the foundation of all this,')}{' '}
              <a href="/demo/chat">/demo/chat</a>.
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
