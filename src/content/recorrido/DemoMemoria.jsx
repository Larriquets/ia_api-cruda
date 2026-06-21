import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Demo inline de la parada "Memoria" del /recorrido.
// Sin API: escenario fijo de 2 turnos con un toggle "memoria de la app ON/OFF".
// Muestra el "sobre" que recibe la IA en cada caso y la respuesta resultante.
// La verdad: la memoria vive en la app que re-adjunta el historial, no en la IA.

export default function DemoMemoria() {
  const { lang } = useT()
  const [memoryOn, setMemoryOn] = useState(false)

  const turn1 = { es: 'Me llamo Ana y trabajo en marketing.', en: 'My name is Ana and I work in marketing.' }
  const turn2 = { es: '¿Cómo me llamo?', en: 'What’s my name?' }
  const L = (o) => (lang === 'en' ? o.en : o.es)

  const answerOff = { es: 'No me dijiste tu nombre. ¿Cómo te llamás?', en: 'You didn’t tell me your name. What is it?' }
  const answerOn = { es: 'Te llamás Ana y trabajás en marketing.', en: 'Your name is Ana and you work in marketing.' }

  const t = {
    head: lang === 'en' ? 'The two letters' : 'Las dos cartas',
    tagline: lang === 'en' ? 'the memory lives in the app, not the AI' : 'la memoria vive en la app, no en la IA',
    memory: lang === 'en' ? 'App memory' : 'Memoria de la app',
    off: 'OFF',
    on: 'ON',
    envelope: lang === 'en' ? '✉️ What the AI actually receives' : '✉️ Lo que la IA recibe de verdad',
    onlyLast: lang === 'en' ? '(only your last message)' : '(solo tu último mensaje)',
    withHistory: lang === 'en' ? '(the app re-attached the whole chat)' : '(la app re-adjuntó toda la charla)',
    answer: lang === 'en' ? '🤖 The AI answers' : '🤖 La IA contesta',
    roleUser: lang === 'en' ? 'you' : 'vos',
    moralOff: lang === 'en'
      ? 'With memory OFF, only your last message travels. The AI never saw “Ana” — so it can’t know it. It didn’t forget: it was never told.'
      : 'Con la memoria OFF, solo viaja tu último mensaje. La IA nunca vio “Ana” — no puede saberlo. No se olvidó: nunca se lo dijeron.',
    moralOn: lang === 'en'
      ? 'With memory ON, the app re-attaches the earlier turn. The “memory” is the app re-sending the history every time — the AI itself remembers nothing.'
      : 'Con la memoria ON, la app re-adjunta el turno anterior. La “memoria” es la app reenviando el historial cada vez — la IA en sí no recuerda nada.',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">✉️</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-toggle">
        <span className="recorrido-toggle-label">{t.memory}</span>
        <button
          type="button"
          className={`recorrido-switch${memoryOn ? ' is-on' : ''}`}
          role="switch"
          aria-checked={memoryOn}
          onClick={() => setMemoryOn((v) => !v)}
        >
          <span className="recorrido-switch-off">{t.off}</span>
          <span className="recorrido-switch-knob" />
          <span className="recorrido-switch-on">{t.on}</span>
        </button>
      </div>

      <div className="recorrido-chat-mini">
        <div className="recorrido-card recorrido-card-user">
          <span className="recorrido-card-role">{t.roleUser}</span>
          <span className="recorrido-card-text">{L(turn1)}</span>
        </div>
        <div className="recorrido-card recorrido-card-user">
          <span className="recorrido-card-role">{t.roleUser}</span>
          <span className="recorrido-card-text">{L(turn2)}</span>
        </div>
      </div>

      <div className="recorrido-envelope">
        <div className="recorrido-envelope-label">
          {t.envelope} <span className="recorrido-envelope-sub">{memoryOn ? t.withHistory : t.onlyLast}</span>
        </div>
        {memoryOn && (
          <div className="recorrido-card recorrido-card-user recorrido-card-faint">
            <span className="recorrido-card-role">{t.roleUser}</span>
            <span className="recorrido-card-text">{L(turn1)}</span>
          </div>
        )}
        <div className="recorrido-card recorrido-card-user">
          <span className="recorrido-card-role">{t.roleUser}</span>
          <span className="recorrido-card-text">{L(turn2)}</span>
        </div>
      </div>

      <div className="recorrido-answer">
        <div className="recorrido-answer-label">{t.answer}</div>
        <div className="recorrido-card recorrido-card-assistant">
          <span className="recorrido-card-role">IA</span>
          <span className="recorrido-card-text">{memoryOn ? L(answerOn) : L(answerOff)}</span>
        </div>
      </div>

      <div className="recorrido-demo-moral">{memoryOn ? t.moralOn : t.moralOff}</div>
    </div>
  )
}
