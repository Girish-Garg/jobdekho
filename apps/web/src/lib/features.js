// Parts of JobDekho that are built but switched off, and the one place that
// says so. Apply assist, the sandboxed browser that fills applications, is off
// (2026-10-01): a browser software drives is refused by Google's sign-in and
// is plain for sites to detect, and the owner found it unreliable. Its code
// and tests stay for when it is taken up again; VITE_APPLY_ASSIST=1 here and
// JOBDEKHO_APPLY_ASSIST=1 for the server (see its config.js) bring it back.
export const APPLY_ASSIST = import.meta.env?.VITE_APPLY_ASSIST === '1';
