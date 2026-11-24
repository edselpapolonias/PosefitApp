import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExerciseConnectionNotice.css';

const START_BUTTON_SELECTOR = '.camera-session__start-button';
const EXERCISE_SESSION_PATH = /^\/exercises\/(?:squat|push-up|plank|lunge|leg-raise)\/start\/?$/;
const POSE_LOAD_ERROR = /failed to fetch|network\s*error|load failed|mediapipe|pose_(?:solution|web)|webassembly|\bwasm\b/i;

function errorText(reason) {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}\n${reason.stack || ''}`;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

function isExerciseSession() {
  return EXERCISE_SESSION_PATH.test(window.location.pathname);
}

export default function ExerciseConnectionNotice() {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const startAttemptedRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const showNotice = useCallback((trigger = null) => {
    if (trigger) triggerRef.current = trigger;
    setIsOnline(navigator.onLine);
    setIsOpen(true);
  }, []);

  const closeNotice = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleConnectionChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  useEffect(() => {
    const guardExerciseStart = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const startButton = target?.closest(START_BUTTON_SELECTOR);
      if (!startButton || !isExerciseSession()) return;
      if (startButton.dataset.readinessCheck === 'true') return;

      startAttemptedRef.current = true;
      triggerRef.current = startButton;
      if (navigator.onLine) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showNotice(startButton);
    };

    window.addEventListener('click', guardExerciseStart, true);
    return () => window.removeEventListener('click', guardExerciseStart, true);
  }, [showNotice]);

  useEffect(() => {
    const handlePoseLoadFailure = (event) => {
      if (!startAttemptedRef.current || !isExerciseSession()) return;
      if (navigator.onLine && !POSE_LOAD_ERROR.test(errorText(event.reason))) return;

      event.preventDefault();
      showNotice();
    };

    window.addEventListener('unhandledrejection', handlePoseLoadFailure);
    return () => window.removeEventListener('unhandledrejection', handlePoseLoadFailure);
  }, [showNotice]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.exercise-connection-notice__primary')?.focus();

    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.isConnected && triggerRef.current.focus();
    };
  }, [isOpen]);

  const retry = () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return;
    }

    const trigger = triggerRef.current;
    setIsOpen(false);
    window.setTimeout(() => trigger?.isConnected && trigger.click(), 0);
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="exercise-connection-notice"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); closeNotice(); }}
      onClick={(event) => { if (event.target === event.currentTarget) closeNotice(); }}
    >
      <div className="exercise-connection-notice__panel">
        <span className="exercise-connection-notice__icon" aria-hidden="true">
          <i className="fa-solid fa-wifi" />
          <i className="fa-solid fa-slash" />
        </span>
        <p className="exercise-connection-notice__eyebrow">Connection notice</p>
        <h2 id={titleId}>Internet connection required</h2>
        <p id={descriptionId}>
          PoseFit needs an internet connection to load pose detection before an exercise can begin.
          Please reconnect, then try starting your session again.
        </p>
        <p className={`exercise-connection-notice__status exercise-connection-notice__status--${isOnline ? 'online' : 'offline'}`} role="status">
          <span aria-hidden="true" />
          {isOnline ? 'Connection restored. You can try again.' : 'You are currently offline.'}
        </p>
        <div className="exercise-connection-notice__actions">
          <button type="button" className="exercise-connection-notice__secondary" onClick={closeNotice}>Close</button>
          <button type="button" className="exercise-connection-notice__primary" onClick={retry}>Try Again</button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
