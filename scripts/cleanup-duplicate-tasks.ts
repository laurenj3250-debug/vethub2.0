/**
 * Cleanup script to remove duplicate tasks from the database
 * Keeps the oldest task per (patientId, title) pair
 * Prefers keeping completed tasks over incomplete ones
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateTasks() {
  console.log('🔍 Finding duplicate tasks...\n');

  // Find all tasks grouped by patientId and title
  const allTasks = await prisma.task.findMany({
    orderBy: [
      { patientId: 'asc' },
      { title: 'asc' },
      { completed: 'desc' }, // Completed tasks first (true > false)
      { createdAt: 'asc' },  // Then oldest first
    ],
  });

  // Group tasks by patientId + title
  const taskGroups = new Map<string, typeof allTasks>();

  for (const task of allTasks) {
    const key = `${task.patientId}::${task.title}`;
    if (!taskGroups.has(key)) {
      taskGroups.set(key, []);
    }
    taskGroups.get(key)!.push(task);
  }

  // Find duplicates
  const duplicateGroups = Array.from(taskGroups.entries())
    .filter(([_, tasks]) => tasks.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate tasks found!');
    return;
  }

  console.log(`Found ${duplicateGroups.length} task(s) with duplicates:\n`);

  let totalDeleted = 0;
  const tasksToDelete: string[] = [];

  for (const [key, tasks] of duplicateGroups) {
    const [patientId, title] = key.split('::');
    console.log(`📋 "${title}" (Patient ${patientId}): ${tasks.length} copies`);

    // Keep the first one (completed + oldest due to sorting)
    const [keep, ...duplicates] = tasks;
    console.log(`   ✓ Keeping: ID ${keep.id} (completed: ${keep.completed}, created: ${keep.createdAt.toISOString()})`);

    for (const dup of duplicates) {
      console.log(`   ✗ Deleting: ID ${dup.id} (completed: ${dup.completed}, created: ${dup.createdAt.toISOString()})`);
      tasksToDelete.push(dup.id);
    }
    console.log('');
  }

  console.log(`\n🗑️  Will delete ${tasksToDelete.length} duplicate tasks.`);

  // Actually delete
  if (tasksToDelete.length > 0) {
    const result = await prisma.task.deleteMany({
      where: {
        id: { in: tasksToDelete },
      },
    });
    console.log(`✅ Deleted ${result.count} duplicate tasks.`);
    totalDeleted = result.count;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Duplicate groups found: ${duplicateGroups.length}`);
  console.log(`   - Tasks deleted: ${totalDeleted}`);
}

async function main() {
  try {
    await cleanupDuplicateTasks();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
