'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FREQUENCIES = [
  { id: 'sid', label: 'SID', mult: 1 },
  { id: 'bid', label: 'BID', mult: 2 },
  { id: 'tid', label: 'TID', mult: 3 },
  { id: 'eod', label: 'EOD', mult: 0.5 },
];

const DOSES = [0.25, 0.5, 1, 1.5, 2, 2.5, 3];
const DAYS = [7, 14, 21, 30, 60];

const STORAGE_KEY = 'vethub-calc';

export function PillCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'simple' | 'taper'>('simple');
  const [days, setDays] = useState(7);
  const [freq, setFreq] = useState('bid');
  const [dose, setDose] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.mode) setMode(data.mode);
        if (data.days) setDays(data.days);
        if (data.freq) setFreq(data.freq);
        if (data.dose) setDose(data.dose);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, days, freq, dose }));
  }, [mode, days, freq, dose]);

  // Keyboard: Ctrl+Shift+P (avoid Cmd+P print conflict)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const freqMult = FREQUENCIES.find(f => f.id === freq)?.mult || 1;
  const simpleDoses = freq === 'eod' ? Math.ceil(days / 2) : days * freqMult;
  const simpleTotal = simpleDoses * dose;

  // Taper: 7d BID + 7d SID + 7 doses EOD = 14 + 7 + 7 = 28 doses
  const taperTotal = 28 * dose;

  const fmt = (n: number) => {
    if (n === Math.floor(n)) return n.toString();
    const w = Math.floor(n);
    const f = +(n - w).toFixed(2);
    if (f === 0.25) return w ? `${w}¼` : '¼';
    if (f === 0.5) return w ? `${w}½` : '½';
    if (f === 0.75) return w ? `${w}¾` : '¾';
    return n.toFixed(1);
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 w-11 h-11 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center z-40"
        whileTap={{ scale: 0.9 }}
      >
        <Calculator size={18} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="fixed right-4 bottom-20 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                <div className="flex gap-1">
                  <button
                    onClick={() => setMode('simple')}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      mode === 'simple' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setMode('taper')}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      mode === 'taper' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Taper
                  </button>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="p-3">
                {mode === 'simple' ? (
                  <>
                    {/* Days */}
                    <div className="flex gap-1 mb-2">
                      {DAYS.map(d => (
                        <button
                          key={d}
                          onClick={() => setDays(d)}
                          className={`flex-1 py-1 rounded text-xs font-medium ${
                            days === d ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>

                    {/* Frequency */}
                    <div className="flex gap-1 mb-2">
                      {FREQUENCIES.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setFreq(f.id)}
                          className={`flex-1 py-1 rounded text-xs font-medium ${
                            freq === f.id ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Dose */}
                    <div className="flex gap-1 mb-3">
                      {DOSES.map(d => (
                        <button
                          key={d}
                          onClick={() => setDose(d)}
                          className={`flex-1 py-1 rounded text-xs font-medium ${
                            dose === d ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {d === 0.25 ? '¼' : d === 0.5 ? '½' : d}
                        </button>
                      ))}
                    </div>

                    {/* Result */}
                    <div className={`rounded-lg p-2 text-center ${
                      simpleTotal === Math.floor(simpleTotal) ? 'bg-emerald-900/50' : 'bg-amber-900/50'
                    }`}>
                      <div className={`text-2xl font-bold ${
                        simpleTotal === Math.floor(simpleTotal) ? 'text-emerald-300' : 'text-amber-300'
                      }`}>
                        {fmt(simpleTotal)}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {fmt(dose)} × {simpleDoses} doses
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Taper: just pick dose */}
                    <div className="text-xs text-slate-400 mb-2">Tablets per dose:</div>
                    <div className="flex gap-1 mb-3">
                      {DOSES.map(d => (
                        <button
                          key={d}
                          onClick={() => setDose(d)}
                          className={`flex-1 py-1.5 rounded text-xs font-medium ${
                            dose === d ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {d === 0.25 ? '¼' : d === 0.5 ? '½' : d}
                        </button>
                      ))}
                    </div>

                    {/* Taper breakdown */}
                    <div className="text-xs text-slate-500 space-y-0.5 mb-2">
                      <div>7d BID = 14 × {fmt(dose)}</div>
                      <div>7d SID = 7 × {fmt(dose)}</div>
                      <div>7 EOD = 7 × {fmt(dose)}</div>
                    </div>

                    {/* Result */}
                    <div className={`rounded-lg p-2 text-center ${
                      taperTotal === Math.floor(taperTotal) ? 'bg-emerald-900/50' : 'bg-amber-900/50'
                    }`}>
                      <div className={`text-2xl font-bold ${
                        taperTotal === Math.floor(taperTotal) ? 'text-emerald-300' : 'text-amber-300'
                      }`}>
                        {fmt(taperTotal)}
                      </div>
                      <div className="text-slate-500 text-xs">
                        28 doses × {fmt(dose)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
