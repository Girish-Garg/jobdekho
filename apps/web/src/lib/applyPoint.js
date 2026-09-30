// A point on the live view, in the page's own CSS pixels. The picture is drawn
// at whatever width the panel has, almost never the page's, so a press travels
// as a ratio: 40 percent across the picture is 40 percent across the page.
// Getting this wrong would land the press on a different element than the one
// the person aimed at.
export function toPage(box, clientX, clientY, frame) {
  const scaleX = frame?.w > 0 && box.width > 0 ? frame.w / box.width : 1;
  const scaleY = frame?.h > 0 && box.height > 0 ? frame.h / box.height : 1;
  return {
    x: Math.round((clientX - box.left) * scaleX),
    y: Math.round((clientY - box.top) * scaleY),
  };
}

// A rectangle the server read in document pixels, placed on the picture: the
// page's scroll taken off, then scaled to the width the picture is drawn at.
export function toView(rect, frame, drawnWidth) {
  const scale = frame?.w > 0 ? drawnWidth / frame.w : 1;
  return {
    left: (rect.x - (frame?.sx ?? 0)) * scale,
    top: (rect.y - (frame?.sy ?? 0)) * scale,
    width: rect.w * scale,
    height: rect.h * scale,
  };
}
