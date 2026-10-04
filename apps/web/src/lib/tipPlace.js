// Where an evidence tip opens (components/TagChip.jsx). Drawn under its
// value from the value's start edge, it was cut off wherever the box that
// clips it ended first: under the job pane's footer for a chip low in the
// pane's scroll, past the pane's edge for one in its right-hand column. So
// it opens the other way when the side it would open to has no room and the
// other side has more.
const GAP = 6;

// { up, end } from the value's box, the tip's size and the clipping box,
// all in viewport pixels. `align` is the edge the tip lines up with when it
// fits there: 'start' or 'end'.
export function tipPlace(host, tip, box, align = 'start') {
  const below = box.bottom - host.bottom;
  const above = host.top - box.top;
  const up = below < tip.height + GAP && above > below;
  const fitsStart = host.left + tip.width <= box.right;
  const fitsEnd = host.right - tip.width >= box.left;
  const end = align === 'end' ? fitsEnd || !fitsStart : !fitsStart && fitsEnd;
  return { up, end };
}

// The part of the viewport no ancestor clips: each scrolling or clipping
// ancestor narrows it.
function clipBox(el) {
  const box = { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (!/auto|scroll|hidden|clip/.test(`${overflowX} ${overflowY}`)) continue;
    const r = node.getBoundingClientRect();
    box.top = Math.max(box.top, r.top);
    box.left = Math.max(box.left, r.left);
    box.bottom = Math.min(box.bottom, r.bottom);
    box.right = Math.min(box.right, r.right);
  }
  return box;
}

// Read while the tip is still hidden: it is laid out all the same, so its
// size is known before it shows.
export function measureTip(hostEl, tipEl, align) {
  return tipPlace(hostEl.getBoundingClientRect(), { width: tipEl.offsetWidth, height: tipEl.offsetHeight }, clipBox(hostEl), align);
}
