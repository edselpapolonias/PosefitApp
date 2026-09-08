import { calculateAngle } from '../../utils/angleUtils';
import { LEG_RAISE_LANDMARKS } from './legRaiseConfig';
import {
  LEG_RAISE_HIP,
  LEG_RAISE_KNEE,
  LEG_RAISE_POSITION,
  LEG_RAISE_VISIBILITY,
} from './legRaiseThresholds';

function averageVisibility(landmarks, indices) {
  return indices.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0) / indices.length;
}

function sideReady(landmarks, side) {
  const points = LEG_RAISE_LANDMARKS[side];
  return [points.shoulder, points.hip, points.knee, points.ankle].every(
    (index) => (landmarks[index]?.visibility ?? 0) >= LEG_RAISE_VISIBILITY.required
  );
}

function selectSide(landmarks) {
  const score = (side) => {
    const points = LEG_RAISE_LANDMARKS[side];
    return averageVisibility(landmarks, [points.shoulder, points.hip, points.knee, points.ankle]);
  };
  return score('left') >= score('right') ? 'left' : 'right';
}

export function validateLegRaisePosition(landmarks) {
  if (!landmarks || landmarks.length < 33) return { status: 'no_person' };
  if (!sideReady(landmarks, 'left') && !sideReady(landmarks, 'right')) return { status: 'full_body_required' };

  const sideName = selectSide(landmarks);
  const side = LEG_RAISE_LANDMARKS[sideName];
  const bodySpan = Math.hypot(
    landmarks[side.ankle].x - landmarks[side.shoulder].x,
    landmarks[side.ankle].y - landmarks[side.shoulder].y
  );
  if (bodySpan < LEG_RAISE_POSITION.minBodySpan) return { status: 'full_body_required', side: sideName };

  const spreads = [];
  if ((landmarks[11]?.visibility ?? 0) >= LEG_RAISE_VISIBILITY.sidePair && (landmarks[12]?.visibility ?? 0) >= LEG_RAISE_VISIBILITY.sidePair) {
    spreads.push(Math.abs(landmarks[11].x - landmarks[12].x));
  }
  if ((landmarks[23]?.visibility ?? 0) >= LEG_RAISE_VISIBILITY.sidePair && (landmarks[24]?.visibility ?? 0) >= LEG_RAISE_VISIBILITY.sidePair) {
    spreads.push(Math.abs(landmarks[23].x - landmarks[24].x));
  }
  const leftVisibility = averageVisibility(landmarks, [11, 23, 25, 27]);
  const rightVisibility = averageVisibility(landmarks, [12, 24, 26, 28]);
  if (spreads.length === 0 && Math.abs(leftVisibility - rightVisibility) < 0.15) return { status: 'turn_sideways', side: sideName };
  if (spreads.length && Math.max(...spreads) / bodySpan > LEG_RAISE_POSITION.maxSideProfileWidthRatio) return { status: 'turn_sideways', side: sideName };
  return { status: 'ready', side: sideName };
}

export function hipAngleToFlexion(hipAngle) {
  return Math.max(0, Math.min(180, 180 - hipAngle));
}

export function classifyLegRaisePosition(hipFlexion) {
  if (hipFlexion <= LEG_RAISE_HIP.loweredMax) return 'lowered';
  if (hipFlexion < LEG_RAISE_HIP.effectiveMin) return 'raising';
  if (hipFlexion <= LEG_RAISE_HIP.effectiveMax) return 'valid_raised';
  return 'too_high';
}

export function isLegExtended(kneeAngle) {
  return kneeAngle >= LEG_RAISE_KNEE.extensionMin;
}

export function analyzeLegRaise(landmarks, preferredSide = null) {
  if (validateLegRaisePosition(landmarks).status !== 'ready') return null;
  const sideName = preferredSide && sideReady(landmarks, preferredSide) ? preferredSide : selectSide(landmarks);
  const side = LEG_RAISE_LANDMARKS[sideName];
  const rawHipAngle = calculateAngle(landmarks[side.shoulder], landmarks[side.hip], landmarks[side.knee]);
  const hipFlexion = hipAngleToFlexion(rawHipAngle);
  const kneeAngle = calculateAngle(landmarks[side.hip], landmarks[side.knee], landmarks[side.ankle]);
  const position = classifyLegRaisePosition(hipFlexion);
  const legExtended = isLegExtended(kneeAngle);

  let classification = position === 'valid_raised' && legExtended ? 'good' : 'adjust';
  let feedback = position === 'lowered'
    ? 'Raise your legs with control.'
    : position === 'valid_raised'
      ? 'Good Leg Raise.'
      : position === 'too_high'
        ? 'Avoid raising your legs too high.'
        : 'Raise your legs higher.';
  let feedbackDetail = `Hip flexion ${Math.round(hipFlexion)}°. Reach the 30°–60° target range.`;

  if (!legExtended) {
    classification = 'bad';
    feedback = 'Keep your knees straight.';
    feedbackDetail = `Knee angle ${Math.round(kneeAngle)}°. Keep it at or above ${LEG_RAISE_KNEE.extensionMin}°.`;
  }

  return {
    activeSide: sideName,
    rawHipAngle,
    hipFlexion,
    kneeAngle,
    legExtended,
    position,
    classification,
    feedback,
    feedbackDetail,
    landmarks: {
      shoulder: landmarks[side.shoulder],
      hip: landmarks[side.hip],
      knee: landmarks[side.knee],
      ankle: landmarks[side.ankle],
    },
  };
}
