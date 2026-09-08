import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ExerciseSelectionPage from './pages/ExerciseSelectionPage';
import SquatPage from './pages/SquatPage';
import SquatCameraPage from './pages/SquatCameraPage';
import PlankPage from './pages/PlankPage';
import PlankCameraPage from './pages/PlankCameraPage';
import PushUpPage from './pages/PushUpPage';
import PushUpCameraPage from './pages/PushUpCameraPage';
import LungePage from './pages/LungePage';
import LungeCameraPage from './pages/LungeCameraPage';
import LegRaisePage from './pages/LegRaisePage';
import LegRaiseCameraPage from './pages/LegRaiseCameraPage';
import SessionSummaryPage from './pages/SessionSummaryPage';
import WorkoutPlansPage from './pages/WorkoutPlansPage';
import BeginnerFullBodyDetails from './pages/workout-plans/BeginnerFullBodyDetails';
import LowerBodyFocusDetails from './pages/workout-plans/LowerBodyFocusDetails';
import CoreUpperBodyDetails from './pages/workout-plans/CoreUpperBodyDetails';

function PrivateRoute({ children }) {
  const user = localStorage.getItem('user');
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/exercises" element={<PrivateRoute><ExerciseSelectionPage /></PrivateRoute>} />
        <Route path="/exercises/squat" element={<PrivateRoute><SquatPage /></PrivateRoute>} />
        <Route path="/exercises/squat/start" element={<PrivateRoute><SquatCameraPage /></PrivateRoute>} />
        <Route path="/exercises/plank" element={<PrivateRoute><PlankPage /></PrivateRoute>} />
        <Route path="/exercises/plank/start" element={<PrivateRoute><PlankCameraPage /></PrivateRoute>} />
        <Route path="/exercises/push-up" element={<PrivateRoute><PushUpPage /></PrivateRoute>} />
        <Route path="/exercises/push-up/start" element={<PrivateRoute><PushUpCameraPage /></PrivateRoute>} />
        <Route path="/exercises/lunge" element={<PrivateRoute><LungePage /></PrivateRoute>} />
        <Route path="/exercises/lunge/start" element={<PrivateRoute><LungeCameraPage /></PrivateRoute>} />
        <Route path="/exercises/leg-raise" element={<PrivateRoute><LegRaisePage /></PrivateRoute>} />
        <Route path="/exercises/leg-raise/start" element={<PrivateRoute><LegRaiseCameraPage /></PrivateRoute>} />
        <Route path="/session-summary" element={<PrivateRoute><SessionSummaryPage /></PrivateRoute>} />
        <Route path="/workout-plans" element={<PrivateRoute><WorkoutPlansPage /></PrivateRoute>} />
        <Route path="/workout-plans/beginner-full-body" element={<PrivateRoute><BeginnerFullBodyDetails /></PrivateRoute>} />
        <Route path="/workout-plans/lower-body-focus" element={<PrivateRoute><LowerBodyFocusDetails /></PrivateRoute>} />
        <Route path="/workout-plans/core-upper-body" element={<PrivateRoute><CoreUpperBodyDetails /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
