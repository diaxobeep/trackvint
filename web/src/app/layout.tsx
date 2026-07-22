import type { Metadata } from 'next';
import { DM_Sans, Syne } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TrackVint — Tracke Vinted comme un pro',
  description:
    'Extension + dashboard pour tracker vendeurs, niches et vitesse de vente sur Vinted. Analyse serveur 24/7.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${syne.variable}`}>
      <body style={{ fontFamily: 'var(--font-dm), var(--font)', ['--display' as string]: 'var(--font-syne), var(--display)' }}>
        {children}
      </body>
    </html>
  );
}
