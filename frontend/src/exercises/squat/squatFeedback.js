import { SQUAT_DEPTH } from './squatThresholds';

export function getVoiceCue(analysis) {
    if (!analysis) return null;
    const { overallClass, avgAngle, phase } = analysis;

    if (phase === 'standing') return null;

    if (overallClass === 'good') {
        return 'Good squat! Hold it.';
    }
    if (overallClass === 'adjust') {
        return avgAngle < SQUAT_DEPTH.goodMin ? 'Slightly too deep. Rise up a bit.' : 'Almost there. Go a little lower.';
    }
    if (avgAngle < SQUAT_DEPTH.adjustDeepMin) {
        return 'Too deep! Rise up to protect your knees.';
    }
    return 'Go lower. Bend your knees more.';
}

export function buildSquatFeedback({ overallClass, avgAngle, isBilateral, leftAngle, rightAngle }) {
    let feedback = '';
    let feedbackDetail = '';

    if (overallClass === 'good') {
        feedback = 'Good Squat!';
        feedbackDetail = 'Knee angle 80°-100° - perfect depth. Keep your weight in your heels and chest up.';
    } else if (overallClass === 'adjust') {
        if (avgAngle < SQUAT_DEPTH.goodMin) {
            feedback = 'Slightly Too Deep';
            feedbackDetail = `Knee angle ${Math.round(avgAngle)}° - just a bit past parallel. Rise slightly to hit the 80°-100° target zone.`;
        } else {
            feedback = 'Go a Little Deeper';
            feedbackDetail = `Knee angle ${Math.round(avgAngle)}° - almost there! Bend your knees a bit more until thighs are parallel to the floor.`;
        }
        if (isBilateral && Math.abs(leftAngle - rightAngle) > SQUAT_DEPTH.unevenLegDifference) {
            const lagging = leftAngle > rightAngle ? 'left' : 'right';
            feedbackDetail += ` Your ${lagging} leg is lagging - try to keep both knees bending equally.`;
        }
    } else {
        if (avgAngle < SQUAT_DEPTH.adjustDeepMin) {
            feedback = 'Too Deep - Risk of Injury';
            feedbackDetail = `Knee angle ${Math.round(avgAngle)}° - over-flexion detected. Rise up to keep your knees safe. Target: 80°-100°.`;
        } else {
            feedback = 'Not Deep Enough';
            feedbackDetail = `Knee angle ${Math.round(avgAngle)}° - squat deeper to activate your glutes, quads, and hamstrings. Target: 80°-100°.`;
        }
        if (isBilateral && Math.abs(leftAngle - rightAngle) > SQUAT_DEPTH.unevenLegDifference) {
            const lagging = leftAngle > rightAngle ? 'left' : 'right';
            feedbackDetail += ` Your ${lagging} knee is not bending as much - check for equal weight distribution.`;
        }
    }

    return { feedback, feedbackDetail };
}

export function determineIncorrectReason(deepestAngle, formIssues) {
    const reasons = [];

    if (deepestAngle > SQUAT_DEPTH.adjustShallowMax) {
        reasons.push('Squat depth too shallow');
    } else if (deepestAngle > SQUAT_DEPTH.goodMax) {
        reasons.push('Not deep enough');
    } else if (deepestAngle < SQUAT_DEPTH.adjustDeepMin) {
        reasons.push('Too deep - risk of injury');
    } else if (deepestAngle < SQUAT_DEPTH.goodMin) {
        reasons.push('Slightly too deep');
    }

    if (formIssues.unevenLegs) {
        reasons.push('Uneven leg movement');
    }

    if (reasons.length === 0) {
        reasons.push('Poor form detected');
    }

    return reasons;
}
