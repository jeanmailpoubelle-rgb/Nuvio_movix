const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
const endpoints = JSON.parse(fs.readFileSync(path.join(root, 'config/endpoints.json')));
// Configuration is compiled locally; successful lookups never download config.
function https(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Invalid endpoint: ' + value);
}
https(endpoints.catalogue.vidzy);
if (!Array.isArray(endpoints.catalogue.lulu) || !endpoints.catalogue.lulu.length) throw new Error('Expected Lulu player hosts');
endpoints.catalogue.lulu.forEach(value => {
    https(value);
    if (new URL(value).pathname !== '/') throw new Error('Expected a Lulu player origin');
});
if (!Array.isArray(endpoints.catalogue.mirrors) || !endpoints.catalogue.mirrors.length) throw new Error('Expected catalogue mirrors');
endpoints.catalogue.mirrors.forEach(https);
endpoints.catalogue.directories.forEach(entry => {
    https(entry.url);
    if (!/^[a-z]+$/.test(entry.brand) || !['labelled-table', 'open-button'].includes(entry.parser)) throw new Error('Invalid directory');
});
Object.values(endpoints.purstream).forEach(https);
https(endpoints.movix.directory);
if (endpoints.movix.mirrors.length > 2 || endpoints.movix.sites.length > 2) throw new Error('Too many Movix recovery endpoints');
endpoints.movix.sites.forEach(https);
endpoints.movix.mirrors.forEach(endpoint => { https(endpoint.api); https(endpoint.site); });
if (!endpoints.movix.catalogues.length || endpoints.movix.catalogues.length > 3 || endpoints.movix.catalogues.some(name => !['wiflix', 'fstream', 'coflix'].includes(name))) throw new Error('Invalid Movix catalogues');
if (!endpoints.movix.extra.length || endpoints.movix.extra.length > 3 || new Set(endpoints.movix.extra).size !== endpoints.movix.extra.length || endpoints.movix.extra.some(name => !['custom', 'omega', 'swiftflow'].includes(name))) throw new Error('Invalid extra catalogues');
https(endpoints.frembed.base);
if (!Array.isArray(endpoints.yablom.mirrors) || !endpoints.yablom.mirrors.length || endpoints.yablom.mirrors.length > 3) throw new Error('Invalid Yablom mirrors');
endpoints.yablom.mirrors.forEach(endpoint => {
    https(endpoint.site);
    if (new URL(endpoint.site).pathname !== '/') throw new Error('Expected a Yablom site origin');
    if (endpoint.search) { https(endpoint.search); if (new URL(endpoint.search).origin !== new URL(endpoint.site).origin) throw new Error('Yablom search/site mismatch'); }
});
if (!Array.isArray(endpoints.yablom.directories) || endpoints.yablom.directories.length > 2) throw new Error('Invalid Yablom directories');
endpoints.yablom.directories.forEach(endpoint => { https(endpoint.url); if (!['brand-address', 'fmhy'].includes(endpoint.parser)) throw new Error('Invalid Yablom directory parser'); });
if (!Number.isInteger(endpoints.streams.minimumResolution) || endpoints.streams.minimumResolution < 0 || endpoints.streams.minimumResolution > 16384) throw new Error('Invalid minimum resolution');
if (!Number.isInteger(endpoints.selection.targetSources) || endpoints.selection.targetSources < 1 || endpoints.selection.targetSources > 6) throw new Error('Invalid result target');
if (!Array.isArray(endpoints.selection.hostPriority) || new Set(endpoints.selection.hostPriority).size !== endpoints.selection.hostPriority.length || endpoints.selection.hostPriority.some(name => !endpoints.hosts[name] && name !== 'lulu')) throw new Error('Invalid host priority');
for (const [family, patterns] of Object.entries(endpoints.hosts)) {
    if (!/^[a-z]+$/.test(family) || !Array.isArray(patterns) || !patterns.length || patterns.some(pattern => !/^[a-z0-9.-]+(?:\.\*)?$/.test(pattern))) throw new Error('Invalid host family');
}
for (const key of ['requests', 'elapsedMs', 'hostConcurrency']) {
    const value = endpoints.limits[key];
    if (!Number.isInteger(value) || value < 1 || value > (key === 'elapsedMs' ? 45000 : key === 'requests' ? 32 : 16)) throw new Error('Invalid request limit');
}
const modules = {
    movix: ['movix-domains.js', 'purstream-api.js', 'frembed.js', 'purstream-provider.js'],
    'movix-catalogues': ['movix-domains.js', 'movix-catalogues.js'],
    'movix-extra': ['movix-domains.js', 'movix-extra.js'],
    nakios: ['catalogue.js', 'vidzy.js'],
    'frembed-hosts': ['frembed.js', 'frembed-provider.js'],
    yablom: ['yablom.js'],
    purstream: ['retired.js'],
};
let stale = false;
for (const entry of manifest.scrapers) {
    const name = path.basename(entry.filename, '.js');
    const parts = name === 'purstream' ? modules[name] : ['common.js', 'extractors.js', 'resolvers.js', 'hls.js', 'selection.js', 'seek.js'].concat(modules[name]);
    const aes = name === 'purstream' ? '' : '/* aes-js 3.1.2\n' + fs.readFileSync(path.join(root, 'vendor/aes-js/LICENSE.txt'), 'utf8') + '\n*/\nvar NativeAES = (function () { var module = {exports:{}}, exports = module.exports;\n' + fs.readFileSync(path.join(root, 'vendor/aes-js/index.js'), 'utf8') + '\nreturn module.exports; })();\n';
    const output = `/* Generated by npm run build. Edit src/, not providers/.\n * SPDX-License-Identifier: GPL-3.0-only\n */\n(function () {\n'use strict';\nvar PROVIDER_NAME = ${JSON.stringify(entry.name)}, PROVIDER_ID = ${JSON.stringify(entry.id)}, VERSION = ${JSON.stringify(entry.version)};\n` +
        'var ENDPOINTS = ' + JSON.stringify(endpoints) + ';\n' +
        aes + parts.map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n') +
        '\nif (typeof module !== "undefined" && module.exports) module.exports = { getStreams: getStreams };\nelse if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams;\nelse if (typeof global !== "undefined") global.getStreams = getStreams;\n})();\n';
    const target = path.join(root, entry.filename);
    if (process.argv.includes('--check')) {
        if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== output) { console.error(`Stale bundle: ${entry.filename}`); stale = true; }
    } else fs.writeFileSync(target, output);
}
if (stale) process.exitCode = 1;
