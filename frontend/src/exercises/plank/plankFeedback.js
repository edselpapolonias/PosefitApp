export function buildPlankFeedback(classification, angle) {
  if (classification === 'low') {
    return {
      feedback: 'Raise Your Hips',
      feedbackDetail: `Body angle ${Math.round(angle)}°. Raise your hips slightly to restore a straight line.`,
    };
  }
  if (classification === 'high') {
    return {
      feedback: 'Lower Your Hips',
      feedbackDetail: `Body angle ${Math.round(angle)}°. Lower your hips slightly to restore a straight line.`,
    };
  }
  return {
    feedback: 'Good form! Keep holding.',
    feedbackDetail: `Body angle ${Math.round(angle)}°. Keep your body aligned and continue holding.`,
  };
}

export function getPlankVoiceCue(classification) {
  if (classification === 'low') return 'Raise your hips slightly.';
  if (classification === 'high') return 'Lower your hips slightly.';
  return 'Good form. Keep holding.';
}

export function getPlankIssue(classification) {
  if (classification === 'low') return 'Hips or lower back too low';
  if (classification === 'high') return 'Hips or back too high';
  return null;
}
