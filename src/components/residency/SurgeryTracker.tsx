'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteSurgery, useEditSurgery, type Surgery } from '@/hooks/useResidencyStats';
import { Scissors, Plus, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { suggestCertCategories } from '@/lib/certificate-logic';
import { SurgeryQuickForm } from './SurgeryQuickForm';

interface SurgeryTrackerProps {
  dailyEntryId: string | null;
  date?: string;
  surgeries: Surgery[];
}

export function SurgeryTracker({ dailyEntryId, date, surgeries }: SurgeryTrackerProps) {
  const deleteMutation = useDeleteSurgery();
  const editMutation = useEditSurgery();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProcedure, setEditProcedure] = useState('');
  const [editRole, setEditRole] = useState<'Primary' | 'Assistant'>('Primary');

  const handleDelete = async (id: string, procedureName: string) => {
    if (!window.confirm(`Delete "${procedureName}"? This also removes the linked ACVIM case log entry.`)) return;
    await deleteMutation.mutateAsync(id);
  };

  const startEdit = (surgery: Surgery) => {
    setEditingId(surgery.id);
    setEditProcedure(surgery.procedureName);
    setEditRole(surgery.role || 'Primary');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditProcedure('');
    setEditRole('Primary');
  };

  const saveEdit = async () => {
    if (!editingId || !editProcedure.trim()) return;
    const trimmedName = editProcedure.trim();
    const newCategories = suggestCertCategories(trimmedName);
    await editMutation.mutateAsync({
      id: editingId,
      procedureName: trimmedName,
      role: editRole,
      certificateCategories: newCategories,
    });
    setEditingId(null);
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
              const isEditing = editingId === surgery.id;
              const displayRole = surgery.role || (surgery.participation === 'S' ? 'Primary' : 'Assistant');
              const roleColor = displayRole === 'Primary' ? 'bg-green-500' : 'bg-blue-400';

              if (isEditing) {
                return (
                  <div
                    key={surgery.id}
                    className="flex items-center gap-2 p-3 border rounded-lg border-blue-300 bg-blue-50/50"
                  >
                    <button
                      type="button"
                      onClick={() => setEditRole(editRole === 'Primary' ? 'Assistant' : 'Primary')}
                      className={cn(
                        'px-2 py-1 rounded-full text-white font-bold text-xs cursor-pointer shrink-0',
                        editRole === 'Primary' ? 'bg-green-500' : 'bg-blue-400'
                      )}
                    >
                      {editRole}
                    </button>
                    <Input
                      value={editProcedure}
                      onChange={(e) => setEditProcedure(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={saveEdit}
                      disabled={editMutation.isPending || !editProcedure.trim()}
                      className="shrink-0"
                    >
                      {editMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelEdit}
                      disabled={editMutation.isPending}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              }

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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(surgery)}
                      disabled={deleteMutation.isPending}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(surgery.id, surgery.procedureName)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
