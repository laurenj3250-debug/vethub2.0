import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default medications
const defaultMedications = [
  { name: 'Gabapentin', dose: '10-20 mg/kg PO q8-12h', notes: 'Neuropathic pain, seizures' },
  { name: 'Metronidazole', dose: '10 mg/kg PO BID', notes: 'DO NOT EXCEED 15mg/kg - GI, anaerobic infections' },
  { name: 'Maropitant (Cerenia)', dose: '1 mg/kg SQ/PO SID', notes: 'Anti-emetic' },
  { name: 'Fentanyl CRI', dose: '3-5 mcg/kg/hr', notes: 'Severe pain management' },
  { name: 'Levetiracetam (Keppra)', dose: '20 mg/kg PO/IV TID', notes: 'Seizure control' },
  { name: 'Omeprazole', dose: '1 mg/kg PO SID', notes: 'GI protectant, proton pump inhibitor' },
  { name: 'Clavamox', dose: '13.75 mg/kg PO BID', notes: 'Broad spectrum antibiotic' },
  { name: 'Cephalexin', dose: '20-30 mg/kg PO BID', notes: 'First-gen cephalosporin antibiotic' },
  { name: 'Doxycycline', dose: '5 mg/kg PO BID or 10 mg/kg PO SID', notes: 'Tetracycline antibiotic' },
  { name: 'Clindamycin', dose: '12-15 mg/kg PO BID', notes: 'Lincosamide antibiotic' },
  { name: 'Enrofloxacin', dose: '5-10 mg/kg PO SID', notes: 'Fluoroquinolone antibiotic' },
  { name: 'Amantadine', dose: '3-5 mg/kg PO BID', notes: 'NMDA antagonist, chronic pain' },
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
 * Seed default reference data (adds missing items, skips duplicates)
 */
export async function POST() {
  try {
    let medsAdded = 0;
    let protosAdded = 0;

    // Add any missing medications (skip duplicates by name)
    for (let idx = 0; idx < defaultMedications.length; idx++) {
      const med = defaultMedications[idx];
      const existing = await prisma.referenceMedication.findUnique({
        where: { name: med.name },
      });
      if (!existing) {
        await prisma.referenceMedication.create({
          data: {
            ...med,
            isDefault: true,
            sortOrder: idx,
          },
        });
        medsAdded++;
      }
    }
    if (medsAdded > 0) {
      console.log(`[API] Seeded ${medsAdded} new medications`);
    }

    // Add any missing protocols (skip duplicates by name)
    for (let idx = 0; idx < defaultProtocols.length; idx++) {
      const proto = defaultProtocols[idx];
      const existing = await prisma.referenceProtocol.findUnique({
        where: { name: proto.name },
      });
      if (!existing) {
        await prisma.referenceProtocol.create({
          data: {
            ...proto,
            isDefault: true,
            sortOrder: idx,
          },
        });
        protosAdded++;
      }
    }
    if (protosAdded > 0) {
      console.log(`[API] Seeded ${protosAdded} new protocols`);
    }

    return NextResponse.json({
      success: true,
      seeded: {
        medications: medsAdded,
        protocols: protosAdded,
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
