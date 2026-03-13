import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Neurology Rounds',
  description: 'Daily rounds sheet generator for RBVH Neurology',
};

export default function RoundsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Override fonts for rounds sheet — Playfair Display + Montserrat instead of PT Sans */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
        {children}
      </div>
    </>
  );
}
