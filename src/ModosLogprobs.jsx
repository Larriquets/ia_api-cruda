import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import SpeechReader from './SpeechReader.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/logprobs — la IA es un predictor de tokens.
 *
 * Animación en 4 pasos, sin API: las probabilidades están mockeadas
 * (verosímiles, calcadas del espíritu de una corrida real del lab /logprobs).
 * El foco: cada palabra de la respuesta es una lotería pesada, y logprobs
 * es poder ver los números de esa lotería.
 */

const PROMPT_ES = 'El sol sale por el'
const PROMPT_EN = 'The sun rises in the'

const CANDIDATES_ES = [
  { word: ' este', pct: 82 },
  { word: ' oeste', pct: 9 },
  { word: ' horizonte', pct: 6 },
  { word: ' norte', pct: 2 },
  { word: ' techo', pct: 1 },
]
const CANDIDATES_EN = [
  { word: ' east', pct: 82 },
  { word: ' west', pct: 9 },
  { word: ' horizon', pct: 6 },
  { word: ' north', pct: 2 },
  { word: ' roof', pct: 1 },
]

// La frase se completa token a token en el paso 4.
const TAIL_ES = [' este', ' y', ' se', ' pone', ' por', ' el', ' oeste', '.']
const TAIL_EN = [' east', ' and', ' sets', ' in', ' the', ' west', '.']

const TOTAL_STEPS = 4

