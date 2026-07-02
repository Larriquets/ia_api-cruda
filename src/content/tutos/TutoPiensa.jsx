// Cuerpo del tuto /tutos/piensa — "¿'Piensa' antes de responder?".
// ES (base de verdad) y EN. El andamiaje (header, nav, CTAs) vive en Tutos.jsx.

import DemoPiensa from './DemoPiensa.jsx'

export function TutoPiensaEs() {
  return (
    <>
      <section className="criollo-section">
        <h2>🧠 El "pensar" es escribir un borrador</h2>
        <p>
          Hay modelos que, antes de contestarte, <b>escriben un borrador para sí
          mismos</b>: plantean el problema, prueban un camino, se corrigen, verifican.
          Recién después redactan la respuesta que ves. No es un cerebro encendiéndose —
          es más texto, generado antes del texto final.
        </p>
        <p>
          La diferencia se nota en las preguntas con trampa. Probá la misma pregunta con
          el borrador apagado y prendido:
        </p>
        <DemoPiensa />
      </section>

      <section className="criollo-section">
        <h2>⏱ Pensar cuesta tiempo y plata</h2>
        <div className="prov-callout">
          <p>
            Ese borrador está hecho de tokens como cualquier otro texto: <b>se cobra y
            tarda</b>. Por eso los modos "razonamiento profundo" son más lentos y más
            caros — no están meditando, están escribiendo (mucho) más.
          </p>
        </div>
        <p>
          <b>En tu laburo:</b> usá el modo que piensa para problemas con trampa, cuentas,
          lógica o decisiones con varios pasos. Para redactar un mail, resumir o
          traducir, el modo común alcanza y sobra — pagar borrador ahí es tirar plata.
        </p>
      </section>
    </>
  )
}

export function TutoPiensaEn() {
  return (
    <>
      <section className="criollo-section">
        <h2>🧠 "Thinking" means writing a draft</h2>
        <p>
          Some models, before answering you, <b>write a draft for themselves</b>: they
          lay out the problem, try a path, correct themselves, verify. Only then do they
          write the answer you see. It’s not a brain switching on — it’s more text,
          generated before the final text.
        </p>
        <p>
          The difference shows on trick questions. Try the same question with the draft
          off and on:
        </p>
        <DemoPiensa />
      </section>

      <section className="criollo-section">
        <h2>⏱ Thinking costs time and money</h2>
        <div className="prov-callout">
          <p>
            That draft is made of tokens like any other text: <b>it’s billed and it
            takes time</b>. That’s why "deep reasoning" modes are slower and pricier —
            they’re not meditating, they’re writing (a lot) more.
          </p>
        </div>
        <p>
          <b>At work:</b> use the thinking mode for trick problems, math, logic or
          multi-step decisions. For drafting an email, summarizing or translating, the
          regular mode is plenty — paying for a draft there is burning money.
        </p>
      </section>
    </>
  )
}
