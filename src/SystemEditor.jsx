import { useState, useRef, useEffect } from 'react'

/**
 * Editor plegable de system prompt, reusable entre Chat / Editor / Loop Agéntico.
 * Imita el patrón visual que ya tenía LoopAgentico (clases .system-editor*).
 *
 * Props:
 * - value: string actual del prompt
 * - onChange: (next: string) => void
 * - defaultPrompt: string base con el que se compara (badge "default" vs "editado")
 * - open / onToggleOpen: control externo del estado plegado/desplegado (persistible)
 * - disabled: bloquea edición durante un request
 * - presets: array opcional de { id, label, prompt } para el dropdown
 * - onLog: (level, msg) => void opcional, para registrar restauración y aplicación de presets
 * - hint: texto auxiliar al pie (default explica que vacío usa el default)
 */
export default function SystemEditor({
  value,
  onChange,
  defaultPrompt,
  open,
  onToggleOpen,
  disabled = false,
  presets = [],
  onLog,
  hint,
}) {
  const [presetsOpen, setPresetsOpen] = useState(false)
  const presetsRef = useRef(null)

  useEffect(() => {
    if (!presetsOpen) return
    const onDocClick = (e) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target)) {
        setPresetsOpen(false)
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') setPresetsOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [presetsOpen])

  const isDefault = value === defaultPrompt
  const isEmpty = value.trim().length === 0
  const effectiveLen = isEmpty ? defaultPrompt.length : value.length

  const handleRestore = () => {
    onChange(defaultPrompt)
    onLog?.('info', 'System prompt restaurado al default')
  }

  const applyPreset = (preset) => {
    onChange(preset.prompt)
    setPresetsOpen(false)
    onLog?.('info', `System prompt: preset "${preset.label}" aplicado`)
  }

  return (
    <div className={`system-editor${open ? ' system-editor-open' : ''}`}>
      <button
        type="button"
        className="system-editor-toggle"
        onClick={() => onToggleOpen(!open)}
        title="El system prompt es la instrucción base que recibe el modelo antes de tu mensaje. Editalo para ver cómo cambia el comportamiento."
      >
        <span className="system-editor-chev">{open ? '▾' : '▸'}</span>
        <span className="system-editor-label">
          <code>"role": "system"</code> · {effectiveLen} chars
        </span>
        <span className={`system-editor-flag${!isDefault ? ' system-editor-flag-dirty' : ''}`}>
          {isEmpty ? 'vacío → default' : isDefault ? 'default' : 'editado'}
        </span>
      </button>
      {open && (
        <>
          <textarea
            className="system-editor-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            spellCheck={false}
            rows={8}
            placeholder="Si lo dejás vacío, se manda el system default."
          />
          <div className="system-editor-actions">
            {presets.length > 0 && (
              <div className="system-editor-presets" ref={presetsRef}>
                <button
                  type="button"
                  className="docs-link"
                  onClick={() => setPresetsOpen((v) => !v)}
                  disabled={disabled}
                  aria-haspopup="menu"
                  aria-expanded={presetsOpen}
                  title="Probá personalidades distintas con un click — el mismo 'hola' produce respuestas totalmente diferentes."
                >
                  Presets {presetsOpen ? '▴' : '▾'}
                </button>
                {presetsOpen && (
                  <div className="system-editor-presets-menu" role="menu">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        role="menuitem"
                        className="system-editor-preset-item"
                        onClick={() => applyPreset(preset)}
                        title={preset.prompt.slice(0, 200)}
                      >
                        <b>{preset.label}</b>
                        {preset.subtitle && (
                          <span className="system-editor-preset-sub">{preset.subtitle}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="docs-link"
              onClick={handleRestore}
              disabled={disabled || isDefault}
            >
              Restaurar default
            </button>
            <span className="system-editor-hint">
              {hint || 'Reemplaza el system base que viaja en cada request. Vacío = se usa el default.'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
