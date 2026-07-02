import { useState } from 'react'
import { useT } from '../../i18n/useT.js'

// Mini-demo del tuto "¿Cómo hace cosas, además de hablar?" (/tutos/agentes).
// Sin API: un pedido real avanza de a un paso con un botón. La verdad:
// la IA solo escribe texto — cuando "hace" algo, escribió un pedido de
// herramienta y la app fue la que apretó el botón.

export default function DemoAgente() {
  const { lang } = useT()
  const [paso, setPaso] = useState(0)
  const en = lang === 'en'

  const t = {
    head: en ? 'The AI asks, the app does' : 'La IA pide, la app hace',
    tagline: en ? 'watch one request, step by step' : 'mirá un pedido, paso a paso',
    next: en ? 'Next step →' : 'Siguiente paso →',
    again: en ? '↺ Start over' : '↺ De nuevo',
    roleUser: en ? 'you' : 'vos',
    roleApp: 'app',
    stepLabels: [
      en ? 'Step 1 — you ask' : 'Paso 1 — vos pedís',
      en ? 'Step 2 — the AI doesn’t do it: it asks for a tool' : 'Paso 2 — la IA no lo hace: pide una herramienta',
      en ? 'Step 3 — the app runs it and reports back' : 'Paso 3 — la app lo ejecuta y le cuenta',
      en ? 'Step 4 — the AI answers in plain words' : 'Paso 4 — la IA responde en criollo',
    ],
    user: en ? 'Book me a meeting with Ana tomorrow at 10.' : 'Agendame una reunión con Ana mañana a las 10.',
    toolCall: en
      ? '🛠 use tool: calendar.create_event · with: "Ana" · tomorrow 10:00'
      : '🛠 usar herramienta: calendario.crear_evento · con: "Ana" · mañana 10:00',
    toolCallNote: en
      ? 'This is text. The AI didn’t touch any calendar — it wrote a request.'
      : 'Esto es texto. La IA no tocó ningún calendario — escribió un pedido.',
    toolResult: en ? '✅ result: event #482 created, tomorrow 10:00' : '✅ resultado: evento #482 creado, mañana 10:00',
    toolResultNote: en
      ? 'The app (not the AI) ran the real action and mailed the result back.'
      : 'La app (no la IA) ejecutó la acción real y le mandó el resultado por carta.',
    final: en ? 'Done! I booked your meeting with Ana for tomorrow at 10:00.' : '¡Listo! Te agendé la reunión con Ana mañana a las 10:00.',
    moral: en
      ? 'The AI never left the letter: it read, it wrote, and someone else pressed the buttons. That loop — AI asks, app does, AI reads the result — is what people call an “agent”.'
      : 'La IA nunca salió de la carta: leyó, escribió, y los botones los apretó otro. Ese ciclo — la IA pide, la app hace, la IA lee el resultado — es lo que llaman “agente”.',
  }

  return (
    <div className="recorrido-demo">
      <div className="recorrido-demo-head">
        <span className="recorrido-demo-emoji">🤖</span>
        <span className="recorrido-demo-title">{t.head}</span>
        <span className="recorrido-demo-tag">{t.tagline}</span>
      </div>

      <div className="recorrido-envelope">
        <div className="recorrido-envelope-label">{t.stepLabels[Math.min(paso, 3)]}</div>

        <div className="recorrido-card recorrido-card-user">
          <span className="recorrido-card-role">{t.roleUser}</span>
          <span className="recorrido-card-text">{t.user}</span>
        </div>

        {paso >= 1 && (
          <>
            <div className="recorrido-card recorrido-card-system">
              <span className="recorrido-card-role">IA</span>
              <span className="recorrido-card-text">{t.toolCall}</span>
            </div>
            {paso === 1 && <div className="recorrido-demo-tip">{t.toolCallNote}</div>}
          </>
        )}

        {paso >= 2 && (
          <>
            <div className="recorrido-card recorrido-card-system recorrido-card-faint">
              <span className="recorrido-card-role">{t.roleApp}</span>
              <span className="recorrido-card-text">{t.toolResult}</span>
            </div>
            {paso === 2 && <div className="recorrido-demo-tip">{t.toolResultNote}</div>}
          </>
        )}

        {paso >= 3 && (
          <div className="recorrido-card recorrido-card-assistant">
            <span className="recorrido-card-role">IA</span>
            <span className="recorrido-card-text">{t.final}</span>
          </div>
        )}
      </div>

      <div className="recorrido-demo-actions">
        {paso < 3 ? (
          <button type="button" className="recorrido-demo-btn" onClick={() => setPaso((p) => p + 1)}>
            {t.next}
          </button>
        ) : (
          <button type="button" className="recorrido-demo-btn recorrido-demo-btn-ghost" onClick={() => setPaso(0)}>
            {t.again}
          </button>
        )}
      </div>

      {paso >= 3 && <div className="recorrido-demo-moral">{t.moral}</div>}
    </div>
  )
}
