'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Stethoscope,
  BookOpen,
  Calendar,
  TrendingUp,
  Download,
  Award,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Save,
  FileText,
  User,
} from 'lucide-react';
import {
  NeurosurgeryCase,
  JournalClubEntry,
  WeeklyScheduleEntry,
  ACVIMProfile,
  CaseRole,
} from '@/lib/residency-types';
import { PatientCombobox, PatientOption } from '@/components/PatientCombobox';

type TabType = 'cases' | 'journal' | 'schedule' | 'summary';

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

  // Add case
  async function handleAddCase() {
    if (!caseForm.procedureName || !caseForm.caseIdNumber) {
      alert('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/acvim/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...caseForm,
          residencyYear: selectedYear,
        }),
      });
      if (res.ok) {
        const newCase = await res.json();
        setCases([newCase, ...cases]);
        setShowCaseDialog(false);
        resetCaseForm();
      }
    } catch (error) {
      console.error('Error adding case:', error);
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

  // Add journal club entry
  async function handleAddJournal() {
    if (!journalForm.date || !journalForm.hours) {
      alert('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/acvim/journal-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        const newEntry = await res.json();
        setJournalClub([newEntry, ...journalClub]);
        setShowJournalDialog(false);
        resetJournalForm();
      }
    } catch (error) {
      console.error('Error adding journal club entry:', error);
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

  // Update weekly schedule entry
  const updateWeeklyEntry = useCallback(
    async (
      entry: WeeklyScheduleEntry,
      field: keyof WeeklyScheduleEntry,
      value: number | string | null
    ) => {
      const updatedEntry = { ...entry, [field]: value };
      try {
        const res = await fetch('/api/acvim/weekly-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEntry),
        });
        if (res.ok) {
          const saved = await res.json();
          setWeeklySchedule((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
        }
      } catch (error) {
        console.error('Error updating weekly entry:', error);
      }
    },
    []
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

  // Export to Word (JSON for now - Word generation can be added)
  function handleExport() {
    const exportData = {
      profile,
      year: selectedYear,
      cases,
      journalClub,
      weeklySchedule,
      summary,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ACVIM-Year${selectedYear}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading ACVIM data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                <ArrowLeft size={16} />
                Dashboard
              </Link>
              <h1 className="text-xl font-bold text-gray-900">ACVIM Residency Tracker</h1>
              <Award className="text-purple-600" size={24} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProfileDialog(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm"
              >
                <Settings size={16} />
                Profile
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
              >
                <Download size={16} />
                Export Year {selectedYear}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Year Selector + Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear(Math.max(1, selectedYear - 1))}
                disabled={selectedYear === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-1">
                {[1, 2, 3].map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      selectedYear === year
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Year {year}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSelectedYear(Math.min(3, selectedYear + 1))}
                disabled={selectedYear === 3}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('cases')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'cases' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                }`}
              >
                <Stethoscope size={16} />
                Case Log
              </button>
              <button
                onClick={() => setActiveTab('journal')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'journal' ? 'bg-white shadow text-purple-600' : 'text-gray-600'
                }`}
              >
                <BookOpen size={16} />
                Journal Club
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'schedule' ? 'bg-white shadow text-orange-600' : 'text-gray-600'
                }`}
              >
                <Calendar size={16} />
                Weekly Schedule
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'summary' ? 'bg-white shadow text-green-600' : 'text-gray-600'
                }`}
              >
                <TrendingUp size={16} />
                Summary
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Case Log Tab */}
        {activeTab === 'cases' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Neurosurgery Case Log - Year {selectedYear}
              </h2>
              <button
                onClick={() => setShowCaseDialog(true)}
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
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
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
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteCase(c.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
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
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {journalClub.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
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
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteJournal(j.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Weekly Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Weekly Schedule - Year {selectedYear}
              </h2>
              <p className="text-sm text-gray-500">Click cells to edit. Auto-saves on change.</p>
            </div>

            {/* Schedule Grid */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 min-w-[80px]">
                      Month
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 min-w-[90px]">
                      Week
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[70px]">
                      Clinical
                      <br />
                      Direct
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[70px]">
                      Clinical
                      <br />
                      Indirect
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[70px]">
                      Neuro
                      <br />
                      surgery
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[70px]">
                      Radiology
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[70px]">
                      Neuro
                      <br />
                      pathology
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[70px]">
                      Clinical
                      <br />
                      Pathology
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[70px]">
                      Electro
                      <br />
                      diagnostics
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[70px]">
                      Journal
                      <br />
                      Club
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 min-w-[100px]">
                      Other
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 min-w-[120px]">
                      Diplomate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {weeklySchedule.map((entry, idx) => {
                    const showMonthHeader =
                      idx === 0 || weeklySchedule[idx - 1].monthNumber !== entry.monthNumber;
                    return (
                      <tr
                        key={entry.id}
                        className={showMonthHeader ? 'bg-gray-50' : 'hover:bg-gray-50'}
                      >
                        <td className="px-2 py-2 text-xs font-medium text-gray-700">
                          {showMonthHeader ? `Month ${entry.monthNumber}` : ''}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-600">{entry.weekDateRange}</td>
                        <td className="px-1 py-1">
                          <select
                            value={entry.clinicalNeurologyDirect || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'clinicalNeurologyDirect',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded text-center"
                          >
                            <option value="">-</option>
                            <option value="0.5">0.5</option>
                            <option value="1">1</option>
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={entry.clinicalNeurologyIndirect || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'clinicalNeurologyIndirect',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded text-center"
                          >
                            <option value="">-</option>
                            <option value="0.5">0.5</option>
                            <option value="1">1</option>
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={entry.neurosurgeryHours || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'neurosurgeryHours',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded text-center"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={entry.radiologyHours || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'radiologyHours',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded text-center"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={entry.neuropathologyHours || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'neuropathologyHours',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded text-center"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={entry.clinicalPathologyHours || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'clinicalPathologyHours',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded text-center"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={entry.electrodiagnosticsHours || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'electrodiagnosticsHours',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded text-center"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={entry.journalClubHours || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'journalClubHours',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded text-center"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.otherTimeDescription || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(entry, 'otherTimeDescription', e.target.value || null)
                            }
                            className="w-full px-1 py-1 text-xs border rounded"
                            placeholder="vacation, Brain Camp..."
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={entry.supervisingDiplomateName || ''}
                            onChange={(e) =>
                              updateWeeklyEntry(
                                entry,
                                'supervisingDiplomateName',
                                e.target.value || null
                              )
                            }
                            className="w-full px-1 py-1 text-xs border rounded"
                            placeholder="Dr. ..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Annual Summary - Year {selectedYear}
            </h2>

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
      </div>

      {/* Add Case Dialog */}
      {showCaseDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Neurosurgery Case</h3>

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
                onClick={handleAddCase}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Case'}
              </button>
              <button
                onClick={() => setShowCaseDialog(false)}
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Journal Club Entry</h3>

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
                onClick={handleAddJournal}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Entry'}
              </button>
              <button
                onClick={() => setShowJournalDialog(false)}
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
