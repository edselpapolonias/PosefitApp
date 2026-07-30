import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';
const AI_FEEDBACK_URL = `${API_BASE_URL}/api/users/squat-coach-feedback/`;

function normalizeList(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}

function normalizeFeedback(feedback) {
    if (!feedback || typeof feedback !== 'object') {
        return null;
    }

    return {
        overallPerformance: String(feedback.overallPerformance || '').trim(),
        strengths: normalizeList(feedback.strengths),
        areasForImprovement: normalizeList(feedback.areasForImprovement),
        recommendations: normalizeList(feedback.recommendations),
        encouragement: String(feedback.encouragement || '').trim(),
    };
}

function buildAngleStats(repAngles = []) {
    if (!repAngles.length) return {};

    const min = Math.min(...repAngles);
    const max = Math.max(...repAngles);
    const average = repAngles.reduce((sum, value) => sum + value, 0) / repAngles.length;

    return {
        minDeepestAngle: Math.round(min),
        maxDeepestAngle: Math.round(max),
        averageDeepestAngle: Math.round(average),
    };
}

export function buildSquatCoachStats({
    totalGood,
    totalBad,
    totalAttempts,
    accuracy,
    sessionDuration,
    setResults,
    reasonCounts,
    repAngles,
    totalSets,
    totalRepsPerSet,
    restTimeSetting,
}) {
    const incorrectReasonCounts = Array.isArray(reasonCounts)
        ? Object.fromEntries(reasonCounts)
        : (reasonCounts || {});

    const setSummaries = (setResults || []).map((set) => ({
        setNumber: set.setNum,
        goodReps: set.goodReps,
        incorrectReps: set.badReps,
        duration: set.duration,
        accuracy: set.goodReps + set.badReps > 0
            ? Math.round((set.goodReps / (set.goodReps + set.badReps)) * 100)
            : 0,
    }));

    return {
        validReps: totalGood,
        incorrectReps: totalBad,
        totalAttempts,
        accuracy,
        sessionDuration,
        setSummaries,
        incorrectReasonCounts,
        angleStats: buildAngleStats(repAngles),
        totalSets,
        totalRepsPerSet,
        restTimeSetting,
    };
}

export async function fetchSquatCoachFeedback(stats) {
    const response = await axios.post(AI_FEEDBACK_URL, { stats }, { timeout: 25000 });
    return normalizeFeedback(response.data?.feedback);
}
