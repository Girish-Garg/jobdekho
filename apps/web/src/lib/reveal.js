// Things that arrive as they come into view: a page's sections as it opens,
// cards and rows as they scroll in, each once, a beat after the one before
// in the same batch. One IntersectionObserver for the whole app watches every
// element marked data-reveal, and a MutationObserver hands it the ones React
// adds later, so no component wires anything. Only opacity and transform
// move (motion.css), which the compositor draws without repainting.
//
// Nothing is hidden until this is installed (html gets data-reveal-ready),
// so without it, or with effects off, every element is simply there.
const SELECTOR = '[data-reveal]';
const STAGGER_CAP = 6;

export function installReveal(win = globalThis.window) {
  const doc = win?.document;
  if (!doc || typeof win.IntersectionObserver !== 'function' || typeof win.MutationObserver !== 'function') return null;
  if (doc.documentElement.dataset.effects === 'off') return null;
  // Once is enough: Settings calls this again when effects come back on.
  if (doc.documentElement.hasAttribute('data-reveal-ready')) return null;

  const seen = new WeakSet();
  const shown = new win.IntersectionObserver((entries) => {
    let i = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.style.setProperty('--reveal-i', String(Math.min(i, STAGGER_CAP)));
      entry.target.setAttribute('data-revealed', '');
      shown.unobserve(entry.target);
      i += 1;
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

  const watch = (root) => {
    if (root.nodeType !== 1) return;
    const found = root.matches(SELECTOR) ? [root] : [];
    for (const el of [...found, ...root.querySelectorAll(SELECTOR)]) {
      if (!seen.has(el)) {
        seen.add(el);
        shown.observe(el);
      }
    }
  };

  const added = new win.MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach(watch);
  });
  added.observe(doc.body, { childList: true, subtree: true });
  watch(doc.body);
  doc.documentElement.setAttribute('data-reveal-ready', '');

  return () => {
    added.disconnect();
    shown.disconnect();
    doc.documentElement.removeAttribute('data-reveal-ready');
  };
}
