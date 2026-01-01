'use client';

import { useState, useRef, useEffect } from 'react';

interface FoodCalculatorPopoverProps {
  weightKg: number | string | undefined;
  patientName?: string;
}

// Food options with kcal per 100g
const FOOD_OPTIONS = [
  { name: 'Chicken & Rice', kcalPer100g: 118, emoji: '🍗' },
  { name: 'RC GI LF Dry', kcalPer100g: 321, emoji: '🥣' },
] as const;

export function FoodCalculatorPopover({ weightKg, patientName }: FoodCalculatorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse weight
  const weight = typeof weightKg === 'string'
    ? parseFloat(weightKg.replace(/[^\d.]/g, ''))
    : (weightKg || 0);

  // Calculate 50% RER
  const rer = weight > 0 ? Math.pow(weight, 0.75) * 70 : 0;
  const targetKcal = rer * 0.5; // 50% RER

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (weight <= 0) {
    return (
      <span
        className="cursor-not-allowed opacity-50"
        title="No weight recorded"
      >
        🍽️
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-lg hover:scale-110 transition-transform cursor-pointer"
        title={`Food calculator for ${patientName || 'patient'}`}
      >
        🍽️
      </button>

      {isOpen && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
          style={{ minWidth: '220px' }}
        >
          {/* Arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />

          <div className="text-xs text-gray-500 mb-2 text-center">
            50% RER ({weight}kg) = <span className="font-bold text-emerald-700">{targetKcal.toFixed(0)} kcal</span>
          </div>

          <div className="space-y-2">
            {FOOD_OPTIONS.map((food) => {
              const gramsNeeded = (targetKcal / food.kcalPer100g) * 100;
              const gramsPerMeal = gramsNeeded / 4;
              return (
                <div
                  key={food.name}
                  className="bg-gray-50 rounded-md p-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{food.emoji}</span>
                    <span className="text-xs text-gray-700">{food.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-700">
                      {gramsNeeded.toFixed(0)}g/day
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {gramsPerMeal.toFixed(0)}g × 4
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
