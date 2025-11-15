'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import {
  SurgeryCase,
  JournalClubEntry,
  WeeklySchedule,
  ResidencyProgress,
  ProcedureCategory,
  SurgeryRole,
  ActivityType,
  WeeklyActivity,
} from '@/lib/residency-types';

const STORAGE_KEYS = {
  CASES: 'residency_cases',
  JOURNAL: 'residency_journal',
  SCHEDULES: 'residency_schedules',
};

export default function ResidencyTrackerPage() {
  // State
  const [cases, setCases] = useState<SurgeryCase[]>([]);
  const [journalClub, setJournalClub] = useState<JournalClubEntry[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Form states for Case Log
  const [caseForm, setCaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    procedure: '',
    category: 'Craniotomy' as ProcedureCategory,
    caseId: '',
    role: 'Primary Surgeon' as SurgeryRole,
    hours: 2.0,
    notes: '',
  });

  // Form states for Journal Club
  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    articles: '',
    supervisors: '',
    hours: 1.0,
    notes: '',
  });

  // Form states for Weekly Schedule
  const [scheduleForm, setScheduleForm] = useState({
    weekStartDate: getMonday(new Date()).toISOString().split('T')[0],
    activities: [
      { type: 'Surgery' as ActivityType, hours: 0 },
      { type: 'Diagnostic Imaging' as ActivityType, hours: 0 },
      { type: 'Clinical Rounds' as ActivityType, hours: 0 },
      { type: 'Consultation' as ActivityType, hours: 0 },
      { type: 'Research' as ActivityType, hours: 0 },
      { type: 'Teaching' as ActivityType, hours: 0 },
      { type: 'Journal Club' as ActivityType, hours: 0 },
      { type: 'Conferences' as ActivityType, hours: 0 },
      { type: 'Administrative' as ActivityType, hours: 0 },
    ] as WeeklyActivity[],
    notes: '',
  });

  // Load data from localStorage
  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    try {
      setLoading(true);

      const casesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CASES) || '[]');
      const journalData = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOURNAL) || '[]');
      const schedulesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES) || '[]');

      // Sort by date descending
      setCases(casesData.sort((a: SurgeryCase, b: SurgeryCase) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      setJournalClub(journalData.sort((a: JournalClubEntry, b: JournalClubEntry) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      setWeeklySchedules(schedulesData.sort((a: WeeklySchedule, b: WeeklySchedule) =>
        new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
      ));
    } catch (error) {
      console.error('Error loading residency data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Save to localStorage
  function saveCases(newCases: SurgeryCase[]) {
    localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(newCases));
    setCases(newCases);
  }

  function saveJournal(newJournal: JournalClubEntry[]) {
    localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(newJournal));
    setJournalClub(newJournal);
  }

  function saveSchedules(newSchedules: WeeklySchedule[]) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(newSchedules));
    setWeeklySchedules(newSchedules);
  }

  // Calculate progress
  const progress = useMemo((): ResidencyProgress => {
    const totalCaseHours = cases.reduce((sum, c) => sum + c.hours, 0);
    const totalJournalClubHours = journalClub.reduce((sum, j) => sum + j.hours, 0);
    const totalWeeklyHours = weeklySchedules.reduce((sum, w) => sum + w.totalHours, 0);

    const casesByCategory: Record<ProcedureCategory, number> = {
      Craniotomy: 0,
      'Spinal Surgery': 0,
      Diagnostic: 0,
      Emergency: 0,
      Other: 0,
    };

    const casesByRole: Record<SurgeryRole, number> = {
      'Primary Surgeon': 0,
      Assistant: 0,
      Observer: 0,
    };

    cases.forEach(c => {
      casesByCategory[c.category]++;
      casesByRole[c.role]++;
    });

    return {
      totalCaseHours,
      totalJournalClubHours,
      totalWeeklyHours,
      casesByCategory,
      casesByRole,
      totalCases: cases.length,
      totalJournalClubSessions: journalClub.length,
      totalWeeks: weeklySchedules.length,
      yearInProgram: 1,
    };
  }, [cases, journalClub, weeklySchedules]);

  // Handle add case
  function handleAddCase() {
    const newCase: SurgeryCase = {
      id: Date.now().toString(),
      ...caseForm,
      createdAt: Date.now(),
    };

    const newCases = [newCase, ...cases];
    saveCases(newCases);
    setShowCaseDialog(false);

    // Reset form
    setCaseForm({
      date: new Date().toISOString().split('T')[0],
      procedure: '',
      category: 'Craniotomy',
      caseId: '',
      role: 'Primary Surgeon',
      hours: 2.0,
      notes: '',
    });
  }

  // Handle add journal club
  function handleAddJournal() {
    const newJournal: JournalClubEntry = {
      id: Date.now().toString(),
      date: journalForm.date,
      articles: journalForm.articles.split('\n').filter(a => a.trim()),
      supervisors: journalForm.supervisors.split(',').map(s => s.trim()).filter(s => s),
      hours: journalForm.hours,
      notes: journalForm.notes,
      createdAt: Date.now(),
    };

    const newJournalEntries = [newJournal, ...journalClub];
    saveJournal(newJournalEntries);
    setShowJournalDialog(false);

    // Reset form
    setJournalForm({
      date: new Date().toISOString().split('T')[0],
      articles: '',
      supervisors: '',
      hours: 1.0,
      notes: '',
    });
  }

  // Handle add weekly schedule
  function handleAddSchedule() {
    const totalHours = scheduleForm.activities.reduce((sum, a) => sum + a.hours, 0);

    if (totalHours > 40) {
      alert('Total hours cannot exceed 40 per week!');
      return;
    }

    const weekStart = new Date(scheduleForm.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const newSchedule: WeeklySchedule = {
      id: Date.now().toString(),
      weekStartDate: scheduleForm.weekStartDate,
      weekEndDate: weekEnd.toISOString().split('T')[0],
      activities: scheduleForm.activities,
      totalHours,
      notes: scheduleForm.notes,
      createdAt: Date.now(),
    };

    const newSchedules = [newSchedule, ...weeklySchedules];
    saveSchedules(newSchedules);
    setShowScheduleDialog(false);

    // Reset form
    setScheduleForm({
      weekStartDate: getMonday(new Date()).toISOString().split('T')[0],
      activities: [
        { type: 'Surgery', hours: 0 },
        { type: 'Diagnostic Imaging', hours: 0 },
        { type: 'Clinical Rounds', hours: 0 },
        { type: 'Consultation', hours: 0 },
        { type: 'Research', hours: 0 },
        { type: 'Teaching', hours: 0 },
        { type: 'Journal Club', hours: 0 },
        { type: 'Conferences', hours: 0 },
        { type: 'Administrative', hours: 0 },
      ],
      notes: '',
    });
  }

  // Delete functions
  function deleteCase(id: string) {
    if (!confirm('Delete this case?')) return;
    const newCases = cases.filter(c => c.id !== id);
    saveCases(newCases);
  }

  function deleteJournal(id: string) {
    if (!confirm('Delete this journal club entry?')) return;
    const newJournal = journalClub.filter(j => j.id !== id);
    saveJournal(newJournal);
  }

  function deleteSchedule(id: string) {
    if (!confirm('Delete this weekly schedule?')) return;
    const newSchedules = weeklySchedules.filter(s => s.id !== id);
    saveSchedules(newSchedules);
  }

  // Export to ACVIM format
  function exportToACVIM() {
    const exportData = {
      residentName: 'Resident Name',
      programYear: progress.yearInProgram,
      exportDate: new Date().toISOString().split('T')[0],
      cases,
      journalClub,
      weeklySchedules,
      summary: progress,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `residency-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  const totalScheduleHours = scheduleForm.activities.reduce((sum, a) => sum + a.hours, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading residency data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Residency Tracker</h1>
              <Award className="text-purple-600" size={24} />
            </div>
            <button
              onClick={exportToACVIM}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              <Download size={16} />
              Export ACVIM
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope size={20} />
              <span className="text-sm font-semibold">Surgery Cases</span>
            </div>
            <div className="text-3xl font-bold">{progress.totalCases}</div>
            <div className="text-xs opacity-90">{progress.totalCaseHours.toFixed(1)} hours</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={20} />
              <span className="text-sm font-semibold">Journal Club</span>
            </div>
            <div className="text-3xl font-bold">{progress.totalJournalClubSessions}</div>
            <div className="text-xs opacity-90">{progress.totalJournalClubHours.toFixed(1)} hours</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} />
              <span className="text-sm font-semibold">Weekly Logs</span>
            </div>
            <div className="text-3xl font-bold">{progress.totalWeeks}</div>
            <div className="text-xs opacity-90">{progress.totalWeeklyHours.toFixed(1)} total hours</div>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-4 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} />
              <span className="text-sm font-semibold">Primary Surgeon</span>
            </div>
            <div className="text-3xl font-bold">{progress.casesByRole['Primary Surgeon']}</div>
            <div className="text-xs opacity-90">cases as primary</div>
          </div>
        </div>

        {/* Three Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Case Log */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="text-blue-600" size={20} />
                <h2 className="text-lg font-bold text-gray-900">Case Log</h2>
              </div>
              <button
                onClick={() => setShowCaseDialog(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                <Plus size={16} />
                Add Case
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {cases.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No cases logged yet</p>
              ) : (
                cases.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900">{c.procedure}</div>
                        <div className="text-xs text-gray-600">
                          {new Date(c.date).toLocaleDateString()} • {c.caseId}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCase(c.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{c.category}</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{c.role}</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{c.hours}h</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Journal Club */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="text-purple-600" size={20} />
                <h2 className="text-lg font-bold text-gray-900">Journal Club</h2>
              </div>
              <button
                onClick={() => setShowJournalDialog(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
              >
                <Plus size={16} />
                Add Entry
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {journalClub.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No journal club entries yet</p>
              ) : (
                journalClub.map(j => (
                  <div key={j.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900">
                          {new Date(j.date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-600">{j.articles.length} article(s)</div>
                      </div>
                      <button
                        onClick={() => deleteJournal(j.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      Supervisors: {j.supervisors.join(', ')}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{j.hours}h</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="text-orange-600" size={20} />
                <h2 className="text-lg font-bold text-gray-900">Weekly Schedule</h2>
              </div>
              <button
                onClick={() => setShowScheduleDialog(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
              >
                <Plus size={16} />
                Add Week
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {weeklySchedules.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No weekly schedules yet</p>
              ) : (
                weeklySchedules.map(w => (
                  <div key={w.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900">
                          Week of {new Date(w.weekStartDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-600">{w.totalHours} total hours</div>
                      </div>
                      <button
                        onClick={() => deleteSchedule(w.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {w.activities.filter(a => a.hours > 0).map((a, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          {a.type}: {a.hours}h
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Case Dialog */}
      {showCaseDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Surgery Case</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={caseForm.date}
                  onChange={e => setCaseForm({ ...caseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Procedure</label>
                <input
                  type="text"
                  value={caseForm.procedure}
                  onChange={e => setCaseForm({ ...caseForm, procedure: e.target.value })}
                  placeholder="e.g., Suboccipital craniotomy"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={caseForm.category}
                  onChange={e => setCaseForm({ ...caseForm, category: e.target.value as ProcedureCategory })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="Craniotomy">Craniotomy</option>
                  <option value="Spinal Surgery">Spinal Surgery</option>
                  <option value="Diagnostic">Diagnostic</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Case ID</label>
                <input
                  type="text"
                  value={caseForm.caseId}
                  onChange={e => setCaseForm({ ...caseForm, caseId: e.target.value })}
                  placeholder="Hospital case ID"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={caseForm.role}
                  onChange={e => setCaseForm({ ...caseForm, role: e.target.value as SurgeryRole })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="Primary Surgeon">Primary Surgeon</option>
                  <option value="Assistant">Assistant</option>
                  <option value="Observer">Observer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Hours (0.25 increments)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={caseForm.hours}
                  onChange={e => setCaseForm({ ...caseForm, hours: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={caseForm.notes}
                  onChange={e => setCaseForm({ ...caseForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddCase}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add Case
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

      {/* Journal Club Dialog */}
      {showJournalDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Journal Club Entry</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={journalForm.date}
                  onChange={e => setJournalForm({ ...journalForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Articles (one per line)</label>
                <textarea
                  value={journalForm.articles}
                  onChange={e => setJournalForm({ ...journalForm, articles: e.target.value })}
                  placeholder="Article title or citation..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Supervisors (comma separated)</label>
                <input
                  type="text"
                  value={journalForm.supervisors}
                  onChange={e => setJournalForm({ ...journalForm, supervisors: e.target.value })}
                  placeholder="Dr. Smith, Dr. Jones"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Hours (0.5 increments)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={journalForm.hours}
                  onChange={e => setJournalForm({ ...journalForm, hours: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={journalForm.notes}
                  onChange={e => setJournalForm({ ...journalForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddJournal}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Add Entry
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

      {/* Weekly Schedule Dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Weekly Schedule</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Week Start (Monday)</label>
                <input
                  type="date"
                  value={scheduleForm.weekStartDate}
                  onChange={e => setScheduleForm({ ...scheduleForm, weekStartDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">Activity Hours</span>
                  <span className={`text-sm font-bold ${totalScheduleHours > 40 ? 'text-red-600' : 'text-green-600'}`}>
                    {totalScheduleHours} / 40 hours
                  </span>
                </div>

                <div className="space-y-2">
                  {scheduleForm.activities.map((activity, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <label className="text-xs text-gray-700 w-32">{activity.type}</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="40"
                        value={activity.hours}
                        onChange={e => {
                          const newActivities = [...scheduleForm.activities];
                          newActivities[index].hours = parseFloat(e.target.value) || 0;
                          setScheduleForm({ ...scheduleForm, activities: newActivities });
                        }}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-xs text-gray-500 w-8">hrs</span>
                    </div>
                  ))}
                </div>
              </div>

              {totalScheduleHours > 40 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-xs text-red-700">Total hours cannot exceed 40 per week!</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddSchedule}
                disabled={totalScheduleHours > 40}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Schedule
              </button>
              <button
                onClick={() => setShowScheduleDialog(false)}
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

// Helper function to get Monday of current week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
