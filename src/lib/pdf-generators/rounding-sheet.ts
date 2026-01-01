/**
 * Rounding Sheet PDF Generator
 *
 * Generates neurology rounding sheet PDF from patient data
 * Layout matches the RBVH Neurology Rounding Sheet format
 */

import { UnifiedPatient } from '@/contexts/PatientContext';
import { formatForRoundingSheet } from '@/lib/lab-parser';

/**
 * Generate rounding sheet PDF for multiple patients
 * Uses jsPDF and autoTable for table generation
 *
 * Note: This function returns HTML/data that can be used with jsPDF
 * Install with: npm install jspdf jspdf-autotable
 */

export interface RoundingSheetData {
  patient: string;
  signalment: string;
  location: string;
  icuCriteria: string;
  codeStatus: string;
  problems: string;
  diagnosticFindings: string;
  therapeutics: string;
  replaceIVC: string;
  replaceFluids: string;
  replaceCRI: string;
  overnightDx: string;
  overnightConcerns: string;
  comments: string;
}

/**
 * Format patient data for rounding sheet
 */
export function formatPatientForRoundingSheet(patient: UnifiedPatient): RoundingSheetData {
  const rd = patient.roundingData;

  // Format diagnostic findings from lab results
  const diagnosticFindings = rd?.labResults
    ? formatForRoundingSheet(
        rd.labResults.cbc,
        rd.labResults.chemistry,
        rd.chestXray?.findings
      )
    : rd?.diagnosticFindings || '';

  return {
    patient: patient.demographics.name,
    signalment: rd?.signalment ||
      `${patient.demographics.age || ''} ${patient.demographics.sex || ''} ${patient.demographics.breed || ''}, ${patient.demographics.weight || ''}`.trim(),
    location: rd?.location || patient.currentStay?.location || '',
    icuCriteria: rd?.icuCriteria || patient.currentStay?.icuCriteria || '',
    codeStatus: rd?.codeStatus || patient.currentStay?.codeStatus || '',
    problems: rd?.problems || '',
    diagnosticFindings,
    therapeutics: rd?.therapeutics || '',
    replaceIVC: rd?.ivc || '',
    replaceFluids: rd?.fluids || '',
    replaceCRI: rd?.cri || '',
    overnightDx: rd?.overnightDx || '',
    overnightConcerns: rd?.concerns || '',
    comments: rd?.comments || '',
  };
}

/**
 * Generate rounding sheet data for multiple patients
 */
export function generateRoundingSheetData(patients: UnifiedPatient[]): RoundingSheetData[] {
  // Filter to active patients only (exclude discharged)
  const activePatients = patients.filter(p => p.status !== 'Discharged');

  return activePatients.map(formatPatientForRoundingSheet);
}

/**
 * Generate HTML table for rounding sheet (for preview or printing)
 */
