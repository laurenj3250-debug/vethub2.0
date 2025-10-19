'use client';

import React from 'react';
import { Patient, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Sun, Moon } from 'lucide-react';
import { admitTasks, morningTasks, eveningTasks, commonTasks } from '@/lib/constants';

type PatientTasksProps = {
  patient: Patient;
  onUpdatePatientField: <K extends keyof Patient>(id: number, field: K, value: Patient[K]) => void;
};

const TaskListItem: React.FC<{ task: Task; patientId: number; onToggle: (id: number) => void; onRemove: (id: number) => void }> = ({ task, patientId, onToggle, onRemove }) => (
  <div
    className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${task.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-card'}`}
  >
    <Checkbox
      id={`${patientId}-${task.id}`}
      checked={task.completed}
      onCheckedChange={() => onToggle(task.id)}
    />
    <label
      htmlFor={`${patientId}-${task.id}`}
      className={`flex-1 text-sm font-medium cursor-pointer ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
    >
      {task.name}
    </label>
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-destructive"
      onClick={() => onRemove(task.id)}
    >
      <X className="h-4 w-4" />
    </Button>
  </div>
);

const PatientTasks: React.FC<PatientTasksProps> = ({ patient, onUpdatePatientField }) => {
  const addTask = (taskName: string) => {
    const taskExists = patient.tasks.some(t => t.name === taskName);
    if (!taskExists) {
      const newTask = { name: taskName, completed: false, id: Date.now() + Math.random() };
      onUpdatePatientField(patient.id, 'tasks', [...patient.tasks, newTask]);
    }
  };

  const addMultipleTasks = (taskNames: string[]) => {
    const existingTaskNames = new Set(patient.tasks.map(t => t.name));
    const tasksToAdd = taskNames.filter(tn => !existingTaskNames.has(tn));
    if (tasksToAdd.length > 0) {
      const newTasks = tasksToAdd.map(name => ({ name, completed: false, id: Date.now() + Math.random() }));
      onUpdatePatientField(patient.id, 'tasks', [...patient.tasks, ...newTasks]);
    }
  };

  const removeTask = (taskId: number) => {
    onUpdatePatientField(patient.id, 'tasks', patient.tasks.filter(t => t.id !== taskId));
  };

  const toggleTask = (taskId: number) => {
    onUpdatePatientField(patient.id, 'tasks', patient.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };
  
  const addCustomTask = () => {
    if (patient.customTask.trim()) {
      addTask(patient.customTask.trim());
      onUpdatePatientField(patient.id, 'customTask', '');
    }
  };

  const resetDailyTasks = () => {
    const allDailyTasks = new Set([...morningTasks, ...eveningTasks]);
    onUpdatePatientField(patient.id, 'tasks', patient.tasks.filter(t => !allDailyTasks.has(t.name)));
  };

  const patientMorningTasks = patient.tasks.filter(t => morningTasks.includes(t.name));
  const patientEveningTasks = patient.tasks.filter(t => eveningTasks.includes(t.name));
  const otherTasks = patient.tasks.filter(t => !morningTasks.includes(t.name) && !eveningTasks.includes(t.name));

  return (
    <div className="space-y-6 pt-4">
      {patient.status === 'New Admit' && (
        <div className="space-y-2 p-3 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
            New Admit Tasks - {patient.type}
          </h4>
          <div className="flex flex-wrap gap-2">
            {admitTasks[patient.type].map(task => (
              <Button key={task} size="sm" variant="outline" onClick={() => addTask(task)}>
                + {task}
              </Button>
            ))}
          </div>
          <p className="text-xs text-yellow-800 dark:text-yellow-400 mt-2 italic">Change patient status to hide this section.</p>
        </div>
      )}

      <div className="space-y-2 p-3 bg-blue-100/30 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Daily Tasks</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <Button size="sm" onClick={() => addMultipleTasks(morningTasks)} className="bg-orange-500 hover:bg-orange-600 text-white">Add Morning Tasks</Button>
            <Button size="sm" onClick={() => addMultipleTasks(eveningTasks)} className="bg-indigo-500 hover:bg-indigo-600 text-white">Add Evening Tasks</Button>
        </div>
        <Button size="xs" variant="ghost" onClick={resetDailyTasks} className="w-full text-muted-foreground">Clear All Daily Tasks</Button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Additional Tasks</h4>
        <div className="flex flex-wrap gap-2">
          {commonTasks.map(task => (
            <Button key={task} size="sm" variant="secondary" onClick={() => addTask(task)}>
              + {task}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Custom Task</h4>
        <div className="flex gap-2">
          <Input
            value={patient.customTask}
            onChange={(e) => onUpdatePatientField(patient.id, 'customTask', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomTask()}
            placeholder="Add a unique task..."
          />
          <Button onClick={addCustomTask}>Add</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground border-b pb-2">Task List</h4>
        {patient.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">No tasks for this patient yet.</p>
        ) : (
          <div className="space-y-4">
            {patientMorningTasks.length > 0 && (
              <div className="space-y-2">
                <h5 className="flex items-center gap-2 text-md font-semibold text-orange-600">
                  <Sun size={18} />
                  Morning Tasks
                </h5>
                <div className="space-y-2">
                  {patientMorningTasks.map(task => (
                    <TaskListItem key={task.id} task={task} patientId={patient.id} onToggle={toggleTask} onRemove={removeTask} />
                  ))}
                </div>
              </div>
            )}
            
            {patientEveningTasks.length > 0 && (
              <div className="space-y-2">
                <h5 className="flex items-center gap-2 text-md font-semibold text-indigo-600">
                  <Moon size={18} />
                  Evening Tasks
                </h5>
                <div className="space-y-2">
                  {patientEveningTasks.map(task => (
                    <TaskListItem key={task.id} task={task} patientId={patient.id} onToggle={toggleTask} onRemove={removeTask} />
                  ))}
                </div>
              </div>
            )}

            {otherTasks.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-md font-semibold text-gray-600">Other Tasks</h5>
                <div className="space-y-2">
                  {otherTasks.map(task => (
                    <TaskListItem key={task.id} task={task} patientId={patient.id} onToggle={toggleTask} onRemove={removeTask} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientTasks;
