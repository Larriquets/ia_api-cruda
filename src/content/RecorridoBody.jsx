// Cuerpo de prosa de /recorrido, en ES (base de verdad) y EN.
// Recorrido guiado para profesionales NO técnicos que ya usan IA en el
// trabajo y quieren intuición sobre por qué falla, alucina o "se olvida".
//
// No es una versión simplificada: es la MISMA verdad de la app, contada con
// metáforas, y cada parada termina con un botón "probalo de verdad" que lleva
// al lab real. El andamiaje (TOC, header) vive en Recorrido.jsx; acá solo el
// contenido. Los `id` de sección son anclas internas: idénticos en ambos
// idiomas.

import DemoPredictor from './recorrido/DemoPredictor.jsx'
import DemoTokens from './recorrido/DemoTokens.jsx'
import DemoMemoria from './recorrido/DemoMemoria.jsx'
import DemoVentana from './recorrido/DemoVentana.jsx'
import DemoPedido from './recorrido/DemoPedido.jsx'
import DemoRuido from './recorrido/DemoRuido.jsx'

export function RecorridoBodyEs() {
  return (
    <div className="docs-main">

      {/* ============== INTRO ============== */}
      <section className="criollo-section" id="intro">
        <h2>🎯 Antes de empezar</h2>
        <p>
          Este recorrido es para vos si usás IA en el laburo —escribís textos, resumís
          documentos, pedís ideas— pero nunca tuviste claro <b>qué pasa del otro lado</b>.
          No vas a tener que programar nada ni entender una línea de código. La idea es que,
          después de estas paradas, entiendas por qué la IA a veces te miente con total
          seguridad, por qué "se olvida" cosas que le dijiste hace dos mensajes, y qué podés
          hacer vos para que falle menos.
        </p>
        <div className="prov-callout">
          <p>
            La trampa mental más común: creer que la IA <b>entiende</b> como una persona. No.
            La IA es un <b>completador de texto carísimo y muy entrenado</b>. Si tenés ese
            modelo en la cabeza, casi todo lo raro que hace deja de ser misterioso.
          </p>
        </div>
        <p>
          Cada parada tiene una explicación corta y un <b>mini-juego acá mismo</b> para verlo
          con tus propios ojos. Un clic y listo: no hace falta instalar nada, ni configurar
          nada, ni programar. Probá, mirá qué pasa, y seguí.
        </p>
      </section>

      {/* ============== PREDICTOR ============== */}
      <section className="criollo-section" id="predictor">
        <h2>🔮 Parada 1 — En el fondo, adivina la próxima palabra</h2>
        <p>
          Imaginate el autocompletado del teléfono, pero millones de veces más entrenado.
          La IA no busca "la respuesta correcta" en ningún lado: arma el texto <b>de a una
          palabra por vez</b>, eligiendo en cada paso la continuación más probable según
          todo lo que leyó durante su entrenamiento.
        </p>
        <div className="prov-callout">
          <p>
            <b>Por eso alucina.</b> Cuando no sabe algo, no se queda callada: igual elige la
            palabra "más plausible". Una cita falsa, un dato inventado o una ley que no existe
            son, para ella, simplemente la continuación que <i>suena</i> bien. No te miente con
            mala intención: te completa el texto.
          </p>
        </div>
        <p>
          <b>En tu trabajo:</b> nunca confíes en un dato concreto (un nombre, una fecha, una
          cifra, una fuente) sin verificarlo. La IA es excelente para redactar y pésima como
          enciclopedia. Cuanto más específico y verificable el dato, más riesgo de invento.
        </p>
        <DemoPredictor />
      </section>

      {/* ============== TOKENS ============== */}
      <section className="criollo-section" id="tokens">
        <h2>🧩 Parada 2 — No lee letras ni palabras: lee pedacitos</h2>
        <p>
          Antes de procesar tu texto, la IA lo corta en piezas llamadas <b>tokens</b>. Un
          token es a veces una palabra entera, a veces un pedazo ("inter-nacional-mente"),
          a veces un signo. La IA solo ve esos pedacitos numerados, nunca las letras de
          adentro.
        </p>
        <div className="prov-callout">
          <p>
            <b>Por eso falla en cosas "obvias".</b> Contar cuántas letras tiene una palabra,
            hacer una cuenta exacta, deletrear al revés, respetar un límite de caracteres:
            todo eso es difícil para algo que no ve letras, ve bloques. No es que sea tonta
            en matemática; es que el material que recibe ya viene troceado.
          </p>
        </div>
        <p>
          <b>En tu trabajo:</b> esto también explica por qué a veces el texto en castellano
          "gasta" más que en inglés (se parte en más pedacitos), y por qué cobran por
          token. Cuando le pidas algo de precisión quirúrgica con caracteres o números,
          revisalo a mano.
        </p>
        <DemoTokens />
      </section>

      {/* ============== MEMORIA ============== */}
      <section className="criollo-section" id="memoria">
        <h2>✉️ Parada 3 — No te recuerda: cada mensaje es una carta nueva</h2>
        <p>
          Esto sorprende a todo el mundo: la IA <b>no tiene memoria propia</b>. Cuando seguís
          una conversación, lo que pasa por detrás es que el programa le reenvía <b>toda la
          charla otra vez, desde el principio</b>, en cada mensaje. Es como si cada vez le
          mandaras una carta nueva que incluye, adjunta, la conversación entera hasta ahí.
        </p>
        <div className="prov-callout">
          <p>
            <b>La "memoria" no vive en la IA, vive en la app que usás.</b> ChatGPT parece
            recordarte porque te re-adjunta el historial cada vez. Si eso no pasara, la IA
            arrancaría de cero en cada mensaje, sin idea de lo que venías hablando.
          </p>
        </div>
        <p>
          <b>En tu trabajo:</b> si abrís una conversación nueva, la IA no sabe nada de la
          anterior. Y si una herramienta "olvida" algo, casi siempre es porque dejó de
          re-adjuntar esa parte (seguí leyendo: la próxima parada explica por qué la deja
          afuera).
        </p>
        <DemoMemoria />
      </section>

      {/* ============== VENTANA ============== */}
      <section className="criollo-section" id="ventana">
        <h2>🧹 Parada 4 — Su escritorio tiene un tamaño fijo</h2>
        <p>
          Esa carta que le reenviás en cada mensaje no puede ser infinita. La IA tiene un
          límite de cuánto texto puede mirar de una sola vez: su <b>ventana de contexto</b>.
          Pensalo como un escritorio chico: entra lo que entra, y cuando se llena, hay que
          sacar papeles para poner otros.
        </p>
        <div className="prov-callout">
          <p>
            <b>Por eso "se olvida" en charlas largas.</b> Cuando la conversación supera el
            tamaño del escritorio, la app empieza a <b>descartar o resumir</b> lo más viejo
            para hacer lugar. La IA no se olvidó: nunca llegó a ver esa parte, porque la
            sacaron antes de mandársela.
          </p>
        </div>
        <p>
          <b>En tu trabajo:</b> en conversaciones largas, lo importante que dijiste al
          principio puede quedar afuera. Si algo es clave (un dato, una regla, un tono),
          repetilo o ponelo de nuevo cerca del final. No asumas que "ya se lo dije".
        </p>
        <DemoVentana />
      </section>

      {/* ============== PEDIDO ============== */}
      <section className="criollo-section" id="pedido">
        <h2>🎯 Parada 5 — Lee tu pedido, no tu mente</h2>
        <p>
          La IA no sabe lo que vos querés "en realidad": sabe lo que <b>escribiste</b>. Todo
          criterio que tengas en la cabeza pero no pongas en el pedido, queda librado al
          azar. Un pedido vago no da una respuesta "promedio": da una respuesta distinta
          cada vez, como una lotería.
        </p>
        <div className="prov-callout">
          <p>
            <b>"Hacelo más profesional" no le dice nada concreto.</b> ¿Más formal? ¿Más
            corto? ¿Sin jerga? ¿Con datos? Si vos no elegís, elige la IA por vos —y cada vez
            puede elegir distinto. Los criterios que no viajan en el pedido, no existen.
          </p>
        </div>
        <p>
          <b>En tu trabajo:</b> meté los criterios de éxito <i>adentro</i> del pedido.
          "Resumilo en 5 viñetas, tono neutro, sin adjetivos, máximo 20 palabras cada una"
          rinde infinitamente más que "resumime esto bien". No es magia: es especificar.
        </p>
        <DemoPedido />
      </section>

      {/* ============== RUIDO ============== */}
      <section className="criollo-section" id="ruido">
        <h2>🗑️ Parada 6 — Basura adentro, basura afuera</h2>
        <p>
          Tentación habitual: pegarle a la IA un documento de 50 páginas "por las dudas",
          para que tenga "todo el contexto". Suele salir mal. Cuanto más relleno irrelevante
          le metés, más le cuesta encontrar lo que importa —igual que a vos te costaría
          contestar una pregunta puntual escondida en un PDF gigante.
        </p>
        <div className="prov-callout">
          <p>
            <b>Más contexto no es mejor contexto.</b> El ruido (texto de relleno, datos que
            no vienen al caso, conversación vieja) <i>diluye</i> la señal y empeora la
            respuesta. La gente lo llama "context rot": el contexto se pudre cuando se llena
            de basura.
          </p>
        </div>
        <p>
          <b>En tu trabajo:</b> dale solo lo que necesita para esta tarea. Si tenés que
          pasarle un documento largo, pegale la sección relevante, no el archivo entero.
          Menos y al punto le gana a mucho y disperso.
        </p>
        <DemoRuido />
      </section>

      {/* ============== LLEVAR ============== */}
      <section className="criollo-section" id="llevar">
        <h2>✅ Qué llevarte</h2>
        <p>Si te quedás con seis ideas, que sean estas:</p>
        <ol>
          <li><b>Es un completador de texto</b>, no un cerebro que entiende. Adivina la continuación más probable.</li>
          <li><b>Alucina con seguridad.</b> Verificá siempre nombres, fechas, cifras y fuentes.</li>
          <li><b>Lee pedacitos, no letras.</b> Desconfiá de su precisión con caracteres y números.</li>
          <li><b>No tiene memoria propia.</b> La "memoria" la pone la app re-adjuntando la charla.</li>
          <li><b>Su escritorio es finito.</b> En charlas largas, repetí lo importante.</li>
          <li><b>Lee tu pedido, no tu mente.</b> Poné los criterios de éxito adentro del pedido, y no lo ahogues en relleno.</li>
        </ol>
        <div className="prov-callout">
          <p>
            Ninguna de estas cosas es un defecto que vayan a "arreglar" pronto: son <b>cómo
            funciona</b> la herramienta. Entenderlas no te hace programador; te hace alguien
            que la usa sin que lo sorprenda.
          </p>
        </div>
        <p>
          ¿Querés ver lo mismo pero del lado técnico, con el JSON real que viaja en cada
          mensaje? Pasate por <a href="/como-funciona" className="criollo-link">/como-funciona</a>.
        </p>
      </section>

    </div>
  )
}

