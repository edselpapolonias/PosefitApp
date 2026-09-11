import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './StartPlanDialog.css';
import { addDays, localDateKey } from '../../pages/workout-plans/details/beginnerActivePlan';

export function earliestMonday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  const day = new Date(`${value('year')}-${value('month')}-${value('day')}T12:00:00`);
  return addDays(day, (8 - day.getDay()) % 7);
}

export const BEGINNER_WORKOUT_DAYS = [
  { label: 'MON', name: 'Monday', offset: 0 },
  { label: 'WED', name: 'Wednesday', offset: 2 },
  { label: 'FRI', name: 'Friday', offset: 4 },
];

function listDays(days) {
  const names = days.map(({ name }) => name);
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

// Same native-dialog lifecycle as the exercise demonstration modal.
export default function StartPlanDialog({
  busy,
  error,
  onCancel,
  onConfirm,
  planName = 'Beginner Full Body',
  workoutDays = BEGINNER_WORKOUT_DAYS,
}) {
  const ref = useRef(null);
  const [selected, setSelected] = useState(earliestMonday);
  const [dateError, setDateError] = useState('');
  const minimum = earliestMonday();
  const confirm = () => {
    if (selected.getDay() !== 1 || localDateKey(selected) < localDateKey(earliestMonday())) { setDateError('Please choose today or a future Monday.'); return; }
    setDateError(''); onConfirm(localDateKey(selected));
  };
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector('button').focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  const cancel = () => { if (!busy) onCancel(); };
  return createPortal(<dialog ref={ref} className="start-plan-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} aria-modal="true"
    onCancel={(event) => { event.preventDefault(); cancel(); }} onClick={(event) => { if (event.target === event.currentTarget) cancel(); }}>
    <div className="start-plan-dialog__content" aria-busy={busy}>
      <button className="start-plan-dialog__close" aria-label="Close confirmation" disabled={busy} onClick={cancel}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
      <span className="start-plan-dialog__icon"><i className="fa-regular fa-calendar-check" aria-hidden="true" /></span>
      <h2 id={titleId}>Start {planName}?</h2>
      <p id={descriptionId}>You're about to begin this 4-week workout plan. Your progress will be tracked as you complete each scheduled workout.</p>
      <p className="start-plan-dialog__facts">3 Days/Week <span>•</span> 4 Weeks <span>•</span> 12 Workouts</p>
      <section className="start-plan-dialog__dates" aria-labelledby="plan-date-title">
        <h3 id="plan-date-title">Choose Your Start Date</h3>
        <p>Choose the Monday that starts your plan week. Workouts are scheduled every {listDays(workoutDays)}.</p>
        <div className="start-plan-dialog__selector">
          <button aria-label="Earlier Monday" disabled={busy || localDateKey(selected) <= localDateKey(minimum)} onClick={() => setSelected(addDays(selected, -7))}>&lsaquo;</button>
          <time dateTime={localDateKey(selected)} aria-live="polite">{selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</time>
          <button aria-label="Later Monday" disabled={busy} onClick={() => setSelected(addDays(selected, 7))}>&rsaquo;</button>
        </div>
        <p>Your first week</p>
        <div className="start-plan-dialog__preview" aria-live="polite">{workoutDays.map(({ label, offset }) => {
          const date = addDays(selected, offset);
          return <div key={label}><strong>{label}</strong><time dateTime={localDateKey(date)}>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time></div>;
        })}</div>
        {dateError && <p role="alert" className="start-plan-dialog__error">{dateError}</p>}
      </section>
      {error && <p className="start-plan-dialog__error" role="alert">{error}</p>}
      <div className="start-plan-dialog__buttons"><button disabled={busy} onClick={cancel}>Cancel</button><button disabled={busy} onClick={confirm}>{busy ? 'Starting Plan...' : 'Start Plan'}</button></div>
    </div>
  </dialog>, document.body);
}
