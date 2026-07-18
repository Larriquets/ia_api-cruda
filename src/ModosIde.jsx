import { useEffect, useRef, useState } from 'react'
import DocsNav from './DocsNav.jsx'
import SpeechReader from './SpeechReader.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import { useT } from './i18n/useT.js'

/**
 * /demo/ide — el POST que arma tu IDE, paso a paso.
 *
 * Animación en 4 pasos, sin API ni key: destapa lo que un IDE agéntico
 * (Cursor, Claude Code, Copilot…) mete al request antes de mandarlo, el
 * JSON que sale de verdad y el tool_call que vuelve. El foco: el IDE no
 * es magia — es un armador de contexto arriba del mismo POST de siempre.
 * Doc hermana: /ides (el mapa feature → mecanismo → lab).
 */

const TOTAL_STEPS = 4

export default function ModosIde() {
  const { t, lang } = useT()
  const L = (es, en) => (lang === 'en' ? en : es)

  const [step, setStep] = useState(0)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const autoTimerRef = useRef(null)

  const isDone = step >= TOTAL_STEPS
  const isFresh = step === 0

  const advance = () => {
    if (isDone) return
    setStep((s) => s + 1)
  }

  const reset = () => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = null
    setAutoPlaying(false)
    setStep(0)
  }

  useEffect(() => {
    if (!autoPlaying) return
    if (step >= TOTAL_STEPS) {
      setAutoPlaying(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS))
    }, 2800)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [autoPlaying, step])

  const stepNames = [
    L('Lo que vos ves: el chat del IDE', 'What you see: the IDE chat'),
    L('Lo que el IDE junta sin avisarte', 'What the IDE gathers without telling you'),
    L('El POST que sale de verdad', 'The POST that actually goes out'),
    L('La vuelta: un pedido de edición, no una edición', 'The return: an edit request, not an edit'),
  ]

  return (
    <div className="criollo">
      <header className="header">
        <h1>
          /demo/ide
          <span className="docs-header-subtitle">{L('el POST que arma tu IDE, paso a paso', 'the POST your IDE builds, step by step')}</span>
        </h1>
        <div className="header-actions">
          <LanguageToggle />
          <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
        </div>
      </header>

      <div className="criollo-content docs-layout">
        <aside className="docs-sidebar" aria-label={t('docpage.navAria')}>
          <SpeechReader containerSelector=".docs-main" lang={lang} />
          <DocsNav current="demo-ide" />
          <div className="mch-aside-tip">
            <div className="mch-aside-tip-title">{L('¿Para qué sirve esta página?', "What's this page for?")}</div>
            <p>
              {L('Cursor, Claude Code o Copilot no hacen magia: arman un POST con system, contexto y tools — el mismo de toda esta app — y te lo esconden. Esta demo lo destapa, sin API ni key.', "Cursor, Claude Code or Copilot don't do magic: they build a POST with system, context and tools — the same one as everywhere in this app — and hide it from you. This demo lifts the hood, no API, no key.")}
            </p>
          </div>
        </aside>

        <div className="docs-main">

          <section className="criollo-section" id="intro">
            <h2>🖥 {L('Un armador de contexto con botones lindos', 'A context builder with nice buttons')}</h2>
            <p>
              {L('Tipeás una frase en el chat del IDE y "el agente arregla el bug". Entre esas dos cosas pasa todo lo que esta app enseña: reglas inyectadas al system, archivos pegados al contexto, tools declaradas y un tool_call de vuelta. Mirá el viaje completo de un pedido real.', 'You type one sentence into the IDE chat and "the agent fixes the bug". Between those two things happens everything this app teaches: rules injected into the system, files pasted into the context, declared tools and a tool_call coming back. Watch one real request travel the full circuit.')}
            </p>
            <div className="prov-callout">
              <p>
                {L('El intercambio está', 'The exchange is')} <b>{L('mockeado', 'mocked')}</b> {L('(calcado de lo que mandan los IDEs reales, simplificado). El mapa completo feature → mecanismo → lab está en la doc', '(traced from what real IDEs send, simplified). The full feature → mechanism → lab map lives in the doc')} <a href="/ides">/ides</a>.
              </p>
            </div>
          </section>

          {/* ============== CONTROLES ============== */}
          <section className="criollo-section mch-controls-section">
            <div className="mch-controls">
              <div className="mch-progress">
                <span className="mch-progress-label">{L('Paso:', 'Step:')}</span>
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={`mch-progress-dot${step >= n ? ' is-done' : ''}`}>{n}</span>
                ))}
                <span className="mch-progress-meta">
                  {isFresh && L('— todavía no pasó nada', '— nothing happened yet')}
                  {!isFresh && !isDone && `— ${stepNames[step - 1]}`}
                  {isDone && L('— circuito completo', '— full circuit')}
                </span>
              </div>
              <div className="mch-buttons">
                <button type="button" className="mch-btn mch-btn-primary" onClick={advance} disabled={isDone || autoPlaying}>
                  ▶ {L('Siguiente paso', 'Next step')}
                </button>
                <button type="button" className="mch-btn" onClick={() => setAutoPlaying((v) => !v)} disabled={isDone}>
                  {autoPlaying ? L('⏸ Pausar', '⏸ Pause') : L('▶▶ Auto', '▶▶ Auto')}
                </button>
                <button type="button" className="mch-btn" onClick={reset} disabled={step === 0 && !autoPlaying}>
                  ↺ {L('Reiniciar', 'Reset')}
                </button>
              </div>
            </div>

            <div className="mch-prompt-preview">
              <span className="mch-prompt-label">{L('Lo que tipeaste en el IDE:', 'What you typed in the IDE:')}</span>
              <span className="mch-prompt-text">"{L('Arreglá el bug: el descuento se aplica dos veces en checkout.js', 'Fix the bug: the discount is applied twice in checkout.js')}"</span>
            </div>
          </section>

          {/* ============== LOS PASOS ============== */}
          <section className="criollo-section">

            {/* Paso 1: lo que ves */}
            {step >= 1 && (
              <div className="mtk-block">
                <div className="mrg-col-title">1 · {stepNames[0]}</div>
                <div className="mch-payload">
                  <div className="mch-payload-label">{L('El panel del agente, tal como te lo muestra el IDE', 'The agent panel, as the IDE shows it to you')}</div>
                  <div className="mch-msglist">
                    <div className={`mch-msg mch-msg-user${step === 1 ? ' mch-msg-new' : ''}`}>
                      <span className="mch-role mch-role-user">{L('vos', 'you')}</span>
                      <span className="mch-content mrg-user-content">{L('Arreglá el bug: el descuento se aplica dos veces en checkout.js', 'Fix the bug: the discount is applied twice in checkout.js')}</span>
                    </div>
                  </div>
                </div>
                {step === 1 && <div className="mch-takeaway">{L('Una frase, un botón. Esto es lo único que ves — y es la parte más chica de lo que está por viajar.', "One sentence, one button. This is all you see — and it's the smallest part of what's about to travel.")}</div>}
              </div>
            )}

            {/* Paso 2: lo que el IDE junta */}
            {step >= 2 && (
              <div className="mtk-block">
                <div className="mrg-col-title">2 · {stepNames[1]}</div>
                <div className="mch-payload">
                  <div className="mch-payload-label">{L('Los ingredientes que el IDE suma antes de mandar', 'The ingredients the IDE adds before sending')}</div>
                  <ul>
                    <li>📋 <b>{L('Tus reglas', 'Your rules')}</b> (<code>.cursorrules</code> / <code>CLAUDE.md</code> / <code>AGENTS.md</code>) — {L('van derecho al system prompt', 'go straight into the system prompt')}</li>
                    <li>📄 <b>checkout.js</b> — {L('el archivo abierto, pegado entero al contexto', 'the open file, pasted whole into the context')}</li>
                    <li>🛠 <b>{L('Las tools del IDE', "The IDE's tools")}</b> — <code>read_file</code>, <code>edit_file</code>, <code>run_command</code>, {L('declaradas en el request', 'declared in the request')}</li>
                    <li>💬 <b>{L('El historial del chat', 'The chat history')}</b> — {L('todos los turnos anteriores de esta conversación', 'every previous turn of this conversation')}</li>
                  </ul>
                </div>
                {step === 2 && <div className="mch-takeaway">{L('Nada de esto se ve en el panel, pero todo esto son tokens: lo pagás y compite por la atención del modelo. Por eso importa qué archivos mencionás y qué reglas escribís.', "None of this is visible in the panel, but all of it is tokens: you pay for it and it competes for the model's attention. That's why which files you mention and which rules you write matters.")}</div>}
              </div>
            )}

            {/* Paso 3: el POST */}
            {step >= 3 && (
              <div className="mtk-block">
                <div className="mrg-col-title">3 · {stepNames[2]}</div>
                <div className="cf-json-legend">
                  <span className="cf-json-legend-item cf-pill-system">🧠 system</span>
                  <span className="cf-json-legend-item cf-pill-context">💬 context</span>
                  <span className="cf-json-legend-item cf-pill-tools">🛠️ tools</span>
                </div>
                <pre className="cf-json">
                  <code>
                    <span className="cf-json-url">POST https://api.{L('proveedor', 'provider')}.com/v1/…</span>
                    {'\n\n'}
                    {'{\n'}
                    <span className="cf-hl cf-hl-context" data-tag="💬 context">
                      {'  "messages": [\n'}
                      <span className="cf-hl-nested cf-hl-system" data-tag="🧠 system">
                        {'    { "role": "system", "content": "'}{L('Sos el agente del IDE… ', 'You are the IDE agent… ')}
                        {'➕ '}{L('[tus reglas de .cursorrules / AGENTS.md]', '[your rules from .cursorrules / AGENTS.md]')}{'" },\n'}
                      </span>
                      {'    { "role": "user", "content": "'}{L('Archivo abierto checkout.js:\\n[…120 líneas…]', 'Open file checkout.js:\\n[…120 lines…]')}{'" },\n'}
                      {'    { "role": "user", "content": "'}{L('Arreglá el bug: el descuento se aplica dos veces…', 'Fix the bug: the discount is applied twice…')}{'" }\n'}
                      {'  ],\n'}
                    </span>
                    <span className="cf-hl cf-hl-tools" data-tag="🛠️ tools">
                      {'  "tools": [\n'}
                      {'    { "name": "read_file",   "description": "…", "parameters": {…} },\n'}
                      {'    { "name": "edit_file",   "description": "…", "parameters": {…} },\n'}
                      {'    { "name": "run_command", "description": "…", "parameters": {…} }\n'}
                      {'  ]\n'}
                    </span>
                    {'}'}
                  </code>
                </pre>
                {step === 3 && <div className="mch-takeaway">{L('Las mismas tres piezas de siempre: system, context y tools. Tu frase es una entrada más de messages[] — el IDE armó todo el resto.', 'The same three pieces as always: system, context and tools. Your sentence is just one entry in messages[] — the IDE built everything else.')}</div>}
              </div>
            )}

            {/* Paso 4: la vuelta */}
            {step >= 4 && (
              <div className="mtk-block">
                <div className="mrg-col-title">4 · {stepNames[3]}</div>
                <div className="mch-payload">
                  <div className="mch-payload-label">← {L('respuesta del modelo (texto, no acción)', "the model's reply (text, not action)")}</div>
                  <div className="mch-msglist">
                    <div className="mch-msg mch-msg-system mch-msg-new">
                      <span className="mch-role mch-role-system">tool_call</span>
                      <span className="mch-content mrg-user-content">{'{"name":"edit_file","arguments":{"path":"checkout.js","old_string":"total = aplicarDescuento(aplicarDescuento(total))","new_string":"total = aplicarDescuento(total)"}}'}</span>
                    </div>
                  </div>
                </div>
                <div className="mch-payload">
                  <div className="mch-payload-label">{L('El IDE ejecuta la edición y te muestra el diff', 'The IDE executes the edit and shows you the diff')}</div>
                  <pre className="cf-json">
                    <code>
                      <span className="mid-diff-del">{'- total = aplicarDescuento(aplicarDescuento(total))\n'}</span>
                      <span className="mid-diff-add">{'+ total = aplicarDescuento(total)'}</span>
                    </code>
                  </pre>
                </div>
                <div className="mch-takeaway">{L('El modelo nunca tocó tu disco: pidió una edición por escrito y el IDE la ejecutó. El botón de "aprobar" vive exactamente en ese medio — usalo.', 'The model never touched your disk: it requested an edit in writing and the IDE executed it. The "approve" button lives exactly in that gap — use it.')}</div>
              </div>
            )}

            {step >= 4 && (
              <div className="mch-reply">
                <div className="mch-reply-label">{L('Lo que el IDE te muestra al final:', 'What the IDE shows you at the end:')}</div>
                <div className="mch-reply-text">🤖 {L('Listo: el descuento se aplicaba dos veces, dejé una sola llamada a aplicarDescuento().', 'Done: the discount was applied twice, I left a single call to aplicarDescuento().')}</div>
              </div>
            )}
          </section>

          {/* ============== CIERRE ============== */}
          <section className="criollo-section demo-closing" id="cierre">
            <h2>📌 {L('Lo que importa', 'What matters')}</h2>
            <ul>
              <li>
                <b>{L('El IDE es un armador de contexto', 'The IDE is a context builder')}</b>: {L('reglas, archivos, historial y tools terminan en el mismo POST de toda esta app. La UI solo lo esconde.', 'rules, files, history and tools end up in the same POST as everywhere in this app. The UI just hides it.')}
              </li>
              <li>
                <b>{L('La calidad se decide antes de mandar', 'Quality is decided before sending')}</b>: {L('qué reglas escribís, qué archivos mencionás y cuánto ruido arrastra el chat pesa más que el "prompt perfecto".', 'which rules you write, which files you mention and how much noise the chat drags along weighs more than the "perfect prompt".')}
              </li>
              <li>
                <b>{L('El modelo pide, el IDE ejecuta', 'The model asks, the IDE executes')}</b>: {L('cada edición es un tool_call que alguien aprueba. Ese alguien sos vos.', 'every edit is a tool_call someone approves. That someone is you.')}
              </li>
            </ul>
            <div className="demo-closing-ctas">
              <a href="/ides" className="demo-closing-cta">
                <span className="demo-closing-cta-emoji">🖥</span>
                <span>
                  <b>{L('¿El mapa completo feature → mecanismo → lab, con buenas prácticas?', 'The full feature → mechanism → lab map, with best practices?')}</b>
                  <span className="demo-closing-cta-sub">→ /ides</span>
                </span>
              </a>
              <a href="/loop-agentico" className="demo-closing-cta">
                <span className="demo-closing-cta-emoji">🔬</span>
                <span>
                  <b>{L('¿Querés correr este ciclo de verdad, con tu key y el JSON a la vista?', 'Want to run this cycle for real, with your key and the JSON in sight?')}</b>
                  <span className="demo-closing-cta-sub">→ /loop-agentico</span>
                </span>
              </a>
            </div>
          </section>

          <footer className="criollo-footer">
            <a href="/" className="clear-btn">{t('docpage.backToModes')}</a>
          </footer>

        </div>
      </div>
    </div>
  )
}
