import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default medications
const defaultMedications = [
  { name: 'Gabapentin', dose: '10-20 mg/kg PO q8-12h', notes: 'Neuropathic pain, seizures' },
  { name: 'Metronidazole', dose: '15 mg/kg PO BID', notes: 'GI, anaerobic infections' },
  { name: 'Maropitant (Cerenia)', dose: '1 mg/kg SQ/PO SID', notes: 'Anti-emetic' },
  { name: 'Fentanyl CRI', dose: '3-5 mcg/kg/hr', notes: 'Severe pain management' },
  { name: 'Levetiracetam (Keppra)', dose: '20 mg/kg PO/IV TID', notes: 'Seizure control' },
];

// Default protocols
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
];

/**
 * POST /api/reference/seed
 * Seed default reference data (only if tables are empty)
 */
export async function POST() {
  try {
    // Check if medications exist
    const medicationCount = await prisma.referenceMedication.count();

    if (medicationCount === 0) {
      // Seed default medications
      await prisma.referenceMedication.createMany({
        data: defaultMedications.map((med, idx) => ({
          ...med,
          isDefault: true,
          sortOrder: idx,
        })),
      });
      console.log('[API] Seeded default medications');
    }

    // Check if protocols exist
    const protocolCount = await prisma.referenceProtocol.count();

    if (protocolCount === 0) {
      // Seed default protocols
      await prisma.referenceProtocol.createMany({
        data: defaultProtocols.map((proto, idx) => ({
          ...proto,
          isDefault: true,
          sortOrder: idx,
        })),
      });
      console.log('[API] Seeded default protocols');
    }

    return NextResponse.json({
      success: true,
      seeded: {
        medications: medicationCount === 0,
        protocols: protocolCount === 0,
      }
    });
  } catch (error) {
    console.error('[API] Error seeding reference data:', error);
    return NextResponse.json(
      { error: 'Failed to seed reference data' },
      { status: 500 }
    );
  }
}
