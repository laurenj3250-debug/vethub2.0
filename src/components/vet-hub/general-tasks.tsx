'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import type { GeneralTask } from '@/lib/types';
import { commonGeneralTasks } from '@/lib/constants';

type GeneralTasksProps = {
  tasks: GeneralTask[];
  onAddTask: (taskName: string, setNewTask: (val: string) => void) => void;
  onToggleTask: (taskId: number) => void;
  onRemoveTask: (taskId: number) => void;
};

const GeneralTasks: React.FC<GeneralTasksProps> = ({ tasks, onAddTask, onToggleTask, onRemoveTask }) => {
  const [newTask, setNewTask] = useState('');

  const handleAddTask = () => {
    onAddTask(newTask, setNewTask);
  };
  
  const handleQuickAddTask = (task: string) => {
     onAddTask(task, () => {});
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">General Tasks (Not Patient-Specific)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {commonGeneralTasks.map(task => (
            <Button key={task} variant="outline" size="sm" onClick={() => handleQuickAddTask(task)}>
              + {task}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add custom general task..."
          />
          <Button onClick={handleAddTask}>Add Task</Button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No general tasks yet. Click quick-add buttons or type a custom task.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${task.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-secondary/50'}`}
              >
                <Checkbox
                  id={`general-task-${task.id}`}
                  checked={task.completed}
                  onCheckedChange={() => onToggleTask(task.id)}
                />
                <label
                  htmlFor={`general-task-${task.id}`}
                  className={`flex-1 text-sm font-medium cursor-pointer ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                >
                  {task.name}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveTask(task.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GeneralTasks;
