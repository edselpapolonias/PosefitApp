import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import {
    Chart as ChartJS, CategoryScale, LinearScale,
    BarElement, LineElement, PointElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

// ─── Angle Calculator (same arctan2 formula as Kumaresan et al. 2026) ────────
// Computes angle at point B formed by vectors B→A and B→C
function calculateAngle(A, B, C) {
    const radians = Math.atan2(C.y - B.y, C.x - B.x)
        - Math.atan2(A.y - B.y, A.x - B.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

// ─── Three-Tier Classification (Kumaresan et al. 2026, Figure 4) ─────────────
// Returns: 'good' | 'adjust' | 'bad'
// Good:   80°–100° → knee angle within optimal squat depth
// Adjust: 60°–79° or 101°–120° → slight deviation, correctable
// Bad:    <60° or >120° → over-flexion or too shallow (or still standing)
function classifyKneeAngle(angle) {
    if (angle >= 80 && angle <= 100) return 'good';
    if ((angle >= 60 && angle <= 79) || (angle >= 101 && angle <= 120)) return 'adjust';
    return 'bad';
}

// Classification → UI color mapping
const CLASS_COLORS = {
    good: { skeleton: '#22c55e', badge: 'rgba(34,197,94,0.92)', hex: '#22c55e', label: 'Good Squat' },
    adjust: { skeleton: '#f59e0b', badge: 'rgba(245,158,11,0.92)', hex: '#f59e0b', label: 'Adjust Squat' },
    bad: { skeleton: '#ef4444', badge: 'rgba(239,68,68,0.92)', hex: '#ef4444', label: 'Bad Squat' },
};

// ─── Bilateral Squat Analyzer (Kumaresan et al. 2026) ────────────────────────
// Monitors BOTH legs symmetrically using landmarks 23–28 (hips, knees, ankles).
// Returns the average knee angle and the worse classification of the two sides.
function analyzeSquatBilateral(landmarks) {
    if (!landmarks || landmarks.length < 33) return null;

    const lm = landmarks;

    // Left leg: hip(23) → knee(25) → ankle(27)
    const leftAngle = calculateAngle(lm[23], lm[25], lm[27]);
    // Right leg: hip(24) → knee(26) → ankle(28)
    const rightAngle = calculateAngle(lm[24], lm[26], lm[28]);

    const leftClass = classifyKneeAngle(leftAngle);
    const rightClass = classifyKneeAngle(rightAngle);

    // Use the worse of the two legs as the overall classification
    // Priority: bad > adjust > good
    const classRank = { bad: 2, adjust: 1, good: 0 };
    const overallClass = classRank[leftClass] >= classRank[rightClass] ? leftClass : rightClass;

    // Average angle for display and phase detection
    const avgAngle = (leftAngle + rightAngle) / 2;

    // ── Phase Detection ───────────────────────────────────────────────────────
    // 'bottom' only when angle is in or below the good zone (≤100°)
    // 'descending' when in adjust/bad zone but still bent (101°–150°)
    // 'standing' when near straight (>150°)
    let phase = 'standing';
    if (avgAngle <= 100) phase = 'bottom';
    else if (avgAngle <= 150) phase = 'descending';

    // ── Depth % ───────────────────────────────────────────────────────────────
    // 160° = 0%, 80° = 100% (good zone centre)
    const depth = avgAngle < 160
        ? Math.min(100, Math.round(((160 - avgAngle) / 80) * 100))
        : 0;

    // ── Feedback messages (specific per zone and per leg) ────────────────────
    let feedback = '';
    let feedbackDetail = '';
    if (overallClass === 'good') {
        feedback = 'Good Squat!';
        feedbackDetail = 'Knee angle 80°–100° — perfect depth. Keep your weight in your heels and chest up.';
    } else if (overallClass === 'adjust') {
        if (avgAngle < 80) {
            feedback = 'Slightly Too Deep';
            feedbackDetail = `Knee angle ${Math.round(avgAngle)}° — just a bit past parallel. Rise slightly to hit the 80°–100° target zone.`;
        } else {
            feedback = 'Go a Little Deeper';
            feedbackDetail = `Knee angle ${Math.round(avgAngle)}° — almost there! Bend your knees a bit more until thighs are parallel to the floor.`;
        }
        // Add per-leg note if they differ significantly
        if (Math.abs(leftAngle - rightAngle) > 10) {
            const lagging = leftAngle > rightAngle ? 'left' : 'right';
            feedbackDetail += ` Your ${lagging} leg is lagging — try to keep both knees bending equally.`;
        }
    } else {
        // bad
        if (avgAngle < 60) {
            feedback = 'Too Deep — Risk of Injury';
            feedbackDetail = `Knee angle ${Math.round(avgAngle)}° — over-flexion detected. Rise up to keep your knees safe. Target: 80°–100°.`;
        } else {
            feedback = 'Not Deep Enough';
            feedbackDetail = `Knee angle ${Math.round(avgAngle)}° — squat deeper to activate your glutes, quads, and hamstrings. Target: 80°–100°.`;
        }
        if (Math.abs(leftAngle - rightAngle) > 10) {
            const lagging = leftAngle > rightAngle ? 'left' : 'right';
            feedbackDetail += ` Your ${lagging} knee is not bending as much — check for equal weight distribution.`;
        }
    }

    return {
        leftAngle,
        rightAngle,
        avgAngle,
        leftClass,
        rightClass,
        overallClass,
        phase,
        feedback,
        feedbackDetail,
        // Key landmarks for drawing
        landmarks: {
            leftHip: lm[23], leftKnee: lm[25], leftAnkle: lm[27],
            rightHip: lm[24], rightKnee: lm[26], rightAnkle: lm[28],
        },
    };
}

// ─── Determine Reason for Incorrect Rep ───────────────────────────────────────
// Returns a human-readable reason string based on the deepest angle reached
// and any additional form issues detected during the squat cycle.
function determineIncorrectReason(deepestAngle, formIssues) {
    const reasons = [];

    // Angle-based reasons (primary)
    if (deepestAngle > 120) {
        reasons.push('Squat depth too shallow');
    } else if (deepestAngle > 100) {
        reasons.push('Not deep enough');
    } else if (deepestAngle < 60) {
        reasons.push('Too deep — risk of injury');
    } else if (deepestAngle < 80) {
        reasons.push('Slightly too deep');
    }

    // Form-based reasons (detected from landmarks)
    if (formIssues.unevenLegs) {
        reasons.push('Uneven leg movement');
    }

    // Fallback if no specific reason found
    if (reasons.length === 0) {
        reasons.push('Poor form detected');
    }

    return reasons;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SquatCameraPage() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const cameraRef = useRef(null);

    const [isStarted, setIsStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [repCount, setRepCount] = useState(0);
    const [sqClassification, setSqClassification] = useState('bad');
    const [feedback, setFeedback] = useState('');
    const [feedbackDetail, setFeedbackDetail] = useState('');
    const [phase, setPhase] = useState('standing');
    const [leftAngle, setLeftAngle] = useState(0);
    const [rightAngle, setRightAngle] = useState(0);
    const [sessionTime, setSessionTime] = useState(0);
    const [cameraError, setCameraError] = useState('');

    const repCountRef = useRef(0);
    const phaseRef = useRef('standing');
    // Track whether the bottom of this rep was a "good" classification
    const repWasGoodRef = useRef(false);
    const repAnglesRef = useRef([]);   // avg angles logged per rep for chart
    const timerRef = useRef(null);
    const sessionStartRef = useRef(null);
    // Guard: prevents onResults firing after session ends (fixes null canvas crash)
    const isMountedRef = useRef(false);

    // ── Incorrect Rep Tracking ────────────────────────────────────────────────
    const badRepsRef = useRef([]);          // { angle, reasons[], classification }
    const deepestAngleRef = useRef(180);    // deepest angle in current squat cycle
    const hadAttemptRef = useRef(false);    // did the user descend enough to count?
    const formIssuesRef = useRef({});       // form issues detected during cycle

    // ── Timer ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isStarted && !showSummary) {
            sessionStartRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isStarted, showSummary]);

    const formatTime = (s) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ── Rep Counter (Kumaresan et al. 2026 logic) ──────────────────────────────
    // Tracks both GOOD reps (counted live) and INCORRECT reps (stored with reasons).
    // A rep cycle: standing → descending → bottom → descending → standing
    const processRep = useCallback((analysis) => {
        if (!analysis) return;
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
            // Uneven legs: >10° difference between left and right knee angles
            if (Math.abs(analysis.leftAngle - analysis.rightAngle) > 10) {
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
                repAnglesRef.current.push(Math.round(deepestAngleRef.current));
            } else {
                // ✕ INCORRECT REP — store with reasons
                const reasons = determineIncorrectReason(
                    deepestAngleRef.current,
                    formIssuesRef.current
                );
                badRepsRef.current.push({
                    angle: Math.round(deepestAngleRef.current),
                    reasons,
                    classification: deepestAngleRef.current >= 80 && deepestAngleRef.current <= 100 ? 'adjust' : 'bad',
                });
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
    }, []);

    // ── Draw Knee Angle Label on Canvas ───────────────────────────────────────
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

    // ── MediaPipe Results Handler ──────────────────────────────────────────────
    const onResults = useCallback((results) => {
        // Guard: if session was stopped, ignore any stale frames still in flight
        if (!isMountedRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = results.image.width;
        canvas.height = results.image.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (!results.poseLandmarks) return;

        const analysis = analyzeSquatBilateral(results.poseLandmarks);
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

        // Draw knee angle labels on both knees
        drawKneeLabel(ctx, leftKnee, analysis.leftAngle, analysis.leftClass, canvas.width, canvas.height);
        drawKneeLabel(ctx, rightKnee, analysis.rightAngle, analysis.rightClass, canvas.width, canvas.height);

        processRep(analysis);
        setSqClassification(analysis.overallClass);
        setFeedback(analysis.feedback);
        setFeedbackDetail(analysis.feedbackDetail);
        setLeftAngle(Math.round(analysis.leftAngle));
        setRightAngle(Math.round(analysis.rightAngle));
    }, [processRep]);

    // ── Start Camera ───────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setIsLoading(true);
        setCameraError('');
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
                    if (poseRef.current && videoRef.current && isMountedRef.current) {
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
            setIsLoading(false);
            setCameraError('Could not access camera. Please allow camera permission and try again.');
        }
    }, [onResults]);

    // ── Stop Session ───────────────────────────────────────────────────────────
    const stopSession = useCallback(() => {
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
        setIsStarted(false);
        setShowSummary(true);
    }, []);

    useEffect(() => {
        return () => {
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
        };
    }, []);

    const classColor = (cls) => CLASS_COLORS[cls]?.hex ?? '#94a3b8';

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY SCREEN
    // ─────────────────────────────────────────────────────────────────────────
    if (showSummary) {
        const goodAngles = repAnglesRef.current;
        const badReps = badRepsRef.current;
        const totalGood = repCountRef.current;
        const totalBad = badReps.length;
        const totalAttempts = totalGood + totalBad;
        const accuracy = totalAttempts > 0 ? Math.round((totalGood / totalAttempts) * 100) : 0;

        // Combine good + bad angles for the "all reps" chart
        const allReps = [
            ...goodAngles.map((a, i) => ({ angle: a, type: 'good', index: i })),
            ...badReps.map((r, i) => ({ angle: r.angle, type: 'bad', index: goodAngles.length + i })),
        ];
        // Sort by original order isn't available, so just show them sequentially

        const angleChartData = {
            labels: allReps.map((_, i) => `Rep ${i + 1}`),
            datasets: [{
                label: 'Deepest Knee Angle (°)',
                data: allReps.map(r => r.angle),
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56,189,248,0.15)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: allReps.map(r =>
                    r.type === 'good' ? '#22c55e' :
                        r.angle >= 60 && r.angle <= 120 ? '#f59e0b' : '#ef4444'
                ),
                pointRadius: 6,
                pointBorderColor: allReps.map(r =>
                    r.type === 'good' ? '#16a34a' : '#dc2626'
                ),
                pointBorderWidth: 2,
            }],
        };

        const repChartData = {
            labels: ['Good Reps', 'Incorrect Reps'],
            datasets: [{
                label: 'Reps',
                data: [totalGood, totalBad],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderRadius: 10,
                barThickness: 60,
            }],
        };

        const chartOptions = (title, minY, maxY) => ({
            responsive: true,
            plugins: {
                legend: { labels: { color: '#94a3b8' } },
                title: { display: true, text: title, color: '#f1f5f9', font: { size: 14 } },
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' }, min: minY, max: maxY },
            },
        });

        // Group incorrect rep reasons for breakdown display
        const reasonCounts = {};
        badReps.forEach(rep => {
            rep.reasons.forEach(reason => {
                reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
            });
        });
        const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);

        // Map reasons to icons
        const reasonIcons = {
            'Squat depth too shallow': '📏',
            'Not deep enough': '⬇️',
            'Too deep — risk of injury': '⚠️',
            'Slightly too deep': '↕️',
            'Uneven leg movement': '🦵',
            'Poor form detected': '❌',
        };

        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <button style={styles.backBtn} onClick={() => navigate('/exercises/squat')}>← Back to Squat</button>
                    <h1 style={styles.logo}>PoseFit</h1>
                    <div style={{ width: 120 }} />
                </div>
                <div style={styles.summaryWrapper}>
                    <h2 style={styles.summaryTitle}>Session Summary 🎉</h2>
                    <p style={styles.summarySubtitle}>Detailed breakdown of your squat performance</p>

                    {/* ── Stat Cards ──────────────────────────────────────── */}
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

                    {/* ── Accuracy Progress Bar ──────────────────────────── */}
                    {totalAttempts > 0 && (
                        <div style={styles.accuracyBarWrapper}>
                            <div style={styles.accuracyBarLabels}>
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Accuracy</span>
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
                                <span style={{ color: '#64748b', fontSize: '11px' }}>{totalAttempts} total attempts</span>
                                <span style={{ color: '#ef4444', fontSize: '11px' }}>{totalBad} incorrect</span>
                            </div>
                        </div>
                    )}

                    {/* ── Classification Legend ──────────────────────────── */}
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

                    {/* ── Incorrect Reps Breakdown ──────────────────────── */}
                    {totalBad > 0 && (
                        <div style={styles.breakdownSection}>
                            <h3 style={styles.breakdownTitle}>❌ Incorrect Reps Breakdown</h3>
                            <p style={styles.breakdownSubtitle}>Reasons your reps were not counted as valid</p>
                            <div style={styles.reasonsList}>
                                {sortedReasons.map(([reason, count], i) => (
                                    <div key={i} style={styles.reasonCard}>
                                        <div style={styles.reasonLeft}>
                                            <span style={styles.reasonIcon}>{reasonIcons[reason] || '⚠️'}</span>
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

                    {/* ── Charts ────────────────────────────────────────── */}
                    {allReps.length > 0 ? (
                        <div style={styles.chartsRow}>
                            <div style={styles.chartBox}>
                                <Line data={angleChartData} options={chartOptions('Knee Angle Per Rep (°)', 0, 180)} />
                            </div>
                            <div style={styles.chartBox}>
                                <Bar data={repChartData} options={chartOptions('Reps Overview', 0, Math.max(totalGood, totalBad) + 2)} />
                            </div>
                        </div>
                    ) : (
                        <div style={styles.noDataBox}>
                            <p style={{ color: '#64748b' }}>No reps detected. Make sure your full body is visible and perform a complete squat cycle.</p>
                        </div>
                    )}

                    {/* ── Actions ───────────────────────────────────────── */}
                    <div style={styles.summaryActions}>
                        <button style={styles.startBtn} onClick={() => {
                            repCountRef.current = 0;
                            repAnglesRef.current = [];
                            badRepsRef.current = [];
                            repWasGoodRef.current = false;
                            deepestAngleRef.current = 180;
                            hadAttemptRef.current = false;
                            formIssuesRef.current = {};
                            phaseRef.current = 'standing';
                            setRepCount(0);
                            setSessionTime(0);
                            setShowSummary(false);
                            setIsStarted(false);
                        }}>Try Again</button>
                        <button style={styles.outlineBtn} onClick={() => navigate('/exercises')}>
                            Back to Exercises
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CAMERA SCREEN
    // ─────────────────────────────────────────────────────────────────────────
    const currentColor = CLASS_COLORS[sqClassification];

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate('/exercises/squat')}>← Back</button>
                <h1 style={styles.logo}>PoseFit</h1>
                <div style={styles.timerBadge}>{formatTime(sessionTime)}</div>
            </div>

            <div style={styles.cameraWrapper}>

                {/* Left Panel */}
                <div style={styles.leftPanel}>
                    <div style={styles.panelCard}>
                        <p style={styles.panelLabel}>GOOD REPS</p>
                        <p style={styles.panelBigValue}>{repCount}</p>
                    </div>
                    <div style={styles.panelCard}>
                        <p style={styles.panelLabel}>STATUS</p>
                        <p style={{ ...styles.statusValue, color: isStarted ? currentColor.hex : '#94a3b8' }}>
                            {isStarted ? currentColor.label : '—'}
                        </p>
                    </div>
                    <div style={styles.panelCard}>
                        <p style={styles.panelLabel}>PHASE</p>
                        <p style={styles.phaseValue}>{phase.toUpperCase()}</p>
                    </div>
                </div>

                {/* Camera Feed */}
                <div style={styles.cameraBox}>
                    <video ref={videoRef} style={styles.video} playsInline muted />
                    <canvas ref={canvasRef} style={styles.canvas} />

                    {/* Feedback badge — shows classification label in its color */}
                    {isStarted && (
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
                                            <p style={styles.guideText}>Face the camera <strong>directly</strong></p>
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
                                    <button style={styles.startBtn} onClick={startCamera}>
                                        Start Session
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div style={styles.rightPanel}>
                    <div style={styles.warningsPanel}>
                        <p style={styles.panelLabel}>LIVE FEEDBACK</p>
                        {isStarted ? (
                            <div style={{
                                ...styles.feedbackBox,
                                borderColor: currentColor.hex,
                                background: `${currentColor.hex}12`,
                            }}>
                                <span style={{ ...styles.feedbackIcon, color: currentColor.hex }}>
                                    {sqClassification === 'good' ? '✓' : sqClassification === 'adjust' ? '▲' : '✕'}
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
                        <p style={styles.panelLabel}>LIVE ANGLES</p>
                        {[
                            {
                                label: 'Left knee',
                                value: isStarted ? `${leftAngle}°` : '—',
                                color: isStarted ? CLASS_COLORS[classifyKneeAngle(leftAngle)].hex : '#94a3b8',
                            },
                            {
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
                        ].map((item, i) => (
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
                        <button style={styles.stopBtn} onClick={stopSession}>End Session</button>
                    )}
                </div>

            </div>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
    container: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'Segoe UI, sans-serif', display: 'flex', flexDirection: 'column' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #1e293b', background: '#0f172a' },
    logo: { color: '#38bdf8', margin: 0, fontSize: '1.4rem' },
    backBtn: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
    timerBadge: { background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '6px 18px', borderRadius: '999px', fontWeight: 700, fontSize: '16px' },

    cameraWrapper: { display: 'flex', flex: 1, gap: '20px', padding: '20px 24px', alignItems: 'flex-start' },

    leftPanel: { display: 'flex', flexDirection: 'column', gap: '12px', width: '150px', flexShrink: 0 },
    panelCard: { background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155', textAlign: 'center' },
    panelLabel: { color: '#64748b', fontSize: '10px', letterSpacing: '1px', margin: '0 0 6px', fontWeight: 600 },
    panelBigValue: { color: '#f1f5f9', fontSize: '2rem', fontWeight: 800, margin: 0 },
    panelSmallValue: { color: '#f1f5f9', fontSize: '1rem', fontWeight: 700, margin: '4px 0 0' },
    statusValue: { fontSize: '12px', fontWeight: 700, margin: 0, lineHeight: 1.3 },
    phaseValue: { color: '#38bdf8', fontSize: '11px', fontWeight: 700, margin: 0 },

    cameraBox: { flex: 1, position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', minHeight: '480px' },
    video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    canvas: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },

    feedbackBadge: { position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', color: '#fff', padding: '8px 20px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' },

    preStartOverlay: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
    loadingBox: { textAlign: 'center' },
    spinner: { width: '48px', height: '48px', border: '4px solid #1e293b', borderTop: '4px solid #38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },
    loadingText: { color: '#f1f5f9', fontSize: '16px', fontWeight: 600 },
    loadingSubText: { color: '#64748b', fontSize: '13px' },
    startOverlayBox: { textAlign: 'center', padding: '40px', maxWidth: '360px' },
    overlayEmoji: { fontSize: '3.5rem', marginBottom: '12px' },
    overlayTitle: { color: '#f1f5f9', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 20px' },
    positionGuide: { background: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left', border: '1px solid #334155' },
    guideRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
    guideIcon: { fontSize: '1.2rem', flexShrink: 0 },
    guideText: { color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: '1.5' },
    cameraError: { color: '#f87171', fontSize: '13px', marginBottom: '16px' },
    startBtn: { padding: '14px 36px', background: '#38bdf8', color: '#0f172a', fontWeight: 800, fontSize: '15px', border: 'none', borderRadius: '12px', cursor: 'pointer' },

    rightPanel: { display: 'flex', flexDirection: 'column', gap: '12px', width: '210px', flexShrink: 0 },
    warningsPanel: { background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' },
    feedbackBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 10px 12px', border: '2px solid', borderRadius: '10px', marginTop: '8px', gap: '6px' },
    feedbackIcon: { fontSize: '2rem', lineHeight: 1 },
    feedbackTitle: { fontSize: '16px', fontWeight: 800, margin: 0, textAlign: 'center', letterSpacing: '0.3px' },
    feedbackDetail: { color: '#cbd5e1', fontSize: '12px', lineHeight: 1.6, textAlign: 'center', margin: 0 },
    inactiveText: { color: '#334155', fontSize: '12px', fontStyle: 'italic', marginTop: '8px' },

    anglesPanel: { background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' },
    angleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    angleLabel: { color: '#64748b', fontSize: '12px' },
    angleValue: { fontSize: '13px', fontWeight: 700 },

    classLegend: { background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' },
    classRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' },
    classDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
    classLabel: { color: '#e2e8f0', fontSize: '11px', fontWeight: 600, minWidth: '40px' },
    classRange: { color: '#64748b', fontSize: '11px' },

    stopBtn: { padding: '13px', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', borderRadius: '12px', cursor: 'pointer' },

    summaryWrapper: { maxWidth: '900px', margin: '0 auto', padding: '50px 24px' },
    summaryTitle: { fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', textAlign: 'center', margin: '0 0 8px' },
    summarySubtitle: { color: '#64748b', textAlign: 'center', marginBottom: '36px' },
    statCards: { display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' },
    summaryStatCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '22px 28px', textAlign: 'center', minWidth: '120px' },
    summaryStatValue: { display: 'block', fontSize: '2.2rem', fontWeight: 800, marginBottom: '6px' },
    summaryStatLabel: { color: '#64748b', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' },

    accuracyBarWrapper: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px 28px', marginBottom: '28px' },
    accuracyBarLabels: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
    accuracyBarTrack: { width: '100%', height: '12px', background: '#334155', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' },
    accuracyBarFill: { height: '100%', borderRadius: '999px', transition: 'width 0.6s ease' },

    legendRow: { display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '28px', flexWrap: 'wrap' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
    legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
    legendText: { color: '#94a3b8', fontSize: '12px' },

    breakdownSection: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', marginBottom: '28px' },
    breakdownTitle: { color: '#f1f5f9', fontSize: '16px', fontWeight: 700, margin: '0 0 4px' },
    breakdownSubtitle: { color: '#64748b', fontSize: '12px', margin: '0 0 16px' },
    reasonsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    reasonCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '14px 18px' },
    reasonLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    reasonIcon: { fontSize: '1.4rem' },
    reasonText: { color: '#e2e8f0', fontSize: '14px', fontWeight: 500 },
    reasonRight: { display: 'flex', alignItems: 'baseline', gap: '4px' },
    reasonCount: { color: '#ef4444', fontSize: '1.4rem', fontWeight: 800 },
    reasonCountLabel: { color: '#64748b', fontSize: '11px' },

    chartsRow: { display: 'flex', gap: '24px', marginBottom: '40px', flexWrap: 'wrap' },
    chartBox: { flex: 1, minWidth: '280px', background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155' },
    noDataBox: { background: '#1e293b', borderRadius: '16px', padding: '40px', textAlign: 'center', marginBottom: '40px', border: '1px solid #334155' },
    summaryActions: { display: 'flex', gap: '16px', justifyContent: 'center' },
    outlineBtn: { padding: '14px 36px', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', fontWeight: 700, fontSize: '15px', borderRadius: '12px', cursor: 'pointer' },
};