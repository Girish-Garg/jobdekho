// The companies the person blocked (see the store's blocked-companies.js),
// by the run-together key the store matches on and by the name they read
// as. A dashboard without blocking (only seen in tests) has nothing blocked.
export async function blockedCompanies(dashboard, userId) {
  const entries = typeof dashboard.listBlockedCompanies === 'function' ? await dashboard.listBlockedCompanies(userId) : []
  return { keys: new Set(entries.map((entry) => entry.key)), names: entries.map((entry) => entry.name) }
}
