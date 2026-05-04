const fs = require('fs');
const path = require('path');

const BASE = 'F:/PrepBuddy/PrepBuddy-AI/data/question-bank';

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) results = results.concat(getAllFiles(fullPath));
    else if (file.endsWith('.json')) results.push(fullPath);
  });
  return results;
}

function fixJSON(content) {
  // Fix 1: Missing commas between array elements
  // Pattern: "..." followed by newline/space then "..." without comma
  let fixed = content.replace(/"(\s*)\n(\s*)"/g, '",\n$2"');

  // Fix 2: expressjs/nextjs — "Unexpected non-whitespace at position 2"
  // means two JSON arrays concatenated: [...][...]  → merge them
  fixed = fixed.trim();
  if (fixed.startsWith('[') && fixed.includes('][')) {
    // Two arrays joined — merge into one
    fixed = fixed.replace(/\]\s*\[/g, ',');
  }

  // Fix 3: trailing commas before ] 
  fixed = fixed.replace(/,(\s*)\]/g, '$1]');

  return fixed;
}

const files = getAllFiles(BASE);
let fixedCount = 0;
let stillBroken = [];

files.forEach(filePath => {
  try {
    JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // Already valid, skip
  } catch (e) {
    console.log(`Fixing: ${filePath.replace(BASE, '')}`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const fixed = fixJSON(raw);

    try {
      const parsed = JSON.parse(fixed);
      fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2));
      console.log(`  ✅ Fixed — ${parsed.length} items`);
      fixedCount++;
    } catch (e2) {
      console.log(`  ❌ Still broken: ${e2.message}`);
      // Show the problem area
      const lines = fixed.split('\n');
      const errorMatch = e2.message.match(/line (\d+)/);
      if (errorMatch) {
        const lineNum = parseInt(errorMatch[1]);
        console.log(`  Problem around line ${lineNum}:`);
        for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 2); i++) {
          console.log(`    ${i + 1}: ${lines[i]}`);
        }
      }
      stillBroken.push(filePath.replace(BASE, ''));
    }
  }
});

console.log(`\n✅ Fixed: ${fixedCount}`);
console.log(`❌ Still broken: ${stillBroken.length}`);
stillBroken.forEach(f => console.log('  -', f));

// Final verification
console.log('\n--- Final verification ---');
let good = 0, bad = 0;
getAllFiles(BASE).forEach(f => {
  try { JSON.parse(fs.readFileSync(f, 'utf-8')); good++; }
  catch (e) { bad++; console.log('STILL BAD:', f.replace(BASE, ''), e.message); }
});
console.log(`Valid: ${good}, Broken: ${bad}`);
