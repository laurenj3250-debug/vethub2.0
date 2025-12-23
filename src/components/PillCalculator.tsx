'use client';

import React, { useState } from 'react';
import { Calculator, X, Plus, Minus, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PillCalculatorProps {
  position?: 'left' | 'right';
  className?: string;
}

const FREQUENCIES = [
  { id: 'sid', label: 'SID', sublabel: 'q24h', multiplier: 1 },
  { id: 'bid', label: 'BID', sublabel: 'q12h', multiplier: 2 },
  { id: 'tid', label: 'TID', sublabel: 'q8h', multiplier: 3 },
  { id: 'eod', label: 'EOD', sublabel: 'q48h', multiplier: 0.5 },
];

const DOSE_AMOUNTS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5];

export function PillCalculator({ position = 'left', className = '' }: PillCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [frequency, setFrequency] = useState('bid');
  const [doseAmount, setDoseAmount] = useState(1);
  const [copied, setCopied] = useState(false);

  const selectedFreq = FREQUENCIES.find(f => f.id === frequency)!;
  const totalDoses = frequency === 'eod' ? Math.ceil(days / 2) : days * selectedFreq.multiplier;
  const totalPills = totalDoses * doseAmount;
  const isWholePills = totalPills === Math.floor(totalPills);

  const adjustDays = (delta: number) => {
    setDays(prev => Math.max(1, Math.min(365, prev + delta)));
  };

  const copyResult = () => {
    const freqLabel = `${selectedFreq.label} (${selectedFreq.sublabel})`;
    const doseLabel = doseAmount === 0.25 ? '¼' : doseAmount === 0.5 ? '½' : doseAmount === 0.75 ? '¾' : doseAmount;
    const text = `${totalPills} pills total (${doseLabel} tab ${freqLabel} × ${days} days)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPillCount = (count: number) => {
    if (count === Math.floor(count)) return count.toString();
    const whole = Math.floor(count);
    const frac = count - whole;
    if (frac === 0.25) return whole > 0 ? `${whole}¼` : '¼';
    if (frac === 0.5) return whole > 0 ? `${whole}½` : '½';
    if (frac === 0.75) return whole > 0 ? `${whole}¾` : '¾';
    return count.toFixed(2);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed ${position === 'left' ? 'left-4' : 'right-4'} bottom-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center z-40 ${className}`}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        title="Pill Calculator"
      >
        <Calculator size={22} />
      </motion.button>

      {/* Bottom Sheet Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-4 pb-8">
                {/* Handle */}
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calculator className="text-cyan-400" size={20} />
                    <h3 className="text-lg font-semibold text-cyan-200">Pill Calculator</h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Days Input */}
                <div className="mb-5">
                  <label className="text-sm text-slate-400 mb-2 block">Days</label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => adjustDays(-1)}
                      className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Minus size={20} />
                    </motion.button>
                    <input
                      type="number"
                      value={days}
                      onChange={(e) => setDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                      className="flex-1 h-12 text-center text-2xl font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                    />
                    <motion.button
                      onClick={() => adjustDays(1)}
                      className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Plus size={20} />
                    </motion.button>
                  </div>
                  {/* Quick day buttons */}
                  <div className="flex gap-2 mt-2">
                    {[5, 7, 10, 14, 21, 30].map(d => (
                      <motion.button
                        key={d}
                        onClick={() => setDays(d)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          days === d
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {d}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div className="mb-5">
                  <label className="text-sm text-slate-400 mb-2 block">Frequency</label>
                  <div className="grid grid-cols-4 gap-2">
                    {FREQUENCIES.map(freq => (
                      <motion.button
                        key={freq.id}
                        onClick={() => setFrequency(freq.id)}
                        className={`py-3 rounded-xl text-center transition-colors ${
                          frequency === freq.id
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="text-sm font-bold">{freq.label}</div>
                        <div className="text-xs opacity-70">{freq.sublabel}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Amount per dose */}
                <div className="mb-6">
                  <label className="text-sm text-slate-400 mb-2 block">Tablets per dose</label>
                  <div className="flex flex-wrap gap-2">
                    {DOSE_AMOUNTS.map(amt => (
                      <motion.button
                        key={amt}
                        onClick={() => setDoseAmount(amt)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          doseAmount === amt
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {amt === 0.25 ? '¼' : amt === 0.5 ? '½' : amt === 0.75 ? '¾' : amt}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Result */}
                <motion.div
                  className={`p-4 rounded-2xl ${
                    isWholePills
                      ? 'bg-emerald-900/40 border border-emerald-700/50'
                      : 'bg-amber-900/30 border border-amber-700/50'
                  }`}
                  layout
                >
                  <div className="text-center">
                    <div className="text-sm text-slate-400 mb-1">Total Pills Needed</div>
                    <div className={`text-5xl font-bold mb-2 ${
                      isWholePills ? 'text-emerald-300' : 'text-amber-300'
                    }`}>
                      {formatPillCount(totalPills)}
                    </div>
                    <div className="text-sm text-slate-400">
                      {formatPillCount(doseAmount)} {doseAmount === 1 ? 'tablet' : 'tablets'} × {totalDoses} doses
                    </div>
                    {!isWholePills && (
                      <div className="text-xs text-amber-400 mt-2">
                        Fractional tablets required
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Copy Button */}
                <motion.button
                  onClick={copyResult}
                  className="w-full mt-4 py-3 rounded-xl bg-slate-800 text-white font-medium flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.98 }}
                >
                  {copied ? (
                    <>
                      <Check size={18} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      <span>Copy Result</span>
                    </>
                  )}
                </motion.button>

                {/* Reference Note */}
                <p className="text-xs text-slate-500 text-center mt-4">
                  Consider extra pills for: missed doses, dose adjustments, or refill timing
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default PillCalculator;
