'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useResidencyStats } from '@/hooks/useResidencyStats';
import { Brain, Users, Scissors, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PARTICIPATION_LEVELS,
  getNextMilestone,
  getMilestoneProgress,
} from '@/lib/residency-milestones';
import { StatsOverviewSkeleton } from './StatsOverviewSkeleton';

export function StatsOverview() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading || !stats) {
    return <StatsOverviewSkeleton />;
  }

  const { totals, surgeryBreakdown, daysUntilFreedom, daysLogged } = stats;

  const nextMriMilestone = getNextMilestone(totals.mriCount, 'mri');
  const nextApptMilestone = getNextMilestone(totals.totalAppointments, 'appointment');
  const nextSurgeryMilestone = getNextMilestone(surgeryBreakdown.total, 'surgery');

  const mriProgress = getMilestoneProgress(totals.mriCount, 'mri');
  const apptProgress = getMilestoneProgress(totals.totalAppointments, 'appointment');
  const surgeryProgress = getMilestoneProgress(surgeryBreakdown.total, 'surgery');

  return (
    <div className="space-y-6">
      {/* Days Until Freedom */}
      {daysUntilFreedom !== null && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Until Freedom</p>
                <p className="text-4xl font-bold text-purple-500">{daysUntilFreedom}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Days Logged</p>
                <p className="text-2xl font-semibold">{daysLogged}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MRI Counter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-purple-500" />
              MRIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.mriCount}</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Next: {nextMriMilestone}</span>
                <span>{totals.mriCount}/{nextMriMilestone}</span>
              </div>
              <Progress value={mriProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Appointments Counter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-blue-500" />
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalAppointments}</div>
            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
              <span>Recheck: {totals.recheckCount}</span>
              <span>New: {totals.newCount}</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Next: {nextApptMilestone}</span>
                <span>{totals.totalAppointments}/{nextApptMilestone}</span>
              </div>
              <Progress value={apptProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Surgeries Counter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="h-5 w-5 text-red-500" />
              Surgeries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{surgeryBreakdown.total}</div>
            <div className="flex flex-wrap gap-2 text-sm mt-1">
              {Object.entries(surgeryBreakdown)
                .filter(([k]) => k !== 'total')
                .map(([role, count]) => {
                  const config = PARTICIPATION_LEVELS[role as keyof typeof PARTICIPATION_LEVELS];
                  return (
                    <span
                      key={role}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        `${config?.color}/20`,
                        config?.textColor
                      )}
                    >
                      {role}: {count}
                    </span>
                  );
                })}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Next: {nextSurgeryMilestone}</span>
                <span>{surgeryBreakdown.total}/{nextSurgeryMilestone}</span>
              </div>
              <Progress value={surgeryProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Cases */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-medium">Total Cases</span>
            </div>
            <span className="text-2xl font-bold">{totals.totalCases + surgeryBreakdown.total}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
