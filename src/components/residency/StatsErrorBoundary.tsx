'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="py-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          {error.message || 'An unexpected error occurred while loading your stats.'}
        </p>
        <Button onClick={resetErrorBoundary} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

interface StatsErrorBoundaryProps {
  children: React.ReactNode;
}

export function StatsErrorBoundary({ children }: StatsErrorBoundaryProps) {
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Invalidate all residency-related queries to force refetch
        queryClient.invalidateQueries({ queryKey: ['residency'] });
      }}
      onError={(error, info) => {
        // Log error for debugging
        console.error('[StatsErrorBoundary] Error:', error);
        console.error('[StatsErrorBoundary] Component Stack:', info.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
