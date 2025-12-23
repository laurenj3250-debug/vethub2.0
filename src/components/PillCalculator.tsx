'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FREQUENCIES = [
  { id: 'sid', label: 'SID', multiplier: 1 },
  { id: 'bid', label: 'BID', multiplier: 2 },
  { id: 'tid', label: 'TID', multiplier: 3 },
  { id: 'eod', label: 'EOD', multiplier: 0.5 },
];

const DOSE_AMOUNTS = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

const STORAGE_KEY = 'pillCalc';

export function PillCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [frequency, setFrequency] = useState('bid');
  const [doseAmount, setDoseAmount] = useState(1);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { days: d, frequency: f, doseAmount: a } = JSON.parse(saved);
        if (d) setDays(d);
        if (f) setFrequency(f);
        if (a) setDoseAmount(a);
      } catch {}
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ days, frequency, doseAmount }));
  }, [days, frequency, doseAmount]);

  // Keyboard shortcut: Cmd/Ctrl + P
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedFreq = FREQUENCIES.find(f => f.id === frequency)!;
  const totalDoses = frequency === 'eod' ? Math.ceil(days / 2) : days * selectedFreq.multiplier;
  const totalPills = totalDoses * doseAmount;
  const isWhole = totalPills === Math.floor(totalPills);

  const formatPills = (n: number) => {
    if (n === Math.floor(n)) return n.toString();
    const whole = Math.floor(n);
    const frac = +(n - whole).toFixed(3);
    if (frac === 0.125) return whole > 0 ? `${whole}⅛` : '⅛';
    if (frac === 0.25) return whole > 0 ? `${whole}¼` : '¼';
    if (frac === 0.5) return whole > 0 ? `${whole}½` : '½';
    if (frac === 0.75) return whole > 0 ? `${whole}¾` : '¾';
    return n.toFixed(2);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bottom-4 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center z-40"
        whileTap={{ scale: 0.9 }}
      >
        <Calculator size={20} />
      </motion.button>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl z-50"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-4">
                {/* Handle + Close */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-1 bg-slate-700 rounded-full" />
                  <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                {/* Days */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setDays(d => Math.max(1, d - 1))}
                    className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center"
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-10 text-center text-xl font-bold bg-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setDays(d => d + 1)}
                    className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center"
                  >
                    <Plus size={18} />
                  </button>
                  <span className="text-slate-400 text-sm w-12">days</span>
                </div>

                {/* Quick days */}
                <div className="flex gap-1 mb-4">
                  {[5, 7, 10, 14, 21, 30].map(d => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`flex-1 py-1.5 rounded text-sm font-medium ${
                        days === d ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {/* Frequency */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {FREQUENCIES.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFrequency(f.id)}
                      className={`py-2 rounded-lg text-sm font-bold ${
                        frequency === f.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Dose amounts */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {DOSE_AMOUNTS.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setDoseAmount(amt)}
                      className={`px-2.5 py-1.5 rounded text-sm font-medium ${
                        doseAmount === amt ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {amt === 0.125 ? '⅛' : amt === 0.25 ? '¼' : amt === 0.5 ? '½' : amt === 0.75 ? '¾' : amt}
                    </button>
                  ))}
                </div>

                {/* Result */}
                <div className={`p-4 rounded-xl text-center ${isWhole ? 'bg-emerald-900/50' : 'bg-amber-900/40'}`}>
                  <div className={`text-5xl font-bold ${isWhole ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {formatPills(totalPills)}
                  </div>
                  <div className="text-slate-400 text-sm mt-1">
                    {formatPills(doseAmount)} × {totalDoses} doses
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
