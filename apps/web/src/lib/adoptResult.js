import { withDefaults } from './emptyProfile.js';

// The upload is the one write the server makes outside the save: it keeps
// the resume's text and file and names the file. Its answer is the whole
// stored profile, but only the name in it is new, so only the name is
// taken, into the form and into the saved copy alike. Replacing the record
// with the answer would revert whatever the person had edited and not yet
// saved, the silent overwrite the record exists to rule out. Fill in from
// resume writes nothing on the server at all: what it finds is reviewed
// beside the record (see resumeReview.js) and saved like a hand edit.
export function adoptResult(previous, result) {
  return { ...withDefaults(previous), resumeName: result?.resumeName ?? null };
}
