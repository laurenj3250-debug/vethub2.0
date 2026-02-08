'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Brain,
  Scissors,
  Users,
  Target,
  Plus,
  Minus,
  Pencil,
  Loader2,
  Check,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import {
  useResidencyStats,
  useQuickIncrement,
  useTodayEntry,
  useAddSurgery,
  type Stats,
} from '@/hooks/useResidencyStats';
import { COMMON_PROCEDURES, PARTICIPATION_LEVELS } from '@/lib/residency-milestones';
import { NEO_POP } from '@/lib/neo-pop-styles';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const neoCard = 'bg-white border-2 border-black shadow-[4px_4px_0_#000] rounded-2xl';
const neoButton = 'border-2 border-black shadow-[3px_3px_0_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] transition-all rounded-xl font-bold';

// --- Goals stored in localStorage ---
function getGoals() {
  if (typeof window === 'undefined') return { weeklyMri: 10, weeklySurgery: 3, monthlyMri: 40, monthlySurgery: 12 };
  try {
    const stored = localStorage.getItem('vethub-residency-goals');
    if (stored) return JSON.parse(stored);
  } catch {}
  return { weeklyMri: 10, weeklySurgery: 3, monthlyMri: 40, monthlySurgery: 12 };
}

function saveGoals(goals: ReturnType<typeof getGoals>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vethub-residency-goals', JSON.stringify(goals));
}

// --- Helper: calculate weekly/monthly breakdowns ---
function calculateBreakdowns(stats: Stats) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weeklyData = { mri: 0, surgery: 0, recheck: 0, newConsult: 0 };
  const monthlyData = { mri: 0, surgery: 0, recheck: 0, newConsult: 0 };

  for (const entry of stats.weeklyData) {
    const entryDate = parseISO(entry.date);

    if (isWithinInterval(entryDate, { start: weekStart, end: weekEnd })) {
      weeklyData.mri += entry.mriCount;
      weeklyData.surgery += entry.surgeries.length;
      weeklyData.recheck += entry.recheckCount;
      weeklyData.newConsult += entry.newCount;
    }

    if (isWithinInterval(entryDate, { start: monthStart, end: monthEnd })) {
      monthlyData.mri += entry.mriCount;
      monthlyData.surgery += entry.surgeries.length;
      monthlyData.recheck += entry.recheckCount;
      monthlyData.newConsult += entry.newCount;
    }
  }

  return { weekly: weeklyData, monthly: monthlyData };
}

// --- Stat Card ---
function StatCard({
  number,
  label,
  goal,
  interactive,
  color,
  onEditGoal,
}: {
  number: number;
  label: string;
  goal?: number;
  interactive?: boolean;
  color?: string;
  onEditGoal?: () => void;
}) {
  const progressPct = goal ? Math.min(100, (number / goal) * 100) : 0;

  return (
    <div
      className={cn(
        neoCard,
        'p-4 text-center relative overflow-hidden transition-transform',
        interactive && 'cursor-pointer hover:-translate-y-1',
      )}
      onClick={interactive ? onEditGoal : undefined}
    >
      {interactive && (
        <span className="absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil size={12} className="text-gray-400" />
        </span>
      )}
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-3xl font-black" style={{ color: color || NEO_POP.colors.gray900 }}>
          {number}
        </span>
        {goal !== undefined && (
          <span className="text-lg text-gray-300 font-bold">/ {goal}</span>
        )}
      </div>
      {goal !== undefined && (
        <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden border border-black/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              backgroundColor: color || NEO_POP.colors.mintDark,
            }}
          />
        </div>
      )}
      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1 block">
        {label}
      </span>
    </div>
  );
}

// --- Breakdown Row ---
function BreakdownRow({
  label,
  icon,
  iconBg,
  color,
  count,
  total,
}: {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  color: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 mb-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div className="w-24 text-sm font-medium text-gray-700 shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden border border-black/5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-sm font-bold text-gray-900 w-8 text-right">{count}</div>
    </div>
  );
}

