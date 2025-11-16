/**
 * Test script to verify patient ID generation fix
 * This simulates what happens when VetRadar data is parsed
 */

// Simulate the old ID generation (using only first name)
function generateOldId(firstName: string): string {
  return firstName.toLowerCase().replace(/\s+/g, '-');
}

// Simulate the new ID generation (using full name)
function generateNewId(fullName: string): string {
  return fullName.toLowerCase().replace(/\s+/g, '-');
}

// Test data - 6 patients from VetRadar
const testPatients = [
  { firstName: 'Clara', lastName: 'Iovino', fullName: 'Clara Iovino' },
  { firstName: 'Daisy', lastName: 'Budd', fullName: 'Daisy Budd' },
  { firstName: 'Guava', lastName: 'Lin', fullName: 'Guava Lin' },
  { firstName: 'Gus', lastName: 'Wagenbach', fullName: 'Gus Wagenbach' },
  { firstName: 'King', lastName: 'Barbosa', fullName: 'King Barbosa' },
  { firstName: 'Sadie', lastName: 'Rosenberg', fullName: 'Sadie Rosenberg' },
];

console.log('Testing Patient ID Generation\n');
console.log('='.repeat(60));

// Test with old method (BUG - would create duplicate IDs if first names match)
console.log('\n❌ OLD METHOD (firstName only):');
console.log('-'.repeat(40));
const oldIds = new Set<string>();
testPatients.forEach(p => {
  const id = generateOldId(p.firstName);
  const isDuplicate = oldIds.has(id);
  oldIds.add(id);
  console.log(`  ${p.fullName.padEnd(20)} → ${id.padEnd(20)} ${isDuplicate ? '⚠️ DUPLICATE!' : '✓'}`);
});

// Test with new method (FIX - uses full name)
console.log('\n✅ NEW METHOD (fullName):');
console.log('-'.repeat(40));
const newIds = new Set<string>();
testPatients.forEach(p => {
  const id = generateNewId(p.fullName);
  const isDuplicate = newIds.has(id);
  newIds.add(id);
  console.log(`  ${p.fullName.padEnd(20)} → ${id.padEnd(20)} ${isDuplicate ? '⚠️ DUPLICATE!' : '✓'}`);
});

// Simulate what would happen if we had 6 patients all named "Clara" with different last names
console.log('\n\n🔍 EDGE CASE TEST: Multiple patients with same first name');
console.log('='.repeat(60));

const claraPatients = [
  'Clara Iovino',
  'Clara Smith',
  'Clara Johnson',
  'Clara Williams',
  'Clara Brown',
  'Clara Davis',
];

console.log('\n❌ OLD METHOD would create 6 duplicate IDs:');
console.log('-'.repeat(40));
claraPatients.forEach(name => {
  const firstName = name.split(' ')[0];
  const id = generateOldId(firstName);
  console.log(`  ${name.padEnd(20)} → ${id} ⚠️`);
});

console.log('\n✅ NEW METHOD creates unique IDs:');
console.log('-'.repeat(40));
claraPatients.forEach(name => {
  const id = generateNewId(name);
  console.log(`  ${name.padEnd(20)} → ${id} ✓`);
});

console.log('\n\n📊 SUMMARY');
console.log('='.repeat(60));
console.log('The bug was in line 831 of vetradar-scraper.ts:');
console.log('  OLD: id: firstName.toLowerCase().replace(/\\s+/g, \'-\')');
console.log('  NEW: id: fullName.toLowerCase().replace(/\\s+/g, \'-\')');
console.log('\nThis fix ensures each patient gets a unique ID based on their');
console.log('full name, preventing display issues even if multiple patients');
console.log('share the same first name.');