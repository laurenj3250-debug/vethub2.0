'use client';

import { useState } from 'react';
import { ArrowLeft, Sparkles, FileText, Printer, Save } from 'lucide-react';
import Link from 'next/link';
import { UnifiedPatientForm } from '@/components/patient-hub/UnifiedPatientForm';
import { OutputPreviewPanel } from '@/components/patient-hub/OutputPreviewPanel';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PatientHubPage() {
  const { toast } = useToast();
  const [patientData, setPatientData] = useState<any>({});
  const [generatedOutputs, setGeneratedOutputs] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDataChange = (data: any) => {
    setPatientData(data);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Generate all outputs from patient data
      const outputs = {
        roundingSheet: generateRoundingSheet(patientData),
        soapNote: generateSOAPNote(patientData),
        treatmentSheet: generateTreatmentSheet(patientData),
        stickers: generateStickers(patientData),
        mriSheet: patientData.type === 'MRI' ? generateMRISheet(patientData) : null,
      };

      setGeneratedOutputs(outputs);

      toast({
        title: '✅ Generated All Outputs',
        description: 'Review the previews and save when ready',
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save patient with all generated data to database
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demographics: patientData.demographics,
          status: 'Active',
          type: patientData.type || 'Medical',
          roundingData: generatedOutputs.roundingSheet,
          // SOAP notes will be created separately via API
          // Tasks will be auto-created based on type
        }),
      });

      if (!response.ok) throw new Error('Failed to save patient');

      const savedPatient = await response.json();

      toast({
        title: '✅ Patient Saved',
        description: `${patientData.demographics?.name} saved successfully`,
      });

      // Redirect to patient page
      window.location.href = `/?patient=${savedPatient.id}`;
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintAll = () => {
    window.print();
    toast({
      title: '📄 Print Dialog Opened',
      description: 'All outputs ready to print',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-purple-400 transition rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-purple-500/30"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </Link>
          </div>

          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles size={24} />
            Unified Patient Hub
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !patientData.demographics?.name}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={18} />
              {isGenerating ? 'Generating...' : 'Generate All'}
            </button>

            <button
              onClick={handlePrintAll}
              disabled={!generatedOutputs.roundingSheet}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={18} />
              Print All
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !generatedOutputs.roundingSheet}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg transition border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <main className="max-w-[98%] mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Smart Input Form */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-400" />
              Smart Input
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Enter patient data once - AI will generate everything you need
            </p>

            <ErrorBoundary fallback={<FormErrorFallback />}>
              <UnifiedPatientForm
                data={patientData}
                onChange={handleDataChange}
              />
            </ErrorBoundary>
          </div>

          {/* Right: Live Preview */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={20} className="text-blue-400" />
              Live Preview
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              See what will be generated in real-time
            </p>

            <ErrorBoundary fallback={<PreviewErrorFallback />}>
              <OutputPreviewPanel
                patientData={patientData}
                outputs={generatedOutputs}
              />
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

// Output Generators
function generateRoundingSheet(data: any) {
  const demographics = data.demographics || {};
  const clinical = data.clinical || {};

  return {
    signalment: `${demographics.age} ${demographics.sex} ${demographics.breed}`,
    location: data.location || 'ICU',
    icuCriteria: data.icuCriteria || 'Yes',
    code: data.codeStatus || 'Green',
    problems: clinical.problems || '',
    diagnosticFindings: clinical.diagnosticFindings || '',
    therapeutics: clinical.medications || '',
    fluids: clinical.fluids || '',
    concerns: '',
    dayCount: 1,
    lastUpdated: new Date().toISOString(),
  };
}

function generateSOAPNote(data: any) {
  const clinical = data.clinical || {};

  return {
    visitType: 'initial',
    subjective: {
      currentHistory: clinical.history || '',
      medications: clinical.medications || '',
    },
    physicalExam: {},
    neuroExam: {},
    assessment: {
      neurolocalization: clinical.neurolocalization || '',
      ddx: clinical.ddx || '',
    },
    plan: {
      diagnostics: clinical.diagnostics || '',
      treatments: clinical.treatments || '',
    },
  };
}

function generateTreatmentSheet(data: any) {
  const clinical = data.clinical || {};
  const demographics = data.demographics || {};

  return {
    patientName: demographics.name,
    medications: clinical.medications || '',
    fluids: clinical.fluids || '',
    treatments: clinical.treatments || '',
  };
}

function generateStickers(data: any) {
  const demographics = data.demographics || {};

  return [
    { type: 'patient', text: `${demographics.name}\n${demographics.breed}` },
    { type: 'cage', text: `${demographics.name}\nCage: ${data.location || 'ICU'}` },
    { type: 'medical', text: `${demographics.name}\n${data.type || 'Medical'}` },
  ];
}

function generateMRISheet(data: any) {
  const demographics = data.demographics || {};
  const clinical = data.clinical || {};

  return {
    patientName: demographics.name,
    weight: demographics.weight,
    anesthesia: {
      premed: '',
      induction: '',
      maintenance: '',
    },
    scanType: clinical.mriScanType || 'Brain + C-spine',
    sedationStart: '',
    sedationEnd: '',
  };
}

// Error Fallback Components
function FormErrorFallback() {
  return (
    <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
      <h3 className="text-red-400 font-bold mb-2">Form Error</h3>
      <p className="text-slate-300 mb-4">
        Unable to load patient form. Please refresh the page or try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
      >
        Refresh Page
      </button>
    </div>
  );
}

function PreviewErrorFallback() {
  return (
    <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
      <h3 className="text-red-400 font-bold mb-2">Preview Error</h3>
      <p className="text-slate-300 mb-4">
        Unable to generate preview. Try filling out the form and generating outputs again.
      </p>
    </div>
  );
}
