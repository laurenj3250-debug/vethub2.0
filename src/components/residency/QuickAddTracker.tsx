'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Brain,
  Scissors,
  Plus,
  Minus,
  RefreshCw,
  Users,
  Stethoscope,
  AlertTriangle,
  Target,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import {
  useResidencyStats,
  useQuickIncrement,
  useDailyEntry,
  usePendingSurgeries,
  useAddSurgery,
  type CounterField,
} from '@/hooks/useResidencyStats';
import { SurgeryQuickForm } from '@/components/residency/SurgeryQuickForm';
import { COMMON_PROCEDURES } from '@/lib/residency-milestones';
import { NEO_POP, neoCard, neoButton } from '@/lib/neo-pop-styles';
import { cn } from '@/lib/utils';
import { getTodayET } from '@/lib/timezone';
import type { PendingSurgery } from '@/hooks/useResidencyStats';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval, format, addDays, subDays } from 'date-fns';

// localStorage keys for editable goals
const MRI_GOAL_KEY = 'residency-goal-mri-daily';
const SURGERY_GOAL_KEY = 'residency-goal-surgery-daily';

function useLocalStorageGoal(key: string, defaultValue: number) {
  const [goal, setGoal] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return defaultValue;
  });

  const updateGoal = useCallback((newGoal: number) => {
    if (newGoal > 0) {
      setGoal(newGoal);
      localStorage.setItem(key, String(newGoal));
    }
  }, [key]);

  return [goal, updateGoal] as const;
}

function EditableGoal({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="1"
          max="99"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-10 text-xs text-center border-2 border-black rounded px-1 py-0.5"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = parseInt(draft, 10);
              if (!isNaN(v) && v > 0) onChange(v);
              setEditing(false);
            }
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <button onClick={() => { const v = parseInt(draft, 10); if (!isNaN(v) && v > 0) onChange(v); setEditing(false); }}
          className="text-emerald-600 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
        <button onClick={() => setEditing(false)} className="text-rose-500 hover:text-rose-600"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  return (
    <button onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
      title={`Click to edit daily ${label} goal`}>
      Goal: {value} <Pencil className="w-2.5 h-2.5" />
    </button>
  );
}

