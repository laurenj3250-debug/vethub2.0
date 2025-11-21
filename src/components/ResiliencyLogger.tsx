'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react';

interface ResiliencyEntry {
  id: string;
  patientId: number;
  entryText: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

interface ResiliencyLoggerProps {
  patientId: number;
  patientName?: string;
}

const CATEGORIES = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'physical', label: 'Physical' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'social', label: 'Social' },
];

export function ResiliencyLogger({ patientId, patientName }: ResiliencyLoggerProps) {
  const [entries, setEntries] = useState<ResiliencyEntry[]>([]);
  const [newEntryText, setNewEntryText] = useState('');
  const [newEntryCategory, setNewEntryCategory] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch entries on mount
  useEffect(() => {
    fetchEntries();
  }, [patientId]);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/resiliency/patients/${patientId}`);
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching resiliency entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resiliency entries',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEntry = async () => {
    if (!newEntryText.trim()) {
      toast({
        title: 'Error',
        description: 'Entry text cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/resiliency/patients/${patientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryText: newEntryText,
          category: newEntryCategory || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create entry');

      const newEntry = await response.json();
      setEntries([newEntry, ...entries]);
      setNewEntryText('');
      setNewEntryCategory('');

      toast({
        title: 'Success',
        description: 'Resiliency entry created',
      });
    } catch (error) {
      console.error('Error creating entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to create entry',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (entry: ResiliencyEntry) => {
    setEditingId(entry.id);
    setEditText(entry.entryText);
    setEditCategory(entry.category || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
    setEditCategory('');
  };

  const handleUpdateEntry = async (entryId: string) => {
    if (!editText.trim()) {
      toast({
        title: 'Error',
        description: 'Entry text cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/resiliency/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryText: editText,
          category: editCategory || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to update entry');

      const updatedEntry = await response.json();
      setEntries(entries.map(e => e.id === entryId ? updatedEntry : e));
      setEditingId(null);
      setEditText('');
      setEditCategory('');

      toast({
        title: 'Success',
        description: 'Entry updated',
      });
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update entry',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/resiliency/entries/${entryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete entry');

      setEntries(entries.filter(e => e.id !== entryId));

      toast({
        title: 'Success',
        description: 'Entry deleted',
      });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete entry',
        variant: 'destructive',
      });
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'behavioral':
        return 'bg-blue-500';
      case 'physical':
        return 'bg-green-500';
      case 'emotional':
        return 'bg-purple-500';
      case 'social':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">Loading resiliency entries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Resiliency Logger</h2>
          {patientName && (
            <p className="text-sm text-slate-400 mt-1">Patient: {patientName}</p>
          )}
        </div>
      </div>

      {/* New Entry Form */}
      <Card className="bg-slate-800/50 border-slate-700 p-4">
        <div className="space-y-3">
          <div className="flex gap-3">
            <Select value={newEntryCategory} onValueChange={setNewEntryCategory}>
              <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={newEntryText}
            onChange={(e) => setNewEntryText(e.target.value)}
            placeholder="Document patient resilience observations..."
            className="bg-slate-900/50 border-slate-600 text-slate-100 min-h-24"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleCreateEntry}
              disabled={isSaving || !newEntryText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>
      </Card>

      {/* Entries List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-200">
          History ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
        </h3>

        {entries.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700 p-8">
            <p className="text-center text-slate-400">
              No resiliency entries yet. Add your first observation above.
            </p>
          </Card>
        ) : (
          entries.map(entry => (
            <Card
              key={entry.id}
              className="bg-slate-800/50 border-slate-700 p-4 hover:bg-slate-800/70 transition-colors"
            >
              {editingId === entry.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-slate-100 min-h-24"
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={cancelEditing}
                      variant="outline"
                      size="sm"
                      className="border-slate-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleUpdateEntry(entry.id)}
                      disabled={isSaving}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {entry.category && (
                        <Badge className={`${getCategoryColor(entry.category)} mb-2`}>
                          {CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                        </Badge>
                      )}
                      <p className="text-slate-100 whitespace-pre-wrap">{entry.entryText}</p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        onClick={() => startEditing(entry)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteEntry(entry.id)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Created: {formatDate(entry.createdAt)}</span>
                    {entry.updatedAt !== entry.createdAt && (
                      <span>Updated: {formatDate(entry.updatedAt)}</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
