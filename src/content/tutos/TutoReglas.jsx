// Cuerpo del tuto /tutos/reglas — "¿Cómo se le dan reglas que respete?".
// ES (base de verdad) y EN. El andamiaje (header, nav, CTAs) vive en Tutos.jsx.

import DemoReglas from './DemoReglas.jsx'

export function TutoReglasEs() {
  return (
    <>
      <section className="criollo-section">
        <h2>📌 Las reglas también viajan en la carta</h2>
        <p>
          La IA no tiene un panel de configuración donde "aprende" las normas de tu
          empresa. Las reglas que respeta son <b>texto que viaja al principio de cada
          carta</b>, antes que todo lo demás: "nunca prometas descuentos", "tono formal",
          "firmá como Equipo Nube". Cada mensaje que mandás, las reglas van de nuevo.
        </p>
        <p>
          Mirá el mismo pedido con y sin reglas — y fijate dónde van en el sobre:
        </p>
        <DemoReglas />
      </section>

      <section className="criollo-section">
        <h2>⚖️ Reglas claras, IA obediente (casi siempre)</h2>
        <div className="prov-callout">
          <p>
            Como la regla es texto, vale lo mismo que un buen pedido: <b>concreta y
            verificable</b> gana. "Sé profesional" es humo; "no prometas descuentos ni
            plazos, y firmá como Equipo Nube" se puede cumplir y se puede chequear.
          </p>
        </div>
        <p>
          <b>En tu laburo:</b> si usás una IA para tareas repetidas, escribí las reglas
          una vez y guardalas (las apps serias tienen un lugar para eso: "instrucciones
          personalizadas", "system prompt", un archivo de reglas). Y ojo: la regla vale
          mientras viaje. Si la charla se hizo larguísima y la app recortó, hasta las
          reglas pueden quedar afuera del sobre — otra razón para chats cortos y frescos.
        </p>
      </section>
    </>
  )
}

export function TutoReglasEn() {
  return (
    <>
      <section className="criollo-section">
        <h2>📌 Rules travel in the letter too</h2>
        <p>
          The AI has no settings panel where it "learns" your company’s norms. The rules
          it follows are <b>text traveling at the top of every letter</b>, before
          everything else: "never promise discounts", "formal tone", "sign as Team Nube".
          Every message you send, the rules ride along again.
        </p>
        <p>
          Watch the same request with and without rules — and note where they sit in the
          envelope:
        </p>
        <DemoReglas />
      </section>

      <section className="criollo-section">
        <h2>⚖️ Clear rules, obedient AI (almost always)</h2>
        <div className="prov-callout">
          <p>
            Since a rule is text, the same law as a good request applies: <b>concrete and
            checkable</b> wins. "Be professional" is smoke; "don’t promise discounts or
            deadlines, and sign as Team Nube" can be followed and can be verified.
          </p>
        </div>
        <p>
          <b>At work:</b> if you use an AI for recurring tasks, write the rules once and
          save them (serious apps have a place for that: "custom instructions", "system
          prompt", a rules file). And beware: a rule counts only while it travels. If the
          chat got huge and the app trimmed it, even the rules can miss the envelope —
          one more reason for short, fresh chats.
        </p>
      </section>
    </>
  )
}
