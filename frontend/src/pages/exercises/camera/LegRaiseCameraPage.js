import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import {
  LEG_RAISE_CLASS_COLORS,
  LEG_RAISE_HIP,
  LEG_RAISE_KNEE,
  advanceLegRaiseCycle,
  analyzeLegRaise,
  createLegRaiseCycleState,
  finalizeLegRaiseCycle,
  validateLegRaisePosition,
} from '../../../exercises/legRaise';
import { createSessionResult, saveLatestSessionResult } from '../../../services/summaryService';
import { formatTime } from '../../../utils/formatters';
import { speak } from '../../../utils/speechFeedback';
import { holdFeedback, HOLD_FAILURE_REASON } from '../../../exercises/repHold';
import './SquatCameraPage.css';
import './LegRaiseCameraPage.css';
import { resolveWorkoutContext } from '../../../services/workoutDaySessionService';
import CameraInactivityOverlay from '../../../components/CameraInactivityOverlay';
import useCameraInactivity from '../../../hooks/useCameraInactivity';

function readConfig() {
  try { return JSON.parse(sessionStorage.getItem('posefitLegRaiseWorkoutConfig')) || {}; } catch { return {}; }
}

function positive(...values) {
  for (const value of values) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function accuracy(correct, incorrect) {
  return correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
}

export default function LegRaiseCameraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const saved = readConfig();
  const incoming = location.state?.workoutConfig || {};
  const workoutContext = resolveWorkoutContext(location.state?.workoutContext, params.get('workoutSession'), 'leg-raise');
  const targetSets = workoutContext ? 1 : positive(incoming.sets, params.get('sets'), saved.sets);
  const targetReps = positive(workoutContext?.target?.reps, incoming.reps, params.get('reps'), saved.reps);
  const restSeconds = positive(workoutContext?.target?.rest, incoming.rest, params.get('rest'), saved.rest);
  const hasConfig = Boolean(targetSets && targetReps && restSeconds);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const restRef = useRef(null);
  const completionRef = useRef(null);
  const sessionStartRef = useRef(null);
  const setStartRef = useRef(null);
  const mountedRef = useRef(false);
  const finishingRef = useRef(false);
  const pausedRef = useRef(true);
  const restingRef = useRef(false);
  const mutedRef = useRef(false);
  const setRef = useRef(1);
  const setCompletedRepsRef = useRef(0);
  const setCorrectRef = useRef(0);
  const setIncorrectRef = useRef(0);
  const completedRepsRef = useRef(0);
  const correctRef = useRef(0);
  const incorrectRef = useRef([]);
  const anglesRef = useRef([]);
  const setsRef = useRef([]);
  const cycleRef = useRef(createLegRaiseCycleState());
  const completingRef = useRef(false);
  const liveUpdateRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [muted, setMuted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [setCompletedReps, setSetCompletedReps] = useState(0);
  const [totalCompletedReps, setTotalCompletedReps] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [resting, setResting] = useState(false);
  const [restCountdown, setRestCountdown] = useState(0);
  const [complete, setComplete] = useState(false);
  const [position, setPosition] = useState('no_person');
  const [phase, setPhase] = useState('waiting');
  const [classification, setClassification] = useState('adjust');
  const [feedback, setFeedback] = useState('Lie sideways with your full body visible.');
  const [feedbackDetail, setFeedbackDetail] = useState('Keep both legs extended and close to the floor.');
  const [activeSide, setActiveSide] = useState('left');
  const [hipFlexion, setHipFlexion] = useState(0);
  const [kneeAngle, setKneeAngle] = useState(0);

  useEffect(() => {
    const body = document.body.style.overflow;
    const html = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { document.body.style.overflow = body; document.documentElement.style.overflow = html; };
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const resetCycle = useCallback(() => {
    cycleRef.current = createLegRaiseCycleState();
    setPhase('waiting');
  }, []);

  useEffect(() => {
    const resetHiddenHold = () => { if (document.hidden) resetCycle(); };
    document.addEventListener('visibilitychange', resetHiddenHold);
    return () => document.removeEventListener('visibilitychange', resetHiddenHold);
  }, [resetCycle]);

  useEffect(() => {
    if (!started) return undefined;
    sessionStartRef.current = Date.now();
    setStartRef.current = Date.now();
    timerRef.current = setInterval(() => setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000)), 1000);
    return () => clearInterval(timerRef.current);
  }, [started]);

  const stopResources = useCallback(() => {
    mountedRef.current = false;
    pausedRef.current = true;
    restingRef.current = false;
    clearInterval(timerRef.current);
    clearInterval(restRef.current);
    clearTimeout(completionRef.current);
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    if (poseRef.current) { poseRef.current.close(); poseRef.current = null; }
    window.speechSynthesis.cancel();
    clearCanvas();
  }, [clearCanvas]);

  const cancelForInactivity = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    stopResources();
    setResting(false);
    setStarted(false);
  }, [stopResources]);

  const {
    isWarningVisible: inactivityWarningVisible,
    isCancelled: inactivityCancelled,
    remainingSeconds: inactivityRemainingSeconds,
    reportPersonDetection,
  } = useCameraInactivity({
    enabled: started && !resting && !complete,
    onTimeout: cancelForInactivity,
    videoRef,
  });

  const finish = useCallback((status = 'ended') => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (status !== 'completed') {
      const open = finalizeLegRaiseCycle(cycleRef.current);
      if (open) {
        incorrectRef.current.push({ angle: Math.round(open.maximumHipFlexion), reasons: open.reasons, classification: 'bad', set: setRef.current, side: open.activeSide });
        setIncorrectRef.current += 1;
      }
    }
    const savedCurrent = setsRef.current.some((set) => set.setNum === setRef.current);
    if (!savedCurrent && (setCompletedRepsRef.current || setIncorrectRef.current)) {
      setsRef.current.push({
        setNum: setRef.current,
        completedReps: setCorrectRef.current,
        goodReps: setCorrectRef.current,
        badReps: setIncorrectRef.current,
        duration: setStartRef.current ? Math.floor((Date.now() - setStartRef.current) / 1000) : 0,
      });
    }
    const issueCounts = {};
    incorrectRef.current.forEach((rep) => rep.reasons.forEach((reason) => { issueCounts[reason] = (issueCounts[reason] || 0) + 1; }));
    const duration = sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current) / 1000) : sessionTime;
    const incorrect = incorrectRef.current.length;
    const completedSets = setsRef.current.filter((set) => set.goodReps >= targetReps).length;
    stopResources();
    const sessionResult = saveLatestSessionResult(createSessionResult({
      exercise: { id: 'leg-raise', name: 'Leg Raise' }, metricType: 'reps', status, duration,
      setsCompleted: completedSets,
      totalReps: correctRef.current + incorrect,
      correctReps: correctRef.current,
      incorrectReps: incorrect,
      accuracy: accuracy(correctRef.current, incorrect),
      formIssues: Object.entries(issueCounts).map(([type, count]) => ({ type, count })),
      setResults: [...setsRef.current],
      config: { repsPerSet: targetReps, totalSets: targetSets, restSeconds },
      analysis: {
        repAngles: [...anglesRef.current],
        badReps: [...incorrectRef.current],
        hipFlexionRange: [LEG_RAISE_HIP.effectiveMin, LEG_RAISE_HIP.effectiveMax],
        kneeExtensionMin: LEG_RAISE_KNEE.extensionMin,
      },
      workoutContext,
    }));
    navigate('/session-summary', { replace: true, state: { sessionResult } });
  }, [navigate, restSeconds, sessionTime, stopResources, targetReps, targetSets, workoutContext]);

  const completeSet = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    pausedRef.current = true;
    clearCanvas();
    setsRef.current.push({
      setNum: setRef.current,
      completedReps: setCorrectRef.current,
      goodReps: setCorrectRef.current,
      badReps: setIncorrectRef.current,
      duration: setStartRef.current ? Math.floor((Date.now() - setStartRef.current) / 1000) : 0,
    });
    if (setRef.current >= targetSets) {
      setComplete(true);
      if (!mutedRef.current) speak('Leg Raise workout complete. Great job!', true);
      completionRef.current = setTimeout(() => finish('completed'), 2500);
    } else {
      restingRef.current = true;
      setResting(true);
      setRestCountdown(restSeconds);
      if (!mutedRef.current) speak(`Set ${setRef.current} complete. Rest for ${restSeconds} seconds.`, true);
    }
  }, [clearCanvas, finish, restSeconds, targetSets]);

  useEffect(() => {
    if (!resting) return undefined;
    restRef.current = setInterval(() => setRestCountdown((previous) => {
      if (previous <= 1) {
        clearInterval(restRef.current);
        setRef.current += 1;
        setCompletedRepsRef.current = 0;
        setCorrectRef.current = 0;
        setIncorrectRef.current = 0;
        setCurrentSet(setRef.current);
        setSetCompletedReps(0);
        setStartRef.current = Date.now();
        completingRef.current = false;
        restingRef.current = false;
        setResting(false);
        pausedRef.current = false;
        resetCycle();
        if (!mutedRef.current) speak(`Starting set ${setRef.current}.`, true);
        return 0;
      }
      return previous - 1;
    }), 1000);
    return () => clearInterval(restRef.current);
  }, [resetCycle, resting]);

  const processRep = useCallback((analysis) => {
    if (pausedRef.current || restingRef.current || completingRef.current) return;
    const lowering = cycleRef.current.validRaisedConfirmed && analysis.hipFlexion < cycleRef.current.maximumHipFlexion;
    const result = advanceLegRaiseCycle(cycleRef.current, analysis);
    cycleRef.current = result.state;
    setPhase(lowering && analysis.position !== 'lowered' ? 'lowering' : result.state.phase);
    if (result.state.attemptStarted && analysis.position === 'valid_raised' && analysis.legExtended) {
      setFeedback(result.state.hold.qualified ? 'Good! Complete the rep.' : 'Hold the position for 1 second.');
      setFeedbackDetail(holdFeedback(result.state.hold));
    }
    if (!result.event) return;
    if (result.event.type === 'correct') {
      correctRef.current += 1;
      setCorrectRef.current += 1;
      completedRepsRef.current += 1;
      setCompletedRepsRef.current += 1;
      setTotalCompletedReps(completedRepsRef.current);
      setSetCompletedReps(setCompletedRepsRef.current);
      anglesRef.current.push(Math.round(result.event.maximumHipFlexion));
      if (!mutedRef.current) speak(`Rep ${setCompletedRepsRef.current} of ${targetReps}.`, true);
      if (setCompletedRepsRef.current >= targetReps) completeSet();
    } else {
      incorrectRef.current.push({ angle: Math.round(result.event.maximumHipFlexion), reasons: result.event.reasons, classification: 'bad', set: setRef.current, side: result.event.activeSide });
      setIncorrectRef.current += 1;
      setIncorrectCount(incorrectRef.current.length);
      if (result.event.reasons[0] === HOLD_FAILURE_REASON) {
        setFeedback(HOLD_FAILURE_REASON);
        setFeedbackDetail('Maintain the raised position continuously before lowering.');
      }
      if (!mutedRef.current) speak(result.event.reasons[0], true);
    }
  }, [completeSet, targetReps]);

  const drawAngle = useCallback((context, point, angle, color, width, height) => {
    context.beginPath(); context.arc(point.x * width, point.y * height, 28, 0, Math.PI * 2);
    context.fillStyle = 'rgba(10,15,24,.72)'; context.fill(); context.fillStyle = color;
    context.font = 'bold 14px Segoe UI'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(`${Math.round(angle)}°`, point.x * width, point.y * height);
  }, []);

  const recordInterruptedAttempt = useCallback((readinessStatus) => {
    const interrupted = finalizeLegRaiseCycle(cycleRef.current);
    if (!interrupted) return;
    const reason = readinessStatus === 'turn_sideways'
      ? 'Camera orientation became unsuitable during the Leg Raise'
      : 'Required landmarks were lost during the Leg Raise';
    incorrectRef.current.push({ angle: Math.round(interrupted.maximumHipFlexion), reasons: [...new Set([...interrupted.reasons, reason])], classification: 'bad', set: setRef.current, side: interrupted.activeSide });
    setIncorrectRef.current += 1;
    setIncorrectCount(incorrectRef.current.length);
  }, []);

  const onResults = useCallback((results) => {
    if (!mountedRef.current) return;
    if (pausedRef.current) { clearCanvas(); return; }
    reportPersonDetection(Boolean(results.poseLandmarks?.length >= 33));
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.width = results.image.width; canvas.height = results.image.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    const readiness = validateLegRaisePosition(results.poseLandmarks);
    setPosition(readiness.status);
    if (readiness.status !== 'ready') {
      recordInterruptedAttempt(readiness.status);
      resetCycle(); setHipFlexion(0); setKneeAngle(0); setClassification('adjust');
      const message = readiness.status === 'turn_sideways' ? 'Turn sideways to the camera.' : readiness.status === 'full_body_required' ? 'Keep your full body visible.' : 'Move into the camera view.';
      setFeedback(message); setFeedbackDetail('Keep your shoulders, hips, knees, and ankles clearly visible.');
      if (!mutedRef.current) speak(message);
      if (results.poseLandmarks) {
        drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color: '#64748b', lineWidth: 2 });
        drawLandmarks(context, results.poseLandmarks, { color: '#64748b', radius: 3 });
      }
      return;
    }
    const analysis = analyzeLegRaise(results.poseLandmarks, cycleRef.current.activeSide);
    if (!analysis) { resetCycle(); return; }
    const lowering = cycleRef.current.validRaisedConfirmed && analysis.hipFlexion < cycleRef.current.maximumHipFlexion;
    const live = lowering
      ? analysis.position === 'lowered'
        ? { ...analysis, feedback: 'Hold the lowered position.', feedbackDetail: 'Keep your legs straight and close to the floor briefly to complete the repetition.' }
        : { ...analysis, feedback: 'Lower your legs slowly and with control.', feedbackDetail: 'Return near 0° hip flexion to complete the repetition.' }
      : analysis;
    const color = LEG_RAISE_CLASS_COLORS[live.classification].skeleton;
    drawConnectors(context, results.poseLandmarks, POSE_CONNECTIONS, { color, lineWidth: 3 });
    drawLandmarks(context, results.poseLandmarks, { color, radius: 4 });
    Object.values(analysis.landmarks).forEach((point) => { context.beginPath(); context.arc(point.x * canvas.width, point.y * canvas.height, 8, 0, Math.PI * 2); context.fillStyle = color; context.fill(); });
    drawAngle(context, analysis.landmarks.hip, analysis.hipFlexion, color, canvas.width, canvas.height);
    if (performance.now() - liveUpdateRef.current >= 120) {
      liveUpdateRef.current = performance.now();
      setClassification(live.classification); setFeedback(live.feedback); setFeedbackDetail(live.feedbackDetail);
      setActiveSide(analysis.activeSide); setHipFlexion(Math.round(analysis.hipFlexion)); setKneeAngle(Math.round(analysis.kneeAngle));
    }
    processRep(analysis);
    if (!mutedRef.current) speak(analysis.position === 'valid_raised' && analysis.legExtended
      ? cycleRef.current.hold.qualified ? 'Good! Complete the rep.' : 'Keep holding.'
      : live.feedback);
  }, [clearCanvas, drawAngle, processRep, recordInterruptedAttempt, reportPersonDetection, resetCycle]);

  const startCamera = useCallback(async () => {
    setLoading(true); setCameraError(''); finishingRef.current = false; mountedRef.current = true; pausedRef.current = false; resetCycle();
    try {
      const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
      pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
      pose.onResults(onResults); poseRef.current = pose;
      const camera = new Camera(videoRef.current, { onFrame: async () => { if (poseRef.current && mountedRef.current && !pausedRef.current) await poseRef.current.send({ image: videoRef.current }); }, width: 640, height: 480 });
      cameraRef.current = camera; await camera.start(); setStarted(true);
    } catch {
      stopResources();
      setCameraError('Could not access the camera. Allow camera permission and try again.');
    } finally { setLoading(false); }
  }, [onResults, resetCycle, stopResources]);

  useEffect(() => () => stopResources(), [stopResources]);

  if (!hasConfig) return <div className="camera-session camera-session--leg-raise camera-session--configuration-error"><header className="camera-session__header"><button className="camera-session__back camera-session__back--full" type="button" onClick={() => navigate('/exercises/leg-raise')}><i className="fa-solid fa-arrow-left" />Back to configuration</button><div className="camera-session__brand">POSE<span>FIT</span></div></header><main className="camera-configuration-error"><span className="camera-configuration-error__icon"><i className="fa-solid fa-sliders" /></span><h1>Workout configuration required</h1><p>Choose your reps, sets, and rest time before starting.</p><button type="button" onClick={() => navigate('/exercises/leg-raise')}>Configure Leg Raise</button></main></div>;

  const color = LEG_RAISE_CLASS_COLORS[classification];
  const sessionAccuracy = accuracy(correctRef.current, incorrectCount);
  const status = inactivityCancelled ? 'Cancelled' : complete ? 'Complete' : resting ? 'Resting' : !started ? 'Ready' : position === 'ready' ? 'Tracking' : 'Positioning';
  const tone = inactivityCancelled ? 'cancelled' : complete ? 'complete' : resting ? 'resting' : position === 'ready' ? 'active' : 'waiting';
  const displayedSet = workoutContext?.currentSet || currentSet;
  const displayedTotalSets = workoutContext?.totalSets || targetSets;
  const backPath = workoutContext?.detailsRoute || '/exercises/leg-raise';
  return (
    <div className="camera-session camera-session--leg-raise">
      <header className="camera-session__header"><button className="camera-session__back" type="button" onClick={() => navigate(backPath)}><i className="fa-solid fa-arrow-left" />Back</button><div className="camera-session__title"><span className="camera-session__exercise-icon"><i className="fa-solid fa-person" /></span><span><h1>Leg Raise</h1><small>{workoutContext ? `${workoutContext.planName} · Week ${workoutContext.week} · Round ${workoutContext.currentRound} · ` : ''}Set {displayedSet} of {displayedTotalSets} · {targetReps} reps</small></span></div><span className={`camera-session__status camera-session__status--${tone}`}><span />{status}</span><div className="camera-session__actions">{started && <button className={`camera-session__voice${muted ? ' camera-session__voice--muted' : ''}`} type="button" onClick={() => setMuted((old) => { mutedRef.current = !old; if (!old) window.speechSynthesis.cancel(); return !old; })}><i className={`fa-solid ${muted ? 'fa-volume-xmark' : 'fa-volume-high'}`} /><span>{muted ? 'Muted' : 'Voice on'}</span></button>}<div className="camera-session__timer"><i className="fa-regular fa-clock" />{formatTime(sessionTime)}</div></div></header>
      <main className="camera-session__workspace" style={styles.workspace}>
        <aside className="camera-session__progress" style={styles.panel}>
          <Metric label="SET" value={displayedSet} detail={`OF ${displayedTotalSets}`} primary />
          <div className="camera-session__metric camera-session__metric--primary" style={styles.card}><p style={styles.label}>VALID REPS</p><p style={styles.big}>{setCompletedReps}</p><p style={styles.small}>OF {targetReps}</p><div className="camera-session__progress-track"><span style={{ width: `${Math.min(setCompletedReps / targetReps * 100, 100)}%` }} /></div></div>
          <Metric label="TOTAL VALID" value={totalCompletedReps} /><Metric label={resting ? 'REST LEFT' : 'REST BETWEEN SETS'} value={formatTime(resting ? restCountdown : restSeconds)} /><Metric label="FORM ACCURACY" value={started ? `${sessionAccuracy}%` : '—'} />
        </aside>
        <section className="camera-session__camera" style={styles.camera}>
          <video ref={videoRef} style={styles.media} playsInline muted /><canvas ref={canvasRef} style={{ ...styles.media, position: 'absolute', inset: 0 }} />
          <CameraInactivityOverlay
            isWarningVisible={inactivityWarningVisible}
            isCancelled={inactivityCancelled}
            remainingSeconds={inactivityRemainingSeconds}
            isWorkoutPlan={Boolean(workoutContext)}
            onBack={() => navigate(workoutContext?.detailsRoute || '/exercises', { replace: true })}
          />
          {resting && <div className="camera-session__rest-overlay"><span className="camera-session__rest-check"><i className="fa-solid fa-check" /></span><p className="camera-session__rest-eyebrow">Set {currentSet} Complete</p><h2>Rest</h2><time>{formatTime(restCountdown)}</time><p>Next: Set {currentSet + 1} of {targetSets}</p></div>}
          {complete && <div className="camera-session__complete-overlay"><span><i className="fa-solid fa-trophy" /></span><h2>{workoutContext ? 'Set Complete' : 'Workout Complete'}</h2><p>Preparing your session summary…</p></div>}
          {started && !resting && !complete && position !== 'ready' && <div className="camera-session__readiness"><i className="fa-solid fa-person-circle-question" /><span>{feedback}</span></div>}
          {started && position === 'ready' && <div className="camera-session__tracking-badge"><span />Body tracking active</div>}
          {!started && <div className="camera-session__prestart" style={styles.prestart}>{loading ? <div><div style={styles.spinner} /><p>Loading Pose Detection...</p></div> : <div className="camera-session__start-card" style={styles.startCard}><span className="camera-session__start-icon"><i className="fa-solid fa-person" /></span><p className="camera-session__start-eyebrow">PoseFit Live Coaching</p><h2>Ready for Leg Raises?</h2><div className="camera-session__plan"><span><strong>{targetReps}</strong> reps</span><span><strong>{workoutContext ? `Set ${displayedSet}/${displayedTotalSets}` : targetSets}</strong> {workoutContext ? `round ${workoutContext.currentRound}` : 'sets'}</span><span><strong>{restSeconds}s</strong> rest</span></div><div className="camera-session__position-guide"><Guide icon="fa-camera" text="Lie sideways to the camera" /><Guide icon="fa-person" text="Keep your full body visible" /><Guide icon="fa-shoe-prints" text="Start with both legs straight and low" /></div>{cameraError && <p className="camera-session__camera-error">{cameraError}</p>}<button className="camera-session__start-button" type="button" onClick={startCamera}><i className="fa-solid fa-video" />Start Session</button></div>}</div>}
        </section>
        <aside className="camera-session__insights" style={styles.panel}><div className="camera-session__insight-card" style={styles.card}><p style={styles.label}>LIVE FEEDBACK</p>{started ? <div className="camera-session__feedback" style={{ ...styles.feedback, color: color.hex, borderColor: color.hex, background: `${color.hex}12` }}><strong>{feedback}</strong><small>{feedbackDetail}</small></div> : <p style={styles.inactive}>Start session to see feedback</p>}</div><div className="camera-session__insight-card" style={styles.card}><p style={styles.label}>FORM ANGLES</p><Row label="Visible side" value={activeSide} /><Row label="Hip flexion" value={position === 'ready' ? `${hipFlexion}°` : '—'} /><Row label="Knee" value={position === 'ready' ? `${kneeAngle}°` : '—'} /></div><div className="camera-session__insight-card camera-session__legend" style={styles.card}><p style={styles.label}>MOVEMENT</p><Row label="Phase" value={phase.replace('_', ' ')} /><Row label="Raised target" value={`${LEG_RAISE_HIP.effectiveMin}°–${LEG_RAISE_HIP.effectiveMax}°`} /><Row label="Knee extension" value={`≥ ${LEG_RAISE_KNEE.extensionMin}°`} /></div>{started && <button className="camera-session__end-button" type="button" onClick={() => finish('ended')}><i className="fa-solid fa-stop" />End Session</button>}</aside>
      </main>
    </div>
  );
}

