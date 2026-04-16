'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useResidencyStats } from '@/hooks/useResidencyStats';
import { Brain, Users, Scissors, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getNextMilestone,
  getMilestoneProgress,
} from '@/lib/residency-milestones';

const ROLE_COLORS: Record<string, { color: string; textColor: string }> = {
  Primary: { color: 'bg-green-500', textColor: 'text-green-700' },
  Assistant: { color: 'bg-blue-400', textColor: 'text-blue-700' },
};
import { StatsOverviewSkeleton } from './StatsOverviewSkeleton';

export function StatsOverview() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading || !stats) {
    return <StatsOverviewSkeleton />;
  }

  const { totals, surgeryBreakdown, mriTypeBreakdown, daysUntilFreedom, daysLogged } = stats;

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
            {mriTypeBreakdown && Object.keys(mriTypeBreakdown).filter(k => k !== 'Unknown').length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(mriTypeBreakdown)
                  .filter(([k]) => k !== 'Unknown')
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        type === 'Brain' ? 'bg-purple-100 text-purple-700' :
                        type === 'C-Spine' ? 'bg-blue-100 text-blue-700' :
                        type === 'TL' ? 'bg-emerald-100 text-emerald-700' :
                        type === 'LS' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      )}
                    >
                      {type}: {count}
                    </span>
                  ))}
              </div>
            )}
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
              {(['Primary', 'Assistant'] as const)
                .filter((role) => (surgeryBreakdown as Record<string, number>)[role] > 0)
                .map((role) => {
                  const count = (surgeryBreakdown as Record<string, number>)[role];
                  const config = ROLE_COLORS[role];
                  return (
                    <span
                      key={role}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        `${config?.color || 'bg-gray-400'}/20`,
                        config?.textColor || 'text-gray-600'
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
