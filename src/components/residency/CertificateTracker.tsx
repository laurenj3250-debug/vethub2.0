'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { NEO_POP, neoCard, neoButton } from '@/lib/neo-pop-styles';
import {
  Award,
  AlertCircle,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { COMMON_PROCEDURES } from '@/lib/residency-milestones';
import {
  computeCertificateProgress,
  CERT_CATEGORIES,
  CERT_DISMISSED,
  suggestCertCategories,
  type CaseForCert,
  type CertStatusData,
  type CertificateProgress,
  type CertCategory,
  type ExpiryStatus,
} from '@/lib/certificate-logic';

// ==========================================
// Data Fetching
// ==========================================

function useCertificateData() {
  const [cases, setCases] = useState<CaseForCert[]>([]);
  const [certStatus, setCertStatus] = useState<CertStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [casesRes, statusRes] = await Promise.all([
        fetch('/api/acvim/cases?all=true'),
        fetch('/api/acvim/certificate-status'),
      ]);

      if (!casesRes.ok || !statusRes.ok) {
        setError('Failed to load certificate data. Check your connection.');
        return;
      }

      setCases(await casesRes.json());
      setCertStatus(await statusRes.json());
    } catch (err) {
      console.error('Error loading certificate data:', err);
      setError('Failed to load certificate data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateCertStatus = useCallback(async (updates: Partial<CertStatusData>) => {
    try {
      const res = await fetch('/api/acvim/certificate-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setCertStatus(updated);
      }
    } catch (error) {
      console.error('Error updating cert status:', error);
    }
  }, []);

  const tagCase = useCallback(async (caseId: string, categories: string[]) => {
    try {
      const res = await fetch('/api/acvim/cases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: caseId, certificateCategories: categories }),
      });
      if (res.ok) {
        setCases((prev) =>
          prev.map((c) => c.id === caseId ? { ...c, certificateCategories: categories } : c)
        );
      }
    } catch (error) {
      console.error('Error tagging case:', error);
    }
  }, []);

  return { cases, certStatus, loading, error, updateCertStatus, tagCase, reload: loadData };
}

// ==========================================
// Sub-Components
// ==========================================

function ExpiryBadge({ status }: { status: ExpiryStatus }) {
  if (status === 'valid') return null;
  if (status === 'expiring_soon') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
        <Clock className="w-3 h-3" /> Expiring soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
      <AlertTriangle className="w-3 h-3" /> Expired
    </span>
  );
}

