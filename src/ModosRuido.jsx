import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import SpeechReader from './SpeechReader.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/ruido — context rot: la señal enterrada en paja.
 *
 * Animación en 4 pasos, sin API: la misma pregunta con el dato clave en un
 * contexto limpio vs enterrado en logs inflados. Respuestas mockeadas
 * (calcadas del patrón que se ve en el lab /ruido).
 */

const TOTAL_STEPS = 4

export default function ModosRuido() {
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
    L('La pregunta', 'The question'),
    L('Contexto A: limpio', 'Context A: clean'),
    L('Contexto B: el mismo dato, enterrado', 'Context B: same fact, buried'),
    L('Las dos respuestas', 'Both answers'),
  ]

  const question = L('¿A qué hora es la reunión con Legales y en qué sala?', 'What time is the Legal meeting and in which room?')
  const fact = L('Reunión con Legales: jueves 14:30, sala Malbec.', 'Legal meeting: Thursday 14:30, Malbec room.')

  const noiseBefore = L(
    '[10:01:12] INFO sync ok · [10:01:13] INFO cache warm · [10:01:14] WARN retry queue len=3 · [10:01:15] INFO heartbeat · [10:01:17] INFO gc pause 12ms · [10:01:19] INFO sync ok · [10:01:22] WARN slow query 1.2s · [10:01:23] INFO heartbeat ·',
    '[10:01:12] INFO sync ok · [10:01:13] INFO cache warm · [10:01:14] WARN retry queue len=3 · [10:01:15] INFO heartbeat · [10:01:17] INFO gc pause 12ms · [10:01:19] INFO sync ok · [10:01:22] WARN slow query 1.2s · [10:01:23] INFO heartbeat ·',
  )
  const noiseAfter = L(
    '· [10:01:25] INFO heartbeat · [10:01:26] INFO sync ok · [10:01:28] WARN retry queue len=5 · [10:01:30] INFO cache evict 412 keys · [10:01:31] INFO heartbeat · [10:01:33] INFO gc pause 9ms · [10:01:35] INFO sync ok · [10:01:36] INFO heartbeat…',
    '· [10:01:25] INFO heartbeat · [10:01:26] INFO sync ok · [10:01:28] WARN retry queue len=5 · [10:01:30] INFO cache evict 412 keys · [10:01:31] INFO heartbeat · [10:01:33] INFO gc pause 9ms · [10:01:35] INFO sync ok · [10:01:36] INFO heartbeat…',
  )

  const answerClean = L('La reunión con Legales es el jueves a las 14:30 en la sala Malbec.', 'The Legal meeting is Thursday at 14:30 in the Malbec room.')
  const answerNoisy = L('No encuentro el horario exacto; por los registros parece que hubo actividad cerca de las 10:01. ¿Puede ser a las 10?', "I can't find the exact time; judging by the logs there was activity around 10:01. Could it be at 10?")

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/ruido
          <span className="docs-header-subtitle">{L('context rot: la señal enterrada en paja', 'context rot: signal buried in straw')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="demo-ruido" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('Meter MÁS contexto no siempre ayuda: si el dato clave viene rodeado de relleno, el modelo se distrae y falla. Esta demo lo muestra con el mismo dato, limpio y enterrado.', "Stuffing MORE context doesn't always help: if the key fact comes wrapped in filler, the model gets distracted and fails. This demo shows it with the same fact, clean and buried.")}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('Más contexto no es mejor contexto', 'More context is not better context')}</h2>
            <p>
              {L('La intuición dice "dale todo, que ella filtre". La práctica dice otra cosa: la atención del modelo se reparte entre TODO lo que hay en la carta. Cada línea de log inútil compite contra el dato que importa. A ese deterioro le dicen', 'Intuition says "give it everything, let it filter". Practice says otherwise: the model\'s attention is spread across EVERYTHING in the letter. Every useless log line competes against the fact that matters. That decay is called')} <b>context rot</b>.
            </p>
            <div className="prov-callout">
              <p>
                {L('Las respuestas de esta página están', 'The answers on this page are')} <b>{L('mockeadas', 'mocked')}</b> {L('(calcadas del patrón real). Para correr el experimento con un agente de verdad — misma tarea, tool_results limpios vs inflados — andá al lab', '(traced from the real pattern). To run the experiment with a real agent — same task, clean vs bloated tool_results — go to the lab')} <a href="/ruido">/ruido</a>.
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
                  {isDone && L('— comparación completa', '— comparison complete')}
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

            {step >= 1 && (
              <div className="mtk-block">
                <div className="mrg-col-title">1 · {stepNames[0]}</div>
                <div className="recorrido-card recorrido-card-user">
                  <span className="recorrido-card-role">{L('vos', 'you')}</span>
                  <span className="recorrido-card-text">{question}</span>
                </div>
                {step === 1 && (
                  <div className="mch-takeaway">
                    {L('La respuesta correcta existe y va a estar en el contexto en los DOS escenarios. Lo único que va a cambiar es cuánta paja la rodea.', "The right answer exists and will be in the context in BOTH scenarios. The only thing changing is how much straw surrounds it.")}
                  </div>
                )}
              </div>
            )}

            {step >= 2 && (
              <div className="mtk-block">
                <div className="mrg-col-title">2 · {stepNames[1]}</div>
                <div className="recorrido-haystack">
                  <div className="recorrido-haystack-label">✉️ {L('Contexto A — 1 línea, pura señal', 'Context A — 1 line, pure signal')}</div>
                  <div className="recorrido-haystack-body">
                    <span className="recorrido-haystack-needle">{fact}</span>
                  </div>
                </div>
                {step === 2 && (
                  <div className="mch-takeaway">
                    {L('El dato, solo. Cualquier modelo lo encuentra sin despeinarse.', 'The fact, alone. Any model finds it without breaking a sweat.')}
                  </div>
                )}
              </div>
            )}

            {step >= 3 && (
              <div className="mtk-block">
                <div className="mrg-col-title">3 · {stepNames[2]}</div>
                <div className="recorrido-haystack">
                  <div className="recorrido-haystack-label">✉️ {L('Contexto B — el MISMO dato, entre logs', 'Context B — the SAME fact, among logs')}</div>
                  <div className="recorrido-haystack-body">
                    <span className="recorrido-haystack-noise">{noiseBefore}</span>{' '}
                    <span className="recorrido-haystack-needle">{fact}</span>{' '}
                    <span className="recorrido-haystack-noise">{noiseAfter}</span>
                  </div>
                </div>
                {step === 3 && (
                  <div className="mch-takeaway">
                    {L('La aguja sigue ahí (resaltada), pero ahora viaja entre cientos de tokens de heartbeats y syncs que no aportan nada — y cuestan plata.', "The needle is still there (highlighted), but now it travels among hundreds of tokens of heartbeats and syncs that add nothing — and cost money.")}
                  </div>
                )}
              </div>
            )}

            {step >= 4 && (
              <div className="mtk-block">
                <div className="mrg-col-title">4 · {stepNames[3]}</div>
                <div className="recorrido-answer">
                  <div className="recorrido-answer-label">🤖 {L('Con el contexto A (limpio)', 'With context A (clean)')}</div>
                  <div className="recorrido-card recorrido-card-assistant">
                    <span className="recorrido-card-role">IA</span>
                    <span className="recorrido-card-text">{answerClean}</span>
                  </div>
                  <span className="recorrido-bar-flag recorrido-flag-right">✓ {L('exacta', 'exact')}</span>
                </div>
                <div className="recorrido-answer">
                  <div className="recorrido-answer-label">🤖 {L('Con el contexto B (inflado)', 'With context B (bloated)')}</div>
                  <div className="recorrido-card recorrido-card-assistant recorrido-card-bad">
                    <span className="recorrido-card-role">IA</span>
                    <span className="recorrido-card-text">{answerNoisy}</span>
                  </div>
                  <span className="recorrido-bar-flag recorrido-flag-wrong">✗ {L('se distrajo con los timestamps del ruido', 'got distracted by the noise timestamps')}</span>
                </div>
                <div className="mch-takeaway">
                  <b>{L('Mismo modelo, mismo dato.', 'Same model, same fact.')}</b> {L('Lo único que cambió fue la relación señal/ruido de la carta. El contexto no es un baúl: es un escritorio — lo que dejás arriba, molesta.', 'The only change was the letter\'s signal-to-noise ratio. Context is not a trunk: it\'s a desk — whatever you leave on it gets in the way.')}
                </div>
              </div>
            )}

          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('El relleno no es gratis dos veces', 'Filler costs you twice')}</b>: {L('pagás esos tokens Y degradan la respuesta. Peor negocio imposible.', 'you pay for those tokens AND they degrade the answer. Worst deal possible.')}
              </li>
              <li>
                <b>{L('Curar el contexto es trabajo de la app (o tuyo)', "Curating context is the app's job (or yours)")}</b>: {L('filtrar logs, truncar resultados, resumir lo viejo. La IA no separa la paja sola.', 'filter logs, truncate results, summarize old stuff. The AI won\'t sift the straw on its own.')}
              </li>
              <li>
                <b>{L('En agentes es crítico', "In agents it's critical")}</b>: {L('cada tool_result inflado se arrastra por TODOS los pasos siguientes del loop.', 'every bloated tool_result drags through ALL the following steps of the loop.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para correrlo de verdad — la misma tarea agéntica con y sin ruido, y ver al agente marearse en vivo — andá al lab', 'To run it for real — the same agentic task with and without noise, watching the agent get dizzy live — go to the lab')}{' '}
              <a href="/ruido">/ruido</a>. {L('Y para la otra mitad de la historia (pedidos vagos vs precisos),', 'And for the other half of the story (vague vs precise requests),')}{' '}
              <a href="/demo/especificidad">/demo/especificidad</a>.
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
