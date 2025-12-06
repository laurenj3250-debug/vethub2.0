import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  ISectionOptions,
  ITableCellOptions,
} from 'docx';
import { saveAs } from 'file-saver';
import type {
  NeurosurgeryCase,
  JournalClubEntry,
  WeeklyScheduleEntry,
  ACVIMProfile,
} from '@/lib/residency-types';

interface ExportData {
  profile: ACVIMProfile | null;
  year: number;
  cases: NeurosurgeryCase[];
  journalClub: JournalClubEntry[];
  weeklySchedule: WeeklyScheduleEntry[];
  summary: {
    totalCases: number;
    totalCaseHours: number;
    primaryCases: number;
    assistantCases: number;
    totalJournalSessions: number;
    totalJournalHours: number;
    clinicalDirectWeeks: number;
    clinicalIndirectWeeks: number;
    neurosurgeryHours: number;
    radiologyHours: number;
    neuropathologyHours: number;
    clinicalPathologyHours: number;
    electrodiagnosticsHours: number;
  };
}

const tableBorders: ITableCellOptions['borders'] = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

function createHeaderCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20 })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { fill: 'E8E8E8' },
    borders: tableBorders,
  });
}

function createCell(
  text: string,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 20 })],
        alignment: align,
      }),
    ],
    borders: tableBorders,
  });
}

