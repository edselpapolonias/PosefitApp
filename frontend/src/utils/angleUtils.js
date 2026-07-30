// Computes angle at point B formed by vectors B->A and B->C.
export function calculateAngle(A, B, C) {
    const radians = Math.atan2(C.y - B.y, C.x - B.x)
        - Math.atan2(A.y - B.y, A.x - B.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}
