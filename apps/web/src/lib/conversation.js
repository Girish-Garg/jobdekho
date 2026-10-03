// One chat's stream: its questions and answers, and every answer the
// posting actions gave in it for its job, in the order they happened.
// Each saved version of an action is its own entry, so a refine reads like a
// reply ("make it shorter", then the shorter letter) and the conversation is
// the version history rather than a strip of numbered buttons beside it.
//
//   { type: 'turn', key, at, turn }
//   { type: 'result', key, at, kind, record, latest }
//
// `record` is one version shaped like the saved record the result components
// already read ({ kind, provider, createdAt, result, instruction }); `latest`
// marks the newest of its kind, the only one a refine would change.

// A record from before versions existed carries only its one answer. The
// server already reads it as a one-entry history (see ai-results.js); this
// covers a record a test hands in directly.
export function versionsOf(record) {
  if (!record) return [];
  return record.versions ?? [{ instruction: '', provider: record.provider, createdAt: record.createdAt, result: record.result }];
}

function resultEntries(record) {
  const versions = versionsOf(record);
  return versions.map((version, i) => ({
    type: 'result',
    key: `${record.postingId}:${record.kind}:${i}:${version.createdAt}`,
    at: version.createdAt ?? '',
    kind: record.kind,
    record: { ...version, kind: record.kind },
    latest: i === versions.length - 1,
  }));
}

// Both kinds carry an ISO createdAt from the same clock, so a string compare
// orders them; sort() is stable, so two entries from the same instant keep
// the order they were given in.
export function buildConversation(turns = [], results = []) {
  const entries = [
    ...turns.map((turn, i) => ({ type: 'turn', key: `turn:${turn.createdAt ?? i}:${i}`, at: turn.createdAt ?? '', turn })),
    ...results.flatMap(resultEntries),
  ];
  return entries.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
