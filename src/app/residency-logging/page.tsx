'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Save, X, Calendar, Brain, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';
import { useUser, useAuth, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { collection, doc, query, orderBy, where, getDocs, writeBatch } from 'firebase/firestore';

// Helper to get the start of the week (Monday) for a given date
const getStartOfWeek = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
};

export default function ResidencyLogging() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'neurosurgery' | 'journal' | 'weekly'>('neurosurgery');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [yearFilter, setYearFilter] = useState<'all' | '1' | '2' | '3'>('all');

  // Firestore queries
  const neurosurgeryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/neurosurgeryCases`),
      orderBy('date', 'desc')
    );
  }, [firestore, user]);
  const neurosurgeryRes = useCollection(neurosurgeryQuery);
  const neurosurgeryCases = neurosurgeryRes?.data ?? [];

  const journalQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/journalClubs`),
      orderBy('date', 'desc')
    );
  }, [firestore, user]);
  const journalRes = useCollection(journalQuery);
  const journalClubs = journalRes?.data ?? [];

  const weeklyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/weeklyActivities`),
      orderBy('weekStart', 'desc')
    );
  }, [firestore, user]);
  const weeklyRes = useCollection(weeklyQuery);
  const weeklyActivities = weeklyRes?.data ?? [];

  // --- Automation Logic ---
  const updateNeurosurgeryHoursForWeek = async (dateString: string) => {
    if (!firestore || !user) return;

    const weekStart = getStartOfWeek(dateString);
    const weekEnd = new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() + 7)).toISOString().split('T')[0];

    // Find all neurosurgery cases for that week
    const casesInWeekQuery = query(
      collection(firestore, `users/${user.uid}/neurosurgeryCases`),
      where('date', '>=', weekStart),
      where('date', '<', weekEnd)
    );
    const caseDocs = await getDocs(casesInWeekQuery);
    const totalHours = caseDocs.docs.reduce((sum, doc) => sum + (parseFloat(doc.data().hours) || 0), 0);

    // Find the weekly activity log for that week
    const weeklyLogQuery = query(
      collection(firestore, `users/${user.uid}/weeklyActivities`),
      where('weekStart', '==', weekStart)
    );
    const weeklyLogDocs = await getDocs(weeklyLogQuery);

    if (weeklyLogDocs.empty) {
      // If no log exists, create one with the calculated hours
      await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/weeklyActivities`), {
        weekStart,
        neurosurgery: totalHours,
        clinicalNeurologyDirect: 0,
        clinicalNeurologyIndirect: 0,
        radiology: 0,
        neuropathology: 0,
        clinicalPathology: 0,
        electrodiagnostics: 0,
        journalClub: 0,
        otherTime: '',
        supervisingDiplomate: '',
        year: '1', // Default to year 1, user can change
      });
    } else {
      // If a log exists, update it
      const logDocRef = weeklyLogDocs.docs[0].ref;
      await updateDocumentNonBlocking(logDocRef, { neurosurgery: totalHours });
    }
  };


  // CRUD Operations
  const startEdit = (id: string, data: any) => {
    setEditingId(id);
    setEditingData({ ...data });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveEdit = async (collectionName: string, id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/${collectionName}`, id);
    const originalDoc = (collectionName === 'neurosurgeryCases' ? neurosurgeryCases : journalClubs).find((item:any) => item.id === id);

    await updateDocumentNonBlocking(ref, editingData);

    if (collectionName === 'neurosurgeryCases') {
      // Update hours for the new date's week
      await updateNeurosurgeryHoursForWeek(editingData.date);
      // If the date changed, also update the old date's week
      if (originalDoc && originalDoc.date !== editingData.date) {
        await updateNeurosurgeryHoursForWeek(originalDoc.date);
      }
    }

    setEditingId(null);
    setEditingData({});
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!firestore || !user) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const ref = doc(firestore, `users/${user.uid}/${collectionName}`, id);
    
    const docToDelete = (collectionName === 'neurosurgeryCases' ? neurosurgeryCases : journalClubs).find((item: any) => item.id === id);

    await deleteDocumentNonBlocking(ref);

    if (collectionName === 'neurosurgeryCases' && docToDelete) {
      await updateNeurosurgeryHoursForWeek(docToDelete.date);
    }
  };

  const addNeurosurgeryCase = async () => {
    if (!firestore || !user) return;
    const newCase = {
      procedureName: '',
      date: new Date().toISOString().split('T')[0],
      caseId: '',
      role: 'Primary',
      hours: 1,
      year: '1',
    };
    await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/neurosurgeryCases`), newCase);
    // After adding, update the corresponding week.
    await updateNeurosurgeryHoursForWeek(newCase.date);
  };

  const addJournalClub = () => {
    if (!firestore || !user) return;
    const newJournal = {
      date: new Date().toISOString().split('T')[0],
      articleTitle: '',
      supervisingNeurologist: '',
      hours: 0.5,
      year: '1',
    };
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/journalClubs`), newJournal);
  };

  const addWeeklyActivity = () => {
    if (!firestore || !user) return;
    const newWeek = {
      weekStart: new Date().toISOString().split('T')[0],
      clinicalNeurologyDirect: 0,
      clinicalNeurologyIndirect: 0,
      neurosurgery: 0,
      radiology: 0,
      neuropathology: 0,
      clinicalPathology: 0,
      electrodiagnostics: 0,
      journalClub: 0,
      otherTime: '',
      supervisingDiplomate: '',
      year: '1',
    };
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/weeklyActivities`), newWeek);
  };

  // Calculate totals
  const neurosurgeryTotalsByYear = {
    '1': neurosurgeryCases.filter((c: any) => c.year === '1').reduce((sum: number, c: any) => sum + (parseFloat(c.hours) || 0), 0),
    '2': neurosurgeryCases.filter((c: any) => c.year === '2').reduce((sum: number, c: any) => sum + (parseFloat(c.hours) || 0), 0),
    '3': neurosurgeryCases.filter((c: any) => c.year === '3').reduce((sum: number, c: any) => sum + (parseFloat(c.hours) || 0), 0),
  };

  const journalTotalsByYear = {
    '1': journalClubs.filter((j: any) => j.year === '1').reduce((sum: number, j: any) => sum + (parseFloat(j.hours) || 0), 0),
    '2': journalClubs.filter((j: any) => j.year === '2').reduce((sum: number, j: any) => sum + (parseFloat(j.hours) || 0), 0),
    '3': journalClubs.filter((j: any) => j.year === '3').reduce((sum: number, j: any) => sum + (parseFloat(j.hours) || 0), 0),
  };

  const filterByYear = (items: any[]) => {
    if (yearFilter === 'all') return items;
    return items.filter((item: any) => item.year === yearFilter);
  };

  const filterBySearch = (items: any[]) => {
    if (!searchQuery) return items;
    return items.filter((item: any) => 
      JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredData = filterBySearch(filterByYear(
    activeTab === 'neurosurgery' ? neurosurgeryCases :
    activeTab === 'journal' ? journalClubs :
    weeklyActivities
  ));

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading... 🐾</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Please sign in to access residency logging</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-fuchsia-50/50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 mb-4 border-t-2 border-purple-300">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                🎓 ACVIM Residency Logging
              </h1>
              <p className="text-xs text-gray-500">Track neurosurgery cases, journal clubs, and weekly activities</p>
            </div>
            <Link
              href="/"
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              ← Back to Tracker
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('neurosurgery')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'neurosurgery'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Brain size={16} />
              Neurosurgery Cases
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'journal'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BookOpen size={16} />
              Journal Clubs
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'weekly'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Calendar size={16} />
              Weekly Schedule
            </button>
          </div>

          {/* Filters and Search */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
            </select>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-green-400">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            {activeTab === 'neurosurgery' ? '⏱️ Neurosurgery Hours' :
             activeTab === 'journal' ? '📚 Journal Club Hours' :
             '📅 Weekly Activity Summary'}
          </h2>
          {activeTab === 'neurosurgery' && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div className="text-xs text-gray-600 font-semibold">Year 1</div>
                <div className="text-2xl font-bold text-purple-800">{neurosurgeryTotalsByYear['1'].toFixed(2)}h</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div className="text-xs text-gray-600 font-semibold">Year 2</div>
                <div className="text-2xl font-bold text-purple-800">{neurosurgeryTotalsByYear['2'].toFixed(2)}h</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div className="text-xs text-gray-600 font-semibold">Year 3</div>
                <div className="text-2xl font-bold text-purple-800">{neurosurgeryTotalsByYear['3'].toFixed(2)}h</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                <div className="text-xs text-gray-600 font-semibold">Total</div>
                <div className="text-2xl font-bold text-green-800">
                  {(neurosurgeryTotalsByYear['1'] + neurosurgeryTotalsByYear['2'] + neurosurgeryTotalsByYear['3']).toFixed(2)}h
                </div>
              </div>
            </div>
          )}
          {activeTab === 'journal' && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-xs text-gray-600 font-semibold">Year 1</div>
                <div className="text-2xl font-bold text-blue-800">{journalTotalsByYear['1'].toFixed(1)}h</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-xs text-gray-600 font-semibold">Year 2</div>
                <div className="text-2xl font-bold text-blue-800">{journalTotalsByYear['2'].toFixed(1)}h</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-xs text-gray-600 font-semibold">Year 3</div>
                <div className="text-2xl font-bold text-blue-800">{journalTotalsByYear['3'].toFixed(1)}h</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                <div className="text-xs text-gray-600 font-semibold">Total</div>
                <div className="text-2xl font-bold text-green-800">
                  {(journalTotalsByYear['1'] + journalTotalsByYear['2'] + journalTotalsByYear['3']).toFixed(1)}h
                </div>
              </div>
            </div>
          )}
          {activeTab === 'weekly' && (
            <div className="text-sm text-gray-600">
              Total weeks logged: <span className="font-bold text-purple-800">{weeklyActivities.length}</span>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              if (activeTab === 'neurosurgery') addNeurosurgeryCase();
              else if (activeTab === 'journal') addJournalClub();
              else addWeeklyActivity();
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-lg hover:from-purple-600 hover:to-fuchsia-600 flex items-center gap-2 shadow-md transition"
          >
            <Plus size={16} />
            Add {activeTab === 'neurosurgery' ? 'Case' : activeTab === 'journal' ? 'Journal Club' : 'Week'}
          </button>
        </div>

        {/* Data Tables */}
        {activeTab === 'neurosurgery' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Date</th>
                    <th className="px-4 py-2 text-left font-semibold">Procedure</th>
                    <th className="px-4 py-2 text-left font-semibold">Case ID</th>
                    <th className="px-4 py-2 text-left font-semibold">Role</th>
                    <th className="px-4 py-2 text-left font-semibold">Hours</th>
                    <th className="px-4 py-2 text-left font-semibold">Year</th>
                    <th className="px-4 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((case_: any, idx: number) => (
                    <tr key={case_.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {editingId === case_.id ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={editingData.date || ''}
                              onChange={(e) => setEditingData({ ...editingData, date: e.target.value })}
                              className="w-full px-2 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              value={editingData.procedureName || ''}
                              onChange={(e) => setEditingData({ ...editingData, procedureName: e.target.value })}
                              className="w-full px-2 py-1 text-xs border rounded"
                              placeholder="e.g., hemilaminectomy"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              value={editingData.caseId || ''}
                              onChange={(e) => setEditingData({ ...editingData, caseId: e.target.value })}
                              className="w-full px-2 py-1 text-xs border rounded"
                              placeholder="Medical record #"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editingData.role || 'Primary'}
                              onChange={(e) => setEditingData({ ...editingData, role: e.target.value })}
                              className="w-full px-2 py-1 text-xs border rounded"
                            >
                              <option>Primary</option>
                              <option>Assistant</option>
                              <option>Secondary</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.25"
                              value={editingData.hours || ''}
                              onChange={(e) => setEditingData({ ...editingData, hours: e.target.value })}
                              className="w-20 px-2 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editingData.year || '1'}
                              onChange={(e) => setEditingData({ ...editingData, year: e.target.value })}
                              className="w-16 px-2 py-1 text-xs border rounded"
                            >
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit('neurosurgeryCases', case_.id)}
                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2">{case_.date}</td>
                          <td className="px-4 py-2 font-semibold">{case_.procedureName || '-'}</td>
                          <td className="px-4 py-2 text-gray-600">{case_.caseId || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              case_.role === 'Primary' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {case_.role}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-bold text-purple-700">{case_.hours}h</td>
                          <td className="px-4 py-2 text-gray-600">Year {case_.year}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEdit(case_.id, case_)}
                                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => deleteItem('neurosurgeryCases', case_.id)}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Date</th>
                    <th className="px-4 py-2 text-left font-semibold">Article Title</th>
                    <th className="px-4 py-2 text-left font-semibold">Supervising Neurologist</th>
                    <th className="px-4 py-2 text-left font-semibold">Hours</th>
                    <th className="px-4 py-2 text-left font-semibold">Year</th>
                    <th className="px-4 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((journal: any, idx: number) => (
                    <tr key={journal.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {editingId === journal.id ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={editingData.date || ''}
                              onChange={(e) => setEditingData({ ...editingData, date: e.target.value })}
                              className="w-full px-2 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              value={editingData.articleTitle || ''}
                              onChange={(e) => setEditingData({ ...editingData, articleTitle: e.target.value })}
                              className="w-full px-2 py-1 text-xs border rounded"
                              placeholder="Article title"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              value={editingData.supervisingNeurologist || ''}
                              onChange={(e) => setEditingData({ ...editingData, supervisingNeurologist: e.target.value })}
                              className="w-full px-2 py-1 text-xs border rounded"
                              placeholder="Neurologist name"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.5"
                              value={editingData.hours || ''}
                              onChange={(e) => setEditingData({ ...editingData, hours: e.target.value })}
                              className="w-20 px-2 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editingData.year || '1'}
                              onChange={(e) => setEditingData({ ...editingData, year: e.target.value })}
                              className="w-16 px-2 py-1 text-xs border rounded"
                            >
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit('journalClubs', journal.id)}
                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2">{journal.date}</td>
                          <td className="px-4 py-2 font-semibold">{journal.articleTitle || '-'}</td>
                          <td className="px-4 py-2 text-gray-700">{journal.supervisingNeurologist || '-'}</td>
                          <td className="px-4 py-2 font-bold text-blue-700">{journal.hours}h</td>
                          <td className="px-4 py-2 text-gray-600">Year {journal.year}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEdit(journal.id, journal)}
                                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => deleteItem('journalClubs', journal.id)}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-green-100">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold">Week Start</th>
                    <th className="px-2 py-2 text-left font-semibold">Neuro Direct (wks)</th>
                    <th className="px-2 py-2 text-left font-semibold">Neuro Indirect (wks)</th>
                    <th className="px-2 py-2 text-left font-semibold">Neurosurgery (hrs)</th>
                    <th className="px-2 py-2 text-left font-semibold">Radiology (hrs)</th>
                    <th className="px-2 py-2 text-left font-semibold">Neuropath (hrs)</th>
                    <th className="px-2 py-2 text-left font-semibold">Clin Path (hrs)</th>
                    <th className="px-2 py-2 text-left font-semibold">EDx (hrs)</th>
                    <th className="px-2 py-2 text-left font-semibold">Journal (hrs)</th>
                    <th className="px-2 py-2 text-left font-semibold">Other</th>
                    <th className="px-2 py-2 text-left font-semibold">Diplomate</th>
                    <th className="px-2 py-2 text-left font-semibold">Year</th>
                    <th className="px-2 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((week: any, idx: number) => (
                    <tr key={week.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {editingId === week.id ? (
                        <>
                          <td className="px-2 py-2">
                            <input
                              type="date"
                              value={editingData.weekStart || ''}
                              onChange={(e) => setEditingData({ ...editingData, weekStart: e.target.value })}
                              className="w-full px-1 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.25"
                              value={editingData.clinicalNeurologyDirect || ''}
                              onChange={(e) => setEditingData({ ...editingData, clinicalNeurologyDirect: e.target.value })}
                              className="w-16 px-1 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.25"
                              value={editingData.clinicalNeurologyIndirect || ''}
                              onChange={(e) => setEditingData({ ...editingData, clinicalNeurologyIndirect: e.target.value })}
                              className="w-16 px-1 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.25"
                              value={editingData.neurosurgery || ''}
                              onChange={(e) => setEditingData({ ...editingData, neurosurgery: e.target.value })}
                              className="w-16 px-1 py-1 text-xs border rounded bg-gray-200"
                              readOnly
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={editingData.radiology || ''}
                              onChange={(e) => setEditingData({ ...editingData, radiology: e.target.value })}
                              className="w-16 px-1 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={editingData.neuropathology || ''}
                              onChange={(e) => setEditingData({ ...editingData, neuropathology: e.target.value })}
                              className="w-16 px-1 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={editingData.clinicalPathology || ''}
                              onChange={(e) => setEditingData({ ...editingData, clinicalPathology: e.target.value })}
                              className="w-16 px-1 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.25"
                              value={editingData.electrodiagnostics || ''}
                              onChange={(e) => setEditingData({ ...editingData, electrodiagnostics: e.target.value })}
                              className="w-16 px-1 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.5"
                              value={editingData.journalClub || ''}
                              onChange={(e) => setEditingData({ ...editingData, journalClub: e.target.value })}
                              className="w-16 px-1 py-1 text-xs border rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={editingData.otherTime || ''}
                              onChange={(e) => setEditingData({ ...editingData, otherTime: e.target.value })}
                              className="w-24 px-1 py-1 text-xs border rounded"
                              placeholder="e.g. Vacation"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={editingData.supervisingDiplomate || ''}
                              onChange={(e) => setEditingData({ ...editingData, supervisingDiplomate: e.target.value })}
                              className="w-32 px-1 py-1 text-xs border rounded"
                              placeholder="Diplomate name"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={editingData.year || '1'}
                              onChange={(e) => setEditingData({ ...editingData, year: e.target.value })}
                              className="w-12 px-1 py-1 text-xs border rounded"
                            >
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit('weeklyActivities', week.id)}
                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2 font-semibold">{week.weekStart}</td>
                          <td className="px-2 py-2 text-center">{week.clinicalNeurologyDirect || '-'}</td>
                          <td className="px-2 py-2 text-center">{week.clinicalNeurologyIndirect || '-'}</td>
                          <td className="px-2 py-2 text-center font-bold text-purple-700">{week.neurosurgery || '-'}</td>
                          <td className="px-2 py-2 text-center">{week.radiology || '-'}</td>
                          <td className="px-2 py-2 text-center">{week.neuropathology || '-'}</td>
                          <td className="px-2 py-2 text-center">{week.clinicalPathology || '-'}</td>
                          <td className="px-2 py-2 text-center">{week.electrodiagnostics || '-'}</td>
                          <td className="px-2 py-2 text-center">{week.journalClub || '-'}</td>
                          <td className="px-2 py-2 text-gray-600">{week.otherTime || '-'}</td>
                          <td className="px-2 py-2 text-gray-700">{week.supervisingDiplomate || '-'}</td>
                          <td className="px-2 py-2 text-gray-600">Year {week.year}</td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEdit(week.id, week)}
                                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => deleteItem('weeklyActivities', week.id)}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pb-4">
          <p>🐾 ACVIM Residency Documentation System</p>
          <p className="mt-1 italic">Keep all logs continuously updated throughout your residency</p>
        </div>
      </div>
    </div>
  );
}
