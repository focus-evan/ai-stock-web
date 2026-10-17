import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),id='7690405237852490618',run='favorites_20261017';
const file=path.join(root,'inbox',run+'.json'),batch=JSON.parse(fs.readFileSync(file,'utf8')),item=batch.items.find(i=>i.aweme_id===id);
if(!item)throw Error('Observed video item missing');
const resultFile=path.join(root,'results',`favorites_${id}.json`),oldResult=JSON.parse(fs.readFileSync(resultFile,'utf8'));
if(oldResult.transcript_source!=='image_ocr'){
 const backup=path.join(root,'backups',run);fs.mkdirSync(backup,{recursive:true});const name=path.join(backup,`favorites_${id}-unreviewed-asr.json`);if(!fs.existsSync(name))fs.copyFileSync(resultFile,name);
}
const frameFile=path.join(root,'images',`favorites_${id}_video_frames/ocr.json`),frames=JSON.parse(fs.readFileSync(frameFile,'utf8'));
if(frames.length!==30)throw Error('Incomplete frame extraction');
item.source_type='image_ocr';item.extraction_kind='video_frames';item.frame_ocr_count=frames.length;item.evidence_ref=item.source_url;
item.source_text='【视频画面字幕OCR】\n为什么要大声朗读？\n\n[00:07—00:11] 只有大声朗读，才能把自卑变自信。\n[00:13—00:15] 只有大声朗读，才能把内向变外向。\n[00:19—00:21] 只有大声朗读，才能把懦弱变刚强。\n[00:25—00:27] 只有大声朗读，才能把语法变语感。\n[00:31—00:33] 只有大声朗读，才能把短期记忆变长期记忆。\n[00:39—00:41] 只有大声朗读，才能把破烂发音变标准发音。\n[00:45—00:47] 只有大声朗读，才能把结巴英语变流利英语。\n[00:51—00:55] 只有大声朗读，才能把腼腆少年变未来领袖。\n[00:57—00:59] 读书一定要大声朗读。';
fs.writeFileSync(file,JSON.stringify(batch,null,2)+'\n');
console.log(JSON.stringify({run_id:run,id,source:'video_frame_ocr',frames:frames.length,source_chars:item.source_text.length}));
