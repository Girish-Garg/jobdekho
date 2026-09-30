// Paints the live view's pictures. Decoding is asynchronous, so a picture can
// finish decoding after a newer one; the sequence number keeps an older
// picture from being drawn over a newer one (the page would seem to jump back).
export function framePainter() {
  let shown = 0;
  return async function paint(canvas, header, blob) {
    if (!canvas || typeof createImageBitmap !== 'function') return false;
    const bitmap = await createImageBitmap(blob);
    if (header.seq < shown) {
      bitmap.close();
      return false;
    }
    shown = header.seq;
    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close();
    return true;
  };
}

// Whether the page moved or changed size between two pictures, which is all
// the field highlights need to know; every other picture is left to the canvas.
export const sameView = (a, b) => Boolean(a && b) && a.w === b.w && a.h === b.h && a.sx === b.sx && a.sy === b.sy;
