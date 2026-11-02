// All active manifest entries share one name; labels compose across completions.
function presentSourcesFrStreams(values) {
    var entry = String(DISPLAY_ENTRY_ORDER).padStart(3, '0');
    return presentStreams(values).map(function (item, index) {
        var position = String(index + 1).padStart(6, '0');
        var name = values.length > 1 ? item.name.replace(/^\d+\. /, '') : item.name;
        return Object.assign({}, item, {name: StreamOrder.sortPrefix(StreamOrder.entryRank(item) + '.' + entry + '.' + position + '.') + name});
    });
}
