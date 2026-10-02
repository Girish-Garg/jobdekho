import { useEffect, useState } from 'react';
import { getBlockedCompanies, unblockCompany } from '../api.js';

// The blocked companies Settings lists (see api/companies.js), read once as
// the page opens: `list` is null until then, and stays null with `failed` set
// when the read does not arrive, which its own notice has said. Unblock
// takes a row away once the server has let the company go, and leaves it
// when it has not, since the company is still blocked then; `busy` is the
// key on its way, so that button can say so.
export function useBlockedCompanies() {
  const [list, setList] = useState(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let alive = true;
    getBlockedCompanies()
      .then((entries) => alive && setList(entries))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  async function unblock(key) {
    setBusy(key);
    try {
      await unblockCompany(key);
      setList((entries) => (entries ?? []).filter((entry) => entry.key !== key));
    } catch {
      // Said in a notice by the call itself; the row stays.
    } finally {
      setBusy(null);
    }
  }

  return { list, failed, busy, unblock };
}
