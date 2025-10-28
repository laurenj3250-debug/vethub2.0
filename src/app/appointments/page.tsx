'use client';

import { useState } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import Link from 'next/link';

interface AppointmentData {
  id: string;
  name: string;
  signalment: string;
  problem: string;
  lastRecheck: string;
  lastPlan: string;
  mriDate: string;
  mriFindings: string;
  bloodworkDue: string;
  medications: string;
  otherConcerns: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [pasteInput, setPasteInput] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const parseAppointment = (text: string): Partial<AppointmentData> => {
    const data: Partial<AppointmentData> = {};
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Extract patient name - look for pattern like "Lobo (MN)" or first non-header line
    const patientLineIdx = lines.findIndex(l => l.match(/^[A-Z][a-z]+\s*\([A-Z]+\)/) || (l.match(/^[A-Z][a-z]+/) && !l.includes(':')));
    if (patientLineIdx >= 0) {
      const nameLine = lines[patientLineIdx];
      // Remove neutered status in parentheses for cleaner display
      data.name = nameLine.replace(/\s*\([A-Z]+\)/, '').trim();
    }

    // Extract signalment - age, weight, breed
    const ageWeightMatch = text.match(/(\d+\s+years?\s+\d+\s+months?).*?(\d+\.?\d*\s*kg)/i);
    const breedMatch = text.match(/(?:canine|feline)\s*-\s*([^\n]+)/i);
    const sexMatch = text.match(/\((M[NC]|F[SN])\)/i);

    let signalment = [];
    if (ageWeightMatch) signalment.push(ageWeightMatch[1], ageWeightMatch[2]);
    if (sexMatch) signalment.push(sexMatch[1]);
    if (breedMatch) signalment.push(breedMatch[1].trim());
    if (signalment.length > 0) {
      data.signalment = signalment.join(' ');
    }

    // Extract presenting problem - look for "Presenting Problem" section
    const presentingMatch = text.match(/Presenting Problem[\s\S]*?General Description[\s\S]*?Recheck[\s\S]*?([^\n]+presented.*?)(?:\n\n|\d{2}-\d{2}-\d{4})/i);
    if (presentingMatch) {
      data.problem = presentingMatch[1].trim();
    } else {
      // Fallback to simpler patterns
      const problemMatch = text.match(/(?:presenting problem|chief complaint|reason for visit)\s*[:\-]?\s*([^\n]+)/i);
      if (problemMatch) {
        data.problem = problemMatch[1].trim();
      }
    }

    // Extract last visit info - look for "Last visit" pattern
    const lastVisitMatch = text.match(/Last visit\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*:\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
    if (lastVisitMatch) {
      data.lastRecheck = lastVisitMatch[1];
      data.lastPlan = lastVisitMatch[2].trim().replace(/\n/g, ' ');
    }

    // Extract MRI date and findings - look for date + "MRI" + description
    const mriMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s+MRI\s*:?\s*([^\n]+(?:\.|\;)[^\n]*)/i);
    if (mriMatch) {
      data.mriDate = mriMatch[1];
      data.mriFindings = mriMatch[2].trim();
    }

    // Extract current medications - look for "Current Medications" section
    const medsSection = text.match(/Current Medications\s*\n([\s\S]*?)(?:\n\n|Prior|Referred|Tags|Presenting)/i);
    if (medsSection) {
      const medLines = medsSection[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.includes('Referred') && !l.includes('Tags'))
        .filter(l => l.match(/[A-Z][a-z]+.*?\d+\s*mg|tab|cap|PO|SID|BID|TID/i));

      if (medLines.length > 0) {
        data.medications = medLines.join('\n');
      }
    }

    // Extract bloodwork - check if CBC/Chem mentioned in recent history
    const cbcChemMatch = text.match(/(\d{2}\/\d{2}\/\d{4})[^\n]*(?:CBC|Chem|Chemistry)[^\n]*([^\n]*)/i);
    if (cbcChemMatch) {
      const date = cbcChemMatch[1];
      // Check if it's within last 6 months (rough check)
      const dateParts = date.split('/');
      const month = parseInt(dateParts[0]);
      const currentMonth = new Date().getMonth() + 1;
      const monthsDiff = Math.abs(currentMonth - month);

      if (monthsDiff > 3) {
        data.bloodworkDue = `Last: ${date} - Due soon`;
      } else {
        data.bloodworkDue = `Last: ${date}`;
      }
    }

    // Extract concerns from exam or history
    const concernPatterns = [
      /owner\s+(?:has\s+)?concerns?\s+(?:that\s+)?([^\n]+(?:\n(?!\n)[^\n]+)*)/i,
      /(?:hunched|unsteady|weak|twitching|lethargy|difficulty)[^\n]*/gi
    ];

    let concerns = [];
    for (const pattern of concernPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          concerns.push(match[1].trim());
        } else if (match[0]) {
          concerns.push(match[0].trim());
        }
      }
    }

    if (concerns.length > 0) {
      data.otherConcerns = [...new Set(concerns)].join('; ').slice(0, 200);
    }

    return data;
  };

  const parseWithAI = async (text: string): Promise<Partial<AppointmentData>> => {
    try {
      // Try Gemini first (free with Firebase)
      const response = await fetch('/api/parse-appointment-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('AI parsing failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('AI parsing error:', error);
      alert('AI parsing failed. Using basic parser instead.');
      return parseAppointment(text);
    }
  };

  const addAppointment = async () => {
    if (!pasteInput.trim()) return;

    setAiLoading(true);
    let parsed: Partial<AppointmentData>;

    if (useAI) {
      parsed = await parseWithAI(pasteInput);
    } else {
      parsed = parseAppointment(pasteInput);
    }

    const newAppt: AppointmentData = {
      id: Date.now().toString(),
      name: parsed.name || 'Unknown',
      signalment: parsed.signalment || '',
      problem: parsed.problem || '',
      lastRecheck: parsed.lastRecheck || '',
      lastPlan: parsed.lastPlan || '',
      mriDate: parsed.mriDate || '',
      mriFindings: parsed.mriFindings || '',
      bloodworkDue: parsed.bloodworkDue || '',
      medications: parsed.medications || '',
      otherConcerns: parsed.otherConcerns || '',
    };

    setAppointments(prev => [...prev, newAppt]);
    setPasteInput('');
    setAiLoading(false);
  };

  const updateAppointmentField = (id: string, field: keyof AppointmentData, value: string) => {
    setAppointments(prev =>
      prev.map(appt => appt.id === id ? { ...appt, [field]: value } : appt)
    );
  };

  const removeAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const clearAll = () => {
    if (confirm('Clear all appointments?')) {
      setAppointments([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-fuchsia-50/50 to-white p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={24} className="text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Today's Appointments 📋</h1>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
          >
            ← Back to Patients
          </Link>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-purple-400">
          <h2 className="text-lg font-bold mb-2 text-gray-800">Add Appointment</h2>
          <p className="text-xs text-gray-600 mb-2">
            Paste patient history below. The system will automatically extract key information.
          </p>
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder="Paste patient history here..."
            rows={5}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none mb-2"
          />
          <div className="flex gap-2 items-center mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-xs font-semibold text-gray-700">
                🤖 Use AI Parsing (More Accurate)
              </span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addAppointment}
              disabled={aiLoading}
              className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-lg hover:from-purple-700 hover:to-fuchsia-700 flex items-center gap-2 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Plus size={16} />
              {aiLoading ? 'Processing...' : 'Add to List'}
            </button>
            {appointments.length > 0 && (
              <button
                onClick={clearAll}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Appointments Table */}
        {appointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="text-gray-500 text-base">No appointments added yet. Paste patient info above! 🐈</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Name & Signalment</th>
                    <th className="px-3 py-2 text-left font-bold">Problem</th>
                    <th className="px-3 py-2 text-left font-bold">Last Recheck & Plan</th>
                    <th className="px-3 py-2 text-left font-bold">MRI Info</th>
                    <th className="px-3 py-2 text-left font-bold">Bloodwork</th>
                    <th className="px-3 py-2 text-left font-bold">Medications</th>
                    <th className="px-3 py-2 text-left font-bold">Concerns</th>
                    <th className="px-3 py-2 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt, idx) => (
                    <tr
                      key={appt.id}
                      className={`border-b hover:bg-purple-50/50 transition ${idx % 2 === 0 ? 'bg-gray-50/70' : 'bg-white'}`}
                    >
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          value={appt.name}
                          onChange={(e) => updateAppointmentField(appt.id, 'name', e.target.value)}
                          className="font-bold text-gray-900 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none mb-1 text-sm"
                        />
                        <input
                          type="text"
                          value={appt.signalment}
                          onChange={(e) => updateAppointmentField(appt.id, 'signalment', e.target.value)}
                          placeholder="Signalment"
                          className="text-gray-600 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={appt.problem}
                          onChange={(e) => updateAppointmentField(appt.id, 'problem', e.target.value)}
                          placeholder="Problem"
                          rows={2}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          value={appt.lastRecheck}
                          onChange={(e) => updateAppointmentField(appt.id, 'lastRecheck', e.target.value)}
                          placeholder="Date"
                          className="font-semibold text-gray-700 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none mb-1"
                        />
                        <textarea
                          value={appt.lastPlan}
                          onChange={(e) => updateAppointmentField(appt.id, 'lastPlan', e.target.value)}
                          placeholder="Plan"
                          rows={2}
                          className="text-gray-600 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          value={appt.mriDate}
                          onChange={(e) => updateAppointmentField(appt.id, 'mriDate', e.target.value)}
                          placeholder="Date"
                          className="font-semibold text-gray-700 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none mb-1"
                        />
                        <textarea
                          value={appt.mriFindings}
                          onChange={(e) => updateAppointmentField(appt.id, 'mriFindings', e.target.value)}
                          placeholder="Findings"
                          rows={2}
                          className="text-gray-600 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          value={appt.bloodworkDue}
                          onChange={(e) => updateAppointmentField(appt.id, 'bloodworkDue', e.target.value)}
                          placeholder="Due date/status"
                          className="w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={appt.medications}
                          onChange={(e) => updateAppointmentField(appt.id, 'medications', e.target.value)}
                          placeholder="Medications"
                          rows={3}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none resize-y whitespace-pre-wrap"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={appt.otherConcerns}
                          onChange={(e) => updateAppointmentField(appt.id, 'otherConcerns', e.target.value)}
                          placeholder="Concerns"
                          rows={2}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-purple-400 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="px-3 py-2 text-center align-top">
                        <button
                          onClick={() => removeAppointment(appt.id)}
                          className="p-1.5 text-red-500 hover:bg-red-100/50 rounded-lg transition"
                          title="Remove"
                        >
                          <X size={16} />
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
