import { describe, it, expect } from 'vitest';
import * as web from './linkKind.js';
import * as core from '@jobdekho/core/link-kind.js';

// The web keeps its own copy of core's rules (its bundle cannot import
// core), so a host added on one side and not the other would make the
// editor guess one kind and the saved record hold another.
describe('the web copy of the link rules', () => {
  it('holds the same kinds, names and hosts as core', () => {
    expect(web.LINK_KINDS).toEqual(core.LINK_KINDS);
    expect(web.LINK_KIND_NAMES).toEqual(core.LINK_KIND_NAMES);
    expect(web.LINK_HOSTS).toEqual(core.LINK_HOSTS);
  });

  it('reads every address the way core does', () => {
    const hosts = core.LINK_HOSTS.flatMap(([, list]) => list);
    const samples = [
      ...hosts.flatMap((host) => [`https://${host}/demo`, `${host}/demo`, `https://www.${host}`, `https://not${host}`]),
      'https://example.com/paper.pdf', 'demo.dev', 'https://demo.dev/a?b=c#d', 'http://localhost:3000',
      'javascript:alert(1)', 'mailto:demo@example.com', 'ftp://example.com', '//example.com', 'not a link',
      'https://exa mple.com', 'https://x.dev/\u0000a', '', null, undefined,
    ];
    for (const value of samples) {
      expect([value, web.linkKind(value), web.webAddress(value)]).toEqual([value, core.linkKind(value), core.webAddress(value)]);
    }
  });

  it('names links the way core does', () => {
    const links = [{ kind: 'video', label: 'Demo video' }, { kind: 'code', label: ' ' }, { kind: 'other' }, { kind: 'constructor' }, null];
    for (const link of links) expect(web.linkName(link)).toBe(core.linkName(link));
  });
});
