// Cuerpo del tuto /tutos/inventa — "¿Por qué inventa cosas?".
// ES (base de verdad) y EN. El andamiaje (header, nav, CTAs) vive en Tutos.jsx.

import DemoPredictor from '../recorrido/DemoPredictor.jsx'

export function TutoInventaEs() {
  return (
    <>
      <section className="criollo-section">
        <h2>🔮 No busca la verdad: adivina la palabra que sigue</h2>
        <p>
          Cuando la IA te responde no está consultando un archivo de hechos. Está
          jugando, millones de veces por segundo, al mismo juego: <b>adivinar la
          próxima palabra</b> que mejor completa el texto que tiene adelante. Cada
          palabra sale de una lotería de candidatas, cada una con su probabilidad.
        </p>
        <div className="prov-callout">
          <p>
            Ahí está la trampa: la palabra más probable es la que <b>más veces
            apareció</b> en los textos con los que se entrenó — no la que es verdad.
            Si millones de páginas hablan de Sídney como si fuera la capital de
            Australia, "Sídney" gana la lotería. Y la IA lo escribe con la misma
            seguridad con la que te dice que el sol sale por el este.
          </p>
        </div>
        <p>
          Jugalo vos: probá las tres frases de acá abajo, sobre todo la tercera.
          Fijate cómo la opción que "suena" mejor le gana a la correcta.
        </p>
        <DemoPredictor />
      </section>

      <section className="criollo-section">
        <h2>🎭 Por eso suena tan seguro cuando inventa</h2>
        <p>
          A ese fenómeno le dicen <b>alucinación</b>, pero el nombre engaña: no es una
          falla rara que le agarra de vez en cuando. Es el mismo mecanismo de siempre
          — completar con lo que suena bien — aplicado a algo que no sabe. La IA no
          tiene un modo "estoy segura" y un modo "estoy chamuyando": <b>todo le sale
          con el mismo tono</b>, por eso el invento es tan difícil de detectar a ojo.
        </p>
        <p>
          <b>En tu laburo:</b> desconfiá por defecto de todo dato verificable — nombres,
          fechas, números, citas, artículos de ley, links. Que la respuesta esté bien
          redactada no dice nada sobre si es cierta. Y el mejor antídoto es no hacerla
          adivinar: <b>pegale el material</b> del que tiene que salir la respuesta. De
          dónde saca lo que dice — y cómo dárselo vos — es la próxima pregunta:{' '}
          <a href="/tutos/fuentes">¿De dónde saca lo que responde?</a>
        </p>
      </section>
    </>
  )
}

export function TutoInventaEn() {
  return (
    <>
      <section className="criollo-section">
        <h2>🔮 It doesn’t look up the truth: it guesses the next word</h2>
        <p>
          When the AI answers you, it isn’t consulting a file of facts. It’s playing,
          millions of times per second, the same game: <b>guessing the next word</b>
          that best completes the text in front of it. Every word comes out of a
          lottery of candidates, each with its own probability.
        </p>
        <div className="prov-callout">
          <p>
            There’s the trap: the most likely word is the one that <b>appeared most
            often</b> in the texts it was trained on — not the one that’s true. If
            millions of pages talk about Sydney as if it were Australia’s capital,
            "Sydney" wins the lottery. And the AI writes it with the same confidence
            it uses to tell you the sun rises in the east.
          </p>
        </div>
        <p>
          Play it yourself: try the three sentences below, especially the third one.
          Watch the option that "sounds" best beat the correct one.
        </p>
        <DemoPredictor />
      </section>

      <section className="criollo-section">
        <h2>🎭 That’s why it sounds so confident when it makes things up</h2>
        <p>
          People call this <b>hallucination</b>, but the name misleads: it’s not a
          rare glitch that strikes now and then. It’s the same mechanism as always —
          completing with what sounds right — applied to something it doesn’t know.
          The AI has no "I’m sure" mode and no "I’m winging it" mode: <b>everything
          comes out in the same tone</b>, which is why the invention is so hard to
          spot by eye.
        </p>
        <p>
          <b>At work:</b> distrust every verifiable fact by default — names, dates,
          numbers, quotes, legal articles, links. A well-written answer says nothing
          about whether it’s true. And the best antidote is not making it guess:
          <b> paste in the material</b> the answer should come from. Where it gets
          what it says — and how to feed it yourself — is the next question:{' '}
          <a href="/tutos/fuentes">Where does it get its answers from?</a>
        </p>
      </section>
    </>
  )
}
