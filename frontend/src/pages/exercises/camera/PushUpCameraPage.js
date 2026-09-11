import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import {
  PUSH_UP_ALIGNMENT,
  PUSH_UP_CLASS_COLORS,
  PUSH_UP_ELBOW,
  advancePushUpCycle,
  analyzePushUp,
  createPushUpCycleState,
  finalizePushUpCycle,
  validatePushUpPosition,
} from '../../../exercises/pushUp';
import { createSessionResult, saveLatestSessionResult } from '../../../services/summaryService';
import { formatTime } from '../../../utils/formatters';
import { speak } from '../../../utils/speechFeedback';
import './SquatCameraPage.css';
import './PushUpCameraPage.css';
import { resolveWorkoutContext } from '../../../services/workoutDaySessionService';

function storedConfig() {
  try {
    return JSON.parse(sessionStorage.getItem('posefitPushUpWorkoutConfig')) || {};
  } catch {
    return {};
  }
}

function positiveInteger(...values) {
  for (const value of values) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function accuracy(correct, incorrect) {
  const attempts = correct + incorrect;
  return attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
}

export default function PushUpCameraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const saved = storedConfig();
  const incoming = location.state?.workoutConfig || {};
  const workoutContext = resolveWorkoutContext(location.state?.workoutContext, searchParams.get('workoutSession'), 'push-up');
  const targetSets = workoutContext ? 1 : positiveInteger(incoming.sets, searchParams.get('sets'), saved.sets);
  const targetReps = positiveInteger(workoutContext?.target?.reps, incoming.reps, searchParams.get('reps'), saved.reps);
  const restSeconds = positiveInteger(workoutContext?.target?.rest, incoming.rest, searchParams.get('rest'), saved.rest);
  const hasConfig = Boolean(targetSets && targetReps && restSeconds);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const restTimerRef = useRef(null);
  const completionTimeoutRef = useRef(null);
  const sessionStartRef = useRef(null);
  const setStartRef = useRef(null);
  const mountedRef = useRef(false);
  const finishingRef = useRef(false);
  const processingPausedRef = useRef(true);
  const voiceMutedRef = useRef(false);
  const restingRef = useRef(false);
  const currentSetRef = useRef(1);
  const repsInSetRef = useRef(0);
  const incorrectInSetRef = useRef(0);
  const correctRepsRef = useRef(0);
  const incorrectRepsRef = useRef([]);
  const interruptedIssuesRef = useRef([]);
  const goodAnglesRef = useRef([]);
  const setResultsRef = useRef([]);
  const cycleRef = useRef(createPushUpCycleState());
  const setCompletingRef = useRef(false);
  const lastLiveUpdateRef = useRef(0);

  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [repsInSet, setRepsInSet] = useState(0);
  const [totalCorrectReps, setTotalCorrectReps] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restCountdown, setRestCountdown] = useState(0);
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const [positionStatus, setPositionStatus] = useState('no_person');
  const [phase, setPhase] = useState('waiting');
  const [classification, setClassification] = useState('adjust');
  const [feedback, setFeedback] = useState('Get into a Push Up position.');
  const [feedbackDetail, setFeedbackDetail] = useState('Turn sideways with your full body visible.');
  const [elbowAngle, setElbowAngle] = useState(0);
  const [bodyAngle, setBodyAngle] = useState(0);
  const [armDifference, setArmDifference] = useState(0);
  const [activeSide, setActiveSide] = useState('left');

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

  const resetCycle = useCallback(() => {
    cycleRef.current = createPushUpCycleState();
    setPhase('waiting');
  }, []);

  useEffect(() => {
    if (!isStarted) return undefined;
    sessionStartRef.current = Date.now();
    setStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isStarted]);

  const stopResources = useCallback(() => {
    mountedRef.current = false;
    processingPausedRef.current = true;
    restingRef.current = false;
    clearInterval(timerRef.current);
    clearInterval(restTimerRef.current);
    clearTimeout(completionTimeoutRef.current);
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    window.speechSynthesis.cancel();
    clearCanvas();
  }, [clearCanvas]);

  const finishSession = useCallback((status = 'ended') => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    if (status !== 'completed') {
      const openAttempt = finalizePushUpCycle(cycleRef.current);
      if (openAttempt) {
        incorrectRepsRef.current.push({
          angle: Math.round(openAttempt.minimumElbowAngle),
          reasons: openAttempt.reasons,
          classification: 'bad',
          set: currentSetRef.current,
        });
        incorrectInSetRef.current += 1;
      }
    }

    const alreadySaved = setResultsRef.current.some((set) => set.setNum === currentSetRef.current);
    if (!alreadySaved && (repsInSetRef.current > 0 || incorrectInSetRef.current > 0)) {
      setResultsRef.current.push({
        setNum: currentSetRef.current,
        goodReps: repsInSetRef.current,
        badReps: incorrectInSetRef.current,
        duration: setStartRef.current ? Math.floor((Date.now() - setStartRef.current) / 1000) : 0,
      });
    }

    const finalDuration = sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
      : sessionTime;
    const issueCounts = {};
    [...incorrectRepsRef.current, ...interruptedIssuesRef.current].forEach((rep) => rep.reasons.forEach((reason) => {
      issueCounts[reason] = (issueCounts[reason] || 0) + 1;
    }));
    const incorrectCount = incorrectRepsRef.current.length;
    const completedSets = setResultsRef.current.filter((set) => set.goodReps >= targetReps).length;
    stopResources();

    const sessionResult = saveLatestSessionResult(createSessionResult({
      exercise: { id: 'push-up', name: 'Push Up' },
      metricType: 'reps',
      status,
      duration: finalDuration,
      setsCompleted: completedSets,
      totalReps: correctRepsRef.current + incorrectCount,
      correctReps: correctRepsRef.current,
      incorrectReps: incorrectCount,
      accuracy: accuracy(correctRepsRef.current, incorrectCount),
      formIssues: Object.entries(issueCounts).map(([type, count]) => ({ type, count })),
      setResults: [...setResultsRef.current],
      config: { repsPerSet: targetReps, totalSets: targetSets, restSeconds },
      analysis: {
        repAngles: [...goodAnglesRef.current],
        badReps: [...incorrectRepsRef.current],
        thresholds: {
          topElbowAngle: PUSH_UP_ELBOW.topMin,
          bottomElbowAngle: PUSH_UP_ELBOW.bottomMax,
          bodyAlignment: [PUSH_UP_ALIGNMENT.bodyMin, PUSH_UP_ALIGNMENT.bodyMax],
          maxArmDifference: PUSH_UP_ALIGNMENT.maxArmDifference,
        },
      },
      workoutContext,
    }));
    navigate('/session-summary', { replace: true, state: { sessionResult } });
  }, [navigate, restSeconds, sessionTime, stopResources, targetReps, targetSets, workoutContext]);

  const completeSet = useCallback(() => {
    if (setCompletingRef.current) return;
    setCompletingRef.current = true;
    processingPausedRef.current = true;
    clearCanvas();
    setResultsRef.current.push({
      setNum: currentSetRef.current,
      goodReps: repsInSetRef.current,
      badReps: incorrectInSetRef.current,
      duration: setStartRef.current ? Math.floor((Date.now() - setStartRef.current) / 1000) : 0,
    });

    if (currentSetRef.current >= targetSets) {
      setWorkoutComplete(true);
      if (!voiceMutedRef.current) speak('Push Up workout complete. Great job!', true);
      completionTimeoutRef.current = setTimeout(() => finishSession('completed'), 2500);
      return;
    }

    restingRef.current = true;
    setIsResting(true);
    setRestCountdown(restSeconds);
    if (!voiceMutedRef.current) speak(`Set ${currentSetRef.current} complete. Rest for ${restSeconds} seconds.`, true);
  }, [clearCanvas, finishSession, restSeconds, targetSets]);

  useEffect(() => {
    if (!isResting) return undefined;
    restTimerRef.current = setInterval(() => {
      setRestCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(restTimerRef.current);
          currentSetRef.current += 1;
          repsInSetRef.current = 0;
          incorrectInSetRef.current = 0;
          setCurrentSet(currentSetRef.current);
          setRepsInSet(0);
          setStartRef.current = Date.now();
          setCompletingRef.current = false;
          restingRef.current = false;
          setIsResting(false);
          processingPausedRef.current = false;
          resetCycle();
          if (!voiceMutedRef.current) speak(`Starting set ${currentSetRef.current}.`, true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(restTimerRef.current);
  }, [isResting, resetCycle]);

  const processRep = useCallback((analysis) => {
    if (processingPausedRef.current || restingRef.current || setCompletingRef.current) return;
    const wasRising = cycleRef.current.bottomReached && analysis.phase === 'transition';
    const result = advancePushUpCycle(cycleRef.current, analysis);
    cycleRef.current = result.state;
    setPhase(wasRising ? 'rising' : analysis.phase === 'transition' ? 'lowering' : analysis.phase);

    if (!result.event) return;
    if (result.event.type === 'correct') {
      correctRepsRef.current += 1;
      setTotalCorrectReps(correctRepsRef.current);
      repsInSetRef.current += 1;
      goodAnglesRef.current.push(Math.round(result.event.minimumElbowAngle));
      setRepsInSet(repsInSetRef.current);
      if (!voiceMutedRef.current) speak(`Rep ${repsInSetRef.current} of ${targetReps}.`, true);
      if (repsInSetRef.current >= targetReps) completeSet();
    } else {
      incorrectRepsRef.current.push({
        angle: Math.round(result.event.minimumElbowAngle),
        reasons: result.event.reasons,
        classification: 'bad',
        set: currentSetRef.current,
      });
      incorrectInSetRef.current += 1;
      setIncorrectCount(incorrectRepsRef.current.length);
      if (!voiceMutedRef.current) speak(result.event.reasons[0] || 'Complete the full Push Up.', true);
    }
  }, [completeSet, targetReps]);

  const drawAngle = useCallback((context, point, angle, color, width, height) => {
    context.beginPath();
    context.arc(point.x * width, point.y * height, 28, 0, Math.PI * 2);
    context.fillStyle = 'rgba(10, 15, 24, 0.72)';
    context.fill();
    context.fillStyle = color;
    context.font = 'bold 14px Segoe UI';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${Math.round(angle)}°`, point.x * width, point.y * height);
  }, []);

  const onResults = useCallback((results) => {
    if (!mountedRef.current) return;
    if (processingPausedRef.current) {
      clearCanvas();
      return;
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.width = results.image.width;
    canvas.height = results.image.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const position = validatePushUpPosition(results.poseLandmarks);
    setPositionStatus(position.status);
    if (position.activeSide) setActiveSide(position.activeSide);
    if (position.status !== 'ready') {
      const interrupted = finalizePushUpCycle(cycleRef.current);
      if (interrupted) interruptedIssuesRef.current.push(interrupted);
      cycleRef.current = createPushUpCycleState();
      setPhase('waiting');
      setElbowAngle(0);
      setBodyAngle(0);
      let message = 'Get into a Push Up position.';
      let detail = 'Place your body horizontally in a side-view starting position.';
      if (position.status === 'no_person' || position.status === 'full_body_required') {
        message = 'Make sure your full body is visible.';
        detail = 'Keep your shoulder, elbow, wrist, hip, and ankle inside the frame.';
      } else if (position.status === 'turn_sideways') {
        message = 'Turn sideways to the camera.';
        detail = 'PoseFit evaluates Push Ups from a side view only.';
      }
      setClassification('adjust');
      setFeedback(message);
      setFeedbackDetail(detail);
      if (!voiceMutedRef.current) speak(message);
      if (results.poseLandmarks) {
        drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color: '#64748b', lineWidth: 2 });
        drawLandmarks(context, results.poseLandmarks, { color: '#64748b', lineWidth: 1, radius: 3 });
      }
      return;
    }

    const analysis = analyzePushUp(results.poseLandmarks);
    if (!analysis) return;
    const rising = cycleRef.current.bottomReached && analysis.phase === 'transition';
    const liveFeedback = rising && analysis.classification !== 'bad'
      ? { ...analysis, feedback: 'Fully extend your arms.', feedbackDetail: `Elbow angle ${Math.round(analysis.elbowAngle)}°. Return above 150°.` }
      : analysis;
    const color = PUSH_UP_CLASS_COLORS[liveFeedback.classification].skeleton;
    drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color, lineWidth: 3 });
    drawLandmarks(context, results.poseLandmarks, { color, lineWidth: 1, radius: 4 });
    Object.values(analysis.landmarks).forEach((point) => {
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, 7, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    });
    drawAngle(context, analysis.landmarks.elbow, analysis.elbowAngle, color, canvas.width, canvas.height);

    const now = performance.now();
    if (now - lastLiveUpdateRef.current >= 120) {
      lastLiveUpdateRef.current = now;
      setClassification(liveFeedback.classification);
      setFeedback(liveFeedback.feedback);
      setFeedbackDetail(liveFeedback.feedbackDetail);
      setElbowAngle(Math.round(analysis.elbowAngle));
      setBodyAngle(Math.round(analysis.bodyAngle));
      setArmDifference(Math.round(analysis.armDifference));
    }
    processRep(analysis);
    if (!voiceMutedRef.current) speak(liveFeedback.feedback);
  }, [clearCanvas, drawAngle, processRep]);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError('');
    finishingRef.current = false;
    mountedRef.current = true;
    processingPausedRef.current = false;
    resetCycle();
    try {
      const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
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
          if (poseRef.current && videoRef.current && mountedRef.current && !processingPausedRef.current) {
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
      stopResources();
      setCameraError('Could not access the camera. Allow camera permission and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [onResults, resetCycle, stopResources]);

  useEffect(() => () => stopResources(), [stopResources]);

  if (!hasConfig) {
    return (
      <div className="camera-session camera-session--push-up camera-session--configuration-error">
        <header className="camera-session__header">
          <button className="camera-session__back" type="button" onClick={() => navigate('/exercises/push-up')}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />Back to configuration
          </button>
          <div className="camera-session__brand">POSE<span>FIT</span></div>
        </header>
        <main className="camera-configuration-error">
          <span className="camera-configuration-error__icon"><i className="fa-solid fa-sliders" /></span>
          <h1>Workout configuration required</h1>
          <p>Choose your reps, sets, and rest time before starting.</p>
          <button type="button" onClick={() => navigate('/exercises/push-up')}>Configure Push Up</button>
        </main>
      </div>
    );
  }

  const currentColor = PUSH_UP_CLASS_COLORS[classification];
  const currentAccuracy = accuracy(totalCorrectReps, incorrectCount);
  const sessionStatus = workoutComplete ? 'Complete' : isResting ? 'Resting' : !isStarted ? 'Ready' : positionStatus === 'ready' ? 'Tracking' : 'Positioning';
  const statusTone = workoutComplete ? 'complete' : isResting ? 'resting' : positionStatus === 'ready' ? 'active' : 'waiting';
  const displayedSet = workoutContext?.currentSet || currentSet;
  const displayedTotalSets = workoutContext?.totalSets || targetSets;
  const backPath = workoutContext?.detailsRoute || '/exercises/push-up';

  return (
    <div className="camera-session camera-session--push-up">
      <header className="camera-session__header">
        <button className="camera-session__back" type="button" onClick={() => navigate(backPath)}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />Back
        </button>
        <div className="camera-session__title">
          <span className="camera-session__exercise-icon"><i className="fa-solid fa-person" /></span>
          <span><h1>Push Up</h1><small>{workoutContext ? `${workoutContext.planName} · Week ${workoutContext.week} · Round ${workoutContext.currentRound} · ` : ''}Set {displayedSet} of {displayedTotalSets} · {targetReps} reps</small></span>
        </div>
        <span className={`camera-session__status camera-session__status--${statusTone}`}><span />{sessionStatus}</span>
        <div className="camera-session__actions">
          {isStarted && (
            <button className={`camera-session__voice${voiceMuted ? ' camera-session__voice--muted' : ''}`} type="button" onClick={() => {
              setVoiceMuted((previous) => {
                voiceMutedRef.current = !previous;
                if (!previous) window.speechSynthesis.cancel();
                return !previous;
              });
            }}>
              <i className={`fa-solid ${voiceMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} /><span>{voiceMuted ? 'Muted' : 'Voice on'}</span>
            </button>
          )}
          <div className="camera-session__timer"><i className="fa-regular fa-clock" />{formatTime(sessionTime)}</div>
        </div>
      </header>

      <main className="camera-session__workspace" style={styles.workspace}>
        <aside className="camera-session__progress" style={styles.sidePanel}>
          <Metric label="SET" value={displayedSet} detail={`OF ${displayedTotalSets}`} primary />
          <div className="camera-session__metric camera-session__metric--primary" style={styles.card}>
            <p style={styles.label}>REPS</p><p style={styles.bigValue}>{repsInSet}</p><p style={styles.smallValue}>OF {targetReps}</p>
            <div className="camera-session__progress-track"><span style={{ width: `${Math.min((repsInSet / targetReps) * 100, 100)}%` }} /></div>
          </div>
          <Metric label="TOTAL REPS" value={totalCorrectReps} />
          <Metric label={isResting ? 'REST LEFT' : 'REST BETWEEN SETS'} value={formatTime(isResting ? restCountdown : restSeconds)} />
          <Metric label="FORM ACCURACY" value={isStarted ? `${currentAccuracy}%` : '—'} />
        </aside>

        <section className="camera-session__camera" style={styles.camera}>
          <video ref={videoRef} style={styles.media} playsInline muted />
          <canvas ref={canvasRef} style={{ ...styles.media, position: 'absolute', inset: 0 }} />
          {isResting && <div className="camera-session__rest-overlay"><span className="camera-session__rest-check"><i className="fa-solid fa-check" /></span><p className="camera-session__rest-eyebrow">Set {currentSet} Complete</p><h2>Rest</h2><time>{formatTime(restCountdown)}</time><p>Next: Set {currentSet + 1} of {targetSets}</p></div>}
          {workoutComplete && <div className="camera-session__complete-overlay"><span><i className="fa-solid fa-trophy" /></span><h2>{workoutContext ? 'Set Complete' : 'Workout Complete'}</h2><p>Preparing your session summary…</p></div>}
          {isStarted && !isResting && !workoutComplete && positionStatus !== 'ready' && <div className={`camera-session__readiness camera-session__readiness--${positionStatus}`}><i className="fa-solid fa-person-circle-question" /><span>{feedback}</span></div>}
          {isStarted && positionStatus === 'ready' && <div className="camera-session__tracking-badge"><span />Body tracking active</div>}
          {!isStarted && <div className="camera-session__prestart" style={styles.prestart}>{isLoading ? <div style={{ textAlign: 'center' }}><div style={styles.spinner} /><p>Loading Pose Detection...</p></div> : <div className="camera-session__start-card" style={styles.startCard}><span className="camera-session__start-icon"><i className="fa-solid fa-person" /></span><p className="camera-session__start-eyebrow">PoseFit Live Coaching</p><h2>Ready for Push Ups?</h2><div className="camera-session__plan"><span><strong>{targetReps}</strong> reps</span><span><strong>{workoutContext ? `Set ${displayedSet}/${displayedTotalSets}` : targetSets}</strong> {workoutContext ? `round ${workoutContext.currentRound}` : 'sets'}</span><span><strong>{restSeconds}s</strong> rest</span></div><div className="camera-session__position-guide"><Guide icon="fa-camera" text="Position the camera at your side" /><Guide icon="fa-person" text="Keep your full body inside the frame" /><Guide icon="fa-arrows-left-right" text="Start with arms fully extended" /></div>{cameraError && <p style={{ color: '#ef4444', fontSize: 12 }}>{cameraError}</p>}<button className="camera-session__start-button" type="button" onClick={startCamera}><i className="fa-solid fa-video" />Start Session</button></div>}</div>}
        </section>

        <aside className="camera-session__insights" style={styles.sidePanel}>
          <div className="camera-session__insight-card" style={styles.card}><p style={styles.label}>LIVE FEEDBACK</p>{isStarted ? <div className="camera-session__feedback" style={{ ...styles.feedback, color: currentColor.hex, borderColor: currentColor.hex, background: `${currentColor.hex}12` }}><strong>{feedback}</strong><small>{feedbackDetail}</small></div> : <p style={styles.inactive}>Start session to see feedback</p>}</div>
          <div className="camera-session__insight-card" style={styles.card}><p style={styles.label}>JOINT ANGLES</p><AngleRow label={`${activeSide === 'left' ? 'Left' : 'Right'} elbow`} value={isStarted && positionStatus === 'ready' ? `${elbowAngle}°` : '—'} /><AngleRow label="Body alignment" value={isStarted && positionStatus === 'ready' ? `${bodyAngle}°` : '—'} /><AngleRow label="Arm difference" value={isStarted && positionStatus === 'ready' ? `${armDifference}°` : '—'} /></div>
          <div className="camera-session__insight-card camera-session__legend" style={styles.card}><p style={styles.label}>MOVEMENT</p><AngleRow label="Phase" value={phase} /><AngleRow label="Top" value=">150°" /><AngleRow label="Bottom" value="<90°" /><AngleRow label="Body" value="160°–180°" /></div>
          {isStarted && <button className="camera-session__end-button" type="button" onClick={() => finishSession('ended')}><i className="fa-solid fa-stop" />End Session</button>}
        </aside>
      </main>
    </div>
  );
}

function Metric({ label, value, detail, primary = false }) {
  return <div className={`camera-session__metric${primary ? ' camera-session__metric--primary' : ''}`} style={styles.card}><p style={styles.label}>{label}</p><p style={styles.bigValue}>{value}</p>{detail && <p style={styles.smallValue}>{detail}</p>}</div>;
}

function Guide({ icon, text }) {
  return <div className="camera-session__guide-row"><i className={`fa-solid ${icon}`} /><p>{text}</p></div>;
}

function AngleRow({ label, value }) {
  return <div style={styles.row}><span>{label}</span><strong>{value}</strong></div>;
}

const styles = {
  workspace: { display: 'grid', gridTemplateColumns: 'minmax(180px,.95fr) minmax(0,3.2fr) minmax(220px,1.05fr)', gap: 16, padding: '14px 18px', alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'hidden' },
  sidePanel: { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, height: '100%', overflow: 'hidden' },
  card: { background: '#fff', border: '1px solid #e6e8e6', borderRadius: 16, padding: 12, textAlign: 'center' },
  label: { margin: '0 0 4px', color: '#9299a5', fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  bigValue: { margin: 0, color: '#176fff', fontSize: '1.7rem', fontWeight: 800 },
  smallValue: { margin: '3px 0 0', color: '#667085', fontSize: 11, fontWeight: 600 },
  camera: { position: 'relative', minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden', background: '#000', borderRadius: 16 },
  media: { width: '100%', height: '100%', display: 'block', objectFit: 'cover' },
  prestart: { position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  startCard: { maxWidth: 370, padding: 32, textAlign: 'center' },
  spinner: { width: 46, height: 46, margin: '0 auto 15px', border: '4px solid #e6e8e6', borderTopColor: '#176fff', borderRadius: '50%', animation: 'spin .8s linear infinite' },
  feedback: { marginTop: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid', borderRadius: 10, fontSize: 12 },
  inactive: { color: '#999', fontSize: 11, fontStyle: 'italic' },
  row: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8, color: '#667085', fontSize: 11, textTransform: 'capitalize' },
};
