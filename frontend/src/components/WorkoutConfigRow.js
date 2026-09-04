import React from 'react';

export default function WorkoutConfigRow({
  icon,
  label,
  description,
  value,
  suffix = '',
  min,
  max,
  step,
  onChange,
}) {
  const updateValue = (direction) => {
    const nextValue = Math.min(max, Math.max(min, value + (step * direction)));
    onChange(nextValue);
  };

  return (
    <div className="squat-config__row">
      <span className="squat-config__icon" aria-hidden="true">
        <i className={`fa-solid ${icon}`} />
      </span>
      <span className="squat-config__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <div className="squat-stepper" aria-label={`${label}: ${value}${suffix}`}>
        <button
          type="button"
          onClick={() => updateValue(-1)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <i className="fa-solid fa-minus" aria-hidden="true" />
        </button>
        <output aria-live="polite">{value}{suffix}</output>
        <button
          type="button"
          onClick={() => updateValue(1)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          <i className="fa-solid fa-plus" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
