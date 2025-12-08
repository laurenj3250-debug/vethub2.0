'use client';

import React, { useState, useMemo } from 'react';
import { Check, Plus, X, Sun, Moon, ChevronDown } from 'lucide-react';
import { getTaskTimeOfDay } from '@/lib/task-config';

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
  id: string;  // Task IDs are CUIDs (strings)
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
  id: string;  // Task IDs are CUIDs (strings)
  title?: string;
  name?: string;
  completed: boolean;
}

interface TaskChecklistProps {
  patients: Patient[];
  generalTasks: GeneralTask[];
  onToggleTask: (patientId: number, taskId: string, currentStatus: boolean) => void;
  onToggleGeneralTask: (taskId: string, currentStatus: boolean) => void;
  onAddTask: (patientId: number | null, taskName: string) => void;
  onDeleteTask?: (patientId: number, taskId: string) => void;
  onDeleteGeneralTask?: (taskId: string) => void;
  onDeleteAllTasks?: () => void;
}

// Deduplicate general tasks by title - keep only one per unique title
function deduplicateGeneralTasks(tasks: GeneralTask[]): GeneralTask[] {
  const seen = new Map<string, GeneralTask>();
  tasks.forEach(task => {
    const title = task.title || task.name || 'Untitled';
    // Keep the first incomplete one, or the first one if all are complete
    if (!seen.has(title) || (!task.completed && seen.get(title)?.completed)) {
      seen.set(title, task);
    }
  });
  return Array.from(seen.values());
}

