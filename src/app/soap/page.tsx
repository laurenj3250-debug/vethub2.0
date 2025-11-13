import { SOAPPageClient } from '@/components/SOAPPageClient';

// Force dynamic rendering to avoid circular dependency during static generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SOAPBuilderPage() {
  return <SOAPPageClient />;
}
