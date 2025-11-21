'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Download, Printer, Save, Clock, User, ArrowUpDown, Camera } from 'lucide-react';
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
        console.log('AppointmentSchedule: Loaded appointments from database', { count: appointments.length });

        // Convert database appointments to AppointmentPatient format
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
          highlight: apt.highlight || 'none',
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
    // Skip if no patients or initial load
    if (patients.length === 0) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1000ms
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Update sort orders for all appointments
        const today = new Date().toISOString().split('T')[0];
        await fetch('/api/appointments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointments: patients.map((p, index) => ({
              id: p.id,
              sortOrder: index,
            })),
          }),
        });

        console.log('AppointmentSchedule: Saved to database', {
          patientsCount: patients.length,
          date: today,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save appointments:', error);
      }
    }, 1000);

    // Cleanup on unmount
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
        // Save each parsed patient to database
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

        // Convert to AppointmentPatient format and add to state
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
          highlight: apt.highlight || 'none',
          rawText: apt.rawText || undefined,
          lastUpdated: new Date(apt.updatedAt),
        }));

        setPatients([...patients, ...newPatients]);
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

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
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
        // Save each parsed patient to database
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

        // Convert to AppointmentPatient format and add to state
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
          highlight: apt.highlight || 'none',
          rawText: apt.rawText || undefined,
          lastUpdated: new Date(apt.updatedAt),
        }));

        setPatients([...patients, ...newPatients]);
        toast({
          title: '📷 Screenshot Parsed',
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
      // Reset file input
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
    // Update local state immediately for responsive UI
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

    // Save to database
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
    // Remove from local state immediately
    setPatients((prev) => prev.filter((p) => p.id !== id));

    // Delete from database
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });
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
      localStorage.removeItem('appointmentSchedulePatients');
      localStorage.removeItem('appointmentScheduleDate');
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
              : `${patients.length} patient(s) • Sorted by ${sortBy === 'time' ? 'appointment time' : sortBy === 'name' ? 'name' : 'custom order'}`}
          </p>
          {patients.length > 0 && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Status:</span>
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
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Highlights:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-yellow-500/30 border-l-2 border-yellow-500 rounded-sm"></div>
                  <span className="text-xs text-slate-400">Priority</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-500/30 border-l-2 border-red-500 rounded-sm"></div>
                  <span className="text-xs text-slate-400">Urgent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-500/30 border-l-2 border-green-500 rounded-sm"></div>
                  <span className="text-xs text-slate-400">Completed</span>
                </div>
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
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2"
            disabled={isProcessing}
          >
            <Camera size={16} />
            {isProcessing ? 'Processing...' : 'Parse Screenshot'}
          </button>
          <button
            onClick={() => setShowPasteModal(true)}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2"
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
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl">
          <div className="w-full">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '30px' }}></th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '90px' }}>Time</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '150px' }}>Patient</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '80px' }}>Age</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '200px' }}>Why Here Today</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '150px' }}>Last Visit</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '200px' }}>MRI</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '200px' }}>Bloodwork</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '250px' }}>Medications</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '200px' }}>Changes</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '200px' }}>Other/Misc</th>
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '50px' }}></th>
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
