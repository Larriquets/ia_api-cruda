import { useT } from './i18n/useT.js'

const STEPS = [
  {
    titleKey: 'guide.s1Title', modeKey: 'guide.s1Mode', goalKey: 'guide.s1Goal',
    bodyKey: 'guide.s1Body', primaryKey: 'guide.s1Primary',
    promptKeys: ['guide.s1p1', 'guide.s1p2'],
  },
  {
    titleKey: 'guide.s2Title', modeKey: 'guide.s2Mode', goalKey: 'guide.s2Goal',
    bodyKey: 'guide.s2Body', primaryKey: 'guide.s2Primary',
    promptKeys: ['guide.s2p1', 'guide.s2p2'],
  },
  {
    titleKey: 'guide.s3Title', modeKey: 'guide.s3Mode', goalKey: 'guide.s3Goal',
    bodyKey: 'guide.s3Body', primaryKey: 'guide.s3Primary',
    promptKeys: ['guide.s3p1'],
  },
  {
    titleKey: 'guide.s4Title', modeKey: 'guide.s4Mode', goalKey: 'guide.s4Goal',
    bodyKey: 'guide.s4Body', primaryKey: 'guide.s4Primary',
    promptKeys: [],
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
  const { t } = useT()

  if (!active) {
    return (
      <div className="guide-entry">
        <div className="guide-entry-copy">
          <b>{t('guide.entryTitle')}</b>
          <span>{t('guide.entryCopy')}</span>
        </div>
        <button type="button" className="guide-primary-btn" onClick={onStart}>
          {t('guide.start')}
        </button>
      </div>
    )
  }

  const current = STEPS[step] || STEPS[0]

  return (
    <section className="guide-panel" aria-label={t('guide.kicker')}>
      <div className="guide-top">
        <div>
          <span className="guide-kicker">{t('guide.kicker')}</span>
          <h2>{t(current.titleKey)}</h2>
        </div>
        <button type="button" className="guide-link-btn" onClick={onStop}>
          {t('guide.exit')}
        </button>
      </div>

      <div className="guide-progress" role="tablist" aria-label={t('guide.stepsAria')}>
        {STEPS.map((item, index) => (
          <button
            key={item.titleKey}
            type="button"
            role="tab"
            aria-selected={index === step}
            className={`guide-dot${index === step ? ' active' : ''}`}
            onClick={() => onStepChange(index)}
            title={t(item.titleKey)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="guide-card">
        <div className="guide-mode">{t(current.modeKey)}</div>
        <p className="guide-goal">{t(current.goalKey)}</p>
        <p className="guide-body">{t(current.bodyKey)}</p>

        <div className="guide-actions">
          <button type="button" className="guide-primary-btn" onClick={() => onPrepareStep(step)}>
            {t(current.primaryKey)}
          </button>
          {current.promptKeys.map((promptKey, index) => (
            <button
              key={promptKey}
              type="button"
              className="guide-secondary-btn"
              onClick={() => onUsePrompt(t(promptKey))}
              title={t(promptKey)}
            >
              {t('guide.usePrompt', { n: index + 1 })}
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
          {t('guide.prev')}
        </button>
        <span>{step + 1} / {STEPS.length}</span>
        <button
          type="button"
          className="guide-link-btn"
          onClick={() => onStepChange(Math.min(STEPS.length - 1, step + 1))}
          disabled={step === STEPS.length - 1}
        >
          {t('guide.next')}
        </button>
      </div>
    </section>
  )
}
