import { getExerciseConsiderations } from '../../features/fitnessProfile/exerciseConsiderations';
import { workoutPlans } from './workoutPlansData';

const FOCUS_LABELS = {
  full_body: 'full-body training',
  lower_body: 'lower-body training',
  core_upper_body: 'core and upper-body training',
};

const FOCUS_PLAN_IDS = {
  full_body: 'beginner-full-body',
  lower_body: 'lower-body-focus',
  core_upper_body: 'core-upper-body',
};

const FITNESS_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);

function recommendationReason(fitnessLevel, workoutFocus) {
  const level = fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1);
  const focus = FOCUS_LABELS[workoutFocus];

  if (fitnessLevel === 'beginner') {
    if (workoutFocus === 'full_body') {
      return 'Prioritizes the available plan matching your Beginner fitness level, and it also matches your preference for full-body training.';
    }
    return `Prioritizes the available plan matching your Beginner fitness level. Your preference for ${focus} is noted, but PoseFit does not currently offer a Beginner plan dedicated to that focus.`;
  }

  if (workoutFocus === 'full_body') {
    const availability = fitnessLevel === 'advanced'
      ? 'among the available Beginner and Intermediate plans'
      : 'among the currently available plans';
    return `Matches your preference for full-body training ${availability}. Its actual difficulty is Beginner, which differs from your ${level} fitness level.`;
  }

  if (fitnessLevel === 'advanced') {
    return `Matches your preference for ${focus} among the available Beginner and Intermediate plans. Its actual difficulty is Intermediate because PoseFit does not currently offer an Advanced plan.`;
  }

  return `Matches your Intermediate fitness level and preference for ${focus}.`;
}

function planConsiderations(plan, profile) {
  if (profile.physicalLimitations === 'prefer_not_to_say') {
    return {
      items: [],
      notice: 'You chose Prefer not to say, so PoseFit cannot identify exercise-specific considerations. If exercise suitability requires individual assessment, seek review from a qualified healthcare or fitness professional before starting.',
    };
  }

  if (profile.physicalLimitations !== 'yes') return { items: [], notice: '' };

  const affectedAreas = Array.isArray(profile.affectedAreas) ? profile.affectedAreas : [];
  if (!affectedAreas.length) {
    return {
      items: [],
      notice: 'You reported a physical limitation without specifying affected areas, so PoseFit cannot identify exercise-specific considerations. Consider professional review if you are unsure whether this plan is appropriate for you.',
    };
  }

  const items = plan.exercises
    .map((exercise) => {
      const consideration = getExerciseConsiderations(exercise.id, affectedAreas);
      return consideration ? { exerciseId: exercise.id, ...consideration } : null;
    })
    .filter(Boolean);

  return {
    items,
    notice: items.length
      ? 'These are general exercise considerations, not an assessment of suitability. Seek review from a qualified healthcare or fitness professional when your individual condition or capabilities require it.'
      : 'No direct overlap was found between the reported areas and this plan’s exercises. This is not a suitability assessment; consider professional review if you are unsure whether the plan is appropriate for you.',
  };
}

export function getWorkoutPlanSuggestion(profile = {}, plans = workoutPlans) {
  if (profile.workoutFocus === 'prefer_not_to_say') {
    return {
      status: 'opted_out',
      plan: null,
      missingFields: [],
      reason: '',
      considerations: { items: [], notice: '' },
    };
  }

  const missingFields = [];
  if (!FITNESS_LEVELS.has(profile.fitnessLevel)) missingFields.push('fitness level');
  if (!profile.workoutFocus || !FOCUS_PLAN_IDS[profile.workoutFocus]) missingFields.push('workout focus');

  if (missingFields.length) {
    return {
      status: 'incomplete',
      plan: null,
      missingFields,
      reason: `Complete your ${missingFields.join(' and ')} to receive a personalized plan suggestion.`,
      considerations: { items: [], notice: '' },
    };
  }

  const planId = profile.fitnessLevel === 'beginner'
    ? 'beginner-full-body'
    : FOCUS_PLAN_IDS[profile.workoutFocus];
  const plan = plans.find((candidate) => candidate.slug === planId) || null;

  if (!plan) {
    return {
      status: 'unavailable',
      plan: null,
      missingFields: [],
      reason: 'The matching workout plan is not currently available. You can still browse all available plans below.',
      considerations: { items: [], notice: '' },
    };
  }

  return {
    status: 'ready',
    plan,
    missingFields: [],
    reason: recommendationReason(profile.fitnessLevel, profile.workoutFocus),
    considerations: planConsiderations(plan, profile),
  };
}

export { FOCUS_PLAN_IDS };
