const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../packages/apps/web/modules/app/src/pages');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // With word boundaries \b to avoid matching 500 when replacing 50
  
  // Replace text-brand-700, 800, 900 with text-ink-title
  content = content.replace(/text-brand-(700|800|900|950)\b/g, 'text-ink-title');
  
  // Replace text-brand-500, 600 with secondary
  content = content.replace(/text-brand-600\b/g, 'text-secondary-600');
  content = content.replace(/text-brand-500\b/g, 'text-secondary-600'); // We don't want orange text usually, it looks red. Primary orange is only good for button backgrounds.
  
  // Replace faint brand backgrounds with faint secondary backgrounds
  content = content.replace(/bg-brand-(25|50|100|200)\b/g, (match, p1) => `bg-secondary-${p1}`);
  
  // Replace brand borders with secondary borders
  content = content.replace(/border-brand-(100|200|300|400|500)\b/g, (match, p1) => `border-secondary-${p1}`);
  
  // Replace hover brand faintly with hover secondary faintly
  content = content.replace(/hover:bg-brand-(25|50|100|200)\b/g, (match, p1) => `hover:bg-secondary-${p1}`);
  content = content.replace(/hover:text-brand-(500|600)\b/g, 'hover:text-secondary-600');
  content = content.replace(/hover:text-brand-(700|800|900)\b/g, 'hover:text-ink-title');
  content = content.replace(/hover:border-brand-(100|200|300|400|500)\b/g, (match, p1) => `hover:border-secondary-${p1}`);
  
  // Replace focus rings faintly
  content = content.replace(/focus:ring-brand-(500\/\d+)\b/g, (match, p1) => `focus:ring-secondary-${p1}`);
  content = content.replace(/focus:border-brand-(300|400|500)\b/g, (match, p1) => `focus:border-secondary-${p1}`);
  
  // Keep bg-brand-500 as they are (pure orange)
  // Keep hover:bg-brand-600 as it is (pure orange dark for button hover)

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
