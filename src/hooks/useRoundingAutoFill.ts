'use client';

import { useState, useCallback, useRef } from 'react';
import { carryForwardRoundingData, type CarryForwardResult } from '@/lib/rounding-carry-forward';
import { autoFillRoundingData } from '@/lib/rounding-auto-fill';
import type { Patient, RoundingData, RoundingFieldKey } from '@/types/rounding';

interface UseRoundingAutoFillReturn {
  autoFilledFields: Record<number, Set<string>>;
  carryForwardResults: Record<number, CarryForwardResult>;
  initialize: (
    patients: Patient[],
    setEditingData: React.Dispatch<React.SetStateAction<Record<number, RoundingData>>>
  ) => void;
  clearAutoFillFlag: (patientId: number, field: RoundingFieldKey) => void;
  isInitialized: boolean;
}

/**
 * Hook for managing auto-fill and carry-forward functionality
 * Pre-fills rounding data from demographics and previous day's data
 */
export function useRoundingAutoFill(): UseRoundingAutoFillReturn {
  const [autoFilledFields, setAutoFilledFields] = useState<Record<number, Set<string>>>({});
  const [carryForwardResults, setCarryForwardResults] = useState<Record<number, CarryForwardResult>>({});
  const initialized = useRef(false);

  // Initialize auto-fill for all patients
  const initialize = useCallback((
    patients: Patient[],
    setEditingData: React.Dispatch<React.SetStateAction<Record<number, RoundingData>>>
  ) => {
    // Only run once
    if (initialized.current) return;
    if (patients.length === 0) return;

    initialized.current = true;

    const activePatients = patients.filter(p => p.status !== 'Discharged');
    const newCarryForwardResults: Record<number, CarryForwardResult> = {};
    const newEditingData: Record<number, RoundingData> = {};
    const newAutoFilledFields: Record<number, Set<string>> = {};

    activePatients.forEach((patient) => {
      const previousData = patient.roundingData || patient.rounding_data;

      // Step 1: Carry forward from yesterday
      const carryResult = carryForwardRoundingData(previousData);
      newCarryForwardResults[patient.id] = carryResult;

      // Step 2: Auto-fill from demographics
      const autoFillResult = autoFillRoundingData({
        demographics: patient.demographics,
        currentStay: patient.currentStay,
        roundingData: previousData,
      });

      // Merge carry-forward and auto-fill data
      const mergedData: RoundingData = {
        ...carryResult.data,
        ...autoFillResult, // Auto-fill takes precedence
      };

      // Track which fields were auto-filled
      const autoFields = new Set<string>([
        ...autoFillResult.autoFilledFields,
        ...autoFillResult.carriedForwardFields,
      ]);
      newAutoFilledFields[patient.id] = autoFields;

      // Only pre-fill if data was carried forward or auto-filled
      if (carryResult.carriedForward || autoFields.size > 0) {
        newEditingData[patient.id] = mergedData;
      }
    });

    setCarryForwardResults(newCarryForwardResults);
    setAutoFilledFields(newAutoFilledFields);
    setEditingData(newEditingData);
  }, []);

  // Clear auto-fill flag when user manually edits a field
  const clearAutoFillFlag = useCallback((patientId: number, field: RoundingFieldKey) => {
    setAutoFilledFields(prev => {
      const newFields = { ...prev };
      if (newFields[patientId]) {
        const updated = new Set(newFields[patientId]);
        updated.delete(field);
        newFields[patientId] = updated;
      }
      return newFields;
    });
  }, []);

  return {
    autoFilledFields,
    carryForwardResults,
    initialize,
    clearAutoFillFlag,
    isInitialized: initialized.current,
  };
}
