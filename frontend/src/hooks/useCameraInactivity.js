import { useCallback, useEffect, useRef, useState } from 'react';

export const INACTIVITY_TIMEOUT = 180000;
export const COUNTDOWN_DISPLAY_DELAY = 30000;
export const DETECTION_GRACE_PERIOD = 1000;

const TICK_INTERVAL = 250;
const INITIAL_STATE = {
  isWarningVisible: false,
  isCancelled: false,
  remainingSeconds: Math.ceil(INACTIVITY_TIMEOUT / 1000),
};

export default function useCameraInactivity({ enabled, onTimeout }) {
  const [state, setState] = useState(INITIAL_STATE);
  const enabledRef = useRef(enabled);
  const onTimeoutRef = useRef(onTimeout);
  const missingSinceRef = useRef(null);
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

  const reset = useCallback(() => {
    missingSinceRef.current = null;
    cancelledRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  const reportPersonDetection = useCallback((personDetected) => {
    if (!enabledRef.current || cancelledRef.current) return;

    if (personDetected) {
      clearAbsence();
      return;
    }

    if (missingSinceRef.current === null) {
      missingSinceRef.current = performance.now();
    }
  }, [clearAbsence]);

  useEffect(() => {
    if (!enabled && !cancelledRef.current) clearAbsence();
  }, [clearAbsence, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    const tick = () => {
      if (cancelledRef.current || missingSinceRef.current === null) return;

      const elapsed = Math.max(0, performance.now() - missingSinceRef.current);
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
    cancelledRef.current = true;
  }, []);

  return {
    ...state,
    reportPersonDetection,
    reset,
  };
}
