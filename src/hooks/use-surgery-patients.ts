'use client';

import { useMemo } from 'react';
import { usePatientsQuery } from './use-patients-query';

interface PatientDemographics {
  name?: string;
  species?: string;
  breed?: string;
  weight?: string;
  age?: string;
}

export interface SurgeryPatient {
  id: number;
  name: string;
  species: string;
  breed: string;
  displayLabel: string; // "Name (Species - Breed)"
}

/**
 * Hook to get patients available for surgery selection
 * Returns hospitalized patients sorted by name
 */
export function useSurgeryPatients() {
  const { data: patients, isLoading, error } = usePatientsQuery();

  const surgeryPatients = useMemo<SurgeryPatient[]>(() => {
    if (!patients) return [];

    // Filter to active (non-discharged) Surgery-type patients only
    return patients
      .filter((p) => p.status !== 'Discharged' && p.status !== 'Discharging' && p.type === 'Surgery')
      .map((patient) => {
        const demographics = patient.demographics as PatientDemographics | null;
        const name = demographics?.name || `Patient #${patient.id}`;
        const species = demographics?.species || '';
        const breed = demographics?.breed || '';

        // Build display label: "Name (Species - Breed)" or "Name (Species)" or just "Name"
        let displayLabel = name;
        if (species && breed) {
          displayLabel = `${name} (${species} - ${breed})`;
        } else if (species) {
          displayLabel = `${name} (${species})`;
        }

        return {
          id: patient.id,
          name,
          species,
          breed,
          displayLabel,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients]);

  return {
    patients: surgeryPatients,
    isLoading,
    error,
  };
}
