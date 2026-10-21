import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Design Analytics Portal',
  description: 'Lodgement portal for estate design guideline applications.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-neutral-900">{children}</body>
    </html>
  );
}
