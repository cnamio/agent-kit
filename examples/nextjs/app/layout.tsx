import type { ReactNode } from 'react';

export const metadata = { title: 'Custom domains (Cnamio example)' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ maxWidth: '44rem', margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>{children}</body>
    </html>
  );
}
