import { normalizeFormIssues } from './formIssues';
import { calculateAccuracy } from '../utils/statistics';

export const LATEST_SESSION_RESULT_KEY = 'posefitLatestSessionResult';
export const SESSION_FEEDBACK_CACHE_KEY = 'posefitSessionFeedbackById';

export const SUMMARY_REASON_ICONS = {
    'Squat depth too shallow': '📏',
    'Not deep enough': '⬇️',
    'Too deep - risk of injury': '⚠️',
    'Slightly too deep': '↕️',
    'Uneven leg movement': '🦵',
    'Poor form detected': '❌',
};

export function buildReasonCounts(badReps = []) {
    const reasonCounts = {};
    badReps.forEach((rep) => {
        [...new Set(rep.reasons || [])].forEach((reason) => {
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
    });

    return Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
}

export function buildAllReps(goodAngles = [], badReps = []) {
    return [
        ...goodAngles.map((angle, index) => ({ angle, type: 'good', index })),
        ...badReps.map((rep, index) => ({ angle: rep.angle, type: 'bad', index: goodAngles.length + index })),
    ];
}

export function buildAngleChartData(allReps = []) {
    return {
        labels: allReps.map((_, i) => `Rep ${i + 1}`),
        datasets: [{
            label: 'Deepest Knee Angle (°)',
            data: allReps.map((rep) => rep.angle),
            borderColor: '#F15025',
            backgroundColor: 'rgba(241,80,37,0.15)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: allReps.map((rep) =>
                rep.type === 'good' ? '#22c55e' :
                    rep.angle >= 60 && rep.angle <= 120 ? '#f59e0b' : '#ef4444'
            ),
            pointRadius: 6,
            pointBorderColor: allReps.map((rep) =>
                rep.type === 'good' ? '#16a34a' : '#dc2626'
            ),
            pointBorderWidth: 2,
        }],
    };
}

export function buildRepChartData(totalGood, totalBad) {
    return {
        labels: ['Good Reps', 'Incorrect Reps'],
        datasets: [{
            label: 'Reps',
            data: [totalGood, totalBad],
            backgroundColor: ['#22c55e', '#ef4444'],
            borderRadius: 10,
            barThickness: 60,
        }],
    };
}

export function buildChartOptions(title, minY, maxY) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#666' } },
            title: { display: true, text: title, color: '#222', font: { size: 14 } },
        },
        scales: {
            x: { ticks: { color: '#666' }, grid: { color: '#E6E8E6' } },
            y: { ticks: { color: '#666' }, grid: { color: '#E6E8E6' }, min: minY, max: maxY },
        },
    };
}

function toNonNegativeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function feedbackText(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean).join(' ');
    }
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeSessionFeedback(feedback) {
    if (!feedback || typeof feedback !== 'object') return null;

    const feedbackParagraph = feedbackText(feedback.feedbackParagraph) || [
        feedbackText(feedback.overallPerformance),
        feedbackText(feedback.whatYouDidWell || feedback.strengths),
        feedbackText(feedback.whatToImprove || feedback.areasForImprovement || feedback.recommendations),
    ].filter(Boolean).join(' ');

    return feedbackParagraph ? { feedbackParagraph, issueFeedback: Array.isArray(feedback.issueFeedback) ? feedback.issueFeedback : [] } : null;
}

