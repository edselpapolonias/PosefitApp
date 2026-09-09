import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import WorkoutConfigRow from './WorkoutConfigRow';

function ExerciseFact({ icon, title, children }) {
  return (
    <div className="squat-redesign__fact">
      <span className="squat-redesign__fact-icon" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <span><strong>{title}</strong><small>{children}</small></span>
    </div>
  );
}

function PresetCard({ preset, selected, onSelect, metric }) {
  const isCustom = preset.id === 'custom';
  return (
    <button
      className={`squat-preset${selected ? ' squat-preset--selected' : ''}${isCustom ? ' squat-preset--custom' : ''}`}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(preset)}
    >
      {selected && <span className="squat-preset__check" aria-hidden="true"><i className="fa-solid fa-check" /></span>}
      {isCustom ? (
        <>
          <span className="squat-preset__custom-icon" aria-hidden="true"><i className="fa-solid fa-gear" /></span>
          <strong>Custom</strong>
          <small>Set your own</small>
        </>
      ) : (
        <>
          <strong>{preset.name}</strong>
          <b>{preset.sets} × {preset[metric.key]}{metric.presetSuffix || ''}</b>
          <small>{preset.rest}s rest</small>
        </>
      )}
    </button>
  );
}

function AnatomyPair({ name, anatomy, compact = false }) {
  return (
    <div className={`squat-anatomy-pair${compact ? ' squat-anatomy-pair--compact' : ''}`}>
      <figure>
        <img src={anatomy.front} alt={`Front anatomy view highlighting the muscles used during a ${name}`} />
        {!compact && <figcaption>Front View</figcaption>}
      </figure>
      <figure>
        <img src={anatomy.back} alt={`Back anatomy view highlighting the muscles used during a ${name}`} />
        {!compact && <figcaption>Back View</figcaption>}
      </figure>
    </div>
  );
}

function Benefits({ benefits }) {
  if (!benefits?.length) return null;
  return (
    <div className="exercise-benefits" aria-label="Exercise benefits">
      {benefits.map((benefit) => (
        <div key={benefit.text}>
          <i className={`fa-solid ${benefit.icon}`} aria-hidden="true" />
          <span>{benefit.text}</span>
        </div>
      ))}
    </div>
  );
}

