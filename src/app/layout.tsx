import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SahAI — Business Assistant',
  description: 'Your business data, your language, your next move.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}