export function TaskChecklist({
  patients,
  generalTasks: rawGeneralTasks,
  onToggleTask,
  onToggleGeneralTask,
  onAddTask,
  onDeleteTask,
  onDeleteGeneralTask,
  onDeleteAllTasks,
}: TaskChecklistProps) {
  // Deduplicate general tasks to ensure each shows only once
  const generalTasks = useMemo(() => deduplicateGeneralTasks(rawGeneralTasks), [rawGeneralTasks]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [viewMode, setViewMode] = useState<'task' | 'patient'>('task');
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'evening'>('all');
  const [expandedPatients, setExpandedPatients] = useState<Set<number>>(new Set());

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

  // Filter task names - by completion status and time of day
  const visibleTaskNames = useMemo(() => {
    let filtered = taskNames;

    // Filter by time of day
    if (timeFilter !== 'all') {
      filtered = filtered.filter(taskName => {
        const taskTime = getTaskTimeOfDay(taskName);
        return taskTime === timeFilter || taskTime === 'anytime';
      });
    }

    // Filter out fully completed tasks if hideCompleted is on
    if (hideCompleted) {
      filtered = filtered.filter(taskName => {
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

    return filtered;
  }, [taskNames, hideCompleted, timeFilter, patients, patientTaskMap, generalTasks]);

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

  // Toggle patient card expansion
  const togglePatientExpanded = (patientId: number) => {
    setExpandedPatients(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  // Check if a patient is expanded (default: expand if has incomplete tasks)
  const isPatientExpanded = (patientId: number, hasIncomplete: boolean) => {
    // If user has explicitly toggled, use that
    if (expandedPatients.size > 0) {
      return expandedPatients.has(patientId);
    }
    // Default: expand if has incomplete tasks
    return hasIncomplete;
  };

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
          {/* Time Filter */}
          <div className="flex rounded-full overflow-hidden" style={{ border: '2px solid #2D3436' }}>
            <button
              onClick={() => setTimeFilter('all')}
              className="px-3 py-1.5 text-xs font-bold transition"
              style={{
                backgroundColor: timeFilter === 'all' ? COLORS.mint : 'white',
              }}
            >
              All
            </button>
            <button
              onClick={() => setTimeFilter('morning')}
              className="px-3 py-1.5 text-xs font-bold transition flex items-center gap-1"
              style={{
                backgroundColor: timeFilter === 'morning' ? '#FCD34D' : 'white',
                borderLeft: '2px solid #2D3436',
              }}
            >
              <Sun size={12} /> AM
            </button>
            <button
              onClick={() => setTimeFilter('evening')}
              className="px-3 py-1.5 text-xs font-bold transition flex items-center gap-1"
              style={{
                backgroundColor: timeFilter === 'evening' ? '#818CF8' : 'white',
                borderLeft: '2px solid #2D3436',
              }}
            >
              <Moon size={12} /> PM
            </button>
          </div>
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
          {onDeleteAllTasks && stats.total > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Delete all ${stats.total} tasks? This cannot be undone.`)) {
                  onDeleteAllTasks();
                }
              }}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition hover:-translate-y-0.5 hover:bg-red-100"
              style={{
                backgroundColor: COLORS.pink,
                border: '2px solid #2D3436',
              }}
            >
              <X size={12} className="inline mr-1" />
              Clear All
            </button>
          )}
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
          // Get patients with visible tasks (filtered by hideCompleted and timeFilter)
          const patientsWithTasks = patients.filter(patient => {
            const patientTasks = patient.tasks || [];
            // Check if any tasks pass all filters
            return patientTasks.some(task => {
              // Check hideCompleted
              if (hideCompleted && task.completed) return false;
              // Check time filter
              if (timeFilter !== 'all') {
                const taskTime = getTaskTimeOfDay(task.title || task.name || '');
                if (taskTime !== timeFilter && taskTime !== 'anytime') return false;
              }
              return true;
            });
          });

          // Also include general tasks section if any exist (with time filter)
          const visibleGeneralTasks = generalTasks.filter(task => {
            // Apply hideCompleted filter
            if (hideCompleted && task.completed) return false;
            // Apply time filter
            if (timeFilter !== 'all') {
              const taskTime = getTaskTimeOfDay(task.title || task.name || '');
              if (taskTime !== timeFilter && taskTime !== 'anytime') return false;
            }
            return true;
          });

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

              {/* Patient Cards - sorted by completion (incomplete first) */}
              {patientsWithTasks
                .map(patient => {
                  const patientTasks = patient.tasks || [];
                  const doneCount = patientTasks.filter(t => t.completed).length;
                  const totalCount = patientTasks.length;
                  const allDone = totalCount > 0 && doneCount === totalCount;
                  const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                  return { patient, patientTasks, doneCount, totalCount, allDone, percentage };
                })
                .sort((a, b) => {
                  // Sort: incomplete first, then complete
                  if (a.allDone && !b.allDone) return 1;
                  if (!a.allDone && b.allDone) return -1;
                  // Secondary sort by completion percentage (less complete first)
                  return a.percentage - b.percentage;
                })
                .map(({ patient, patientTasks, doneCount, totalCount, allDone, percentage }, index) => {
                const visibleTasks = patientTasks.filter(task => {
                  // Apply hideCompleted filter
                  if (hideCompleted && task.completed) return false;
                  // Apply time filter
                  if (timeFilter !== 'all') {
                    const taskTime = getTaskTimeOfDay(task.title || task.name || '');
                    if (taskTime !== timeFilter && taskTime !== 'anytime') return false;
                  }
                  return true;
                });

                const colorIndex = (visibleGeneralTasks.length > 0 ? index + 1 : index) % 3;
                const cardBg = allDone ? COLORS.mint : cardColors[colorIndex];
                const isExpanded = isPatientExpanded(patient.id, !allDone);

                return (
                  <div
                    key={patient.id}
                    className={`p-4 rounded-2xl transition-all duration-200 hover:-translate-y-1 relative overflow-hidden ${
                      allDone ? 'opacity-70' : ''
                    }`}
                    style={{
                      background: allDone
                        ? `linear-gradient(180deg, ${COLORS.mint} 0%, ${COLORS.mint}E6 100%)`
                        : `linear-gradient(180deg, ${cardBg} 0%, ${cardBg}E6 100%)`,
                      border: allDone ? '2px solid #10B981' : NEO_BORDER,
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
                      {/* Patient Header - Clickable to expand/collapse */}
                      <button
                        onClick={() => togglePatientExpanded(patient.id)}
                        className="w-full flex items-center justify-between mb-2 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            size={16}
                            className={`text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                          <span className="text-sm font-bold text-gray-900 truncate">{getPatientName(patient)}</span>
                        </div>
                        {allDone ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-black text-white flex items-center gap-1"
                            style={{ backgroundColor: '#10B981', border: '1.5px solid #059669' }}
                          >
                            <Check size={12} /> ALL DONE
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-black text-gray-800"
                            style={{
                              backgroundColor: percentage > 50 ? COLORS.mint : COLORS.pink,
                              border: '1.5px solid #2D3436'
                            }}
                          >
                            {totalCount - doneCount} left
                          </span>
                        )}
                      </button>

                      {/* Progress Bar - Always visible */}
                      <div className={isExpanded ? 'mb-3' : ''}>
                        <div
                          className="h-2 w-full rounded-full overflow-hidden bg-white"
                          style={{ border: '1.5px solid #2D3436' }}
                        >
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: allDone ? '#10B981' : COLORS.mint,
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] font-bold text-gray-600">{doneCount}/{totalCount} tasks</span>
                          <span className="text-[10px] font-bold text-gray-600">{percentage}%</span>
                        </div>
                      </div>

                      {/* Task List - Only visible when expanded */}
                      {isExpanded && visibleTasks.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {visibleTasks.map(task => (
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
                                onClick={() => onToggleTask(patient.id, task.id, task.completed)}
                                className="flex-1 text-left transition hover:-translate-y-0.5 flex items-center gap-2"
                              >
                                <span className={task.completed ? 'line-through' : ''}>
                                  {task.completed ? '✓' : '○'} {task.title || task.name}
                                </span>
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
                          ))}
                        </div>
                      )}
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
              data-testid="close-add-task"
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
