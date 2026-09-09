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
  disabled = false,
}) {
  const updateValue = (direction) => {
    if (disabled) return;
    const nextValue = Math.min(max, Math.max(min, value + (step * direction)));
    onChange(nextValue);
  };

  return (
    <div className={`squat-config__row${disabled ? ' squat-config__row--locked' : ''}`} aria-disabled={disabled}>
      <span className="squat-config__icon" aria-hidden="true">
        <i className={`fa-solid ${icon}`} />
      </span>
      <span className="squat-config__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <div className="squat-stepper" aria-label={`${label}: ${value}${suffix}${disabled ? ', locked' : ''}`}>
        <button
          type="button"
          onClick={() => updateValue(-1)}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
        >
          <i className="fa-solid fa-minus" aria-hidden="true" />
        </button>
        <output aria-live="polite">{value}{suffix}</output>
        <button
          type="button"
          onClick={() => updateValue(1)}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
        >
          <i className="fa-solid fa-plus" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
