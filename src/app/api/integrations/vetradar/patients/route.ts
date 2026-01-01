import { NextResponse } from 'next/server';
import { VetRadarScraper } from '@/lib/integrations/vetradar-scraper';
import { VetRadarIntegrationService } from '@/lib/integrations/vetradar-integration';

/**
 * GET /api/integrations/vetradar/patients
 *
 * Fetch active patients from VetRadar
 */
export async function GET(request: Request) {
  try {
    const username = process.env.VETRADAR_USERNAME;
    const password = process.env.VETRADAR_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'VetRadar credentials not configured. Set VETRADAR_USERNAME and VETRADAR_PASSWORD in .env.local',
        },
        { status: 500 }
      );
    }

    const scraper = new VetRadarScraper();
    const session = await scraper.login(username, password);

    try {
      const patients = await scraper.getActivePatients(session);

      return NextResponse.json({
        success: true,
        patients: patients,
        count: patients.length,
      });
    } finally {
      await scraper.closeSession(session);
    }
  } catch (error) {
    console.error('VetRadar integration error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/vetradar/patients
 *
 * Import active patients from VetRadar with full mapping to UnifiedPatient
 * Saves patients to database or updates existing patients
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    console.log('[VetRadar API] Starting import...');

    const service = new VetRadarIntegrationService();

    try {
      // Import patients from VetRadar
      await service.login(email, password);
      const result = await service.importActivePatients();
      await service.logout();

      console.log(`[VetRadar API] Import successful: ${result.patients.length} patients`);

      // Save patients to database (or update if they already exist)
      // Note: For sync functionality, we match by patient name
      const { prisma } = await import('@/lib/prisma');
      const savedPatients = [];

      for (const patient of result.patients) {
        try {
          // Try to find existing patient by name
          const existingPatient = await prisma.patient.findFirst({
            where: {
              demographics: {
                path: ['name'],
                equals: patient.demographics.name,
              },
            },
          });

          if (existingPatient) {
            // Update existing patient (merge VetRadar data with existing data)
            console.log(`[VetRadar API] Updating existing patient: ${patient.demographics.name}`);

            // Deep merge roundingData: Only overwrite fields that have actual data from VetRadar
            const existingRounding = (existingPatient.roundingData as any) || {};
            const newRounding = (patient.roundingData as any) || {};

            const mergedRoundingData = {
              ...existingRounding,
              // Only overwrite if VetRadar has actual non-empty values
              ...(newRounding.signalment ? { signalment: newRounding.signalment } : {}),
              ...(newRounding.location ? { location: newRounding.location } : {}),
              ...(newRounding.icuCriteria ? { icuCriteria: newRounding.icuCriteria } : {}),
              ...(newRounding.code ? { code: newRounding.code } : {}),
              ...(newRounding.codeStatus ? { codeStatus: newRounding.codeStatus } : {}),
              ...(newRounding.problems ? { problems: newRounding.problems } : {}),
              ...(newRounding.diagnosticFindings ? { diagnosticFindings: newRounding.diagnosticFindings } : {}),
              ...(newRounding.therapeutics ? { therapeutics: newRounding.therapeutics } : {}),
              ...(newRounding.ivc ? { ivc: newRounding.ivc } : {}),
              ...(newRounding.fluids ? { fluids: newRounding.fluids } : {}),
              ...(newRounding.cri ? { cri: newRounding.cri } : {}),
              ...(newRounding.overnightDx ? { overnightDx: newRounding.overnightDx } : {}),
              ...(newRounding.concerns ? { concerns: newRounding.concerns } : {}),
              ...(newRounding.comments ? { comments: newRounding.comments } : {}),
            };

            console.log(`[VetRadar API] Existing roundingData:`, existingRounding);
            console.log(`[VetRadar API] New VetRadar roundingData:`, newRounding);
            console.log(`[VetRadar API] Merged roundingData for ${patient.demographics.name}:`, mergedRoundingData);

            const updated = await prisma.patient.update({
              where: { id: existingPatient.id },
              data: {
                // Merge therapeutics, fluids, etc. from VetRadar with existing data
                roundingData: mergedRoundingData,
                // Keep existing demographics, just update status if needed
                status: patient.status,
                updatedAt: new Date(),
              },
              include: {
                soapNotes: true,
                tasks: true,
              },
            });
            savedPatients.push(updated);
          } else {
            // Create new patient
            console.log(`[VetRadar API] Creating new patient: ${patient.demographics.name}`);

            // Set default rounding data with location=IP, icuCriteria=N/A, ivc=Yes, fluids=n/a, cri=n/a
            const defaultRoundingData = {
              location: 'IP',
              icuCriteria: 'N/A',
              ivc: 'Yes',
              fluids: 'n/a',
              cri: 'n/a',
              ...(patient.roundingData as any || {}),
            };

            const created = await prisma.patient.create({
              data: {
                status: patient.status || 'Active',
                type: patient.type || 'Medical', // Allow type to be set from import, default to Medical
                demographics: patient.demographics,
                medicalHistory: patient.medicalHistory || {},
                currentStay: patient.currentStay,
                roundingData: defaultRoundingData,
                mriData: patient.mriData as any,
                stickerData: patient.stickerData as any,
                appointmentInfo: patient.appointmentInfo,
              },
              include: {
                soapNotes: true,
                tasks: true,
              },
            });
            savedPatients.push(created);
          }
        } catch (dbError) {
          console.error(`[VetRadar API] Error saving patient ${patient.demographics.name}:`, dbError);
          // Continue with other patients
        }
      }

      console.log(`[VetRadar API] Saved ${savedPatients.length}/${result.patients.length} patients to database`);

      return NextResponse.json({
        ...result,
        savedCount: savedPatients.length,
      });
    } catch (error) {
      await service.logout();
      throw error;
    }
  } catch (error) {
    console.error('[VetRadar API] Import failed:', error);

    return NextResponse.json(
      {
        success: false,
        patients: [],
        manualEntryRequirements: [],
        totalEstimatedTimeSeconds: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 500 }
    );
  }
}
