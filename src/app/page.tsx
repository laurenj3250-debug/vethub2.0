'use client';

import React, { useState } from 'react';
import type { Patient, ProcedureType, PatientStatus } from '@/lib/types';
import { parsePatientInfoFromText } from '@/ai/flows/parse-patient-info-from-text';
import { analyzeBloodWork } from '@/ai/flows/analyze-blood-work-for-abnormalities';
import Header from '@/components/vet-hub/header';
import AddPatientForm from '@/components/vet-hub/add-patient-form';
import GeneralTasks from '@/components/vet-hub/general-tasks';
import PatientCard from '@/components/vet-hub/patient-card';
import TaskOverview from '@/components/vet-hub/task-overview';
import { useToast } from "@/hooks/use-toast";
import { Stethoscope } from 'lucide-react';
import type { GeneralTask } from '@/lib/types';

export default function VetPatientTracker() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [generalTasks, setGeneralTasks] = useState<GeneralTask[]>([]);
  const [showMorningOverview, setShowMorningOverview] = useState(false);
  const [collapsedPatients, setCollapsedPatients] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  const addPatient = (name: string, type: ProcedureType) => {
    if (name.trim()) {
      const newPatientId = Date.now();
      const patient: Patient = {
        id: newPatientId,
        name,
        type,
        status: 'New Admit',
        tasks: [],
        customTask: '',
        bwInput: '',
        xrayStatus: 'NSF',
        xrayOther: '',
        detailsInput: '',
        patientInfo: {
          species: 'Canine',
        },
        roundingData: {
          codeStatus: 'Yellow',
        },
        mriData: type === 'MRI' ? {
          weight: '',
          weightUnit: 'kg',
          scanType: 'Brain',
          calculated: false
        } : undefined,
        addedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setPatients(prev => [...prev, patient]);
      setCollapsedPatients(prev => ({...prev, [newPatientId]: false}));
      toast({
        title: "Patient Added",
        description: `${name} has been added to the tracker.`,
      });
    }
  };

  const removePatient = (id: number) => {
    setPatients(patients.filter(p => p.id !== id));
    setCollapsedPatients(prev => {
      const newCollapsed = {...prev};
      delete newCollapsed[id];
      return newCollapsed;
    });
  };
  
  const updatePatient = (id: number, updatedPatient: Partial<Patient>) => {
    setPatients(prev => prev.map(p => (p.id === id ? { ...p, ...updatedPatient } : p)));
  };

  const updatePatientField = <K extends keyof Patient>(id: number, field: K, value: Patient[K]) => {
     setPatients(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const updateStatus = (patientId: number, newStatus: PatientStatus) => {
    updatePatient(patientId, { status: newStatus });
  };
  
  const updateRoundingData = (patientId: number, field: string, value: string) => {
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, roundingData: { ...p.roundingData, [field]: value } } : p));
  };

  const updatePatientInfo = (patientId: number, field: string, value: string) => {
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, patientInfo: { ...p.patientInfo, [field]: value } } : p));
  };
  
  const updateMRIData = (patientId: number, field: string, value: string | boolean) => {
    setPatients(prev => prev.map(p => p.id === patientId && p.mriData ? { ...p, mriData: { ...p.mriData, [field]: value, calculated: false } } : p));
  };

  const addGeneralTask = (taskName: string, setNewTask: (val: string) => void) => {
    if (!taskName.trim()) return;
    setGeneralTasks(prev => [...prev, { id: Date.now(), name: taskName, completed: false }]);
    setNewTask('');
  };
  
  const toggleGeneralTask = (taskId: number) => {
    setGeneralTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };
  
  const removeGeneralTask = (taskId: number) => {
    setGeneralTasks(prev => prev.filter(t => t.id !== taskId));
  };
  
  const togglePatientCollapse = (patientId: number) => {
    setCollapsedPatients(prev => ({...prev, [patientId]: !prev[patientId]}));
  };

  const toggleAllPatientsCollapse = (collapse: boolean) => {
    const newCollapsedState: Record<number, boolean> = {};
    patients.forEach(p => {
      newCollapsedState[p.id] = collapse;
    });
    setCollapsedPatients(newCollapsedState);
  };

  const handleParsePatientDetails = async (patientId: number, detailsText: string) => {
    if (!detailsText.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please paste patient details first." });
      return;
    }
    
    try {
      const { patientInfo, therapeutics } = await parsePatientInfoFromText({ text: detailsText });
      
      let signalment = '';
      if (patientInfo.age) signalment += patientInfo.age.replace(/\s+years?.*/, 'yo');
      if (patientInfo.sex) signalment += ` ${patientInfo.sex}`;
      if (patientInfo.breed) signalment += ` ${patientInfo.breed}`;

      setPatients(currentPatients => currentPatients.map(p => {
        if (p.id === patientId) {
          return {
            ...p,
            patientInfo: { ...p.patientInfo, ...patientInfo },
            roundingData: {
              ...p.roundingData,
              signalment: signalment.trim() || p.roundingData.signalment,
              therapeutics: therapeutics || p.roundingData.therapeutics,
            },
            detailsInput: ''
          };
        }
        return p;
      }));
      toast({ title: "Success", description: "Patient info extracted and populated." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to parse patient details." });
    }
  };

  const handleParseBloodWork = async (patientId: number, bwText: string) => {
    if (!bwText.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please paste blood work results first." });
      return;
    }

    try {
      const { abnormalValues } = await analyzeBloodWork({ bloodWorkText: bwText });
      
      setPatients(currentPatients => currentPatients.map(p => {
        if (p.id === patientId) {
          const currentDx = p.roundingData.diagnosticFindings || '';
          const bwLine = abnormalValues.length > 0 ? 'CBC/CHEM: ' + abnormalValues.join(', ') : 'CBC/CHEM: NAD';
          const newDx = currentDx ? `${currentDx}\n${bwLine}` : bwLine;
          return {
            ...p,
            roundingData: { ...p.roundingData, diagnosticFindings: newDx },
            bwInput: ''
          };
        }
        return p;
      }));
      toast({ title: "Success", description: "Blood work analyzed and findings updated." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "AI Error", description: "Failed to analyze blood work." });
    }
  };
  
  const exportToCSV = () => {
    let csv = 'Text/call BOTH Neuro Residents for any transfers\n';
    csv += 'NOTIFY IF THERE IS A PROBLEM OR DEATH\n\n';
    
    const headers = ['Patient Name', 'Signalment', 'Location', 'ICU criteria', 'Code Status', 'Diagnostics', 'Therapeutics', 'Replace IVC', 'Replace fluids', 'Replace CRI', 'Overnight diagnostics', 'Overnight concerns', 'Comments'];
    csv += headers.join(',') + '\n';
    
    patients.forEach(patient => {
      const r = patient.roundingData || {};
      const row = [
        patient.name,
        r.signalment,
        r.location,
        r.icuCriteria,
        r.codeStatus,
        r.diagnosticFindings,
        r.therapeutics,
        r.replaceIVC,
        r.replaceFluids,
        r.replaceCRI,
        r.overnightDiagnostics,
        r.overnightConcerns,
        r.additionalComments
      ].map(val => `"${(val || '').replace(/"/g, '""')}"`).join(',');
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rounding-sheet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMRISheet = () => {
    const mriPts = patients.filter(p => p.type === 'MRI' && p.mriData?.calculated);
    
    if (mriPts.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No MRI patients with calculated doses found." });
      return;
    }

    let csv = 'Patient,CID,kg,lb,Scan,PreMed,mg,mL,Valium mg,Valium mL,Contrast mL\n';
    
    mriPts.forEach(patient => {
      const m = patient.mriData!;
      const lbs = (parseFloat(m.weightKg!) * 2.20462).toFixed(2);
      const row = [
        patient.name,
        patient.patientInfo?.clientId || '',
        m.weightKg,
        lbs,
        m.scanType,
        m.preMedDrug,
        m.preMedDose,
        m.preMedVolume,
        m.valiumDose,
        m.valiumVolume,
        m.contrastVolume
      ].map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(',');
      csv += row + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mri-anesthesia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header 
          patientCount={patients.length}
          hasMriPatient={patients.some(p => p.type === 'MRI')}
          onExportRounding={exportToCSV}
          onExportMri={exportMRISheet}
          showMorningOverview={showMorningOverview}
          setShowMorningOverview={setShowMorningOverview}
          onToggleAllCollapse={toggleAllPatientsCollapse}
        />
        
        <AddPatientForm onAddPatient={addPatient} />
        
        <GeneralTasks 
          tasks={generalTasks}
          onAddTask={addGeneralTask}
          onToggleTask={toggleGeneralTask}
          onRemoveTask={removeGeneralTask}
        />

        {patients.length === 0 ? (
          <div className="text-center bg-card rounded-lg shadow-sm p-12 mt-6 border">
            <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No patients added yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add your first patient above to get started.</p>
          </div>
        ) : (
          <>
            {showMorningOverview && (
              <TaskOverview 
                patients={patients}
                generalTasks={generalTasks}
                onTogglePatientTask={(patientId, taskId) => {
                  const patient = patients.find(p => p.id === patientId)!;
                  const newTasks = patient.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
                  updatePatient(patientId, { tasks: newTasks });
                }}
                onToggleGeneralTask={toggleGeneralTask}
                onAddMorningTasksToAll={() => patients.forEach(p => {
                    const patient = patients.find(pat => pat.id === p.id)!;
                    const existingTaskNames = new Set(patient.tasks.map(t => t.name));
                    const tasksToAdd = ['Owner Called', 'Daily SOAP Done', 'Vet Radar Sheet Checked', 'MRI Findings Inputted (if needed)'].filter(tn => !existingTaskNames.has(tn));
                    const newTasks = tasksToAdd.map(taskName => ({ name: taskName, completed: false, id: Date.now() + Math.random() }));
                    updatePatient(p.id, { tasks: [...patient.tasks, ...newTasks] });
                })}
              />
            )}
            <div className="grid gap-6 mt-6">
              {patients.map(patient => (
                <PatientCard 
                  key={patient.id}
                  patient={patient}
                  isCollapsed={collapsedPatients[patient.id]}
                  onToggleCollapse={togglePatientCollapse}
                  onRemove={removePatient}
                  onUpdateStatus={updateStatus}
                  onUpdateRoundingData={updateRoundingData}
                  onUpdatePatientInfo={updatePatientInfo}
                  onUpdateMriData={updateMRIData}
                  onUpdatePatientField={updatePatientField}
                  onParsePatientDetails={handleParsePatientDetails}
                  onParseBloodWork={handleParseBloodWork}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
