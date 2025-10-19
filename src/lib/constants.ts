import type { ProcedureType, PatientStatus } from './types';

export const procedureTypes: ProcedureType[] = ['Surgery', 'MRI', 'Medical', 'Other'];

export const statusOptions: PatientStatus[] = [
  'New Admit',
  'Pre-procedure',
  'In Procedure',
  'Recovery',
  'Monitoring',
  'Ready for Discharge',
  'Discharged',
];

export const statusColors: Record<PatientStatus, string> = {
  'New Admit': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Pre-procedure': 'bg-blue-100 text-blue-800 border-blue-300',
  'In Procedure': 'bg-primary/20 text-primary border-primary/40',
  'Recovery': 'bg-orange-100 text-orange-800 border-orange-300',
  'Monitoring': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'Ready for Discharge': 'bg-green-100 text-green-800 border-green-300',
  'Discharged': 'bg-gray-100 text-gray-800 border-gray-300'
};

export const commonGeneralTasks: string[] = [
  'Check Comms',
  'Check Emails',
  'Draw Up Contrast',
  'Check Vet Radar',
  'Stock Check',
  'Equipment Check'
];

export const admitTasks: Record<ProcedureType, string[]> = {
  Surgery: [
    'Surgery Slip',
    'Written on Board',
    'Print 4 Large Stickers',
    'Print 2 Sheets Small Stickers',
    'Print Surgery Sheet'
  ],
  MRI: [
    'Blood Work',
    'Chest X-rays',
    'MRI Anesthesia Sheet',
    'NPO',
    'Black Book',
    'Print 5 Stickers',
    'Print 1 Sheet Small Stickers'
  ],
  Medical: [
    'Admission SOAP',
    'Treatment Sheet Created',
    'Owner Admission Call'
  ],
  Other: [
    'Admission SOAP',
    'Owner Admission Call'
  ]
};

export const morningTasks: string[] = [
  'Owner Called',
  'Daily SOAP Done',
  'Vet Radar Sheet Checked',
  'MRI Findings Inputted (if needed)'
];

export const eveningTasks: string[] = [
  'Vet Radar Done',
  'Rounding Sheet Done',
  'Sticker on Daily Sheet',
  'Owner Update Call'
];

export const commonTasks: string[] = [
  'SOAP Note',
  'Call Owner',
  'Discharge',
  'Discharge Instructions',
  'Recheck Exam',
  'Lab Results Review',
  'Medication Dispensed',
  'Treatment Sheet Update',
  'Pain Assessment'
];
