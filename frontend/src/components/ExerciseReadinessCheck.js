import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pose } from '@mediapipe/pose';
import './ExerciseReadinessCheck.css';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose';
const REQUIRED_LANDMARK_GROUPS = [
  [0],
  [11, 12],
  [23, 24],
  [25, 26],
  [27, 28],
];

const CHECK_DEFINITIONS = [
  { id: 'browser', label: 'Browser compatibility', icon: 'fa-window-maximize' },
  { id: 'internet', label: 'Internet connection', icon: 'fa-wifi' },
  { id: 'camera', label: 'Camera and permission', icon: 'fa-video' },
  { id: 'model', label: 'Pose detection model', icon: 'fa-person-rays' },
  { id: 'body', label: 'Full-body visibility', icon: 'fa-person' },
];

const initialChecks = () => CHECK_DEFINITIONS.map((check) => ({
  ...check,
  status: 'pending',
  detail: 'Waiting to check',
}));

function landmarkIsVisible(landmark) {
  return Boolean(
    landmark
    && Number.isFinite(landmark.x)
    && Number.isFinite(landmark.y)
    && (landmark.visibility ?? 1) >= 0.45
    && landmark.x >= 0.02
    && landmark.x <= 0.98
    && landmark.y >= 0.02
    && landmark.y <= 0.98
  );
}

export function isFullBodyVisible(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 29) return false;
  const requiredPointsVisible = REQUIRED_LANDMARK_GROUPS.every((group) => (
    group.some((index) => landmarkIsVisible(landmarks[index]))
  ));
  if (!requiredPointsVisible) return false;

  const visiblePoints = landmarks.filter(landmarkIsVisible);
  const xValues = visiblePoints.map((landmark) => landmark.x);
  const yValues = visiblePoints.map((landmark) => landmark.y);
  const horizontalSpan = Math.max(...xValues) - Math.min(...xValues);
  const verticalSpan = Math.max(...yValues) - Math.min(...yValues);
  return Math.max(horizontalSpan, verticalSpan) >= 0.4;
}

export function browserCompatibilityIssue(browserWindow = window, browserNavigator = navigator) {
  const isLocal = ['localhost', '127.0.0.1'].includes(browserWindow.location?.hostname);
  if (browserWindow.isSecureContext === false && !isLocal) {
    return 'Open PoseFit through localhost or a secure HTTPS address.';
  }
  if (!browserNavigator.mediaDevices?.getUserMedia) {
    return 'This browser cannot access a camera. Use an up-to-date Chrome or Edge browser.';
  }
  if (typeof browserWindow.WebAssembly === 'undefined' || typeof browserWindow.requestAnimationFrame !== 'function') {
    return 'This browser cannot run PoseFit pose detection. Update Chrome or Edge and try again.';
  }
  return '';
}

export function describeExerciseStartError(error) {
  const name = error?.name || '';
  const message = String(error?.message || error || '');
  if (navigator.onLine === false || /failed to fetch|network|mediapipe|webassembly|wasm|solution/i.test(message)) {
    return 'Pose detection could not load. Check the internet connection, then try again.';
  }
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access is blocked. Allow camera permission in the browser, then try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found. Connect or enable a camera, then try again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is being used by another application. Close it there, then try again.';
  }
  return 'PoseFit could not start the camera session. Check the camera and internet connection, then try again.';
}

