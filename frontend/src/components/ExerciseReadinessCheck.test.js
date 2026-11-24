import React, { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExerciseReadinessButton, {
  browserCompatibilityIssue,
  isFullBodyVisible,
} from './ExerciseReadinessCheck';

const mockPoseFactory = jest.fn();

jest.mock('@mediapipe/pose', () => ({
  Pose: function MockPose(options) { return mockPoseFactory(options); },
}));

function fullBodyLandmarks({ horizontal = false } = {}) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.95 }));
  const positions = horizontal
    ? {
      0: [0.08, 0.45], 11: [0.24, 0.45], 12: [0.24, 0.5], 23: [0.48, 0.48], 24: [0.48, 0.52],
      25: [0.7, 0.48], 26: [0.7, 0.52], 27: [0.92, 0.48], 28: [0.92, 0.52],
    }
    : {
      0: [0.5, 0.08], 11: [0.44, 0.25], 12: [0.56, 0.25], 23: [0.46, 0.5], 24: [0.54, 0.5],
      25: [0.46, 0.72], 26: [0.54, 0.72], 27: [0.46, 0.92], 28: [0.54, 0.92],
    };
  Object.entries(positions).forEach(([index, [x, y]]) => { landmarks[index] = { x, y, visibility: 0.95 }; });
  return landmarks;
}

function setOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value });
}

function renderReadiness(onReady = jest.fn()) {
  const videoRef = createRef();
  render(
    <div className="camera-session__camera">
      <video ref={videoRef} muted />
      <ExerciseReadinessButton videoRef={videoRef} exerciseName="Squat" onReady={onReady} />
    </div>,
  );
  return { onReady, videoRef };
}

beforeEach(() => {
  setOnline(true);
  mockPoseFactory.mockReset();
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(window.navigator, 'permissions', {
    configurable: true,
    value: { query: jest.fn().mockResolvedValue({ state: 'prompt' }) },
  });
  Object.defineProperty(window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn() },
  });
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('recognizes standing and horizontal full-body poses but rejects missing ankles', () => {
  expect(isFullBodyVisible(fullBodyLandmarks())).toBe(true);
  expect(isFullBodyVisible(fullBodyLandmarks({ horizontal: true }))).toBe(true);

  const incomplete = fullBodyLandmarks();
  incomplete[27].visibility = 0.1;
  incomplete[28].visibility = 0.1;
  expect(isFullBodyVisible(incomplete)).toBe(false);
});

test('reports unsupported camera access as a browser compatibility issue', () => {
  expect(browserCompatibilityIssue(
    { isSecureContext: true, location: { hostname: 'localhost' }, WebAssembly, requestAnimationFrame: () => {} },
    { mediaDevices: {} },
  )).toMatch(/cannot access a camera/i);
});

test('stops before camera access and gives instructions while offline', async () => {
  setOnline(false);
  renderReadiness();

  fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));

  expect(await screen.findByRole('dialog', { name: 'Exercise readiness check' })).toBeInTheDocument();
  expect(await screen.findByText('No internet connection')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Connect this laptop to the internet');
  expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
});

test('explains how to recover when camera permission is denied', async () => {
  const denied = new Error('denied');
  denied.name = 'NotAllowedError';
  navigator.mediaDevices.getUserMedia.mockRejectedValue(denied);
  renderReadiness();

  fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));

  expect(await screen.findByText('Camera unavailable')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Allow camera permission');
});

test('starts the existing session only after model loading and stable full-body visibility', async () => {
  const track = { stop: jest.fn() };
  navigator.mediaDevices.getUserMedia.mockResolvedValue({
    getVideoTracks: () => [track],
    getTracks: () => [track],
  });
  let resultsHandler;
  const pose = {
    setOptions: jest.fn(),
    onResults: jest.fn((handler) => { resultsHandler = handler; }),
    initialize: jest.fn().mockResolvedValue(),
    send: jest.fn(async () => resultsHandler({ poseLandmarks: fullBodyLandmarks() })),
    close: jest.fn().mockResolvedValue(),
  };
  mockPoseFactory.mockReturnValue(pose);
  const onReady = jest.fn();
  renderReadiness(onReady);

  fireEvent.click(screen.getByRole('button', { name: 'Start Session' }));

  expect(await screen.findByText('Camera available and allowed')).toBeInTheDocument();
  await waitFor(() => expect(pose.initialize).toHaveBeenCalled());
  await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1), { timeout: 2500 });
  expect(track.stop).toHaveBeenCalled();
  expect(pose.close).toHaveBeenCalled();
});
