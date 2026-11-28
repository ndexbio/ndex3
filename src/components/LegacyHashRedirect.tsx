'use client';

import { useEffect } from 'react';
import { resolveLegacyRedirect } from '@/utils/legacyRedirect';

/** Redirects legacy hash-router DOI links to their new routes. Renders nothing. */
export default function LegacyHashRedirect() {
  useEffect(() => {
    const target = resolveLegacyRedirect(window.location.href);
    if (target && target !== window.location.href) {
      window.location.replace(target); // replace() keeps the legacy URL out of history
    }
  }, []);

  return null;
}