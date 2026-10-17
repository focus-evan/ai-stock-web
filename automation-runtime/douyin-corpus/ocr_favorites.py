import pathlib,json,shutil,datetime,sys,re
from rapidocr_onnxruntime import RapidOCR
root=pathlib.Path(__file__).parent
run_id=sys.argv[1] if len(sys.argv)>1 else 'favorites_20261014'
if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}',run_id):raise ValueError('Invalid batch id')
file=root/'inbox'/f'{run_id}.json'
b=json.loads(file.read_text(encoding='utf-8'))
engine=RapidOCR(intra_op_num_threads=4,inter_op_num_threads=2)
items={(i['slug'],i['aweme_id']):i for i in b['items']}
for note in b.get('note_assets',[]):
 previous=items.get((note['slug'],note['aweme_id']))
 if previous and previous.get('source_text') and previous.get('ocr_images')==len(note['image_files']) and previous.get('image_files')==note['image_files']:
  print(json.dumps({'id':note['aweme_id'],'status':'ocr_already_complete'},ensure_ascii=False),flush=True);continue
 pages=[];details=[];folder=root/'images'/(note['slug']+'_'+note['aweme_id']);folder.mkdir(parents=True,exist_ok=True)
 for n,source in enumerate(note['image_files'],1):
  source=pathlib.Path(source);destination=folder/(f'{n:02}'+source.suffix)
  if not destination.exists():shutil.copy2(source,destination)
  rows,elapsed=engine(str(destination))
  if not rows:raise ValueError('No visible text recognized: '+note['aweme_id'])
  text='\n'.join(r[1] for r in rows)
  pages.append(f'【图片 {n}】\n'+text)
  details.append({'file':str(destination),'rows':[{'text':r[1],'confidence':float(r[2])} for r in rows],'seconds':elapsed})
  print(json.dumps({'id':note['aweme_id'],'image':n,'chars':len(text)},ensure_ascii=False),flush=True)
 item={**note,'source_text':'【发布正文】\n'+note['description']+'\n\n'+'\n\n'.join(pages),'evidence_ref':note['source_url'],'ocr_images':len(pages)}
 items[(note['slug'],note['aweme_id'])]=item
 (folder/'ocr.json').write_text(json.dumps(details,ensure_ascii=False,indent=2),encoding='utf-8')
b['items']=list(items.values());b['ocr_finished_at']=datetime.datetime.now().isoformat()
temp=file.with_suffix('.ocr.tmp');temp.write_text(json.dumps(b,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(file)
print(json.dumps({'status':'ocr_complete','notes':len(b.get('note_assets',[])),'items':len(b['items'])}),flush=True)
