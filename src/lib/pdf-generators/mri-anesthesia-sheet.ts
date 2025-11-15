/**
 * MRI Anesthesia Sheet PDF Generator
 *
 * Generates MRI anesthesia sheet with auto-calculated drug doses
 */

import { UnifiedPatient } from '@/contexts/PatientContext';
import { calculateMRIDosesFromWeight, formatMRIDosesForDisplay } from '@/lib/mri-calculator';

export interface MRIAnesthesiaData {
  patientName: string;
  weight: string;
  weightLbs: string;
  mriRegion: string;
  mriTime: string;
  npoTime: string;
  asaStatus: string;
  opioidName: string;
  opioidDose: string;
  valiumDose: string;
  contrastVolume: string;
}

/**
 * Format patient data for MRI anesthesia sheet
 */
export function formatPatientForMRISheet(patient: UnifiedPatient): MRIAnesthesiaData | null {
  const mri = patient.mriData;

  if (!mri || !mri.scanType) {
    return null;
  }

  // Calculate doses if not already calculated
  const calculatedDoses = mri.calculatedDoses ||
    calculateMRIDosesFromWeight(patient.demographics.weight, mri.scanType);

  if (!calculatedDoses) {
    return null;
  }

  const weight = patient.demographics.weight || mri.weight || '';
  const weightKg = parseFloat(weight.replace(/[^\d.]/g, ''));
  const weightLbs = (weightKg * 2.20462).toFixed(1);

  return {
    patientName: patient.demographics.name,
    weight: `${weightKg}kg`,
    weightLbs: `${weightLbs}lbs`,
    mriRegion: mri.scanType,
    mriTime: mri.scheduledTime
      ? new Date(mri.scheduledTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '',
    npoTime: mri.npoTime
      ? new Date(mri.npoTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '',
    asaStatus: mri.asaStatus ? `ASA ${mri.asaStatus}` : '',
    opioidName: calculatedDoses.opioid.name,
    opioidDose: `${calculatedDoses.opioid.doseMg}mg (${calculatedDoses.opioid.volumeMl}mL)`,
    valiumDose: `${calculatedDoses.valium.doseMg}mg (${calculatedDoses.valium.volumeMl}mL)`,
    contrastVolume: `${calculatedDoses.contrast.volumeMl}mL`,
  };
}

/**
 * Generate HTML for MRI anesthesia sheet
 */
export function generateMRISheetHTML(patient: UnifiedPatient): string | null {
  const data = formatPatientForMRISheet(patient);

  if (!data) {
    return null;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MRI Anesthesia Sheet - ${data.patientName}</title>
  <style>
    @page {
      size: portrait;
      margin: 0.5in;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      margin: 0.5in;
      color: #000;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    h1 {
      font-size: 20px;
      margin: 0 0 10px 0;
      font-weight: bold;
    }

    .sticker-space {
      border: 2px dashed #666;
      height: 120px;
      margin: 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9f9f9;
      font-size: 14px;
      color: #666;
      font-weight: bold;
    }

    .patient-info {
      margin: 20px 0;
      line-height: 1.8;
    }

    .patient-info .row {
      display: flex;
      margin: 5px 0;
    }

    .patient-info .label {
      font-weight: bold;
      width: 180px;
    }

    .patient-info .value {
      flex: 1;
      border-bottom: 1px solid #000;
      padding-left: 5px;
    }

    .drug-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }

    .drug-table th,
    .drug-table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }

    .drug-table th {
      background: #f0f0f0;
      font-weight: bold;
    }

    .drug-table td.drug-name {
      font-weight: bold;
      width: 40%;
    }

    .drug-table td.dose {
      width: 30%;
    }

    .drug-table td.volume {
      width: 30%;
    }

    .notes {
      margin-top: 30px;
      padding: 15px;
      border: 1px solid #000;
      background: #f9f9f9;
    }

    .notes-title {
      font-weight: bold;
      margin-bottom: 10px;
    }

    .notes-space {
      height: 150px;
      border: 1px solid #ccc;
      padding: 5px;
    }

    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MRI ANESTHESIA SHEET</h1>
    <div>RBVH Neurology & Neurosurgery</div>
  </div>

  <div class="sticker-space">
    [PLACE PATIENT STICKER HERE]
  </div>

  <div class="patient-info">
    <div class="row">
      <div class="label">Patient Name:</div>
      <div class="value">${escapeHtml(data.patientName)}</div>
    </div>
    <div class="row">
      <div class="label">Weight:</div>
      <div class="value">${data.weight} (${data.weightLbs})</div>
    </div>
    <div class="row">
      <div class="label">MRI Region:</div>
      <div class="value">${data.mriRegion}</div>
    </div>
    <div class="row">
      <div class="label">Scheduled Time:</div>
      <div class="value">${data.mriTime}</div>
    </div>
    <div class="row">
      <div class="label">NPO from:</div>
      <div class="value">${data.npoTime}</div>
    </div>
    <div class="row">
      <div class="label">ASA Status:</div>
      <div class="value">${data.asaStatus}</div>
    </div>
  </div>

  <table class="drug-table">
    <thead>
      <tr>
        <th>Drug</th>
        <th>Dose (mg)</th>
        <th>Volume (mL)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="drug-name">${data.opioidName}</td>
        <td class="dose">${data.opioidDose.split('(')[0].trim()}</td>
        <td class="volume">${data.opioidDose.match(/\((.*?)\)/)?.[1] || ''}</td>
      </tr>
      <tr>
        <td class="drug-name">Diazepam (Valium)</td>
        <td class="dose">${data.valiumDose.split('(')[0].trim()}</td>
        <td class="volume">${data.valiumDose.match(/\((.*?)\)/)?.[1] || ''}</td>
      </tr>
      <tr>
        <td class="drug-name">Contrast (Gadolinium)</td>
        <td class="dose">-</td>
        <td class="volume">${data.contrastVolume}</td>
      </tr>
    </tbody>
  </table>

  <div class="notes">
    <div class="notes-title">Anesthesia Notes / Monitoring:</div>
    <div class="notes-space"></div>
  </div>
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
 * Generate MRI anesthesia sheet PDF using jsPDF
 */
export async function generateMRISheetPDF(patient: UnifiedPatient): Promise<Blob | null> {
  const data = formatPatientForMRISheet(patient);

  if (!data) {
    return null;
  }

  const jsPDF = (await import('jspdf')).default;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('MRI ANESTHESIA SHEET', pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('RBVH Neurology & Neurosurgery', pageWidth / 2, 70, { align: 'center' });

  // Sticker space
  doc.setLineWidth(1);
  doc.setLineDash([5, 3]);
  doc.rect(margin, 90, pageWidth - (margin * 2), 100);
  doc.setLineDash([]);

  doc.setFontSize(14);
  doc.setTextColor(150);
  doc.text('[PLACE PATIENT STICKER HERE]', pageWidth / 2, 145, { align: 'center' });
  doc.setTextColor(0);

  // Patient info
  let yPos = 220;
  const labelWidth = 150;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');

  const patientInfo = [
    ['Patient Name:', data.patientName],
    ['Weight:', `${data.weight} (${data.weightLbs})`],
    ['MRI Region:', data.mriRegion],
    ['Scheduled Time:', data.mriTime],
    ['NPO from:', data.npoTime],
    ['ASA Status:', data.asaStatus],
  ];

  patientInfo.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, margin, yPos);
    doc.setFont(undefined, 'normal');

    // Draw underline
    doc.line(margin + labelWidth, yPos + 2, pageWidth - margin, yPos + 2);
    doc.text(value, margin + labelWidth + 5, yPos);

    yPos += 25;
  });

  // Drug table
  yPos += 30;

  const tableData = [
    [data.opioidName, data.opioidDose.split('(')[0].trim(), data.opioidDose.match(/\((.*?)\)/)?.[1] || ''],
    ['Diazepam (Valium)', data.valiumDose.split('(')[0].trim(), data.valiumDose.match(/\((.*?)\)/)?.[1] || ''],
    ['Contrast (Gadolinium)', '-', data.contrastVolume],
  ];

  // @ts-ignore - autoTable is added as a plugin
  await import('jspdf-autotable');

  // @ts-ignore
  doc.autoTable({
    head: [['Drug', 'Dose (mg)', 'Volume (mL)']],
    body: tableData,
    startY: yPos,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 12,
      cellPadding: 8,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 200 },
      1: { cellWidth: 100 },
      2: { cellWidth: 100 },
    },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 30;

  // Notes section
  doc.setFillColor(249, 249, 249);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 200, 'FD');

  doc.setFont(undefined, 'bold');
  doc.text('Anesthesia Notes / Monitoring:', margin + 10, yPos + 20);

  doc.setFont(undefined, 'normal');
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.rect(margin + 10, yPos + 30, pageWidth - (margin * 2) - 20, 160);

  return doc.output('blob');
}

