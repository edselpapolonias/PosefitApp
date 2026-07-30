import { calculateAngle } from '../../utils/angleUtils';
import { LEFT_LEG_IDS, RIGHT_LEG_IDS, SQUAT_LANDMARKS } from './squatConfig';
import { SQUAT_DEPTH } from './squatThresholds';
import { buildSquatFeedback } from './squatFeedback';

export function checkBodyReadiness(poseLandmarks) {
    if (!poseLandmarks || poseLandmarks.length < 33) return 'no_person';

    const leftVisible = LEFT_LEG_IDS.every(
        (id) => (poseLandmarks[id]?.visibility ?? 0) >= SQUAT_DEPTH.readinessVisibility
    );
    const rightVisible = RIGHT_LEG_IDS.every(
        (id) => (poseLandmarks[id]?.visibility ?? 0) >= SQUAT_DEPTH.readinessVisibility
    );

    if (!leftVisible && !rightVisible) return 'too_close';
    return 'ready';
}

export function classifyKneeAngle(angle) {
    if (angle >= SQUAT_DEPTH.goodMin && angle <= SQUAT_DEPTH.goodMax) return 'good';
    if (
        (angle >= SQUAT_DEPTH.adjustDeepMin && angle <= SQUAT_DEPTH.adjustDeepMax) ||
        (angle >= SQUAT_DEPTH.adjustShallowMin && angle <= SQUAT_DEPTH.adjustShallowMax)
    ) {
        return 'adjust';
    }
    return 'bad';
}

export function analyzeSquatBilateral(landmarks) {
    if (!landmarks || landmarks.length < 33) return null;

    const lm = landmarks;
    const leftVis = (lm[SQUAT_LANDMARKS.leftHip].visibility + lm[SQUAT_LANDMARKS.leftKnee].visibility + lm[SQUAT_LANDMARKS.leftAnkle].visibility) / 3;
    const rightVis = (lm[SQUAT_LANDMARKS.rightHip].visibility + lm[SQUAT_LANDMARKS.rightKnee].visibility + lm[SQUAT_LANDMARKS.rightAnkle].visibility) / 3;
    const isBilateral = leftVis >= SQUAT_DEPTH.bilateralVisibility && rightVis >= SQUAT_DEPTH.bilateralVisibility;

    const leftAngle = calculateAngle(lm[SQUAT_LANDMARKS.leftHip], lm[SQUAT_LANDMARKS.leftKnee], lm[SQUAT_LANDMARKS.leftAnkle]);
    const rightAngle = calculateAngle(lm[SQUAT_LANDMARKS.rightHip], lm[SQUAT_LANDMARKS.rightKnee], lm[SQUAT_LANDMARKS.rightAnkle]);

    const leftClass = classifyKneeAngle(leftAngle);
    const rightClass = classifyKneeAngle(rightAngle);

    let overallClass;
    let avgAngle;
    let activeSide = 'both';

    if (isBilateral) {
        const classRank = { bad: 2, adjust: 1, good: 0 };
        overallClass = classRank[leftClass] >= classRank[rightClass] ? leftClass : rightClass;
        avgAngle = (leftAngle + rightAngle) / 2;
    } else {
        const useLeft = leftVis >= rightVis;
        activeSide = useLeft ? 'left' : 'right';
        overallClass = useLeft ? leftClass : rightClass;
        avgAngle = useLeft ? leftAngle : rightAngle;
    }

    let phase = 'standing';
    if (avgAngle <= SQUAT_DEPTH.goodMax) phase = 'bottom';
    else if (avgAngle <= 150) phase = 'descending';

    const { feedback, feedbackDetail } = buildSquatFeedback({
        overallClass,
        avgAngle,
        isBilateral,
        leftAngle,
        rightAngle,
    });

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
        isBilateral,
        activeSide,
        landmarks: {
            leftHip: lm[SQUAT_LANDMARKS.leftHip],
            leftKnee: lm[SQUAT_LANDMARKS.leftKnee],
            leftAnkle: lm[SQUAT_LANDMARKS.leftAnkle],
            rightHip: lm[SQUAT_LANDMARKS.rightHip],
            rightKnee: lm[SQUAT_LANDMARKS.rightKnee],
            rightAnkle: lm[SQUAT_LANDMARKS.rightAnkle],
        },
    };
}
