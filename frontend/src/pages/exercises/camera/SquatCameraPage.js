import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import {
    CLASS_COLORS,
    analyzeSquatBilateral,
    checkBodyReadiness,
    classifyKneeAngle,
    determineIncorrectReason,
    getVoiceCue,
} from '../../../exercises/squat';
import { formatTime } from '../../../utils/formatters';
import { speak } from '../../../utils/speechFeedback';
import { createRepHold, holdFeedback, HOLD_FAILURE_REASON } from '../../../exercises/repHold';
import { advanceSquatHold, squatAttemptReasons } from '../../../exercises/squat/squatHoldValidation';
import {
    buildReasonCounts,
    createSessionResult,
    saveLatestSessionResult,
} from '../../../services/summaryService';
import './SquatCameraPage.css';
import { resolveWorkoutContext } from '../../../services/workoutDaySessionService';
import CameraInactivityOverlay from '../../../components/CameraInactivityOverlay';
import useCameraInactivity from '../../../hooks/useCameraInactivity';
import ExerciseReadinessButton, { describeExerciseStartError } from '../../../components/ExerciseReadinessCheck';
import { sendPoseFrameSafely } from '../../../utils/poseFrame';

function readStoredWorkoutConfig() {
    try {
        return JSON.parse(sessionStorage.getItem('posefitSquatWorkoutConfig')) || {};
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

// Main Component
export default function SquatCameraPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Workout settings flow from SquatPage navigation state, URL params, or its session backup.
    const storedWorkoutConfig = readStoredWorkoutConfig();
    const navigationWorkoutConfig = location.state?.workoutConfig || {};
    const workoutContext = resolveWorkoutContext(location.state?.workoutContext, searchParams.get('workoutSession'), 'squat');
    const totalSets = workoutContext ? 1 : firstPositiveInteger(
        navigationWorkoutConfig.sets,
        searchParams.get('sets'),
        storedWorkoutConfig.sets
    );
    const totalReps = firstPositiveInteger(
        workoutContext?.target?.reps,
        navigationWorkoutConfig.reps,
        searchParams.get('reps'),
        storedWorkoutConfig.reps
    );
    const restTimeSetting = firstPositiveInteger(
        workoutContext?.target?.rest,
        navigationWorkoutConfig.rest,
        searchParams.get('rest'),
        storedWorkoutConfig.rest
    );
    const hasWorkoutConfig = Boolean(totalSets && totalReps && restTimeSetting);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const cameraRef = useRef(null);

    const [isStarted, setIsStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [repCount, setRepCount] = useState(0);
    const [voiceMuted, setVoiceMuted] = useState(false);
    const voiceMutedRef = useRef(false);
    const [sqClassification, setSqClassification] = useState('bad');
    const [feedback, setFeedback] = useState('');
    const [feedbackDetail, setFeedbackDetail] = useState('');
    const [phase, setPhase] = useState('standing');
    const [leftAngle, setLeftAngle] = useState(0);
    const [rightAngle, setRightAngle] = useState(0);
    const [isBilateralMode, setIsBilateralMode] = useState(true);
    const [activeSide, setActiveSide] = useState('both');
    const [sessionTime, setSessionTime] = useState(0);
    const [cameraError, setCameraError] = useState('');
    const [bodyReadiness, setBodyReadiness] = useState('no_person'); // 'no_person' | 'too_close' | 'ready'
    const bodyReadinessRef = useRef('no_person');
    const wasReadyAnnouncedRef = useRef(false);

    const repCountRef = useRef(0);
    const phaseRef = useRef('standing');
    // Track whether this rep completed a continuous valid bottom hold.
    const repWasGoodRef = useRef(false);
    const holdRef = useRef(createRepHold());
    const repAnglesRef = useRef([]);   // avg angles logged per rep for chart
    const timerRef = useRef(null);
    const restTimerRef = useRef(null);
    const sessionStartRef = useRef(null);
    // Guard: prevents onResults firing after session ends (fixes null canvas crash)
    const isMountedRef = useRef(false);

    // Incorrect Rep Tracking
    const badRepsRef = useRef([]);          // { angle, reasons[], classification }
    const deepestAngleRef = useRef(180);    // deepest angle in current squat cycle
    const hadAttemptRef = useRef(false);    // did the user descend enough to count?
    const additionalIssuesRef = useRef([]); // Reporting only; never changes rep validity.
    const formIssuesRef = useRef({});       // form issues detected during cycle

    // Workout Set/Rep/Rest Tracking
    const [currentSet, setCurrentSet] = useState(1);
    const [repsInSet, setRepsInSet] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [restCountdown, setRestCountdown] = useState(0);
    const [workoutComplete, setWorkoutComplete] = useState(false);
    const currentSetRef = useRef(1);
    const repsInSetRef = useRef(0);
    const isRestingRef = useRef(false);
    const setResultsRef = useRef([]);
    const setStartTimeRef = useRef(null);
    const badRepsInSetRef = useRef(0);
    const poseProcessingPausedRef = useRef(true);
    const completionTimeoutRef = useRef(null);
    const lastLiveUpdateRef = useRef(0);
    const liveSnapshotRef = useRef({
        classification: 'bad',
        feedback: '',
        feedbackDetail: '',
        phase: 'standing',
        leftAngle: 0,
        rightAngle: 0,
        isBilateralMode: true,
        activeSide: 'both',
    });

    useEffect(() => {
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    const clearOverlayCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    const stopResources = useCallback(() => {
        isMountedRef.current = false;
        isRestingRef.current = false;
        poseProcessingPausedRef.current = true;
        clearInterval(timerRef.current);
        clearInterval(restTimerRef.current);
        clearTimeout(completionTimeoutRef.current);
        restTimerRef.current = null;
        completionTimeoutRef.current = null;
        if (cameraRef.current) {
            const camera = cameraRef.current;
            cameraRef.current = null;
            try { camera.stop(); } catch { /* Camera is already stopped. */ }
        }
        if (poseRef.current) {
            const pose = poseRef.current;
            poseRef.current = null;
            try { Promise.resolve(pose.close()).catch(() => {}); } catch { /* Pose is already closed. */ }
        }
        window.speechSynthesis.cancel();
        clearOverlayCanvas();
    }, [clearOverlayCanvas]);

    const resetSquatCycleTracking = useCallback(() => {
        if (hadAttemptRef.current) {
            const reasons = determineIncorrectReason(deepestAngleRef.current, formIssuesRef.current)
                .filter((reason) => reason !== 'Poor form detected');
            additionalIssuesRef.current.push({ reasons: [...reasons, 'Squat was not completed by returning to standing'] });
        }
        phaseRef.current = 'standing';
        holdRef.current = createRepHold();
        repWasGoodRef.current = false;
        deepestAngleRef.current = 180;
        hadAttemptRef.current = false;
        formIssuesRef.current = {};
    }, []);

    const syncLiveState = useCallback((analysis) => {
        const nextSnapshot = {
            classification: analysis.overallClass,
            feedback: analysis.feedback,
            feedbackDetail: analysis.feedbackDetail,
            phase: analysis.phase,
            leftAngle: Math.round(analysis.leftAngle),
            rightAngle: Math.round(analysis.rightAngle),
            isBilateralMode: analysis.isBilateral,
            activeSide: analysis.activeSide,
        };
        const prevSnapshot = liveSnapshotRef.current;
        const now = performance.now();
        const snapshotChanged =
            prevSnapshot.classification !== nextSnapshot.classification ||
            prevSnapshot.feedback !== nextSnapshot.feedback ||
            prevSnapshot.feedbackDetail !== nextSnapshot.feedbackDetail ||
            prevSnapshot.phase !== nextSnapshot.phase ||
            prevSnapshot.leftAngle !== nextSnapshot.leftAngle ||
            prevSnapshot.rightAngle !== nextSnapshot.rightAngle ||
            prevSnapshot.isBilateralMode !== nextSnapshot.isBilateralMode ||
            prevSnapshot.activeSide !== nextSnapshot.activeSide;

        liveSnapshotRef.current = nextSnapshot;
        if (!snapshotChanged && now - lastLiveUpdateRef.current < 120) return;
        lastLiveUpdateRef.current = now;

        if (prevSnapshot.classification !== nextSnapshot.classification) setSqClassification(nextSnapshot.classification);
        if (prevSnapshot.feedback !== nextSnapshot.feedback) setFeedback(nextSnapshot.feedback);
        if (prevSnapshot.feedbackDetail !== nextSnapshot.feedbackDetail) setFeedbackDetail(nextSnapshot.feedbackDetail);
        if (prevSnapshot.phase !== nextSnapshot.phase) setPhase(nextSnapshot.phase);
        if (prevSnapshot.leftAngle !== nextSnapshot.leftAngle) setLeftAngle(nextSnapshot.leftAngle);
        if (prevSnapshot.rightAngle !== nextSnapshot.rightAngle) setRightAngle(nextSnapshot.rightAngle);
        if (prevSnapshot.isBilateralMode !== nextSnapshot.isBilateralMode) setIsBilateralMode(nextSnapshot.isBilateralMode);
        if (prevSnapshot.activeSide !== nextSnapshot.activeSide) setActiveSide(nextSnapshot.activeSide);
    }, []);
    useEffect(() => {
        const resetHiddenHold = () => { if (document.hidden) resetSquatCycleTracking(); };
        document.addEventListener('visibilitychange', resetHiddenHold);
        return () => document.removeEventListener('visibilitychange', resetHiddenHold);
    }, [resetSquatCycleTracking]);
    // Timer
    useEffect(() => {
        if (isStarted) {
            sessionStartRef.current = Date.now();
            setStartTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isStarted]);

    // Rest Countdown Timer
    useEffect(() => {
        if (!isResting) return;
        poseProcessingPausedRef.current = true;
        restTimerRef.current = setInterval(() => {
            setRestCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(restTimerRef.current);
                    restTimerRef.current = null;
                    poseProcessingPausedRef.current = false;
                    resetSquatCycleTracking();
                    clearOverlayCanvas();
                    isRestingRef.current = false;
                    setIsResting(false);
                    currentSetRef.current += 1;
                    setCurrentSet(currentSetRef.current);
                    repsInSetRef.current = 0;
                    setRepsInSet(0);
                    badRepsInSetRef.current = 0;
                    setStartTimeRef.current = Date.now();
                    if (!voiceMutedRef.current) {
                        speak(`Rest over! Starting set ${currentSetRef.current}.`, true);
                    }
                    return 0;
                }
                if (prev === 4 && !voiceMutedRef.current) {
                    speak('Get ready! 3, 2, 1.', true);
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            clearInterval(restTimerRef.current);
            restTimerRef.current = null;
        };
    }, [isResting, clearOverlayCanvas, resetSquatCycleTracking]);

    const finishSession = useCallback((status = 'ended') => {
        stopResources();

        const finalDuration = sessionStartRef.current
            ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
            : sessionTime;
        const reportAttempts = [...badRepsRef.current, ...additionalIssuesRef.current];
        if (hadAttemptRef.current) {
            const reasons = determineIncorrectReason(deepestAngleRef.current, formIssuesRef.current)
                .filter((reason) => reason !== 'Poor form detected');
            reportAttempts.push({ reasons: [...reasons, 'Squat was not completed by returning to standing'] });
        }
        const reasonCounts = buildReasonCounts(reportAttempts);
        const correctReps = repCountRef.current;
        const incorrectReps = badRepsRef.current.length;
        const completedSets = setResultsRef.current.filter(
            (set) => set.goodReps >= totalReps
        ).length;

        const sessionResult = saveLatestSessionResult(createSessionResult({
            exercise: { id: 'squat', name: 'Squat' },
            metricType: 'reps',
            status,
            duration: finalDuration,
            setsCompleted: completedSets,
            totalReps: correctReps + incorrectReps,
            correctReps,
            incorrectReps,
            formIssues: reasonCounts.map(([type, count]) => ({ type, count })),
            setResults: [...setResultsRef.current],
            config: {
                repsPerSet: totalReps,
                totalSets,
                restSeconds: restTimeSetting,
            },
            analysis: {
                repAngles: [...repAnglesRef.current],
                badReps: [...badRepsRef.current],
            },
            workoutContext,
        }));

        navigate('/session-summary', {
            replace: true,
            state: { sessionResult },
        });
    }, [navigate, restTimeSetting, sessionTime, stopResources, totalReps, totalSets, workoutContext]);

    const cancelForInactivity = useCallback(() => {
        stopResources();
        setIsResting(false);
        setIsStarted(false);
    }, [stopResources]);

    const {
        isWarningVisible: inactivityWarningVisible,
        isCancelled: inactivityCancelled,
        remainingSeconds: inactivityRemainingSeconds,
        reportPersonDetection,
    } = useCameraInactivity({
        enabled: isStarted && !isResting && !workoutComplete,
        onTimeout: cancelForInactivity,
        videoRef,
    });

    // Complete Current Set
    const completeCurrentSet = useCallback(() => {
        if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
        }
        const setDuration = setStartTimeRef.current
            ? Math.floor((Date.now() - setStartTimeRef.current) / 1000)
            : 0;
        setResultsRef.current.push({
            setNum: currentSetRef.current,
            goodReps: repsInSetRef.current,
            badReps: badRepsInSetRef.current,
            duration: setDuration,
        });

        if (currentSetRef.current >= totalSets) {
            poseProcessingPausedRef.current = true;
            clearOverlayCanvas();
            setWorkoutComplete(true);
            if (!voiceMutedRef.current) {
                speak('Workout complete! Great job!', true);
            }
            completionTimeoutRef.current = setTimeout(() => {
                completionTimeoutRef.current = null;
                finishSession('completed');
            }, 2500);
        } else {
            poseProcessingPausedRef.current = true;
            clearOverlayCanvas();
            wasReadyAnnouncedRef.current = false;
            if (!voiceMutedRef.current) {
                speak(`Set ${currentSetRef.current} complete! Rest for ${restTimeSetting} seconds.`, true);
            }
            isRestingRef.current = true;
            setIsResting(true);
            setRestCountdown(restTimeSetting);
        }
    }, [totalSets, restTimeSetting, clearOverlayCanvas, finishSession]);
    // Rep Counter (Kumaresan et al. 2026 logic)
    // Tracks both GOOD reps (counted live) and INCORRECT reps (stored with reasons).    // A rep cycle: standing -> descending -> bottom -> descending -> standing
    const processRep = useCallback((analysis) => {
        if (!analysis) return;
        // Pause rep counting during rest periods and after workout completion
        if (isRestingRef.current || poseProcessingPausedRef.current) return;

        const prevPhase = phaseRef.current;
        const newPhase = analysis.phase;

        // Reset flags at the very start of a new descent from standing
        if (prevPhase === 'standing' && (newPhase === 'descending' || newPhase === 'bottom')) {
            repWasGoodRef.current = false;
            holdRef.current = createRepHold();
            deepestAngleRef.current = 180;
            hadAttemptRef.current = false;
            formIssuesRef.current = {};
        }


        // Track if this is a squat attempt (user went at least to descending)
        if (newPhase === 'descending' || newPhase === 'bottom') {
            hadAttemptRef.current = true;
        }

        // Track deepest angle reached in this squat cycle
        if (analysis.avgAngle < deepestAngleRef.current) {
            deepestAngleRef.current = analysis.avgAngle;
        }

        holdRef.current = advanceSquatHold(holdRef.current, analysis);
        if (holdRef.current.qualified) repWasGoodRef.current = true;
        if (analysis.phase === 'bottom' && analysis.overallClass === 'good' && holdRef.current.startedAt !== null) {
            analysis.feedbackDetail = holdFeedback(holdRef.current);
        }

        // Detect form issues continuously during the squat
        if (newPhase === 'bottom' || newPhase === 'descending') {
            // Uneven legs: >10° difference between left and right knee angles (only in bilateral mode)
            if (analysis.isBilateral && Math.abs(analysis.leftAngle - analysis.rightAngle) > 10) {
                formIssuesRef.current.unevenLegs = true;
            }
        }

        // Count rep when the user reaches 'standing' from any other phase
        const reachedStanding = newPhase === 'standing' && prevPhase !== 'standing';
        if (reachedStanding && hadAttemptRef.current) {
            if (repWasGoodRef.current) {
                const detectedReasons = determineIncorrectReason(deepestAngleRef.current, formIssuesRef.current)
                    .filter((reason) => reason !== 'Poor form detected');
                if (detectedReasons.length) additionalIssuesRef.current.push({ reasons: detectedReasons });
                // ✓ GOOD REP — count it
                repCountRef.current += 1;
                setRepCount(repCountRef.current);
                repsInSetRef.current += 1;
                setRepsInSet(repsInSetRef.current);
                repAnglesRef.current.push(Math.round(deepestAngleRef.current));
                // Voice: announce rep counted
                if (!voiceMutedRef.current) {
                    speak(`Rep ${repsInSetRef.current} of ${totalReps}. Good job!`, true);
                }

                // Check if set is complete
                if (repsInSetRef.current >= totalReps) {
                    hadAttemptRef.current = false;
                    completeCurrentSet();
                }
            } else {
                // ✗ INCORRECT REP — store with reasons
                const reasons = squatAttemptReasons(holdRef.current, determineIncorrectReason(
                    deepestAngleRef.current,
                    formIssuesRef.current
                ));
                if (reasons[0] === HOLD_FAILURE_REASON) {
                    analysis.feedback = HOLD_FAILURE_REASON;
                    analysis.feedbackDetail = 'Maintain the bottom position continuously before standing.';
                }
                if (reasons[0] === HOLD_FAILURE_REASON && !voiceMutedRef.current) speak(HOLD_FAILURE_REASON, true);
                badRepsRef.current.push({
                    angle: Math.round(deepestAngleRef.current),
                    reasons,
                    classification: deepestAngleRef.current >= 80 && deepestAngleRef.current <= 100 ? 'adjust' : 'bad',
                    set: currentSetRef.current,
                });
                badRepsInSetRef.current += 1;
            }

            // Reset cycle tracking for next rep
            holdRef.current = createRepHold();
            repWasGoodRef.current = false;
            deepestAngleRef.current = 180;
            hadAttemptRef.current = false;
            formIssuesRef.current = {};
        }

        phaseRef.current = newPhase;
        setPhase(newPhase);
    }, [totalReps, completeCurrentSet]);

    // Draw Knee Angle Label on Canvas
    const drawKneeLabel = (ctx, knee, angle, classification, canvasW, canvasH) => {
        const x = knee.x * canvasW;
        const y = knee.y * canvasH;
        const color = CLASS_COLORS[classification].hex;

        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();

        ctx.fillStyle = color;
        ctx.font = 'bold 14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(angle)}°`, x, y);
    };

    // MediaPipe Results Handler
    const onResults = useCallback((results) => {
        // Guard: if session was stopped, ignore any stale frames still in flight
        if (!isMountedRef.current) return;
        if (poseProcessingPausedRef.current) {
            clearOverlayCanvas();
            return;
        }
        reportPersonDetection(Boolean(results.poseLandmarks?.length >= 33));
        const canvas = canvasRef.current;
        if (!canvas || !results?.image) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = results.image.width;
        canvas.height = results.image.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        // Body Readiness Detection
        const readiness = checkBodyReadiness(results.poseLandmarks);
        if (bodyReadinessRef.current !== readiness) {
            bodyReadinessRef.current = readiness;
            setBodyReadiness(readiness);
        }

        if (readiness !== 'ready') resetSquatCycleTracking();
        if (readiness === 'no_person') {
            if (!voiceMutedRef.current) {
                speak('No person detected. Please step into the frame.');
            }
            return;
        }

        if (readiness === 'too_close') {
            if (!voiceMutedRef.current) {
                speak('Please step back so your full body is visible.');
            }
            wasReadyAnnouncedRef.current = false;
            // Still draw whatever landmarks are visible, but don't analyze squat
            if (results.poseLandmarks) {
                drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
                    color: '#64748b', lineWidth: 2,
                });
                drawLandmarks(ctx, results.poseLandmarks, {
                    color: '#64748b', lineWidth: 1, radius: 3,
                });
            }
            return;
        }

        // readiness === 'ready'
        if (!wasReadyAnnouncedRef.current && !voiceMutedRef.current) {
            speak("You're in position! You can start squatting now.", true);
            wasReadyAnnouncedRef.current = true;
        }

        const analysis = analyzeSquatBilateral(results.poseLandmarks);

        // Voice Feedback (skip during rest)
        if (analysis && !voiceMutedRef.current && !poseProcessingPausedRef.current) {
            const cue = getVoiceCue(analysis);
            if (cue) speak(cue);
        }
        if (!analysis) { resetSquatCycleTracking(); return; }

        const skelColor = CLASS_COLORS[analysis.overallClass].skeleton;

        // Draw full skeleton in classification color
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: skelColor,
            lineWidth: 3,
        });
        drawLandmarks(ctx, results.poseLandmarks, {
            color: skelColor,
            lineWidth: 1,
            radius: 4,
        });

        // Highlight all 6 key bilateral joints (hips, knees, ankles) with bigger dots
        const { leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle } = analysis.landmarks;
        [leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle].forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 8, 0, Math.PI * 2);
            ctx.fillStyle = skelColor;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Draw knee angle labels
        if (analysis.isBilateral) {
            drawKneeLabel(ctx, leftKnee, analysis.leftAngle, analysis.leftClass, canvas.width, canvas.height);
            drawKneeLabel(ctx, rightKnee, analysis.rightAngle, analysis.rightClass, canvas.width, canvas.height);
        } else {
            if (analysis.activeSide === 'left') {
                drawKneeLabel(ctx, leftKnee, analysis.leftAngle, analysis.leftClass, canvas.width, canvas.height);
            } else {
                drawKneeLabel(ctx, rightKnee, analysis.rightAngle, analysis.rightClass, canvas.width, canvas.height);
            }
        }

        processRep(analysis);
        syncLiveState(analysis);
    }, [clearOverlayCanvas, processRep, reportPersonDetection, syncLiveState, resetSquatCycleTracking]);
    // Start Camera
    const startCamera = useCallback(async () => {
        setIsLoading(true);
        setCameraError('');
        poseProcessingPausedRef.current = false;
        isMountedRef.current = true;
        resetSquatCycleTracking();
        clearOverlayCanvas();
        if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
        }
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
                onFrame: async () => sendPoseFrameSafely({
                    pose: poseRef.current,
                    video: videoRef.current,
                    isActive: () => isMountedRef.current && !poseProcessingPausedRef.current,
                    onActiveError: (frameError) => {
                        stopResources();
                        setIsStarted(false);
                        setCameraError(describeExerciseStartError(frameError));
                    },
                }),
                width: 640,
                height: 480,
            });
            cameraRef.current = camera;
            await camera.start();
            if (!isMountedRef.current || cameraRef.current !== camera) return;
            setIsLoading(false);
            setIsStarted(true);
        } catch (err) {
            stopResources();
            setIsLoading(false);
            setCameraError(describeExerciseStartError(err));
        }
    }, [clearOverlayCanvas, onResults, resetSquatCycleTracking, stopResources]);
    // Stop Session
    const stopSession = useCallback(() => {
        if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
        }
        // Save partial set results if any reps were attempted
        const currentSetAlreadySaved = setResultsRef.current.some(
            (result) => result.setNum === currentSetRef.current
        );
        if (!currentSetAlreadySaved && (repsInSetRef.current > 0 || badRepsInSetRef.current > 0)) {
            const setDuration = setStartTimeRef.current
                ? Math.floor((Date.now() - setStartTimeRef.current) / 1000)
                : 0;
            setResultsRef.current.push({
                setNum: currentSetRef.current,
                goodReps: repsInSetRef.current,
                badReps: badRepsInSetRef.current,
                duration: setDuration,
            });
        }
        finishSession('ended');
    }, [finishSession]);

    useLayoutEffect(() => () => stopResources(), [stopResources]);
    const workoutLayoutStyle = styles.cameraWrapper;
    const leftPanelStyle = styles.leftPanel;
    const rightPanelStyle = styles.rightPanel;

    if (!hasWorkoutConfig) {
        return (
            <div className="camera-session camera-session--configuration-error">
                <header className="camera-session__header">
                    <button className="camera-session__back" type="button" onClick={() => navigate('/exercises/squat')}>
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        Back to configuration
                    </button>
                    <div className="camera-session__brand">POSE<span>FIT</span></div>
                </header>
                <main className="camera-configuration-error">
                    <span className="camera-configuration-error__icon" aria-hidden="true">
                        <i className="fa-solid fa-sliders" />
                    </span>
                    <h1>Workout configuration required</h1>
                    <p>Choose your reps, sets, and rest time before starting the camera session.</p>
                    <button type="button" onClick={() => navigate('/exercises/squat')}>Configure Squat</button>
                </main>
            </div>
        );
    }

    // CAMERA SCREEN

    const currentColor = CLASS_COLORS[sqClassification];
    const sessionStatus = inactivityCancelled
        ? 'Cancelled'
        : workoutComplete
        ? 'Complete'
        : isResting
            ? 'Resting'
            : !isStarted
                ? 'Ready'
                : bodyReadiness === 'ready'
                    ? 'Active'
                    : bodyReadiness === 'too_close'
                        ? 'Reposition'
                        : 'Waiting';
    const statusTone = inactivityCancelled
        ? 'cancelled'
        : workoutComplete
        ? 'complete'
        : isResting
            ? 'resting'
            : isStarted && bodyReadiness === 'ready'
                ? 'active'
                : 'waiting';
    const displayedSet = workoutContext?.currentSet || currentSet;
    const displayedTotalSets = workoutContext?.totalSets || totalSets;
    const backPath = workoutContext?.detailsRoute || '/exercises/squat';
    const handleBack = () => {
        stopResources();
        navigate(backPath);
    };

    return (
        <div className="camera-session">
            <header className="camera-session__header">
                <button
                    className="camera-session__back"
                    type="button"
                    onClick={handleBack}
                >
                    <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                    Back
                </button>

                <div className="camera-session__title">
                    <span className="camera-session__exercise-icon" aria-hidden="true">
                        <i className="fa-solid fa-person-running" />
                    </span>
                    <span>
                        <h1>Squat</h1>
                        <small>{workoutContext ? `${workoutContext.planName} · Week ${workoutContext.week} · Round ${workoutContext.currentRound} · ` : ''}Set {displayedSet} of {displayedTotalSets} · {totalReps} reps</small>
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
                                setVoiceMuted(prev => {
                                    const next = !prev;
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

            <main className="camera-session__workspace" style={workoutLayoutStyle}>

                {/* Left Panel */}
                <aside className="camera-session__progress" style={leftPanelStyle}>
                    <div className="camera-session__metric camera-session__metric--primary" style={styles.panelCard}>
                        <p style={styles.panelLabel}>SET</p>
                        <p style={styles.panelBigValue}>{displayedSet}</p>
                        <p style={styles.panelSmallValue}>OF {displayedTotalSets}</p>
                    </div>
                    <div className="camera-session__metric camera-session__metric--primary" style={styles.panelCard}>
                        <p style={styles.panelLabel}>REPS</p>
                        <p style={styles.panelBigValue}>{repsInSet}</p>
                        <p style={styles.panelSmallValue}>OF {totalReps}</p>
                        <div className="camera-session__progress-track" aria-hidden="true">
                            <span style={{ width: `${Math.min((repsInSet / totalReps) * 100, 100)}%` }} />
                        </div>
                    </div>
                    <div className="camera-session__metric" style={styles.panelCard}>
                        <p style={styles.panelLabel}>TOTAL REPS</p>
                        <p style={styles.panelBigValue}>{repCount}</p>
                    </div>
                    <div className="camera-session__metric" style={styles.panelCard}>
                        <p style={styles.panelLabel}>{isResting ? 'REST LEFT' : 'REST BETWEEN SETS'}</p>
                        <p style={styles.panelBigValue}>{formatTime(isResting ? restCountdown : restTimeSetting)}</p>
                    </div>
                    <div className="camera-session__metric" style={styles.panelCard}>
                        <p style={styles.panelLabel}>STATUS</p>
                        <p style={{ ...styles.statusValue, color: isStarted ? currentColor.hex : '#94a3b8' }}>
                            {isStarted ? (isResting ? 'RESTING' : currentColor.label) : '—'}
                        </p>
                    </div>
                </aside>

                {/* Camera Feed */}
                <section className="camera-session__camera" style={styles.cameraBox}>
                    <video ref={videoRef} style={styles.video} playsInline muted />
                    <canvas ref={canvasRef} style={styles.canvas} />

                    <CameraInactivityOverlay
                        isWarningVisible={inactivityWarningVisible}
                        isCancelled={inactivityCancelled}
                        remainingSeconds={inactivityRemainingSeconds}
                        isWorkoutPlan={Boolean(workoutContext)}
                        onBack={() => navigate(workoutContext?.detailsRoute || '/exercises', { replace: true })}
                    />

                    {/* Rest Overlay */}
                    {isResting && (
                        <div className="camera-session__rest-overlay">
                            <span className="camera-session__rest-check" aria-hidden="true">
                                <i className="fa-solid fa-check" />
                            </span>
                            <p className="camera-session__rest-eyebrow">Set {currentSet} Complete</p>
                            <h2>Rest</h2>
                            <time>{formatTime(restCountdown)}</time>
                            <p>Next: Set {currentSet + 1} of {totalSets}</p>
                        </div>
                    )}

                    {/* Workout Complete Overlay */}
                    {workoutComplete && (
                        <div className="camera-session__complete-overlay">
                            <span aria-hidden="true"><i className="fa-solid fa-trophy" /></span>
                            <h2>{workoutContext ? 'Set Complete' : 'Workout Complete'}</h2>
                            <p>Great work. Preparing your session summary…</p>
                        </div>
                    )}

                    {/* Readiness / Feedback badge */}
                    {isStarted && bodyReadiness !== 'ready' && (
                        <div className={`camera-session__readiness camera-session__readiness--${bodyReadiness}`}>
                            <i className={`fa-solid ${bodyReadiness === 'no_person' ? 'fa-person-circle-question' : 'fa-arrows-up-down'}`} aria-hidden="true" />
                            <span>
                                {bodyReadiness === 'no_person'
                                    ? 'No person detected — step into frame'
                                    : 'Step back — keep your full body visible'}
                            </span>
                        </div>
                    )}
                    {isStarted && bodyReadiness === 'ready' && (
                        <div className="camera-session__tracking-badge">
                            <span aria-hidden="true" />
                            Body tracking active
                        </div>
                    )}

                    {!isStarted && (
                        <div className="camera-session__prestart" style={styles.preStartOverlay}>
                            {isLoading ? (
                                <div className="camera-session__loading" style={styles.loadingBox}>
                                    <div style={styles.spinner} />
                                    <p style={styles.loadingText}>Loading AI Pose Detection...</p>
                                    <p style={styles.loadingSubText}>This may take a few seconds</p>
                                </div>
                            ) : (
                                <div className="camera-session__start-card" style={styles.startOverlayBox}>
                                    <span className="camera-session__start-icon" aria-hidden="true">
                                        <i className="fa-solid fa-person-running" />
                                    </span>
                                    <p className="camera-session__start-eyebrow">PoseFit Live Coaching</p>
                                    <h2 style={styles.overlayTitle}>Ready to squat?</h2>
                                    <div className="camera-session__plan">
                                        <span><strong>{totalReps}</strong> reps</span>
                                        <span><strong>{workoutContext ? `Set ${displayedSet}/${displayedTotalSets}` : totalSets}</strong> {workoutContext ? `round ${workoutContext.currentRound}` : 'sets'}</span>
                                        <span><strong>{restTimeSetting}s</strong> rest</span>
                                    </div>
                                    <div className="camera-session__position-guide" style={styles.positionGuide}>
                                        <div className="camera-session__guide-row" style={styles.guideRow}>
                                            <i className="fa-solid fa-camera" aria-hidden="true" />
                                            <p style={styles.guideText}>Face the camera <strong>directly or sideways</strong></p>
                                        </div>
                                        <div className="camera-session__guide-row" style={styles.guideRow}>
                                            <i className="fa-solid fa-ruler-horizontal" aria-hidden="true" />
                                            <p style={styles.guideText}>Stand <strong>2 meters</strong> away</p>
                                        </div>
                                        <div className="camera-session__guide-row" style={styles.guideRow}>
                                            <i className="fa-solid fa-person" aria-hidden="true" />
                                            <p style={styles.guideText}><strong>Full body</strong> (head to toe) visible</p>
                                        </div>
                                        <div className="camera-session__guide-row" style={styles.guideRow}>
                                            <i className="fa-regular fa-lightbulb" aria-hidden="true" />
                                            <p style={styles.guideText}>Good lighting, clear background</p>
                                        </div>
                                    </div>
                                    {cameraError && <p style={styles.cameraError}>{cameraError}</p>}
                                    <ExerciseReadinessButton videoRef={videoRef} exerciseName="Squat" onReady={startCamera} />
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Right Panel */}
                <aside className="camera-session__insights" style={rightPanelStyle}>
                    <div className="camera-session__insight-card" style={styles.warningsPanel}>
                        <p style={styles.panelLabel}>LIVE FEEDBACK</p>
                        {isStarted ? (
                            <div className="camera-session__feedback" aria-live="polite" style={{
                                ...styles.feedbackBox,
                                '--feedback-color': currentColor.hex,
                                borderColor: currentColor.hex,
                                background: `${currentColor.hex}12`,
                            }}>
                                <span style={{ ...styles.feedbackIcon, color: currentColor.hex }}>
                                    {sqClassification === 'good' ? '✓' : sqClassification === 'adjust' ? '▲' : '✗'}
                                </span>
                                <p style={{ ...styles.feedbackTitle, color: currentColor.hex }}>
                                    {feedback}
                                </p>
                                <p style={styles.feedbackDetail}>
                                    {feedbackDetail}
                                </p>
                            </div>
                        ) : (
                            <p style={styles.inactiveText}>Start session to see feedback</p>
                        )}
                    </div>

                    <div className="camera-session__insight-card" style={styles.anglesPanel}>
                        <p style={styles.panelLabel}>LIVE ANGLES {isStarted && !isBilateralMode && '(PROFILE)'}</p>
                        {[
                            (isBilateralMode || activeSide === 'left') && {
                                label: 'Left knee',
                                value: isStarted ? `${leftAngle}°` : '—',
                                color: isStarted ? CLASS_COLORS[classifyKneeAngle(leftAngle)].hex : '#94a3b8',
                            },
                            (isBilateralMode || activeSide === 'right') && {
                                label: 'Right knee',
                                value: isStarted ? `${rightAngle}°` : '—',
                                color: isStarted ? CLASS_COLORS[classifyKneeAngle(rightAngle)].hex : '#94a3b8',
                            },
                            {
                                label: 'Target',
                                value: '80°–100°',
                                color: '#22c55e',
                            },
                            {
                                label: 'Phase',
                                value: phase,
                                color: '#a78bfa',
                            },
                        ].filter(Boolean).map((item, i) => (
                            <div key={i} style={styles.angleRow}>
                                <span style={styles.angleLabel}>{item.label}</span>
                                <span style={{ ...styles.angleValue, color: item.color }}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Classification legend */}
                    <div className="camera-session__insight-card camera-session__legend" style={styles.classLegend}>
                        <p style={styles.panelLabel}>CLASSIFICATION</p>
                        {[
                            { color: '#22c55e', label: 'Good', range: '80°–100°' },
                            { color: '#f59e0b', label: 'Adjust', range: '60°–79° / 101°–120°' },
                            { color: '#ef4444', label: 'Bad', range: '<60° or >120°' },
                        ].map((l, i) => (
                            <div key={i} style={styles.classRow}>
                                <span style={{ ...styles.classDot, background: l.color }} />
                                <span style={styles.classLabel}>{l.label}</span>
                                <span style={styles.classRange}>{l.range}</span>
                            </div>
                        ))}
                    </div>

                    {isStarted && (
                        <button
                            className="camera-session__end-button"
                            type="button"
                            onClick={stopSession}
                        >
                            <i className="fa-solid fa-stop" aria-hidden="true" />
                            End Session
                        </button>
                    )}
                </aside>

            </main>
        </div>
    );
}

// Styles
const styles = {
    cameraWrapper: { display: 'grid', gridTemplateColumns: 'minmax(180px, 0.95fr) minmax(0, 3.2fr) minmax(220px, 1.05fr)', gap: '16px', padding: '14px 18px', alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'hidden' },

    leftPanel: { display: 'flex', flexDirection: 'column', gap: '10px', width: 'auto', minWidth: 0, height: '100%', overflow: 'hidden' },
    panelCard: { background: '#FFFFFF', borderRadius: '16px', padding: '12px', border: '1px solid #E6E8E6', textAlign: 'center' },
    panelLabel: { color: '#999', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700 },
    panelBigValue: { color: '#F15025', fontSize: '1.7rem', fontWeight: 800, margin: 0 },
    panelSmallValue: { color: '#666', fontSize: '11px', fontWeight: 600, margin: '3px 0 0' },
    statusValue: { fontSize: '12px', fontWeight: 700, margin: 0, lineHeight: 1.25 },
    phaseValue: { color: '#F15025', fontSize: '11px', fontWeight: 700, margin: 0 },

    cameraBox: { flex: 1, position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', minHeight: 0, height: '100%', border: '1px solid #E6E8E6' },
    video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    canvas: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },

    preStartOverlay: { position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
    loadingBox: { textAlign: 'center' },
    spinner: { width: '48px', height: '48px', border: '4px solid #E6E8E6', borderTop: '4px solid #F15025', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },
    loadingText: { color: '#222', fontSize: '16px', fontWeight: 600 },
    loadingSubText: { color: '#888', fontSize: '13px' },
    startOverlayBox: { textAlign: 'center', padding: '40px', maxWidth: '360px' },
    overlayTitle: { color: '#222', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 20px' },
    positionGuide: { background: '#FFF5F2', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'left', border: '1px solid rgba(241,80,37,0.15)' },
    guideRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
    guideText: { color: '#444', fontSize: '13px', margin: 0, lineHeight: '1.5' },
    cameraError: { color: '#ef4444', fontSize: '13px', marginBottom: '16px' },
    startBtn: { width: '100%', padding: '16px 24px', background: '#F15025', color: '#FFFFFF', fontWeight: 700, fontSize: '15px', border: 'none', borderRadius: '999px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(241,80,37,0.25)', fontFamily: 'inherit', letterSpacing: '0.3px', transition: 'background 0.2s' },

    rightPanel: { display: 'flex', flexDirection: 'column', gap: '10px', width: 'auto', minWidth: 0, height: '100%', overflow: 'hidden' },
    warningsPanel: { background: '#FFFFFF', borderRadius: '16px', padding: '12px', border: '1px solid #E6E8E6' },
    feedbackBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 10px 10px', border: '2px solid', borderRadius: '10px', marginTop: '8px', gap: '4px' },
    feedbackIcon: { fontSize: '1.7rem', lineHeight: 1 },
    feedbackTitle: { fontSize: '14px', fontWeight: 800, margin: 0, textAlign: 'center', letterSpacing: '0.3px' },
    feedbackDetail: { color: '#666', fontSize: '11px', lineHeight: 1.4, textAlign: 'center', margin: 0 },
    inactiveText: { color: '#999', fontSize: '11px', fontStyle: 'italic', marginTop: '8px' },

    anglesPanel: { background: '#FFFFFF', borderRadius: '16px', padding: '12px', border: '1px solid #E6E8E6' },
    angleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
    angleLabel: { color: '#666', fontSize: '11px' },
    angleValue: { fontSize: '12px', fontWeight: 700 },

    classLegend: { background: '#FFFFFF', borderRadius: '16px', padding: '12px', border: '1px solid #E6E8E6' },
    classRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' },
    classDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
    classLabel: { color: '#222', fontSize: '10px', fontWeight: 600, minWidth: '40px' },
    classRange: { color: '#888', fontSize: '10px' },

};



