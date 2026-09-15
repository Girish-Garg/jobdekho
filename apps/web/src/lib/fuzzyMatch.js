// Not true fuzzy scoring, just three cheap passes in order of confidence: a
// list this short (a few dozen commands at most) does not need a Levenshtein
// library, and a naive subsequence match on short labels throws too many
// false positives to be worth more than a fallback.
function scoreOf(command, needle) {
  const label = command.label.toLowerCase();
  const haystack = `${label} ${command.keywords || ''}`.toLowerCase();
  if (label.startsWith(needle)) return 3;
  if (haystack.includes(needle)) return 2;
  return isSubsequence(needle, haystack) ? 1 : 0;
}

function isSubsequence(needle, haystack) {
  let i = 0;
  for (const char of haystack) {
    if (char === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}

// Blank query keeps every command, in the order the caller built them, so the
// palette has something to show before anyone types.
export function matchCommands(commands, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands
    .map((command) => ({ command, score: scoreOf(command, needle) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.command);
}
