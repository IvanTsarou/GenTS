import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GenTS - Travel Story Generator',
  description: 'Telegram bot for collecting travel photos and notes',
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
