// Validate local Markdown link destinations without fetching remote services.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {cwd:root,encoding:'utf8'})
  .split('\0').filter(file => file.endsWith('.md') && fs.existsSync(path.join(root,file))))];
let checked = 0;
const errors = [];
for (const file of files) {
  // Code examples are not rendered Markdown links.
  const text = fs.readFileSync(path.join(root,file),'utf8').replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm,'');
  const links = text.matchAll(/!?\[[^\]\n]*\]\((<[^>\n]+>|[^\s)]+)(?:\s+"[^"\n]*")?\)/g);
  for (const match of links) {
    const target = match[1].replace(/^<|>$/g,'');
    if (!target || target.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
    let destination;
    try { destination = decodeURIComponent(target.split(/[?#]/,1)[0]); }
    catch { errors.push(`${file}: malformed link ${target}`); continue; }
    const absolute = path.resolve(destination.startsWith('/') ? root : path.dirname(path.join(root,file)),destination.replace(/^\//,''));
    checked++;
    if (absolute !== root && !absolute.startsWith(root+path.sep)) errors.push(`${file}: link leaves repository: ${target}`);
    else if (!fs.existsSync(absolute)) errors.push(`${file}: missing ${target}`);
  }
}
if (errors.length) {
  process.stderr.write(errors.join('\n')+'\n');
  process.exitCode = 1;
} else console.log(`Documentation: ${files.length} Markdown files, ${checked} local destinations checked.`);
