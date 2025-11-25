'use client';

import React, { useState, useMemo } from 'react';
import { Check, Plus, X } from 'lucide-react';

// Neo-pop styling constants
const NEO_SHADOW = '6px 6px 0 #000';
const NEO_SHADOW_SM = '4px 4px 0 #000';
const NEO_BORDER = '2px solid #000';

const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

const CARD_BORDERS = {
  lavender: '#9B7FCF',
  mint: '#6BB89D',
  pink: '#E89999',
};

interface Task {
  id: number | string;
  title?: string;
  name?: string;
  completed: boolean;
  parentTaskId?: string | null;
  subtasks?: Task[];
  isRecurring?: boolean;
}

interface Patient {
  id: number;
  name?: string;
  demographics?: { name?: string };
  tasks?: Task[];
}

interface GeneralTask {
  id: number | string;
  title?: string;
  name?: string;
  completed: boolean;
  parentTaskId?: string | null;
  subtasks?: Task[];
}

interface TaskChecklistProps {
  patients: Patient[];
  generalTasks: GeneralTask[];
  onToggleTask: (patientId: number, taskId: number | string, currentStatus: boolean) => void;
  onToggleGeneralTask: (taskId: number | string, currentStatus: boolean) => void;
  onAddTask: (patientId: number | null, taskName: string) => void;
  onDeleteTask?: (patientId: number, taskId: number | string) => void;
  onDeleteGeneralTask?: (taskId: number | string) => void;
}

