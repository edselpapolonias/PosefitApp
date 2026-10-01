import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

const mockRoutePaths = [];

jest.mock('react-router-dom', () => {
  const ReactModule = require('react');
  return {
    BrowserRouter: ({ children }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    Routes: ({ children }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    Route: ({ path }) => {
      mockRoutePaths.push(path);
      return null;
    },
    Navigate: () => null,
  };
}, { virtual: true });

jest.mock('./pages/auth/AuthPage', () => () => null);
jest.mock('./pages/dashboard/DashboardPage', () => () => null);
jest.mock('./pages/exercises/ExerciseSelectionPage', () => () => null);
jest.mock('./pages/exercises/configuration/SquatPage', () => () => null);
jest.mock('./pages/exercises/camera/SquatCameraPage', () => () => null);
jest.mock('./pages/exercises/configuration/PlankPage', () => () => null);
jest.mock('./pages/exercises/camera/PlankCameraPage', () => () => null);
jest.mock('./pages/exercises/configuration/PushUpPage', () => () => null);
jest.mock('./pages/exercises/camera/PushUpCameraPage', () => () => null);
jest.mock('./pages/exercises/configuration/LungePage', () => () => null);
jest.mock('./pages/exercises/camera/LungeCameraPage', () => () => null);
jest.mock('./pages/exercises/configuration/LegRaisePage', () => () => null);
jest.mock('./pages/exercises/camera/LegRaiseCameraPage', () => () => null);
jest.mock('./pages/session/SessionSummaryPage', () => () => null);
jest.mock('./pages/workout-plans/WorkoutPlansPage', () => () => null);
jest.mock('./pages/workout-plans/details/BeginnerFullBodyDetails', () => () => null);
jest.mock('./pages/workout-plans/details/LowerBodyFocusDetails', () => () => null);
jest.mock('./pages/workout-plans/details/CoreUpperBodyDetails', () => () => null);
jest.mock('./pages/history/HistoryPage', () => () => null);
jest.mock('./pages/history/PlanHistoryPage', () => () => null);
jest.mock('./pages/history/HistorySessionSummaryPage', () => () => null);

test('keeps every PoseFit route registered after reorganizing pages', () => {
  mockRoutePaths.length = 0;
  render(<App />);

  expect(mockRoutePaths).toEqual([
    '/',
    '/login',
    '/register',
    '/dashboard',
    '/exercises',
    '/exercises/squat',
    '/exercises/squat/start',
    '/exercises/plank',
    '/exercises/plank/start',
    '/exercises/push-up',
    '/exercises/push-up/start',
    '/exercises/lunge',
    '/exercises/lunge/start',
    '/exercises/leg-raise',
    '/exercises/leg-raise/start',
    '/session-summary',
    '/workout-plans',
    '/workout-plans/beginner-full-body',
    '/workout-plans/lower-body-focus',
    '/workout-plans/core-upper-body',
    '/history',
    '/history/exercise/:exerciseId',
    '/history/plan/:planInstanceId',
    '/history/session/:sessionId',
    '/progress',
  ]);
});