export default function ModosLogprobs() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)
  const prompt = lang === 'en' ? PROMPT_EN : PROMPT_ES
  const candidates = lang === 'en' ? CANDIDATES_EN : CANDIDATES_ES
  const tail = lang === 'en' ? TAIL_EN : TAIL_ES

  const [step, setStep] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const autoTimerRef = useRef(null)

  // En el paso 4 la cola de la frase aparece de a un token.
  const [tailCount, setTailCount] = useState(0)
  const tailTimerRef = useRef(null)

  const isDone = step >= TOTAL_STEPS
  const isFresh = step === 0

  const advance = () => {
    if (isDone) return
    setStep((s) => s + 1)
  }

  const reset = () => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    if (tailTimerRef.current) clearInterval(tailTimerRef.current)
    autoTimerRef.current = null
    tailTimerRef.current = null
    setAutoPlaying(false)
    setStep(0)
    setTailCount(0)
  }

  useEffect(() => {
    if (!autoPlaying) return
    if (step >= TOTAL_STEPS) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS))
    }, 2200)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, step])

  useEffect(() => {
    if (step < 4) return
    setTailCount(1)
    tailTimerRef.current = setInterval(() => {
      setTailCount((c) => {
        if (c >= tail.length) {
          clearInterval(tailTimerRef.current)
          return c
        }
        return c + 1
      })
    }, 450)
    return () => {
      if (tailTimerRef.current) clearInterval(tailTimerRef.current)
    }
  }, [step, tail.length])

  const stepNames = [
    L('El prompt', 'The prompt'),
    L('Los candidatos y sus chances', 'The candidates and their odds'),
    L('Elegir uno', 'Pick one'),
    L('Repetir hasta terminar', 'Repeat until done'),
  ]

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/logprobs
          <span className="docs-header-subtitle">{L('la IA es un predictor de tokens', 'the AI is a token predictor')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="demo-logprobs" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('La IA no "sabe" la respuesta: calcula qué palabra tiene más chances de venir después, la elige, y vuelve a empezar. Esta demo muestra esa lotería en cámara lenta.', 'The AI doesn\'t "know" the answer: it computes which word is most likely to come next, picks it, and starts over. This demo shows that lottery in slow motion.')}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🎯 {L('No busca la respuesta: adivina la próxima palabra', "It doesn't look up the answer: it guesses the next word")}</h2>
            <p>
              {L('Cada vez que la IA "escribe", lo que pasa por dentro es esto: mira todo el texto hasta ahí y calcula, para cada token de su diccionario, la probabilidad de que sea el siguiente. Después elige uno y', 'Every time the AI "writes", this is what happens inside: it looks at all the text so far and computes, for every token in its dictionary, the probability of it coming next. Then it picks one and')} <b>{L('repite todo el proceso', 'repeats the whole process')}</b>.
            </p>
            <div className="prov-callout">
              <p>
                {L('Las probabilidades de esta página están', 'The probabilities on this page are')} <b>{L('mockeadas', 'mocked')}</b> {L('(verosímiles, sin consumir API). Para ver las probabilidades reales que devuelve OpenAI —token por token, con temperatura ajustable— andá al lab', '(plausible, consuming no API). To see the real probabilities OpenAI returns — token by token, with adjustable temperature — go to the lab')} <a href="/logprobs">/logprobs</a>.
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
                  {isDone && L('— frase completa', '— sentence complete')}
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
                <div className="mrg-col-title">1 · {L('El texto hasta acá', 'The text so far')}</div>
                <div className="mtk-phrase">"{prompt}<span className="mch-cursor">▊</span>"</div>
                {step === 1 && (
                  <div className="mch-takeaway">
                    {L('La IA recibió esto y tiene que producir UN token. No hay plan de la frase entera: solo importa qué viene inmediatamente después.', 'The AI received this and must produce ONE token. There\'s no plan for the whole sentence: all that matters is what comes immediately next.')}
                  </div>
                )}
              </div>
            )}

            {step >= 2 && (
              <div className="mtk-block">
                <div className="mrg-col-title">2 · {L('Las chances de cada candidato', "Each candidate's odds")}</div>
                <div className="rag-rank">
                  {candidates.map((c, i) => (
                    <div key={c.word} className={`rag-rank-row${step >= 3 && i === 0 ? ' rag-rank-in' : ''}`}>
                      <span className="rag-rank-doc"><code>{c.word.replace(' ', '␣')}</code></span>
                      <div className="rag-rank-bar-track">
                        <div className="rag-rank-bar" style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="rag-rank-score">{c.pct}%</span>
                      {step >= 3 && (
                        <span className={`rag-rank-tag${i === 0 ? ' rag-rank-tag-in' : ''}`}>
                          {i === 0 ? L('→ elegido', '→ picked') : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {step === 2 && (
                  <div className="mch-takeaway">
                    {L('Esto es lo que la IA calcula de verdad: una probabilidad para CADA token del diccionario (acá mostramos el top 5). "Logprobs" es pedirle a la API que te muestre estos números.', 'This is what the AI actually computes: a probability for EVERY token in the dictionary (we show the top 5). "Logprobs" means asking the API to show you these numbers.')}
                  </div>
                )}
                {step === 3 && (
                  <div className="mch-takeaway">
                    <b>{L('La temperatura decide cómo se elige.', 'Temperature decides how to pick.')}</b> {L('Con temperatura baja gana casi siempre el favorito; con temperatura alta, la lotería se abre y a veces sale " oeste"… o " techo". Ahí nacen la creatividad Y los disparates.', 'With low temperature the favorite almost always wins; with high temperature the lottery opens up and sometimes " west" comes out… or " roof". That\'s where creativity AND nonsense are born.')}
                  </div>
                )}
              </div>
            )}

            {step >= 4 && (
              <div className="mtk-block">
                <div className="mrg-col-title">4 · {L('Y otra vez, y otra vez…', 'And again, and again…')}</div>
                <div className="mtk-phrase">
                  "{prompt}
                  {tail.slice(0, tailCount).map((w, i) => (
                    <b key={i}>{w}</b>
                  ))}
                  {tailCount < tail.length && <span className="mch-cursor">▊</span>}"
                </div>
                <div className="mch-takeaway">
                  {L('Cada palabra en negrita fue una lotería nueva: el texto crece un token, las probabilidades se recalculan desde cero, se elige, y así hasta el punto final. La IA nunca "supo" la frase completa: la fue adivinando.', 'Every bold word was a fresh lottery: the text grows one token, the probabilities are recomputed from scratch, one is picked, and so on until the final period. The AI never "knew" the full sentence: it guessed its way through it.')}
                </div>
              </div>
            )}

          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('Por eso alucina', "That's why it hallucinates")}</b>: {L('cuando no sabe, no se calla — igual hay un token "más probable", y lo dice con la misma confianza.', 'when it doesn\'t know, it doesn\'t go quiet — there\'s still a "most likely" token, and it says it with the same confidence.')}
              </li>
              <li>
                <b>{L('Por eso la temperatura importa', "That's why temperature matters")}</b>: {L('no cambia lo que la IA "sabe", cambia cuánto se anima a apostar por candidatos improbables.', 'it doesn\'t change what the AI "knows", it changes how much it dares to bet on unlikely candidates.')}
              </li>
              <li>
                <b>{L('Por eso el contexto es todo', "That's why context is everything")}</b>: {L('las probabilidades se calculan mirando el texto previo. Cambiá el prompt y cambia la lotería entera.', 'the probabilities are computed by looking at the prior text. Change the prompt and the whole lottery changes.')}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {L('Para ver los números reales — con tu key, tu prompt y la temperatura que quieras — andá al lab', 'To see the real numbers — with your key, your prompt and any temperature you like — go to the lab')}{' '}
              <a href="/logprobs">/logprobs</a>. {L('Y para ver el texto hecho pedacitos,', 'And to see text chopped into pieces,')}{' '}
              <a href="/demo/tokens">/demo/tokens</a>.
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
