// Text onto the clipboard: the clipboard API first, and the older way for a
// browser that refuses it (an embedded view, a denied permission), a hidden
// field selected and copied, which still runs inside the press that asked.
// True when either took it.
export async function toClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copiedByField(text);
  }
}

function copiedByField(text) {
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.className = 'fixed left-0 top-0 opacity-0';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand?.('copy') === true;
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
