import { RoundingPageClient } from '@/components/RoundingPageClient';

// Force dynamic rendering to avoid circular dependency during static generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RoundingPage() {
  return <RoundingPageClient />;
}
