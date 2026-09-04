import { calculateAngle } from '../../utils/angleUtils';
import { SIT_UP_LANDMARKS } from './sitUpConfig';
import { SIT_UP_HIP, SIT_UP_KNEE, SIT_UP_POSITION, SIT_UP_VISIBILITY } from './sitUpThresholds';

function averageVisibility(landmarks, indices) {
  return indices.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0) / indices.length;
}

function sideReady(landmarks, side) {
  const points = SIT_UP_LANDMARKS[side];
  return [points.shoulder, points.hip, points.knee, points.ankle].every(
    (index) => (landmarks[index]?.visibility ?? 0) >= SIT_UP_VISIBILITY.required
  );
}

function selectSide(landmarks) {
  const score = (side) => {
    const points = SIT_UP_LANDMARKS[side];
    return averageVisibility(landmarks, [points.shoulder, points.hip, points.knee, points.ankle]);
  };
  return score('left') >= score('right') ? 'left' : 'right';
}

export function validateSitUpPosition(landmarks) {
  if (!landmarks || landmarks.length < 33) return { status: 'no_person' };
  if (!sideReady(landmarks, 'left') && !sideReady(landmarks, 'right')) return { status: 'full_body_required' };
  const sideName = selectSide(landmarks);
  const side = SIT_UP_LANDMARKS[sideName];
  const bodySpan = Math.hypot(
    landmarks[side.ankle].x - landmarks[side.shoulder].x,
    landmarks[side.ankle].y - landmarks[side.shoulder].y
  );
  if (bodySpan < SIT_UP_POSITION.minBodySpan) return { status: 'full_body_required', side: sideName };
  const spreads = [];
  if ((landmarks[11]?.visibility ?? 0) >= SIT_UP_VISIBILITY.sidePair && (landmarks[12]?.visibility ?? 0) >= SIT_UP_VISIBILITY.sidePair) {
    spreads.push(Math.abs(landmarks[11].x - landmarks[12].x));
  }
  if ((landmarks[23]?.visibility ?? 0) >= SIT_UP_VISIBILITY.sidePair && (landmarks[24]?.visibility ?? 0) >= SIT_UP_VISIBILITY.sidePair) {
    spreads.push(Math.abs(landmarks[23].x - landmarks[24].x));
  }
  const leftVisibility = averageVisibility(landmarks, [11, 23, 25, 27]);
  const rightVisibility = averageVisibility(landmarks, [12, 24, 26, 28]);
  if (spreads.length === 0 && Math.abs(leftVisibility - rightVisibility) < 0.15) return { status: 'turn_sideways', side: sideName };
  if (spreads.length && Math.max(...spreads) / bodySpan > SIT_UP_POSITION.maxSideProfileWidthRatio) return { status: 'turn_sideways', side: sideName };
  return { status: 'ready', side: sideName };
}

export function classifySitUpPhase(hipAngle) {
  if (hipAngle >= SIT_UP_HIP.startMin) return 'start';
  if (hipAngle < SIT_UP_HIP.topMax) return 'top';
  return 'transition';
}

export function isSitUpKneeValid(kneeAngle) {
  return kneeAngle >= SIT_UP_KNEE.min && kneeAngle <= SIT_UP_KNEE.max;
}

export function analyzeSitUp(landmarks, preferredSide = null) {
  if (validateSitUpPosition(landmarks).status !== 'ready') return null;
  const sideName = preferredSide && sideReady(landmarks, preferredSide) ? preferredSide : selectSide(landmarks);
  const side = SIT_UP_LANDMARKS[sideName];
  const hipAngle = calculateAngle(landmarks[side.shoulder], landmarks[side.hip], landmarks[side.knee]);
  const kneeAngle = calculateAngle(landmarks[side.hip], landmarks[side.knee], landmarks[side.ankle]);
  const phase = classifySitUpPhase(hipAngle);
  const kneeValid = isSitUpKneeValid(kneeAngle);
  let classification = phase === 'top' && kneeValid ? 'good' : 'adjust';
  let feedback = phase === 'start' ? 'Engage your core and rise with control.' : phase === 'top' ? 'Good height. Lower with control.' : 'Raise your upper body further.';
  let feedbackDetail = `Hip angle ${Math.round(hipAngle)}°. Reach below 90° at the top.`;
  if (!kneeValid) {
    classification = 'bad';
    feedback = 'Keep your knees stable.';
    feedbackDetail = `Knee angle ${Math.round(kneeAngle)}°. Keep it near ${SIT_UP_KNEE.target}°.`;
  }
  return {
    activeSide: sideName,
    hipAngle,
    kneeAngle,
    kneeValid,
    phase,
    classification,
    feedback,
    feedbackDetail,
    landmarks: {
      shoulder: landmarks[side.shoulder], hip: landmarks[side.hip], knee: landmarks[side.knee], ankle: landmarks[side.ankle],
    },
  };
}
