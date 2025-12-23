'use client';

import React, { useState } from 'react';
import { Calculator, Plus, Minus, Copy, Check, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const FREQUENCIES = [
  { id: 'sid', label: 'SID', sublabel: 'q24h', multiplier: 1 },
  { id: 'bid', label: 'BID', sublabel: 'q12h', multiplier: 2 },
  { id: 'tid', label: 'TID', sublabel: 'q8h', multiplier: 3 },
  { id: 'eod', label: 'EOD', sublabel: 'q48h', multiplier: 0.5 },
];

const DOSE_AMOUNTS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5];

function PillCalculatorCard() {
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
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
          <Calculator className="text-white" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Pill Calculator</h2>
          <p className="text-sm text-slate-400">Calculate total pills for dispensing</p>
        </div>
      </div>

      {/* Days Input */}
      <div className="mb-5">
        <label className="text-sm text-slate-400 mb-2 block">Days</label>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => adjustDays(-1)}
            className="w-12 h-12 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-600"
            whileTap={{ scale: 0.9 }}
          >
            <Minus size={20} />
          </motion.button>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
            className="flex-1 h-12 text-center text-2xl font-bold bg-slate-700 border border-slate-600 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
          />
          <motion.button
            onClick={() => adjustDays(1)}
            className="w-12 h-12 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-600"
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
                  : 'bg-slate-700 text-slate-400 hover:text-white'
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
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
        className="w-full mt-4 py-3 rounded-xl bg-slate-700 text-white font-medium flex items-center justify-center gap-2 hover:bg-slate-600"
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
  );
}

export default function ReferencePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-white">Reference Tools</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <PillCalculatorCard />

          {/* Placeholder for future tools */}
          <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50 border-dashed flex items-center justify-center min-h-[300px]">
            <p className="text-slate-500 text-sm">More tools coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
