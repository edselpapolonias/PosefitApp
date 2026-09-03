import axios from 'axios';
import { apiUrl } from './apiConfig';

const AI_FEEDBACK_URL = apiUrl('/api/users/exercise-coach-feedback/');

function normalizeText(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean).join(' ');
    }
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeFeedback(feedback) {
    if (!feedback || typeof feedback !== 'object') {
        return null;
    }

    const feedbackParagraph = normalizeText(feedback.feedbackParagraph) || [
        normalizeText(feedback.overallPerformance),
        normalizeText(feedback.whatYouDidWell || feedback.strengths),
        normalizeText(feedback.whatToImprove || feedback.areasForImprovement || feedback.recommendations),
    ].filter(Boolean).join(' ');

    return feedbackParagraph ? { feedbackParagraph } : null;
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
    const response = await axios.post(
        AI_FEEDBACK_URL,
        { exercise: 'squat', summary: stats },
        { timeout: 25000 }
    );
    return normalizeFeedback(response.data?.feedback);
}

export async function fetchSessionCoachFeedback(sessionResult) {
    if (sessionResult?.feedback) return sessionResult.feedback;

    const formIssues = sessionResult.formIssues || [];
    const mistakes = Object.fromEntries(
        formIssues
            .filter((issue) => issue?.type && Number(issue.count) > 0)
            .map((issue) => [issue.type, Number(issue.count)])
    );
    const totalAttempts = sessionResult.metricType === 'time'
        ? 0
        : (sessionResult.correctReps || 0) + (sessionResult.incorrectReps || 0);
    const summary = {
        metricType: sessionResult.metricType,
        totalReps: sessionResult.totalReps,
        correctReps: sessionResult.correctReps,
        incorrectReps: sessionResult.incorrectReps,
        totalAttempts,
        totalHoldTime: sessionResult.totalHoldTime,
        setsCompleted: sessionResult.setsCompleted,
        accuracy: sessionResult.accuracy,
        duration: sessionResult.duration,
        setResults: sessionResult.setResults || [],
        mistakes,
        angleStats: buildAngleStats(sessionResult.analysis?.repAngles || []),
        totalSets: sessionResult.config?.totalSets || 0,
        totalRepsPerSet: sessionResult.config?.repsPerSet || 0,
        restTimeSetting: sessionResult.config?.restSeconds || 0,
    };

    const response = await axios.post(
        AI_FEEDBACK_URL,
        {
            sessionId: sessionResult.id,
            exercise: sessionResult.exercise?.id || sessionResult.exercise?.name,
            summary,
        },
        { timeout: 25000 }
    );
    const feedback = normalizeFeedback(response.data?.feedback);
    if (!feedback) throw new Error('AI feedback returned an invalid response.');
    return feedback;
}
