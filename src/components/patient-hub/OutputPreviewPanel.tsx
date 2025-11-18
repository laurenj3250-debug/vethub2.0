'use client';

import { useState } from 'react';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OutputPreviewPanelProps {
  patientData: any;
  outputs: any;
}

export function OutputPreviewPanel({ patientData, outputs }: OutputPreviewPanelProps) {
  const [activeTab, setActiveTab] = useState('rounding');

  const hasOutputs = outputs.roundingSheet || outputs.soapNote || outputs.treatmentSheet;

  if (!hasOutputs) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Clock size={48} className="mb-4 opacity-50" />
        <p className="text-lg">Generate outputs to see preview</p>
        <p className="text-sm mt-2">Fill in patient data and click "Generate All"</p>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-4 bg-slate-900/50">
        <TabsTrigger value="rounding" className="data-[state=active]:bg-purple-600">
          Rounding
        </TabsTrigger>
        <TabsTrigger value="soap" className="data-[state=active]:bg-purple-600">
          SOAP
        </TabsTrigger>
        <TabsTrigger value="treatment" className="data-[state=active]:bg-purple-600">
          Treatment
        </TabsTrigger>
        <TabsTrigger value="stickers" className="data-[state=active]:bg-purple-600">
          Stickers
        </TabsTrigger>
      </TabsList>

      <div className="mt-4 space-y-4">
        <TabsContent value="rounding" className="space-y-3">
          <PreviewCard title="Rounding Sheet Preview">
            {outputs.roundingSheet ? (
              <div className="space-y-2 text-sm">
                <PreviewField label="Signalment" value={outputs.roundingSheet.signalment} />
                <PreviewField label="Location" value={outputs.roundingSheet.location} />
                <PreviewField label="ICU Criteria" value={outputs.roundingSheet.icuCriteria} />
                <PreviewField label="Code Status" value={outputs.roundingSheet.code} badge />
                <PreviewField label="Problems" value={outputs.roundingSheet.problems} />
                <PreviewField label="Diagnostic Findings" value={outputs.roundingSheet.diagnosticFindings} />
                <PreviewField label="Therapeutics" value={outputs.roundingSheet.therapeutics} />
                <PreviewField label="Fluids" value={outputs.roundingSheet.fluids} />
                <PreviewField label="Day Count" value={`Day ${outputs.roundingSheet.dayCount}`} />
              </div>
            ) : (
              <EmptyPreview />
            )}
          </PreviewCard>
        </TabsContent>

        <TabsContent value="soap" className="space-y-3">
          <PreviewCard title="SOAP Note Preview">
            {outputs.soapNote ? (
              <div className="space-y-2 text-sm">
                <PreviewField label="Visit Type" value={outputs.soapNote.visitType} />
                <PreviewSection title="Subjective">
                  <PreviewField label="History" value={outputs.soapNote.subjective?.currentHistory} />
                  <PreviewField label="Medications" value={outputs.soapNote.subjective?.medications} />
                </PreviewSection>
                <PreviewSection title="Assessment">
                  <PreviewField label="Neurolocalization" value={outputs.soapNote.assessment?.neurolocalization} />
                  <PreviewField label="DDx" value={outputs.soapNote.assessment?.ddx} />
                </PreviewSection>
                <PreviewSection title="Plan">
                  <PreviewField label="Diagnostics" value={outputs.soapNote.plan?.diagnostics} />
                  <PreviewField label="Treatments" value={outputs.soapNote.plan?.treatments} />
                </PreviewSection>
              </div>
            ) : (
              <EmptyPreview />
            )}
          </PreviewCard>
        </TabsContent>

        <TabsContent value="treatment" className="space-y-3">
          <PreviewCard title="Treatment Sheet Preview">
            {outputs.treatmentSheet ? (
              <div className="space-y-2 text-sm">
                <PreviewField label="Patient" value={outputs.treatmentSheet.patientName} />
                <PreviewField label="Medications" value={outputs.treatmentSheet.medications} />
                <PreviewField label="Fluids" value={outputs.treatmentSheet.fluids} />
                <PreviewField label="Treatments" value={outputs.treatmentSheet.treatments} />
              </div>
            ) : (
              <EmptyPreview />
            )}
          </PreviewCard>
        </TabsContent>

        <TabsContent value="stickers" className="space-y-3">
          <PreviewCard title="Sticker Labels Preview">
            {outputs.stickers ? (
              <div className="grid grid-cols-2 gap-4">
                {outputs.stickers.map((sticker: any, idx: number) => (
                  <div
                    key={idx}
                    className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center bg-white text-slate-900"
                  >
                    <p className="text-xs font-semibold text-slate-500 mb-2">{sticker.type.toUpperCase()}</p>
                    <p className="text-sm font-bold whitespace-pre-line">{sticker.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPreview />
            )}
          </PreviewCard>

          {outputs.mriSheet && (
            <PreviewCard title="MRI Sheet Preview">
              <div className="space-y-2 text-sm">
                <PreviewField label="Patient" value={outputs.mriSheet.patientName} />
                <PreviewField label="Weight" value={`${outputs.mriSheet.weight} kg`} />
                <PreviewField label="Scan Type" value={outputs.mriSheet.scanType} />
                <PreviewSection title="Anesthesia">
                  <PreviewField label="Premed" value={outputs.mriSheet.anesthesia?.premed} placeholder="To be filled" />
                  <PreviewField label="Induction" value={outputs.mriSheet.anesthesia?.induction} placeholder="To be filled" />
                  <PreviewField label="Maintenance" value={outputs.mriSheet.anesthesia?.maintenance} placeholder="To be filled" />
                </PreviewSection>
              </div>
            </PreviewCard>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
        <FileText size={16} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 pl-3 border-l-2 border-purple-500/30">
      <p className="text-xs font-semibold text-purple-300 mb-2">{title}</p>
      {children}
    </div>
  );
}

function PreviewField({
  label,
  value,
  badge = false,
  placeholder = 'Not provided'
}: {
  label: string;
  value?: string | number;
  badge?: boolean;
  placeholder?: string;
}) {
  const displayValue = value || placeholder;
  const isEmpty = !value;

  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-slate-400 min-w-[120px] text-xs">{label}:</span>
      {badge && value ? (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCodeStatusColor(value as string)}`}>
          {displayValue}
        </span>
      ) : (
        <span className={isEmpty ? 'text-slate-600 italic text-xs' : 'text-slate-200 text-xs'}>
          {displayValue}
        </span>
      )}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex items-center justify-center h-32 text-slate-500">
      <p className="text-sm">Click "Generate All" to create this output</p>
    </div>
  );
}

function getCodeStatusColor(code: string): string {
  switch (code) {
    case 'Green':
      return 'bg-emerald-600 text-white';
    case 'Yellow':
      return 'bg-yellow-500 text-slate-900';
    case 'Orange':
      return 'bg-orange-500 text-white';
    case 'Red':
      return 'bg-red-600 text-white';
    default:
      return 'bg-slate-600 text-white';
  }
}
