'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Download, Printer, Clock, User } from 'lucide-react';
import {
  AppointmentPatient,
  PersistableAppointmentPatient,
} from '@/lib/types/appointment-schedule';
import { PasteModal } from './PasteModal';
import { AppointmentRow } from './AppointmentRow';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

const sanitizeText = (value: any): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const coerced = String(value).trim();
  return coerced.length > 0 ? coerced : null;
};

const normalizeLegacyField = (value: any, formatter: (data: any) => string): string | null => {
  if (value == null) return null;
  if (typeof value === 'object') {
    return sanitizeText(formatter(value));
  }
  return sanitizeText(value);
};

const normalizeAppointmentPatient = (patient: any, index: number): AppointmentPatient => {
  const lastVisit = normalizeLegacyField(patient.lastVisit, (data) => {
    const date = data?.date ? String(data.date) : '';
    const reason = data?.reason ? String(data.reason) : '';
    return `${date} - ${reason}`;
  });

  const mri = normalizeLegacyField(patient.mri, (data) => {
    const date = data?.date ? String(data.date) : '';
    const findings = data?.findings ? String(data.findings) : '';
    return `${date} - ${findings}`;
  });

  const bloodwork = normalizeLegacyField(patient.bloodwork, (data) => {
    const date = data?.date ? String(data.date) : '';
    const abnormalities = Array.isArray(data?.abnormalities)
      ? data.abnormalities.join(', ')
      : data?.abnormalities
        ? String(data.abnormalities)
        : '';
    return `${date} - ${abnormalities}`;
  });

  const medications = Array.isArray(patient.medications)
    ? sanitizeText(
        patient.medications
          .map((med: any) =>
            [med?.name, med?.dose, med?.route, med?.frequency]
              .map((part) => (part ? String(part).trim() : ''))
              .filter(Boolean)
              .join(' ')
          )
          .join(', ')
      )
    : sanitizeText(patient.medications);

  const lastUpdatedSource = patient.lastUpdated || patient.lastUpdatedAt;

  return {
    ...patient,
    sortOrder: typeof patient.sortOrder === 'number' ? patient.sortOrder : index,
    status: patient.status || 'recheck',
    lastVisit,
    mri,
    bloodwork,
    medications,
    lastUpdated: lastUpdatedSource ? new Date(lastUpdatedSource) : new Date(),
  } as AppointmentPatient;
};

