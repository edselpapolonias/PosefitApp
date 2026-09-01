import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import {
    Chart as ChartJS, CategoryScale, LinearScale,
    BarElement, LineElement, PointElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
    CLASS_COLORS,
    analyzeSquatBilateral,
    checkBodyReadiness,
    classifyKneeAngle,
    determineIncorrectReason,
    getVoiceCue,
} from '../exercises/squat';
import { formatTime } from '../utils/formatters';
import { speak } from '../utils/speechFeedback';
import {
    SUMMARY_REASON_ICONS,
    buildChartOptions,
    buildSessionSummary,
} from '../services/summaryService';
import { buildSquatCoachStats, fetchSquatCoachFeedback } from '../services/aiCoachService';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

// Main Component
export default function SquatCameraPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [viewportWidth, setViewportWidth] = useState(() =>
        (typeof window !== 'undefined' ? window.innerWidth : 1280)
    );

    // Workout Settings (from SquatPage URL params)
    const totalSets = parseInt(searchParams.get('sets')) || 3;
    const totalReps = parseInt(searchParams.get('reps')) || 12;
    const restTimeSetting = parseInt(searchParams.get('rest')) || 60;

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const cameraRef = useRef(null);

    const [isStarted, setIsStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
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
    const [aiCoachFeedback, setAiCoachFeedback] = useState(null);
    const [aiCoachLoading, setAiCoachLoading] = useState(false);
    const [aiCoachError, setAiCoachError] = useState('');
    const [bodyReadiness, setBodyReadiness] = useState('no_person'); // 'no_person' | 'too_close' | 'ready'
    const bodyReadinessRef = useRef('no_person');
    const wasReadyAnnouncedRef = useRef(false);
    const aiCoachRequestedRef = useRef(false);

    const repCountRef = useRef(0);
    const phaseRef = useRef('standing');
    // Track whether the bottom of this rep was a "good" classification
    const repWasGoodRef = useRef(false);
    const repAnglesRef = useRef([]);   // avg angles logged per rep for chart
    const timerRef = useRef(null);
    const sessionStartRef = useRef(null);
    // Guard: prevents onResults firing after session ends (fixes null canvas crash)
    const isMountedRef = useRef(false);

    // Incorrect Rep Tracking
    const badRepsRef = useRef([]);          // { angle, reasons[], classification }
    const deepestAngleRef = useRef(180);    // deepest angle in current squat cycle
    const hadAttemptRef = useRef(false);    // did the user descend enough to count?
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
        const handleResize = () => setViewportWidth(window.innerWidth);
        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => {
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const isWideLayout = viewportWidth >= 1280;
    const isMediumLayout = viewportWidth < 1280 && viewportWidth >= 1024;
    const isCompactLayout = viewportWidth < 1024;

    const clearOverlayCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    const resetSquatCycleTracking = useCallback(() => {
        phaseRef.current = 'standing';
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
    // Timer
    useEffect(() => {
        if (isStarted && !showSummary) {
            sessionStartRef.current = Date.now();
            setStartTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isStarted, showSummary]);

    // Rest Countdown Timer
    useEffect(() => {
        if (!isResting) return;
        poseProcessingPausedRef.current = true;
        const intervalId = setInterval(() => {
            setRestCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(intervalId);
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
        return () => clearInterval(intervalId);
    }, [isResting, clearOverlayCanvas, resetSquatCycleTracking]);
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
                isMountedRef.current = false;
                if (cameraRef.current) {
                    cameraRef.current.stop();
                    cameraRef.current = null;
                }
                if (poseRef.current) {
                    poseRef.current.close();
                    poseRef.current = null;
                }
                clearInterval(timerRef.current);
                window.speechSynthesis.cancel();
                setBodyReadiness('no_person');
                bodyReadinessRef.current = 'no_person';
                wasReadyAnnouncedRef.current = false;
                setIsStarted(false);
                setShowSummary(true);
                setWorkoutComplete(false);
                poseProcessingPausedRef.current = true;
                completionTimeoutRef.current = null;
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
    }, [totalSets, restTimeSetting, clearOverlayCanvas]);
    // Skip Rest
    const skipRest = useCallback(() => {
        isRestingRef.current = false;
        setIsResting(false);
        setRestCountdown(0);
        poseProcessingPausedRef.current = false;
        resetSquatCycleTracking();
        clearOverlayCanvas();
        currentSetRef.current += 1;
        setCurrentSet(currentSetRef.current);
        repsInSetRef.current = 0;
        setRepsInSet(0);
        badRepsInSetRef.current = 0;
        setStartTimeRef.current = Date.now();
        if (!voiceMutedRef.current) {
            speak(`Starting set ${currentSetRef.current}.`, true);
        }
    }, [clearOverlayCanvas, resetSquatCycleTracking]);

    // Rep Counter (Kumaresan et al. 2026 logic)
    // Tracks both GOOD reps (counted live) and INCORRECT reps (stored with reasons).    // A rep cycle: standing -> descending -> bottom -> descending -> standing
    const processRep = useCallback((analysis) => {
        if (!analysis) return;
        // Pause rep counting during rest periods and after workout completion
        if (isRestingRef.current || poseProcessingPausedRef.current) return;

        const prevPhase = phaseRef.current;
        const newPhase = analysis.phase;

        // Track if this is a squat attempt (user went at least to descending)
        if (newPhase === 'descending' || newPhase === 'bottom') {
            hadAttemptRef.current = true;
        }

        // Track deepest angle reached in this squat cycle
        if (analysis.avgAngle < deepestAngleRef.current) {
            deepestAngleRef.current = analysis.avgAngle;
        }

        // Any frame at the bottom with good form marks this rep as valid.
        if (newPhase === 'bottom' && analysis.overallClass === 'good') {
            repWasGoodRef.current = true;
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
                    completeCurrentSet();
                }
            } else {
                // ✗ INCORRECT REP — store with reasons
                const reasons = determineIncorrectReason(
                    deepestAngleRef.current,
                    formIssuesRef.current
                );
                badRepsRef.current.push({
                    angle: Math.round(deepestAngleRef.current),
                    reasons,
                    classification: deepestAngleRef.current >= 80 && deepestAngleRef.current <= 100 ? 'adjust' : 'bad',
                    set: currentSetRef.current,
                });
                badRepsInSetRef.current += 1;
            }

            // Reset cycle tracking for next rep
            repWasGoodRef.current = false;
            deepestAngleRef.current = 180;
            hadAttemptRef.current = false;
            formIssuesRef.current = {};
        }

        // Reset flags at the very start of a new descent from standing
        if (prevPhase === 'standing' && (newPhase === 'descending' || newPhase === 'bottom')) {
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
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

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
        if (!analysis) return;

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
    }, [clearOverlayCanvas, processRep, syncLiveState]);
    // Start Camera
    const startCamera = useCallback(async () => {
        setIsLoading(true);
        setCameraError('');
        poseProcessingPausedRef.current = false;
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
                onFrame: async () => {
                    if (poseRef.current && videoRef.current && isMountedRef.current && !poseProcessingPausedRef.current) {
                        await poseRef.current.send({ image: videoRef.current });
                    }
                },
                width: 640,
                height: 480,
            });
            await camera.start();
            cameraRef.current = camera;
            isMountedRef.current = true;
            setIsLoading(false);
            setIsStarted(true);
        } catch (err) {
            poseProcessingPausedRef.current = true;
            setIsLoading(false);
            setCameraError('Could not access camera. Please allow camera permission and try again.');
        }
    }, [clearOverlayCanvas, onResults, resetSquatCycleTracking]);
    // Stop Session
    const stopSession = useCallback(() => {
        if (completionTimeoutRef.current) {
            clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
        }
        // Save partial set results if any reps were attempted
        if (repsInSetRef.current > 0 || badRepsInSetRef.current > 0) {
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

        isMountedRef.current = false;
        isRestingRef.current = false;
        poseProcessingPausedRef.current = true;
        setIsResting(false);
        setRestCountdown(0);
        setWorkoutComplete(false);
        clearOverlayCanvas();
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }
        if (poseRef.current) {
            poseRef.current.close();
            poseRef.current = null;
        }
        clearInterval(timerRef.current);
        window.speechSynthesis.cancel();
        setBodyReadiness('no_person');
        bodyReadinessRef.current = 'no_person';
        wasReadyAnnouncedRef.current = false;
        setIsStarted(false);
        setShowSummary(true);
    }, [clearOverlayCanvas]);

    useEffect(() => {
        if (!showSummary || aiCoachRequestedRef.current) return;

        aiCoachRequestedRef.current = true;
        let isActive = true;

        const summaryData = buildSessionSummary({
            goodAngles: repAnglesRef.current,
            badReps: badRepsRef.current,
            repCount: repCountRef.current,
            sessionTime,
            setResults: setResultsRef.current,
        });

        const stats = buildSquatCoachStats({
            totalGood: summaryData.totalGood,
            totalBad: summaryData.totalBad,
            totalAttempts: summaryData.totalAttempts,
            accuracy: summaryData.accuracy,
            sessionDuration: sessionTime,
            setResults: setResultsRef.current,
            reasonCounts: summaryData.reasonCounts,
            repAngles: repAnglesRef.current,
            totalSets,
            totalRepsPerSet: totalReps,
            restTimeSetting,
        });

        setAiCoachLoading(true);
        setAiCoachError('');
        setAiCoachFeedback(null);

        fetchSquatCoachFeedback(stats)
            .then((feedback) => {
                if (!isActive) return;
                if (feedback) {
                    setAiCoachFeedback(feedback);
                } else {
                    setAiCoachError('AI feedback is currently unavailable. Your workout statistics are still available for review.');
                }
            })
            .catch((error) => {
                if (!isActive) return;
                setAiCoachError(
                    error?.response?.data?.error ||
                    'AI feedback is currently unavailable. Your workout statistics are still available for review.'
                );
            })
            .finally(() => {
                if (!isActive) return;
                setAiCoachLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [showSummary, sessionTime, totalSets, totalReps, restTimeSetting]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            poseProcessingPausedRef.current = true;
            if (completionTimeoutRef.current) {
                clearTimeout(completionTimeoutRef.current);
                completionTimeoutRef.current = null;
            }
            if (cameraRef.current) {
                cameraRef.current.stop();
                cameraRef.current = null;
            }
            if (poseRef.current) {
                poseRef.current.close();
                poseRef.current = null;
            }
            clearInterval(timerRef.current);
        };
    }, []);
    const workoutLayoutStyle = {
        ...styles.cameraWrapper,
        gridTemplateColumns: isCompactLayout
            ? 'minmax(140px, 0.8fr) minmax(0, 2.8fr) minmax(170px, 0.9fr)'
            : isWideLayout
                ? 'minmax(180px, 0.95fr) minmax(0, 3.2fr) minmax(220px, 1.05fr)'
                : isMediumLayout
                    ? 'minmax(160px, 0.9fr) minmax(0, 3fr) minmax(200px, 1fr)'
                    : 'minmax(140px, 0.8fr) minmax(0, 2.8fr) minmax(170px, 0.9fr)',
        padding: isCompactLayout ? '10px 14px' : '14px 18px',
        gap: isCompactLayout ? '10px' : '16px',
    };
    const summaryLayoutStyle = {
        ...styles.summaryWrapper,
        padding: isCompactLayout ? '16px 16px 12px' : '20px 20px 16px',
    };
    const leftPanelStyle = {
        ...styles.leftPanel,
        gap: isCompactLayout ? '8px' : '10px',
    };
    const rightPanelStyle = {
        ...styles.rightPanel,
        gap: isCompactLayout ? '8px' : '10px',
    };

    // SUMMARY SCREEN

    if (showSummary) {
        const sessionSummary = buildSessionSummary({
            goodAngles: repAnglesRef.current,
            badReps: badRepsRef.current,
            repCount: repCountRef.current,
            sessionTime,
            setResults: setResultsRef.current,
        });
        const {
            totalGood,
            totalBad,
            totalAttempts,
            accuracy,
            allReps,
            reasonCounts,
            angleChartData,
            repChartData,
        } = sessionSummary;
        const sortedReasons = reasonCounts;

        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <button
                        style={styles.backBtn}
                        onClick={() => navigate('/exercises/squat')}
                        onMouseEnter={e => e.currentTarget.style.color = '#F15025'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888'}
                    >
                        Back to Squat
                    </button>
                    <h1 style={styles.logo}>PoseFit</h1>
                    <div style={{ width: 120 }} />
                </div>
                <div style={summaryLayoutStyle}>
                    <h2 style={styles.summaryTitle}>Session Summary 🎉</h2>
                    <p style={styles.summarySubtitle}>Detailed breakdown of your squat performance</p>

                    {/* Stat Cards */}
                    <div style={styles.statCards}>
                        {[
                            { label: 'Valid Reps', value: totalGood, color: '#22c55e' },
                            { label: 'Incorrect Reps', value: totalBad, color: '#ef4444' },
                            { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 70 ? '#22c55e' : accuracy >= 40 ? '#f59e0b' : '#ef4444' },
                            { label: 'Duration', value: formatTime(sessionTime), color: '#a78bfa' },
                        ].map((s, i) => (
                            <div key={i} style={styles.summaryStatCard}>
                                <span style={{ ...styles.summaryStatValue, color: s.color }}>{s.value}</span>
                                <span style={styles.summaryStatLabel}>{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Accuracy Progress Bar */}
                    {totalAttempts > 0 && (
                        <div style={styles.accuracyBarWrapper}>
                            <div style={styles.accuracyBarLabels}>
                                <span style={{ color: '#666', fontSize: '12px' }}>Accuracy</span>
                                <span style={{ color: accuracy >= 70 ? '#22c55e' : accuracy >= 40 ? '#f59e0b' : '#ef4444', fontSize: '14px', fontWeight: 700 }}>{accuracy}%</span>
                            </div>
                            <div style={styles.accuracyBarTrack}>
                                <div style={{
                                    ...styles.accuracyBarFill,
                                    width: `${accuracy}%`,
                                    background: accuracy >= 70
                                        ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                        : accuracy >= 40
                                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                            : 'linear-gradient(90deg, #ef4444, #f87171)',
                                }} />
                            </div>
                            <div style={styles.accuracyBarLabels}>
                                <span style={{ color: '#22c55e', fontSize: '11px' }}>{totalGood} valid</span>
                                <span style={{ color: '#888', fontSize: '11px' }}>{totalAttempts} total attempts</span>
                                <span style={{ color: '#ef4444', fontSize: '11px' }}>{totalBad} incorrect</span>
                            </div>
                        </div>
                    )}

                    {/* Per-Set Breakdown */}
                    {setResultsRef.current.length > 0 && (
                        <div style={styles.breakdownSection}>
                            <h3 style={styles.breakdownTitle}>Set-by-Set Breakdown</h3>
                            <p style={styles.breakdownSubtitle}>Your performance across all sets</p>
                            <div style={styles.setGrid}>
                                {setResultsRef.current.map((res, i) => {
                                    const setAttempts = res.goodReps + res.badReps;
                                    const setAcc = setAttempts > 0 ? Math.round((res.goodReps / setAttempts) * 100) : 0;
                                    return (
                                        <div key={i} style={styles.setCard}>
                                            <div style={styles.setCardHeader}>
                                                <span style={styles.setNumLabel}>Set {res.setNum}</span>
                                                <span style={{
                                                    ...styles.setAccBadge,
                                                    color: setAcc >= 70 ? '#22c55e' : setAcc >= 40 ? '#f59e0b' : '#ef4444',
                                                    background: setAcc >= 70 ? '#22c55e15' : setAcc >= 40 ? '#f59e0b15' : '#ef444415',
                                                }}>{setAcc}% Acc</span>
                                            </div>
                                            <div style={styles.setStatsRow}>
                                                <div style={styles.setStatItem}>
                                                    <span style={styles.setStatVal}>{res.goodReps}</span>
                                                    <span style={styles.setStatLbl}>Good</span>
                                                </div>
                                                <div style={styles.setStatItem}>
                                                    <span style={{ ...styles.setStatVal, color: '#ef4444' }}>{res.badReps}</span>
                                                    <span style={styles.setStatLbl}>Bad</span>
                                                </div>
                                                <div style={styles.setStatItem}>
                                                    <span style={styles.setStatVal}>{formatTime(res.duration)}</span>
                                                    <span style={styles.setStatLbl}>Time</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Classification Legend */}
                    <div style={styles.legendRow}>
                        {[
                            { color: '#22c55e', label: 'Good (80°–100°)' },
                            { color: '#f59e0b', label: 'Adjust (60°–79° / 101°–120°)' },
                            { color: '#ef4444', label: 'Bad (<60° or >120°)' },
                        ].map((l, i) => (
                            <div key={i} style={styles.legendItem}>
                                <span style={{ ...styles.legendDot, background: l.color }} />
                                <span style={styles.legendText}>{l.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Incorrect Reps Breakdown */}
                    {totalBad > 0 && (
                        <div style={styles.breakdownSection}>
                            <h3 style={styles.breakdownTitle}>❌ Incorrect Reps Breakdown</h3>
                            <p style={styles.breakdownSubtitle}>Reasons your reps were not counted as valid</p>
                            <div style={styles.reasonsList}>
                                {sortedReasons.map(([reason, count], i) => (
                                    <div key={i} style={styles.reasonCard}>
                                        <div style={styles.reasonLeft}>
                                            <span style={styles.reasonIcon}>{SUMMARY_REASON_ICONS[reason] || '⚠️'}</span>
                                            <span style={styles.reasonText}>{reason}</span>
                                        </div>
                                        <div style={styles.reasonRight}>
                                            <span style={styles.reasonCount}>{count}</span>
                                            <span style={styles.reasonCountLabel}>{count === 1 ? 'time' : 'times'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Charts */}
                    {allReps.length > 0 ? (
                        <div style={styles.chartsRow}>
                            <div style={styles.chartBox}>
                                <Line data={angleChartData} options={buildChartOptions('Knee Angle Per Rep (°)', 0, 180)} />
                            </div>
                            <div style={styles.chartBox}>
                                <Bar data={repChartData} options={buildChartOptions('Reps Overview', 0, Math.max(totalGood, totalBad) + 2)} />
                            </div>
                        </div>
                    ) : (
                        <div style={styles.noDataBox}>
                            <p style={{ color: '#64748b' }}>No reps detected. Make sure your full body is visible and perform a complete squat cycle.</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={styles.aiCoachCard}>
                        <div style={styles.aiCoachHeader}>
                            <div>
                                <p style={styles.aiCoachEyebrow}>AI Coach Feedback</p>
                                <h3 style={styles.aiCoachTitle}>Feedback</h3>
                            </div>
                            {aiCoachLoading ? (
                                <span style={styles.aiCoachStatus}>Generating...</span>
                            ) : aiCoachFeedback ? (
                                <span style={styles.aiCoachStatusReady}>Ready</span>
                            ) : aiCoachError ? (
                                <span style={styles.aiCoachStatusError}>Unavailable</span>
                            ) : null}
                        </div>

                        {aiCoachLoading ? (
                            <p style={styles.aiCoachFallback}>Generating AI Coach Feedback...</p>
                        ) : aiCoachError ? (
                            <div style={styles.aiCoachErrorBox}>
                                <p style={styles.aiCoachErrorText}>{aiCoachError}</p>
                            </div>
                        ) : aiCoachFeedback ? (
                            <div style={styles.aiCoachGrid}>
                                <div style={styles.aiCoachSection}>
                                    <h4 style={styles.aiCoachSectionTitle}>Overall Performance</h4>
                                    <p style={styles.aiCoachParagraph}>{aiCoachFeedback.overallPerformance || 'No overall performance summary was returned.'}</p>
                                </div>
                                <div style={styles.aiCoachSection}>
                                    <h4 style={styles.aiCoachSectionTitle}>Strengths</h4>
                                    <ul style={styles.aiCoachList}>
                                        {(aiCoachFeedback.strengths || []).map((item, index) => (
                                            <li key={index} style={styles.aiCoachListItem}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div style={styles.aiCoachSection}>
                                    <h4 style={styles.aiCoachSectionTitle}>Areas for Improvement</h4>
                                    <ul style={styles.aiCoachList}>
                                        {(aiCoachFeedback.areasForImprovement || []).map((item, index) => (
                                            <li key={index} style={styles.aiCoachListItem}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div style={styles.aiCoachSection}>
                                    <h4 style={styles.aiCoachSectionTitle}>Recommendations</h4>
                                    <ul style={styles.aiCoachList}>
                                        {(aiCoachFeedback.recommendations || []).map((item, index) => (
                                            <li key={index} style={styles.aiCoachListItem}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div style={styles.aiCoachSection}>
                                    <h4 style={styles.aiCoachSectionTitle}>Encouragement</h4>
                                    <p style={styles.aiCoachParagraph}>{aiCoachFeedback.encouragement || 'Keep going. Every rep is progress.'}</p>
                                </div>
                            </div>
                        ) : (
                            <p style={styles.aiCoachFallback}>AI feedback is currently unavailable. Your workout statistics are still available for review.</p>
                        )}
                    </div>

                    <div style={styles.summaryActions}>
                        <button
                            style={styles.startBtn}
                            onClick={() => {
                                repCountRef.current = 0;
                                repAnglesRef.current = [];
                                badRepsRef.current = [];
                                repWasGoodRef.current = false;
                                deepestAngleRef.current = 180;
                                hadAttemptRef.current = false;
                                formIssuesRef.current = {};
                                phaseRef.current = 'standing';
                                setBodyReadiness('no_person');
                                bodyReadinessRef.current = 'no_person';
                                wasReadyAnnouncedRef.current = false;
                                setRepCount(0);
                                setSessionTime(0);
                                setShowSummary(false);
                                aiCoachRequestedRef.current = false;
                                setAiCoachFeedback(null);
                                setAiCoachError('');
                                setAiCoachLoading(false);
                                setIsStarted(false);

                                // Workout states reset
                                currentSetRef.current = 1;
                                setCurrentSet(1);
                                repsInSetRef.current = 0;
                                setRepsInSet(0);
                                isRestingRef.current = false;
                                setIsResting(false);
                                setRestCountdown(0);
                                setWorkoutComplete(false);
                                setResultsRef.current = [];
                                badRepsInSetRef.current = 0;
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#d9441c'}
                            onMouseLeave={e => e.currentTarget.style.background = '#F15025'}
                        >
                            Try Again
                        </button>
                        <button
                            style={styles.outlineBtn}
                            onClick={() => navigate('/exercises')}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = '#FFF5F2';
                                e.currentTarget.style.borderColor = '#d9441c';
                                e.currentTarget.style.color = '#d9441c';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = '#F15025';
                                e.currentTarget.style.color = '#F15025';
                            }}
                        >
                            Back to Exercises
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    // CAMERA SCREEN

    const currentColor = CLASS_COLORS[sqClassification];

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button
                    style={styles.backBtn}
                    onClick={() => navigate('/exercises/squat')}
                    onMouseEnter={e => e.currentTarget.style.color = '#F15025'}
                    onMouseLeave={e => e.currentTarget.style.color = '#888'}
                >
                    Back
                </button>
                <h1 style={styles.logo}>PoseFit</h1>
                <div style={styles.headerRight}>
                    {isStarted && (
                        <button
                            style={{
                                ...styles.voiceToggleBtn,
                                background: voiceMuted ? '#ffffff' : '#FFF5F2',
                                borderColor: voiceMuted ? '#E6E8E6' : 'rgba(241,80,37,0.15)',
                                color: voiceMuted ? '#888' : '#F15025',
                            }}
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
                            {voiceMuted ? '🔇' : '🔊'} Voice
                        </button>
                    )}
                    <div style={styles.timerBadge}>{formatTime(sessionTime)}</div>
                </div>
            </div>

            <div style={workoutLayoutStyle}>

                {/* Left Panel */}
                <div style={leftPanelStyle}>
                    <div style={styles.panelCard}>
                        <p style={styles.panelLabel}>SET</p>
                        <p style={styles.panelBigValue}>{currentSet}</p>
                        <p style={styles.panelSmallValue}>OF {totalSets}</p>
                    </div>
                    <div style={styles.panelCard}>
                        <p style={styles.panelLabel}>REPS</p>
                        <p style={styles.panelBigValue}>{repsInSet}</p>
                        <p style={styles.panelSmallValue}>OF {totalReps}</p>
                    </div>
                    <div style={styles.panelCard}>
                        <p style={styles.panelLabel}>TOTAL REPS</p>
                        <p style={styles.panelBigValue}>{repCount}</p>
                    </div>
                    <div style={styles.panelCard}>
                        <p style={styles.panelLabel}>STATUS</p>
                        <p style={{ ...styles.statusValue, color: isStarted ? currentColor.hex : '#94a3b8' }}>
                            {isStarted ? (isResting ? 'RESTING' : currentColor.label) : '—'}
                        </p>
                    </div>
                    <div style={styles.panelCard}>
                        <p style={styles.panelLabel}>PHASE</p>
                        <p style={styles.phaseValue}>{isResting ? 'REST' : phase.toUpperCase()}</p>
                    </div>
                </div>

                {/* Camera Feed */}
                <div style={styles.cameraBox}>
                    <video ref={videoRef} style={styles.video} playsInline muted />
                    <canvas ref={canvasRef} style={styles.canvas} />

                    {/* Rest Overlay */}
                    {isResting && (
                        <div style={styles.restOverlay}>
                            <h2 style={styles.restTitle}>REST PERIOD</h2>
                            <p style={styles.restCountdown}>{restCountdown}s</p>
                            <p style={styles.restSubtitle}>Next: Set {currentSet + 1} of {totalSets}</p>
                            <button
                                style={styles.skipRestBtn}
                                onClick={skipRest}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#FFF5F2';
                                    e.currentTarget.style.borderColor = '#d9441c';
                                    e.currentTarget.style.color = '#d9441c';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = '#F15025';
                                    e.currentTarget.style.color = '#F15025';
                                }}
                            >
                                Skip Rest ➔
                            </button>
                        </div>
                    )}

                    {/* Workout Complete Overlay */}
                    {workoutComplete && (
                        <div style={styles.completeOverlay}>
                            <div style={styles.completeIcon}>🎉</div>
                            <h2 style={styles.completeTitle}>WORKOUT COMPLETE!</h2>
                            <p style={styles.completeSubtitle}>Preparing your summary...</p>
                        </div>
                    )}

                    {/* Readiness / Feedback badge */}
                    {isStarted && bodyReadiness !== 'ready' && (
                        <div style={{
                            ...styles.readinessBanner,
                            background: bodyReadiness === 'no_person'
                                ? 'rgba(239,68,68,0.92)'
                                : 'rgba(245,158,11,0.92)',
                        }}>
                            <span style={styles.readinessIcon}>
                                {bodyReadiness === 'no_person' ? '👤' : '↕️'}
                            </span>
                            <span>
                                {bodyReadiness === 'no_person'
                                    ? 'No person detected — step into the frame'
                                    : 'Step back — your full body needs to be visible'}
                            </span>
                        </div>
                    )}
                    {isStarted && bodyReadiness === 'ready' && (
                        <div style={{
                            ...styles.feedbackBadge,
                            background: currentColor.badge,
                        }}>
                            {currentColor.label === 'Good Squat' ? '✓' : '⚠'} {currentColor.label}
                        </div>
                    )}

                    {!isStarted && (
                        <div style={styles.preStartOverlay}>
                            {isLoading ? (
                                <div style={styles.loadingBox}>
                                    <div style={styles.spinner} />
                                    <p style={styles.loadingText}>Loading AI Pose Detection...</p>
                                    <p style={styles.loadingSubText}>This may take a few seconds</p>
                                </div>
                            ) : (
                                <div style={styles.startOverlayBox}>
                                    <div style={styles.overlayEmoji}>🏋️</div>
                                    <h2 style={styles.overlayTitle}>Squat Analyzer</h2>
                                    <div style={styles.positionGuide}>
                                        <div style={styles.guideRow}>
                                            <span style={styles.guideIcon}>📷</span>
                                            <p style={styles.guideText}>Face the camera <strong>directly or sideways</strong></p>
                                        </div>
                                        <div style={styles.guideRow}>
                                            <span style={styles.guideIcon}>📏</span>
                                            <p style={styles.guideText}>Stand <strong>2 meters</strong> away</p>
                                        </div>
                                        <div style={styles.guideRow}>
                                            <span style={styles.guideIcon}>👁️</span>
                                            <p style={styles.guideText}><strong>Full body</strong> (head to toe) visible</p>
                                        </div>
                                        <div style={styles.guideRow}>
                                            <span style={styles.guideIcon}>💡</span>
                                            <p style={styles.guideText}>Good lighting, clear background</p>
                                        </div>
                                        <div style={styles.guideRow}>
                                            <span style={styles.guideIcon}>🎯</span>
                                            <p style={styles.guideText}>Target: knee angle <strong>80°–100°</strong></p>
                                        </div>
                                    </div>
                                    {cameraError && <p style={styles.cameraError}>{cameraError}</p>}
                                    <button
                                        style={styles.startBtn}
                                        onClick={startCamera}
                                        onMouseEnter={e => e.currentTarget.style.background = '#d9441c'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#F15025'}
                                    >
                                        Start Session
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div style={rightPanelStyle}>
                    <div style={styles.warningsPanel}>
                        <p style={styles.panelLabel}>LIVE FEEDBACK</p>
                        {isStarted ? (
                            <div style={{
                                ...styles.feedbackBox,
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

                    <div style={styles.anglesPanel}>
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
                    <div style={styles.classLegend}>
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
                            style={styles.stopBtn}
                            onClick={stopSession}
                            onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                            onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                        >
                            End Session
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}

// Styles
const styles = {
    container: { height: '100vh', overflow: 'hidden', background: '#F7F7F7', color: '#222', fontFamily: "'Poppins', 'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', borderBottom: '1px solid #E6E8E6', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', flexShrink: 0 },
    logo: { color: '#F15025', margin: 0, fontSize: '1.4rem', fontWeight: 800 },
    backBtn: { background: 'none', border: 'none', color: '#888', fontSize: '14px', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', padding: 0, transition: 'color 0.2s' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
    timerBadge: { background: '#FFF5F2', border: '1px solid rgba(241,80,37,0.15)', color: '#F15025', padding: '6px 18px', borderRadius: '999px', fontWeight: 700, fontSize: '16px' },
    voiceToggleBtn: { background: '#ffffff', border: '1px solid #E6E8E6', color: '#888', padding: '6px 14px', borderRadius: '999px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s ease', whiteSpace: 'nowrap' },

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

    feedbackBadge: { position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', color: '#fff', padding: '8px 20px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' },
    readinessBanner: { position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', color: '#fff', padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
    readinessIcon: { fontSize: '1.3rem' },

    preStartOverlay: { position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
    loadingBox: { textAlign: 'center' },
    spinner: { width: '48px', height: '48px', border: '4px solid #E6E8E6', borderTop: '4px solid #F15025', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },
    loadingText: { color: '#222', fontSize: '16px', fontWeight: 600 },
    loadingSubText: { color: '#888', fontSize: '13px' },
    startOverlayBox: { textAlign: 'center', padding: '40px', maxWidth: '360px' },
    overlayEmoji: { fontSize: '3.5rem', marginBottom: '12px' },
    overlayTitle: { color: '#222', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 20px' },
    positionGuide: { background: '#FFF5F2', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'left', border: '1px solid rgba(241,80,37,0.15)' },
    guideRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
    guideIcon: { fontSize: '1.2rem', flexShrink: 0 },
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

    stopBtn: { width: '100%', padding: '10px', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', borderRadius: '999px', cursor: 'pointer', transition: 'background 0.2s' },

    summaryWrapper: {
        maxWidth: 'min(1200px, 100%)',
        margin: '0 auto',
        padding: '20px 20px 16px',
        height: 'calc(100vh - 68px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
        WebkitOverflowScrolling: 'touch',
    },
    summaryTitle: { fontSize: '1.9rem', fontWeight: 800, color: '#222', textAlign: 'center', margin: '0 0 4px' },
    summarySubtitle: { color: '#666', textAlign: 'center', marginBottom: '4px' },
    statCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', justifyContent: 'center', marginBottom: '0' },
    summaryStatCard: { background: '#FFFFFF', border: '1px solid #E6E8E6', borderRadius: '16px', padding: '16px 18px', textAlign: 'center', minWidth: 0 },
    summaryStatValue: { display: 'block', fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' },
    summaryStatLabel: { color: '#999', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' },

    accuracyBarWrapper: { background: '#FFFFFF', border: '1px solid #E6E8E6', borderRadius: '16px', padding: '14px 18px', marginBottom: '0' },
    accuracyBarLabels: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
    accuracyBarTrack: { width: '100%', height: '10px', background: '#E6E8E6', borderRadius: '999px', overflow: 'hidden', marginBottom: '6px' },
    accuracyBarFill: { height: '100%', borderRadius: '999px', transition: 'width 0.6s ease' },

    legendRow: { display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '0', flexWrap: 'wrap' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
    legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
    legendText: { color: '#666', fontSize: '12px' },

    breakdownSection: { background: '#FFFFFF', border: '1px solid #E6E8E6', borderRadius: '16px', padding: '16px', marginBottom: '0' },
    breakdownTitle: { color: '#222', fontSize: '15px', fontWeight: 700, margin: '0 0 2px' },
    breakdownSubtitle: { color: '#666', fontSize: '11px', margin: '0 0 10px' },
    reasonsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    reasonCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF5F2', border: '1px solid rgba(241,80,37,0.15)', borderRadius: '12px', padding: '10px 14px' },
    reasonLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    reasonIcon: { fontSize: '1.4rem' },
    reasonText: { color: '#444', fontSize: '13px', fontWeight: 500 },
    reasonRight: { display: 'flex', alignItems: 'baseline', gap: '4px' },
    reasonCount: { color: '#ef4444', fontSize: '1.2rem', fontWeight: 800 },
    reasonCountLabel: { color: '#888', fontSize: '10px' },

    chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '0' },
    chartBox: { minWidth: 0, height: '220px', background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1px solid #E6E8E6' },
    noDataBox: { background: '#FFFFFF', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '0', border: '1px solid #E6E8E6' },
    summaryActions: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: 'auto' },
    outlineBtn: { padding: '12px 28px', background: 'transparent', border: '1px solid #F15025', color: '#F15025', fontWeight: 700, fontSize: '14px', borderRadius: '999px', cursor: 'pointer', transition: 'all 0.2s' },

    restOverlay: { position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 15 },
    restTitle: { color: '#F15025', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 10px', letterSpacing: '1px' },
    restCountdown: { color: '#222', fontSize: '4.5rem', fontWeight: 900, margin: '0 0 8px' },
    restSubtitle: { color: '#666', fontSize: '14px', margin: '0 0 24px' },
    skipRestBtn: { padding: '10px 24px', background: 'transparent', border: '1px solid #F15025', color: '#F15025', fontWeight: 700, fontSize: '13px', borderRadius: '999px', cursor: 'pointer', transition: 'all 0.2s' },

    completeOverlay: { position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 15 },
    completeIcon: { fontSize: '4rem', marginBottom: '16px' },
    completeTitle: { color: '#22c55e', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px' },
    completeSubtitle: { color: '#666', fontSize: '14px', margin: 0 },

    setGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '8px' },
    setCard: { background: '#FFFFFF', border: '1px solid #E6E8E6', borderRadius: '12px', padding: '16px' },
    setCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #E6E8E6', paddingBottom: '8px' },
    setNumLabel: { color: '#222', fontWeight: 700, fontSize: '14px' },
    setAccBadge: { padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 },
    setStatsRow: { display: 'flex', justifyContent: 'space-between' },
    setStatItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
    setStatVal: { color: '#444', fontWeight: 700, fontSize: '16px' },
    setStatLbl: { color: '#999', fontSize: '10px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' },
};



