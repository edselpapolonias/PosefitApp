import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ExerciseSelectionPage from './pages/ExerciseSelectionPage';
import SquatPage from './pages/SquatPage';
import SquatCameraPage from './pages/SquatCameraPage';

function PrivateRoute({ children }) {
  const user = localStorage.getItem('user');
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/exercises" element={<PrivateRoute><ExerciseSelectionPage /></PrivateRoute>} />
        <Route path="/exercises/squat" element={<PrivateRoute><SquatPage /></PrivateRoute>} />
        <Route path="/exercises/squat/start" element={<PrivateRoute><SquatCameraPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;