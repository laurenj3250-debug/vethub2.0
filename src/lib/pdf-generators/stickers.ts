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
 * 1.937" x 3.5" label format (landscape with 90° rotation, labels with gaps)
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
      <!-- Line 1: Name 14pt, Code, Consult 14pt -->
      <p class="line top large">
        <span class="bold">${escapeHtml(data.patientName)}</span>
        &nbsp;${escapeHtml(data.clientId || '')}&nbsp;<span class="bold">${escapeHtml(data.patientId || '')}</span>
      </p>
      <!-- Line 2: Owner + Phone(s) - 14pt -->
      <p class="line owner large">
        <span class="bold">${escapeHtml(data.ownerName)}</span>
        &nbsp;${formatPhones(data.ownerPhone)}
      </p>
      <!-- Remaining lines: all 12pt -->
      <p class="line small">
        <span class="bold">Species:</span> (${escapeHtml(data.species)})
      </p>
      <p class="line small">
        <span class="bold">Breed:</span> ${escapeHtml(data.breed)}
      </p>
      <p class="line small">
        <span class="bold">Mix Color:</span> ${escapeHtml(data.colorMarkings || '')}
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
    }

    .page {
      width: 100vw;
      min-height: 100vh;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: center;
      gap: 5mm;
      padding: 10mm;
    }

    /* 70mm x 45mm label */
    .label {
      width: 70mm;
      height: 45mm;
      padding: 3mm 4mm;
      background: #ffffff;
      box-shadow: 0 0 3px rgba(0,0,0,0.35);
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1.2;
      color: #000;
      page-break-inside: avoid;
    }

    .line { margin: 0; padding: 0; }
    .bold { font-weight: bold; }
    .large { font-size: 14pt; }
    .small { font-size: 12pt; }
    .top { margin-bottom: 1mm; }
    .owner { margin-bottom: 1.5mm; }

    @media print {
      body { background: white; }
      .page { padding: 0; }
      .label {
        page-break-inside: avoid;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
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
  const labelCount = 4; // Always 4 tiny labels per patient

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
      width: 1.252in;
      height: 0.839in;
      border: 1px solid #000;
      padding: 0.05in;
      box-sizing: border-box;
      page-break-inside: avoid;
      background: white;
      font-size: 6pt;
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
      font-size: 5pt;
    }

    .tiny-patient {
      font-size: 7pt;
      text-transform: uppercase;
    }

    .tiny-mrn {
      font-size: 5pt;
      color: #333;
      margin-bottom: 1px;
    }

    .tiny-owner {
      font-size: 6pt;
      margin-bottom: 1px;
    }

    .tiny-species {
      font-size: 6pt;
      margin-bottom: 1px;
    }

    .tiny-details {
      font-size: 6pt;
      margin-bottom: 2px;
    }

    .tiny-id {
      margin-top: 3px;
      padding-top: 2px;
      border-top: 1px solid #ccc;
    }

    .id-label {
      font-weight: bold;
      font-size: 5pt;
    }

    .id-line {
      font-size: 6pt;
      letter-spacing: 1px;
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
 * Each patient gets ONE page at 70mm × 45mm
 */
export async function generateBigLabelsPDF(patient: UnifiedPatient, count?: number): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;

  const data = formatPatientForBigLabel(patient);
  const labelCount = count ?? patient.stickerData?.bigLabelCount ?? 2;

  // Create document with 70mm × 45mm page size
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [70, 45], // 70mm × 45mm label size
  });

  // Margins and spacing (all in mm)
  const leftMargin = 3;      // 3mm left margin
  const topMargin = 5;       // 5mm top margin
  const lineSpacing = 5.5;   // 5.5mm between lines
  const labelWidth = 70 - (2 * leftMargin); // 64mm usable width

  // Generate one label per page
  for (let i = 0; i < labelCount; i++) {
    // Add new page for each label (except the first)
    if (i > 0) {
      doc.addPage();
    }

    // Line 1: Name (14pt bold) + Code (12pt) + Consult (14pt bold)
    let currentY = topMargin;

    // Patient Name - 14pt bold (NOT uppercased)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.patientName, leftMargin, currentY);

    // Measure name width to position code and consult
    const nameWidth = doc.getTextWidth(data.patientName);
    let xPos = leftMargin + nameWidth + 1;

    // Client ID (Code) - 12pt
    if (data.clientId) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(data.clientId, xPos, currentY);
      xPos += doc.getTextWidth(data.clientId) + 0.5;
    }

    // Patient ID (Consult) - 14pt bold
    if (data.patientId) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(data.patientId, xPos, currentY);
    }

    // Line 2: Owner name (14pt bold) + Phone (12pt)
    currentY += lineSpacing;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.ownerName, leftMargin, currentY);

    // Phone - 12pt
    const ownerWidth = doc.getTextWidth(data.ownerName);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.ownerPhone, leftMargin + ownerWidth + 1, currentY);

    // Line 3: Species - 12pt
    currentY += lineSpacing;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Species:', leftMargin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(` (${data.species})`, leftMargin + doc.getTextWidth('Species:'), currentY);

    // Line 4: Breed and Color on SAME LINE - 12pt
    currentY += lineSpacing;
    doc.setFont('helvetica', 'bold');
    doc.text('Breed:', leftMargin, currentY);
    doc.setFont('helvetica', 'normal');
    const breedText = ` ${data.breed}`;
    doc.text(breedText, leftMargin + doc.getTextWidth('Breed:'), currentY);

    // Add Color on same line
    const breedEndPos = leftMargin + doc.getTextWidth('Breed:') + doc.getTextWidth(breedText) + 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Color:', breedEndPos, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${data.colorMarkings || ''}`, breedEndPos + doc.getTextWidth('Color:'), currentY);

    // Line 5: Sex and Weight - 12pt
    currentY += lineSpacing;
    doc.setFont('helvetica', 'bold');
    doc.text('Sex:', leftMargin, currentY);
    doc.setFont('helvetica', 'normal');
    const sexText = ` ${data.sex}`;
    doc.text(sexText, leftMargin + doc.getTextWidth('Sex:'), currentY);

    const sexEndPos = leftMargin + doc.getTextWidth('Sex:') + doc.getTextWidth(sexText) + 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Weight:', sexEndPos, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${data.weight}`, sexEndPos + doc.getTextWidth('Weight:'), currentY);

    // Line 7: DOB and Age - 12pt
    currentY += lineSpacing;
    doc.setFont('helvetica', 'bold');
    doc.text('DOB:', leftMargin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${data.dateOfBirth || ''}`, leftMargin + doc.getTextWidth('DOB:'), currentY);

    const dobEndPos = leftMargin + doc.getTextWidth('DOB:') + doc.getTextWidth(` ${data.dateOfBirth || ''}`) + 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Age:', dobEndPos, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${data.age || ''}`, dobEndPos + doc.getTextWidth('Age:'), currentY);
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

