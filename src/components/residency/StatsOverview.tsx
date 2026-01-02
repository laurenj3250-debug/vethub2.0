'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useResidencyStats } from '@/hooks/useResidencyStats';
import { Brain, Users, Scissors, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Next milestone thresholds
const NEXT_MILESTONES = {
  mri: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  appointment: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  surgery: [10, 25, 50, 75, 100, 150, 200],
};

function getNextMilestone(current: number, thresholds: number[]): number {
  return thresholds.find((t) => t > current) || thresholds[thresholds.length - 1];
}

function getProgress(current: number, next: number, thresholds: number[]): number {
  const prev = thresholds.filter((t) => t < next).pop() || 0;
  const range = next - prev;
  const progress = current - prev;
  return range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100;
}

export function StatsOverview() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { totals, surgeryBreakdown, daysUntilFreedom, daysLogged } = stats;

  const nextMriMilestone = getNextMilestone(totals.mriCount, NEXT_MILESTONES.mri);
  const nextApptMilestone = getNextMilestone(totals.totalAppointments, NEXT_MILESTONES.appointment);
  const nextSurgeryMilestone = getNextMilestone(surgeryBreakdown.total, NEXT_MILESTONES.surgery);

  const mriProgress = getProgress(totals.mriCount, nextMriMilestone, NEXT_MILESTONES.mri);
  const apptProgress = getProgress(totals.totalAppointments, nextApptMilestone, NEXT_MILESTONES.appointment);
  const surgeryProgress = getProgress(surgeryBreakdown.total, nextSurgeryMilestone, NEXT_MILESTONES.surgery);

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
                .map(([role, count]) => (
                  <span
                    key={role}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      role === 'S' && 'bg-green-500/20 text-green-700 dark:text-green-400',
                      role === 'O' && 'bg-gray-400/20 text-gray-600 dark:text-gray-400',
                      role === 'C' && 'bg-blue-400/20 text-blue-700 dark:text-blue-400',
                      role === 'D' && 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
                      role === 'K' && 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                    )}
                  >
                    {role}: {count}
                  </span>
                ))}
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
