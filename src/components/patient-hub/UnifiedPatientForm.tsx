'use client';

import { useState } from 'react';
import { Upload, Mic, FileText, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VetRadarImageUpload } from './VetRadarImageUpload';

interface UnifiedPatientFormProps {
  data: any;
  onChange: (data: any) => void;
}

export function UnifiedPatientForm({ data, onChange }: UnifiedPatientFormProps) {
  const [pasteText, setPasteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleQuickInput = async (method: 'paste' | 'voice' | 'vetradar') => {
    if (method === 'paste' && pasteText) {
      setIsParsing(true);
      try {
        // Use existing AI parser
        const response = await fetch('/api/ai-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pasteText }),
        });

        const parsed = await response.json();

        // Transform parsed data into unified format
        const unifiedData = {
          demographics: {
            name: parsed.patientName || '',
            species: parsed.species || 'Dog',
            breed: parsed.breed || '',
            age: parsed.age || '',
            sex: parsed.sex || '',
            weight: parsed.weight || 0,
          },
          type: parsed.visitType === 'mri' ? 'MRI' : parsed.visitType === 'surgery' ? 'Surgery' : 'Medical',
          location: 'ICU',
          icuCriteria: 'Yes',
          codeStatus: 'Green',
          clinical: {
            history: parsed.currentHistory || '',
            problems: parsed.problems || '',
            diagnosticFindings: parsed.diagnosticFindings || '',
            medications: parsed.currentMedications || '',
            treatments: parsed.treatments || '',
            fluids: parsed.fluids || '',
            neurolocalization: parsed.neurolocalization || '',
            ddx: parsed.ddx || '',
            diagnostics: parsed.diagnosticsToday || '',
          },
        };

        onChange(unifiedData);
        setPasteText('');
      } catch (error) {
        console.error('Parse error:', error);
      } finally {
        setIsParsing(false);
      }
    }
  };

  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    const newData = { ...data };
    let current = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    onChange(newData);
  };

  const handleImageDataExtracted = (imageData: any) => {
    // Merge image data with existing data
    const mergedData = {
      ...data,
      demographics: {
        ...data.demographics,
        name: imageData.signalment?.split(' ')?.[0] || data.demographics?.name || '',
      },
      location: imageData.location || data.location,
      clinical: {
        ...data.clinical,
        problems: imageData.problems || data.clinical?.problems || '',
        diagnosticFindings: imageData.diagnosticFindings || data.clinical?.diagnosticFindings || '',
        medications: imageData.therapeutics || data.clinical?.medications || '',
        fluids: imageData.fluids || data.clinical?.fluids || '',
        concerns: imageData.concerns || data.clinical?.concerns || '',
      },
    };
    onChange(mergedData);
  };

  return (
    <div className="space-y-6">
      {/* Quick Input Section */}
      <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/30">
        <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
          <Sparkles size={16} />
          Quick Input Methods
        </h3>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="text" className="data-[state=active]:bg-purple-600">
              <FileText size={16} className="mr-2" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="image" className="data-[state=active]:bg-purple-600">
              <ImageIcon size={16} className="mr-2" />
              Upload Screenshot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3 mt-4">
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste EzyVet/VetRadar text, referral email, or any patient info here..."
              rows={4}
              className="w-full bg-slate-800 border-slate-700 text-white"
            />

            <Button
              onClick={() => handleQuickInput('paste')}
              disabled={!pasteText || isParsing}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <FileText size={16} className="mr-2" />
              {isParsing ? 'Parsing...' : 'Parse Text'}
            </Button>
          </TabsContent>

          <TabsContent value="image" className="mt-4">
            <VetRadarImageUpload onDataExtracted={handleImageDataExtracted} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Demographics */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
          Demographics
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="text-slate-300">Patient Name *</Label>
            <Input
              id="name"
              value={data.demographics?.name || ''}
              onChange={(e) => updateField('demographics.name', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="e.g., Max Smith"
            />
          </div>

          <div>
            <Label htmlFor="species" className="text-slate-300">Species</Label>
            <Select
              value={data.demographics?.species || 'Dog'}
              onValueChange={(value) => updateField('demographics.species', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dog">Dog</SelectItem>
                <SelectItem value="Cat">Cat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="breed" className="text-slate-300">Breed</Label>
            <Input
              id="breed"
              value={data.demographics?.breed || ''}
              onChange={(e) => updateField('demographics.breed', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="e.g., Golden Retriever"
            />
          </div>

          <div>
            <Label htmlFor="age" className="text-slate-300">Age</Label>
            <Input
              id="age"
              value={data.demographics?.age || ''}
              onChange={(e) => updateField('demographics.age', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="e.g., 5yo"
            />
          </div>

          <div>
            <Label htmlFor="sex" className="text-slate-300">Sex</Label>
            <Select
              value={data.demographics?.sex || 'MN'}
              onValueChange={(value) => updateField('demographics.sex', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MN">MN (Male Neutered)</SelectItem>
                <SelectItem value="FS">FS (Female Spayed)</SelectItem>
                <SelectItem value="M">M (Male Intact)</SelectItem>
                <SelectItem value="F">F (Female Intact)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="weight" className="text-slate-300">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={data.demographics?.weight || ''}
              onChange={(e) => updateField('demographics.weight', parseFloat(e.target.value) || 0)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="e.g., 25"
            />
          </div>
        </div>
      </div>

      {/* Patient Type & Status */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
          Type & Status
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="type" className="text-slate-300">Patient Type</Label>
            <Select
              value={data.type || 'Medical'}
              onValueChange={(value) => updateField('type', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Medical">Medical</SelectItem>
                <SelectItem value="MRI">MRI</SelectItem>
                <SelectItem value="Surgery">Surgery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="code" className="text-slate-300">Code Status</Label>
            <Select
              value={data.codeStatus || 'Green'}
              onValueChange={(value) => updateField('codeStatus', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Green">Green</SelectItem>
                <SelectItem value="Yellow">Yellow</SelectItem>
                <SelectItem value="Orange">Orange</SelectItem>
                <SelectItem value="Red">Red</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Clinical Data */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
          Clinical Information
        </h3>

        <div>
          <Label htmlFor="history" className="text-slate-300">History</Label>
          <Textarea
            id="history"
            value={data.clinical?.history || ''}
            onChange={(e) => updateField('clinical.history', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white"
            rows={3}
            placeholder="Current history, presenting complaint..."
          />
        </div>

        <div>
          <Label htmlFor="problems" className="text-slate-300">Problems</Label>
          <Textarea
            id="problems"
            value={data.clinical?.problems || ''}
            onChange={(e) => updateField('clinical.problems', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white"
            rows={2}
            placeholder="e.g., Paraparesis T3-L3"
          />
        </div>

        <div>
          <Label htmlFor="medications" className="text-slate-300">Medications</Label>
          <Textarea
            id="medications"
            value={data.clinical?.medications || ''}
            onChange={(e) => updateField('clinical.medications', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white"
            rows={2}
            placeholder="e.g., Gabapentin 300mg PO TID"
          />
        </div>

        <div>
          <Label htmlFor="diagnostics" className="text-slate-300">Diagnostic Findings</Label>
          <Textarea
            id="diagnostics"
            value={data.clinical?.diagnosticFindings || ''}
            onChange={(e) => updateField('clinical.diagnosticFindings', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white"
            rows={2}
            placeholder="e.g., MRI: C2-C3 IVDD"
          />
        </div>
      </div>
    </div>
  );
}