const sortPatientsByOrder = (items: AppointmentPatient[]): AppointmentPatient[] =>
  [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const toPersistablePatients = (items: AppointmentPatient[]): PersistableAppointmentPatient[] =>
  items.map((patient, index) => ({
    ...patient,
    sortOrder: typeof patient.sortOrder === 'number' ? patient.sortOrder : index,
    lastUpdated:
      patient.lastUpdated instanceof Date
        ? patient.lastUpdated.toISOString()
        : new Date(patient.lastUpdated).toISOString(),
  }));

const formatTimestampForDisplay = (value: Date) => value.toLocaleString();

type AppointmentScheduleResponse = {
  patients: PersistableAppointmentPatient[];
  updatedAt?: string;
};

export function AppointmentSchedule() {
  const [patients, setPatients] = useState<AppointmentPatient[]>([]);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'custom'>('custom');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const skipNextSaveRef = useRef(false);
  const restoredPatientsRef = useRef<AppointmentPatient[] | null>(null);
  const debouncedSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedRef = useRef(false);
  const lastPersistedSnapshotRef = useRef<string>('');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const persistablePatients = useMemo(
    () => toPersistablePatients(sortPatientsByOrder(patients)),
    [patients]
  );

  const formattedLastSavedAt = useMemo(
    () => (lastSavedAt ? formatTimestampForDisplay(lastSavedAt) : null),
    [lastSavedAt]
  );

  const loadFromLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') {
      restoredPatientsRef.current = null;
      return false;
    }

    const saved = localStorage.getItem('appointmentSchedulePatients');
    const savedDate = localStorage.getItem('appointmentScheduleDate');
    const savedLastSavedAt = localStorage.getItem('appointmentScheduleLastSavedAt');
    const today = new Date().toISOString().split('T')[0];

    restoredPatientsRef.current = null;

    if (!saved || !savedDate) {
      return false;
    }

    try {
      if (savedDate === today) {
        const parsed = JSON.parse(saved);
        const migrated = sortPatientsByOrder(
          parsed.map((patient: any, index: number) => normalizeAppointmentPatient(patient, index))
        );

        restoredPatientsRef.current = migrated;
        skipNextSaveRef.current = true;
        setPatients(migrated);

        if (savedLastSavedAt) {
          const parsedSavedAt = new Date(savedLastSavedAt);
          if (!Number.isNaN(parsedSavedAt.getTime())) {
            setLastSavedAt(parsedSavedAt);
          }
        }

        return true;
      }

      localStorage.removeItem('appointmentSchedulePatients');
      localStorage.removeItem('appointmentScheduleDate');
      localStorage.removeItem('appointmentScheduleLastSavedAt');
      toast({
        title: '🌅 New Day, Fresh Start',
        description: "Yesterday's appointment schedule has been cleared",
      });
    } catch (error) {
      console.error('Failed to load saved patients:', error);
    }

    return false;
  }, [toast]);

  const loadSchedule = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const response = (await apiClient.getAppointmentSchedule()) as AppointmentScheduleResponse;
      const serverPatients = Array.isArray(response?.patients) ? response.patients : [];

      if (serverPatients.length > 0) {
        const normalized = sortPatientsByOrder(
          serverPatients.map((patient, index) => normalizeAppointmentPatient(patient, index))
        );

        restoredPatientsRef.current = null;
        skipNextSaveRef.current = true;
        setPatients(normalized);

        if (response.updatedAt) {
          const parsedUpdatedAt = new Date(response.updatedAt);
          setLastSavedAt(Number.isNaN(parsedUpdatedAt.getTime()) ? new Date() : parsedUpdatedAt);
        } else {
          setLastSavedAt(new Date());
        }

        lastPersistedSnapshotRef.current = JSON.stringify(toPersistablePatients(normalized));
        return;
      }

      const restored = loadFromLocalStorage();
      if (!restored) {
        setLastSavedAt(null);
        lastPersistedSnapshotRef.current = JSON.stringify([]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load appointment schedule';
      const normalizedMessage = message.toLowerCase();
      const notFound = normalizedMessage.includes('404') || normalizedMessage.includes('not found');

      if (notFound) {
        const restored = loadFromLocalStorage();
        if (restored && restoredPatientsRef.current) {
          try {
            skipNextSaveRef.current = true;
            const payload = toPersistablePatients(restoredPatientsRef.current);
            const result = await apiClient.saveAppointmentSchedule({ patients: payload });

            if (result?.updatedAt) {
              const parsedUpdatedAt = new Date(result.updatedAt);
              setLastSavedAt(Number.isNaN(parsedUpdatedAt.getTime()) ? new Date() : parsedUpdatedAt);
            } else {
              setLastSavedAt(new Date());
            }

            lastPersistedSnapshotRef.current = JSON.stringify(payload);
          } catch (syncError) {
            console.error('Failed to sync restored appointment schedule:', syncError);
            toast({
              variant: 'destructive',
              title: 'Failed to sync schedule',
              description: 'Could not upload locally saved appointments to the server.',
            });
          }
        }
      } else {
        console.error('Failed to load appointment schedule:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load appointment schedule',
          description: message,
        });
      }
    } finally {
      hasInitializedRef.current = true;
    }
  }, [loadFromLocalStorage, toast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const today = new Date().toISOString().split('T')[0];
    if (patients.length > 0) {
      localStorage.setItem('appointmentSchedulePatients', JSON.stringify(patients));
      localStorage.setItem('appointmentScheduleDate', today);
    } else {
      localStorage.removeItem('appointmentSchedulePatients');
      localStorage.removeItem('appointmentScheduleDate');
    }
  }, [patients]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (lastSavedAt) {
      localStorage.setItem('appointmentScheduleLastSavedAt', lastSavedAt.toISOString());
    } else {
      localStorage.removeItem('appointmentScheduleLastSavedAt');
    }
  }, [lastSavedAt]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;

    const snapshot = JSON.stringify(persistablePatients);

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      lastPersistedSnapshotRef.current = snapshot;
      return;
    }

    if (snapshot === lastPersistedSnapshotRef.current) {
      return;
    }

    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }

    debouncedSaveRef.current = setTimeout(async () => {
      try {
        const result = await apiClient.saveAppointmentSchedule({ patients: persistablePatients });
        lastPersistedSnapshotRef.current = snapshot;

        if (result?.updatedAt) {
          const parsedUpdatedAt = new Date(result.updatedAt);
          setLastSavedAt(Number.isNaN(parsedUpdatedAt.getTime()) ? new Date() : parsedUpdatedAt);
        } else {
          setLastSavedAt(new Date());
        }
      } catch (error) {
        console.error('Failed to save appointment schedule:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to save appointment schedule',
          description: 'Could not sync appointments to the server.',
        });
      }
    }, 1500);

    return () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }
    };
  }, [persistablePatients, toast]);

  useEffect(
    () => () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }
    },
    []
  );

  const handleParse = async (text: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/parse-appointment-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Parsing failed');

      const result = await response.json();

      if (result.patients && result.patients.length > 0) {
        setPatients((current) => {
          const baseOrder = current.length;
          const parsedPatients = result.patients.map((patient: any, index: number) => ({
            ...normalizeAppointmentPatient(patient, baseOrder + index),
            sortOrder: baseOrder + index,
            lastUpdated: new Date(),
          }));

          return [...current, ...parsedPatients];
        });
        toast({
          title: '✅ Patients Parsed',
          description: `Successfully extracted ${result.count} patient(s)`,
        });
        setShowPasteModal(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'No patients found',
          description: 'Could not extract patient data from the text',
        });
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        variant: 'destructive',
        title: 'Parsing Failed',
        description: 'Failed to parse patient data',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPatients((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          sortOrder: index,
        }));
        return reordered;
      });
      setSortBy('custom');
    }
  };

  const handleUpdatePatient = useCallback((id: string, field: string, value: any) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: value,
              lastUpdated: new Date(),
            }
          : p
      )
    );
  }, []);

  const handleDeletePatient = useCallback(
    (id: string) => {
      setPatients((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Patient removed' });
    },
    [toast]
  );

  const handleSort = (type: 'time' | 'name') => {
    const sorted = [...patients].sort((a, b) => {
      if (type === 'time') {
        if (!a.appointmentTime) return 1;
        if (!b.appointmentTime) return -1;
        return a.appointmentTime.localeCompare(b.appointmentTime);
      }
      return a.patientName.localeCompare(b.patientName);
    });
    setPatients(sorted.map((patient, index) => ({ ...patient, sortOrder: index })));
    setSortBy(type);
  };

  const handleExportPrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(patients, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `appointment-schedule-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleClearAll = () => {
    if (confirm('Clear all patients from the appointment schedule?')) {
      setPatients([]);
      setLastSavedAt(null);
      localStorage.removeItem('appointmentSchedulePatients');
      localStorage.removeItem('appointmentScheduleDate');
      localStorage.removeItem('appointmentScheduleLastSavedAt');
      toast({ title: 'Appointment schedule cleared' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Appointment Schedule</h2>
          <p className="text-sm text-slate-400">
            {patients.length === 0
              ? 'Paste patient data to get started'
              : `${patients.length} patient(s) • Sorted by ${
                  sortBy === 'time' ? 'appointment time' : sortBy === 'name' ? 'name' : 'custom order'
                }`}
          </p>
          {formattedLastSavedAt && (
            <p className="text-xs text-slate-500 mt-1">Last synced {formattedLastSavedAt}</p>
          )}
          {patients.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-500">Legend:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500/30 border-l-2 border-emerald-500 rounded-sm"></div>
                <span className="text-xs text-slate-400">New Patient</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-500/30 border-l-2 border-blue-500 rounded-sm"></div>
                <span className="text-xs text-slate-400">Recheck</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-purple-500/30 border-l-2 border-purple-500 rounded-sm"></div>
                <span className="text-xs text-slate-400">MRI Drop Off</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleSort('time')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-2"
            title="Sort by time"
          >
            <Clock size={14} />
            Sort by Time
          </button>
          <button
            onClick={() => handleSort('name')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-2"
            title="Sort by name"
          >
            <User size={14} />
            Sort by Name
          </button>
          <button
            onClick={handleExportPrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-2"
            disabled={patients.length === 0}
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-2"
            disabled={patients.length === 0}
          >
            <Download size={14} />
            Export
          </button>
          {patients.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg text-xs font-medium transition"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowPasteModal(true)}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2"
          >
            <Plus size={16} />
            Add Patients
          </button>
        </div>
      </div>

      {/* Table */}
      {patients.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-slate-400 text-lg mb-4">No patients yet</p>
          <button
            onClick={() => setShowPasteModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold transition"
          >
            Paste Patient Data to Get Started
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '30px' }}
                  ></th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '150px' }}
                  >
                    Patient
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '80px' }}
                  >
                    Age
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '200px' }}
                  >
                    Why Here Today
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '150px' }}
                  >
                    Last Visit
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '200px' }}
                  >
                    MRI
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '200px' }}
                  >
                    Bloodwork
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '250px' }}
                  >
                    Medications
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '200px' }}
                  >
                    Changes
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '200px' }}
                  >
                    Other/Misc
                  </th>
                  <th
                    className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30"
                    style={{ width: '50px' }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={patients.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    {patients.map((patient) => (
                      <AppointmentRow
                        key={patient.id}
                        patient={patient}
                        onUpdate={handleUpdatePatient}
                        onDelete={handleDeletePatient}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paste Modal */}
      <PasteModal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        onParse={handleParse}
        isProcessing={isProcessing}
      />
    </div>
  );
}