export function TaskChecklist({
  patients,
  generalTasks,
  onToggleTask,
  onToggleGeneralTask,
  onAddTask,
  onDeleteTask,
  onDeleteGeneralTask,
}: TaskChecklistProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [viewMode, setViewMode] = useState<'task' | 'patient'>('task');

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

  // Filter task names - keep stable order (alphabetical), don't re-sort on completion
  const visibleTaskNames = useMemo(() => {
    if (!hideCompleted) {
      return taskNames; // Already alphabetically sorted
    }

    // Filter out fully completed tasks, but keep order stable
    return taskNames.filter(taskName => {
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

  // Cycle through colors for task cards
  const cardColors = [COLORS.lavender, COLORS.mint, COLORS.pink];
  const colorNames = ['lavender', 'mint', 'pink'] as const;

  return (
    <div
      className="rounded-3xl overflow-hidden bg-white"
      style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: NEO_BORDER, backgroundColor: COLORS.cream }}
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-900 font-black text-lg">Tasks</span>
          <div
            className="h-3 w-24 rounded-full overflow-hidden bg-white"
            style={{ border: '2px solid #2D3436' }}
          >
            <div
              className="h-full transition-all"
              style={{ width: `${stats.percent}%`, backgroundColor: COLORS.mint }}
            />
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-black bg-white text-gray-800"
            style={{ border: '2px solid #2D3436' }}
          >
            {stats.completed}/{stats.total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-full overflow-hidden" style={{ border: '2px solid #2D3436' }}>
            <button
              onClick={() => setViewMode('task')}
              className="px-3 py-1.5 text-xs font-bold transition"
              style={{
                backgroundColor: viewMode === 'task' ? COLORS.lavender : 'white',
              }}
            >
              By Task
            </button>
            <button
              onClick={() => setViewMode('patient')}
              className="px-3 py-1.5 text-xs font-bold transition"
              style={{
                backgroundColor: viewMode === 'patient' ? COLORS.lavender : 'white',
                borderLeft: '2px solid #2D3436',
              }}
            >
              By Patient
            </button>
          </div>
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition hover:-translate-y-0.5"
            style={{
              backgroundColor: hideCompleted ? COLORS.lavender : 'white',
              border: '2px solid #2D3436',
            }}
          >
            {hideCompleted ? 'show done' : 'hide done'}
          </button>
        </div>
      </div>

      {/* Task View - Group by Task */}
      {viewMode === 'task' && (
        visibleTaskNames.length > 0 ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white">
            {visibleTaskNames.map((taskName, index) => {
              const generalTask = getGeneralTask(taskName);
              const isGeneral = !!generalTask;
              const taskPatients = patients.filter(p => patientTaskMap[taskName]?.[p.id]);
              const doneCount = isGeneral
                ? (generalTask?.completed ? 1 : 0)
                : taskPatients.filter(p => patientTaskMap[taskName][p.id]?.completed).length;
              const totalCount = isGeneral ? 1 : taskPatients.length;

              const colorIndex = index % 3;
              const cardBg = cardColors[colorIndex];

              return (
                <div
                  key={taskName}
                  className="p-4 rounded-2xl transition-all duration-200 hover:-translate-y-1 cursor-pointer relative overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${cardBg} 0%, ${cardBg}E6 100%)`,
                    border: NEO_BORDER,
                    boxShadow: NEO_SHADOW_SM,
                  }}
                >
                  {/* Subtle noise texture */}
                  <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                  />

                  <div className="relative z-10">
                    {/* Task Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-900 truncate">{taskName}</span>
                      {totalCount > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-black bg-white text-gray-800"
                          style={{ border: '1.5px solid #2D3436' }}
                        >
                          {doneCount}/{totalCount}
                        </span>
                      )}
                    </div>

                    {/* Patient Chips */}
                    <div className="flex flex-wrap gap-2">
                      {isGeneral ? (
                        <button
                          onClick={() => onToggleGeneralTask(generalTask!.id, generalTask!.completed)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            generalTask!.completed
                              ? 'opacity-60'
                              : ''
                          }`}
                          style={{
                            backgroundColor: 'white',
                            border: '1.5px solid #2D3436',
                          }}
                        >
                          {generalTask!.completed ? '✓' : '○ General'}
                        </button>
                      ) : (
                        taskPatients.map(patient => {
                          // Get fresh task data from patient.tasks to ensure consistency
                          const task = (patient.tasks || []).find(
                            t => (t.title || t.name) === taskName
                          ) || patientTaskMap[taskName][patient.id];
                          if (!task) return null;
                          return (
                            <button
                              key={patient.id}
                              onClick={() => onToggleTask(patient.id, task.id, task.completed)}
                              className={`${
                                task.completed
                                  ? 'w-8 h-8 rounded-full p-0 flex items-center justify-center opacity-60'
                                  : 'px-3 py-1.5 rounded-lg'
                              } text-xs font-bold transition hover:-translate-y-0.5`}
                              style={{
                                backgroundColor: 'white',
                                border: '1.5px solid #2D3436',
                              }}
                            >
                              {task.completed ? '✓' : getFirstName(patient)}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white">
            {stats.total > 0 && stats.completed === stats.total ? (
              <>
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                  style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                >
                  ✓
                </div>
                <p className="font-bold text-gray-900">All done!</p>
              </>
            ) : (
              <p className="text-gray-500 font-medium">No tasks yet</p>
            )}
          </div>
        )
      )}

      {/* Patient View - Group by Patient */}
      {viewMode === 'patient' && (
        (() => {
          // Get patients with tasks (filtered if hideCompleted)
          const patientsWithTasks = patients.filter(patient => {
            const patientTasks = patient.tasks || [];
            if (hideCompleted) {
              return patientTasks.some(t => !t.completed);
            }
            return patientTasks.length > 0;
          });

          // Also include general tasks section if any exist
          const visibleGeneralTasks = hideCompleted
            ? generalTasks.filter(t => !t.completed)
            : generalTasks;

          const hasContent = patientsWithTasks.length > 0 || visibleGeneralTasks.length > 0;

          if (!hasContent) {
            return (
              <div className="p-8 text-center bg-white">
                {stats.total > 0 && stats.completed === stats.total ? (
                  <>
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                      style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                    >
                      ✓
                    </div>
                    <p className="font-bold text-gray-900">All done!</p>
                  </>
                ) : (
                  <p className="text-gray-500 font-medium">No tasks yet</p>
                )}
              </div>
            );
          }

          return (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white">
              {/* General Tasks Card */}
              {visibleGeneralTasks.length > 0 && (
                <div
                  className="p-4 rounded-2xl transition-all duration-200 hover:-translate-y-1 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${COLORS.cream} 0%, ${COLORS.cream}E6 100%)`,
                    border: NEO_BORDER,
                    boxShadow: NEO_SHADOW_SM,
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-900">General</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-black bg-white text-gray-800"
                        style={{ border: '1.5px solid #2D3436' }}
                      >
                        {generalTasks.filter(t => t.completed).length}/{generalTasks.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(hideCompleted ? visibleGeneralTasks : generalTasks).map(task => (
                        <div
                          key={task.id}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                            task.completed ? 'opacity-60' : ''
                          }`}
                          style={{
                            backgroundColor: 'white',
                            border: '1.5px solid #2D3436',
                          }}
                        >
                          <button
                            onClick={() => onToggleGeneralTask(task.id, task.completed)}
                            className="flex-1 text-left transition hover:-translate-y-0.5 flex items-center gap-2"
                          >
                            <span className={task.completed ? 'line-through' : ''}>
                              {task.completed ? '✓' : '○'} {task.title || task.name}
                            </span>
                          </button>
                          {onDeleteGeneralTask && (
                            <button
                              onClick={() => onDeleteGeneralTask(task.id)}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Cards */}
              {patientsWithTasks.map((patient, index) => {
                const patientTasks = patient.tasks || [];
                const visibleTasks = hideCompleted
                  ? patientTasks.filter(t => !t.completed)
                  : patientTasks;
                const doneCount = patientTasks.filter(t => t.completed).length;

                const colorIndex = (visibleGeneralTasks.length > 0 ? index + 1 : index) % 3;
                const cardBg = cardColors[colorIndex];

                return (
                  <div
                    key={patient.id}
                    className="p-4 rounded-2xl transition-all duration-200 hover:-translate-y-1 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(180deg, ${cardBg} 0%, ${cardBg}E6 100%)`,
                      border: NEO_BORDER,
                      boxShadow: NEO_SHADOW_SM,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                      }}
                    />
                    <div className="relative z-10">
                      {/* Patient Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-gray-900 truncate">{getPatientName(patient)}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-black bg-white text-gray-800"
                          style={{ border: '1.5px solid #2D3436' }}
                        >
                          {doneCount}/{patientTasks.length}
                        </span>
                      </div>

                      {/* Task List */}
                      <div className="space-y-2">
                        {visibleTasks.map(task => {
                          const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                          const subtasksCompleted = hasSubtasks ? task.subtasks!.filter(st => st.completed).length : 0;
                          const subtasksTotal = hasSubtasks ? task.subtasks!.length : 0;

                          return (
                            <div key={task.id}>
                              {/* Parent Task */}
                              <div
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                                  task.completed ? 'opacity-60' : ''
                                }`}
                                style={{
                                  backgroundColor: 'white',
                                  border: '1.5px solid #2D3436',
                                }}
                              >
                                <button
                                  onClick={() => onToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-1 text-left transition hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                  <span className={task.completed ? 'line-through' : ''}>
                                    {task.completed ? '✓' : '○'} {task.title || task.name}
                                  </span>
                                  {hasSubtasks && (
                                    <span className="text-gray-500 text-[10px] ml-1">
                                      ({subtasksCompleted}/{subtasksTotal})
                                    </span>
                                  )}
                                </button>
                                {onDeleteTask && (
                                  <button
                                    onClick={() => onDeleteTask(patient.id, task.id)}
                                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Subtasks */}
                              {hasSubtasks && (
                                <div className="ml-4 mt-1 space-y-1">
                                  {task.subtasks!.filter(st => !hideCompleted || !st.completed).map(subtask => (
                                    <div
                                      key={subtask.id}
                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-2 ${
                                        subtask.completed ? 'opacity-60' : ''
                                      }`}
                                      style={{
                                        backgroundColor: '#f8f8f8',
                                        border: '1px solid #ddd',
                                      }}
                                    >
                                      <button
                                        onClick={() => onToggleTask(patient.id, subtask.id, subtask.completed)}
                                        className="flex-1 text-left transition hover:-translate-y-0.5 flex items-center gap-1"
                                      >
                                        <span className={subtask.completed ? 'line-through text-gray-500' : ''}>
                                          {subtask.completed ? '✓' : '○'} {subtask.title || subtask.name}
                                        </span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}

      {/* Quick Add */}
      <div
        className="p-3"
        style={{ borderTop: NEO_BORDER, backgroundColor: COLORS.cream }}
      >
        {showAddTask ? (
          <div className="flex gap-2">
            <select
              value={selectedPatientId ?? ''}
              onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-xl text-sm font-bold text-gray-900 bg-white focus:outline-none"
              style={{ border: NEO_BORDER }}
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
              placeholder="Task name..."
              className="flex-1 px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white placeholder-gray-400 focus:outline-none"
              style={{ border: NEO_BORDER }}
              autoFocus
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskName.trim()}
              className="px-4 py-2 rounded-xl text-sm font-black text-gray-900 transition hover:-translate-y-0.5 disabled:opacity-50"
              style={{
                backgroundColor: COLORS.mint,
                border: NEO_BORDER,
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddTask(false); setNewTaskName(''); setSelectedPatientId(null); }}
              className="p-2 rounded-xl transition hover:bg-white"
              style={{ border: NEO_BORDER, backgroundColor: 'white' }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center justify-center gap-2 bg-white"
            style={{ border: NEO_BORDER }}
          >
            <Plus size={16} />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}
