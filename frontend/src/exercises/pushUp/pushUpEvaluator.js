import { calculateAngle } from '../../utils/angleUtils';
import { PUSH_UP_LANDMARKS } from './pushUpConfig';
import { PUSH_UP_ALIGNMENT, PUSH_UP_ELBOW, PUSH_UP_POSITION } from './pushUpThresholds';

function averageVisibility(landmarks, indices) {
  return indices.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0) / indices.length;
}

function selectActiveSide(landmarks) {
  const score = (side) => {
    const points = PUSH_UP_LANDMARKS[side];
    return averageVisibility(landmarks, [points.shoulder, points.elbow, points.wrist, points.hip, points.ankle]);
  };
  return score('left') >= score('right') ? 'left' : 'right';
}

function sideReady(landmarks, side) {
  const points = PUSH_UP_LANDMARKS[side];
  return [points.shoulder, points.elbow, points.wrist, points.hip, points.ankle].every(
    (index) => (landmarks[index]?.visibility ?? 0) >= PUSH_UP_ALIGNMENT.readinessVisibility
  );
}

function pairedHorizontalSpread(landmarks, firstIndex, secondIndex) {
  const first = landmarks[firstIndex];
  const second = landmarks[secondIndex];
  if (
    (first?.visibility ?? 0) < PUSH_UP_POSITION.pairedLandmarkVisibility
    || (second?.visibility ?? 0) < PUSH_UP_POSITION.pairedLandmarkVisibility
  ) return null;
  return Math.abs(first.x - second.x);
}

export function calculatePushUpOrientation(shoulder, ankle) {
  return (Math.atan2(Math.abs(ankle.y - shoulder.y), Math.abs(ankle.x - shoulder.x)) * 180) / Math.PI;
}

export function checkPushUpBodyReadiness(landmarks) {
  if (!landmarks || landmarks.length < 33) return 'no_person';
  return sideReady(landmarks, 'left') || sideReady(landmarks, 'right') ? 'ready' : 'full_body_required';
}

export function validatePushUpPosition(landmarks) {
  const readiness = checkPushUpBodyReadiness(landmarks);
  if (readiness !== 'ready') return { status: readiness };

  const activeSide = selectActiveSide(landmarks);
  const active = PUSH_UP_LANDMARKS[activeSide];
  const shoulder = landmarks[active.shoulder];
  const hip = landmarks[active.hip];
  const ankle = landmarks[active.ankle];
  const bodyAxisLength = Math.hypot(ankle.x - shoulder.x, ankle.y - shoulder.y);
  if (bodyAxisLength < PUSH_UP_POSITION.minBodyAxisLength) {
    return { status: 'full_body_required', activeSide, bodyAxisLength };
  }

  const left = PUSH_UP_LANDMARKS.left;
  const right = PUSH_UP_LANDMARKS.right;
  const leftVisibility = averageVisibility(landmarks, [left.shoulder, left.hip, left.ankle]);
  const rightVisibility = averageVisibility(landmarks, [right.shoulder, right.hip, right.ankle]);
  const spreads = [
    pairedHorizontalSpread(landmarks, left.shoulder, right.shoulder),
    pairedHorizontalSpread(landmarks, left.hip, right.hip),
  ].filter((value) => value !== null);
  const visibilityDifference = Math.abs(leftVisibility - rightVisibility);
  if (spreads.length === 0 && visibilityDifference < 0.15) {
    return { status: 'turn_sideways', activeSide, bodyAxisLength };
  }

  const sideProfileWidthRatio = spreads.length > 0 ? Math.max(...spreads) / bodyAxisLength : 0;
  if (sideProfileWidthRatio > PUSH_UP_POSITION.maxSideProfileWidthRatio) {
    return { status: 'turn_sideways', activeSide, bodyAxisLength, sideProfileWidthRatio };
  }

  const bodyOrientation = calculatePushUpOrientation(shoulder, ankle);
  const shoulderHipVerticalRatio = Math.abs(shoulder.y - hip.y) / bodyAxisLength;
  const hipAnkleVerticalRatio = Math.abs(hip.y - ankle.y) / bodyAxisLength;
  if (
    bodyOrientation > PUSH_UP_POSITION.maxHorizontalAngle
    || shoulderHipVerticalRatio > PUSH_UP_POSITION.maxSegmentVerticalRatio
    || hipAnkleVerticalRatio > PUSH_UP_POSITION.maxSegmentVerticalRatio
  ) {
    return {
      status: 'get_into_position',
      activeSide,
      bodyOrientation,
      sideProfileWidthRatio,
      shoulderHipVerticalRatio,
      hipAnkleVerticalRatio,
    };
  }

  return { status: 'ready', activeSide, bodyOrientation, sideProfileWidthRatio };
}