export async function generateACVIMWordDocument(data: ExportData): Promise<void> {
  const { profile, year, cases, journalClub, weeklySchedule, summary } = data;

  // Build document children (Paragraphs and Tables)
  const children: (Paragraph | Table)[] = [];

  // Title Page
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'ACVIM Neurology Residency',
          bold: true,
          size: 48,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Year ${year} Activity Log`,
          bold: true,
          size: 36,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Resident: ${profile?.residentName || 'Not specified'}`,
          size: 24,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `ACVIM Candidate ID: ${profile?.acvimCandidateId || 'Not specified'}`,
          size: 24,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Training Facility: ${profile?.trainingFacility || 'Not specified'}`,
          size: 24,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Program Start Date: ${profile?.programStartDate || 'Not specified'}`,
          size: 24,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString()}`,
          size: 20,
          italics: true,
        }),
      ],
      spacing: { before: 400 },
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Summary Section
  children.push(
    new Paragraph({
      text: 'Annual Summary',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Neurosurgery Cases', bold: true, size: 24 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Total Cases: ${summary.totalCases}`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Total Hours: ${summary.totalCaseHours.toFixed(2)}`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `As Primary: ${summary.primaryCases}`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `As Assistant: ${summary.assistantCases}`, size: 22 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Journal Club', bold: true, size: 24 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Total Sessions: ${summary.totalJournalSessions}`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Total Hours: ${summary.totalJournalHours.toFixed(1)}`, size: 22 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Weekly Schedule Totals', bold: true, size: 24 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Clinical Neurology (Direct): ${summary.clinicalDirectWeeks} weeks`,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Clinical Neurology (Indirect): ${summary.clinicalIndirectWeeks} weeks`,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Neurosurgery: ${summary.neurosurgeryHours} hours`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Radiology: ${summary.radiologyHours} hours`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Neuropathology: ${summary.neuropathologyHours} hours`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Clinical Pathology: ${summary.clinicalPathologyHours} hours`, size: 22 })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Electrodiagnostics: ${summary.electrodiagnosticsHours} hours`, size: 22 }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Case Log Section
  children.push(
    new Paragraph({
      text: 'Neurosurgery Case Log',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  if (cases.length > 0) {
    const caseTableRows = [
      new TableRow({
        children: [
          createHeaderCell('Date'),
          createHeaderCell('Procedure'),
          createHeaderCell('Case ID'),
          createHeaderCell('Role'),
          createHeaderCell('Hours'),
          createHeaderCell('Patient'),
        ],
      }),
      ...cases.map(
        (c) =>
          new TableRow({
            children: [
              createCell(new Date(c.dateCompleted).toLocaleDateString()),
              createCell(c.procedureName),
              createCell(c.caseIdNumber),
              createCell(c.role, AlignmentType.CENTER),
              createCell(c.hours.toString(), AlignmentType.CENTER),
              createCell(c.patientName || '-'),
            ],
          })
      ),
    ];

    children.push(
      new Table({
        rows: caseTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({ children: [new PageBreak()] })
    );
  } else {
    children.push(
      new Paragraph({ text: 'No cases logged for this year.', spacing: { after: 300 } }),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  // Journal Club Section
  children.push(
    new Paragraph({
      text: 'Journal Club Log',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  if (journalClub.length > 0) {
    const journalTableRows = [
      new TableRow({
        children: [
          createHeaderCell('Date'),
          createHeaderCell('Article Title(s)'),
          createHeaderCell('Supervising Neurologist(s)'),
          createHeaderCell('Hours'),
        ],
      }),
      ...journalClub.map(
        (j) =>
          new TableRow({
            children: [
              createCell(new Date(j.date).toLocaleDateString()),
              createCell(j.articleTitles.join('\n')),
              createCell(j.supervisingNeurologists.join(', ')),
              createCell(j.hours.toString(), AlignmentType.CENTER),
            ],
          })
      ),
    ];

    children.push(
      new Table({
        rows: journalTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({ children: [new PageBreak()] })
    );
  } else {
    children.push(
      new Paragraph({ text: 'No journal club entries for this year.', spacing: { after: 300 } }),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  // Weekly Schedule Section
  children.push(
    new Paragraph({
      text: 'Weekly Schedule',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  // Group schedule by month
  const monthGroups = weeklySchedule.reduce(
    (acc, entry) => {
      if (!acc[entry.monthNumber]) {
        acc[entry.monthNumber] = [];
      }
      acc[entry.monthNumber].push(entry);
      return acc;
    },
    {} as Record<number, WeeklyScheduleEntry[]>
  );

  Object.entries(monthGroups).forEach(([monthNum, entries]) => {
    children.push(
      new Paragraph({
        text: `Month ${monthNum}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    const scheduleRows = [
      new TableRow({
        children: [
          createHeaderCell('Week'),
          createHeaderCell('Clin Direct'),
          createHeaderCell('Clin Indirect'),
          createHeaderCell('Neurosurgery'),
          createHeaderCell('Radiology'),
          createHeaderCell('Neuropath'),
          createHeaderCell('Clin Path'),
          createHeaderCell('Electrodiag'),
          createHeaderCell('Journal'),
          createHeaderCell('Other'),
          createHeaderCell('Diplomate'),
        ],
      }),
      ...entries.map(
        (e) =>
          new TableRow({
            children: [
              createCell(e.weekDateRange || '-'),
              createCell(e.clinicalNeurologyDirect?.toString() || '-', AlignmentType.CENTER),
              createCell(e.clinicalNeurologyIndirect?.toString() || '-', AlignmentType.CENTER),
              createCell(e.neurosurgeryHours?.toString() || '-', AlignmentType.CENTER),
              createCell(e.radiologyHours?.toString() || '-', AlignmentType.CENTER),
              createCell(e.neuropathologyHours?.toString() || '-', AlignmentType.CENTER),
              createCell(e.clinicalPathologyHours?.toString() || '-', AlignmentType.CENTER),
              createCell(e.electrodiagnosticsHours?.toString() || '-', AlignmentType.CENTER),
              createCell(e.journalClubHours?.toString() || '-', AlignmentType.CENTER),
              createCell(e.otherTimeDescription || '-'),
              createCell(e.supervisingDiplomateName || '-'),
            ],
          })
      ),
    ];

    children.push(
      new Table({
        rows: scheduleRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  });

  // Create document
  const doc = new Document({
    sections: [{ children }],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `ACVIM-Year${year}-${new Date().toISOString().split('T')[0]}.docx`);
}
