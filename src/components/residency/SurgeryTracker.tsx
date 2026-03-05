'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteSurgery, type Surgery } from '@/hooks/useResidencyStats';
import { Scissors, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SurgeryQuickForm } from './SurgeryQuickForm';

interface SurgeryTrackerProps {
  dailyEntryId: string | null;
  date?: string;
  surgeries: Surgery[];
}

export function SurgeryTracker({ dailyEntryId, date, surgeries }: SurgeryTrackerProps) {
  const deleteMutation = useDeleteSurgery();

  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Scissors className="h-5 w-5 text-red-500" />
            Surgeries
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
        {showForm && (
          <SurgeryQuickForm
            dailyEntryId={dailyEntryId}
            date={date}
            variant="full"
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}

        {surgeries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No surgeries logged
          </p>
        ) : (
          <div className="space-y-2">
            {surgeries.map((surgery) => {
              const displayRole = surgery.role || (surgery.participation === 'S' ? 'Primary' : 'Assistant');
              const roleColor = displayRole === 'Primary' ? 'bg-green-500' : 'bg-blue-400';

              return (
                <div
                  key={surgery.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'px-2 py-1 rounded-full text-white font-bold text-xs',
                        roleColor
                      )}
                    >
                      {displayRole}
                    </div>
                    <div>
                      <p className="font-medium">{surgery.procedureName}</p>
                      <p className="text-sm text-muted-foreground">
                        {surgery.patientOrigin && (
                          <span className="capitalize">{surgery.patientOrigin}</span>
                        )}
                        {surgery.patientName && (
                          <span>{surgery.patientOrigin ? ' · ' : ''}{surgery.patientName}</span>
                        )}
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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
