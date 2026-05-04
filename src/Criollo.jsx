export default function Criollo({ onBack }) {
  return (
    <div className="criollo">
      <header className="header">
        <h1>Criollo — el endpoint en castellano de barrio</h1>
        <button onClick={onBack} className="clear-btn" type="button">← Volver al chat</button>
      </header>

      <div className="criollo-content">
        <section className="criollo-section">
          <h2>Pará, ¿qué es esto del endpoint?</h2>
          <p>
            Imaginate que <b>OpenAI es un kiosco gigante de inteligencia</b>. Vos no entrás al kiosco,
            le hablás a través de una <b>ventanilla</b>. Esa ventanilla tiene una dirección fija:
          </p>
          <div className="criollo-quote">https://api.openai.com/v1/chat/completions</div>
          <p>
            A esa ventanilla la llamamos <b>endpoint</b>. Le tirás un papelito con tu pedido,
            y el kiosquero (el modelo, ej. <code>gpt-4o-mini</code>) te tira la respuesta por la misma ventanilla.
          </p>
        </section>

        <section className="criollo-section">
          <h2>¿Qué le mando? (el "request")</h2>
          <p>
            Le mandás un papelito en formato JSON con tres cosas básicas:
          </p>
          <ul>
            <li>
              <b>model</b> — qué cerebro querés usar. Hay varios: uno barato y rápido
              (<code>gpt-4o-mini</code>), uno más grosso y caro (<code>gpt-4o</code>), etc. Es como elegir
              entre el pibe del kiosco o el dueño con 30 años de experiencia.
            </li>
            <li>
              <b>messages</b> — la conversación. Es una lista de mensajes con dos cosas: quién habla
              (<code>role</code>) y qué dice (<code>content</code>). Los roles son:
              <ul>
                <li><code>system</code>: instrucciones generales que el bot tiene que seguir siempre. Como decirle "sos un mozo amable, respondé en castellano".</li>
                <li><code>user</code>: lo que vos preguntás.</li>
                <li><code>assistant</code>: lo que el bot ya te respondió antes (sirve para que recuerde la charla).</li>
              </ul>
            </li>
            <li>
              <b>temperature</b> — cuán creativo querés que sea. <code>0</code> = aburrido pero exacto,
              <code>1</code> = inventivo, <code>2</code> = directamente delirante.
            </li>
          </ul>
        </section>

        <section className="criollo-section">
          <h2>¿Por qué hay que mandarle todo el historial cada vez?</h2>
          <p>
            Porque el bot <b>tiene amnesia total</b>. Cada llamada es como hablar con alguien que
            recién te conoce. Si querés que se acuerde de lo que le dijiste hace dos minutos,
            <b>tenés que recordárselo vos</b> mandando toda la conversación de nuevo.
          </p>
          <p>
            Por eso en el modo "API cruda" cada mensaje es independiente: no le mandás el
            historial, así que el bot no tiene contexto y responde de cero.
          </p>
        </section>

        <section className="criollo-section">
          <h2>¿Qué me devuelve? (el "response")</h2>
          <p>
            Te tira un JSON con varias cosas. Lo importante:
          </p>
          <ul>
            <li>
              <b>choices</b> — una lista con la respuesta. Generalmente trae una sola, en
              <code>choices[0].message.content</code>. <b>Eso es lo que el bot te contesta</b>,
              el resto es metadata.
            </li>
            <li>
              <b>usage</b> — cuánto te salió la consulta, contado en "tokens" (más sobre eso abajo).
            </li>
            <li>
              <b>finish_reason</b> — por qué terminó de responder. Si dice <code>stop</code> está todo
              bien, terminó normal. Si dice <code>length</code> es que se quedó sin espacio (le pusiste
              poco max_tokens). Si dice <code>content_filter</code> es que tocó algo que el filtro
              bloqueó.
            </li>
            <li>
              <b>id, object, created, model</b> — datos administrativos: ID único del pedido, tipo de
              respuesta, cuándo se generó (timestamp), y qué modelo terminó respondiendo.
            </li>
          </ul>
        </section>

        <section className="criollo-section">
          <h2>¿Qué carajo es un "token"?</h2>
          <p>
            Un token es <b>un pedacito de palabra</b>. No es exactamente una letra ni una palabra entera.
            Por ejemplo, "hola" es 1 token, pero "extraordinariamente" puede ser 4 o 5.
          </p>
          <p>
            ¿Por qué importa? Porque <b>OpenAI te cobra por token</b>: cuántos le mandaste
            (<code>prompt_tokens</code>) y cuántos te devolvió (<code>completion_tokens</code>).
            La suma es <code>total_tokens</code> y ahí mirás cuánto te salió la consulta.
          </p>
          <p>
            Regla de pulgar: <b>1 token ≈ 4 caracteres</b> en inglés, un poco más en español.
          </p>
        </section>

        <section className="criollo-section">
          <h2>¿Y la API key qué onda?</h2>
          <p>
            Es tu <b>contraseña personal</b> para que el kiosco te atienda. Va en el header de
            <code>Authorization</code> con un "Bearer" adelante. Si alguien te la roba puede gastar
            tu plata haciendo consultas, así que <b>nunca la pegues en código que se suba a internet</b>.
          </p>
          <p>
            En este proyecto está en el archivo <code>.env</code>, que está en el <code>.gitignore</code>
            (no se sube a git). En producción se debería usar un backend que esconda la key del lado servidor.
          </p>
        </section>

        <section className="criollo-section">
          <h2>El flujo completo, contado como cuento</h2>
          <ol className="criollo-steps">
            <li>Vos escribís algo en el input.</li>
            <li>La app arma un papelito JSON con tu mensaje (más el historial si querés contexto).</li>
            <li>Le mete tu API key como contraseña.</li>
            <li>Manda el papelito a la ventanilla del kiosco (el endpoint).</li>
            <li>El kiosquero (el modelo) lee, piensa y escribe una respuesta.</li>
            <li>Te devuelve un JSON con la respuesta y la cuenta de tokens.</li>
            <li>La app saca el texto de <code>choices[0].message.content</code> y te lo muestra como burbuja en el chat.</li>
          </ol>
        </section>

        <section className="criollo-section">
          <h2>Errores típicos y qué quieren decir</h2>
          <ul>
            <li><b>401 Unauthorized</b> — tu API key está mal o vencida. Andá a generar una nueva.</li>
            <li><b>429 Too Many Requests</b> — estás mandando demasiado rápido o se te acabó el crédito.</li>
            <li><b>400 Bad Request</b> — le mandaste algo mal armado (un campo que no existe, un formato roto).</li>
            <li><b>500 / 503</b> — el kiosco está caído del lado de OpenAI. Esperá un rato y reintentá.</li>
          </ul>
        </section>

        <footer className="criollo-footer">
          <button onClick={onBack} className="clear-btn" type="button">← Volver al chat</button>
        </footer>
      </div>
    </div>
  )
}