export function createSessionResult(data = {}) {
    const exercise = data.exercise || {};
    const metricType = data.metricType === 'time' ? 'time' : 'reps';
    const correctReps = toNonNegativeNumber(data.correctReps);
    const incorrectReps = toNonNegativeNumber(data.incorrectReps);
    const suppliedAccuracy = Number(data.accuracy);
    const accuracy = Number.isFinite(suppliedAccuracy)
        ? Math.max(0, Math.min(100, Math.round(suppliedAccuracy)))
        : calculateAccuracy(correctReps, incorrectReps);

    return {
        version: 1,
        id: data.id || `${exercise.id || 'exercise'}-${Date.now()}`,
        exercise: {
            id: String(exercise.id || '').trim().toLowerCase(),
            name: String(exercise.name || 'Exercise').trim(),
        },
        metricType,
        status: data.status === 'completed' ? 'completed' : 'ended',
        completedAt: data.completedAt || new Date().toISOString(),
        duration: Math.round(toNonNegativeNumber(data.duration)),
        setsCompleted: Math.round(toNonNegativeNumber(data.setsCompleted)),
        correctReps: metricType === 'reps' ? Math.round(correctReps) : null,
        incorrectReps: metricType === 'reps' ? Math.round(incorrectReps) : null,
        totalReps: metricType === 'reps' ? Math.round(toNonNegativeNumber(data.totalReps, correctReps)) : null,
        totalHoldTime: metricType === 'time' ? Math.round(toNonNegativeNumber(data.totalHoldTime)) : null,
        accuracy,
        formIssues: normalizeFormIssues(data.formIssues, String(exercise.id || '').trim().toLowerCase()),
        setResults: Array.isArray(data.setResults) ? data.setResults : [],
        config: data.config && typeof data.config === 'object' ? data.config : {},
        analysis: data.analysis && typeof data.analysis === 'object' ? data.analysis : {},
        feedback: normalizeSessionFeedback(data.feedback),
    };
}

export function saveLatestSessionResult(result) {
    const normalized = createSessionResult(result);
    sessionStorage.setItem(LATEST_SESSION_RESULT_KEY, JSON.stringify(normalized));
    if (normalized.feedback) {
        saveSessionFeedback(normalized.id, normalized.feedback);
    }
    return normalized;
}

export function readLatestSessionResult() {
    try {
        const stored = JSON.parse(sessionStorage.getItem(LATEST_SESSION_RESULT_KEY));
        return stored ? createSessionResult(stored) : null;
    } catch {
        return null;
    }
}

export function updateStoredSessionFeedback(sessionId, feedback) {
    saveSessionFeedback(sessionId, feedback);
    const stored = readLatestSessionResult();
    if (!stored || stored.id !== sessionId) return;
    saveLatestSessionResult({ ...stored, feedback });
}

export function readSessionFeedback(sessionId) {
    if (!sessionId) return null;
    try {
        const feedbackBySession = JSON.parse(localStorage.getItem(SESSION_FEEDBACK_CACHE_KEY)) || {};
        return normalizeSessionFeedback(feedbackBySession[sessionId]);
    } catch {
        return null;
    }
}

function saveSessionFeedback(sessionId, feedback) {
    const normalized = normalizeSessionFeedback(feedback);
    if (!sessionId || !normalized) return;

    try {
        const feedbackBySession = JSON.parse(localStorage.getItem(SESSION_FEEDBACK_CACHE_KEY)) || {};
        const nextEntries = Object.entries({
            ...feedbackBySession,
            [sessionId]: normalized,
        }).slice(-100);
        localStorage.setItem(SESSION_FEEDBACK_CACHE_KEY, JSON.stringify(Object.fromEntries(nextEntries)));
    } catch {
        // The in-memory summary still displays feedback if browser storage is unavailable.
    }
}

export function buildSessionSummary({
    goodAngles = [],
    badReps = [],
    repCount = 0,
    sessionTime = 0,
    setResults = [],
}) {
    const totalGood = repCount;
    const totalBad = badReps.length;
    const totalAttempts = totalGood + totalBad;
    const accuracy = calculateAccuracy(totalGood, totalBad);
    const allReps = buildAllReps(goodAngles, badReps);
    const reasonCounts = buildReasonCounts(badReps);

    return {
        totalGood,
        totalBad,
        totalAttempts,
        accuracy,
        allReps,
        reasonCounts,
        angleChartData: buildAngleChartData(allReps),
        repChartData: buildRepChartData(totalGood, totalBad),
        setResults,
        sessionTime,
    };
}
