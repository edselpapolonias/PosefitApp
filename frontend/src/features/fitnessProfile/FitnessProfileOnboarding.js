import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getFitnessProfile, saveFitnessProfile, fitnessProfileError } from '../../services/fitnessProfileService';
import { AffectedAreaPicker, ChoiceCards } from './FitnessProfileControls';
import {
  AFFECTED_AREA_OPTIONS,
  EXERCISE_EXPERIENCE_OPTIONS,
  FITNESS_LEVEL_OPTIONS,
  LIMITATION_OPTIONS,
} from './fitnessProfileOptions';
import './FitnessProfileOnboarding.css';

function updateStoredUserAge(age) {
  try {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    localStorage.setItem('user', JSON.stringify({ ...user, age }));
  } catch {
    // The profile is already saved on the server if local storage is unavailable.
  }
}

function FitnessProfileOnboarding({ initialData, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    age: initialData.user?.age ?? '',
    fitnessLevel: initialData.profile?.fitnessLevel || '',
    exerciseExperience: initialData.profile?.exerciseExperience || '',
    physicalLimitations: initialData.profile?.physicalLimitations || '',
    affectedAreas: initialData.profile?.affectedAreas || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const totalSteps = answers.physicalLimitations === 'yes' ? 5 : 4;

  useEffect(() => {
    const stopEscape = (event) => {
      if (event.key === 'Escape') event.preventDefault();
    };
    document.addEventListener('keydown', stopEscape);
    return () => document.removeEventListener('keydown', stopEscape);
  }, []);

  const canContinue = useMemo(() => {
    if (step === 0) return Number.isInteger(Number(answers.age)) && Number(answers.age) >= 1 && Number(answers.age) <= 120;
    if (step === 1) return Boolean(answers.fitnessLevel);
    if (step === 2) return Boolean(answers.exerciseExperience);
    if (step === 3) return Boolean(answers.physicalLimitations);
    return true;
  }, [answers, step]);

  const setAnswer = (key, value) => {
    setError('');
    setAnswers((current) => ({
      ...current,
      [key]: value,
      ...(key === 'physicalLimitations' && value !== 'yes' ? { affectedAreas: [] } : {}),
    }));
  };

  const completeSetup = async (affectedAreas = answers.affectedAreas) => {
    setSaving(true);
    setError('');
    try {
      const saved = await saveFitnessProfile({ ...answers, affectedAreas });
      updateStoredUserAge(saved.user?.age);
      onComplete(saved);
    } catch (saveError) {
      setError(fitnessProfileError(saveError, 'We could not save your fitness profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!canContinue || saving) return;
    if (step === 3 && answers.physicalLimitations !== 'yes') {
      completeSetup([]);
      return;
    }
    setError('');
    setStep((current) => Math.min(current + 1, totalSteps - 1));
  };

  const back = () => {
    if (saving) return;
    setError('');
    setStep((current) => Math.max(0, current - 1));
  };

  const steps = [
    {
      title: 'Tell Us Your Age',
      description: 'Your age was saved when you created your PoseFit account.',
      content: (
        <div className="fitness-onboarding__age">
          <label htmlFor="fitness-onboarding-age">Age</label>
          <input id="fitness-onboarding-age" value={answers.age} readOnly aria-readonly="true" />
          <small>You can update your age later from the User Profile page.</small>
        </div>
      ),
    },
    {
      title: "What's Your Fitness Level?",
      description: 'Select the option that best describes your current exercise experience.',
      content: (
        <ChoiceCards
          label="Fitness level"
          options={FITNESS_LEVEL_OPTIONS}
          value={answers.fitnessLevel}
          onChange={(value) => setAnswer('fitnessLevel', value)}
        />
      ),
    },
    {
      title: 'How Long Have You Been Exercising?',
      description: 'Tell us how long you have regularly participated in exercise activities.',
      content: (
        <ChoiceCards
          label="Exercise experience"
          options={EXERCISE_EXPERIENCE_OPTIONS}
          value={answers.exerciseExperience}
          onChange={(value) => setAnswer('exerciseExperience', value)}
        />
      ),
    },
    {
      title: 'Do You Have Any Physical Limitations?',
      description: 'Sharing this optional information helps PoseFit display relevant exercise considerations.',
      content: (
        <ChoiceCards
          compact
          label="Physical limitations"
          options={LIMITATION_OPTIONS}
          value={answers.physicalLimitations}
          onChange={(value) => setAnswer('physicalLimitations', value)}
        />
      ),
    },
    {
      title: 'Which Areas Are Affected?',
      description: 'Select any areas that may affect exercise. You may select more than one or skip this question.',
      content: (
        <AffectedAreaPicker
          options={AFFECTED_AREA_OPTIONS}
          value={answers.affectedAreas}
          onChange={(value) => setAnswer('affectedAreas', value)}
        />
      ),
    },
  ];
  const currentStep = steps[step];

  return (
    <div className="fitness-onboarding" role="presentation">
      <section
        className="fitness-onboarding__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fitness-onboarding-title"
        aria-describedby="fitness-onboarding-description"
      >
        <header className="fitness-onboarding__header">
          <div>
            <span>Fitness Profile Setup</span>
            <strong>Step {step + 1} of {totalSteps}</strong>
          </div>
          <div className="fitness-onboarding__progress" aria-hidden="true">
            <span style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
          </div>
        </header>

        <div className="fitness-onboarding__body">
          <div className="fitness-onboarding__heading">
            <span aria-hidden="true"><i className="fa-solid fa-user-check" /></span>
            <div>
              <h1 id="fitness-onboarding-title">{currentStep.title}</h1>
              <p id="fitness-onboarding-description">{currentStep.description}</p>
            </div>
          </div>
          {currentStep.content}
          {error && <p className="fitness-onboarding__error" role="alert">{error}</p>}
        </div>

        <footer className="fitness-onboarding__actions">
          {step > 0 ? <button type="button" className="is-secondary" onClick={back} disabled={saving}>Back</button> : <span />}
          <div>
            {step === 4 && (
              <button type="button" className="is-skip" onClick={() => completeSetup([])} disabled={saving}>
                Skip this question
              </button>
            )}
            <button
              type="button"
              className="is-primary"
              onClick={step === 4 ? () => completeSetup() : next}
              disabled={!canContinue || saving}
            >
              {saving ? 'Saving...' : step === 4 ? 'Complete Setup' : 'Next'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function FitnessProfileOnboardingGate() {
  const location = useLocation();
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    let active = true;
    setProfileData(null);
    if (location.pathname !== '/dashboard' || !localStorage.getItem('user')) return () => { active = false; };

    getFitnessProfile()
      .then((data) => {
        if (active && data.shouldOnboard) setProfileData(data);
      })
      .catch(() => {
        // A profile service interruption must not replace the dashboard with an error.
      });
    return () => { active = false; };
  }, [location.pathname]);

  if (!profileData) return null;
  return <FitnessProfileOnboarding initialData={profileData} onComplete={() => setProfileData(null)} />;
}

export { FitnessProfileOnboarding };
