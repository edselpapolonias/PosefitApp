import {
  analyzePlank,
  calculatePlankBodyAngle,
  checkPlankBodyReadiness,
  classifyPlankAngle,
  validatePlankPosition,
} from './plankEvaluator';

function landmarksFor(shoulder, hip, ankle) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  landmarks[11] = { ...shoulder, visibility: 1 };
  landmarks[23] = { ...hip, visibility: 1 };
  landmarks[27] = { ...ankle, visibility: 1 };
  return landmarks;
}

function fullPose({ leftShoulder, rightShoulder, leftHip, rightHip, leftAnkle, rightAnkle }) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  landmarks[11] = { ...leftShoulder, visibility: 1 };
  landmarks[12] = { ...rightShoulder, visibility: 1 };
  landmarks[23] = { ...leftHip, visibility: 1 };
  landmarks[24] = { ...rightHip, visibility: 1 };
  landmarks[27] = { ...leftAnkle, visibility: 1 };
  landmarks[28] = { ...rightAnkle, visibility: 1 };
  return landmarks;
}

function sidePose({ reversed = false, shoulderY = 0.5, hipY = 0.5, ankleY = 0.5 } = {}) {
  const shoulderX = reversed ? 0.82 : 0.18;
  const ankleX = reversed ? 0.18 : 0.82;
  const sideOffset = reversed ? -0.012 : 0.012;
  return fullPose({
    leftShoulder: { x: shoulderX, y: shoulderY },
    rightShoulder: { x: shoulderX + sideOffset, y: shoulderY + 0.005 },
    leftHip: { x: 0.5, y: hipY },
    rightHip: { x: 0.5 + sideOffset, y: hipY + 0.005 },
    leftAnkle: { x: ankleX, y: ankleY },
    rightAnkle: { x: ankleX + sideOffset, y: ankleY + 0.005 },
  });
}

describe('Plank alignment evaluation', () => {
  test('uses the documented 170 to 210 degree valid range', () => {
    expect(classifyPlankAngle(169.9)).toBe('low');
    expect(classifyPlankAngle(170)).toBe('good');
    expect(classifyPlankAngle(210)).toBe('good');
    expect(classifyPlankAngle(210.1)).toBe('high');
  });

  test('keeps a straight body near 180 degrees when camera direction is mirrored', () => {
    const facingRight = calculatePlankBodyAngle(
      { x: 0.2, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.8, y: 0.5 }
    );
    const facingLeft = calculatePlankBodyAngle(
      { x: 0.8, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.2, y: 0.5 }
    );

    expect(facingRight).toBeCloseTo(180);
    expect(facingLeft).toBeCloseTo(180);
  });

  test('classifies hip drop and raised hips using the implementation-plan direction', () => {
    const low = analyzePlank(landmarksFor(
      { x: 0.2, y: 0.4 },
      { x: 0.5, y: 0.6 },
      { x: 0.8, y: 0.55 }
    ));
    const high = analyzePlank(landmarksFor(
      { x: 0.2, y: 0.5 },
      { x: 0.5, y: 0.35 },
      { x: 0.8, y: 0.5 }
    ));

    expect(low.classification).toBe('low');
    expect(high.classification).toBe('high');
  });

  test('requires a visible shoulder, hip, and ankle on at least one side', () => {
    expect(checkPlankBodyReadiness(null)).toBe('no_person');
    expect(checkPlankBodyReadiness(landmarksFor(
      { x: 0.2, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.8, y: 0.5 }
    ))).toBe('ready');
  });

  test('rejects a front-facing standing person before form evaluation', () => {
    const standingFront = fullPose({
      leftShoulder: { x: 0.35, y: 0.2 },
      rightShoulder: { x: 0.65, y: 0.2 },
      leftHip: { x: 0.42, y: 0.5 },
      rightHip: { x: 0.58, y: 0.5 },
      leftAnkle: { x: 0.43, y: 0.88 },
      rightAnkle: { x: 0.57, y: 0.88 },
    });

    expect(validatePlankPosition(standingFront).status).toBe('turn_sideways');
  });

  test('rejects standing sideways even when the body angle is straight', () => {
    const standingSideways = fullPose({
      leftShoulder: { x: 0.49, y: 0.18 },
      rightShoulder: { x: 0.51, y: 0.18 },
      leftHip: { x: 0.49, y: 0.5 },
      rightHip: { x: 0.51, y: 0.5 },
      leftAnkle: { x: 0.49, y: 0.86 },
      rightAnkle: { x: 0.51, y: 0.86 },
    });

    expect(analyzePlank(standingSideways).classification).toBe('good');
    expect(validatePlankPosition(standingSideways).status).toBe('get_into_plank');
  });

  test('accepts a horizontal side-view candidate facing either direction', () => {
    expect(validatePlankPosition(sidePose()).status).toBe('candidate');
    expect(validatePlankPosition(sidePose({ reversed: true })).status).toBe('candidate');
  });

  test('keeps hips-low and hips-high Planks inside the position gate for form feedback', () => {
    const hipsLow = sidePose({ shoulderY: 0.42, hipY: 0.61, ankleY: 0.54 });
    const hipsHigh = sidePose({ shoulderY: 0.5, hipY: 0.35, ankleY: 0.5 });

    expect(validatePlankPosition(hipsLow).status).toBe('candidate');
    expect(analyzePlank(hipsLow).classification).toBe('low');
    expect(validatePlankPosition(hipsHigh).status).toBe('candidate');
    expect(analyzePlank(hipsHigh).classification).toBe('high');
  });

  test('accepts a side profile when the far-side landmarks are partially occluded', () => {
    const sideView = sidePose();
    [12, 24, 28].forEach((index) => {
      sideView[index].visibility = 0.2;
    });

    expect(validatePlankPosition(sideView).status).toBe('candidate');
  });

  test('requires reliable full-body landmarks before accepting a candidate', () => {
    const incomplete = sidePose();
    incomplete[27].visibility = 0.2;
    incomplete[28].visibility = 0.2;

    expect(validatePlankPosition(incomplete).status).toBe('full_body_required');
  });
});
