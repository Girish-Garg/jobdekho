// The forms one phone number takes on application forms. People write theirs
// as they like ("+91 90000 00000", "9000000000"); a form may want the ten
// digits alone (with the country picked beside it), the number with its code,
// or whatever fits its box. Indian numbers are the common case here: ten
// digits, with 91 in front when written in full.
export function phoneForms(raw) {
  const text = String(raw || '').trim()
  const digits = text.replace(/\D/g, '')
  if (!digits) return null
  const indian = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 10 ? digits : null
  return {
    asWritten: text,
    national: indian ?? digits,
    full: indian ? `+91${indian}` : text.startsWith('+') ? `+${digits}` : digits,
    dialCode: indian ? '+91' : null,
  }
}

// Which form a field gets: the ten digits when the country is asked for
// beside it or the box cannot hold more, otherwise the number as the person
// wrote it (which is how they would type it themselves).
export function phoneFor(forms, { maxLength = null, separateCountry = false } = {}) {
  if (!forms) return ''
  if (separateCountry) return forms.national
  if (maxLength && forms.asWritten.length > maxLength) {
    return forms.full.length <= maxLength ? forms.full : forms.national
  }
  return forms.asWritten
}
