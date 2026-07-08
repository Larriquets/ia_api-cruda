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
import { useT } from './i18n/useT.js'

const LABELS = [
  { max: 0.3, key: 'temp.det', color: '#60a5fa' },
  { max: 0.8, key: 'temp.bal', color: '#34d399' },
  { max: 1.3, key: 'temp.crea', color: '#fbbf24' },
  { max: 2.01, key: 'temp.chaos', color: '#f87171' },
]

const qualitativeLabel = (t) => LABELS.find((l) => t < l.max) || LABELS[LABELS.length - 1]

export default function TemperatureControl({ value, onChange, disabled = false, clampedTo = null }) {
  const { t } = useT()
  const { key, color } = qualitativeLabel(value)
  const willBeClamped = clampedTo != null && value > clampedTo

  return (
    <div className="temp-control">
      <div className="temp-control-header">
        <span className="temp-control-title">
          {t('temp.title')}
        </span>
        <span className="temp-control-value" style={{ color }}>
          {value.toFixed(2)} · <b>{t(key)}</b>
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
        title={t('temp.slider')}
      />
      <div className="temp-control-marks">
        <span>0</span>
        <span>{t('temp.default')}</span>
        <span>2</span>
      </div>
      {willBeClamped && (
        <div className="temp-control-hint">
          {t('temp.clamp', { value: value.toFixed(2), to: clampedTo.toFixed(2) })}
        </div>
      )}
    </div>
  )
}