/**
 * Print consolidated big labels (opens print dialog)
 */
export async function printConsolidatedBigLabels(patients: UnifiedPatient[]) {
  // Generate HTML for all patients
  const htmlPages = patients.map(patient => {
    const count = patient.stickerData?.bigLabelCount ?? 1;
    return generateBigLabelsHTML(patient, count);
  }).join('\n');

  // Combine all pages into one HTML document
  const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Big Labels - Consolidated</title>
  <style>
    @page {
      size: 70mm 45mm;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
    }
    .page {
      width: 70mm;
      height: 45mm;
      padding: 3mm 4mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1.2;
      page-break-after: always;
      display: block;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .line {
      margin: 0;
      padding: 0;
      line-height: 1.3;
    }
    .line.top {
      margin-bottom: 1mm;
    }
    .bold {
      font-weight: bold;
    }
    .large {
      font-size: 14pt;
    }
    .small {
      font-size: 12pt;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
${patients.map(patient => {
  const data = formatPatientForBigLabel(patient);
  const count = patient.stickerData?.bigLabelCount ?? 1;
  return Array(count).fill(null).map(() => `
  <div class="page">
    <p class="line top large">
      <span class="bold">${escapeHtml(data.patientName)}</span>
      &nbsp;${escapeHtml(data.clientId)}&nbsp;<span class="bold">${escapeHtml(data.patientId)}</span>
    </p>
    <p class="line large">
      <span class="bold">${escapeHtml(data.ownerName)}</span>
    </p>
    <p class="line small">
      <span class="bold">DOB:</span> ${escapeHtml(data.dob)}
    </p>
    <p class="line small">
      <span class="bold">Species/Breed:</span> ${escapeHtml(data.species)}/${escapeHtml(data.breed)}
    </p>
    <p class="line small">
      <span class="bold">Sex:</span> ${escapeHtml(data.sex)}
      &nbsp;&nbsp;<span class="bold">Age:</span> ${escapeHtml(data.age)}
      &nbsp;&nbsp;<span class="bold">Weight:</span> ${escapeHtml(data.weight)}
    </p>
    <p class="line small">
      <span class="bold">Mix Color:</span> ${escapeHtml(data.colorMarkings)}
    </p>
  </div>`).join('\n');
}).join('\n')}
</body>
</html>
  `.trim();

  // Open HTML in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(combinedHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Print consolidated tiny labels (opens print dialog)
 */
export async function printConsolidatedTinyLabels(patients: UnifiedPatient[]) {
  // Generate all tiny labels in one consolidated HTML document
  const allLabels = patients.map(patient => {
    const data = formatPatientForTinyLabel(patient);
    const labelCount = 4; // Always 4 tiny labels per patient

    return Array(labelCount).fill(null).map(() => `
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
  }).join('\n');

  const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tiny Labels - Consolidated</title>
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
      width: 1.252in;
      height: 0.839in;
      border: 1px solid #000;
      padding: 0.05in;
      box-sizing: border-box;
      page-break-inside: avoid;
      background: white;
      font-size: 6pt;
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
      font-size: 5pt;
    }

    .tiny-patient {
      font-size: 7pt;
      text-transform: uppercase;
    }

    .tiny-mrn {
      font-size: 5pt;
      color: #333;
      margin-bottom: 1px;
    }

    .tiny-owner {
      font-size: 6pt;
      margin-bottom: 1px;
    }

    .tiny-species {
      font-size: 6pt;
      margin-bottom: 1px;
    }

    .tiny-details {
      font-size: 6pt;
      margin-bottom: 2px;
    }

    .tiny-id {
      margin-top: 3px;
      padding-top: 2px;
      border-top: 1px solid #ccc;
    }

    .id-label {
      font-weight: bold;
      font-size: 5pt;
    }

    .id-line {
      font-size: 6pt;
      letter-spacing: 1px;
    }

    @media print {
      body { margin: 0; }
      .tiny-label { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="label-container">
    ${allLabels}
  </div>
</body>
</html>
  `.trim();

  // Open HTML in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(combinedHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Generate consolidated big labels PDF for multiple patients
 * Creates ONE FULL-PAGE LABEL PER PATIENT at 70mm × 45mm
 */
export async function generateConsolidatedBigLabelsPDF(patients: UnifiedPatient[]): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [70, 45], // 70mm × 45mm label size
  });

  let isFirstPatient = true;

  // Margins and spacing (all in mm)
  const leftMargin = 3;      // 3mm left margin
  const topMargin = 5;       // 5mm top margin
  const lineSpacing = 5.5;   // 5.5mm between lines

  // Process each patient - ONE FULL PAGE PER PATIENT
  for (const patient of patients) {
    const data = formatPatientForBigLabel(patient);
    const labelCount = patient.stickerData?.bigLabelCount ?? 1;

    // Generate full-page labels for this patient
    for (let i = 0; i < labelCount; i++) {
      // Add new page for each label (except the first)
      if (!isFirstPatient) {
        doc.addPage();
      }
      isFirstPatient = false;

      // Line 1: Name (14pt bold) + Code (12pt) + Consult (14pt bold)
      let currentY = topMargin;

      // Patient Name - 14pt bold
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(data.patientName, leftMargin, currentY);

      // Measure name width to position code and consult
      const nameWidth = doc.getTextWidth(data.patientName);
      let xPos = leftMargin + nameWidth + 1;

      // Client ID (Code) - 12pt
      if (data.clientId) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(data.clientId, xPos, currentY);
        xPos += doc.getTextWidth(data.clientId) + 0.5;
      }

      // Patient ID (Consult) - 14pt bold
      if (data.patientId) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(data.patientId, xPos, currentY);
      }

      // Line 2: Owner name (14pt bold) + Phone (12pt)
      currentY += lineSpacing;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(data.ownerName, leftMargin, currentY);

      // Phone - 12pt
      const ownerWidth = doc.getTextWidth(data.ownerName);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(data.ownerPhone, leftMargin + ownerWidth + 1, currentY);

      // Line 3: Species - 12pt
      currentY += lineSpacing;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Species:', leftMargin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(` (${data.species})`, leftMargin + doc.getTextWidth('Species:'), currentY);

      // Line 4: Breed and Color on SAME LINE - 12pt
      currentY += lineSpacing;
      doc.setFont('helvetica', 'bold');
      doc.text('Breed:', leftMargin, currentY);
      doc.setFont('helvetica', 'normal');
      const breedText = ` ${data.breed}`;
      doc.text(breedText, leftMargin + doc.getTextWidth('Breed:'), currentY);

      // Add Color on same line
      const breedEndPos = leftMargin + doc.getTextWidth('Breed:') + doc.getTextWidth(breedText) + 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Color:', breedEndPos, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(` ${data.colorMarkings || ''}`, breedEndPos + doc.getTextWidth('Color:'), currentY);

      // Line 5: Sex and Weight - 12pt
      currentY += lineSpacing;
      doc.setFont('helvetica', 'bold');
      doc.text('Sex:', leftMargin, currentY);
      doc.setFont('helvetica', 'normal');
      const sexText = ` ${data.sex}`;
      doc.text(sexText, leftMargin + doc.getTextWidth('Sex:'), currentY);

      const sexEndPos = leftMargin + doc.getTextWidth('Sex:') + doc.getTextWidth(sexText) + 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Weight:', sexEndPos, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(` ${data.weight}`, sexEndPos + doc.getTextWidth('Weight:'), currentY);

      // Line 6: DOB and Age - 12pt
      currentY += lineSpacing;
      doc.setFont('helvetica', 'bold');
      doc.text('DOB:', leftMargin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(` ${data.dateOfBirth || ''}`, leftMargin + doc.getTextWidth('DOB:'), currentY);

      const dobEndPos = leftMargin + doc.getTextWidth('DOB:') + doc.getTextWidth(` ${data.dateOfBirth || ''}`) + 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Age:', dobEndPos, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(` ${data.age || ''}`, dobEndPos + doc.getTextWidth('Age:'), currentY);
    }
  }

  return doc.output('blob');
}

/**
 * Generate consolidated tiny labels PDF for multiple patients
 * Creates ONE PDF with all tiny labels from all patients
 */
export async function generateConsolidatedTinyLabelsPDF(patients: UnifiedPatient[]): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  // Label dimensions
  const labelWidth = 3.5;
  const labelHeight = 1.25;
  const marginLeft = 0.5;
  const marginTop = 0.5;
  const gapX = 0.125;
  const gapY = 0.125;
  const labelsPerRow = 2;

  let labelIndex = 0;

  // Process each patient
  for (const patient of patients) {
    const data = formatPatientForTinyLabel(patient);
    const labelCount = 4; // Always generate 4 tiny labels per patient

    // Generate labels for this patient
    for (let i = 0; i < labelCount; i++) {
      const row = Math.floor(labelIndex / labelsPerRow);
      const col = labelIndex % labelsPerRow;

      // Add new page after every 16 labels (2 columns x 8 rows)
      if (labelIndex > 0 && labelIndex % 16 === 0) {
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

      labelIndex++;
    }
  }

  return doc.output('blob');
}
