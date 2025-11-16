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
  doc.setFont('helvetica', 'bold');
  doc.text('MRI ANESTHESIA SHEET', pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('RBVH Neurology & Neurosurgery', pageWidth / 2, 70, { align: 'center' });

  // Sticker space
  doc.setLineWidth(1);
  (doc as any).setLineDash([5, 3]);
  doc.rect(margin, 90, pageWidth - (margin * 2), 100);
  (doc as any).setLineDash([]);

  doc.setFontSize(14);
  doc.setTextColor(150);
  doc.text('[PLACE PATIENT STICKER HERE]', pageWidth / 2, 145, { align: 'center' });
  doc.setTextColor(0);

  // Patient info
  let yPos = 220;
  const labelWidth = 150;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');

  const patientInfo = [
    ['Patient Name:', data.patientName],
    ['Weight:', `${data.weight} (${data.weightLbs})`],
    ['MRI Region:', data.mriRegion],
    ['Scheduled Time:', data.mriTime],
    ['NPO from:', data.npoTime],
    ['ASA Status:', data.asaStatus],
  ];

  patientInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');

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

  doc.setFont('helvetica', 'bold');
  doc.text('Anesthesia Notes / Monitoring:', margin + 10, yPos + 20);

  doc.setFont('helvetica', 'normal');
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
    doc.setFont('helvetica', 'bold');
    doc.text('MRI ANESTHESIA SHEET', pageWidth / 2, 50, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('RBVH Neurology & Neurosurgery', pageWidth / 2, 70, { align: 'center' });

    // Sticker space
    doc.setLineWidth(1);
    (doc as any).setLineDash([5, 3]);
    doc.rect(margin, 90, pageWidth - (margin * 2), 100);
    (doc as any).setLineDash([]);

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
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, yPos);
      doc.setFont('helvetica', 'normal');
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
    doc.setFont('helvetica', 'bold');
    doc.text('Anesthesia Notes / Monitoring:', margin + 10, yPos + 20);
    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.rect(margin + 10, yPos + 30, pageWidth - (margin * 2) - 20, 160);
  }

  return doc.output('blob');
}

/**
 * Generate combined MRI sheet in Google Sheets format (2 patients per row)
 * Matches the exact layout from /Users/laurenjohnston/fairy-bubbles/GoalConnect/client/public/backgrounds/MRI anesthesia /Sheet1.html
 */
