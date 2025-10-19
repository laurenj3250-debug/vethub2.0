'use client';

import React, {useCallback} from 'react';
import { Patient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type MriCalculatorProps = {
  patient: Patient;
  onUpdateMriData: (id: number, field: string, value: string | boolean) => void;
  onUpdatePatientField: <K extends keyof Patient>(id: number, field: K, value: Patient[K]) => void;
};

const MriCalculator: React.FC<MriCalculatorProps> = ({ patient, onUpdateMriData, onUpdatePatientField }) => {
  const { toast } = useToast();
  
  const calculateMRIDrugs = useCallback(() => {
    if (!patient.mriData || !patient.mriData.weight) {
      toast({ variant: "destructive", title: "Missing Weight", description: "Please enter patient weight to calculate." });
      return;
    }

    let weightKg = parseFloat(patient.mriData.weight);
    if (patient.mriData.weightUnit === 'lbs') {
      weightKg = weightKg / 2.20462;
    }

    const isBrain = patient.mriData.scanType === 'Brain';
    const preMedDose = weightKg * 0.2;
    const preMedVolume = preMedDose / 10;
    const valiumDose = weightKg * 0.25;
    const valiumVolume = valiumDose / 5;
    const contrastVolume = weightKg * 0.22;
    
    const newMriData = {
        ...patient.mriData,
        weightKg: weightKg.toFixed(1),
        preMedDrug: isBrain ? 'Butorphanol' : 'Methadone',
        preMedDose: preMedDose.toFixed(2),
        preMedVolume: preMedVolume.toFixed(2),
        valiumDose: valiumDose.toFixed(2),
        valiumVolume: valiumVolume.toFixed(2),
        contrastVolume: contrastVolume.toFixed(1),
        calculated: true,
    };

    onUpdatePatientField(patient.id, 'mriData', newMriData);

    toast({ title: "Doses Calculated", description: `Calculations complete for ${patient.name}.` });
  }, [patient, onUpdatePatientField, toast]);
  
  if (!patient.mriData) return null;

  return (
    <div className="space-y-4 p-4 bg-primary/10 rounded-lg mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div className="space-y-1">
          <Label>Weight</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              value={patient.mriData.weight}
              onChange={(e) => onUpdateMriData(patient.id, 'weight', e.target.value)}
              placeholder="Enter weight"
            />
            <Select
              value={patient.mriData.weightUnit}
              onValueChange={(value: 'kg' | 'lbs') => onUpdateMriData(patient.id, 'weightUnit', value)}
            >
              <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lbs">lbs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Scan Type</Label>
          <Select
            value={patient.mriData.scanType}
            onValueChange={(value) => onUpdateMriData(patient.id, 'scanType', value)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Brain">Brain</SelectItem>
              <SelectItem value="TL">TL</SelectItem>
              <SelectItem value="LS">LS</SelectItem>
              <SelectItem value="Cervical">Cervical</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={calculateMRIDrugs}
        disabled={!patient.mriData.weight}
        className="w-full"
      >
        <Calculator className="mr-2 h-4 w-4" />
        Calculate Doses
      </Button>

      {patient.mriData.calculated && (
        <div className="bg-background p-3 rounded-lg border">
          <div className="font-semibold text-foreground mb-2 p-2 bg-primary/10 rounded">
            Pre-med: {patient.mriData.preMedDrug} {patient.mriData.scanType === 'Brain' ? '(Brain)' : ''}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Weight (kg):</span>
              <span className="font-bold ml-2 text-foreground">{patient.mriData.weightKg} kg</span>
            </div>
            <div>
              <span className="text-muted-foreground">{patient.mriData.preMedDrug}:</span>
              <span className="font-bold ml-2 text-foreground">{patient.mriData.preMedDose} mg ({patient.mriData.preMedVolume} mL)</span>
            </div>
            <div>
              <span className="text-muted-foreground">Valium:</span>
              <span className="font-bold ml-2 text-foreground">{patient.mriData.valiumDose} mg ({patient.mriData.valiumVolume} mL)</span>
            </div>
            <div>
              <span className="text-muted-foreground">Contrast:</span>
              <span className="font-bold ml-2 text-foreground">{patient.mriData.contrastVolume} mL</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MriCalculator;
