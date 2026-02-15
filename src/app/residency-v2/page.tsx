'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Minus,
  BookOpen,
  Stethoscope,
  Brain,
  Trophy,
  Sparkles,
  Upload,
  X,
  Check,
  Loader2,
  Scissors
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Neo-pop styling
const NEO_BORDER = '3px solid #000';
const NEO_SHADOW = '6px 6px 0 #000';
const NEO_SHADOW_SM = '4px 4px 0 #000';

const COLORS = {
  pink: '#FFBDBD',
  mint: '#B8E6D4',
  lavender: '#DCC4F5',
  cream: '#FFF8F0',
  yellow: '#FCD34D',
  blue: '#93C5FD',
};

// Types
interface DailyEntry {
  id?: string;
  date: string;
  mriCount: number;
  recheckCount: number;
  newConsultCount: number;
  emergencyCount: number;
  surgeries?: Surgery[];
}

interface Surgery {
  id: string;
  procedureName: string;
  participation: 'S' | 'O' | 'C' | 'D' | 'K';
  patientName?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  articleTitles: string[];
  supervisingNeurologists: string[];
  hours: number;
  residencyYear: number;
}

interface Stats {
  totalMRI: number;
  totalAppointments: number;
  totalSurgeries: number;
  milestones: Milestone[];
  daysUntilFreedom: number | null;
}

interface Milestone {
  id: string;
  type: string;
  count: number;
  celebrated: boolean;
}

