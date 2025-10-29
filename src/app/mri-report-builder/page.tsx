'use client';

import { useState } from 'react';
import { BrainCircuit, Plus, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { parseRounding } from '@/ai/flows/parse-rounding-flow';
import type { RoundingParseOutput } from '@/ai/flows/parse-rounding-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [useAI, setUseAI] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A basic, non-AI parser as a fallback
  const parseReportSimple = (text: string): Partial<MRIReportData> => {
    const data: Partial<MRIReportData> = {};
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const nameLine = lines.find(l => l.toLowerCase().includes('patient:')) || lines[0] || 'Unknown';
    data.name = nameLine.split(':').pop()?.trim() || nameLine;

    const historyMatch = text.match(/HISTORY:([\s\S]*?)(?:FINDINGS:|CONCLUSION:)/i);
    data.clinicalHistory = historyMatch ? historyMatch[1].trim() : '';
    
    const findingsMatch = text.match(/FINDINGS:([\s\S]*?)(?:CONCLUSION:)/i);
    data.mriFindings = findingsMatch ? findingsMatch[1].trim() : '';
    
    const conclusionMatch = text.match(/CONCLUSION:([\s\S]*)/i);
    data.conclusions = conclusionMatch ? conclusionMatch[1].trim() : '';

    return data;
  };

  const parseWithAI = async (text: string): Promise<Partial<MRIReportData>> => {
    setAiLoading(true);
    setError(null);
    try {
      // We can reuse the rounding parser as it's good at extracting clinical data
      const response: RoundingParseOutput = await parseRounding(text);
      
      // Map the output to our MRIReportData structure
      const mriData: Partial<MRIReportData> = {
        name: response.patientInfo?.patientId || 'Unknown AI Parse',
        signalment: response.roundingData?.signalment || '',
        clinicalHistory: response.roundingData?.subjectiveAssessment || '',
        mriFindings: response.roundingData?.diagnosticFindings || '',
        conclusions: response.roundingData?.plan || '',
      };
      return mriData;

    } catch (err) {
      console.error('AI parsing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`AI parsing failed: ${errorMessage}. Falling back to basic parser.`);
      return parseReportSimple(text); // Fallback to simple parser
    } finally {
      setAiLoading(false);
    }
  };

  const addReport = async () => {
    if (!pasteInput.trim()) return;

    let parsedData: Partial<MRIReportData>;
    if (useAI) {
      parsedData = await parseWithAI(pasteInput);
    } else {
      parsedData = parseReportSimple(pasteInput);
    }

    const newReport: MRIReportData = {
      id: Date.now().toString(),
      name: parsedData.name || 'Unknown',
      signalment: parsedData.signalment || '',
      clinicalHistory: parsedData.clinicalHistory || '',
      mriFindings: parsedData.mriFindings || '',
      conclusions: parsedData.conclusions || '',
    };

    setReports(prev => [...prev, newReport]);
    setPasteInput(''); // Clear input after adding
  };

  const updateReportField = (id: string, field: keyof MRIReportData, value: string) => {
    setReports(prev =>
      prev.map(report => (report.id === id ? { ...report, [field]: value } : report))
    );
  };

  const removeReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };
  
  const clearAll = () => {
    if (confirm('Are you sure you want to clear all reports from this page?')) {
      setReports([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit size={28} className="text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">MRI Report Builder</h1>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            Back to Hub
          </Link>
        </div>
        
        {error && (
            <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-indigo-400">
          <h2 className="text-lg font-bold mb-2 text-gray-800">Add MRI Report</h2>
          <p className="text-xs text-gray-600 mb-2">
            Paste the raw MRI report text below. The system will structure it automatically.
          </p>
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder="Paste raw MRI report text here..."
            rows={6}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
          />
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
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
                {aiLoading ? '🤖 Processing...' : 'Add to Reports'}
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
        </div>

        {/* Reports Table */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-base">No reports added yet. Paste a report above to get started! 🧠</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Patient Details</th>
                    <th className="px-3 py-2 text-left font-bold w-1/4">Clinical History</th>
                    <th className="px-3 py-2 text-left font-bold w-1/3">MRI Findings</th>
                    <th className="px-3 py-2 text-left font-bold w-1/4">Conclusions</th>
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
                          className="text-gray-600 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none resize-y text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={report.clinicalHistory}
                          onChange={(e) => updateReportField(report.id, 'clinicalHistory', e.target.value)}
                          placeholder="Clinical History"
                          rows={5}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none resize-y text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={report.mriFindings}
                          onChange={(e) => updateReportField(report.id, 'mriFindings', e.target.value)}
                          placeholder="MRI Findings"
                          rows={5}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none resize-y text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={report.conclusions}
                          onChange={(e) => updateReportField(report.id, 'conclusions', e.target.value)}
                          placeholder="Conclusions"
                          rows={5}
                          className="text-gray-800 w-full px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-400 focus:outline-none resize-y text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-center align-top">
                        <button
                          onClick={() => removeReport(report.id)}
                          className="p-1.5 text-red-500 hover:bg-red-100/50 rounded-full transition"
                          title="Remove Report"
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
