import { useCallback, useEffect, useRef, useState } from 'react'
import Brand from './Brand.jsx'
import { embedTexts, cosineSimilarity, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from './openai-embeddings.js'
import { sendChatMessage, OPENAI_CHAT_MODELS } from './openai.js'
import ModeSwitch from './ModeSwitch.jsx'
import ConfigBar from './ConfigBar.jsx'
import { useT } from './i18n/useT.js'

const DOCS_KEY = 'rag_docs'
const DIMS_KEY = 'rag_dims'
const TOPK_KEY = 'rag_topk'
const MODEL_KEY = 'rag_model'
const SYSTEM_KEY = 'rag_system'
const LOGS_KEY = 'rag_logs'
const LOGS_MAX = 300

// La biblioteca default es de una empresa FICTICIA a propósito: el modelo no
// puede saber estos datos de entrenamiento, así que si la respuesta es
// correcta, la única explicación posible es que salió de la recuperación.
// Contenido por idioma (mismo patrón que RecorridoBody), no claves t().
const CONTENT = {
  es: {
    docs: [
      'Los empleados de Ferretería Espacial S.A. tienen 19 días hábiles de vacaciones por año. Los días no usados vencen el 31 de marzo del año siguiente.',
      'El horario de oficina es de 9:14 a 17:44. Los viernes se sale a las 15:14. La puntualidad se controla con el molinete del subsuelo.',
      'El comedor sirve milanesas los miércoles. El menú vegetariano se pide con 48 horas de anticipación al interno 404.',
      'La impresora del piso 3 se llama ROBUSTA-9. Para imprimir en color hay que pedirle la clave del día a Marta, de Compras.',
      'La licencia por mudanza es de 2 días corridos. Se avisa por mail a rrhh@ferreteriaespacial.com con al menos una semana de anticipación.',
      'La red wifi de invitados se llama FERRETERIA-VISITAS. La clave se renueva cada lunes y Sistemas la publica en la cartelera del ascensor.',
    ],
    presets: [
      { id: 'vacas', label: '🏖 Vacaciones', text: '¿Cuántos días de vacaciones tengo y cuándo vencen?' },
      { id: 'color', label: '🖨 Imprimir en color', text: '¿Cómo hago para imprimir en color?' },
      { id: 'miercoles', label: '🍽 Miércoles', text: '¿Qué se come los miércoles en el comedor?' },
      { id: 'trampa', label: '🕳 Trampa (no está)', text: '¿Cuál es la política de home office de la empresa?' },
    ],
    defaultSystem:
      'Sos el asistente interno de Ferretería Espacial S.A. Respondé usando SOLO la información de los documentos provistos en el mensaje. Si la respuesta no figura en los documentos, decilo explícitamente y no inventes nada. Respondé en castellano rioplatense, corto y sin Markdown.',
    docsLabel: '[DOCUMENTOS RECUPERADOS]',
    questionLabel: '[PREGUNTA]',
  },
  en: {
    docs: [
      'Employees of Space Hardware Store Inc. get 19 business days of vacation per year. Unused days expire on March 31st of the following year.',
      'Office hours are 9:14 to 17:44. On Fridays everyone leaves at 15:14. Punctuality is tracked by the basement turnstile.',
      'The cafeteria serves milanesas on Wednesdays. The vegetarian menu must be requested 48 hours in advance at extension 404.',
      'The 3rd-floor printer is called ROBUSTA-9. To print in color you must ask Marta, from Purchasing, for the daily password.',
      'Moving leave is 2 consecutive days. Notify by email to hr@spacehardwarestore.com at least one week in advance.',
      'The guest wifi network is called HARDWARE-GUESTS. The password rotates every Monday and IT posts it on the elevator notice board.',
    ],
    presets: [
      { id: 'vacas', label: '🏖 Vacation', text: 'How many vacation days do I get and when do they expire?' },
      { id: 'color', label: '🖨 Color printing', text: 'How do I print in color?' },
      { id: 'miercoles', label: '🍽 Wednesdays', text: 'What does the cafeteria serve on Wednesdays?' },
      { id: 'trampa', label: '🕳 Trap (not there)', text: 'What is the company’s work-from-home policy?' },
    ],
    defaultSystem:
      'You are the internal assistant of Space Hardware Store Inc. Answer using ONLY the information in the documents provided in the message. If the answer is not in the documents, say so explicitly and do not make anything up. Answer briefly, without Markdown.',
    docsLabel: '[RETRIEVED DOCUMENTS]',
    questionLabel: '[QUESTION]',
  },
}

const TOPK_OPTIONS = [1, 2, 3]

const safeReadJSON = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const cleanDocs = (docs) => docs.map((d) => d.trim()).filter(Boolean)

const vectorPreview = (vec) =>
  `[${vec.slice(0, 5).map((n) => n.toFixed(3)).join(', ')}, …]`

const snippet = (text, max = 48) =>
  text.length > max ? `${text.slice(0, max)}…` : text

export default function Rag() {
  const { t, lang } = useT()
  const content = CONTENT[lang] || CONTENT.es

  const [docs, setDocs] = useState(() => {
    const stored = safeReadJSON(DOCS_KEY)
    return Array.isArray(stored) && stored.length > 0 ? stored : CONTENT[localStorage.getItem('lang') || 'es']?.docs || CONTENT.es.docs
  })
  const [dims, setDims] = useState(() => {
    const parsed = parseInt(localStorage.getItem(DIMS_KEY), 10)
    return EMBEDDING_DIMENSIONS.includes(parsed) ? parsed : 64
  })
  const [topK, setTopK] = useState(() => {
    const parsed = parseInt(localStorage.getItem(TOPK_KEY), 10)
    return TOPK_OPTIONS.includes(parsed) ? parsed : 2
  })
  const [model, setModel] = useState(
    () => localStorage.getItem(MODEL_KEY) || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
  )
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem(SYSTEM_KEY) ?? '')

  // index = foto de la biblioteca al momento de indexar. Si docs cambia
  // después, el índice queda "viejo" y la UI pide reindexar.
  const [index, setIndex] = useState(null)
  const [question, setQuestion] = useState('')
  const [ranking, setRanking] = useState(null)
  const [sentMessages, setSentMessages] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [questionUsage, setQuestionUsage] = useState(null)

  const [indexing, setIndexing] = useState(false)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState(null)
  const [rawRequest, setRawRequest] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [logs, setLogs] = useState(() => safeReadJSON(LOGS_KEY) || [])

  const logRef = useRef(null)
  const loading = indexing || asking

  useEffect(() => { localStorage.setItem(DOCS_KEY, JSON.stringify(docs)) }, [docs])
  useEffect(() => { localStorage.setItem(DIMS_KEY, String(dims)) }, [dims])
  useEffect(() => { localStorage.setItem(TOPK_KEY, String(topK)) }, [topK])
  useEffect(() => { localStorage.setItem(MODEL_KEY, model) }, [model])
  useEffect(() => { localStorage.setItem(SYSTEM_KEY, systemPrompt) }, [systemPrompt])
  useEffect(() => {
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(-LOGS_MAX)))
    } catch { /* noop */ }
  }, [logs])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  const appendLog = useCallback((level, message) => {
    const locale = (localStorage.getItem('lang') || 'es') === 'en' ? 'en-US' : 'es-AR'
    const timestamp = new Date().toLocaleTimeString(locale, { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [])

  const currentDocTexts = cleanDocs(docs)
  const indexFresh =
    index != null &&
    index.dims === dims &&
    JSON.stringify(index.docTexts) === JSON.stringify(currentDocTexts)

  const handleIndex = async () => {
    if (loading || currentDocTexts.length === 0) return
    setIndexing(true)
    setError(null)
    setRanking(null)
    setAnswer(null)
    setSentMessages(null)
    appendLog('user', t('rag.logIndex', { n: currentDocTexts.length }))

    try {
      const result = await embedTexts(currentDocTexts, {
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
        dimensions: dims,
      })
      setIndex({ docTexts: currentDocTexts, vectors: result.embeddings, dims, usage: result.usage })
    } catch (err) {
      setError(err.message || 'Error')
      appendLog('error', err.message || 'Error')
    } finally {
      setIndexing(false)
    }
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    const qText = question.trim()
    if (!qText || loading || !indexFresh) return

    setAsking(true)
    setError(null)
    setRanking(null)
    setAnswer(null)
    setSentMessages(null)
    appendLog('user', t('rag.logQuestion', { q: qText }))

    try {
      // Paso A: embeber la pregunta (mismo espacio vectorial que la biblioteca).
      const qResult = await embedTexts([qText], {
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
        dimensions: dims,
      })
      const qVector = qResult.embeddings[0]
      setQuestionUsage(qResult.usage)

      // Paso B: similitud coseno contra cada doc — esto corre EN EL BROWSER,
      // la API no participa de la búsqueda.
      const scored = index.vectors
        .map((vec, i) => ({ i, score: cosineSimilarity(qVector, vec) }))
        .sort((a, b) => b.score - a.score)
      setRanking(scored)
      appendLog('info', t('rag.logRanking', {
        top: scored.slice(0, topK).map(({ i, score }) => `#${i + 1} (${score.toFixed(3)})`).join(', '),
      }))

      // Paso C: inyectar el top-K al prompt y preguntar al chat de siempre.
      const chosen = scored.slice(0, topK)
      const contextBlock = chosen
        .map(({ i }, n) => `[DOC ${n + 1}]\n${index.docTexts[i]}`)
        .join('\n\n')
      const effectiveSystem = systemPrompt.trim() || content.defaultSystem
      const messages = [
        { role: 'system', content: effectiveSystem },
        { role: 'user', content: `${content.docsLabel}\n\n${contextBlock}\n\n${content.questionLabel}\n${qText}` },
      ]
      setSentMessages(messages)

      const reply = await sendChatMessage(messages, {
        onLog: appendLog,
        onRawRequest: setRawRequest,
        onRawResponse: setRawResponse,
        temperature: 0.2,
        model,
      })
      setAnswer(reply)
    } catch (err) {
      setError(err.message || 'Error')
      appendLog('error', err.message || 'Error')
    } finally {
      setAsking(false)
    }
  }

  const handleDocChange = (i, value) => {
    setDocs((prev) => prev.map((d, j) => (j === i ? value : d)))
  }

  const handleRemoveDoc = (i) => {
    setDocs((prev) => prev.filter((_, j) => j !== i))
  }

  const handleAddDoc = () => setDocs((prev) => [...prev, ''])

  const handleRestoreDocs = () => {
    setDocs(content.docs)
    appendLog('info', t('rag.logRestore'))
  }

  const handleClear = () => {
    setIndex(null)
    setRanking(null)
    setAnswer(null)
    setSentMessages(null)
    setQuestionUsage(null)
    setRawRequest(null)
    setRawResponse(null)
    setError(null)
    appendLog('info', t('rag.logCleared'))
  }

  const handleClearLogs = () => {
    setLogs([])
    try { localStorage.removeItem(LOGS_KEY) } catch { /* noop */ }
  }

  const retrievedSet = ranking && indexFresh ? new Set(ranking.slice(0, topK).map(({ i }) => i)) : null

  // Mapea cada posición del array `docs` (que puede tener entradas vacías) a
  // su posición dentro de la biblioteca limpia que realmente se indexó.
  const docCleanIndex = []
  {
    let n = 0
    for (const d of docs) docCleanIndex.push(d.trim() ? n++ : -1)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>
          <a href="/" className="brand-home" aria-label={t('rag.brandHome')}>
            <img src="/logo.png" alt="" className="brand-logo" />
          </a>
          <span className="brand-braces">{'{'}</span>
          <Brand />
          <span className="brand-braces">{'}'}</span>
          <span className="brand-subtitle">// {t('rag.brandTag')} · <span className="brand-mode">RAG</span></span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="rag" />
        </div>
      </header>

      <ConfigBar>
        <label className="hdr-select">
          <span className="hdr-select-label">{t('rag.providerLabel')}</span>
          <select
            value="openai"
            disabled
            className="hdr-select-input provider-select-openai"
            title={t('rag.providerTitle')}
          >
            <option value="openai">{t('rag.providerOption')}</option>
          </select>
        </label>

        <label className="hdr-select">
          <span className="hdr-select-label">{t('rag.modelLabel')}</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={loading}
            className="hdr-select-input"
            title={t('rag.modelTitle')}
          >
            {OPENAI_CHAT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
            ))}
          </select>
        </label>

        <label className="hdr-select">
          <span className="hdr-select-label">dimensions</span>
          <select
            value={dims}
            onChange={(e) => setDims(parseInt(e.target.value, 10))}
            disabled={loading}
            className="hdr-select-input"
            title={t('rag.dimsTitle')}
          >
            {EMBEDDING_DIMENSIONS.map((d) => (
              <option key={d} value={d}>{d}{d === 64 ? ` — ${t('rag.dims64')}` : ''}{d === 1536 ? ` — ${t('rag.dims1536')}` : ''}</option>
            ))}
          </select>
        </label>

        <label className="hdr-select">
          <span className="hdr-select-label">top-K</span>
          <select
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value, 10))}
            disabled={loading}
            className="hdr-select-input"
            title={t('rag.topkTitle')}
          >
            {TOPK_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>

        <button onClick={handleClear} className="clear-btn" type="button" disabled={loading}>
          {t('rag.clear')}
        </button>
      </ConfigBar>

      <div className="layout">
        {/* Panel 1 — Biblioteca + pregunta + resultados */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>{t('rag.title')}</span>
            <span className="context-meta">/v1/embeddings + /v1/chat/completions</span>
          </div>

          {/* Paso 1 — Biblioteca */}
          <div className="rag-step">
            <div className="rag-step-title">
              <span>{t('rag.step1Title')}</span>
              <span className="context-meta">{t('rag.step1Meta')}</span>
            </div>
            <div className="rag-step-hint">{t('rag.step1Hint')}</div>

            <div className="rag-docs">
              {docs.map((doc, i) => {
                const ci = docCleanIndex[i]
                const highlight = retrievedSet && ci >= 0
                  ? (retrievedSet.has(ci) ? ' rag-doc-in' : ' rag-doc-out')
                  : ''
                return (
                <div key={i} className={`rag-doc${highlight}`}>
                  <div className="rag-doc-head">
                    <span className="rag-doc-label">DOC #{i + 1}</span>
                    {indexFresh && ci >= 0 && index.vectors[ci] && (
                      <code className="rag-doc-vector" title={t('rag.vectorTitle', { d: index.dims })}>
                        {vectorPreview(index.vectors[ci])} ×{index.dims}
                      </code>
                    )}
                    <button
                      type="button"
                      className="rag-doc-remove"
                      onClick={() => handleRemoveDoc(i)}
                      disabled={loading || docs.length <= 1}
                      title={t('rag.removeDoc')}
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={doc}
                    onChange={(e) => handleDocChange(i, e.target.value)}
                    disabled={loading}
                    rows={2}
                    placeholder={t('rag.docPlaceholder')}
                  />
                </div>
                )
              })}
            </div>

            <div className="rag-lib-actions">
              <button type="button" className="rag-lib-btn" onClick={handleAddDoc} disabled={loading}>
                {t('rag.addDoc')}
              </button>
              <button type="button" className="rag-lib-btn" onClick={handleRestoreDocs} disabled={loading}>
                {t('rag.restoreDocs')}
              </button>
              <button
                type="button"
                className="rag-index-btn"
                onClick={handleIndex}
                disabled={loading || currentDocTexts.length === 0 || indexFresh}
              >
                {indexing
                  ? t('rag.indexing')
                  : indexFresh
                    ? t('rag.indexed', { n: index.vectors.length, d: index.dims })
                    : t('rag.indexBtn', { n: currentDocTexts.length })}
              </button>
            </div>

            {index && !indexFresh && !indexing && (
              <div className="rag-stale">{t('rag.stale')}</div>
            )}
          </div>

          {/* Paso 2 — Pregunta */}
          <div className="rag-step">
            <div className="rag-step-title">
              <span>{t('rag.step2Title')}</span>
              <span className="context-meta">{t('rag.step2Meta')}</span>
            </div>

            <div className="razon-presets">
              <span className="razon-presets-label">{t('rag.presetsLabel')}</span>
              {content.presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="razon-preset-btn"
                  onClick={() => setQuestion(p.text)}
                  disabled={loading}
                  title={p.text}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <details className="razon-instructions">
              <summary>{t('rag.systemLabel')}</summary>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                disabled={loading}
                rows={3}
                placeholder={content.defaultSystem}
              />
              <div className="razon-foot">{t('rag.systemFoot')}</div>
            </details>

            <form onSubmit={handleAsk} className="razon-composer">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('rag.askPlaceholder')}
                disabled={loading}
                rows={2}
              />
              <div className="razon-composer-actions">
                <span className="lp-temp-hint">
                  {indexFresh ? t('rag.askHint', { k: topK }) : t('rag.needIndex')}
                </span>
                <button type="submit" disabled={loading || !question.trim() || !indexFresh}>
                  {asking ? t('rag.asking') : t('rag.askBtn')}
                </button>
              </div>
            </form>
          </div>

          {error && <div className="error">{error}</div>}

          {!ranking && !asking && (
            <div className="empty">{t('rag.emptyBody')}</div>
          )}

          {ranking && (
            <>
              <div className="lp-strip-header">
                <span>{t('rag.rankTitle')}</span>
                <span className="context-meta">{t('rag.rankMeta')}</span>
              </div>
              <div className="rag-rank">
                {ranking.map(({ i, score }, pos) => (
                  <div key={i} className={`rag-rank-row${pos < topK ? ' rag-rank-in' : ''}`}>
                    <span className="rag-rank-doc" title={index.docTexts[i]}>
                      DOC #{i + 1} · {snippet(index.docTexts[i])}
                    </span>
                    <div className="rag-rank-bar-track">
                      <div className="rag-rank-bar" style={{ width: `${Math.max(2, score * 100)}%` }} />
                    </div>
                    <span className="rag-rank-score">{score.toFixed(3)}</span>
                    <span className={`rag-rank-tag${pos < topK ? ' rag-rank-tag-in' : ''}`}>
                      {pos < topK ? t('rag.travels') : t('rag.stays')}
                    </span>
                  </div>
                ))}
              </div>

              {sentMessages && (
                <details className="field-guide">
                  <summary>{t('rag.sentTitle')}</summary>
                  <pre className="rag-sent">{sentMessages.map((m) => `--- ${m.role} ---\n${m.content}`).join('\n\n')}</pre>
                </details>
              )}

              {answer != null && (
                <div className="rag-answer">
                  <div className="lp-strip-header">
                    <span>{t('rag.answerTitle')}</span>
                    <span className="context-meta">{t('rag.answerMeta', { k: topK })}</span>
                  </div>
                  <div className="rag-answer-text">{answer}</div>
                </div>
              )}

              <div className="razon-usage">
                {index?.usage && (
                  <div className="razon-usage-row">
                    <span>{t('rag.usageIndex')}</span>
                    <span><b>{index.usage.total_tokens}</b> token(s)</span>
                  </div>
                )}
                {questionUsage && (
                  <div className="razon-usage-row">
                    <span>{t('rag.usageQuestion')}</span>
                    <span><b>{questionUsage.total_tokens}</b> token(s)</span>
                  </div>
                )}
                <div className="razon-usage-foot">{t('rag.usageFoot', { k: topK, total: index?.docTexts.length ?? 0 })}</div>
              </div>
            </>
          )}
        </section>

        {/* Panel 2 — Request/Response crudo */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>{t('rag.rawTitle')}</span>
            <span className="panel-links">
              <a
                href="https://platform.openai.com/docs/api-reference/embeddings/create"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title={t('rag.rawDocsTitle')}
              >
                docs ↗
              </a>
            </span>
          </div>
          <div className="rag-raw-meta context-meta">{t('rag.rawMeta')}</div>
          <pre className="raw">
            {rawRequest ? JSON.stringify(rawRequest, null, 2) : `// ${t('rag.rawEmptyReq')}`}
          </pre>

          <div className="panel-title panel-title-sub">
            <span>{t('rag.rawResTitle')}</span>
          </div>
          <pre className="raw">
            {rawResponse ? JSON.stringify(rawResponse, null, 2) : `// ${t('rag.rawEmptyRes')}`}
          </pre>

          {rawResponse && (
            <details className="field-guide">
              <summary>{t('rag.guideTitle')}</summary>
              <ul>
                <li>{t('rag.guide1')}</li>
                <li>{t('rag.guide2')}</li>
                <li>{t('rag.guide3')}</li>
                <li>{t('rag.guide4')}</li>
                <li>{t('rag.guide5')}</li>
                <li><b>{t('rag.guide6')}</b></li>
              </ul>
            </details>
          )}
        </section>

        {/* Panel 3 — Log */}
        <section className="panel log-panel">
          <div className="panel-title">
            <span>{t('rag.logTitle')}</span>
            <span className="panel-links">
              <span className="context-meta">{t('rag.logLines', { n: logs.length })}</span>
              {logs.length > 0 && (
                <button type="button" onClick={handleClearLogs} className="docs-link">
                  {t('rag.logClear')}
                </button>
              )}
            </span>
          </div>
          <div className="log" ref={logRef}>
            {logs.length === 0 && <div className="empty">{t('rag.logEmpty')}</div>}
            {logs.map((entry, i) => (
              <div key={i} className={`log-line log-${entry.level}`}>
                <span className="log-time">{entry.timestamp}</span>
                <span className="log-level">[{entry.level}]</span>
                <span className="log-msg">{entry.message}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
