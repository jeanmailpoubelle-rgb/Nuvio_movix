exports.visibleName = name => name.replace(/^[\ufe00-\ufe0f]+/, '');

// Resolved audio is separate from the native bridge's optional caption field.
exports.audio = item => item.audioLanguage ?? item.language;
