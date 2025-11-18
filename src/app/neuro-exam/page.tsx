'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, AlertCircle, Circle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SectionData {
  status: 'normal' | 'abnormal' | null;
  expanded: boolean;
  data: Record<string, any>;
}

interface Sections {
  [key: number]: SectionData;
}

export default function NeuroExamMobile() {
  const [sections, setSections] = useState<Sections>({
    1: { status: null, expanded: false, data: {} },
    2: { status: null, expanded: false, data: {} },
    3: { status: null, expanded: false, data: {} },
    4: { status: null, expanded: false, data: {} },
    5: { status: null, expanded: false, data: {} },
    6: { status: null, expanded: false, data: {} },
    7: { status: null, expanded: false, data: {} },
    8: { status: null, expanded: false, data: {} },
    9: { status: null, expanded: false, data: {} },
    10: { status: null, expanded: false, data: {} },
    11: { status: null, expanded: false, data: {} },
    12: { status: null, expanded: false, data: {} },
    13: { status: null, expanded: false, data: {} },
    14: { status: null, expanded: false, data: {} },
    15: { status: null, expanded: false, data: {} },
    16: { status: null, expanded: false, data: {} },
    17: { status: null, expanded: false, data: {} },
    18: { status: null, expanded: false, data: {} },
  });

  const toggleSection = (id: number) => {
    setSections(prev => ({
      ...prev,
      [id]: { ...prev[id], expanded: !prev[id].expanded }
    }));
  };

  const setStatus = (id: number, status: 'normal' | 'abnormal') => {
    setSections(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status,
        // Auto-expand when "Abnormal" is selected
        expanded: status === 'abnormal' ? true : prev[id].expanded
      }
    }));
  };

  const updateData = (id: number, field: string, value: any) => {
    setSections(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        data: { ...prev[id].data, [field]: value }
      }
    }));
  };

  const getStatusIcon = (status: 'normal' | 'abnormal' | null) => {
    if (status === 'normal') {
      return (
        <div className="relative">
          <Check className="text-emerald-400" size={20} style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' }} />
        </div>
      );
    }
    if (status === 'abnormal') {
      return (
        <div className="relative">
          <AlertCircle className="text-fuchsia-400" size={20} style={{ filter: 'drop-shadow(0 0 8px rgba(217, 70, 239, 0.8))' }} />
        </div>
      );
    }
    return <Circle className="text-purple-500/50" size={20} />;
  };

  const completed = Object.values(sections).filter(s => s.status).length;
  const total = Object.keys(sections).length;
  const progress = (completed / total) * 100;

  const handleSaveDraft = () => {
    // Auto-save to localStorage
    localStorage.setItem('neuro-exam-draft', JSON.stringify(sections));
    console.log('Draft saved to localStorage', sections);
    // TODO: Also save to database
  };

  const handleComplete = () => {
    const incomplete = Object.entries(sections).filter(([_, s]) => !s.status);
    if (incomplete.length > 0) {
      const proceed = confirm(`${incomplete.length} sections incomplete. Complete anyway?`);
      if (!proceed) return;
    }
    // Save to localStorage
    localStorage.setItem('neuro-exam-complete', JSON.stringify({
      sections,
      completedAt: new Date().toISOString()
    }));
    console.log('Exam completed!', sections);
    // TODO: Save to database
    alert('Exam saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-950 to-purple-950 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md shadow-lg shadow-purple-500/20 z-10 p-4 border-b border-purple-500/20">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-semibold text-purple-50" style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.6)' }}>
            Neuro Exam
          </h1>
          <motion.button
            onClick={handleSaveDraft}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-shadow"
            style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.2)' }}
          >
            Save Draft
          </motion.button>
        </div>

        {/* Neural Network Progress - Simplified for now, will add full network later */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative h-3 bg-slate-800/50 rounded-full overflow-hidden" style={{ boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)' }}>
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 rounded-full"
              style={{
                width: `${progress}%`,
                boxShadow: '0 0 20px rgba(217, 70, 239, 0.6), 0 0 40px rgba(168, 85, 247, 0.4)'
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-sm font-medium text-purple-200" style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.5)' }}>
            {completed}/{total}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="p-4 space-y-3">
        {/* Section 1: Mentation & Behavior */}
        <ExamSection
          id={1}
          title="Mentation & Behavior"
          section={sections[1]}
          toggleSection={() => toggleSection(1)}
          setStatus={(status) => setStatus(1, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Mentation Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Alert', 'Depressed', 'Obtunded', 'Stuporous', 'Comatose'].map(level => (
                  <button
                    key={level}
                    onClick={() => updateData(1, 'mentation', level)}
                    className={`py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[1].data.mentation === level
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Behavior Abnormalities
              </label>
              <div className="space-y-2">
                {[
                  { id: 'circlingL', label: 'Circling Left' },
                  { id: 'circlingR', label: 'Circling Right' },
                  { id: 'headPressing', label: 'Head Pressing' },
                  { id: 'aggression', label: 'Aggression' },
                  { id: 'disorientation', label: 'Disorientation' },
                  { id: 'vocalization', label: 'Vocalization' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(1, item.id, !sections[1].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[1].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[1].data.notes || ''}
                onChange={(e) => updateData(1, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 2: Posture & Position at Rest */}
        <ExamSection
          id={2}
          title="Posture & Position at Rest"
          section={sections[2]}
          toggleSection={() => toggleSection(2)}
          setStatus={(status) => setStatus(2, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Head Tilt
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateData(2, 'headTilt', sections[2].data.headTilt === 'L' ? null : 'L')}
                  className={`flex-1 py-3 rounded-lg font-medium active:scale-95 transition ${
                    sections[2].data.headTilt === 'L'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Left
                </button>
                <button
                  onClick={() => updateData(2, 'headTilt', sections[2].data.headTilt === 'R' ? null : 'R')}
                  className={`flex-1 py-3 rounded-lg font-medium active:scale-95 transition ${
                    sections[2].data.headTilt === 'R'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Right
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Head Turn
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateData(2, 'headTurn', sections[2].data.headTurn === 'L' ? null : 'L')}
                  className={`flex-1 py-3 rounded-lg font-medium active:scale-95 transition ${
                    sections[2].data.headTurn === 'L'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Left
                </button>
                <button
                  onClick={() => updateData(2, 'headTurn', sections[2].data.headTurn === 'R' ? null : 'R')}
                  className={`flex-1 py-3 rounded-lg font-medium active:scale-95 transition ${
                    sections[2].data.headTurn === 'R'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Right
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Other Findings
              </label>
              <div className="space-y-2">
                {[
                  { id: 'ventroflexion', label: 'Ventroflexion' },
                  { id: 'wideExcursionTremor', label: 'Wide Excursion Head Tremor' },
                  { id: 'fineIntentionTremor', label: 'Fine Intention Tremor' },
                  { id: 'facialAsymmetryL', label: 'Facial Asymmetry - Left' },
                  { id: 'facialAsymmetryR', label: 'Facial Asymmetry - Right' },
                  { id: 'earAbnormalL', label: 'Ear Position Abnormal - Left' },
                  { id: 'earAbnormalR', label: 'Ear Position Abnormal - Right' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(2, item.id, !sections[2].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[2].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[2].data.notes || ''}
                onChange={(e) => updateData(2, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 3: Gait Evaluation */}
        <ExamSection
          id={3}
          title="Gait Evaluation"
          section={sections[3]}
          toggleSection={() => toggleSection(3)}
          setStatus={(status) => setStatus(3, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Ambulatory Status
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Ambulatory',
                  'Non-ambulatory paraparesis',
                  'Non-ambulatory tetraparesis',
                  'Paraplegia',
                  'Tetraplegia'
                ].map(status => (
                  <button
                    key={status}
                    onClick={() => updateData(3, 'ambulatoryStatus', status)}
                    className={`py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[3].data.ambulatoryStatus === status
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Paresis (select limbs)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['LF', 'RF', 'LH', 'RH'].map(limb => (
                  <button
                    key={limb}
                    onClick={() => {
                      const paresis = sections[3].data.paresis || [];
                      const newParesis = paresis.includes(limb)
                        ? paresis.filter((l: string) => l !== limb)
                        : [...paresis, limb];
                      updateData(3, 'paresis', newParesis);
                    }}
                    className={`py-3 rounded-lg font-medium active:scale-95 transition ${
                      (sections[3].data.paresis || []).includes(limb)
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {limb}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Ataxia Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Proprioceptive', 'Vestibular', 'Cerebellar', 'General'].map(type => (
                  <button
                    key={type}
                    onClick={() => updateData(3, 'ataxiaType', type)}
                    className={`py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[3].data.ataxiaType === type
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Other Abnormalities
              </label>
              <div className="space-y-2">
                {[
                  { id: 'hypermetria', label: 'Hypermetria' },
                  { id: 'hypometria', label: 'Hypometria' },
                  { id: 'circlingL', label: 'Circling Left' },
                  { id: 'circlingR', label: 'Circling Right' },
                  { id: 'wideBasedStance', label: 'Wide-based Stance' },
                  { id: 'bunnyHopping', label: 'Bunny Hopping' },
                  { id: 'dysmetria', label: 'Dysmetria' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(3, item.id, !sections[3].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[3].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[3].data.notes || ''}
                onChange={(e) => updateData(3, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 4: Menace Response */}
        <ExamSection
          id={4}
          title="Menace Response"
          section={sections[4]}
          toggleSection={() => toggleSection(4)}
          setStatus={(status) => setStatus(4, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Affected Side
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Left Eye', 'Right Eye', 'Both Eyes'].map(side => (
                  <button
                    key={side}
                    onClick={() => updateData(4, 'affectedSide', side)}
                    className={`py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[4].data.affectedSide === side
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[4].data.notes || ''}
                onChange={(e) => updateData(4, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 5: Pupil Evaluation */}
        <ExamSection
          id={5}
          title="Pupil Evaluation"
          section={sections[5]}
          toggleSection={() => toggleSection(5)}
          setStatus={(status) => setStatus(5, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Pupil Findings
              </label>
              <div className="space-y-2">
                {[
                  { id: 'anisocoria', label: 'Anisocoria (unequal pupils)' },
                  { id: 'mydriasisL', label: 'Mydriasis - Left (dilated)' },
                  { id: 'mydriasisR', label: 'Mydriasis - Right (dilated)' },
                  { id: 'miosisL', label: 'Miosis - Left (constricted)' },
                  { id: 'miosisR', label: 'Miosis - Right (constricted)' },
                  { id: 'poorPLRL', label: 'Poor PLR - Left' },
                  { id: 'poorPLRR', label: 'Poor PLR - Right' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(5, item.id, !sections[5].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[5].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[5].data.notes || ''}
                onChange={(e) => updateData(5, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 6: Eye Position & Nystagmus */}
        <ExamSection
          id={6}
          title="Eye Position & Nystagmus"
          section={sections[6]}
          toggleSection={() => toggleSection(6)}
          setStatus={(status) => setStatus(6, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Eye Position
              </label>
              <div className="space-y-2">
                {[
                  { id: 'strabismusL', label: 'Strabismus - Left' },
                  { id: 'strabismusR', label: 'Strabismus - Right' },
                  { id: 'ventrolateralL', label: 'Ventrolateral - Left' },
                  { id: 'ventrolateralR', label: 'Ventrolateral - Right' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(6, item.id, !sections[6].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[6].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Nystagmus
              </label>
              <div className="space-y-2">
                {[
                  { id: 'horizontalNystagmus', label: 'Horizontal Nystagmus' },
                  { id: 'verticalNystagmus', label: 'Vertical Nystagmus' },
                  { id: 'rotaryNystagmus', label: 'Rotary Nystagmus' },
                  { id: 'positionalNystagmus', label: 'Positional Nystagmus' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(6, item.id, !sections[6].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[6].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[6].data.notes || ''}
                onChange={(e) => updateData(6, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 7: Palpebral Reflex */}
        <ExamSection
          id={7}
          title="Palpebral Reflex"
          section={sections[7]}
          toggleSection={() => toggleSection(7)}
          setStatus={(status) => setStatus(7, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Affected Side
              </label>
              <div className="space-y-2">
                {['Left', 'Right', 'Both'].map(side => (
                  <button
                    key={side}
                    onClick={() => updateData(7, 'affectedSide', side)}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[7].data.affectedSide === side
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[7].data.notes || ''}
                onChange={(e) => updateData(7, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 8: Facial Sensation */}
        <ExamSection
          id={8}
          title="Facial Sensation"
          section={sections[8]}
          toggleSection={() => toggleSection(8)}
          setStatus={(status) => setStatus(8, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Affected Side
              </label>
              <div className="space-y-2">
                {['Left', 'Right', 'Both'].map(side => (
                  <button
                    key={side}
                    onClick={() => updateData(8, 'affectedSide', side)}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[8].data.affectedSide === side
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[8].data.notes || ''}
                onChange={(e) => updateData(8, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 9: Jaw & Facial Motor */}
        <ExamSection
          id={9}
          title="Jaw & Facial Motor"
          section={sections[9]}
          toggleSection={() => toggleSection(9)}
          setStatus={(status) => setStatus(9, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Findings
              </label>
              <div className="space-y-2">
                {[
                  { id: 'droppedJaw', label: 'Dropped Jaw' },
                  { id: 'reducedJawTone', label: 'Reduced Jaw Tone' },
                  { id: 'facialParalysisL', label: 'Facial Paralysis - Left' },
                  { id: 'facialParalysisR', label: 'Facial Paralysis - Right' },
                  { id: 'lipDroopL', label: 'Lip Droop - Left' },
                  { id: 'lipDroopR', label: 'Lip Droop - Right' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(9, item.id, !sections[9].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[9].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[9].data.notes || ''}
                onChange={(e) => updateData(9, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 10: Tongue Assessment */}
        <ExamSection
          id={10}
          title="Tongue Assessment"
          section={sections[10]}
          toggleSection={() => toggleSection(10)}
          setStatus={(status) => setStatus(10, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Findings
              </label>
              <div className="space-y-2">
                {[
                  { id: 'deviationL', label: 'Deviation to Left' },
                  { id: 'deviationR', label: 'Deviation to Right' },
                  { id: 'atrophy', label: 'Atrophy' },
                  { id: 'weakness', label: 'Weakness' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(10, item.id, !sections[10].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[10].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[10].data.notes || ''}
                onChange={(e) => updateData(10, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 11: Gag Reflex */}
        <ExamSection
          id={11}
          title="Gag Reflex"
          section={sections[11]}
          toggleSection={() => toggleSection(11)}
          setStatus={(status) => setStatus(11, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Response Level
              </label>
              <div className="space-y-2">
                {['Absent', 'Decreased', 'Hyperactive'].map(level => (
                  <button
                    key={level}
                    onClick={() => updateData(11, 'responseLevel', level)}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[11].data.responseLevel === level
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[11].data.notes || ''}
                onChange={(e) => updateData(11, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 12: Postural Reactions */}
        <ExamSection
          id={12}
          title="Postural Reactions - Proprioceptive Positioning"
          section={sections[12]}
          toggleSection={() => toggleSection(12)}
          setStatus={(status) => setStatus(12, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Affected Limbs
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['LF', 'RF', 'LH', 'RH'].map(limb => (
                  <button
                    key={limb}
                    onClick={() => {
                      const affected = sections[12].data.affectedLimbs || [];
                      const newAffected = affected.includes(limb)
                        ? affected.filter((l: string) => l !== limb)
                        : [...affected, limb];
                      updateData(12, 'affectedLimbs', newAffected);
                    }}
                    className={`py-3 rounded-lg font-medium active:scale-95 transition ${
                      (sections[12].data.affectedLimbs || []).includes(limb)
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {limb}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Severity
              </label>
              <div className="space-y-2">
                {['Mild delay', 'Moderate delay', 'Severe delay', 'Absent'].map(severity => (
                  <button
                    key={severity}
                    onClick={() => updateData(12, 'severity', severity)}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[12].data.severity === severity
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[12].data.notes || ''}
                onChange={(e) => updateData(12, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 13: Thoracic Limb Reflexes */}
        <ExamSection
          id={13}
          title="Thoracic Limb Reflexes - Withdrawal"
          section={sections[13]}
          toggleSection={() => toggleSection(13)}
          setStatus={(status) => setStatus(13, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Left Forelimb
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Decreased', 'Normal', 'Increased'].map(level => (
                  <button
                    key={level}
                    onClick={() => updateData(13, 'leftForelimb', level)}
                    className={`py-3 px-2 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[13].data.leftForelimb === level
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Right Forelimb
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Decreased', 'Normal', 'Increased'].map(level => (
                  <button
                    key={level}
                    onClick={() => updateData(13, 'rightForelimb', level)}
                    className={`py-3 px-2 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[13].data.rightForelimb === level
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[13].data.notes || ''}
                onChange={(e) => updateData(13, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 14: Pelvic Limb Reflexes */}
        <ExamSection
          id={14}
          title="Pelvic Limb Reflexes - Patellar"
          section={sections[14]}
          toggleSection={() => toggleSection(14)}
          setStatus={(status) => setStatus(14, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Left Hindlimb
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Decreased', 'Normal', 'Increased'].map(level => (
                  <button
                    key={level}
                    onClick={() => updateData(14, 'leftHindlimb', level)}
                    className={`py-3 px-2 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[14].data.leftHindlimb === level
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Right Hindlimb
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Decreased', 'Normal', 'Increased'].map(level => (
                  <button
                    key={level}
                    onClick={() => updateData(14, 'rightHindlimb', level)}
                    className={`py-3 px-2 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[14].data.rightHindlimb === level
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[14].data.notes || ''}
                onChange={(e) => updateData(14, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 15: Perineal & Anal */}
        <ExamSection
          id={15}
          title="Perineal & Anal"
          section={sections[15]}
          toggleSection={() => toggleSection(15)}
          setStatus={(status) => setStatus(15, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Findings
              </label>
              <div className="space-y-2">
                {[
                  { id: 'decreased', label: 'Decreased Reflex' },
                  { id: 'absent', label: 'Absent Reflex' },
                  { id: 'toneLoss', label: 'Loss of Anal Tone' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(15, item.id, !sections[15].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[15].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[15].data.notes || ''}
                onChange={(e) => updateData(15, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 16: Palpation */}
        <ExamSection
          id={16}
          title="Palpation - Spine & Paraspinal"
          section={sections[16]}
          toggleSection={() => toggleSection(16)}
          setStatus={(status) => setStatus(16, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Pain Location
              </label>
              <div className="space-y-2">
                {[
                  { id: 'cervicalPain', label: 'Cervical Pain' },
                  { id: 'thoracicPain', label: 'Thoracic Pain' },
                  { id: 'lumbarPain', label: 'Lumbar Pain' },
                  { id: 'lumbosacralPain', label: 'Lumbosacral Pain' },
                  { id: 'paraspinalPain', label: 'Paraspinal Muscle Pain' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(16, item.id, !sections[16].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[16].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[16].data.notes || ''}
                onChange={(e) => updateData(16, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Specific vertebrae, severity, etc..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 17: Limb Palpation */}
        <ExamSection
          id={17}
          title="Limb Palpation"
          section={sections[17]}
          toggleSection={() => toggleSection(17)}
          setStatus={(status) => setStatus(17, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Muscle Atrophy
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['LF', 'RF', 'LH', 'RH'].map(limb => (
                  <button
                    key={limb}
                    onClick={() => {
                      const atrophy = sections[17].data.muscleAtrophy || [];
                      const newAtrophy = atrophy.includes(limb)
                        ? atrophy.filter((l: string) => l !== limb)
                        : [...atrophy, limb];
                      updateData(17, 'muscleAtrophy', newAtrophy);
                    }}
                    className={`py-3 rounded-lg font-medium active:scale-95 transition ${
                      (sections[17].data.muscleAtrophy || []).includes(limb)
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {limb}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Other Findings
              </label>
              <div className="space-y-2">
                {[
                  { id: 'jointSwelling', label: 'Joint Swelling' },
                  { id: 'painOnPalpation', label: 'Pain on Palpation' },
                  { id: 'decreasedROM', label: 'Decreased Range of Motion' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(17, item.id, !sections[17].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[17].data[item.id]
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[17].data.notes || ''}
                onChange={(e) => updateData(17, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Specific joints, muscles affected..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 18: Nociception - Special warning section */}
        <ExamSection
          id={18}
          title="Nociception ⚠️"
          section={sections[18]}
          toggleSection={() => toggleSection(18)}
          setStatus={(status) => setStatus(18, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-red-800">
                  <strong>Critical Assessment:</strong> Absence of nociception indicates severe spinal cord injury and poor prognosis.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Affected Limbs/Areas
              </label>
              <div className="space-y-2">
                {[
                  { id: 'lf', label: 'LF - Absent' },
                  { id: 'rf', label: 'RF - Absent' },
                  { id: 'lh', label: 'LH - Absent' },
                  { id: 'rh', label: 'RH - Absent' },
                  { id: 'tail', label: 'Tail - Absent' },
                  { id: 'perineum', label: 'Perineum - Absent' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => updateData(18, item.id, !sections[18].data[item.id])}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-medium text-left active:scale-95 transition ${
                      sections[18].data[item.id]
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[18].data.notes || ''}
                onChange={(e) => updateData(18, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>
      </div>

      {/* Sticky Footer with safe area support */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-purple-500/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg shadow-purple-500/20">
        <motion.button
          onClick={handleComplete}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 via-purple-600 to-fuchsia-600 text-white rounded-xl font-medium text-lg"
          style={{
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(217, 70, 239, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.2)',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
          }}
        >
          Complete Exam ({completed}/{total})
        </motion.button>
      </div>
    </div>
  );
}

// Reusable Section Component
interface ExamSectionProps {
  id: number;
  title: string;
  section: SectionData;
  toggleSection: () => void;
  setStatus: (status: 'normal' | 'abnormal') => void;
  getStatusIcon: (status: 'normal' | 'abnormal' | null) => JSX.Element;
  children?: React.ReactNode;
}

function ExamSection({
  id,
  title,
  section,
  toggleSection,
  setStatus,
  getStatusIcon,
  children
}: ExamSectionProps) {
  const borderColor = section.status === 'normal' ? 'border-l-emerald-400' :
                      section.status === 'abnormal' ? 'border-l-fuchsia-400' :
                      'border-l-purple-500/30';

  const glowStyle = section.status
    ? { boxShadow: '0 0 30px rgba(168, 85, 247, 0.3), inset 0 0 30px rgba(168, 85, 247, 0.1)' }
    : { boxShadow: '0 0 15px rgba(168, 85, 247, 0.15)' };

  return (
    <motion.div
      className={`bg-slate-900/50 backdrop-blur-sm rounded-2xl overflow-hidden border-l-4 ${borderColor} border border-purple-500/20`}
      style={glowStyle}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        onClick={toggleSection}
        className="w-full p-4 flex items-center justify-between hover:bg-purple-900/20 transition-colors"
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: section.expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {section.expanded ?
              <ChevronDown size={20} className="text-purple-300" /> :
              <ChevronRight size={20} className="text-purple-300" />
            }
          </motion.div>
          <span className="font-medium text-left text-purple-50" style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.3)' }}>
            {id}. {title}
          </span>
        </div>
        {getStatusIcon(section.status)}
      </motion.button>

      <div className="px-4 pb-4">
        {/* Pill-shaped toggle */}
        <div className="relative bg-slate-800/50 rounded-full p-1 mb-3" style={{ boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)' }}>
          <div className="grid grid-cols-2 relative">
            {/* Sliding indicator */}
            <motion.div
              className="absolute top-1 bottom-1 left-1 right-1/2 rounded-full"
              style={{
                background: section.status === 'normal'
                  ? 'linear-gradient(135deg, #10b981 0%, #a855f7 100%)'
                  : section.status === 'abnormal'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d946ef 100%)'
                  : 'transparent',
                boxShadow: section.status
                  ? '0 0 20px rgba(168, 85, 247, 0.6), 0 0 40px rgba(217, 70, 239, 0.4)'
                  : 'none'
              }}
              animate={{
                x: section.status === 'abnormal' ? '100%' : '0%',
                opacity: section.status ? 1 : 0
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />

            {/* Normal button */}
            <motion.button
              onClick={() => setStatus('normal')}
              className={`relative z-10 py-3 rounded-full font-medium transition-colors ${
                section.status === 'normal'
                  ? 'text-white'
                  : 'text-purple-300'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              Normal
            </motion.button>

            {/* Abnormal button */}
            <motion.button
              onClick={() => setStatus('abnormal')}
              className={`relative z-10 py-3 rounded-full font-medium transition-colors ${
                section.status === 'abnormal'
                  ? 'text-white'
                  : 'text-purple-300'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              Abnormal
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {section.expanded && section.status === 'abnormal' && (
            <motion.div
              className="pt-3 border-t border-purple-500/20"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
