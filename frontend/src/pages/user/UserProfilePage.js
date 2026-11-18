import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { getFitnessProfile, saveFitnessProfile, fitnessProfileError } from '../../services/fitnessProfileService';
import { AffectedAreaPicker, ChoiceCards } from '../../features/fitnessProfile/FitnessProfileControls';
import {
  AFFECTED_AREA_OPTIONS,
  EXERCISE_EXPERIENCE_OPTIONS,
  FITNESS_LEVEL_OPTIONS,
  LIMITATION_OPTIONS,
  WORKOUT_FOCUS_OPTIONS,
  optionLabel,
} from '../../features/fitnessProfile/fitnessProfileOptions';
import './UserProfilePage.css';

const emptyForm = {
  age: '',
  fitnessLevel: '',
  exerciseExperience: '',
  workoutFocus: '',
  physicalLimitations: '',
  affectedAreas: [],
};

function toForm(data) {
  return {
    age: data?.user?.age ?? '',
    fitnessLevel: data?.profile?.fitnessLevel || '',
    exerciseExperience: data?.profile?.exerciseExperience || '',
    workoutFocus: data?.profile?.workoutFocus || '',
    physicalLimitations: data?.profile?.physicalLimitations || '',
    affectedAreas: data?.profile?.affectedAreas || [],
  };
}

function updateStoredUser(data) {
  try {
    const current = JSON.parse(localStorage.getItem('user')) || {};
    localStorage.setItem('user', JSON.stringify({
      ...current,
      first_name: data.user?.firstName ?? current.first_name,
      last_name: data.user?.lastName ?? current.last_name,
      age: data.user?.age,
    }));
  } catch {
    // Server data remains authoritative when local storage is unavailable.
  }
}

