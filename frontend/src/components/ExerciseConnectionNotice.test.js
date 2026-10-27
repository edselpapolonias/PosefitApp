import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExerciseConnectionNotice from './ExerciseConnectionNotice';

const setOnline = (value) => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value });
};

const setExercisePath = () => {
  window.history.pushState({}, '', '/exercises/squat/start');
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

beforeEach(() => {
  setExercisePath();
  setOnline(true);
  document.body.style.overflow = '';
});

test('blocks an offline exercise start and shows the connection notice', () => {
  const start = jest.fn();
  setOnline(false);
  render(<><ExerciseConnectionNotice /><button className="camera-session__start-button" onClick={start}>Start Session</button></>);

  fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));

  expect(start).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'Internet connection required' })).toBeInTheDocument();
  expect(screen.getByText('You are currently offline.')).toBeInTheDocument();
  expect(document.body.style.overflow).toBe('hidden');
});

test('does not interfere with an exercise start while online', () => {
  const start = jest.fn();
  render(<><ExerciseConnectionNotice /><button className="camera-session__start-button" onClick={start}>Start Session</button></>);

  fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));

  expect(start).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('retry starts the original session after the connection returns', () => {
  jest.useFakeTimers();
  const start = jest.fn();
  setOnline(false);
  render(<><ExerciseConnectionNotice /><button className="camera-session__start-button" onClick={start}>Start Session</button></>);
  fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));

  setOnline(true);
  fireEvent(window, new Event('online'));
  expect(screen.getByText('Connection restored. You can try again.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  jest.runOnlyPendingTimers();

  expect(start).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  jest.useRealTimers();
});

test('close dismisses the notice and restores page scrolling', () => {
  setOnline(false);
  render(<><ExerciseConnectionNotice /><button className="camera-session__start-button">Start Session</button></>);
  fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
});
