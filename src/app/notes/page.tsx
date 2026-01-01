'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Check, Circle, Loader2 } from 'lucide-react';
import { useNotesQuery, useRefreshAllData } from '@/hooks/use-patients-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

// Neo-Pop style constants
const NEO_BORDER = '2px solid #000';
const NEO_SHADOW = '4px 4px 0 #000';
const NEO_SHADOW_SM = '3px 3px 0 #000';
const NEO_COLORS = {
  cream: '#FFF8F0',
  lavender: '#E8D5F2',
  mint: '#C8F0E0',
  pink: '#FFD6D6',
};

export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotesQuery();
  const { refreshNotes } = useRefreshAllData();
  const { toast } = useToast();
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsAdding(true);
    try {
      await apiClient.createNote(newNoteContent.trim());
      refreshNotes();
      setNewNoteContent('');
      toast({ title: 'Note added' });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({ variant: 'destructive', title: 'Failed to add note' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleComplete = async (id: string, currentCompleted: boolean) => {
    try {
      await apiClient.updateNote(id, { completed: !currentCompleted });
      refreshNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast({ variant: 'destructive', title: 'Failed to update note' });
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiClient.deleteNote(id);
      refreshNotes();
      toast({ title: 'Note deleted' });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ variant: 'destructive', title: 'Failed to delete note' });
    }
  };

  const handleClearCompleted = async () => {
    const completedCount = notes.filter(n => n.completed).length;
    if (completedCount === 0) {
      toast({ title: 'No completed notes to clear' });
      return;
    }

    try {
      await apiClient.clearCompletedNotes();
      refreshNotes();
      toast({ title: `Cleared ${completedCount} completed note${completedCount > 1 ? 's' : ''}` });
    } catch (error) {
      console.error('Error clearing notes:', error);
      toast({ variant: 'destructive', title: 'Failed to clear notes' });
    }
  };

  const activeNotes = notes.filter(n => !n.completed);
  const completedNotes = notes.filter(n => n.completed);

  return (
    <div className="min-h-screen" style={{ backgroundColor: NEO_COLORS.cream }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white" style={{ borderBottom: NEO_BORDER }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:-translate-y-1 transition-transform bg-white"
              style={{ border: NEO_BORDER }}
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-black text-gray-900">Notes</h1>
          </div>

          {completedNotes.length > 0 && (
            <button
              onClick={handleClearCompleted}
              className="px-4 py-2 rounded-xl font-bold text-gray-900 hover:-translate-y-1 transition-transform"
              style={{ backgroundColor: NEO_COLORS.pink, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            >
              Clear Completed ({completedNotes.length})
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Add Note Input */}
        <div
          className="bg-white rounded-2xl p-4"
          style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAdding) handleAddNote();
              }}
              placeholder="Question to clarify..."
              className="flex-1 px-4 py-3 rounded-xl text-gray-900 text-lg"
              style={{ border: NEO_BORDER }}
              disabled={isAdding}
            />
            <button
              onClick={handleAddNote}
              disabled={isAdding || !newNoteContent.trim()}
              className="px-6 py-3 rounded-xl font-bold text-gray-900 hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: NEO_COLORS.mint, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            >
              {isAdding ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && notes.length === 0 && (
          <div
            className="bg-white rounded-2xl p-8 text-center"
            style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
          >
            <p className="text-gray-500 text-lg">No notes yet. Add a question to clarify!</p>
          </div>
        )}

        {/* Active Notes */}
        {activeNotes.length > 0 && (
          <div className="space-y-3">
            {activeNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-2xl p-4 flex items-center gap-4 group"
                style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
              >
                <button
                  onClick={() => handleToggleComplete(note.id, note.completed)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
                  style={{ border: NEO_BORDER }}
                >
                  <Circle size={16} className="text-gray-400" />
                </button>
                <span className="flex-1 text-gray-900 text-lg">{note.content}</span>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Completed Notes */}
        {completedNotes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Completed</h2>
            {completedNotes.map((note) => (
              <div
                key={note.id}
                className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 group"
                style={{ border: NEO_BORDER, opacity: 0.7 }}
              >
                <button
                  onClick={() => handleToggleComplete(note.id, note.completed)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ backgroundColor: NEO_COLORS.mint, border: NEO_BORDER }}
                >
                  <Check size={16} className="text-gray-900" />
                </button>
                <span className="flex-1 text-gray-500 text-lg line-through">{note.content}</span>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
