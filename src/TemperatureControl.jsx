/**
 * Slider de temperatura compacto. Muestra el valor y un label cualitativo
 * (determinístico / equilibrado / creativo / caótico) para que el alumno
 * conecte el número con el efecto en la respuesta.
 *
 * Props:
 * - value: number entre 0 y 2
 * - onChange: (n: number) => void
 * - disabled?: boolean
 * - clampedTo?: number — si el provider clampa (Claude a 1), mostramos un hint
 */
const LABELS = [
  { max: 0.3, label: 'determinístico', color: '#60a5fa' },
  { max: 0.8, label: 'equilibrado', color: '#34d399' },
  { max: 1.3, label: 'creativo', color: '#fbbf24' },
  { max: 2.01, label: 'caótico', color: '#f87171' },
]

const qualitativeLabel = (t) => LABELS.find((l) => t < l.max) || LABELS[LABELS.length - 1]

export default function TemperatureControl({ value, onChange, disabled = false, clampedTo = null }) {
  const { label, color } = qualitativeLabel(value)
  const willBeClamped = clampedTo != null && value > clampedTo

  return (
    <div className="temp-control">
      <div className="temp-control-header">
        <span className="temp-control-title">
          🌡 Temperatura
        </span>
        <span className="temp-control-value" style={{ color }}>
          {value.toFixed(2)} · <b>{label}</b>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="temp-control-slider"
        style={{ accentColor: color }}
        title="0 = siempre la misma respuesta. 2 = caos total."
      />
      <div className="temp-control-marks">
        <span>0</span>
        <span>0.7 (default)</span>
        <span>2</span>
      </div>
      {willBeClamped && (
        <div className="temp-control-hint">
          ⚠ Claude solo acepta 0–1. Tu valor ({value.toFixed(2)}) se va a clampar a {clampedTo.toFixed(2)} antes de mandarlo.
        </div>
      )}
    </div>
  )
}
