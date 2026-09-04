import { PLANK_LANDMARKS } from './plankConfig';
import { buildPlankFeedback } from './plankFeedback';
import { PLANK_ALIGNMENT, PLANK_POSITION } from './plankThresholds';

function averageVisibility(landmarks, indices) {
  return indices.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0) / indices.length;
}

function distance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pairedHorizontalSpread(landmarks, firstIndex, secondIndex) {
  const first = landmarks[firstIndex];
  const second = landmarks[secondIndex];
  if (
    (first?.visibility ?? 0) < PLANK_POSITION.pairedLandmarkVisibility
    || (second?.visibility ?? 0) < PLANK_POSITION.pairedLandmarkVisibility
  ) return null;
  return Math.abs(first.x - second.x);
}

function selectActiveSide(landmarks) {
  const left = PLANK_LANDMARKS.left;
  const right = PLANK_LANDMARKS.right;
  const leftVisibility = averageVisibility(landmarks, [left.shoulder, left.hip, left.ankle]);
  const rightVisibility = averageVisibility(landmarks, [right.shoulder, right.hip, right.ankle]);
  return leftVisibility >= rightVisibility ? 'left' : 'right';
}

// A directed angle is required because the documented range extends beyond 180°.
// Mirroring the camera side keeps hip-drop below 170° and raised hips above 210°.
export function calculatePlankBodyAngle(shoulder, hip, ankle) {
  const shoulderDirection = Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x);
  const ankleDirection = Math.atan2(ankle.y - hip.y, ankle.x - hip.x);
  let angle = ((ankleDirection - shoulderDirection) * 180) / Math.PI;
  angle = (angle + 360) % 360;

  if (shoulder.x > ankle.x) {
    angle = (360 - angle) % 360;
  }
  return angle;
}

export function classifyPlankAngle(angle) {
  if (angle < PLANK_ALIGNMENT.goodMin) return 'low';
  if (angle > PLANK_ALIGNMENT.goodMax) return 'high';
  return 'good';
}

export function checkPlankBodyReadiness(landmarks) {
  if (!landmarks || landmarks.length < 33) return 'no_person';

  const left = PLANK_LANDMARKS.left;
  const right = PLANK_LANDMARKS.right;
  const leftReady = [left.shoulder, left.hip, left.ankle].every(
    (index) => (landmarks[index]?.visibility ?? 0) >= PLANK_ALIGNMENT.readinessVisibility
  );
  const rightReady = [right.shoulder, right.hip, right.ankle].every(
    (index) => (landmarks[index]?.visibility ?? 0) >= PLANK_ALIGNMENT.readinessVisibility
  );

  return leftReady || rightReady ? 'ready' : 'too_close';
}

export function calculateBodyOrientation(shoulder, ankle) {
  const dx = Math.abs(ankle.x - shoulder.x);
  const dy = Math.abs(ankle.y - shoulder.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function validatePlankPosition(landmarks) {
  const readiness = checkPlankBodyReadiness(landmarks);
  if (readiness === 'no_person') return { status: 'no_person' };
  if (readiness !== 'ready') return { status: 'full_body_required' };

  const activeSide = selectActiveSide(landmarks);
  const leftVisibility = averageVisibility(landmarks, [
    PLANK_LANDMARKS.left.shoulder,
    PLANK_LANDMARKS.left.hip,
    PLANK_LANDMARKS.left.ankle,
  ]);
  const rightVisibility = averageVisibility(landmarks, [
    PLANK_LANDMARKS.right.shoulder,
    PLANK_LANDMARKS.right.hip,
    PLANK_LANDMARKS.right.ankle,
  ]);
  const active = PLANK_LANDMARKS[activeSide];
  const shoulder = landmarks[active.shoulder];
  const hip = landmarks[active.hip];
  const ankle = landmarks[active.ankle];
  const bodyAxisLength = distance(shoulder, ankle);

  if (bodyAxisLength < PLANK_POSITION.minBodyAxisLength) {
    return { status: 'full_body_required', activeSide, bodyAxisLength };
  }

  const shoulderSpread = pairedHorizontalSpread(
    landmarks,
    PLANK_LANDMARKS.left.shoulder,
    PLANK_LANDMARKS.right.shoulder
  );
  const hipSpread = pairedHorizontalSpread(
    landmarks,
    PLANK_LANDMARKS.left.hip,
    PLANK_LANDMARKS.right.hip
  );
  const reliableSpreads = [shoulderSpread, hipSpread].filter((value) => value !== null);
  const sideVisibilityDifference = Math.abs(leftVisibility - rightVisibility);
  if (reliableSpreads.length === 0 && sideVisibilityDifference < 0.15) {
    return { status: 'turn_sideways', activeSide, bodyAxisLength };
  }

  const sideProfileWidthRatio = reliableSpreads.length > 0
    ? Math.max(...reliableSpreads) / bodyAxisLength
    : 0;
  if (sideProfileWidthRatio > PLANK_POSITION.maxSideProfileWidthRatio) {
    return { status: 'turn_sideways', activeSide, bodyAxisLength, sideProfileWidthRatio };
  }

  const bodyOrientation = calculateBodyOrientation(shoulder, ankle);
  const shoulderHipVerticalRatio = Math.abs(shoulder.y - hip.y) / bodyAxisLength;
  const hipAnkleVerticalRatio = Math.abs(hip.y - ankle.y) / bodyAxisLength;
  const horizontallyOriented = bodyOrientation <= PLANK_POSITION.maxHorizontalAngle;
  const segmentsSuitable = shoulderHipVerticalRatio <= PLANK_POSITION.maxSegmentVerticalRatio
    && hipAnkleVerticalRatio <= PLANK_POSITION.maxSegmentVerticalRatio;

  if (!horizontallyOriented || !segmentsSuitable) {
    return {
      status: 'get_into_plank',
      activeSide,
      bodyAxisLength,
      bodyOrientation,
      sideProfileWidthRatio,
      shoulderHipVerticalRatio,
      hipAnkleVerticalRatio,
    };
  }

  return {
    status: 'candidate',
    activeSide,
    bodyAxisLength,
    bodyOrientation,
    sideProfileWidthRatio,
    shoulderHipVerticalRatio,
    hipAnkleVerticalRatio,
  };
}

export function analyzePlank(landmarks) {
  if (!landmarks || landmarks.length < 33) return null;

  const left = PLANK_LANDMARKS.left;
  const right = PLANK_LANDMARKS.right;
  const leftVisibility = averageVisibility(landmarks, [left.shoulder, left.hip, left.ankle]);
  const rightVisibility = averageVisibility(landmarks, [right.shoulder, right.hip, right.ankle]);
  const activeSide = selectActiveSide(landmarks);
  const active = PLANK_LANDMARKS[activeSide];

  if (Math.max(leftVisibility, rightVisibility) < PLANK_ALIGNMENT.sideVisibility) return null;

  const shoulder = landmarks[active.shoulder];
  const hip = landmarks[active.hip];
  const ankle = landmarks[active.ankle];
  const bodyAngle = calculatePlankBodyAngle(shoulder, hip, ankle);
  const classification = classifyPlankAngle(bodyAngle);
  const feedback = buildPlankFeedback(classification, bodyAngle);

  return {
    activeSide,
    bodyAngle,
    classification,
    ...feedback,
    landmarks: { shoulder, hip, ankle },
  };
}
