// The CLI that will answer an action under a tool policy: the first listed
// that is installed, runs and can honour it. The server makes the same
// choice in the same order (ai/select.js), so copy that names the CLI here
// names the one that will actually run. `policies` comes with each provider
// from the server, so nothing here knows which CLI can do what.
export function providerFor(providers, policy) {
  return providers.find((p) => p.present && p.runs && p.policies.includes(policy)) ?? null;
}
