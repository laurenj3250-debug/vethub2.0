'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Patient, RoundingData, RoundingFieldKey, SaveStatus } from '@/types/rounding';

interface UseRoundingDataReturn {
  editingData: Record<number, RoundingData>;
  saveStatus: Map<number, SaveStatus>;
  isSaving: boolean;

  // Actions
  updateField: (patientId: number, field: RoundingFieldKey, value: string) => void;
  savePatient: (patientId: number) => Promise<void>;
  saveAll: () => Promise<void>;
  hasChanges: (patientId: number) => boolean;
  hasAnyChanges: () => boolean;
  getPatientData: (patientId: number) => RoundingData;
  setEditingData: React.Dispatch<React.SetStateAction<Record<number, RoundingData>>>;
  pendingCount: number;
}

/**
 * Hook for managing rounding sheet data state and save operations
 * Encapsulates all editing state to prevent stale closure bugs
 */
export function useRoundingData(patients: Patient[]): UseRoundingDataReturn {
  const [editingData, setEditingData] = useState<Record<number, RoundingData>>({});
  const [saveStatus, setSaveStatus] = useState<Map<number, SaveStatus>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Get rounding data for a patient - prioritizes local edits over saved data
  const getPatientData = useCallback((patientId: number): RoundingData => {
    // If user has edited this patient locally, use that data
    if (editingData[patientId]) return editingData[patientId];

    // Otherwise, use the saved data from API
    const patient = patients.find(p => p.id === patientId);
    return patient?.roundingData || patient?.rounding_data || {};
  }, [editingData, patients]);

  // Check if patient has unsaved changes
  const hasChanges = useCallback((patientId: number): boolean => {
    return editingData[patientId] !== undefined;
  }, [editingData]);

  // Check if any patient has unsaved changes
  const hasAnyChanges = useCallback((): boolean => {
    return Object.keys(editingData).length > 0;
  }, [editingData]);

  // Count of patients with pending changes
  const pendingCount = Object.keys(editingData).length;

  // Update a single field - uses functional setState to avoid stale closures
  const updateField = useCallback((
    patientId: number,
    field: RoundingFieldKey,
    value: string
  ) => {
    setEditingData(prev => {
      const patient = patients.find(p => p.id === patientId);
      const savedData = patient?.roundingData || patient?.rounding_data || {};
      const existingEdits = prev[patientId] || {};

      return {
        ...prev,
        [patientId]: {
          ...savedData,
          ...existingEdits,
          [field]: value,
        },
      };
    });
  }, [patients]);

  // Save a single patient
  const savePatient = useCallback(async (patientId: number) => {
    const updates = editingData[patientId];
    if (!updates) return;

    try {
      setIsSaving(true);
      setSaveStatus(prev => new Map(prev).set(patientId, 'saving'));

      const dataWithTimestamp = {
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      await apiClient.updatePatient(String(patientId), {
        roundingData: dataWithTimestamp,
      });

      setSaveStatus(prev => new Map(prev).set(patientId, 'saved'));

      // Clear "saved" status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newMap = new Map(prev);
          newMap.delete(patientId);
          return newMap;
        });
      }, 2000);

    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus(prev => new Map(prev).set(patientId, 'error'));

      // Keep error status for 5 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newMap = new Map(prev);
          newMap.delete(patientId);
          return newMap;
        });
      }, 5000);

      throw error; // Re-throw for caller to handle
    } finally {
      setIsSaving(false);
    }
  }, [editingData]);

  // Save all patients with changes
  const saveAll = useCallback(async () => {
    const patientIds = Object.keys(editingData).map(Number);
    if (patientIds.length === 0) return;

    setIsSaving(true);
    const timestamp = new Date().toISOString();

    try {
      const promises = patientIds.map(async (patientId) => {
        setSaveStatus(prev => new Map(prev).set(patientId, 'saving'));

        const data = editingData[patientId];
        await apiClient.updatePatient(String(patientId), {
          roundingData: { ...data, lastUpdated: timestamp },
        });

        setSaveStatus(prev => new Map(prev).set(patientId, 'saved'));
      });

      await Promise.all(promises);

      // Clear all "saved" statuses after 2 seconds
      setTimeout(() => {
        setSaveStatus(new Map());
      }, 2000);

    } catch (error) {
      console.error('Save all failed:', error);
      // Mark all as error
      patientIds.forEach(id => {
        setSaveStatus(prev => new Map(prev).set(id, 'error'));
      });

      setTimeout(() => {
        setSaveStatus(new Map());
      }, 5000);

      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [editingData]);

  return {
    editingData,
    saveStatus,
    isSaving,
    updateField,
    savePatient,
    saveAll,
    hasChanges,
    hasAnyChanges,
    getPatientData,
    setEditingData,
    pendingCount,
  };
}
