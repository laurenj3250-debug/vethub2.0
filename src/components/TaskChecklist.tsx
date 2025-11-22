'use client';

import React, { useState, useMemo } from 'react';
import { Check, Plus, X, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface Task {
  id: number;
  title?: string;
  name?: string;
  completed: boolean;
}

interface Patient {
  id: number;
  name?: string;
  demographics?: { name?: string };
  tasks?: Task[];
}

interface GeneralTask {
  id: number;
  title?: string;
  name?: string;
  completed: boolean;
}

interface TaskChecklistProps {
  patients: Patient[];
  generalTasks: GeneralTask[];
  onToggleTask: (patientId: number, taskId: number, currentStatus: boolean) => void;
  onToggleGeneralTask: (taskId: number, currentStatus: boolean) => void;
  onAddTask: (patientId: number | null, taskName: string) => void;
}

export function TaskChecklist({
  patients,
  generalTasks,
  onToggleTask,
  onToggleGeneralTask,
  onAddTask,
}: TaskChecklistProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [showCompletedSection, setShowCompletedSection] = useState(false);

  // Group all tasks by task name
  const taskGroups = useMemo(() => {
    const groups: Record<string, {
      patients: Array<{ patient: Patient; task: Task }>;
      isGeneral: boolean;
      generalTask?: GeneralTask;
    }> = {};

    // Add general tasks
    generalTasks.forEach(task => {
      const name = task.title || task.name || 'Untitled';
      groups[name] = {
        patients: [],
        isGeneral: true,
        generalTask: task,
      };
    });

    // Add patient tasks
    patients.forEach(patient => {
      (patient.tasks || []).forEach(task => {
        const name = task.title || task.name || 'Untitled';
        if (!groups[name]) {
          groups[name] = { patients: [], isGeneral: false };
        }
        groups[name].patients.push({ patient, task });
      });
    });

    return groups;
  }, [patients, generalTasks]);

  // Separate pending and completed task groups
  const { pendingGroups, completedGroups, stats } = useMemo(() => {
    const pending: typeof taskGroups = {};
    const completed: typeof taskGroups = {};
    let total = 0;
    let completedCount = 0;

    Object.entries(taskGroups).forEach(([name, group]) => {
      const allDone = group.isGeneral
        ? group.generalTask?.completed
        : group.patients.length > 0 && group.patients.every(p => p.task.completed);

      if (group.isGeneral && group.generalTask) {
        total++;
        if (group.generalTask.completed) completedCount++;
      }
      group.patients.forEach(({ task }) => {
        total++;
        if (task.completed) completedCount++;
      });

      if (allDone) {
        completed[name] = group;
      } else {
        pending[name] = group;
      }
    });

    return {
      pendingGroups: pending,
      completedGroups: completed,
      stats: { total, completed: completedCount, percent: total > 0 ? Math.round((completedCount / total) * 100) : 0 }
    };
  }, [taskGroups]);

  const handleAddTask = () => {
    if (newTaskName.trim()) {
      onAddTask(selectedPatientId, newTaskName.trim());
      setNewTaskName('');
      setSelectedPatientId(null);
      setShowAddTask(false);
    }
  };

  const getPatientName = (patient: Patient) =>
    patient.demographics?.name || patient.name || 'Unnamed';

  const pendingCount = Object.keys(pendingGroups).length;
  const completedCount = Object.keys(completedGroups).length;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col max-h-[70vh]">
      {/* Progress Header */}
      <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold text-lg">Tasks</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition ${
                hideCompleted
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
              title={hideCompleted ? 'Show completed' : 'Hide completed'}
            >
              {hideCompleted ? <EyeOff size={12} /> : <Eye size={12} />}
              {hideCompleted ? 'Hidden' : 'Showing'}
            </button>
            <span className="text-slate-400 text-sm font-medium">
              {stats.completed}/{stats.total}
            </span>
          </div>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 text-center">{stats.percent}% complete</p>
      </div>

      {/* Scrollable Task List */}
      <div className="flex-1 overflow-y-auto">
        {/* Pending Tasks - Always visible */}
        {pendingCount > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              To Do ({pendingCount})
            </div>
            <div className="space-y-1 mt-1">
              {Object.entries(pendingGroups).map(([taskName, group]) => {
                const doneInGroup = group.patients.filter(p => p.task.completed).length;
                const totalInGroup = group.patients.length;

                return (
                  <div key={taskName} className="p-2 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-medium text-white text-sm">{taskName}</span>
                      {!group.isGeneral && totalInGroup > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                          {doneInGroup}/{totalInGroup}
                        </span>
                      )}
                    </div>
                    {group.isGeneral && group.generalTask ? (
                      <button
                        onClick={() => onToggleGeneralTask(group.generalTask!.id, group.generalTask!.completed)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-200 hover:bg-cyan-600 hover:text-white transition"
                      >
                        Mark Done
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {group.patients.map(({ patient, task }) => (
                          <button
                            key={`${patient.id}-${task.id}`}
                            onClick={() => onToggleTask(patient.id, task.id, task.completed)}
                            className={`px-2 py-1 rounded text-xs font-medium transition ${
                              task.completed
                                ? 'bg-emerald-500/30 text-emerald-300 line-through'
                                : 'bg-slate-700 text-white hover:bg-cyan-600'
                            }`}
                          >
                            {task.completed && <Check size={10} className="inline mr-0.5" />}
                            {getPatientName(patient)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Tasks - Collapsible */}
        {completedCount > 0 && !hideCompleted && (
          <div className="p-2 border-t border-slate-700/30">
            <button
              onClick={() => setShowCompletedSection(!showCompletedSection)}
              className="w-full px-2 py-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2 hover:bg-slate-800/50 rounded transition"
            >
              {showCompletedSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Check size={12} />
              Completed ({completedCount})
            </button>
            {showCompletedSection && (
              <div className="space-y-1 mt-1 opacity-60">
                {Object.entries(completedGroups).map(([taskName, group]) => (
                  <div key={taskName} className="p-2 rounded-lg bg-slate-900/30 border border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400" />
                      <span className="font-medium text-slate-400 text-sm line-through">{taskName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {group.isGeneral && group.generalTask ? (
                        <button
                          onClick={() => onToggleGeneralTask(group.generalTask!.id, group.generalTask!.completed)}
                          className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400"
                        >
                          <Check size={10} className="inline mr-0.5" /> Done
                        </button>
                      ) : (
                        group.patients.map(({ patient, task }) => (
                          <button
                            key={`${patient.id}-${task.id}`}
                            onClick={() => onToggleTask(patient.id, task.id, task.completed)}
                            className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400"
                          >
                            <Check size={10} className="inline mr-0.5" />
                            {getPatientName(patient)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All done state */}
        {pendingCount === 0 && completedCount > 0 && (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-emerald-400 font-bold">All tasks complete!</p>
            <p className="text-slate-500 text-sm">{completedCount} tasks done today</p>
          </div>
        )}

        {/* Empty state */}
        {pendingCount === 0 && completedCount === 0 && (
          <div className="p-8 text-center text-slate-500">
            <div className="text-3xl mb-2">📋</div>
            <p>No tasks yet</p>
          </div>
        )}
      </div>

      {/* Quick Add - Sticky bottom */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-900/50 flex-shrink-0">
        {showAddTask ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={selectedPatientId ?? ''}
                onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : null)}
                className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Patients</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {getPatientName(p)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Task name..."
                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskName.trim()}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddTask(false); setNewTaskName(''); setSelectedPatientId(null); }}
                className="px-2 py-1.5 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1"
          >
            <Plus size={16} />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}
