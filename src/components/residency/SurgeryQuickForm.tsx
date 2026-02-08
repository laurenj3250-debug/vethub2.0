'use client';

import { useState, useCallback } from 'react';
import { useAddSurgery, type Surgery } from '@/hooks/useResidencyStats';
import { PARTICIPATION_LEVELS, COMMON_PROCEDURES } from '@/lib/residency-milestones';
import { PatientQuickSelect } from '@/components/residency/PatientQuickSelect';
import { cn } from '@/lib/utils';
import { NEO_POP, neoButton } from '@/lib/neo-pop-styles';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SurgeryQuickFormProps {
  dailyEntryId: string | null;
  variant: 'compact' | 'full' | 'neo';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SurgeryQuickForm({ dailyEntryId, variant, onSuccess, onCancel }: SurgeryQuickFormProps) {
  const [procedure, setProcedure] = useState('');
  const [role, setRole] = useState<'S' | 'O' | 'C' | 'D' | 'K'>('O');
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');

  const { mutateAsync: addSurgery, isPending } = useAddSurgery();

  const resetForm = useCallback(() => {
    setProcedure('');
    setPatientId(null);
    setPatientName('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!procedure || !dailyEntryId) return;

    try {
      await addSurgery({
        dailyEntryId,
        procedureName: procedure,
        participation: role,
        patientId: patientId || undefined,
        patientName: patientName || undefined,
      });

      resetForm();
      onSuccess?.();
    } catch {
      // React Query mutation already handles toast and optimistic rollback
    }
  }, [procedure, role, patientId, patientName, dailyEntryId, addSurgery, resetForm, onSuccess]);

  const handlePatientChange = useCallback((id: number | null, name: string) => {
    setPatientId(id);
    setPatientName(name);
  }, []);

  if (variant === 'compact') {
    return (
      <div className="space-y-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <select
          value={procedure}
          onChange={(e) => setProcedure(e.target.value)}
          className="w-full text-xs p-1.5 rounded border bg-white dark:bg-slate-900"
        >
          <option value="">Select procedure...</option>
          {COMMON_PROCEDURES.map((proc) => (
            <option key={proc} value={proc}>{proc}</option>
          ))}
        </select>

        <PatientQuickSelect
          value={patientId}
          onChange={handlePatientChange}
          placeholder="Select patient (optional)..."
          size="sm"
        />

        <div className="flex gap-1">
          {Object.entries(PARTICIPATION_LEVELS).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => setRole(key as Surgery['participation'])}
              className={cn(
                'flex-1 py-1 text-[10px] font-medium rounded transition-colors',
                role === key ? `${color} text-white` : 'bg-slate-200 dark:bg-slate-700'
              )}
              title={label}
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!procedure || !dailyEntryId || isPending}
          className={cn(
            'w-full py-1.5 text-xs font-medium rounded transition-colors',
            'bg-red-500 hover:bg-red-600 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isPending ? 'Adding...' : 'Add Surgery'}
        </button>

        {!dailyEntryId && (
          <p className="text-[10px] text-amber-600 text-center">
            Log a case first to add surgeries
          </p>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
        <div className="space-y-2">
          <Label>Procedure</Label>
          <Select
            value={procedure}
            onValueChange={(v) => setProcedure(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select or type procedure..." />
            </SelectTrigger>
            <SelectContent>
              {COMMON_PROCEDURES.map((proc) => (
                <SelectItem key={proc} value={proc}>
                  {proc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Or type custom procedure..."
            value={procedure}
            onChange={(e) => setProcedure(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Your Role</Label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(PARTICIPATION_LEVELS).map(([key, { label, color }]) => (
              <Button
                key={key}
                variant={role === key ? 'default' : 'outline'}
                className={cn(
                  'flex flex-col h-auto min-h-[44px] py-3 px-1',
                  role === key && color
                )}
                onClick={() => setRole(key as Surgery['participation'])}
              >
                <span className="font-bold text-base">{key}</span>
                <span className="text-[10px] sm:text-xs opacity-80 leading-tight">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Patient (optional)</Label>
          <PatientQuickSelect
            value={patientId}
            onChange={handlePatientChange}
            placeholder="Select patient (optional)..."
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!procedure || isPending}
            className="h-11 min-h-[44px] px-6"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Surgery
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="h-11 min-h-[44px]"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // variant === 'neo'
  return (
    <div className="space-y-3">
      {/* Procedure */}
      <select
        value={procedure}
        onChange={(e) => setProcedure(e.target.value)}
        className="w-full text-sm p-2.5 rounded-xl border-2 border-black bg-white font-medium"
      >
        <option value="">Select procedure...</option>
        {COMMON_PROCEDURES.map((proc) => (
          <option key={proc} value={proc}>{proc}</option>
        ))}
      </select>

      {/* Role picker */}
      <div className="flex gap-1.5">
        {Object.entries(PARTICIPATION_LEVELS).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => setRole(key as Surgery['participation'])}
            className={cn(
              'flex-1 py-2 text-xs font-bold rounded-xl border-2 border-black transition-all',
              role === key
                ? `${color} text-white shadow-[2px_2px_0_#000]`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title={label}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="text-[10px] text-gray-500 text-center">
        {PARTICIPATION_LEVELS[role].label} — {PARTICIPATION_LEVELS[role].description}
      </div>

      {/* Patient picker */}
      <PatientQuickSelect
        value={patientId}
        onChange={handlePatientChange}
        placeholder="Select patient (optional)..."
        size="md"
      />

      {/* Add button */}
      <button
        onClick={handleSubmit}
        disabled={!procedure || isPending}
        className={`${neoButton} w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50`}
        style={{ backgroundColor: procedure ? NEO_POP.colors.pink : NEO_POP.colors.gray200 }}
      >
        {isPending ? (
          <><RefreshCw className="w-4 h-4 animate-spin" /> Adding...</>
        ) : (
          <><Plus className="w-4 h-4" /> Add Surgery</>
        )}
      </button>
    </div>
  );
}
