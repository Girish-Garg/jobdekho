// Every call names a tool policy; there is no default, because a CLI's own
// default is every tool it has, and the prompt carries third-party text (a
// job description) that could tell an agent to read files and post them
// somewhere. The policies, and what they mean:
//   none  no tools at all: the model reads the prompt and answers
//   web   searching the web and nothing else: Claude Code gets WebSearch and
//         WebFetch, pre-approved because a one-shot call cannot ask and would
//         deny them silently; Antigravity gets search_web alone (agy-agent.js);
//         Ollama gets web_search and web_fetch, which JobDekho runs for it
//         (ollama-web-tools.js)
//
// A CLI honours a policy or it does not, and honouring one means being able
// to hand the call exactly that set of tools. A CLI that cannot is not a
// second choice for the action but no choice at all (see select.js).
export const TOOL_POLICIES = ['none', 'web']

// An unknown policy is a programming error, and the safe failure is no call
// at all rather than a call with whatever the CLI would have defaulted to.
// A known policy this CLI cannot honour is a different thing: the ordinary
// case of asking the wrong CLI, answered with null rather than a throw.
function known(tools) {
  if (!TOOL_POLICIES.includes(tools)) throw new Error(`unknown tool policy "${tools}", expected one of ${TOOL_POLICIES.join(', ')}`)
  return tools
}

// The part of a provider that turns a policy into arguments. `base` is the
// one-shot mode, `byPolicy` what each honoured policy adds to it; a policy
// missing from the table is one this CLI cannot honour. `env`, for a CLI
// that needs variables of its own, is set on every call whatever the policy
// (see over-process.js).
export function underPolicies({ base, byPolicy, env = null }) {
  const honours = (tools) => byPolicy[known(tools)] !== undefined
  return {
    policies: TOOL_POLICIES.filter(honours),
    supports: honours,
    promptArgs: (tools) => (honours(tools) ? [...base, ...byPolicy[tools]] : null),
    ...(env ? { env } : {}),
  }
}
