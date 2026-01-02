'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResidencyStats } from '@/hooks/useResidencyStats';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { WeeklyChartSkeleton } from './StatsOverviewSkeleton';

export function WeeklyChart() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading || !stats) {
    return <WeeklyChartSkeleton />;
  }

  // Group data by week for last 8 weeks
  const today = new Date();
  const weeks: Array<{
    week: string;
    mri: number;
    recheck: number;
    new: number;
    surgery: number;
  }> = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = startOfWeek(new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const weekEntries = stats.weeklyData.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
    });

    const weekTotals = weekEntries.reduce(
      (acc, entry) => ({
        mri: acc.mri + entry.mriCount,
        recheck: acc.recheck + entry.recheckCount,
        new: acc.new + entry.newCount,
        surgery: acc.surgery + entry.surgeries.length,
      }),
      { mri: 0, recheck: 0, new: 0, surgery: 0 }
    );

    weeks.push({
      week: format(weekStart, 'MMM d'),
      ...weekTotals,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Weekly Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeks} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="week"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="mri" name="MRIs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recheck" name="Rechecks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="new" name="New Appts" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="surgery" name="Surgeries" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