function DetailRow({ label, children }) {
  return (
    <div className="user-profile__detail">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function UserProfilePage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    getFitnessProfile()
      .then((profileData) => {
        if (!active) return;
        setData(profileData);
        setForm(toForm(profileData));
      })
      .catch((requestError) => {
        if (active) setError(fitnessProfileError(requestError, 'Unable to load your profile. Please try again.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateForm = (key, value) => {
    setError('');
    setSuccess('');
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'physicalLimitations' && value !== 'yes' ? { affectedAreas: [] } : {}),
    }));
  };

  const beginEditing = () => {
    setForm(toForm(data));
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(toForm(data));
    setError('');
    setEditing(false);
  };

  const save = async (event) => {
    event.preventDefault();
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setError('Age must be a whole number between 1 and 120.');
      return;
    }
    if (!form.fitnessLevel || !form.exerciseExperience || !form.workoutFocus || !form.physicalLimitations) {
      setError('Select a fitness level, exercise experience, workout focus, and physical limitations response.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await saveFitnessProfile({ ...form, age });
      setData(saved);
      setForm(toForm(saved));
      updateStoredUser(saved);
      setEditing(false);
      setSuccess('Profile Updated Successfully. Your fitness information has been saved.');
    } catch (saveError) {
      setError(fitnessProfileError(saveError, 'We could not save your profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const user = data?.user || {};
  const profile = data?.profile || {};
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Not provided';
  const initials = `${user.firstName?.[0] || user.username?.[0] || 'U'}${user.lastName?.[0] || ''}`.toUpperCase();
  const limitationLabel = optionLabel(LIMITATION_OPTIONS, profile.physicalLimitations);
  const workoutFocusLabel = optionLabel(WORKOUT_FOCUS_OPTIONS, profile.workoutFocus);
  const affectedLabels = (profile.affectedAreas || []).map((area) => optionLabel(AFFECTED_AREA_OPTIONS, area, area));
  const profileComplete = profile.onboardingCompleted && Boolean(profile.workoutFocus);
  const hasPersonalizedGuidance = Boolean(
    profile.fitnessLevel
    && profile.workoutFocus
    && profile.workoutFocus !== 'prefer_not_to_say',
  );

  return (
    <div className="user-profile-page">
      <Navbar activeItem="User" />
      <main className="user-profile__main">
        <header className="user-profile__hero">
          <div>
            <span className="user-profile__eyebrow">Account</span>
            <h1>User Profile</h1>
            <p>Manage your account details and the fitness information used for exercise considerations.</p>
          </div>
          {!loading && data && !editing && (
            <button type="button" className="user-profile__edit-button" onClick={beginEditing}>
              <i className="fa-solid fa-pen" aria-hidden="true" />
              Edit Profile
            </button>
          )}
        </header>

        {success && <div className="user-profile__status is-success" role="status"><i className="fa-solid fa-circle-check" aria-hidden="true" />{success}</div>}
        {error && !editing && <div className="user-profile__status is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</div>}

        {loading && <div className="user-profile__loading" role="status">Loading your profile...</div>}

        {!loading && data && !editing && (
          <>
            <section className="user-profile__identity" aria-label="Profile overview">
              <div className="user-profile__avatar" aria-hidden="true">{initials}</div>
              <div className="user-profile__identity-copy">
                <span>Profile overview</span>
                <h2>{fullName}</h2>
                <p>@{user.username || 'user'}{user.email ? ` · ${user.email}` : ''}</p>
              </div>
              <div className="user-profile__indicators">
                <div>
                  <span>Profile status</span>
                  <strong className={profileComplete ? 'is-complete' : ''}>
                    <i className={`fa-solid ${profileComplete ? 'fa-circle-check' : 'fa-circle-minus'}`} aria-hidden="true" />
                    {profileComplete ? 'Complete' : 'Needs update'}
                  </strong>
                </div>
                <div>
                  <span>Exercise guidance</span>
                  <strong><i className="fa-solid fa-sliders" aria-hidden="true" />{hasPersonalizedGuidance ? 'Personalized' : 'Standard'}</strong>
                </div>
              </div>
            </section>

            <div className="user-profile__section-heading">
              <div><h2>Profile Details</h2><p>Information connected to your PoseFit account and exercise experience.</p></div>
            </div>

            <div className="user-profile__grid">
              <section className="user-profile__card" aria-labelledby="personal-information-title">
                <header><span><i className="fa-regular fa-user" aria-hidden="true" /></span><div><h2 id="personal-information-title">Personal Information</h2><p>Your basic account details</p></div></header>
                <dl>
                  <DetailRow label="Full Name">{fullName}</DetailRow>
                  <DetailRow label="Email Address">{user.email || 'Not provided'}</DetailRow>
                  <DetailRow label="Age">{user.age ?? 'Not set'}</DetailRow>
                </dl>
              </section>

              <section className="user-profile__card" aria-labelledby="fitness-information-title">
                <header><span><i className="fa-solid fa-person-running" aria-hidden="true" /></span><div><h2 id="fitness-information-title">Fitness Information</h2><p>Your self-reported experience</p></div></header>
                <dl>
                  <DetailRow label="Fitness Level">{optionLabel(FITNESS_LEVEL_OPTIONS, profile.fitnessLevel)}</DetailRow>
                  <DetailRow label="Exercise Experience">{optionLabel(EXERCISE_EXPERIENCE_OPTIONS, profile.exerciseExperience)}</DetailRow>
                  <DetailRow label="Workout Focus">{workoutFocusLabel}</DetailRow>
                </dl>
              </section>

              <section className="user-profile__card user-profile__card--wide" aria-labelledby="limitations-title">
                <header><span><i className="fa-solid fa-universal-access" aria-hidden="true" /></span><div><h2 id="limitations-title">Physical Limitations</h2><p>Used only to display relevant exercise considerations</p></div></header>
                <dl>
                  <DetailRow label="Physical Limitations">{limitationLabel}</DetailRow>
                  {profile.physicalLimitations === 'yes' && (
                    <DetailRow label="Areas Affected">
                      {affectedLabels.length ? (
                        <span className="user-profile__tags">{affectedLabels.map((area) => <em key={area}>{area}</em>)}</span>
                      ) : 'Not specified'}
                    </DetailRow>
                  )}
                </dl>
              </section>
            </div>
          </>
        )}

        {!loading && data && editing && (
          <form className="user-profile__form" onSubmit={save}>
            <header className="user-profile__form-header">
              <span aria-hidden="true"><i className="fa-solid fa-user-pen" /></span>
              <div><h2>Edit Profile</h2><p>Review your fitness details and save only the information that has changed.</p></div>
            </header>
            <section className="user-profile__form-section">
              <div className="user-profile__form-heading"><span>01</span><div><h2>Personal Details</h2><p>Keep your age accurate for your profile information.</p></div></div>
              <div className="user-profile__age-field">
                <label htmlFor="user-profile-age">Age</label>
                <input
                  id="user-profile-age"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  inputMode="numeric"
                  value={form.age}
                  onChange={(event) => updateForm('age', event.target.value)}
                  required
                />
              </div>
            </section>

            <section className="user-profile__form-section">
              <div className="user-profile__form-heading"><span>02</span><div><h2>Fitness Level</h2><p>Choose the option that best describes you now.</p></div></div>
              <ChoiceCards options={FITNESS_LEVEL_OPTIONS} value={form.fitnessLevel} onChange={(value) => updateForm('fitnessLevel', value)} label="Fitness level" />
            </section>

            <section className="user-profile__form-section">
              <div className="user-profile__form-heading"><span>03</span><div><h2>Exercise Experience</h2><p>How long have you regularly participated in exercise?</p></div></div>
              <ChoiceCards compact options={EXERCISE_EXPERIENCE_OPTIONS} value={form.exerciseExperience} onChange={(value) => updateForm('exerciseExperience', value)} label="Exercise experience" />
            </section>

            <section className="user-profile__form-section">
              <div className="user-profile__form-heading"><span>04</span><div><h2>Workout Focus</h2><p>What would you like to focus on?</p></div></div>
              <ChoiceCards options={WORKOUT_FOCUS_OPTIONS} value={form.workoutFocus} onChange={(value) => updateForm('workoutFocus', value)} label="Workout focus" />
            </section>

            <section className="user-profile__form-section">
              <div className="user-profile__form-heading"><span>05</span><div><h2>Physical Limitations</h2><p>This is self-reported and does not represent a medical diagnosis.</p></div></div>
              <ChoiceCards compact options={LIMITATION_OPTIONS} value={form.physicalLimitations} onChange={(value) => updateForm('physicalLimitations', value)} label="Physical limitations" />
              {form.physicalLimitations === 'yes' && (
                <div className="user-profile__areas">
                  <h3>Areas Affected <span>Optional</span></h3>
                  <p>Select any relevant areas, or leave all unselected if you prefer not to disclose them.</p>
                  <AffectedAreaPicker options={AFFECTED_AREA_OPTIONS} value={form.affectedAreas} onChange={(value) => updateForm('affectedAreas', value)} />
                </div>
              )}
            </section>

            {error && <div className="user-profile__status is-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</div>}

            <div className="user-profile__form-actions">
              <button type="button" className="is-cancel" onClick={cancelEditing} disabled={saving}>Cancel</button>
              <button type="submit" className="is-save" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
