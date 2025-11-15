'use client';

import { useState, useEffect } from 'react';
import {
  BrainCircuit, ArrowLeft, Copy, Check, Sparkles, FileText, Activity,
  Zap, Droplets, Heart, Eye, Shield, AlertCircle, Brain, Flame,
  Wind, Layers, Bone, Bandage, Navigation, Droplet, Box
} from 'lucide-react';
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

// Component for Ischemic/Hemorrhagic Infarct Template
const StrokeTemplate = () => {
  const [formData, setFormData] = useState({
    patient: 'the patient',
    signalment: 'dog',
    onsetHours: '6',
    clinical: 'peracute deficits consistent with focal cerebrovascular disease',

    strokeType: 'Ischemic infarct',
    stage: 'Acute (6–48 h)',
    location: 'MCA territory (cerebrum)',
    side: 'Left',
    size: 'Moderate (1.5–3 cm)',

    dwi: 'Marked hyperintense',
    adc: 'Low signal (restricted diffusion)',
    flair: 'Hyperintense',
    t2star: 'No susceptibility',
    ce: 'None',
    mass: 'Mild sulcal effacement',

    hemePattern: 'None observed',
    vessel: 'Not seen',
    perfusion: 'Not performed',

    ddx: '',
    impressionPreset: 'Acute non-hemorrhagic ischemic infarct',
    confidence: 'High',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // handy helpers
  const sentenceCase = (s: string) => (s ? s.trim().replace(/^./, c => c.toUpperCase()) : s);

  useEffect(() => {
    const loc = `${formData.side.toLowerCase()} ${formData.location.toLowerCase()}`;

    const technique = `MRI brain including T2, FLAIR, DWI with ADC map, and T2* susceptibility; post-contrast T1 ${formData.ce === 'Not given' ? 'not performed' : 'performed'}.`;

    let history = `Signalment: ${formData.signalment}. Clinical signs: ${sentenceCase(formData.clinical)}. Onset to imaging: ~${formData.onsetHours} hour(s).`;

    // Findings logic
    const sizeText = formData.size;
    const findingsParts: string[] = [];

    // Diffusion
    if (formData.dwi.includes('hyperintense')) {
      if (formData.adc.includes('Low')) {
        findingsParts.push(
          `Within the ${loc}, there is ${formData.dwi.toLowerCase()} signal on DWI with ${formData.adc.toLowerCase()}, consistent with true restricted diffusion.`
        );
      } else {
        findingsParts.push(
          `Within the ${loc}, there is ${formData.dwi.toLowerCase()} signal on DWI with ${formData.adc.toLowerCase()}, suggesting possible T2 shine-through rather than true restriction.`
        );
      }
    } else {
      findingsParts.push(`No diffusion restriction is identified within the ${loc}.`);
    }

    // FLAIR/T2
    findingsParts.push(`Corresponding FLAIR/T2 signal is ${formData.flair.toLowerCase()}.`);

    // T2*
    if (formData.t2star === 'No susceptibility') {
      findingsParts.push(`No abnormal susceptibility is detected on T2*.`);
    } else if (formData.t2star === 'Sequence not acquired') {
      findingsParts.push(`T2* sequence was not acquired.`);
    } else {
      findingsParts.push(`${formData.t2star} is present on T2*.`);
    }

    // Contrast
    if (formData.ce !== 'Not given') {
      findingsParts.push(`Post-contrast imaging shows ${formData.ce.toLowerCase()}.`);
    }

    // Mass effect
    findingsParts.push(`Mass effect: ${formData.mass.toLowerCase()}.`);

    // Hemorrhage/vessel/perfusion
    if (formData.hemePattern !== 'None observed') {
      findingsParts.push(`Hemorrhage pattern: ${formData.hemePattern.toLowerCase()}.`);
    }
    if (formData.vessel !== 'Not seen') {
      findingsParts.push(`${formData.vessel}.`);
    }
    if (formData.perfusion !== 'Not performed') {
      findingsParts.push(`Perfusion is compatible with ${formData.perfusion.toLowerCase()}.`);
    }

    // Size
    findingsParts.push(`Lesion size category: ${sizeText}.`);

    // Impression
    let impression = `${formData.impressionPreset} involving the ${loc}. Stage: ${formData.stage}. ${formData.confidence} confidence.`;
    if (
      formData.impressionPreset.includes('Acute') &&
      !(formData.dwi.includes('hyperintense') && formData.adc.includes('Low'))
    ) {
      impression += ` Note: DWI/ADC pattern is not classic for acute restricted diffusion; please correlate clinically.`;
    }
    if (formData.impressionPreset.toLowerCase().includes('hemorrhage') && formData.t2star === 'No susceptibility') {
      impression += ` Note: No T2* susceptibility detected; early or low-volume hemorrhage cannot be excluded.`;
    }
    if (formData.hemePattern !== 'None observed' && !formData.impressionPreset.toLowerCase().includes('hemorrh')) {
      impression += ` Hemorrhagic features are present; consider reclassifying if clinically indicated.`;
    }
    if (formData.ddx) impression += ` Differentials: ${sentenceCase(formData.ddx)}.`;

    const report = `STUDY:
${technique}

HISTORY:
${history}

FINDINGS:
${findingsParts.join(' ')}

IMPRESSION:
${impression}

RECOMMENDATIONS:
Blood pressure evaluation/control; baseline labs including coagulation profile; consider cardiac/embolic source screening; antithrombotic therapy per clinician if no active hemorrhage; repeat MRI if neurologic status changes.
`;

    setReportText(report);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl shadow-xl p-8 border-2 border-rose-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-rose-100 rounded-xl">
          <FileText className="text-rose-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Ischemic/Hemorrhagic Infarct Report</h3>
      </div>

      {/* Form area */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-rose-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p className="flex flex-wrap items-center">
            Patient
            {renderInput('patient', formData.patient, 'e.g., Cooper', handleChange as any, 12)}
            · Signalment
            {renderInput('signalment', formData.signalment, 'e.g., 8y MN Lab', handleChange as any, 16)}
            · Onset→MRI (h)
            {renderInput('onsetHours', formData.onsetHours, 'e.g., 6', handleChange as any, 6)}
          </p>

          <p>
            Clinical summary:
            {renderInput('clinical', formData.clinical, 'key signs', handleChange as any, 42)}
          </p>

          <p>
            Stroke type
            {renderSelect('strokeType', formData.strokeType, ['Ischemic infarct', 'Hemorrhagic infarct', 'Primary intracerebral hemorrhage'], handleChange as any)}
            · Stage
            {renderSelect('stage', formData.stage, ['Hyperacute (<6 h)', 'Acute (6–48 h)', 'Early subacute (2–7 d)', 'Late subacute (7–14 d)', 'Chronic (>14 d)'], handleChange as any)}
            · Location
            {renderSelect('location', formData.location, ['MCA territory (cerebrum)', 'Internal capsule', 'Thalamus', 'Caudate/striatum', 'Hippocampus', 'Cerebellar hemisphere (LCA)', 'Cerebellar vermis', 'Brainstem (pons/medulla)'], handleChange as any)}
            · Side
            {renderSelect('side', formData.side, ['Left', 'Right', 'Midline', 'Bilateral asymmetric'], handleChange as any)}
            · Size
            {renderSelect('size', formData.size, ['Punctate (<5 mm)', 'Small (5–15 mm)', 'Moderate (1.5–3 cm)', 'Large (>3 cm)'], handleChange as any)}
          </p>

          <p>
            DWI
            {renderSelect('dwi', formData.dwi, ['Marked hyperintense', 'Mild–moderate hyperintense', 'No abnormality'], handleChange as any)}
            · ADC
            {renderSelect('adc', formData.adc, ['Low signal (restricted diffusion)', 'Near-normal (pseudonormalizing)', 'High signal', 'Not acquired'], handleChange as any)}
            · FLAIR/T2
            {renderSelect('flair', formData.flair, ['Hyperintense', 'Subtle/normal', 'Hypointense'], handleChange as any)}
          </p>

          <p>
            T2*
            {renderSelect('t2star', formData.t2star, ['No susceptibility', 'Focal susceptibility (microbleeds)', 'Patchy susceptibility (petechial)', 'Confluent susceptibility (parenchymal)', 'Intraluminal susceptibility (vessel sign)', 'Sequence not acquired'], handleChange as any)}
            · Contrast
            {renderSelect('ce', formData.ce, ['None', 'Mild rim enhancement', 'Patchy parenchymal', 'Leptomeningeal', 'Not given'], handleChange as any)}
            · Mass effect
            {renderSelect('mass', formData.mass, ['None', 'Mild sulcal effacement', 'Moderate with ventricle compression', 'Severe with midline shift', 'Posterior fossa crowding'], handleChange as any)}
          </p>

          <p>
            Hemorrhage pattern
            {renderSelect('hemePattern', formData.hemePattern, ['None observed', 'Petechial (hemorrhagic transformation)', 'Parenchymal (lobar)', 'Intraventricular extension', 'Subarachnoid component'], handleChange as any)}
            · Vessel sign
            {renderSelect('vessel', formData.vessel, ['Not seen', 'Susceptibility vessel sign present', 'Arterial flow void loss'], handleChange as any)}
            · Perfusion
            {renderSelect('perfusion', formData.perfusion, ['Not performed', 'Core pattern (↓CBF/CBV, ↑MTT/TTP)', 'Penumbra pattern (↓CBF, ↑MTT/TTP, preserved/↑CBV)'], handleChange as any)}
          </p>

          <p>
            Optional differentials:
            {renderInput('ddx', formData.ddx, 'e.g., inflammatory encephalitis less likely; consider hypertension coagulopathy', handleChange as any, 60)}
          </p>

          <p>
            Impression
            {renderSelect('impressionPreset', formData.impressionPreset, ['Acute non-hemorrhagic ischemic infarct', 'Ischemic infarct with hemorrhagic transformation', 'Primary intracerebral hemorrhage', 'Chronic infarct with encephalomalacia/gliosis'], handleChange as any)}
            · Confidence
            {renderSelect('confidence', formData.confidence, ['High', 'Moderate', 'Low'], handleChange as any)}
          </p>
        </div>
      </div>

      {/* Output area */}
      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-rose-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-rose-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={10}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600'
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

// Component for Glioma Template
const GliomaTemplate = () => {
  const [formData, setFormData] = useState({
    location: 'frontal lobe',
    laterality: 'left',
    enhancement: 'heterogeneous',
    edema: 'extensive',
    massEffect: 'present',
    midlineShift: 'Yes',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
There is an infiltrative intra-axial mass in the ${formData.laterality} ${formData.location}. The mass demonstrates poorly defined margins consistent with an infiltrative process. T2/FLAIR imaging shows marked hyperintensity with ${formData.edema} perilesional edema. T1-weighted images show hypointense to isointense signal. Contrast enhancement is ${formData.enhancement}. ${formData.massEffect === 'present' ? `Significant mass effect is present${formData.midlineShift === 'Yes' ? ' with midline shift' : ''}.` : 'Mass effect is minimal.'}

IMPRESSION:
Findings are most consistent with a high-grade glial neoplasm (glioma). The infiltrative pattern, extensive perilesional edema, and poorly defined margins are characteristic features. Prognosis is typically poor (median survival 2-6 months). Consider CSF analysis and advanced imaging if indicated.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-xl p-8 border-2 border-purple-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 rounded-xl">
          <Brain className="text-purple-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Glioma Report</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-purple-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            There is an infiltrative intra-axial mass in the
            {renderSelect('laterality', formData.laterality, ['left', 'right', 'bilateral'], handleChange as any)}
            {renderSelect('location', formData.location, ['frontal lobe', 'temporal lobe', 'parietal lobe', 'piriform lobe', 'occipital lobe'], handleChange as any)}.
          </p>
          <p>
            Contrast enhancement is
            {renderSelect('enhancement', formData.enhancement, ['heterogeneous', 'minimal', 'rim-enhancing', 'none'], handleChange as any)}.
            Perilesional edema is
            {renderSelect('edema', formData.edema, ['extensive', 'moderate', 'mild', 'minimal'], handleChange as any)}.
          </p>
          <p>
            Mass effect is
            {renderSelect('massEffect', formData.massEffect, ['present', 'absent'], handleChange as any)}
            {formData.massEffect === 'present' && (
              <>
                , with midline shift
                {renderSelect('midlineShift', formData.midlineShift, ['Yes', 'No'], handleChange as any)}
              </>
            )}.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-purple-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={8}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600'
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

// Component for GME/MUO Template
const GMETemplate = () => {
  const [formData, setFormData] = useState({
    distribution: 'multifocal',
    location: 'cerebral hemispheres',
    enhancement: 'ring',
    massEffect: 'mild',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
${formData.distribution === 'multifocal' ? 'Multiple' : 'A'} ${formData.distribution} T2/FLAIR hyperintense lesion${formData.distribution === 'multifocal' ? 's are' : ' is'} present within the ${formData.location}. The lesion${formData.distribution === 'multifocal' ? 's demonstrate' : ' demonstrates'} T1 hypointense signal with ${formData.enhancement} contrast enhancement pattern. Leptomeningeal enhancement is present. Mass effect is ${formData.massEffect}.

IMPRESSION:
Findings are consistent with granulomatous meningoencephalomyelitis (GME) or meningoencephalitis of unknown origin (MUO). CSF analysis is recommended for definitive diagnosis. Treatment with immunosuppressive therapy is indicated. Prognosis is variable depending on response to treatment.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl shadow-xl p-8 border-2 border-violet-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-violet-100 rounded-xl">
          <Shield className="text-violet-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">GME/MUO Report</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-violet-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            Distribution:
            {renderSelect('distribution', formData.distribution, ['focal', 'multifocal', 'disseminated'], handleChange as any)}
            in the
            {renderSelect('location', formData.location, ['cerebral hemispheres', 'brainstem', 'cerebellum', 'periventricular regions', 'optic pathways'], handleChange as any)}.
          </p>
          <p>
            Enhancement pattern:
            {renderSelect('enhancement', formData.enhancement, ['ring', 'nodular', 'heterogeneous', 'leptomeningeal'], handleChange as any)}.
          </p>
          <p>
            Mass effect:
            {renderSelect('massEffect', formData.massEffect, ['mild', 'moderate', 'severe', 'none'], handleChange as any)}.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-violet-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-violet-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={7}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600'
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

// Component for Pituitary Macroadenoma Template
const PituitaryTemplate = () => {
  const [formData, setFormData] = useState({
    height: '12',
    suprasellar: 'present',
    ventricle: 'Yes',
    enhancement: 'homogeneous',
    brightSpot: 'absent',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
The pituitary gland is enlarged measuring ${formData.height} mm in height (normal <6mm). The mass demonstrates T1 isointense to hypointense signal and T2 isointense to hyperintense signal. Contrast enhancement is ${formData.enhancement}. ${formData.suprasellar === 'present' ? 'Suprasellar extension is present.' : 'No suprasellar extension is identified.'} ${formData.ventricle === 'Yes' ? 'Third ventricle compression is present.' : 'No third ventricle compression.'} The neurohypophysis bright spot is ${formData.brightSpot}.

IMPRESSION:
Pituitary macroadenoma. This finding is consistent with pituitary-dependent hyperadrenocorticism (Cushing's disease). Recommend endocrine evaluation and consider radiation therapy if neurological signs present. Monitor for progression with repeat imaging.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl shadow-xl p-8 border-2 border-pink-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-pink-100 rounded-xl">
          <Heart className="text-pink-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Pituitary Macroadenoma Report</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-pink-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            Pituitary height:
            {renderInput('height', formData.height, 'mm', handleChange as any, 4)}
            mm (normal {'<'}6mm).
          </p>
          <p>
            Suprasellar extension:
            {renderSelect('suprasellar', formData.suprasellar, ['present', 'absent'], handleChange as any)}.
          </p>
          <p>
            Third ventricle compression:
            {renderSelect('ventricle', formData.ventricle, ['Yes', 'No'], handleChange as any)}.
          </p>
          <p>
            Contrast enhancement:
            {renderSelect('enhancement', formData.enhancement, ['homogeneous', 'heterogeneous'], handleChange as any)}.
          </p>
          <p>
            Neurohypophysis bright spot:
            {renderSelect('brightSpot', formData.brightSpot, ['present', 'absent'], handleChange as any)}.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-pink-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-pink-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={7}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
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

// Component for Hydrocephalus Template
const HydrocephalusTemplate = () => {
  const [formData, setFormData] = useState({
    dilation: 'severe',
    corticalThinning: 'present',
    periventricularEdema: 'present',
    corpusCallosum: 'elevated and thinned',
    type: 'obstructive',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
${formData.dilation.charAt(0).toUpperCase() + formData.dilation.slice(1)} dilation of the lateral ventricles is present. ${formData.corticalThinning === 'present' ? 'Thinning of the cerebral cortex is evident.' : 'The cerebral cortex appears normal in thickness.'} The corpus callosum is ${formData.corpusCallosum}. ${formData.periventricularEdema === 'present' ? 'Periventricular edema/gliosis is present (FLAIR hyperintensity).' : 'No periventricular edema is identified.'}

IMPRESSION:
Hydrocephalus, ${formData.type} type. Recommend neurological evaluation and consider CSF diversion (shunt placement) if clinical signs warrant intervention. Monitor for progression.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl shadow-xl p-8 border-2 border-blue-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-xl">
          <Droplets className="text-blue-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Hydrocephalus Report</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-blue-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            Lateral ventricle dilation:
            {renderSelect('dilation', formData.dilation, ['mild', 'moderate', 'severe'], handleChange as any)}.
          </p>
          <p>
            Cortical thinning:
            {renderSelect('corticalThinning', formData.corticalThinning, ['present', 'absent'], handleChange as any)}.
          </p>
          <p>
            Periventricular edema:
            {renderSelect('periventricularEdema', formData.periventricularEdema, ['present', 'absent'], handleChange as any)}.
          </p>
          <p>
            Corpus callosum:
            {renderSelect('corpusCallosum', formData.corpusCallosum, ['elevated and thinned', 'normal', 'compressed'], handleChange as any)}.
          </p>
          <p>
            Type:
            {renderSelect('type', formData.type, ['obstructive', 'communicating'], handleChange as any)}.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-blue-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={6}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-blue-500 to-sky-500 text-white hover:from-blue-600 hover:to-sky-600'
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

// Component for Choroid Plexus Tumor Template
const ChoroidPlexusTemplate = () => {
  const [formData, setFormData] = useState({
    location: 'lateral ventricle',
    laterality: 'left',
    hydrocephalus: 'present',
    enhancement: 'intense homogeneous',
    appearance: 'lobulated',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
An intraventricular mass is present within the ${formData.laterality} ${formData.location}. The mass has a ${formData.appearance} appearance. Signal characteristics show T1 isointense, T2 isointense to hyperintense signal. Contrast enhancement is ${formData.enhancement}. ${formData.hydrocephalus === 'present' ? 'Obstructive hydrocephalus is present.' : 'No hydrocephalus is identified.'} Periventricular edema is present.

IMPRESSION:
Choroid plexus tumor (papilloma vs carcinoma). Surgical resection is the treatment of choice if feasible. Prognosis depends on histopathologic grade and surgical resectability.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl shadow-xl p-8 border-2 border-teal-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-100 rounded-xl">
          <Eye className="text-teal-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Choroid Plexus Tumor Report</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-teal-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            Location:
            {renderSelect('laterality', formData.laterality, ['left', 'right', 'bilateral'], handleChange as any)}
            {renderSelect('location', formData.location, ['lateral ventricle', 'third ventricle', 'fourth ventricle'], handleChange as any)}.
          </p>
          <p>
            Appearance:
            {renderSelect('appearance', formData.appearance, ['lobulated', 'cauliflower-like', 'smooth'], handleChange as any)}.
          </p>
          <p>
            Enhancement:
            {renderSelect('enhancement', formData.enhancement, ['intense homogeneous', 'heterogeneous'], handleChange as any)}.
          </p>
          <p>
            Hydrocephalus:
            {renderSelect('hydrocephalus', formData.hydrocephalus, ['present', 'absent'], handleChange as any)}.
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
          rows={6}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600'
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

// Component for Brain Abscess Template
const BrainAbscessTemplate = () => {
  const [formData, setFormData] = useState({
    location: 'cerebral hemispheres',
    laterality: 'left',
    diffusion: 'present',
    rimEnhancement: 'present',
    edema: 'extensive',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
A well-defined round/oval mass is present in the ${formData.laterality} ${formData.location}. The lesion demonstrates central necrosis with T2 hyperintensity and T1 hypointensity. ${formData.diffusion === 'present' ? 'Restricted diffusion is present on DWI (key diagnostic feature).' : 'No restricted diffusion.'} ${formData.rimEnhancement === 'present' ? 'Smooth rim enhancement is present on post-contrast images.' : 'No rim enhancement.'} ${formData.edema} perilesional edema is present. Mass effect is present.

IMPRESSION:
Brain abscess. The presence of restricted diffusion on DWI helps differentiate from tumor. Recommend long-term antibiotics and possibly surgical drainage. Investigate underlying source (otitis, trauma, hematogenous spread).`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-xl p-8 border-2 border-red-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-100 rounded-xl">
          <AlertCircle className="text-red-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Brain Abscess Report</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-red-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            Location:
            {renderSelect('laterality', formData.laterality, ['left', 'right', 'bilateral'], handleChange as any)}
            {renderSelect('location', formData.location, ['cerebral hemispheres', 'cerebellum', 'brainstem'], handleChange as any)}.
          </p>
          <p>
            Restricted diffusion (DWI):
            {renderSelect('diffusion', formData.diffusion, ['present', 'absent'], handleChange as any)}
            (key diagnostic feature).
          </p>
          <p>
            Rim enhancement:
            {renderSelect('rimEnhancement', formData.rimEnhancement, ['present', 'absent'], handleChange as any)}.
          </p>
          <p>
            Perilesional edema:
            {renderSelect('edema', formData.edema, ['extensive', 'moderate', 'mild'], handleChange as any)}.
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
              : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600'
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

// Component for Necrotizing Encephalitis Template
const NMETemplate = () => {
  const [formData, setFormData] = useState({
    type: 'NME',
    distribution: 'multifocal asymmetric',
    enhancement: 'gyral',
    cavitation: 'absent',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
${formData.distribution.charAt(0).toUpperCase() + formData.distribution.slice(1)} T2/FLAIR hyperintense lesions are present with ${formData.type === 'NME' ? 'cortical and subcortical' : 'white matter'} predominance. T1 hypointense signal is present. Contrast enhancement pattern is ${formData.enhancement}. ${formData.cavitation === 'present' ? 'Cavitation/necrosis is present indicating advanced disease.' : 'No cavitation is identified.'} Ventricular distortion is present. Mass effect is present.

IMPRESSION:
${formData.type} (${formData.type === 'NME' ? 'Necrotizing Meningoencephalitis, "Pug Dog Encephalitis"' : 'Necrotizing Leukoencephalitis'}). This is a breed-specific inflammatory brain disease. CSF analysis and MRI findings support the diagnosis. Treatment with immunosuppressive therapy is indicated, though prognosis is typically poor. Seizures are common in NME.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-xl p-8 border-2 border-orange-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-orange-100 rounded-xl">
          <Flame className="text-orange-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Necrotizing Encephalitis Report</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-orange-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            Type:
            {renderSelect('type', formData.type, ['NME', 'NLE'], handleChange as any)}
            (NME = cortical, NLE = white matter).
          </p>
          <p>
            Distribution:
            {renderSelect('distribution', formData.distribution, ['multifocal asymmetric', 'focal', 'bilateral'], handleChange as any)}.
          </p>
          <p>
            Enhancement pattern:
            {renderSelect('enhancement', formData.enhancement, ['gyral', 'parenchymal', 'leptomeningeal', 'none'], handleChange as any)}.
          </p>
          <p>
            Cavitation:
            {renderSelect('cavitation', formData.cavitation, ['present', 'absent'], handleChange as any)}.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-orange-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={8}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600'
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

// Component for FCE Template
const FCETemplate = () => {
  const [formData, setFormData] = useState({
    spinalLevel: 'L4-S1',
    laterality: 'asymmetric',
    cordSwelling: 'mild',
    discAbnormality: 'none',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
Intramedullary T2 hyperintense focal spinal cord lesion at ${formData.spinalLevel}. The lesion is ${formData.laterality} (hallmark feature). T1 signal is hypointense to isointense. ${formData.cordSwelling !== 'none' ? `${formData.cordSwelling.charAt(0).toUpperCase() + formData.cordSwelling.slice(1)} cord swelling is present.` : 'No cord swelling.'} Intervertebral discs are ${formData.discAbnormality} (key finding). No extradural compression is present. No contrast enhancement in acute phase.

IMPRESSION:
Fibrocartilaginous embolism (FCE). The asymmetric/unilateral cord lesion without disc herniation or extradural compression is characteristic. Clinical presentation is typically peracute onset during exercise. This is a diagnosis of exclusion. Prognosis depends on presence of deep pain perception. Good prognosis if deep pain present and non-progressive after initial 24-48 hours.`;
    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl shadow-xl p-8 border-2 border-slate-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-slate-100 rounded-xl">
          <Zap className="text-slate-600" size={24} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">FCE (Fibrocartilaginous Embolism) Report</h3>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-inner border border-slate-100">
        <div className="text-base leading-relaxed text-gray-700 space-y-4">
          <p>
            Spinal level:
            {renderSelect('spinalLevel', formData.spinalLevel, ['C6-T2', 'T3-L3', 'L4-S1', 'Other'], handleChange as any)}.
          </p>
          <p>
            Laterality:
            {renderSelect('laterality', formData.laterality, ['left', 'right', 'asymmetric'], handleChange as any)}
            (hallmark feature - should be asymmetric/unilateral).
          </p>
          <p>
            Cord swelling:
            {renderSelect('cordSwelling', formData.cordSwelling, ['mild', 'moderate', 'severe', 'none'], handleChange as any)}.
          </p>
          <p>
            Disc abnormality:
            {renderSelect('discAbnormality', formData.discAbnormality, ['none', 'incidental degeneration'], handleChange as any)}
            (should be none for FCE diagnosis).
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-slate-600" />
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Report</h4>
        </div>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={8}
          className="w-full text-sm font-mono bg-gray-50 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:outline-none transition-all duration-200"
        />
        <button
          onClick={copyReport}
          className={`mt-4 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-slate-500 to-gray-500 text-white hover:from-slate-600 hover:to-gray-600'
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

const DiscospondylitisTemplate = () => {
  const [formData, setFormData] = useState({
    location: 'L2-L3',
    severity: 'moderate',
    endplateChanges: 'extensive',
    discMaterial: 'heterogeneous fluid signal',
    paraspinalChanges: 'present',
    cordCompression: 'mild',
    enhancement: 'marked',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
There is ${formData.severity} destruction of the ${formData.location} vertebral endplates with ${formData.endplateChanges} lysis and sclerosis. The intervertebral disc space shows ${formData.discMaterial} on T2-weighted sequences. ${formData.paraspinalChanges === 'present' ? 'Paraspinal soft tissue changes are noted with fluid accumulation and contrast enhancement.' : 'Paraspinal tissues appear normal.'} ${formData.cordCompression !== 'none' ? `There is ${formData.cordCompression} compression of the spinal cord at this level.` : 'No spinal cord compression is evident.'} Post-contrast sequences demonstrate ${formData.enhancement} enhancement of the affected vertebral bodies and disc space.

IMPRESSION:
${formData.location} discospondylitis with ${formData.severity} vertebral endplate destruction and ${formData.enhancement} contrast enhancement. ${formData.cordCompression !== 'none' ? `Associated ${formData.cordCompression} spinal cord compression.` : ''} Clinical correlation and culture recommended to guide antimicrobial therapy.`;

    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-amber-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Discospondylitis Report Builder</h2>
              <p className="text-gray-600">Fill in the details to generate your report</p>
            </div>
          </div>

          <div className="space-y-4 text-lg leading-relaxed text-gray-800">
            <p>
              There is {renderSelect('severity', formData.severity, ['mild', 'moderate', 'severe'], handleChange)}
              destruction of the {renderInput('location', formData.location, 'L2-L3', handleChange, 10)}
              vertebral endplates with {renderSelect('endplateChanges', formData.endplateChanges, ['minimal', 'moderate', 'extensive'], handleChange)}
              lysis and sclerosis.
            </p>
            <p>
              The intervertebral disc space shows {renderInput('discMaterial', formData.discMaterial, 'heterogeneous fluid signal', handleChange, 30)}
              on T2-weighted sequences.
            </p>
            <p>
              Paraspinal changes: {renderSelect('paraspinalChanges', formData.paraspinalChanges, ['present', 'absent'], handleChange)}
            </p>
            <p>
              Spinal cord compression: {renderSelect('cordCompression', formData.cordCompression, ['none', 'mild', 'moderate', 'severe'], handleChange)}
            </p>
            <p>
              Post-contrast enhancement: {renderSelect('enhancement', formData.enhancement, ['minimal', 'moderate', 'marked'], handleChange)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-amber-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" />
            Generated Report
          </h3>
          <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap border-2 border-gray-200 min-h-[200px]">
            {reportText}
          </div>
        </div>

        <button
          onClick={copyReport}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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

const AtlantoaxialTemplate = () => {
  const [formData, setFormData] = useState({
    subluxation: 'present',
    dorsalCompression: 'moderate',
    odontoidProcess: 'hypoplastic',
    ligamentStatus: 'ruptured',
    cordSignal: 'T2 hyperintense',
    atlantalArch: 'normal',
    stability: 'unstable',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
${formData.subluxation === 'present' ? 'There is atlantoaxial subluxation with' : 'No atlantoaxial subluxation is evident. There is'} ${formData.dorsalCompression} dorsal compression of the cervical spinal cord at the C1-C2 level. The odontoid process (dens) appears ${formData.odontoidProcess}. ${formData.ligamentStatus === 'ruptured' ? 'The dorsal atlantoaxial ligament appears disrupted/ruptured.' : formData.ligamentStatus === 'attenuated' ? 'The dorsal atlantoaxial ligament appears attenuated but intact.' : 'The dorsal atlantoaxial ligament appears intact.'} The spinal cord shows ${formData.cordSignal} signal change consistent with myelomalacia/edema. The dorsal arch of the atlas is ${formData.atlantalArch}. ${formData.stability === 'unstable' ? 'Alignment is unstable with increased atlantoaxial distance on flexion.' : 'Alignment appears relatively stable.'}

IMPRESSION:
Atlantoaxial instability with ${formData.dorsalCompression} spinal cord compression. ${formData.odontoidProcess !== 'normal' ? `${formData.odontoidProcess.charAt(0).toUpperCase() + formData.odontoidProcess.slice(1)} odontoid process.` : ''} ${formData.ligamentStatus === 'ruptured' ? 'Dorsal atlantoaxial ligament rupture.' : ''} Spinal cord signal changes consistent with myelopathy. Surgical stabilization recommended.`;

    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-rose-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl">
              <Bone className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Atlantoaxial Instability Report Builder</h2>
              <p className="text-gray-600">Fill in the details to generate your report</p>
            </div>
          </div>

          <div className="space-y-4 text-lg leading-relaxed text-gray-800">
            <p>
              Atlantoaxial subluxation: {renderSelect('subluxation', formData.subluxation, ['present', 'absent'], handleChange)}
            </p>
            <p>
              Dorsal spinal cord compression: {renderSelect('dorsalCompression', formData.dorsalCompression, ['none', 'mild', 'moderate', 'severe'], handleChange)}
            </p>
            <p>
              Odontoid process: {renderSelect('odontoidProcess', formData.odontoidProcess, ['normal', 'hypoplastic', 'aplastic', 'fractured'], handleChange)}
            </p>
            <p>
              Dorsal atlantoaxial ligament: {renderSelect('ligamentStatus', formData.ligamentStatus, ['intact', 'attenuated', 'ruptured'], handleChange)}
            </p>
            <p>
              Spinal cord signal: {renderInput('cordSignal', formData.cordSignal, 'T2 hyperintense', handleChange, 25)}
            </p>
            <p>
              Dorsal arch of atlas: {renderSelect('atlantalArch', formData.atlantalArch, ['normal', 'hypoplastic', 'absent'], handleChange)}
            </p>
            <p>
              Stability: {renderSelect('stability', formData.stability, ['stable', 'unstable'], handleChange)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-rose-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-rose-600" />
            Generated Report
          </h3>
          <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap border-2 border-gray-200 min-h-[200px]">
            {reportText}
          </div>
        </div>

        <button
          onClick={copyReport}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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

const DMTemplate = () => {
  const [formData, setFormData] = useState({
    location: 'thoracolumbar',
    severity: 'moderate',
    cordAtrophy: 'present',
    signalChange: 'T2 hyperintense',
    distribution: 'symmetric',
    dorsalColumns: 'affected',
    lateralColumns: 'affected',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
There is ${formData.severity} ${formData.distribution} ${formData.signalChange} signal change within the ${formData.location} spinal cord. ${formData.dorsalColumns === 'affected' ? 'The dorsal columns show increased T2 signal.' : ''} ${formData.lateralColumns === 'affected' ? 'The lateral columns also demonstrate increased T2 signal.' : ''} ${formData.cordAtrophy === 'present' ? 'Spinal cord atrophy is evident at the affected levels.' : 'No significant spinal cord atrophy is noted.'} No contrast enhancement is present. No compressive lesions are identified. Intervertebral discs show age-appropriate degenerative changes without significant canal stenosis.

IMPRESSION:
${formData.severity.charAt(0).toUpperCase() + formData.severity.slice(1)} ${formData.distribution} T2 hyperintense signal change in the ${formData.location} spinal cord ${formData.cordAtrophy === 'present' ? 'with cord atrophy' : 'without atrophy'}, most consistent with degenerative myelopathy. No compressive or inflammatory component identified. Clinical correlation with genetic testing (SOD1 mutation) recommended.`;

    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl">
              <Navigation className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Degenerative Myelopathy Report Builder</h2>
              <p className="text-gray-600">Fill in the details to generate your report</p>
            </div>
          </div>

          <div className="space-y-4 text-lg leading-relaxed text-gray-800">
            <p>
              Location: {renderSelect('location', formData.location, ['cervical', 'cervicothoracic', 'thoracolumbar', 'lumbosacral', 'multifocal'], handleChange)}
            </p>
            <p>
              Severity of signal change: {renderSelect('severity', formData.severity, ['mild', 'moderate', 'severe'], handleChange)}
            </p>
            <p>
              Signal appearance: {renderInput('signalChange', formData.signalChange, 'T2 hyperintense', handleChange, 25)}
            </p>
            <p>
              Distribution: {renderSelect('distribution', formData.distribution, ['symmetric', 'asymmetric'], handleChange)}
            </p>
            <p>
              Spinal cord atrophy: {renderSelect('cordAtrophy', formData.cordAtrophy, ['present', 'absent'], handleChange)}
            </p>
            <p>
              Dorsal columns: {renderSelect('dorsalColumns', formData.dorsalColumns, ['affected', 'normal'], handleChange)}
            </p>
            <p>
              Lateral columns: {renderSelect('lateralColumns', formData.lateralColumns, ['affected', 'normal'], handleChange)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-300">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-gray-600" />
            Generated Report
          </h3>
          <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap border-2 border-gray-200 min-h-[200px]">
            {reportText}
          </div>
        </div>

        <button
          onClick={copyReport}
          className="w-full bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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

const LumbosacralTemplate = () => {
  const [formData, setFormData] = useState({
    discDegeneration: 'severe',
    facetJoints: 'degenerative changes',
    caudaEquina: 'moderate',
    foramenStenosis: 'bilateral moderate',
    epiduralFat: 'present',
    instability: 'present',
    nerveRootCompression: 'L7 and S1',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
There is ${formData.discDegeneration} degenerative disc disease at L7-S1 with disc space narrowing and loss of T2 signal intensity. The facet joints demonstrate ${formData.facetJoints} with hypertrophy and periarticular new bone formation. ${formData.caudaEquina !== 'none' ? `There is ${formData.caudaEquina} compression of the cauda equina within the lumbosacral canal.` : 'The cauda equina appears normal without compression.'} ${formData.foramenStenosis !== 'none' ? `${formData.foramenStenosis.charAt(0).toUpperCase() + formData.foramenStenosis.slice(1)} foraminal stenosis is present` : 'Neural foramina appear patent'} affecting the ${formData.nerveRootCompression} nerve roots. ${formData.epiduralFat === 'present' ? 'Epidural fat proliferation contributes to canal stenosis.' : ''} ${formData.instability === 'present' ? 'Dynamic imaging suggests lumbosacral instability.' : 'No evidence of instability on static imaging.'}

IMPRESSION:
Lumbosacral stenosis with ${formData.discDegeneration} degenerative disc disease and facet joint osteoarthritis. ${formData.caudaEquina !== 'none' ? `${formData.caudaEquina.charAt(0).toUpperCase() + formData.caudaEquina.slice(1)} cauda equina compression.` : ''} ${formData.foramenStenosis !== 'none' ? `${formData.foramenStenosis} foraminal stenosis with ${formData.nerveRootCompression} nerve root impingement.` : ''} ${formData.instability === 'present' ? 'Lumbosacral instability present.' : ''} Surgical decompression and stabilization may be indicated based on clinical severity.`;

    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-green-50 to-emerald-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-lime-500 to-green-500 rounded-xl">
              <Bandage className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Lumbosacral Stenosis Report Builder</h2>
              <p className="text-gray-600">Fill in the details to generate your report</p>
            </div>
          </div>

          <div className="space-y-4 text-lg leading-relaxed text-gray-800">
            <p>
              Disc degeneration severity: {renderSelect('discDegeneration', formData.discDegeneration, ['mild', 'moderate', 'severe'], handleChange)}
            </p>
            <p>
              Facet joints: {renderInput('facetJoints', formData.facetJoints, 'degenerative changes', handleChange, 30)}
            </p>
            <p>
              Cauda equina compression: {renderSelect('caudaEquina', formData.caudaEquina, ['none', 'mild', 'moderate', 'severe'], handleChange)}
            </p>
            <p>
              Foraminal stenosis: {renderSelect('foramenStenosis', formData.foramenStenosis, ['none', 'unilateral mild', 'unilateral moderate', 'unilateral severe', 'bilateral mild', 'bilateral moderate', 'bilateral severe'], handleChange)}
            </p>
            <p>
              Affected nerve roots: {renderInput('nerveRootCompression', formData.nerveRootCompression, 'L7 and S1', handleChange, 25)}
            </p>
            <p>
              Epidural fat proliferation: {renderSelect('epiduralFat', formData.epiduralFat, ['present', 'absent'], handleChange)}
            </p>
            <p>
              Lumbosacral instability: {renderSelect('instability', formData.instability, ['present', 'absent'], handleChange)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-lime-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-lime-600" />
            Generated Report
          </h3>
          <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap border-2 border-gray-200 min-h-[200px]">
            {reportText}
          </div>
        </div>

        <button
          onClick={copyReport}
          className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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

const ArachnoidTemplate = () => {
  const [formData, setFormData] = useState({
    location: 'T12-L1',
    size: 'moderate',
    cordCompression: 'moderate',
    cordSignal: 'normal',
    cystContents: 'CSF-like fluid',
    communication: 'communicating',
    dorsalVentral: 'dorsal',
  });

  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const generatedReport = `FINDINGS:
There is a ${formData.dorsalVentral} ${formData.size} extradural cystic structure at ${formData.location} consistent with an arachnoid diverticulum. The lesion contains ${formData.cystContents} that follows CSF signal on all sequences. ${formData.communication === 'communicating' ? 'The diverticulum appears to communicate with the subarachnoid space.' : 'No clear communication with the subarachnoid space is identified.'} The spinal cord demonstrates ${formData.cordCompression} compression with ${formData.dorsalVentral === 'dorsal' ? 'ventral displacement' : 'dorsal displacement'}. The spinal cord parenchyma shows ${formData.cordSignal} signal intensity. No abnormal contrast enhancement is present.

IMPRESSION:
${formData.dorsalVentral.charAt(0).toUpperCase() + formData.dorsalVentral.slice(1)} arachnoid diverticulum at ${formData.location} causing ${formData.cordCompression} spinal cord compression. ${formData.cordSignal !== 'normal' ? `Associated ${formData.cordSignal} spinal cord signal changes suggesting myelopathy.` : 'No intramedullary signal changes at this time.'} Surgical fenestration or marsupialization may be indicated based on clinical presentation.`;

    setReportText(generatedReport);
  }, [formData]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-violet-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl">
              <Droplet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Arachnoid Diverticulum Report Builder</h2>
              <p className="text-gray-600">Fill in the details to generate your report</p>
            </div>
          </div>

          <div className="space-y-4 text-lg leading-relaxed text-gray-800">
            <p>
              Location: {renderInput('location', formData.location, 'T12-L1', handleChange, 15)}
            </p>
            <p>
              Size of diverticulum: {renderSelect('size', formData.size, ['small', 'moderate', 'large'], handleChange)}
            </p>
            <p>
              Position: {renderSelect('dorsalVentral', formData.dorsalVentral, ['dorsal', 'ventral', 'lateral'], handleChange)}
            </p>
            <p>
              Spinal cord compression: {renderSelect('cordCompression', formData.cordCompression, ['none', 'mild', 'moderate', 'severe'], handleChange)}
            </p>
            <p>
              Spinal cord signal: {renderSelect('cordSignal', formData.cordSignal, ['normal', 'T2 hyperintense suggesting edema', 'T2/T1 signal change suggesting myelomalacia'], handleChange)}
            </p>
            <p>
              Cyst contents: {renderInput('cystContents', formData.cystContents, 'CSF-like fluid', handleChange, 25)}
            </p>
            <p>
              Communication: {renderSelect('communication', formData.communication, ['communicating', 'non-communicating'], handleChange)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-violet-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-violet-600" />
            Generated Report
          </h3>
          <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap border-2 border-gray-200 min-h-[200px]">
            {reportText}
          </div>
        </div>

        <button
          onClick={copyReport}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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
    // Original 4
    { id: 'meningioma', name: 'Meningioma', icon: BrainCircuit, color: 'indigo', gradient: 'from-indigo-500 to-purple-500' },
    { id: 'ivdd', name: 'IVDD', icon: Sparkles, color: 'teal', gradient: 'from-teal-500 to-cyan-500' },
    { id: 'chiari', name: 'Chiari/Syringomyelia', icon: Activity, color: 'red', gradient: 'from-red-500 to-pink-500' },
    { id: 'stroke', name: 'Ischemic/Hemorrhagic Infarct', icon: FileText, color: 'rose', gradient: 'from-rose-500 to-red-500' },
    // Brain conditions (8)
    { id: 'glioma', name: 'Glioma', icon: Brain, color: 'purple', gradient: 'from-purple-500 to-indigo-500' },
    { id: 'gme', name: 'GME/MUO', icon: Shield, color: 'violet', gradient: 'from-violet-500 to-purple-500' },
    { id: 'pituitary', name: 'Pituitary Macroadenoma', icon: Heart, color: 'pink', gradient: 'from-pink-500 to-rose-500' },
    { id: 'hydrocephalus', name: 'Hydrocephalus', icon: Droplets, color: 'blue', gradient: 'from-blue-500 to-sky-500' },
    { id: 'choroid', name: 'Choroid Plexus Tumor', icon: Eye, color: 'teal', gradient: 'from-teal-500 to-emerald-500' },
    { id: 'abscess', name: 'Brain Abscess', icon: AlertCircle, color: 'red', gradient: 'from-red-500 to-orange-500' },
    { id: 'nme', name: 'Necrotizing Encephalitis', icon: Flame, color: 'orange', gradient: 'from-orange-500 to-amber-500' },
    // Spine conditions (6)
    { id: 'fce', name: 'FCE', icon: Zap, color: 'slate', gradient: 'from-slate-500 to-gray-500' },
    { id: 'discospondylitis', name: 'Discospondylitis', icon: Flame, color: 'amber', gradient: 'from-amber-500 to-yellow-500' },
    { id: 'atlantoaxial', name: 'Atlantoaxial Instability', icon: Bone, color: 'rose', gradient: 'from-rose-500 to-pink-500' },
    { id: 'dm', name: 'Degenerative Myelopathy', icon: Navigation, color: 'gray', gradient: 'from-gray-500 to-slate-500' },
    { id: 'lumbosacral', name: 'Lumbosacral Stenosis', icon: Bandage, color: 'lime', gradient: 'from-lime-500 to-green-500' },
    { id: 'arachnoid', name: 'Arachnoid Diverticulum', icon: Droplet, color: 'violet', gradient: 'from-violet-500 to-purple-500' },
  ];

  const renderTemplate = () => {
    switch (selectedDisease) {
      // Original 4
      case 'meningioma':
        return <MeningiomaTemplate />;
      case 'ivdd':
        return <IVDDTemplate />;
      case 'chiari':
        return <ChiariSyringomyeliaTemplate />;
      case 'stroke':
        return <StrokeTemplate />;
      // Brain conditions
      case 'glioma':
        return <GliomaTemplate />;
      case 'gme':
        return <GMETemplate />;
      case 'pituitary':
        return <PituitaryTemplate />;
      case 'hydrocephalus':
        return <HydrocephalusTemplate />;
      case 'choroid':
        return <ChoroidPlexusTemplate />;
      case 'abscess':
        return <BrainAbscessTemplate />;
      case 'nme':
        return <NMETemplate />;
      // Spine conditions
      case 'fce':
        return <FCETemplate />;
      case 'discospondylitis':
        return <DiscospondylitisTemplate />;
      case 'atlantoaxial':
        return <AtlantoaxialTemplate />;
      case 'dm':
        return <DMTemplate />;
      case 'lumbosacral':
        return <LumbosacralTemplate />;
      case 'arachnoid':
        return <ArachnoidTemplate />;
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
          <h2 className="text-lg font-bold text-gray-700 mb-4">Select Disease Template (15 Templates)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {diseases.map((disease) => {
              const Icon = disease.icon;
              const isSelected = selectedDisease === disease.id;
              return (
                <button
                  key={disease.id}
                  onClick={() => setSelectedDisease(disease.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                    isSelected
                      ? `bg-gradient-to-br ${disease.gradient} text-white border-transparent shadow-lg scale-105`
                      : 'bg-white text-gray-700 border-gray-200 shadow-md hover:border-gray-300'
                  }`}
                >
                  <div className={`inline-flex p-2 rounded-lg mb-2 ${
                    isSelected ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    <Icon size={20} className={isSelected ? 'text-white' : `text-${disease.color}-600`} />
                  </div>
                  <h3 className="text-sm font-bold">{disease.name}</h3>
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