export function RecorridoBodyEn() {
  return (
    <div className="docs-main">

      {/* ============== INTRO ============== */}
      <section className="criollo-section" id="intro">
        <h2>🎯 Before we start</h2>
        <p>
          This tour is for you if you use AI at work —writing copy, summarizing documents,
          brainstorming— but never quite got <b>what happens on the other side</b>. You won't
          have to code anything or read a single line of code. The goal is that, after these
          stops, you understand why AI sometimes lies to you with total confidence, why it
          "forgets" things you said two messages ago, and what <i>you</i> can do to make it
          fail less.
        </p>
        <div className="prov-callout">
          <p>
            The most common mental trap: believing AI <b>understands</b> the way a person
            does. It doesn't. AI is an <b>extremely expensive, very well-trained text
            completer</b>. Hold that model in your head and almost everything weird it does
            stops being a mystery.
          </p>
        </div>
        <p>
          Each stop has a short explanation and a <b>mini-game right here</b> to see it with
          your own eyes. One click and that's it: nothing to install, nothing to configure,
          no coding. Try it, watch what happens, and keep going.
        </p>
      </section>

      {/* ============== PREDICTOR ============== */}
      <section className="criollo-section" id="predictor">
        <h2>🔮 Stop 1 — Deep down, it guesses the next word</h2>
        <p>
          Picture your phone's autocomplete, but trained millions of times harder. AI doesn't
          look up "the right answer" anywhere: it builds text <b>one word at a time</b>,
          picking at each step the most likely continuation based on everything it read during
          training.
        </p>
        <div className="prov-callout">
          <p>
            <b>That's why it hallucinates.</b> When it doesn't know something, it doesn't stay
            quiet: it still picks the "most plausible" word. A fake quote, a made-up figure, a
            law that doesn't exist — to the model, those are simply the continuation that
            <i>sounds</i> right. It's not lying out of malice: it's completing your text.
          </p>
        </div>
        <p>
          <b>At work:</b> never trust a concrete fact (a name, a date, a number, a source)
          without checking it. AI is excellent at drafting and terrible as an encyclopedia.
          The more specific and verifiable the fact, the higher the risk it's invented.
        </p>
        <DemoPredictor />
      </section>

      {/* ============== TOKENS ============== */}
      <section className="criollo-section" id="tokens">
        <h2>🧩 Stop 2 — It doesn't read letters or words: it reads chunks</h2>
        <p>
          Before processing your text, AI cuts it into pieces called <b>tokens</b>. A token is
          sometimes a whole word, sometimes a fragment ("inter-nation-ally"), sometimes a
          punctuation mark. The AI only sees those numbered chunks, never the letters inside.
        </p>
        <div className="prov-callout">
          <p>
            <b>That's why it fails at "obvious" things.</b> Counting how many letters a word
            has, doing exact arithmetic, spelling backwards, respecting a character limit: all
            hard for something that doesn't see letters, it sees blocks. It's not bad at math;
            it's that the material it gets is already chopped up.
          </p>
        </div>
        <p>
          <b>At work:</b> this also explains why some languages "cost" more than English (they
          split into more chunks), and why you're billed per token. When you need surgical
          precision with characters or numbers, check it by hand.
        </p>
        <DemoTokens />
      </section>

      {/* ============== MEMORIA ============== */}
      <section className="criollo-section" id="memoria">
        <h2>✉️ Stop 3 — It doesn't remember you: every message is a fresh letter</h2>
        <p>
          This surprises everyone: AI <b>has no memory of its own</b>. When you continue a
          conversation, what happens behind the scenes is that the program re-sends the
          <b> whole chat again, from the start</b>, on every message. It's as if each time you
          mailed it a new letter that includes, attached, the entire conversation so far.
        </p>
        <div className="prov-callout">
          <p>
            <b>The "memory" doesn't live in the AI, it lives in the app you use.</b> ChatGPT
            seems to remember you because it re-attaches the history each time. If that didn't
            happen, the AI would start from scratch on every message, with no idea what you'd
            been talking about.
          </p>
        </div>
        <p>
          <b>At work:</b> if you open a new conversation, the AI knows nothing about the
          previous one. And when a tool "forgets" something, it's almost always because it
          stopped re-attaching that part (keep reading: the next stop explains why it leaves
          things out).
        </p>
        <DemoMemoria />
      </section>

      {/* ============== VENTANA ============== */}
      <section className="criollo-section" id="ventana">
        <h2>🧹 Stop 4 — Its desk is a fixed size</h2>
        <p>
          That letter you re-send on every message can't be infinite. AI has a limit on how
          much text it can look at in one go: its <b>context window</b>. Think of it as a small
          desk: only so much fits, and when it's full, you have to take papers off to put
          others on.
        </p>
        <div className="prov-callout">
          <p>
            <b>That's why it "forgets" in long chats.</b> When the conversation outgrows the
            desk, the app starts <b>dropping or summarizing</b> the oldest parts to make room.
            The AI didn't forget: it never saw that part, because it was removed before being
            sent.
          </p>
        </div>
        <p>
          <b>At work:</b> in long conversations, the important thing you said at the start can
          fall off. If something is key (a fact, a rule, a tone), repeat it or restate it near
          the end. Don't assume "I already told it."
        </p>
        <DemoVentana />
      </section>

      {/* ============== PEDIDO ============== */}
      <section className="criollo-section" id="pedido">
        <h2>🎯 Stop 5 — It reads your request, not your mind</h2>
        <p>
          AI doesn't know what you "really" want: it knows what you <b>wrote</b>. Every
          criterion you hold in your head but don't put in the request is left to chance. A
          vague request doesn't give you an "average" answer: it gives a different answer each
          time, like a lottery.
        </p>
        <div className="prov-callout">
          <p>
            <b>"Make it more professional" tells it nothing concrete.</b> More formal? Shorter?
            No jargon? With data? If you don't choose, the AI chooses for you —and it may
            choose differently each time. Criteria that don't travel in the request don't
            exist.
          </p>
        </div>
        <p>
          <b>At work:</b> put the success criteria <i>inside</i> the request. "Summarize it in
          5 bullets, neutral tone, no adjectives, max 20 words each" beats "summarize this
          well" by a mile. It's not magic: it's being specific.
        </p>
        <DemoPedido />
      </section>

      {/* ============== RUIDO ============== */}
      <section className="criollo-section" id="ruido">
        <h2>🗑️ Stop 6 — Garbage in, garbage out</h2>
        <p>
          A common temptation: dump a 50-page document on the AI "just in case", so it has
          "all the context". It usually backfires. The more irrelevant filler you give it, the
          harder it is for it to find what matters —just as it would be hard for you to answer
          a specific question buried in a giant PDF.
        </p>
        <div className="prov-callout">
          <p>
            <b>More context isn't better context.</b> Noise (filler text, beside-the-point
            data, old conversation) <i>dilutes</i> the signal and worsens the answer. People
            call it "context rot": context rots when it fills up with garbage.
          </p>
        </div>
        <p>
          <b>At work:</b> give it only what it needs for this task. If you have to hand it a
          long document, paste the relevant section, not the whole file. Less and to the point
          beats lots and scattered.
        </p>
        <DemoRuido />
      </section>

      {/* ============== LLEVAR ============== */}
      <section className="criollo-section" id="llevar">
        <h2>✅ What to take away</h2>
        <p>If you keep six ideas, make them these:</p>
        <ol>
          <li><b>It's a text completer</b>, not a brain that understands. It guesses the most likely continuation.</li>
          <li><b>It hallucinates confidently.</b> Always verify names, dates, figures and sources.</li>
          <li><b>It reads chunks, not letters.</b> Distrust its precision with characters and numbers.</li>
          <li><b>It has no memory of its own.</b> The "memory" is the app re-attaching the chat.</li>
          <li><b>Its desk is finite.</b> In long chats, repeat what matters.</li>
          <li><b>It reads your request, not your mind.</b> Put the success criteria in the request, and don't drown it in filler.</li>
        </ol>
        <div className="prov-callout">
          <p>
            None of this is a flaw they'll "fix" soon: it's <b>how the tool works</b>.
            Understanding it doesn't make you a programmer; it makes you someone who uses it
            without being caught off guard.
          </p>
        </div>
        <p>
          Want to see the same thing from the technical side, with the real JSON that travels
          on every message? Head to <a href="/como-funciona" className="criollo-link">/how-it-works</a>.
        </p>
      </section>

    </div>
  )
}
