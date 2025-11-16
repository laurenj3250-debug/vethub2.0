/**
 * Sticker PDF Generator
 *
 * Generates patient sticker labels in two formats:
 * 1. Big Patient Labels (3.25" x 2") - For patient files, charts, cages
 * 2. Tiny Diagnostic Labels (smaller format) - For lab samples, diagnostics
 *
 * Uses Avery label templates for proper sizing
 */

import { UnifiedPatient } from '@/contexts/PatientContext';
import { calculateStickerCounts } from '@/lib/sticker-calculator';

/**
 * Big Patient Label Data (3.25" x 2" - Avery 5163)
 */
export interface BigLabelData {
  patientName: string;
  clientId?: string;      // Code number (12pt) - e.g., "674251"
  patientId?: string;     // Consult number (14pt bold) - e.g., "5878433"
  ownerName: string;
  ownerPhone: string;
  ownerAddress?: string;
  species: string;
  breed: string;
  colorMarkings?: string;
  sex: string;
  weight: string;
  dateOfBirth?: string;
  age?: string;
  microchip?: string;
}

/**
 * Tiny Diagnostic Label Data (2" x 1" - Avery 5160 style)
 */
export interface TinyLabelData {
  date: string;
  patientName: string;
  mrn?: string;
  ownerName: string;
  species: string;
  breed: string;
  sex: string;
  age?: string;
  diagnosticId?: string; // Blank line for writing sample ID
}

/**
 * Format patient data for big labels
 */
export function formatPatientForBigLabel(patient: UnifiedPatient): BigLabelData {
  const demo = patient.demographics;

  return {
    patientName: demo.name,
    clientId: demo.clientId,        // Code number (e.g., "674251")
    patientId: demo.patientId,      // Consult number (e.g., "5878433")
    ownerName: demo.ownerName || '',
    ownerPhone: demo.ownerPhone || '',
    ownerAddress: demo.ownerAddress,
    species: demo.species || 'Canine',
    breed: demo.breed || '',
    colorMarkings: demo.colorMarkings,
    sex: demo.sex || '',
    weight: demo.weight || '',
    dateOfBirth: demo.dateOfBirth,
    age: demo.age || '',
    microchip: demo.microchip,
  };
}

/**
 * Format patient data for tiny diagnostic labels
 */
export function formatPatientForTinyLabel(patient: UnifiedPatient): TinyLabelData {
  const demo = patient.demographics;
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  return {
    date: today,
    patientName: demo.name,
    mrn: patient.mrn,
    ownerName: demo.ownerName || '',
    species: demo.species || 'Canine',
    breed: demo.breed || '',
    sex: demo.sex || '',
    age: demo.age || '',
  };
}

/**
 * Generate HTML for big patient labels
 * 70mm x 45mm label format matching clinic standard
 */
