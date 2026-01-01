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
 * Matches big sticker format but smaller
 */
export interface TinyLabelData {
  date: string;
  patientName: string;
  mrn?: string;
  clientId?: string; // TF_ClientID
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
 * Matches big sticker format but smaller
 */
export function formatPatientForTinyLabel(patient: UnifiedPatient): TinyLabelData {
  const demo = patient.demographics;
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return {
    date: today,
    patientName: demo.name || '',
    mrn: patient.mrn,
    clientId: demo.clientId || '',
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
      <!-- Line 1: Patient name + TF_ClientID + MRN -->
      <p class="line top">
        <span class="bold">${escapeHtml(data.patientName)}</span>
        &nbsp;<span class="tf">TF_${escapeHtml(data.clientId || '')}</span>
        &nbsp;<span class="bold">${escapeHtml(data.patientId || '')}</span>
      </p>
      <!-- Line 2: Owner name + phone(s) -->
      <p class="line owner">
        <span class="bold">${escapeHtml(data.ownerName)}</span>
        &nbsp;${formatPhones(data.ownerPhone)}
      </p>
      <!-- Line 3: Species -->
      <p class="line">
        <span class="bold">Species:</span> (${escapeHtml(data.species)})
      </p>
      <!-- Line 4: Breed -->
      <p class="line">
        <span class="bold">Breed:</span> ${escapeHtml(data.breed)}
      </p>
      <!-- Line 5: Color -->
      <p class="line">
        <span class="bold">Color:</span> ${escapeHtml(data.colorMarkings || '')}
      </p>
      <!-- Line 6: Sex + Weight -->
      <p class="line">
        <span class="bold">Sex:</span> ${escapeHtml(data.sex)}
        &nbsp;&nbsp;<span class="bold">Weight:</span> ${escapeHtml(data.weight)}
      </p>
      <!-- Line 7: DOB + Age -->
      <p class="line">
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
      border: 1px solid #000;
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1.2;
      color: #000;
      page-break-inside: avoid;
    }

    .line { margin: 0; padding: 0; }
    .bold { font-weight: bold; }
    .tf { font-weight: normal; font-size: 8pt; }
    .top { margin-bottom: 1mm; }
    .owner { margin-bottom: 1.5mm; }

    @media print {
      body { background: white; }
      .page { padding: 0; }
      .label {
        page-break-inside: avoid;
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
 * Format matches big stickers but smaller and center-aligned
 */
export function generateTinyLabelsHTML(patient: UnifiedPatient, count: number = 1): string {
  const data = formatPatientForTinyLabel(patient);

  // Generate array of label HTML (duplicates for count)
  // Format matches user's HTML template exactly
  const labels = Array(count).fill(null).map(() => `
    <div class="tiny-label">
      <p class="line date-line"><span class="bold">Date:</span> ${escapeHtml(data.date)}</p>
      <p class="line name-line bold">${escapeHtml(data.patientName)}, TF_${escapeHtml(data.clientId || '')}</p>
      <p class="line owner-line extrabold">${escapeHtml(data.ownerName)}</p>
      <p class="line breed-line">${escapeHtml(data.species)}, ${escapeHtml(data.breed)}</p>
      <p class="line sex-age-line"><span class="bold">Sex:</span> ${escapeHtml(data.sex)} <span class="bold">Age:</span> ${escapeHtml(data.age || '')}</p>
      <p class="line id-line">Diagnostic ID:</p>
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
      size: 50mm 35mm; /* Match tiny label dimensions */
      margin: 0;
    }

    body {
      font-family: Georgia, serif; /* Georgia font as specified */
      margin: 0;
      padding: 0;
      background-color: #f0f0f0;
    }

    .label-container {
      /* No flex - allows page-break-after to work */
    }

    .tiny-label {
      width: 50mm;  /* Exact dimensions from template */
      height: 35mm;
      border: 1px solid black;
      padding: 0.1mm; /* Internal margin as specified */
      box-sizing: border-box;
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }

    .line {
      text-align: center;
      font-size: 10px; /* text-xxs = 10px as specified */
      line-height: 1.1; /* Tight line height */
    }

    /* Specific margin for each line matching template */
    .date-line {
      margin-bottom: 0; /* mb-0 */
    }

    .name-line {
      margin-bottom: 0; /* mb-0 */
    }

    .owner-line {
      margin-bottom: 1px; /* mb-px for main section break */
    }

    .breed-line {
      margin-bottom: 0; /* mb-0 */
    }

    .sex-age-line {
      margin-bottom: 1px; /* mb-px for small separator */
    }

    .id-line {
      margin-bottom: 0; /* mb-0 */
    }

    .bold {
      font-weight: bold;
    }

    .extrabold {
      font-weight: 800; /* font-extrabold */
    }

    @media print {
      body {
        margin: 0;
        background: white;
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
  const lineSpacing = 5.0;   // 5.0mm between lines (reduced from 5.5mm)
  const labelWidth = 70 - (2 * leftMargin); // 64mm usable width

  // Generate one label per page
  for (let i = 0; i < labelCount; i++) {
    // Add new page for each label (except the first)
    if (i > 0) {
      doc.addPage();
    }

    // Line 1: Name (11pt bold) + Code (9pt) + Consult (11pt bold)
    let currentY = topMargin;

    // Patient Name - 11pt bold (NOT uppercased)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(data.patientName, leftMargin, currentY);

    // Measure name width to position code and consult
    const nameWidth = doc.getTextWidth(data.patientName);
    let xPos = leftMargin + nameWidth + 1;

    // Client ID (Code) - 9pt
    if (data.clientId) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(data.clientId, xPos, currentY);
      xPos += doc.getTextWidth(data.clientId) + 0.5;
    }

    // Patient ID (Consult) - 11pt bold
    if (data.patientId) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(data.patientId, xPos, currentY);
    }

    // Line 2: Owner name (11pt bold) + Phone (9pt)
    currentY += lineSpacing;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(data.ownerName, leftMargin, currentY);

    // Phone - 9pt
    const ownerWidth = doc.getTextWidth(data.ownerName);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.ownerPhone, leftMargin + ownerWidth + 1, currentY);

    // Line 3: Species - 9pt
    currentY += lineSpacing;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Species:', leftMargin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(` (${data.species})`, leftMargin + doc.getTextWidth('Species:'), currentY);

    // Line 4: Breed - 9pt
    currentY += lineSpacing;
    doc.setFont('helvetica', 'bold');
    doc.text('Breed:', leftMargin, currentY);
    doc.setFont('helvetica', 'normal');
    const breedText = ` ${data.breed}`;
    doc.text(breedText, leftMargin + doc.getTextWidth('Breed:'), currentY);

    // Color on same line
    const breedEndPos = leftMargin + doc.getTextWidth('Breed:') + doc.getTextWidth(breedText) + 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Color:', breedEndPos, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${data.colorMarkings || ''}`, breedEndPos + doc.getTextWidth('Color:'), currentY);

    // Line 5: Sex and Weight - 9pt
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

    // Line 6: DOB and Age - 9pt
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
  // Generate labels for all patients (each patient gets the specified number of labels)
  const allLabels = patients.flatMap(patient => {
    const data = formatPatientForBigLabel(patient);
    const count = patient.stickerData?.bigLabelCount ?? 1;

    // Create the specified number of labels for this patient
    return Array(count).fill(null).map(() => `
  <div class="page">
    <p class="line top">
      <span class="bold">${escapeHtml(data.patientName)}</span>
      &nbsp;${escapeHtml(data.clientId || '')}&nbsp;<span class="bold">${escapeHtml(data.patientId || '')}</span>
    </p>
    <p class="line">
      <span class="bold">${escapeHtml(data.ownerName)}</span>
      &nbsp;${escapeHtml(data.ownerPhone)}
    </p>
    <p class="line">
      <span class="bold">Species:</span> (${escapeHtml(data.species)})
    </p>
    <p class="line">
      <span class="bold">Breed:</span> ${escapeHtml(data.breed)}
      &nbsp;&nbsp;<span class="bold">Color:</span> ${escapeHtml(data.colorMarkings || '')}
    </p>
    <p class="line">
      <span class="bold">Sex:</span> ${escapeHtml(data.sex)}
      &nbsp;&nbsp;<span class="bold">Weight:</span> ${escapeHtml(data.weight)}
    </p>
    <p class="line">
      <span class="bold">DOB:</span> ${escapeHtml(data.dateOfBirth || '')}
      &nbsp;&nbsp;<span class="bold">Age:</span> ${escapeHtml(data.age || '')}
    </p>
  </div>`);
  });

  // Combine all labels into one HTML document
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
    html, body {
      margin: 0;
      padding: 0;
      width: 70mm;
    }
    .page {
      width: 70mm;
      height: 45mm;
      padding: 3mm 4mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      display: block;
      overflow: hidden;
      break-after: page;
      break-inside: avoid;
    }
    .page:last-child {
      break-after: auto;
    }
    .line {
      margin: 0;
      padding: 0;
      margin-bottom: 0.3mm;
    }
    .line.top {
      margin-bottom: 0.3mm;
    }
    .bold {
      font-weight: bold;
    }
    @media print {
      html, body { margin: 0; padding: 0; width: 70mm; }
      .page { break-after: page; break-inside: avoid; }
      .page:last-child { break-after: auto; }
    }
  </style>
</head>
<body>
${allLabels.join('\n')}
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
 * Print single patient big labels (opens print dialog)
 * Uses same format as printConsolidatedBigLabels for consistency
 */
export function printSinglePatientBigLabels(patient: UnifiedPatient, count?: number) {
  const data = formatPatientForBigLabel(patient);
  const labelCount = count ?? patient.stickerData?.bigLabelCount ?? 2;

  const labels = Array(labelCount).fill(null).map(() => `
  <div class="page">
    <p class="line top">
      <span class="bold">${escapeHtml(data.patientName)}</span>
      &nbsp;${escapeHtml(data.clientId || '')}&nbsp;<span class="bold">${escapeHtml(data.patientId || '')}</span>
    </p>
    <p class="line">
      <span class="bold">${escapeHtml(data.ownerName)}</span>
      &nbsp;${escapeHtml(data.ownerPhone)}
    </p>
    <p class="line">
      <span class="bold">Species:</span> (${escapeHtml(data.species)})
    </p>
    <p class="line">
      <span class="bold">Breed:</span> ${escapeHtml(data.breed)}
      &nbsp;&nbsp;<span class="bold">Color:</span> ${escapeHtml(data.colorMarkings || '')}
    </p>
    <p class="line">
      <span class="bold">Sex:</span> ${escapeHtml(data.sex)}
      &nbsp;&nbsp;<span class="bold">Weight:</span> ${escapeHtml(data.weight)}
    </p>
    <p class="line">
      <span class="bold">DOB:</span> ${escapeHtml(data.dateOfBirth || '')}
      &nbsp;&nbsp;<span class="bold">Age:</span> ${escapeHtml(data.age || '')}
    </p>
  </div>`);

  const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Big Labels - ${escapeHtml(data.patientName)}</title>
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
    html, body {
      margin: 0;
      padding: 0;
      width: 70mm;
    }
    .page {
      width: 70mm;
      height: 45mm;
      padding: 3mm 4mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      display: block;
      overflow: hidden;
      break-after: page;
      break-inside: avoid;
    }
    .page:last-child {
      break-after: auto;
    }
    .line {
      margin: 0;
      padding: 0;
      margin-bottom: 0.3mm;
    }
    .line.top {
      margin-bottom: 0.3mm;
    }
    .bold {
      font-weight: bold;
    }
    @media print {
      html, body { margin: 0; padding: 0; width: 70mm; }
      .page { break-after: page; break-inside: avoid; }
      .page:last-child { break-after: auto; }
    }
  </style>
</head>
<body>
${labels.join('\n')}
</body>
</html>
  `.trim();

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(combinedHTML);
    printWindow.document.close();
    // Use setTimeout to prevent blocking the main thread
    setTimeout(() => {
      printWindow.print();
    }, 100);
  }
}

/**
 * Print single patient tiny labels (opens print dialog)
 * Uses same format as printConsolidatedTinyLabels for consistency
 */
export function printSinglePatientTinyLabels(patient: UnifiedPatient, count?: number) {
  const data = formatPatientForTinyLabel(patient);
  const labelCount = count ?? patient.stickerData?.tinySheetCount ?? 1;

  const labels = Array(labelCount).fill(null).map(() => `
    <div class="tiny-label">
      <p class="line date-line"><span class="bold">Date:</span> ${escapeHtml(data.date)}</p>
      <p class="line name-line bold">${escapeHtml(data.patientName)}, TF_${escapeHtml(data.clientId || '')}</p>
      <p class="line owner-line extrabold">${escapeHtml(data.ownerName)}</p>
      <p class="line breed-line">${escapeHtml(data.species)}, ${escapeHtml(data.breed)}</p>
      <p class="line sex-age-line"><span class="bold">Sex:</span> ${escapeHtml(data.sex)} <span class="bold">Age:</span> ${escapeHtml(data.age || '')}</p>
      <p class="line id-line">Diagnostic ID:</p>
    </div>
  `);

  const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tiny Labels - ${escapeHtml(data.patientName)}</title>
  <style>
    @page {
      size: 50mm 35mm;
      margin: 0;
    }

    html, body {
      font-family: Georgia, serif;
      margin: 0;
      padding: 0;
      width: 50mm;
      background-color: #f0f0f0;
    }

    .label-container {
    }

    .tiny-label {
      width: 50mm;
      height: 35mm;
      border: 1px solid black;
      padding: 0.1mm;
      box-sizing: border-box;
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      break-after: page;
      break-inside: avoid;
    }

    .tiny-label:last-child {
      break-after: auto;
    }

    .line {
      text-align: center;
      font-size: 10px;
      line-height: 1.1;
    }

    .date-line { margin-bottom: 0; }
    .name-line { margin-bottom: 0; }
    .owner-line { margin-bottom: 1px; }
    .breed-line { margin-bottom: 0; }
    .sex-age-line { margin-bottom: 1px; }
    .id-line { margin-bottom: 0; }

    .bold { font-weight: bold; }
    .extrabold { font-weight: 800; }

    @media print {
      html, body { margin: 0; padding: 0; width: 50mm; background: white; }
      .tiny-label { break-after: page; break-inside: avoid; }
      .tiny-label:last-child { break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="label-container">
    ${labels.join('\n')}
  </div>
</body>
</html>
  `.trim();

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(combinedHTML);
    printWindow.document.close();
    // Use setTimeout to prevent blocking the main thread
    setTimeout(() => {
      printWindow.print();
    }, 100);
  }
}

/**
 * Print consolidated tiny labels (opens print dialog)
 */
export async function printConsolidatedTinyLabels(patients: UnifiedPatient[]) {
  // Generate all tiny labels - each patient gets their own set
  // Format matches user's HTML template exactly

  console.log('[printConsolidatedTinyLabels] Starting with patients:', patients.length);

  const allLabels = patients.flatMap(patient => {
    const data = formatPatientForTinyLabel(patient);
    const count = patient.stickerData?.tinySheetCount || 1;

    console.log(`[printConsolidatedTinyLabels] Patient: ${data.patientName}`);
    console.log(`  - stickerData:`, patient.stickerData);
    console.log(`  - tinySheetCount: ${count}`);

    // Each patient gets 'count' number of identical tiny labels
    const labels = Array(count).fill(null).map((_, index) => {
      console.log(`  - Generating label ${index + 1}/${count} for ${data.patientName}`);
      return `
      <div class="tiny-label">
        <p class="line date-line"><span class="bold">Date:</span> ${escapeHtml(data.date)}</p>
        <p class="line name-line bold">${escapeHtml(data.patientName)}, TF_${escapeHtml(data.clientId || '')}</p>
        <p class="line owner-line extrabold">${escapeHtml(data.ownerName)}</p>
        <p class="line breed-line">${escapeHtml(data.species)}, ${escapeHtml(data.breed)}</p>
        <p class="line sex-age-line"><span class="bold">Sex:</span> ${escapeHtml(data.sex)} <span class="bold">Age:</span> ${escapeHtml(data.age || '')}</p>
        <p class="line id-line">Diagnostic ID:</p>
      </div>
    `;
    });

    console.log(`  - Generated ${labels.length} labels for ${data.patientName}`);
    return labels;
  }).join('\n');

  console.log('[printConsolidatedTinyLabels] Total HTML length:', allLabels.length);

  const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tiny Labels - Consolidated</title>
  <style>
    @page {
      size: 50mm 35mm;
      margin: 0;
    }

    html, body {
      font-family: Georgia, serif;
      margin: 0;
      padding: 0;
      width: 50mm;
      background-color: #f0f0f0;
    }

    .label-container {
    }

    .tiny-label {
      width: 50mm;
      height: 35mm;
      border: 1px solid black;
      padding: 0.1mm;
      box-sizing: border-box;
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      break-after: page;
      break-inside: avoid;
    }

    .tiny-label:last-child {
      break-after: auto;
    }

    .line {
      text-align: center;
      font-size: 10px;
      line-height: 1.1;
    }

    .date-line { margin-bottom: 0; }
    .name-line { margin-bottom: 0; }
    .owner-line { margin-bottom: 1px; }
    .breed-line { margin-bottom: 0; }
    .sex-age-line { margin-bottom: 1px; }
    .id-line { margin-bottom: 0; }

    .bold { font-weight: bold; }
    .extrabold { font-weight: 800; }

    @media print {
      html, body { margin: 0; padding: 0; width: 50mm; background: white; }
      .tiny-label { break-after: page; break-inside: avoid; }
      .tiny-label:last-child { break-after: auto; }
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
  const lineSpacing = 5.0;   // 5.0mm between lines (reduced from 5.5mm)

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

      // Line 1: Name (11pt bold) + Code (9pt) + Consult (11pt bold)
      let currentY = topMargin;

      // Patient Name - 11pt bold
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(data.patientName, leftMargin, currentY);

      // Measure name width to position code and consult
      const nameWidth = doc.getTextWidth(data.patientName);
      let xPos = leftMargin + nameWidth + 1;

      // Client ID (Code) - 9pt
      if (data.clientId) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(data.clientId, xPos, currentY);
        xPos += doc.getTextWidth(data.clientId) + 0.5;
      }

      // Patient ID (Consult) - 11pt bold
      if (data.patientId) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(data.patientId, xPos, currentY);
      }

      // Line 2: Owner name (11pt bold) + Phone (9pt)
      currentY += lineSpacing;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(data.ownerName, leftMargin, currentY);

      // Phone - 9pt
      const ownerWidth = doc.getTextWidth(data.ownerName);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(data.ownerPhone, leftMargin + ownerWidth + 1, currentY);

      // Line 3: Species - 9pt
      currentY += lineSpacing;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Species:', leftMargin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(` (${data.species})`, leftMargin + doc.getTextWidth('Species:'), currentY);

      // Line 4: Breed - 9pt
      currentY += lineSpacing;
      doc.setFont('helvetica', 'bold');
      doc.text('Breed:', leftMargin, currentY);
      doc.setFont('helvetica', 'normal');
      const breedText = ` ${data.breed}`;
      doc.text(breedText, leftMargin + doc.getTextWidth('Breed:'), currentY);

      // Color on same line
      const breedEndPos = leftMargin + doc.getTextWidth('Breed:') + doc.getTextWidth(breedText) + 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Color:', breedEndPos, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(` ${data.colorMarkings || ''}`, breedEndPos + doc.getTextWidth('Color:'), currentY);

      // Line 5: Sex and Weight - 9pt
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

      // Line 6: DOB and Age - 9pt
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
