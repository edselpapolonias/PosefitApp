import { normalizeFormIssues } from './formIssues';
import { createSessionResult, saveLatestSessionResult, readLatestSessionResult } from './summaryService';
import { fetchSessionCoachFeedback } from './aiCoachService';
import axios from 'axios';

jest.mock('axios');

test('groups aliases, keeps all issues, sorts frequency and survives storage', () => {
  const result = createSessionResult({ exercise: { id: 'squat' }, correctReps: 8, incorrectReps: 2,
    formIssues: [{ type: 'Squat depth too shallow', count: 2 }, { type: 'Not deep enough', count: 3 },
      { type: 'Uneven leg movement', count: 1 }, { type: 'Hold for one second.', count: 2 }] });
  expect(result.formIssues.map((issue) => [issue.issueId, issue.count])).toEqual([
    ['squat:insufficient-depth', 5], ['squat:short-hold', 2], ['squat:uneven-legs', 1],
  ]);
  expect(result.accuracy).toBe(80);
  saveLatestSessionResult(result);
  expect(readLatestSessionResult().formIssues).toEqual(result.formIssues);
});

test.each([
  ['push-up', ['Incomplete Push Up depth', 'Body alignment outside 160°–180°', 'Arm angle difference exceeded 30°']],
  ['plank', ['Hips or lower back too low', 'Hips or back too high']],
  ['lunge', ['Lunge depth was excessive', 'Lunge was not completed by returning to the start position']],
  ['leg-raise', ['Hold for one second.', 'Knees bent during the Leg Raise', 'Legs were raised above the 60° target range']],
])('%s retains all supported issues with stable IDs', (exercise, reasons) => {
  const issues = normalizeFormIssues(Object.fromEntries(reasons.map((reason) => [reason, 2])), exercise);
  expect(issues).toHaveLength(reasons.length);
  expect(issues.every((issue) => !issue.issueId.includes(':recorded:'))).toBe(true);
  expect(normalizeFormIssues(issues, exercise)).toEqual(issues);
});

test('empty sessions stay empty and all normalized issues reach Gemini', async () => {
  expect(normalizeFormIssues([], 'squat')).toEqual([]);
  axios.post.mockResolvedValue({ data: { feedback: { feedbackParagraph: 'Session recorded.' } } });
  const session = createSessionResult({ exercise: { id: 'squat' }, formIssues: {
    'Not deep enough': 4, 'Uneven leg movement': 2, 'Hold for one second.': 1,
  } });
  await fetchSessionCoachFeedback(session);
  const payload = axios.post.mock.calls[0][1];
  expect(payload.summary.formIssues).toEqual(session.formIssues);
  expect(Object.keys(payload.summary.mistakes)).toHaveLength(3);
});
