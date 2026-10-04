// The exact (Clopper-Pearson) one-sided lower bound on a precision, from
// `right` correct outputs of `n` checked: the smallest true precision p
// under which seeing `right` or more correct would still have a chance of
// at least alpha. Claiming "98% with 95% confidence" means this bound, at
// alpha 0.05, is at least 0.98: 0 wrong in 150 does it, or 1 in 236.
function logChoose(n, k) {
  let s = 0
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i)
  return s
}

// P(X >= right) for X ~ Binomial(n, p).
export function upperTail(n, right, p) {
  if (right <= 0) return 1
  if (p <= 0) return 0
  if (p >= 1) return 1
  let sum = 0
  for (let k = right; k <= n; k++) sum += Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p))
  return Math.min(1, sum)
}

export function lowerBound(n, right, alpha = 0.05) {
  if (n <= 0) return 0
  if (right <= 0) return 0
  let lo = 0
  let hi = 1
  // The tail grows with p, so bisect for the p where it reaches alpha.
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (upperTail(n, right, mid) < alpha) lo = mid
    else hi = mid
  }
  return lo
}

export function auditResult(verdicts, alpha = 0.05) {
  const checked = verdicts.length
  const right = verdicts.filter((v) => v === 'right').length
  const bound = lowerBound(checked, right, alpha)
  return { checked, right, wrong: checked - right, precision: checked ? right / checked : null, lowerBound: bound, passed: bound >= 0.98 }
}
