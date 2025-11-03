'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Trash2, Clock, X, ChevronDown, ChevronUp, ChevronRight, Search, HelpCircle, GripVertical, Table, FileText, Sparkles, Calendar, Sun, Moon, Copy, BrainCircuit, BookOpen, GraduationCap, Download } from 'lucide-react';
import Link from 'next/link';
import { useUser, useAuth, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { signOutUser, initiateEmailSignUp, initiateEmailSignIn } from '@/firebase/auth';
import { collection, doc, query } from 'firebase/firestore';
import { parseSignalment } from '@/lib/parseSignalment';
import { analyzeBloodWorkLocal } from '@/lib/bloodwork';
import { parseRounding } from '@/ai/flows/parse-rounding-flow';
import type { RoundingParseOutput } from '@/ai/flows/parse-rounding-flow';
import type { AIHealthStatus } from '@/ai/genkit';
import { checkAIHealth } from '@/ai/genkit';
import { getDischargeMedsByWeight } from '@/lib/discharge-meds';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';


/* -----------------------------------------------------------
   Helpers: safe guards and formatting
----------------------------------------------------------- */

const safeStr = (v?: any) => (v ?? '') as string;
const sanitizeCell = (v?: string) =>
  (v ?? '').replace(/\r?\n/g, ' · ').replace(/\t/g, ' ');

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'New Admit': 'bg-yellow-200 text-yellow-900 border-yellow-400',
    'In Hospital': 'bg-blue-200 text-blue-900 border-blue-400',
    'Going home': 'bg-green-200 text-green-900 border-green-400',
    'Pre-procedure': 'bg-cyan-200 text-cyan-900 border-cyan-400',
    'In Procedure': 'bg-purple-200 text-purple-900 border-purple-400',
    'Recovery': 'bg-orange-200 text-orange-900 border-orange-400',
    'Monitoring': 'bg-indigo-200 text-indigo-900 border-indigo-400',
    'Ready for Discharge': 'bg-lime-200 text-lime-900 border-lime-400',
    'Discharged': 'bg-gray-200 text-gray-900 border-gray-400'
  };
  return colors[status] || 'bg-gray-200 text-gray-900 border-gray-400';
};

const getPriorityColor = (patient: any) => {
  if (patient.status === 'In Procedure') return 'border-l-4 border-orange-500';
  if (patient.status === 'Pre-procedure') return 'border-l-4 border-yellow-500';
  if (patient.status === 'Ready for Discharge') return 'border-l-4 border-green-500';
  return 'border-l-4 border-gray-300';
};

const getPatientTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'MRI': 'bg-purple-200 text-purple-800',
    'Surgery': 'bg-red-200 text-red-800',
    'Admit': 'bg-blue-200 text-blue-800',
    'Other': 'bg-green-200 text-green-800'
  };
  return colors[type] || 'bg-gray-200 text-gray-800';
};

const getTaskBackgroundColor = (taskName: string, isCompleted: boolean, morningTasks: string[], eveningTasks: string[]) => {
  if (isCompleted) {
    return 'bg-green-100/70 border-green-300';
  }
  const isMorning = morningTasks.includes(taskName);
  const isEvening = eveningTasks.includes(taskName);
  if (isMorning) return 'bg-yellow-100/70 border-yellow-300 hover:border-yellow-500';
  if (isEvening) return 'bg-blue-100/70 border-blue-300 hover:border-blue-500';
  return 'bg-purple-100/70 border-purple-200 hover:border-purple-400';
};

const roundKgToInt = (kg: number) => Math.round(kg);
const kgToLbs1 = (kg: number) => kg * 2.20462;

function parseBloodworkAbnormals(text: string, species: string = 'canine'): string[] {
  const result = analyzeBloodWorkLocal({ bloodWorkText: text, species });
  return result.abnormalValues;
}

// Function to convert 'hh:mm AM/PM' to minutes from midnight
const timeToMinutes = (timeStr: string = '') => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(' ');
  if (!time || !modifier) return 0;
  let [hours, minutes] = time.split(':').map(Number);
  if (hours === 12) {
    hours = modifier.toUpperCase() === 'AM' ? 0 : 12;
  } else if (modifier.toUpperCase() === 'PM') {
    hours += 12;
  }
  return hours * 60 + (minutes || 0);
};

/* -----------------------------------------------------------
   Kitty Fireworks Component
----------------------------------------------------------- */
interface KittyFireworksProps {
  show: boolean;
  onComplete: () => void;
}

function KittyFireworks({ show, onComplete }: KittyFireworksProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="relative">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl animate-ping"
            style={{
              animation: `ping 1s cubic-bezier(0, 0, 0.2, 1) 1`,
              transform: `rotate(${i * 45}deg) translate(${80 + Math.random() * 40}px)`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            🐾
          </div>
        ))}
        <div className="text-6xl animate-bounce">🐈</div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
   Sparkly Progress Bar Component
----------------------------------------------------------- */
interface SparklyProgressBarProps {
  completed: number;
  total: number;
}

