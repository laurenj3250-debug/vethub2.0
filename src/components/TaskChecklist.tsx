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
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);

  const getPatientName = (patient: Patient) =>
    patient.demographics?.name || patient.name || 'Unnamed';

  const getFirstName = (patient: Patient) =>
    getPatientName(patient).split(' ')[0];

  // Build matrix data: unique task names and patient-task lookup
  const { taskNames, patientTaskMap, stats } = useMemo(() => {
    const names = new Set<string>();
    const map: Record<string, Record<number, Task>> = {}; // taskName -> patientId -> task
    let total = 0;
    let completed = 0;

    // Collect all task names from patients
    patients.forEach(patient => {
      (patient.tasks || []).forEach(task => {
        const taskName = task.title || task.name || 'Untitled';
        names.add(taskName);
        if (!map[taskName]) map[taskName] = {};
        map[taskName][patient.id] = task;
        total++;
        if (task.completed) completed++;
      });
    });

    // Add general tasks
    generalTasks.forEach(task => {
      const taskName = task.title || task.name || 'Untitled';
      names.add(taskName);
      total++;
      if (task.completed) completed++;
    });

    return {
      taskNames: Array.from(names).sort(),
      patientTaskMap: map,
      stats: { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
    };
  }, [patients, generalTasks]);

  // Helper to get completion stats for a task
  const getTaskStats = (taskName: string) => {
    const generalTask = generalTasks.find(t => (t.title || t.name) === taskName);
    if (generalTask) {
      return { done: generalTask.completed ? 1 : 0, total: 1 };
    }
    const taskPatients = patients.filter(p => patientTaskMap[taskName]?.[p.id]);
    const done = taskPatients.filter(p => patientTaskMap[taskName][p.id]?.completed).length;
    return { done, total: taskPatients.length };
  };

  // Filter and sort task names (worst completion % first)
  const visibleTaskNames = useMemo(() => {
    let filtered = taskNames;

    if (hideCompleted) {
      filtered = taskNames.filter(taskName => {
        // Check if any patient has this task incomplete
        const hasIncomplete = patients.some(patient => {
          const task = patientTaskMap[taskName]?.[patient.id];
          return task && !task.completed;
        });
        // Check general tasks
        const generalTask = generalTasks.find(t => (t.title || t.name) === taskName);
        const generalIncomplete = generalTask && !generalTask.completed;

        return hasIncomplete || generalIncomplete;
      });
    }

    // Sort by completion % (lowest first = most urgent)
    return filtered.sort((a, b) => {
      const statsA = getTaskStats(a);
      const statsB = getTaskStats(b);
      const pctA = statsA.total > 0 ? statsA.done / statsA.total : 1;
      const pctB = statsB.total > 0 ? statsB.done / statsB.total : 1;
      return pctA - pctB;
    });
  }, [taskNames, hideCompleted, patients, patientTaskMap, generalTasks]);

  const handleAddTask = () => {
    if (newTaskName.trim()) {
      onAddTask(selectedPatientId, newTaskName.trim());
      setNewTaskName('');
      setSelectedPatientId(null);
      setShowAddTask(false);
    }
  };

  // Check if a task is general (not patient-specific)
  const getGeneralTask = (taskName: string) =>
    generalTasks.find(t => (t.title || t.name) === taskName);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Compact Header */}
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">Tasks</span>
          <div className="h-1.5 w-20 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stats.percent}%` }} />
          </div>
          <span className="text-xs text-slate-400">{stats.completed}/{stats.total}</span>
        </div>
        <button
          onClick={() => setHideCompleted(!hideCompleted)}
          className="text-xs text-slate-500 hover:text-white transition"
        >
          {hideCompleted ? 'show done' : 'hide done'}
        </button>
      </div>

      {/* 3-Column Card Grid */}
      {visibleTaskNames.length > 0 ? (
        <div className="p-2 grid grid-cols-3 gap-2">
          {visibleTaskNames.map(taskName => {
            const generalTask = getGeneralTask(taskName);
            const isGeneral = !!generalTask;
            const taskPatients = patients.filter(p => patientTaskMap[taskName]?.[p.id]);
            const doneCount = isGeneral
              ? (generalTask?.completed ? 1 : 0)
              : taskPatients.filter(p => patientTaskMap[taskName][p.id]?.completed).length;
            const totalCount = isGeneral ? 1 : taskPatients.length;

            // Visual urgency: red border for 0%, amber for partial
            const urgencyClass = doneCount === 0
              ? 'border-l-2 border-l-red-500'
              : doneCount < totalCount
                ? 'border-l-2 border-l-amber-500/50'
                : '';

            return (
              <div
                key={taskName}
                className={`bg-slate-900/60 rounded-lg p-2 border border-slate-700/30 ${urgencyClass}`}
              >
                {/* Task Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white truncate">{taskName}</span>
                  {totalCount > 0 && (
                    <span className="text-[10px] text-slate-500 ml-1">{doneCount}/{totalCount}</span>
                  )}
                </div>

                {/* Patient Chips */}
                <div className="flex flex-wrap gap-1">
                  {isGeneral ? (
                    <button
                      onClick={() => onToggleGeneralTask(generalTask!.id, generalTask!.completed)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                        generalTask!.completed
                          ? 'bg-emerald-500/30 text-emerald-400'
                          : 'bg-slate-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {generalTask!.completed ? '✓' : '○'}
                    </button>
                  ) : (
                    taskPatients.map(patient => {
                      const task = patientTaskMap[taskName][patient.id];
                      return (
                        <button
                          key={patient.id}
                          onClick={() => onToggleTask(patient.id, task.id, task.completed)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                            task.completed
                              ? 'bg-emerald-500/30 text-emerald-400'
                              : 'bg-slate-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {task.completed && '✓ '}{getFirstName(patient)}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center">
          {stats.total > 0 && stats.completed === stats.total ? (
            <>
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-400 font-medium">All done!</p>
            </>
          ) : (
            <p className="text-slate-500">No tasks yet</p>
          )}
        </div>
      )}

      {/* Quick Add */}
      <div className="p-2 border-t border-slate-700/50 bg-slate-900/50">
        {showAddTask ? (
          <div className="flex gap-2">
            <select
              value={selectedPatientId ?? ''}
              onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : null)}
              className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">All</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{getFirstName(p)}</option>
              ))}
            </select>
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Task..."
              className="flex-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskName.trim()}
              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded text-xs font-medium transition"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddTask(false); setNewTaskName(''); setSelectedPatientId(null); }}
              className="p-1 text-slate-400 hover:text-white transition"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded text-xs font-medium transition flex items-center justify-center gap-1"
          >
            <Plus size={14} />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}
