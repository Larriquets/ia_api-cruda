// Cuerpo del tuto /tutos/memoria — "¿Se acuerda de lo que le digo?".
// ES (base de verdad) y EN. El andamiaje (header, nav, CTAs) vive en Tutos.jsx.

import DemoMemoria from '../recorrido/DemoMemoria.jsx'

export function TutoMemoriaEs() {
  return (
    <>
      <section className="criollo-section">
        <h2>✉️ Cada mensaje es una carta nueva</h2>
        <p>
          Cuando chateás con una IA parece que hay alguien del otro lado siguiendo la
          conversación. No hay. La IA <b>no guarda nada</b> entre un mensaje y el
          siguiente: cada vez que apretás Enviar, recibe una carta que empieza de cero.
        </p>
        <div className="prov-callout">
          <p>
            ¿Y entonces cómo "se acuerda" de que te llamás Ana? Porque la <b>app</b> que
            usás (ChatGPT, Claude, la que sea) mete adentro de esa carta <b>toda la charla
            anterior</b>, cada vez. La memoria no vive en la IA: vive en la app, que
            re-adjunta el historial completo en cada envío.
          </p>
        </div>
        <p>
          Probalo acá abajo: la misma charla de dos mensajes, con la memoria de la app
          apagada y prendida. Mirá qué recibe la IA de verdad en cada caso.
        </p>
        <DemoMemoria />
      </section>

      <section className="criollo-section">
        <h2>🧳 Por qué a veces "se olvida"</h2>
        <p>
          La carta tiene un tamaño máximo. Cuando la charla se hace muy larga, la app
          empieza a <b>recortar</b>: tira los mensajes más viejos para que entre lo nuevo.
          Eso que vos vivís como "se olvidó lo que le dije hace un rato" es literal: ese
          pedazo de la conversación <b>ya no viajó</b> en la última carta.
        </p>
        <p>
          <b>En tu laburo:</b> si algo es importante, repetilo o pegalo de nuevo en el
          mensaje. No es que la IA sea distraída — es que capaz ese dato quedó afuera del
          sobre. Y si la conversación se fue por las ramas, empezar un chat nuevo con un
          buen resumen suele andar mejor que seguir estirando el viejo.
        </p>
      </section>
    </>
  )
}

export function TutoMemoriaEn() {
  return (
    <>
      <section className="criollo-section">
        <h2>✉️ Every message is a brand-new letter</h2>
        <p>
          When you chat with an AI it feels like someone on the other side is following
          the conversation. There isn’t. The AI <b>keeps nothing</b> between one message
          and the next: every time you hit Send, it receives a letter that starts from zero.
        </p>
        <div className="prov-callout">
          <p>
            So how does it "remember" your name is Ana? Because the <b>app</b> you use
            (ChatGPT, Claude, whichever) stuffs <b>the whole previous chat</b> inside that
            letter, every single time. The memory doesn’t live in the AI: it lives in the
            app, which re-attaches the full history on every send.
          </p>
        </div>
        <p>
          Try it below: the same two-message chat, with the app’s memory off and on.
          Look at what the AI actually receives in each case.
        </p>
        <DemoMemoria />
      </section>

      <section className="criollo-section">
        <h2>🧳 Why it sometimes "forgets"</h2>
        <p>
          The letter has a maximum size. When the chat gets long, the app starts
          <b> trimming</b>: it drops the oldest messages so the new ones fit. What you
          experience as "it forgot what I said earlier" is literal: that piece of the
          conversation <b>didn’t travel</b> in the last letter.
        </p>
        <p>
          <b>At work:</b> if something matters, repeat it or paste it again into your
          message. The AI isn’t absent-minded — that fact may simply have missed the
          envelope. And if the chat drifted, starting a fresh one with a good summary
          usually beats stretching the old one.
        </p>
      </section>
    </>
  )
}
