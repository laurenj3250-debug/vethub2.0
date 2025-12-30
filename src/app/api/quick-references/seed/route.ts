import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default medications
const defaultMedications = [
  { name: 'Gabapentin', content: '10-20 mg/kg PO q8-12h', notes: 'Neuropathic pain, seizures' },
  { name: 'Metronidazole', content: '15 mg/kg PO BID', notes: 'GI, anaerobic infections' },
  { name: 'Maropitant (Cerenia)', content: '1 mg/kg SQ/PO SID', notes: 'Anti-emetic' },
  { name: 'Fentanyl CRI', content: '3-5 mcg/kg/hr', notes: 'Severe pain management' },
  { name: 'Levetiracetam (Keppra)', content: '20 mg/kg PO/IV TID', notes: 'Seizure control' },
];

// Default protocols including Stroke Work Up
const defaultProtocols = [
  {
    name: 'Status Epilepticus',
    content: '1. Diazepam 0.5-1mg/kg IV\n2. If continues: Levetiracetam 60mg/kg IV over 15min\n3. CRI: Levetiracetam 2-4mg/kg/hr + Propofol 0.1-0.6mg/kg/min'
  },
  {
    name: 'MRI Pre-op',
    content: '1. NPO 12 hours\n2. Pre-med: Acepromazine + Butorphanol\n3. Propofol induction\n4. Sevoflurane maintenance'
  },
  {
    name: 'IVDD Medical Management',
    content: '1. Strict cage rest 4-6 weeks\n2. NSAIDs (Carprofen 2.2mg/kg BID)\n3. Gabapentin 10mg/kg TID\n4. Consider steroids if acute'
  },
  {
    name: 'Stroke Work Up',
    content: `Stroke Work Up - CBC/Chemistry

• UA WITH UPC REFLEX IDX-2326
• DIC Coagulation Panel (Cornell)
• Blood Pressure
• DIAG1609 Canine Tick Panel Serology
• IDX 3016 THYROID COMP SCREEN FT4ED
• ACTH Stim vs LDDST (if Cushingoid)
• IMAG0143 - Ultrasound - 1 Cavity
• Chest X-rays (3 view)
• Echocardiogram - USSC19 - Echocardiogram Level 3, ECG 6 Lead, In House Consult
• MRI Brain (contrast)`
  },
];

/**
 * POST /api/quick-references/seed
 * Seed default quick references if not already present
 */
export async function POST() {
  try {
    let created = 0;
    let skipped = 0;

    // Seed medications
    for (const med of defaultMedications) {
      const existing = await prisma.quickReference.findFirst({
        where: {
          type: 'medication',
          name: med.name,
          isDefault: true,
        },
      });

      if (!existing) {
        await prisma.quickReference.create({
          data: {
            type: 'medication',
            name: med.name,
            content: med.content,
            notes: med.notes,
            isDefault: true,
            sortOrder: defaultMedications.indexOf(med),
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    // Seed protocols
    for (const protocol of defaultProtocols) {
      const existing = await prisma.quickReference.findFirst({
        where: {
          type: 'protocol',
          name: protocol.name,
          isDefault: true,
        },
      });

      if (!existing) {
        await prisma.quickReference.create({
          data: {
            type: 'protocol',
            name: protocol.name,
            content: protocol.content,
            isDefault: true,
            sortOrder: defaultProtocols.indexOf(protocol),
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${created} quick references (${skipped} already existed)`,
      created,
      skipped,
    });
  } catch (error) {
    console.error('[API] Error seeding quick references:', error);
    return NextResponse.json(
      { error: 'Failed to seed quick references' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quick-references/seed
 * Check if defaults are seeded
 */
export async function GET() {
  try {
    const defaultCount = await prisma.quickReference.count({
      where: { isDefault: true },
    });

    const totalDefaults = defaultMedications.length + defaultProtocols.length;

    return NextResponse.json({
      seeded: defaultCount >= totalDefaults,
      defaultCount,
      expectedCount: totalDefaults,
    });
  } catch (error) {
    console.error('[API] Error checking quick references seed status:', error);
    return NextResponse.json(
      { error: 'Failed to check seed status' },
      { status: 500 }
    );
  }
}
