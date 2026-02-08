'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain,
  Scissors,
  Plus,
  Minus,
  ChevronRight,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  useResidencyStats,
  useQuickIncrement,
  useTodayEntry,
  type CounterField,
} from '@/hooks/useResidencyStats';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SurgeryQuickForm } from '@/components/residency/SurgeryQuickForm';

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
  // Simplified state: panel is either open or closed, no confusing "pinned" concept
  const [isOpen, setIsOpen] = useState(false);
  const [showSurgeryForm, setShowSurgeryForm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: stats, isLoading } = useResidencyStats();
  const { data: todayEntry } = useTodayEntry();
  const { mutate: increment, isPending } = useQuickIncrement();

  // Close panel when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

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

  // Calculate total for badge
  const todayTotal = today.mriCount + today.recheckCount + today.newConsultCount + today.emergencyCount;

  if (isLoading) {
    return (
      <div className="fixed bottom-24 right-6 z-40">
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-40" ref={panelRef}>
      {/* Expanded Panel - positioned above the badge button */}
      <div
        className={cn(
          'absolute bottom-20 right-0 transition-all duration-200 ease-out origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-80"
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
              <SurgeryQuickForm
                dailyEntryId={todayEntry?.id ?? null}
                variant="compact"
                onSuccess={() => setShowSurgeryForm(false)}
                onCancel={() => setShowSurgeryForm(false)}
              />
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

      {/* Badge Button - Click to toggle panel */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center',
          'text-white shadow-lg transition-all duration-200',
          'hover:scale-105 active:scale-95',
          // Clear visual state: different gradient when open
          isOpen
            ? 'bg-gradient-to-br from-purple-600 to-pink-600 ring-4 ring-purple-300 ring-offset-2 shadow-purple-300/50 shadow-xl'
            : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-xl'
        )}
        title={isOpen ? 'Click to close' : 'Click to open stats panel'}
      >
        <div className="text-center">
          <div className="text-base font-bold">{todayTotal}</div>
          <div className="text-[10px] opacity-80">{isOpen ? 'close' : 'today'}</div>
        </div>
      </button>
    </div>
  );
}
