'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Circle, CheckCircle2, Tag } from 'lucide-react';

interface PatientListItemProps {
  patient: any;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onDelete: () => void;
  onUpdatePatient: (field: string, value: any) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onQuickAction: (action: string) => void;
  onPrintStickers?: () => void;
  getTaskCategory: (taskName: string) => string;
  hideCompletedTasks: boolean;
}

export function PatientListItem({
  patient,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onDelete,
  onUpdatePatient,
  onToggleTask,
  onDeleteTask,
  onQuickAction,
  onPrintStickers,
  getTaskCategory,
  hideCompletedTasks,
}: PatientListItemProps) {
  const today = new Date().toISOString().split('T')[0];
  const allTasks = patient.tasks || [];
  // Show all tasks (don't filter by date - tasks don't have a date field, they have createdAt)
  const tasks = allTasks;
  const completedTasks = tasks.filter((t: any) => t.completed).length;
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Priority indicator based on completion percentage
  const getPriorityColor = () => {
    if (patient.type === 'Surgery') return 'text-red-500';
    if (completionPercentage < 25) return 'text-red-500';
    if (completionPercentage < 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Species emoji - support both UnifiedPatient (demographics.species) and legacy (patient_info.species)
  const getSpeciesEmoji = () => {
    const species = (patient.demographics?.species || patient.patient_info?.species || '').toLowerCase();
    if (species.includes('dog') || species.includes('canine')) return '🐕';
    if (species.includes('cat') || species.includes('feline')) return '🐈';
    return '🐾';
  };

  // Type badge color
  const getTypeBadgeColor = () => {
    switch (patient.type) {
      case 'Surgery': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'MRI': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'Medical': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Status badge color
  const getStatusBadgeColor = () => {
    switch (patient.status) {
      case 'New Admit': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Hospitalized': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'Discharging': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Discharged': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className={`border rounded-lg transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700/50 bg-slate-800/30'} ${patient.status === 'Discharged' ? 'opacity-60' : ''}`}>
      {/* Compact one-line view */}
      <div
        className="px-4 py-2 flex items-center gap-3 hover:bg-slate-700/20 transition cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 bg-slate-700"
        />

        {/* Priority indicator dot */}
        <div className={`w-2 h-2 rounded-full ${getPriorityColor()}`} />

        {/* Species + Name */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <span className="text-xl">{getSpeciesEmoji()}</span>
          <span className="font-semibold text-slate-100 truncate">{patient.demographics?.name || patient.name || 'Unnamed'}</span>
        </div>

        {/* Type dropdown */}
        <select
          value={patient.type || 'Medical'}
          onChange={(e) => {
            e.stopPropagation();
            onUpdatePatient('type', e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className={`px-2 py-0.5 rounded text-xs font-medium border cursor-pointer hover:opacity-80 transition focus:ring-2 focus:ring-cyan-500 focus:outline-none ${getTypeBadgeColor()}`}
        >
          <option value="Surgery" className="bg-slate-800">Surgery</option>
          <option value="MRI" className="bg-slate-800">MRI</option>
          <option value="Medical" className="bg-slate-800">Medical</option>
        </select>

        {/* Status dropdown */}
        <select
          value={patient.status || 'New Admit'}
          onChange={(e) => {
            e.stopPropagation();
            onUpdatePatient('status', e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className={`px-2 py-0.5 rounded text-xs font-medium border cursor-pointer hover:opacity-80 transition focus:ring-2 focus:ring-cyan-500 focus:outline-none ${getStatusBadgeColor()}`}
        >
          <option value="New Admit" className="bg-slate-800">New Admit</option>
          <option value="Hospitalized" className="bg-slate-800">Hospitalized</option>
          <option value="Discharging" className="bg-slate-800">Discharging</option>
          <option value="Discharged" className="bg-slate-800">Discharged</option>
        </select>

        {/* Weight - support both UnifiedPatient (demographics.weight) and legacy (patient_info.weight) */}
        {(patient.demographics?.weight || patient.patient_info?.weight) && (
          <span className="text-xs text-slate-400 min-w-[60px]">
            {patient.demographics?.weight || patient.patient_info?.weight}
          </span>
        )}

        {/* Task completion */}
        <div className="flex items-center gap-2 ml-auto">
          <span className={`text-xs font-medium ${completionPercentage === 100 ? 'text-green-400' : completionPercentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {completedTasks}/{totalTasks} tasks
          </span>
          {completionPercentage === 100 && <span className="text-green-400">✓</span>}
        </div>

        {/* Expand/collapse icon */}
        <button
          className="text-slate-400 hover:text-slate-200 transition"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* Print Stickers button */}
        {onPrintStickers && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrintStickers();
            }}
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 p-1.5 rounded transition"
            title="Print Stickers"
          >
            <Tag size={16} />
          </button>
        )}

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const patientName = patient.demographics?.name || patient.name || 'this patient';
            if (confirm(`Delete ${patientName}?`)) onDelete();
          }}
          className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded content (shows full card content when expanded) */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/30">
          {/* Patient info - support both UnifiedPatient (demographics) and legacy (patient_info) */}
          <div className="mb-3 text-xs text-slate-400 space-y-1">
            {(patient.demographics?.age || patient.patient_info?.age) && <div>Age: {patient.demographics?.age || patient.patient_info?.age}</div>}
            {(patient.demographics?.breed || patient.patient_info?.breed) && <div>Breed: {patient.demographics?.breed || patient.patient_info?.breed}</div>}
            {patient.id && <div>ID: {patient.id}</div>}
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onQuickAction('morning')}
              className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium hover:bg-yellow-500/30 transition border border-yellow-500/30"
            >
              ✅ Morning
            </button>
            <button
              onClick={() => onQuickAction('evening')}
              className="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 rounded text-xs font-medium hover:bg-indigo-500/30 transition border border-indigo-500/30"
            >
              ✅ Evening
            </button>
            <button
              onClick={() => onQuickAction('tasks')}
              className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium hover:bg-cyan-500/30 transition border border-cyan-500/30"
            >
              📋 Tasks
            </button>
            <button
              onClick={() => onQuickAction('rounds')}
              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium hover:bg-emerald-500/30 transition border border-emerald-500/30"
            >
              📊 Rounds
            </button>
          </div>

          {/* Tasks grouped by category */}
          {/* Morning Tasks */}
          {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'morning').filter((t: any) => !hideCompletedTasks || !t.completed).length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-bold text-yellow-400 mb-1.5">🌅 Morning Tasks</h5>
              <div className="space-y-1">
                {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'morning').filter((t: any) => !hideCompletedTasks || !t.completed).sort((a: any, b: any) => (a.title || a.name).localeCompare(b.title || b.name)).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 hover:border-yellow-500/50 transition group"
                  >
                    <button
                      onClick={() => onToggleTask(task.id, task.completed)}
                      className="flex-shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="text-green-400" size={14} />
                      ) : (
                        <Circle className="text-slate-600 group-hover:text-yellow-400" size={14} />
                      )}
                    </button>
                    <span
                      className={`flex-1 cursor-pointer text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                      onClick={() => onToggleTask(task.id, task.completed)}
                    >
                      {task.title || task.name}
                    </span>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evening Tasks */}
          {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'evening').filter((t: any) => !hideCompletedTasks || !t.completed).length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-bold text-indigo-400 mb-1.5">🌙 Evening Tasks</h5>
              <div className="space-y-1">
                {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'evening').filter((t: any) => !hideCompletedTasks || !t.completed).sort((a: any, b: any) => (a.title || a.name).localeCompare(b.title || b.name)).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition group"
                  >
                    <button
                      onClick={() => onToggleTask(task.id, task.completed)}
                      className="flex-shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="text-green-400" size={14} />
                      ) : (
                        <Circle className="text-slate-600 group-hover:text-indigo-400" size={14} />
                      )}
                    </button>
                    <span
                      className={`flex-1 cursor-pointer text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                      onClick={() => onToggleTask(task.id, task.completed)}
                    >
                      {task.title || task.name}
                    </span>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General Tasks */}
          {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'general').filter((t: any) => !hideCompletedTasks || !t.completed).length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-cyan-400 mb-1.5">📋 {patient.type} Tasks & Other</h5>
              <div className="space-y-1">
                {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'general').filter((t: any) => !hideCompletedTasks || !t.completed).sort((a: any, b: any) => (a.title || a.name).localeCompare(b.title || b.name)).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition group"
                  >
                    <button
                      onClick={() => onToggleTask(task.id, task.completed)}
                      className="flex-shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="text-green-400" size={14} />
                      ) : (
                        <Circle className="text-slate-600 group-hover:text-cyan-400" size={14} />
                      )}
                    </button>
                    <span
                      className={`flex-1 cursor-pointer text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                      onClick={() => onToggleTask(task.id, task.completed)}
                    >
                      {task.title || task.name}
                    </span>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
