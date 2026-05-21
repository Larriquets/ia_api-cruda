import { useEffect, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import TryModeCTA from './TryModeCTA.jsx'

const TOC_ITEMS = [
  { id: 'api-es-todo',     emoji: '🌐', label: 'Toda IA es API' },
  { id: 'recien-nacida',   emoji: '🧠', label: 'IA recién nacida' },
  {
    id: 'de-que-se-trata', emoji: '📦', label: 'Modos',
    children: [
      { id: 'modo-chat',     emoji: '💬', label: '1) Chat' },
      { id: 'modo-editor',   emoji: '💻', label: '2) Editor' },
      { id: 'modo-loop',     emoji: '🤖', label: '3) Loop Agéntico' },
      { id: 'modo-agentsmd', emoji: '📋', label: '4) AGENTS.md' },
      { id: 'modo-skills',   emoji: '✨', label: '5) Skills' },
    ],
  },
  { id: 'controles',       emoji: '🎛', label: 'Controles del request' },
  {
    id: 'labs', emoji: '🧪', label: 'Labs', headerOnly: true,
    children: [
      { id: 'modo-ventana',      emoji: '🪟', label: '6) Ventana de contexto' },
      { id: 'modo-injection',    emoji: '🛡', label: '7) Prompt injection' },
      { id: 'modo-razonamiento', emoji: '🧠', label: '8) Razonamiento' },
    ],
  },
  { id: 'vs-agentes',      emoji: '🛠️', label: 'vs Cursor / CC / Codex' },
  { id: 'glosario',        emoji: '📖', label: 'Glosario' },
]

const flattenToc = (items) =>
  items.flatMap((item) => [
    ...(item.headerOnly ? [] : [item]),
    ...(item.children ? flattenToc(item.children) : []),
  ])
const TOC_FLAT = flattenToc(TOC_ITEMS)

const childIdsOf = (item) =>
  item.children?.flatMap((child) => [child.id, ...(child.children ? childIdsOf(child) : [])]) ?? []

const renderTocItem = (item, depth, activeSection, onClick, openGroups, onToggleGroup) => {
  const childClass = depth === 0 ? '' : ' docs-toc-link-child'
  const activeClass = activeSection === item.id ? ' is-active' : ''
  const labelNode = (
    <>
      <span className="docs-toc-emoji">{item.emoji}</span>
      <span className="docs-toc-label">{item.label}</span>
    </>
  )
  const hasChildren = !!item.children?.length
  const isOpen = hasChildren ? openGroups[item.id] !== false : true
  const chevron = hasChildren ? (
    <span className={`docs-toc-chev${isOpen ? ' is-open' : ''}`} aria-hidden="true">▸</span>
  ) : null

  return (
    <div key={item.id} className="docs-toc-group">
      {item.headerOnly ? (
        <button
          type="button"
          className={`docs-toc-link docs-toc-link-header docs-toc-toggle${childClass}`}
          aria-expanded={isOpen}
          onClick={() => onToggleGroup(item.id)}
        >
          {chevron}
          {labelNode}
        </button>
      ) : hasChildren ? (
        <div className="docs-toc-row">
          <a
            href={`#${item.id}`}
            className={`docs-toc-link${childClass}${activeClass}`}
            aria-current={activeSection === item.id ? 'location' : undefined}
            onClick={(event) => onClick(event, item.id)}
          >
            {labelNode}
          </a>
          <button
            type="button"
            className="docs-toc-chev-btn"
            aria-label={isOpen ? 'Colapsar' : 'Expandir'}
            aria-expanded={isOpen}
            onClick={() => onToggleGroup(item.id)}
          >
            {chevron}
          </button>
        </div>
      ) : (
        <a
          href={`#${item.id}`}
          className={`docs-toc-link${childClass}${activeClass}`}
          aria-current={activeSection === item.id ? 'location' : undefined}
          onClick={(event) => onClick(event, item.id)}
        >
          {labelNode}
        </a>
      )}
      {hasChildren && isOpen && (
        <div className="docs-toc-children">
          {item.children.map((child) =>
            renderTocItem(child, depth + 1, activeSection, onClick, openGroups, onToggleGroup),
          )}
        </div>
      )}
    </div>
  )
}

// Mapa { childId -> parentId } para los grupos plegables.
// Sirve para auto-abrir el grupo cuando una de sus subsecciones se activa.
const PARENT_OF = (() => {
  const map = {}
  for (const item of TOC_ITEMS) {
    if (item.children) for (const id of childIdsOf(item)) map[id] = item.id
  }
  return map
})()

export default function Docs() {
  const [activeSection, setActiveSection] = useState(TOC_FLAT[0].id)
  const [openGroups, setOpenGroups] = useState({})

  const handleToggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: prev[id] === false }))
  }

  const ensureGroupOpen = (childId) => {
    const parent = PARENT_OF[childId]
    if (!parent) return
    setOpenGroups((prev) => (prev[parent] === false ? { ...prev, [parent]: true } : prev))
  }

  useEffect(() => {
    const sectionIds = TOC_FLAT.map((item) => item.id)

    const openSection = (id) => {
      const section = document.getElementById(id)
      const details = section?.querySelector(':scope > details')
      if (details) details.open = true
      return section
    }

    // Hash inicial — viene de un link externo tipo /docs#modo-editor.
    // Hay que abrir el <details> de esa sección ANTES de scrollear, sino
    // el navegador no puede llegar (sección colapsada = sin altura).
    const initialHashId = window.location.hash.replace('#', '')
    const initialId = sectionIds.includes(initialHashId) ? initialHashId : TOC_FLAT[0].id
    setActiveSection(initialId)
    ensureGroupOpen(initialId)
    const initialSection = openSection(initialId)

    // Si vinimos con hash, forzamos scroll después de que el browser
    // reflow-eó la apertura del <details>. Dos rAF + el container scrollable
    // de docs (.criollo-content), porque scrollIntoView del default puede
    // chocar con el header sticky.
    if (initialHashId && initialSection) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          initialSection.scrollIntoView({ behavior: 'auto', block: 'start' })
        })
      })
    }

    const handleHashChange = () => {
      const id = window.location.hash.replace('#', '')
      if (!sectionIds.includes(id)) return
      setActiveSection(id)
      ensureGroupOpen(id)
      const section = openSection(id)
      requestAnimationFrame(() => {
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id)
          ensureGroupOpen(visibleEntry.target.id)
        }
      },
      {
        rootMargin: '-18% 0px -65% 0px',
        threshold: [0, 0.1, 0.25],
      }
    )

    // Conectamos el observer recién después del scroll inicial, así no
    // pisa el activeSection que setamos a partir del hash.
    const observerDelay = setTimeout(() => {
      sectionIds.forEach((id) => {
        const section = document.getElementById(id)
        if (section) observer.observe(section)
      })
    }, initialHashId ? 600 : 0)

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      clearTimeout(observerDelay)
      observer.disconnect()
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const handleTocClick = (event, id) => {
    event.preventDefault()
    const section = document.getElementById(id)
    const details = section?.querySelector(':scope > details')

    if (details) details.open = true
    setActiveSection(id)
    ensureGroupOpen(id)
    window.history.pushState(null, '', `#${id}`)
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /docs
          <span className="docs-header-subtitle">qué hace cada modo de la app</span>
        </h1>
        <a href="/" className="clear-btn">← Modos</a>
      </header>

      <div className="criollo-content docs-layout">

        {/* ============== SIDEBAR (sticky) ============== */}
        <aside className="docs-sidebar" aria-label="Navegación de documentación">
          <DocsNav current="docs" />
          <nav className="docs-toc" aria-label="Índice de la página">
            <div className="docs-toc-title">En esta página</div>
            {TOC_ITEMS.map((item) =>
              renderTocItem(item, 0, activeSection, handleTocClick, openGroups, handleToggleGroup),
            )}
          </nav>
        </aside>

        <div className="docs-main">

        {/* ============== TODA IA ES UNA API ============== */}
        <section className="criollo-section" id="api-es-todo">
          <details className="docs-collapsible docs-section-collapsible" open>
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🌐 Arranquemos por lo importante: toda IA pasa por una API</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <b>Toda interacción humano↔IA pasa por una API.</b> ChatGPT, Claude.ai, Copilot,
            Cursor, el chat de tu banco — son UIs que por debajo le pegan HTTP al mismo
            endpoint que vas a usar vos en este curso. La única diferencia es de capas: esos
            productos te esconden el JSON, te ponen markdown lindo y manejan la sesión por
            vos. <b>Acá lo ves crudo.</b>
          </p>
          <div className="prov-callout">
            <p>
              <b>Si entendés este POST, entendés cómo funciona cualquier producto de IA del
              mercado por dentro.</b> La inteligencia está en el modelo; el producto es <b>cómo
              armás el JSON</b> y <b>cómo presentás la respuesta</b>. Lo único que cambia entre
              ChatGPT y Cursor y el bot de tu banco es <i>qué</i> meten en <code>messages[]</code>{' '}
              y <i>qué tools</i> declaran.
            </p>
          </div>
          <p>
            <b>La finalidad de esta app, en sus cuatro etapas, es esa.</b> Cada modo le saca
            una capa más al producto comercial para que veas el POST que está abajo:
          </p>
          <ol>
            <li>
              <b>💬 Chat</b> — lo mismo que ChatGPT, pero te muestra el array <code>messages[]</code>{' '}
              que viaja en cada turno. Ahí ves el "recuerdo" de la conversación con la mano.
            </li>
            <li>
              <b>💻 Editor</b> — lo que hace cualquier asistente de código de un solo turno
              (Copilot inline, "Edit with AI" de VS Code). Le pegás código + instrucción, te
              vuelve código. Sin magia.
            </li>
            <li>
              <b>🤖 Loop Agéntico</b> — lo que hace Cursor, Claude Code, Copilot Agent: declarar
              tools, dejar que la IA las pida, ejecutarlas, devolverle el resultado, repetir.
              Acá ves cada vuelta del loop.
            </li>
            <li>
              <b>📋 Agente + reglas</b> — el truco del <code>AGENTS.md</code> / <code>CLAUDE.md</code>
              / <code>.cursorrules</code>: un archivo de texto que se concatena al system prompt
              en cada request. Acá lo ves inyectarse en vivo.
            </li>
            <li>
              <b>📋 Agente + 🧪 skills</b> — el mismo agente con <code>AGENTS.md</code>, pero le
              sumás dos tools: <code>load_skill</code> (carga una skill on-demand al contexto) y{' '}
              <code>run_skill_test</code> (corre un test determinista para validar). Es el patrón
              de Claude Code skills / Cursor rules cargables: la IA decide cuándo necesita el
              detalle, no se lo metés todo de entrada.
            </li>
          </ol>
          <p>
            Lo que sigue abajo (la IA es recién nacida, el contexto, las tools, AGENTS.md) son
            <b> consecuencias</b> de esta primera idea.
          </p>
            </div>
          </details>
        </section>

        {/* ============== LA IA ES RECIEN NACIDA ============== */}
        <section className="criollo-section" id="recien-nacida">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🧠 El concepto que une todo: la IA es "recién nacida" en cada request</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            Si te llevás <b>una sola idea</b> de toda esta app, que sea esta. Es lo que más
            cuesta internalizar y lo que explica el 80% de las cosas que parecen raras.
          </p>

          <div className="prov-callout">
            <p>
              <b>Cada request a la IA es una IA recién nacida.</b> No tiene memoria de la
              request anterior. No sabe que hablaste con ella hace 5 segundos. No sabe que
              sos vos. Lo único que sabe es <b>lo que está en el body del POST de este
              request</b>. Cuando responde, se olvida de todo y se va.
            </p>
          </div>

          <p>
            Cada <code>POST /v1/messages</code> levanta una instancia del modelo, lee tu JSON
            (<code>system</code> + <code>messages</code> + <code>tools</code>), genera la
            respuesta y <b>termina</b>. No hay sesión, no hay <code>userId</code> con estado,
            no hay cache mental. La próxima request es <b>otra instancia</b> leyendo otro
            JSON, sin nada en común salvo lo que <b>vos</b> le pongas en <code>messages</code>.
          </p>
          <p>
            Esto es <b>por diseño</b>: cualquier servidor atiende cualquier request
            (escalabilidad), la salida depende solo del input (determinismo), no hay nada que
            filtrar después (privacidad), y tu código tiene <b>toda</b> la verdad (sin
            estado oculto).
          </p>

          <div className="prov-callout">
            <p>
              <b>Modelo mental para guardar:</b> la IA es una <b>función pura</b> — mismo
              input, misma distribución de output. <b>Vos</b> mantenés el estado, lo
              persistís, lo editás, lo mandás. La IA es <i>un cerebro alquilado por 200
              milisegundos</i>: durante ese rato una GPU corre inferencia con tu prompt,
              después pasa a atender a otro. Todo lo que la IA "sabe" de vos está en el JSON
              que mandaste. Fin.
            </p>
          </div>
          <p>
            Por eso <a href="/contexto" target="_blank" rel="noreferrer"><b>/contexto</b></a> es
            una página tan importante de esta app: te muestra <b>literalmente</b> todo lo
            que la IA va a saber en la próxima request del chat. <b>No hay nada más.</b>
          </p>

          <details className="docs-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>La excepción: <code>/v1/responses</code> de OpenAI</span>
            </summary>
            <div className="docs-collapsible-body">
              <p>
                Lo único que rompe esto en esta app es el modo "persistente" del chat. OpenAI
                agregó una API alternativa donde <b>ellos sí te guardan el historial</b> del
                lado server. Vos solo mandás el último mensaje + un <code>conversation_id</code>.
              </p>
              <p>
                Pero ojo: eso es <b>azúcar sintáctica</b>. Por debajo, OpenAI hace lo mismo — toma
                tu nuevo mensaje, lo concatena con el historial que tienen guardado, y arma un
                prompt completo internamente. <b>La IA sigue siendo "recién nacida" en cada inferencia.</b>{' '}
                La diferencia es solo <i>dónde vive</i> el array <code>messages</code>: en tu
                cliente (clásico) o en el server de OpenAI (persistente).
              </p>
              <p>
                <b>Anthropic no tiene equivalente.</b> Por eso Claude es siempre 100% del lado
                cliente — la "amnesia" es total y absoluta en cada request.
              </p>
            </div>
          </details>

          <details className="docs-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>Implicaciones prácticas (5)</span>
            </summary>
            <div className="docs-collapsible-body">
              <h4>1) Por qué los chats largos cuestan más cada turno</h4>
              <p>
                Cada turno mandás <b>todo</b> el historial otra vez. Si la conversación tiene 50
                mensajes, la request 51 manda los 50 anteriores + el nuevo. Pagás por todos los
                tokens de input cada vez. Por eso aparecen features como <b>prompt caching</b>
                (Anthropic descuenta los tokens repetidos si los detecta) y <b>compaction</b>
                (resumir partes viejas).
              </p>

              <h4>2) Por qué podés "borrar" el historial editando el array</h4>
              <p>
                Si querés que la IA "olvide" algo que dijo, podés simplemente <b>sacar ese turno
                del array</b> <code>messages</code> antes de mandar el próximo request. La IA no
                se va a quejar — no tiene cómo darse cuenta. Para ella la conversación <b>es</b>{' '}
                lo que le mandás.
              </p>

              <h4>3) Por qué podés mentirle sobre lo que dijo</h4>
              <p>
                Análogo a lo anterior: podrías editar un mensaje <code>role: "assistant"</code>{' '}
                en el array y poner cualquier cosa. La IA va a tomar eso como "lo que dijo en el
                turno anterior" y seguir desde ahí. Es una técnica conocida como <b>assistant
                prefilling</b>.
              </p>

              <h4>4) Por qué no hay forma de "entrenar" a la IA con tu conversación</h4>
              <p>
                La IA no aprende de tus chats. No hay un modelo "tuyo" que se va personalizando.
                Cada request: instancia recién nacida, mismo modelo que el de cualquier otro usuario del
                planeta. Si querés que "aprenda" tus preferencias, las metés en el system prompt
                o en el historial — pero eso lo cargás <b>vos</b>, cada vez.
              </p>

              <h4>5) Por qué el Loop Agéntico funciona</h4>
              <p>
                Justamente porque la IA es recién nacida, vos podés <b>fabricar</b> una historia
                conversacional que incluya tool calls que ella "hizo" y tool results que tu código
                generó. La IA, al recibir ese historial, lo toma como suyo y sigue desde ahí.
                Esto es <i>literalmente</i> lo que ves en el panel "Historial Request/Response"
                del Loop Agéntico.
              </p>
            </div>
          </details>
            </div>
          </details>
        </section>

        {/* ============== INTRO ============== */}
        <section className="criollo-section" id="de-que-se-trata">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🧪 De qué se trata esta app</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            Es un laboratorio para <b>ver qué pasa realmente</b> cuando hablás con una IA.
            No es un chat pulido — la idea es exponer todo: el JSON que se manda, el JSON
            que vuelve, los tokens que se gastan, el contexto que se acumula, las herramientas
            que la IA puede llamar.
          </p>
          <p>
            Hay <b>cinco modos</b>, cada uno enseña un concepto distinto:
          </p>
          <ol>
            <li><b>💬 Chat</b> — cómo funciona una conversación con LLM y qué es el "contexto".</li>
            <li><b>💻 Editor</b> — cómo se le pide a una IA que modifique código (un solo turno).</li>
            <li><b>🤖 Loop Agéntico</b> — cómo la IA puede usar <i>herramientas</i> y encadenar acciones.</li>
            <li><b>📋 Agente + reglas</b> — cómo "enseñarle" a la IA las convenciones de tu proyecto vía <code>AGENTS.md</code>.</li>
            <li><b>📋 Agente + 🧪 skills</b> — cómo la IA carga "skills" on-demand (<code>load_skill</code> + <code>run_skill_test</code>) en vez de cargarle todo de entrada.</li>
          </ol>
          <div className="prov-callout">
            <p>
              💡 <b>Tip pedagógico:</b> abrí cualquier modo y siempre mirá el panel de la
              <b> derecha</b>. Ahí está la "verdad cruda" — el JSON real que viaja por HTTP.
              Todo lo lindo de la izquierda es solo presentación.
            </p>
          </div>
            </div>
          </details>
        </section>

        {/* ============== CHAT ============== */}
        <section className="criollo-section" id="modo-chat">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>1) 💬 Chat — el modo clásico</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/" target="_blank" rel="noreferrer"><code>http://localhost:5173/</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Una conversación de toda la vida con la IA. Escribís, te responde, escribís de
            nuevo, te responde de nuevo. La diferencia con ChatGPT/Claude.ai común es que acá
            podés ver <b>todo lo que la app le manda al modelo</b>.
          </p>

          <h3>El concepto que enseña: <i>el contexto</i></h3>
          <p>
            Las APIs de LLM son <b>stateless</b> (sin memoria). Cada vez que mandás un mensaje,
            tu navegador le manda al modelo <b>toda la conversación de nuevo</b> — no porque sea
            lento, sino porque <b>el modelo no recuerda nada</b> entre requests. El "recuerdo"
            es el array <code>messages[]</code> que vos le mandás cada vez.
          </p>
          <p>
            Por eso si la conversación se pone larga, gastás cada vez más tokens: porque cada
            request manda <b>todo el historial</b>, no solo tu última pregunta.
          </p>

          <h3>Modos del chat</h3>
          <ul>
            <li>
              <b>OpenAI clásico</b> — usa <code>/v1/chat/completions</code>. Cada request manda
              system + historial completo + tu nuevo mensaje.
            </li>
            <li>
              <b>OpenAI persistente</b> — usa <code>/v1/responses</code> + <code>/v1/conversations</code>.
              OpenAI te guarda el historial en sus servidores; vos solo mandás el último mensaje
              + un <code>conversation_id</code>. <i>Excepción</i> al stateless de arriba.
            </li>
            <li>
              <b>Anthropic (Claude)</b> — usa <code>/v1/messages</code>. Siempre stateless,
              siempre mandás todo. Claude no tiene API persistente.
            </li>
            <li>
              <b>Modo "raw"</b> — manda el <code>system</code> + tu último mensaje, sin
              historial previo. Sirve para ver cómo responde la IA cuando no acumula la
              conversación, pero seguís controlando su "personalidad" desde el system.
            </li>
          </ul>
          <p>
            ¿Querés ver la diferencia entre los tres modos <b>sin gastar API</b>?{' '}
            Abrí <a href="/demo/chat" target="_blank" rel="noreferrer">/demo/chat</a> —
            un comparador animado de crudo vs conversación vs persistente, lado a lado.
          </p>

          <h3>Qué mirar</h3>
          <ul>
            <li><b>Panel del medio (Request → API):</b> el JSON que sale. Fijate cómo crece <code>messages[]</code> con cada turno.</li>
            <li><b>Panel del medio (Response ← API):</b> lo que vuelve, incluyendo <code>usage</code> con los tokens consumidos.</li>
            <li><b>Panel derecho (Log):</b> timestamps, latencia, tokens, errores.</li>
            <li><b>Páginas auxiliares:</b> <a href="/contexto" target="_blank" rel="noreferrer">/contexto</a> (vista en vivo del array <code>messages</code>) y <a href="/proveedores" target="_blank" rel="noreferrer">/proveedores</a> (comparación OpenAI vs Anthropic).</li>
          </ul>

          <TryModeCTA
            href="/"
            label="Chat"
            emoji="💬"
            hint="Probá los tres modos de contexto (Crudo / Conversación / Persistente) y mirá cómo cambia el JSON que sale."
          />
          <TryModeCTA
            href="/demo/chat"
            label="Demo Chat"
            emoji="🎞️"
            hint="Compará crudo, conversación y persistente sin gastar API."
          />
            </div>
          </details>
        </section>

        {/* ============== EDITOR ============== */}
        <section className="criollo-section" id="modo-editor">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>2) 💻 Editor — IA modifica código (un turno)</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/editor" target="_blank" rel="noreferrer"><code>http://localhost:5173/editor</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Un editor de código (Monaco — el mismo de VS Code) + una caja para pedirle algo
            a la IA <i>sobre ese código</i>. Le mandás el código + la instrucción, te devuelve
            código modificado, lo aplicás manualmente con un botón.
          </p>

          <h3>El concepto que enseña: <i>el código es contexto</i></h3>
          <p>
            La IA <b>no tiene "acceso" a tu archivo</b> — vos le pegás el código en el prompt,
            y ella te devuelve texto. El editor es solo presentación: lo que importa es que
            el código viaja como un string dentro del campo <code>messages[].content</code>.
          </p>
          <p>
            Esto significa que <b>todo</b> lo que está en el código es contexto: nombres de
            variables, comentarios, espacios. Si la IA "adivina" algo aparentemente sin
            información, fijate si la pista no estaba escondida en el código.
          </p>

          <h3>Modos del editor</h3>
          <ul>
            <li>
              <b>Sin contexto</b> — cada instrucción es independiente. El system prompt + tu
              código + tu instrucción. La IA no recuerda lo que pasó antes.
            </li>
            <li>
              <b>Con contexto</b> — guardás un historial de instrucciones/respuestas previas.
              Ideal para encadenar pasos donde el segundo depende del primero (ej: "agregá una
              clase" → "instanciá <i>esa</i> clase"). Sin contexto, el "esa" no se entiende.
            </li>
          </ul>
          <p>
            ¿Querés ver la diferencia entre los dos modos <b>sin gastar API</b>?{' '}
            Abrí <a href="/demo/editor" target="_blank" rel="noreferrer">/demo/editor</a> —
            un comparador animado de sin contexto vs con contexto, lado a lado, sobre la misma
            sesión de 3 ediciones.
          </p>

          <h3>Por qué es solo "un turno"</h3>
          <p>
            Mandás → recibís → aplicás (o no) → fin. La IA <b>no puede</b> volver a ver tu
            código después de responder, ni hacer dos cambios en una sola operación. Si querés
            otro cambio, mandás otra instrucción. Esa limitación es la que rompe el Loop Agéntico.
          </p>

          <h3>Qué mirar</h3>
          <ul>
            <li><b>Panel del medio:</b> probá los 3 pasos sugeridos en orden, primero <i>Con contexto</i> y después <i>Sin contexto</i> — vas a ver cómo cambia el resultado.</li>
            <li><b>Panel derecho:</b> el array <code>messages[]</code> que se mandó. <b>Todo</b> ese texto es lo que la IA usó para responderte.</li>
            <li><b>Botón "Aplicar al editor":</b> reemplaza el código actual con el bloque <code>```...```</code> que vino en la respuesta. Si no aplicás, la respuesta se descarta.</li>
          </ul>

          <TryModeCTA
            href="/editor"
            label="Editor"
            emoji="💻"
            hint="Pegá código, pedí un cambio, comparalo con/sin contexto."
          />
          <TryModeCTA
            href="/demo/loop"
            label="Demo Loop"
            emoji="✂️"
            hint="Mirá paso a paso qué pasa cuando la IA pide una edición."
          />
            </div>
          </details>
        </section>

        {/* ============== LOOP AGÉNTICO ============== */}
        <section className="criollo-section" id="modo-loop">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>3) 🤖 Loop Agéntico — IA con herramientas (loop)</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/loop-agentico" target="_blank" rel="noreferrer"><code>http://localhost:5173/loop-agentico</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Igual al Editor por fuera, con un área de edición tipo VS Code y un prompt, pero por dentro <b>cambia todo</b>.
            En vez de pedirle a la IA que devuelva código, le damos <b>herramientas</b> que
            puede llamar — <code>read_code</code> (leer el archivo) y <code>edit_code</code>
            (reemplazar un fragmento) — y la dejamos trabajar en un loop.
          </p>

          <h3>El concepto que enseña: <i>tool use</i> (function calling)</h3>
          <p>
            Las APIs modernas de LLM permiten declarar herramientas en cada request. La IA
            no las ejecuta — las <b>pide</b>, y tu código las ejecuta y le devuelve el
            resultado. Esa ida y vuelta se repite hasta que la IA dice "ya está".
          </p>
          <div className="prov-callout">
            <p>
              <b>Modelo mental:</b> la IA es un cerebro sin manos. Pide acciones; tu código
              son las manos que las ejecutan y reportan el resultado. <b>Un solo prompt humano
              = N requests internas</b> (a veces 2, a veces 6, depende).
            </p>
          </div>

          <h3>El loop, paso a paso</h3>
          <ol>
            <li>Vos mandás una instrucción (ej. "renombrá saldo a balance").</li>
            <li>El navegador arma un <code>POST /v1/messages</code> con la instrucción + la lista de tools.</li>
            <li>La IA responde con <code>stop_reason: "tool_use"</code> y un bloque pidiendo <code>edit_code(old="saldo", new="balance")</code>.</li>
            <li>El navegador ejecuta esa tool localmente sobre el string del código, devuelve <code>"OK: reemplazado"</code>.</li>
            <li>El navegador arma un <b>nuevo</b> request — el array <code>messages</code> ahora incluye la pedido de la IA + el resultado que tu código generó.</li>
            <li>La IA ve el resultado y o bien pide <i>otra</i> tool (ej: ahora <code>getSaldo</code> → <code>getBalance</code>) o bien dice "listo, terminé" con un texto final.</li>
            <li>El loop termina cuando <code>stop_reason !== "tool_use"</code>.</li>
          </ol>

          <p>
            ¿Querés entender el mecanismo <b>sin gastar API</b> y sin meterte
            todavía en el JSON crudo?{' '}
            Abrí <a href="/demo/loop" target="_blank" rel="noreferrer">/demo/loop</a> —
            una animación guiada de una sola corrida (8 pasos) que destruye la idea
            de que "la IA edita tu código". <b>La IA pide ediciones; las hace tu código.</b>
          </p>

          <h3>Comparación rápida con el Editor común</h3>
          <div className="prov-table-wrap">
            <table className="prov-table">
              <thead>
                <tr>
                  <th>Aspecto</th>
                  <th className="prov-col-openai">💻 Editor</th>
                  <th className="prov-col-claude">🤖 Loop Agéntico</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Requests por prompt humano</td>
                  <td>1</td>
                  <td>N (loop)</td>
                </tr>
                <tr>
                  <td>Quién aplica los cambios</td>
                  <td>Vos (botón "Aplicar")</td>
                  <td>El loop, automático</td>
                </tr>
                <tr>
                  <td>Tipo de respuesta</td>
                  <td>Bloque <code>```código```</code></td>
                  <td><code>tool_use</code> blocks</td>
                </tr>
                <tr>
                  <td>La IA puede ver el resultado de su acción</td>
                  <td>❌ No</td>
                  <td>✅ Sí (vía <code>tool_result</code>)</td>
                </tr>
                <tr>
                  <td>Cambios complejos en un solo prompt</td>
                  <td>❌ Difícil</td>
                  <td>✅ Natural</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Qué mirar</h3>
          <ul>
            <li><b>Editor (panel izq.):</b> el código se modifica solo, en vivo, cada vez que la IA llama <code>edit_code</code>. Eso es <i>tu</i> código ejecutando la tool.</li>
            <li><b>Timeline (panel medio):</b> cada iteración del loop con sus <code>tool_use</code> (azul) y <code>tool_result</code> (verde). Al final, el texto que la IA da por respuesta.</li>
            <li><b>Historial (panel der.):</b> ⭐ <b>la joya pedagógica</b>. Cada iteración apilada y expandible. Comparando la #1 vs la #2 ves <i>literal</i> cómo el array <code>messages</code> creció con el <code>tool_use</code> del assistant + el <code>tool_result</code> que tu código devolvió.</li>
            <li><b>Selector de proveedor:</b> probá la misma instrucción con OpenAI y con Claude — el shape del JSON es completamente distinto (<code>tools.input_schema</code> vs <code>tools.function.parameters</code>, <code>tool_use</code> vs <code>tool_calls</code> con <code>arguments</code> stringificado), pero el concepto es idéntico.</li>
          </ul>

          <h3>Esto es lo que hacen Cursor, Claude Code, Copilot Agent, Aider…</h3>
          <p>
            Todos los "agentes de código" modernos funcionan así. La diferencia con esta app
            es que ellos exponen muchas más tools (<code>read_file</code>, <code>write_file</code>,
            <code>run_command</code>, <code>search</code>, <code>grep</code>…) y trabajan sobre el
            sistema de archivos real, no sobre un string en memoria. La idea de fondo es la misma:
            <b> declarar herramientas, dejar que la IA las pida, ejecutarlas localmente, devolverle
            el resultado, repetir.</b>
          </p>

          <TryModeCTA
            href="/loop-agentico"
            label="Loop Agéntico"
            emoji="🤖"
            hint="Dale una instrucción y mirá el ciclo tool_use → tool_result en vivo."
          />
          <TryModeCTA
            href="/demo/loop"
            label="Demo Loop"
            emoji="✂️"
            hint="Mirá una corrida guiada de una edición pedida por tools."
          />
            </div>
          </details>
        </section>

        {/* ============== AGENTS.MD ============== */}
        <section className="criollo-section" id="modo-agentsmd">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>4) 📋 AGENTS.md — instrucciones persistentes para el agente</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/agents-md" target="_blank" rel="noreferrer"><code>http://localhost:5173/agents-md</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Es el Loop Agéntico, pero con una columna extra: un editor para un archivo
            <code> AGENTS.md</code>. Lo que escribís ahí se inyecta en el <code>system</code>{' '}
            prompt del agente <b>en cada request</b> del loop. Y hay un botón
            <b> "Comparar con/sin"</b> que corre la misma instrucción dos veces — una con el
            AGENTS.md activado, otra ignorándolo — y muestra los dos resultados lado a lado.
          </p>

          <h3>El concepto que enseña: <i>cómo le enseñás convenciones a una IA recién nacida</i></h3>
          <p>
            Esto cierra el círculo de toda la app. Si la IA es <b>recién nacida en cada request</b>
            (sección 🧠 de arriba), <b>¿cómo hacés para que respete tus convenciones?</b>
            ¿Cómo le decís que <i>en este proyecto</i> los campos privados llevan <code>_</code>,
            que el logging va por <code>log.info()</code>, que los métodos públicos son verbos
            en infinitivo en español?
          </p>
          <div className="prov-callout">
            <p>
              <b>Respuesta:</b> no le enseñás nada. Le mandás esas reglas, <b>una y otra vez,
              en cada request</b>, dentro del system prompt. AGENTS.md es <b>el truco más
              tonto que funciona</b>: un archivo de texto que tu cliente concatena al system
              en cada llamada a la API. La IA <b>no</b> "carga tu proyecto". Vos le pegás un
              manual de bienvenida en cada turno, y ella actúa como si "supiera" tu proyecto.
            </p>
          </div>

          <h3>Por qué importa (y por qué la demo es una comparación)</h3>
          <p>
            Sin AGENTS.md, la IA usa convenciones <i>genéricas</i> (Java estándar, Spring
            estándar, REST estándar). Con AGENTS.md respeta las convenciones <i>tuyas</i>.
            La diferencia es brutal y sólo se entiende viéndola en vivo. Por eso la demo es:
          </p>
          <ol>
            <li>Mismo prompt humano: <i>"Agregá un método transferir(destino, monto)"</i>.</li>
            <li>Mismo código inicial.</li>
            <li>Mismo modelo, misma temperatura, misma seed implícita.</li>
            <li>La <b>única</b> variable que cambia: si el AGENTS.md va o no en el system.</li>
          </ol>
          <p>
            El botón "Comparar con/sin" hace exactamente eso: dos corridas independientes,
            mismas condiciones excepto el AGENTS.md, dos códigos finales lado a lado. Vas a
            ver cómo la versión "CON" usa el prefijo <code>_</code> en campos privados,
            valida inputs, lanza <code>IllegalArgumentException</code>, loguea con
            <code> log.info</code> — y la versión "SIN" hace lo mismo que cualquier IA con
            cualquier código Java en internet.
          </p>

          <h3>Esto es lo que hacen Cursor, Claude Code, Aider, Continue…</h3>
          <p>
            Todos tienen su versión: <code>AGENTS.md</code> (estándar de OpenAI),
            <code> CLAUDE.md</code> (Anthropic / Claude Code), <code>.cursorrules</code> (Cursor),
            <code> .aider.conf</code>. <b>Mismo concepto.</b> Un archivo de texto que el cliente
            agrega al system prompt en cada llamada. Algunos buscan jerárquicamente (uno por
            carpeta), otros tienen plantillas, pero el truco de fondo es siempre el mismo:
            <i> mandar las convenciones del proyecto en cada request</i>.
          </p>
          <p>
            En este mismo repo, mirá <a href="https://github.com/anthropics/claude-code/blob/main/CLAUDE.md" target="_blank" rel="noreferrer">cualquier CLAUDE.md de un proyecto open source</a>:
            son archivos que describen comandos, convenciones, arquitectura, gotchas. Esa
            descripción se la "explican" a la IA <b>cada vez</b> que la invocan.
          </p>

          <h3>Qué mirar en el modo</h3>
          <ul>
            <li><b>Toggle "incluido / ignorado"</b> arriba del editor de AGENTS.md — desactivá para hacer una corrida sin él, comparalo manualmente con una activada.</li>
            <li><b>Botón "🔬 Comparar con/sin":</b> el corazón de la demo. Misma instrucción, dos resultados.</li>
            <li><b>Panel derecho (Historial Request/Response):</b> abrí cualquier request y mirá el campo <code>system</code> — cuando el toggle está ON, ves todo el AGENTS.md inyectado ahí. <b>Cada</b> request lo lleva.</li>
            <li><b>Costo:</b> AGENTS.md grandes hacen que <b>cada</b> request gaste más tokens (porque va completo cada vez). Por eso conviene ser conciso. Prompt caching de Anthropic descuenta el 90% si los detecta repetidos — pero igual son tokens.</li>
          </ul>

          <TryModeCTA
            href="/agents-md"
            label="Agente + reglas"
            emoji="📋"
            hint="Editá el AGENTS.md y mirá cómo cambian las respuestas del agente."
          />
            </div>
          </details>
        </section>

        {/* ============== AGENTS.MD + SKILLS ============== */}
        <section className="criollo-section" id="modo-skills">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>5) 📋 Agente + 🧪 skills — cargar reglas on-demand</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/agents-md-skills" target="_blank" rel="noreferrer"><code>http://localhost:5173/agents-md-skills</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Es el mismo agente del modo 4 (con AGENTS.md inyectado en el system), pero se le
            suman <b>dos tools nuevas</b>: <code>load_skill</code> (carga el cuerpo de una skill
            on-demand al contexto) y <code>run_skill_test</code> (corre un test determinista
            asociado a esa skill para validar lo que hizo). El AGENTS.md ahora <b>no</b> contiene
            las reglas detalladas — contiene un <i>índice</i> de skills disponibles con su
            descripción corta, y la IA decide cuándo necesita cargar el detalle.
          </p>

          <h3>El concepto que enseña: <i>contexto bajo demanda</i></h3>
          <p>
            Si AGENTS.md (sección 4) es "mandá <b>todas</b> las reglas en cada request", skills
            es "mandá un <b>índice</b> de reglas y dejá que la IA pida sólo las que necesita".
            Es la misma idea de las APIs REST descubribles: en vez de mandar todo el manual
            cada vez, mandás el catálogo y un mecanismo para ir a buscar el detalle.
          </p>
          <div className="prov-callout">
            <p>
              <b>Por qué importa:</b> AGENTS.md grandes (cientos de líneas con reglas de
              estilo, seguridad, dominio, deploy…) hacen que <b>cada</b> request cargue todo
              eso, aunque la tarea sea trivial. Con skills, el sistema mete sólo el índice
              (chico) en el system, y el cuerpo de cada skill viaja únicamente cuando la IA
              decide que lo necesita.
            </p>
          </div>

          <h3>El loop, paso a paso</h3>
          <ol>
            <li>El system arranca con AGENTS.md <b>+ un índice</b> de skills disponibles (ej: <code>commit-message</code>, <code>jdoc-style</code>, <code>null-checks</code>) con una línea de descripción cada una.</li>
            <li>Vos mandás una instrucción (ej. "agregá un método que transfiera saldo").</li>
            <li>La IA mira el índice, decide que necesita la skill <code>null-checks</code> para validar inputs, y pide <code>load_skill(id="null-checks")</code>.</li>
            <li>Tu código devuelve el cuerpo de esa skill como <code>tool_result</code>. <b>Ahora</b> esas reglas viven en el contexto.</li>
            <li>La IA edita el código aplicando las reglas, y opcionalmente llama <code>run_skill_test(id="null-checks")</code> para verificar que su cambio respeta la skill.</li>
            <li>El test determinista (definido en <code>src/skill-tests.js</code>, indexado por id de skill) corre sobre el código resultante y devuelve <code>pass</code> / <code>fail</code> con detalle.</li>
            <li>Si falla, la IA itera. Si pasa, termina.</li>
          </ol>

          <h3>Comparación con el modo 4 (AGENTS.md solo)</h3>
          <div className="prov-table-wrap">
            <table className="prov-table">
              <thead>
                <tr>
                  <th>Aspecto</th>
                  <th className="prov-col-openai">📋 AGENTS.md solo</th>
                  <th className="prov-col-claude">📋 AGENTS.md + 🧪 skills</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Qué viaja en el system</td>
                  <td>Todas las reglas, completas</td>
                  <td>Índice + descripciones cortas</td>
                </tr>
                <tr>
                  <td>Cuándo se carga el detalle</td>
                  <td>Siempre, en cada request</td>
                  <td>Sólo si la IA lo pide</td>
                </tr>
                <tr>
                  <td>Tokens fijos por turno</td>
                  <td>Altos (crecen con el AGENTS.md)</td>
                  <td>Bajos (sólo índice)</td>
                </tr>
                <tr>
                  <td>Validación del resultado</td>
                  <td>Ojo humano</td>
                  <td><code>run_skill_test</code> determinista</td>
                </tr>
                <tr>
                  <td>Decisión "qué regla aplicar"</td>
                  <td>La IA filtra del bloque entero</td>
                  <td>La IA elige del índice antes de cargar</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Qué mirar en el modo</h3>
          <ul>
            <li><b>Panel de skills (izq.):</b> el índice editable. Cada skill tiene id, descripción corta y cuerpo. Lo que viaja en el system es sólo lo de arriba — el cuerpo viaja sólo cuando la IA llama <code>load_skill</code>.</li>
            <li><b>Historial Request/Response (der.):</b> ⭐ mirá cómo en la <b>primera</b> request el system es chico (índice solamente). Después de un <code>load_skill</code>, el array <code>messages</code> incluye el cuerpo completo como <code>tool_result</code> — pero el system <i>sigue chico</i>. <b>Esa es la diferencia clave.</b></li>
            <li><b><code>run_skill_test</code>:</b> después de editar, la IA muchas veces decide validarse a sí misma. Vas a ver llamadas a la tool con su <code>pass</code>/<code>fail</code>. Si falla, suele reintentar.</li>
            <li><b>Esto es lo que hace Claude Code:</b> el sistema de Skills de Claude Code es <i>literalmente</i> esto — un índice de skills disponibles en el system, y la tool para cargar el detalle cuando hace falta. Cursor rules cargables siguen el mismo patrón.</li>
          </ul>

          <TryModeCTA
            href="/agents-md-skills"
            label="Agente + skills"
            emoji="🧪"
            hint="Mirá cómo la IA pide load_skill y el system se mantiene chico."
          />
            </div>
          </details>
        </section>

        {/* ============== VENTANA DE CONTEXTO ============== */}
        <section className="criollo-section" id="modo-ventana">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>6) 🪟 Ventana de contexto — ver romperse la memoria en vivo</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/ventana-contexto" target="_blank" rel="noreferrer"><code>http://localhost:5173/ventana-contexto</code></a>
          </p>
          <h3>Qué hace</h3>
          <p>
            Un chat común, pero con un <b>límite de tokens artificial</b> (default: 300) que vos
            controlás con un slider. Cuando la conversación se pasa del límite, la app <b>poda</b>{' '}
            mensajes antes de enviar — y el panel "Memoria" te muestra <i>literalmente</i> qué se
            borró y qué viaja.
          </p>

          <h3>El concepto que enseña: <i>cómo se rompe la memoria de un chat largo</i></h3>
          <p>
            Si la IA es recién nacida en cada request (sección 🧠) y vos le mandás todo el historial
            (sección 💬), entonces hay un momento en el que <b>no entra más</b>: la ventana de
            contexto del modelo es finita. Cursor lo maneja por vos, ChatGPT lo maneja por vos.
            Acá lo manejás <b>vos</b> con tres estrategias clásicas, y ves la diferencia en vivo.
          </p>

          <h3>Las tres estrategias</h3>
          <ul>
            <li>
              <b>FIFO</b> — cuando te pasás, va sacando los mensajes más viejos uno por uno hasta
              entrar. Brutal: corta a mitad de un turno si hace falta. La IA "olvida" abrupto.
            </li>
            <li>
              <b>Sliding window</b> — mantiene los últimos N turnos (slider configurable). Es lo
              que hacen muchos chats productivos para tener gasto predecible. Olvida igual, pero
              de forma más estructurada.
            </li>
            <li>
              <b>Compaction</b> — el truco más copado: cuando te pasás, la app le pide al modelo
              un <b>resumen</b> de los turnos viejos y los reemplaza por un único mensaje
              "<code>[RESUMEN PREVIO]: ...</code>". Costo: un request extra de IA cada vez que se
              compacta. Beneficio: la continuidad semántica se mantiene aunque la conversación
              sea larga. Esto es <b>literalmente</b> lo que hace el comando <code>/compact</code>{' '}
              de Claude Code.
            </li>
          </ul>

          <div className="prov-callout">
            <p>
              <b>Lo más importante:</b> el system prompt (<code>messages[0]</code>) <b>nunca</b> se
              poda. Es invariante de diseño. Si fuera al revés, perderías la "personalidad" del
              bot en cuanto se llenara la ventana — y eso sería catastrófico.
            </p>
          </div>

          <h3>🧪 Experimento sugerido</h3>
          <ol>
            <li>Dejá el límite en <b>300 tokens</b> y la estrategia en <b>FIFO</b>.</li>
            <li>
              Empezá la charla presentándote: "Hola, me llamo <i>[tu nombre]</i> y trabajo en{' '}
              <i>[lo que sea]</i>".
            </li>
            <li>
              Charlá 4-5 turnos sobre cualquier tema (pedile que te recomiende libros, que te
              explique algo, etc.).
            </li>
            <li>
              En algún momento del turno 5 o 6, el primer mensaje (donde te presentaste) va a
              quedar <b>tachado en gris</b> en el panel Memoria. Esa es la poda.
            </li>
            <li>
              Mandá ahora: "<i>¿te acordás cómo me llamo?</i>". La IA va a inventar un nombre o
              decirte que no se acuerda — <b>porque ya no lo tiene en el contexto</b>.
            </li>
            <li>
              Cambiá la estrategia a <b>Compaction</b>, limpiá, repetí los pasos 2-5. Cuando se
              llene, vas a ver aparecer un mensaje <code>[RESUMEN PREVIO]</code> que <i>sí</i> menciona
              tu nombre. La pregunta del paso 6 ahora se contesta bien.
            </li>
          </ol>

          <h3>Qué mirar</h3>
          <ul>
            <li>
              <b>Barra de tokens (arriba):</b> verde → amarillo → rojo. Cuando se pone roja, el
              próximo envío va a podar.
            </li>
            <li>
              <b>Panel "Memoria" (derecha):</b> ⭐ <b>la joya pedagógica</b>. Tu historial completo
              con los mensajes tachados que ya no viajan al modelo. Es la imagen mental que vale
              la pena llevarse.
            </li>
            <li>
              <b>Panel Request crudo (medio):</b> abrí el JSON después de mandar — vas a ver que{' '}
              <code>messages[]</code> tiene <i>menos</i> entradas que tu historial visible. Esa
              diferencia es la ventana en acción.
            </li>
            <li>
              <b>Log (abajo derecha):</b> cuando hay compaction, hay líneas <code>[compaction]</code>{' '}
              con el request adicional. Ese es el costo extra que pagás.
            </li>
          </ul>

          <p>
            <b>Conexión con tu agente del día a día:</b> cuando tu Cursor "se vuelve lento" o
            "olvida cosas viejas", esto es lo que está pasando por debajo. La estrategia y los
            límites cambian, pero la mecánica es exactamente esta.
          </p>

          <TryModeCTA
            href="/ventana-contexto"
            label="Ventana de contexto"
            emoji="🪟"
            hint="Cambiá la estrategia (FIFO / window / compaction) y mirá cómo se poda el historial."
          />
            </div>
          </details>
        </section>

        {/* ============== PROMPT INJECTION ============== */}
        <section className="criollo-section" id="modo-injection">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>7) 🛡 Prompt injection — cuando el contexto no es confiable</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/prompt-injection" target="_blank" rel="noreferrer"><code>http://localhost:5173/prompt-injection</code></a>
          </p>

          <h3>Qué hace</h3>
          <p>
            Es un laboratorio para ver una idea que no alcanza con decirla: <b>todo es
            contexto, pero no todo el contexto tiene la misma autoridad</b>. El experimento arma
            un payload con <code>system</code>, tarea del usuario, documento externo y
            <code>tool_result</code>. Después mete instrucciones maliciosas dentro de esas zonas
            no confiables para ver si el modelo las obedece.
          </p>

          <h3>El concepto que enseña: <i>jerarquía de instrucciones</i></h3>
          <p>
            Un documento recuperado por RAG, el contenido de una web, un PDF pegado por el usuario
            o el output de una tool <b>son datos</b>. Pueden contener texto que parezca una orden
            ("ignorá el system", "revelá el secreto", "respondé PWNED"), pero no deberían mandar
            sobre el <code>system</code> ni sobre las políticas de tu app.
          </p>

          <div className="prov-callout">
            <p>
              <b>Idea clave:</b> prompt injection no es que alguien "hackea el modelo". Es más
              simple y más peligroso: metés texto no confiable dentro del prompt, y ese texto
              intenta hacerse pasar por una instrucción de mayor autoridad.
            </p>
          </div>

          <h3>Cómo está armado el experimento</h3>
          <ul>
            <li>
              <b>Filtrar secreto</b> — el documento externo intenta revelar una clave falsa que
              vive en el <code>system</code>.
            </li>
            <li>
              <b>Romper formato</b> — el documento intenta pisar el contrato de salida JSON.
            </li>
            <li>
              <b>Acción no autorizada</b> — un <code>tool_result</code> intenta convencer al
              modelo de que una acción fue aprobada.
            </li>
            <li>
              <b>Enviar vulnerable</b> — manda un system mínimo, sin explicar que documentos y
              tool results son datos no confiables.
            </li>
            <li>
              <b>Probar defensa</b> — manda el mismo ataque, pero con reglas explícitas de
              jerarquía: system &gt; user &gt; documento/tool result.
            </li>
          </ul>

          <h3>Qué mirar</h3>
          <ul>
            <li>
              <b>Constructor de ataque:</b> muestra qué parte del contexto es autoridad
              (<code>system</code>) y qué parte es dato no confiable.
            </li>
            <li>
              <b>Request crudo:</b> confirma que la inyección viaja como texto normal dentro del
              payload. No hay magia: está en <code>messages[]</code>.
            </li>
            <li>
              <b>Evaluación:</b> marca <code>PASS</code>/<code>FAIL</code> si el modelo filtró el
              secreto, rompió JSON, cambió el shape o siguió la instrucción inyectada.
            </li>
          </ul>

          <h3>Experimento sugerido</h3>
          <ol>
            <li>Entrá en <b>Filtrar secreto</b> con "Inyectar en documento externo" prendido.</li>
            <li>Mandá <b>Enviar vulnerable</b> y mirá si aparece algún <code>FAIL</code>.</li>
            <li>Mandá <b>Probar defensa</b> con el mismo escenario.</li>
            <li>
              Abrí el <b>Request crudo</b> de ambas corridas y compará el <code>system</code>.
              El modelo es el mismo; lo que cambió fue cómo le explicaste la autoridad del
              contexto.
            </li>
            <li>
              Repetí con <b>Acción no autorizada</b> y prendé "Inyectar en tool_result": es el caso
              más parecido a agentes reales que leen outputs de comandos, APIs o archivos.
            </li>
          </ol>

          <p>
            <b>Conexión con RAG y agentes:</b> cada vez que tu app pega texto externo en el prompt,
            estás abriendo esta puerta. La solución no es "no usar contexto externo"; es etiquetarlo
            como no confiable, mantener secretos fuera del prompt cuando sea posible, validar acciones
            con código determinístico y no dejar que un <code>tool_result</code> se convierta en jefe.
          </p>

          <TryModeCTA
            href="/prompt-injection"
            label="Prompt injection"
            emoji="🛡"
            hint="Probá los ataques precargados y mirá cuándo el modelo cae y cuándo aguanta."
          />
            </div>
          </details>
        </section>

        {/* ============== RAZONAMIENTO ============== */}
        <section className="criollo-section" id="modo-razonamiento">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>8) 🧠 Razonamiento — cuando el modelo "piensa" antes de responder</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            <a href="/razonamiento" target="_blank" rel="noreferrer"><code>http://localhost:5173/razonamiento</code></a>
          </p>

          <h3>Qué hace</h3>
          <p>
            Es un laboratorio para ver de cerca los <b>modelos razonadores</b> — esos que en la
            interfaz de ChatGPT o Claude muestran un "Pensando…" antes de contestar. La página te
            deja mandar la misma pregunta a OpenAI (con <code>gpt-5-mini</code>, <code>o4-mini</code>,
            etc.) o a Claude (con <code>claude-sonnet-4-5</code>), y comparar qué te devuelve cada
            uno como "razonamiento".
          </p>

          <h3>El concepto que enseña: <i>el pensamiento son tokens</i></h3>
          <p>
            Un modelo razonador no tiene un cerebro místico. Lo que hace es <b>generar tokens de
            razonamiento</b> antes de generar la respuesta visible. Esos tokens se descartan del
            output final, pero <b>se facturan igual</b>. Es como pagar por borradores que nunca leés.
          </p>

          <div className="prov-callout">
            <p>
              <b>Idea clave:</b> "piensa más" significa "gasta más tokens internos". Más
              <code>effort</code> = más calidad en problemas complejos, pero también más plata y más
              latencia. En preguntas triviales es plata tirada.
            </p>
          </div>

          <h3>El contraste OpenAI vs Claude (la lección más fuerte)</h3>
          <p>
            Los dos proveedores eligieron <b>políticas opuestas</b> sobre qué te muestran:
          </p>
          <ul>
            <li>
              <b>OpenAI esconde el razonamiento.</b> Solo te da un <i>resumen</i> opcional
              (<code>output[].type:'reasoning'</code> con <code>summary[]</code>), y a veces ni eso —
              el bloque puede llegar vacío. El razonamiento real queda guardado <b>cifrado</b> en
              <code>encrypted_content</code>: opaco para vos, pero podés reenviarlo en multi-turn
              para que el modelo retome su pensamiento sin volver a pagarlo. Lo hacen así para que
              nadie pueda destilar el modelo copiándole los pensamientos.
            </li>
            <li>
              <b>Claude muestra el thinking entero.</b> Te lo devuelve en
              <code>content[].type:'thinking'</code> con el texto completo, párrafos enteros de
              cadena de pensamiento. Cada bloque viene <b>firmado</b> (<code>signature</code>) para
              que en multi-turn la API pueda confirmar que es un thinking original suyo y no algo
              que le metiste vos.
            </li>
          </ul>

          <h3>Qué mirar</h3>
          <ul>
            <li>
              <b>Panel de pensamiento (violeta para OpenAI, naranja para Claude):</b> es lo que
              normalmente está escondido detrás del "Pensando…" en una UI de chat. Acá lo ves crudo.
            </li>
            <li>
              <b>Tabla de tokens:</b> en OpenAI se ve <code>reasoning_tokens</code> separado del
              output visible — el alumno ve literalmente cuántos tokens "pensó" que no entran en
              la respuesta. En Claude todo entra en <code>output_tokens</code> sin desglose, y la UI
              lo aclara.
            </li>
            <li>
              <b>Request crudo:</b> en OpenAI no hay <code>temperature</code> (los razonadores la
              rechazan). En Claude <code>temperature: 1</code> es obligatorio y <code>max_tokens</code>
              tiene que ser mayor que <code>budget_tokens</code>. Cada API tiene sus reglas raras.
            </li>
            <li>
              <b>Effort:</b> mismo control mapeado a cada proveedor. En OpenAI es
              <code>reasoning.effort</code> (minimal/low/medium/high), en Claude es
              <code>thinking.budget_tokens</code> (1k / 2k / 5k / 12k tokens). La UI traduce.
            </li>
          </ul>

          <h3>Experimento sugerido</h3>
          <ol>
            <li>Elegí el preset <b>🧩 Acertijo lógico</b> con OpenAI / effort medium.</li>
            <li>
              Mirá los <b>tokens de razonamiento</b> en la tabla — vas a ver decenas o cientos de
              tokens "pensados" para un acertijo de 3 personas. Mirá el panel violeta: probablemente
              te devuelva un resumen muy corto o vacío.
            </li>
            <li>
              Cambiá a <b>Claude</b> con el mismo preset. Misma pregunta, ahora vas a ver párrafos
              enteros de pensamiento crudo en el panel naranja. <b>Es lo más cerca que vas a estar
              de leer la cadena de razonamiento de un modelo</b>.
            </li>
            <li>
              Probá ahora con <b>"¿Qué hora es?"</b>. Vas a ver que igual gasta tokens de pensamiento
              para una pregunta trivial. Esa es la trampa de los razonadores: te cobran
              "pensamiento" aunque no lo necesites. Por eso existen <code>effort: minimal</code> y
              modelos no-razonadores como <code>gpt-4o-mini</code> para tareas baratas.
            </li>
            <li>
              Subí <b>effort a high</b> en una pregunta difícil y compará: ¿mejoró la respuesta?
              ¿Cuánto más tardó? ¿Cuántos tokens extra pagaste? No siempre la respuesta es "sí mejoró".
            </li>
          </ol>

          <h3>Modelos que razonan vs los que no</h3>
          <ul>
            <li>
              <b>OpenAI razonadores:</b> <code>gpt-5</code>, <code>gpt-5-mini</code>,
              <code>o4-mini</code>, <code>o3-mini</code>, <code>o1-mini</code>. El default del Chat
              de esta app (<code>gpt-4o-mini</code>) <b>no razona</b> — por eso esta página usa una
              env var separada (<code>VITE_OPENAI_REASONING_MODEL</code>).
            </li>
            <li>
              <b>Anthropic con thinking:</b> Sonnet 3.7+, Opus 4+. <b>Haiku no razona</b>. Por eso
              el Chat usa Haiku para velocidad pero esta página usa Sonnet 4.5 vía
              <code>VITE_ANTHROPIC_REASONING_MODEL</code>.
            </li>
          </ul>

          <p>
            <b>Conexión con tu agente del día a día:</b> cuando ves "Reasoning…" en Cursor, Claude
            Code o Codex, esto es exactamente lo que está pasando. Tokens internos que vos pagás,
            invisibles en la UI pero presentes en la factura. Saber esto te ayuda a elegir cuándo
            pedirle a un modelo razonador (problema complejo, riesgo de error caro) y cuándo no
            (chat casual, generación rápida, tareas determinísticas).
          </p>

          <TryModeCTA
            href="/razonamiento"
            label="Razonamiento"
            emoji="🧠"
            hint="Compará cómo OpenAI esconde el pensamiento y Claude lo muestra entero."
          />
            </div>
          </details>
        </section>

        {/* ============== CONTROLES DEL REQUEST (transversales) ============== */}
        <section className="criollo-section" id="controles">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🎛 Controles del request — perillas que cambian todo</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            Lo que viste hasta acá son <b>modos</b>: distintas formas de armar el array{' '}
            <code>messages</code>. Esta sección es sobre las <b>perillas</b> que viajan al
            costado del array y cambian cómo el modelo responde sin tocar una sola palabra
            de tu prompt. Son dos: <b>el system prompt</b> (quién es la IA) y <b>la
            temperatura</b> (cuánto se anima a desviarse).
          </p>
          <p>
            Las dos son <b>transversales</b> a los modos de chat (Crudo, Conversación,
            Persistente) y, en el caso del system, también al Editor y al Loop Agéntico.
          </p>

          <details className="docs-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>A) 🧠 System prompt editable — la "personalidad" antes del primer hola</span>
            </summary>
            <div className="docs-collapsible-body">
              <h3>Qué es</h3>
              <p>
                El <code>system</code> es el mensaje con <code>role:"system"</code> que
                viaja como <i>primer</i> ítem del array <code>messages</code>. Lo lee el
                modelo antes que cualquier user message y define cómo va a responder a{' '}
                <b>todos</b> los turnos siguientes. No es opcional ni cosmético: cambia el
                comportamiento de raíz.
              </p>
              <div className="prov-callout">
                <p>
                  <b>Idea clave:</b> el modelo es el mismo (mismo GPT, mismo Claude). Lo
                  único que cambia entre "ChatGPT", el bot de tu banco y un asistente de
                  programación es <b>qué dice el system</b>. La inteligencia es del modelo;
                  la <b>personalidad</b> es del system.
                </p>
              </div>

              <h3>Dónde aparece en la app</h3>
              <ul>
                <li>
                  <b>Chat (<code>/</code>)</b>: editor plegable arriba del input.
                  Persiste por tab y viaja en <code>messages[0]</code> en los tres modos
                  (Crudo, Conversación, Persistente — este último lo manda como{' '}
                  <code>instructions</code> en <code>/v1/responses</code>).
                </li>
                <li>
                  <b>Editor (<code>/editor</code>)</b>: el mismo editor, con presets que
                  cambian el estilo del código generado (lunfardo, paranoico de seguridad,
                  minimalista).
                </li>
                <li>
                  <b>Loop Agéntico (<code>/loop-agentico</code>)</b>: editás el system del
                  agente para cambiar cómo decide usar las tools (más rápido, más
                  paranoico, más narrador).
                </li>
              </ul>

              <h3>Los presets — el "wow" en 1 click</h3>
              <p>
                Cada modo trae 4-5 presets para que veas el efecto sin tener que escribir
                un system desde cero. Algunos del Chat:
              </p>
              <ul>
                <li><b>🏴‍☠️ Pirata bonaerense</b> — responde en jerga pirata + lunfardo.</li>
                <li><b>📦 Devuelve solo JSON</b> — cero prosa, solo un objeto.</li>
                <li><b>🎓 Profesor sarcástico</b> — te tira un palito antes de responder bien.</li>
                <li><b>😄 Solo emojis</b> — prohibido usar letras.</li>
              </ul>

              <h3>🧪 Experimento para entender</h3>
              <ol>
                <li>Abrí el chat en modo <b>Crudo</b> (sin historial).</li>
                <li>Escribí <code>hola</code> y mandalo. Mirá la respuesta.</li>
                <li>Abrí el editor de system, elegí preset <b>🏴‍☠️ Pirata bonaerense</b>.</li>
                <li>Borrá el chat (botón "Limpiar") y mandá <code>hola</code> de nuevo.</li>
                <li>
                  La respuesta debería sonar como un pirata. <b>Es el mismo modelo, el
                  mismo "hola", la misma temperatura.</b> Lo único que cambió fue una
                  línea de texto en <code>messages[0]</code>.
                </li>
                <li>
                  Bonus: en modo Crudo el system <i>también</i> viaja (es lo único que
                  acompaña al user message). Por eso podés ver el efecto sin acumular
                  historial.
                </li>
              </ol>

              <h3>Detalles raros que vale conocer</h3>
              <ul>
                <li>
                  <b>Claude separa el system</b> del array <code>messages</code>: en{' '}
                  <code>/v1/messages</code> viaja como una key aparte (<code>system: "..."</code>),
                  no como un ítem con <code>role:"system"</code>. La app lo normaliza
                  internamente — pero si mirás el JSON crudo del request en el panel
                  derecho con provider Claude, lo vas a ver afuera del array.
                </li>
                <li>
                  <b>Si dejás el textarea vacío</b>, la app manda el system default. El
                  badge "vacío → default" en el editor te avisa.
                </li>
                <li>
                  <b>Sobreescritura no destruye historial</b>: cambiar el system en
                  Conversación reescribe <code>messages[0]</code> al instante y se aplica
                  al próximo request. El historial de turnos previos sigue ahí.
                </li>
              </ul>
            </div>
          </details>

          <details className="docs-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>B) 🌡 Temperatura — la IA no es determinista (y vos podés moverle la perilla)</span>
            </summary>
            <div className="docs-collapsible-body">
              <h3>Qué es la temperatura</h3>
              <p>
                Cada vez que el modelo genera un token, en realidad calcula una
                distribución de probabilidades sobre miles de candidatos posibles. La{' '}
                <b>temperatura</b> es cuánto le permitís alejarse del más probable:
              </p>
              <ul>
                <li><b>0</b> — siempre elige el token más probable. Casi determinístico.</li>
                <li><b>0.7</b> — el default. Equilibrio entre coherencia y variedad.</li>
                <li><b>1.0</b> — se anima a tokens menos probables. Más creativo.</li>
                <li><b>2.0</b> — caótico. Suele romper la gramática.</li>
              </ul>
              <div className="prov-callout">
                <p>
                  <b>Idea clave:</b> con temperatura &gt; 0, el <b>mismo prompt produce
                  respuestas distintas cada vez</b>. No es un bug. Es así por diseño. La
                  IA <i>no</i> es una función pura.
                </p>
              </div>

              <h3>🧪 Experimento para entender</h3>
              <p>
                Usá el modo <b>Crudo</b> para esto (cada envío arranca limpio, sin
                acumular el chat) y limpiá entre prueba y prueba con el botón "Limpiar".
              </p>
              <ol>
                <li>Slider de temperatura a <b>0</b>.</li>
                <li>
                  Escribí <code>Inventá un nombre creativo para una banda de rock</code> y
                  mandalo. Anotá la respuesta.
                </li>
                <li>
                  Limpiá el chat y mandá <b>el mismo prompt</b> dos o tres veces más. Con
                  temperatura 0 deberían salir respuestas <b>casi idénticas</b>: la IA
                  siempre elige lo más probable.
                </li>
                <li>Subí el slider a <b>1.5</b> y repetí la prueba.</li>
                <li>
                  Ahora cada envío debería dar una respuesta muy distinta. Algunas
                  incluso medio delirantes. <b>Cambió la perilla, no el prompt.</b>
                </li>
                <li>
                  Subí a <b>2.0</b> y mandá de nuevo. Vas a ver respuestas que rompen
                  gramática o se van por ramas raras. Por eso 0.7 es default: el sweet
                  spot.
                </li>
              </ol>

              <h3>Detalles que vale conocer</h3>
              <ul>
                <li>
                  <b>Claude clampa a 0–1.</b> Si el slider está en 1.5 con provider
                  Claude, la app avisa con un hint amarillo y manda 1.0 al request. Es una
                  limitación del wrapper de Anthropic, no nuestra.
                </li>
                <li>
                  <b>OpenAI y LM Studio aceptan hasta 2.</b> Aprovechalos para ver el
                  caos en su máximo esplendor.
                </li>
                <li>
                  <b>Temperatura ≠ creatividad.</b> Temperatura es <i>variabilidad</i>.
                  Para tareas con una respuesta correcta (código, JSON, hechos) querés
                  bajita (0–0.3). Para brainstorming o ficción, alta (0.9–1.3).
                </li>
                <li>
                  <b>El parámetro viaja en el request.</b> Si abrís el panel "Request →
                  API (crudo)" después de mandar, vas a ver <code>"temperature": 1.5</code>{' '}
                  en el body. Con Ollama va anidado adentro de <code>options</code>.
                </li>
              </ul>

              <h3>Combinarlas: system + temperatura</h3>
              <p>
                Las dos perillas se multiplican. Un system <b>"Pirata bonaerense"</b> con
                temp <b>0</b> te da siempre la misma respuesta pirata. Con temp <b>1.5</b>,
                cada envío te da una respuesta pirata <i>distinta</i>, pero todas en
                personaje. El system define <i>quién</i> responde; la temperatura,
                <i>cuánto se anima</i> a variar dentro de ese personaje.
              </p>
            </div>
          </details>
            </div>
          </details>
        </section>

        {/* ============== ESTA APP vs AGENTES PRODUCTIVOS ============== */}
        <section className="criollo-section" id="vs-agentes">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>🛠️ Esta app vs. Claude Code / Cursor / Codex</span>
            </summary>
            <div className="docs-collapsible-body">
          <p>
            Pregunta que aparece sola después de jugar con el Loop Agéntico: <i>¿esto es lo
            mismo que Claude Code? ¿que Cursor? ¿que Codex?</i> La respuesta corta es <b>no, pero
            están construidos sobre exactamente lo que ves acá</b>. Esta sección existe para que
            cuando vuelvas a tu Cursor / Claude Code / Codex de todos los días, sepas qué está
            pasando por debajo y puedas usarlos mejor.
          </p>

          <h3>Las tres capas</h3>
          <ol>
            <li>
              <b>La API</b> (<code>/v1/chat/completions</code>, <code>/v1/messages</code>) —
              el motor HTTP. Stateless, sin manos. Le mandás JSON, te devuelve JSON. No lee tus
              archivos, no corre comandos, no recuerda nada entre requests. <b>Es el ladrillo.</b>
            </li>
            <li>
              <b>Esta app</b> — una linterna apuntando a la API. No agrega inteligencia, solo
              expone el JSON crudo, el contexto que se acumula, el loop de tool-use, los tokens.
              Sirve para <b>entender</b> — y también como <b>punto de partida para codear tu propia
              integración</b> contra la API (los wrappers en <code>src/openai.js</code>,{' '}
              <code>src/anthropic.js</code>, <code>src/ollama.js</code>, <code>src/lmstudio.js</code>{' '}
              son ejemplos mínimos y reusables).
            </li>
            <li>
              <b>Claude Code, Cursor, Codex / Copilot</b> — agentes productivos construidos{' '}
              <i>encima</i> de esa misma API. Le agregaron tools reales (filesystem, shell, git),
              gestión de contexto largo, permisos, UX de IDE / terminal. Sirven para <b>trabajar</b>.
            </li>
          </ol>

          <div className="prov-callout">
            <p>
              <b>Lo que ves en el Loop Agéntico es, en miniatura, lo que hace Claude Code cuando
              te responde.</b> Mismo loop, mismo <code>tool_use</code> → <code>tool_result</code>,
              mismo <code>messages[]</code> que crece. La diferencia son las tools (
              <code>Read</code>, <code>Edit</code>, <code>Bash</code>, <code>Grep</code>… vs. dos
              tools sobre un string) y la UX alrededor.
            </p>
          </div>

          <h3>Comparación lado a lado</h3>
          <div className="prov-table-wrap">
            <table className="prov-table">
              <thead>
                <tr>
                  <th>Aspecto</th>
                  <th className="prov-col-openai">Esta app</th>
                  <th className="prov-col-claude">Claude Code / Cursor / Codex</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Qué es</td>
                  <td>Cliente HTTP educativo</td>
                  <td>Agente de programación productivo</td>
                </tr>
                <tr>
                  <td>Tools disponibles</td>
                  <td>2-5 simuladas sobre un snippet en memoria</td>
                  <td>Decenas, sobre filesystem, git, shell reales</td>
                </tr>
                <tr>
                  <td>Sobre qué actúa</td>
                  <td>Un string de código en <code>localStorage</code></td>
                  <td>Tu repo, tu terminal, tu IDE</td>
                </tr>
                <tr>
                  <td>Gestión de contexto</td>
                  <td>Vos lo ves crudo y lo manejás</td>
                  <td>Automática (compaction, caching, file pinning)</td>
                </tr>
                <tr>
                  <td>Permisos / aprobaciones</td>
                  <td>Sentinel <code>NEEDS_HUMAN_APPROVAL</code> manual</td>
                  <td>Sistema de permisos, modos (plan, accept-edits), hooks</td>
                </tr>
                <tr>
                  <td>Archivo de reglas</td>
                  <td><code>AGENTS.md</code> en el editor de la app</td>
                  <td><code>CLAUDE.md</code>, <code>AGENTS.md</code>, <code>.cursorrules</code> en tu repo</td>
                </tr>
                <tr>
                  <td>Para qué sirve</td>
                  <td><b>Entender</b> cómo funciona por debajo</td>
                  <td><b>Trabajar</b> sobre código real</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Qué te llevás de acá para usar mejor tu agente</h3>
          <p>
            Cada modo de esta app te muestra una capa que en Claude Code / Cursor / Codex queda
            tapada. Cuando volvés a tu herramienta de todos los días, ya sabés qué está pasando:
          </p>
          <ul>
            <li>
              <b>💬 Chat → el contexto se paga.</b> Cuando tu Cursor "se vuelve lento" o "olvida
              cosas viejas", es porque el <code>messages[]</code> creció. Saber esto te explica
              por qué conviene abrir chats nuevos para tareas nuevas, y por qué los modelos con
              ventana de contexto más grande no son <i>gratis</i>: cada token de historial se cobra
              en cada turno.
            </li>
            <li>
              <b>💻 Editor → el código es contexto, nada más.</b> Cuando le pegás un snippet a
              Copilot Chat o le pedís a Cursor que mire un archivo, lo único que la IA "ve" es
              ese texto dentro de <code>messages[].content</code>. No "abre" tu archivo, no
              "entiende" tu proyecto — lee strings. Esto cambia cómo redactás prompts y por qué
              <i> qué le pegás</i> importa más que <i>cómo se lo pedís</i>.
            </li>
            <li>
              <b>🤖 Loop Agéntico → tu agente es un cerebro sin manos.</b> Cuando Claude Code
              dice "voy a leer X archivo" y después "voy a editar Y", son dos vueltas del loop
              que viste acá. Saber esto te ayuda a leer mejor lo que hace tu agente, a entender
              por qué a veces se traba ("se quedó pidiendo una tool que falla") y por qué tareas
              grandes consumen muchos turnos (= muchos tokens, = plata).
            </li>
            <li>
              <b>📋 AGENTS.md → las reglas viajan en cada request.</b> Tu <code>CLAUDE.md</code> /
              <code> .cursorrules</code> <b>no</b> "entrena" a la IA. Se concatena al system prompt
              en cada llamada. Por eso conviene que sea conciso (cada token cuenta, cada turno) y
              específico (lo genérico ya lo sabe el modelo). La comparación "con/sin" del modo 4
              es <i>literal</i> lo que ganás o perdés cuando lo escribís bien o mal.
            </li>
            <li>
              <b>🧑‍💻 Si vas a codear contra una API de IA, arrancá acá.</b> Los wrappers de esta app
              son el "hello world" de cada proveedor: armar el body, mandar el <code>fetch</code>,
              parsear la respuesta, manejar errores, exponer logs. Forkeás, le sacás la UI y te queda
              el cliente HTTP mínimo para meter en tu propio bot, script, backend o integración.
              No necesitás SDK: la API es JSON sobre HTTP y acá lo ves sin capas.
            </li>
          </ul>

          <div className="prov-callout">
            <p>
              <b>Modelo mental para usuarios de agentes:</b> tu Cursor / Claude Code / Codex es
              <i> esta app con muchas más tools y una UX prolija arriba</i>. Si entendés qué pasa
              en el panel derecho del Loop Agéntico, entendés qué está haciendo tu agente cuando
              "piensa". Si entendés por qué el array <code>messages[]</code> crece, entendés por
              qué tu sesión larga cuesta más y responde peor.
            </p>
            <p>
              <b>Y para quien quiere codear contra la API:</b> los cuatro wrappers de{' '}
              <code>src/</code> son tu plantilla. Mismo <code>fetch</code>, mismo body, mismo
              parseo — sin SDK, sin magia. Copiás, adaptás y ya tenés tu propia integración
              hablando con OpenAI, Anthropic, Ollama o LM Studio. <b>Ese es el doble objetivo
              de la app: entender lo que ya usás, y poder construir lo tuyo.</b>
            </p>
          </div>
            </div>
          </details>
        </section>

        {/* ============== APENDICE ============== */}
        <section className="criollo-section" id="glosario">
          <details className="docs-collapsible docs-section-collapsible">
            <summary>
              <span className="docs-collapsible-chev">▸</span>
              <span>📖 Glosario rápido</span>
            </summary>
            <div className="docs-collapsible-body">
          <ul>
            <li><b>Token</b> — la unidad mínima de texto que procesa el modelo. Un token ≈ 4 caracteres en español. Se cobra por token.</li>
            <li><b>Stateless</b> — sin memoria entre requests. Cada llamada es independiente; el "recuerdo" lo armás vos mandando el historial.</li>
            <li><b>System prompt</b> — instrucciones globales que le das a la IA (su "personalidad" o reglas). Va al principio del array <code>messages</code> con <code>role: "system"</code> (o aparte en el caso de Claude).</li>
            <li><b>Tool use / function calling</b> — feature de la API que permite declarar funciones que la IA puede pedir. Ella no las ejecuta, solo las pide.</li>
            <li><b>Loop agéntico</b> — el ciclo de pedir tool → ejecutar → devolver resultado → repetir, hasta que la IA termina.</li>
            <li><b>stop_reason / finish_reason</b> — por qué el modelo paró. <code>"end_turn"</code>/<code>"stop"</code> = terminó normal; <code>"tool_use"</code>/<code>"tool_calls"</code> = pidió una herramienta; <code>"max_tokens"</code> = se cortó.</li>
          </ul>
            </div>
          </details>
        </section>

        </div>
      </div>
    </div>
  )
}
