'use client';

import { useState, useMemo } from 'react';
import { Clock, Utensils, AlertCircle, Check, X, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDueFeedings,
  useLogFeeding,
  useFeedingSchedule,
  useCreateFeedingSchedule,
  calculateFeedingAmount,
  FOOD_OPTIONS,
  FREQUENCY_LABELS,
  type DueFeeding,
  type FeedingFrequency,
} from '@/hooks/useFeedingSchedule';

// Neo-pop styling
const NEO_BORDER = '2px solid #000';
const NEO_SHADOW_SM = '4px 4px 0 #000';

interface FeedingItemProps {
  feeding: DueFeeding;
  onComplete: () => void;
  isPending: boolean;
}

function FeedingItem({ feeding, onComplete, isPending }: FeedingItemProps) {
  const statusColors = {
    overdue: { bg: '#FFBDBD', text: 'text-red-800', badge: 'OVERDUE' },
    due: { bg: '#FEF3C7', text: 'text-amber-800', badge: 'DUE NOW' },
    upcoming: { bg: '#B8E6D4', text: 'text-emerald-800', badge: 'UPCOMING' },
  };

  const status = statusColors[feeding.status];

  return (
    <div
      className="p-3 rounded-xl flex items-center justify-between gap-3"
      style={{ backgroundColor: status.bg, border: NEO_BORDER }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Utensils className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{feeding.patientName}</div>
          <div className="text-xs text-gray-600 flex items-center gap-2">
            <span>{feeding.foodType}</span>
            <span className="font-mono">{feeding.amountGrams}g</span>
            <span className="font-mono">@ {feeding.scheduledTime}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded', status.text)}>
          {status.badge}
        </span>
        {feeding.status !== 'upcoming' && (
          <button
            onClick={onComplete}
            disabled={isPending}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              'bg-emerald-500 text-white hover:bg-emerald-600',
              'transition-all active:scale-95',
              isPending && 'opacity-50'
            )}
            style={{ border: NEO_BORDER, boxShadow: '2px 2px 0 #000' }}
            title="Mark as fed"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Dashboard widget showing all due feedings
export function FeedingDashboardWidget() {
  const { data: dueFeedings, isLoading } = useDueFeedings();
  const { mutate: logFeeding, isPending } = useLogFeeding();

  const handleComplete = (feeding: DueFeeding) => {
    logFeeding({
      scheduleId: feeding.scheduleId,
      scheduledTime: feeding.scheduledTime,
      scheduledDate: feeding.scheduledDate,
      percentEaten: 100, // Default to 100%
    });
  };

  if (isLoading) {
    return (
      <div
        className="p-4 rounded-2xl"
        style={{ backgroundColor: '#FEF3C7', border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Utensils className="w-5 h-5" />
          <span className="font-bold">Feeding Schedule</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-amber-200 rounded-lg" />
          <div className="h-12 bg-amber-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const overdueCount = dueFeedings?.filter((f) => f.status === 'overdue').length ?? 0;
  const dueNowCount = dueFeedings?.filter((f) => f.status === 'due').length ?? 0;

  return (
    <div
      className="p-4 rounded-2xl"
      style={{ backgroundColor: '#FEF3C7', border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5" />
          <span className="font-bold">Feeding Schedule</span>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
              {overdueCount} overdue
            </span>
          )}
          {dueNowCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
              {dueNowCount} due
            </span>
          )}
        </div>
        <Clock className="w-4 h-4 text-gray-500" />
      </div>

      {!dueFeedings?.length ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No feedings scheduled
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {dueFeedings.map((feeding) => (
            <FeedingItem
              key={`${feeding.scheduleId}-${feeding.scheduledTime}`}
              feeding={feeding}
              onComplete={() => handleComplete(feeding)}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Patient-specific feeding form and schedule viewer
interface PatientFeedingScheduleProps {
  patientId: number;
  patientName?: string;
  weightKg?: number;
  species?: string;
}

export function PatientFeedingSchedule({
  patientId,
  patientName,
  weightKg,
  species,
}: PatientFeedingScheduleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string>(FOOD_OPTIONS[0].name);
  const [frequency, setFrequency] = useState<FeedingFrequency>('q6h');
  const [notes, setNotes] = useState('');

  const { data: schedules, isLoading } = useFeedingSchedule(patientId);
  const { mutate: createSchedule, isPending: isCreating } = useCreateFeedingSchedule();
  const { mutate: logFeeding, isPending: isLogging } = useLogFeeding();

  // Calculate feeding amounts based on weight
  const foodOption = FOOD_OPTIONS.find((f) => f.name === selectedFood) ?? FOOD_OPTIONS[0];
  const calculations = useMemo(() => {
    if (!weightKg || weightKg <= 0) return null;
    return calculateFeedingAmount(weightKg, foodOption.kcalPer100g);
  }, [weightKg, foodOption.kcalPer100g]);

  const handleCreateSchedule = () => {
    if (!calculations) return;

    createSchedule({
      patientId,
      foodType: selectedFood,
      amountGrams: calculations.gramsPerFeeding[frequency],
      kcalPerDay: calculations.kcalPerDay,
      frequency,
      notes: notes || undefined,
    });

    setShowForm(false);
    setNotes('');
  };

  const activeSchedule = schedules?.find((s) => s.isActive);
  const today = new Date().toISOString().split('T')[0];

  // Don't show for cats (per existing FoodCalculator logic)
  const isCat = species?.toLowerCase().includes('cat') || species?.toLowerCase().includes('feline');
  if (isCat) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: NEO_BORDER }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-amber-50 transition-colors"
        style={{ backgroundColor: '#FEF3C7' }}
      >
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          <span className="font-bold text-sm">Feeding Schedule</span>
          {activeSchedule && (
            <span className="text-xs text-gray-600">
              ({activeSchedule.foodType} - {FREQUENCY_LABELS[activeSchedule.frequency as FeedingFrequency]})
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 bg-white space-y-3">
          {isLoading ? (
            <div className="text-center text-gray-500 text-sm py-2">Loading...</div>
          ) : activeSchedule ? (
            <>
              {/* Current schedule info */}
              <div className="p-2 rounded-lg bg-amber-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{activeSchedule.foodType}</span>
                  <span className="text-xs font-mono bg-white px-2 py-0.5 rounded">
                    {activeSchedule.amountGrams}g / feeding
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {FREQUENCY_LABELS[activeSchedule.frequency as FeedingFrequency]} at:{' '}
                  {activeSchedule.feedingTimes.join(', ')}
                </div>
                {activeSchedule.notes && (
                  <div className="text-xs text-amber-700 mt-1">
                    Note: {activeSchedule.notes}
                  </div>
                )}
              </div>

              {/* Today's feedings */}
              <div>
                <div className="text-xs font-bold mb-2">Today's Feedings</div>
                <div className="space-y-1">
                  {activeSchedule.feedingTimes.map((time) => {
                    const record = activeSchedule.feedingRecords?.find(
                      (r) => r.scheduledTime === time && r.scheduledDate === today
                    );

                    return (
                      <div
                        key={time}
                        className={cn(
                          'p-2 rounded-lg flex items-center justify-between text-sm',
                          record?.completedAt ? 'bg-emerald-50' : 'bg-gray-50'
                        )}
                      >
                        <span className="font-mono">{time}</span>
                        {record?.completedAt ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <Check className="w-4 h-4" />
                            <span className="text-xs">
                              {record.percentEaten !== null ? `${record.percentEaten}% eaten` : 'Fed'}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              logFeeding({
                                scheduleId: activeSchedule.id,
                                scheduledTime: time,
                                scheduledDate: today,
                                percentEaten: 100,
                              })
                            }
                            disabled={isLogging}
                            className="px-2 py-1 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50"
                          >
                            Mark Fed
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : !showForm ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">No feeding schedule set</p>
              {weightKg && weightKg > 0 ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 text-sm font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-2 mx-auto"
                  style={{ border: NEO_BORDER, boxShadow: '2px 2px 0 #000' }}
                >
                  <Plus className="w-4 h-4" />
                  Set Up Schedule
                </button>
              ) : (
                <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Add patient weight to enable
                </p>
              )}
            </div>
          ) : null}

          {/* New schedule form */}
          {showForm && (
            <div className="space-y-3 p-3 bg-amber-50 rounded-lg">
              <div className="text-sm font-bold">New Feeding Schedule</div>

              {/* Food selection */}
              <div>
                <label className="text-xs font-medium block mb-1">Food Type</label>
                <select
                  value={selectedFood}
                  onChange={(e) => setSelectedFood(e.target.value)}
                  className="w-full p-2 text-sm rounded border bg-white"
                >
                  {FOOD_OPTIONS.map((food) => (
                    <option key={food.name} value={food.name}>
                      {food.name} ({food.kcalPer100g} kcal/100g)
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency selection */}
              <div>
                <label className="text-xs font-medium block mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as FeedingFrequency)}
                  className="w-full p-2 text-sm rounded border bg-white"
                >
                  {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculated amounts */}
              {calculations && (
                <div className="p-2 bg-white rounded text-sm">
                  <div className="text-xs text-gray-500 mb-1">
                    50% RER @ {weightKg}kg = {calculations.kcalPerDay.toFixed(0)} kcal/day
                  </div>
                  <div className="font-bold text-emerald-700">
                    {calculations.gramsPerFeeding[frequency]}g per feeding
                  </div>
                  <div className="text-xs text-gray-500">
                    ({calculations.gramsPerDay.toFixed(0)}g/day total)
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium block mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., warm food, elevated bowl..."
                  className="w-full p-2 text-sm rounded border"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-3 py-2 text-sm rounded border hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSchedule}
                  disabled={isCreating || !calculations}
                  className="flex-1 px-3 py-2 text-sm font-bold rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
