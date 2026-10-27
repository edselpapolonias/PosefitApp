import React from 'react';
import './FitnessProfileControls.css';

export function ChoiceCards({ label, options, value, onChange, compact = false }) {
  return (
    <div
      className={`fitness-choice-grid${compact ? ' fitness-choice-grid--compact' : ''}`}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            className={`fitness-choice${selected ? ' fitness-choice--selected' : ''}`}
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
          >
            <span className="fitness-choice__indicator" aria-hidden="true">
              {selected && <i className="fa-solid fa-check" />}
            </span>
            <span>
              <strong>{option.label}</strong>
              {option.description && <small>{option.description}</small>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AffectedAreaPicker({ options, value, onChange }) {
  const selectedAreas = Array.isArray(value) ? value : [];
  const toggleArea = (area) => {
    onChange(
      selectedAreas.includes(area)
        ? selectedAreas.filter((item) => item !== area)
        : [...selectedAreas, area],
    );
  };

  return (
    <div className="fitness-area-grid" role="group" aria-label="Areas affected">
      {options.map((option) => {
        const selected = selectedAreas.includes(option.value);
        return (
          <button
            className={`fitness-area${selected ? ' fitness-area--selected' : ''}`}
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => toggleArea(option.value)}
          >
            <span aria-hidden="true"><i className={`fa-solid ${selected ? 'fa-check' : 'fa-plus'}`} /></span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