function SparklyProgressBar({ completed, total }: SparklyProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-1 flex items-center gap-3">
        <Sparkles size={14} className="text-fuchsia-300 flex-shrink-0" />
        <div className="flex-1 bg-black/30 rounded-full h-3 overflow-hidden backdrop-blur-sm border border-fuchsia-400">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-400 via-purple-400 to-fuchsia-400 transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/40 animate-pulse"></div>
          </div>
        </div>
        <span className="text-white font-bold text-xs flex-shrink-0 min-w-[70px] text-right">
          {completed}/{total} ({percentage}%)
        </span>
        <span className="text-xl flex-shrink-0">🐾</span>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
   Progress Ring (compact cards)
----------------------------------------------------------- */
const ProgressRing = ({ percentage, size = 60 }: { percentage: number; size?: number }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const pct = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90 text-purple-600">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        className="text-gray-200"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        className="text-purple-600"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        fill="none"
      />
      <text
        x="50%"
        y="50%"
        className="transform rotate-90 origin-center text-[10px] font-semibold fill-gray-700"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

/* -----------------------------------------------------------
   Sortable Patient Wrapper Component
----------------------------------------------------------- */
interface SortablePatientProps {
  id: string;
  children: React.ReactNode;
}

function SortablePatient({ id, children }: SortablePatientProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Drag to reorder"
      >
        <GripVertical size={18} className="text-gray-400 hover:text-gray-600" />
      </div>
      {children}
    </div>
  );
}

/* -----------------------------------------------------------
   Keyboard Help Modal
----------------------------------------------------------- */
interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Cmd/Ctrl + N', description: 'Focus patient name input' },
    { key: 'Cmd/Ctrl + K', description: 'Focus search box' },
    { key: 'Cmd/Ctrl + E', description: 'Expand/collapse all patients' },
    { key: 'Cmd/Ctrl + M', description: 'Add morning tasks to all' },
    { key: 'Cmd/Ctrl + T', description: 'Toggle table/TSV view' },
    { key: '? or Cmd/Ctrl + /', description: 'Show this help' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HelpCircle className="text-purple-600" />
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <span className="text-xs text-gray-600">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t text-center text-xs text-gray-500">
          Made with 💜 for veterinary professionals
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------
   Task Table Component
----------------------------------------------------------- */

interface TaskTableProps {
  title: string;
  icon: React.ReactNode;
  patients: any[];
  taskNames: string[];
  currentDate: string;
  onToggleTask: (patientId: string, taskId: number) => void;
  onPatientClick: (patientId: string) => void;
  onRemoveTask: (patientId: string, taskId: number) => void;
}

const TaskTable = ({ title, icon, patients, taskNames, currentDate, onToggleTask, onPatientClick, onRemoveTask }: TaskTableProps) => {
  if (patients.length === 0) return null;
  // Don't render the table if there are no tasks
  if (taskNames.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border">
      <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">{icon}{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">Patient</th>
              {taskNames.map(taskName => (
                <th key={taskName} className="p-2 border text-center font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: '80px' }}>
                  {taskName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patients.map((patient: any) => {
              const patientTasks = (patient.tasks || []).filter((t: any) => !t.date || t.date === currentDate);
              
              return (
                <tr key={patient.id} className="hover:bg-purple-50/50">
                  <td className="p-2 border font-semibold sticky left-0 bg-white group-hover:bg-purple-50/50 z-10">
                    <button onClick={() => onPatientClick(patient.id)} className="text-purple-600 hover:underline text-left w-full">
                      {patient.name}
                    </button>
                  </td>
                  {taskNames.map(taskName => {
                    const task = patientTasks.find((t: any) => t.name === taskName);
                    return (
                      <td key={taskName} className="p-1 border text-center">
                        {task ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => onToggleTask(patient.id, task.id)}
                              className="w-4 h-4 accent-purple-600 cursor-pointer"
                            />
                            <button
                              onClick={() => onRemoveTask(patient.id, task.id)}
                              className="text-gray-400 hover:text-red-500"
                              title="Remove task"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const useDebouncedValue = (
  initialValue: string,
  onCommit: (value: string) => void,
  debounceTimeout = 500
) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const isFirstRender = React.useRef(true);

  // Update local state if the initial (prop) value changes from outside,
  // but only after the first render.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalValue(initialValue);
  }, [initialValue]);

  // Debounce effect to call onCommit
  useEffect(() => {
    const handler = setTimeout(() => {
      // Only commit if the value has actually changed
      if (localValue !== initialValue) {
        onCommit(localValue);
      }
    }, debounceTimeout);

    // Cleanup function to cancel the timeout if the value changes again
    return () => {
      clearTimeout(handler);
    };
  }, [localValue, initialValue, onCommit, debounceTimeout]);

  return [localValue, setLocalValue] as const;
};

const DebouncedTextarea = ({
  initialValue,
  onCommit,
  className,
  ...props
}: {
  initialValue: string;
  onCommit: (value: string) => void;
} & Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'>) => {
  const [value, setValue] = useDebouncedValue(initialValue, onCommit);

  return (
    <Textarea
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className={className}
    />
  );
};


/* -----------------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------------- */

export default function VetPatientTracker() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();


  // Firestore queries scoped to user
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/patients`));
  }, [firestore, user]);
  const patientsRes = useCollection(patientsQuery);
  const patients = patientsRes?.data ?? [];
  const isLoadingPatients = patientsRes?.isLoading ?? false;

  const generalTasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/generalTasks`));
  }, [firestore, user]);
  const generalTasksRes = useCollection(generalTasksQuery);
  const generalTasks = generalTasksRes?.data ?? [];
  const isLoadingGeneralTasks = generalTasksRes?.isLoading ?? false;

  const commonProblemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonProblems`));
  }, [firestore, user]);
  const commonProblemsRes = useCollection(commonProblemsQuery);
  const commonProblems = commonProblemsRes?.data ?? [];
  const isLoadingCommonProblems = commonProblemsRes?.isLoading ?? false;

  const commonCommentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonComments`));
  }, [firestore, user]);
  const commonCommentsRes = useCollection(commonCommentsQuery);
  const commonComments = commonCommentsRes?.data ?? [];
  const isLoadingCommonComments = commonCommentsRes?.isLoading ?? false;

  const commonMedicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonMedications`));
  }, [firestore, user]);
  const commonMedicationsRes = useCollection(commonMedicationsQuery);
  const commonMedications = commonMedicationsRes?.data ?? [];
  const isLoadingCommonMedications = commonMedicationsRes?.isLoading ?? false;

  // UI State
  const [newPatientBlurb, setNewPatientBlurb] = useState('');
  const [newPatientType, setNewPatientType] = useState('MRI');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});
  const [newGeneralTask, setNewGeneralTask] = useState({ name: '', category: 'Morning', priority: 'Medium' });
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({});
  const [useAIForRounding, setUseAIForRounding] = useState(true);
  const [aiParsingLoading, setAiParsingLoading] = useState(false);
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);

  // Add these three new ones:
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // New feature states
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [roundingViewMode, setRoundingViewMode] = useState<'tsv' | 'table'>('table');
  const [patientOrder, setPatientOrder] = useState<string[]>([]);
  const [showRoundingSheet, setShowRoundingSheet] = useState(true);
  const [showMedCalculator, setShowMedCalculator] = useState(true);
  const [medCalcWeight, setMedCalcWeight] = useState('');
  const [showFireworks, setShowFireworks] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'rounding' | 'tasks' | 'time'>('name');
  const [reversePasteContent, setReversePasteContent] = useState('');
  const [showGeneralTasks, setShowGeneralTasks] = useState(true);
  const [showOtherTasks, setShowOtherTasks] = useState(true);
  const [mriExported, setMriExported] = useState(false);
  const [showMriExport, setShowMriExport] = useState(true);


  // Date-based task management
  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  const [currentDate, setCurrentDate] = useState<string>(getTodayDate());

  // Auto-rollover incomplete tasks to current date when viewing today
  useEffect(() => {
    const today = getTodayDate();
    if (currentDate === today && patients.length > 0) {
      patients.forEach((patient: any) => {
        const tasks = patient.tasks || [];
        const needsRollover = tasks.some((t: any) => t.date && t.date < today && !t.completed);

        if (needsRollover) {
          const updatedTasks = tasks.map((t: any) => {
            // Roll over incomplete tasks from previous days to today
            if (t.date && t.date < today && !t.completed) {
              return { ...t, date: today };
            }
            return t;
          });
          updatePatientField(patient.id, 'tasks', updatedTasks);
        }
      });
    }
  }, [currentDate, patients]);

  // Clear completed general tasks from previous days
  useEffect(() => {
    if (generalTasks.length > 0 && firestore && user) {
      const today = getTodayDate();
      generalTasks.forEach((task: any) => {
        if (task.completed && task.completedDate && task.completedDate < today) {
          const ref = doc(firestore, `users/${user.uid}/generalTasks`, task.id);
          deleteDocumentNonBlocking(ref);
        }
      });
    }
  }, [currentDate, generalTasks, firestore, user]);

  const toggleSection = (patientId: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [patientId]: { ...prev[patientId], [section]: !prev[patientId]?.[section] }
    }));
  };

  const toggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    (patients || []).forEach(p => {
      next[p.id] = expand;
    });
    setExpandedPatients(next);
  };

  // Initialize patient order when patients change
  useEffect(() => {
    if (patients.length > 0) {
      setPatientOrder(prev => {
        const currentIds = patients.map(p => p.id);
        // Keep existing order for patients that still exist, add new ones at the end
        const existingOrdered = prev.filter(id => currentIds.includes(id));
        const newPatients = currentIds.filter(id => !prev.includes(id));
        return [...existingOrdered, ...newPatients];
      });
    }
  }, [patients]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPatientOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Filter patients based on search query and status
  const filteredPatients = useMemo(() => {
    let filtered = patients;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.type?.toLowerCase().includes(query) ||
        p.status?.toLowerCase().includes(query) ||
        p.patientInfo?.patientId?.toLowerCase().includes(query) ||
        p.patientInfo?.breed?.toLowerCase().includes(query) ||
        p.patientInfo?.ownerName?.toLowerCase().includes(query) ||
        p.roundingData?.signalment?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    return filtered;
  }, [patients, searchQuery, filterStatus]);

  // Sort filtered patients
  const sortedPatients = useMemo(() => {
    let sorted = [...filteredPatients];

    switch (sortBy) {
      case 'status':
        sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
        break;
      case 'rounding':
        sorted.sort((a, b) => {
          const aComp = getRoundingCompletion(a);
          const bComp = getRoundingCompletion(b);
          return bComp.percentage - aComp.percentage; // Most complete first
        });
        break;
      case 'tasks':
        sorted.sort((a, b) => {
          const aComp = getCompletionStatus(a);
          const bComp = getCompletionStatus(b);
          return bComp.percentage - aComp.percentage; // Most complete first
        });
        break;
      case 'time':
        sorted.sort((a, b) => timeToMinutes(a.addedTime) - timeToMinutes(b.addedTime));
        break;
      case 'name':
      default:
        // Use custom order if no explicit sort or sorting by name
        if (patientOrder.length > 0) {
          sorted.sort((a, b) => {
            const indexA = patientOrder.indexOf(a.id);
            const indexB = patientOrder.indexOf(b.id);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        } else {
          // Fallback to alphabetical if custom order not set
          sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        break;
    }

    // If sorting is by name, apply alphabetical sort on top of any custom ordering
    if (sortBy === 'name') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return sorted;
  }, [filteredPatients, sortBy, patientOrder]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Help modal (? or Cmd+/)
      if (e.key === '?' || ((e.metaKey || e.ctrlKey) && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }

      if (!(e.metaKey || e.ctrlKey)) return;
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          (document.getElementById('new-patient-blurb-input') as HTMLTextAreaElement | null)?.focus();
          break;
        case 'e':
          e.preventDefault();
          // expand/collapse all
          const anyOpen = Object.values(expandedPatients).some(Boolean);
          toggleAll(!anyOpen);
          break;
        case 'm':
          e.preventDefault();
          addMorningTasksToAll();
          break;
        case 'k':
          e.preventDefault();
          (document.getElementById('search-input') as HTMLInputElement | null)?.focus();
          break;
        case 't':
          e.preventDefault();
          setRoundingViewMode(prev => prev === 'tsv' ? 'table' : 'tsv');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expandedPatients, patients]);

  // Static lists
  const procedureTypes = ['MRI', 'Surgery', 'Medical', 'Other'];

  const commonGeneralTasksTemplates = [
    { name: 'Check Comms', category: 'Morning', priority: 'High' },
    { name: 'Check Emails', category: 'Morning', priority: 'Medium' },
    { name: 'Draw Up Contrast', category: 'Morning', priority: 'High' },
    { name: 'Rounding', category: 'Morning', priority: 'High' },
    { name: 'Read appointments for next day', category: 'Evening', priority: 'Medium' },
  ];

  // Admit task menus (not auto-added)
  const admitTasks: Record<string, string[]> = {
    Surgery: ['Surgery Slip', 'Written on Board', 'Print 4 Large Stickers', 'Print 2 Sheets Small Stickers', 'Print Surgery Sheet'],
    MRI: ['Blood Work', 'Chest X-rays', 'MRI Anesthesia Sheet', 'NPO', 'Black Book', 'Print 5 Stickers', 'Print 1 Sheet Small Stickers'],
    Medical: ['Admission SOAP', 'Treatment Sheet Created', 'Owner Admission Call'],
    Other: ['Admission SOAP', 'Owner Admission Call']
  };

  const morningTasks = [
    'Owner Called',
    'Daily SOAP Done',
    'Vet Radar Sheet Checked',
    'MRI Findings Inputted (if needed)',
    'Discharge Instructions',
  ];

  const eveningTasks = [
    'Vet Radar Done',
    'Rounding Sheet Done',
    'Sticker on Daily Sheet',
    // No phone call in evening (per your spec)
  ];

  const statusOptions = [
    'New Admit',
    'In Hospital',
    'Going home',
    'Pre-procedure',
    'In Procedure',
    'Recovery',
    'Monitoring',
    'Ready for Discharge',
    'Discharged',
  ];

  const otherTasks = [
    'Seizure Watch',
    'Add Cerenia',
    'Add Fluids',
  ];

  /* --------------------- Firestore helpers --------------------- */

  const getPatientRef = useCallback((patientId: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/patients`, patientId);
  }, [firestore, user]);

  const addGeneralTask = (task: { name: string, category: string, priority: string }) => {
    if (!task.name.trim() || !firestore || !user) return;
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/generalTasks`), { ...task, completed: false, completedDate: null });
    setNewGeneralTask({ name: '', category: 'Morning', priority: 'Medium' });
  };
  const toggleGeneralTask = (taskId: string, completed: boolean) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/generalTasks`, taskId);
    const today = getTodayDate();
    updateDocumentNonBlocking(ref, { 
      completed: !completed,
      completedDate: !completed ? today : null 
    });
  };
  const removeGeneralTask = (taskId: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/generalTasks`, taskId);
    deleteDocumentNonBlocking(ref);
  };

  const addCommonProblem = (name: string) => {
    if (!name.trim() || !firestore || !user) return;
    if (!commonProblems.some(p => p.name === name.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonProblems`), { name: name.trim() });
    }
  };
  const addCommonComment = (name: string) => {
    if (!name.trim() || !firestore || !user) return;
    if (!commonComments.some(c => c.name === name.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonComments`), { name: name.trim() });
    }
  };
  const addCommonMedication = (name: string) => {
    if (!name.trim() || !firestore || !user) return;
    if (!commonMedications.some(m => m.name === name.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonMedications`), { name: name.trim() });
    }
  };
  const deleteCommonItem = (col: 'commonProblems' | 'commonComments' | 'commonMedications', id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/${col}`, id);
    deleteDocumentNonBlocking(ref);
  };

  const addPatientFromBlurb = useCallback(async () => {
    if (!newPatientBlurb.trim() || !firestore || !user) return;
  
    setIsAddingPatient(true);
    try {
      const { data: parsedData } = parseSignalment(newPatientBlurb);
      
      const patientFirstName = (parsedData.patientName || 'Unnamed').replace(/^Patient\s/i, '');
      let ownerLastName = '';
  
      if (parsedData.ownerName) {
        const ownerNameParts = parsedData.ownerName.split(' ').filter(part => !part.match(/^(Mr|Mrs|Ms|Dr)\.?$/i));
        if (ownerNameParts.length > 1) {
          ownerLastName = ownerNameParts[ownerNameParts.length - 1];
        }
      }
      
      const fullName = ownerLastName ? `${patientFirstName} ${ownerLastName}` : patientFirstName;

      const tasksToAdd = [];
      if (newPatientType === 'MRI') {
        const mriTasks = admitTasks['MRI'] || [];
        mriTasks.forEach(taskName => {
          tasksToAdd.push({ name: taskName, completed: false, id: Date.now() + Math.random(), date: getTodayDate() });
        });
      }
      
      const signalmentParts: string[] = [];
      if (parsedData.age) signalmentParts.push(parsedData.age);
      if (parsedData.sex) signalmentParts.push(parsedData.sex);
      if (parsedData.breed) signalmentParts.push(parsedData.breed);
      const signalment = signalmentParts.join(' ');
  
      // Create the full patient object
      const patientData: any = {
        name: fullName,
        type: newPatientType,
        status: 'New Admit',
        tasks: tasksToAdd,
        customTask: '',
        bwInput: '',
        xrayStatus: 'NSF',
        xrayOther: '',
        detailsInput: '',
        patientInfo: {
          patientId: parsedData.patientId || '',
          clientId: parsedData.clientId || '',
          ownerName: parsedData.ownerName || '',
          ownerPhone: parsedData.ownerPhone || '',
          species: parsedData.species || '',
          breed: parsedData.breed || '',
          color: parsedData.color || '',
          sex: parsedData.sex || '',
          weight: parsedData.weight || '',
          dob: parsedData.dob || '',
          age: parsedData.age || '',
        },
        roundingData: {
          signalment: signalment,
          location: '',
          icuCriteria: '',
          codeStatus: 'Yellow',
          problems: parsedData.problem || '',
          diagnosticFindings: parsedData.bloodwork ? `CBC/CHEM: ${parsedData.bloodwork}`: '',
          therapeutics: parsedData.medications?.join('\n') || '',
          plan: parsedData.lastPlan || '',
          additionalComments: '',
        },
        addedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
  
      await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/patients`), patientData);
      
      toast({
        title: 'Patient Added!',
        description: `${patientData.name} has been created from the blurb.`,
      });
  
      setNewPatientBlurb('');
    } catch (error: any) {
      console.error("Error adding patient from blurb:", error);
      toast({
        variant: 'destructive',
        title: 'Adding Patient Failed',
        description: error.message || 'Could not create patient from the provided text.',
      });
    } finally {
      setIsAddingPatient(false);
    }
  }, [newPatientBlurb, newPatientType, firestore, user, toast, admitTasks]);

  const removePatient = useCallback((id: string) => {
    const ref = getPatientRef(id);
    if (!ref) return;
    deleteDocumentNonBlocking(ref);
    setExpandedPatients(prev => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  }, [getPatientRef]);

  const toggleExpanded = (patientId: string) =>
    setExpandedPatients(prev => ({ ...prev, [patientId]: !prev[patientId] }));

  const updatePatientField = useCallback((patientId: string, field: string, value: any) => {
    const ref = getPatientRef(patientId);
    if (!ref) return;
    updateDocumentNonBlocking(ref, { [field]: value });
  }, [getPatientRef]);
  
  const updatePatientData = useCallback((patientId: string, data: any) => {
    const ref = getPatientRef(patientId);
    if (!ref) return;
    updateDocumentNonBlocking(ref, data);
  }, [getPatientRef]);

  const updateStatus = useCallback((patientId: string, status: string) =>
    updatePatientField(patientId, 'status', status), [updatePatientField]);

  const updatePatientType = useCallback((patientId: string, newType: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const updateData: any = { type: newType };
    if (newType === 'MRI' && !patient.mriData) {
      updateData.mriData = {
        weight: '',
        weightUnit: 'kg',
        scanType: 'LS',
        calculated: false,
        copyableString: ''
      };
    }
    updatePatientData(patientId, updateData);
  }, [patients, updatePatientData]);

  const updateRoundingData = useCallback((patientId: string, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newData = { ...(patient.roundingData || {}), [field]: value };
    updatePatientField(patientId, 'roundingData', newData);
  }, [patients, updatePatientField]);

  const addTaskToPatient = useCallback((patientId: string, taskName: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    if ((patient.tasks || []).some((t: any) => t.name === taskName && t.date === currentDate)) return;
    const newTasks = [...(patient.tasks || []), { name: taskName, completed: false, id: Date.now() + Math.random(), date: currentDate }];
    updatePatientField(patientId, 'tasks', newTasks);
  }, [patients, currentDate, updatePatientField]);

  const addMorningTasks = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = [...(patient.tasks || [])];
    morningTasks.forEach(t => {
      if (!newTasks.some((x: any) => x.name === t && x.date === currentDate)) newTasks.push({ name: t, completed: false, id: Date.now() + Math.random(), date: currentDate });
    });
    updatePatientField(patientId, 'tasks', newTasks);
  }, [patients, currentDate, updatePatientField]);

  const addEveningTasks = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = [...(patient.tasks || [])];
    eveningTasks.forEach(t => {
      if (!newTasks.some((x: any) => x.name === t && x.date === currentDate)) newTasks.push({ name: t, completed: false, id: Date.now() + Math.random(), date: currentDate });
    });
    updatePatientField(patientId, 'tasks', newTasks);
  }, [patients, currentDate, updatePatientField]);
  
  const addMorningTasksToAll = useCallback(() => (patients || []).forEach(p => addMorningTasks(p.id)), [patients, addMorningTasks]);
  const addEveningTasksToAll = useCallback(() => (patients || []).forEach(p => addEveningTasks(p.id)), [patients, addEveningTasks]);

  const resetDailyTasks = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const allDaily = [...morningTasks, ...eveningTasks];
    const filtered = (patient.tasks || []).filter((t: any) => !allDaily.includes(t.name));
    updatePatientField(patientId, 'tasks', filtered);
  }, [patients, updatePatientField]);

  const removeTask = useCallback((patientId: string, taskId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = (patient.tasks || []).filter((t: any) => t.id !== taskId);
    updatePatientField(patientId, 'tasks', newTasks);
  }, [patients, updatePatientField]);

  const toggleTask = useCallback((patientId: string, taskId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const taskToToggle = (patient.tasks || []).find((t: any) => t.id === taskId);
    const isBeingCompleted = taskToToggle && !taskToToggle.completed;

    const newTasks = (patient.tasks || []).map((t: any) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    // Sort: incomplete first
    newTasks.sort((a: any, b: any) => Number(a.completed) - Number(b.completed));
    updatePatientField(patientId, 'tasks', newTasks);

    // Trigger fireworks when task is completed
    if (isBeingCompleted) {
      setShowFireworks(true);
    }
  }, [patients, updatePatientField]);

  const updatePatientInfo = useCallback((patientId: string, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const info = { ...(patient.patientInfo || {}), [field]: value };
    updatePatientField(patientId, 'patientInfo', info);
  }, [patients, updatePatientField]);

  const updateMRIData = useCallback((patientId: string, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const data = { ...(patient.mriData || {}), [field]: value };
    updatePatientField(patientId, 'mriData', data);
}, [patients, updatePatientField]);

  const calculateMRIDrugs = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.mriData || !patient.mriData.weight) return;

    let weightKg = parseFloat(patient.mriData.weight);
    if (patient.mriData.weightUnit === 'lbs') weightKg = weightKg / 2.20462;

    const kgRounded = roundKgToInt(weightKg);

    const name = patient.name || '';
    const id = safeStr(patient.patientInfo?.patientId);
    const scanType = patient.mriData.scanType || '';
    const copyableString = `${name}\t${id}\t${kgRounded}\t\t${scanType}`;

    const isBrain = patient.mriData.scanType === 'Brain';
    const preMedDrug = isBrain ? 'Butorphanol' : 'Methadone';
    const preMedDose = weightKg * 0.2;
    const preMedVolume = preMedDose / 10;
    const valiumDose = weightKg * 0.25;
    const valiumVolume = valiumDose / 5;
    const contrastVolume = weightKg * 0.22;

    const newMriData = {
      ...patient.mriData,
      weightKg: kgRounded.toString(), // display rounded
      preMedDrug,
      preMedDose: preMedDose.toFixed(2),
      preMedVolume: preMedVolume.toFixed(2),
      valiumDose: valiumDose.toFixed(2),
      valiumVolume: valiumVolume.toFixed(2),
      contrastVolume: contrastVolume.toFixed(1),
      calculated: true,
      copyableString
    };
    updatePatientField(patientId, 'mriData', newMriData);
  }, [patients, updatePatientField]);

  // Parse patient details (no AI) and fill info + signalment
  const parsePatientDetails = useCallback((patientId: string, detailsText: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !detailsText.trim()) {
      alert('Please paste patient details first');
      return;
    }
    try {
      const { data } = parseSignalment(detailsText);

      const newInfo: any = { ...(patient.patientInfo || {}), ...data };
      
      const newRounding = { ...(patient.roundingData || {}) };
      const parts: string[] = [];
      if (data.age) parts.push(data.age);
      if (data.sex) parts.push(data.sex);
      if (data.breed) parts.push(data.breed);
      newRounding.signalment = parts.join(' ');
      
      // Merge patientInfo and roundingData
      const patientInfoAndRoundingData = { ...newInfo, ...newRounding };
      
      // Add medications to therapeutics if found
      if (data.medications && data.medications.length > 0) {
        const currentTherapeutics = patientInfoAndRoundingData.therapeutics || '';
        const newMeds = data.medications.join('\n');
        patientInfoAndRoundingData.therapeutics = currentTherapeutics ? currentTherapeutics + '\n' + newMeds : newMeds;
      }

      // Add bloodwork to diagnosticFindings if found
      if (data.bloodwork) {
        const currentDx = patientInfoAndRoundingData.diagnosticFindings || '';
        const bwLine = 'CBC/CHEM: ' + data.bloodwork;
        patientInfoAndRoundingData.diagnosticFindings = currentDx ? currentDx + '\n' + bwLine : bwLine;
      }

      let updates: any = {
        patientInfo: newInfo,
        roundingData: newRounding,
        detailsInput: '',
      };

      if (patient.type === 'MRI' && data.weight) {
        const weightMatch = data.weight.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)/i);
        if (weightMatch) {
          const newMriData = { ...(patient.mriData || {}) };
          newMriData.weight = weightMatch[1];
          newMriData.weightUnit = weightMatch[2].toLowerCase();
          updates.mriData = newMriData;
        }
      }

      updatePatientData(patientId, updates);
    } catch (err) {
      console.error(err);
      alert('Parsing of patient details failed. Please check the log or enter the information manually.');
    }
  }, [patients, updatePatientData]);

  // Parse patient details using AI
  const parsePatientDetailsWithAI = useCallback(async (patientId: string, detailsText: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !detailsText.trim()) {
      alert('Please paste patient details first');
      return;
    }

    setAiParsingLoading(true);
    try {
      const parsed: RoundingParseOutput = await parseRounding(detailsText);

      // Merge the AI-parsed data into patient info and rounding data
      const newInfo: any = { ...(patient.patientInfo || {}), ...(parsed.patientInfo || {}) };
      const newRounding: any = { ...(patient.roundingData || {}), ...(parsed.roundingData || {}) };
      
      let updates: any = {
        patientInfo: newInfo,
        roundingData: newRounding,
        detailsInput: '',
      };

      // If MRI patient and weight was parsed, update MRI data
      if (patient.type === 'MRI' && newInfo.weight) {
        const weightMatch = newInfo.weight.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)/i);
        if (weightMatch) {
          const newMriData = { ...(patient.mriData || {}) };
          newMriData.weight = weightMatch[1];
          newMriData.weightUnit = weightMatch[2].toLowerCase();
          updates.mriData = newMriData;
        }
      }

      updatePatientData(patientId, updates);
    } catch (err: any) {
      console.error('AI parsing error:', err);
      alert(`AI parsing failed: ${err.message}. Using basic parser instead.`);
      // Fallback to non-AI parser
      parsePatientDetails(patientId, detailsText);
    } finally {
      setAiParsingLoading(false);
    }
  }, [patients, updatePatientData, parsePatientDetails]);

  // Parse bloodwork (LOCAL, no AI)
  const parseBloodWork = useCallback((patientId: string, bwText: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !bwText.trim()) {
      alert('Please paste blood work results first');
      return;
    }
    try {
      // Use patient's species from signalment or default to canine
      const species = (patient.patientInfo?.species || patient.roundingData?.signalment || 'canine').toLowerCase();
      const abnormalValues = parseBloodworkAbnormals(bwText, species);
      const currentDx = safeStr(patient.roundingData?.diagnosticFindings);
      const bwLine = abnormalValues.length > 0 ? 'CBC/CHEM: ' + abnormalValues.join(', ') : 'CBC/CHEM: NAD';
      const newDx = currentDx ? currentDx + '\n' + bwLine : bwLine;

      updateRoundingData(patient.id, 'diagnosticFindings', newDx);
      updatePatientField(patient.id, 'bwInput', '');
    } catch (e) {
      console.error(e);
      alert('Bloodwork parsing failed. Please check the results manually.');
    }
  }, [patients, updateRoundingData, updatePatientField]);

  // Helper to get tasks for current date (or all if task has no date - for backwards compatibility)
  const getTasksForDate = (tasks: any[], date: string) => {
    return (tasks || []).filter((t: any) => !t.date || t.date === date);
  };

  // Completion (only counts tasks for current date)
  const getCompletionStatus = (patient: any) => {
    const todayTasks = getTasksForDate(patient?.tasks || [], currentDate);
    const total = todayTasks.length;
    const completed = todayTasks.filter((t: any) => t.completed).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  // Overall task completion across all patients (only counts tasks for current date)
  const overallTaskStats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    patients.forEach((p: any) => {
      const todayTasks = getTasksForDate(p.tasks || [], currentDate);
      totalTasks += todayTasks.length;
      completedTasks += todayTasks.filter((t: any) => t.completed).length;
    });
    return { completed: completedTasks, total: totalTasks };
  }, [patients, currentDate]);

  // Rounding sheet completion tracking
  const getRoundingCompletion = (patient: any) => {
    const required = ['signalment', 'location', 'codeStatus', 'problems', 'diagnosticFindings', 'therapeutics'];
    const r = patient.roundingData || {};
    const filled = required.filter(field => r[field] && r[field].trim()).length;
    return {
      filled,
      total: required.length,
      percentage: Math.round((filled / required.length) * 100),
      missing: required.filter(field => !r[field] || !r[field].trim()),
      isComplete: filled === required.length
    };
  };

  // Helper to get class for required rounding fields
  const getRequiredFieldClass = (patient: any, fieldName: string, baseClass: string = "px-2 py-1 text-xs border rounded-lg") => {
    const required = ['signalment', 'location', 'problems', 'diagnosticFindings', 'therapeutics'];
    if (!required.includes(fieldName)) return baseClass;

    const value = patient.roundingData?.[fieldName];
    const isEmpty = !value || !value.trim();

    if (isEmpty) {
      return `${baseClass} border-2 border-orange-300 bg-orange-50`;
    }
    return `${baseClass} border-green-300`;
  };

  // Tabs
  const getTabsForPatient = (p: any) => {
    const base = ['Tasks', 'Patient Data'];
    if (p.type === 'MRI') base.splice(1, 0, 'MRI Calculator');
    return base;
  };
  
  // Get breed emoji
  const getBreedEmoji = (patient: any): string => {
      const breed = (patient.patientInfo?.breed || patient.roundingData?.signalment || '').toLowerCase();
      const species = (patient.patientInfo?.species || '').toLowerCase();
  
      // Cats
      if (species.includes('feline') || species.includes('cat') || breed.includes('cat') || breed.includes('dsh') || breed.includes('dmh') || breed.includes('dlh')) {
          return '🐈';
      }
  
      // Dogs by breed
      if (breed.includes('husky') || breed.includes('malamute')) return '🐺';
      if (breed.includes('poodle') || breed.includes('doodle')) return '🐩';
      if (breed.includes('bulldog') || breed.includes('pug') || breed.includes('boston')) return '🐶';
      if (breed.includes('shepherd') || breed.includes('collie')) return '🦮';
      if (breed.includes('terrier') || breed.includes('schnauzer')) return '🐕';
      if (breed.includes('retriever') || breed.includes('lab')) return '🦴';
      if (breed.includes('chihuahua') || breed.includes('yorkie') || breed.includes('pomeranian')) return '🐕';
      if (breed.includes('beagle') || breed.includes('hound')) return '🐕‍🦺';
      if (breed.includes('corgi')) return '🦊';
      if (breed.includes('dalmatian')) return '🐕';
  
      // General species
      if (species.includes('canine') || species.includes('dog')) return '🐕';
      if (species.includes('equine') || species.includes('horse')) return '🐴';
      if (species.includes('rabbit') || breed.includes('lagomorph')) return '🐰';
      if (species.includes('ferret')) return '🦦';
      if (species.includes('bird') || breed.includes('avian')) return '🦜';
      if (species.includes('reptile') || breed.includes('lizard') || breed.includes('snake')) return '🦎';
      if (species.includes('hamster') || breed.includes('hamster')) return '🐹';
      if (species.includes('guinea') || breed.includes('guinea')) return '🐹';
  
      // Default
      return '🐾'; 
  };
  
  /* --------------------- TSV (no headers) --------------------- */
  const makeRoundingRow = (p: any): string[] => {
    const r = p.roundingData || {};
    return [
      p.name || '',                     // Name
      r.signalment || '',               // Signalment
      r.location || '',                 // Location
      r.icuCriteria || '',              // ICU Criteria
      r.codeStatus || 'Yellow',         // Code Status
      r.problems || '',                 // Problems
      r.diagnosticFindings || '',       // Diagnostics
      r.therapeutics || '',             // Therapeutics
      r.replaceIVC || '',               // Replace IVC
      r.replaceFluids || '',            // Replace Fluids
      r.replaceCRI || '',               // Replace CRI
      r.overnightDiagnostics || '',     // Overnight Diagnostics
      r.overnightConcerns || '',        // Overnight Concerns/Alerts
      r.additionalComments || ''        // Additional Comments
    ];
  };
  const roundingTSV = useMemo(() => {
    const rows = (patients || []).map(p => makeRoundingRow(p).map(sanitizeCell).join('\t'));
    return rows.join('\n');
  }, [patients]);
  
  const handleReversePaste = () => {
    if (!reversePasteContent.trim()) {
      alert('Please paste a tab-separated row into the text area first.');
      return;
    }
    const lines = reversePasteContent.trim().split('\n');
    lines.forEach(line => {
      const values = line.split('\t');
      if (values.length < 2) return; // Need at least name and something else

      const patientName = values[0].trim();
      if (!patientName) return;

      const patient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
      if (!patient) {
        console.warn(`Could not find patient named: ${patientName}`);
        return;
      }

      const roundingKeys = ['signalment', 'location', 'icuCriteria', 'codeStatus', 'problems', 'diagnosticFindings', 'therapeutics', 'replaceIVC', 'replaceFluids', 'replaceCRI', 'overnightDiagnostics', 'overnightConcerns', 'additionalComments'];
      const updatedRoundingData = { ...patient.roundingData };

      values.slice(1).forEach((val, index) => {
        const key = roundingKeys[index];
        if (key) {
          (updatedRoundingData as any)[key] = val.replace(/ · /g, '\n').trim();
        }
      });
      updatePatientField(patient.id, 'roundingData', updatedRoundingData);
    });

    setReversePasteContent(''); // Clear after processing
    alert('Patient data updated from pasted content.');
  };

  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'High': return 'border-red-500 bg-red-50 text-red-800';
      case 'Medium': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'Low': return 'border-purple-500 bg-purple-50 text-purple-800';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const morningGeneralTasks = useMemo(() => (generalTasks || []).filter(t => t.category === 'Morning'), [generalTasks]);
  const eveningGeneralTasks = useMemo(() => (generalTasks || []).filter(t => t.category === 'Evening'), [generalTasks]);

  const handlePatientClick = (patientId: string) => {
    setExpandedPatients(prev => ({ ...prev, [patientId]: true }));
    setTimeout(() => {
      const element = document.getElementById(`patient-${patientId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };
  
  // Create dynamic map of "Other" tasks from all patients
  const otherTasksMap = useMemo(() => {
    const taskMap: Record<string, { patientId: string; taskId: number; completed: boolean }[]> = {};
    const morningAndEvening = new Set([...morningTasks, ...eveningTasks]);
    
    patients.forEach((patient: any) => {
      const patientTasks = getTasksForDate(patient.tasks || [], currentDate);
      patientTasks.forEach((task: any) => {
        if (!morningAndEvening.has(task.name)) {
          if (!taskMap[task.name]) {
            taskMap[task.name] = [];
          }
          taskMap[task.name].push({
            patientId: patient.id,
            taskId: task.id,
            completed: task.completed,
          });
        }
      });
    });
    return taskMap;
  }, [patients, currentDate]);

  const handleMriExport = () => {
    const mriPatients = patients.filter((p: any) => p.type === 'MRI');
    const tsvData = mriPatients
      .map((p: any) => {
        let weightKg = 0;
        if (p.mriData?.weight) {
          const weightNum = parseFloat(p.mriData.weight);
          weightKg =
            p.mriData.weightUnit === 'lbs'
              ? weightNum / 2.20462
              : weightNum;
        }
        const kgRounded = weightKg > 0 ? roundKgToInt(weightKg) : 0;
        const name = p.name || '';
        const id = safeStr(p.patientInfo?.patientId);
        const scanType = p.mriData?.scanType || '';
        return `${name}\t${id}\t${kgRounded}\t${scanType}`;
      })
      .join('\n');
    navigator.clipboard.writeText(tsvData);
    setMriExported(true);
    setTimeout(() => setMriExported(false), 2000);
  };
  

  /* --------------------- UI --------------------- */

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-fuchsia-50 to-slate-100">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🐾</div>
          <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
            Loading your VetCare Hub...
          </p>
          <p className="text-gray-500 mt-2">Preparing the purr-fect experience!</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleAuth = (e: React.FormEvent) => {
      e.preventDefault();
      if (isSignUp) {
        initiateEmailSignUp(auth, email, password);
      } else {
        initiateEmailSignIn(auth, email, password);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-fuchsia-50 to-slate-100">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full border-t-4 border-purple-400">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🐈</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-1">
              VetCare Hub
            </h1>
            <p className="text-gray-600 text-sm">{isSignUp ? 'Create a New Account' : 'Welcome Back!'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-fuchsia-500"
            />
            <button type="submit" className="w-full py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-lg hover:from-purple-600 hover:to-fuchsia-600 font-semibold shadow-md transition">
              {isSignUp ? 'Sign Up 🐾' : 'Sign In 🐾'}
            </button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-xs text-purple-600 hover:text-purple-800">
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-fuchsia-50/50 p-4 pt-12">
      {/* Sparkly Progress Bar */}
      {overallTaskStats.total > 0 && (
        <SparklyProgressBar completed={overallTaskStats.completed} total={overallTaskStats.total} />
      )}

      {/* Kitty Fireworks */}
      <KittyFireworks show={showFireworks} onComplete={() => setShowFireworks(false)} />

      <KeyboardHelpModal isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 mb-4 border-t-2 border-purple-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                VetCare Hub 🐈
              </h1>
              <p className="text-xs text-gray-500">
                Track tasks and prep rounding sheets
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Links */}
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg border">
                <span className="text-xs font-semibold text-gray-600">Links:</span>
                <a
                  href="https://tfalls300101.use2.ezyvet.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-0.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                >
                  EzyVet
                </a>
                <a
                  href="https://app.vetradar.com/patients"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-0.5 bg-fuchsia-600 text-white rounded hover:bg-fuchsia-700 transition"
                >
                  VetRadar
                </a>
              </div>

              <Link
                href="/mri-report-builder"
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:from-indigo-600 hover:to-blue-600 flex items-center gap-1.5 transition shadow-sm text-xs"
              >
                <BrainCircuit size={14} />
                MRI Builder
              </Link>
               <Link
                href="/reference"
                className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 flex items-center gap-1.5 transition shadow-sm text-xs"
              >
                <BookOpen size={14} />
                Reference
              </Link>
              <Link
                href="/residency-logging"
                className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 flex items-center gap-1.5 transition shadow-sm text-xs"
              >
                <GraduationCap size={14} />
                Residency
              </Link>
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition"
                title="Keyboard shortcuts"
              >
                <HelpCircle size={16} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleAll(true)}
                  className="px-2 py-1 rounded-md text-xs border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  Expand All
                </button>
                <button
                  onClick={() => toggleAll(false)}
                  className="px-2 py-1 rounded-md text-xs border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  Collapse All
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">View:</span>
                <button
                  onClick={() => setViewMode('full')}
                  className={`px-2 py-1 rounded-md text-xs border ${viewMode === 'full' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Full
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-2 py-1 rounded-md text-xs border ${viewMode === 'compact' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Compact
                </button>
              </div>

              <button
                onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                  hideCompletedTasks
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-400'
                }`}
              >
                {hideCompletedTasks ? '👁️ Show' : '🙈 Hide'} Completed
              </button>

              {user ? (
                <button onClick={() => signOutUser(auth)} className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-xs">
                  Sign Out
                </button>
              ) : null}
            </div>
          </div>
          {/* Search, Filter, Sort */}
          <div className="mb-3 space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients by name, ID, breed, status... (Cmd+K)"
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter and Sort */}
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-xs font-semibold text-gray-600">Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <span className="text-xs font-semibold text-gray-600 ml-2">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
              >
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="rounding">Rounding Complete</option>
                <option value="tasks">Tasks Complete</option>
                <option value="time">Time Entered</option>
              </select>

              <span className="text-xs font-semibold text-gray-600 ml-2">Date:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const date = new Date(currentDate);
                    date.setDate(date.getDate() - 1);
                    setCurrentDate(date.toISOString().split('T')[0]);
                  }}
                  className="px-1.5 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                  title="Previous day"
                >
                  ←
                </button>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="text-xs px-1 py-0.5 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => {
                    const date = new Date(currentDate);
                    date.setDate(date.getDate() + 1);
                    setCurrentDate(date.toISOString().split('T')[0]);
                  }}
                  className="px-1.5 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                  title="Next day"
                >
                  →
                </button>
                <button
                  onClick={() => setCurrentDate(getTodayDate())}
                  className="px-2 py-0.5 text-xs bg-purple-600 text-white hover:bg-purple-700 rounded"
                  title="Go to today"
                >
                  Today
                </button>
              </div>
              
              <div className="ml-auto text-xs text-gray-500">
                Showing {sortedPatients.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Add patient from blurb */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <textarea
                id="new-patient-blurb-input"
                value={newPatientBlurb}
                onChange={(e) => setNewPatientBlurb(e.target.value)}
                placeholder="Paste patient blurb here to add a new patient... (Cmd+N)"
                rows={2}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={newPatientType}
                onChange={(e) => setNewPatientType(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {procedureTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addPatientFromBlurb}
              disabled={isAddingPatient || !newPatientBlurb.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-lg font-semibold shadow-sm transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingPatient ? (
                <>
                  <Sparkles className="animate-spin" size={16} />
                  Adding Patient...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Patient from Blurb
                </>
              )}
            </button>
          </div>
        </div>

        {/* MRI Export List */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-indigo-400">
            <button
              onClick={() => setShowMriExport(!showMriExport)}
              className="w-full flex items-center justify-between hover:bg-gray-50 p-1 rounded transition mb-2"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <BrainCircuit className="text-indigo-600" />
                    MRI Export List
                </h2>
              </div>
              <ChevronDown className={`transition-transform ${showMriExport ? 'rotate-180' : ''}`} size={20} />
            </button>

            {showMriExport && (
              <>
                <div className="flex items-center justify-end mb-2">
                    <button
                        onClick={handleMriExport}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                            mriExported
                                ? 'bg-green-600 text-white'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        <Copy size={14} />
                        {mriExported ? 'Copied!' : 'Copy TSV'}
                    </button>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-indigo-50">
                            <tr>
                                <th className="p-2 text-left font-semibold text-indigo-900">Name</th>
                                <th className="p-2 text-left font-semibold text-indigo-900">Patient ID</th>
                                <th className="p-2 text-left font-semibold text-indigo-900">Weight (kg)</th>
                                <th className="p-2 text-left font-semibold text-indigo-900">Scan Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.filter((p: any) => p.type === 'MRI').map((p: any, idx: number) => {
                                let weightKg = 0;
                                let weightSource = p.mriData?.weight || p.patientInfo?.weight;
                                if (weightSource) {
                                    const weightMatch = String(weightSource).match(/(\d+(?:\.\d+)?)\s*(kg|lbs)?/i);
                                    if (weightMatch) {
                                        const weightNum = parseFloat(weightMatch[1]);
                                        const unit = (weightMatch[2] || p.mriData?.weightUnit || 'kg').toLowerCase();
                                        weightKg = unit === 'lbs' ? weightNum / 2.20462 : weightNum;
                                    }
                                }
                                const kgRounded = weightKg > 0 ? roundKgToInt(weightKg) : 0;
                                return (
                                    <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                                        <td className="p-2 border-t">{p.name}</td>
                                        <td className="p-2 border-t">{safeStr(p.patientInfo?.patientId)}</td>
                                        <td className="p-2 border-t">{kgRounded || ''}</td>
                                        <td className="p-2 border-t">
                                            <select
                                                value={safeStr(p.mriData?.scanType)}
                                                onChange={(e) => updateMRIData(p.id, 'scanType', e.target.value)}
                                                className="w-full bg-transparent p-1 border border-gray-200 rounded hover:border-indigo-400 focus:ring-1 focus:ring-indigo-500"
                                            >
                                                <option>Brain</option>
                                                <option>Cervical</option>
                                                <option>TL</option>
                                                <option>LS</option>
                                                <option>Other</option>
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
              </>
            )}
        </div>

        {/* Rounding sheet with table/TSV toggle */}
        {(patients || []).length > 0 && (
          <div className="w-full bg-white rounded-lg shadow p-3 mb-4 border-l-4 border-fuchsia-400">
            <button
                onClick={() => setShowRoundingSheet(!showRoundingSheet)}
                className="w-full flex items-center justify-between hover:bg-gray-50 p-1 rounded transition mb-2"
              >
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800">Rounding Sheet</span>
                <span className="text-base">📋</span>
              </div>
              <ChevronDown className={`transition-transform ${showRoundingSheet ? 'rotate-180' : ''}`} size={20} />
            </button>

            {showRoundingSheet && (
              <>
                <div className="mb-3 p-2 bg-fuchsia-50/50 border border-fuchsia-200 rounded-lg">
                  <label htmlFor="reverse-paste-input" className="block text-xs font-semibold text-gray-700 mb-1">
                    Paste Row from Spreadsheet to Update Patient
                  </label>
                  <textarea
                    id="reverse-paste-input"
                    value={reversePasteContent}
                    onChange={(e) => setReversePasteContent(e.target.value)}
                    placeholder="Paste a single tab-separated row here. The first column must be the patient's name."
                    rows={1}
                    className="w-full p-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-fuchsia-400"
                  />
                  <button
                    onClick={handleReversePaste}
                    className="mt-1 px-2 py-1 bg-fuchsia-600 text-white text-xs font-semibold rounded-lg hover:bg-fuchsia-700"
                  >
                    Update From Paste
                  </button>
                </div>
                 <div className="flex items-center justify-end gap-2 mb-2">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setRoundingViewMode('table')}
                        className={`px-2 py-1 text-xs flex items-center gap-1 transition ${
                          roundingViewMode === 'table'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Table size={14} />
                        Table
                      </button>
                      <button
                        onClick={() => setRoundingViewMode('tsv')}
                        className={`px-2 py-1 text-xs flex items-center gap-1 transition ${
                          roundingViewMode === 'tsv'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FileText size={14} />
                        TSV
                      </button>
                    </div>
                  </div>
                {roundingViewMode === 'tsv' ? (
                  <textarea
                    readOnly
                    value={roundingTSV}
                    rows={4}
                    className="w-full font-mono text-[10px] p-2 border rounded-lg bg-gray-50"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gradient-to-r from-purple-100 to-fuchsia-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-left font-semibold border-b">Name</th>
                          <th className="p-2 text-left font-semibold border-b">Signalment</th>
                          <th className="p-2 text-left font-semibold border-b">Location</th>
                          <th className="p-2 text-left font-semibold border-b">ICU Criteria</th>
                          <th className="p-2 text-left font-semibold border-b">Code</th>
                          <th className="p-2 text-left font-semibold border-b">Problems</th>
                          <th className="p-2 text-left font-semibold border-b">Diagnostics</th>
                          <th className="p-2 text-left font-semibold border-b">Therapeutics</th>
                          <th className="p-2 text-left font-semibold border-b">IVC</th>
                          <th className="p-2 text-left font-semibold border-b">Fluids</th>
                          <th className="p-2 text-left font-semibold border-b">CRI</th>
                          <th className="p-2 text-left font-semibold border-b">Overnight Dx</th>
                          <th className="p-2 text-left font-semibold border-b">Concerns</th>
                          <th className="p-2 text-left font-semibold border-b">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPatients.map((patient: any, idx: number) => {
                          const fieldMap = ['name', 'signalment', 'location', 'icuCriteria', 'codeStatus', 'problems', 'diagnosticFindings', 'therapeutics', 'replaceIVC', 'replaceFluids', 'replaceCRI', 'overnightDiagnostics', 'overnightConcerns', 'additionalComments'];
                          const row = makeRoundingRow(patient);
                          const rowTsv = makeRoundingRow(patient).map(sanitizeCell).join('\t');
                          return (
                            <tr key={patient.id} className={idx % 2 === 0 ? 'bg-white hover:bg-purple-50' : 'bg-gray-50/70 hover:bg-purple-50'}>
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="p-1 border-b align-top">
                                  {cellIdx === 0 ? (
                                    <div className="font-semibold text-gray-900 flex items-center gap-1">
                                      <span>{cell || '-'}</span>
                                      <button
                                          onClick={() => navigator.clipboard.writeText(rowTsv)}
                                          title="Copy row to clipboard"
                                          className="p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-md"
                                        >
                                          <Copy size={12} />
                                        </button>
                                    </div>
                                  ) : ['replaceIVC', 'replaceFluids', 'replaceCRI'].includes(fieldMap[cellIdx]) ? (
                                    <select
                                      value={safeStr(patient.roundingData?.[fieldMap[cellIdx]]) || ''}
                                      onChange={(e) => updateRoundingData(patient.id, fieldMap[cellIdx], e.target.value)}
                                      className="w-full p-1.5 text-xs border border-gray-200 rounded hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                                    >
                                      <option value="">Select...</option>
                                      <option value="Yes">Yes</option>
                                      <option value="No">No</option>
                                      <option value="N/A">N/A</option>
                                    </select>
                                  ) : (
                                    <textarea
                                      value={cell}
                                      onChange={(e) => {
                                        const fieldKey = cellIdx === 0 ? 'name' : fieldMap[cellIdx];
                                        if (cellIdx === 0) {
                                          updatePatientField(patient.id, 'name', e.target.value);
                                        } else {
                                          updateRoundingData(patient.id, fieldKey, e.target.value)
                                        }
                                      }}
                                      className="w-full p-1.5 text-xs border border-gray-200 rounded hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white resize-none"
                                      rows={2}
                                      placeholder={`${fieldMap[cellIdx]}`}
                                    />
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* General Tasks */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-purple-400">
          <button
            onClick={() => setShowGeneralTasks(!showGeneralTasks)}
            className="w-full flex items-center justify-between hover:bg-gray-50 p-1 rounded transition mb-2"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-800">General Tasks (Not Patient-Specific)</h2>
              <span className="text-base">✅</span>
            </div>
            <ChevronDown className={`transition-transform ${showGeneralTasks ? 'rotate-180' : ''}`} size={20} />
          </button>
          
          {showGeneralTasks && (
            <>
              <div className="flex flex-wrap gap-1 mb-2">
                {commonGeneralTasksTemplates.map(task => (
                  <button
                    key={task.name}
                    onClick={() => addGeneralTask(task)}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                  >
                    + {task.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  value={newGeneralTask.name}
                  onChange={(e) => setNewGeneralTask(p => ({ ...p, name: e.target.value }))}
                  placeholder="Add custom general task..."
                  className="md:col-span-1 px-2 py-1 text-sm border border-gray-300 rounded-lg"
                />
                <select
                    value={newGeneralTask.category}
                    onChange={(e) => setNewGeneralTask(p => ({ ...p, category: e.target.value }))}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                >
                    <option>Morning</option>
                    <option>Evening</option>
                </select>
                <select
                    value={newGeneralTask.priority}
                    onChange={(e) => setNewGeneralTask(p => ({ ...p, priority: e.target.value }))}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                </select>
              </div>
              <button
                  onClick={() => addGeneralTask(newGeneralTask)}
                  className="w-full px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                >
                  Add Task
                </button>
              
              {(generalTasks ?? []).length === 0 ? (
                <p className="text-gray-400 text-xs italic py-2">No general tasks yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <h3 className="font-bold text-base mb-2 flex items-center gap-2"><Sun className="text-yellow-500" /> Morning</h3>
                    <div className="space-y-2">
                    {morningGeneralTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                          task.completed ? 'bg-green-50 border-green-500' : getPriorityClasses(task.priority)
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleGeneralTask(task.id, task.completed)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className={`flex-1 text-xs font-medium ${task.completed ? 'text-green-800 line-through' : 'text-gray-700'}`}>
                          {task.name}
                        </span>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full">{task.priority}</span>
                        <button onClick={() => removeGeneralTask(task.id)} className="text-gray-400 hover:text-purple-600 transition">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-2 flex items-center gap-2"><Moon className="text-blue-500" /> Evening</h3>
                    <div className="space-y-2">
                    {eveningGeneralTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                          task.completed ? 'bg-green-50 border-green-500' : getPriorityClasses(task.priority)
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleGeneralTask(task.id, task.completed)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className={`flex-1 text-xs font-medium ${task.completed ? 'text-green-800 line-through' : 'text-gray-700'}`}>
                          {task.name}
                        </span>
                         <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full">{task.priority}</span>
                        <button onClick={() => removeGeneralTask(task.id)} className="text-gray-400 hover:text-purple-600 transition">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Rapid Task Check-off Tables */}
        <div className="space-y-4 mb-4">
          <TaskTable
            title="Morning Tasks"
            icon={<Sun className="text-yellow-500" />}
            patients={sortedPatients}
            taskNames={morningTasks}
            currentDate={currentDate}
            onToggleTask={toggleTask}
            onPatientClick={handlePatientClick}
            onRemoveTask={removeTask}
          />
          <TaskTable
            title="Evening Tasks"
            icon={<Moon className="text-blue-500" />}
            patients={sortedPatients}
            taskNames={eveningTasks}
            currentDate={currentDate}
            onToggleTask={toggleTask}
            onPatientClick={handlePatientClick}
            onRemoveTask={removeTask}
          />
          <div className="bg-white rounded-lg shadow-md p-4 border">
            <button
              onClick={() => setShowOtherTasks(!showOtherTasks)}
              className="w-full flex items-center justify-between hover:bg-gray-50 p-1 rounded transition mb-2"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="text-purple-500" />
                  Other Tasks List
                </h3>
              </div>
              <ChevronDown className={`transition-transform ${showOtherTasks ? 'rotate-180' : ''}`} size={20} />
            </button>
            
            {showOtherTasks && (
              <>
                {Object.keys(otherTasksMap).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                    {Object.entries(otherTasksMap).map(([taskName, tasks]) => (
                      <div key={taskName} className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg">
                        <h4 className="font-bold text-sm text-purple-800 mb-2">{taskName}</h4>
                        <div className="space-y-2">
                          {tasks.map((task) => {
                            const patient = patients.find(p => p.id === task.patientId);
                            if (!patient) return null;
                            return (
                              <label key={task.taskId} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-purple-100">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => toggleTask(task.patientId, task.taskId)}
                                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                                />
                                <span className={`text-xs font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                  {patient.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic mt-2">No other tasks assigned for today. Add custom tasks inside a patient's card.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Patients */}
        {patients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-10 text-center border-2 border-purple-200">
            <p className="text-gray-600 text-base flex items-center justify-center gap-2 font-semibold">
              <span className="text-2xl">🐾</span>
              No patients added yet. Add your first patient above!
              <span className="text-2xl">🐾</span>
            </p>
          </div>
        ) : sortedPatients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-10 text-center border-2 border-purple-200">
            <p className="text-gray-600 text-base font-semibold">No patients match your search. Try a different query!</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedPatients.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-3 pl-6">
                {sortedPatients.map((patient: any) => {
              const { completed, total, percentage } = getCompletionStatus(patient);
              const isExpanded = !!expandedPatients[patient.id];

              // Filter tasks for current date, then sort: incomplete first
              const todayTasks = getTasksForDate(patient.tasks || [], currentDate);
              const tasksSorted = [...todayTasks].sort((a, b) => Number(a.completed) - Number(b.completed));
              const morningTasksSet = new Set(morningTasks);
              const eveningTasksSet = new Set(eveningTasks);

              const tabs = getTabsForPatient(patient);
              const curTab = activeTab[patient.id] ?? tabs[0];
              const roundingComp = getRoundingCompletion(patient);

              return (
                <SortablePatient key={patient.id} id={patient.id}>
                  <div id={`patient-${patient.id}`} className={`bg-white rounded-lg shadow-sm border ${getPriorityColor(patient.status)} overflow-hidden hover:shadow-md transition-shadow`}>
                  {/* Header */}
                  <div className="flex justify-between items-center p-3 border-b">
                    <div className="flex items-center gap-2">
                      {viewMode === 'compact' ? (
                        <div className="w-10 h-10">
                          <ProgressRing percentage={Math.round(percentage)} size={40} />
                        </div>
                      ) : (
                        <button onClick={() => toggleExpanded(patient.id)} className="text-gray-500 hover:text-gray-800 p-1">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl">{getBreedEmoji(patient)}</span>
                          <h3 className="text-base font-bold text-gray-900">{patient.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPatientTypeColor(patient.type)}`}>{patient.type}</span>

                          {/* Rounding Status Badge */}
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              roundingComp.isComplete
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : roundingComp.percentage > 50
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                : 'bg-orange-100 text-orange-800 border border-orange-300'
                            }`}
                            title={`Missing: ${roundingComp.missing.join(', ')}`}
                          >
                            📋 {roundingComp.filled}/{roundingComp.total}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={12} /> {patient.addedTime}
                          </span>
                        </div>
                        {patient.roundingData?.problems && (
                          <div className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg inline-block mt-1 border border-red-200">
                            🏥 {patient.roundingData.problems.split('\n')[0]}
                          </div>
                        )}
                        <div className="text-xs text-gray-600 mt-1">
                          {patient.roundingData?.signalment && <span className="mr-2">📋 {patient.roundingData.signalment}</span>}
                          {patient.patientInfo?.weight && <span className="mr-2">⚖️ {patient.patientInfo.weight}</span>}
                          {patient.patientInfo?.patientId && <span className="mr-2">🆔 {patient.patientInfo.patientId}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        value={patient.type}
                        onChange={(e) => updatePatientType(patient.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border text-xs"
                      >
                        {procedureTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select
                        value={patient.status}
                        onChange={(e) => updateStatus(patient.id, e.target.value)}
                        className={'px-2 py-1 rounded-lg border text-xs font-semibold ' + getStatusColor(patient.status)}
                      >
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => removePatient(patient.id)} className="text-red-500 hover:text-red-700 p-1.5" title="Remove patient">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {viewMode === 'compact' && (
                    <div className="flex items-center justify-between px-3 py-2 bg-purple-50/50">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-gray-800">{completed}/{total} tasks</div>
                        <div className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full shadow-md">
                          {Math.round(percentage)}% Complete
                        </div>
                      </div>
                      <button onClick={() => toggleExpanded(patient.id)} className="px-3 py-1 text-xs bg-white border border-purple-500 text-purple-700 font-semibold rounded-lg hover:bg-purple-50 shadow-sm">
                        {isExpanded ? 'Hide' : 'Open'} <ChevronRight className="inline-block ml-1" size={14} />
                      </button>
                    </div>
                  )}

                  {/* Body */}
                  {isExpanded && (
                    <div className="p-3">
                      {/* Tabs */}
                      <div className="border-b mb-3">
                        <nav className="flex flex-wrap gap-2">
                          {tabs.map(tab => {
                            const isActive = curTab === tab;
                            return (
                              <button
                                key={tab}
                                onClick={() => setActiveTab(prev => ({ ...prev, [patient.id]: tab }))}
                                className={`py-1 px-2.5 border-b-2 text-xs ${isActive ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:border-gray-300'}`}
                              >
                                {tab}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Tab content */}
                      <div className="space-y-3">
                        {/* TASKS */}
                        {curTab === 'Tasks' && (
                          <div className="space-y-3">
                             {/* Quick action buttons */}
                            <div className="space-y-1">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase">Quick Add</h4>
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => addMorningTasks(patient.id)} className="px-2 py-0.5 text-xs bg-yellow-400 text-yellow-900 rounded hover:bg-yellow-500">
                                  + Morning
                                </button>
                                <button onClick={() => addEveningTasks(patient.id)} className="px-2 py-0.5 text-xs bg-indigo-400 text-white rounded hover:bg-indigo-500">
                                  + Evening
                                </button>
                                {patient.status === 'New Admit' && admitTasks[patient.type].map(task => (
                                  <button
                                    key={task}
                                    onClick={() => addTaskToPatient(patient.id, task)}
                                    className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                                  >
                                    + {task}
                                  </button>
                                ))}
                                <button onClick={() => resetDailyTasks(patient.id)} className="px-2 py-0.5 text-xs bg-gray-400 text-white rounded hover:bg-gray-50 ml-auto">
                                  Clear Daily
                                </button>
                              </div>
                            </div>

                            {/* Other Tasks */}
                            <div className="p-2 bg-slate-100/70 rounded-lg border">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Other Tasks</h4>
                              <div className="flex flex-wrap gap-1">
                                {otherTasks.map(task => (
                                  <button
                                    key={task}
                                    onClick={() => addTaskToPatient(patient.id, task)}
                                    className="px-2 py-0.5 text-xs bg-slate-200 text-slate-800 rounded hover:bg-slate-300"
                                  >
                                    + {task}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Custom task input */}
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Add custom task..."
                                className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-purple-500"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    addTaskToPatient(patient.id, e.currentTarget.value.trim());
                                    e.currentTarget.value = '';
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                  if (input.value.trim()) {
                                    addTaskToPatient(patient.id, input.value.trim());
                                    input.value = '';
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                              >
                                Add
                              </button>
                            </div>

                            {/* Tasks list */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {tasksSorted.filter((task: any) => !hideCompletedTasks || !task.completed).map((task: any) => {
                                const isMorning = morningTasksSet.has(task.name);
                                const isEvening = eveningTasksSet.has(task.name);
                                const timeEmoji = isMorning ? '🌅 ' : isEvening ? '🌙 ' : '';
                                return (
                                <label
                                  key={task.id}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition hover:scale-[1.02] ${
                                    getTaskBackgroundColor(task.name, task.completed, morningTasks, eveningTasks)
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(patient.id, task.id)}
                                    className="w-4 h-4 rounded cursor-pointer flex-shrink-0 accent-purple-600"
                                  />
                                  <span className={`flex-1 text-xs font-semibold ${task.completed ? 'text-green-800 line-through' : 'text-gray-900'}`} title={task.name}>
                                    {timeEmoji}{task.name}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      removeTask(patient.id, task.id);
                                    }}
                                    className="text-gray-400 hover:text-red-600 flex-shrink-0"
                                  >
                                    <X size={14} />
                                  </button>
                                </label>
                                );
                              })}
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                              {completed}/{total} completed
                            </div>
                          </div>
                        )}

                        {/* MRI CALCULATOR */}
                        {curTab === 'MRI Calculator' && patient.type === 'MRI' && (
                          <div className="border rounded-lg">
                            <div className="p-2 border-t space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Weight</label>
                                  <div className="flex gap-1">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={safeStr(patient.mriData?.weight)}
                                      onChange={(e) => updateMRIData(patient.id, 'weight', e.target.value)}
                                      placeholder="Weight"
                                      className="flex-1 px-2 py-1 text-sm border border-purple-300 rounded-lg"
                                    />
                                    <select
                                      value={safeStr(patient.mriData?.weightUnit)}
                                      onChange={(e) => updateMRIData(patient.id, 'weightUnit', e.target.value)}
                                      className="px-2 py-1 text-sm border border-purple-300 rounded-lg"
                                    >
                                      <option value="kg">kg</option>
                                      <option value="lbs">lbs</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scan Type</label>
                                  <select
                                    value={safeStr(patient.mriData?.scanType)}
                                    onChange={(e) => updateMRIData(patient.id, 'scanType', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-purple-300 rounded-lg"
                                  >
                                    <option>Brain</option>
                                    <option>TL</option>
                                    <option>LS</option>
                                    <option>Cervical</option>
                                    <option>Other</option>
                                  </select>
                                </div>
                              </div>
                              <button
                                onClick={() => calculateMRIDrugs(patient.id)}
                                disabled={!safeStr(patient.mriData?.weight)}
                                className="w-full px-3 py-1.5 bg-purple-600 text-white font-semibold text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition"
                              >
                                Calculate & Copy Line
                              </button>

                              {patient.mriData?.calculated && (
                                <>
                                  <div className="bg-white p-2 rounded-lg border border-purple-200">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="col-span-2 bg-purple-100 p-1 rounded font-semibold text-purple-900">
                                        Pre-med: {patient.mriData.preMedDrug} {patient.mriData.scanType === 'Brain' ? '(Brain)' : ''}
                                      </div>
                                      <div><span className="text-gray-600">Weight (kg):</span> <span className="font-bold ml-1">{safeStr(patient.mriData.weightKg)} kg</span></div>
                                      <div><span className="text-gray-600">Valium:</span> <span className="font-bold ml-1">{safeStr(patient.mriData.valiumDose)} mg ({safeStr(patient.mriData.valiumVolume)} mL)</span></div>
                                      <div><span className="text-gray-600">{safeStr(patient.mriData.preMedDrug)}:</span> <span className="font-bold ml-1">{safeStr(patient.mriData.preMedDose)} mg ({safeStr(patient.mriData.preMedVolume)} mL)</span></div>
                                      <div><span className="text-gray-600">Contrast:</span> <span className="font-bold ml-1">{safeStr(patient.mriData.contrastVolume)} mL</span></div>
                                    </div>
                                  </div>
                                  {patient.mriData.copyableString && (
                                    <div className="mt-2">
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Line for MRI Sheet</label>
                                      <textarea
                                        readOnly
                                        value={patient.mriData.copyableString}
                                        rows={1}
                                        className="w-full px-2 py-1 text-xs font-mono border bg-gray-50 rounded-lg"
                                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* PATIENT DATA (Info + Rounding) */}
                        {curTab === 'Patient Data' && (
                          <div className="border rounded-lg">
                            <div className="p-2 border-t space-y-3">
                              {/* Quick Import */}
                              <div className="p-2 bg-purple-50/50 border border-purple-200 rounded-lg">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Import — Paste Patient Details</label>
                                <textarea
                                  value={safeStr(patient.detailsInput)}
                                  onChange={(e) => updatePatientField(patient.id, 'detailsInput', e.target.value)}
                                  placeholder="Paste patient info from EzyVet, etc..."
                                  rows={3}
                                  className="w-full px-2 py-1 text-xs border rounded-lg mb-1"
                                />
                                <div className="flex gap-2 items-center mb-1">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={useAIForRounding}
                                      onChange={(e) => setUseAIForRounding(e.target.checked)}
                                      className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                    />
                                    <span className="text-xs font-semibold text-gray-700">
                                      🤖 Use AI Parsing
                                    </span>
                                  </label>
                                </div>
                                <button
                                  onClick={() => {
                                    if (useAIForRounding) {
                                      parsePatientDetailsWithAI(patient.id, safeStr(patient.detailsInput));
                                    } else {
                                      parsePatientDetails(patient.id, safeStr(patient.detailsInput));
                                    }
                                  }}
                                  disabled={aiParsingLoading}
                                  className="px-2 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                  {aiParsingLoading ? '🤖 Processing...' : useAIForRounding ? 'Extract with AI' : 'Extract Basics'}
                                </button>
                                <p className="text-[10px] text-gray-600 mt-1 italic">
                                  {useAIForRounding
                                    ? 'AI extracts all rounding fields.'
                                    : 'Non-AI extracts basic signalment.'}
                                </p>
                              </div>
                              <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-1">Patient Info</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Object.entries(patient.patientInfo || {}).map(([key, value]) => (
                                    <div key={key}>
                                    <label className="block text-xs font-semibold text-gray-500">{key}</label>
                                    <input
                                        type="text"
                                        value={safeStr(value)}
                                        onChange={(e) => updatePatientInfo(patient.id, key, e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded-lg"
                                    />
                                    </div>
                                ))}
                                </div>
                              <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-1 mt-2">Rounding Sheet</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="md:col-span-2">
                                     <label className="block text-xs font-semibold text-gray-500">Signalment</label>
                                      <DebouncedTextarea
                                        initialValue={safeStr(patient.roundingData?.signalment)}
                                        onCommit={(value) => updateRoundingData(patient.id, 'signalment', value)}
                                        placeholder="e.g., 4yo MN Frenchie"
                                        className={getRequiredFieldClass(patient, 'signalment', 'w-full text-xs p-1.5 border rounded-lg')}
                                      />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500">Location</label>
                                    <select
                                        value={safeStr(patient.roundingData?.location) || ''}
                                        onChange={(e) => updateRoundingData(patient.id, 'location', e.target.value)}
                                        className={getRequiredFieldClass(patient, 'location', 'w-full px-2 py-1 text-xs border rounded-lg')}
                                    >
                                        <option value="">Location...</option>
                                        <option value="IP">IP</option>
                                        <option value="ICU">ICU</option>
                                    </select>
                                   </div>
                                    <div>
                                    <label className="block text-xs font-semibold text-gray-500">ICU Criteria</label>
                                      <select
                                        value={safeStr(patient.roundingData?.icuCriteria) || ''}
                                        onChange={(e) => updateRoundingData(patient.id, 'icuCriteria', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded-lg"
                                      >
                                        <option value="">ICU Criteria...</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                        <option value="N/A">N/A</option>
                                      </select>
                                    </div>
                                    <div>
                                    <label className="block text-xs font-semibold text-gray-500">Code Status</label>
                                      <select
                                        value={safeStr(patient.roundingData?.codeStatus) || 'Yellow'}
                                        onChange={(e) => updateRoundingData(patient.id, 'codeStatus', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded-lg"
                                      >
                                        <option>Yellow</option>
                                        <option>Red</option>
                                      </select>
                                    </div>

                                  {/* Problems with chip selectors */}
                                  <div className="md:col-span-2 p-2 bg-yellow-50/70 border border-yellow-200 rounded-lg">
                                    <h5 className="text-xs font-bold text-yellow-900 mb-1">Problems</h5>
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      {(commonProblems || []).slice(0, 10).map((pr: any) => (
                                        <div key={pr.id} className="group relative">
                                          <button
                                            onClick={() => {
                                              const current = safeStr(patient.roundingData?.problems);
                                              const newValue = current ? current + '\n' + pr.name : pr.name;
                                              updateRoundingData(patient.id, 'problems', newValue);
                                            }}
                                            className="px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-800 rounded-full hover:scale-105 transition"
                                          >
                                            {pr.name}
                                          </button>
                                          <button
                                            onClick={() => deleteCommonItem('commonProblems', pr.id)}
                                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex gap-1 mb-1">
                                      <select
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            const current = safeStr(patient.roundingData?.problems);
                                            const newValue = current ? current + '\n' + e.target.value : e.target.value;
                                            updateRoundingData(patient.id, 'problems', newValue);
                                            e.currentTarget.value = '';
                                          }
                                        }}
                                        className="flex-1 px-1.5 py-0.5 text-[11px] border border-yellow-300 rounded-lg"
                                      >
                                        <option value="">Select problem...</option>
                                        {(commonProblems || []).map((p: any) => (
                                          <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        placeholder="Add to list..."
                                        className="flex-1 px-1.5 py-0.5 text-[11px] border border-yellow-300 rounded-lg"
                                        onKeyDown={(e) => {
                                          const val = (e.target as HTMLInputElement).value.trim();
                                          if (e.key === 'Enter' && val) { addCommonProblem(val); (e.target as HTMLInputElement).value = ''; }
                                        }}
                                      />
                                      <button
                                        onClick={(e) => {
                                          const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                          if (input.value.trim()) { addCommonProblem(input.value.trim()); input.value = ''; }
                                        }}
                                        className="px-1.5 py-0.5 bg-yellow-600 text-white text-[10px] rounded hover:bg-yellow-700"
                                      >
                                        Save
                                      </button>
                                    </div>
                                    <DebouncedTextarea
                                        initialValue={safeStr(patient.roundingData?.problems)}
                                        onCommit={(value) => updateRoundingData(patient.id, 'problems', value)}
                                        placeholder="Problems"
                                        rows={2}
                                        className={getRequiredFieldClass(patient, 'problems', 'w-full text-xs p-1.5 border rounded-lg mt-1')}
                                      />
                                  </div>

                                  {/* Diagnostics */}
                                  <div className="md:col-span-2 space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500">Diagnostic Findings</label>
                                    <DebouncedTextarea
                                      initialValue={safeStr(patient.roundingData?.diagnosticFindings)}
                                      onCommit={(value) => updateRoundingData(patient.id, 'diagnosticFindings', value)}
                                      placeholder="Diagnostic Findings"
                                      rows={2}
                                      className={getRequiredFieldClass(patient, 'diagnosticFindings', 'w-full px-2 py-1 text-xs border rounded-lg')}
                                    />
                                    <div className="p-2 bg-green-50/70 border border-green-200 rounded-lg">
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Work</label>
                                      <textarea
                                        value={safeStr(patient.bwInput)}
                                        onChange={(e) => updatePatientField(patient.id, 'bwInput', e.target.value)}
                                        placeholder="Paste blood work..."
                                        rows={2}
                                        className="w-full px-2 py-1 text-xs border rounded-lg mb-1"
                                      />
                                      <button
                                        onClick={() => parseBloodWork(patient.id, safeStr(patient.bwInput))}
                                        className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                                      >
                                        Extract Abnormals
                                      </button>
                                    </div>
                                    <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-lg">
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Chest X-ray</label>
                                      <div className="flex gap-1 mb-1">
                                        <select
                                          value={safeStr(patient.xrayStatus) || 'NSF'}
                                          onChange={(e) => updatePatientField(patient.id, 'xrayStatus', e.target.value)}
                                          className="px-2 py-1 text-xs border rounded-lg"
                                        >
                                          <option>NSF</option>
                                          <option>Pending</option>
                                          <option>Other</option>
                                        </select>
                                        {patient.xrayStatus === 'Other' && (
                                          <input
                                            type="text"
                                            value={safeStr(patient.xrayOther)}
                                            onChange={(e) => updatePatientField(patient.id, 'xrayOther', e.target.value)}
                                            placeholder="Describe..."
                                            className="flex-1 px-2 py-1 text-xs border rounded-lg"
                                          />
                                        )}
                                      </div>
                                      <button
                                        onClick={() => {
                                          let line = 'CXR: ' + (safeStr(patient.xrayStatus) === 'Other' ? safeStr(patient.xrayOther) : safeStr(patient.xrayStatus));
                                          const currentDx = safeStr(patient.roundingData?.diagnosticFindings);
                                          const newDx = currentDx ? currentDx + '\n' + line : line;
                                          updateRoundingData(patient.id, 'diagnosticFindings', newDx);
                                          updatePatientField(patient.id, 'xrayOther', '');
                                        }}
                                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                                      >
                                        Add to Findings
                                      </button>
                                    </div>
                                  </div>
                                  

                                  {/* Therapeutics chip system */}
                                  <div className="md:col-span-2 p-2 bg-cyan-50/70 border border-cyan-200 rounded-lg">
                                    <h5 className="text-xs font-bold text-cyan-900 mb-1">Therapeutics</h5>
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      {(commonMedications || []).slice(0, 10).map((med: any) => (
                                        <div key={med.id} className="group relative">
                                          <button
                                            onClick={() => {
                                              const current = safeStr(patient.roundingData?.therapeutics);
                                              updateRoundingData(patient.id, 'therapeutics', current ? `${current}\n${med.name}` : med.name);
                                            }}
                                            className="px-1.5 py-0.5 text-[10px] bg-cyan-100 text-cyan-800 rounded-full hover:scale-105 transition"
                                          >
                                            + {med.name}
                                          </button>
                                          <button
                                            onClick={() => deleteCommonItem('commonMedications', med.id)}
                                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex gap-1 mb-1">
                                       <select
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              const current = safeStr(patient.roundingData?.therapeutics);
                                              updateRoundingData(patient.id, 'therapeutics', current ? `${current}\n${e.target.value}` : e.target.value);
                                              e.currentTarget.value = '';
                                            }
                                          }}
                                          className="flex-1 px-1.5 py-0.5 text-[11px] border border-cyan-300 rounded-lg"
                                        >
                                          <option value="">Select medication...</option>
                                          {(commonMedications || []).map((med: any) => (
                                            <option key={med.id} value={med.name}>{med.name}</option>
                                          ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        placeholder="Add to list..."
                                        className="flex-1 px-1.5 py-0.5 text-[11px] border border-cyan-300 rounded-lg"
                                        onKeyDown={(e) => {
                                          const val = e.currentTarget.value.trim();
                                          if (e.key === 'Enter' && val) { addCommonMedication(val); e.currentTarget.value = ''; }
                                        }}
                                      />
                                      <button
                                        onClick={(e) => {
                                          const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                          if (input.value.trim()) { addCommonMedication(input.value.trim()); input.value = ''; }
                                        }}
                                        className="px-1.5 py-0.5 bg-cyan-600 text-white text-[10px] rounded hover:bg-cyan-700"
                                      >
                                        Save
                                      </button>
                                    </div>
                                    <DebouncedTextarea
                                      initialValue={safeStr(patient.roundingData?.therapeutics)}
                                      onCommit={(value) => updateRoundingData(patient.id, 'therapeutics', value)}
                                      placeholder="Current Therapeutics"
                                      rows={2}
                                      className={getRequiredFieldClass(patient, 'therapeutics', 'w-full text-xs p-1.5 border rounded-lg mt-1')}
                                    />
                                  </div>

                                  {/* Replace IVC / Fluids / CRI */}
                                  {['replaceIVC', 'replaceFluids', 'replaceCRI'].map((field) => (
                                    <div key={field}>
                                      <label className="block text-xs font-semibold text-gray-500">
                                        {field === 'replaceIVC' ? 'Replace IVC' : field === 'replaceFluids' ? 'Replace Fluids' : 'Replace CRI'}
                                      </label>
                                      <select
                                        value={safeStr(patient.roundingData?.[field]) || ''}
                                        onChange={(e) => updateRoundingData(patient.id, field, e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded-lg"
                                      >
                                        <option value="">Select…</option>
                                        <option>Yes</option>
                                        <option>No</option>
                                        <option>N/A</option>
                                      </select>
                                    </div>
                                  ))}

                                  {/* Overnight + Comments */}
                                   <div className="md:col-span-2">
                                     <label className="block text-xs font-semibold text-gray-500">Overnight Diagnostics</label>
                                    <DebouncedTextarea
                                        initialValue={safeStr(patient.roundingData?.overnightDiagnostics)}
                                        onCommit={(value) => updateRoundingData(patient.id, 'overnightDiagnostics', value)}
                                        placeholder="Overnight Diagnostics"
                                        rows={2}
                                        className="w-full px-2 py-1 text-xs border rounded-lg"
                                    />
                                   </div>
                                   <div className="md:col-span-2">
                                     <label className="block text-xs font-semibold text-gray-500">Overnight Concerns</label>
                                    <DebouncedTextarea
                                        initialValue={safeStr(patient.roundingData?.overnightConcerns)}
                                        onCommit={(value) => updateRoundingData(patient.id, 'overnightConcerns', value)}
                                        placeholder="Overnight Concerns/Alerts"
                                        rows={2}
                                        className="w-full px-2 py-1 text-xs border rounded-lg"
                                    />
                                   </div>
                                  <div className="md:col-span-2 p-2 bg-purple-50/70 border border-purple-200 rounded-lg">
                                    <h5 className="text-xs font-bold text-purple-900 mb-1">Additional Comments</h5>
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      {(commonComments || []).slice(0, 10).map((c: any) => (
                                        <div key={c.id} className="group relative">
                                          <button
                                            onClick={() => {
                                              const current = safeStr(patient.roundingData?.additionalComments);
                                              updateRoundingData(patient.id, 'additionalComments', current ? `${current}\n${c.name}` : c.name);
                                            }}
                                            className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-800 rounded-full hover:scale-105 transition"
                                          >
                                            + {c.name.substring(0, 30)}...
                                          </button>
                                           <button
                                            onClick={() => deleteCommonItem('commonComments', c.id)}
                                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-fuchsia-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        placeholder="Add to list..."
                                        className="flex-1 px-1.5 py-0.5 text-[11px] border border-purple-300 rounded-lg"
                                        onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { addCommonComment(e.currentTarget.value.trim()); e.currentTarget.value = ''; }}}
                                      />
                                      <button
                                        onClick={(e) => { const input = (e.currentTarget.previousElementSibling as HTMLInputElement); if (input.value.trim()) { addCommonComment(input.value.trim()); input.value = ''; }}}
                                        className="px-1.5 py-0.5 bg-purple-600 text-white text-[10px] rounded hover:bg-purple-700"
                                      >
                                        Save
                                      </button>
                                    </div>
                                    <DebouncedTextarea
                                      initialValue={safeStr(patient.roundingData?.additionalComments)}
                                      onCommit={(value) => updateRoundingData(patient.id, 'additionalComments', value)}
                                      placeholder="Additional Comments"
                                      rows={2}
                                      className="w-full text-xs p-1.5 border rounded-lg mt-1"
                                    />
                                  </div>
                                </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </SortablePatient>
              );
            })}
          </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Floating Quick Add with Cat */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => addMorningTasksToAll()}
            className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black rounded-lg shadow-lg hover:from-yellow-500 hover:to-amber-500 transition-all transform hover:scale-105 flex items-center gap-1.5 text-sm"
            title="Add Morning Tasks To All Patients"
          >
            <span className="text-base">☀️</span>
            Morning
          </button>
           <button
            onClick={() => addEveningTasksToAll()}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 text-white rounded-lg shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all transform hover:scale-105 flex items-center gap-1.5 text-sm"
            title="Add Evening Tasks To All Patients"
          >
            <span className="text-base">🌙</span>
            Evening
          </button>
          <div className="text-3xl cursor-pointer" title="You're doing a great job! 🐾">
            🐈
          </div>
        </div>
      </div>
    </div>
  );
}
