import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Mini-demo del tuto "¿'Piensa' antes de responder?" (/tutos/piensa).
// Sin API: la misma pregunta con trampa, con y sin "borrador previo".
// La verdad: el razonamiento es texto extra que el modelo escribe antes
// de la respuesta — y se cobra como cualquier otro texto.

export default function DemoPiensa() {
  const { lang } = useT()
  const [piensa, setPiensa] = useState(false)
  const en = lang === 'en'

  const t = {
    head: en ? 'The draft before the answer' : 'El borrador antes de la respuesta',
    tagline: en ? '“thinking” is extra text, and it costs' : 'el “pensar” es texto extra, y se cobra',
    toggle: en ? 'Think first' : 'Pensar primero',
    off: 'OFF',
    on: 'ON',
    question: en
      ? 'A notebook and a pen cost $1,100 together. The notebook costs $1,000 more than the pen. How much is the pen?'
      : 'Un cuaderno y una lapicera cuestan $1.100 juntos. El cuaderno cuesta $1.000 más que la lapicera. ¿Cuánto sale la lapicera?',
    draft: en ? '📝 Draft (the model talking to itself)' : '📝 Borrador (el modelo hablando solo)',
    draftText: en
      ? 'If the pen were $100, the notebook would be $1,100 and the total $1,200. Too much. Let me set it up: pen = x, notebook = x + 1,000, so 2x + 1,000 = 1,100 → x = 50. Checking: 50 + 1,050 = 1,100. ✓'
      : 'Si la lapicera saliera $100, el cuaderno saldría $1.100 y el total $1.200. No da. Lo planteo: lapicera = x, cuaderno = x + 1.000, entonces 2x + 1.000 = 1.100 → x = 50. Verifico: 50 + 1.050 = 1.100. ✓',
    answer: en ? '🤖 The AI answers' : '🤖 La IA contesta',
    roleUser: en ? 'you' : 'vos',
    wrong: en ? 'The pen costs $100.' : 'La lapicera sale $100.',
    right: en ? 'The pen costs $50 (and the notebook $1,050).' : 'La lapicera sale $50 (y el cuaderno $1.050).',
    wrongFlag: en ? '✗ wrong: it grabbed the “obvious” continuation' : '✗ mal: agarró la continuación “obvia”',
    rightFlag: en ? '✓ right: the draft caught the trap' : '✓ bien: el borrador agarró la trampa',
    moralOff: en
      ? 'Without a draft, the model completes with whatever sounds right — and $100 sounds right. Fast, cheap, and wrong.'
      : 'Sin borrador, el modelo completa con lo que suena bien — y $100 suena bien. Rápido, barato y mal.',
    moralOn: en
      ? 'With “think first” ON, the model writes a draft before answering. That draft is real text: more wait time and more tokens on your bill. Worth it for traps and math; overkill for “write me an email”.'
      : 'Con “pensar primero” ON, el modelo escribe un borrador antes de responder. Ese borrador es texto real: más espera y más tokens en tu cuenta. Vale la pena para trampas y cuentas; es un exceso para “escribime un mail”.',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">🧠</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-toggle">
        <span className="recorrido-toggle-label">{t.toggle}</span>
        <button
          type="button"
          className={`recorrido-switch${piensa ? ' is-on' : ''}`}
          role="switch"
          aria-checked={piensa}
          onClick={() => setPiensa((v) => !v)}
        >
          <span className="recorrido-switch-off">{t.off}</span>
          <span className="recorrido-switch-knob" />
          <span className="recorrido-switch-on">{t.on}</span>
        </button>
      </div>

      <div className="recorrido-chat-mini">
        <div className="recorrido-card recorrido-card-user">
          <span className="recorrido-card-role">{t.roleUser}</span>
          <span className="recorrido-card-text">{t.question}</span>
        </div>
      </div>

      {piensa && (
        <div className="recorrido-envelope">
          <div className="recorrido-envelope-label">{t.draft}</div>
          <div className="recorrido-card recorrido-card-system recorrido-card-faint">
            <span className="recorrido-card-role">IA</span>
            <span className="recorrido-card-text">{t.draftText}</span>
          </div>
        </div>
      )}

      <div className="recorrido-answer">
        <div className="recorrido-answer-label">{t.answer}</div>
        <div className={`recorrido-card recorrido-card-assistant${piensa ? '' : ' recorrido-card-bad'}`}>
          <span className="recorrido-card-role">IA</span>
          <span className="recorrido-card-text">{piensa ? t.right : t.wrong}</span>
        </div>
        <span className={`recorrido-bar-flag ${piensa ? 'recorrido-flag-right' : 'recorrido-flag-wrong'}`}>
          {piensa ? t.rightFlag : t.wrongFlag}
        </span>
      </div>

      <div className="recorrido-demo-moral">{piensa ? t.moralOn : t.moralOff}</div>
    </div>
  )
}