// --- Quick Add Surgery Mini-Form ---
function QuickSurgeryForm({
  onAdd,
  isPending,
  dailyEntryId,
}: {
  onAdd: (procedure: string, participation: 'S' | 'O' | 'C' | 'D' | 'K') => void;
  isPending: boolean;
  dailyEntryId: string | null;
}) {
  const [procedure, setProcedure] = useState('');
  const [participation, setParticipation] = useState<'S' | 'O' | 'C' | 'D' | 'K'>('O');
  const [showCustom, setShowCustom] = useState(false);

  const handleSubmit = () => {
    if (!procedure) return;
    onAdd(procedure, participation);
    setProcedure('');
    setShowCustom(false);
  };

  return (
    <div className="space-y-3">
      {/* Procedure selection */}
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
          Procedure
        </label>
        <select
          value={procedure}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setShowCustom(true);
              setProcedure('');
            } else {
              setShowCustom(false);
              setProcedure(e.target.value);
            }
          }}
          className="w-full px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-purple-300 outline-none"
        >
          <option value="">Select procedure...</option>
          {COMMON_PROCEDURES.map((proc) => (
            <option key={proc} value={proc}>
              {proc}
            </option>
          ))}
          <option value="__custom__">Other (type custom)...</option>
        </select>
        {showCustom && (
          <input
            type="text"
            value={procedure}
            onChange={(e) => setProcedure(e.target.value)}
            placeholder="Type procedure name..."
            className="w-full mt-2 px-3 py-2.5 border-2 border-black rounded-xl text-sm focus:ring-2 focus:ring-purple-300 outline-none"
            autoFocus
          />
        )}
      </div>

      {/* Participation level */}
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
          Your Role
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {(Object.entries(PARTICIPATION_LEVELS) as [string, { label: string; color: string }][]).map(
            ([key, { label, color }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setParticipation(key as 'S' | 'O' | 'C' | 'D' | 'K')}
                className={cn(
                  'py-2 px-1 rounded-lg text-center transition-all border-2 font-bold',
                  participation === key
                    ? `${color} text-white border-black shadow-[2px_2px_0_#000]`
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400',
                )}
              >
                <span className="text-sm block">{key}</span>
                <span className="text-[9px] block opacity-80 leading-tight">{label}</span>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!procedure || isPending || !dailyEntryId}
        className={cn(
          neoButton,
          'w-full py-3 text-sm flex items-center justify-center gap-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        style={{ backgroundColor: NEO_POP.colors.mint }}
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Plus size={16} />
        )}
        Log Surgery
      </button>
    </div>
  );
}

