'use client';

import { useState, useEffect } from 'react';
import { BrainCircuit, ArrowLeft, Copy, Check, Sparkles, FileText, Activity } from 'lucide-react';
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
    className="mx-1 px-3 py-1.5 text-sm border-2 border-indigo-200 rounded-lg bg-white shadow-sm hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 font-medium text-gray-700"
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
    className="mx-1 px-3 py-1.5 text-sm border-2 border-indigo-200 rounded-lg bg-white shadow-sm hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 font-medium text-gray-700"
  />
);

// Component for Chiari/Syringomyelia Template
const ChiariSyringomyeliaTemplate = () => {
  const [formData, setFormData] = useState({
    cerebellarHerniation: 'cerebellar herniation',
    cisternaMagna: 'reduced',
    occipitalBone: 'Occipital dysplasia',
    atlasPosition: 'close to',
    odontoidPeg: 'increased angulation',
    syrinxStart: 'C2',
    syrinxEnd: 'C5',
    syrinxWidth: '3',
    syrinxHorn: 'extends to the dorsal horn',
  });
  
  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
There is ${formData.cerebellarHerniation} through the foramen magnum. The cisterna magna is ${formData.cisternaMagna}. ${formData.occipitalBone} is present.
The atlas is positioned ${formData.atlasPosition} the skull. The odontoid peg demonstrates ${formData.odontoidPeg}.
An intramedullary fluid-filled cavity consistent with syringomyelia extends from ${formData.syrinxStart} to ${formData.syrinxEnd}. The syrinx is strongly hyperintense on T2-weighted images, strongly hypointense on T1-weighted images, and isointense to CSF. The maximum transverse width measures ${formData.syrinxWidth} mm. The syrinx ${formData.syrinxHorn}.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-xl p-8 border-2 border-red-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-100 rounded-xl">
          <Activity className="text-red-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Chiari/Syringomyelia Report</h3>
      </div>
      
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-red-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            There is
            {renderSelect('cerebellarHerniation', formData.cerebellarHerniation, ['cerebellar herniation', 'no cerebellar herniation'], handleChange as any)}
            through the foramen magnum. The cisterna magna is
            {renderSelect('cisternaMagna', formData.cisternaMagna, ['reduced', 'absent', 'normal'], handleChange as any)}.
            {renderSelect('occipitalBone', formData.occipitalBone, ['Occipital dysplasia', 'Normal occipital bone'], handleChange as any)}
            is present.
          </p>
          <p>
            The atlas is positioned
            {renderSelect('atlasPosition', formData.atlasPosition, ['close to', 'normal distance from'], handleChange as any)}
            the skull. The odontoid peg demonstrates
            {renderSelect('odontoidPeg', formData.odontoidPeg, ['increased angulation', 'normal angulation'], handleChange as any)}.
          </p>
          <p>
            An intramedullary fluid-filled cavity consistent with syringomyelia extends from
            {renderInput('syrinxStart', formData.syrinxStart, 'e.g., C2', handleChange as any, 5)}
            to
            {renderInput('syrinxEnd', formData.syrinxEnd, 'e.g., C7', handleChange as any, 5)}.
            The syrinx is strongly hyperintense on T2-weighted images, strongly hypointense on T1-weighted images, and isointense to CSF. The maximum transverse width measures
            {renderInput('syrinxWidth', formData.syrinxWidth, 'e.g., 3', handleChange as any, 4)}
            mm. The syrinx
            {renderSelect('syrinxHorn', formData.syrinxHorn, ['extends to the dorsal horn', 'does not involve the dorsal horn', 'is centrally located'], handleChange as any)}.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-red-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={7}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
          }`}
        >
          {copied ? (
            <>
              <Check size={18} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={18} />
              Copy Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

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
  const [copied, setCopied] = useState(false);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-xl p-8 border-2 border-indigo-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <BrainCircuit className="text-indigo-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Meningioma Report</h3>
      </div>
      
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-indigo-100">
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
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-indigo-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-indigo-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={5}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
          }`}
        >
          {copied ? (
            <>
              <Check size={18} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={18} />
              Copy Report
            </>
          )}
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
  const [copied, setCopied] = useState(false);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl shadow-xl p-8 border-2 border-teal-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-100 rounded-xl">
          <Sparkles className="text-teal-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">IVDD Report</h3>
      </div>
      
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-teal-100">
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
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-teal-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-teal-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={5}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600'
          }`}
        >
          {copied ? (
            <>
              <Check size={18} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={18} />
              Copy Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default function MRIReportBuilderPage() {
  const [selectedDisease, setSelectedDisease] = useState<string>('meningioma');

  const diseases = [
    { id: 'meningioma', name: 'Meningioma', icon: BrainCircuit, color: 'indigo', gradient: 'from-indigo-500 to-purple-500' },
    { id: 'ivdd', name: 'IVDD', icon: Sparkles, color: 'teal', gradient: 'from-teal-500 to-cyan-500' },
    { id: 'chiari', name: 'Chiari/Syringomyelia', icon: Activity, color: 'red', gradient: 'from-red-500 to-pink-500' },
  ];

  const renderTemplate = () => {
    switch (selectedDisease) {
      case 'meningioma':
        return <MeningiomaTemplate />;
      case 'ivdd':
        return <IVDDTemplate />;
      case 'chiari':
        return <ChiariSyringomyeliaTemplate />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <BrainCircuit size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MRI Report Builder</h1>
              <p className="text-sm text-gray-600 mt-1">Generate professional veterinary MRI reports</p>
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
        
        {/* Disease Selection Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Select Disease Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {diseases.map((disease) => {
              const Icon = disease.icon;
              const isSelected = selectedDisease === disease.id;
              return (
                <button
                  key={disease.id}
                  onClick={() => setSelectedDisease(disease.id)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                    isSelected
                      ? `bg-gradient-to-br ${disease.gradient} text-white border-transparent shadow-lg scale-105`
                      : 'bg-white text-gray-700 border-gray-200 shadow-md hover:border-gray-300'
                  }`}
                >
                  <div className={`inline-flex p-3 rounded-xl mb-3 ${
                    isSelected ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    <Icon size={28} className={isSelected ? 'text-white' : `text-${disease.color}-600`} />
                  </div>
                  <h3 className="text-lg font-bold">{disease.name}</h3>
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Area */}
        <div className="animate-fadeIn">
          {renderTemplate()}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}