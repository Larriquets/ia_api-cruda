// Cuerpo del tuto /tutos/agentes — "¿Cómo hace cosas, además de hablar?".
// ES (base de verdad) y EN. El andamiaje (header, nav, CTAs) vive en Tutos.jsx.

import DemoAgente from './DemoAgente.jsx'

export function TutoAgentesEs() {
  return (
    <>
      <section className="criollo-section">
        <h2>🖐 La IA no tiene manos</h2>
        <p>
          Por sí sola, la IA hace una sola cosa: <b>devolver texto</b>. No puede agendar
          reuniones, ni mandar mails, ni tocar un archivo. Cuando ves una IA "haciendo"
          cosas, lo que pasa es otro truco de cartas: la app le presta <b>herramientas</b>,
          y la IA las pide por escrito.
        </p>
        <div className="prov-callout">
          <p>
            El ciclo es siempre el mismo: vos pedís algo → la IA responde con un
            <b> pedido de herramienta</b> (texto con formato) → la app lo ejecuta de
            verdad → le manda el resultado en otra carta → la IA te confirma en criollo.
            A ese ir y venir le dicen <b>agente</b>.
          </p>
        </div>
        <p>
          Miralo paso a paso — apretá el botón y fijate quién hace qué:
        </p>
        <DemoAgente />
      </section>

      <section className="criollo-section">
        <h2>🔒 Por eso importa quién aprieta el botón</h2>
        <p>
          Como la que ejecuta es la app, la app decide <b>qué herramientas le presta</b> y
          cuáles pedidos necesitan tu OK antes de correr. Un agente serio te pregunta
          antes de borrar, pagar o mandar algo irreversible.
        </p>
        <p>
          <b>En tu laburo:</b> cuando evalúes una herramienta "con agentes", preguntá
          exactamente eso: ¿qué puede ejecutar sola y qué me consulta primero? La IA va a
          pedir cosas con total confianza — el freno de mano tiene que estar en la app.
        </p>
      </section>
    </>
  )
}

export function TutoAgentesEn() {
  return (
    <>
      <section className="criollo-section">
        <h2>🖐 The AI has no hands</h2>
        <p>
          On its own, the AI does exactly one thing: <b>return text</b>. It can’t book
          meetings, send emails or touch a file. When you see an AI "doing" things,
          it’s another letter trick: the app lends it <b>tools</b>, and the AI asks for
          them in writing.
        </p>
        <div className="prov-callout">
          <p>
            The loop is always the same: you ask for something → the AI replies with a
            <b> tool request</b> (formatted text) → the app actually runs it → mails the
            result back in another letter → the AI confirms in plain words. That back
            and forth is what people call an <b>agent</b>.
          </p>
        </div>
        <p>
          Watch it step by step — press the button and note who does what:
        </p>
        <DemoAgente />
      </section>

      <section className="criollo-section">
        <h2>🔒 That’s why it matters who presses the button</h2>
        <p>
          Since the app is the one executing, the app decides <b>which tools it lends</b>
          and which requests need your OK before running. A serious agent asks you before
          deleting, paying or sending anything irreversible.
        </p>
        <p>
          <b>At work:</b> when you evaluate an "agentic" tool, ask exactly that: what can
          it run on its own, and what does it check with me first? The AI will request
          things with full confidence — the handbrake has to live in the app.
        </p>
      </section>
    </>
  )
}