/**
 * Download MRI anesthesia sheet PDF
 */
export async function downloadMRISheetPDF(patient: UnifiedPatient, filename?: string) {
  const blob = await generateMRISheetPDF(patient);

  if (!blob) {
    throw new Error('Could not generate MRI sheet - missing MRI data');
  }

  const url = URL.createObjectURL(blob);
  const defaultFilename = `mri-anesthesia-${patient.demographics.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate MRI sheets for multiple patients (batch)
 */
export async function generateBatchMRISheetsPDF(patients: UnifiedPatient[]): Promise<Blob> {
  const mriPatients = patients.filter(p => p.mriData?.scanType);

  const jsPDF = (await import('jspdf')).default;
  await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let isFirstPage = true;

  for (const patient of mriPatients) {
    const data = formatPatientForMRISheet(patient);

    if (!data) continue;

    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    // Generate page content (reuse logic from generateMRISheetPDF)
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('MRI ANESTHESIA SHEET', pageWidth / 2, 50, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('RBVH Neurology & Neurosurgery', pageWidth / 2, 70, { align: 'center' });

    // Sticker space
    doc.setLineWidth(1);
    doc.setLineDash([5, 3]);
    doc.rect(margin, 90, pageWidth - (margin * 2), 100);
    doc.setLineDash([]);

    doc.setFontSize(14);
    doc.setTextColor(150);
    doc.text('[PLACE PATIENT STICKER HERE]', pageWidth / 2, 145, { align: 'center' });
    doc.setTextColor(0);

    // Patient info
    let yPos = 220;
    const labelWidth = 150;

    doc.setFontSize(12);

    const patientInfo = [
      ['Patient Name:', data.patientName],
      ['Weight:', `${data.weight} (${data.weightLbs})`],
      ['MRI Region:', data.mriRegion],
      ['Scheduled Time:', data.mriTime],
      ['NPO from:', data.npoTime],
      ['ASA Status:', data.asaStatus],
    ];

    patientInfo.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.line(margin + labelWidth, yPos + 2, pageWidth - margin, yPos + 2);
      doc.text(value, margin + labelWidth + 5, yPos);
      yPos += 25;
    });

    // Drug table
    yPos += 30;

    const tableData = [
      [data.opioidName, data.opioidDose.split('(')[0].trim(), data.opioidDose.match(/\((.*?)\)/)?.[1] || ''],
      ['Diazepam (Valium)', data.valiumDose.split('(')[0].trim(), data.valiumDose.match(/\((.*?)\)/)?.[1] || ''],
      ['Contrast (Gadolinium)', '-', data.contrastVolume],
    ];

    // @ts-ignore
    doc.autoTable({
      head: [['Drug', 'Dose (mg)', 'Volume (mL)']],
      body: tableData,
      startY: yPos,
      margin: { left: margin, right: margin },
      styles: { fontSize: 12, cellPadding: 8 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 200 },
        1: { cellWidth: 100 },
        2: { cellWidth: 100 },
      },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 30;

    // Notes section
    doc.setFillColor(249, 249, 249);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 200, 'FD');
    doc.setFont(undefined, 'bold');
    doc.text('Anesthesia Notes / Monitoring:', margin + 10, yPos + 20);
    doc.setFont(undefined, 'normal');
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.rect(margin + 10, yPos + 30, pageWidth - (margin * 2) - 20, 160);
  }

  return doc.output('blob');
}
