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

function getDischargeProtocol(weight: number): string {
  if (weight < 7) {
    return `<7kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1/2 tablet by mouth every 12 hours for 7 days, then give 1/2 tablet by mouth every 24 hours for 7 days, then give 1/2 tablet by mouth every 48 hours for 7 doses.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1/2 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 50mg tablets - Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/4 tablet by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

5) Hemp 3.8mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

6) Clavamox 62.5mg tablets - Give 1 tablet by mouth every 12 hours until finished.
   **Next dose due at 8pm tonight**`;
  } else if (weight >= 7 && weight <= 9) {
    return `7-9kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1 tablet by mouth every 12 hours for 7 days, then give 1 tablet by mouth every 24 hours for 7 days, then give 1 tablet by mouth every 48 hours for 7 doses.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1/2 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/4 tablet by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

5) Hemp 3.8mg capsules - Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

6) Clavamox 125mg Tablets - Give 1 tablet every 12 hours until gone
   **Next dose due at 8pm tonight**`;
  } else if (weight >= 10 && weight <= 12) {
    return `10-12kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1 tablet by mouth every 12 hours for 7 days, then give 1 tablet by mouth every 24 hours for 7 days, then give 1 tablet by mouth every 48 hours for 7 doses.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

5) Hemp 11.3mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

6) Cephalexin 250mg capsules - Give 1 capsule by mouth every 12 hours until finished.
   **Next dose due at 8pm tonight**`;
  } else if (weight >= 13 && weight <= 15) {
    return `13-15kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1.5 tablets by mouth every 12 hours for 7 days, then give 1.5 tablets by mouth every 24 hours for 7 days, then give 1.5 tablets by mouth every 48 hours for 7 doses.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

5) Hemp 11.3mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

6) Cephalexin 250mg tablets - Give 1 tablet by mouth every 12 hours until finished.
   **Next dose due at 8pm tonight**`;
  } else if (weight >= 16 && weight <= 20) {
    return `16-20kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1.5 tablets by mouth every 12 hours for 7 days, then give 1.5 tablets by mouth every 24 hours for 7 days, then give 1.5 tablets by mouth every 48 hours for 7 doses.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tonight**

3) Gabapentin 100mg capsules - Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

5) Hemp 11.3mg capsules - Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

6) Cephalexin 250mg capsule - Give 1 capsule by mouth every 12 hours until finished.
   **Next dose due at 8pm tonight**`;
  } else if (weight >= 21 && weight <= 26) {
    return `21-26kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 2 tablets by mouth every 12 hours for 7 days, then give 2 tablets by mouth every 24 hours for 7 days, then give 2 tablets by mouth every 48 hours for 7 doses.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

5) Hemp 11.3mg capsules - Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

6) Cephalexin 500mg capsule - Give 1 capsule by mouth every 12 hours until finished.
   **Next dose due at 8pm tonight**`;
  } else if (weight >= 27 && weight <= 30) {
    return `27-30kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 2 tablets by mouth every 12 hours for 7 days, then give 2 tablets by mouth every 24 hours for 7 days, then give 2 tablets by mouth every 48 hours for 7 doses.
   **Next dose due at 8pm tonight**

2) Famotidine 20mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

5) Hemp 28mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

6) Clavamox 375mg tablet - Give 1 tablet by mouth every 12 hours until finished.
   **Next dose due at 8pm tonight**`;
  } else if (weight >= 31 && weight <= 39) {
    return `31-39kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 2.5 tablets by mouth every 12 hours for 7 days, then give 2.5 tablets by mouth every 24 hours for 7 days, then give 2.5 tablets by mouth every 48 hours for 7 doses.
   **Next dose due at 8pm tonight**

2) Famotidine 20mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1.5-2 tablets by mouth every 8-12 hours for pain until otherwise advised.
   **Next dose due at 4pm tonight**

5) Hemp 28mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

6) Cephalexin 500mg capsule - Give 2 capsules by mouth every 12 hours until finished.
   **Next dose due at 8pm tonight**`;
  } else if (weight >= 40 && weight <= 54) {
    return `40-54kg DISCHARGE MEDICATIONS:

5) Hemp 37.5mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 37.5mg capsules - Give 3 capsules by mouth every 12 hours. (Brain)
   **Next dose due at 8pm tonight**`;
  } else {
    return `>55kg DISCHARGE MEDICATIONS:

5) Hemp 37.5mg capsules - Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules every 12 hours. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 37.5mg capsules - Give 4 capsules by mouth every 12 hours. (Brain)
   **Next dose due at 8pm tonight**`;
  }
}

export function PillCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'pills' | 'cocktail'>('pills');
  const [days, setDays] = useState(7);
  const [frequency, setFrequency] = useState('bid');
  const [doseAmount, setDoseAmount] = useState(1);
  const [weight, setWeight] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { days: d, frequency: f, doseAmount: a, tab: t, weight: w } = JSON.parse(saved);
        if (d) setDays(d);
        if (f) setFrequency(f);
        if (a) setDoseAmount(a);
        if (t) setTab(t);
        if (w) setWeight(w);
      } catch {}
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ days, frequency, doseAmount, tab, weight }));
  }, [days, frequency, doseAmount, tab, weight]);

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
              className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-4">
                {/* Handle + Close */}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-1 bg-slate-700 rounded-full" />
                  <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTab('pills')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                      tab === 'pills' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Pills
                  </button>
                  <button
                    onClick={() => setTab('cocktail')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                      tab === 'cocktail' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Cocktail
                  </button>
                </div>

                {tab === 'pills' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    {/* Weight input */}
                    <div className="mb-4">
                      <label className="text-sm text-slate-400 mb-2 block">Weight (kg)</label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Enter weight..."
                        className="w-full h-12 px-4 text-xl font-bold bg-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                        step="0.1"
                      />
                    </div>

                    {/* Quick weights */}
                    <div className="flex gap-1 mb-4">
                      {[5, 10, 15, 20, 25, 30].map(w => (
                        <button
                          key={w}
                          onClick={() => setWeight(w.toString())}
                          className={`flex-1 py-1.5 rounded text-sm font-medium ${
                            weight === w.toString() ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>

                    {/* Protocol output */}
                    {weight && (
                      <div className="bg-slate-800 rounded-xl p-4 max-h-[40vh] overflow-y-auto">
                        <div className="text-pink-300 font-bold mb-2">{parseFloat(weight)}kg Protocol</div>
                        <pre className="text-slate-300 text-xs whitespace-pre-wrap font-sans">
                          {getDischargeProtocol(parseFloat(weight))}
                        </pre>
                      </div>
                    )}
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
