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
import { PARTICIPATION_LEVELS, COMMON_PROCEDURES } from '@/lib/residency-milestones';

interface SurgeryTrackerProps {
  dailyEntryId: string | null;
  surgeries: Surgery[];
  onNeedsDailyEntry?: () => void;
}

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
                {Object.entries(PARTICIPATION_LEVELS).map(([key, { label, color }]) => (
                  <Button
                    key={key}
                    variant={newSurgery.participation === key ? 'default' : 'outline'}
                    className={cn(
                      'flex flex-col h-auto min-h-[44px] py-3 px-1',
                      newSurgery.participation === key && color
                    )}
                    onClick={() => setNewSurgery((s) => ({ ...s, participation: key as Surgery['participation'] }))}
                  >
                    <span className="font-bold text-base">{key}</span>
                    <span className="text-[10px] sm:text-xs opacity-80 leading-tight">{label}</span>
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
              <Button
                onClick={handleAdd}
                disabled={!newSurgery.procedureName || addMutation.isPending}
                className="h-11 min-h-[44px] px-6"
              >
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Surgery
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="h-11 min-h-[44px]"
              >
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
                      PARTICIPATION_LEVELS[surgery.participation as keyof typeof PARTICIPATION_LEVELS]?.color || 'bg-gray-500'
                    )}
                  >
                    {surgery.participation}
                  </div>
                  <div>
                    <p className="font-medium">{surgery.procedureName}</p>
                    <p className="text-sm text-muted-foreground">
                      {PARTICIPATION_LEVELS[surgery.participation as keyof typeof PARTICIPATION_LEVELS]?.description || surgery.participation}
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
