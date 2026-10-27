import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import useCameraInactivity, {
  COUNTDOWN_DISPLAY_DELAY,
  INACTIVITY_TIMEOUT,
} from './useCameraInactivity';

function Harness({ enabled = true, onTimeout = () => {} }) {
  const inactivity = useCameraInactivity({ enabled, onTimeout });
  return (
    <div>
      <button type="button" onClick={() => inactivity.reportPersonDetection(false)}>Missing</button>
      <button type="button" onClick={() => inactivity.reportPersonDetection(true)}>Present</button>
      <span data-testid="warning">{String(inactivity.isWarningVisible)}</span>
      <span data-testid="cancelled">{String(inactivity.isCancelled)}</span>
      <span data-testid="remaining">{inactivity.remainingSeconds}</span>
    </div>
  );
}

describe('useCameraInactivity', () => {
  let now;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const advanceClock = (milliseconds) => {
    now = milliseconds;
    act(() => jest.advanceTimersByTime(250));
  };

  test('monitors silently before 30 seconds, then shows 02:30 remaining', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Missing' }));

    advanceClock(COUNTDOWN_DISPLAY_DELAY - 1);
    expect(screen.getByTestId('warning')).toHaveTextContent('false');

    advanceClock(COUNTDOWN_DISPLAY_DELAY);
    expect(screen.getByTestId('warning')).toHaveTextContent('true');
    expect(screen.getByTestId('remaining')).toHaveTextContent('150');

    advanceClock(COUNTDOWN_DISPLAY_DELAY + 1000);
    expect(screen.getByTestId('remaining')).toHaveTextContent('149');
  });

  test('returning resets the continuous absence instead of accumulating it', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Missing' }));
    advanceClock(45000);
    expect(screen.getByTestId('warning')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Present' }));
    expect(screen.getByTestId('warning')).toHaveTextContent('false');
    expect(screen.getByTestId('remaining')).toHaveTextContent('180');

    now = 50000;
    fireEvent.click(screen.getByRole('button', { name: 'Missing' }));
    advanceClock(70000);
    expect(screen.getByTestId('warning')).toHaveTextContent('false');
  });

  test('cancels once after 180 seconds of continuous absence', () => {
    const onTimeout = jest.fn();
    render(<Harness onTimeout={onTimeout} />);
    fireEvent.click(screen.getByRole('button', { name: 'Missing' }));

    advanceClock(INACTIVITY_TIMEOUT);
    expect(screen.getByTestId('cancelled')).toHaveTextContent('true');
    expect(screen.getByTestId('remaining')).toHaveTextContent('0');
    expect(onTimeout).toHaveBeenCalledTimes(1);

    advanceClock(INACTIVITY_TIMEOUT + 10000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  test('does not monitor while disabled', () => {
    render(<Harness enabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Missing' }));
    advanceClock(INACTIVITY_TIMEOUT);
    expect(screen.getByTestId('cancelled')).toHaveTextContent('false');
    expect(screen.getByTestId('warning')).toHaveTextContent('false');
  });
});