// --- History Item ---
function HistoryItem({
  type,
  title,
  meta,
  date,
}: {
  type: 'mri' | 'surgery' | 'appointment';
  title: string;
  meta: string;
  date: string;
}) {
  const config = {
    mri: {
      icon: <Brain size={16} />,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
      borderColor: 'border-l-purple-500',
    },
    surgery: {
      icon: <Scissors size={16} />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      borderColor: 'border-l-red-500',
    },
    appointment: {
      icon: <Users size={16} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      borderColor: 'border-l-blue-500',
    },
  };

  const c = config[type];

  return (
    <div
      className={cn(
        'bg-white border-2 border-black rounded-xl p-3 flex items-center gap-3 mb-2',
        'border-l-[5px]',
        c.borderColor,
        'shadow-[2px_2px_0_#000]',
      )}
    >
      <div
        className={cn('w-10 h-10 rounded-full flex items-center justify-center', c.iconBg, c.iconColor)}
      >
        {c.icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-sm text-gray-900 block truncate">{title}</span>
        <span className="text-xs text-gray-500">{meta}</span>
      </div>
      <span className="text-xs font-bold text-gray-400 shrink-0">{date}</span>
    </div>
  );
}

// =====================
// MAIN COMPONENT
// =====================
export function QuickAddTracker() {
  const { data: stats, isLoading: statsLoading } = useResidencyStats();
  const { data: todayEntry, isLoading: todayLoading } = useTodayEntry();
  const { mutate: quickIncrement, isPending: incrementPending } = useQuickIncrement();
  const addSurgeryMutation = useAddSurgery();
  const { toast } = useToast();

  const [breakdownView, setBreakdownView] = useState<'weekly' | 'monthly'>('weekly');
  const [quickAddType, setQuickAddType] = useState<'mri' | 'surgery'>('mri');
  const [goals, setGoals] = useState(getGoals);
  const [animatingField, setAnimatingField] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  // Calculate breakdowns
  const breakdowns = useMemo(() => {
    if (!stats) return null;
    return calculateBreakdowns(stats);
  }, [stats]);

  const currentBreakdown = breakdowns ? breakdowns[breakdownView] : null;

  // Weekly totals for goal progress
  const weeklyTotal = breakdowns ? breakdowns.weekly.mri + breakdowns.weekly.surgery : 0;
  const monthlyTotal = breakdowns ? breakdowns.monthly.mri + breakdowns.monthly.surgery : 0;

  // Handle MRI quick-add
  const handleMriIncrement = useCallback(
    (delta: number) => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      setAnimatingField('mri');

      quickIncrement(
        { field: 'mriCount', delta },
        {
          onSuccess: () => {
            setShowSaved(true);
            if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
            savedTimeoutRef.current = setTimeout(() => setShowSaved(false), 1500);
          },
        },
      );

      animTimeoutRef.current = setTimeout(() => setAnimatingField(null), 300);
    },
    [quickIncrement],
  );

  // Handle surgery quick-add
  const handleSurgeryAdd = useCallback(
    (procedure: string, participation: 'S' | 'O' | 'C' | 'D' | 'K') => {
      if (!todayEntry?.id) {
        toast({
          title: 'Save daily entry first',
          description: 'Log at least one MRI or appointment to create today\'s entry, then add surgeries.',
          variant: 'destructive',
        });
        return;
      }

      addSurgeryMutation.mutate({
        dailyEntryId: todayEntry.id,
        procedureName: procedure,
        participation,
      });
    },
    [todayEntry?.id, addSurgeryMutation, toast],
  );

  // Edit goals
  const handleEditGoal = useCallback(
    (type: 'weeklyMri' | 'weeklySurgery' | 'monthlyMri' | 'monthlySurgery') => {
      const labels: Record<string, string> = {
        weeklyMri: 'weekly MRI goal',
        weeklySurgery: 'weekly surgery goal',
        monthlyMri: 'monthly MRI goal',
        monthlySurgery: 'monthly surgery goal',
      };
      const input = prompt(`Enter new ${labels[type]}:`, String(goals[type]));
      if (input && !isNaN(Number(input))) {
        const newGoals = { ...goals, [type]: parseInt(input) };
        setGoals(newGoals);
        saveGoals(newGoals);
      }
    },
    [goals],
  );

  // Build recent history from weeklyData
  const recentHistory = useMemo(() => {
    if (!stats) return [];
    const items: Array<{ type: 'mri' | 'surgery' | 'appointment'; title: string; meta: string; date: string; sortDate: string }> = [];

    // Get entries sorted by date descending
    const sorted = [...stats.weeklyData].sort((a, b) => b.date.localeCompare(a.date));

    for (const entry of sorted.slice(0, 14)) {
      const dateStr = format(parseISO(entry.date), 'MMM d');

      if (entry.mriCount > 0) {
        items.push({
          type: 'mri',
          title: `${entry.mriCount} MRI${entry.mriCount > 1 ? 's' : ''}`,
          meta: 'Brain scans',
          date: dateStr,
          sortDate: entry.date,
        });
      }

      for (const surgery of entry.surgeries) {
        items.push({
          type: 'surgery',
          title: surgery.procedureName,
          meta: `${PARTICIPATION_LEVELS[surgery.participation as keyof typeof PARTICIPATION_LEVELS]?.label || surgery.participation}`,
          date: dateStr,
          sortDate: entry.date,
        });
      }

      const appts = entry.recheckCount + entry.newCount;
      if (appts > 0) {
        items.push({
          type: 'appointment',
          title: `${appts} Appointment${appts > 1 ? 's' : ''}`,
          meta: `${entry.recheckCount} recheck, ${entry.newCount} new`,
          date: dateStr,
          sortDate: entry.date,
        });
      }
    }

    return items.sort((a, b) => b.sortDate.localeCompare(a.sortDate)).slice(0, 10);
  }, [stats]);

  // Loading state
  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className={cn(neoCard, 'p-6 flex items-center gap-3')}>
          <Loader2 size={20} className="animate-spin text-purple-600" />
          <span className="font-bold text-gray-700">Loading tracker...</span>
        </div>
      </div>
    );
  }

  const totalAll = (stats?.totals.mriCount ?? 0) + (stats?.surgeryBreakdown.total ?? 0);
  const breakdownTotal = currentBreakdown
    ? currentBreakdown.mri + currentBreakdown.surgery + currentBreakdown.recheck + currentBreakdown.newConsult
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* STATS GRID */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          number={totalAll}
          label="Total Completed"
          color="#8b5cf6"
        />
        <StatCard
          number={breakdowns?.weekly.mri ?? 0}
          label="Weekly MRIs"
          goal={goals.weeklyMri}
          interactive
          color="#8b5cf6"
          onEditGoal={() => handleEditGoal('weeklyMri')}
        />
        <StatCard
          number={breakdowns?.weekly.surgery ?? 0}
          label="Weekly Surgeries"
          goal={goals.weeklySurgery}
          interactive
          color="#ef4444"
          onEditGoal={() => handleEditGoal('weeklySurgery')}
        />
      </div>

      {/* BREAKDOWN SECTION */}
      <div className={cn(neoCard, 'p-5')}>
        {/* Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-5 border border-black/10">
          <button
            className={cn(
              'flex-1 py-2 text-sm font-bold rounded-lg transition-all',
              breakdownView === 'weekly'
                ? 'bg-white text-purple-600 shadow-sm border border-black/10'
                : 'text-gray-500 hover:text-gray-700',
            )}
            onClick={() => setBreakdownView('weekly')}
          >
            This Week
          </button>
          <button
            className={cn(
              'flex-1 py-2 text-sm font-bold rounded-lg transition-all',
              breakdownView === 'monthly'
                ? 'bg-white text-purple-600 shadow-sm border border-black/10'
                : 'text-gray-500 hover:text-gray-700',
            )}
            onClick={() => setBreakdownView('monthly')}
          >
            This Month
          </button>
        </div>

        {/* Breakdown Rows */}
        {currentBreakdown && (
          <>
            <BreakdownRow
              label="MRIs"
              icon={<Brain size={14} className="text-purple-600" />}
              iconBg="#f3e8ff"
              color="#8b5cf6"
              count={currentBreakdown.mri}
              total={breakdownTotal}
            />
            <BreakdownRow
              label="Surgeries"
              icon={<Scissors size={14} className="text-red-500" />}
              iconBg="#fef2f2"
              color="#ef4444"
              count={currentBreakdown.surgery}
              total={breakdownTotal}
            />
            <BreakdownRow
              label="Rechecks"
              icon={<Users size={14} className="text-blue-500" />}
              iconBg="#eff6ff"
              color="#3b82f6"
              count={currentBreakdown.recheck}
              total={breakdownTotal}
            />
            <BreakdownRow
              label="New Consults"
              icon={<Target size={14} className="text-green-500" />}
              iconBg="#f0fdf4"
              color="#22c55e"
              count={currentBreakdown.newConsult}
              total={breakdownTotal}
            />
          </>
        )}
      </div>

      {/* QUICK ADD SECTION */}
      <div className={cn(neoCard, 'p-5')}>
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          Quick Add
        </h3>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setQuickAddType('mri')}
            className={cn(
              neoButton,
              'flex-1 py-2.5 text-sm flex items-center justify-center gap-2',
            )}
            style={{
              backgroundColor:
                quickAddType === 'mri' ? NEO_POP.colors.lavender : NEO_POP.colors.white,
            }}
          >
            <Brain size={16} />
            MRI
          </button>
          <button
            onClick={() => setQuickAddType('surgery')}
            className={cn(
              neoButton,
              'flex-1 py-2.5 text-sm flex items-center justify-center gap-2',
            )}
            style={{
              backgroundColor:
                quickAddType === 'surgery' ? NEO_POP.colors.pink : NEO_POP.colors.white,
            }}
          >
            <Scissors size={16} />
            Surgery
          </button>
        </div>

        {/* MRI Quick Counter */}
        {quickAddType === 'mri' && (
          <div className="flex flex-col items-center py-4">
            <p className="text-xs text-gray-500 mb-3">
              {format(new Date(), 'EEEE, MMM d, yyyy')}
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => handleMriIncrement(-1)}
                disabled={incrementPending || (todayEntry?.mriCount ?? 0) <= 0}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center',
                  'text-white font-bold text-xl transition-all active:scale-90',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'bg-rose-500 hover:bg-rose-600 border-2 border-black shadow-[2px_2px_0_#000]',
                )}
              >
                <Minus size={20} />
              </button>

              <div className="w-24 text-center">
                <span
                  className={cn(
                    'text-5xl font-black tabular-nums transition-transform duration-200',
                    animatingField === 'mri' && 'scale-110',
                  )}
                  style={{ color: '#8b5cf6' }}
                >
                  {stats?.totals.mriCount ?? 0}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  +{todayEntry?.mriCount ?? 0} today
                </p>
              </div>

              <button
                onClick={() => handleMriIncrement(1)}
                disabled={incrementPending}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center',
                  'text-white font-bold text-xl transition-all active:scale-90',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'bg-emerald-500 hover:bg-emerald-600 border-2 border-black shadow-[2px_2px_0_#000]',
                )}
              >
                <Plus size={20} />
              </button>
            </div>

            {showSaved && (
              <div className="flex items-center gap-1 mt-3 text-xs text-emerald-600 font-bold animate-in fade-in duration-200">
                <Check size={14} />
                Saved
              </div>
            )}
          </div>
        )}

        {/* Surgery Quick Form */}
        {quickAddType === 'surgery' && (
          <QuickSurgeryForm
            onAdd={handleSurgeryAdd}
            isPending={addSurgeryMutation.isPending}
            dailyEntryId={todayEntry?.id ?? null}
          />
        )}
      </div>

      {/* RECENT HISTORY */}
      <div>
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide mb-3 ml-1">
          Recent History
        </h3>
        {recentHistory.length === 0 ? (
          <div className={cn(neoCard, 'p-6 text-center text-gray-500 text-sm')}>
            No entries yet. Use Quick Add above to start tracking.
          </div>
        ) : (
          recentHistory.map((item, idx) => (
            <HistoryItem key={`${item.type}-${item.date}-${idx}`} {...item} />
          ))
        )}
      </div>
    </div>
  );
}