function BreadAndButterCard({ title, data }: {
  title: string;
  data: CertificateProgress['hemis'];
}) {
  const totalPercent = Math.min(100, Math.round((data.total / data.target) * 100));
  const primaryPercent = Math.min(100, Math.round((data.primary / data.primaryTarget) * 100));

  return (
    <div
      className={neoCard}
      style={{ backgroundColor: data.met ? '#ECFDF5' : NEO_POP.colors.cream, padding: '16px' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">{title}</h3>
        {data.met && (
          <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
            <Check className="w-4 h-4" /> Met
          </span>
        )}
      </div>

      {/* Total progress */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs">
          <span className="font-medium">Total</span>
          <span className="font-bold">{data.total} / {data.target}</span>
        </div>
        <div className="h-3 rounded-full border-2 border-black overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${totalPercent}%`,
              backgroundColor: data.met ? '#10B981' : NEO_POP.colors.mintDark,
            }}
          />
        </div>
      </div>

      {/* Primary progress */}
      <div className="space-y-1 mb-2">
        <div className="flex justify-between text-xs">
          <span className="font-medium">Primary Surgeon</span>
          <span className="font-bold">{data.primary} / {data.primaryTarget}</span>
        </div>
        <div className="h-2 rounded-full border border-gray-300 overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full transition-all bg-green-400"
            style={{ width: `${primaryPercent}%` }}
          />
        </div>
      </div>

      {/* Expiry warnings */}
      {data.expiringSoon > 0 && (
        <div className="flex items-center gap-1 text-amber-600 text-xs mt-2">
          <Clock className="w-3 h-3" />
          <span>{data.expiringSoon} expiring within 6 months</span>
        </div>
      )}
      {data.expired > 0 && (
        <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
          <AlertTriangle className="w-3 h-3" />
          <span>{data.expired} expired (not counted)</span>
        </div>
      )}
    </div>
  );
}

function SpecialProceduresList({ procedures }: { procedures: CertificateProgress['specialProcedures'] }) {
  const completed = procedures.filter((p) => p.completed).length;

  return (
    <div className={neoCard} style={{ backgroundColor: NEO_POP.colors.cream, padding: '16px' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Special Procedures</h3>
        <span className={cn(
          'text-xs font-bold px-2 py-0.5 rounded-full border-2 border-black',
          completed === 12 ? 'bg-green-400' : 'bg-gray-100'
        )}>
          {completed} / 12
        </span>
      </div>

      <div className="space-y-2">
        {procedures.map((proc) => (
          <div
            key={proc.id}
            className={cn(
              'flex items-center justify-between py-2 px-3 rounded-lg border',
              proc.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-dashed border-gray-300'
            )}
          >
            <div className="flex items-center gap-2">
              {proc.completed ? (
                <Check className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
              )}
              <span className={cn('text-sm', proc.completed ? 'font-medium' : 'text-gray-500')}>
                {proc.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {proc.caseDate && (
                <span className="text-xs text-gray-500">{proc.caseDate}</span>
              )}
              {proc.role && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white',
                  proc.role === 'Primary' ? 'bg-green-500' : 'bg-blue-400'
                )}>
                  {proc.role}
                </span>
              )}
              {proc.expiryStatus && <ExpiryBadge status={proc.expiryStatus} />}
              {!proc.completed && (
                <span className="text-xs text-gray-400 italic">needed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OtherRequirements({ progress, onUpdate }: {
  progress: CertificateProgress;
  onUpdate: (updates: Partial<CertStatusData>) => void;
}) {
  const [rotationWeeks, setRotationWeeks] = useState(progress.rotationWeeks);

  return (
    <div className={neoCard} style={{ backgroundColor: NEO_POP.colors.cream, padding: '16px' }}>
      <h3 className="font-bold text-sm mb-3">Other Requirements</h3>

      <div className="space-y-3">
        {/* Board Certified */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-white">
          <div className="flex items-center gap-2">
            {progress.boardCertified ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <div className="w-4 h-4 rounded border-2 border-gray-300" />
            )}
            <span className="text-sm font-medium">Board Certified (Neurology)</span>
          </div>
          <button
            onClick={() => onUpdate({ boardCertified: !progress.boardCertified })}
            className={cn(
              neoButton,
              'px-3 py-1 text-xs',
            )}
            style={{
              backgroundColor: progress.boardCertified ? NEO_POP.colors.mint : NEO_POP.colors.gray200,
            }}
          >
            {progress.boardCertified ? 'Yes' : 'No'}
          </button>
        </div>

        {/* Course Completed */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-white">
          <div className="flex items-center gap-2">
            {progress.courseCompleted ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <div className="w-4 h-4 rounded border-2 border-gray-300" />
            )}
            <span className="text-sm font-medium">Advanced Neurosurgery Course</span>
          </div>
          <button
            onClick={() => onUpdate({ courseCompleted: !progress.courseCompleted })}
            className={cn(
              neoButton,
              'px-3 py-1 text-xs',
            )}
            style={{
              backgroundColor: progress.courseCompleted ? NEO_POP.colors.mint : NEO_POP.colors.gray200,
            }}
          >
            {progress.courseCompleted ? 'Yes' : 'No'}
          </button>
        </div>

        {/* Surgical Rotation */}
        <div className="py-2 px-3 rounded-lg border bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {progress.rotationComplete ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded border-2 border-gray-300" />
              )}
              <span className="text-sm font-medium">4-Week Surgical Rotation</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((week) => (
                <button
                  key={week}
                  onClick={() => {
                    const newWeeks = week === rotationWeeks ? week - 1 : week;
                    setRotationWeeks(newWeeks);
                    onUpdate({ rotationWeeksCompleted: newWeeks });
                  }}
                  className={cn(
                    'w-7 h-7 rounded-lg border-2 border-black text-xs font-bold transition-all',
                    week <= rotationWeeks
                      ? 'bg-amber-400 text-black shadow-[1px_1px_0_#000]'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {week}
                </button>
              ))}
              <span className="text-xs text-gray-500 ml-1">weeks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeedsReviewBanner({ untaggedCases, onTag }: {
  untaggedCases: CertificateProgress['untaggedCases'];
  onTag: (caseId: string, categories: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (untaggedCases.length === 0) return null;

  return (
    <div
      className={neoCard}
      style={{
        backgroundColor: NEO_POP.colors.yellow,
        borderLeftWidth: '4px',
        borderLeftColor: '#F59E0B',
        padding: '12px 16px',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-amber-600 shrink-0" size={18} />
          <div>
            <p className="font-bold text-sm text-amber-900">
              {untaggedCases.length} {untaggedCases.length === 1 ? 'surgery' : 'surgeries'} not tagged for certificate
            </p>
            <p className="text-xs text-amber-800">
              These cases are not counted toward your certificate progress.
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(neoButton, 'px-3 py-1 text-xs')}
          style={{ backgroundColor: '#FCD34D' }}
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3 inline mr-1" />Hide</>
          ) : (
            <><ChevronDown className="w-3 h-3 inline mr-1" />Review</>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {untaggedCases.map((c) => {
            const suggested = suggestCertCategories(c.procedureName);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 bg-white rounded-lg border"
              >
                <div>
                  <p className="text-sm font-medium">{c.procedureName}</p>
                  <p className="text-xs text-gray-500">{c.dateCompleted}</p>
                </div>
                <div className="flex gap-1">
                  {suggested.length > 0 ? (
                    <button
                      onClick={() => onTag(c.id, suggested)}
                      className={cn(neoButton, 'px-2 py-1 text-[10px]')}
                      style={{ backgroundColor: NEO_POP.colors.mint }}
                    >
                      Tag as {CERT_CATEGORIES[suggested[0]]}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No suggestion</span>
                  )}
                  <button
                    onClick={() => onTag(c.id, [CERT_DISMISSED])}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Dismiss — not certificate-relevant"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Quick Backfill Form
// ==========================================

function BackfillForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    procedureName: '',
    dateCompleted: new Date().toISOString().split('T')[0],
    role: 'Primary' as 'Primary' | 'Assistant',
    caseIdNumber: '',
    certificateCategories: [] as string[],
  });

  const allCategories = Object.entries(CERT_CATEGORIES) as [CertCategory, string][];

  // Auto-suggest when procedure changes
  useEffect(() => {
    if (form.procedureName) {
      const suggested = suggestCertCategories(form.procedureName);
      setForm((prev) => ({ ...prev, certificateCategories: suggested }));
    }
  }, [form.procedureName]);

  const handleSubmit = async () => {
    if (!form.procedureName || !form.dateCompleted) return;
    setSaving(true);
    try {
      const res = await fetch('/api/acvim/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hours: 1.0,
          residencyYear: 1,
          caseIdNumber: form.caseIdNumber || 'BACKFILL',
        }),
      });
      if (res.ok) {
        setForm({
          procedureName: '',
          dateCompleted: new Date().toISOString().split('T')[0],
          role: 'Primary',
          caseIdNumber: '',
          certificateCategories: [],
        });
        onSuccess();
      }
    } catch (err) {
      console.error('Error adding case:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(neoButton, 'w-full py-3 text-sm flex items-center justify-center gap-2')}
        style={{ backgroundColor: NEO_POP.colors.mint }}
      >
        <Plus className="w-4 h-4" />
        Add Previous Case
      </button>
    );
  }

  return (
    <div className={neoCard} style={{ backgroundColor: NEO_POP.colors.cream, padding: '16px' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Add Previous Case</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Procedure */}
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Procedure</label>
          <select
            value={form.procedureName}
            onChange={(e) => setForm((prev) => ({ ...prev, procedureName: e.target.value }))}
            className="w-full text-sm p-2.5 rounded-xl border-2 border-black bg-white font-medium"
          >
            <option value="">Select procedure...</option>
            {COMMON_PROCEDURES.map((proc) => (
              <option key={proc} value={proc}>{proc}</option>
            ))}
          </select>
        </div>

        {/* Date + Role side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Date</label>
            <input
              type="date"
              value={form.dateCompleted}
              onChange={(e) => setForm((prev) => ({ ...prev, dateCompleted: e.target.value }))}
              className="w-full text-sm p-2 rounded-xl border-2 border-black bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Role</label>
            <div className="flex gap-2">
              {(['Primary', 'Assistant'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setForm((prev) => ({ ...prev, role: r }))}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold rounded-xl border-2 border-black transition-all',
                    form.role === r
                      ? r === 'Primary'
                        ? 'bg-green-500 text-white shadow-[2px_2px_0_#000]'
                        : 'bg-blue-400 text-white shadow-[2px_2px_0_#000]'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Case ID (optional) */}
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Case ID (optional)</label>
          <input
            type="text"
            value={form.caseIdNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, caseIdNumber: e.target.value }))}
            placeholder="Medical record number"
            className="w-full text-sm p-2 rounded-xl border-2 border-black bg-white"
          />
        </div>

        {/* Certificate category — auto-filled */}
        {form.certificateCategories.length > 0 && (
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Certificate Category</label>
            <div className="flex flex-wrap gap-1.5">
              {allCategories
                .filter(([key]) => form.certificateCategories.includes(key))
                .map(([key, label]) => (
                  <span
                    key={key}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border-2 border-black bg-amber-400 shadow-[2px_2px_0_#000]"
                  >
                    {label}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!form.procedureName || !form.dateCompleted || saving}
          className={cn(neoButton, 'w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50')}
          style={{ backgroundColor: form.procedureName ? NEO_POP.colors.mint : NEO_POP.colors.gray200 }}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Plus className="w-4 h-4" /> Add Case</>
          )}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function CertificateTracker() {
  const { cases, certStatus, loading, error, updateCertStatus, tagCase, reload } = useCertificateData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={neoCard} style={{ backgroundColor: NEO_POP.colors.pink, padding: '24px', textAlign: 'center' }}>
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="font-bold text-sm mb-2">{error}</p>
        <button onClick={reload} className={cn(neoButton, 'px-4 py-2 text-sm')} style={{ backgroundColor: NEO_POP.colors.cream }}>
          Try Again
        </button>
      </div>
    );
  }

  const progress = computeCertificateProgress(cases, certStatus);

  if (cases.length === 0) {
    return (
      <div className={neoCard} style={{ backgroundColor: NEO_POP.colors.cream, padding: '32px', textAlign: 'center' }}>
        <Award className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="font-bold text-lg mb-1">Neurosurgery Certificate Tracker</h2>
        <p className="text-sm text-gray-500 mb-4">
          Start logging surgeries in the Quick Add or Cases tab to track your progress toward the ACVIM Neurosurgery Certificate of Training.
        </p>
        <div className="text-xs text-gray-400">
          50 hemilaminectomies + 20 ventral slots + 12 special procedures + course + rotation + boards
        </div>
      </div>
    );
  }

  const overallPercent = Math.round((progress.requirementsMet / 6) * 100);

  return (
    <div className="space-y-4">
      {/* Needs Review Banner */}
      <NeedsReviewBanner untaggedCases={progress.untaggedCases} onTag={tagCase} />

      {/* Overall Progress */}
      <div className={neoCard} style={{ backgroundColor: NEO_POP.colors.cream, padding: '16px' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-base">Neurosurgery Certificate</h2>
          </div>
          <span className={cn(
            'text-sm font-bold px-3 py-1 rounded-full border-2 border-black',
            progress.requirementsMet === 6 ? 'bg-green-400' : 'bg-amber-100'
          )}>
            {progress.requirementsMet} / 6 met
          </span>
        </div>
        <div className="h-4 rounded-full border-2 border-black overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${overallPercent}%`,
              backgroundColor: progress.requirementsMet === 6 ? '#10B981' : '#FBBF24',
            }}
          />
        </div>
      </div>

      {/* Bread & Butter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BreadAndButterCard title="TL Hemilaminectomies" data={progress.hemis} />
        <BreadAndButterCard title="Ventral Slots" data={progress.ventralSlots} />
      </div>

      {/* Special Procedures */}
      <SpecialProceduresList procedures={progress.specialProcedures} />

      {/* Other Requirements */}
      <OtherRequirements
        progress={progress}
        onUpdate={updateCertStatus}
      />

      {/* Add Previous Case */}
      <BackfillForm onSuccess={reload} />

      {/* Next Deadline */}
      <div
        className={neoCard}
        style={{ backgroundColor: NEO_POP.colors.lavender, padding: '12px 16px' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-600">NEXT APPLICATION DEADLINE</p>
            <p className="font-bold text-base">{progress.nextDeadline}</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Submit to Sarah.Z@ACVIM.org</p>
            <p className="text-gray-400">Application fee: $500</p>
          </div>
        </div>
      </div>
    </div>
  );
}
