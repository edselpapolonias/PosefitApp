import React from 'react';
import { formatTime } from '../utils/formatters';
import './CameraInactivityOverlay.css';

export default function CameraInactivityOverlay({
  isWarningVisible,
  isCancelled,
  remainingSeconds,
  isWorkoutPlan,
  onBack,
}) {
  if (isCancelled) {
    return (
      <div className="camera-inactivity camera-inactivity--cancelled" role="alert" aria-live="assertive">
        <div className="camera-inactivity__cancelled-card">
          <span className="camera-inactivity__cancelled-icon" aria-hidden="true">
            <i className="fa-solid fa-person-circle-xmark" />
          </span>
          <p className="camera-inactivity__eyebrow">Camera inactivity</p>
          <h2>Session Automatically Cancelled</h2>
          <p>Your workout session was automatically cancelled because no person was detected by the camera for 3 minutes.</p>
          <p>You can start another session whenever you're ready.</p>
          <button type="button" onClick={onBack}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            {isWorkoutPlan ? 'Back to Workout Plan' : 'Back to Exercises'}
          </button>
        </div>
      </div>
    );
  }

  if (!isWarningVisible) return null;

  return (
    <div className="camera-inactivity camera-inactivity--warning" role="status" aria-live="polite">
      <div className="camera-inactivity__warning-card">
        <span className="camera-inactivity__warning-icon" aria-hidden="true">
          <i className="fa-solid fa-person-circle-question" />
        </span>
        <div className="camera-inactivity__warning-copy">
          <p className="camera-inactivity__eyebrow">No person detected</p>
          <h2>Return to the camera to continue your workout.</h2>
          <p>Session automatically cancels when the timer reaches zero.</p>
        </div>
        <div className="camera-inactivity__countdown">
          <time dateTime={`PT${remainingSeconds}S`}>{formatTime(remainingSeconds)}</time>
          <span>Time remaining</span>
        </div>
      </div>
    </div>
  );
}
