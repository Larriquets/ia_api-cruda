// Cuerpo del tuto /tutos/fuentes — "¿De dónde saca lo que responde?".
// ES (base de verdad) y EN. El andamiaje (header, nav, CTAs) vive en Tutos.jsx.

import DemoFuentes from './DemoFuentes.jsx'

export function TutoFuentesEs() {
  return (
    <>
      <section className="criollo-section">
        <h2>📚 Dos fuentes, y ninguna es "internet en vivo"</h2>
        <p>
          Todo lo que la IA responde sale de dos lugares. Uno: lo que <b>absorbió durante
          su entrenamiento</b> — una foto gigante de textos que quedó congelada en el
          tiempo. Dos: lo que viaja <b>adentro de tu carta</b> — tu pregunta, la charla
          anterior y cualquier material que alguien le haya pegado.
        </p>
        <div className="prov-callout">
          <p>
            Cuando una IA "conoce" los documentos de tu empresa, no es magia ni estudio:
            alguien armó un sistema que <b>busca primero</b> en un archivo los pedacitos
            que más se parecen a tu pregunta, y los <b>pega en la carta</b> antes de
            mandarla. A eso le dicen RAG: buscar antes de preguntar.
          </p>
        </div>
        <p>
          Miralo en cámara lenta: elegí una pregunta y fijate qué fichas del archivo
          viajan pegadas en la carta.
        </p>
        <DemoFuentes />
      </section>

      <section className="criollo-section">
        <h2>🕳 De ahí salen los inventos</h2>
        <p>
          Si la respuesta no está ni en la foto del entrenamiento ni en la carta, la IA
          no dice "no sé" por defecto: <b>completa con lo que suena bien</b>. Una fecha
          plausible, una cita inventada, una cláusula que no existe.
        </p>
        <p>
          <b>En tu laburo:</b> cuando la respuesta depende de un documento concreto,
          asegurate de que ese documento esté en la conversación (pegalo, adjuntalo, o
          usá una herramienta que busque por vos). Y ante un dato verificable — nombre,
          número, fuente — verificalo. La IA redacta bárbaro; como archivo, no es de fiar.
        </p>
      </section>
    </>
  )
}

export function TutoFuentesEn() {
  return (
    <>
      <section className="criollo-section">
        <h2>📚 Two sources, and neither is "live internet"</h2>
        <p>
          Everything the AI answers comes from two places. One: what it <b>absorbed during
          training</b> — a giant snapshot of text, frozen in time. Two: whatever travels
          <b> inside your letter</b> — your question, the previous chat, and any material
          someone pasted in.
        </p>
        <div className="prov-callout">
          <p>
            When an AI "knows" your company documents, it’s not magic or studying:
            someone built a system that <b>searches first</b> through a file for the
            pieces that most resemble your question, and <b>pastes them into the letter</b>
            before sending it. That’s called RAG: retrieve before you ask.
          </p>
        </div>
        <p>
          Watch it in slow motion: pick a question and see which file cards travel
          pasted inside the letter.
        </p>
        <DemoFuentes />
      </section>

      <section className="criollo-section">
        <h2>🕳 That’s where inventions come from</h2>
        <p>
          If the answer is in neither the training snapshot nor the letter, the AI
          doesn’t say "I don’t know" by default: it <b>completes with what sounds right</b>.
          A plausible date, an invented quote, a clause that doesn’t exist.
        </p>
        <p>
          <b>At work:</b> when the answer depends on a specific document, make sure that
          document is in the conversation (paste it, attach it, or use a tool that
          searches for you). And any verifiable fact — a name, a number, a source —
          verify it. The AI writes beautifully; as an archive, it can’t be trusted.
        </p>
      </section>
    </>
  )
}