function Metric({ label, value, detail, primary }) { return <div className={`camera-session__metric${primary ? ' camera-session__metric--primary' : ''}`} style={styles.card}><p style={styles.label}>{label}</p><p style={styles.big}>{value}</p>{detail && <p style={styles.small}>{detail}</p>}</div>; }
function Guide({ icon, text }) { return <div className="camera-session__guide-row"><i className={`fa-solid ${icon}`} /><p>{text}</p></div>; }
function Row({ label, value }) { return <div style={styles.row}><span>{label}</span><strong>{value}</strong></div>; }

const styles = {
  workspace: { display: 'grid', gridTemplateColumns: 'minmax(180px,.95fr) minmax(0,3.2fr) minmax(220px,1.05fr)', gap: 16, padding: '14px 18px', alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'hidden' },
  panel: { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, height: '100%', overflow: 'hidden' },
  card: { background: '#fff', border: '1px solid #e6e8e6', borderRadius: 16, padding: 12, textAlign: 'center' },
  label: { margin: '0 0 4px', color: '#9299a5', fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  big: { margin: 0, color: '#f25717', fontSize: '1.7rem', fontWeight: 800 },
  small: { margin: '3px 0 0', color: '#667085', fontSize: 11, fontWeight: 600 },
  camera: { position: 'relative', minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden', background: '#000', borderRadius: 16 },
  media: { width: '100%', height: '100%', display: 'block', objectFit: 'cover' },
  prestart: { position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  startCard: { maxWidth: 370, padding: 32 },
  spinner: { width: 46, height: 46, margin: '0 auto 15px', border: '4px solid #e6e8e6', borderTopColor: '#f25717', borderRadius: '50%', animation: 'spin .8s linear infinite' },
  feedback: { marginTop: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid', borderRadius: 10, fontSize: 12 },
  inactive: { color: '#999', fontSize: 11, fontStyle: 'italic' },
  row: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8, color: '#667085', fontSize: 11, textTransform: 'capitalize' },
};
