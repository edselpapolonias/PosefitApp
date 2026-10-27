const GENERAL_OTHER_MESSAGE = 'You indicated another physical limitation. Consider your own comfort, mobility, and physical capabilities when deciding whether to perform this exercise.';

export const EXERCISE_CONSIDERATIONS = {
  squat: {
    name: 'Squat',
    relevantAreas: ['knee', 'hip', 'back'],
    messages: {
      knee: 'Squats involve bending and extending the knees. Depending on your mobility and comfort, you may need adjustments to perform this exercise appropriately.',
      hip: 'Squats involve hip bending and extension through a controlled range of motion. Some hip limitations may affect the depth or position that feels appropriate for you.',
      back: 'Squats require trunk stability and control throughout the movement. Some back limitations may affect the position or range of motion that feels appropriate for you.',
    },
  },
  'push-up': {
    name: 'Push-up',
    relevantAreas: ['shoulder', 'wrist', 'back'],
    messages: {
      shoulder: 'Push-ups place demands on the shoulders and upper body. Certain movements may require adjustments depending on your mobility and physical capabilities.',
      wrist: 'Push-ups place body weight through the wrists while the arms bend and extend. Some wrist limitations may make the supported position uncomfortable or require adjustments.',
      back: 'Push-ups require the trunk to remain stable and aligned. Some back limitations may affect the position that feels comfortable or appropriate for you.',
    },
  },
  plank: {
    name: 'Plank',
    relevantAreas: ['shoulder', 'wrist', 'back', 'hip'],
    messages: {
      shoulder: 'Planks require the shoulders to support and stabilize the upper body. Some shoulder limitations may affect how comfortably you can maintain the supported position.',
      wrist: 'Some Plank positions place weight on the wrists. Depending on your physical capabilities, the supported position may be uncomfortable or require adjustments.',
      back: 'Planks require steady trunk alignment and core control. Some back limitations may affect how comfortably you can maintain the standard position.',
      hip: 'Planks use the hips and surrounding muscles to help maintain body alignment. Some hip limitations may affect the position or hold duration that feels appropriate for you.',
    },
  },
  lunge: {
    name: 'Lunge',
    relevantAreas: ['knee', 'hip', 'back'],
    messages: {
      knee: 'Lunges involve knee bending, balance, and lower-body control. Depending on your mobility, certain movements may require adjustments.',
      hip: 'Lunges use a split stance with hip bending and extension. Some hip limitations may affect your comfortable stance length or range of motion.',
      back: 'Lunges require upright trunk control and balance. Some back limitations may affect the position or range of motion that feels appropriate for you.',
    },
  },
  'leg-raise': {
    name: 'Leg Raise',
    relevantAreas: ['hip', 'back'],
    messages: {
      hip: 'Leg Raises involve hip movement and core engagement. Depending on your mobility, certain positions may require adjustments.',
      back: 'Leg Raises require core control while the legs move. Some back limitations may affect the position or range of motion that feels comfortable for you.',
    },
  },
};

const AREA_LABELS = {
  knee: 'Knee',
  shoulder: 'Shoulder',
  wrist: 'Wrist',
  hip: 'Hip',
  back: 'Back',
  other: 'Other',
};

export function getExerciseConsiderations(exerciseId, affectedAreas = []) {
  const exercise = EXERCISE_CONSIDERATIONS[exerciseId];
  if (!exercise || !Array.isArray(affectedAreas)) return null;

  const items = affectedAreas
    .filter((area) => area === 'other' || exercise.relevantAreas.includes(area))
    .map((area) => ({
      area,
      label: AREA_LABELS[area],
      message: area === 'other' ? GENERAL_OTHER_MESSAGE : exercise.messages[area],
    }));
  if (!items.length) return null;

  return {
    exerciseName: exercise.name,
    items,
    footer: `PoseFit currently evaluates standard ${exercise.name} movements. Please make sure the exercise is appropriate for your physical capabilities before proceeding.`,
  };
}
