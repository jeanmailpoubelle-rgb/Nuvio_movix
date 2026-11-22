// Render public compatibility artifacts into a new empty directory. No git/network
// side effects here; publication is a separate, checked workflow step.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const catalog = require('../../config/distributions.json');
function exportCompat(destination) {
  const target = path.resolve(destination);
  if (target === root || target.startsWith(root + path.sep)) throw new Error('Export must be outside source checkout');
  fs.mkdirSync(target, {recursive:true});
  if (fs.readdirSync(target).length) throw new Error('Export requires an empty directory');
  function copy(source, relative) {
    const output = path.join(target, relative);
    fs.mkdirSync(path.dirname(output), {recursive:true});
    fs.cpSync(path.join(root, source), output, {recursive:true});
  }
  for (const [source, legacy] of [
    [catalog.plus.fr, 'manifest.json'],
    [catalog.plus.anime, 'plugins/anime-sama/manifest.json'],
    [catalog.plus.en, 'plugins/sources-en/manifest.json'],
    [catalog.plus.diagnostic, 'plugins/episode-diagnostics/manifest.json']
  ]) {
    copy(source, legacy);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, source)));
    for (const file of new Set(manifest.scrapers.map(entry => entry.filename)))
      copy(path.join(path.dirname(source), file), path.join(path.dirname(legacy), file));
  }
  copy('plugins/sources-en/data', 'plugins/sources-en/data');
  copy('LICENSE', 'LICENSE');
  fs.writeFileSync(path.join(target,'README.md'), '# Compatibility distribution\n\nGenerated from `main`; do not edit here. Existing installed Preview URLs remain valid.\n\nSource, canonical installation URLs and development documentation:\nhttps://github.com/jeanmailpoubelle-rgb/Nuvio_movix/tree/main\n');
  return target;
}
if (require.main === module) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/release/export-compat.cjs EMPTY_DESTINATION');
  exportCompat(process.argv[2]);
}
module.exports = exportCompat;