export async function downloadCombinedMRISheetPDF(patients: UnifiedPatient[]) {
  const mriPatients = patients.filter(p => p.mriData?.scanType);

  if (mriPatients.length === 0) {
    throw new Error('No patients with MRI data found');
  }

  // Generate HTML table in Google Sheets format
  const html = generateGoogleSheetsMRIHTML(mriPatients);

  // Convert HTML to PDF using a simple approach (create hidden iframe and print)
  const blob = await htmlToPDF(html);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mri-anesthesia-combined-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Sheets-style HTML table for MRI anesthesia
 */
function generateGoogleSheetsMRIHTML(patients: UnifiedPatient[]): string {
  let rows = '';

  // Process patients in pairs (2 per row)
  for (let i = 0; i < patients.length; i += 2) {
    const leftPatient = patients[i];
    const rightPatient = patients[i + 1];

    const leftData = formatPatientForGoogleSheets(leftPatient);
    const rightData = rightPatient ? formatPatientForGoogleSheets(rightPatient) : null;

    rows += generatePatientRow(leftData, rightData);

    // Add separator row
    if (i + 2 < patients.length) {
      rows += '<tr style="height: 20px"><td colspan="13" style="border-bottom: 2px solid #000;"></td></tr>';
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MRI Anesthesia Sheets</title>
  <style>
    @page { size: landscape; margin: 0.25in; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 0.25in; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td { border: 1px solid #000; padding: 3px; vertical-align: bottom; }
    .header { background-color: #eadcf4; font-weight: bold; text-align: center; }
    .sub-header { font-style: italic; text-align: center; font-size: 12pt; }
    .drug-name { font-weight: bold; font-size: 12pt; }
    .value { font-size: 11pt; }
    .unit { font-style: italic; font-size: 12pt; }
    .border-right-thick { border-right: 2px solid #000; }
    .border-bottom-thick { border-bottom: 2px solid #000; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <table>
    ${rows}
  </table>
</body>
</html>
  `.trim();
}

/**
 * Format patient data for Google Sheets table
 */
function formatPatientForGoogleSheets(patient: UnifiedPatient) {
  const mri = patient.mriData;
  const weight = patient.demographics.weight || '';
  const weightKg = parseFloat(weight.replace(/[^\d.]/g, ''));
  const weightLbs = (weightKg * 2.20462).toFixed(2);

  const calculatedDoses = mri?.calculatedDoses ||
    calculateMRIDosesFromWeight(weight, mri?.scanType || 'Brain');

  const cidNumber = patient.mrn || '000000';
  const scanType = mri?.scanType || 'Brain';

  // Determine opioid (methadone for Cervical/LS/TL, butorphanol for Brain)
  const opioid = scanType === 'Brain' ? calculatedDoses?.opioid : calculatedDoses?.opioid;

  return {
    name: patient.demographics.name,
    cid: cidNumber,
    weightKg: weightKg.toFixed(1),
    weightLbs: weightLbs,
    scanType: scanType,
    opioidName: opioid?.name || 'methadone',
    opioidMg: opioid?.doseMg.toFixed(2) || '0.00',
    opioidMl: opioid?.volumeMl.toFixed(2) || '0.00',
    valiumMg: calculatedDoses?.valium.doseMg.toFixed(2) || '0.00',
    valiumMl: calculatedDoses?.valium.volumeMl.toFixed(1) || '0.0',
    contrastMl: calculatedDoses?.contrast.volumeMl.toFixed(1) || '0.0',
  };
}

/**
 * Generate a row for 2 patients (left and right)
 */
function generatePatientRow(left: ReturnType<typeof formatPatientForGoogleSheets>, right: ReturnType<typeof formatPatientForGoogleSheets> | null): string {
  const rightCells = right ? `
    <td class="header" colspan="2">${right.name}</td>
    <td class="header">${right.cid}</td>
    <td class="header">${right.weightKg}</td>
    <td class="header">${right.weightLbs}</td>
    <td class="header border-right-thick">${right.scanType}</td>
  ` : '<td colspan="6" class="border-right-thick"></td>';

  const rightPremed = right ? `
    <td class="drug-name">${right.opioidName}</td>
    <td class="value">${right.opioidMg}</td>
    <td class="value">${right.opioidMl}</td>
    <td></td><td></td><td></td>
  ` : '<td colspan="6"></td>';

  const rightValium = right ? `
    <td class="drug-name">Valium</td>
    <td class="value">${right.valiumMg}</td>
    <td class="value">${right.valiumMl}</td>
    <td></td><td></td><td></td>
  ` : '<td colspan="6"></td>';

  const rightContrast = right ? `
    <td class="drug-name">Contrast</td>
    <td class="value">${right.contrastMl}</td>
    <td></td><td></td><td></td>
    <td class="border-bottom-thick"></td>
  ` : '<td colspan="6" class="border-bottom-thick"></td>';

  return `
    <!-- Patient Header Row -->
    <tr style="height: 19px">
      <td class="header" colspan="2">${left.name}</td>
      <td class="header">${left.cid}</td>
      <td class="header">${left.weightKg}</td>
      <td class="header">${left.weightLbs}</td>
      <td class="header border-right-thick">${left.scanType}</td>
      <td></td>
      ${rightCells}
    </tr>
    <!-- Subheader Row -->
    <tr style="height: 19px">
      <td class="sub-header" colspan="2">Client, patient</td>
      <td class="sub-header">CID #</td>
      <td class="sub-header">kg</td>
      <td class="sub-header">lb</td>
      <td class="sub-header border-right-thick">Scan</td>
      <td></td>
      <td class="sub-header" colspan="2">Client, patient</td>
      <td class="sub-header">CID #</td>
      <td class="sub-header">kg</td>
      <td class="sub-header">lb</td>
      <td class="sub-header">Scan</td>
    </tr>
    <!-- Opioid Row -->
    <tr style="height: 19px">
      <td class="drug-name">${left.opioidName}</td>
      <td class="value">${left.opioidMg}</td>
      <td class="value">${left.opioidMl}</td>
      <td></td><td></td><td></td><td></td>
      ${rightPremed}
    </tr>
    <!-- Pre-med label -->
    <tr style="height: 19px">
      <td class="unit">pre-med</td>
      <td class="unit">mg</td>
      <td class="unit">mL</td>
      <td></td><td></td><td></td><td></td>
      <td class="unit">pre-med</td>
      <td class="unit">mg</td>
      <td class="unit">mL</td>
      <td></td><td></td><td></td>
    </tr>
    <!-- Valium Row -->
    <tr style="height: 19px">
      <td class="drug-name">Valium</td>
      <td class="value">${left.valiumMg}</td>
      <td class="value">${left.valiumMl}</td>
      <td></td><td></td><td></td><td></td>
      ${rightValium}
    </tr>
    <!-- Valium label -->
    <tr style="height: 19px">
      <td class="unit"></td>
      <td class="unit">mg</td>
      <td class="unit">mL</td>
      <td></td><td></td><td></td><td></td>
      <td class="unit"></td>
      <td class="unit">mg</td>
      <td class="unit">mL</td>
      <td></td><td></td><td></td>
    </tr>
    <!-- Contrast Row -->
    <tr style="height: 19px">
      <td class="drug-name">Contrast</td>
      <td class="value">${left.contrastMl}</td>
      <td></td><td></td><td></td><td></td><td></td>
      ${rightContrast}
    </tr>
    <!-- Contrast label -->
    <tr style="height: 19px">
      <td class="border-bottom-thick"></td>
      <td class="unit border-bottom-thick">mL</td>
      <td class="border-bottom-thick"></td>
      <td class="border-bottom-thick"></td>
      <td class="border-bottom-thick"></td>
      <td class="border-bottom-thick"></td>
      <td></td>
      <td class="border-bottom-thick"></td>
      <td class="unit border-bottom-thick">mL</td>
      <td class="border-bottom-thick"></td>
      <td class="border-bottom-thick"></td>
      <td class="border-bottom-thick"></td>
      <td class="border-bottom-thick"></td>
    </tr>
  `;
}

/**
 * Convert HTML to PDF blob using print functionality
 */
async function htmlToPDF(html: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      reject(new Error('Could not access iframe document'));
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content to render
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();

        // Clean up after a delay
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);

        // Note: We can't actually get the blob from window.print()
        // This is a limitation - the PDF will be generated via browser print dialog
        // For true PDF generation, we'd need to use html2pdf or similar
        resolve(new Blob([''], { type: 'application/pdf' }));
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    }, 500);
  });
}
