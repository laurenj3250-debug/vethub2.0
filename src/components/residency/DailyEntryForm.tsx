'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyEntry, useSaveDailyEntry } from '@/hooks/useResidencyStats';
import { Calendar, Stethoscope, Brain, Users, Loader2 } from 'lucide-react';

interface DailyEntryFormProps {
  selectedDate?: string;
  onSaved?: () => void;
}

export function DailyEntryForm({ selectedDate, onSaved }: DailyEntryFormProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const date = selectedDate || today;

  const { data: existingEntry, isLoading } = useDailyEntry(date);
  const saveMutation = useSaveDailyEntry();

  const [formData, setFormData] = useState({
    mriCount: 0,
    recheckCount: 0,
    newCount: 0,
    notes: '',
  });

  // Load existing data when entry is fetched
  useEffect(() => {
    if (existingEntry) {
      setFormData({
        mriCount: existingEntry.mriCount,
        recheckCount: existingEntry.recheckCount,
        newCount: existingEntry.newCount,
        notes: existingEntry.notes || '',
      });
    } else {
      setFormData({ mriCount: 0, recheckCount: 0, newCount: 0, notes: '' });
    }
  }, [existingEntry]);

  const handleSave = async () => {
    await saveMutation.mutateAsync({ date, ...formData });
    onSaved?.();
  };

  const totalCases = formData.mriCount + formData.recheckCount + formData.newCount;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Daily Entry - {format(new Date(date + 'T12:00:00'), 'EEEE, MMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MRI Count */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            MRIs
          </Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-12 min-h-[44px] min-w-[44px] text-xl font-bold"
              onClick={() => setFormData((d) => ({ ...d, mriCount: Math.max(0, d.mriCount - 1) }))}
            >
              -
            </Button>
            <Input
              type="number"
              min={0}
              value={formData.mriCount}
              onChange={(e) => setFormData((d) => ({ ...d, mriCount: parseInt(e.target.value) || 0 }))}
              className="w-20 h-12 text-center text-lg font-semibold"
            />
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-12 min-h-[44px] min-w-[44px] text-xl font-bold"
              onClick={() => setFormData((d) => ({ ...d, mriCount: d.mriCount + 1 }))}
            >
              +
            </Button>
          </div>
        </div>

        {/* Appointments - Recheck */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Recheck Appointments
          </Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-12 min-h-[44px] min-w-[44px] text-xl font-bold"
              onClick={() => setFormData((d) => ({ ...d, recheckCount: Math.max(0, d.recheckCount - 1) }))}
            >
              -
            </Button>
            <Input
              type="number"
              min={0}
              value={formData.recheckCount}
              onChange={(e) => setFormData((d) => ({ ...d, recheckCount: parseInt(e.target.value) || 0 }))}
              className="w-20 h-12 text-center text-lg font-semibold"
            />
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-12 min-h-[44px] min-w-[44px] text-xl font-bold"
              onClick={() => setFormData((d) => ({ ...d, recheckCount: d.recheckCount + 1 }))}
            >
              +
            </Button>
          </div>
        </div>

        {/* Appointments - New */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-green-500" />
            New Appointments
          </Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-12 min-h-[44px] min-w-[44px] text-xl font-bold"
              onClick={() => setFormData((d) => ({ ...d, newCount: Math.max(0, d.newCount - 1) }))}
            >
              -
            </Button>
            <Input
              type="number"
              min={0}
              value={formData.newCount}
              onChange={(e) => setFormData((d) => ({ ...d, newCount: parseInt(e.target.value) || 0 }))}
              className="w-20 h-12 text-center text-lg font-semibold"
            />
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-12 min-h-[44px] min-w-[44px] text-xl font-bold"
              onClick={() => setFormData((d) => ({ ...d, newCount: d.newCount + 1 }))}
            >
              +
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Interesting cases, learnings, etc."
            rows={2}
          />
        </div>

        {/* Total & Save */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            Total cases today: <span className="font-semibold text-foreground">{totalCases}</span>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : existingEntry ? (
              'Update Entry'
            ) : (
              'Save Entry'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
