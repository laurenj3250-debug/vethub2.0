'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddSurgery, useDeleteSurgery, type Surgery } from '@/hooks/useResidencyStats';
import { Scissors, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurgeryTrackerProps {
  dailyEntryId: string | null;
  surgeries: Surgery[];
  onNeedsDailyEntry?: () => void;
}

const PARTICIPATION_LABELS: Record<string, { label: string; description: string; color: string }> = {
  S: { label: 'Surgeon', description: 'Primary surgeon', color: 'bg-green-500' },
  O: { label: 'Observer', description: 'Observing only', color: 'bg-gray-400' },
  C: { label: 'Circulator', description: 'Circulating/assisting', color: 'bg-blue-400' },
  D: { label: 'Dissector', description: 'Dissecting/exposing', color: 'bg-yellow-500' },
  K: { label: 'Knife', description: 'Cutting/suturing assistant', color: 'bg-orange-500' },
};

const COMMON_PROCEDURES = [
  'Hemilaminectomy',
  'Ventral Slot',
  'Craniotomy',
  'Foramen Magnum Decompression',
  'Atlantoaxial Stabilization',
  'Lumbosacral Dorsal Laminectomy',
  'Lateral Corpectomy',
  'VP Shunt',
  'Peripheral Nerve Biopsy',
  'Muscle Biopsy',
];

export function SurgeryTracker({ dailyEntryId, surgeries, onNeedsDailyEntry }: SurgeryTrackerProps) {
  const addMutation = useAddSurgery();
  const deleteMutation = useDeleteSurgery();

  const [showForm, setShowForm] = useState(false);
  const [newSurgery, setNewSurgery] = useState({
    procedureName: '',
    participation: 'O' as 'S' | 'O' | 'C' | 'D' | 'K',
    patientName: '',
  });

  const handleAdd = async () => {
    if (!dailyEntryId) {
      onNeedsDailyEntry?.();
      return;
    }
    if (!newSurgery.procedureName) return;

    await addMutation.mutateAsync({
      dailyEntryId,
      procedureName: newSurgery.procedureName,
      participation: newSurgery.participation,
      patientName: newSurgery.patientName || undefined,
    });

    setNewSurgery({ procedureName: '', participation: 'O', patientName: '' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Scissors className="h-5 w-5 text-red-500" />
            Surgeries Today
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Surgery
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Surgery Form */}
        {showForm && (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="space-y-2">
              <Label>Procedure</Label>
              <Select
                value={newSurgery.procedureName}
                onValueChange={(v) => setNewSurgery((s) => ({ ...s, procedureName: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or type procedure..." />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_PROCEDURES.map((proc) => (
                    <SelectItem key={proc} value={proc}>
                      {proc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type custom procedure..."
                value={newSurgery.procedureName}
                onChange={(e) => setNewSurgery((s) => ({ ...s, procedureName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Your Role</Label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(PARTICIPATION_LABELS).map(([key, { label, color }]) => (
                  <Button
                    key={key}
                    variant={newSurgery.participation === key ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'flex flex-col h-auto py-2',
                      newSurgery.participation === key && color
                    )}
                    onClick={() => setNewSurgery((s) => ({ ...s, participation: key as Surgery['participation'] }))}
                  >
                    <span className="font-bold">{key}</span>
                    <span className="text-xs opacity-80">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Patient Name (optional)</Label>
              <Input
                placeholder="e.g., Max, Bella..."
                value={newSurgery.patientName}
                onChange={(e) => setNewSurgery((s) => ({ ...s, patientName: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAdd} disabled={!newSurgery.procedureName || addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Surgery
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Surgery List */}
        {surgeries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No surgeries logged today
          </p>
        ) : (
          <div className="space-y-2">
            {surgeries.map((surgery) => (
              <div
                key={surgery.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm',
                      PARTICIPATION_LABELS[surgery.participation]?.color || 'bg-gray-500'
                    )}
                  >
                    {surgery.participation}
                  </div>
                  <div>
                    <p className="font-medium">{surgery.procedureName}</p>
                    <p className="text-sm text-muted-foreground">
                      {PARTICIPATION_LABELS[surgery.participation]?.description || surgery.participation}
                      {surgery.patientName && ` • ${surgery.patientName}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(surgery.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
