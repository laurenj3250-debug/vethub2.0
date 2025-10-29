'use client';

import { useState, useMemo } from 'react';
import { BrainCircuit, ArrowLeft, Copy } from 'lucide-react';
import Link from 'next/link';

// Component for Meningioma Template
const MeningiomaTemplate = () => {
  const [formData, setFormData] = useState({
    axiality: 'extra-axial',
    enhancement: 'contrast-enhancing',
    attachment: 'broad-based',
    location: 'dura',
    t1: 'isointense',
    t2: 'hyperintense',
    contrast: 'marked and homogeneous',
    duralTail: 'A dural tail sign is present',
    massEffect: 'moderate',
    massEffectDescription: 'ventricular compression',
    calvarial: 'No calvarial changes are identified',
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatedReport = useMemo(() => {
    return `There is an ${formData.axiality} ${formData.enhancement} mass ${formData.attachment} to the ${formData.location}. The mass is ${formData.t1} on T1-weighted images and ${formData.t2} on T2-weighted images. Contrast enhancement is ${formData.contrast}. ${formData.duralTail}. The mass causes ${formData.massEffect} mass effect with ${formData.massEffectDescription}. ${formData.calvarial}.`;
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(generatedReport);
    alert('Report copied to clipboard!');
  };

  const renderSelect = (name: keyof typeof formData, options: string[]) => (
    <select name={name} value={formData[name]} onChange={handleChange} className="mx-1 px-2 py-1 text-sm border-indigo-300 rounded-md bg-indigo-50 shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );

  const renderInput = (name: keyof typeof formData, placeholder: string, size: number = 30) => (
      <input type="text" name={name} value={formData[name]} onChange={handleChange} placeholder={placeholder} size={size} className="mx-1 px-2 py-1 text-sm border-indigo-300 rounded-md bg-indigo-50 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Meningioma Report Template</h3>
      <div className="text-base leading-relaxed text-gray-700 space-y-4">
        <p>
          There is an
          {renderSelect('axiality', ['extra-axial', 'intradural-extramedullary'])}
          {renderSelect('enhancement', ['contrast-enhancing', 'non-enhancing'])}
          mass
          {renderSelect('attachment', ['broad-based', 'attached'])}
          to the
          {renderInput('location', 'e.g., dura/meninges', 15)}.
        </p>
        <p>
          The mass is
          {renderSelect('t1', ['isointense', 'hypointense'])}
          on T1-weighted images and
          {renderSelect('t2', ['hyperintense', 'isointense', 'heterogeneously hyperintense'])}
          on T2-weighted images.
        </p>
        <p>
          Contrast enhancement is
          {renderSelect('contrast', ['marked and homogeneous', 'marked and heterogeneous', 'mild'])}.
          {renderSelect('duralTail', ['A dural tail sign is present', 'No dural tail is identified'])}.
        </p>
        <p>
          The mass causes
          {renderSelect('massEffect', ['severe', 'moderate', 'mild', 'no'])}
          mass effect with
          {renderInput('massEffectDescription', 'describe specific effects', 40)}.
        </p>
        <p>
          {renderSelect('calvarial', ['Calvarial hyperostosis is present', 'No calvarial changes are identified'])}.
        </p>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">Generated Report:</h4>
        <textarea
          readOnly
          value={generatedReport}
          rows={5}
          className="w-full text-sm font-mono bg-white p-2 border rounded"
        />
        <button
          onClick={copyReport}
          className="mt-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition shadow-md"
        >
          <Copy size={16} />
          Copy Report
        </button>
      </div>
    </div>
  );
};


export default function MRIReportBuilderPage() {
  const [selectedDisease, setSelectedDisease] = useState<string>('meningioma');

  const renderTemplate = () => {
    switch (selectedDisease) {
      case 'meningioma':
        return <MeningiomaTemplate />;
      default:
        return (
            <div className="bg-white rounded-lg shadow p-10 text-center border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-base">Select a disease template above to get started. 🧠</p>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-white p-4">
      <div className="max-w-4xl mx-auto">
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
        
        {/* Disease Selection */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-indigo-400">
          <label htmlFor="disease-select" className="block text-lg font-bold mb-2 text-gray-800">
            Select Disease Template
          </label>
          <select
            id="disease-select"
            value={selectedDisease}
            onChange={(e) => setSelectedDisease(e.target.value)}
            className="w-full max-w-sm px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="meningioma">Meningioma</option>
            {/* Add other diseases here in the future */}
          </select>
        </div>

        {/* Template Area */}
        {renderTemplate()}
      </div>
    </div>
  );
}
