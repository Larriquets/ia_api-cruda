const STEPS = [
  {
    title: '1. La IA no recuerda sola',
    mode: 'Modo Crudo',
    goal: 'Proba que el segundo request no recibe el mensaje anterior.',
    body: 'Primero manda tu nombre. Despues pregunta como te llamas. En el panel Request deberias ver que solo viaja el ultimo mensaje.',
    primary: 'Preparar crudo',
    prompts: [
      'Mi nombre es Laura. Recordalo.',
      'Como me llamo?',
    ],
  },
  {
    title: '2. La memoria es payload',
    mode: 'Modo Conversacion',
    goal: 'Ver que la continuidad aparece cuando el historial vuelve a viajar.',
    body: 'Repeti el mismo experimento, ahora con historial del cliente. El Request deberia incluir los turnos anteriores.',
    primary: 'Preparar conversacion',
    prompts: [
      'Mi nombre es Laura. Recordalo.',
      'Como me llamo?',
    ],
  },
  {
    title: '3. El system manda',
    mode: 'System prompt',
    goal: 'Cambiar el comportamiento sin cambiar la pregunta.',
    body: 'La guia abre el editor y carga un system que fuerza JSON. Despues manda una consigna simple y mira como cambia la salida.',
    primary: 'Cargar system JSON',
    prompts: [
      'Dame tres ideas para aprender IA.',
    ],
  },
  {
    title: '4. El contexto tiene limite',
    mode: 'Contexto inflado',
    goal: 'Entender que alguien decide que entra y que queda afuera.',
    body: 'La demo carga una conversacion larga falsa. Mira los tokens estimados y compara que mensajes viajarian en los labs de ventana de contexto.',
    primary: 'Inflar contexto',
    prompts: [],
  },
]

export default function FirstTenMinutesGuide({
  active,
  step,
  onStart,
  onStop,
  onPrepareStep,
  onUsePrompt,
  onStepChange,
}) {
  if (!active) {
    return (
      <div className="guide-entry">
        <div className="guide-entry-copy">
          <b>Primeros 10 minutos</b>
          <span>Un recorrido corto para ver requests, memoria, system y contexto sin teoria pesada.</span>
        </div>
        <button type="button" className="guide-primary-btn" onClick={onStart}>
          Empezar guia
        </button>
      </div>
    )
  }

  const current = STEPS[step] || STEPS[0]

  return (
    <section className="guide-panel" aria-label="Primeros 10 minutos">
      <div className="guide-top">
        <div>
          <span className="guide-kicker">Primeros 10 minutos</span>
          <h2>{current.title}</h2>
        </div>
        <button type="button" className="guide-link-btn" onClick={onStop}>
          salir
        </button>
      </div>

      <div className="guide-progress" role="tablist" aria-label="Pasos de la guia">
        {STEPS.map((item, index) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={index === step}
            className={`guide-dot${index === step ? ' active' : ''}`}
            onClick={() => onStepChange(index)}
            title={item.title}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="guide-card">
        <div className="guide-mode">{current.mode}</div>
        <p className="guide-goal">{current.goal}</p>
        <p className="guide-body">{current.body}</p>

        <div className="guide-actions">
          <button type="button" className="guide-primary-btn" onClick={() => onPrepareStep(step)}>
            {current.primary}
          </button>
          {current.prompts.map((prompt, index) => (
            <button
              key={prompt}
              type="button"
              className="guide-secondary-btn"
              onClick={() => onUsePrompt(prompt)}
              title={prompt}
            >
              Usar frase {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="guide-nav">
        <button
          type="button"
          className="guide-link-btn"
          onClick={() => onStepChange(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          anterior
        </button>
        <span>{step + 1} / {STEPS.length}</span>
        <button
          type="button"
          className="guide-link-btn"
          onClick={() => onStepChange(Math.min(STEPS.length - 1, step + 1))}
          disabled={step === STEPS.length - 1}
        >
          siguiente
        </button>
      </div>
    </section>
  )
}