// Pending surgery row — pre-filled patient, just needs procedure + role
function PendingSurgeryRow({
  pending,
  dailyEntryId,
  date,
}: {
  pending: PendingSurgery;
  dailyEntryId: string | null;
  date: string;
}) {
  const [procedure, setProcedure] = useState('');
  const [role, setRole] = useState<'Primary' | 'Assistant'>('Primary');
  const { mutateAsync: addSurgery, isPending } = useAddSurgery();

  const handleLog = useCallback(async () => {
    if (!procedure) return;
    try {
      await addSurgery({
        dailyEntryId: dailyEntryId || undefined,
        date,
        procedureName: procedure,
        role,
        patientOrigin: 'hospitalized', // Surgery patients are already admitted
        patientId: pending.patientId,
        patientName: pending.patientName,
      });
    } catch {
      // Toast handled by mutation
    }
  }, [procedure, role, dailyEntryId, date, pending, addSurgery]);

  return (
    <div
      className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2"
      style={{ boxShadow: '2px 2px 0 #000' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-gray-900">{pending.patientName}</span>
          {pending.species && (
            <span className="text-xs text-gray-500">{pending.species}</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 items-end">
        <select
          value={procedure}
          onChange={(e) => setProcedure(e.target.value)}
          className="flex-1 text-xs p-2 rounded-xl border-2 border-black bg-white font-medium"
        >
          <option value="">Procedure...</option>
          {COMMON_PROCEDURES.map((proc) => (
            <option key={proc} value={proc}>{proc}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(['Primary', 'Assistant'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                'px-2.5 py-2 text-xs font-bold rounded-xl border-2 border-black transition-all',
                role === r
                  ? r === 'Primary'
                    ? 'bg-green-500 text-white shadow-[2px_2px_0_#000]'
                    : 'bg-blue-400 text-white shadow-[2px_2px_0_#000]'
                  : 'bg-white text-gray-500'
              )}
            >
              {r === 'Primary' ? 'P' : 'A'}
            </button>
          ))}
        </div>
        <button
          onClick={handleLog}
          disabled={!procedure || isPending}
          className={cn(
            'px-4 py-2 text-xs font-bold rounded-xl border-2 border-black transition-all',
            'disabled:opacity-40',
            procedure ? 'bg-green-500 text-white shadow-[2px_2px_0_#000]' : 'bg-gray-200 text-gray-400'
          )}
        >
          {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function QuickAddTracker() {
  const { data: stats, isLoading: statsLoading } = useResidencyStats();
  const { mutate: increment, isPending } = useQuickIncrement();

  // Date navigation state
  const today = getTodayET();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  // Fetch entry for selected date
  const { data: dayEntry, isLoading: dayLoading } = useDailyEntry(selectedDate);

  // Pending surgery patients (admitted but not yet logged)
  const { data: pendingSurgeries } = usePendingSurgeries();

  // Quick add mode toggle
  const [mode, setMode] = useState<'mri' | 'surgery'>('mri');
  const [breakdownView, setBreakdownView] = useState<'weekly' | 'monthly'>('weekly');

  // Editable daily goals
  const [mriGoal, setMriGoal] = useLocalStorageGoal(MRI_GOAL_KEY, 3);
  const [surgeryGoal, setSurgeryGoal] = useLocalStorageGoal(SURGERY_GOAL_KEY, 1);

  // Selected day's values
  const dayMri = dayEntry?.mriCount ?? 0;
  const dayRecheck = dayEntry?.recheckCount ?? 0;
  const dayConsult = dayEntry?.newConsultCount ?? 0;
  const dayEmergency = dayEntry?.emergencyCount ?? 0;
  const daySurgeries = dayEntry?.surgeries?.length ?? 0;
  const dayTotal = dayMri + dayRecheck + dayConsult + dayEmergency;

  // Date navigation
  const goBack = useCallback(() => {
    const prev = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(prev, 'yyyy-MM-dd'));
  }, [selectedDate]);

  const goForward = useCallback(() => {
    if (!isToday) {
      const next = addDays(parseISO(selectedDate), 1);
      const nextStr = format(next, 'yyyy-MM-dd');
      // Don't go past today
      if (nextStr <= today) {
        setSelectedDate(nextStr);
      }
    }
  }, [selectedDate, isToday, today]);

  const goToToday = useCallback(() => {
    setSelectedDate(today);
  }, [today]);

  // Format date for display
  const displayDate = useMemo(() => {
    if (isToday) return 'Today';
    const d = parseISO(selectedDate);
    const yesterday = subDays(parseISO(today), 1);
    if (format(d, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday';
    return format(d, 'EEE, MMM d');
  }, [selectedDate, isToday, today]);

  // Breakdown data
  const breakdownData = useMemo(() => {
    if (!stats?.weeklyData?.length) return { mri: 0, surgery: 0, recheck: 0, consult: 0, emergency: 0 };

    const now = new Date();
    let interval: { start: Date; end: Date };

    if (breakdownView === 'weekly') {
      interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    } else {
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
    }

    const filtered = stats.weeklyData.filter((entry) => {
      try {
        const entryDate = parseISO(entry.date);
        return isWithinInterval(entryDate, interval);
      } catch {
        return false;
      }
    });

    return {
      mri: filtered.reduce((sum, e) => sum + (e.mriCount || 0), 0),
      surgery: filtered.reduce((sum, e) => sum + (e.surgeries?.length || 0), 0),
      recheck: filtered.reduce((sum, e) => sum + (e.recheckCount || 0), 0),
      consult: filtered.reduce((sum, e) => sum + (e.newConsultCount || 0), 0),
      emergency: filtered.reduce((sum, e) => sum + (e.emergencyCount || 0), 0),
    };
  }, [stats?.weeklyData, breakdownView]);

  const maxBreakdown = Math.max(breakdownData.mri, breakdownData.surgery, breakdownData.recheck, breakdownData.consult, breakdownData.emergency, 1);

  const handleIncrement = useCallback((field: CounterField, delta: number) => {
    increment({ field, delta, date: selectedDate });
  }, [increment, selectedDate]);

  if (statsLoading || dayLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${neoCard} p-6 animate-pulse`}>
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Navigator */}
      <div className={`${neoCard} p-3`}>
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            className={`${neoButton} w-10 h-10 flex items-center justify-center`}
            style={{ backgroundColor: NEO_POP.colors.white }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className={cn(
              'text-sm font-bold',
              isToday ? 'text-gray-900' : 'text-amber-700'
            )}>
              {displayDate}
            </span>
            {!isToday && (
              <button
                onClick={goToToday}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Back to today
              </button>
            )}
          </div>

          <button
            onClick={goForward}
            disabled={isToday}
            className={`${neoButton} w-10 h-10 flex items-center justify-center disabled:opacity-30`}
            style={{ backgroundColor: NEO_POP.colors.white }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {!isToday && (
          <div className="mt-2 text-center">
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-medium">
              Logging for {format(parseISO(selectedDate), 'MMMM d, yyyy')}
            </span>
          </div>
        )}
      </div>

      {/* Section 1: Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${neoCard} p-4`} style={{ backgroundColor: NEO_POP.colors.cream }}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-bold text-gray-700">{displayDate}&apos;s Total</span>
          </div>
          <div className="text-3xl font-black text-gray-900">{dayTotal}</div>
          <p className="text-xs text-gray-500 mt-1">cases logged</p>
        </div>

        <div className={`${neoCard} p-4`} style={{ backgroundColor: '#F3E8FF' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-bold text-purple-800">MRIs</span>
            </div>
            <EditableGoal value={mriGoal} onChange={setMriGoal} label="MRI" />
          </div>
          <div className="text-3xl font-black text-purple-900">{dayMri}</div>
          <div className="mt-2 h-2 rounded-full border border-black overflow-hidden" style={{ backgroundColor: NEO_POP.colors.gray200 }}>
            <div
              className="h-full bg-purple-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (dayMri / mriGoal) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-purple-600 mt-1">{dayMri}/{mriGoal} daily goal</p>
        </div>

        <div className={`${neoCard} p-4`} style={{ backgroundColor: '#FEE2E2' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-red-600" />
              <span className="text-sm font-bold text-red-800">Surgeries</span>
            </div>
            <EditableGoal value={surgeryGoal} onChange={setSurgeryGoal} label="surgery" />
          </div>
          <div className="text-3xl font-black text-red-900">{daySurgeries}</div>
          <div className="mt-2 h-2 rounded-full border border-black overflow-hidden" style={{ backgroundColor: NEO_POP.colors.gray200 }}>
            <div
              className="h-full bg-red-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (daySurgeries / surgeryGoal) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-red-600 mt-1">{daySurgeries}/{surgeryGoal} daily goal</p>
        </div>
      </div>

      {/* Section 2: Breakdown Panel */}
      <div className={`${neoCard} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-900">Breakdown</span>
          <div className="flex gap-1">
            {(['weekly', 'monthly'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setBreakdownView(view)}
                className={`${neoButton} px-3 py-1 text-xs capitalize`}
                style={{
                  backgroundColor: breakdownView === view ? NEO_POP.colors.lavender : NEO_POP.colors.white,
                }}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2.5">
          {[
            { label: 'MRIs', value: breakdownData.mri, color: 'bg-purple-500', textColor: 'text-purple-700' },
            { label: 'Surgeries', value: breakdownData.surgery, color: 'bg-red-500', textColor: 'text-red-700' },
            { label: 'Rechecks', value: breakdownData.recheck, color: 'bg-blue-500', textColor: 'text-blue-700' },
            { label: 'New Consults', value: breakdownData.consult, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
            { label: 'Emergencies', value: breakdownData.emergency, color: 'bg-amber-500', textColor: 'text-amber-700' },
          ].map(({ label, value, color, textColor }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`text-xs font-medium w-24 ${textColor}`}>{label}</span>
              <div className="flex-1 h-4 rounded-full border border-black overflow-hidden bg-gray-100">
                <div
                  className={`h-full ${color} transition-all duration-500 rounded-full`}
                  style={{ width: `${maxBreakdown > 0 ? (value / maxBreakdown) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold w-8 text-right tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Quick Add Forms */}
      <div className={`${neoCard} p-4`}>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('mri')}
            className={`${neoButton} flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm`}
            style={{
              backgroundColor: mode === 'mri' ? NEO_POP.colors.lavender : NEO_POP.colors.white,
            }}
          >
            <Brain className="w-4 h-4" />
            MRI Mode
          </button>
          <button
            onClick={() => setMode('surgery')}
            className={`${neoButton} flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm`}
            style={{
              backgroundColor: mode === 'surgery' ? NEO_POP.colors.pink : NEO_POP.colors.white,
            }}
          >
            <Scissors className="w-4 h-4" />
            Surgery Mode
          </button>
        </div>

        {mode === 'mri' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleIncrement('mriCount', -1)}
                disabled={dayMri <= 0 || isPending}
                className={`${neoButton} w-14 h-14 flex items-center justify-center text-xl disabled:opacity-40`}
                style={{ backgroundColor: NEO_POP.colors.pink }}
              >
                <Minus className="w-6 h-6" />
              </button>
              <div className="text-center">
                <div className="text-4xl font-black text-gray-900 tabular-nums">{dayMri}</div>
                <div className="text-xs text-gray-500">MRIs {isToday ? 'today' : displayDate}</div>
              </div>
              <button
                onClick={() => handleIncrement('mriCount', 1)}
                disabled={isPending}
                className={`${neoButton} w-14 h-14 flex items-center justify-center text-xl disabled:opacity-40`}
                style={{ backgroundColor: NEO_POP.colors.mint }}
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            {isPending && (
              <div className="flex justify-center">
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}

            <div className="border-t-2 border-black pt-3 space-y-2">
              {[
                { label: 'Rechecks', field: 'recheckCount' as CounterField, value: dayRecheck, icon: <Users className="w-4 h-4" />, color: 'text-blue-600' },
                { label: 'New Consults', field: 'newConsultCount' as CounterField, value: dayConsult, icon: <Stethoscope className="w-4 h-4" />, color: 'text-emerald-600' },
                { label: 'Emergencies', field: 'emergencyCount' as CounterField, value: dayEmergency, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-600' },
              ].map(({ label, field, value, icon, color }) => (
                <div key={field} className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 ${color}`}>
                    {icon}
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleIncrement(field, -1)}
                      disabled={value <= 0 || isPending}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-40 transition-all active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums">{value}</span>
                    <button
                      onClick={() => handleIncrement(field, 1)}
                      disabled={isPending}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 transition-all active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Surgery Mode — pending patients + manual form */
          <div className="space-y-3">
            {/* Pending surgery patients (admitted but not logged) */}
            {pendingSurgeries && pendingSurgeries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-amber-700">
                    {pendingSurgeries.length} surgery patient{pendingSurgeries.length !== 1 ? 's' : ''} to log
                  </span>
                </div>
                {pendingSurgeries.map((pending) => (
                  <PendingSurgeryRow
                    key={pending.patientId}
                    pending={pending}
                    dailyEntryId={dayEntry?.id || null}
                    date={selectedDate}
                  />
                ))}
                <div className="border-t-2 border-dashed border-gray-300 pt-3">
                  <span className="text-[10px] text-gray-400 font-medium">Or add manually:</span>
                </div>
              </div>
            )}
            <SurgeryQuickForm
              dailyEntryId={dayEntry?.id || null}
              date={selectedDate}
              variant="neo"
            />
          </div>
        )}
      </div>

      {/* Section 4: Day's History */}
      <div className={`${neoCard} p-4`}>
        <h3 className="text-sm font-bold text-gray-900 mb-3">{displayDate}&apos;s Log</h3>

        {dayTotal === 0 && daySurgeries === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nothing logged{isToday ? ' yet today' : ` for ${displayDate}`}</p>
        ) : (
          <div className="space-y-2">
            {dayMri > 0 && (
              <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-purple-50 border border-purple-200">
                <Brain className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-purple-800">{dayMri} MRI{dayMri !== 1 ? 's' : ''}</span>
              </div>
            )}

            {(dayRecheck > 0 || dayConsult > 0 || dayEmergency > 0) && (
              <div className="flex gap-2 flex-wrap">
                {dayRecheck > 0 && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                    {dayRecheck} Recheck{dayRecheck !== 1 ? 's' : ''}
                  </span>
                )}
                {dayConsult > 0 && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                    {dayConsult} New Consult{dayConsult !== 1 ? 's' : ''}
                  </span>
                )}
                {dayEmergency > 0 && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                    {dayEmergency} Emergenc{dayEmergency !== 1 ? 'ies' : 'y'}
                  </span>
                )}
              </div>
            )}

            {dayEntry?.surgeries && dayEntry.surgeries.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {dayEntry.surgeries.map((surgery) => {
                  const displayRole = surgery.role || (surgery.participation === 'S' ? 'Primary' : 'Assistant');
                  const roleColor = displayRole === 'Primary' ? 'bg-green-500' : 'bg-blue-400';

                  return (
                    <div
                      key={surgery.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-red-50 border border-red-200"
                    >
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-medium text-gray-900">{surgery.procedureName}</span>
                        {surgery.patientName && (
                          <span className="text-gray-500">({surgery.patientName})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {surgery.patientOrigin && (
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium',
                            surgery.patientOrigin === 'new'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          )}>
                            {surgery.patientOrigin}
                          </span>
                        )}
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold text-white', roleColor)}>
                          {displayRole}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
