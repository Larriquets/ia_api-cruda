import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Demo inline de la parada "Ventana de contexto" del /recorrido.
// Metáfora visual pura, sin API: un escritorio de tamaño fijo. Al sumar
// mensajes, los más viejos caen del borde. El primero (system) queda clavado
// y nunca cae — refleja la regla real: messages[0] system no se poda.

const DESK_SIZE = 5 // cuántas tarjetas entran en el escritorio (incluye el system)

const SAMPLE = [
  { es: 'Acordate: el tono es informal.', en: 'Remember: keep the tone informal.' },
  { es: '¿Me ayudás con un mail?', en: 'Can you help me with an email?' },
  { es: 'Claro, ¿para quién es?', en: 'Sure, who is it for?' },
  { es: 'Para un cliente nuevo.', en: 'For a new client.' },
  { es: 'Dale, tiralo y lo pulimos.', en: 'Go ahead, draft it and we polish it.' },
  { es: 'Mejor agregale los precios.', en: 'Actually, add the prices.' },
  { es: '¿En qué moneda?', en: 'In which currency?' },
  { es: 'En pesos, gracias.', en: 'In pesos, thanks.' },
]

export default function DemoVentana() {
  const { lang } = useT()
  const L = (o) => (lang === 'en' ? o.en : o.es)

  const system = { id: 'sys', role: 'system', text: { es: 'Sos un asistente amable.', en: 'You are a friendly assistant.' } }
  const [msgs, setMsgs] = useState([
    { id: 1, role: 'user', text: SAMPLE[1] },
    { id: 2, role: 'assistant', text: SAMPLE[2] },
  ])

  const addMsg = () => {
    setMsgs((prev) => {
      const next = SAMPLE[(prev.length + 1) % SAMPLE.length]
      const role = prev.length % 2 === 0 ? 'user' : 'assistant'
      return [...prev, { id: Date.now(), role, text: next }]
    })
  }
  const reset = () => setMsgs([
    { id: 1, role: 'user', text: SAMPLE[1] },
    { id: 2, role: 'assistant', text: SAMPLE[2] },
  ])

  const all = [system, ...msgs]
  const onDeskCount = DESK_SIZE
  // El system queda siempre; de los demás, sobreviven los más nuevos.
  const fallen = msgs.length > onDeskCount - 1 ? msgs.slice(0, msgs.length - (onDeskCount - 1)) : []
  const onDesk = [system, ...msgs.slice(fallen.length)]

  const t = {
    head: lang === 'en' ? 'A desk of a fixed size' : 'Un escritorio de tamaño fijo',
    tagline: lang === 'en' ? 'when it fills up, the oldest falls off' : 'cuando se llena, lo más viejo cae',
    add: lang === 'en' ? '➕ Add a message' : '➕ Sumar un mensaje',
    reset: lang === 'en' ? 'Reset' : 'Reiniciar',
    desk: lang === 'en' ? '🖥️ On the desk (what the AI sees)' : '🖥️ En el escritorio (lo que la IA ve)',
    pinned: lang === 'en' ? 'pinned' : 'clavado',
    fallenLabel: lang === 'en' ? '🗑️ Fell off the desk — the AI never saw these' : '🗑️ Cayeron del escritorio — la IA nunca los vio',
    moral: lang === 'en'
      ? 'The first message (the system instruction) is pinned and never falls. Everything else can drop off when the chat grows — that’s why it “forgets” what you said early on.'
      : 'El primer mensaje (la instrucción system) queda clavado y nunca cae. El resto puede caerse cuando la charla crece — por eso “se olvida” lo que dijiste al principio.',
    roleUser: lang === 'en' ? 'you' : 'vos',
    roleAssistant: 'IA',
    roleSystem: 'system',
  }

  const roleLabel = (r) => (r === 'user' ? t.roleUser : r === 'assistant' ? t.roleAssistant : t.roleSystem)

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">🧹</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-demo-actions">
        <button type="button" className="recorrido-demo-btn" onClick={addMsg}>{t.add}</button>
        <button type="button" className="recorrido-demo-btn-ghost" onClick={reset}>{t.reset}</button>
      </div>

      <div className="recorrido-desk">
        <div className="recorrido-desk-label">{t.desk}</div>
        {onDesk.map((m) => (
          <div key={m.id} className={`recorrido-card recorrido-card-${m.role}${m.role === 'system' ? ' recorrido-card-pinned' : ''}`}>
            <span className="recorrido-card-role">{roleLabel(m.role)}</span>
            <span className="recorrido-card-text">{L(m.text)}</span>
            {m.role === 'system' && <span className="recorrido-card-pin">📌 {t.pinned}</span>}
          </div>
        ))}
      </div>

      {fallen.length > 0 && (
        <div className="recorrido-fallen">
          <div className="recorrido-fallen-label">{t.fallenLabel}</div>
          {fallen.map((m) => (
            <div key={m.id} className="recorrido-card recorrido-card-fallen">
              <span className="recorrido-card-role">{roleLabel(m.role)}</span>
              <span className="recorrido-card-text">{L(m.text)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="recorrido-demo-moral">{t.moral}</div>
    </div>
  )
}
