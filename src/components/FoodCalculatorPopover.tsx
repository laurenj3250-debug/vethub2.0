'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FoodCalculatorPopoverProps {
  weightKg: number | string | undefined;
  species: string | undefined;
  patientName?: string;
}

// Food options with kcal per 100g
const FOOD_OPTIONS = [
  { name: 'Chicken & Rice', kcalPer100g: 118, emoji: '🍗' },
  { name: 'RC GI LF Dry', kcalPer100g: 321, emoji: '🥣' },
] as const;

export function FoodCalculatorPopover({ weightKg, species, patientName }: FoodCalculatorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Hide for cats only (show for dogs and when species is unknown/not set)
  const speciesLower = species?.toLowerCase() || '';
  const isCat = speciesLower.includes('feline') || speciesLower.includes('cat');

  // Parse weight
  const weight = typeof weightKg === 'string'
    ? parseFloat(weightKg.replace(/[^\d.]/g, ''))
    : (weightKg || 0);

  // Calculate 50% RER
  const rer = weight > 0 ? Math.pow(weight, 0.75) * 70 : 0;
  const targetKcal = rer * 0.5; // 50% RER

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // Position above the button
        left: rect.left + rect.width / 2, // Center horizontally
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on scroll
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  // Don't render for cats
  if (isCat) {
    return null;
  }

  // Show disabled state if no weight
  if (weight <= 0) {
    return (
      <button
        className="p-1.5 rounded-lg opacity-50 cursor-not-allowed"
        style={{ backgroundColor: '#FEF3C7', border: '1.5px solid #000' }}
        title="No weight recorded - add weight to enable"
        disabled
      >
        <span className="text-sm">🍽️</span>
      </button>
    );
  }

  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed z-[99999] w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        minWidth: '220px',
      }}
      onClick={(e) => e.stopPropagation()}
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
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg transition hover:-translate-y-0.5"
        style={{ backgroundColor: '#FEF3C7', border: '1.5px solid #000' }}
        title={`Food calculator for ${patientName || 'patient'}`}
      >
        <span className="text-sm">🍽️</span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  );
}
