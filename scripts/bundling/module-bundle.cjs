const fs = require('node:fs');
const path = require('node:path');
function moduleBundle(root, entryFile, globalName) {
    const files = new Map();
    function load(file) {
        const id = path.relative(root, file).replace(/\\/g, '/');
        if (files.has(id)) return id;
        files.set(id, '');
        let source = fs.readFileSync(file, 'utf8');
        if (file.endsWith('.json')) source = 'module.exports=' + JSON.stringify(JSON.parse(source)) + ';';
        source = source.replace(/require\((['"])([^'"]+)\1\)/g, (_match, _quote, target) => {
            if (!target.startsWith('.')) throw new Error('External module in Anime-Sama bundle: ' + target);
            let resolved = path.resolve(path.dirname(file), target);
            if (!path.extname(resolved)) resolved += '.js';
            if (!resolved.startsWith(root + path.sep)) throw new Error('Module outside repository');
            return 'require(' + JSON.stringify(load(resolved)) + ')';
        });
        files.set(id, source); return id;
    }
    const entry = load(path.join(root, entryFile));
    return 'var '+globalName+'=(function(){var modules={' + [...files].map(([id, source]) =>
        JSON.stringify(id) + ':function(require,module,exports){\n' + source + '\n}').join(',\n') +
        '},cache={};function require(id){if(!cache[id]){var module={exports:{}};cache[id]=module;modules[id](require,module,module.exports);}return cache[id].exports;}return require(' + JSON.stringify(entry) + ');})();\n';
}
module.exports = moduleBundle;