export function generateRoundingSheetHTML(patients: UnifiedPatient[]): string {
  const data = generateRoundingSheetData(patients);

  const headerNote = `Text/call BOTH Neuro Residents nightly with any concerns. If the patient is in the ICU and critical, please also have the ICU MD paged. Call the neurology resident for ANY acute neurologic change, ANY seizure, ANY acute change in mentation, or ANY concern.`;

  const rows = data.map(row => `
    <tr>
      <td>${escapeHtml(row.patient)}</td>
      <td>${escapeHtml(row.signalment)}</td>
      <td>${escapeHtml(row.location)}</td>
      <td>${escapeHtml(row.icuCriteria)}</td>
      <td>${escapeHtml(row.codeStatus)}</td>
      <td>${escapeHtml(row.problems)}</td>
      <td>${escapeHtml(row.diagnosticFindings)}</td>
      <td>${escapeHtml(row.therapeutics)}</td>
      <td>${escapeHtml(row.replaceIVC)}</td>
      <td>${escapeHtml(row.replaceFluids)}</td>
      <td>${escapeHtml(row.replaceCRI)}</td>
      <td>${escapeHtml(row.overnightDx)}</td>
      <td>${escapeHtml(row.overnightConcerns)}</td>
      <td>${escapeHtml(row.comments)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RBVH Neurology Rounding Sheet</title>
  <style>
    @page {
      size: landscape;
      margin: 0.5in;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      margin: 0.5in;
      color: #000;
    }

    .header-note {
      border: 1px solid #000;
      padding: 6px 8px;
      margin-bottom: 8px;
      font-size: 10px;
      font-weight: bold;
      background: #f0f0f0;
    }

    table.rounding {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    table.rounding th,
    table.rounding td {
      border: 1px solid #000;
      padding: 2px 3px;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    table.rounding th {
      text-align: center;
      font-weight: bold;
      background: #f0f0f0;
      font-size: 10px;
    }

    table.rounding td {
      font-size: 10px;
      white-space: pre-wrap;
    }

    /* Column widths */
    .col-patient { width: 8%; }
    .col-signalment { width: 10%; }
    .col-location { width: 6%; }
    .col-icu-criteria { width: 8%; }
    .col-code-status { width: 5%; }
    .col-problems { width: 12%; }
    .col-diagnostics { width: 10%; }
    .col-therapeutics { width: 10%; }
    .col-replace-ivc { width: 4%; }
    .col-replace-fluids { width: 4%; }
    .col-replace-cri { width: 4%; }
    .col-overnight-dx { width: 8%; }
    .col-overnight-conc { width: 8%; }
    .col-comments { width: 8%; }

    @media print {
      body { margin: 0; }
      .header-note { page-break-inside: avoid; }
      table.rounding tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header-note">${headerNote}</div>

  <table class="rounding">
    <thead>
      <tr>
        <th class="col-patient">Patient</th>
        <th class="col-signalment">Signalment</th>
        <th class="col-location">Location<br/>(Inpatient / ICU)</th>
        <th class="col-icu-criteria">If in ICU, does patient meet criteria?</th>
        <th class="col-code-status">Code<br/>Status</th>
        <th class="col-problems">Problems</th>
        <th class="col-diagnostics">Relevant diagnostic findings</th>
        <th class="col-therapeutics">Current therapeutics</th>
        <th class="col-replace-ivc">Replace<br/>IVC?</th>
        <th class="col-replace-fluids">Replace<br/>fluids?</th>
        <th class="col-replace-cri">Replace<br/>CRI?</th>
        <th class="col-overnight-dx">Overnight diagnostics</th>
        <th class="col-overnight-conc">Overnight concerns / alerts</th>
        <th class="col-comments">Additional comments</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate PDF using jsPDF (client-side)
 * This function should be called in a browser environment
 */
export async function generateRoundingSheetPDF(patients: UnifiedPatient[]): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;
  await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter',
  });

  const data = generateRoundingSheetData(patients);

  // Header note
  const headerNote = `Text/call BOTH Neuro Residents nightly with any concerns. If the patient is in the ICU and critical,
please also have the ICU MD paged. Call the neurology resident for ANY acute neurologic change, ANY seizure,
ANY acute change in mentation, or ANY concern.`;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Draw header note box
  const headerLines = doc.splitTextToSize(headerNote, 700);
  const headerHeight = headerLines.length * 12 + 12;
  doc.rect(30, 30, 710, headerHeight);
  doc.text(headerLines, 36, 42);

  // Table data
  const tableData = data.map(row => [
    row.patient,
    row.signalment,
    row.location,
    row.icuCriteria,
    row.codeStatus,
    row.problems,
    row.diagnosticFindings,
    row.therapeutics,
    row.replaceIVC,
    row.replaceFluids,
    row.replaceCRI,
    row.overnightDx,
    row.overnightConcerns,
    row.comments,
  ]);

  // @ts-ignore - autoTable is added as a plugin
  doc.autoTable({
    head: [[
      'Patient',
      'Signalment',
      'Location\n(IP / ICU)',
      'If in ICU,\nmeet criteria?',
      'Code\nStatus',
      'Problems',
      'Relevant diagnostic\nfindings',
      'Current\ntherapeutics',
      'Replace\nIVC?',
      'Replace\nfluids?',
      'Replace\nCRI?',
      'Overnight\ndiagnostics',
      'Overnight concerns\n/ alerts',
      'Additional\ncomments',
    ]],
    body: tableData,
    startY: 30 + headerHeight + 10,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'top',
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 50 },  // Patient
      1: { cellWidth: 60 },  // Signalment
      2: { cellWidth: 40 },  // Location
      3: { cellWidth: 50 },  // ICU Criteria
      4: { cellWidth: 35 },  // Code Status
      5: { cellWidth: 75 },  // Problems
      6: { cellWidth: 65 },  // Diagnostics
      7: { cellWidth: 70 },  // Therapeutics
      8: { cellWidth: 30 },  // IVC
      9: { cellWidth: 30 },  // Fluids
      10: { cellWidth: 30 }, // CRI
      11: { cellWidth: 55 }, // Overnight Dx
      12: { cellWidth: 60 }, // Overnight Concerns
      13: { cellWidth: 50 }, // Comments
    },
    margin: { left: 30, right: 30 },
  });

  return doc.output('blob');
}

/**
 * Download rounding sheet PDF
 */
export async function downloadRoundingSheetPDF(patients: UnifiedPatient[], filename = 'rounding-sheet.pdf') {
  const blob = await generateRoundingSheetPDF(patients);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
