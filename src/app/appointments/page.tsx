'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDocumentNonBlocking, useAuth, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { AlertCircle, Calendar, CheckCircle, Sparkles, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { parseAppointment } from '@/ai/flows/parse-appointment-flow';
import type { AIHealthStatus } from '@/ai/genkit';
import { checkAIHealth } from '@/ai/genkit';
import { parseSignalment } from '@/lib/parseSignalment';
import { useToast } from '@/hooks/use-toast';

export default function AppointmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [inputText, setInputText] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedList, setParsedList] = useState<any[]>([]);
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null);

  // Check AI Health on component mount
  useEffect(() => {
    async function getAIHealth() {
      const status = await checkAIHealth();
      setAiHealth(status);
    }
    getAIHealth();
  }, []);

  const handleAddToList = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);

    try {
      let data;
      if (useAI && aiHealth?.status === 'OK') {
        // Use Genkit AI flow
        data = await parseAppointment(inputText);
      } else {
        // Fallback to local regex parser
        const { data: parsedData } = parseSignalment(inputText);
        data = {
          name: parsedData.patientName,
          signalment: parsedData.signalment,
          problem: parsedData.problem,
          lastRecheck: parsedData.lastRecheck,
          lastPlan: parsedData.lastPlan,
          mriDate: parsedData.mriDate,
          mriFindings: parsedData.mriFindings,
          medications: (parsedData.medications || []).join('\n'),
          otherConcerns: parsedData.otherConcerns,
        };
      }
      setParsedList(prev => [...prev, data]);
      setInputText('');
    } catch (error: any) {
      console.error('Parsing error:', error);
      toast({
        variant: 'destructive',
        title: 'Parsing Failed',
        description: error.message || 'Could not parse appointment details.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePatient = (parsedData: any) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Not signed in or database not available.',
      });
      return;
    }
    
    // Create the full patient object
    const patientData: any = {
      name: parsedData.name || 'Unnamed Patient',
      type: 'Admit', // Default type for new appointments
      status: 'New Admit',
      tasks: [],
      customTask: '',
      bwInput: '',
      xrayStatus: 'NSF',
      xrayOther: '',
      detailsInput: '',
      patientInfo: {
        patientId: '',
        clientId: '',
        ownerName: '',
        ownerPhone: '',
        species: '',
        breed: '',
        color: '',
        sex: '',
        weight: '',
        dob: '',
        age: '',
      },
      roundingData: {
        signalment: parsedData.signalment || '',
        location: '',
        icuCriteria: '',
        codeStatus: 'Yellow',
        problems: parsedData.problem || '',
        diagnosticFindings: parsedData.mriDate ? `MRI ${parsedData.mriDate}: ${parsedData.mriFindings}` : '',
        therapeutics: parsedData.medications || '',
        plan: parsedData.lastPlan || '',
        additionalComments: parsedData.otherConcerns || '',
      },
      addedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/patients`), patientData)
      .then(() => {
        toast({
          title: 'Patient Created!',
          description: `${patientData.name} has been added to the rounding sheet.`,
        });
        // Remove from the list after successful creation
        setParsedList(prev => prev.filter(p => p !== parsedData));
        router.push('/');
      })
      .catch((error) => {
        console.error('Error creating patient:', error);
        toast({
          variant: 'destructive',
          title: 'Database Error',
          description: 'Could not create patient in Firestore.',
        });
      });
  };

  const AIStatusIndicator = () => {
    if (!aiHealth) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="h-3 w-3 animate-spin" />
          Checking AI status...
        </div>
      );
    }
    if (aiHealth.status === 'OK') {
      return (
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <CheckCircle className="h-4 w-4" />
          AI System Operational
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-xs text-orange-600 font-semibold">
        <AlertCircle className="h-4 w-4" />
        AI not configured. Falling back to basic parsing.
        <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline hover:text-orange-800">Get API Key</a>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl shadow-lg">
              <Calendar size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add from Appointments</h1>
              <p className="text-sm text-gray-600 mt-1">Paste appointment summaries to create new patient entries.</p>
            </div>
          </div>
          <Link
            href="/"
            className="px-5 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium flex items-center gap-2 shadow-md hover:shadow-lg border-2 border-gray-200"
          >
            <ArrowLeft size={18} />
            Back to Hub
          </Link>
        </div>

        {/* Input Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200">
          <label htmlFor="appointment-text" className="block text-sm font-semibold text-gray-700 mb-2">
            Paste Patient Appointment Summary
          </label>
          <textarea
            id="appointment-text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            className="w-full text-sm font-mono p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all duration-200"
            placeholder="Paste the patient's appointment details here..."
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  disabled={aiHealth?.status !== 'OK'}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Use AI Parsing
                </span>
              </label>
              <AIStatusIndicator />
            </div>
            <button
              onClick={handleAddToList}
              disabled={isLoading || !inputText.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Sparkles className="animate-spin h-5 w-5" />
                  Parsing...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Add to List
                </>
              )}
            </button>
          </div>
        </div>

        {/* Parsed List */}
        {parsedList.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Parsed Appointments</h2>
            <div className="space-y-4">
              {parsedList.map((item, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md p-4 border border-gray-200 animate-fade-in">
                  <h3 className="font-bold text-lg text-purple-800">{item.name || 'Unknown Patient'}</h3>
                  <p className="text-sm text-gray-600 mb-2">{item.signalment}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <p><strong className="font-semibold text-gray-700">Problem:</strong> {item.problem}</p>
                    <p><strong className="font-semibold text-gray-700">Last Recheck:</strong> {item.lastRecheck}</p>
                    <p><strong className="font-semibold text-gray-700">Medications:</strong></p>
                    <p className="whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded col-span-full">{item.medications || 'None listed'}</p>
                  </div>
                  <button
                    onClick={() => handleCreatePatient(item)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition"
                  >
                    Create Patient on Rounding Sheet
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
