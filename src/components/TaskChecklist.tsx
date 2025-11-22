'use client';

import React, { useState, useMemo } from 'react';
import { Check, Plus, X } from 'lucide-react';

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

  // Calculate stats
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;

    Object.values(taskGroups).forEach(group => {
      if (group.isGeneral && group.generalTask) {
        total++;
        if (group.generalTask.completed) completed++;
      }
      group.patients.forEach(({ task }) => {
        total++;
        if (task.completed) completed++;
      });
    });

    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [taskGroups]);

  const handleAddTask = () => {
    if (newTaskName.trim()) {
      onAddTask(null, newTaskName.trim());
      setNewTaskName('');
      setShowAddTask(false);
    }
  };

  const getPatientName = (patient: Patient) =>
    patient.demographics?.name || patient.name || 'Unnamed';

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Progress Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold">Tasks</span>
          <span className="text-slate-400 text-sm">
            {stats.completed}/{stats.total} done
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-slate-700/30">
        {Object.entries(taskGroups).map(([taskName, group]) => {
          const allDone = group.isGeneral
            ? group.generalTask?.completed
            : group.patients.every(p => p.task.completed);

          return (
            <div key={taskName} className="p-3">
              {/* Task Name Row */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-medium ${allDone ? 'text-slate-500 line-through' : 'text-white'}`}>
                  {taskName}
                </span>
                {!group.isGeneral && group.patients.length > 0 && (
                  <span className="text-xs text-slate-500">
                    {group.patients.filter(p => p.task.completed).length}/{group.patients.length}
                  </span>
                )}
              </div>

              {/* Patient Chips or General Task Toggle */}
              {group.isGeneral && group.generalTask ? (
                <button
                  onClick={() => onToggleGeneralTask(group.generalTask!.id, group.generalTask!.completed)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    group.generalTask.completed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {group.generalTask.completed ? (
                    <span className="flex items-center gap-1"><Check size={14} /> Done</span>
                  ) : (
                    'Mark Done'
                  )}
                </button>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {group.patients.map(({ patient, task }) => (
                    <button
                      key={`${patient.id}-${task.id}`}
                      onClick={() => onToggleTask(patient.id, task.id, task.completed)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                        task.completed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      {task.completed && <Check size={12} className="inline mr-1" />}
                      {getPatientName(patient)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(taskGroups).length === 0 && (
          <div className="p-6 text-center text-slate-500">
            No tasks yet
          </div>
        )}
      </div>

      {/* Quick Add */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-900/30">
        {showAddTask ? (
          <div className="flex gap-2">
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
              onClick={() => { setShowAddTask(false); setNewTaskName(''); }}
              className="px-2 py-1.5 text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
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