export function generateBigLabelsHTML(patient: UnifiedPatient, count: number = 2): string {
  const data = formatPatientForBigLabel(patient);

  // Format phone numbers with line break if multiple
  const formatPhones = (phone: string) => {
    if (!phone) return '';
    // Split by comma and add line breaks
    const phones = phone.split(',').map(p => p.trim());
    return phones.join(',<br>');
  };

  // Generate array of label HTML (duplicate for count)
  const labels = Array(count).fill(null).map(() => `
    <div class="label">
      <!-- Line 1: Name 14pt, Code 12pt, Consult 14pt -->
      <p class="line top">
        <span class="bold large">${escapeHtml(data.patientName)}</span>
        &nbsp;<span class="small">${escapeHtml(data.clientId || '')}</span>
        &nbsp;<span class="bold large">${escapeHtml(data.patientId || '')}</span>
      </p>
      <!-- Line 2: Owner 14pt, Phone(s) 12pt -->
      <p class="line owner">
        <span class="bold large">${escapeHtml(data.ownerName)}</span>
        &nbsp;<span class="small">${formatPhones(data.ownerPhone)}</span>
      </p>
      <!-- Remaining lines: all 12pt -->
      <p class="line small">
        <span class="bold">Species:</span> (${escapeHtml(data.species)})
      </p>
      <p class="line small">
        <span class="bold">Breed:</span> ${escapeHtml(data.breed)}
      </p>
      <p class="line small">
        <span class="bold">Color:</span> ${escapeHtml(data.colorMarkings || '')}
      </p>
      <p class="line small">
        <span class="bold">Sex:</span> ${escapeHtml(data.sex)}
        &nbsp;&nbsp;<span class="bold">Weight:</span> ${escapeHtml(data.weight)}
      </p>
      <p class="line small">
        <span class="bold">DOB:</span> ${escapeHtml(data.dateOfBirth || '')}
        &nbsp;&nbsp;<span class="bold">Age:</span> ${escapeHtml(data.age || '')}
      </p>
    </div>
  `).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Patient Labels - ${escapeHtml(data.patientName)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f5f5f5;
      font-family: Arial, Helvetica, sans-serif;
    }
    .label-container {
      display: flex;
      flex-wrap: wrap;
      gap: 5mm;
      padding: 10mm;
    }
    /* 70 x 45 mm label */
    .label {
      width: 70mm;
      height: 45mm;
      padding: 3mm 4mm;
      background: #ffffff;
      box-shadow: 0 0 3px rgba(0,0,0,0.35);
      box-sizing: border-box;
      color: #000;
      line-height: 1.2;
      page-break-inside: avoid;
    }
    .line { margin: 0; padding: 0; }
    .bold  { font-weight: bold; }
    .large { font-size: 14pt; }
    .small { font-size: 12pt; }
    .top   { margin-bottom: 1mm; }
    .owner { margin-bottom: 1.5mm; }

    @media print {
      body { background: white; }
      .label-container { padding: 0; }
      .label {
        page-break-inside: avoid;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="label-container">
    ${labels}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML for tiny diagnostic labels
 * Prints 4 labels per sheet (one sheet = 4 tiny labels)
 */
export function generateTinyLabelsHTML(patient: UnifiedPatient, sheetCount: number = 1): string {
  const data = formatPatientForTinyLabel(patient);
  const labelCount = sheetCount * 4; // 4 labels per sheet

  // Generate array of label HTML
  const labels = Array(labelCount).fill(null).map((_, index) => `
    <div class="tiny-label">
      <div class="tiny-header">
        <span class="tiny-date">${escapeHtml(data.date)}</span>
        <span class="tiny-patient">${escapeHtml(data.patientName)}</span>
      </div>
      ${data.mrn ? `<div class="tiny-mrn">MRN: ${escapeHtml(data.mrn)}</div>` : ''}
      <div class="tiny-owner">Owner: ${escapeHtml(data.ownerName)}</div>
      <div class="tiny-species">${escapeHtml(data.species)} / ${escapeHtml(data.breed)}</div>
      <div class="tiny-details">${escapeHtml(data.sex)} / ${escapeHtml(data.age || '')}</div>
      <div class="tiny-id">
        <span class="id-label">ID:</span>
        <span class="id-line">_____________________</span>
      </div>
    </div>
  `).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Diagnostic Labels - ${data.patientName}</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }

    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    .label-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.125in;
    }

    .tiny-label {
      width: 3.5in;
      height: 1.25in;
      border: 1px solid #000;
      padding: 0.08in;
      box-sizing: border-box;
      page-break-inside: avoid;
      background: white;
      font-size: 8pt;
    }

    .tiny-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 1px;
      margin-bottom: 2px;
    }

    .tiny-date {
      font-size: 7pt;
    }

    .tiny-patient {
      font-size: 9pt;
      text-transform: uppercase;
    }

    .tiny-mrn {
      font-size: 7pt;
      color: #333;
      margin-bottom: 1px;
    }

    .tiny-owner {
      font-size: 8pt;
      margin-bottom: 1px;
    }

    .tiny-species {
      font-size: 8pt;
      margin-bottom: 1px;
    }

    .tiny-details {
      font-size: 8pt;
      margin-bottom: 2px;
    }

    .tiny-id {
      margin-top: 3px;
      padding-top: 2px;
      border-top: 1px solid #ccc;
    }

    .id-label {
      font-weight: bold;
      font-size: 7pt;
    }

    .id-line {
      font-size: 8pt;
      letter-spacing: 2px;
    }

    @media print {
      body { margin: 0; }
      .tiny-label { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="label-container">
    ${labels}
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
 * Generate big patient labels PDF
 */
export async function generateBigLabelsPDF(patient: UnifiedPatient, count?: number): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  const data = formatPatientForBigLabel(patient);
  const labelCount = count ?? patient.stickerData?.bigLabelCount ?? 2;

  // Label dimensions (Avery 5163 compatible)
  const labelWidth = 3.25;
  const labelHeight = 2.0;
  const marginLeft = 0.5;
  const marginTop = 0.5;
  const gapX = 0.125;
  const gapY = 0.125;
  const labelsPerRow = 2;

  // Generate labels
  for (let i = 0; i < labelCount; i++) {
    const row = Math.floor(i / labelsPerRow);
    const col = i % labelsPerRow;

    // Add new page after every 10 labels (2 columns x 5 rows)
    if (i > 0 && i % 10 === 0) {
      doc.addPage();
    }

    const x = marginLeft + col * (labelWidth + gapX);
    const y = marginTop + (row % 5) * (labelHeight + gapY);

    // Draw label border
    doc.setLineWidth(0.02);
    doc.rect(x, y, labelWidth, labelHeight);

    // Patient name header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.patientName.toUpperCase(), x + 0.1, y + 0.2);

    // MRN
    if (data.mrn) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`MRN: ${data.mrn}`, x + 0.1, y + 0.35);
    }

    // Horizontal line
    doc.setLineWidth(0.01);
    doc.line(x + 0.1, y + 0.4, x + labelWidth - 0.1, y + 0.4);

    // Owner section
    let currentY = y + 0.55;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(data.ownerName, x + 0.1, currentY);

    currentY += 0.15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.ownerPhone, x + 0.1, currentY);

    if (data.ownerAddress) {
      currentY += 0.12;
      doc.setFontSize(8);
      doc.text(data.ownerAddress, x + 0.1, currentY, { maxWidth: labelWidth - 0.2 });
    }

    // Patient info section
    currentY += 0.2;
    doc.setFontSize(9);

    const infoLines = [
      `Species/Breed: ${data.species} / ${data.breed}`,
      data.colorMarkings ? `Color: ${data.colorMarkings}` : null,
      `Sex/Weight: ${data.sex} / ${data.weight}`,
      `DOB/Age: ${data.dateOfBirth || ''} / ${data.age || ''}`,
      data.microchip ? `Microchip: ${data.microchip}` : null,
    ].filter(Boolean) as string[];

    infoLines.forEach((line) => {
      doc.text(line, x + 0.1, currentY, { maxWidth: labelWidth - 0.2 });
      currentY += 0.12;
    });
  }

  return doc.output('blob');
}

