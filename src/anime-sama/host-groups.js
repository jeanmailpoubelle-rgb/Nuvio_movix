const {defaults}=require('./config');
function entryScope(id) {
  // TV prefixes a repository UUID; Mobile prefixes the manifest URL. Both
  // append the literal manifest scraper ID after the final colon.
  if(!id)return 'all'; // Explicit unscoped development/benchmark harness.
  const key=String(id).split(':').pop();
  if(!Object.prototype.hasOwnProperty.call(defaults.hostEntries,key))throw Object.assign(new Error('Unsupported Anime-Sama entry'),{code:'UNSUPPORTED_ENTRY_ID'});
  return defaults.hostEntries[key];
}
function assignedScope(url,classify=hostFamily) {
  const family=classify(url);
  return family&&Object.values(defaults.hostEntries).includes(family)?family:'other';
}
// Nuvio groups by scraper.name before sorting labels, so manifest entries all
// retain the same name. The rank is composable across independent completions:
// quality first, audio second. It is not a position in an unfinished full list.
const {entryRank,sortPrefix}=require('../stream-order');
function presentEntryStreams(values) {
  return presentStreams(values).map(item=>{
    const {_entryPosition,...output}=item;
    const position=String(_entryPosition+1).padStart(3,'0');
    const priority=entryRank(item)+'.'+position+'.';
    return {...output,name:sortPrefix(priority)+item.name.replace(/^\d+\. /,'')};
  });
}
module.exports={entryScope,assignedScope,entryRank,sortPrefix,presentEntryStreams};
