'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useFirebase, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type AppointmentType = 'New' | 'Recheck';

interface AppointmentData {
  id: string;
  name: string;
  signalment: string;
  problem: string;
  lastRecheck: string;
  lastPlan: string;
  mriDate: string;
  mriFindings: string;
  bloodworkNeeded: 'Needs Pheno' | 'Pheno/Bromide' | 'CBC/CHEM' | '';
  medications: string;
  otherConcerns: string;
  type: AppointmentType;
}

const getAppointmentTypeColor = (type: AppointmentType) => {
  if (type === 'Recheck') {
    return 'bg-green-50 border-green-200'; // Light green for rechecks
  }
  return 'bg-blue-50 border-blue-200'; // Light blue for new appointments
};


export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const { user, firestore } = useUserAndFirestore();

  // Common problems from Firestore
  const commonProblemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonProblems`));
  }, [firestore, user]);
  const commonProblemsRes = useCollection(commonProblemsQuery);
  const commonProblems = commonProblemsRes?.data ?? [];

  // Common medications from Firestore
  const commonMedicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonMedications`));
  }, [firestore, user]);
  const commonMedicationsRes = useCollection(commonMedicationsQuery);
  const commonMedications = commonMedicationsRes?.data ?? [];

  const addCommonProblem = (name: string) => {
    if (!name.trim() || !firestore || !user) return;
    if (!commonProblems.some(p => p.name === name.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonProblems`), { name: name.trim() });
    }
  };

  const addCommonMedication = (name: string) => {
    if (!name.trim() || !firestore || !user) return;
    if (!commonMedications.some(m => m.name === name.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonMedications`), { name: name.trim() });
    }
  };

  const deleteCommonItem = (type: 'commonProblems' | 'commonMedications', id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/${type}`, id);
    deleteDocumentNonBlocking(ref);
  };

  const getStorageKey = () => {
    const today = new Date().toISOString().split('T')[0];
    return `appointments_${today}`;
  };

  // Load appointments from local storage on mount
  useEffect(() => {
    const storageKey = getStorageKey();
    const storedAppointments = localStorage.getItem(storageKey);
    if (storedAppointments) {
      try {
        setAppointments(JSON.parse(storedAppointments));
      } catch (e) {
        console.error("Failed to parse appointments from storage", e);
        setAppointments([]);
      }
    } else {
        // Clear old data from other days
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('appointments_')) {
                localStorage.removeItem(key);
            }
        });
        setAppointments([]);
    }
  }, []);

  // Save appointments to local storage whenever they change
  useEffect(() => {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(appointments));
  }, [appointments]);

  const addAppointment = () => {
    const newAppt: AppointmentData = {
      id: Date.now().toString(),
      name: '',
      signalment: '',
      problem: '',
      lastRecheck: '',
      lastPlan: '',
      mriDate: '',
      mriFindings: '',
      bloodworkNeeded: '',
      medications: '',
      otherConcerns: '',
      type: 'New',
    };

    setAppointments(prev => [newAppt, ...prev]);
  };

  const updateAppointmentField = (id: string, field: keyof AppointmentData, value: string) => {
    setAppointments(prev =>
      prev.map(appt => (appt.id === id ? { ...appt, [field]: value } : appt))
    );
  };

  const removeAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const clearAll = () => {
    if (confirm('Clear all appointments for today?')) {
      setAppointments([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-black/5 p-6">
      <div className="max-w-screen-2xl mx-auto mb-6">
         <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-lg shadow-lg p-6 mb-4 border-t-4 border-purple-400">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar size={32} className="text-purple-600" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Today's Appointments</h1>
              </div>
              <Link
                href="/"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                ← Back to Patients
              </Link>
            </div>

            <div className="bg-white/50 rounded-lg shadow-lg p-6 mb-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Add & Manage Appointments</h2>
                  <p className="text-sm text-gray-600">
                    Click "Add Appointment" to create a new row. Data is saved locally for today.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addAppointment}
                    className="px-6 py-2 bg-gradient-to-r from-orange-600 to-purple-600 text-white rounded-lg hover:from-orange-700 hover:to-purple-700 flex items-center gap-2 transition shadow-md"
                  >
                    <Plus size={20} />
                    Add Appointment
                  </button>
                  {appointments.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </div>
         </div>

        {appointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No appointments added yet. Click "Add Appointment" to get started!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Name + Signalment</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Problem</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">MRI?</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Last Recheck?</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Bloodwork Needed</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Meds?</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Questions/Concerns?</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className={`border-b transition-colors hover:bg-purple-50 ${getAppointmentTypeColor(appt.type)}`}
                    >
                      <td className="p-2 align-top" style={{ minWidth: '120px' }}>
                        <select
                          value={appt.type}
                          onChange={(e) => updateAppointmentField(appt.id, 'type', e.target.value as AppointmentType)}
                          className="font-bold w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none bg-white"
                        >
                          <option value="New">New</option>
                          <option value="Recheck">Recheck</option>
                        </select>
                      </td>
                      <td className="p-2 align-top" style={{ minWidth: '200px' }}>
                        <input
                          type="text"
                          value={appt.name}
                          onChange={(e) => updateAppointmentField(appt.id, 'name', e.target.value)}
                          placeholder="Patient Name"
                          className="font-bold text-gray-900 w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none mb-1 bg-white"
                        />
                        <textarea
                          value={appt.signalment}
                          onChange={(e) => updateAppointmentField(appt.id, 'signalment', e.target.value)}
                          placeholder="Signalment"
                          rows={2}
                          className="text-sm text-gray-600 w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none resize-none bg-white"
                        />
                      </td>
                      <td className="p-2 align-top" style={{ minWidth: '250px' }}>
                        <div className="p-1 bg-yellow-50/50 border border-yellow-200/50 rounded-lg">
                           <div className="flex flex-wrap gap-1 mb-2">
                                {(commonProblems || []).slice(0, 5).map((pr: any) => (
                                  <button
                                    key={pr.id}
                                    onClick={() => {
                                        const current = appt.problem || '';
                                        const newValue = current ? `${current}\n${pr.name}` : pr.name;
                                        updateAppointmentField(appt.id, 'problem', newValue);
                                    }}
                                    className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition"
                                    title={`Add "${pr.name}"`}
                                  >
                                    + {pr.name}
                                  </button>
                                ))}
                            </div>
                             <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="Add new problem..."
                                    className="flex-1 px-2 py-1 text-xs border rounded"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addCommonProblem(e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                            </div>
                            <textarea
                              value={appt.problem}
                              onChange={(e) => updateAppointmentField(appt.id, 'problem', e.target.value)}
                              placeholder="Problem/Reason for visit"
                              rows={4}
                              className="text-sm text-gray-800 w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none bg-white"
                            />
                        </div>
                      </td>
                      <td className="p-2 align-top" style={{ minWidth: '250px' }}>
                        <textarea
                          value={`${appt.mriDate} ${appt.mriFindings}`.trim()}
                          onChange={(e) => {
                              const parts = e.target.value.split(' ');
                              const date = parts[0];
                              const findings = parts.slice(1).join(' ');
                              updateAppointmentField(appt.id, 'mriDate', date);
                              updateAppointmentField(appt.id, 'mriFindings', findings);
                          }}
                          placeholder="MRI Date & Findings"
                          rows={4}
                          className="text-sm text-gray-800 w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none bg-white"
                        />
                      </td>
                       <td className="p-2 align-top" style={{ minWidth: '250px' }}>
                        <textarea
                          value={`${appt.lastRecheck} ${appt.lastPlan}`.trim()}
                          onChange={(e) => {
                              const parts = e.target.value.split(' ');
                              const date = parts[0];
                              const plan = parts.slice(1).join(' ');
                              updateAppointmentField(appt.id, 'lastRecheck', date);
                              updateAppointmentField(appt.id, 'lastPlan', plan);
                          }}
                          placeholder="Last Recheck Date & Plan"
                          rows={4}
                          className="text-sm text-gray-800 w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none bg-white"
                        />
                      </td>
                       <td className="p-2 align-top" style={{ minWidth: '200px' }}>
                         <select
                            value={appt.bloodworkNeeded}
                            onChange={(e) => updateAppointmentField(appt.id, 'bloodworkNeeded', e.target.value as AppointmentData['bloodworkNeeded'])}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none bg-white"
                          >
                            <option value="">Select...</option>
                            <option value="Needs Pheno">Needs Pheno</option>
                            <option value="Pheno/Bromide">Pheno/Bromide</option>
                            <option value="CBC/CHEM">CBC/CHEM</option>
                          </select>
                      </td>
                      <td className="p-2 align-top" style={{ minWidth: '300px' }}>
                        <div className="p-1 bg-cyan-50/50 border border-cyan-200/50 rounded-lg">
                           <div className="flex flex-wrap gap-1 mb-2">
                                {(commonMedications || []).slice(0, 5).map((med: any) => (
                                  <button
                                    key={med.id}
                                    onClick={() => {
                                        const current = appt.medications || '';
                                        const newValue = current ? `${current}\n${med.name}` : med.name;
                                        updateAppointmentField(appt.id, 'medications', newValue);
                                    }}
                                    className="px-2 py-1 text-xs bg-cyan-100 text-cyan-800 rounded-full hover:bg-cyan-200 transition"
                                    title={`Add "${med.name}"`}
                                  >
                                    + {med.name}
                                  </button>
                                ))}
                            </div>
                             <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="Add new medication..."
                                    className="flex-1 px-2 py-1 text-xs border rounded"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addCommonMedication(e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                            </div>
                            <textarea
                              value={appt.medications}
                              onChange={(e) => updateAppointmentField(appt.id, 'medications', e.target.value)}
                              placeholder="Current medications"
                              rows={4}
                              className="text-sm text-gray-800 w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none whitespace-pre-wrap bg-white"
                            />
                        </div>
                      </td>
                      <td className="p-2 align-top" style={{ minWidth: '250px' }}>
                        <textarea
                          value={appt.otherConcerns}
                          onChange={(e) => updateAppointmentField(appt.id, 'otherConcerns', e.target.value)}
                          placeholder="Questions/Concerns"
                          rows={4}
                          className="text-sm text-gray-800 w-full px-2 py-1 border border-gray-300 rounded focus:border-purple-400 focus:outline-none bg-white"
                        />
                      </td>
                      <td className="p-2 align-top text-center">
                        <button
                          onClick={() => removeAppointment(appt.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Remove"
                        >
                          <X size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// A helper hook to safely get user and firestore, handling the case where they might not be available yet.
function useUserAndFirestore() {
    const { user, isUserLoading, firestore } = useFirebase();
    return { user, isUserLoading, firestore };
}
