'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Users, Scissors, ChevronRight, Calendar } from 'lucide-react';
import { useResidencyStats } from '@/hooks/useResidencyStats';

export function ResidencyStatsCard() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show card even with no data - encourage user to start tracking
  const totals = stats?.totals ?? { mriCount: 0, totalAppointments: 0 };
  const surgeryBreakdown = stats?.surgeryBreakdown ?? { total: 0 };
  const daysUntilFreedom = stats?.daysUntilFreedom ?? null;

  return (
    <Link href="/residency?tab=stats">
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Residency Stats
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Days Until Freedom - if profile is set */}
          {daysUntilFreedom !== null && (
            <div className="text-center mb-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {daysUntilFreedom}
              </p>
              <p className="text-xs text-muted-foreground">days until freedom</p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-2xl font-bold">{totals.mriCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">MRIs</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{totals.totalAppointments}</span>
              </div>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Scissors className="h-4 w-4 text-red-500" />
                <span className="text-2xl font-bold">{surgeryBreakdown.total}</span>
              </div>
              <p className="text-xs text-muted-foreground">Surgeries</p>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-3 group-hover:text-primary transition-colors">
            Click to view full stats
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
