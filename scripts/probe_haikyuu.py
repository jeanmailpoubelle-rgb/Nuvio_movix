"""One-off public-facts check; private metadata URLs and raw logs stay in memory."""
import io,json,os,urllib.parse
from pathlib import Path
from quickjs_check import check,probe_media
from probe_input_metadata import manifest_base,fetch_json,public_meta
from audit import safe
report={'scope':'Haikyuu preview configured AIOmetadata and installed ANSEmbed entry; no physical playback','metadata':[],'checks':[]}
settings={'episodeMetadataSource':'aiometadata','aiometadataManifestUrl':os.environ.get('NUVIO_AIOMETADATA_MANIFEST_URL',''),'diagnostics':True}
try:
 base,_=manifest_base(settings['aiometadataManifestUrl'])
 for identity in ['tt3398540','tmdb:60863']:
  try:
   data=fetch_json(urllib.parse.urlunsplit(base._replace(path=base.path+'/meta/series/'+identity+'.json')))
   facts=public_meta(data.get('meta'));facts['videos']=[v for v in facts['videos'] if (v.get('season'),v.get('episode')) in [(1,1),(2,1),(2,14),(2,15),(2,16),(3,1)]]
   report['metadata'].append({'query_id':identity,'facts':facts})
  except Exception as error:report['metadata'].append({'query_id':identity,'error_type':type(error).__name__})
 for season,episode in [(2,1),(2,15),(3,1)]:
  try:
   values,summary=check(Path('plugins/anime-sama/providers/anime-sama.js'),['60863','tv',season,episode],live=True,allow_empty=True,runtime='mobile',scraper_id='anime-sama',provider_settings=settings,metadata_key=os.environ.get('NUVIO_TMDB_API_KEY',''),log_sink=io.StringIO())
   report['checks'].append(safe({'input':[season,episode],'summary':summary,'media':[probe_media(v) for v in values]}))
  except Exception as error:report['checks'].append({'input':[season,episode],'error_type':type(error).__name__})
except Exception as error:report['error_type']=type(error).__name__
Path('reports/haikyuu').mkdir(parents=True,exist_ok=True)
Path('reports/haikyuu/probe.json').write_text(json.dumps(report,indent=2)+'\n')
print('Public-facts report written; no private endpoint or raw logs retained.')
