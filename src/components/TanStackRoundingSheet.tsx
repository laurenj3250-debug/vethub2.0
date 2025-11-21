'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Save, Copy, ExternalLink, Sparkles, RotateCcw, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  Row,
} from '@tanstack/react-table';
import { usePatientContext, UnifiedPatient } from '@/contexts/PatientContext';
import { autoFillRoundingData } from '@/lib/rounding-auto-fill';
import { carryForwardRoundingData } from '@/lib/rounding-carry-forward';
import { AutoCompleteInput } from '@/components/AutoCompleteInput';

// ============================================================================
// TYPES
// ============================================================================

interface RoundingData {
  signalment?: string;
  location?: string;
  icuCriteria?: string;
  code?: 'Green' | 'Yellow' | 'Orange' | 'Red' | '';
  problems?: string;
  diagnosticFindings?: string;
  therapeutics?: string;
  ivc?: string;
  fluids?: string;
  cri?: string;
  overnightDx?: string;
  concerns?: string;
  comments?: string;
  dayCount?: number;
  lastUpdated?: string;
}

interface TablePatient extends UnifiedPatient {
  roundingDataEditing: RoundingData;
  autoFilledFields: Set<string>;
}

interface TanStackRoundingSheetProps {
  toast: (options: any) => void;
}

// ============================================================================
// EDITABLE CELL COMPONENTS
// ============================================================================

interface EditableCellProps {
  getValue: () => any;
  row: Row<TablePatient>;
  column: { id: string };
  table: any;
  isAutoFilled?: boolean;
}

// Text Input Cell
const EditableTextCell: React.FC<EditableCellProps> = ({ getValue, row, column, table, isAutoFilled }) => {
  const initialValue = getValue() || '';
  const [value, setValue] = useState(initialValue);

  const onBlur = () => {
    table.options.meta?.updateData(row.original.id, column.id, value);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        className={`w-full px-2 py-1 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          isAutoFilled ? 'bg-blue-900/30' : 'bg-slate-900'
        }`}
        title={isAutoFilled ? 'Auto-filled - click to edit' : ''}
      />
      {isAutoFilled && (
        <Sparkles size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
      )}
    </div>
  );
};

// Textarea Cell
const EditableTextareaCell: React.FC<EditableCellProps & { field: string }> = ({ getValue, row, column, table, field }) => {
  const initialValue = getValue() || '';
  const [value, setValue] = useState(initialValue);

  const onBlur = () => {
    table.options.meta?.updateData(row.original.id, column.id, value);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <AutoCompleteInput
      field={field}
      value={value}
      onChange={(newValue) => {
        setValue(newValue);
        table.options.meta?.updateData(row.original.id, column.id, newValue);
      }}
      multiline={true}
      rows={2}
      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
    />
  );
};

// Simple Textarea (no autocomplete)
const SimpleTextareaCell: React.FC<EditableCellProps> = ({ getValue, row, column, table }) => {
  const initialValue = getValue() || '';
  const [value, setValue] = useState(initialValue);

  const onBlur = () => {
    table.options.meta?.updateData(row.original.id, column.id, value);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      rows={2}
      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
    />
  );
};

// Dropdown Cell
const EditableSelectCell: React.FC<EditableCellProps & { options: string[] }> = ({ getValue, row, column, table, options, isAutoFilled }) => {
  const initialValue = getValue() || '';
  const [value, setValue] = useState(initialValue);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    table.options.meta?.updateData(row.original.id, column.id, newValue);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`w-full px-2 py-1 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          isAutoFilled ? 'bg-blue-900/30' : 'bg-slate-900'
        }`}
        title={isAutoFilled ? 'Auto-filled - click to edit' : ''}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {isAutoFilled && (
        <RotateCcw size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
      )}
    </div>
  );
};

