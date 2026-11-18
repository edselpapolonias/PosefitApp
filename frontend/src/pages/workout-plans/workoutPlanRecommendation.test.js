import { workoutPlans } from './workoutPlansData';
import { getWorkoutPlanSuggestion } from './workoutPlanRecommendation';

const profile = (fitnessLevel, workoutFocus, extra = {}) => ({
  fitnessLevel,
  workoutFocus,
  physicalLimitations: 'no',
  affectedAreas: [],
  ...extra,
});

describe('workout plan matching', () => {
  test.each(['full_body', 'lower_body', 'core_upper_body'])(
    'suggests Beginner Full Body for a beginner with %s focus',
    (workoutFocus) => {
      const result = getWorkoutPlanSuggestion(profile('beginner', workoutFocus), workoutPlans);

      expect(result.status).toBe('ready');
      expect(result.plan.slug).toBe('beginner-full-body');
      expect(result.plan.level).toBe('Beginner');
    },
  );

  test.each([
    ['intermediate', 'full_body', 'beginner-full-body'],
    ['advanced', 'full_body', 'beginner-full-body'],
    ['intermediate', 'lower_body', 'lower-body-focus'],
    ['advanced', 'lower_body', 'lower-body-focus'],
    ['intermediate', 'core_upper_body', 'core-upper-body'],
    ['advanced', 'core_upper_body', 'core-upper-body'],
  ])('matches %s and %s to %s', (fitnessLevel, workoutFocus, planId) => {
    const result = getWorkoutPlanSuggestion(profile(fitnessLevel, workoutFocus), workoutPlans);

    expect(result.status).toBe('ready');
    expect(result.plan.slug).toBe(planId);
    expect(result.reason).toMatch(new RegExp(fitnessLevel === 'advanced' ? 'available Beginner and Intermediate plans' : 'match', 'i'));
  });

  test('invites an older profile with missing focus to complete the profile', () => {
    const result = getWorkoutPlanSuggestion(profile('intermediate', ''));

    expect(result.status).toBe('incomplete');
    expect(result.plan).toBeNull();
    expect(result.missingFields).toEqual(['workout focus']);
  });

  test('does not create a suggestion when the user chooses no preference', () => {
    const result = getWorkoutPlanSuggestion(profile('intermediate', 'prefer_not_to_say'));

    expect(result.status).toBe('opted_out');
    expect(result.plan).toBeNull();
    expect(result.considerations).toEqual({ items: [], notice: '' });
  });

  test('returns exercise considerations for affected areas used by the suggested plan', () => {
    const result = getWorkoutPlanSuggestion(profile('intermediate', 'lower_body', {
      physicalLimitations: 'yes',
      affectedAreas: ['knee'],
    }));

    expect(result.considerations.items.map((item) => item.exerciseId)).toEqual(['squat', 'lunge']);
    expect(result.considerations.items.every((item) => item.items[0].area === 'knee')).toBe(true);
    expect(result.considerations.notice).toMatch(/professional/i);
  });

  test.each([
    ['prefer_not_to_say', ['knee'], /Prefer not to say/],
    ['yes', [], /without specifying affected areas/],
  ])('handles %s without showing exercise-specific items', (physicalLimitations, affectedAreas, notice) => {
    const result = getWorkoutPlanSuggestion(profile('intermediate', 'lower_body', {
      physicalLimitations,
      affectedAreas,
    }));

    expect(result.considerations.items).toEqual([]);
    expect(result.considerations.notice).toMatch(notice);
  });
});
