'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAddSurgery } from '@/hooks/useResidencyStats';
import { COMMON_PROCEDURES } from '@/lib/residency-milestones';
import { PatientQuickSelect } from '@/components/residency/PatientQuickSelect';
import { cn } from '@/lib/utils';
import { NEO_POP, neoButton } from '@/lib/neo-pop-styles';
import { Plus, RefreshCw, Loader2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CERT_CATEGORIES, suggestCertCategories, type CertCategory } from '@/lib/certificate-logic';

// Extracted toggle components to avoid re-mount on parent re-render
function RoleToggle({ role, onRoleChange, size = 'md' }: { role: 'Primary' | 'Assistant'; onRoleChange: (r: 'Primary' | 'Assistant') => void; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('flex gap-2', size === 'sm' ? 'gap-1' : 'gap-2')}>
      {(['Primary', 'Assistant'] as const).map((r) => (
        <button
          key={r}
          onClick={() => onRoleChange(r)}
          className={cn(
            'flex-1 font-bold rounded-xl border-2 border-black transition-all',
            size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm',
            role === r
              ? r === 'Primary'
                ? 'bg-green-500 text-white shadow-[2px_2px_0_#000]'
                : 'bg-blue-400 text-white shadow-[2px_2px_0_#000]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function OriginToggle({ patientOrigin, onOriginChange, size = 'md' }: { patientOrigin: 'new' | 'hospitalized'; onOriginChange: (v: 'new' | 'hospitalized') => void; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('flex gap-2', size === 'sm' ? 'gap-1' : 'gap-2')}>
      {([
        { value: 'new' as const, label: 'New Patient', color: 'bg-emerald-500' },
        { value: 'hospitalized' as const, label: 'Hospitalized', color: 'bg-amber-500' },
      ]).map(({ value, label, color }) => (
        <button
          key={value}
          onClick={() => onOriginChange(value)}
          className={cn(
            'flex-1 font-medium rounded-xl border-2 border-black transition-all',
            size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm',
            patientOrigin === value
              ? `${color} text-white shadow-[2px_2px_0_#000]`
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Certificate category picker — shows suggested categories with "Show all" expander
function CertCategoryPicker({ categories, selected, onToggle, size = 'md' }: {
  categories: CertCategory[];
  selected: CertCategory[];
  onToggle: (cat: CertCategory) => void;
  size?: 'sm' | 'md';
}) {
  const [showAll, setShowAll] = useState(false);
  const allCategories = Object.entries(CERT_CATEGORIES) as [CertCategory, string][];

  // Show: suggested + selected + (all if expanded)
  const visibleCategories = showAll
    ? allCategories
    : allCategories.filter(([key]) => categories.includes(key) || selected.includes(key));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Award className={cn('text-amber-500', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
          <span className={cn('font-bold text-gray-600', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
            Certificate Category
          </span>
        </div>
        {!showAll && visibleCategories.length < allCategories.length && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={cn('text-amber-600 hover:text-amber-700', size === 'sm' ? 'text-[10px]' : 'text-xs')}
          >
            Show all
          </button>
        )}
        {showAll && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className={cn('text-gray-500 hover:text-gray-600', size === 'sm' ? 'text-[10px]' : 'text-xs')}
          >
            Show less
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visibleCategories.map(([key, label]) => {
          const isSelected = selected.includes(key);
          const isSuggested = categories.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={isSelected}
              className={cn(
                'rounded-lg border-2 border-black transition-all',
                size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
                isSelected
                  ? 'bg-amber-400 text-black font-bold shadow-[2px_2px_0_#000]'
                  : isSuggested
                    ? 'bg-amber-100 text-amber-800 font-medium'
                    : 'bg-gray-50 text-gray-400 border-gray-300'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SurgeryQuickFormProps {
  dailyEntryId?: string | null;
  date?: string; // ISO date for backdating
  variant: 'compact' | 'full' | 'neo';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SurgeryQuickForm({ dailyEntryId, date, variant, onSuccess, onCancel }: SurgeryQuickFormProps) {
  const [procedure, setProcedure] = useState('');
  const [role, setRole] = useState<'Primary' | 'Assistant'>('Primary');
  const [patientOrigin, setPatientOrigin] = useState<'new' | 'hospitalized'>('new');
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [certCategories, setCertCategories] = useState<CertCategory[]>([]);
  const [showCertPicker, setShowCertPicker] = useState(false);

  const { mutateAsync: addSurgery, isPending } = useAddSurgery();

  // Auto-suggest certificate categories when procedure changes
  useEffect(() => {
    if (procedure) {
      const suggested = suggestCertCategories(procedure);
      setCertCategories(suggested);
      setShowCertPicker(suggested.length > 0);
    } else {
      setCertCategories([]);
      setShowCertPicker(false);
    }
  }, [procedure]);

  const toggleCertCategory = useCallback((cat: CertCategory) => {
    setCertCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const resetForm = useCallback(() => {
    setProcedure('');
    setPatientId(null);
    setPatientName('');
    setCertCategories([]);
    setShowCertPicker(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!procedure) return;

    try {
      await addSurgery({
        dailyEntryId: dailyEntryId || undefined,
        date,
        procedureName: procedure,
        role,
        patientOrigin,
        patientId: patientId || undefined,
        patientName: patientName || undefined,
        certificateCategories: certCategories,
      });

      resetForm();
      onSuccess?.();
    } catch {
      // React Query mutation already handles toast and optimistic rollback
    }
  }, [procedure, role, patientOrigin, patientId, patientName, certCategories, dailyEntryId, date, addSurgery, resetForm, onSuccess]);

  const handlePatientChange = useCallback((id: number | null, name: string) => {
    setPatientId(id);
    setPatientName(name);
  }, []);

  if (variant === 'compact') {
    return (
      <div className="space-y-2 p-2 bg-slate-50 rounded-lg">
        <select
          value={procedure}
          onChange={(e) => setProcedure(e.target.value)}
          className="w-full text-xs p-1.5 rounded border bg-white"
        >
          <option value="">Select procedure...</option>
          {COMMON_PROCEDURES.map((proc) => (
            <option key={proc} value={proc}>{proc}</option>
          ))}
        </select>

        <RoleToggle role={role} onRoleChange={setRole} size="sm" />
        <OriginToggle patientOrigin={patientOrigin} onOriginChange={setPatientOrigin} size="sm" />

        <PatientQuickSelect
          value={patientId}
          onChange={handlePatientChange}
          placeholder="Select patient (optional)..."
          size="sm"
        />

        {(showCertPicker || certCategories.length > 0) && (
          <CertCategoryPicker
            categories={suggestCertCategories(procedure)}
            selected={certCategories}
            onToggle={toggleCertCategory}
            size="sm"
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={!procedure || isPending}
          className={cn(
            'w-full py-1.5 text-xs font-medium rounded transition-colors',
            'bg-red-500 hover:bg-red-600 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isPending ? 'Adding...' : 'Add Surgery'}
        </button>
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
              <SelectValue placeholder="Select procedure..." />
            </SelectTrigger>
            <SelectContent>
              {COMMON_PROCEDURES.map((proc) => (
                <SelectItem key={proc} value={proc}>
                  {proc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Your Role</Label>
          <RoleToggle role={role} onRoleChange={setRole} />
        </div>

        <div className="space-y-2">
          <Label>Patient Type</Label>
          <OriginToggle patientOrigin={patientOrigin} onOriginChange={setPatientOrigin} />
        </div>

        <div className="space-y-2">
          <Label>Patient (optional)</Label>
          <PatientQuickSelect
            value={patientId}
            onChange={handlePatientChange}
            placeholder="Select patient (optional)..."
          />
        </div>

        {/* Certificate category picker */}
        {(showCertPicker || certCategories.length > 0) && (
          <CertCategoryPicker
            categories={suggestCertCategories(procedure)}
            selected={certCategories}
            onToggle={toggleCertCategory}
          />
        )}

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

      {/* Role picker: Primary / Assistant */}
      <RoleToggle role={role} onRoleChange={setRole} />

      {/* Patient origin: New / Hospitalized */}
      <OriginToggle patientOrigin={patientOrigin} onOriginChange={setPatientOrigin} />

      {/* Patient picker */}
      <PatientQuickSelect
        value={patientId}
        onChange={handlePatientChange}
        placeholder="Select patient (optional)..."
        size="md"
      />

      {/* Certificate category picker */}
      {(showCertPicker || certCategories.length > 0) && (
        <CertCategoryPicker
          categories={suggestCertCategories(procedure)}
          selected={certCategories}
          onToggle={toggleCertCategory}
        />
      )}
      {procedure && !showCertPicker && certCategories.length === 0 && (
        <button
          type="button"
          onClick={() => setShowCertPicker(true)}
          className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          <Award className="w-3 h-3" />
          Tag for certificate
        </button>
      )}

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
