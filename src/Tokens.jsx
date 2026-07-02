import { useEffect, useMemo, useState } from 'react'
import Brand from './Brand.jsx'
import {
  encode as encodeO200k,
  decode as decodeO200k,
} from 'gpt-tokenizer/encoding/o200k_base'
import {
  encode as encodeCl100k,
  decode as decodeCl100k,
} from 'gpt-tokenizer/encoding/cl100k_base'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import WelcomeModal from './WelcomeModal.jsx'
import DemoBacklink from './DemoBacklink.jsx'

const TEXT_KEY = 'tokens_text'
const ENCODING_KEY = 'tokens_encoding'

// Tokenización 100% local: acá no hay fetch, no hay key, no hay API.
// El mismo BPE que usa OpenAI, corriendo en tu browser.
const ENCODINGS = {
  o200k_base: {
    label: 'o200k_base',
    models: 'gpt-4o, gpt-4o-mini, gpt-5, o1/o3',
    vocab: '~200.000 tokens',
    encode: encodeO200k,
    decode: decodeO200k,
  },
  cl100k_base: {
    label: 'cl100k_base',
    models: 'gpt-4, gpt-3.5-turbo, embeddings',
    vocab: '~100.000 tokens',
    encode: encodeCl100k,
    decode: decodeCl100k,
  },
}

