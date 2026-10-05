import { webAddress } from './linkKind.js';

const BASICS = ['name', 'headline', 'email', 'phone', 'location'];
const LINKS = ['github', 'linkedin', 'portfolio'];

const said = (value) => Boolean(String(value ?? '').trim());
const plain = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Two ways of writing one value: a link with or without its https:// or a
// closing slash, a phone number spaced another way, a name in other case.
function sameBasic(field, mine, theirs) {
  if (field.startsWith('links.')) {
    const address = (value) => (webAddress(value) || String(value)).toLowerCase().replace(/\/+$/, '');
    return address(mine) === address(theirs);
  }
  if (field === 'phone') return String(mine).replace(/\D/g, '') === String(theirs).replace(/\D/g, '');
  return plain(mine) === plain(theirs);
}

// The basics against what the resume shows. One the person left empty is
// offered ticked in either mode. One they filled is theirs under Smart add,
// whatever the resume says; Overwrite offers the resume's where it differs,
// unticked, since a name or an email is the last thing to change unasked.
export function basicsRows(basics = {}, found = {}, mode = 'smart') {
  const fields = [
    ...BASICS.map((field) => [field, basics?.[field], found?.[field]]),
    ...LINKS.map((field) => [`links.${field}`, basics?.links?.[field], found?.links?.[field]]),
  ];
  return fields.flatMap(([field, mine, theirs]) => {
    if (!said(theirs)) return [];
    const row = { id: `basics:${field}`, section: 'basics', field, value: theirs.trim() };
    if (!said(mine)) return [{ ...row, kind: 'new', ticked: true }];
    if (mode !== 'overwrite' || sameBasic(field, mine, theirs)) return [];
    return [{ ...row, kind: 'changed', before: mine, ticked: false }];
  });
}
