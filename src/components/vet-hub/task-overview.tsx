'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Patient, GeneralTask } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

type TaskOverviewProps = {
  patients: Patient[];
  generalTasks: GeneralTask[];
  onTogglePatientTask: (patientId: number, taskId: number) => void;
  onToggleGeneralTask: (taskId: number) => void;
  onAddMorningTasksToAll: () => void;
};

const TaskOverview: React.FC<TaskOverviewProps> = ({ 
  patients, 
  generalTasks, 
  onTogglePatientTask, 
  onToggleGeneralTask, 
  onAddMorningTasksToAll
}) => {
  return (
    <Card className="my-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle className="text-2xl text-orange-900">Complete Task Overview</CardTitle>
                <CardDescription>A bird's-eye view of all pending tasks.</CardDescription>
            </div>
            <Button onClick={onAddMorningTasksToAll} className="mt-2 sm:mt-0" variant="secondary">
                Add Morning Tasks to All Patients
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {generalTasks.length > 0 && (
            <div className="md:col-span-1">
              <h3 className="font-bold text-indigo-900 mb-3 text-lg">General Tasks</h3>
              <ScrollArea className="h-48 pr-4">
                <div className="space-y-2">
                  {generalTasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${task.completed ? 'bg-green-100 text-green-800' : 'bg-white text-indigo-900 border border-indigo-200'}`}>
                      <Checkbox
                        id={`overview-general-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={() => onToggleGeneralTask(task.id)}
                      />
                      <label htmlFor={`overview-general-${task.id}`} className={`cursor-pointer ${task.completed ? 'line-through' : ''}`}>
                        {task.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          <div className={generalTasks.length > 0 ? "md:col-span-2" : "md:col-span-3"}>
            <h3 className="font-bold text-orange-900 mb-3 text-lg">Patient Tasks</h3>
            <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                {patients.map(patient => {
                  const completedTasks = patient.tasks.filter(t => t.completed).length;
                  
                  return (
                    <div key={patient.id} className="bg-white p-3 rounded-lg border-2 border-orange-200">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-800">{patient.name}</h4>
                        <span className="text-sm font-semibold text-orange-700">
                          {completedTasks}/{patient.tasks.length} tasks
                        </span>
                      </div>
                      {patient.tasks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {patient.tasks.map(task => (
                            <div key={task.id} className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${task.completed ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-900'}`}>
                                <Checkbox
                                    id={`overview-${patient.id}-${task.id}`}
                                    checked={task.completed}
                                    onCheckedChange={() => onTogglePatientTask(patient.id, task.id)}
                                />
                                <label htmlFor={`overview-${patient.id}-${task.id}`} className={`cursor-pointer ${task.completed ? 'line-through' : ''}`}>
                                    {task.name}
                                </label>
                            </div>
                            ))}
                        </div>
                      ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-2">No tasks for this patient.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskOverview;
