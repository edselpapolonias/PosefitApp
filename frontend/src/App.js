import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/auth/AuthPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ExerciseSelectionPage from './pages/exercises/ExerciseSelectionPage';
import SquatPage from './pages/exercises/configuration/SquatPage';
import SquatCameraPage from './pages/exercises/camera/SquatCameraPage';
import PlankPage from './pages/exercises/configuration/PlankPage';
import PlankCameraPage from './pages/exercises/camera/PlankCameraPage';
import PushUpPage from './pages/exercises/configuration/PushUpPage';
import PushUpCameraPage from './pages/exercises/camera/PushUpCameraPage';
import LungePage from './pages/exercises/configuration/LungePage';
import LungeCameraPage from './pages/exercises/camera/LungeCameraPage';
import LegRaisePage from './pages/exercises/configuration/LegRaisePage';
import LegRaiseCameraPage from './pages/exercises/camera/LegRaiseCameraPage';
import SessionSummaryPage from './pages/session/SessionSummaryPage';
import WorkoutPlansPage from './pages/workout-plans/WorkoutPlansPage';
import BeginnerFullBodyDetails from './pages/workout-plans/details/BeginnerFullBodyDetails';
import LowerBodyFocusDetails from './pages/workout-plans/details/LowerBodyFocusDetails';
import CoreUpperBodyDetails from './pages/workout-plans/details/CoreUpperBodyDetails';

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
