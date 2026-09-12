import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistorySessionSummaryPage from './HistorySessionSummaryPage';
import { getHistorySession } from '../../services/historyService';

let mockSessionId = 'selected-squat';
jest.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: mockSessionId }),
  useLocation: () => ({ state: { history: { page: 2, search: 'squat' } } }),
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../components/Navbar', () => ({ activeItem }) => <div data-testid="navbar">{activeItem}</div>);
jest.mock('../../services/historyService', () => ({
  getHistorySession: jest.fn(),
}));

const squatSession = {
  id: 'selected-squat',
  exercise: 'squat',
  exerciseName: 'Squat',
  metricType: 'reps',
  status: 'completed',
  completedAt: '2026-09-10T10:32:00Z',
  duration: 680,
  setsCompleted: 3,
  accuracy: 94,
  correctReps: 28,
  incorrectReps: 2,
  totalReps: 30,
  totalHoldTime: null,
  configuration: { totalSets: 3, repsPerSet: 10 },
  setResults: [
    { setNum: 1, completedReps: 10, goodReps: 10, badReps: 0, accuracy: 100 },
    { setNum: 2, completedReps: 10, goodReps: 9, badReps: 1, accuracy: 90 },
    { setNum: 3, completedReps: 10, goodReps: 9, badReps: 1, accuracy: 90 },
  ],
  formIssues: [
    { issueId: 'squat:depth', label: 'Incomplete Squat Depth', count: 2, advice: 'Lower with control.' },
    { issueId: 'squat:balance', label: 'Uneven Balance', count: 1, advice: 'Keep your weight centered.' },
  ],
  feedback: {
    feedbackParagraph: 'You maintained steady form through the session.',
    issueFeedback: [{ issueId: 'squat:depth', advice: 'Use the saved depth guidance.' }],
  },
  analysis: {},
};

function renderPage(sessionId = 'selected-squat') {
  mockSessionId = sessionId;
  return render(<HistorySessionSummaryPage />);
}

beforeEach(() => {
  getHistorySession.mockReset();
  getHistorySession.mockResolvedValue(squatSession);
});

test('renders the selected saved session with feedback and set breakdown', async () => {
  renderPage();

  expect(await screen.findByRole('heading', { name: 'Session Summary' })).toBeInTheDocument();
  expect(getHistorySession).toHaveBeenCalledWith('selected-squat', expect.any(AbortSignal));
  expect(screen.getByTestId('navbar')).toHaveTextContent('History');
  expect(screen.getAllByText('Squat').length).toBeGreaterThan(1);
  expect(screen.getByText('30')).toBeInTheDocument();
  expect(screen.getByText('11:20')).toBeInTheDocument();
  expect(screen.getByText('3 / 3')).toBeInTheDocument();
  expect(screen.getByText('94%')).toBeInTheDocument();
  expect(screen.getByText('You maintained steady form through the session.')).toBeInTheDocument();
  expect(screen.getByText('Incomplete Squat Depth')).toBeInTheDocument();
  expect(screen.getByText('Uneven Balance')).toBeInTheDocument();
  expect(screen.getByText('Use the saved depth guidance.')).toBeInTheDocument();
  expect(screen.getByText('Keep your weight centered.')).toBeInTheDocument();

  const breakdown = screen.getByRole('table');
  expect(within(breakdown).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
    'Set', 'Reps (Goal)', 'Accuracy', 'Result',
  ]);
  expect(within(breakdown).getAllByText('10 / 10')).toHaveLength(3);
  expect(screen.getAllByRole('link', { name: 'Back to History' })).toHaveLength(2);
  expect(screen.queryByText('Performance Overview')).not.toBeInTheDocument();
  expect(screen.queryByText('Share Summary')).not.toBeInTheDocument();
  expect(screen.queryByText('Tip')).not.toBeInTheDocument();
  expect(screen.queryByText(/Workout Plan/i)).not.toBeInTheDocument();
});

test('uses time-based metrics for a saved plank session', async () => {
  getHistorySession.mockResolvedValue({
    ...squatSession,
    id: 'selected-plank',
    exercise: 'plank',
    exerciseName: 'Plank',
    metricType: 'time',
    totalReps: null,
    totalHoldTime: 60,
    configuration: { totalSets: 3, holdSecondsPerSet: 20 },
    setResults: [{ setNum: 1, holdTime: 20, accuracy: 95 }],
    formIssues: [],
    feedback: null,
  });
  renderPage('selected-plank');

  expect(await screen.findByText('Total Hold Time')).toBeInTheDocument();
  expect(screen.queryByText('Total Reps')).not.toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Time (Goal)' })).toBeInTheDocument();
  expect(screen.getByText('20 sec / 20 sec')).toBeInTheDocument();
  expect(screen.getByText('Great form!')).toBeInTheDocument();
});

test('shows a safe state when the session cannot be loaded', async () => {
  getHistorySession.mockRejectedValue({ response: { status: 404 } });
  renderPage('missing-session');

  expect(await screen.findByRole('heading', { name: 'Session summary unavailable' })).toBeInTheDocument();
  expect(screen.getByText('This completed workout session could not be found.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to History' })).toHaveAttribute('href', '/history');
});
