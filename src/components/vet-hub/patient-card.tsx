'use client';

import React from 'react';
import type { Patient, PatientStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Trash2, Clock, ChevronsUpDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PatientTasks from './patient-tasks';
import PatientDetailsForm from './patient-details-form';
import MriCalculator from './mri-calculator';
import { statusOptions, statusColors } from '@/lib/constants';

type PatientCardProps = {
  patient: Patient;
  onRemove: (id: number) => void;
  onUpdateStatus: (id: number, status: PatientStatus) => void;
  onUpdateRoundingData: (id: number, field: string, value: string) => void;
  onUpdatePatientInfo: (id: number, field: string, value: string) => void;
  onUpdateMriData: (id: number, field: string, value: string | boolean) => void;
  onUpdatePatientField: <K extends keyof Patient>(id: number, field: K, value: Patient[K]) => void;
  onParsePatientDetails: (id: number, text: string) => Promise<void>;
  onParseBloodWork: (id: number, text: string) => Promise<void>;
};

const PatientCard: React.FC<PatientCardProps> = ({ patient, onRemove, ...props }) => {
  const { completed, total, percentage } = (() => {
    const total = patient.tasks.length;
    const completed = patient.tasks.filter(t => t.completed).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  })();

  return (
    <Card className="shadow-md transition-shadow hover:shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <CardTitle className="text-xl">{patient.name}</CardTitle>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
                {patient.type}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock size={14} />
                {patient.addedTime}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-foreground">Status:</span>
              <Select value={patient.status} onValueChange={(value: PatientStatus) => props.onUpdateStatus(patient.id, value)}>
                <SelectTrigger className={`w-[200px] h-9 text-sm font-semibold ${statusColors[patient.status]}`}>
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status} className="font-semibold">{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {total > 0 && (
              <div className="flex items-center gap-3 max-w-sm">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{completed} of {total} tasks</span>
                <Progress value={percentage} className="w-full" />
                <span className="text-sm font-semibold text-foreground">{Math.round(percentage)}%</span>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(patient.id)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Remove patient"
          >
            <Trash2 size={20} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tasks">
            <AccordionTrigger>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ChevronsUpDown size={18} />
                Manage Tasks
              </div>
            </AccordionTrigger>
            <AccordionContent>
                <PatientTasks patient={patient} onUpdatePatientField={props.onUpdatePatientField} />
            </AccordionContent>
          </AccordionItem>
          
          {patient.type === 'MRI' && patient.mriData &&
            <AccordionItem value="mri">
                <AccordionTrigger>
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <ChevronsUpDown size={18} />
                        MRI Anesthesia Calculator
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <MriCalculator 
                      patient={patient} 
                      onUpdateMriData={props.onUpdateMriData}
                      onUpdatePatientField={props.onUpdatePatientField}
                    />
                </AccordionContent>
            </AccordionItem>
          }
          
          <AccordionItem value="details">
            <AccordionTrigger>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <ChevronsUpDown size={18} />
                    Patient Details & Rounding
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <PatientDetailsForm 
                    patient={patient}
                    onUpdatePatientField={props.onUpdatePatientField}
                    onUpdateRoundingData={props.onUpdateRoundingData}
                    onUpdatePatientInfo={props.onUpdatePatientInfo}
                    onParsePatientDetails={props.onParsePatientDetails}
                    onParseBloodWork={props.onParseBloodWork}
                />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default PatientCard;