function OverviewTab({ exercise }) {
  return (
    <div className="squat-tab-panel squat-tab-panel--overview" role="tabpanel" id={`${exercise.id}-overview-panel`} aria-labelledby={`${exercise.id}-overview-tab`}>
      <div className="squat-overview-content">
        <div className="squat-overview-content__photo">
          <img src={exercise.photo} alt={exercise.photoAlt} />
        </div>
        <div className="squat-about">
          <h2>About this Exercise</h2>
          <p>{exercise.about}</p>
          <button type="button" onClick={() => document.getElementById(`${exercise.id}-reminders`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            <i className="fa-solid fa-play" aria-hidden="true" />
            Watch Demonstration
          </button>
        </div>
      </div>

      <Benefits benefits={exercise.benefits} />

      <div className="squat-overview-lower">
        <section className="squat-key-reminders" id={`${exercise.id}-reminders`} aria-labelledby={`${exercise.id}-reminders-title`}>
          <h2 id={`${exercise.id}-reminders-title`}>Key Reminders</h2>
          <ul>
            {exercise.reminders.map((reminder) => (
              <li key={reminder.text}>
                <span className={reminder.correct ? '' : 'is-incorrect'} aria-hidden="true"><i className={`fa-solid ${reminder.correct ? 'fa-check' : 'fa-xmark'}`} /></span>
                {reminder.text}
              </li>
            ))}
          </ul>
        </section>

        <section className="squat-body-focus" aria-labelledby={`${exercise.id}-body-focus-title`}>
          <h2 id={`${exercise.id}-body-focus-title`}>Body Focus</h2>
          <AnatomyPair name={exercise.name} anatomy={exercise.anatomy} compact />
          <div className="squat-body-focus__muscles">
            <strong>Primary Muscles</strong>
            <span>{exercise.primaryMuscles}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function MusclesTab({ exercise }) {
  return (
    <div className="squat-tab-panel squat-tab-panel--muscles" role="tabpanel" id={`${exercise.id}-muscles-panel`} aria-labelledby={`${exercise.id}-muscles-tab`}>
      <header className="squat-muscles-intro">
        <h2>Muscles Worked</h2>
        <p>{exercise.musclesIntro}</p>
      </header>

      <div className="squat-muscles-content">
        <section className="squat-muscles-anatomy" aria-label={`Front and back ${exercise.name} muscle anatomy`}>
          <AnatomyPair name={exercise.name} anatomy={exercise.anatomy} />
        </section>

        <div className="squat-muscle-breakdown">
          {exercise.muscles.map((muscle) => (
            <article className="squat-muscle" key={muscle.name}>
              <span
                className={`squat-muscle__image squat-muscle__image--${muscle.crop}`}
                style={{ '--muscle-image': `url(${muscle.image})` }}
                role="img"
                aria-label={`${muscle.name} highlighted on an anatomy illustration`}
              />
              <span className="squat-muscle__copy">
                <span className="squat-muscle__heading">
                  <strong>{muscle.name}</strong>
                  <em className={muscle.type === 'Secondary' ? 'is-secondary' : ''}>{muscle.type}</em>
                </span>
                <small>{muscle.role}</small>
              </span>
            </article>
          ))}
        </div>
      </div>

      <aside className="squat-motivation">
        <span aria-hidden="true"><i className="fa-solid fa-hand-fist" /></span>
        <p><strong>{exercise.motivation.title}</strong><small>{exercise.motivation.text}</small></p>
      </aside>
    </div>
  );
}

export default function ExerciseConfigurationPage({ exercise }) {
  const navigate = useNavigate();
  const metric = exercise.metric || {
    key: 'reps',
    queryKey: 'reps',
    label: 'Reps per Set',
    description: 'Number of repetitions per set.',
    suffix: '',
    min: 1,
    max: 50,
    step: 1,
  };
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPreset, setSelectedPreset] = useState(exercise.presets[0].id);
  const [config, setConfig] = useState({
    sets: exercise.presets[0].sets,
    [metric.key]: exercise.presets[0][metric.key],
    rest: exercise.presets[0].rest,
  });
  const controlsLocked = selectedPreset !== 'custom';

  const selectPreset = (preset) => {
    setSelectedPreset(preset.id);
    if (preset.id !== 'custom') {
      setConfig({ sets: preset.sets, [metric.key]: preset[metric.key], rest: preset.rest });
    }
  };

  const updateConfig = (key) => (value) => {
    if (controlsLocked) return;
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const startWorkout = () => {
    const workoutConfig = { ...config, preset: selectedPreset };
    sessionStorage.setItem(exercise.storageKey, JSON.stringify(workoutConfig));
    navigate(`${exercise.startRoute}?sets=${config.sets}&${metric.queryKey || metric.key}=${config[metric.key]}&rest=${config.rest}`, {
      state: { workoutConfig },
    });
  };

  const handleTabKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextTab = activeTab === 'overview' ? 'muscles' : 'overview';
    setActiveTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`${exercise.id}-${nextTab}-tab`)?.focus());
  };

  return (
    <div className={`squat-page squat-page--configuration ${exercise.pageClass || ''}`}>
      <Navbar activeItem="Exercises" />

      <main className="squat-page__main">
        <button className="squat-redesign__back" type="button" onClick={() => navigate('/exercises')}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to Exercises
        </button>

        <div className="squat-redesign__layout">
          <div className="squat-redesign__left">
            <section className="squat-redesign__intro" aria-labelledby={`${exercise.id}-title`}>
              <div className="squat-redesign__title-row">
                <h1 id={`${exercise.id}-title`}>{exercise.name}</h1>
                <span>{exercise.category}</span>
              </div>
              <p>{exercise.description}</p>
              <div className="squat-redesign__facts">
                {exercise.facts.map((fact) => <ExerciseFact key={fact.title} icon={fact.icon} title={fact.title}>{fact.text}</ExerciseFact>)}
              </div>
            </section>

            <section className="squat-redesign__workout" aria-labelledby={`${exercise.id}-set-workout-title`}>
              <h2 id={`${exercise.id}-set-workout-title`}>Set Your Workout</h2>
              <div className="squat-presets" aria-label="Workout presets">
                {exercise.presets.map((preset) => (
                  <PresetCard key={preset.id} preset={preset} selected={selectedPreset === preset.id} onSelect={selectPreset} metric={metric} />
                ))}
              </div>

              <div className={`squat-config squat-redesign__config${controlsLocked ? ' squat-redesign__config--locked' : ''}`}>
                <WorkoutConfigRow icon="fa-layer-group" label="Sets" description="Number of sets you want to perform." value={config.sets} min={1} max={10} step={1} onChange={updateConfig('sets')} disabled={controlsLocked} />
                <WorkoutConfigRow icon={metric.icon || 'fa-rotate'} label={metric.label} description={metric.description} value={config[metric.key]} suffix={metric.suffix || ''} min={metric.min} max={metric.max} step={metric.step} onChange={updateConfig(metric.key)} disabled={controlsLocked} />
                <WorkoutConfigRow icon="fa-clock" label="Rest Time" description="Rest time after each set." value={config.rest} suffix=" sec" min={15} max={180} step={15} onChange={updateConfig('rest')} disabled={controlsLocked} />
              </div>
            </section>

            <aside className="squat-tip squat-redesign__tip">
              <span className="squat-redesign__tip-icon" aria-hidden="true"><i className="fa-regular fa-lightbulb" /></span>
              <span><strong>Tip</strong><small>{exercise.tip}</small></span>
            </aside>
          </div>

          <aside className="squat-redesign__right">
            <section className="squat-redesign__tabs-card">
              <div className="squat-tabs" role="tablist" aria-label={`${exercise.name} information`} onKeyDown={handleTabKeyDown}>
                {['overview', 'muscles'].map((tab) => (
                  <button
                    key={tab}
                    id={`${exercise.id}-${tab}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`${exercise.id}-${tab}-panel`}
                    tabIndex={activeTab === tab ? 0 : -1}
                    className={activeTab === tab ? 'is-active' : ''}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              {activeTab === 'overview' ? <OverviewTab exercise={exercise} /> : <MusclesTab exercise={exercise} />}
            </section>

            <button className="squat-start squat-redesign__start" id={`${exercise.id}-start-workout`} type="button" onClick={startWorkout}>
              <i className="fa-solid fa-play" aria-hidden="true" />
              <span>Start Workout</span>
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
