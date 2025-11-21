'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, Trash2, AlertTriangle, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

// Task status type
export type TaskStatus = 'todo' | 'in-progress' | 'done';

// Extended task interface with kanban fields
export interface KanbanTask {
  id: number;
  name: string;
  title?: string;
  completed: boolean;
  status: TaskStatus;
  patientId?: number;
  patientName?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

// Column definition
interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  limit?: number;
}

const COLUMNS: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'text-slate-400',
    bgColor: 'bg-slate-800/60',
    borderColor: 'border-slate-700/50',
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-700/50',
    limit: 3,
  },
  {
    id: 'done',
    title: 'Done',
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-700/50',
  },
];

interface TaskKanbanBoardProps {
  patients: any[];
  generalTasks: any[];
  hideCompletedTasks: boolean;
  onRefetch: () => void;
}

// Draggable Task Card Component
function TaskCard({ task, isOverlay = false }: { task: KanbanTask; isOverlay?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Priority border colors
  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-slate-600',
  };

  const priorityColor = priorityColors[task.priority || 'low'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isOverlay ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div
        className={`
          bg-slate-700/50 rounded-lg p-3 border-l-4 ${priorityColor}
          border border-slate-600/50 hover:border-cyan-500/50
          transition-all duration-200
          ${isDragging ? 'shadow-2xl ring-2 ring-cyan-500/50' : 'shadow-md'}
        `}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} className="text-slate-500" />
        </div>

        {/* Patient Badge */}
        {task.patientName && (
          <div className="mb-2">
            <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
              {task.patientName}
            </span>
          </div>
        )}

        {/* Task Content */}
        <div className="flex items-start gap-2 pr-6">
          {task.status === 'done' ? (
            <CheckCircle2 className="text-green-400 flex-shrink-0 mt-0.5" size={18} />
          ) : (
            <Circle className="text-slate-500 flex-shrink-0 mt-0.5" size={18} />
          )}
          <p className={`text-sm flex-1 ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
            {task.title || task.name}
          </p>
        </div>

        {/* Priority Indicator */}
        {task.priority && task.priority !== 'low' && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${
              task.priority === 'high' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {task.priority === 'high' ? '🔥 High Priority' : '⚠️ Medium Priority'}
            </span>
          </div>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <div className="mt-2 text-xs text-slate-400">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

// Droppable Column Component
function KanbanColumn({
  column,
  tasks,
  onDeleteTask,
}: {
  column: Column;
  tasks: KanbanTask[];
  onDeleteTask: (taskId: number, patientId?: number) => void;
}) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'column' },
  });

  const isOverLimit = column.limit && tasks.length > column.limit;

  return (
    <div className="flex-1 min-w-[300px]">
      <div className={`rounded-xl ${column.bgColor} border ${column.borderColor} overflow-hidden`}>
        {/* Column Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold ${column.color}`}>
              {column.title}
            </h3>
            <div className="flex items-center gap-2">
              {isOverLimit && (
                <div title="WIP limit exceeded">
                  <AlertTriangle size={18} className="text-yellow-400" />
                </div>
              )}
              <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${column.bgColor} border ${column.borderColor}`}>
                {tasks.length}
                {column.limit && ` / ${column.limit}`}
              </span>
            </div>
          </div>
          {isOverLimit && (
            <p className="text-xs text-yellow-400 mt-2">
              ⚠️ WIP limit exceeded! Focus on completing existing tasks.
            </p>
          )}
        </div>

        {/* Task List */}
        <div ref={setNodeRef} className="p-4 space-y-3 min-h-[400px]">
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {tasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8 text-slate-500"
                >
                  <p className="text-sm">No tasks</p>
                </motion.div>
              ) : (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="relative group"
                  >
                    <TaskCard task={task} />
                    {/* Delete Button */}
                    <button
                      onClick={() => onDeleteTask(task.id, task.patientId)}
                      className="absolute top-2 left-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

export function TaskKanbanBoard({
  patients,
  generalTasks,
  hideCompletedTasks,
  onRefetch,
}: TaskKanbanBoardProps) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<number | null>(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      // Keyboard controls for accessibility
    })
  );

  // Convert patients and general tasks to kanban tasks
  const allKanbanTasks = useMemo(() => {
    const tasks: KanbanTask[] = [];

    // Process patient tasks
    patients
      .filter((p) => p.status !== 'Discharged')
      .forEach((patient) => {
        (patient.tasks || []).forEach((task: any) => {
          // Determine status based on completed flag and existing status
          let status: TaskStatus = task.status || 'todo';
          if (task.completed) {
            status = 'done';
          } else if (!task.status) {
            status = 'todo';
          }

          tasks.push({
            id: task.id,
            name: task.name || task.title,
            title: task.title || task.name,
            completed: task.completed,
            status,
            patientId: patient.id,
            patientName: patient.demographics?.name || patient.name,
            priority: task.priority || 'low',
            dueDate: task.dueDate,
          });
        });
      });

    // Process general tasks
    generalTasks.forEach((task: any) => {
      let status: TaskStatus = task.status || 'todo';
      if (task.completed) {
        status = 'done';
      } else if (!task.status) {
        status = 'todo';
      }

      tasks.push({
        id: task.id,
        name: task.name || task.title,
        title: task.title || task.name,
        completed: task.completed,
        status,
        priority: task.priority || 'low',
        dueDate: task.dueDate,
      });
    });

    return tasks;
  }, [patients, generalTasks]);

  // Filter and group tasks by column
  const tasksByColumn = useMemo(() => {
    const filtered = hideCompletedTasks
      ? allKanbanTasks.filter((t) => t.status !== 'done')
      : allKanbanTasks;

    return {
      todo: filtered.filter((t) => t.status === 'todo'),
      'in-progress': filtered.filter((t) => t.status === 'in-progress'),
      done: filtered.filter((t) => t.status === 'done'),
    };
  }, [allKanbanTasks, hideCompletedTasks]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = allKanbanTasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determine the new status based on drop target
    let newStatus: TaskStatus = activeTask.status;

    // Check if dropped on a column
    const overColumn = COLUMNS.find((c) => c.id === over.id);
    if (overColumn) {
      newStatus = overColumn.id;
    } else {
      // Dropped on another task - find which column it's in
      const overTask = allKanbanTasks.find((t) => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    // Only update if status changed
    if (newStatus !== activeTask.status) {
      try {
        const completed = newStatus === 'done';

        // Update task via API
        if (activeTask.patientId) {
          await apiClient.updateTask(String(activeTask.patientId), String(activeTask.id), {
            completed,
            status: newStatus,
          });
        } else {
          // General task
          await apiClient.updateGeneralTask(String(activeTask.id), {
            completed,
            status: newStatus,
          });
        }

        toast({
          title: '✨ Task Updated',
          description: `Moved to ${COLUMNS.find((c) => c.id === newStatus)?.title}`,
        });

        onRefetch();
      } catch (error: any) {
        console.error('Failed to update task status:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to update task',
          description: error.message || 'Please try again',
        });
      }
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: number, patientId?: number) => {
    try {
      if (patientId) {
        await apiClient.deleteTask(String(patientId), String(taskId));
      } else {
        await apiClient.deleteGeneralTask(String(taskId));
      }

      toast({
        title: 'Task Deleted',
        description: 'Task removed successfully',
      });

      onRefetch();
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete task',
        description: error.message || 'Please try again',
      });
    }
  };

  const activeTask = activeId ? allKanbanTasks.find((t) => t.id === activeId) : null;

  return (
    <div className="bg-gradient-to-br from-slate-900/40 to-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <SortableContext items={COLUMNS.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id]}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </SortableContext>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80">
              <TaskCard task={activeTask} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-400">{tasksByColumn.todo.length}</p>
            <p className="text-xs text-slate-500">To Do</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{tasksByColumn['in-progress'].length}</p>
            <p className="text-xs text-slate-500">In Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{tasksByColumn.done.length}</p>
            <p className="text-xs text-slate-500">Done</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
        <p className="text-xs text-slate-400 text-center">
          <strong className="text-slate-300">💡 Tip:</strong> Drag tasks between columns to update their status.
          Use <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300 mx-1">Space</kbd> to grab,
          arrow keys to move, and <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300 mx-1">Enter</kbd> to drop.
        </p>
      </div>
    </div>
  );
}
