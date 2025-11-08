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
        ? ['Surgery Slip', 'Written on Board', 'Print Stickers', 'Post-op Check']
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
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-3xl">{emoji}</span>
                          <h3 className="text-2xl font-bold text-white">{patient.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${getTypeColor(patient.type)} text-white shadow-lg`}>
                            {patient.type}
                          </span>
                          <span className="px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                            {patient.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePatient(patient.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Patient Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {rounding.signalment && (
                        <div className="col-span-2 md:col-span-4">
                          <p className="text-xs text-slate-500 uppercase">Signalment</p>
                          <p className="text-slate-200 font-medium">{rounding.signalment}</p>
                        </div>
                      )}
                      {info.ownerName && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Owner</p>
                          <p className="text-slate-200">{info.ownerName}</p>
                        </div>
                      )}
                      {info.ownerPhone && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Phone</p>
                          <p className="text-slate-200">{info.ownerPhone}</p>
                        </div>
                      )}
                      {info.weight && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Weight</p>
                          <p className="text-slate-200">{info.weight}</p>
                        </div>
                      )}
                      {patient.added_time && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Added</p>
                          <p className="text-slate-200">{patient.added_time}</p>
                        </div>
                      )}
                    </div>

                    {/* Rounding Data */}
                    {rounding.problems && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 uppercase mb-1">Problems</p>
                        <p className="text-orange-400 font-medium">🏥 {rounding.problems}</p>
                      </div>
                    )}
                    {rounding.diagnosticFindings && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 uppercase mb-1">Diagnostics</p>
                        <p className="text-slate-300 text-sm">{rounding.diagnosticFindings}</p>
                      </div>
                    )}
                    {rounding.therapeutics && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 uppercase mb-1">Medications</p>
                        <p className="text-slate-300 text-sm whitespace-pre-line">{rounding.therapeutics}</p>
                      </div>
                    )}
                    {rounding.plan && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 uppercase mb-1">Plan</p>
                        <p className="text-slate-300 text-sm">{rounding.plan}</p>
                      </div>
                    )}

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

                    {/* Show Tasks Button */}
                    <button
                      onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                      className="text-cyan-400 font-bold hover:text-cyan-300 transition"
                    >
                      {isExpanded ? '🔼 Hide Tasks' : '🔽 Show Tasks'}
                    </button>
                  </div>

                  {/* Tasks */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-6 bg-slate-900/30">
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                        <ListTodo size={18} className="text-cyan-400" />
                        Tasks ({completedTasks}/{totalTasks})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {tasks.map((task: any) => {
                          const category = getTaskCategory(task.name);
                          const icon = getTaskIcon(category);
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition group hover:bg-slate-700/30"
                            >
                              <button
                                onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                className="flex-shrink-0"
                              >
                                {task.completed ? (
                                  <CheckCircle2 className="text-green-400" size={22} />
                                ) : (
                                  <Circle className="text-slate-600 group-hover:text-cyan-400" size={22} />
                                )}
                              </button>
                              <span className="text-lg">{icon}</span>
                              <span
                                className={`flex-1 cursor-pointer ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}
                                onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                              >
                                {task.name}
                              </span>
                              <button
                                onClick={() => handleDeleteTask(patient.id, task.id)}
                                className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
