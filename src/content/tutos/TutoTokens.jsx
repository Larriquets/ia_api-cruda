// Cuerpo del tuto /tutos/tokens — "¿Qué es un token y por qué te lo cobran?".
// ES (base de verdad) y EN. El andamiaje (header, nav, CTAs) vive en Tutos.jsx.

import DemoTokens from '../recorrido/DemoTokens.jsx'

export function TutoTokensEs() {
  return (
    <>
      <section className="criollo-section">
        <h2>🧩 La IA no lee palabras: lee pedacitos</h2>
        <p>
          Antes de procesar tu texto, la IA lo corta en piezas llamadas <b>tokens</b>.
          Un token es a veces una palabra entera ("hola"), a veces un pedazo
          ("inter-nacional-mente"), a veces un solo signo. La IA nunca ve letras ni
          palabras: ve una fila de esos pedacitos numerados.
        </p>
        <p>
          Escribí algo acá abajo y miralo hecho pedacitos:
        </p>
        <DemoTokens />
      </section>

      <section className="criollo-section">
        <h2>💸 Por qué te lo cobran</h2>
        <div className="prov-callout">
          <p>
            El precio de usar una IA se mide en tokens, <b>ida y vuelta</b>: se cuentan
            los tokens de lo que mandás (incluida toda la charla anterior que la app
            re-adjunta) y los de lo que la IA responde. Más texto viajando = más tokens
            = más plata y más lento.
          </p>
        </div>
        <p>
          <b>En tu laburo:</b> por eso las charlas larguísimas se ponen caras y lentas —
          cada mensaje nuevo re-manda todo lo anterior. Y por eso pegar un documento de
          80 páginas para preguntar una cosita es tirar plata: entra todo en la cuenta,
          lo use o no. Mandá lo que hace falta, no todo lo que tenés.
        </p>
      </section>
    </>
  )
}

export function TutoTokensEn() {
  return (
    <>
      <section className="criollo-section">
        <h2>🧩 The AI doesn’t read words: it reads pieces</h2>
        <p>
          Before processing your text, the AI chops it into pieces called <b>tokens</b>.
          A token is sometimes a whole word ("hello"), sometimes a chunk
          ("inter-nation-ally"), sometimes a single symbol. The AI never sees letters or
          words: it sees a row of those numbered pieces.
        </p>
        <p>
          Type something below and watch it get chopped up:
        </p>
        <DemoTokens />
      </section>

      <section className="criollo-section">
        <h2>💸 Why you get charged for them</h2>
        <div className="prov-callout">
          <p>
            The price of using an AI is measured in tokens, <b>both ways</b>: they count
            the tokens you send (including the whole previous chat the app re-attaches)
            and the tokens the AI answers with. More text traveling = more tokens = more
            money and more waiting.
          </p>
        </div>
        <p>
          <b>At work:</b> that’s why very long chats get slow and expensive — every new
          message re-sends everything before it. And why pasting an 80-page document to
          ask one small thing burns money: all of it goes on the bill, used or not.
          Send what’s needed, not everything you have.
        </p>
      </section>
    </>
  )
}
