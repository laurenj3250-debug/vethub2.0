'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Download, Printer, Save, Clock, User, ArrowUpDown } from 'lucide-react';
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load patients from localStorage on mount, auto-clear if new day
  useEffect(() => {
    const saved = localStorage.getItem('appointmentSchedulePatients');
    const savedDate = localStorage.getItem('appointmentScheduleDate');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    if (saved && savedDate) {
      try {
        // Check if data is from today
        if (savedDate === today) {
          const parsed = JSON.parse(saved);
          // Migrate old patients to include status field if missing
          const migratedPatients = parsed.map((p: AppointmentPatient) => ({
            ...p,
            status: p.status || 'recheck', // Default to recheck for existing patients
          }));
          setPatients(migratedPatients);
        } else {
          // New day - clear old data
          localStorage.removeItem('appointmentSchedulePatients');
          localStorage.removeItem('appointmentScheduleDate');
          toast({
            title: '🌅 New Day, Fresh Start',
            description: 'Yesterday\'s appointment schedule has been cleared',
          });
        }
      } catch (error) {
        console.error('Failed to load saved patients:', error);
      }
    }
  }, [toast]);

  // Auto-save to localStorage whenever patients change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (patients.length > 0) {
      localStorage.setItem('appointmentSchedulePatients', JSON.stringify(patients));
      localStorage.setItem('appointmentScheduleDate', today);
    }
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
        setPatients([...patients, ...result.patients]);
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
        return arrayMove(items, oldIndex, newIndex);
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

  const handleDeletePatient = useCallback((id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    toast({ title: 'Patient removed' });
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
                  <th className="px-2 py-3 text-xs font-bold text-slate-400 border-r border-slate-700/30" style={{ width: '30px' }}></th>
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
