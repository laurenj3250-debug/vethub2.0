'use client';

import React from 'react';
import { Users, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface DashboardStatsProps {
  patients: any[];
  onFilterClick?: (filterType: string, value: string) => void;
}

export function DashboardStats({ patients, onFilterClick }: DashboardStatsProps) {
  const today = new Date().toISOString().split('T')[0];

  // Calculate stats
  const totalPatients = patients.length;

  // Group by status
  const byStatus = patients.reduce((acc: any, p) => {
    const status = p.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Group by type
  const byType = patients.reduce((acc: any, p) => {
    const type = p.type || 'Medical';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Calculate task completion
  let totalTasks = 0;
  let completedTasks = 0;
  let patientsNeedingAttention = 0;

  patients.forEach(p => {
    const tasks = (p.tasks || []).filter((t: any) => t.date === today);
    const completed = tasks.filter((t: any) => t.completed).length;
    totalTasks += tasks.length;
    completedTasks += completed;

    // Flag patients with <50% completion
    const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 100;
    if (completionRate < 50) patientsNeedingAttention++;
  });

  const overallCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <Users className="text-cyan-400" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{totalPatients}</div>
            <div className="text-xs text-slate-400">Total Patients</div>
          </div>
        </div>

        {/* Task Completion */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-lg">
            <CheckCircle2 className="text-emerald-400" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{overallCompletionRate}%</div>
            <div className="text-xs text-slate-400">
              {completedTasks}/{totalTasks} tasks done
            </div>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/20 rounded-lg">
            <AlertCircle className="text-red-400" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{patientsNeedingAttention}</div>
            <div className="text-xs text-slate-400">Need Attention</div>
          </div>
        </div>

        {/* Active Cases */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Activity className="text-purple-400" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">
              {(byStatus['New Admit'] || 0) + (byStatus['Hospitalized'] || 0)}
            </div>
            <div className="text-xs text-slate-400">Active Cases</div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-4 pt-4 border-t border-slate-700/30">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-medium mr-2">Quick Filters:</span>

          {/* Status filters */}
          {Object.entries(byStatus).map(([status, count]) => (
            <button
              key={status}
              onClick={() => onFilterClick?.('status', status)}
              className="px-2 py-1 rounded text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50 hover:border-slate-500/50 transition"
            >
              {status} ({count})
            </button>
          ))}

          {/* Type filters */}
          {Object.entries(byType).map(([type, count]) => {
            const colors: any = {
              'Surgery': 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
              'MRI': 'bg-teal-500/20 text-teal-400 border-teal-500/30 hover:bg-teal-500/30',
              'Medical': 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30',
            };
            return (
              <button
                key={type}
                onClick={() => onFilterClick?.('type', type)}
                className={`px-2 py-1 rounded text-xs font-medium border transition ${colors[type] || 'bg-slate-700/50 text-slate-300 border-slate-600/50'}`}
              >
                {type} ({count})
              </button>
            );
          })}

          {/* Priority filter */}
          {patientsNeedingAttention > 0 && (
            <button
              onClick={() => onFilterClick?.('priority', 'needs-attention')}
              className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition"
            >
              ⚠️ Needs Attention ({patientsNeedingAttention})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
