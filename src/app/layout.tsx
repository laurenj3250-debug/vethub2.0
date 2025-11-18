import type {Metadata} from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { QuickPatientNav } from '@/components/layout/QuickPatientNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'VetHub 2.0',
  description: 'An advanced patient and task manager for veterinary professionals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <Providers>
          <ErrorBoundary>
            <QuickPatientNav />
            {children}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