/**
 * Generate tiny diagnostic labels PDF
 */
export async function generateTinyLabelsPDF(patient: UnifiedPatient, sheetCount?: number): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  const data = formatPatientForTinyLabel(patient);
  const sheets = sheetCount ?? patient.stickerData?.tinySheetCount ?? 0;
  const labelCount = sheets * 4; // 4 labels per sheet

  // Label dimensions
  const labelWidth = 3.5;
  const labelHeight = 1.25;
  const marginLeft = 0.5;
  const marginTop = 0.5;
  const gapX = 0.125;
  const gapY = 0.125;
  const labelsPerRow = 2;

  // Generate labels
  for (let i = 0; i < labelCount; i++) {
    const row = Math.floor(i / labelsPerRow);
    const col = i % labelsPerRow;

    // Add new page after every 16 labels (2 columns x 8 rows)
    if (i > 0 && i % 16 === 0) {
      doc.addPage();
    }

    const x = marginLeft + col * (labelWidth + gapX);
    const y = marginTop + (row % 8) * (labelHeight + gapY);

    // Draw label border
    doc.setLineWidth(0.01);
    doc.rect(x, y, labelWidth, labelHeight);

    // Header: Date and Patient Name
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(data.date, x + 0.08, y + 0.12);

    doc.setFontSize(9);
    doc.text(data.patientName.toUpperCase(), x + 0.08, y + 0.25);

    // Horizontal line
    doc.setLineWidth(0.005);
    doc.line(x + 0.08, y + 0.28, x + labelWidth - 0.08, y + 0.28);

    // Patient details
    let currentY = y + 0.4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    if (data.mrn) {
      doc.text(`MRN: ${data.mrn}`, x + 0.08, currentY);
      currentY += 0.12;
    }

    doc.text(`Owner: ${data.ownerName}`, x + 0.08, currentY, { maxWidth: labelWidth - 0.16 });
    currentY += 0.12;

    doc.text(`${data.species} / ${data.breed}`, x + 0.08, currentY, { maxWidth: labelWidth - 0.16 });
    currentY += 0.12;

    doc.text(`${data.sex} / ${data.age || ''}`, x + 0.08, currentY);
    currentY += 0.15;

    // ID line
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ID:', x + 0.08, currentY);
    doc.setFont('helvetica', 'normal');
    doc.line(x + 0.3, currentY - 0.02, x + labelWidth - 0.08, currentY - 0.02);
  }

  return doc.output('blob');
}

/**
 * Download big patient labels
 */
export async function downloadBigLabelsPDF(patient: UnifiedPatient, count?: number, filename?: string) {
  const blob = await generateBigLabelsPDF(patient, count);
  const url = URL.createObjectURL(blob);

  const defaultFilename = `${patient.demographics.name.replace(/\s+/g, '-')}-labels.pdf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download tiny diagnostic labels
 */
export async function downloadTinyLabelsPDF(patient: UnifiedPatient, sheetCount?: number, filename?: string) {
  const blob = await generateTinyLabelsPDF(patient, sheetCount);
  const url = URL.createObjectURL(blob);

  const defaultFilename = `${patient.demographics.name.replace(/\s+/g, '-')}-diagnostic-labels.pdf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate all stickers for a patient (big + tiny) as separate PDFs
 */
export async function generateAllStickersPDF(patient: UnifiedPatient): Promise<{
  bigLabels: Blob | null;
  tinyLabels: Blob | null;
}> {
  const stickerData = patient.stickerData;

  if (!stickerData) {
    return { bigLabels: null, tinyLabels: null };
  }

  const counts = calculateStickerCounts(stickerData.isNewAdmit, stickerData.isSurgery);

  const bigLabels = counts.bigLabelCount > 0
    ? await generateBigLabelsPDF(patient, counts.bigLabelCount)
    : null;

  const tinyLabels = counts.tinySheetCount > 0
    ? await generateTinyLabelsPDF(patient, counts.tinySheetCount)
    : null;

  return { bigLabels, tinyLabels };
}

/**
 * Download all stickers for a patient
 */
export async function downloadAllStickersPDF(patient: UnifiedPatient) {
  const { bigLabels, tinyLabels } = await generateAllStickersPDF(patient);

  if (bigLabels) {
    await downloadBigLabelsPDF(patient);
  }

  if (tinyLabels) {
    await downloadTinyLabelsPDF(patient);
  }
}
