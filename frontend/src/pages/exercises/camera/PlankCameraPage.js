import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import {
  PLANK_ALIGNMENT,
  PLANK_CLASS_COLORS,
  PLANK_POSITION,
  PLANK_SESSION_STATES,
  analyzePlank,
  getPlankIssue,
  getPlankVoiceCue,
  validatePlankPosition,
} from '../../../exercises/plank';
import { createSessionResult, saveLatestSessionResult } from '../../../services/summaryService';
import { formatTime } from '../../../utils/formatters';
import { speak } from '../../../utils/speechFeedback';
import './SquatCameraPage.css';
import './PlankCameraPage.css';
import { resolveWorkoutContext } from '../../../services/workoutDaySessionService';
import CameraInactivityOverlay from '../../../components/CameraInactivityOverlay';
import useCameraInactivity from '../../../hooks/useCameraInactivity';

function readStoredWorkoutConfig() {
  try {
    return JSON.parse(sessionStorage.getItem('posefitPlankWorkoutConfig')) || {};
  } catch {
    return {};
  }
}

function firstPositiveInteger(...values) {
  for (const value of values) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function calculateAccuracy(validMs, evaluatedMs) {
  return evaluatedMs > 0 ? Math.round((validMs / evaluatedMs) * 100) : 0;
}

export default function PlankCameraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const storedConfig = readStoredWorkoutConfig();
  const navigationConfig = location.state?.workoutConfig || {};
  const workoutContext = resolveWorkoutContext(location.state?.workoutContext, searchParams.get('workoutSession'), 'plank');
  const totalSets = workoutContext ? 1 : firstPositiveInteger(navigationConfig.sets, searchParams.get('sets'), storedConfig.sets);
  const holdTimeSetting = firstPositiveInteger(workoutContext?.target?.duration, navigationConfig.holdTime, navigationConfig.hold, searchParams.get('hold'), storedConfig.hold);
  const restTimeSetting = firstPositiveInteger(workoutContext?.target?.rest, navigationConfig.rest, searchParams.get('rest'), storedConfig.rest);
  const hasWorkoutConfig = Boolean(totalSets && holdTimeSetting && restTimeSetting);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const restTimerRef = useRef(null);
  const completionTimeoutRef = useRef(null);
  const sessionStartRef = useRef(null);
  const setStartRef = useRef(null);
  const isMountedRef = useRef(false);
  const isFinishingRef = useRef(false);
  const processingPausedRef = useRef(true);
  const voiceMutedRef = useRef(false);
  const isRestingRef = useRef(false);
  const currentSetRef = useRef(1);
  const currentValidMsRef = useRef(0);
  const currentEvaluatedMsRef = useRef(0);
  const totalValidMsRef = useRef(0);
  const totalEvaluatedMsRef = useRef(0);
  const lastEvaluationRef = useRef(null);
  const setCompletingRef = useRef(false);
  const setResultsRef = useRef([]);
  const issueCountsRef = useRef({});
  const lastIssueRef = useRef(null);
  const alignmentAnglesRef = useRef([]);
  const lastAngleSampleRef = useRef(0);
  const positionStatusRef = useRef('no_person');
  const validationStartRef = useRef(null);
  const plankConfirmedRef = useRef(false);
  const wasPlankActiveRef = useRef(false);
  const readyAnnouncedRef = useRef(false);

  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [sessionTime, setSessionTime] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentHoldSeconds, setCurrentHoldSeconds] = useState(0);
  const [totalHoldSeconds, setTotalHoldSeconds] = useState(0);
  const [formAccuracy, setFormAccuracy] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restCountdown, setRestCountdown] = useState(0);
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const [positionStatus, setPositionStatus] = useState('no_person');
  const [sessionPhase, setSessionPhase] = useState(PLANK_SESSION_STATES.WAITING_FOR_POSITION);
  const [classification, setClassification] = useState('good');
  const [bodyAngle, setBodyAngle] = useState(0);
  const [activeSide, setActiveSide] = useState('left');
  const [feedback, setFeedback] = useState('Position Your Body');
  const [feedbackDetail, setFeedbackDetail] = useState('Use a side view with your full body visible.');

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const resetSetTracking = useCallback(() => {
    currentValidMsRef.current = 0;
    currentEvaluatedMsRef.current = 0;
    lastEvaluationRef.current = null;
    lastIssueRef.current = null;
    validationStartRef.current = null;
    plankConfirmedRef.current = false;
    wasPlankActiveRef.current = false;
    positionStatusRef.current = 'no_person';
    setCompletingRef.current = false;
    setCurrentHoldSeconds(0);
    setPositionStatus('no_person');
    setSessionPhase(PLANK_SESSION_STATES.WAITING_FOR_POSITION);
    setFeedback('Get into a plank position.');
    setFeedbackDetail('Turn sideways and place your full body in the camera frame.');
  }, []);

  useEffect(() => {
    if (!isStarted) return undefined;
    sessionStartRef.current = Date.now();
    setStartRef.current = Date.now();
    sessionTimerRef.current = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(sessionTimerRef.current);
  }, [isStarted]);

  const finishSession = useCallback((status = 'ended') => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    isMountedRef.current = false;
    processingPausedRef.current = true;
    isRestingRef.current = false;
    clearInterval(sessionTimerRef.current);
    clearInterval(restTimerRef.current);
    clearTimeout(completionTimeoutRef.current);
    sessionTimerRef.current = null;
    restTimerRef.current = null;
    completionTimeoutRef.current = null;
    clearCanvas();

    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    window.speechSynthesis.cancel();

    const currentSetAlreadySaved = setResultsRef.current.some((result) => result.setNum === currentSetRef.current);
    if (
      status !== 'completed'
      && !currentSetAlreadySaved
      && currentEvaluatedMsRef.current > 0
    ) {
      setResultsRef.current.push({
        setNum: currentSetRef.current,
        holdTime: Math.floor(currentValidMsRef.current / 1000),
        duration: setStartRef.current ? Math.floor((Date.now() - setStartRef.current) / 1000) : 0,
        accuracy: calculateAccuracy(currentValidMsRef.current, currentEvaluatedMsRef.current),
        completed: false,
      });
    }

    const completedSets = setResultsRef.current.filter((set) => set.completed).length;
    const finalDuration = sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
      : sessionTime;
    const formIssues = Object.entries(issueCountsRef.current)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const sessionResult = saveLatestSessionResult(createSessionResult({
      exercise: { id: 'plank', name: 'Plank' },
      metricType: 'time',
      status,
      duration: finalDuration,
      setsCompleted: completedSets,
      totalHoldTime: Math.floor(totalValidMsRef.current / 1000),
      accuracy: calculateAccuracy(totalValidMsRef.current, totalEvaluatedMsRef.current),
      formIssues,
      setResults: [...setResultsRef.current],
      config: {
        holdSecondsPerSet: holdTimeSetting,
        totalSets,
        restSeconds: restTimeSetting,
      },
      analysis: {
        repAngles: [...alignmentAnglesRef.current],
        validHoldSeconds: Math.floor(totalValidMsRef.current / 1000),
        evaluatedSeconds: Math.floor(totalEvaluatedMsRef.current / 1000),
      },
      workoutContext,
    }));

    navigate('/session-summary', { replace: true, state: { sessionResult } });
  }, [clearCanvas, holdTimeSetting, navigate, restTimeSetting, sessionTime, totalSets, workoutContext]);

  const cancelForInactivity = useCallback(() => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    isMountedRef.current = false;
    processingPausedRef.current = true;
    isRestingRef.current = false;
    clearInterval(sessionTimerRef.current);
    clearInterval(restTimerRef.current);
    clearTimeout(completionTimeoutRef.current);
    sessionTimerRef.current = null;
    restTimerRef.current = null;
    completionTimeoutRef.current = null;
    cameraRef.current?.stop();
    cameraRef.current = null;
    poseRef.current?.close();
    poseRef.current = null;
    window.speechSynthesis.cancel();
    clearCanvas();
    setIsResting(false);
    setIsStarted(false);
  }, [clearCanvas]);

  const {
    isWarningVisible: inactivityWarningVisible,
    isCancelled: inactivityCancelled,
    remainingSeconds: inactivityRemainingSeconds,
    reportPersonDetection,
  } = useCameraInactivity({
    enabled: isStarted && !isResting && !workoutComplete,
    onTimeout: cancelForInactivity,
  });

  const completeCurrentSet = useCallback(() => {
    if (setCompletingRef.current) return;
    setCompletingRef.current = true;
    processingPausedRef.current = true;
    setSessionPhase(PLANK_SESSION_STATES.SET_COMPLETE);
    lastEvaluationRef.current = null;
    clearCanvas();

    const setAccuracy = calculateAccuracy(currentValidMsRef.current, currentEvaluatedMsRef.current);
    setResultsRef.current.push({
      setNum: currentSetRef.current,
      holdTime: holdTimeSetting,
      duration: setStartRef.current ? Math.floor((Date.now() - setStartRef.current) / 1000) : holdTimeSetting,
      accuracy: setAccuracy,
      completed: true,
    });
    setCurrentHoldSeconds(holdTimeSetting);

    if (currentSetRef.current >= totalSets) {
      setWorkoutComplete(true);
      setSessionPhase(PLANK_SESSION_STATES.SESSION_COMPLETE);
      if (!voiceMutedRef.current) speak('Plank workout complete. Great job!', true);
      completionTimeoutRef.current = setTimeout(() => finishSession('completed'), 2500);
      return;
    }

    readyAnnouncedRef.current = false;
    isRestingRef.current = true;
    setIsResting(true);
    setSessionPhase(PLANK_SESSION_STATES.RESTING);
    setRestCountdown(restTimeSetting);
    if (!voiceMutedRef.current) {
      speak(`Set ${currentSetRef.current} complete. Rest for ${restTimeSetting} seconds.`, true);
    }
  }, [clearCanvas, finishSession, holdTimeSetting, restTimeSetting, totalSets]);

  useEffect(() => {
    if (!isResting) return undefined;
    processingPausedRef.current = true;
    restTimerRef.current = setInterval(() => {
      setRestCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(restTimerRef.current);
          restTimerRef.current = null;
          currentSetRef.current += 1;
          setCurrentSet(currentSetRef.current);
          resetSetTracking();
          setStartRef.current = Date.now();
          isRestingRef.current = false;
          setIsResting(false);
          processingPausedRef.current = false;
          if (!voiceMutedRef.current) speak(`Rest over. Starting set ${currentSetRef.current}.`, true);
          return 0;
        }
        if (previous === 4 && !voiceMutedRef.current) speak('Get ready. 3, 2, 1.', true);
        return previous - 1;
      });
    }, 1000);

    return () => {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    };
  }, [isResting, resetSetTracking]);

  const processHoldFrame = useCallback((analysis) => {
    if (!analysis || processingPausedRef.current || isRestingRef.current || setCompletingRef.current) return;

    const now = performance.now();
    const previousTimestamp = lastEvaluationRef.current;
    lastEvaluationRef.current = now;
    if (previousTimestamp === null) return;

    const frameDelta = Math.min(now - previousTimestamp, PLANK_ALIGNMENT.maxFrameDeltaMs);
    let evaluatedDelta = frameDelta;

    if (analysis.classification === 'good') {
      const remainingHoldMs = Math.max(0, (holdTimeSetting * 1000) - currentValidMsRef.current);
      const validDelta = Math.min(frameDelta, remainingHoldMs);
      currentValidMsRef.current += validDelta;
      totalValidMsRef.current += validDelta;
      evaluatedDelta = validDelta;
      lastIssueRef.current = null;
    } else {
      const issue = getPlankIssue(analysis.classification);
      if (issue && lastIssueRef.current !== issue) {
        issueCountsRef.current[issue] = (issueCountsRef.current[issue] || 0) + 1;
      }
      lastIssueRef.current = issue;
    }

    currentEvaluatedMsRef.current += evaluatedDelta;
    totalEvaluatedMsRef.current += evaluatedDelta;

    if (now - lastAngleSampleRef.current >= 500) {
      alignmentAnglesRef.current.push(Math.round(analysis.bodyAngle));
      lastAngleSampleRef.current = now;
    }

    const nextCurrentHold = Math.floor(currentValidMsRef.current / 1000);
    const nextTotalHold = Math.floor(totalValidMsRef.current / 1000);
    const nextAccuracy = calculateAccuracy(totalValidMsRef.current, totalEvaluatedMsRef.current);
    setCurrentHoldSeconds((value) => value === nextCurrentHold ? value : nextCurrentHold);
    setTotalHoldSeconds((value) => value === nextTotalHold ? value : nextTotalHold);
    setFormAccuracy((value) => value === nextAccuracy ? value : nextAccuracy);

    if (currentValidMsRef.current >= holdTimeSetting * 1000) completeCurrentSet();
  }, [completeCurrentSet, holdTimeSetting]);

  const drawAngleLabel = useCallback((context, hip, angle, color, width, height) => {
    const x = hip.x * width;
    const y = hip.y * height;
    context.beginPath();
    context.arc(x, y, 29, 0, Math.PI * 2);
    context.fillStyle = 'rgba(10, 15, 24, 0.7)';
    context.fill();
    context.fillStyle = color;
    context.font = 'bold 14px Segoe UI';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${Math.round(angle)}°`, x, y);
  }, []);

  const onResults = useCallback((results) => {
    if (!isMountedRef.current) return;
    if (processingPausedRef.current) {
      clearCanvas();
      return;
    }
    reportPersonDetection(Boolean(results.poseLandmarks?.length >= 33));

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.width = results.image.width;
    canvas.height = results.image.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const position = validatePlankPosition(results.poseLandmarks);
    const nextPositionStatus = position.status === 'candidate' && plankConfirmedRef.current
      ? 'active'
      : position.status;
    if (positionStatusRef.current !== nextPositionStatus) {
      positionStatusRef.current = nextPositionStatus;
      setPositionStatus(nextPositionStatus);
    }
    if (position.activeSide) setActiveSide(position.activeSide);

    if (position.status !== 'candidate') {
      const wasActive = wasPlankActiveRef.current;
      validationStartRef.current = null;
      plankConfirmedRef.current = false;
      lastEvaluationRef.current = null;
      lastIssueRef.current = null;
      readyAnnouncedRef.current = false;
      setSessionPhase(PLANK_SESSION_STATES.WAITING_FOR_POSITION);
      setBodyAngle(0);

      let nextFeedback = 'Get into a plank position.';
      let nextDetail = 'Lower into a horizontal Plank while staying sideways to the camera.';
      if (position.status === 'no_person') {
        nextFeedback = 'Make sure your full body is visible in the camera.';
        nextDetail = 'Step into the frame with your shoulder, hip, and ankle visible.';
      } else if (position.status === 'full_body_required') {
        nextFeedback = 'Make sure your full body is visible in the camera.';
        nextDetail = 'Move back until your shoulder, hip, and ankle are clearly visible.';
      } else if (position.status === 'turn_sideways') {
        nextFeedback = 'Turn sideways to the camera.';
        nextDetail = 'PoseFit evaluates Plank form from a side view only.';
      } else if (wasActive) {
        nextFeedback = 'Return to plank position.';
        nextDetail = 'Your hold is paused. Return to a horizontal side-view Plank to continue.';
      }
      setFeedback(nextFeedback);
      setFeedbackDetail(nextDetail);
      if (!voiceMutedRef.current) speak(nextFeedback);

      if (results.poseLandmarks) {
        drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color: '#64748b', lineWidth: 2 });
        drawLandmarks(context, results.poseLandmarks, { color: '#64748b', lineWidth: 1, radius: 3 });
      }
      return;
    }

    const now = performance.now();
    if (!plankConfirmedRef.current) {
      if (validationStartRef.current === null) validationStartRef.current = now;
      const validationElapsed = now - validationStartRef.current;
      setSessionPhase(PLANK_SESSION_STATES.VALIDATING_POSITION);
      setFeedback('Hold your position...');
      setFeedbackDetail('Stay still while PoseFit confirms your side-view Plank.');
      lastEvaluationRef.current = null;

      drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color: '#9635e8', lineWidth: 3 });
      drawLandmarks(context, results.poseLandmarks, { color: '#b978ee', lineWidth: 1, radius: 4 });

      if (validationElapsed < PLANK_POSITION.validationMs) return;

      plankConfirmedRef.current = true;
      wasPlankActiveRef.current = true;
      positionStatusRef.current = 'active';
      setPositionStatus('active');
      setSessionPhase(PLANK_SESSION_STATES.PLANK_ACTIVE);
      lastEvaluationRef.current = null;
      if (!voiceMutedRef.current) speak('Plank detected. Your hold starts now.', true);
    }

    const analysis = analyzePlank(results.poseLandmarks);
    if (!analysis) {
      plankConfirmedRef.current = false;
      validationStartRef.current = null;
      lastEvaluationRef.current = null;
      setSessionPhase(PLANK_SESSION_STATES.WAITING_FOR_POSITION);
      setFeedback('Make sure your full body is visible in the camera.');
      setFeedbackDetail('Your hold is paused until the required landmarks are reliable.');
      return;
    }

    setSessionPhase(PLANK_SESSION_STATES.PLANK_ACTIVE);
    if (!readyAnnouncedRef.current) readyAnnouncedRef.current = true;
    if (!voiceMutedRef.current) speak(getPlankVoiceCue(analysis.classification));

    const color = PLANK_CLASS_COLORS[analysis.classification].skeleton;
    drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color, lineWidth: 3 });
    drawLandmarks(context, results.poseLandmarks, { color, lineWidth: 1, radius: 4 });
    [analysis.landmarks.shoulder, analysis.landmarks.hip, analysis.landmarks.ankle].forEach((point) => {
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, 8, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();
    });
    drawAngleLabel(context, analysis.landmarks.hip, analysis.bodyAngle, color, canvas.width, canvas.height);

    setClassification((value) => value === analysis.classification ? value : analysis.classification);
    setBodyAngle(Math.round(analysis.bodyAngle));
    setActiveSide(analysis.activeSide);
    setFeedback(analysis.feedback);
    setFeedbackDetail(analysis.feedbackDetail);
    processHoldFrame(analysis);
  }, [clearCanvas, drawAngleLabel, processHoldFrame, reportPersonDetection]);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError('');
    processingPausedRef.current = false;
    isMountedRef.current = true;
    isFinishingRef.current = false;
    resetSetTracking();
    clearCanvas();

    try {
      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      pose.onResults(onResults);
      poseRef.current = pose;

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current && isMountedRef.current && !processingPausedRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      cameraRef.current = camera;
      await camera.start();
      setIsStarted(true);
    } catch {
      isMountedRef.current = false;
      processingPausedRef.current = true;
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      setCameraError('Could not access the camera. Allow camera permission and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [clearCanvas, onResults, resetSetTracking]);

  const stopSession = useCallback(() => finishSession('ended'), [finishSession]);

  useEffect(() => () => {
    isMountedRef.current = false;
    processingPausedRef.current = true;
    clearInterval(sessionTimerRef.current);
    clearInterval(restTimerRef.current);
    clearTimeout(completionTimeoutRef.current);
    if (cameraRef.current) cameraRef.current.stop();
    if (poseRef.current) poseRef.current.close();
    window.speechSynthesis.cancel();
  }, []);

  if (!hasWorkoutConfig) {
    return (
      <div className="camera-session camera-session--plank camera-session--configuration-error">
        <header className="camera-session__header">
          <button className="camera-session__back" type="button" onClick={() => navigate('/exercises/plank')}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Back to configuration
          </button>
          <div className="camera-session__brand">POSE<span>FIT</span></div>
        </header>
        <main className="camera-configuration-error">
          <span className="camera-configuration-error__icon" aria-hidden="true"><i className="fa-solid fa-sliders" /></span>
          <h1>Workout configuration required</h1>
          <p>Choose your hold duration, sets, and rest time before starting the camera session.</p>
          <button type="button" onClick={() => navigate('/exercises/plank')}>Configure Plank</button>
        </main>
      </div>
    );
  }

  const currentColor = PLANK_CLASS_COLORS[classification];
  const sessionStatus = inactivityCancelled
    ? 'Cancelled'
    : workoutComplete || sessionPhase === PLANK_SESSION_STATES.SESSION_COMPLETE
    ? 'Complete'
    : isResting || sessionPhase === PLANK_SESSION_STATES.RESTING
      ? 'Resting'
      : !isStarted
        ? 'Ready'
        : sessionPhase === PLANK_SESSION_STATES.VALIDATING_POSITION
          ? 'Validating Position'
          : sessionPhase === PLANK_SESSION_STATES.PLANK_ACTIVE
            ? classification === 'good' ? 'Valid Hold' : 'Adjust Form'
            : 'Waiting for Position';
  const statusTone = inactivityCancelled
    ? 'cancelled'
    : workoutComplete
    ? 'complete'
    : isResting
      ? 'resting'
      : isStarted && sessionPhase === PLANK_SESSION_STATES.PLANK_ACTIVE && classification === 'good'
        ? 'active'
      : 'waiting';
  const displayedSet = workoutContext?.currentSet || currentSet;
  const displayedTotalSets = workoutContext?.totalSets || totalSets;
  const backPath = workoutContext?.detailsRoute || '/exercises/plank';
  const feedbackColor = sessionPhase === PLANK_SESSION_STATES.PLANK_ACTIVE
    ? currentColor.hex
    : sessionPhase === PLANK_SESSION_STATES.VALIDATING_POSITION
      ? '#9635e8'
      : '#f59e0b';

  return (
    <div className="camera-session camera-session--plank">
      <header className="camera-session__header">
        <button className="camera-session__back" type="button" onClick={() => navigate(backPath)}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back
        </button>

        <div className="camera-session__title">
          <span className="camera-session__exercise-icon" aria-hidden="true"><i className="fa-solid fa-stopwatch" /></span>
          <span>
            <h1>Plank</h1>
            <small>{workoutContext ? `${workoutContext.planName} · Week ${workoutContext.week} · Round ${workoutContext.currentRound} · ` : ''}Set {displayedSet} of {displayedTotalSets} · {holdTimeSetting}s hold</small>
          </span>
        </div>

        <span className={`camera-session__status camera-session__status--${statusTone}`}>
          <span aria-hidden="true" />
          {sessionStatus}
        </span>

        <div className="camera-session__actions">
          {isStarted && (
            <button
              className={`camera-session__voice${voiceMuted ? ' camera-session__voice--muted' : ''}`}
              type="button"
              onClick={() => {
                setVoiceMuted((previous) => {
                  const next = !previous;
                  voiceMutedRef.current = next;
                  if (next) window.speechSynthesis.cancel();
                  return next;
                });
              }}
              title={voiceMuted ? 'Unmute voice coaching' : 'Mute voice coaching'}
            >
              <i className={`fa-solid ${voiceMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} aria-hidden="true" />
              <span>{voiceMuted ? 'Muted' : 'Voice on'}</span>
            </button>
          )}
          <div className="camera-session__timer" aria-label={`Elapsed time ${formatTime(sessionTime)}`}>
            <i className="fa-regular fa-clock" aria-hidden="true" />
            {formatTime(sessionTime)}
          </div>
        </div>
      </header>

      <main className="camera-session__workspace" style={plankStyles.cameraWrapper}>
        <aside className="camera-session__progress" style={plankStyles.sidePanel}>
          <div className="camera-session__metric camera-session__metric--primary" style={plankStyles.panelCard}>
            <p style={plankStyles.panelLabel}>SET</p>
            <p style={plankStyles.panelBigValue}>{displayedSet}</p>
            <p style={plankStyles.panelSmallValue}>OF {displayedTotalSets}</p>
          </div>
          <div className="camera-session__metric camera-session__metric--primary" style={plankStyles.panelCard}>
            <p style={plankStyles.panelLabel}>VALID HOLD</p>
            <p style={plankStyles.panelBigValue}>{formatTime(currentHoldSeconds)}</p>
            <p style={plankStyles.panelSmallValue}>OF {formatTime(holdTimeSetting)}</p>
            <div className="camera-session__progress-track" aria-hidden="true">
              <span style={{ width: `${Math.min((currentHoldSeconds / holdTimeSetting) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="camera-session__metric" style={plankStyles.panelCard}>
            <p style={plankStyles.panelLabel}>TOTAL HOLD</p>
            <p style={plankStyles.panelBigValue}>{formatTime(totalHoldSeconds)}</p>
          </div>
          <div className="camera-session__metric" style={plankStyles.panelCard}>
            <p style={plankStyles.panelLabel}>{isResting ? 'REST LEFT' : 'REST BETWEEN SETS'}</p>
            <p style={plankStyles.panelBigValue}>{formatTime(isResting ? restCountdown : restTimeSetting)}</p>
          </div>
          <div className="camera-session__metric" style={plankStyles.panelCard}>
            <p style={plankStyles.panelLabel}>FORM ACCURACY</p>
            <p style={{ ...plankStyles.statusValue, color: isStarted ? currentColor.hex : '#94a3b8' }}>
              {isStarted ? `${formAccuracy}%` : '—'}
            </p>
          </div>
        </aside>

        <section className="camera-session__camera" style={plankStyles.cameraBox}>
          <video ref={videoRef} style={plankStyles.video} playsInline muted />
          <canvas ref={canvasRef} style={plankStyles.canvas} />

          <CameraInactivityOverlay
            isWarningVisible={inactivityWarningVisible}
            isCancelled={inactivityCancelled}
            remainingSeconds={inactivityRemainingSeconds}
            isWorkoutPlan={Boolean(workoutContext)}
            onBack={() => navigate(workoutContext?.detailsRoute || '/exercises', { replace: true })}
          />

          {isResting && (
            <div className="camera-session__rest-overlay">
              <span className="camera-session__rest-check" aria-hidden="true"><i className="fa-solid fa-check" /></span>
              <p className="camera-session__rest-eyebrow">Set {currentSet} Complete</p>
              <h2>Rest</h2>
              <time>{formatTime(restCountdown)}</time>
              <p>Next: Set {currentSet + 1} of {totalSets}</p>
            </div>
          )}

          {workoutComplete && (
            <div className="camera-session__complete-overlay">
              <span aria-hidden="true"><i className="fa-solid fa-trophy" /></span>
              <h2>{workoutContext ? 'Set Complete' : 'Workout Complete'}</h2>
              <p>Great work. Preparing your session summary…</p>
            </div>
          )}

          {isStarted && !isResting && !workoutComplete && positionStatus !== 'active' && (
            <div className={`camera-session__readiness camera-session__readiness--${positionStatus}`}>
              <i className={`fa-solid ${positionStatus === 'no_person' || positionStatus === 'full_body_required'
                ? 'fa-person-circle-question'
                : positionStatus === 'turn_sideways' ? 'fa-rotate' : 'fa-stopwatch'}`} aria-hidden="true" />
              <span>{feedback}</span>
            </div>
          )}
          {isStarted && sessionPhase === PLANK_SESSION_STATES.PLANK_ACTIVE && (
            <div className="camera-session__tracking-badge"><span aria-hidden="true" />Body tracking active</div>
          )}

          {!isStarted && (
            <div className="camera-session__prestart" style={plankStyles.preStartOverlay}>
              {isLoading ? (
                <div style={plankStyles.loadingBox}>
                  <div style={plankStyles.spinner} />
                  <p style={plankStyles.loadingText}>Loading AI Pose Detection...</p>
                  <p style={plankStyles.loadingSubText}>This may take a few seconds</p>
                </div>
              ) : (
                <div className="camera-session__start-card" style={plankStyles.startOverlayBox}>
                  <span className="camera-session__start-icon" aria-hidden="true"><i className="fa-solid fa-stopwatch" /></span>
                  <p className="camera-session__start-eyebrow">PoseFit Live Coaching</p>
                  <h2 style={plankStyles.overlayTitle}>Ready to plank?</h2>
                  <div className="camera-session__plan">
                    <span><strong>{holdTimeSetting}s</strong> hold</span>
                    <span><strong>{workoutContext ? `Set ${displayedSet}/${displayedTotalSets}` : totalSets}</strong> {workoutContext ? `round ${workoutContext.currentRound}` : 'sets'}</span>
                    <span><strong>{restTimeSetting}s</strong> rest</span>
                  </div>
                  <div className="camera-session__position-guide" style={plankStyles.positionGuide}>
                    <div className="camera-session__guide-row" style={plankStyles.guideRow}>
                      <i className="fa-solid fa-camera" aria-hidden="true" />
                      <p style={plankStyles.guideText}>Position the camera at your <strong>side</strong></p>
                    </div>
                    <div className="camera-session__guide-row" style={plankStyles.guideRow}>
                      <i className="fa-solid fa-ruler-horizontal" aria-hidden="true" />
                      <p style={plankStyles.guideText}>Keep your <strong>full body</strong> inside the frame</p>
                    </div>
                    <div className="camera-session__guide-row" style={plankStyles.guideRow}>
                      <i className="fa-solid fa-person" aria-hidden="true" />
                      <p style={plankStyles.guideText}>Align shoulders, hips, and ankles</p>
                    </div>
                    <div className="camera-session__guide-row" style={plankStyles.guideRow}>
                      <i className="fa-regular fa-lightbulb" aria-hidden="true" />
                      <p style={plankStyles.guideText}>Use good lighting and a clear background</p>
                    </div>
                  </div>
                  {cameraError && <p style={plankStyles.cameraError}>{cameraError}</p>}
                  <button className="camera-session__start-button" type="button" onClick={startCamera}>
                    <i className="fa-solid fa-video" aria-hidden="true" />
                    Start Session
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="camera-session__insights" style={plankStyles.sidePanel}>
          <div className="camera-session__insight-card" style={plankStyles.insightCard}>
            <p style={plankStyles.panelLabel}>LIVE FEEDBACK</p>
            {isStarted ? (
              <div
                className="camera-session__feedback"
                aria-live="polite"
                style={{
                  ...plankStyles.feedbackBox,
                  borderColor: feedbackColor,
                  background: `${feedbackColor}12`,
                }}
              >
                <span style={{ ...plankStyles.feedbackIcon, color: feedbackColor }}>
                  {sessionPhase === PLANK_SESSION_STATES.VALIDATING_POSITION
                    ? '…'
                    : sessionPhase !== PLANK_SESSION_STATES.PLANK_ACTIVE
                      ? '!'
                      : classification === 'good' ? '✓' : classification === 'low' ? '↑' : '↓'}
                </span>
                <p style={{ ...plankStyles.feedbackTitle, color: feedbackColor }}>{feedback}</p>
                <p style={plankStyles.feedbackDetail}>{feedbackDetail}</p>
              </div>
            ) : <p style={plankStyles.inactiveText}>Start session to see feedback</p>}
          </div>

          <div className="camera-session__insight-card" style={plankStyles.insightCard}>
            <p style={plankStyles.panelLabel}>BODY ALIGNMENT</p>
            <div style={plankStyles.angleRow}>
              <span style={plankStyles.angleLabel}>{activeSide === 'left' ? 'Left' : 'Right'} side</span>
              <span style={{ ...plankStyles.angleValue, color: sessionPhase === PLANK_SESSION_STATES.PLANK_ACTIVE ? currentColor.hex : '#94a3b8' }}>
                {sessionPhase === PLANK_SESSION_STATES.PLANK_ACTIVE ? `${bodyAngle}°` : '—'}
              </span>
            </div>
            <div style={plankStyles.angleRow}>
              <span style={plankStyles.angleLabel}>Valid range</span>
              <span style={{ ...plankStyles.angleValue, color: '#22c55e' }}>170°–210°</span>
            </div>
            <div style={plankStyles.angleRow}>
              <span style={plankStyles.angleLabel}>Timer</span>
              <span style={{ ...plankStyles.angleValue, color: classification === 'good' ? '#22c55e' : '#f59e0b' }}>
                {isStarted && sessionPhase === PLANK_SESSION_STATES.PLANK_ACTIVE && classification === 'good' ? 'Counting' : 'Paused'}
              </span>
            </div>
          </div>

          <div className="camera-session__insight-card camera-session__legend" style={plankStyles.insightCard}>
            <p style={plankStyles.panelLabel}>CLASSIFICATION</p>
            {[
              { color: '#22c55e', label: 'Good', range: '170°–210°' },
              { color: '#ef4444', label: 'Hips low', range: '<170°' },
              { color: '#f59e0b', label: 'Hips high', range: '>210°' },
            ].map((item) => (
              <div key={item.label} style={plankStyles.classRow}>
                <span style={{ ...plankStyles.classDot, background: item.color }} />
                <span style={plankStyles.classLabel}>{item.label}</span>
                <span style={plankStyles.classRange}>{item.range}</span>
              </div>
            ))}
          </div>

          {isStarted && (
            <button className="camera-session__end-button" type="button" onClick={stopSession}>
              <i className="fa-solid fa-stop" aria-hidden="true" />
              End Session
            </button>
          )}
        </aside>
      </main>
    </div>
  );
}

const plankStyles = {
  cameraWrapper: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 0.95fr) minmax(0, 3.2fr) minmax(220px, 1.05fr)',
    gap: '16px',
    padding: '14px 18px',
    alignItems: 'stretch',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  sidePanel: { display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, height: '100%', overflow: 'hidden' },
  panelCard: { background: '#ffffff', borderRadius: '16px', padding: '12px', border: '1px solid #e6e8e6', textAlign: 'center' },
  panelLabel: { color: '#9299a5', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700 },
  panelBigValue: { color: '#9635e8', fontSize: '1.7rem', fontWeight: 800, margin: 0, fontVariantNumeric: 'tabular-nums' },
  panelSmallValue: { color: '#667085', fontSize: '11px', fontWeight: 600, margin: '3px 0 0' },
  statusValue: { fontSize: '15px', fontWeight: 800, margin: 0, lineHeight: 1.3 },
  cameraBox: { position: 'relative', minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden', background: '#000000', border: '1px solid #e6e8e6', borderRadius: '16px' },
  video: { width: '100%', height: '100%', display: 'block', objectFit: 'cover' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  preStartOverlay: { position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingBox: { textAlign: 'center' },
  spinner: { width: '48px', height: '48px', margin: '0 auto 16px', border: '4px solid #e6e8e6', borderTopColor: '#9635e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#222222', fontSize: '16px', fontWeight: 600 },
  loadingSubText: { color: '#888888', fontSize: '13px' },
  startOverlayBox: { maxWidth: '360px', padding: '40px', textAlign: 'center' },
  overlayTitle: { margin: '0 0 20px', color: '#222222', fontSize: '1.8rem', fontWeight: 800 },
  positionGuide: { marginBottom: '24px', padding: '20px', textAlign: 'left', background: '#faf4ff', border: '1px solid rgba(150,53,232,0.16)', borderRadius: '16px' },
  guideRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  guideText: { margin: 0, color: '#444444', fontSize: '13px', lineHeight: 1.5 },
  cameraError: { marginBottom: '16px', color: '#ef4444', fontSize: '13px' },
  insightCard: { padding: '12px', background: '#ffffff', border: '1px solid #e6e8e6', borderRadius: '16px' },
  feedbackBox: { marginTop: '8px', padding: '12px 10px 10px', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '4px', border: '1px solid', borderRadius: '10px' },
  feedbackIcon: { fontSize: '1.7rem', lineHeight: 1 },
  feedbackTitle: { margin: 0, fontSize: '14px', fontWeight: 800, textAlign: 'center' },
  feedbackDetail: { margin: 0, color: '#666666', fontSize: '11px', lineHeight: 1.4, textAlign: 'center' },
  inactiveText: { marginTop: '8px', color: '#999999', fontSize: '11px', fontStyle: 'italic' },
  angleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' },
  angleLabel: { color: '#666666', fontSize: '11px' },
  angleValue: { fontSize: '12px', fontWeight: 700 },
  classRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' },
  classDot: { width: '8px', height: '8px', flexShrink: 0, borderRadius: '50%' },
  classLabel: { minWidth: '54px', color: '#222222', fontSize: '10px', fontWeight: 600 },
  classRange: { color: '#888888', fontSize: '10px' },
};
