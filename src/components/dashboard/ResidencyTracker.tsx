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
  X,
  Pencil,
} from 'lucide-react';
import {
  useResidencyStats,
  useQuickIncrement,
  useTodayEntry,
  useClockInOut,
  useAddSurgery,
  type CounterField,
} from '@/hooks/useResidencyStats';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PARTICIPATION_LEVELS, COMMON_PROCEDURES } from '@/lib/residency-milestones';

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
  const [showSurgeryForm, setShowSurgeryForm] = useState(false);
  const [surgeryProcedure, setSurgeryProcedure] = useState('');
  const [surgeryRole, setSurgeryRole] = useState<'S' | 'O' | 'C' | 'D' | 'K'>('O');
  const [editingClockIn, setEditingClockIn] = useState(false);
  const [clockInTime, setClockInTime] = useState('');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: stats, isLoading } = useResidencyStats();
  const { data: todayEntry, isLoading: todayLoading } = useTodayEntry();
  const { mutate: increment, isPending } = useQuickIncrement();
  const { mutate: clockAction, isPending: clockPending } = useClockInOut();
  const { mutateAsync: addSurgery, isPending: surgeryPending } = useAddSurgery();

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

  // Handle adding surgery quickly
  const handleAddSurgery = useCallback(async () => {
    if (!surgeryProcedure || !todayEntry?.id) return;

    await addSurgery({
      dailyEntryId: todayEntry.id,
      procedureName: surgeryProcedure,
      participation: surgeryRole,
    });

    setSurgeryProcedure('');
    setShowSurgeryForm(false);
  }, [surgeryProcedure, surgeryRole, todayEntry?.id, addSurgery]);

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
            <div className="flex items-center gap-2 flex-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <div className="text-xs flex-1">
                {editingClockIn ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={clockInTime}
                      onChange={(e) => setClockInTime(e.target.value)}
                      className="w-20 px-1 py-0.5 text-xs rounded border bg-white dark:bg-slate-900"
                    />
                    <button
                      onClick={() => {
                        clockAction({ action: 'clockIn', time: clockInTime });
                        setEditingClockIn(false);
                      }}
                      className="text-emerald-500 hover:text-emerald-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setEditingClockIn(false)}
                      className="text-rose-500 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : shiftStart ? (
                  <span className="flex items-center gap-1">
                    In: <span className="font-mono">{shiftStart}</span>
                    <button
                      onClick={() => {
                        setClockInTime(shiftStart);
                        setEditingClockIn(true);
                      }}
                      className="text-muted-foreground hover:text-primary ml-1"
                      title="Edit time"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
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
              onClick={() => clockAction({ action: shiftStart && !shiftEnd ? 'clockOut' : 'clockIn' })}
              disabled={isClockingIn || !!(shiftStart && shiftEnd) || editingClockIn}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-md transition-colors min-w-[40px]',
                shiftStart && !shiftEnd
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white',
                (isClockingIn || !!(shiftStart && shiftEnd) || editingClockIn) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isClockingIn ? (
                <RefreshCw className="w-3 h-3 animate-spin mx-auto" />
              ) : shiftStart && !shiftEnd ? 'Out' : 'In'}
            </button>
          </div>

          {/* MRI Counter Only */}
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
          </div>

          {/* Quick Surgery Add */}
          <div className="mt-3 pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs">
                <Scissors className="w-4 h-4 text-red-500" />
                Surgeries: {stats?.surgeryBreakdown?.total ?? 0}
                {todayEntry?.surgeries?.length ? ` (+${todayEntry.surgeries.length} today)` : ''}
              </span>
              <button
                onClick={() => setShowSurgeryForm(!showSurgeryForm)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                {showSurgeryForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showSurgeryForm ? 'Cancel' : 'Quick Add'}
              </button>
            </div>

            {/* Quick Surgery Form */}
            {showSurgeryForm && (
              <div className="space-y-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <select
                  value={surgeryProcedure}
                  onChange={(e) => setSurgeryProcedure(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border bg-white dark:bg-slate-900"
                >
                  <option value="">Select procedure...</option>
                  {COMMON_PROCEDURES.map((proc) => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>

                <div className="flex gap-1">
                  {Object.entries(PARTICIPATION_LEVELS).map(([key, { label, color }]) => (
                    <button
                      key={key}
                      onClick={() => setSurgeryRole(key as 'S' | 'O' | 'C' | 'D' | 'K')}
                      className={cn(
                        'flex-1 py-1 text-[10px] font-medium rounded transition-colors',
                        surgeryRole === key ? `${color} text-white` : 'bg-slate-200 dark:bg-slate-700'
                      )}
                      title={label}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAddSurgery}
                  disabled={!surgeryProcedure || !todayEntry?.id || surgeryPending}
                  className={cn(
                    'w-full py-1.5 text-xs font-medium rounded transition-colors',
                    'bg-red-500 hover:bg-red-600 text-white',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {surgeryPending ? 'Adding...' : 'Add Surgery'}
                </button>

                {!todayEntry?.id && (
                  <p className="text-[10px] text-amber-600 text-center">
                    Log a case first to add surgeries
                  </p>
                )}
              </div>
            )}

            <Link
              href="/residency?tab=stats"
              className="block text-center text-[10px] text-muted-foreground hover:text-primary mt-2"
            >
              View full stats →
            </Link>
          </div>
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
