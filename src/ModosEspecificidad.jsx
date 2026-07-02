import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/especificidad — pedido vago vs pedido con criterios explícitos.
 *
 * Animación en 4 pasos, sin API: el mismo modelo recibe dos versiones del
 * mismo pedido y una checklist determinística evalúa ambas salidas.
 * Respuestas mockeadas (calcadas del patrón del lab /especificidad).
 */

const TOTAL_STEPS = 4

export default function ModosEspecificidad() {
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
    L('Los dos pedidos', 'The two requests'),
    L('Salida del pedido vago', "The vague request's output"),
    L('Salida del pedido con criterios', "The criteria request's output"),
    L('La checklist no perdona', "The checklist doesn't forgive"),
  ]

  const vaguePrompt = L('Escribime un aviso sobre el corte de agua.', 'Write me a notice about the water outage.')
  const specificPrompt = L(
    'Escribí un aviso sobre el corte de agua para los vecinos del edificio. Criterios: (1) incluir día y franja horaria: jueves de 9 a 13, (2) máximo 50 palabras, (3) tono cordial, sin tecnicismos, (4) cerrar con el teléfono de administración: 4555-0199.',
    'Write a notice about the water outage for the building\'s residents. Criteria: (1) include day and time range: Thursday 9 to 13, (2) max 50 words, (3) friendly tone, no jargon, (4) close with the building manager\'s phone: 4555-0199.',
  )

  const vagueOutput = L(
    'AVISO IMPORTANTE: Se informa a los usuarios que se realizarán tareas de mantenimiento en la red de distribución hídrica, lo que podría ocasionar interrupciones temporales en el suministro. Rogamos disculpas por las molestias ocasionadas y agradecemos su comprensión. La normalización del servicio se estima dentro de los plazos habituales para este tipo de intervenciones técnicas.',
    'IMPORTANT NOTICE: Users are hereby informed that maintenance work will be performed on the water distribution network, which may cause temporary supply interruptions. We apologize for any inconvenience and appreciate your understanding. Service normalization is estimated within the usual timeframes for this type of technical intervention.',
  )
  const specificOutput = L(
    'Hola vecinos 👋 Este jueves de 9 a 13 no vamos a tener agua por un arreglo en la bomba del edificio. Les recomendamos guardar un poco desde la noche anterior. Cualquier consulta, llamen a administración: 4555-0199. ¡Gracias!',
    'Hi neighbors 👋 This Thursday from 9 to 13 we\'ll have no water due to a repair on the building\'s pump. We suggest storing some the night before. Any questions, call the manager: 4555-0199. Thanks!',
  )

  const checklist = [
    { label: L('¿Dice día y horario? (jueves 9–13)', 'Says day and time? (Thursday 9–13)'), vague: false, specific: true },
    { label: L('¿50 palabras o menos?', '50 words or fewer?'), vague: false, specific: true },
    { label: L('¿Tono cordial, sin tecnicismos?', 'Friendly tone, no jargon?'), vague: false, specific: true },
    { label: L('¿Incluye el teléfono 4555-0199?', 'Includes the phone 4555-0199?'), vague: false, specific: true },
  ]

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/especificidad
          <span className="docs-header-subtitle">{L('pedido vago vs criterios explícitos', 'vague request vs explicit criteria')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <DocsNav current="demo-especificidad" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('Cuando el pedido es vago, la IA no pide aclaraciones: rellena los huecos con lo más genérico que suena bien. Esta demo muestra el mismo pedido, con y sin criterios de éxito.', "When the request is vague, the AI doesn't ask for clarification: it fills the gaps with the most generic thing that sounds right. This demo shows the same request, with and without success criteria.")}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('La IA no adivina lo que no dijiste', "The AI won't guess what you didn't say")}</h2>
            <p>
              {L('Un pedido vago no produce un error: produce texto genérico, correcto en apariencia e inútil en la práctica. La diferencia entre "más o menos" y "exactamente lo que necesitaba" casi nunca está en el modelo — está en si el pedido traía', "A vague request doesn't produce an error: it produces generic text, correct-looking and useless in practice. The difference between \"kind of\" and \"exactly what I needed\" is almost never in the model — it's in whether the request carried")} <b>{L('criterios de éxito verificables', 'verifiable success criteria')}</b>.
            </p>
            <div className="prov-callout">
              <p>
                {L('Las salidas de esta página están', 'The outputs on this page are')} <b>{L('mockeadas', 'mocked')}</b> {L('(calcadas del patrón real). Para correrlo con un agente de verdad y una checklist que verifica cada criterio en el código, andá al lab', '(traced from the real pattern). To run it with a real agent and a checklist verifying each criterion in code, go to the lab')} <a href="/especificidad">/especificidad</a>.
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
                  {isDone && L('— veredicto listo', '— verdict in')}
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
                <div className="recorrido-versus">
                  <div className="recorrido-versus-col recorrido-versus-vague">
                    <div className="recorrido-versus-title">😶 {L('Vago', 'Vague')}</div>
                    <div className="recorrido-versus-prompt">"{vaguePrompt}"</div>
                  </div>
                  <div className="recorrido-versus-col recorrido-versus-specific">
                    <div className="recorrido-versus-title">🎯 {L('Con criterios', 'With criteria')}</div>
                    <div className="recorrido-versus-prompt">"{specificPrompt}"</div>
                  </div>
                </div>
                {step === 1 && (
                  <div className="mch-takeaway">
                    {L('El de la derecha tardó 30 segundos más en escribirse. Fijate cuánto ahorra después.', 'The one on the right took 30 more seconds to write. Watch how much it saves later.')}
                  </div>
                )}
              </div>
            )}

            {step >= 2 && (
              <div className="mtk-block">
                <div className="mrg-col-title">2 · {stepNames[1]}</div>
                <div className="recorrido-card recorrido-card-assistant recorrido-card-bad">
                  <span className="recorrido-card-role">IA</span>
                  <span className="recorrido-card-text">{vagueOutput}</span>
                </div>
                {step === 2 && (
                  <div className="mch-takeaway">
                    {L('Suena a comunicado oficial… y no dice CUÁNDO cortan el agua, ni a quién llamar. Genérico, burocrático, inútil. Y no es culpa del modelo: nadie le dijo qué tenía que tener.', "Sounds like an official statement… and it doesn't say WHEN the water goes out, nor whom to call. Generic, bureaucratic, useless. And it's not the model's fault: nobody told it what it had to contain.")}
                  </div>
                )}
              </div>
            )}

            {step >= 3 && (
              <div className="mtk-block">
                <div className="mrg-col-title">3 · {stepNames[2]}</div>
                <div className="recorrido-card recorrido-card-assistant">
                  <span className="recorrido-card-role">IA</span>
                  <span className="recorrido-card-text">{specificOutput}</span>
                </div>
                {step === 3 && (
                  <div className="mch-takeaway">
                    {L('Mismo modelo, misma temperatura. Día y hora, corto, cordial y con el teléfono. Cada criterio del pedido se convirtió en una decisión que la IA ya no tuvo que adivinar.', 'Same model, same temperature. Day and time, short, friendly, phone included. Each criterion in the request became a decision the AI no longer had to guess.')}
                  </div>
                )}
              </div>
            )}

            {step >= 4 && (
              <div className="mtk-block">
                <div className="mrg-col-title">4 · {stepNames[3]}</div>
                <div className="rag-rank">
                  {checklist.map((c, i) => (
                    <div key={i} className="rag-rank-row">
                      <span className="rag-rank-doc">{c.label}</span>
                      <span className={`recorrido-bar-flag ${c.vague ? 'recorrido-flag-right' : 'recorrido-flag-wrong'}`}>
                        {c.vague ? '✓' : '✗'} {L('vago', 'vague')}
                      </span>
                      <span className={`recorrido-bar-flag ${c.specific ? 'recorrido-flag-right' : 'recorrido-flag-wrong'}`}>
                        {c.specific ? '✓' : '✗'} {L('criterios', 'criteria')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mch-takeaway">
                  <b>{L('0/4 contra 4/4.', '0/4 versus 4/4.')}</b> {L('Lo mejor de los criterios explícitos: se pueden verificar SIN opinar. Esta checklist podría correrla un script — y en el lab, exactamente eso pasa.', 'The best part of explicit criteria: they can be verified WITHOUT opinion. A script could run this checklist — and in the lab, that\'s exactly what happens.')}
                </div>
              </div>
            )}

          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('Vago no da error: da relleno', "Vague doesn't fail loudly: it pads")}</b>. {L('La IA completa los huecos con lo más probable, que casi siempre es lo más genérico.', 'The AI fills the gaps with the most probable thing, which is almost always the most generic.')}
              </li>
              <li>
                <b>{L('Criterio de éxito > adjetivo', 'Success criterion > adjective')}</b>: {L('"cordial y con el teléfono X" se puede chequear; "que quede lindo" no.', '"friendly and with phone X" can be checked; "make it nice" cannot.')}
              </li>
              <li>
                <b>{L('En agentes, esto se multiplica', 'With agents, this compounds')}</b>: {L('un pedido vago a un agente de 10 pasos son 10 oportunidades de desviarse.', 'a vague request to a 10-step agent is 10 chances to drift.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para correrlo con requests reales — mismo agente, dos pedidos, checklist determinística — andá al lab', 'To run it with real requests — same agent, two requests, deterministic checklist — go to the lab')}{' '}
              <a href="/especificidad">/especificidad</a>. {L('Y para la otra mitad (contexto sucio),', 'And for the other half (dirty context),')}{' '}
              <a href="/demo/ruido">/demo/ruido</a>.
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
