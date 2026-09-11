import catalog from './formIssueCatalog.json';

const key = (value) => String(value || '').trim().toLowerCase().replace(/[.!]+$/, '');

// Normalize recorded attempt/episode counts, never individual camera frames.
export function normalizeFormIssues(raw = [], exercise = '') {
  const exerciseId = ({ pushup: 'push-up', legraise: 'leg-raise' })[exercise] || exercise;
  const definitions = catalog[exerciseId] || [];
  const entries = Array.isArray(raw) ? raw : Object.entries(raw || {}).map(([type, count]) => ({ type, count }));
  const grouped = new Map();
  entries.forEach((entry) => {
    const type = String(entry?.type || entry?.label || '').trim();
    const count = Math.floor(Number(entry?.count));
    if (!type || !Number.isFinite(count) || count <= 0) return;
    const definition = definitions.find((item) => item.issueId === entry.issueId
      || [item.label, ...item.aliases].some((alias) => key(alias) === key(type)));
    const issueId = definition?.issueId || `${exerciseId}:recorded:${key(type)}`;
    const previous = grouped.get(issueId);
    grouped.set(issueId, {
      issueId, exercise: exerciseId,
      type: definition?.label || type,
      label: definition?.label || type,
      advice: definition?.advice || 'Follow the exercise guidance and complete the movement with control.',
      count: (previous?.count || 0) + count,
    });
  });
  return [...grouped.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
