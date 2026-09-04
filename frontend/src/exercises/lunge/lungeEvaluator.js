import { calculateAngle } from '../../utils/angleUtils';
import { LUNGE_LANDMARKS } from './lungeConfig';
import { LUNGE_DEPTH, LUNGE_POSITION, LUNGE_VISIBILITY } from './lungeThresholds';

function visibility(landmarks, indices) {
  return indices.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0) / indices.length;
}

function legReady(landmarks, side, minimum = LUNGE_VISIBILITY.required) {
  const leg = LUNGE_LANDMARKS[side];
  return [leg.hip, leg.knee, leg.ankle].every((index) => (landmarks[index]?.visibility ?? 0) >= minimum);
}

export function validateLungePosition(landmarks) {
  if (!landmarks || landmarks.length < 33) return { status: 'no_person' };
  const leftReady = legReady(landmarks, 'left');
  const rightReady = legReady(landmarks, 'right');
  const shoulderReady = Math.max(landmarks[11]?.visibility ?? 0, landmarks[12]?.visibility ?? 0) >= LUNGE_VISIBILITY.required;
  if ((!leftReady && !rightReady) || !shoulderReady) return { status: 'full_body_required' };

  const availableSide = leftReady ? 'left' : 'right';
  const side = LUNGE_LANDMARKS[availableSide];
  const bodySpan = Math.hypot(
    landmarks[side.ankle].x - landmarks[side.shoulder].x,
    landmarks[side.ankle].y - landmarks[side.shoulder].y
  );
  if (bodySpan < LUNGE_POSITION.minBodySpan) return { status: 'full_body_required' };

  const shoulderPairReady = (landmarks[11]?.visibility ?? 0) >= LUNGE_VISIBILITY.sidePair
    && (landmarks[12]?.visibility ?? 0) >= LUNGE_VISIBILITY.sidePair;
  const hipPairReady = (landmarks[23]?.visibility ?? 0) >= LUNGE_VISIBILITY.sidePair
    && (landmarks[24]?.visibility ?? 0) >= LUNGE_VISIBILITY.sidePair;
  const spreads = [];
  if (shoulderPairReady) spreads.push(Math.abs(landmarks[11].x - landmarks[12].x));
  if (hipPairReady) spreads.push(Math.abs(landmarks[23].x - landmarks[24].x));
  const leftVisibility = visibility(landmarks, [11, 23, 25, 27]);
  const rightVisibility = visibility(landmarks, [12, 24, 26, 28]);
  if (spreads.length === 0 && Math.abs(leftVisibility - rightVisibility) < 0.15) {
    return { status: 'turn_sideways' };
  }
  if (spreads.length > 0 && Math.max(...spreads) / bodySpan > LUNGE_POSITION.maxSideProfileWidthRatio) {
    return { status: 'turn_sideways' };
  }
  return { status: 'ready' };
}

export function classifyLungeDepth(kneeAngle) {
  if (kneeAngle < LUNGE_DEPTH.goodMin) return 'too_deep';
  if (kneeAngle <= LUNGE_DEPTH.goodMax) return 'good';
  return 'shallow';
}

export function classifyLungePhase(kneeAngle) {
  if (kneeAngle >= LUNGE_DEPTH.startMin) return 'start';
  if (kneeAngle <= LUNGE_DEPTH.goodMax) return 'bottom';
  return 'transition';
}

function kneeAngle(landmarks, side) {
  const leg = LUNGE_LANDMARKS[side];
  return calculateAngle(landmarks[leg.hip], landmarks[leg.knee], landmarks[leg.ankle]);
}

export function inferLungeFrontLeg(landmarks, leftAngle, rightAngle) {
  const nose = landmarks[LUNGE_LANDMARKS.nose];
  const shouldersX = (landmarks[11].x + landmarks[12].x) / 2;
  if ((nose?.visibility ?? 0) >= LUNGE_VISIBILITY.sidePair && legReady(landmarks, 'left') && legReady(landmarks, 'right')) {
    const facingRight = nose.x >= shouldersX;
    const leftAnkleX = landmarks[LUNGE_LANDMARKS.left.ankle].x;
    const rightAnkleX = landmarks[LUNGE_LANDMARKS.right.ankle].x;
    return facingRight
      ? (leftAnkleX >= rightAnkleX ? 'left' : 'right')
      : (leftAnkleX <= rightAnkleX ? 'left' : 'right');
  }
  if (leftAngle === null) return 'right';
  if (rightAngle === null) return 'left';
  return Math.abs(leftAngle - LUNGE_DEPTH.target) <= Math.abs(rightAngle - LUNGE_DEPTH.target) ? 'left' : 'right';
}

export function analyzeLunge(landmarks, preferredSide = null) {
  if (validateLungePosition(landmarks).status !== 'ready') return null;
  const leftAngle = legReady(landmarks, 'left') ? kneeAngle(landmarks, 'left') : null;
  const rightAngle = legReady(landmarks, 'right') ? kneeAngle(landmarks, 'right') : null;
  let frontLeg = preferredSide && legReady(landmarks, preferredSide)
    ? preferredSide
    : inferLungeFrontLeg(landmarks, leftAngle, rightAngle);
  if ((frontLeg === 'left' ? leftAngle : rightAngle) === null) frontLeg = frontLeg === 'left' ? 'right' : 'left';
  const frontKneeAngle = frontLeg === 'left' ? leftAngle : rightAngle;
  const depthClass = classifyLungeDepth(frontKneeAngle);
  const phase = classifyLungePhase(frontKneeAngle);
  let classification = phase === 'bottom' ? (depthClass === 'good' ? 'good' : 'bad') : 'adjust';
  let feedback = phase === 'start' ? 'Step forward and lower with control.' : 'Lower your body further.';
  if (phase === 'bottom' && depthClass === 'good') feedback = 'Good depth. Return to standing.';
  if (depthClass === 'too_deep') feedback = 'Avoid lowering excessively.';

  const leg = LUNGE_LANDMARKS[frontLeg];
  return {
    frontLeg,
    frontKneeAngle,
    leftAngle,
    rightAngle,
    depthClass,
    phase,
    classification,
    feedback,
    feedbackDetail: `Front knee angle ${Math.round(frontKneeAngle)}°. Target approximately 90° (${LUNGE_DEPTH.goodMin}°–${LUNGE_DEPTH.goodMax}°).`,
    landmarks: {
      hip: landmarks[leg.hip],
      knee: landmarks[leg.knee],
      ankle: landmarks[leg.ankle],
    },
  };
}
