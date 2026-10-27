import { useCallback, useEffect, useRef, useState } from 'react';

export const INACTIVITY_TIMEOUT = 180000;
export const COUNTDOWN_DISPLAY_DELAY = 30000;
export const DETECTION_GRACE_PERIOD = 1000;
export const DETECTION_STALE_TIMEOUT = 3000;

const TICK_INTERVAL = 250;
const INITIAL_STATE = {
  isWarningVisible: false,
  isCancelled: false,
  remainingSeconds: Math.ceil(INACTIVITY_TIMEOUT / 1000),
};

export default function useCameraInactivity({ enabled, onTimeout, videoRef }) {
  const [state, setState] = useState(INITIAL_STATE);
  const enabledRef = useRef(enabled);
  const onTimeoutRef = useRef(onTimeout);
  const missingSinceRef = useRef(null);
  const lastDetectionResultAtRef = useRef(null);
  const streamUnavailableRef = useRef(false);
  const cancelledRef = useRef(false);

  enabledRef.current = enabled;
  onTimeoutRef.current = onTimeout;

  const clearAbsence = useCallback(() => {
    if (missingSinceRef.current === null) return;
    missingSinceRef.current = null;
    if (!cancelledRef.current) {
      setState((current) => current.isWarningVisible || current.remainingSeconds !== INITIAL_STATE.remainingSeconds
        ? INITIAL_STATE
        : current);
    }
  }, []);

  const beginAbsence = useCallback((startedAt = performance.now()) => {
    if (missingSinceRef.current === null) {
      missingSinceRef.current = startedAt;
    }
  }, []);

  const reset = useCallback(() => {
    missingSinceRef.current = null;
    lastDetectionResultAtRef.current = null;
    streamUnavailableRef.current = false;
    cancelledRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  const reportPersonDetection = useCallback((personDetected) => {
    if (!enabledRef.current || cancelledRef.current) return;
    if (streamUnavailableRef.current) return;
    const reportedAt = performance.now();
    lastDetectionResultAtRef.current = reportedAt;

    if (personDetected) {
      clearAbsence();
      return;
    }

    beginAbsence(reportedAt);
  }, [beginAbsence, clearAbsence]);

  useEffect(() => {
    if (!enabled) {
      lastDetectionResultAtRef.current = null;
      streamUnavailableRef.current = false;
      if (!cancelledRef.current) clearAbsence();
      return;
    }
    if (cancelledRef.current) return;

    const enabledAt = performance.now();
    streamUnavailableRef.current = false;
    lastDetectionResultAtRef.current = enabledAt;
    beginAbsence(enabledAt);
  }, [beginAbsence, clearAbsence, enabled]);

  useEffect(() => {
    if (!enabled || !videoRef?.current) return undefined;

    const video = videoRef.current;
    const track = video.srcObject?.getVideoTracks?.()[0];
    const markUnavailable = () => {
      if (!enabledRef.current || cancelledRef.current) return;
      streamUnavailableRef.current = true;
      lastDetectionResultAtRef.current = null;
      beginAbsence(performance.now());
    };
    const markAvailable = () => {
      if (!enabledRef.current || cancelledRef.current) return;
      streamUnavailableRef.current = false;
      lastDetectionResultAtRef.current = performance.now();
      // A fresh positive pose result, not a media event alone, clears absence.
    };

    ['error', 'stalled', 'emptied'].forEach((eventName) => video.addEventListener(eventName, markUnavailable));
    ['playing', 'canplay'].forEach((eventName) => video.addEventListener(eventName, markAvailable));
    track?.addEventListener?.('ended', markUnavailable);
    track?.addEventListener?.('mute', markUnavailable);
    track?.addEventListener?.('unmute', markAvailable);

    if (video.error || track?.readyState === 'ended' || track?.muted) markUnavailable();

    return () => {
      ['error', 'stalled', 'emptied'].forEach((eventName) => video.removeEventListener(eventName, markUnavailable));
      ['playing', 'canplay'].forEach((eventName) => video.removeEventListener(eventName, markAvailable));
      track?.removeEventListener?.('ended', markUnavailable);
      track?.removeEventListener?.('mute', markUnavailable);
      track?.removeEventListener?.('unmute', markAvailable);
    };
  }, [beginAbsence, enabled, videoRef]);

  useEffect(() => {
    if (!enabled) return undefined;

    const tick = () => {
      if (cancelledRef.current) return;

      const currentTime = performance.now();
      const lastResultAt = lastDetectionResultAtRef.current;
      if (
        missingSinceRef.current === null
        && lastResultAt !== null
        && currentTime - lastResultAt >= DETECTION_STALE_TIMEOUT
      ) {
        // Treat a stopped MediaPipe/camera callback loop as camera absence.
        missingSinceRef.current = lastResultAt;
      }
      if (missingSinceRef.current === null) return;

      const elapsed = Math.max(0, currentTime - missingSinceRef.current);
      if (elapsed < DETECTION_GRACE_PERIOD) return;

      if (elapsed >= INACTIVITY_TIMEOUT) {
        cancelledRef.current = true;
        missingSinceRef.current = null;
        setState({ isWarningVisible: false, isCancelled: true, remainingSeconds: 0 });
        onTimeoutRef.current?.();
        return;
      }

      const isWarningVisible = elapsed >= COUNTDOWN_DISPLAY_DELAY;
      if (!isWarningVisible) return;
      const remainingSeconds = Math.ceil((INACTIVITY_TIMEOUT - elapsed) / 1000);
      setState((current) => (
        current.isWarningVisible === isWarningVisible
        && current.remainingSeconds === remainingSeconds
          ? current
          : { isWarningVisible, isCancelled: false, remainingSeconds }
      ));
    };

    const interval = window.setInterval(tick, TICK_INTERVAL);
    return () => window.clearInterval(interval);
  }, [enabled]);

  useEffect(() => () => {
    missingSinceRef.current = null;
    lastDetectionResultAtRef.current = null;
    streamUnavailableRef.current = false;
    cancelledRef.current = true;
  }, []);

  return {
    ...state,
    reportPersonDetection,
    reset,
  };
}
