import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CameraInactivityOverlay from './CameraInactivityOverlay';

test('renders nothing during the silent monitoring phase', () => {
  const { container } = render(<CameraInactivityOverlay remainingSeconds={180} />);
  expect(container).toBeEmptyDOMElement();
});

test('shows the remaining cancellation time after the display delay', () => {
  render(<CameraInactivityOverlay isWarningVisible remainingSeconds={150} />);
  expect(screen.getByText('No person detected')).toBeInTheDocument();
  expect(screen.getByText('02:30')).toBeInTheDocument();
  expect(screen.getByText('Return to the camera to continue your workout.')).toBeInTheDocument();
});

test.each([
  [false, 'Back to Exercises'],
  [true, 'Back to Workout Plan'],
])('shows the cancellation message and correct destination action', (isWorkoutPlan, actionLabel) => {
  const onBack = jest.fn();
  render(<CameraInactivityOverlay isCancelled remainingSeconds={0} isWorkoutPlan={isWorkoutPlan} onBack={onBack} />);
  expect(screen.getByText('Session Automatically Cancelled')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: actionLabel }));
  expect(onBack).toHaveBeenCalledTimes(1);
});
