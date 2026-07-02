import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Mini-demo del tuto "¿Cómo se le dan reglas que respete?" (/tutos/reglas).
// Sin API: el mismo pedido con y sin reglas fijas al principio de la carta.
// La verdad: la regla vale porque viaja SIEMPRE, adelante de todo — no
// porque la IA la haya "aprendido".

export default function DemoReglas() {
  const { lang } = useT()
  const [reglasOn, setReglasOn] = useState(false)
  const en = lang === 'en'

  const t = {
    head: en ? 'The rules travel in the letter' : 'Las reglas viajan en la carta',
    tagline: en ? 'pinned first, sent every time' : 'fijadas al principio, van siempre',
    toggle: en ? 'Company rules' : 'Reglas de la empresa',
    off: 'OFF',
    on: 'ON',
    rules: en
      ? '📌 Rules: never promise discounts. Formal tone. Sign as “Team Nube”.'
      : '📌 Reglas: nunca prometer descuentos. Tono formal. Firmar como “Equipo Nube”.',
    envelope: en ? '✉️ What the AI receives' : '✉️ Lo que la IA recibe',
    answer: en ? '🤖 The AI answers' : '🤖 La IA contesta',
    roleUser: en ? 'you' : 'vos',
    roleRules: en ? 'rules' : 'reglas',
    user: en
      ? 'Write to the client: their order is arriving two days late.'
      : 'Escribile al cliente: su pedido llega dos días tarde.',
    answerOff: en
      ? 'Hey! So sorry 😅 your order slipped two days. To make it up we’ll give you a 20% discount on your next purchase!'
      : '¡Hola! Mil perdones 😅 tu pedido se atrasó dos días. ¡Para compensarte te vamos a hacer un 20% de descuento en la próxima compra!',
    answerOn: en
      ? 'Dear customer: we write to inform you that your order will arrive two days later than planned. We apologize for the inconvenience. — Team Nube'
      : 'Estimado cliente: le escribimos para informarle que su pedido llegará dos días más tarde de lo previsto. Le pedimos disculpas por el inconveniente. — Equipo Nube',
    flagOff: en ? '✗ invented a discount nobody authorized' : '✗ inventó un descuento que nadie autorizó',
    flagOn: en ? '✓ formal, no discount, signed right' : '✓ formal, sin descuento, firma correcta',
    moralOff: en
      ? 'With no rules in the letter, the AI improvises the tone and — worse — commits your company to a discount. It’s not malice: nobody told it what it can’t do.'
      : 'Sin reglas en la carta, la IA improvisa el tono y — peor — compromete a tu empresa con un descuento. No es maldad: nadie le dijo qué no puede hacer.',
    moralOn: en
      ? 'With rules ON, the same request comes out formal, discount-free and signed. The trick: the rules ride at the top of EVERY letter. Remove them from one message and they stop existing.'
      : 'Con las reglas ON, el mismo pedido sale formal, sin descuento y firmado. El truco: las reglas viajan arriba de CADA carta. Sacalas de un mensaje y dejan de existir.',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">📌</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-toggle">
        <span className="recorrido-toggle-label">{t.toggle}</span>
        <button
          type="button"
          className={`recorrido-switch${reglasOn ? ' is-on' : ''}`}
          role="switch"
          aria-checked={reglasOn}
          onClick={() => setReglasOn((v) => !v)}
        >
          <span className="recorrido-switch-off">{t.off}</span>
          <span className="recorrido-switch-knob" />
          <span className="recorrido-switch-on">{t.on}</span>
        </button>
      </div>

      <div className="recorrido-envelope">
        <div className="recorrido-envelope-label">{t.envelope}</div>
        {reglasOn && (
          <div className="recorrido-card recorrido-card-system recorrido-card-pinned">
            <span className="recorrido-card-role">{t.roleRules}</span>
            <span className="recorrido-card-text">{t.rules}</span>
          </div>
        )}
        <div className="recorrido-card recorrido-card-user">
          <span className="recorrido-card-role">{t.roleUser}</span>
          <span className="recorrido-card-text">{t.user}</span>
        </div>
      </div>

      <div className="recorrido-answer">
        <div className="recorrido-answer-label">{t.answer}</div>
        <div className={`recorrido-card recorrido-card-assistant${reglasOn ? '' : ' recorrido-card-bad'}`}>
          <span className="recorrido-card-role">IA</span>
          <span className="recorrido-card-text">{reglasOn ? t.answerOn : t.answerOff}</span>
        </div>
        <span className={`recorrido-bar-flag ${reglasOn ? 'recorrido-flag-right' : 'recorrido-flag-wrong'}`}>
          {reglasOn ? t.flagOn : t.flagOff}
        </span>
      </div>

      <div className="recorrido-demo-moral">{reglasOn ? t.moralOn : t.moralOff}</div>
    </div>
  )
}
