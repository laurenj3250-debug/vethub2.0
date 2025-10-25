
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Calendar, Sparkles, HeartPulse, ShieldCheck, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useMemoFirebase, useCollection, useFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from "@/hooks/use-toast"
import { Textarea } from '@/components/ui/textarea';

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

interface HealthStatus {
  apiKeyFound: boolean;
  apiConnection: boolean;
  modelAvailable: boolean;
  status: 'OK' | 'ERROR';
  message: string;
  details?: string;
}

const getAppointmentTypeColor = (type: AppointmentType) => {
  if (type === 'Recheck') {
    return 'bg-green-100 border-green-300';
  }
  return 'bg-blue-100 border-blue-300';
};


export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const { user, firestore } = useUserAndFirestore();
  const { toast } = useToast();
  
  const [aiParseInput, setAiParseInput] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);


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
  
  const checkAIHealth = async () => {
    setIsCheckingHealth(true);
    setHealthStatus(null);
    try {
      const response = await fetch('/api/health-check');
      const data: HealthStatus = await response.json();
      setHealthStatus(data);
    } catch (err) {
      setHealthStatus({
        apiKeyFound: false,
        apiConnection: false,
        modelAvailable: false,
        status: 'ERROR',
        message: 'Failed to connect to the health check endpoint.',
        details: (err as Error).message,
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };


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

  const addAppointment = (data?: Partial<AppointmentData>) => {
    const newAppt: AppointmentData = {
      id: Date.now().toString(),
      name: data?.name || '',
      signalment: data?.signalment || '',
      problem: data?.problem || '',
      lastRecheck: data?.lastRecheck || '',
      lastPlan: data?.lastPlan || '',
      mriDate: data?.mriDate || '',
      mriFindings: data?.mriFindings || '',
      bloodworkNeeded: data?.bloodworkNeeded || '',
      medications: data?.medications || '',
otherConcerns: data?.otherConcerns || '',
      type: data?.type || (data?.lastRecheck ? 'Recheck' : 'New'),
    };

    setAppointments(prev => [newAppt, ...prev]);
  };
  
  const parseAndAddAppointment = async () => {
    if (!aiParseInput.trim()) {
      toast({ title: "Input is empty", description: "Please paste patient history to parse.", variant: "destructive" });
      return;
    }
    
    setIsParsing(true);
    try {
      if (useAI) {
        const response = await fetch('/api/parse-appointment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: aiParseInput }),
        });

        const errorData = await response.json();
        if (!response.ok) {
          throw new Error(errorData.details || errorData.error || 'AI parsing failed');
        }

        addAppointment(errorData); // On success, the body is the parsed data
        toast({ title: "Success", description: "AI successfully parsed the appointment." });
      } else {
        // Fallback to local regex-based parsing if needed in the future
        toast({ title: "Local Parsing", description: "This would use local parsing. AI checkbox is off.", variant: "default" });
        // For now, just add a blank appointment
        addAppointment();
      }
      setAiParseInput('');
    } catch (err: any) {
      console.error("Parsing error:", err);
      toast({ title: "Parsing Failed", description: err.message, variant: "destructive" });
      checkAIHealth(); // Automatically run health check on failure
      addAppointment(); // Add a blank row on failure so work isn't lost
    } finally {
      setIsParsing(false);
    }
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <h2 className="text-xl font-bold text-gray-800">Add New Appointment</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Manually add a new appointment to the list below.
                        </p>
                        <button
                            onClick={() => addAppointment()}
                            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-purple-600 text-white rounded-lg hover:from-orange-700 hover:to-purple-700 flex items-center gap-2 transition shadow-md"
                        >
                            <Plus size={20} />
                            Add Blank Row
                        </button>
                    </div>
                    {/* AI Parser Section */}
                    <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-200">
                      <h2 className="text-xl font-bold text-gray-800 mb-2">Quick Import</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Paste patient history to automatically fill the fields.
                      </p>
                      <Textarea
                        value={aiParseInput}
                        onChange={(e) => setAiParseInput(e.target.value)}
                        placeholder="Paste patient history from clinical notes..."
                        rows={6}
                        className="mb-2 bg-white"
                      />
                      <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            checked={useAI}
                            onChange={(e) => setUseAI(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          🤖 Use AI Parsing
                        </label>
                        <button
                          onClick={parseAndAddAppointment}
                          disabled={isParsing}
                          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 flex items-center gap-2 transition shadow-md disabled:opacity-50"
                        >
                          <Sparkles size={20} />
                          {isParsing ? 'Parsing...' : 'Parse & Add'}
                        </button>
                      </div>
                    </div>
                </div>

                 {appointments.length > 0 && (
                    <div className="mt-6 border-t pt-4 flex justify-end">
                      <button
                        onClick={clearAll}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
            </div>

            {/* AI Health Check Section */}
            <div className="bg-gray-50 rounded-lg shadow-lg p-6 mb-6 border-l-4 border-gray-400">
              <div className="flex items-center justify-between mb-4">
                <div className='flex items-center gap-2'>
                    <HeartPulse className="text-gray-600" />
                    <h2 className="text-xl font-bold text-gray-800">AI Health Check</h2>
                </div>
                <button
                  onClick={checkAIHealth}
                  disabled={isCheckingHealth}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 transition shadow-md disabled:opacity-50"
                >
                  {isCheckingHealth ? 'Checking...' : 'Run Check'}
                </button>
              </div>
              {isCheckingHealth && <p className="text-sm text-gray-600 animate-pulse">Checking AI system status...</p>}
              {healthStatus && (
                <div className="mt-4 space-y-3 p-4 rounded-lg bg-white border">
                    <div className={`flex items-center gap-3 p-3 rounded-md ${healthStatus.status === 'OK' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {healthStatus.status === 'OK' ? <ShieldCheck /> : <ShieldAlert />}
                        <p className="font-semibold">{healthStatus.message}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            {healthStatus.apiKeyFound ? <ShieldCheck className="text-green-600" /> : <ShieldAlert className="text-red-600" />}
                            <span>API Key Found</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            {healthStatus.apiConnection ? <Wifi className="text-green-600" /> : <WifiOff className="text-red-600" />}
                            <span>API Connection</span>
                        </div>
                    </div>

                    {healthStatus.status === 'ERROR' && healthStatus.details && (
                        <div className="p-3 bg-red-50/50 rounded-md border border-red-200">
                            <p className="font-semibold text-sm text-red-900">Details:</p>
                            <p className="text-xs text-red-700 font-mono mt-1">{healthStatus.details}</p>
                        </div>
                    )}
                </div>
              )}
            </div>
         </div>

        {appointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No appointments added yet. Add an appointment to get started!</p>
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
