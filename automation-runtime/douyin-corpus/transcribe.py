import sys, json, pathlib, datetime, os
import av
from faster_whisper import WhisperModel
from opencc import OpenCC

media, destination, expected = sys.argv[1], pathlib.Path(sys.argv[2]), float(sys.argv[3])
data = json.loads(destination.read_text(encoding='utf-8'))
with av.open(media) as container:
    if not container.streams.audio:
        raise ValueError('Downloaded media has no audio stream')
    duration = float(container.duration or 0) / av.time_base
if expected and abs(duration - expected) > max(2.0, expected * 0.05):
    raise ValueError(f'Incomplete media: {duration:.2f}s, expected {expected:.2f}s')
model = WhisperModel(str(pathlib.Path(__file__).parent / 'models/small'),
                     device='cpu', compute_type='int8', cpu_threads=int(os.environ.get('DOUYIN_ASR_THREADS','6')))
segments, info = model.transcribe(media, language='zh', beam_size=5, vad_filter=True,
    condition_on_previous_text=False, repetition_penalty=1.1, no_repeat_ngram_size=8,
    hotwords='光模块 算力 十连阴 满仓 七成仓 利空出尽 平准 险资 中际旭创 新易盛 Lumentum 经贸磋商 美联储议息 carry trade 马照跑舞照跳',
    initial_prompt='中文财经口播。')
converter = OpenCC('t2s')
rows = [{'start':s.start,'end':s.end,'text':converter.convert(s.text.strip()),
         'avg_logprob':s.avg_logprob,'no_speech_prob':s.no_speech_prob} for s in segments]
text = '\n'.join(s['text'] for s in rows if s['text']).replace('﹐','，').replace('﹑','、')
if len(text.strip()) < 12:
    raise ValueError('No valid speech detected; manual image/OCR review required')
data.update(transcript=text,segments=rows,duration_seconds=duration,language=info.language,
            language_probability=info.language_probability,transcription_status='ok',
            transcription_finished_at=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat())
tmp = destination.with_suffix('.asr.tmp')
tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
tmp.replace(destination)
print(json.dumps({'chars':len(text),'duration':duration}))
