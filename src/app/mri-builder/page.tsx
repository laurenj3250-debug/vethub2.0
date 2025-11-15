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


export default function MRIReportBuilderPage() {
  const [selectedDisease, setSelectedDisease] = useState<string>('meningioma');

  const diseases = [
    { id: 'meningioma', name: 'Meningioma', icon: BrainCircuit, color: 'indigo', gradient: 'from-indigo-500 to-purple-500' },
    { id: 'ivdd', name: 'IVDD', icon: Sparkles, color: 'teal', gradient: 'from-teal-500 to-cyan-500' },
    { id: 'chiari', name: 'Chiari/Syringomyelia', icon: Activity, color: 'red', gradient: 'from-red-500 to-pink-500' },
    { id: 'stroke', name: 'Ischemic/Hemorrhagic Infarct', icon: FileText, color: 'rose', gradient: 'from-rose-500 to-red-500' },
  ];

  const renderTemplate = () => {
    switch (selectedDisease) {
      case 'meningioma':
        return <MeningiomaTemplate />;
      case 'ivdd':
        return <IVDDTemplate />;
      case 'chiari':
        return <ChiariSyringomyeliaTemplate />;
      case 'stroke':
        return <StrokeTemplate />;
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
