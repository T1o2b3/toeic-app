import fs from 'fs';
import path from 'path';

const CONTENT_DIR = 'public/content';
const FILES = ['listening-part2.json', 'sets-part3.json', 'sets-part4.json', 'sets-part6.json', 'sets-part7.json'];

function checkFile(fileName) {
  const filePath = path.join(CONTENT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File ${fileName} not found.`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entries = data.entries;
  const seen = new Map();
  const duplicates = [];

  entries.forEach(entry => {
    let text = '';
    if (entry.kind === 'single') {
      text = entry.stem || entry.question;
    } else if (entry.script) {
      text = entry.script.map(s => s.text).join(' ');
    } else if (entry.passages) {
      text = entry.passages.map(p => p.text).join(' ');
    }

    if (seen.has(text)) {
      duplicates.push({ id: entry.id, duplicateOf: seen.get(text), text: text.slice(0, 50) + '...' });
    } else {
      seen.set(text, entry.id);
    }
  });

  console.log(`File ${fileName}: ${duplicates.length} duplicates found.`);
  duplicates.forEach(d => console.log(`  ${d.id} is duplicate of ${d.duplicateOf} | Text: ${d.text}`));
}

FILES.forEach(checkFile);