// Date helpers
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export default function ResidencyV2Page() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Daily entry data
  const [entry, setEntry] = useState<DailyEntry>({
    date: selectedDate,
    mriCount: 0,
    recheckCount: 0,
    newConsultCount: 0,
    emergencyCount: 0,
    surgeries: [],
  });

  // Journal entries for selected date
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalForm, setJournalForm] = useState({
    article: '',
    supervisor: '',
    hours: 1,
  });

  // Surgery tracking
  const [showSurgeryForm, setShowSurgeryForm] = useState(false);
  const [surgeryForm, setSurgeryForm] = useState({
    procedure: '',
    role: 'S' as 'S' | 'O' | 'C' | 'D' | 'K',
    patient: '',
  });

  // Overall stats
  const [stats, setStats] = useState<Stats>({
    totalMRI: 0,
    totalAppointments: 0,
    totalSurgeries: 0,
    milestones: [],
    daysUntilFreedom: null,
  });

  // Bulk import
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  // Load data for selected date
  const loadDateData = useCallback(async () => {
    setLoading(true);
    try {
      // Load daily entry
      const entryRes = await fetch(`/api/residency/daily-entry?date=${selectedDate}`);
      if (entryRes.ok) {
        const data = await entryRes.json();
        if (data) {
          setEntry({
            ...data,
            date: selectedDate,
            surgeries: data.surgeries || [],
          });
        } else {
          setEntry({
            date: selectedDate,
            mriCount: 0,
            recheckCount: 0,
            newConsultCount: 0,
            emergencyCount: 0,
            surgeries: [],
          });
        }
      }

      // Load journal entries for this date
      const year = new Date(selectedDate + 'T12:00:00').getFullYear();
      const journalRes = await fetch(`/api/acvim/journal-club?year=${year}`);
      if (journalRes.ok) {
        const allJournals = await journalRes.json();
        setJournals(allJournals.filter((j: JournalEntry) => j.date === selectedDate));
      }

      // Load overall stats
      const statsRes = await fetch('/api/residency/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalMRI: statsData.totals?.mriCount || 0,
          totalAppointments: statsData.totals?.totalAppointments || 0,
          totalSurgeries: statsData.surgeryBreakdown?.total || 0,
          milestones: statsData.milestones || [],
          daysUntilFreedom: statsData.daysUntilFreedom,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load data',
        description: 'Please try refreshing the page.',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    loadDateData();
  }, [loadDateData]);

  // Quick increment/decrement
  const handleIncrement = async (field: 'mriCount' | 'recheckCount' | 'newConsultCount' | 'emergencyCount', delta: number) => {
    const newValue = Math.max(0, (entry[field] || 0) + delta);
    setEntry(prev => ({ ...prev, [field]: newValue }));

    try {
      const actionMap: Record<string, string> = {
        mriCount: delta > 0 ? 'incrementMRI' : 'decrementMRI',
        recheckCount: delta > 0 ? 'incrementRecheck' : 'decrementRecheck',
        newConsultCount: delta > 0 ? 'incrementNewConsult' : 'decrementNewConsult',
        emergencyCount: delta > 0 ? 'incrementEmergency' : 'decrementEmergency',
      };

      await fetch('/api/residency/quick-increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionMap[field],
          date: selectedDate,
        }),
      });

      // Reload stats
      const statsRes = await fetch('/api/residency/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalMRI: statsData.totals?.mriCount || 0,
          totalAppointments: statsData.totals?.totalAppointments || 0,
          totalSurgeries: statsData.surgeryBreakdown?.total || 0,
          milestones: statsData.milestones || [],
          daysUntilFreedom: statsData.daysUntilFreedom,
        });
      }
    } catch (error) {
      console.error('Failed to update:', error);
      // Revert on error
      setEntry(prev => ({ ...prev, [field]: (entry[field] || 0) }));
    }
  };

  // Add journal entry
  const handleAddJournal = async () => {
    if (!journalForm.article.trim()) {
      toast({ title: 'Please enter an article title' });
      return;
    }

    setSaving(true);
    try {
      const year = new Date(selectedDate + 'T12:00:00').getFullYear();
      const res = await fetch('/api/acvim/journal-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          articleTitles: [journalForm.article.trim()],
          supervisingNeurologists: journalForm.supervisor.trim() ? [journalForm.supervisor.trim()] : [],
          hours: journalForm.hours,
          residencyYear: year - 2024 + 1, // Calculate year based on start
        }),
      });

      if (res.ok) {
        toast({ title: 'Journal entry added!' });
        setJournalForm({ article: '', supervisor: '', hours: 1 });
        setShowJournalForm(false);
        loadDateData();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to save journal entry' });
    } finally {
      setSaving(false);
    }
  };

  // Delete journal entry
  const handleDeleteJournal = async (id: string) => {
    try {
      await fetch(`/api/acvim/journal-club?id=${id}`, { method: 'DELETE' });
      setJournals(prev => prev.filter(j => j.id !== id));
      toast({ title: 'Journal entry deleted' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  // Add surgery - simplified, no patient requirements
  const handleAddSurgery = async () => {
    if (!surgeryForm.procedure.trim()) {
      toast({ title: 'Please enter a procedure name' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/residency/surgery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          procedureName: surgeryForm.procedure.trim(),
          participation: surgeryForm.role,
          patientName: surgeryForm.patient.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast({ title: 'Surgery added!' });
        setSurgeryForm({ procedure: '', role: 'S', patient: '' });
        setShowSurgeryForm(false);
        loadDateData();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to save surgery' });
    } finally {
      setSaving(false);
    }
  };

  // Delete surgery
  const handleDeleteSurgery = async (surgeryId: string) => {
    try {
      await fetch(`/api/residency/surgery?id=${surgeryId}`, { method: 'DELETE' });
      setEntry(prev => ({
        ...prev,
        surgeries: prev.surgeries?.filter(s => s.id !== surgeryId) || [],
      }));
      toast({ title: 'Surgery deleted' });
      loadDateData(); // Reload to update stats
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to delete' });
    }
  };

  // Bulk import
  const handleBulkImport = async () => {
    if (!importText.trim()) return;

    setSaving(true);
    const lines = importText.trim().split('\n');
    let imported = 0;
    let errors = 0;

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 2) continue;

      const [date, type, ...rest] = parts;
      const details = rest.join('\t');

      try {
        if (type.toLowerCase() === 'mri') {
          const count = parseInt(details) || 1;
          for (let i = 0; i < count; i++) {
            await fetch('/api/residency/quick-increment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'incrementMRI', date }),
            });
          }
          imported++;
        } else if (type.toLowerCase() === 'journal') {
          const [article, supervisor, hours] = details.split('\t');
          const year = new Date(date + 'T12:00:00').getFullYear();
          await fetch('/api/acvim/journal-club', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              articleTitles: [article?.trim() || 'Untitled'],
              supervisingNeurologists: supervisor?.trim() ? [supervisor.trim()] : [],
              hours: parseFloat(hours) || 1,
              residencyYear: year - 2024 + 1,
            }),
          });
          imported++;
        }
        // Add more types as needed (surgery, consult, etc.)
      } catch (e) {
        errors++;
      }
    }

    toast({
      title: `Import complete`,
      description: `${imported} entries imported${errors > 0 ? `, ${errors} errors` : ''}`,
    });

    setShowImport(false);
    setImportText('');
    loadDateData();
    setSaving(false);
  };

  // Calculate progress percentages
  const mriProgress = Math.min(100, (stats.totalMRI / 150) * 100);
  const casesProgress = Math.min(100, (stats.totalAppointments / 500) * 100);
  const surgeryProgress = Math.min(100, (stats.totalSurgeries / 100) * 100);

  // Get next milestone
  const getNextMilestone = () => {
    const mriMilestones = [50, 100, 150, 200, 300, 500];
    const nextMRI = mriMilestones.find(m => m > stats.totalMRI);
    if (nextMRI) return { type: 'MRI', target: nextMRI, current: stats.totalMRI };
    return null;
  };

  const nextMilestone = getNextMilestone();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div
          className="rounded-2xl p-4 bg-white"
          style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Stethoscope size={28} />
              Residency Tracker
            </h1>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition hover:-translate-y-0.5"
              style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER }}
            >
              <Upload size={16} />
              Bulk Import
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div
          className="rounded-2xl p-4 bg-white"
          style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
        >
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="p-3 rounded-xl transition hover:-translate-y-0.5"
              style={{ backgroundColor: COLORS.cream, border: NEO_BORDER }}
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <Calendar size={20} className="text-gray-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xl font-bold text-gray-900 bg-transparent border-none text-center cursor-pointer"
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {formatDisplayDate(selectedDate)}
              </p>
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-3 rounded-xl transition hover:-translate-y-0.5"
              style={{ backgroundColor: COLORS.cream, border: NEO_BORDER }}
            >
              <ChevronRight size={24} />
            </button>

            <button
              onClick={() => setSelectedDate(formatDate(new Date()))}
              className="px-4 py-3 rounded-xl font-bold transition hover:-translate-y-0.5"
              style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
            >
              Today
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-white" />
          </div>
        ) : (
          <>
            {/* Quick Counters */}
            <div
              className="rounded-2xl p-6 bg-white"
              style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
            >
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Brain size={20} />
                Cases for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* MRI Counter */}
                <CounterCard
                  label="MRI"
                  value={entry.mriCount}
                  color={COLORS.pink}
                  onIncrement={() => handleIncrement('mriCount', 1)}
                  onDecrement={() => handleIncrement('mriCount', -1)}
                />

                {/* Recheck Counter */}
                <CounterCard
                  label="Recheck"
                  value={entry.recheckCount}
                  color={COLORS.mint}
                  onIncrement={() => handleIncrement('recheckCount', 1)}
                  onDecrement={() => handleIncrement('recheckCount', -1)}
                />

                {/* New Consult Counter */}
                <CounterCard
                  label="New Consult"
                  value={entry.newConsultCount}
                  color={COLORS.lavender}
                  onIncrement={() => handleIncrement('newConsultCount', 1)}
                  onDecrement={() => handleIncrement('newConsultCount', -1)}
                />

                {/* Emergency Counter */}
                <CounterCard
                  label="Emergency"
                  value={entry.emergencyCount}
                  color={COLORS.yellow}
                  onIncrement={() => handleIncrement('emergencyCount', 1)}
                  onDecrement={() => handleIncrement('emergencyCount', -1)}
                />
              </div>
            </div>

            {/* Surgeries */}
            <div
              className="rounded-2xl p-6 bg-white"
              style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Scissors size={20} />
                  Surgeries
                </h2>
                {!showSurgeryForm && (
                  <button
                    onClick={() => setShowSurgeryForm(true)}
                    className="px-3 py-2 rounded-xl font-bold text-sm flex items-center gap-1 transition hover:-translate-y-0.5"
                    style={{ backgroundColor: COLORS.pink, border: NEO_BORDER }}
                  >
                    <Plus size={16} />
                    Add Surgery
                  </button>
                )}
              </div>

              {/* Quick Add Surgery Form */}
              {showSurgeryForm && (
                <div
                  className="mb-4 p-4 rounded-xl"
                  style={{ backgroundColor: COLORS.cream, border: '2px solid #000' }}
                >
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Procedure name (e.g., Hemilaminectomy)..."
                      value={surgeryForm.procedure}
                      onChange={(e) => setSurgeryForm(f => ({ ...f, procedure: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg font-medium bg-white"
                      style={{ border: '2px solid #000' }}
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-gray-600 mb-1 block">Role</label>
                        <select
                          value={surgeryForm.role}
                          onChange={(e) => setSurgeryForm(f => ({ ...f, role: e.target.value as 'S' | 'O' | 'C' | 'D' | 'K' }))}
                          className="w-full px-3 py-2 rounded-lg font-bold bg-white"
                          style={{ border: '2px solid #000' }}
                        >
                          <option value="S">S - Surgeon</option>
                          <option value="O">O - Observer</option>
                          <option value="C">C - Circulator</option>
                          <option value="D">D - Dissector</option>
                          <option value="K">K - Knife (assistant)</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-gray-600 mb-1 block">Patient (optional)</label>
                        <input
                          type="text"
                          placeholder="Patient name..."
                          value={surgeryForm.patient}
                          onChange={(e) => setSurgeryForm(f => ({ ...f, patient: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg font-medium bg-white"
                          style={{ border: '2px solid #000' }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddSurgery}
                        disabled={saving}
                        className="flex-1 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:-translate-y-0.5 disabled:opacity-50"
                        style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowSurgeryForm(false);
                          setSurgeryForm({ procedure: '', role: 'S', patient: '' });
                        }}
                        className="px-4 py-2 rounded-xl font-bold transition hover:-translate-y-0.5"
                        style={{ backgroundColor: COLORS.pink, border: NEO_BORDER }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Surgeries List */}
              {entry.surgeries && entry.surgeries.length > 0 ? (
                <div className="space-y-2">
                  {entry.surgeries.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl group"
                      style={{ backgroundColor: COLORS.cream, border: '2px solid #000' }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                          style={{
                            backgroundColor: s.participation === 'S' ? COLORS.mint :
                              s.participation === 'O' ? COLORS.blue :
                              s.participation === 'K' ? COLORS.lavender : COLORS.cream,
                            border: '2px solid #000'
                          }}
                        >
                          {s.participation}
                        </span>
                        <div>
                          <p className="font-bold text-gray-900">{s.procedureName}</p>
                          {s.patientName && (
                            <p className="text-sm text-gray-600">{s.patientName}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSurgery(s.id)}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-100"
                      >
                        <X size={16} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No surgeries for this date</p>
              )}
            </div>

            {/* Journal Club */}
            <div
              className="rounded-2xl p-6 bg-white"
              style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <BookOpen size={20} />
                  Journal Club
                </h2>
                {!showJournalForm && (
                  <button
                    onClick={() => setShowJournalForm(true)}
                    className="px-3 py-2 rounded-xl font-bold text-sm flex items-center gap-1 transition hover:-translate-y-0.5"
                    style={{ backgroundColor: COLORS.blue, border: NEO_BORDER }}
                  >
                    <Plus size={16} />
                    Add Entry
                  </button>
                )}
              </div>

              {/* Quick Add Form */}
              {showJournalForm && (
                <div
                  className="mb-4 p-4 rounded-xl"
                  style={{ backgroundColor: COLORS.cream, border: '2px solid #000' }}
                >
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Article title..."
                      value={journalForm.article}
                      onChange={(e) => setJournalForm(f => ({ ...f, article: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg font-medium bg-white"
                      style={{ border: '2px solid #000' }}
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Supervisor (optional)"
                        value={journalForm.supervisor}
                        onChange={(e) => setJournalForm(f => ({ ...f, supervisor: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded-lg font-medium bg-white"
                        style={{ border: '2px solid #000' }}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">Hours:</span>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={journalForm.hours}
                          onChange={(e) => setJournalForm(f => ({ ...f, hours: parseFloat(e.target.value) || 1 }))}
                          className="w-16 px-2 py-2 rounded-lg font-bold text-center bg-white"
                          style={{ border: '2px solid #000' }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddJournal}
                        disabled={saving}
                        className="flex-1 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:-translate-y-0.5 disabled:opacity-50"
                        style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowJournalForm(false);
                          setJournalForm({ article: '', supervisor: '', hours: 1 });
                        }}
                        className="px-4 py-2 rounded-xl font-bold transition hover:-translate-y-0.5"
                        style={{ backgroundColor: COLORS.pink, border: NEO_BORDER }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Journal Entries List */}
              {journals.length > 0 ? (
                <div className="space-y-2">
                  {journals.map(j => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between p-3 rounded-xl group"
                      style={{ backgroundColor: COLORS.cream, border: '2px solid #000' }}
                    >
                      <div>
                        <p className="font-bold text-gray-900">{j.articleTitles.join(', ')}</p>
                        <p className="text-sm text-gray-600">
                          {j.supervisingNeurologists.length > 0 && `${j.supervisingNeurologists.join(', ')} • `}
                          {j.hours} hour{j.hours !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteJournal(j.id)}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-100"
                      >
                        <X size={16} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No journal entries for this date</p>
              )}
            </div>

            {/* Days Until Freedom */}
            {stats.daysUntilFreedom !== null && (
              <div
                className="rounded-2xl p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center"
                style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
              >
                <p className="text-sm font-bold opacity-90">Days Until Freedom</p>
                <p className="text-5xl font-black">{stats.daysUntilFreedom}</p>
                <p className="text-sm opacity-75 mt-1">You've got this!</p>
              </div>
            )}

            {/* Progress & Milestones */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Progress */}
              <div
                className="rounded-2xl p-6 bg-white"
                style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
              >
                <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles size={20} />
                  Progress
                </h2>

                <div className="space-y-4">
                  <ProgressBar
                    label="MRI"
                    current={stats.totalMRI}
                    target={150}
                    color={COLORS.pink}
                  />
                  <ProgressBar
                    label="Consultations"
                    current={stats.totalAppointments}
                    target={500}
                    color={COLORS.mint}
                  />
                  <ProgressBar
                    label="Surgeries"
                    current={stats.totalSurgeries}
                    target={100}
                    color={COLORS.lavender}
                  />
                </div>
              </div>

              {/* Milestones */}
              <div
                className="rounded-2xl p-6 bg-white"
                style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
              >
                <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy size={20} />
                  Milestones
                </h2>

                {nextMilestone && (
                  <div
                    className="p-4 rounded-xl mb-4"
                    style={{ backgroundColor: COLORS.yellow, border: '2px solid #000' }}
                  >
                    <p className="text-sm font-bold text-gray-700">Next milestone:</p>
                    <p className="text-xl font-black text-gray-900">
                      {nextMilestone.target} {nextMilestone.type}s
                    </p>
                    <p className="text-sm text-gray-600">
                      {nextMilestone.target - nextMilestone.current} to go!
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {stats.milestones.filter(m => m.celebrated).slice(0, 5).map(m => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ backgroundColor: COLORS.cream }}
                    >
                      <Check size={16} className="text-green-600" />
                      <span className="font-bold text-gray-900">
                        {m.count} {m.type}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bulk Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
              style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900">Bulk Import</h2>
                <button onClick={() => setShowImport(false)} className="p-2">
                  <X size={24} />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Paste tab-separated data. Format: Date, Type, Details, Hours
              </p>

              <div className="mb-4 p-3 rounded-lg bg-gray-100 text-xs font-mono">
                2026-01-15{'\t'}MRI{'\t'}3{'\n'}
                2026-01-15{'\t'}Journal{'\t'}IVDD Study{'\t'}Dr. Smith{'\t'}1
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your data here..."
                className="w-full h-48 p-3 rounded-xl font-mono text-sm resize-none"
                style={{ border: NEO_BORDER }}
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleBulkImport}
                  disabled={saving || !importText.trim()}
                  className="flex-1 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Import
                </button>
                <button
                  onClick={() => setShowImport(false)}
                  className="px-4 py-3 rounded-xl font-bold"
                  style={{ border: NEO_BORDER }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Counter Card Component
function CounterCard({
  label,
  value,
  color,
  onIncrement,
  onDecrement
}: {
  label: string;
  value: number;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ backgroundColor: color, border: '2px solid #000' }}
    >
      <p className="text-sm font-bold text-gray-700 mb-2">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onDecrement}
          disabled={value <= 0}
          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold transition hover:-translate-y-0.5 disabled:opacity-30"
          style={{ border: '2px solid #000' }}
        >
          <Minus size={16} />
        </button>
        <span className="text-3xl font-black text-gray-900 min-w-[3rem]">
          {value}
        </span>
        <button
          onClick={onIncrement}
          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold transition hover:-translate-y-0.5"
          style={{ border: '2px solid #000' }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({
  label,
  current,
  target,
  color
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const percent = Math.min(100, (current / target) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{current}/{target}</span>
      </div>
      <div
        className="h-4 rounded-full overflow-hidden bg-gray-200"
        style={{ border: '2px solid #000' }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
