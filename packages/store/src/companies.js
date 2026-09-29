// Every company with at least one posting, once each, so the chat can spot a
// company a question names (see apps/server/src/chat/question-search.js).
// Read off the in-memory corpus on each call: scanning a few thousand rows
// costs less than a cache that has to be kept in step with every scrape.
export function listCompanies(store) {
  const names = new Set()
  for (const { company } of store.corpus.rows()) if (company) names.add(company)
  return [...names]
}
