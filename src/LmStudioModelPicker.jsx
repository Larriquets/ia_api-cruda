import { useState, useEffect } from 'react'
import { listLmStudioModels, LMSTUDIO_MODEL_KEY, LMSTUDIO_HOST_KEY, getLmStudioModel, getLmStudioHost } from './lmstudio.js'
import { useT } from './i18n/useT.js'

/**
 * Selector del modelo de LM Studio (local). Se renderiza dentro de la ConfigBar
 * solo cuando provider === 'lmstudio'. Persiste en localStorage bajo las keys
 * LMSTUDIO_MODEL_KEY / LMSTUDIO_HOST_KEY. El botón "Detectar" llama a
 * GET /v1/models contra el host y autocompleta el primer modelo cargado.
 *
 * Acepta onLog opcional para escribir en el log del modo correspondiente.
 */
export default function LmStudioModelPicker({ onLog }) {
  const { t } = useT()
  const [model, setModel] = useState(() => getLmStudioModel())
  const [host, setHost] = useState(() => getLmStudioHost())
  const [detecting, setDetecting] = useState(false)
  const [available, setAvailable] = useState([])
  const [error, setError] = useState(null)

  // Si otra pestaña/modo cambia el modelo, reflejarlo
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LMSTUDIO_MODEL_KEY) setModel(e.newValue || '')
      if (e.key === LMSTUDIO_HOST_KEY) setHost(e.newValue || getLmStudioHost())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const persistModel = (next) => {
    setModel(next)
    if (next) {
      localStorage.setItem(LMSTUDIO_MODEL_KEY, next)
    } else {
      localStorage.removeItem(LMSTUDIO_MODEL_KEY)
    }
    onLog?.('info', next ? t('lmstudio.logModel', { model: next }) : t('lmstudio.logModelEmpty'))
  }

  const persistHost = (next) => {
    const cleaned = next.replace(/\/$/, '')
    setHost(cleaned)
    if (cleaned && cleaned !== 'http://localhost:1234') {
      localStorage.setItem(LMSTUDIO_HOST_KEY, cleaned)
    } else {
      localStorage.removeItem(LMSTUDIO_HOST_KEY)
    }
  }

  const detect = async () => {
    setDetecting(true)
    setError(null)
    try {
      const models = await listLmStudioModels({ onLog })
      setAvailable(models)
      if (models.length === 0) {
        const msg = t('lmstudio.noModels')
        setError(msg)
        onLog?.('error', msg)
      } else {
        const firstId = models[0]?.id
        if (firstId && firstId !== model) {
          persistModel(firstId)
          onLog?.('success', t('lmstudio.detected', { n: models.length, id: firstId }))
        } else {
          onLog?.('info', t('lmstudio.detectedSame', { n: models.length }))
        }
      }
    } catch (err) {
      const msg = t('lmstudio.queryError', { host, error: err.message })
      setError(msg)
      onLog?.('error', msg)
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="lmstudio-picker" title={t('lmstudio.pickerTitle')}>
      <label className="hdr-select">
        <span className="hdr-select-label">{t('lmstudio.hostLabel')}</span>
        <input
          type="text"
          value={host}
          onChange={(e) => persistHost(e.target.value)}
          placeholder="http://localhost:1234"
          className="hdr-select-input lmstudio-host-input"
          spellCheck={false}
        />
      </label>
      <label className="hdr-select">
        <span className="hdr-select-label">{t('lmstudio.modelLabel')}</span>
        {available.length > 0 ? (
          <select
            value={model}
            onChange={(e) => persistModel(e.target.value)}
            className="hdr-select-input lmstudio-model-input"
          >
            {!available.some((m) => m.id === model) && model && (
              <option value={model}>{model} {t('lmstudio.notLoaded')}</option>
            )}
            {available.map((m) => (
              <option key={m.id} value={m.id}>{m.id}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={model}
            onChange={(e) => persistModel(e.target.value)}
            placeholder={t('lmstudio.modelPlaceholder')}
            className="hdr-select-input lmstudio-model-input"
            spellCheck={false}
          />
        )}
      </label>
      <button
        type="button"
        onClick={detect}
        disabled={detecting}
        className="lmstudio-detect-btn"
        title={t('lmstudio.detectTitle')}
      >
        {detecting ? '…' : t('lmstudio.detect')}
      </button>
      {error && <span className="lmstudio-picker-error" title={error}>⚠ {error.slice(0, 60)}…</span>}
    </div>
  )
}
