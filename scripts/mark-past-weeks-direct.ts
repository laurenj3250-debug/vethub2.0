/**
 * Mark all past weeks as Direct (clinicalNeurologyDirect = 1)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markPastWeeksDirect() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  console.log(`Today: ${todayStr}`);
  console.log('Marking all past weeks as Direct = 1...\n');

  // Get all weekly schedule entries
  const allWeeks = await prisma.aCVIMWeeklySchedule.findMany({
    orderBy: [
      { residencyYear: 'asc' },
      { monthNumber: 'asc' },
      { weekNumber: 'asc' },
    ],
  });

  console.log(`Found ${allWeeks.length} total week entries`);

  let updated = 0;
  for (const week of allWeeks) {
    // Check if this week is in the past (weekStartDate < today)
    if (week.weekStartDate && week.weekStartDate < todayStr) {
      // Only update if not already set to 1
      if (week.clinicalNeurologyDirect !== 1) {
        await prisma.aCVIMWeeklySchedule.update({
          where: { id: week.id },
          data: { clinicalNeurologyDirect: 1 },
        });
        console.log(`  ✓ Updated: Month ${week.monthNumber}, Week ${week.weekNumber} (${week.weekDateRange})`);
        updated++;
      } else {
        console.log(`  - Already set: Month ${week.monthNumber}, Week ${week.weekNumber}`);
      }
    } else {
      console.log(`  ○ Future/current: Month ${week.monthNumber}, Week ${week.weekNumber} (${week.weekDateRange})`);
    }
  }

  console.log(`\n✅ Done! Updated ${updated} past weeks to Direct = 1`);

  await prisma.$disconnect();
}

markPastWeeksDirect().catch(console.error);
