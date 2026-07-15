import { resolveLegacyRedirect, resolveHostRedirect, resolveFragmentRedirect } from './legacyRedirect';

describe('resolveHostRedirect', () => {
  it('legacy host -> canonical host, https', () => {
    expect(resolveHostRedirect(new URL('http://public.ndexbio.org/'))).toBe('https://www.ndexbio.org');
  });

  it('canonical host over http -> https', () => {
    expect(resolveHostRedirect(new URL('http://www.ndexbio.org/'))).toBe('https://www.ndexbio.org');
  });

  it('canonical host already https -> null', () => {
    expect(resolveHostRedirect(new URL('https://www.ndexbio.org/'))).toBeNull();
  });

  it('non-prod host (localhost) -> null', () => {
    expect(resolveHostRedirect(new URL('http://localhost:3000/'))).toBeNull();
  });
});

describe('resolveFragmentRedirect', () => {
  it('#/network/{id} -> /viewer/networks/{id}', () => {
    expect(resolveFragmentRedirect(new URL('https://www.ndexbio.org/#/network/abc'))).toBe(
      '/viewer/networks/abc'
    );
  });

  it('#/networkset/{id}?accesskey=... -> /folders/{id}?accesskey=...', () => {
    expect(resolveFragmentRedirect(new URL('https://www.ndexbio.org/#/networkset/abc?accesskey=xyz'))).toBe(
      '/folders/abc?accesskey=xyz'
    );
  });

  it('ignores pathname entirely', () => {
    expect(resolveFragmentRedirect(new URL('https://www.ndexbio.org/index.html#/network/abc'))).toBe(
      '/viewer/networks/abc'
    );
  });

  it('unrecognized hash -> null', () => {
    expect(resolveFragmentRedirect(new URL('https://www.ndexbio.org/#/user/abc'))).toBeNull();
  });

  it('no hash -> null', () => {
    expect(resolveFragmentRedirect(new URL('https://www.ndexbio.org/'))).toBeNull();
  });
});

describe('resolveLegacyRedirect', () => {
  it('public.ndexbio.org network -> www viewer (http->https, accesskey kept)', () => {
    expect(
      resolveLegacyRedirect(
        'http://public.ndexbio.org/#/network/13324594-54a5-11ea-bfdc-0ac135e8bacf?accesskey=719bdfb839a493d6f2210a262f5ab8075fcbcb8ce278d17c33a3835bee6e535c'
      )
    ).toBe(
      'https://www.ndexbio.org/viewer/networks/13324594-54a5-11ea-bfdc-0ac135e8bacf?accesskey=719bdfb839a493d6f2210a262f5ab8075fcbcb8ce278d17c33a3835bee6e535c'
    );
  });

  it('www network hash -> viewer', () => {
    expect(
      resolveLegacyRedirect('https://www.ndexbio.org/#/network/98ba6a19-586e-11e7-8f50-0ac135e8bacf')
    ).toBe('https://www.ndexbio.org/viewer/networks/98ba6a19-586e-11e7-8f50-0ac135e8bacf');
  });

  it('index.html network -> viewer (pathname ignored)', () => {
    expect(
      resolveLegacyRedirect('https://www.ndexbio.org/index.html#/network/98ba6a19-586e-11e7-8f50-0ac135e8bacf')
    ).toBe('https://www.ndexbio.org/viewer/networks/98ba6a19-586e-11e7-8f50-0ac135e8bacf');
  });

  it('index.html networkset -> folders', () => {
    expect(
      resolveLegacyRedirect('https://www.ndexbio.org/index.html#/networkset/6a554a61-a788-11ef-99aa-005056ae3c32')
    ).toBe('https://www.ndexbio.org/folders/6a554a61-a788-11ef-99aa-005056ae3c32');
  });

  it('networkset -> folders (http->https, accesskey kept)', () => {
    expect(
      resolveLegacyRedirect(
        'http://www.ndexbio.org/#/networkset/224d4de6-e23f-11ea-99da-0ac135e8bacf?accesskey=6b9681c3566e6646d8f8a03e131a2037495f44c071d956776316106f59b03ab9'
      )
    ).toBe(
      'https://www.ndexbio.org/folders/224d4de6-e23f-11ea-99da-0ac135e8bacf?accesskey=6b9681c3566e6646d8f8a03e131a2037495f44c071d956776316106f59b03ab9'
    );
  });

  it('returns null for non-legacy and malformed URLs', () => {
    expect(resolveLegacyRedirect('https://www.ndexbio.org/viewer/networks/abc')).toBeNull();
    expect(resolveLegacyRedirect('https://www.ndexbio.org/')).toBeNull();
    expect(resolveLegacyRedirect('https://www.ndexbio.org/#/user/abc')).toBeNull();
    expect(resolveLegacyRedirect('not a url')).toBeNull();
  });

  it('leaves dev hosts on their original protocol', () => {
    expect(resolveLegacyRedirect('http://localhost:3000/#/network/abc')).toBe(
      'http://localhost:3000/viewer/networks/abc'
    );
  });

  it('public.ndexbio.org with unrecognized hash -> host fixed, hash left alone', () => {
    expect(resolveLegacyRedirect('https://public.ndexbio.org/#/user/abc')).toBe(
      'https://www.ndexbio.org/#/user/abc'
    );
  });

  it('public.ndexbio.org with no hash -> host fixed', () => {
    expect(resolveLegacyRedirect('http://public.ndexbio.org/')).toBe('https://www.ndexbio.org/');
  });
});
