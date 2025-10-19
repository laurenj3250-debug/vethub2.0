'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ProcedureType } from '@/lib/types';
import { procedureTypes } from '@/lib/constants';

type AddPatientFormProps = {
  onAddPatient: (name: string, type: ProcedureType) => void;
};

const AddPatientForm: React.FC<AddPatientFormProps> = ({ onAddPatient }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProcedureType>('Surgery');

  const handleAdd = () => {
    if (name.trim()) {
      onAddPatient(name, type);
      setName('');
      setType('Surgery');
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Patient name (e.g., Max - Golden Retriever)"
            className="flex-1"
          />
          <Select value={type} onValueChange={(value: ProcedureType) => setType(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {procedureTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus />
            Add Patient
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddPatientForm;