export function classifyElbowPhase(elbowAngle) {
  if (elbowAngle > PUSH_UP_ELBOW.topMin) return 'top';
  if (elbowAngle < PUSH_UP_ELBOW.bottomMax) return 'bottom';
  return 'transition';
}

export function isPushUpBodyAligned(bodyAngle) {
  return bodyAngle >= PUSH_UP_ALIGNMENT.bodyMin && bodyAngle <= PUSH_UP_ALIGNMENT.bodyMax;
}

export function arePushUpArmsBalanced(armDifference) {
  return armDifference < PUSH_UP_ALIGNMENT.maxArmDifference;
}

export function analyzePushUp(landmarks) {
  if (checkPushUpBodyReadiness(landmarks) !== 'ready') return null;

  const activeSide = selectActiveSide(landmarks);
  const active = PUSH_UP_LANDMARKS[activeSide];
  const left = PUSH_UP_LANDMARKS.left;
  const right = PUSH_UP_LANDMARKS.right;
  const elbowAngle = calculateAngle(
    landmarks[active.shoulder],
    landmarks[active.elbow],
    landmarks[active.wrist]
  );
  const bodyAngle = calculateAngle(
    landmarks[active.shoulder],
    landmarks[active.hip],
    landmarks[active.ankle]
  );
  const leftArmVisibility = averageVisibility(landmarks, [left.shoulder, left.elbow, left.wrist]);
  const rightArmVisibility = averageVisibility(landmarks, [right.shoulder, right.elbow, right.wrist]);
  const isBilateral = leftArmVisibility >= PUSH_UP_ALIGNMENT.bilateralVisibility
    && rightArmVisibility >= PUSH_UP_ALIGNMENT.bilateralVisibility;
  const leftElbowAngle = isBilateral
    ? calculateAngle(landmarks[left.shoulder], landmarks[left.elbow], landmarks[left.wrist])
    : null;
  const rightElbowAngle = isBilateral
    ? calculateAngle(landmarks[right.shoulder], landmarks[right.elbow], landmarks[right.wrist])
    : null;
  const armDifference = isBilateral ? Math.abs(leftElbowAngle - rightElbowAngle) : 0;
  const bodyAligned = isPushUpBodyAligned(bodyAngle);
  const armsBalanced = !isBilateral || arePushUpArmsBalanced(armDifference);
  const phase = classifyElbowPhase(elbowAngle);

  let classification = phase === 'transition' ? 'adjust' : 'good';
  let feedback = phase === 'bottom' ? 'Good depth. Push back up.' : phase === 'top' ? 'Ready. Lower with control.' : 'Lower your body further.';
  let feedbackDetail = `Elbow angle ${Math.round(elbowAngle)}°.`;
  if (!bodyAligned) {
    classification = 'bad';
    feedback = 'Keep your body straight.';
    feedbackDetail = `Body alignment is ${Math.round(bodyAngle)}°. Keep it between 160° and 180°.`;
  } else if (!armsBalanced) {
    classification = 'bad';
    feedback = 'Keep your arms balanced.';
    feedbackDetail = `Your arm angles differ by ${Math.round(armDifference)}°.`;
  }

  return {
    activeSide,
    elbowAngle,
    leftElbowAngle,
    rightElbowAngle,
    bodyAngle,
    armDifference,
    isBilateral,
    bodyAligned,
    armsBalanced,
    phase,
    classification,
    feedback,
    feedbackDetail,
    landmarks: {
      shoulder: landmarks[active.shoulder],
      elbow: landmarks[active.elbow],
      wrist: landmarks[active.wrist],
      hip: landmarks[active.hip],
      ankle: landmarks[active.ankle],
    },
  };
}
