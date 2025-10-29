
'use client';

import { useState } from 'react';
import { BrainCircuit, Plus, X } from 'lucide-react';
import Link from 'next/link';

interface MRIReportData {
  id: string;
  name: string;
  signalment: string;
  clinicalHistory: string;
  mriFindings: string;
  conclusions: string;
}

export default function MRIReportBuilderPage() {
  const [reports, setReports] = useState<MRIReportData[]>([]);
  const [pasteInput, setPasteInput] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const parseReport = (text: string): Partial<MRIReportData> => {
    // Basic parsing logic, you can customize this
    const data: Partial<MRIReportData> = {};
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    // Simple extraction based on keywords
    data.name = lines[0] || 'Unknown';
    data.signalment = lines.find(l => l.toLowerCase().includes('signalment:'))?.split(':')[1]?.trim() || '';
    data.clinicalHistory = lines.find(l => l.toLowerCase().includes('history:'))?.split(':')[1]?.trim() || '';
    data.mriFindings = lines.find(l => l.toLowerCase().includes('findings:'))?.split(':')[1]?.trim() || '';
    data.conclusions = lines.find(l => l.toLowerCase().includes('conclusion:'))?.split(':')[1]?.trim() || '';

    return data;
  };

  const parseWithAI = async (text: string): Promise<Partial<MRIReportData>> => {
    try {
      const response = await fetch('/api/parse-mri-report-gemini', {
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
      return parseReport(text);
    }
  };

  const addReport = async () => {
    if (!pasteInput.trim()) return;

    setAiLoading(true);
    let parsed: Partial<MRIReportData>;

    if (useAI) {
      parsed = await parseWithAI(pasteInput);
    } else {
      parsed = parseReport(pasteInput);
    }

    const newReport: MRIReportData = {
      id: Date.now().toString(),
      name: parsed.name || 'Unknown',
      signalment: parsed.signalment || '',
      clinicalHistory: parsed.clinicalHistory || '',
      mriFindings: parsed.mriFindings || '',
      conclusions: parsed.conclusions || '',
    };

    setReports(prev => [...prev, newReport]);
    setPasteInput('');
    setAiLoading(false);
  };

  const updateReportField = (id: string, field: keyof MRIReportData, value: string) => {
    setReports(prev =>
      prev.map(report => report.id === id ? { ...report, [field]: value } : report)
    );
  };

  const removeReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const clearAll = () => {
    if (confirm('Clear all reports?')) {
      setReports([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-white p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit size={24} className="text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">MRI Report Builder</h1>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-indigo-400">
          <h2 className="text-lg font-bold mb-2 text-gray-800">Add MRI Report</h2>
          <p className="text-xs text-gray-600 mb-2">
            Paste the clinical history and findings below. The system will structure the report.
          </p>
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder="Paste clinical history and MRI findings here..."
            rows={5}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
          />
          <div className="flex gap-2 items-center mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-gray-700">
                🤖 Use AI Parsing (More Accurate)
              </span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addReport}
              disabled={aiLoading}
              className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 flex items-center gap-2 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Plus size={16} />
              {aiLoading ? 'Processing...' : 'Add to Reports'}
            </button>
            {reports.length > 0 && (
              <button
                onClick={clearAll}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Reports Table */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="text-gray-500 text-base">No reports added yet. Paste patient info above! 🧠</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Patient Details</th>
                    <th className="px-3 py-2 text-left font-bold">Clinical History</th>
                    <th className="px-3 py-2 text-left font-bold">MRI Findings</th>
                    <th className="px-3 py-2 text-left font-bold">Conclusions</th>
                    <th className="px-3 py-2 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, idx) => (
                    <tr
                      key={report.id}
                      className={`border-b hover:bg-indigo-50/50 transition ${idx % 2 === 0 ? 'bg-gray-50/70' : 'bg-white'}`}
                    >
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          value={report.name}
                          onChange={(e) => updateReportField(report.id, 'name', e.target.value)}
                          className="font-bold text-gray-900 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none mb-1 text-sm"
                        />
                        <textarea
                          value={report.signalment}
                          onChange={(e) => updateReportField(report.id, 'signalment', e.target.value)}
                          placeholder="Signalment"
                          rows={2}
                          className="text-gray-600 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={report.clinicalHistory}
                          onChange={(e) => updateReportField(report.id, 'clinicalHistory', e.target.value)}
                          placeholder="Clinical History"
                          rows={3}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={report.mriFindings}
                          onChange={(e) => updateReportField(report.id, 'mriFindings', e.target.value)}
                          placeholder="MRI Findings"
                          rows={5}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={report.conclusions}
                          onChange={(e) => updateReportField(report.id, 'conclusions', e.target.value)}
                          placeholder="Conclusions"
                          rows={3}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="px-3 py-2 text-center align-top">
                        <button
                          onClick={() => removeReport(report.id)}
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
