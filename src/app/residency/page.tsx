'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Stethoscope,
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Save,
  FileText,
  User,
  Check,
  Loader2,
  AlertCircle,
  Pencil,
  BarChart3,
} from 'lucide-react';
import { DailyEntryForm } from '@/components/residency/DailyEntryForm';
import { SurgeryTracker } from '@/components/residency/SurgeryTracker';
import { StatsOverview } from '@/components/residency/StatsOverview';
import { WeeklyChart } from '@/components/residency/WeeklyChart';
import { MilestoneCelebration } from '@/components/residency/MilestoneCelebration';
import { StatsErrorBoundary } from '@/components/residency/StatsErrorBoundary';
import { useDailyEntry } from '@/hooks/useResidencyStats';
import { format } from 'date-fns';
import { useDebouncedCallback, useSaveStatus, SaveStatus } from '@/hooks/useDebounce';
import { generateACVIMWordDocument } from '@/lib/acvim-word-export';
import {
  NeurosurgeryCase,
  JournalClubEntry,
  WeeklyScheduleEntry,
  ACVIMProfile,
  CaseRole,
} from '@/lib/residency-types';
import { PatientCombobox, PatientOption } from '@/components/PatientCombobox';
import { NEO_POP } from '@/lib/neo-pop-styles';

type TabType = 'cases' | 'journal' | 'schedule' | 'summary' | 'stats';

// Neo-Pop styled components
const neoCard = "bg-white border-2 border-black shadow-[4px_4px_0_#000] rounded-2xl";
const neoButton = "border-2 border-black shadow-[3px_3px_0_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] transition-all rounded-xl font-bold";
const neoInput = "border-2 border-black rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-300 outline-none";

// Calculate current week based on program start date
function getCurrentWeekInfo(startDate: string): { monthNumber: number; weekNumber: number } {
  const start = new Date(startDate || '2025-07-14');
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(diffDays / 7);
  const monthNumber = Math.floor(weeksSinceStart / 4) + 1;
  const weekInMonth = (weeksSinceStart % 4) + 1;
  return { monthNumber: Math.min(12, Math.max(1, monthNumber)), weekNumber: Math.min(5, weekInMonth) };
}

