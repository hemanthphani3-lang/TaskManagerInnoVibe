const fs = require('fs');
const path = require('path');

const targetStr = `const { data: { user } } = await supabase.auth.getUser()`;
const replacementStr = `let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }`;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src/app'));
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(targetStr)) {
    content = content.replace(new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacementStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
    changedCount++;
  }
}

console.log('Total files fixed:', changedCount);
