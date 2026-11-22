const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../config/distributions.json');

test('every manifest resolves to generated code; native settings never advertise private adapters', () => {
  for (const [track, products] of Object.entries(catalog)) {
    if (typeof products !== 'object') continue;
    for (const [product, file] of Object.entries(products)) {
      const manifest = require('../' + file);
      for (const entry of manifest.scrapers) {
        const artifact = path.resolve(__dirname, '..', path.dirname(file), entry.filename);
        assert.ok(fs.existsSync(artifact), artifact);
        if (!entry.enabled || !entry.hasSettings) continue;
        const fields = require(artifact).onSettings();
        if (track === 'native') {
          assert.ok(!fields.some(f => ['aiometadataSavedManifestUrl','xperienceManifestUrl','episodeMetadataSource'].includes(f.key)));
        } else if (product !== 'diagnostic') {
          assert.ok(fields.some(f => f.key === 'xperienceManifestUrl'));
        }
      }
    }
  }
});

test('legacy export preserves installed relative URLs and copies no editable source or private config', () => {
  const os = require('node:os');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sources-compat-'));
  const exportCompat = require('../scripts/release/export-compat.cjs');
  try {
    exportCompat(temporary);
    for (const [canonical, legacy] of [
      [catalog.plus.fr,'manifest.json'], [catalog.plus.anime,'plugins/anime-sama/manifest.json'],
      [catalog.plus.en,'plugins/sources-en/manifest.json'], [catalog.plus.diagnostic,'plugins/episode-diagnostics/manifest.json']
    ]) {
      assert.equal(fs.readFileSync(path.join(temporary, legacy),'utf8'), fs.readFileSync(canonical,'utf8'));
      for (const entry of JSON.parse(fs.readFileSync(canonical)).scrapers) {
        assert.deepEqual(fs.readFileSync(path.join(temporary, path.dirname(legacy),entry.filename)),
          fs.readFileSync(path.join(path.dirname(canonical),entry.filename)));
      }
    }
    assert.ok(!fs.existsSync(path.join(temporary, 'src')));
    assert.ok(!fs.existsSync(path.join(temporary, 'config')));
    assert.throws(() => exportCompat(temporary), /empty/);
    assert.throws(() => exportCompat(process.cwd()), /outside/);
  } finally { fs.rmSync(temporary,{recursive:true,force:true}); }
});