// Stats Tab Content Component
function StatsTabContent() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayEntry } = useDailyEntry(today);

  return (
    <StatsErrorBoundary>
      <div className="space-y-6">
        {/* Stats Overview */}
        <StatsOverview />

        {/* Weekly Chart */}
        <WeeklyChart />

        {/* Two-column layout for daily entry + surgeries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyEntryForm selectedDate={today} />
          <SurgeryTracker
            dailyEntryId={todayEntry?.id || null}
            surgeries={todayEntry?.surgeries || []}
          />
        </div>
      </div>
    </StatsErrorBoundary>
  );
}

export default function ACVIMResidencyTrackerPage() {
  // Core state
  const [activeTab, setActiveTab] = useState<TabType>('cases');
  const [selectedYear, setSelectedYear] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data state
  const [profile, setProfile] = useState<ACVIMProfile | null>(null);
  const [cases, setCases] = useState<NeurosurgeryCase[]>([]);
  const [journalClub, setJournalClub] = useState<JournalClubEntry[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleEntry[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);

  // Dialog states
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Edit mode tracking
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);

  // Weekly schedule save status (tracks per-cell saving)
  const { status: scheduleStatus, setStatus: setScheduleStatus, trackSave } = useSaveStatus(2000);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const lastSavedRef = useRef<Date | null>(null);

  // Schedule view state - collapsed months for cleaner view
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());

  // Current week info
  const currentWeekInfo = useMemo(() => {
    return getCurrentWeekInfo(profile?.programStartDate || '2025-07-14');
  }, [profile?.programStartDate]);

  // Auto-expand current month on load
  useEffect(() => {
    if (currentWeekInfo.monthNumber) {
      setExpandedMonths(new Set([currentWeekInfo.monthNumber]));
    }
  }, [currentWeekInfo.monthNumber]);

  // Form states
  const [caseForm, setCaseForm] = useState({
    procedureName: '',
    dateCompleted: new Date().toISOString().split('T')[0],
    caseIdNumber: '',
    role: 'Primary' as CaseRole,
    hours: 2.0,
    notes: '',
    patientId: undefined as number | undefined,
    patientName: '',
    patientInfo: '',
  });

  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    articleTitles: '',
    supervisingNeurologists: '',
    hours: 1.0,
    notes: '',
  });

  const [profileForm, setProfileForm] = useState({
    residentName: '',
    acvimCandidateId: '',
    trainingFacility: '',
    programStartDate: '2025-07-14',
    supervisingDiplomateNames: '',
  });

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Load year-specific data when year changes
  useEffect(() => {
    loadYearData(selectedYear);
  }, [selectedYear]);

  async function loadAllData() {
    setLoading(true);
    try {
      // Load profile
      const profileRes = await fetch('/api/acvim/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        setProfileForm({
          residentName: profileData.residentName || '',
          acvimCandidateId: profileData.acvimCandidateId || '',
          trainingFacility: profileData.trainingFacility || '',
          programStartDate: profileData.programStartDate || '2025-07-14',
          supervisingDiplomateNames: (profileData.supervisingDiplomateNames || []).join(', '),
        });
      }

      // Load patients for dropdown
      const patientsRes = await fetch('/api/patients?type=Surgery');
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(
          patientsData.map((p: any) => ({
            id: p.id,
            name: p.demographics?.name || 'Unnamed',
            species: p.demographics?.species,
            breed: p.demographics?.breed,
            age: p.demographics?.age,
            sex: p.demographics?.sex,
            weight: p.demographics?.weight,
          }))
        );
      }

      await loadYearData(selectedYear);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadYearData(year: number) {
    try {
      // Load cases for year
      const casesRes = await fetch(`/api/acvim/cases?year=${year}`);
      if (casesRes.ok) {
        setCases(await casesRes.json());
      }

      // Load journal club for year
      const journalRes = await fetch(`/api/acvim/journal-club?year=${year}`);
      if (journalRes.ok) {
        setJournalClub(await journalRes.json());
      }

      // Load weekly schedule for year (with auto-generation)
      const scheduleRes = await fetch(`/api/acvim/weekly-schedule?year=${year}&generate=true`);
      if (scheduleRes.ok) {
        setWeeklySchedule(await scheduleRes.json());
      }
    } catch (error) {
      console.error('Error loading year data:', error);
    }
  }

  // Save profile
  async function handleSaveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/acvim/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentName: profileForm.residentName,
          acvimCandidateId: profileForm.acvimCandidateId,
          trainingFacility: profileForm.trainingFacility,
          programStartDate: profileForm.programStartDate,
          supervisingDiplomateNames: profileForm.supervisingDiplomateNames
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setShowProfileDialog(false);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  }

  // Start editing a case
  function handleEditCase(c: NeurosurgeryCase) {
    setCaseForm({
      procedureName: c.procedureName,
      dateCompleted: c.dateCompleted,
      caseIdNumber: c.caseIdNumber,
      role: c.role as CaseRole,
      hours: c.hours,
      notes: c.notes || '',
      patientId: c.patientId || undefined,
      patientName: c.patientName || '',
      patientInfo: c.patientInfo || '',
    });
    setEditingCaseId(c.id);
    setShowCaseDialog(true);
  }

  // Add or update case
  async function handleSaveCase() {
    if (!caseForm.procedureName || !caseForm.caseIdNumber) {
      alert('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const isEditing = editingCaseId !== null;
      const res = await fetch('/api/acvim/cases', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing ? { id: editingCaseId } : {}),
          ...caseForm,
          residencyYear: selectedYear,
        }),
      });
      if (res.ok) {
        const savedCase = await res.json();
        if (isEditing) {
          setCases(cases.map((c) => (c.id === savedCase.id ? savedCase : c)));
        } else {
          setCases([savedCase, ...cases]);
        }
        setShowCaseDialog(false);
        setEditingCaseId(null);
        resetCaseForm();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save case');
      }
    } catch (error) {
      console.error('Error saving case:', error);
    } finally {
      setSaving(false);
    }
  }

  function resetCaseForm() {
    setCaseForm({
      procedureName: '',
      dateCompleted: new Date().toISOString().split('T')[0],
      caseIdNumber: '',
      role: 'Primary',
      hours: 2.0,
      notes: '',
      patientId: undefined,
      patientName: '',
      patientInfo: '',
    });
  }

  // Delete case
  async function handleDeleteCase(id: string) {
    if (!confirm('Delete this case?')) return;
    try {
      const res = await fetch(`/api/acvim/cases?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCases(cases.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error('Error deleting case:', error);
    }
  }

  // Start editing a journal club entry
  function handleEditJournal(j: JournalClubEntry) {
    setJournalForm({
      date: j.date,
      articleTitles: j.articleTitles.join('\n'),
      supervisingNeurologists: j.supervisingNeurologists.join(', '),
      hours: j.hours,
      notes: j.notes || '',
    });
    setEditingJournalId(j.id);
    setShowJournalDialog(true);
  }

  // Add or update journal club entry
  async function handleSaveJournal() {
    if (!journalForm.date || !journalForm.hours) {
      alert('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const isEditing = editingJournalId !== null;
      const res = await fetch('/api/acvim/journal-club', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing ? { id: editingJournalId } : {}),
          date: journalForm.date,
          articleTitles: journalForm.articleTitles
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          supervisingNeurologists: journalForm.supervisingNeurologists
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          hours: journalForm.hours,
          notes: journalForm.notes,
          residencyYear: selectedYear,
        }),
      });
      if (res.ok) {
        const savedEntry = await res.json();
        if (isEditing) {
          setJournalClub(journalClub.map((j) => (j.id === savedEntry.id ? savedEntry : j)));
        } else {
          setJournalClub([savedEntry, ...journalClub]);
        }
        setShowJournalDialog(false);
        setEditingJournalId(null);
        resetJournalForm();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save entry');
      }
    } catch (error) {
      console.error('Error saving journal club entry:', error);
    } finally {
      setSaving(false);
    }
  }

  function resetJournalForm() {
    setJournalForm({
      date: new Date().toISOString().split('T')[0],
      articleTitles: '',
      supervisingNeurologists: profile?.supervisingDiplomateNames?.join(', ') || '',
      hours: 1.0,
      notes: '',
    });
  }

  // Delete journal entry
  async function handleDeleteJournal(id: string) {
    if (!confirm('Delete this entry?')) return;
    try {
      const res = await fetch(`/api/acvim/journal-club?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setJournalClub(journalClub.filter((j) => j.id !== id));
      }
    } catch (error) {
      console.error('Error deleting journal entry:', error);
    }
  }

  // Track pending updates for optimistic UI
  const pendingEntriesRef = useRef<Map<string, WeeklyScheduleEntry>>(new Map());

  // Actual save function (called after debounce)
  const saveWeeklyEntry = useCallback(
    async (entryId: string) => {
      const entryToSave = pendingEntriesRef.current.get(entryId);
      if (!entryToSave) return;

      setPendingUpdates((prev) => new Set([...prev, entryId]));
      setScheduleStatus('saving');

      try {
        const res = await fetch('/api/acvim/weekly-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryToSave),
        });

        if (res.ok) {
          const saved = await res.json();
          setWeeklySchedule((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
          pendingEntriesRef.current.delete(entryId);
          lastSavedRef.current = new Date();
          setScheduleStatus('saved');
        } else {
          const error = await res.json();
          console.error('Validation error:', error);
          setScheduleStatus('error');
        }
      } catch (error) {
        console.error('Error updating weekly entry:', error);
        setScheduleStatus('error');
      } finally {
        setPendingUpdates((prev) => {
          const next = new Set(prev);
          next.delete(entryId);
          return next;
        });
      }
    },
    [setScheduleStatus]
  );

  // Debounced save - waits 500ms after last change before saving
  const debouncedSave = useDebouncedCallback(saveWeeklyEntry, 500);

  // Update weekly schedule entry with optimistic update + debounce
  const updateWeeklyEntry = useCallback(
    (entry: WeeklyScheduleEntry, field: keyof WeeklyScheduleEntry, value: number | string | null) => {
      const updatedEntry = { ...entry, [field]: value };

      // Optimistic update - show change immediately
      setWeeklySchedule((prev) => prev.map((e) => (e.id === entry.id ? updatedEntry : e)));

      // Store pending update
      pendingEntriesRef.current.set(entry.id, updatedEntry);

      // Trigger debounced save
      debouncedSave(entry.id);
    },
    [debouncedSave]
  );

  // Handle patient selection
  function handlePatientSelect(patient: PatientOption) {
    setCaseForm({
      ...caseForm,
      patientId: typeof patient.id === 'number' ? patient.id : parseInt(patient.id as string),
      patientName: patient.name,
      patientInfo: `${patient.age || ''} ${patient.sex || ''} ${patient.breed || patient.species || ''}`.trim(),
    });
  }

  // Calculate progress summary
  const summary = useMemo(() => {
    const totalCases = cases.length;
    const totalCaseHours = cases.reduce((sum, c) => sum + c.hours, 0);
    const primaryCases = cases.filter((c) => c.role === 'Primary').length;
    const assistantCases = cases.filter((c) => c.role === 'Assistant').length;

    const totalJournalSessions = journalClub.length;
    const totalJournalHours = journalClub.reduce((sum, j) => sum + j.hours, 0);

    const clinicalDirectWeeks = weeklySchedule.reduce(
      (sum, w) => sum + (w.clinicalNeurologyDirect || 0),
      0
    );
    const clinicalIndirectWeeks = weeklySchedule.reduce(
      (sum, w) => sum + (w.clinicalNeurologyIndirect || 0),
      0
    );
    const neurosurgeryHours = weeklySchedule.reduce((sum, w) => sum + (w.neurosurgeryHours || 0), 0);
    const radiologyHours = weeklySchedule.reduce((sum, w) => sum + (w.radiologyHours || 0), 0);
    const neuropathologyHours = weeklySchedule.reduce(
      (sum, w) => sum + (w.neuropathologyHours || 0),
      0
    );
    const clinicalPathologyHours = weeklySchedule.reduce(
      (sum, w) => sum + (w.clinicalPathologyHours || 0),
      0
    );
    const electrodiagnosticsHours = weeklySchedule.reduce(
      (sum, w) => sum + (w.electrodiagnosticsHours || 0),
      0
    );

    return {
      totalCases,
      totalCaseHours,
      primaryCases,
      assistantCases,
      totalJournalSessions,
      totalJournalHours,
      clinicalDirectWeeks,
      clinicalIndirectWeeks,
      neurosurgeryHours,
      radiologyHours,
      neuropathologyHours,
      clinicalPathologyHours,
      electrodiagnosticsHours,
    };
  }, [cases, journalClub, weeklySchedule]);

  // Export to Word document
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await generateACVIMWordDocument({
        profile,
        year: selectedYear,
        cases,
        journalClub,
        weeklySchedule,
        summary,
      });
    } catch (error) {
      console.error('Error exporting document:', error);
      alert('Failed to export document');
    } finally {
      setExporting(false);
    }
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: NEO_POP.colors.cream }}>
        <div className={`${neoCard} p-8 flex items-center gap-3`}>
          <Loader2 size={24} className="animate-spin text-purple-600" />
          <span className="text-lg font-bold text-gray-900">Loading ACVIM data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: NEO_POP.colors.cream }}>
      {/* Header - Neo-Pop Style */}
      <div className="bg-white border-b-2 border-black sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className={`${neoButton} flex items-center gap-2 px-3 py-2 text-sm`}
                style={{ backgroundColor: NEO_POP.colors.gray100 }}
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="flex items-center gap-2">
                <h1
                  className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight"
                  style={{ textShadow: '3px 3px 0 #DCC4F5' }}
                >
                  ACVIM
                </h1>
                <Award className="text-purple-600" size={28} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProfileDialog(true)}
                className={`${neoButton} flex items-center gap-2 px-3 py-2 text-sm`}
                style={{ backgroundColor: NEO_POP.colors.lavender }}
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Profile</span>
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`${neoButton} flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50`}
                style={{ backgroundColor: NEO_POP.colors.mint }}
              >
                {exporting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export Word'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Year Selector + Tabs - Neo-Pop Style */}
      <div className="border-b-2 border-black" style={{ backgroundColor: NEO_POP.colors.cream }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Year Selector - Neo-Pop pills */}
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-sm font-bold text-gray-600 mr-2">YEAR:</span>
              <div className="flex gap-2">
                {[1, 2, 3].map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`${neoButton} px-4 py-2 text-sm ${
                      selectedYear === year ? 'text-gray-900' : 'text-gray-600'
                    }`}
                    style={{
                      backgroundColor: selectedYear === year ? NEO_POP.colors.lavender : NEO_POP.colors.white,
                    }}
                  >
                    Y{year}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs - Neo-Pop colored */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'cases' as TabType, label: 'Cases', icon: Stethoscope, color: NEO_POP.colors.mint },
                { id: 'journal' as TabType, label: 'Journal', icon: BookOpen, color: NEO_POP.colors.lavender },
                { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar, color: NEO_POP.colors.yellow },
                { id: 'summary' as TabType, label: 'Summary', icon: TrendingUp, color: NEO_POP.colors.pink },
                { id: 'stats' as TabType, label: 'Stats', icon: BarChart3, color: '#a78bfa' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${neoButton} flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap`}
                  style={{
                    backgroundColor: activeTab === tab.id ? tab.color : NEO_POP.colors.white,
                  }}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Case Log Tab */}
        {activeTab === 'cases' && (
          <div>
            {/* No Surgery Patients Warning */}
            {patients.length === 0 && (
              <div className={`${neoCard} mb-4 p-4 flex items-center gap-3`} style={{ backgroundColor: NEO_POP.colors.yellow, borderLeftWidth: '4px', borderLeftColor: '#F59E0B' }}>
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-amber-900">No Surgery Patients Found</p>
                  <p className="text-sm text-amber-800">
                    Import patients with Surgery type from VetRadar, or manually create patients with type "Surgery" to link cases.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Neurosurgery Case Log - Year {selectedYear}
              </h2>
              <button
                onClick={() => {
                  resetCaseForm();
                  setEditingCaseId(null);
                  setShowCaseDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={16} />
                Add Case
              </button>
            </div>

            {/* Cases Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Procedure Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Case ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                      Updated
                    </th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        No cases logged yet. Click "Add Case" to begin.
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.procedureName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(c.dateCompleted).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.caseIdNumber}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              c.role === 'Primary'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {c.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.hours}h</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {c.patientName ? `${c.patientName} (${c.patientInfo || ''})` : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400" title={c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ''}>
                          {c.updatedAt ? formatTimestamp(c.updatedAt) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditCase(c)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                              title="Edit case"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCase(c.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete case"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Journal Club Tab */}
        {activeTab === 'journal' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Journal Club Log - Year {selectedYear}
              </h2>
              <button
                onClick={() => {
                  resetJournalForm();
                  setEditingJournalId(null);
                  setShowJournalDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Plus size={16} />
                Add Entry
              </button>
            </div>

            {/* Journal Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Title of Article(s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Supervising Neurologist(s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                      Updated
                    </th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {journalClub.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        No journal club entries yet. Click "Add Entry" to begin.
                      </td>
                    </tr>
                  ) : (
                    journalClub.map((j) => (
                      <tr key={j.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(j.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {j.articleTitles.map((title, idx) => (
                              <div key={idx} className="mb-1">
                                {title}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {j.supervisingNeurologists.join(', ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{j.hours}h</td>
                        <td className="px-4 py-3 text-xs text-gray-400" title={j.updatedAt ? new Date(j.updatedAt).toLocaleString() : ''}>
                          {j.updatedAt ? formatTimestamp(j.updatedAt) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditJournal(j)}
                              className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition"
                              title="Edit entry"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteJournal(j.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Weekly Schedule Tab - Collapsible by Month with Current Week Highlight */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2
                  className="text-xl font-black text-gray-900 uppercase"
                  style={{ textShadow: '2px 2px 0 #FFF3B8' }}
                >
                  Schedule - Year {selectedYear}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Current: Month {currentWeekInfo.monthNumber}, Week {currentWeekInfo.weekNumber}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Save Status */}
                <div className={`${neoButton} px-3 py-2 text-sm flex items-center gap-2`} style={{
                  backgroundColor: scheduleStatus === 'saving' ? NEO_POP.colors.yellow :
                                   scheduleStatus === 'saved' ? NEO_POP.colors.mint :
                                   scheduleStatus === 'error' ? NEO_POP.colors.pink :
                                   NEO_POP.colors.white
                }}>
                  {scheduleStatus === 'saving' && <><Loader2 size={14} className="animate-spin" /> Saving...</>}
                  {scheduleStatus === 'saved' && <><Check size={14} /> Saved</>}
                  {scheduleStatus === 'error' && <><AlertCircle size={14} /> Error</>}
                  {scheduleStatus === 'idle' && <><Calendar size={14} /> Auto-saves</>}
                </div>
                <button
                  onClick={() => setExpandedMonths(new Set([1,2,3,4,5,6,7,8,9,10,11,12]))}
                  className={`${neoButton} px-3 py-2 text-sm`}
                  style={{ backgroundColor: NEO_POP.colors.gray100 }}
                >
                  Expand All
                </button>
                <button
                  onClick={() => setExpandedMonths(new Set([currentWeekInfo.monthNumber]))}
                  className={`${neoButton} px-3 py-2 text-sm`}
                  style={{ backgroundColor: NEO_POP.colors.gray100 }}
                >
                  Collapse
                </button>
              </div>
            </div>

            {/* Collapsible Month Cards */}
            <div className="space-y-3">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => {
                const monthEntries = weeklySchedule.filter(e => e.monthNumber === monthNum);
                const isExpanded = expandedMonths.has(monthNum);
                const isCurrentMonth = monthNum === currentWeekInfo.monthNumber;
                const monthHours = monthEntries.reduce((sum, e) => sum + (e.neurosurgeryHours || 0), 0);

                return (
                  <div
                    key={monthNum}
                    className={`${neoCard} overflow-hidden`}
                    style={{
                      borderLeftWidth: '6px',
                      borderLeftColor: isCurrentMonth ? '#10B981' : '#000',
                    }}
                  >
                    {/* Month Header - Clickable */}
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedMonths);
                        if (isExpanded) {
                          newExpanded.delete(monthNum);
                        } else {
                          newExpanded.add(monthNum);
                        }
                        setExpandedMonths(newExpanded);
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                      style={{ backgroundColor: isCurrentMonth ? '#DCFCE7' : undefined }}
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          size={20}
                          className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                        />
                        <span className="font-black text-lg">
                          Month {monthNum}
                          {isCurrentMonth && (
                            <span className="ml-2 text-sm font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              NOW
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">{monthEntries.length} weeks</span>
                        {monthHours > 0 && (
                          <span className="font-bold" style={{ color: NEO_POP.colors.mintDark }}>
                            {monthHours}h surgery
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && monthEntries.length > 0 && (
                      <div className="border-t-2 border-black overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b border-black">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-bold">Week</th>
                              <th className="px-2 py-2 text-center text-xs font-bold">Direct</th>
                              <th className="px-2 py-2 text-center text-xs font-bold">Indirect</th>
                              <th className="px-2 py-2 text-center text-xs font-bold">Surgery</th>
                              <th className="px-2 py-2 text-center text-xs font-bold">Radiology</th>
                              <th className="px-2 py-2 text-center text-xs font-bold">NeuroPath</th>
                              <th className="px-2 py-2 text-center text-xs font-bold">ClinPath</th>
                              <th className="px-2 py-2 text-center text-xs font-bold">Electro</th>
                              <th className="px-2 py-2 text-center text-xs font-bold">Journal</th>
                              <th className="px-2 py-2 text-left text-xs font-bold">Diplomate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthEntries.map((entry) => {
                              const isCurrentWeek = monthNum === currentWeekInfo.monthNumber &&
                                                    entry.weekNumber === currentWeekInfo.weekNumber;
                              return (
                                <tr
                                  key={entry.id}
                                  className="border-b border-gray-200"
                                  style={{
                                    backgroundColor: isCurrentWeek ? '#FEF3C7' : undefined,
                                  }}
                                >
                                  <td className="px-3 py-2 text-xs font-medium whitespace-nowrap">
                                    {entry.weekDateRange}
                                    {isCurrentWeek && (
                                      <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded">
                                        THIS WEEK
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-1 py-1 text-center">
                                    <input
                                      type="checkbox"
                                      checked={entry.clinicalNeurologyDirect === 1}
                                      onChange={(e) => updateWeeklyEntry(entry, 'clinicalNeurologyDirect', e.target.checked ? 1 : null)}
                                      className="w-5 h-5 rounded border-2 border-black accent-violet-500 cursor-pointer hover:scale-110 transition"
                                    />
                                  </td>
                                  <td className="px-1 py-1 text-center">
                                    <input
                                      type="checkbox"
                                      checked={entry.clinicalNeurologyIndirect === 1}
                                      onChange={(e) => updateWeeklyEntry(entry, 'clinicalNeurologyIndirect', e.target.checked ? 1 : null)}
                                      className="w-5 h-5 rounded border-2 border-black accent-violet-500 cursor-pointer hover:scale-110 transition"
                                    />
                                  </td>
                                  <td className="px-1 py-1">
                                    <select
                                      value={entry.neurosurgeryHours || ''}
                                      onChange={(e) => updateWeeklyEntry(entry, 'neurosurgeryHours', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-14 px-1 py-1.5 text-xs border-2 border-black rounded-lg bg-white cursor-pointer hover:bg-orange-50 focus:ring-2 focus:ring-orange-300 outline-none text-center font-medium"
                                    >
                                      <option value="">-</option>
                                      {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-1 py-1">
                                    <select
                                      value={entry.radiologyHours || ''}
                                      onChange={(e) => updateWeeklyEntry(entry, 'radiologyHours', e.target.value ? parseInt(e.target.value) : null)}
                                      className="w-14 px-1 py-1.5 text-xs border-2 border-black rounded-lg bg-white cursor-pointer hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 outline-none text-center font-medium"
                                    >
                                      <option value="">-</option>
                                      {[1, 2, 3, 4, 5, 6, 8, 10].map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-1 py-1">
                                    <select
                                      value={entry.neuropathologyHours || ''}
                                      onChange={(e) => updateWeeklyEntry(entry, 'neuropathologyHours', e.target.value ? parseInt(e.target.value) : null)}
                                      className="w-14 px-1 py-1.5 text-xs border-2 border-black rounded-lg bg-white cursor-pointer hover:bg-pink-50 focus:ring-2 focus:ring-pink-300 outline-none text-center font-medium"
                                    >
                                      <option value="">-</option>
                                      {[1, 2, 3, 4, 5, 6, 8].map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-1 py-1">
                                    <select
                                      value={entry.clinicalPathologyHours || ''}
                                      onChange={(e) => updateWeeklyEntry(entry, 'clinicalPathologyHours', e.target.value ? parseInt(e.target.value) : null)}
                                      className="w-14 px-1 py-1.5 text-xs border-2 border-black rounded-lg bg-white cursor-pointer hover:bg-purple-50 focus:ring-2 focus:ring-purple-300 outline-none text-center font-medium"
                                    >
                                      <option value="">-</option>
                                      {[1, 2, 3, 4, 5, 6, 8].map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-1 py-1">
                                    <select
                                      value={entry.electrodiagnosticsHours || ''}
                                      onChange={(e) => updateWeeklyEntry(entry, 'electrodiagnosticsHours', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-14 px-1 py-1.5 text-xs border-2 border-black rounded-lg bg-white cursor-pointer hover:bg-yellow-50 focus:ring-2 focus:ring-yellow-300 outline-none text-center font-medium"
                                    >
                                      <option value="">-</option>
                                      {[1, 2, 3, 4, 5, 6, 8].map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-1 py-1">
                                    <select
                                      value={entry.journalClubHours || ''}
                                      onChange={(e) => updateWeeklyEntry(entry, 'journalClubHours', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-14 px-1 py-1.5 text-xs border-2 border-black rounded-lg bg-white cursor-pointer hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-300 outline-none text-center font-medium"
                                    >
                                      <option value="">-</option>
                                      {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5].map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-1 py-1">
                                    <input
                                      type="text"
                                      value={entry.supervisingDiplomateName || ''}
                                      onChange={(e) => updateWeeklyEntry(entry, 'supervisingDiplomateName', e.target.value || null)}
                                      className={`w-24 px-1 py-1 text-xs ${neoInput}`}
                                      placeholder="Dr. ..."
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Annual Summary - Year {selectedYear}
            </h2>

            {/* ACVIM Requirements Progress */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow p-4 sm:p-6 border border-purple-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award size={18} className="text-purple-600" />
                ACVIM Requirements Progress (Year {selectedYear})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clinical Neurology Direct */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Clinical Neurology (Direct)</span>
                    <span className="font-medium">{summary.clinicalDirectWeeks}/40 weeks</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (summary.clinicalDirectWeeks / 40) * 100)}%` }}
                    />
                  </div>
                </div>
                {/* Clinical Neurology Indirect */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Clinical Neurology (Indirect)</span>
                    <span className="font-medium">{summary.clinicalIndirectWeeks}/12 weeks</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (summary.clinicalIndirectWeeks / 12) * 100)}%` }}
                    />
                  </div>
                </div>
                {/* Neurosurgery Hours */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Neurosurgery</span>
                    <span className="font-medium">{summary.neurosurgeryHours}/200 hrs</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (summary.neurosurgeryHours / 200) * 100)}%` }}
                    />
                  </div>
                </div>
                {/* Journal Club Hours */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Journal Club</span>
                    <span className="font-medium">{summary.totalJournalHours}/50 hrs</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (summary.totalJournalHours / 50) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * Requirements are approximate per-year targets. Consult ACVIM credentials committee for exact requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Case Log Summary */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Stethoscope size={18} className="text-blue-600" />
                  Neurosurgery Cases
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cases:</span>
                    <span className="font-semibold">{summary.totalCases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Hours:</span>
                    <span className="font-semibold">{summary.totalCaseHours.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">As Primary:</span>
                    <span className="font-semibold text-blue-600">{summary.primaryCases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">As Assistant:</span>
                    <span className="font-semibold">{summary.assistantCases}</span>
                  </div>
                </div>
              </div>

              {/* Journal Club Summary */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen size={18} className="text-purple-600" />
                  Journal Club
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sessions:</span>
                    <span className="font-semibold">{summary.totalJournalSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Hours:</span>
                    <span className="font-semibold">{summary.totalJournalHours.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Weekly Schedule Summary */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar size={18} className="text-orange-600" />
                  Weekly Schedule Totals
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Clinical Direct:</span>
                    <span className="font-semibold">{summary.clinicalDirectWeeks} weeks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Clinical Indirect:</span>
                    <span className="font-semibold">{summary.clinicalIndirectWeeks} weeks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Neurosurgery:</span>
                    <span className="font-semibold">{summary.neurosurgeryHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Radiology:</span>
                    <span className="font-semibold">{summary.radiologyHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Neuropathology:</span>
                    <span className="font-semibold">{summary.neuropathologyHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Clinical Pathology:</span>
                    <span className="font-semibold">{summary.clinicalPathologyHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Electrodiagnostics:</span>
                    <span className="font-semibold">{summary.electrodiagnosticsHours} hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Tab - Gamification & Daily Tracking */}
        {activeTab === 'stats' && (
          <StatsTabContent />
        )}
      </div>

      {/* Milestone Celebration Modal */}
      <MilestoneCelebration />

      {/* Add Case Dialog */}
      {showCaseDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingCaseId ? 'Edit Neurosurgery Case' : 'Add Neurosurgery Case'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Procedure Name *
                </label>
                <input
                  type="text"
                  value={caseForm.procedureName}
                  onChange={(e) => setCaseForm({ ...caseForm, procedureName: e.target.value })}
                  placeholder="e.g., Hemilaminectomy, Ventral slot"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date Completed *
                </label>
                <input
                  type="date"
                  value={caseForm.dateCompleted}
                  onChange={(e) => setCaseForm({ ...caseForm, dateCompleted: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Case ID Number *
                </label>
                <input
                  type="text"
                  value={caseForm.caseIdNumber}
                  onChange={(e) => setCaseForm({ ...caseForm, caseIdNumber: e.target.value })}
                  placeholder="Medical record number"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Select from VetHub Patients (Optional)
                </label>
                <PatientCombobox
                  patients={patients}
                  value={caseForm.patientId?.toString() || ''}
                  onValueChange={(val) =>
                    setCaseForm({ ...caseForm, patientId: val ? parseInt(val) : undefined })
                  }
                  onPatientSelect={handlePatientSelect}
                  placeholder="Search surgery patients..."
                  emptyText="No surgery patients found"
                />
                {caseForm.patientName && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {caseForm.patientName} {caseForm.patientInfo && `(${caseForm.patientInfo})`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Role (Primary or Assistant) *
                </label>
                <select
                  value={caseForm.role}
                  onChange={(e) => setCaseForm({ ...caseForm, role: e.target.value as CaseRole })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="Primary">Primary</option>
                  <option value="Assistant">Assistant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Hours (0.25 increments) *
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={caseForm.hours}
                  onChange={(e) => setCaseForm({ ...caseForm, hours: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={caseForm.notes}
                  onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveCase}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingCaseId ? 'Save Changes' : 'Add Case'}
              </button>
              <button
                onClick={() => {
                  setShowCaseDialog(false);
                  setEditingCaseId(null);
                  resetCaseForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Journal Club Dialog */}
      {showJournalDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingJournalId ? 'Edit Journal Club Entry' : 'Add Journal Club Entry'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={journalForm.date}
                  onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Title of Article(s) - one per line
                </label>
                <textarea
                  value={journalForm.articleTitles}
                  onChange={(e) => setJournalForm({ ...journalForm, articleTitles: e.target.value })}
                  rows={3}
                  placeholder="Enter article titles, one per line..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Supervising Neurologist(s) - comma separated
                </label>
                <input
                  type="text"
                  value={journalForm.supervisingNeurologists}
                  onChange={(e) =>
                    setJournalForm({ ...journalForm, supervisingNeurologists: e.target.value })
                  }
                  placeholder="Dr. Smith, Dr. Jones"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Hours (0.5 increments) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={journalForm.hours}
                  onChange={(e) =>
                    setJournalForm({ ...journalForm, hours: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={journalForm.notes}
                  onChange={(e) => setJournalForm({ ...journalForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveJournal}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingJournalId ? 'Save Changes' : 'Add Entry'}
              </button>
              <button
                onClick={() => {
                  setShowJournalDialog(false);
                  setEditingJournalId(null);
                  resetJournalForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Dialog */}
      {showProfileDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">ACVIM Profile Settings</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Resident Name
                </label>
                <input
                  type="text"
                  value={profileForm.residentName}
                  onChange={(e) => setProfileForm({ ...profileForm, residentName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ACVIM Candidate ID
                </label>
                <input
                  type="text"
                  value={profileForm.acvimCandidateId}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, acvimCandidateId: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Training Facility
                </label>
                <input
                  type="text"
                  value={profileForm.trainingFacility}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, trainingFacility: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Program Start Date
                </label>
                <input
                  type="date"
                  value={profileForm.programStartDate}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, programStartDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Default Supervising Diplomates (comma separated)
                </label>
                <input
                  type="text"
                  value={profileForm.supervisingDiplomateNames}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, supervisingDiplomateNames: e.target.value })
                  }
                  placeholder="Dr. Smith, Dr. Jones"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  These will auto-fill when adding journal club entries
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button
                onClick={() => setShowProfileDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