// Precios de lista por 1M de tokens de INPUT (junio 2026). Pueden cambiar:
// verificar en la página de pricing de cada proveedor.
const PRICES = [
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini', perMillion: 0.15, exact: true },
  { id: 'gpt-4o', label: 'gpt-4o', perMillion: 2.5, exact: true },
  { id: 'claude-haiku-4-5', label: 'claude-haiku-4-5', perMillion: 1.0, exact: false },
  { id: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6', perMillion: 3.0, exact: false },
]

const PRESETS = [
  {
    id: 'idiomas',
    label: '🇦🇷 vs 🇬🇧 Idiomas',
    text: 'La inteligencia artificial está transformando la manera en que trabajamos.\nArtificial intelligence is transforming the way we work.',
    hint: 'La misma idea en castellano gasta más tokens que en inglés: el BPE se entrenó mayormente con texto en inglés.',
  },
  {
    id: 'numeros',
    label: '🔢 Números',
    text: 'El resultado de 987654321 multiplicado por 123456789 es 121932631112635269.',
    hint: 'Los números se parten en pedazos arbitrarios ("123" + "45"). Por eso a un predictor de tokens le cuesta la aritmética.',
  },
  {
    id: 'palabras',
    label: '🧬 Palabras largas',
    text: 'hola casa perro electroencefalografista otorrinolaringólogo anticonstitucionalmente',
    hint: 'Las palabras frecuentes son 1 token; las raras se arman con varios pedazos.',
  },
  {
    id: 'emojis',
    label: '🧉 Emojis',
    text: 'Tomando unos mates 🧉 mientras programo 👩‍💻 en Buenos Aires 🇦🇷',
    hint: 'Un emoji puede ser varios tokens, y algunos tokens cortan un carácter por la mitad (vas a ver el símbolo �).',
  },
  {
    id: 'codigo',
    label: '💻 Código',
    text: 'function suma(a, b) {\n  return a + b;\n}\nconsole.log(suma(2, 3));',
    hint: 'La indentación y los símbolos también son tokens. Mirá cuántos tokens son solo espacios.',
  },
]

// Paleta para alternar colores entre tokens vecinos. El color NO significa
// nada (a diferencia de /logprobs): solo hace visibles los límites.
const TOKEN_HUES = [210, 280, 150, 30, 340]

const tokenColor = (i) => {
  const hue = TOKEN_HUES[i % TOKEN_HUES.length]
  return {
    background: `hsla(${hue}, 70%, 50%, 0.22)`,
    borderColor: `hsla(${hue}, 70%, 60%, 0.55)`,
  }
}

// Igual que en /logprobs: espacios y saltos de línea son PARTE del token.
const displayToken = (token) =>
  token.replace(/ /g, '␣').replace(/\n/g, '⏎') || '∅'

const toHexBytes = (str) =>
  Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ')

const fmtCost = (usd) => {
  if (usd === 0) return '$0'
  if (usd < 0.0001) return `$${usd.toExponential(2)}`
  return `$${usd.toFixed(6)}`
}

export default function Tokens() {
  const [text, setText] = useState(() => localStorage.getItem(TEXT_KEY) ?? '')
  const [encodingId, setEncodingId] = useState(() => {
    const saved = localStorage.getItem(ENCODING_KEY)
    return ENCODINGS[saved] ? saved : 'o200k_base'
  })
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [activeHint, setActiveHint] = useState(null)

  useEffect(() => { localStorage.setItem(TEXT_KEY, text) }, [text])
  useEffect(() => { localStorage.setItem(ENCODING_KEY, encodingId) }, [encodingId])

  const encoding = ENCODINGS[encodingId]
  const otherId = encodingId === 'o200k_base' ? 'cl100k_base' : 'o200k_base'

  const tokens = useMemo(() => {
    if (!text) return []
    const ids = encoding.encode(text)
    return ids.map((id) => ({ id, text: encoding.decode([id]) }))
  }, [text, encodingId])

  const otherCount = useMemo(
    () => (text ? ENCODINGS[otherId].encode(text).length : 0),
    [text, otherId],
  )

  const selected = selectedIdx != null && selectedIdx < tokens.length
    ? tokens[selectedIdx]
    : null

  const chars = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const ratio = tokens.length > 0 ? (chars / tokens.length).toFixed(2) : '—'

  const handleClear = () => {
    setText('')
    setSelectedIdx(null)
    setActiveHint(null)
  }

  return (
    <div className="app">
      <WelcomeModal />
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label="Ir al inicio">
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <Brand />
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// experimento · <span className="brand-mode">Tokens</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="tokens" />
        </div>
      </header>

      <DemoBacklink href="/demo/tokens" />

      <ConfigBar>
        <label className="hdr-select">
          <span className="hdr-select-label">Tokenizer</span>
          <select
            value={encodingId}
            onChange={(e) => {
              setEncodingId(e.target.value)
              setSelectedIdx(null)
            }}
            className="hdr-select-input"
            title="Cada familia de modelos tiene su propio vocabulario BPE. El mismo texto da distinta cantidad de tokens según el tokenizer."
          >
            {Object.entries(ENCODINGS).map(([id, enc]) => (
              <option key={id} value={id}>
                {enc.label} — {enc.models}
              </option>
            ))}
          </select>
        </label>

        <span className="context-meta" title="Acá no viaja nada a ninguna API: el BPE corre entero en tu browser.">
          ⚡ 100% local · sin API · sin key
        </span>

        <button onClick={handleClear} className="clear-btn" type="button">
          Limpiar
        </button>
      </ConfigBar>

      <div className="layout tk-layout">
        {/* Panel 1 — Texto → tokens */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>El texto se convierte en tokens</span>
            <span className="context-meta">{encoding.label} · vocabulario de {encoding.vocab}</span>
          </div>

          <div className="razon-presets">
            <span className="razon-presets-label">Probá uno:</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="razon-preset-btn"
                onClick={() => {
                  setText(p.text)
                  setSelectedIdx(null)
                  setActiveHint(p.hint)
                }}
                title={p.hint}
              >
                {p.label}
              </button>
            ))}
          </div>

          {activeHint && <div className="tk-hint">💡 {activeHint}</div>}

          <textarea
            className="tk-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setSelectedIdx(null)
            }}
            placeholder="Escribí o pegá cualquier texto y miralo partirse en tokens en vivo…"
            rows={4}
          />

          <div className="lp-result">
            {tokens.length === 0 && (
              <div className="empty">
                Antes de que el modelo vea una sola letra, el texto se parte en <b>tokens</b>:
                pedazos de texto de un vocabulario fijo, elegidos por frecuencia (BPE).
                Todo lo que ya viste en la app — la ventana de contexto, el costo,
                los logprobs — se mide en estas piezas. Escribí algo o mandá un preset.
              </div>
            )}

            {tokens.length > 0 && (
              <>
                <div className="lp-strip-header">
                  <span>🔡 {tokens.length} token(s)</span>
                  <span className="context-meta">tocá un token para ver su ID y sus bytes</span>
                </div>
                <div className="lp-strip">
                  {tokens.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`lp-token${selectedIdx === i ? ' lp-token-selected' : ''}`}
                      style={tokenColor(i)}
                      onClick={() => setSelectedIdx(i)}
                      title={`"${displayToken(t.text)}" · id ${t.id}`}
                    >
                      {displayToken(t.text)}
                    </button>
                  ))}
                </div>

                <div className="lp-legend">
                  <span className="lp-legend-label">
                    Los colores solo marcan los límites entre tokens — no significan nada
                    (en /logprobs sí: ahí el color es probabilidad).
                  </span>
                </div>

                <div className="razon-usage">
                  <div className="razon-usage-row">
                    <span>Tokens ({encoding.label})</span>
                    <span><b>{tokens.length}</b></span>
                  </div>
                  <div className="razon-usage-row">
                    <span>Tokens ({ENCODINGS[otherId].label})</span>
                    <span><b>{otherCount}</b></span>
                  </div>
                  <div className="razon-usage-row">
                    <span>Caracteres / palabras</span>
                    <span><b>{chars}</b> / <b>{words}</b></span>
                  </div>
                  <div className="razon-usage-row">
                    <span>Caracteres por token</span>
                    <span><b>{ratio}</b></span>
                  </div>
                  <div className="razon-usage-foot">
                    La regla de pulgar "1 token ≈ 4 caracteres" vale para inglés.
                    En castellano suele dar menos: nuestro idioma gasta más tokens
                    por el mismo contenido, y eso se paga en plata y en ventana de contexto.
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Panel 2 — Lo que ve el modelo */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>Lo que ve el modelo</span>
            <span className="panel-links">
              <a
                href="https://platform.openai.com/tokenizer"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title="El tokenizer oficial de OpenAI, para comparar"
              >
                tokenizer oficial ↗
              </a>
            </span>
          </div>
          <pre className="raw">
            {tokens.length > 0
              ? JSON.stringify(tokens.map((t) => t.id))
              : '// El modelo nunca ve letras: ve esta lista de números.\n// Escribí algo en el panel de la izquierda.'}
          </pre>

          {selected && (
            <div className="lp-detail tk-detail">
              <div className="lp-detail-header">
                <span>
                  Token #{selectedIdx + 1}: <code className="lp-detail-token">{displayToken(selected.text)}</code>
                </span>
                <span className="context-meta">id {selected.id} de {encoding.vocab}</span>
              </div>
              <div className="razon-usage-row">
                <span>Texto</span>
                <span><b>"{selected.text}"</b> ({selected.text.length} caracter(es))</span>
              </div>
              <div className="razon-usage-row">
                <span>Bytes UTF-8</span>
                <span><b>{toHexBytes(selected.text)}</b></span>
              </div>
              {selected.text.includes('�') && (
                <div className="lp-detail-foot">
                  Ese � significa que este token corta un carácter multi-byte (emoji, tilde rara)
                  por la mitad: el pedazo solo no es texto válido. El carácter completo
                  recién aparece al juntar este token con el siguiente.
                </div>
              )}
            </div>
          )}

          <div className="panel-title panel-title-sub">
            <span>¿Cuánto cuesta este texto como input?</span>
          </div>
          <div className="tk-cost">
            <table className="tk-cost-table">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>$/1M input</th>
                  <th>Este texto</th>
                  <th>×1.000 requests</th>
                </tr>
              </thead>
              <tbody>
                {PRICES.map((m) => {
                  const cost = (tokens.length / 1_000_000) * m.perMillion
                  return (
                    <tr key={m.id}>
                      <td><code>{m.label}</code>{!m.exact && ' *'}</td>
                      <td>${m.perMillion.toFixed(2)}</td>
                      <td>{fmtCost(cost)}</td>
                      <td>{fmtCost(cost * 1000)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="razon-usage-foot">
              * Anthropic usa otro tokenizer (no es público), así que para Claude el conteo
              es aproximado — el número exacto lo da su API con <code>/v1/messages/count_tokens</code>.
              Precios de lista por tokens de <b>input</b>; el output se cobra aparte y más caro.
              Acordate del modo <b>Conversación</b> del Chat: el historial completo viaja
              en cada request, así que este costo se paga de nuevo en cada turno.
            </div>
          </div>

          <details className="field-guide">
            <summary>¿Cómo se decide qué es un token? (BPE en 1 minuto)</summary>
            <ul>
              <li><b>Byte Pair Encoding</b>: se arranca con bytes sueltos y se van fusionando los pares más frecuentes del corpus de entrenamiento hasta armar un vocabulario fijo (~100k o ~200k entradas).</li>
              <li>Por eso <code>" hola"</code> (con espacio) es 1 token pero <code>"electroencefalografista"</code> son varios: la frecuencia manda.</li>
              <li>El espacio inicial es parte del token: <code>"hola"</code> y <code>" hola"</code> son IDs distintos.</li>
              <li>Los modelos nuevos de OpenAI usan <code>o200k_base</code>; los viejos, <code>cl100k_base</code>. Cambiá el selector y mirá cómo el mismo texto da otra cantidad.</li>
              <li>Esto conecta con <a href="/logprobs">/logprobs</a>: ahí el modelo predice <b>el próximo ID de esta lista</b>, con una probabilidad para cada uno de los ~200.000 candidatos.</li>
              <li>Y con <a href="/ventana-contexto">/ventana-contexto</a>: el límite del modelo se mide en estos tokens, no en caracteres ni palabras.</li>
            </ul>
          </details>
        </section>
      </div>
    </div>
  )
}
