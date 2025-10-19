'use client';

import React, {useState} from 'react';
import { Patient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BrainCircuit, TestTube } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type PatientDetailsFormProps = {
  patient: Patient;
  onUpdatePatientField: <K extends keyof Patient>(id: number, field: K, value: Patient[K]) => void;
  onUpdateRoundingData: (id: number, field: string, value: string) => void;
  onUpdatePatientInfo: (id: number, field: string, value: string) => void;
  onParsePatientDetails: (id: number, text: string) => Promise<void>;
  onParseBloodWork: (id: number, text: string) => Promise<void>;
};

const PatientDetailsForm: React.FC<PatientDetailsFormProps> = ({ 
  patient, 
  onUpdatePatientField,
  onUpdateRoundingData,
  onUpdatePatientInfo,
  onParsePatientDetails,
  onParseBloodWork,
}) => {
  const [isParsingDetails, setIsParsingDetails] = useState(false);
  const [isParsingBloodWork, setIsParsingBloodWork] = useState(false);
  const {toast} = useToast();

  const handleParseDetails = async () => {
    setIsParsingDetails(true);
    await onParsePatientDetails(patient.id, patient.detailsInput);
    setIsParsingDetails(false);
  };
  
  const handleParseBloodWork = async () => {
    setIsParsingBloodWork(true);
    await onParseBloodWork(patient.id, patient.bwInput);
    setIsParsingBloodWork(false);
  };

  const addChestXray = () => {
    let xrayLine = 'CXR: ';
    
    if (patient.xrayStatus === 'NSF') xrayLine += 'NSF';
    else if (patient.xrayStatus === 'Pending') xrayLine += 'pending';
    else if (patient.xrayStatus === 'Other') {
      if (!patient.xrayOther.trim()) {
        toast({variant: "destructive", title: "Input Required", description: "Please describe the X-ray findings."});
        return;
      }
      xrayLine += patient.xrayOther;
    }
    
    const currentDx = patient.roundingData.diagnosticFindings || '';
    const newDx = currentDx ? `${currentDx}\n${xrayLine}` : xrayLine;
    onUpdateRoundingData(patient.id, 'diagnosticFindings', newDx);
    onUpdatePatientField(patient.id, 'xrayOther', '');
  };

  const renderInput = (label: string, field: keyof Patient['roundingData'], placeholder: string) => (
    <div className="space-y-1">
      <Label htmlFor={`${patient.id}-${field}`}>{label}</Label>
      <Input
        id={`${patient.id}-${field}`}
        value={patient.roundingData[field] || ''}
        onChange={(e) => onUpdateRoundingData(patient.id, field, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
  
  const renderTextarea = (label: string, field: keyof Patient['roundingData'], placeholder: string, rows = 2) => (
    <div className="space-y-1 col-span-1 sm:col-span-2">
      <Label htmlFor={`${patient.id}-${field}`}>{label}</Label>
      <Textarea
        id={`${patient.id}-${field}`}
        value={patient.roundingData[field] || ''}
        onChange={(e) => onUpdateRoundingData(patient.id, field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
  
  const renderPatientInfoInput = (label: string, field: keyof Patient['patientInfo'], placeholder: string) => (
    <div className="space-y-1">
      <Label htmlFor={`${patient.id}-info-${field}`}>{label}</Label>
      <Input
        id={`${patient.id}-info-${field}`}
        value={patient.patientInfo[field] || ''}
        onChange={(e) => onUpdatePatientInfo(patient.id, field, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
  
  return (
    <div className="space-y-6 pt-4">
      
      {/* Patient Info Section */}
      <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
        <h4 className="text-base font-bold text-foreground">Patient Info (for stickers)</h4>
        
        <div className="p-3 bg-background border rounded-lg space-y-2">
          <Label htmlFor={`${patient.id}-details`}>Quick Import - Paste Patient Details</Label>
          <Textarea
            id={`${patient.id}-details`}
            value={patient.detailsInput}
            onChange={(e) => onUpdatePatientField(patient.id, 'detailsInput', e.target.value)}
            placeholder="Paste patient info from eVetPractice, Easy Vet, etc..."
            rows={4}
          />
          <Button onClick={handleParseDetails} size="sm" disabled={isParsingDetails}>
            <BrainCircuit className="mr-2 h-4 w-4" />
            {isParsingDetails ? 'Extracting...' : 'Extract Patient Info with AI'}
          </Button>
          <p className="text-xs text-muted-foreground italic">Will auto-fill fields below using AI.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderPatientInfoInput('Patient ID', 'patientId', 'Patient ID')}
          {renderPatientInfoInput('Client ID', 'clientId', 'Client ID')}
          {renderPatientInfoInput('Owner Name', 'ownerName', 'Owner Name')}
          {renderPatientInfoInput('Owner Phone', 'ownerPhone', 'Owner Phone')}
          <div className="space-y-1">
            <Label>Species</Label>
            <Select value={patient.patientInfo.species || 'Canine'} onValueChange={(v: 'Canine'|'Feline') => onUpdatePatientInfo(patient.id, 'species', v)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Canine">Canine</SelectItem>
                    <SelectItem value="Feline">Feline</SelectItem>
                </SelectContent>
            </Select>
          </div>
          {renderPatientInfoInput('Breed', 'breed', 'Breed')}
          {renderPatientInfoInput('Color', 'color', 'Color')}
          {renderPatientInfoInput('Sex', 'sex', 'Sex')}
          {renderPatientInfoInput('Weight', 'weight', 'Weight')}
          {renderPatientInfoInput('DOB', 'dob', 'DOB')}
          {renderPatientInfoInput('Age', 'age', 'Age')}
        </div>
      </div>
      
      {/* Rounding Sheet Section */}
      <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
          <h4 className="text-base font-bold text-foreground">Rounding Sheet Data</h4>
          
          <div className="p-4 bg-background border rounded-lg space-y-4">
              <h5 className="text-sm font-bold text-foreground">Quick Add Diagnostics</h5>
              
              <div className="space-y-2">
                  <Label>Blood Work (paste results)</Label>
                  <Textarea
                      value={patient.bwInput}
                      onChange={(e) => onUpdatePatientField(patient.id, 'bwInput', e.target.value)}
                      placeholder="Paste full blood work results here..."
                      rows={3}
                  />
                  <Button onClick={handleParseBloodWork} size="sm" disabled={isParsingBloodWork}>
                    <TestTube className="mr-2 h-4 w-4" />
                    {isParsingBloodWork ? 'Analyzing...' : 'Extract Abnormals with AI'}
                  </Button>
              </div>
              
              <div className="space-y-2">
                  <Label>Chest X-ray</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                      <Select
                          value={patient.xrayStatus}
                          onValueChange={(v) => onUpdatePatientField(patient.id, 'xrayStatus', v as any)}
                      >
                          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue/></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="NSF">NSF</SelectItem>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                      </Select>
                      {patient.xrayStatus === 'Other' && (
                          <Input
                              type="text"
                              value={patient.xrayOther}
                              onChange={(e) => onUpdatePatientField(patient.id, 'xrayOther', e.target.value)}
                              placeholder="Describe findings..."
                              className="flex-1"
                          />
                      )}
                      <Button onClick={addChestXray} size="sm" variant="secondary">Add to Findings</Button>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderInput('Signalment', 'signalment', 'e.g., 2yo MN GSD')}
              {renderInput('Location', 'location', 'e.g., Ward, ICU')}
              {renderInput('ICU Criteria', 'icuCriteria', 'ICU Criteria')}
              <div className="space-y-1">
                  <Label>Code Status</Label>
                  <Select value={patient.roundingData.codeStatus || 'Yellow'} onValueChange={(v: 'Yellow' | 'Red') => onUpdateRoundingData(patient.id, 'codeStatus', v)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Yellow">Yellow</SelectItem>
                          <SelectItem value="Red">Red</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

              {renderTextarea('Diagnostic Findings', 'diagnosticFindings', 'Diagnostic Findings', 3)}
              {renderTextarea('Current Therapeutics', 'therapeutics', 'Current Therapeutics', 3)}
              
              {renderInput('Replace IVC (y/n)', 'replaceIVC', 'e.g., Yes, due 1/1')}
              {renderInput('Replace Fluids (y/n)', 'replaceFluids', 'e.g., Yes, due 1/1')}
              {renderInput('Replace CRI (y/n)', 'replaceCRI', 'e.g., No')}
              {renderInput('Overnight Diagnostics', 'overnightDiagnostics', 'e.g., PCV/TS q4h')}
              
              {renderTextarea('Overnight Concerns/Alerts', 'overnightConcerns', 'Overnight Concerns/Alerts')}
              {renderTextarea('Additional Comments', 'additionalComments', 'Additional Comments')}
          </div>
      </div>
    </div>
  );
};

export default PatientDetailsForm;