function ExerciseReadinessPanel({ videoRef, exerciseName, onReady, onCancel, onRetry }) {
  const titleId = useId();
  const descriptionId = useId();
  const headingRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const [checks, setChecks] = useState(initialChecks);
  const [message, setMessage] = useState('Checking this browser before opening the camera.');
  const [error, setError] = useState('');
  const [isPositioning, setIsPositioning] = useState(false);
  const portalTarget = videoRef.current?.closest('.camera-session__camera') || document.body;
  onReadyRef.current = onReady;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!portalTarget.classList?.contains('camera-session__camera')) return undefined;
    portalTarget.classList.add('exercise-readiness-active');
    return () => portalTarget.classList.remove('exercise-readiness-active');
  }, [portalTarget]);

  useEffect(() => {
    let cancelled = false;
    let completed = false;
    let stream = null;
    let pose = null;
    let animationFrame = null;
    let processingFrame = false;
    let stableBodyFrames = 0;
    let lastBodyMessage = '';
    let completionTimer = null;

    const updateCheck = (id, status, detail) => {
      if (cancelled) return;
      setChecks((current) => current.map((check) => (
        check.id === id ? { ...check, status, detail } : check
      )));
    };

    const releaseResources = async () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      const ownedStream = stream;
      ownedStream?.getTracks?.().forEach((track) => track.stop());
      stream = null;
      if (ownedStream && videoRef.current?.srcObject === ownedStream) {
        videoRef.current.pause?.();
        videoRef.current.srcObject = null;
      }
      if (pose?.close) {
        try { await pose.close(); } catch { /* Resource is already being released. */ }
      }
      pose = null;
    };

    const fail = async (checkId, detail, instruction) => {
      if (cancelled || completed) return;
      updateCheck(checkId, 'error', detail);
      setError(instruction);
      setMessage('Readiness check paused. Follow the instruction below, then try again.');
      setIsPositioning(false);
      await releaseResources();
    };

    const finish = async () => {
      if (cancelled || completed) return;
      completed = true;
      setMessage('All checks passed. Starting your session…');
      await releaseResources();
      completionTimer = window.setTimeout(() => {
        if (!cancelled) onReadyRef.current();
      }, 450);
    };

    const handleResults = (results) => {
      if (cancelled || completed) return;
      const landmarks = results?.poseLandmarks;
      const fullBodyVisible = isFullBodyVisible(landmarks);
      stableBodyFrames = fullBodyVisible ? stableBodyFrames + 1 : 0;
      const bodyMessage = !Array.isArray(landmarks)
        ? 'Step into the camera view.'
        : fullBodyVisible
          ? 'Hold still while PoseFit confirms your position.'
          : 'Step back until your head, shoulders, hips, knees, and ankles are visible.';
      if (bodyMessage !== lastBodyMessage) {
        lastBodyMessage = bodyMessage;
        updateCheck('body', 'checking', bodyMessage);
        setMessage(bodyMessage);
      }
      if (stableBodyFrames >= 5) {
        updateCheck('body', 'ready', 'Full body detected');
        finish();
      }
    };

    const analyzeFrame = async () => {
      if (cancelled || completed) return;
      if (!processingFrame && pose && videoRef.current) {
        processingFrame = true;
        try {
          await pose.send({ image: videoRef.current });
        } catch (frameError) {
          await fail('model', 'Pose detection stopped', describeExerciseStartError(frameError));
          return;
        } finally {
          processingFrame = false;
        }
      }
      if (!cancelled && !completed) animationFrame = requestAnimationFrame(analyzeFrame);
    };

    const run = async () => {
      const compatibilityIssue = browserCompatibilityIssue();
      updateCheck('browser', 'checking', 'Checking browser features');
      if (compatibilityIssue) {
        await fail('browser', 'Browser update required', compatibilityIssue);
        return;
      }
      updateCheck('browser', 'ready', 'Browser supported');

      updateCheck('internet', 'checking', 'Checking connection');
      if (navigator.onLine === false) {
        await fail('internet', 'No internet connection', 'Connect this laptop to the internet, then select Try again.');
        return;
      }
      updateCheck('internet', 'ready', 'Connected');

      updateCheck('camera', 'checking', 'Waiting for camera permission');
      try {
        if (navigator.permissions?.query) {
          try {
            const permission = await navigator.permissions.query({ name: 'camera' });
            if (permission.state === 'denied') {
              const permissionError = new Error('Camera permission denied');
              permissionError.name = 'NotAllowedError';
              throw permissionError;
            }
          } catch (permissionQueryError) {
            if (permissionQueryError.name === 'NotAllowedError') throw permissionQueryError;
          }
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled || !videoRef.current) {
          stream.getTracks?.().forEach((track) => track.stop());
          stream = null;
          return;
        }
        if (!stream.getVideoTracks?.().length) {
          const noCameraError = new Error('No camera track available');
          noCameraError.name = 'NotFoundError';
          throw noCameraError;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (cancelled) {
          await releaseResources();
          return;
        }
        updateCheck('camera', 'ready', 'Camera available and allowed');
      } catch (cameraError) {
        await fail('camera', 'Camera unavailable', describeExerciseStartError(cameraError));
        return;
      }

      updateCheck('model', 'checking', 'Loading MediaPipe model');
      setMessage('Loading pose detection. Keep this page open.');
      try {
        pose = new Pose({ locateFile: (file) => `${MEDIAPIPE_CDN}/${file}` });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        pose.onResults(handleResults);
        if (pose.initialize) await pose.initialize();
        if (cancelled) {
          await releaseResources();
          return;
        }
        updateCheck('model', 'ready', 'Pose detection loaded');
      } catch (modelError) {
        await fail('model', 'Model could not load', describeExerciseStartError(modelError));
        return;
      }

      updateCheck('body', 'checking', 'Step into the camera view');
      setMessage('Move into position and keep your full body inside the frame.');
      setIsPositioning(true);
      animationFrame = requestAnimationFrame(analyzeFrame);
    };

    run();
    return () => {
      cancelled = true;
      if (completionTimer) window.clearTimeout(completionTimer);
      releaseResources();
    };
  }, [videoRef]);

  return createPortal(
    <section
      className={`exercise-readiness${isPositioning ? ' exercise-readiness--positioning' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="exercise-readiness__panel">
        <div className="exercise-readiness__heading">
          <span aria-hidden="true"><i className="fa-solid fa-clipboard-check" /></span>
          <div>
            <p>Before you begin</p>
            <h2 id={titleId} ref={headingRef} tabIndex="-1">Exercise readiness check</h2>
          </div>
        </div>
        <p className="exercise-readiness__message" id={descriptionId}>{message}</p>
        <div className="exercise-readiness__checks" aria-live="polite">
          {checks.map((check) => (
            <div className={`exercise-readiness__check is-${check.status}`} key={check.id}>
              <span className="exercise-readiness__check-icon" aria-hidden="true"><i className={`fa-solid ${check.icon}`} /></span>
              <span><strong>{check.label}</strong><small>{check.detail}</small></span>
              <i className={`fa-solid ${check.status === 'ready' ? 'fa-circle-check' : check.status === 'error' ? 'fa-circle-exclamation' : check.status === 'checking' ? 'fa-spinner' : 'fa-circle'}`} aria-hidden="true" />
            </div>
          ))}
        </div>
        {isPositioning && (
          <div className="exercise-readiness__instruction">
            <i className="fa-solid fa-person" aria-hidden="true" />
            <p><strong>Position for {exerciseName}</strong><span>Use good lighting and move far enough back for your full body to remain visible.</span></p>
          </div>
        )}
        {error && <p className="exercise-readiness__error" role="alert"><i className="fa-solid fa-circle-info" aria-hidden="true" />{error}</p>}
        <div className="exercise-readiness__actions">
          <button type="button" className="is-secondary" onClick={onCancel}>Cancel</button>
          {error && <button type="button" className="is-primary" onClick={onRetry}>Try again</button>}
        </div>
      </div>
    </section>,
    portalTarget,
  );
}

export default function ExerciseReadinessButton({ videoRef, exerciseName, onReady }) {
  const [isActive, setIsActive] = useState(false);
  const [attempt, setAttempt] = useState(0);

  return (
    <>
      <button
        className="camera-session__start-button"
        type="button"
        data-readiness-check="true"
        onClick={() => setIsActive(true)}
      >
        <i className="fa-solid fa-video" aria-hidden="true" />
        Start Session
      </button>
      {isActive && (
        <ExerciseReadinessPanel
          key={attempt}
          videoRef={videoRef}
          exerciseName={exerciseName}
          onReady={() => { setIsActive(false); onReady(); }}
          onCancel={() => setIsActive(false)}
          onRetry={() => setAttempt((current) => current + 1)}
        />
      )}
    </>
  );
}
