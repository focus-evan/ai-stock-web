import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),id=process.argv[2];
if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id||''))throw Error('Invalid batch id');
const batch=JSON.parse(fs.readFileSync(path.join(root,'inbox',id+'.json'),'utf8'));
fs.mkdirSync(path.join(root,'media'),{recursive:true});let failed=0,downloaded=0,skipped=0;
const mediaItems=batch.items.filter(i=>i.media_url&&(!i.source_type||i.source_type==='audio_asr'));
for(let n=0;n<mediaItems.length;n+=3){const results=await Promise.allSettled(mediaItems.slice(n,n+3).map(async item=>{
  const key=`${item.slug}_${item.aweme_id}`,file=path.join(root,'media',key+'.m4a'),result=path.join(root,'results',key+'.json');
  if((fs.existsSync(result)&&JSON.parse(fs.readFileSync(result,'utf8')).transcript?.trim())||(fs.existsSync(file)&&fs.statSync(file).size>1024)){skipped++;return;}
  const url=new URL(item.media_url);if(url.protocol!=='https:'||!/(^|\.)douyinvod\.com$/.test(url.hostname))throw Error('Unexpected observed-media origin');
  const response=await fetch(item.media_url,{headers:{Referer:'https://www.douyin.com/'},signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`Media HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1024||!bytes.subarray(0,64).includes(Buffer.from('ftyp')))throw Error('Invalid media container');
  const temp=file+'.prefetch.tmp';fs.writeFileSync(temp,bytes);fs.renameSync(temp,file);downloaded++;console.log(JSON.stringify({slug:item.slug,id:item.aweme_id,media_bytes:bytes.length}));
}));for(const result of results)if(result.status==='rejected'){failed++;console.log(JSON.stringify({status:'download_failed',error:String(result.reason.message).replace(/https?:\/\/\S+/g,'[URL]')}));}}
console.log(JSON.stringify({run_id:id,downloaded,skipped,failed}));if(failed)process.exitCode=1;
