"""Transcribe cached, browser-verified backlog items with one persistent GPU model."""
import os,sys,json,pathlib,time,datetime,hashlib
root=pathlib.Path(__file__).parent
dirs=[str(p) for p in (root/'.venv/Lib/site-packages/nvidia').glob('*/bin')]
os.environ['PATH']=';'.join(dirs)+';'+os.environ['PATH']
handles=[os.add_dll_directory(p) for p in dirs] if os.name=='nt' else []
import av
from faster_whisper import WhisperModel
from opencc import OpenCC
now=lambda:datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat()
def write(file,data):
 tmp=file.with_suffix(f'.{os.getpid()}.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');tmp.replace(file)
run_id=sys.argv[2] if len(sys.argv)>2 else 'repair_20261014'
if not all(c.isalnum() or c in '_-' for c in run_id):raise ValueError('Invalid run id')
batch=json.loads((root/'inbox'/f'{run_id}.json').read_text(encoding='utf-8'))
states=json.loads((root/'dispositions.json').read_text(encoding='utf-8'))
model=WhisperModel(str(root/'models/small'),device='cuda',compute_type='int8_float16',cpu_threads=2)
converter=OpenCC('t2s')
(root/'locks').mkdir(exist_ok=True)
for item in batch['items'][int(sys.argv[1]) if len(sys.argv)>1 else 0:]:
 key=item['slug']+'_'+item['aweme_id'];rf=root/'results'/f'{key}.json';lock=root/'locks'/f'{key}.lock'
 if item['aweme_id'] in states:continue
 if item.get('source_type','audio_asr')!='audio_asr':continue
 if rf.exists() and json.loads(rf.read_text(encoding='utf-8')).get('transcript','').strip():continue
 try:
  fd=os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL);os.write(fd,str(os.getpid()).encode());os.close(fd)
 except FileExistsError:continue
 data={'slug':item['slug'],'aweme_id':item['aweme_id'],'started_at':now(),'download_status':'pending','transcription_status':'pending','review_status':'pending'}
 t=time.monotonic()
 try:
  media=root/'media'/f'{key}.m4a'
  raw=media.read_bytes()
  if len(raw)<1024 or b'ftyp' not in raw[:64]:raise ValueError('Invalid cached media')
  with av.open(str(media)) as container:
   if not container.streams.audio:raise ValueError('No audio stream')
   duration=float(container.duration or 0)/av.time_base
  expected=item.get('duration_seconds',0)
  if expected and abs(expected-duration)>max(2,expected*.05):raise ValueError('Incomplete media duration')
  data.update(download_status='ok',media_bytes=len(raw),media_sha256=hashlib.sha256(raw).hexdigest());write(rf,data)
  segments,info=model.transcribe(str(media),language='zh',beam_size=5,vad_filter=True,condition_on_previous_text=False,repetition_penalty=1.1,no_repeat_ngram_size=8,
   hotwords='光模块 算力 十连阴 满仓 七成仓 利空出尽 平准 险资 中际旭创 新易盛 Lumentum 经贸磋商 美联储议息 carry trade 马照跑舞照跳',initial_prompt='中文财经口播。')
  rows=[{'start':s.start,'end':s.end,'text':converter.convert(s.text.strip()),'avg_logprob':s.avg_logprob,'no_speech_prob':s.no_speech_prob} for s in segments]
  text='\n'.join(s['text'] for s in rows if s['text']).replace('﹐','，').replace('﹑','、')
  if len(text.strip())<12:raise ValueError('No valid speech detected; visible source review required')
  data.update(transcript=text,segments=rows,duration_seconds=duration,language=info.language,language_probability=info.language_probability,transcription_status='ok',transcription_finished_at=now(),asr_device='cuda',asr_compute_type='int8_float16')
  write(rf,data);print(json.dumps({'id':item['aweme_id'],'status':'transcribed','chars':len(text),'seconds':round(time.monotonic()-t,1)}),flush=True)
 except Exception as e:
  data.update(error=str(e),failed_at=now(),transcription_status='failed');write(rf,data);print(json.dumps({'id':item['aweme_id'],'status':'failed','error':str(e)}),flush=True)
 finally:lock.unlink(missing_ok=True)