// Code Status Cell (with color coding)
const CodeStatusCell: React.FC<EditableCellProps> = ({ getValue, row, column, table, isAutoFilled }) => {
  const initialValue = getValue() || '';
  const [value, setValue] = useState(initialValue);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    table.options.meta?.updateData(row.original.id, column.id, newValue);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const getColorClass = (status: string) => {
    switch (status) {
      case 'Green':
        return 'text-green-500';
      case 'Yellow':
        return 'text-yellow-500';
      case 'Orange':
        return 'text-orange-500';
      case 'Red':
        return 'text-red-500';
      default:
        return '';
    }
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`w-full px-2 py-1 border-none text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          isAutoFilled ? 'bg-blue-900/30' : 'bg-slate-900'
        } ${getColorClass(value)}`}
        title={isAutoFilled ? 'Auto-filled - click to edit' : ''}
      >
        <option value="">Select...</option>
        <option value="Green" className="text-green-500">Green</option>
        <option value="Yellow" className="text-yellow-500">Yellow</option>
        <option value="Orange" className="text-orange-500">Orange</option>
        <option value="Red" className="text-red-500">Red</option>
      </select>
      {isAutoFilled && (
        <RotateCcw size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TanStackRoundingSheet({ toast }: TanStackRoundingSheetProps) {
  const { patients, updatePatient, loadPatients } = usePatientContext();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [saveTimers, setSaveTimers] = useState<Map<number, NodeJS.Timeout>>(new Map());
  const [saveStatus, setSaveStatus] = useState<Map<number, 'saving' | 'saved' | 'error'>>(new Map());
  const [editingData, setEditingData] = useState<Record<number, RoundingData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveDelay = 2000; // 2 seconds

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      saveTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [saveTimers]);

  // Filter active patients
  const activePatients = useMemo(() => {
    return patients.filter((p) => p.status !== 'Discharged');
  }, [patients]);

  // Transform patients to table data with auto-fill
  const tableData = useMemo<TablePatient[]>(() => {
    return activePatients.map((patient) => {
      const previousData = patient.roundingData || {};

      // Step 1: Carry forward from yesterday
      const carryResult = carryForwardRoundingData(previousData);

      // Step 2: Auto-fill from demographics
      const autoFillResult = autoFillRoundingData({
        demographics: patient.demographics,
        currentStay: patient.currentStay,
        roundingData: previousData,
      });

      // Merge carry-forward and auto-fill data
      const mergedData: RoundingData = {
        ...carryResult.data,
        ...autoFillResult,
      };

      // Track which fields were auto-filled
      const autoFields = new Set<string>([
        ...autoFillResult.autoFilledFields,
        ...autoFillResult.carriedForwardFields,
      ]);

      // Use editing data if available, otherwise use merged data
      const roundingDataEditing = editingData[patient.id] || mergedData;

      return {
        ...patient,
        roundingDataEditing,
        autoFilledFields: autoFields,
      };
    });
  }, [activePatients, editingData]);

  // Auto-save function
  const autoSave = useCallback(async (patientId: number, data: RoundingData) => {
    try {
      setSaveStatus((prev) => new Map(prev).set(patientId, 'saving'));

      const dataWithTimestamp = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };

      await updatePatient(patientId, {
        roundingData: dataWithTimestamp,
      });

      setSaveStatus((prev) => new Map(prev).set(patientId, 'saved'));

      // Clear "saved" status after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => {
          const newMap = new Map(prev);
          newMap.delete(patientId);
          return newMap;
        });
      }, 2000);

      // Clear editing data after successful save
      setEditingData((prev) => {
        const newData = { ...prev };
        delete newData[patientId];
        return newData;
      });

      await loadPatients();
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus((prev) => new Map(prev).set(patientId, 'error'));

      setTimeout(() => {
        setSaveStatus((prev) => {
          const newMap = new Map(prev);
          newMap.delete(patientId);
          return newMap;
        });
      }, 5000);
    }
  }, [updatePatient, loadPatients]);

  // Column definitions
  const columns = useMemo<ColumnDef<TablePatient>[]>(
    () => [
      {
        id: 'patient',
        accessorFn: (row) => row.demographics.name,
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 hover:text-emerald-400"
          >
            Patient <ArrowUpDown size={14} />
          </button>
        ),
        cell: ({ row }) => {
          const patient = row.original;
          const hasAutoFill = patient.autoFilledFields.size > 0;
          const dayCount = patient.roundingDataEditing.dayCount;

          return (
            <Link
              href={`/?patient=${patient.id}`}
              className="group flex flex-col gap-1 hover:text-emerald-400 transition"
            >
              <div className="flex items-center gap-2">
                <div className="font-medium text-white group-hover:text-emerald-400">
                  {patient.demographics.name}
                </div>
                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-emerald-400" />
              </div>
              <div className="text-xs text-slate-400">
                {patient.demographics.age} {patient.demographics.breed}
              </div>
              {hasAutoFill && (
                <div className="flex items-center gap-1 text-xs text-blue-400">
                  <Sparkles size={10} />
                  {patient.autoFilledFields.size} auto-filled
                  {dayCount && ` • Day ${dayCount}`}
                </div>
              )}
            </Link>
          );
        },
        enableSorting: true,
        size: 150,
      },
      {
        id: 'signalment',
        accessorFn: (row) => row.roundingDataEditing.signalment,
        header: 'Signalment',
        cell: ({ getValue, row, column, table }) => (
          <EditableTextCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            isAutoFilled={row.original.autoFilledFields.has('signalment')}
          />
        ),
        size: 150,
      },
      {
        id: 'location',
        accessorFn: (row) => row.roundingDataEditing.location,
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 hover:text-emerald-400"
          >
            Location <ArrowUpDown size={14} />
          </button>
        ),
        cell: ({ getValue, row, column, table }) => (
          <EditableSelectCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            options={['IP', 'ICU']}
            isAutoFilled={row.original.autoFilledFields.has('location')}
          />
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'icuCriteria',
        accessorFn: (row) => row.roundingDataEditing.icuCriteria,
        header: 'ICU Criteria',
        cell: ({ getValue, row, column, table }) => (
          <EditableSelectCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            options={['Yes', 'No', 'n/a']}
            isAutoFilled={row.original.autoFilledFields.has('icuCriteria')}
          />
        ),
        size: 100,
      },
      {
        id: 'code',
        accessorFn: (row) => row.roundingDataEditing.code,
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 hover:text-emerald-400"
          >
            Code Status <ArrowUpDown size={14} />
          </button>
        ),
        cell: ({ getValue, row, column, table }) => (
          <CodeStatusCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            isAutoFilled={row.original.autoFilledFields.has('code')}
          />
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'problems',
        accessorFn: (row) => row.roundingDataEditing.problems,
        header: 'Problems',
        cell: ({ getValue, row, column, table }) => (
          <EditableTextareaCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            field="problems"
          />
        ),
        size: 200,
      },
      {
        id: 'diagnosticFindings',
        accessorFn: (row) => row.roundingDataEditing.diagnosticFindings,
        header: 'Diagnostic Findings',
        cell: ({ getValue, row, column, table }) => (
          <EditableTextareaCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            field="diagnostics"
          />
        ),
        size: 200,
      },
      {
        id: 'therapeutics',
        accessorFn: (row) => row.roundingDataEditing.therapeutics,
        header: 'Therapeutics',
        cell: ({ getValue, row, column, table }) => (
          <EditableTextareaCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            field="therapeutics"
          />
        ),
        size: 200,
      },
      {
        id: 'ivc',
        accessorFn: (row) => row.roundingDataEditing.ivc,
        header: 'IVC',
        cell: ({ getValue, row, column, table }) => (
          <EditableSelectCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            options={['Yes', 'No']}
          />
        ),
        size: 80,
      },
      {
        id: 'fluids',
        accessorFn: (row) => row.roundingDataEditing.fluids,
        header: 'Fluids',
        cell: ({ getValue, row, column, table }) => (
          <EditableSelectCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            options={['Yes', 'No', 'n/a']}
          />
        ),
        size: 100,
      },
      {
        id: 'cri',
        accessorFn: (row) => row.roundingDataEditing.cri,
        header: 'CRI',
        cell: ({ getValue, row, column, table }) => (
          <EditableSelectCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            options={['Yes', 'No', 'No but...', 'Yet but...']}
          />
        ),
        size: 100,
      },
      {
        id: 'overnightDx',
        accessorFn: (row) => row.roundingDataEditing.overnightDx,
        header: 'Overnight Dx',
        cell: ({ getValue, row, column, table }) => (
          <SimpleTextareaCell getValue={getValue} row={row} column={column} table={table} />
        ),
        size: 150,
      },
      {
        id: 'concerns',
        accessorFn: (row) => row.roundingDataEditing.concerns,
        header: 'Concerns',
        cell: ({ getValue, row, column, table }) => (
          <EditableTextareaCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
            field="concerns"
          />
        ),
        size: 150,
      },
      {
        id: 'comments',
        accessorFn: (row) => row.roundingDataEditing.comments,
        header: 'Additional Comments',
        cell: ({ getValue, row, column, table }) => (
          <SimpleTextareaCell getValue={getValue} row={row} column={column} table={table} />
        ),
        size: 200,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const patient = row.original;
          const hasChanges = editingData[patient.id] !== undefined;
          const status = saveStatus.get(patient.id);

          return (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => copyPatientRow(patient)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition flex items-center justify-center gap-1"
                title="Copy this patient's row"
              >
                <Copy size={12} />
                Copy
              </button>
              <button
                onClick={() => handleSavePatient(patient.id)}
                disabled={!hasChanges || isSaving}
                className={`px-3 py-1 rounded text-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  status === 'saving'
                    ? 'bg-yellow-600'
                    : status === 'saved'
                    ? 'bg-green-600'
                    : status === 'error'
                    ? 'bg-red-600'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                } text-white`}
              >
                {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save'}
              </button>
            </div>
          );
        },
        size: 80,
      },
    ],
    [editingData, saveStatus, isSaving]
  );

  // Table instance
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    meta: {
      updateData: (patientId: number, fieldId: string, value: any) => {
        // Get current patient data
        const patient = tableData.find((p) => p.id === patientId);
        if (!patient) return;

        // Update editing data
        const currentData = editingData[patientId] || patient.roundingDataEditing;
        const updatedData = {
          ...currentData,
          [fieldId]: value,
        };

        setEditingData((prev) => ({
          ...prev,
          [patientId]: updatedData,
        }));

        // Clear existing timer for this patient
        const existingTimer = saveTimers.get(patientId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Set new timer for auto-save
        const newTimer = setTimeout(() => {
          autoSave(patientId, updatedData);
          setSaveTimers((prev) => {
            const newMap = new Map(prev);
            newMap.delete(patientId);
            return newMap;
          });
        }, autoSaveDelay);

        setSaveTimers((prev) => new Map(prev).set(patientId, newTimer));
      },
    },
  });

  // Handle manual save
  const handleSavePatient = async (patientId: number) => {
    const data = editingData[patientId];
    if (!data) return;

    // Clear existing timer
    const existingTimer = saveTimers.get(patientId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      setSaveTimers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(patientId);
        return newMap;
      });
    }

    await autoSave(patientId, data);
  };

  // Handle save all
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const timestamp = new Date().toISOString();

      const promises = Object.entries(editingData).map(([patientId, data]) =>
        updatePatient(Number(patientId), {
          roundingData: { ...data, lastUpdated: timestamp },
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Saved All',
        description: `Saved ${promises.length} patient${promises.length > 1 ? 's' : ''}`,
      });

      setEditingData({});
      await loadPatients();
    } catch (error) {
      console.error('Failed to save all:', error);
      toast({
        title: 'Error',
        description: 'Failed to save some patients',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Copy patient row
  const copyPatientRow = (patient: TablePatient) => {
    const data = patient.roundingDataEditing;
    const row = [
      patient.demographics.name,
      data.signalment || '',
      data.location || '',
      data.icuCriteria || '',
      data.code || '',
      data.problems || '',
      data.diagnosticFindings || '',
      data.therapeutics || '',
      data.ivc || '',
      data.fluids || '',
      data.cri || '',
      data.overnightDx || '',
      data.concerns || '',
      data.comments || '',
    ].join('\t');

    navigator.clipboard.writeText(row);

    toast({
      title: 'Patient Row Copied',
      description: `${patient.demographics.name}'s data copied to clipboard`,
    });
  };

  // Export to TSV
  const exportToTSV = () => {
    const headers = [
      'Patient',
      'Signalment',
      'Location',
      'ICU Criteria',
      'Code Status',
      'Problems',
      'Diagnostic Findings',
      'Therapeutics',
      'IVC',
      'Fluids',
      'CRI',
      'Overnight Dx',
      'Concerns',
      'Additional Comments',
    ];

    const rows = tableData.map((patient) => {
      const data = patient.roundingDataEditing;
      return [
        patient.demographics.name,
        data.signalment || '',
        data.location || '',
        data.icuCriteria || '',
        data.code || '',
        data.problems || '',
        data.diagnosticFindings || '',
        data.therapeutics || '',
        data.ivc || '',
        data.fluids || '',
        data.cri || '',
        data.overnightDx || '',
        data.concerns || '',
        data.comments || '',
      ].join('\t');
    });

    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv);

    toast({
      title: 'Copied to Clipboard',
      description: 'Rounding sheet copied as TSV (paste into Google Sheets)',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="text-white">
          <h2 className="text-xl font-bold">Rounding Sheet (TanStack Table)</h2>
          <p className="text-sm text-slate-400">{activePatients.length} active patients</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search all fields..."
            className="px-3 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={exportToTSV}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <Copy size={16} />
            Copy to Clipboard
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving || Object.keys(editingData).length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={16} />
            Save All {Object.keys(editingData).length > 0 && `(${Object.keys(editingData).length})`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-slate-800 rounded-lg overflow-hidden">
          <thead className="bg-slate-700 text-white text-xs sticky top-0 z-20">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="p-2 text-left border border-slate-600"
                    style={{ minWidth: `${header.column.getSize()}px` }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const hasChanges = editingData[row.original.id] !== undefined;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-slate-700 ${hasChanges ? 'bg-emerald-900/20' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-1 border border-slate-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activePatients.length === 0 && (
        <div className="text-center text-slate-400 py-8">No active patients to display</div>
      )}
    </div>
  );
}
