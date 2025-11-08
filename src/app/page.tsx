'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth as useApiAuth, usePatients } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { parsePatientBlurb } from '@/lib/ai-parser';
import { Search, Plus, Loader2, LogOut, CheckCircle2, Circle, Trash2, Sparkles, Brain, Zap, ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VetHub() {
  const { user, isLoading: authLoading, login, register, logout } = useApiAuth();
  const { patients, isLoading: patientsLoading, refetch } = usePatients();
  const { toast } = useToast();

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Patient state
  const [patientBlurb, setPatientBlurb] = useState('');
  const [patientType, setPatientType] = useState<'MRI' | 'Surgery' | 'Medical'>('MRI');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);
  const [showTaskOverview, setShowTaskOverview] = useState(false);
  const [quickAddMenuPatient, setQuickAddMenuPatient] = useState<number | null>(null);
  const [customTaskName, setCustomTaskName] = useState('');
  const [roundingSheetPatient, setRoundingSheetPatient] = useState<number | null>(null);
  const [roundingFormData, setRoundingFormData] = useState<any>({});

  // Calculate task stats
  const taskStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    patients.forEach(patient => {
      const tasks = patient.tasks || [];
      total += tasks.length;
      completed += tasks.filter((t: any) => t.completed).length;
    });
    return { total, completed, remaining: total - completed };
  }, [patients]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      if (isSignUp) {
        await register(email, password);
        toast({ title: '🎉 Account created!', description: 'Welcome to VetHub' });
      } else {
        await login(email, password);
        toast({ title: '👋 Welcome back!', description: 'Logged in successfully' });
      }
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
    }
  };

  const handleAddPatient = async () => {
    if (!patientBlurb.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please paste patient information' });
      return;
    }

    setIsAddingPatient(true);
    try {
      const parsed = await parsePatientBlurb(patientBlurb);
      const patientName = parsed.patientName?.replace(/^Patient\s/i, '') || 'Unnamed';
      let ownerLastName = '';

      if (parsed.ownerName) {
        const parts = parsed.ownerName.split(' ').filter(Boolean);
        ownerLastName = parts[parts.length - 1] || '';
      }

      const fullName = ownerLastName ? `${patientName} ${ownerLastName}` : patientName;

      const morningTasks = ['Owner Called', 'Daily SOAP Done', 'Overnight Notes Checked'];
      const eveningTasks = ['Vet Radar Done', 'Rounding Sheet Done', 'Sticker on Daily Sheet'];

      const typeTasks = patientType === 'MRI'
        ? ['Black Book', 'Blood Work', 'Chest X-rays', 'MRI Anesthesia Sheet', 'NPO', 'Print 5 Stickers', 'Print 1 Sheet Small Stickers']
        : patientType === 'Surgery'
        ? ['Surgery Slip', 'Written on Board', 'Print 4 Large Stickers', 'Print 2 Sheets Small Stickers', 'Print Surgery Sheet', 'Clear Daily']
        : ['Admission SOAP', 'Treatment Sheet Created'];

      const allTasks = [...morningTasks, ...eveningTasks, ...typeTasks];

      const patientData = {
        name: fullName,
        type: patientType,
        status: 'New Admit',
        added_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        patient_info: {
          patientId: parsed.patientId || '',
          ownerName: parsed.ownerName || '',
          ownerPhone: parsed.ownerPhone || '',
          species: parsed.species || '',
          breed: parsed.breed || '',
          age: parsed.age || '',
          sex: parsed.sex || '',
          weight: parsed.weight || '',
        },
        rounding_data: {
          signalment: [parsed.age, parsed.sex, parsed.breed].filter(Boolean).join(' '),
          problems: parsed.problem || '',
          diagnosticFindings: parsed.bloodwork ? `CBC/CHEM: ${parsed.bloodwork}` : '',
          therapeutics: parsed.medications?.join('\\n') || '',
          plan: parsed.plan || '',
        },
        mri_data: {},
      };

      const newPatient = await apiClient.createPatient(patientData);

      for (const taskName of allTasks) {
        await apiClient.createTask(newPatient.id, {
          name: taskName,
          completed: false,
          date: new Date().toISOString().split('T')[0],
        });
      }

      toast({ title: '✨ Patient Added!', description: `${fullName} created with AI-parsed data` });
      setPatientBlurb('');
      refetch();
    } catch (error: any) {
      console.error('Add patient error:', error);
      toast({ variant: 'destructive', title: 'Failed to add patient', description: error.message || 'Try again' });
    } finally {
      setIsAddingPatient(false);
    }
  };

  const handleToggleTask = async (patientId: number, taskId: number, currentStatus: boolean) => {
    try {
      await apiClient.updateTask(String(patientId), String(taskId), { completed: !currentStatus });
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task' });
    }
  };

  const handleDeleteTask = async (patientId: number, taskId: number) => {
    try {
      await apiClient.deleteTask(String(patientId), String(taskId));
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task' });
    }
  };

  const handleQuickAddTask = async (patientId: number, taskName: string) => {
    try {
      await apiClient.createTask(patientId, {
        name: taskName,
        completed: false,
        date: new Date().toISOString().split('T')[0],
      });
      toast({ title: `✅ Added: ${taskName}` });
      setQuickAddMenuPatient(null);
      setCustomTaskName('');
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add task' });
    }
  };

  const handleDeletePatient = async (patientId: number) => {
    if (!confirm('Delete this patient?')) return;
    try {
      await apiClient.deletePatient(String(patientId));
      toast({ title: '🗑️ Patient deleted' });
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete patient' });
    }
  };

  const handleStatusChange = async (patientId: number, newStatus: string) => {
    try {
      await apiClient.updatePatient(String(patientId), { status: newStatus });
      toast({ title: `✅ Status updated to ${newStatus}` });
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status' });
    }
  };

  const handleCompleteAllCategory = async (patientId: number, category: 'morning' | 'evening') => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const tasks = patient.tasks || [];
      const categoryTasks = tasks.filter((t: any) => {
        const taskCategory = getTaskCategory(t.name);
        return taskCategory === category && !t.completed;
      });

      for (const task of categoryTasks) {
        await apiClient.updateTask(String(patientId), String(task.id), { completed: true });
      }

      toast({ title: `✅ Completed all ${category} tasks!` });
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to complete ${category} tasks` });
    }
  };

  const handleSaveRoundingData = async () => {
    if (!roundingSheetPatient) return;

    try {
      await apiClient.updatePatient(String(roundingSheetPatient), {
        rounding_data: roundingFormData
      });
      toast({ title: '✅ Rounding data saved!' });
      setRoundingSheetPatient(null);
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save rounding data' });
    }
  };

  // Load rounding data when modal opens
  useEffect(() => {
    if (roundingSheetPatient !== null) {
      const patient = patients.find(p => p.id === roundingSheetPatient);
      if (patient) {
        setRoundingFormData(patient.rounding_data || {});
      }
    }
  }, [roundingSheetPatient, patients]);

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSpeciesEmoji = (species?: string) => {
    if (!species) return '🐾';
    const lower = species.toLowerCase();
    if (lower.includes('dog') || lower.includes('canine')) return '🐕';
    if (lower.includes('cat') || lower.includes('feline')) return '🐈';
    return '🐾';
  };

  const getTypeColor = (type: string) => {
    if (type === 'MRI') return 'from-cyan-500 to-blue-600';
    if (type === 'Surgery') return 'from-orange-500 to-red-600';
    return 'from-purple-500 to-pink-600';
  };

  const getTaskCategory = (taskName: string): 'morning' | 'evening' | 'general' => {
    const morningTasks = ['Owner Called', 'Daily SOAP Done', 'Overnight Notes Checked'];
    const eveningTasks = ['Vet Radar Done', 'Rounding Sheet Done', 'Sticker on Daily Sheet'];

    if (morningTasks.some(t => taskName.includes(t) || t.includes(taskName))) return 'morning';
    if (eveningTasks.some(t => taskName.includes(t) || t.includes(taskName))) return 'evening';
    return 'general';
  };

  const getTaskIcon = (category: string) => {
    if (category === 'morning') return '🌅';
    if (category === 'evening') return '🌙';
    return '📋';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-700/50">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">🧠</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              VetHub
            </h1>
            <p className="text-slate-400 mt-3 text-lg">AI-Powered Neuro Vet Portal 🐾</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            />

            {authError && <p className="text-red-400 text-sm">{authError}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-500/50"
            >
              {isSignUp ? '✨ Create Account' : '🚀 Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-sm text-slate-400 hover:text-cyan-400 transition"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <header className="relative bg-slate-800/40 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl animate-pulse">🧠</div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                VetHub
              </h1>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTaskOverview(!showTaskOverview)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <ListTodo size={18} />
              Tasks: {taskStats.remaining}/{taskStats.total}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-red-400 transition rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Task Overview */}
        {showTaskOverview && (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <ListTodo className="text-cyan-400" />
              All Tasks Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map(patient => {
                const tasks = patient.tasks || [];
                if (tasks.length === 0) return null;
                return (
                  <div key={patient.id} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                    <h3 className="text-white font-bold mb-2">{patient.name}</h3>
                    <div className="space-y-2">
                      {tasks.map((task: any) => {
                        const category = getTaskCategory(task.name);
                        const icon = getTaskIcon(category);
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 text-sm group"
                          >
                            <button
                              onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                              className="flex-shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="text-green-400" size={16} />
                              ) : (
                                <Circle className="text-slate-600 group-hover:text-cyan-400" size={16} />
                              )}
                            </button>
                            <span className="text-base">{icon}</span>
                            <span
                              className={`flex-1 cursor-pointer ${task.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}
                              onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                            >
                              {task.name}
                            </span>
                            <button
                              onClick={() => handleDeleteTask(patient.id, task.id)}
                              className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Patient */}
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="text-cyan-400" size={28} />
            <h2 className="text-2xl font-bold text-white">Add Patient</h2>
            <Sparkles className="text-yellow-400 animate-pulse" size={24} />
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
              AI-POWERED
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              {(['MRI', 'Surgery', 'Medical'] as const).map((type) => {
                const emojis = { MRI: '🧠', Surgery: '🔪', Medical: '💊' };
                return (
                  <button
                    key={type}
                    onClick={() => setPatientType(type)}
                    className={`px-5 py-3 rounded-xl font-bold transition-all ${
                      patientType === type
                        ? `bg-gradient-to-r ${getTypeColor(type)} text-white shadow-lg scale-105`
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                    }`}
                  >
                    {emojis[type]} {type}
                  </button>
                );
              })}
            </div>

            <textarea
              value={patientBlurb}
              onChange={(e) => setPatientBlurb(e.target.value)}
              placeholder="🐾 Paste patient info... Claude AI will extract everything! 🤖"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition resize-none"
              rows={4}
            />

            <button
              onClick={handleAddPatient}
              disabled={isAddingPatient || !patientBlurb.trim()}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isAddingPatient ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Claude is analyzing...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Add Patient with Claude AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search patients..."
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
          />
        </div>

        {/* Patients */}
        {patientsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-12 text-center">
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-slate-400 text-lg">No patients yet. Add your first furry friend above!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPatients.map((patient) => {
              const tasks = patient.tasks || [];
              const completedTasks = tasks.filter((t: any) => t.completed).length;
              const totalTasks = tasks.length;
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
              const isExpanded = expandedPatient === patient.id;
              const info = patient.patient_info || {};
              const rounding = patient.rounding_data || {};
              const emoji = getSpeciesEmoji(info.species);

              return (
                <div
                  key={patient.id}
                  className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden hover:shadow-cyan-500/20 hover:border-slate-600/50 transition-all"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className="text-3xl">{emoji}</span>
                          <h3 className="text-2xl font-bold text-white">{patient.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${getTypeColor(patient.type)} text-white shadow-lg`}>
                            {patient.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 uppercase">Status:</span>
                          <select
                            value={patient.status || 'New Admit'}
                            onChange={(e) => handleStatusChange(patient.id, e.target.value)}
                            className="px-3 py-1 rounded-lg text-sm font-bold bg-slate-700/50 border border-slate-600 text-white hover:bg-slate-700 transition cursor-pointer"
                          >
                            <option value="New Admit">New Admit</option>
                            <option value="Hospitalized">Hospitalized</option>
                            <option value="Discharging">Discharging</option>
                            <option value="Discharged">Discharged</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePatient(patient.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-400 font-medium">Tasks: {completedTasks}/{totalTasks}</span>
                        <span className="text-cyan-400 font-bold text-lg">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/50">
                        <div
                          className={`h-full bg-gradient-to-r ${getTypeColor(patient.type)} transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                        className="text-cyan-400 font-bold hover:text-cyan-300 transition"
                      >
                        {isExpanded ? '🔼 Hide Tasks' : '🔽 Show Tasks'}
                      </button>
                      <button
                        onClick={() => setQuickAddMenuPatient(quickAddMenuPatient === patient.id ? null : patient.id)}
                        className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-bold hover:scale-105 transition-transform"
                      >
                        ➕ Add Task
                      </button>
                      <button
                        onClick={() => setRoundingSheetPatient(patient.id)}
                        className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-bold hover:scale-105 transition-transform"
                      >
                        📋 Rounding Sheet
                      </button>
                    </div>

                    {/* Quick Add Task Menu */}
                    {quickAddMenuPatient === patient.id && (
                      <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <h5 className="text-white font-bold mb-3">Quick Add Common Tasks:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                          {['Discharge Instructions', 'MRI Findings Inputted', 'Pre-op Bloodwork', 'Owner Update Call', 'Treatment Plan Updated', 'Recheck Scheduled'].map(taskName => (
                            <button
                              key={taskName}
                              onClick={() => handleQuickAddTask(patient.id, taskName)}
                              className="px-3 py-2 bg-slate-800/50 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500 rounded-lg text-slate-300 hover:text-cyan-300 text-sm transition"
                            >
                              {taskName}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customTaskName}
                            onChange={(e) => setCustomTaskName(e.target.value)}
                            placeholder="Custom task name..."
                            className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-cyan-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customTaskName.trim()) {
                                handleQuickAddTask(patient.id, customTaskName);
                              }
                            }}
                          />
                          <button
                            onClick={() => customTaskName.trim() && handleQuickAddTask(patient.id, customTaskName)}
                            disabled={!customTaskName.trim()}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tasks - Grouped by Category */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-6 bg-slate-900/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold flex items-center gap-2">
                          <ListTodo size={18} className="text-cyan-400" />
                          Tasks ({completedTasks}/{totalTasks})
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCompleteAllCategory(patient.id, 'morning')}
                            className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                          >
                            ✅ All Morning
                          </button>
                          <button
                            onClick={() => handleCompleteAllCategory(patient.id, 'evening')}
                            className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                          >
                            ✅ All Evening
                          </button>
                        </div>
                      </div>

                      {/* Morning Tasks */}
                      {tasks.filter((t: any) => getTaskCategory(t.name) === 'morning').length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
                            🌅 Morning Tasks
                          </h5>
                          <div className="space-y-2">
                            {tasks.filter((t: any) => getTaskCategory(t.name) === 'morning').map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-yellow-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={20} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-yellow-400" size={20} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evening Tasks */}
                      {tasks.filter((t: any) => getTaskCategory(t.name) === 'evening').length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                            🌙 Evening Tasks
                          </h5>
                          <div className="space-y-2">
                            {tasks.filter((t: any) => getTaskCategory(t.name) === 'evening').map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={20} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-indigo-400" size={20} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* General Tasks (MRI/Surgery/Conditional) */}
                      {tasks.filter((t: any) => getTaskCategory(t.name) === 'general').length > 0 && (
                        <div>
                          <h5 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                            📋 {patient.type} Tasks & Other
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {tasks.filter((t: any) => getTaskCategory(t.name) === 'general').map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={20} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-cyan-400" size={20} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rounding Sheet Modal */}
        {roundingSheetPatient !== null && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-4xl my-8">
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    📋 Rounding Sheet
                    <span className="text-cyan-400">
                      {patients.find(p => p.id === roundingSheetPatient)?.name}
                    </span>
                  </h3>
                  <button
                    onClick={() => setRoundingSheetPatient(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {(() => {
                  const patient = patients.find(p => p.id === roundingSheetPatient);
                  if (!patient) return null;
                  const info = patient.patient_info || {};
                  const rounding = patient.rounding_data || {};

                  return (
                    <>
                      {/* Row 1: Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Signalment</label>
                          <input
                            type="text"
                            value={roundingFormData.signalment || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, signalment: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="9 months Female Spayed Dachshund Mix"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Location</label>
                          <input
                            type="text"
                            value={roundingFormData.location || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, location: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="IP"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">ICU Criteria</label>
                          <input
                            type="text"
                            value={roundingFormData.icuCriteria || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, icuCriteria: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="n/a"
                          />
                        </div>
                      </div>

                      {/* Row 2: Code & Problems */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Code</label>
                          <select
                            value={roundingFormData.code || 'Yellow'}
                            onChange={(e) => setRoundingFormData({...roundingFormData, code: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="Green">Green</option>
                            <option value="Yellow">Yellow</option>
                            <option value="Orange">Orange</option>
                            <option value="Red">Red</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Problems</label>
                          <input
                            type="text"
                            value={roundingFormData.problems || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, problems: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="suspected aa lux"
                          />
                        </div>
                      </div>

                      {/* Row 3: Diagnostics */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Diagnostics</label>
                        <textarea
                          value={roundingFormData.diagnosticFindings || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, diagnosticFindings: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-none"
                          placeholder="cbc/chem pending"
                        />
                      </div>

                      {/* Row 4: Therapeutics */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Therapeutics (Medications)</label>
                        <textarea
                          value={roundingFormData.therapeutics || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, therapeutics: e.target.value})}
                          rows={3}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-none"
                          placeholder="Dex SP (Dexameth Sod Phos) 4mg/mL Inj&#10;Gabapentin Suspension 50mg/ml"
                        />
                      </div>

                      {/* Row 5: IVC, Fluids, CRI */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">IVC</label>
                          <select
                            value={roundingFormData.ivc || 'No'}
                            onChange={(e) => setRoundingFormData({...roundingFormData, ivc: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Fluids</label>
                          <input
                            type="text"
                            value={roundingFormData.fluids || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, fluids: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="No or fluid rate"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">CRI</label>
                          <input
                            type="text"
                            value={roundingFormData.cri || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, cri: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="No or CRI details"
                          />
                        </div>
                      </div>

                      {/* Row 6: Overnight Dx */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Overnight Dx</label>
                        <input
                          type="text"
                          value={roundingFormData.overnightDx || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, overnightDx: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          placeholder="none"
                        />
                      </div>

                      {/* Row 7: Concerns */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Concerns</label>
                        <input
                          type="text"
                          value={roundingFormData.concerns || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, concerns: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          placeholder="none"
                        />
                      </div>

                      {/* Row 8: Comments */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Comments</label>
                        <textarea
                          value={roundingFormData.comments || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, comments: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-none"
                          placeholder="CARE WITH NECK"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                        <button
                          onClick={handleSaveRoundingData}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:scale-105 transition-transform"
                        >
                          💾 Save Changes
                        </button>
                        <button
                          onClick={() => setRoundingSheetPatient(null)}
                          className="px-6 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
