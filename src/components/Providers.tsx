'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientProvider } from '@/contexts/PatientContext';
import { Toaster } from './ui/toaster';
import { PillCalculator } from './PillCalculator';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 25 seconds, then becomes stale
        staleTime: 25 * 1000,
        // Keep unused data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Poll every 30 seconds when tab is visible
        refetchInterval: 30 * 1000,
        // Don't poll when tab is in background
        refetchIntervalInBackground: false,
        // Refetch when window regains focus
        refetchOnWindowFocus: true,
        // Retry failed requests 2 times
        retry: 2,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });
}

// Browser: create a single client instance
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new client
    return makeQueryClient();
  } else {
    // Browser: create once and reuse
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <PatientProvider>
        {children}
        <Toaster />
        <PillCalculator />
      </PatientProvider>
    </QueryClientProvider>
  );
}
