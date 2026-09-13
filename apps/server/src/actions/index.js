import { fakeCheck } from './fake-check.js'

// Every AI action a posting offers, by the kind that names it in the URL
// (POST /api/postings/:id/ai/:kind) and in the saved result. An action is one
// module exporting:
//
//   kind         URL segment and store key, e.g. 'cover-letter'
//   tools        'none' or 'web' (see ai/providers.js); never omitted
//   timeoutMs    how long the CLI may take
//   context      names from context.js the route must load first, e.g.
//                ['resumeText']; the route answers 400 with that entry's
//                sentence when the person has not supplied it yet
//   buildPrompt  (posting, context) -> the prompt; the posting is the feed
//                row plus descriptionText, status, legitimacy and ghostSignals
//   parse        (text) -> the result to save, or null for an unreadable reply
//
// Adding one is that module plus an entry in this list; the route, the
// store and the streamed progress come with it.
export const ACTIONS = Object.fromEntries([fakeCheck].map((action) => [action.kind, action]))
