'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

export function AdBanner({ slot }: { slot: string }) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const pathname = usePathname() ?? '';

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [pathname]);

  if (!clientId) {
    return (
      <div style={{
        minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.03)', borderRadius: 8, margin: '16px auto', maxWidth: 728,
        color: 'rgba(255,255,255,0.2)', fontSize: 12,
      }}>
        広告スペース
      </div>
    );
  }

  return (
    <div key={pathname.replace(/\//g, '-') + '-' + slot} style={{ margin: '16px auto', maxWidth: 728, textAlign: 'center' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 90 }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
