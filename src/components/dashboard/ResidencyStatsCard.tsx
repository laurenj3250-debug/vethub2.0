'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Users, Scissors, ChevronRight, ChevronDown, Calendar, Plus, Minus, RefreshCw } from 'lucide-react';
import { useResidencyStats, useQuickIncrement, useTodayEntry } from '@/hooks/useResidencyStats';
import { cn } from '@/lib/utils';

interface CounterButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant: 'increment' | 'decrement';
  isPending?: boolean;
}

function CounterButton({ onClick, disabled, variant, isPending }: CounterButtonProps) {
  const Icon = variant === 'increment' ? Plus : Minus;
  const bgColor = variant === 'increment' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled || isPending}
      className={cn(
        // 44px minimum touch target
        'w-11 h-11 rounded-full flex items-center justify-center',
        'text-white font-bold text-lg',
        'transition-all duration-150',
        'active:scale-90',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        bgColor
      )}
      aria-label={variant === 'increment' ? 'Add one' : 'Remove one'}
    >
      <Icon className={cn('h-5 w-5', isPending && 'animate-pulse')} />
    </button>
  );
}

interface QuickCounterProps {
  label: string;
  value: number;
  todayValue: number;
  icon: React.ReactNode;
  iconColor: string;
  onIncrement: () => void;
  onDecrement: () => void;
  isPending?: boolean;
  animateValue?: boolean;
}

function QuickCounter({
  label,
  value,
  todayValue,
  icon,
  iconColor,
  onIncrement,
  onDecrement,
  isPending,
  animateValue,
}: QuickCounterProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1 mb-1">
        <span className={iconColor}>{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>

      <div className="flex items-center gap-5">
        <CounterButton
          variant="decrement"
          onClick={onDecrement}
          disabled={todayValue <= 0}
          isPending={isPending}
        />

        <div className="w-20 text-center">
          <span
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              'text-3xl font-bold tabular-nums transition-transform duration-200',
              animateValue && 'animate-bounce-once'
            )}
          >
            {value}
          </span>
          <p className="text-xs text-muted-foreground">
            +{todayValue} today
          </p>
        </div>

        <CounterButton
          variant="increment"
          onClick={onIncrement}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

export function ResidencyStatsCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatingField, setAnimatingField] = useState<string | null>(null);

  const { data: stats, isLoading, error } = useResidencyStats();
  const { data: todayEntry } = useTodayEntry();
  const { mutate: quickIncrementMutate, isPending } = useQuickIncrement();

  const handleIncrement = useCallback((field: 'mriCount' | 'recheckCount' | 'newCount') => {
    setAnimatingField(field);
    quickIncrementMutate({ field, delta: 1 });
    setTimeout(() => setAnimatingField(null), 300);
  }, [quickIncrementMutate]);

  const handleDecrement = useCallback((field: 'mriCount' | 'recheckCount' | 'newCount') => {
    setAnimatingField(field);
    quickIncrementMutate({ field, delta: -1 });
    setTimeout(() => setAnimatingField(null), 300);
  }, [quickIncrementMutate]);

  if (isLoading) {
    return (
      <Card className="transition-shadow">
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

  // Error state - show graceful fallback
  if (error) {
    return (
      <Card className="transition-shadow border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Residency Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Unable to load stats. Please refresh the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = stats?.totals ?? { mriCount: 0, recheckCount: 0, newCount: 0, totalAppointments: 0 };
  const surgeryBreakdown = stats?.surgeryBreakdown ?? { total: 0 };
  const daysUntilFreedom = stats?.daysUntilFreedom ?? null;

  // Today's entry values for showing "+X today"
  const todayMri = todayEntry?.mriCount ?? 0;
  const todayRecheck = todayEntry?.recheckCount ?? 0;
  const todayNew = todayEntry?.newCount ?? 0;

  return (
    <Card
      className={cn(
        'transition-all duration-300 ease-out',
        isExpanded ? 'shadow-lg ring-2 ring-purple-500/20' : 'hover:shadow-md cursor-pointer'
      )}
    >
      <CardHeader
        className="pb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            Residency Stats
            {isExpanded && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                Quick Entry
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {isPending && (
              <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
            )}
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Days Until Freedom - always visible if set */}
        {daysUntilFreedom !== null && (
          <div className="text-center mb-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {daysUntilFreedom}
            </p>
            <p className="text-xs text-muted-foreground">days until freedom</p>
          </div>
        )}

        {/* Collapsed View - Quick Stats */}
        {!isExpanded && (
          <>
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

            <p className="text-xs text-center text-muted-foreground mt-3">
              Tap to log today&apos;s cases
            </p>
          </>
        )}

        {/* Expanded View - Quick Entry Counters */}
        {isExpanded && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-center text-muted-foreground mb-4">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <QuickCounter
                label="MRIs"
                value={totals.mriCount}
                todayValue={todayMri}
                icon={<Brain className="h-4 w-4" />}
                iconColor="text-purple-500"
                onIncrement={() => handleIncrement('mriCount')}
                onDecrement={() => handleDecrement('mriCount')}
                isPending={isPending}
                animateValue={animatingField === 'mriCount'}
              />

              <QuickCounter
                label="Rechecks"
                value={totals.recheckCount}
                todayValue={todayRecheck}
                icon={<Users className="h-4 w-4" />}
                iconColor="text-blue-500"
                onIncrement={() => handleIncrement('recheckCount')}
                onDecrement={() => handleDecrement('recheckCount')}
                isPending={isPending}
                animateValue={animatingField === 'recheckCount'}
              />

              <QuickCounter
                label="New Patients"
                value={totals.newCount}
                todayValue={todayNew}
                icon={<Users className="h-4 w-4" />}
                iconColor="text-emerald-500"
                onIncrement={() => handleIncrement('newCount')}
                onDecrement={() => handleDecrement('newCount')}
                isPending={isPending}
                animateValue={animatingField === 'newCount'}
              />
            </div>

            {/* Surgeries note - link to full page */}
            <div className="mt-6 pt-4 border-t">
              <Link
                href="/residency?tab=stats"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-red-500" />
                  Surgeries: {surgeryBreakdown.total} total
                </span>
                <span className="text-xs">Log surgeries on full page →</span>
              </Link>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="w-full mt-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
