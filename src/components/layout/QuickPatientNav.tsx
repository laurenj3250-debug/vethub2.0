'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Patient {
  id: number;
  demographics: {
    name: string;
  };
  status: string;
  type?: string;
  currentStay?: {
    dayCount?: number;
  };
}

interface QuickPatientNavProps {
  currentPatientId?: number;
}

export function QuickPatientNav({ currentPatientId }: QuickPatientNavProps) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Load patients on mount
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch('/api/patients');
        if (response.ok) {
          const data = await response.json();
          // Only show active patients
          const activePatients = data.filter((p: Patient) => p.status !== 'Discharging');
          setPatients(activePatients);

          if (currentPatientId) {
            const current = activePatients.find((p: Patient) => p.id === currentPatientId);
            setCurrentPatient(current || null);
          }
        }
      } catch (error) {
        console.error('Failed to load patients:', error);
      }
    };

    loadPatients();
  }, [currentPatientId]);

  // Keyboard shortcut: Cmd+K to open patient switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  if (patients.length === 0) {
    return null; // No patients to show
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="bg-white border-gray-300 shadow-md hover:shadow-lg transition-shadow"
          >
            {currentPatient ? (
              <span className="flex items-center gap-2">
                <span className="font-medium">{currentPatient.demographics.name}</span>
                {currentPatient.currentStay?.dayCount && (
                  <span className="text-xs text-gray-500">
                    Day {currentPatient.currentStay.dayCount}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Command className="h-4 w-4" />
                <span>Quick Nav</span>
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          {currentPatient && (
            <>
              <DropdownMenuLabel className="text-lg font-semibold">
                {currentPatient.demographics.name}
              </DropdownMenuLabel>
              <div className="px-2 py-1 text-sm text-gray-600">
                <div>Status: {currentPatient.status}</div>
                <div>Type: {currentPatient.type || 'Medical'}</div>
                {currentPatient.currentStay?.dayCount && (
                  <div>Day {currentPatient.currentStay.dayCount}</div>
                )}
              </div>
              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
                Quick Jump
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigateTo('/')}>
                <ChevronRight className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('/rounding')}>
                <ChevronRight className="mr-2 h-4 w-4" />
                Rounding Sheet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('/soap')}>
                <ChevronRight className="mr-2 h-4 w-4" />
                SOAP Notes
              </DropdownMenuItem>
              {currentPatient.type === 'MRI' && (
                <DropdownMenuItem onClick={() => navigateTo('/mri-builder')}>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  MRI Builder
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
            Switch Patient ({patients.length})
          </DropdownMenuLabel>
          <div className="max-h-60 overflow-y-auto">
            {patients.map((patient) => (
              <DropdownMenuItem
                key={patient.id}
                onClick={() => {
                  setCurrentPatient(patient);
                  setIsOpen(false);
                }}
                className={currentPatient?.id === patient.id ? 'bg-blue-50' : ''}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{patient.demographics.name}</span>
                  <span className="text-xs text-gray-500">
                    {patient.type || 'Medical'} • {patient.status}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator />
          <div className="px-2 py-1 text-xs text-gray-400 text-center">
            Press ⌘K to toggle
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
