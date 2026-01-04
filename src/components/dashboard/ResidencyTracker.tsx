'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain,
  Users,
  Scissors,
  MessageSquare,
  Clock,
  Plus,
  Minus,
  ChevronRight,
  AlertCircle,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import {
  useResidencyStats,
  useQuickIncrement,
  useTodayEntry,
  useClockInOut,
  type CounterField,
} from '@/hooks/useResidencyStats';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Counter button component
function CounterBtn({
  onClick,
  disabled,
  variant,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant: 'plus' | 'minus';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold',
        'transition-all duration-100 active:scale-90',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'plus' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
      )}
    >
      {variant === 'plus' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
    </button>
  );
}

// Mini counter row
function CounterRow({
  icon,
  label,
  value,
  todayValue,
  field,
  onIncrement,
  onDecrement,
  isPending,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  todayValue: number;
  field: CounterField;
  onIncrement: () => void;
  onDecrement: () => void;
  isPending?: boolean;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <CounterBtn variant="minus" onClick={onDecrement} disabled={todayValue <= 0 || isPending} />
        <div className="w-12 text-center">
          <span className="text-sm font-bold tabular-nums">{value}</span>
          <span className="text-[10px] text-muted-foreground ml-1">+{todayValue}</span>
        </div>
        <CounterBtn variant="plus" onClick={onIncrement} disabled={isPending} />
      </div>
    </div>
  );
}

export function ResidencyTracker() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: stats, isLoading } = useResidencyStats();
  const { data: todayEntry, isLoading: todayLoading } = useTodayEntry();
  const { mutate: increment, isPending } = useQuickIncrement();
  const { mutate: clockAction, isPending: clockPending } = useClockInOut();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isPinned) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300); // Small delay before closing
  }, [isPinned]);

  const handleIncrement = useCallback((field: CounterField) => {
    increment({ field, delta: 1 });
  }, [increment]);

  const handleDecrement = useCallback((field: CounterField) => {
    increment({ field, delta: -1 });
  }, [increment]);

  // Get values
  const totals = stats?.totals ?? {
    mriCount: 0,
    recheckCount: 0,
    newConsultCount: 0,
    emergencyCount: 0,
    commsCount: 0,
  };

  const today = {
    mriCount: todayEntry?.mriCount ?? 0,
    recheckCount: todayEntry?.recheckCount ?? 0,
    newConsultCount: todayEntry?.newConsultCount ?? 0,
    emergencyCount: todayEntry?.emergencyCount ?? 0,
    commsCount: todayEntry?.commsCount ?? 0,
  };

  const shiftStart = todayEntry?.shiftStartTime;
  const shiftEnd = todayEntry?.shiftEndTime;
  const isClockingIn = clockPending;

  // Calculate total for badge
  const todayTotal = today.mriCount + today.recheckCount + today.newConsultCount + today.emergencyCount;

  if (isLoading) {
    return (
      <div className="fixed bottom-24 right-6 z-40">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-24 right-6 z-40"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Expanded Panel */}
      <div
        className={cn(
          'absolute bottom-0 right-0 transition-all duration-200 ease-out origin-bottom-right',
          isHovered
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-72"
          style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Today's Stats</span>
              {isPending && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            <Link
              href="/residency?tab=stats"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              Full Stats <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Clock In/Out */}
          <div className="flex items-center justify-between py-2 mb-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <div className="text-xs">
                {shiftStart ? (
                  <span>
                    In: <span className="font-mono">{shiftStart}</span>
                    {shiftEnd && (
                      <> → Out: <span className="font-mono">{shiftEnd}</span></>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not clocked in</span>
                )}
              </div>
            </div>
            <button
              onClick={() => clockAction(shiftStart && !shiftEnd ? 'clockOut' : 'clockIn')}
              disabled={isClockingIn || (shiftStart && shiftEnd)}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                shiftStart && !shiftEnd
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white',
                (isClockingIn || (shiftStart && shiftEnd)) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isClockingIn ? '...' : shiftStart && !shiftEnd ? 'Out' : 'In'}
            </button>
          </div>

          {/* Counters */}
          <div className="space-y-0.5">
            <CounterRow
              icon={<Brain className="w-4 h-4" />}
              label="MRIs"
              value={totals.mriCount}
              todayValue={today.mriCount}
              field="mriCount"
              onIncrement={() => handleIncrement('mriCount')}
              onDecrement={() => handleDecrement('mriCount')}
              isPending={isPending}
              color="text-purple-500"
            />

            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">
              Appointments
            </div>

            <CounterRow
              icon={<RefreshCw className="w-4 h-4" />}
              label="Rechecks"
              value={totals.recheckCount}
              todayValue={today.recheckCount}
              field="recheckCount"
              onIncrement={() => handleIncrement('recheckCount')}
              onDecrement={() => handleDecrement('recheckCount')}
              isPending={isPending}
              color="text-blue-500"
            />

            <CounterRow
              icon={<UserPlus className="w-4 h-4" />}
              label="New Consults"
              value={totals.newConsultCount}
              todayValue={today.newConsultCount}
              field="newConsultCount"
              onIncrement={() => handleIncrement('newConsultCount')}
              onDecrement={() => handleDecrement('newConsultCount')}
              isPending={isPending}
              color="text-emerald-500"
            />

            <CounterRow
              icon={<AlertCircle className="w-4 h-4" />}
              label="Emergency"
              value={totals.emergencyCount}
              todayValue={today.emergencyCount}
              field="emergencyCount"
              onIncrement={() => handleIncrement('emergencyCount')}
              onDecrement={() => handleDecrement('emergencyCount')}
              isPending={isPending}
              color="text-red-500"
            />

            <div className="border-t my-2" />

            <CounterRow
              icon={<MessageSquare className="w-4 h-4" />}
              label="Comms"
              value={totals.commsCount}
              todayValue={today.commsCount}
              field="commsCount"
              onIncrement={() => handleIncrement('commsCount')}
              onDecrement={() => handleDecrement('commsCount')}
              isPending={isPending}
              color="text-amber-500"
            />
          </div>

          {/* Surgeries link */}
          <Link
            href="/residency?tab=stats"
            className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground hover:text-primary"
          >
            <span className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-red-500" />
              Surgeries: {stats?.surgeryBreakdown?.total ?? 0}
            </span>
            <span>Log on full page →</span>
          </Link>
        </div>
      </div>

      {/* Mini Badge (always visible) */}
      <button
        onClick={() => setIsPinned(!isPinned)}
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          'bg-gradient-to-br from-purple-500 to-pink-500 text-white',
          'shadow-lg hover:shadow-xl transition-all duration-200',
          'hover:scale-105 active:scale-95',
          isPinned && 'ring-2 ring-purple-300 ring-offset-2'
        )}
        title={isPinned ? 'Click to unpin' : 'Hover for quick entry, click to pin'}
      >
        <div className="text-center">
          <div className="text-sm font-bold">{todayTotal}</div>
          <div className="text-[8px] opacity-80">today</div>
        </div>
      </button>
    </div>
  );
}
