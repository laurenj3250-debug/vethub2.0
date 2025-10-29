'use client';

import { useState, useMemo, useEffect } from 'react';
import { BrainCircuit, ArrowLeft, Copy } from 'lucide-react';
import Link from 'next/link';

const renderSelect = (
  name: string,
  value: string,
  options: string[],
  handleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
) => (
  <select
    name={name}
    value={value}
    onChange={handleChange}
    className="mx-1 px-2 py-1 text-sm border-indigo-300 rounded-md bg-indigo-50 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
  >
    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
  </select>
);

const renderInput = (
  name: string,
  value: string,
  placeholder: string,
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  size: number = 20
) => (
    <input
      type="text"
      name={name}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      size={size}
      className="mx-1 px-2 py-1 text-sm border-indigo-300 rounded-md bg-indigo-50 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
    />
);


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
  
  const [reportText, setReportText] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `There is an ${formData.axiality} ${formData.enhancement} mass ${formData.attachment} to the ${formData.location}. The mass is ${formData.t1} on T1-weighted images and ${formData.t2} on T2-weighted images. Contrast enhancement is ${formData.contrast}. ${formData.duralTail}. The mass causes ${formData.massEffect} mass effect with ${formData.massEffectDescription}. ${formData.calvarial}.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    alert('Report copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Meningioma Report Template</h3>
      <div className="text-base leading-relaxed text-gray-700 space-y-4">
        <p>
          There is an
          {renderSelect('axiality', formData.axiality, ['extra-axial', 'intradural-extramedullary'], handleChange as any)}
          {renderSelect('enhancement', formData.enhancement, ['contrast-enhancing', 'non-enhancing'], handleChange as any)}
          mass
          {renderSelect('attachment', formData.attachment, ['broad-based', 'attached'], handleChange as any)}
          to the
          {renderInput('location', formData.location, 'e.g., dura/meninges', handleChange as any)}.
        </p>
        <p>
          The mass is
          {renderSelect('t1', formData.t1, ['isointense', 'hypointense'], handleChange as any)}
          on T1-weighted images and
          {renderSelect('t2', formData.t2, ['hyperintense', 'isointense', 'heterogeneously hyperintense'], handleChange as any)}
          on T2-weighted images.
        </p>
        <p>
          Contrast enhancement is
          {renderSelect('contrast', formData.contrast, ['marked and homogeneous', 'marked and heterogeneous', 'mild'], handleChange as any)}.
          {renderSelect('duralTail', formData.duralTail, ['A dural tail sign is present', 'No dural tail is identified'], handleChange as any)}.
        </p>
        <p>
          The mass causes
          {renderSelect('massEffect', formData.massEffect, ['severe', 'moderate', 'mild', 'no'], handleChange as any)}
          mass effect with
          {renderInput('massEffectDescription', formData.massEffectDescription, 'describe specific effects', handleChange as any, 40)}.
        </p>
        <p>
          {renderSelect('calvarial', formData.calvarial, ['Calvarial hyperostosis is present', 'No calvarial changes are identified'], handleChange as any)}.
        </p>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">Generated Report (Editable):</h4>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={5}
          className="w-full text-sm font-mono bg-white p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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


// Component for IVDD Template
const IVDDTemplate = () => {
  const [formData, setFormData] = useState({
    location: 'L4-L5',
    chronicity: 'acute',
    discType: 'extrusion',
    compression: 'severe',
    lateralization: 'left',
    cordSignal: 'T2 hyperintensity',
    consistency: 'edema',
  });

  const [reportText, setReportText] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `At the level of ${formData.location}, there is an ${formData.chronicity} extradural disc ${formData.discType} causing ${formData.compression} spinal cord compression with ${formData.lateralization} lateralization. The extruded disc material is hypointense on T2-weighted images. The spinal cord at this level demonstrates ${formData.cordSignal}, consistent with ${formData.consistency}.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    alert('Report copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-teal-500">
      <h3 className="text-xl font-bold text-gray-800 mb-4">IVDD Report Template</h3>
      <div className="text-base leading-relaxed text-gray-700 space-y-4">
        <p>
          At the level of
          {renderInput('location', formData.location, 'e.g., T13-L1', handleChange as any, 10)},
          there is an
          {renderSelect('chronicity', formData.chronicity, ['acute', 'chronic'], handleChange as any)}
          extradural disc
          {renderSelect('discType', formData.discType, ['extrusion', 'protrusion'], handleChange as any)}
          causing
          {renderSelect('compression', formData.compression, ['severe', 'moderate', 'mild'], handleChange as any)}
          spinal cord compression with
          {renderSelect('lateralization', formData.lateralization, ['left', 'right', 'no'], handleChange as any)}
          lateralization.
        </p>
        <p>
          The extruded disc material is hypointense on T2-weighted images.
        </p>
        <p>
          The spinal cord at this level demonstrates
          {renderSelect('cordSignal', formData.cordSignal, ['T2 hyperintensity', 'normal signal', 'T2 hypointensity'], handleChange as any)},
          consistent with
          {renderSelect('consistency', formData.consistency, ['edema', 'hemorrhage', 'normal cord'], handleChange as any)}.
        </p>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">Generated Report (Editable):</h4>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={5}
          className="w-full text-sm font-mono bg-white p-2 border rounded focus:ring-2 focus:ring-teal-500 focus:outline-none"
        />
        <button
          onClick={copyReport}
          className="mt-2 px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 transition shadow-md"
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
      case 'ivdd':
        return <IVDDTemplate />;
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
            <option value="ivdd">IVDD</option>
            {/* Add other diseases here in the future */}
          </select>
        </div>

        {/* Template Area */}
        {renderTemplate()}
      </div>
    </div>
  );
}
