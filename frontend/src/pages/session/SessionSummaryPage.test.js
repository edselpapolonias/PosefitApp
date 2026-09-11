import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SessionSummaryPage from './SessionSummaryPage';

let mockSession;
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: { sessionResult: mockSession, comparison: {} } }),
}), { virtual: true });
jest.mock('../../components/Navbar', () => () => null);

beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
  mockSession = { id: 'test', exercise: { id: 'squat', name: 'Squat' }, feedback: { feedbackParagraph: 'Session recorded.' },
    formIssues: { 'Not deep enough': 4, 'Uneven leg movement': 2, 'Hold for one second.': 1 } };
});

test('shows every issue once even when AI omits it or adds an unknown ID', () => {
  mockSession.feedback.issueFeedback = [{ issueId: 'invented', advice: 'Invented problem' }];
  render(<SessionSummaryPage />);
  const card = screen.getByRole('heading', { name: 'Form Feedback' }).closest('section');
  expect(within(card).getByText('Incomplete Squat Depth')).toBeInTheDocument();
  expect(within(card).getByText('Uneven Leg Movement')).toBeInTheDocument();
  expect(within(card).getByText('Bottom Hold Too Short')).toBeInTheDocument();
  expect(within(card).getByText('4 occurrences')).toBeInTheDocument();
  expect(within(card).queryByText('Invented problem')).not.toBeInTheDocument();
});

test('no issues produces a positive state', () => {
  mockSession.formIssues = [];
  render(<SessionSummaryPage />);
  expect(screen.getByText('Great form! No significant form issues were detected during this session.')).toBeInTheDocument();
});
