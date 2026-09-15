// The notice fires wherever the UI claims a ranking the server is not doing:
// the best-fit order, or a fit floor, which the server ignores when there is
// no profile to score against. A control that visibly does nothing reads as
// broken rather than as a step still to do.
//
// The rows themselves say whether the server ranked: fit rides every row when
// it did. An empty page cannot answer either way, and the no-matches copy
// already owns that state.
export function rankingNotice(filters, sort, rows) {
  const fitFiltered = Boolean(filters.minFit);
  const claimsRanking = sort === 'match' || fitFiltered;
  const serverRanked = rows.some((row) => Number.isInteger(row.fit));
  return { fitFiltered, unranked: claimsRanking && rows.length > 0 && !serverRanked };
}
