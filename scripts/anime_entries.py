"""Exercise installed Anime-Sama entries independently, as Nuvio does.

Each context stays on its own thread, with a separate log sink. HTTP futures are
resolved only by their owning interpreter. No global stdout redirection here.
"""
import concurrent.futures
import json
import time
from quickjs_check import ROOT, check


def check_entries(args, runtime, directory, metadata_key='', settings=None):
    manifest = json.loads((ROOT / 'plugins/anime-sama/manifest.json').read_text())
    entries = [entry for entry in manifest['scrapers'] if entry['enabled']]
    scopes = json.loads((ROOT / 'config/anime-sama.json').read_text())['hostEntries']
    started = time.monotonic()
    def run(entry):
        try:
            with (directory / (runtime + '-' + entry['id'] + '.private.log')).open('w') as log:
                streams, row = check(ROOT / 'plugins/anime-sama' / entry['filename'], args,
                                     live=True, allow_empty=True, runtime=runtime, metadata_key=metadata_key,
                                     provider_settings=settings or {'diagnostics': True},
                                     scraper_id=entry['id'], log_sink=log)
            row['completed_seconds'] = round(time.monotonic() - started, 2)
            return streams, row
        except Exception as error:
            return [], {'entry_id': entry['id'], 'error_type': type(error).__name__, 'requests': 0,
                        'resolver_events': [], 'completed_seconds': round(time.monotonic() - started, 2)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(entries)) as pool:
        results = list(pool.map(run, entries))
    streams = sorted([s for values, _ in results for s in values], key=lambda s: s['name'].lower())
    rows = [row for _, row in results]
    selections, events, seen = [], [], set()
    for row in rows:
        for event in row.get('resolver_events', []):
            if event['stage'] == 'anime-selection':
                selections.append(event['data'])
            else:
                key = json.dumps(event, sort_keys=True)
                if key not in seen:
                    seen.add(key)
                    events.append(event)
    evidence_complete = len(selections) == len(entries) and all(
        len([e for e in row['resolver_events'] if e['stage'] == 'anime-selection']) == 1 and
        next(e['data'].get('scope') for e in row['resolver_events'] if e['stage'] == 'anime-selection') == scopes[entry['id']]
        for entry, row in zip(entries, rows))
    discovered = {s.get('discovered') for s in selections}
    partition_complete = evidence_complete and len(discovered) == 1 and sum(s['published'] for s in selections) == next(iter(discovered))
    selection = {key: sum(s.get(key, 0) for s in selections) for key in
                 ['published', 'attempted', 'remaining', 'transportSkipped', 'hostBudgetStops']}
    stops = [s.get('stop', '') for s in selections]
    selection.update(scope='entries', entries=len(entries), returned=len(streams),
                     stop=next((v for v in stops if v != 'candidates-exhausted'), 'candidates-exhausted'))
    events.append({'stage': 'anime-selection', 'data': selection})
    summary = dict(provider='anime-sama', runtime=runtime, args=args, sources=len(streams), entries=rows,
                   requests=sum(r['requests'] for r in rows), seconds=round(time.monotonic()-started, 2),
                   first_result_seconds=min((r['completed_seconds'] for values, r in results if values), default=None),
                   entry_evidence_complete=evidence_complete, partition_complete=partition_complete,
                   resolver_events=events, http_failures=[e for r in rows for e in r.get('http_failures', [])],
                   hls_metadata=[e for r in rows for e in r.get('hls_metadata', [])],
                   pending_native_timers=sum(r.get('pending_native_timers', 0) for r in rows))
    return streams, summary
