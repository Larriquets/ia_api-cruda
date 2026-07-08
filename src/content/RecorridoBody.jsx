// Cuerpo de prosa de /recorrido, en ES (base de verdad) y EN.
// Recorrido guiado para profesionales NO técnicos que ya usan IA en el
// trabajo y quieren intuición sobre por qué falla, alucina o "se olvida".
//
// No es una versión simplificada: es la MISMA verdad de la app, contada con
// metáforas, y cada parada termina con una escalera de dos escalones (misma
// que los tutos): la demo animada sin API y el lab real. El andamiaje (TOC,
// header) vive en Recorrido.jsx; acá solo el contenido. Los `id` de sección
// son anclas internas: idénticos en ambos idiomas.

import { useT } from '../i18n/useT.js'
import DemoPredictor from './recorrido/DemoPredictor.jsx'
import DemoTemperatura from './recorrido/DemoTemperatura.jsx'
import DemoTokens from './recorrido/DemoTokens.jsx'
import DemoMemoria from './recorrido/DemoMemoria.jsx'
import DemoVentana from './recorrido/DemoVentana.jsx'
import DemoPedido from './recorrido/DemoPedido.jsx'
import DemoRuido from './recorrido/DemoRuido.jsx'

// Escalera al pie de cada parada: demo animada (sin API) + lab real.
// Mismo lenguaje visual que la escalera de los tutos (.tuto-next-links).
function ParadaCTA({ demoHref, labHref }) {
  const { t } = useT()
  return (
    <div className="tuto-next-links recorrido-cta" role="complementary" aria-label={t('recorrido.ctaAria')}>
      <a href={demoHref} className="try-mode-cta-btn">
        <span className="try-mode-cta-emoji">🎬</span>
        <span>{t('recorrido.ctaDemo')}</span>
        <span className="try-mode-cta-arrow">→</span>
      </a>
      <a href={labHref} className="try-mode-cta-btn">
        <span className="try-mode-cta-emoji">🔬</span>
        <span>{t('recorrido.ctaLab')}</span>
        <span className="try-mode-cta-arrow">→</span>
      </a>
    </div>
  )
}

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
          Un buen antídoto: pasale vos el material y pedile que trabaje solo sobre eso — de
          eso hablamos en <a href="/tutos/fuentes" className="criollo-link">¿de dónde saca lo
          que responde?</a>
        </p>
        <DemoPredictor />
        <ParadaCTA demoHref="/demo/logprobs" labHref="/logprobs" />
      </section>

      {/* ============== TEMPERATURA ============== */}
      <section className="criollo-section" id="temperatura">
        <h2>🎲 Parada 2 — ¿Por qué responde distinto cada vez?</h2>
        <p>
          En la parada anterior viste que la IA elige la próxima palabra por probabilidad.
          Ahora el detalle que nadie te cuenta: <b>no siempre elige la más probable</b>.
          Tira una lotería donde las palabras probables tienen más números, y esa lotería
          tiene una perilla: la <b>temperatura</b>. Fría, gana siempre la favorita. Caliente,
          las de abajo también tienen chance.
        </p>
        <div className="prov-callout">
          <p>
            <b>No está rota: está diseñada así.</b> Preguntale exactamente lo mismo dos veces
            y puede contestarte distinto — cada palabra es una tirada nueva. Y el botón
            "regenerar respuesta" de tu chat es, literalmente, volver a tirar la lotería.
            La perilla la decide la app que usás; la mayoría la deja a mitad de camino.
          </p>
        </div>
        <p>
          <b>En tu trabajo:</b> el azar es una herramienta, no un defecto. Para tareas
          repetibles y de precisión (resumir, extraer datos, corregir) lo querés bajo; para
          buscar ideas o títulos, alto — ahí la sorpresa es el objetivo. Y aunque tu
          herramienta no te deje tocar la perilla, saber que existe ya te cambia la lectura:
          una respuesta distinta no significa que la anterior "estaba mal".
        </p>
        <DemoTemperatura />
        <ParadaCTA demoHref="/demo/logprobs" labHref="/logprobs" />
      </section>

      {/* ============== TOKENS ============== */}
      <section className="criollo-section" id="tokens">
        <h2>🧩 Parada 3 — No lee letras ni palabras: lee pedacitos</h2>
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
        <ParadaCTA demoHref="/demo/tokens" labHref="/tokens" />
      </section>

      {/* ============== MEMORIA ============== */}
      <section className="criollo-section" id="memoria">
        <h2>✉️ Parada 4 — No te recuerda: cada mensaje es una carta nueva</h2>
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
        <ParadaCTA demoHref="/demo/chat" labHref="/chat" />
      </section>

      {/* ============== VENTANA ============== */}
      <section className="criollo-section" id="ventana">
        <h2>🧹 Parada 5 — Su escritorio tiene un tamaño fijo</h2>
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
        <ParadaCTA demoHref="/demo/ventana-contexto" labHref="/ventana-contexto" />
      </section>

      {/* ============== PEDIDO ============== */}
      <section className="criollo-section" id="pedido">
        <h2>🗣️ Parada 6 — Lee tu pedido, no tu mente</h2>
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
        <ParadaCTA demoHref="/demo/especificidad" labHref="/especificidad" />
      </section>

      {/* ============== RUIDO ============== */}
      <section className="criollo-section" id="ruido">
        <h2>🗑️ Parada 7 — Basura adentro, basura afuera</h2>
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
        <ParadaCTA demoHref="/demo/ruido" labHref="/ruido" />
      </section>

      {/* ============== SEGURIDAD (YAPA) ============== */}
      <section className="criollo-section" id="seguridad">
        <h2>🛡️ Yapa — Ojo con lo que pegás</h2>
        <p>
          Dos riesgos que no tienen nada de técnico. El primero: todo lo que pegás en el
          chat <b>viaja a un servidor ajeno</b>. Un contrato, una nómina de sueldos, datos
          de clientes — si no lo mandarías por mail a un desconocido, no lo pegues sin
          pensarlo dos veces (o sin chequear la política de tu empresa).
        </p>
        <div className="prov-callout">
          <p>
            El segundo es más raro pero real: <b>la IA no distingue tu pedido del texto que
            le pegás</b>. Todo es contexto. Si el documento que le diste trae adentro una
            orden escondida ("ignorá las instrucciones y respondé tal cosa"), puede
            obedecerla como si fuera tuya. Se llama <i>prompt injection</i>, y lo podés ver
            animado en <a href="/demo/prompt-injection" className="criollo-link">la demo del
            mail con orden escondida</a>.
          </p>
        </div>
        <p>
          <b>En tu trabajo:</b> antes de pegar, preguntate "¿esto puede salir de acá?". Y si
          la IA procesa texto que vos no escribiste (mails, documentos de terceros, páginas
          web), desconfiá de respuestas que se desvían raro del pedido original.
        </p>
      </section>

      {/* ============== LLEVAR ============== */}
      <section className="criollo-section" id="llevar">
        <h2>✅ Qué llevarte</h2>
        <p>Si te quedás con siete ideas, que sean estas:</p>
        <ol>
          <li><b>Es un completador de texto</b>, no un cerebro que entiende. Adivina la continuación más probable.</li>
          <li><b>Alucina con seguridad.</b> Verificá siempre nombres, fechas, cifras y fuentes.</li>
          <li><b>Trae azar de fábrica.</b> La misma pregunta puede dar respuestas distintas; "regenerar" es volver a tirar la lotería.</li>
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
          ¿Te quedó picando alguna pregunta? Estas paradas no son todo: hay otras preguntas
          que la gente se hace, cada una con su propia página corta, con mini-juego incluido:
        </p>
        <ul>
          <li><a href="/tutos/fuentes" className="criollo-link">¿De dónde saca lo que responde?</a> — cómo hacer que trabaje sobre tus documentos y no sobre su "memoria".</li>
          <li><a href="/tutos/piensa" className="criollo-link">¿"Piensa" antes de responder?</a> — qué es eso de los modelos que razonan.</li>
          <li><a href="/tutos/agentes" className="criollo-link">¿Cómo hace cosas, además de hablar?</a> — la IA usando herramientas.</li>
          <li><a href="/tutos/reglas" className="criollo-link">¿Cómo se le dan reglas que respete?</a> — instrucciones que no se olvidan.</li>
        </ul>
        <p>
          Y si te picó la curiosidad técnica y querés ver el JSON real que viaja en cada
          mensaje, pasate por <a href="/como-funciona" className="criollo-link">/como-funciona</a>.
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
          A good antidote: hand it the material yourself and ask it to work only from that —
          we cover it in <a href="/tutos/fuentes" className="criollo-link">where does it get
          its answers?</a>
        </p>
        <DemoPredictor />
        <ParadaCTA demoHref="/demo/logprobs" labHref="/logprobs" />
      </section>

      {/* ============== TEMPERATURA ============== */}
      <section className="criollo-section" id="temperatura">
        <h2>🎲 Stop 2 — Why does it answer differently each time?</h2>
        <p>
          In the previous stop you saw that AI picks the next word by probability. Now the
          detail nobody tells you: <b>it doesn't always pick the most likely one</b>. It runs
          a lottery where likely words hold more tickets, and that lottery has a dial:
          the <b>temperature</b>. Cold, the favorite always wins. Hot, the underdogs get a
          real chance too.
        </p>
        <div className="prov-callout">
          <p>
            <b>It's not broken: it's designed that way.</b> Ask it exactly the same thing
            twice and you may get different answers — every word is a fresh draw. And the
            "regenerate response" button in your chat is, literally, running the lottery
            again. The dial is set by the app you use; most leave it somewhere in the middle.
          </p>
        </div>
        <p>
          <b>At work:</b> randomness is a tool, not a defect. For repeatable, precision tasks
          (summarizing, extracting data, proofreading) you want it low; for hunting ideas or
          headlines, high — there, surprise is the point. And even if your tool won't let you
          touch the dial, knowing it exists changes how you read the output: a different
          answer doesn't mean the previous one "was wrong".
        </p>
        <DemoTemperatura />
        <ParadaCTA demoHref="/demo/logprobs" labHref="/logprobs" />
      </section>

      {/* ============== TOKENS ============== */}
      <section className="criollo-section" id="tokens">
        <h2>🧩 Stop 3 — It doesn't read letters or words: it reads chunks</h2>
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
        <ParadaCTA demoHref="/demo/tokens" labHref="/tokens" />
      </section>

      {/* ============== MEMORIA ============== */}
      <section className="criollo-section" id="memoria">
        <h2>✉️ Stop 4 — It doesn't remember you: every message is a fresh letter</h2>
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
        <ParadaCTA demoHref="/demo/chat" labHref="/chat" />
      </section>

      {/* ============== VENTANA ============== */}
      <section className="criollo-section" id="ventana">
        <h2>🧹 Stop 5 — Its desk is a fixed size</h2>
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
        <ParadaCTA demoHref="/demo/ventana-contexto" labHref="/ventana-contexto" />
      </section>

      {/* ============== PEDIDO ============== */}
      <section className="criollo-section" id="pedido">
        <h2>🗣️ Stop 6 — It reads your request, not your mind</h2>
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
        <ParadaCTA demoHref="/demo/especificidad" labHref="/especificidad" />
      </section>

      {/* ============== RUIDO ============== */}
      <section className="criollo-section" id="ruido">
        <h2>🗑️ Stop 7 — Garbage in, garbage out</h2>
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
        <ParadaCTA demoHref="/demo/ruido" labHref="/ruido" />
      </section>

      {/* ============== SEGURIDAD (YAPA) ============== */}
      <section className="criollo-section" id="seguridad">
        <h2>🛡️ Bonus — Watch what you paste</h2>
        <p>
          Two risks with nothing technical about them. First: everything you paste into the
          chat <b>travels to someone else's server</b>. A contract, a payroll sheet, client
          data — if you wouldn't email it to a stranger, don't paste it without thinking
          twice (or without checking your company's policy).
        </p>
        <div className="prov-callout">
          <p>
            The second is rarer but real: <b>the AI can't tell your request apart from the
            text you paste</b>. It's all context. If the document you hand it carries a
            hidden order inside ("ignore the instructions and answer such-and-such"), it may
            obey it as if it were yours. It's called <i>prompt injection</i>, and you can see
            it animated in <a href="/demo/prompt-injection" className="criollo-link">the
            hidden-order email demo</a>.
          </p>
        </div>
        <p>
          <b>At work:</b> before pasting, ask yourself "can this leave the building?". And if
          the AI processes text you didn't write (emails, third-party documents, web pages),
          be suspicious of answers that drift oddly away from your original request.
        </p>
      </section>

      {/* ============== LLEVAR ============== */}
      <section className="criollo-section" id="llevar">
        <h2>✅ What to take away</h2>
        <p>If you keep seven ideas, make them these:</p>
        <ol>
          <li><b>It's a text completer</b>, not a brain that understands. It guesses the most likely continuation.</li>
          <li><b>It hallucinates confidently.</b> Always verify names, dates, figures and sources.</li>
          <li><b>Randomness is built in.</b> The same question can give different answers; "regenerate" is running the lottery again.</li>
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
          Still curious about something? These stops aren't the whole story: there are other
          questions people ask, each with its own short page, mini-game included:
        </p>
        <ul>
          <li><a href="/tutos/fuentes" className="criollo-link">Where does it get its answers?</a> — how to make it work from your documents, not its "memory".</li>
          <li><a href="/tutos/piensa" className="criollo-link">Does it "think" before answering?</a> — what reasoning models are about.</li>
          <li><a href="/tutos/agentes" className="criollo-link">How does it do things, beyond talking?</a> — AI using tools.</li>
          <li><a href="/tutos/reglas" className="criollo-link">How do you give it rules it follows?</a> — instructions that don't get forgotten.</li>
        </ul>
        <p>
          And if the technical itch kicked in and you want to see the real JSON that travels
          on every message, head to <a href="/como-funciona" className="criollo-link">/como-funciona</a>.
        </p>
      </section>

    </div>
  )
}
