export const FITNESS_LEVEL_OPTIONS = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: "I'm new to exercising or still learning proper techniques.",
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'I exercise regularly and am familiar with basic workout routines.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'I have extensive exercise experience and regularly perform challenging workouts.',
  },
];

export const EXERCISE_EXPERIENCE_OPTIONS = [
  { value: 'less_than_6_months', label: 'Less than 6 months' },
  { value: '6_to_12_months', label: '6-12 months' },
  { value: '1_to_2_years', label: '1-2 years' },
  { value: 'more_than_2_years', label: 'More than 2 years' },
];

export const WORKOUT_FOCUS_OPTIONS = [
  {
    value: 'full_body',
    label: 'General fitness / Full body',
    description: 'Build balanced strength, movement, and endurance across the whole body.',
  },
  {
    value: 'lower_body',
    label: 'Lower body / Legs and glutes',
    description: 'Prioritize lower-body strength with movements for the legs and glutes.',
  },
  {
    value: 'core_upper_body',
    label: 'Core and upper body',
    description: 'Focus on core control and upper-body strength.',
  },
  {
    value: 'prefer_not_to_say',
    label: 'No preference / Prefer not to say',
    description: 'Do not use a workout focus to personalize plan suggestions.',
  },
];

export const LIMITATION_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const AFFECTED_AREA_OPTIONS = [
  { value: 'knee', label: 'Knee' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'hip', label: 'Hip' },
  { value: 'back', label: 'Back' },
  { value: 'other', label: 'Other' },
];

export const optionLabel = (options, value, fallback = 'Not set') => (
  options.find((option) => option.value === value)?.label || fallback
);
