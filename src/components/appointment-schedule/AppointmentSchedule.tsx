'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Download, Printer, Clock, User, Camera, Trash2 } from 'lucide-react';
import { AppointmentPatient } from '@/lib/types/appointment-schedule';
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

// Neo-pop styling constants
const NEO_BORDER = '2px solid #000';
const NEO_SHADOW = '6px 6px 0 #000';
const NEO_SHADOW_SM = '4px 4px 0 #000';
const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

export function AppointmentSchedule() {
  const [patients, setPatients] = useState<AppointmentPatient[]>([]);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'custom'>('custom');
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load patients from database on mount
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/appointments?date=${today}`);

        if (!response.ok) {
          throw new Error('Failed to load appointments');
        }

        const appointments = await response.json();

        const convertedPatients: AppointmentPatient[] = appointments.map((apt: any) => ({
          id: apt.id,
          sortOrder: apt.sortOrder,
          patientName: apt.patientName,
          appointmentTime: apt.appointmentTime || undefined,
          age: apt.age || null,
          status: apt.status || 'recheck',
          whyHereToday: apt.whyHereToday || null,
          lastVisit: apt.lastVisit || null,
          mri: apt.mri || null,
          bloodwork: apt.bloodwork || null,
          medications: apt.medications || null,
          changesSinceLastVisit: apt.changesSinceLastVisit || null,
          otherNotes: apt.otherNotes || null,
          rawText: apt.rawText || undefined,
          lastUpdated: new Date(apt.updatedAt),
        }));

        setPatients(convertedPatients);
      } catch (error) {
        console.error('Failed to load appointments:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load appointments',
          description: 'Could not load today\'s appointments from database',
        });
      }
    };

    loadAppointments();
  }, [toast]);

  // Auto-save to database whenever patients change (debounced)
  useEffect(() => {
    // Only save patients with valid database IDs
    const validPatients = patients.filter((p) => p.id && p.id !== 'undefined');
    if (validPatients.length === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/appointments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointments: validPatients.map((p, index) => ({
              id: p.id,
              sortOrder: index,
            })),
          }),
        });
      } catch (error) {
        console.error('Failed to save appointments:', error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [patients]);

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
        const today = new Date().toISOString().split('T')[0];

        // Try to save each patient to the database
        const saveResults = await Promise.all(
          result.patients.map(async (patient: AppointmentPatient) => {
            try {
              const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  date: today,
                  patientName: patient.patientName,
                  appointmentTime: patient.appointmentTime,
                  age: patient.age,
                  status: patient.status,
                  whyHereToday: patient.whyHereToday,
                  lastVisit: patient.lastVisit,
                  mri: patient.mri,
                  bloodwork: patient.bloodwork,
                  medications: patient.medications,
                  changesSinceLastVisit: patient.changesSinceLastVisit,
                  otherNotes: patient.otherNotes,
                  rawText: patient.rawText,
                }),
              });
              const data = await response.json();
              if (!response.ok) {
                console.error('Failed to save appointment:', data);
                return { success: false, error: data.details || data.error, patient };
              }
              return { success: true, data };
            } catch (err) {
              console.error('Error saving appointment:', err);
              return { success: false, error: 'Network error', patient };
            }
          })
        );

        // Filter successful saves
        const successfulSaves = saveResults.filter((r) => r.success);
        const failedSaves = saveResults.filter((r) => !r.success);

        if (failedSaves.length > 0) {
          const firstError = failedSaves[0];
          toast({
            variant: 'destructive',
            title: 'Database Error',
            description: firstError.error || 'Failed to save appointments to database',
          });
        }

        if (successfulSaves.length > 0) {
          const newPatients: AppointmentPatient[] = successfulSaves.map((result: any) => {
            const apt = result.data;
            return {
              id: apt.id,
              sortOrder: apt.sortOrder,
              patientName: apt.patientName,
              appointmentTime: apt.appointmentTime || undefined,
              age: apt.age || null,
              status: apt.status || 'recheck',
              whyHereToday: apt.whyHereToday || null,
              lastVisit: apt.lastVisit || null,
              mri: apt.mri || null,
              bloodwork: apt.bloodwork || null,
              medications: apt.medications || null,
              changesSinceLastVisit: apt.changesSinceLastVisit || null,
              otherNotes: apt.otherNotes || null,
              highlight: apt.highlight || 'none',
              rawText: apt.rawText || undefined,
              lastUpdated: new Date(apt.updatedAt),
            };
          });

          setPatients([...patients, ...newPatients]);
          toast({
            title: 'Patients Parsed',
            description: `Successfully saved ${successfulSaves.length} of ${result.count} patient(s)`,
          });
          setShowPasteModal(false);
        } else if (failedSaves.length > 0) {
          // All saves failed - don't close modal, let user try again
          console.error('All appointment saves failed');
        }
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

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, etc.)',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/parse-appointment-screenshot', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Parsing failed');
      }

      const result = await response.json();

      if (result.patients && result.patients.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const createdAppointments = await Promise.all(
          result.patients.map(async (patient: AppointmentPatient) => {
            const response = await fetch('/api/appointments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: today,
                patientName: patient.patientName,
                appointmentTime: patient.appointmentTime,
                age: patient.age,
                status: patient.status,
                whyHereToday: patient.whyHereToday,
                lastVisit: patient.lastVisit,
                mri: patient.mri,
                bloodwork: patient.bloodwork,
                medications: patient.medications,
                changesSinceLastVisit: patient.changesSinceLastVisit,
                otherNotes: patient.otherNotes,
                rawText: patient.rawText,
              }),
            });
            return response.json();
          })
        );

        const newPatients: AppointmentPatient[] = createdAppointments.map((apt: any) => ({
          id: apt.id,
          sortOrder: apt.sortOrder,
          patientName: apt.patientName,
          appointmentTime: apt.appointmentTime || undefined,
          age: apt.age || null,
          status: apt.status || 'recheck',
          whyHereToday: apt.whyHereToday || null,
          lastVisit: apt.lastVisit || null,
          mri: apt.mri || null,
          bloodwork: apt.bloodwork || null,
          medications: apt.medications || null,
          changesSinceLastVisit: apt.changesSinceLastVisit || null,
          otherNotes: apt.otherNotes || null,
          rawText: apt.rawText || undefined,
          lastUpdated: new Date(apt.updatedAt),
        }));

        setPatients([...patients, ...newPatients]);
        toast({
          title: 'Screenshot Parsed',
          description: `Successfully extracted ${result.count} appointment(s)`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'No appointments found',
          description: 'Could not extract appointment data from the screenshot',
        });
      }
    } catch (error: any) {
      console.error('Screenshot parse error:', error);
      toast({
        variant: 'destructive',
        title: 'Parsing Failed',
        description: error.message || 'Failed to parse screenshot',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPatients((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setSortBy('custom');
    }
  };

  const handleUpdatePatient = useCallback(async (id: string, field: string, value: any) => {
    // Guard against undefined/invalid IDs
    if (!id || id === 'undefined') {
      console.warn('Skipping update for invalid ID:', id);
      return;
    }

    setPatients((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, [field]: value, lastUpdated: new Date() }
          : p
      )
    );

    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (error) {
      console.error('Failed to update appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not save changes to database',
      });
    }
  }, [toast]);

  const handleDeletePatient = useCallback(async (id: string) => {
    // Guard against undefined/invalid IDs
    if (!id || id === 'undefined') {
      console.warn('Skipping delete for invalid ID:', id);
      return;
    }

    setPatients((prev) => prev.filter((p) => p.id !== id));

    try {
      await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      toast({ title: 'Patient removed' });
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'Could not delete appointment from database',
      });
    }
  }, [toast]);

  const handleSort = (type: 'time' | 'name') => {
    const sorted = [...patients].sort((a, b) => {
      if (type === 'time') {
        if (!a.appointmentTime) return 1;
        if (!b.appointmentTime) return -1;
        return a.appointmentTime.localeCompare(b.appointmentTime);
      } else {
        return a.patientName.localeCompare(b.patientName);
      }
    });
    setPatients(sorted);
    setSortBy(type);
  };

  const handleExportPrint = () => window.print();

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
      localStorage.removeItem('appointmentSchedulePatients');
      localStorage.removeItem('appointmentScheduleDate');
      toast({ title: 'Appointment schedule cleared' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="flex items-center justify-between flex-wrap gap-4 rounded-2xl p-4"
        style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
      >
        <div>
          <h2 className="text-xl font-black text-gray-900">Today's Schedule</h2>
          <p className="text-sm text-gray-500 font-medium">
            {patients.length === 0
              ? 'Paste patient data to get started'
              : `${patients.length} patient(s) • Sorted by ${sortBy === 'time' ? 'time' : sortBy === 'name' ? 'name' : 'custom'}`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleSort('time')}
            className="px-3 py-2 rounded-xl text-xs font-bold transition hover:-translate-y-0.5 flex items-center gap-2 text-gray-900"
            style={{ backgroundColor: 'white', border: NEO_BORDER }}
          >
            <Clock size={14} />
            Time
          </button>
          <button
            onClick={() => handleSort('name')}
            className="px-3 py-2 rounded-xl text-xs font-bold transition hover:-translate-y-0.5 flex items-center gap-2 text-gray-900"
            style={{ backgroundColor: 'white', border: NEO_BORDER }}
          >
            <User size={14} />
            Name
          </button>
          <button
            onClick={handleExportPrint}
            className="px-3 py-2 rounded-xl text-xs font-bold transition hover:-translate-y-0.5 flex items-center gap-2 text-gray-900 disabled:opacity-50"
            style={{ backgroundColor: 'white', border: NEO_BORDER }}
            disabled={patients.length === 0}
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-xl text-xs font-bold transition hover:-translate-y-0.5 flex items-center gap-2 text-gray-900 disabled:opacity-50"
            style={{ backgroundColor: 'white', border: NEO_BORDER }}
            disabled={patients.length === 0}
          >
            <Download size={14} />
            Export
          </button>
          {patients.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl text-xs font-bold transition hover:-translate-y-0.5 flex items-center gap-2 text-gray-900"
              style={{ backgroundColor: COLORS.pink, border: NEO_BORDER }}
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-bold transition hover:-translate-y-0.5 flex items-center gap-2 text-gray-900 disabled:opacity-50"
            style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
            disabled={isProcessing}
          >
            <Camera size={16} />
            {isProcessing ? 'Processing...' : 'Screenshot'}
          </button>
          <button
            onClick={() => setShowPasteModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition hover:-translate-y-0.5 flex items-center gap-2 text-gray-900"
            style={{ backgroundColor: COLORS.mint, border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
          >
            <Plus size={16} />
            Add Patients
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshotUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Table */}
      {patients.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
            style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER }}
          >
            📋
          </div>
          <p className="text-gray-500 text-lg mb-4 font-bold">No patients yet</p>
          <button
            onClick={() => setShowPasteModal(true)}
            className="px-6 py-3 rounded-xl font-bold transition hover:-translate-y-0.5 text-gray-900"
            style={{ backgroundColor: COLORS.mint, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
          >
            Paste Patient Data to Get Started
          </button>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
        >
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left bg-white">
              <thead style={{ backgroundColor: COLORS.mint }}>
                <tr>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '30px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}></th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '90px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Time</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '150px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Patient</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '80px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Age</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '200px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Why Here Today</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '150px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Last Visit</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '200px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>MRI</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '200px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Bloodwork</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '250px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Medications</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '200px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Changes</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '200px', borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Other/Misc</th>
                  <th className="px-2 py-3 text-xs font-bold text-gray-900" style={{ width: '50px', borderBottom: NEO_BORDER }}></th>
                </tr>
              </thead>
              <tbody>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={patients.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
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
