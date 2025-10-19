export type ProcedureType = 'Surgery' | 'MRI' | 'Medical' | 'Other';

export type PatientStatus =
  | 'New Admit'
  | 'Pre-procedure'
  | 'In Procedure'
  | 'Recovery'
  | 'Monitoring'
  | 'Ready for Discharge'
  | 'Discharged';

export type Task = {
  id: number;
  name: string;
  completed: boolean;
};

export type PatientInfo = {
  patientId?: string;
  clientId?: string;
  ownerName?: string;
  ownerPhone?: string;
  species?: 'Canine' | 'Feline';
  breed?: string;
  color?: string;
  sex?: string;
  weight?: string;
  dob?: string;
  age?: string;
};

export type RoundingData = {
  signalment?: string;
  location?: string;
  icuCriteria?: string;
  codeStatus?: 'Yellow' | 'Red';
  diagnosticFindings?: string;
  therapeutics?: string;
  replaceIVC?: string;
  replaceFluids?: string;
  replaceCRI?: string;
  overnightDiagnostics?: string;
  overnightConcerns?: string;
  additionalComments?: string;
};

export type MriData = {
  weight: string;
  weightUnit: 'kg' | 'lbs';
  scanType: 'Brain' | 'TL' | 'LS' | 'Cervical' | 'Other';
  calculated: boolean;
  weightKg?: string;
  preMedDrug?: 'Butorphanol' | 'Methadone';
  preMedDose?: string;
  preMedVolume?: string;
  valiumDose?: string;
  valiumVolume?: string;
  contrastVolume?: string;
};

export type Patient = {
  id: number;
  name: string;
  type: ProcedureType;
  status: PatientStatus;
  tasks: Task[];
  customTask: string;
  bwInput: string;
  xrayStatus: 'NSF' | 'Pending' | 'Other';
  xrayOther: string;
  detailsInput: string;
  patientInfo: PatientInfo;
  roundingData: RoundingData;
  mriData?: MriData;
  addedTime: string;
};

export type GeneralTask = {
  id: number;
  name: string;
  completed: boolean;
};
