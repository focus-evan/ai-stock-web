import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { load } from '../research-publisher/node_modules/cheerio/dist/esm/index.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const site = 'D:/evan/html/douyin';
const python = path.join(root, '.venv/Scripts/python.exe');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const write = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const tmp = `${f}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(v, null, 2) + '\n', 'utf8'); fs.renameSync(tmp, f); };
const now = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());
const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const registryFile = path.join(root, 'accounts.json');
const registry = () => read(registryFile);
const batchFile = id => { if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw Error('Invalid batch id'); return path.join(root, 'inbox', `${id}.json`); };
const resultFile = item => path.join(root, 'results', `${item.slug}_${item.aweme_id}.json`);
const dispositions = () => fs.existsSync(path.join(root,'dispositions.json')) ? read(path.join(root,'dispositions.json')) : {};

export function extractedTextResult(item,out) {
  if(!['image_ocr','published_caption','linked_source_transcript'].includes(item.source_type))throw Error('Explicit non-audio source required');
  if(!item.source_text?.trim()||item.source_text.replace(/#[^\s#]+/g,'').trim().length<2)throw Error('A visible source body is required');
  return {...out,download_status:'not_required',transcription_status:'ok',transcript_source:item.source_type,transcript:item.source_text.trim(),evidence_ref:item.evidence_ref||item.source_url,text_extraction_finished_at:now(),duration_seconds:item.duration_seconds||0};
}

function initialize() {
  if(fs.existsSync(registryFile)){console.log(JSON.stringify({status:'registry_exists',accounts:registry().accounts.length}));return;}
  const accounts = fs.readdirSync(path.join(site,'accounts')).filter(slug => fs.existsSync(path.join(site,'accounts',slug,'account_data.json'))).map(slug => {
    const d = read(path.join(site,'accounts',slug,'account_data.json'));
    const latest = [...d.items].sort((a,b)=>Number(b.create_time)-Number(a.create_time))[0];
    return {slug,nickname:d.account.name,sec_uid:d.profile.sec_uid,profile_url:`https://www.douyin.com/user/${d.profile.sec_uid}`,last_published_at:latest?.published_at,last_aweme_id:latest?.aweme_id};
  });
  write(registryFile,{version:1,site_root:site,accounts});
  console.log(JSON.stringify({accounts:accounts.length,items:accounts.map(a=>({slug:a.slug,last_aweme_id:a.last_aweme_id}))}));
}

function ingest(v) {
  const allowed = new Map([...registry().accounts,{slug:'favorites',nickname:'我的收藏'}].map(a=>[a.slug,a]));
  const f = batchFile(v.run_id);
  const old = fs.existsSync(f) ? read(f) : {run_id:v.run_id,started_at:now(),scans:[],items:[]};
  if(v.note_assets){
    if(!Array.isArray(v.note_assets)||v.note_assets.some(i=>!allowed.has(i.slug)||!/^\d{16,22}$/.test(i.aweme_id)||!i.author||!Array.isArray(i.image_files)||!i.image_files.length))throw Error('Invalid note asset metadata');
    old.note_assets=v.note_assets;
  }
  const items = new Map(old.items.map(i=>[`${i.slug}_${i.aweme_id}`,i]));
  for (const item of v.items || []) {
    if (!allowed.has(item.slug) || !/^\d{16,22}$/.test(item.aweme_id)) throw Error('Unknown account/video');
    if (item.source_url !== `https://www.douyin.com/video/${item.aweme_id}` && item.source_url !== `https://www.douyin.com/note/${item.aweme_id}`) throw Error('Source URL mismatch');
    if (item.media_url) { const u = new URL(item.media_url); if(u.protocol!=='https:' || !/(^|\.)douyinvod\.com$/.test(u.hostname)) throw Error('Unexpected media origin'); }
    if(item.slug==='favorites'&&(!item.author?.trim()||!item.author_profile_url?.startsWith('https://www.douyin.com/user/')))throw Error('Favorite work must have its actual author');
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(item.published_at)) throw Error('Read publication time from video page');
    if(item.source_type && !['audio_asr','image_ocr','published_caption','linked_source_transcript'].includes(item.source_type))throw Error('Unsupported text source');
    if(item.source_type && item.source_type!=='audio_asr' && (!item.source_text?.trim()||item.source_text.replace(/#[^\s#]+/g,'').trim().length<2))throw Error('A visible source body is required; hashtags alone are not a transcript');
    items.set(`${item.slug}_${item.aweme_id}`,{...items.get(`${item.slug}_${item.aweme_id}`),...item});
  }
  const scans = new Map(old.scans.map(s=>[s.slug,s]));
  for(const s of v.scans || []) { if(!allowed.has(s.slug))throw Error('Unknown scan account'); scans.set(s.slug,{...s,scanned_at:s.scanned_at||now()}); }
  write(f,{...old,updated_at:now(),items:[...items.values()],scans:[...scans.values()]});
  return {status:'saved',run_id:v.run_id,items:items.size,scans:scans.size,file:f};
}

async function processBatch(id, limit=Infinity) {
  const b=read(batchFile(id)); let done=0, failures=0;
  for(const item of b.items) {
    if(dispositions()[item.aweme_id])continue;
    const rf=resultFile(item);
    if(fs.existsSync(rf) && read(rf).transcript?.trim() && (!item.source_type||item.source_type==='audio_asr'||read(rf).transcript_source===item.source_type))continue;
    if(done++ >= limit)break;
    const lockDir=path.join(root,'locks');fs.mkdirSync(lockDir,{recursive:true});
    const lock=path.join(lockDir,`${item.slug}_${item.aweme_id}.lock`);
    try{fs.writeFileSync(lock,String(process.pid),{flag:'wx'});}catch(e){if(e.code==='EEXIST')continue;throw e;}
    const media=path.join(root,'media',`${item.slug}_${item.aweme_id}.m4a`);
    const out={slug:item.slug,aweme_id:item.aweme_id,started_at:now(),download_status:'pending',transcription_status:'pending',review_status:'pending'};
    write(rf,out);
    try {
      if(item.source_type && item.source_type!=='audio_asr'){
        write(rf,extractedTextResult(item,out));
        console.log(JSON.stringify({slug:item.slug,aweme_id:item.aweme_id,status:'text_extracted',source:item.source_type}));continue;
      }
      if(!item.media_url)throw Error('No playable media file observed on the video page');
      if(!fs.existsSync(media) || fs.statSync(media).size<1024) {
        fs.mkdirSync(path.dirname(media),{recursive:true});
        let failure;
        for(let attempt=0;attempt<3;attempt++) {
          try {
            const r=await fetch(item.media_url,{headers:{Referer:'https://www.douyin.com/'},signal:AbortSignal.timeout(60000)});
            if(!r.ok)throw Error(`Media HTTP ${r.status}`);
            const bytes=Buffer.from(await r.arrayBuffer());
            if(bytes.length<1024 || !bytes.subarray(0,64).includes(Buffer.from('ftyp')))throw Error('Media is empty or is not an MP4 audio container');
            fs.writeFileSync(media,bytes); failure=null; break;
          }catch(e){failure=e;}
        }
        if(failure)throw failure;
      }
      out.download_status='ok';out.media_bytes=fs.statSync(media).size;out.media_sha256=createHash('sha256').update(fs.readFileSync(media)).digest('hex');write(rf,out);
      const r=spawnSync(python,['-X','utf8',path.join(root,'transcribe.py'),media,rf,String(item.duration_seconds||0)],{encoding:'utf8',windowsHide:true,timeout:1200000,maxBuffer:2*1024*1024});
      if(r.status!==0)throw Error(`ASR failed: ${(r.stderr||r.error?.message||r.stdout||'unknown').slice(-1600)}`);
      const result=read(rf);
      console.log(JSON.stringify({slug:item.slug,aweme_id:item.aweme_id,status:'transcribed',chars:result.transcript.length,duration:result.duration_seconds}));
    }catch(e){failures++;const current=read(rf);current.error=String(e.message).replace(/https?:\/\/\S+/g,'[URL]');current.failed_at=now(); if(current.download_status!=='ok')current.download_status='failed';else current.transcription_status='failed';write(rf,current);console.log(JSON.stringify({slug:item.slug,aweme_id:item.aweme_id,status:'failed',error:current.error}));}finally{fs.unlinkSync(lock);}
  }
  if(failures)process.exitCode=1;
}

function review(v) {
  const b=read(batchFile(v.run_id));let count=0;
  for(const r of v.reviews || []) {
    const item=b.items.find(i=>i.slug===r.slug && i.aweme_id===r.aweme_id);if(!item)throw Error('Review must refer to an ingested video');
    if(dispositions()[item.aweme_id])throw Error('Restricted or misattributed work cannot be approved');
    const rf=resultFile(item),data=read(rf);
    if(data.transcription_status!=='ok' || !data.transcript?.trim())throw Error('Review requires a real completed transcript');
    if(!r.display_title?.trim() || !Array.isArray(r.points) || !r.points.length || r.points.some(p=>!String(p).trim()))throw Error('Missing title or summary');
    if(!r.transcript?.trim())throw Error('Empty corrected transcript');
    const ratio=r.transcript.length/data.transcript.length;if(ratio<0.6||ratio>1.5)throw Error('Corrected transcript length changed excessively');
    write(rf,{...data,corrected_transcript:r.transcript,display_title:r.display_title,points:r.points,category:r.category||'综合',review_notes:r.review_notes||'',review_status:'approved',reviewed_at:now()});count++;
  }
  return {status:'reviewed',count};
}

function page(title,body,depth) {
  const up='../'.repeat(depth);
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="${up}assets/site.css"></head><body><header><div class="wrap"><p class="crumb"><a href="${up}index.html">抖音主页</a></p><h1>${esc(title)}</h1></div></header><main><div class="wrap">${body}</div></main></body></html>`;
}
const duration = sec => `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`;

function publishLocal(id) {
  const b=read(batchFile(id));const backup=path.join(root,'backups',id);fs.mkdirSync(backup,{recursive:true});
  const sources=[];let merged=0;
  const $portal=load(fs.readFileSync(path.join(site,'index.html'),'utf8'));
  for(const a of registry().accounts) {
    const dir=path.join(site,'accounts',a.slug),df=path.join(dir,'account_data.json'),htmlf=path.join(dir,'index.html');
    const data=read(df),$account=load(fs.readFileSync(htmlf,'utf8'));
    if(!fs.existsSync(path.join(backup,`${a.slug}.json`)))fs.copyFileSync(df,path.join(backup,`${a.slug}.json`));
    const scan=b.scans.find(s=>s.slug===a.slug),candidates=b.items.filter(i=>i.slug===a.slug);let added=0,processed=0,failed=0;
    for(const item of candidates) {
      if(dispositions()[item.aweme_id])continue;
      if(data.items.some(i=>i.aweme_id===item.aweme_id)) {processed++;continue;}
      if(!fs.existsSync(resultFile(item)))continue;
      const r=read(resultFile(item));if(r.error){failed++;continue;}if(r.review_status!=='approved')continue;
      const file=`videos/new_${item.aweme_id}.html`;
      const sourceType=r.transcript_source||'audio_asr';
      const sourceLabel=item.extraction_kind==='video_frames'?'视频画面字幕OCR':{audio_asr:'音频转写',image_ocr:'图文OCR',published_caption:'发布正文'}[sourceType];
      const body=`<section class="card"><div class="meta"><span class="pill">${esc(item.published_at)}</span><span class="pill">${duration(item.duration_seconds||r.duration_seconds)}</span><span class="pill good">${sourceLabel}完成 · 摘要已复核</span></div><p><a class="button primary" href="${esc(item.source_url)}">打开抖音原视频</a> <a class="button" href="../index.html">账号概览</a></p><h2>重点摘要</h2><ol>${r.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ol><details open><summary>整理后的文本</summary><pre>${esc(r.corrected_transcript)}</pre></details><details><summary>初始提取文本</summary><pre>${esc(r.transcript)}</pre></details><p class="sub">${esc(r.review_notes)} · 处理时间 ${esc(r.reviewed_at)}</p></section>`;
      fs.writeFileSync(path.join(dir,file),page(`${a.nickname} - ${r.display_title}`,body,3),'utf8');
      const record={aweme_id:item.aweme_id,display_title:r.display_title,title:item.description||r.display_title,published_at:item.published_at,create_time:Math.floor(Date.parse(item.published_at.replace(' ','T')+'+08:00')/1000),duration_seconds:item.duration_seconds||r.duration_seconds,author:a.nickname,share_url:item.source_url,raw_transcript:r.transcript,transcript:r.corrected_transcript,transcript_source:sourceType,asr_backend:sourceType==='audio_asr'?'faster-whisper':undefined,asr_model:sourceType==='audio_asr'?'small/int8':undefined,quality:{status:'通过（文案复核）',uncertain_terms_marked:r.corrected_transcript.includes('待听辨')},points:r.points,category:r.category,ai_related:r.category==='AI',html_file:file,manual_reviewed:false,reviewer:'codex',reviewed_at:r.reviewed_at,sync_run_id:id};
      if(item.extraction_kind)record.extraction_kind=item.extraction_kind;if(item.frame_ocr_count)record.frame_ocr_count=item.frame_ocr_count;
      data.items.push(record);added++;processed++;
      $account('.video-list').prepend(`<a class="video-link" href="${file}" data-aweme-id="${item.aweme_id}"><b>新增</b><div><strong>${esc(r.display_title)}</strong><span>${esc(r.points.join('；'))}</span></div><small>${esc(item.published_at)}<br>${duration(record.duration_seconds)}</small></a>`);
    }
    data.items.sort((a,b)=>Number(b.create_time)-Number(a.create_time));
    for(const item of data.items)if(item.html_file&&!item.sync_run_id)item.sync_run_id=data.sync?.run_id||id;
    const mergedThisRun=data.items.filter(i=>i.sync_run_id===id).length;
    const links=new Map($account('.video-list a').toArray().map(e=>[($account(e).attr('href')||'').match(/\d{16,22}/)?.[0],$account.html(e)]));
    $account('.video-list').html(data.items.map(i=>links.get(i.aweme_id)||'').join(''));
    const states=dispositions();
    const pending=(scan?.new_ids||[]).filter(vid=>!data.items.some(i=>i.aweme_id===vid)&&states[vid]?.status!=='excluded');
    const blocked=pending.filter(vid=>states[vid]?.status==='blocked');
    const excluded=(scan?.new_ids||[]).filter(vid=>states[vid]?.status==='excluded');
    const scanStatus=scan?.status||'not_scanned';
    const stageStatus=scanStatus==='complete' && !pending.length && !failed ? 'ok' : scanStatus==='complete'&&pending.length===blocked.length&&blocked.length ? 'access_required' : scanStatus==='complete' ? 'processing_pending' : scanStatus;
    const ai=a.baseline_ai_count===undefined?data.items.filter(i=>i.category==='AI' || /AI|人工智能|光模块|算力|半导体|芯片|科技/i.test([i.title,i.display_title,i.category].join(' '))).length:a.baseline_ai_count+data.items.filter(i=>i.html_file&&(i.ai_related??i.category==='AI')).length;
    const latest=data.items[0]?.published_at?.slice(0,10)||a.last_published_at?.slice(0,10);
    const meta=`<span class="pill">${data.items.length} 个视频</span><span class="pill">AI 相关 ${ai}</span><span class="pill">文案更新至 ${latest}</span><span class="pill ${scanStatus==='complete'?'good':'warn'}">${scanStatus==='complete'?'扫描成功':'扫描未完成'} ${esc(scan?.scanned_at||'')}</span><span class="pill ${pending.length?'warn':'good'}">${pending.length?`待处理 ${pending.length} 条`:'文案已同步'}</span>${failed?`<span class="pill bad">本轮处理失败 ${failed} 条</span>`:''}`;
    if(scan) {
      data.sync={run_id:id,status:stageStatus,scan_status:scanStatus,scanned_at:scan.scanned_at,latest_observed_id:scan.latest_observed_id,pending_ids:pending,blocked_ids:blocked,excluded_ids:excluded,exceptions:[...blocked,...excluded].map(vid=>({aweme_id:vid,...states[vid]})),merged_new:mergedThisRun,failed};
      const accountMeta=$account('.card').filter((_,e)=>$account(e).find('h2').first().text()===a.nickname).find('.meta').first();
      const portalMeta=$portal('.card').filter((_,e)=>$portal(e).find('h2').first().text()===a.nickname).find('.meta').first();
      const keep=($,nodes)=>nodes.find('.pill').filter((_,e)=>/市场验证|战绩可靠性|存量已核验/.test($(e).text())).map((_,e)=>$.html(e)).get().join('');
      accountMeta.html(meta+keep($account,accountMeta));portalMeta.html(meta+keep($portal,portalMeta));
      if(blocked.length){accountMeta.append(`<span class="pill warn">付费权限受限 ${blocked.length} 条</span>`);portalMeta.append(`<span class="pill warn">付费权限受限 ${blocked.length} 条</span>`);}
    }
    write(df,data);fs.writeFileSync(htmlf,$account.html(),'utf8');
    if(fs.existsSync(path.join(dir,'douyin_research_transcripts.json')))write(path.join(dir,'douyin_research_transcripts.json'),data.items);
    const results=candidates.filter(i=>!states[i.aweme_id]&&fs.existsSync(resultFile(i))).map(i=>read(resultFile(i)));
    sources.push({name:a.nickname,slug:a.slug,selected_new:(scan?.new_ids||[]).length,downloaded:results.filter(r=>r.download_status==='ok').length,transcribed:results.filter(r=>r.transcription_status==='ok'&&(!r.transcript_source||r.transcript_source==='audio_asr')).length,text_extracted:results.filter(r=>r.transcription_status==='ok'&&r.transcript_source&&r.transcript_source!=='audio_asr').length,merged_new:mergedThisRun,added_this_invocation:added,pending:pending.length,blocked:blocked.length,excluded:excluded.length,failed,status:stageStatus,scan_status:scanStatus,scanned_at:scan?.scanned_at});merged+=added;
  }
  const summary={run_id:id,started:b.started_at,finished:now(),sources,pipeline_version:2,log:path.join(root,'logs',`${id}.json`),site:{account_count:sources.length,account_records:sources.reduce((n,s)=>n+read(path.join(site,'accounts',s.slug,'account_data.json')).items.length,0),favorites_records:read(path.join(site,'collections/favorites/collection_data.json')).items.length},favorites:{status:'not_scanned',note:'本轮修复和同步范围为五个公开账号，收藏保留旧资料'}};
  $portal('.stat').each((_,e)=>{const label=$portal(e).find('span').text();if(label==='更新时间')$portal(e).find('b').text(summary.finished.slice(0,16));if(label==='视频')$portal(e).find('b').text(sources.reduce((n,s)=>n+read(path.join(site,'accounts',s.slug,'account_data.json')).items.length,0)+read(path.join(site,'collections/favorites/collection_data.json')).items.length);});
  fs.writeFileSync(path.join(site,'index.html'),$portal.html(),'utf8');write(path.join(site,'logs/latest_update_summary.json'),summary);write(path.join(root,'logs',`${id}.json`),summary);
  console.log(JSON.stringify({status:'rendered',merged,summary}));return summary;
}

function publishFavoritesLocal(id) {
  const b=read(batchFile(id));
  const dir=path.join(site,'collections','favorites'),df=path.join(dir,'collection_data.json'),htmlf=path.join(dir,'index.html'),videos=path.join(dir,'videos');
  const backup=path.join(root,'backups',id);fs.mkdirSync(backup,{recursive:true});if(!fs.existsSync(path.join(backup,'favorites.json')))fs.copyFileSync(df,path.join(backup,'favorites.json'));
  const data=read(df),$old=load(fs.readFileSync(htmlf,'utf8'));
  const parsedAi=Number($old('.meta .pill').filter((_,e)=>$old(e).text().includes('AI')).first().text().match(/\d+/)?.[0]||156);
  const previousAi=data.sync?.run_id===id?(data.sync.previous_ai_count??parsedAi):parsedAi;
  const links=new Map($old('.video-list a').toArray().map(e=>[($old(e).attr('href')||'').match(/\d{16,22}/)?.[0],$old(e).attr('href')]));
  const order=new Map(b.items.map(i=>[i.aweme_id,Number(i.favorite_order??999999)]));let added=0;
  for(const item of b.items){
    const existing=data.items.find(i=>i.aweme_id===item.aweme_id);if(existing&&existing.sync_run_id!==id)continue;
    const rf=resultFile(item);if(!fs.existsSync(rf))continue;const r=read(rf);if(r.review_status!=='approved')continue;if(existing&&existing.reviewed_at===r.reviewed_at)continue;
    const file=`videos/new_${item.aweme_id}.html`,sourceType=r.transcript_source||'audio_asr';
    const sourceLabel=item.extraction_kind==='video_frames'?'视频画面字幕OCR':{audio_asr:'音频转写',image_ocr:'图文OCR',published_caption:'发布正文',linked_source_transcript:'关联原视频文稿'}[sourceType];
    const actions=`<div class="actions"><a class="button" href="../index.html">返回收藏概览</a><a class="button" href="../../../index.html">返回抖音主页</a><a class="button primary" href="${esc(item.source_url)}">打开抖音原帖</a>${item.evidence_ref&&item.evidence_ref!==item.source_url?`<a class="button primary" href="${esc(item.evidence_ref)}">打开完整讲解来源</a>`:''}</div>`;
    const body=`${actions}<section class="card"><div class="card-head"><div><h2>${esc(r.display_title)}</h2><div class="meta"><span class="pill">作者 ${esc(item.author)}</span><span class="pill">发布时间 ${esc(item.published_at)}</span>${item.duration_seconds?`<span class="pill">时长 ${duration(item.duration_seconds||r.duration_seconds)}</span>`:''}<span class="pill">aweme_id ${item.aweme_id}</span><span class="pill good">${sourceLabel}完成 · 文案已复核</span></div></div></div><p><a href="${esc(item.author_profile_url)}">打开作者主页</a></p><h3>重点摘要</h3><ol>${r.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ol><details open><summary>整理后的文本</summary><pre>${esc(r.corrected_transcript)}</pre></details><details><summary>初始提取文本</summary><pre>${esc(r.transcript)}</pre></details><p class="sub">${esc(r.review_notes)} · 复核时间 ${esc(r.reviewed_at)}</p></section>${actions}`;
    fs.writeFileSync(path.join(dir,file),page(`我的收藏 - ${r.display_title}`,body,3),'utf8');links.set(item.aweme_id,file);
    const record={index:0,aweme_id:item.aweme_id,title:item.description,display_title:r.display_title,duration_seconds:item.duration_seconds||r.duration_seconds||0,published_at:item.published_at,create_time:Math.floor(Date.parse(item.published_at.replace(' ','T')+'+08:00')/1000),author:item.author,author_profile_url:item.author_profile_url,share_url:item.source_url,linked_source_url:item.evidence_ref&&item.evidence_ref!==item.source_url?item.evidence_ref:undefined,raw_transcript:r.transcript,transcript:r.corrected_transcript,transcript_source:sourceType,asr_backend:sourceType==='audio_asr'?'faster-whisper':undefined,asr_model:sourceType==='audio_asr'?'small/int8':undefined,quality:{status:'通过（文案复核）',uncertain_terms_marked:/待听辨|待核对/.test(r.corrected_transcript)},points:r.points,category:r.category,html_file:file,reviewed_at:r.reviewed_at,sync_run_id:id,favorite_order:order.get(item.aweme_id)};
    if(item.extraction_kind)record.extraction_kind=item.extraction_kind;if(item.frame_ocr_count)record.frame_ocr_count=item.frame_ocr_count;
    if(existing)Object.assign(existing,record);else{data.items.push(record);added++;}
  }
  const fresh=data.items.filter(i=>i.sync_run_id===id).sort((a,b)=>(a.favorite_order??999999)-(b.favorite_order??999999));
  const old=data.items.filter(i=>i.sync_run_id!==id),observedRank=new Map((b.scans?.[0]?.observed_order||[]).map((vid,n)=>[vid,n]));data.items=[...fresh,...old].sort((a,z)=>(observedRank.get(a.aweme_id)??Infinity)-(observedRank.get(z.aweme_id)??Infinity));data.items.forEach((i,n)=>i.index=n+1);
  const latest=data.items.map(i=>i.published_at).filter(Boolean).sort().at(-1)||'未知';
  const aiBase=previousAi,aiNew=fresh.filter(i=>i.category?.startsWith('AI')||/\bAI\b|人工智能|智能体|Codex/i.test(`${i.title} ${i.display_title}`)).length;
  data.collection.range=`文案更新至 ${latest.slice(0,10)}，按收藏顺序展示`;
  const pendingIds=(b.scans?.[0]?.new_ids||[]).filter(vid=>!data.items.some(i=>i.aweme_id===vid));
  const results=b.items.filter(i=>fs.existsSync(resultFile(i))).map(i=>read(resultFile(i))),failed=results.filter(r=>r.error).length;
  const scanStatus=b.scans?.[0]?.status||'not_scanned',status=scanStatus==='complete'&&!pendingIds.length&&!failed?'ok':scanStatus==='complete'?'processing_pending':scanStatus;
  data.sync={run_id:id,status,scan_status:scanStatus,previous_ai_count:previousAi,scanned_at:b.scans?.[0]?.scanned_at,selected_new:(b.scans?.[0]?.new_ids||[]).length,merged_new:fresh.length,failed,pending_ids:pendingIds};
  write(df,data);
  const list=data.items.map((i,n)=>{const href=i.html_file||links.get(i.aweme_id);if(!href)throw Error(`Missing favorite page link ${i.aweme_id}`);return `<a class="video-link" href="${esc(href)}" data-aweme-id="${i.aweme_id}"><b>${String(n+1).padStart(3,'0')}</b><div><strong>${esc(i.display_title||i.title)}</strong><span>${esc((i.points||[]).join('；').slice(0,260))}</span></div><small>${esc(i.published_at||'未知')}<br>${duration(i.duration_seconds||0)}</small></a>`;}).join('');
  const statusPills=`<span class="pill ${scanStatus==='complete'?'good':'warn'}">收藏${scanStatus==='complete'?'扫描成功':'扫描未完成'} ${esc(b.scans?.[0]?.scanned_at||now())}</span><span class="pill ${status==='ok'?'good':'warn'}">${status==='ok'?'文案已同步':`待处理 ${pendingIds.length} 条`}</span>${failed?`<span class="pill bad">本轮处理失败 ${failed} 条</span>`:''}`;
  const indexBody=`<div class="notice">收藏按本轮已观察到的抖音顺序展示；未观察到的历史资料继续保留。新增作品保留真实发布时间、作者、原帖链接及文本来源。</div><section class="card"><div class="card-head"><div><h2>我的收藏</h2><div class="meta"><span class="pill">${data.items.length} 个视频/图文</span><span class="pill">AI 相关 ${aiBase+aiNew}</span>${statusPills}</div></div></div><p>${esc(data.collection.description)}</p></section><section class="card"><h2>视频列表</h2><div class="video-list">${list}</div></section>`;
  fs.writeFileSync(htmlf,page('我的收藏概览',indexBody,2),'utf8');
  const portal=path.join(site,'index.html'),$portal=load(fs.readFileSync(portal,'utf8')),card=$portal('.card').filter((_,e)=>$portal(e).find('h2').first().text()==='我的收藏'),meta=card.find('.meta').first();
  meta.html(`<span class="pill">${data.items.length} 个视频/图文</span><span class="pill">AI 相关 ${aiBase+aiNew}</span><span class="pill">文案更新至 ${esc(latest.slice(0,10))}</span>${statusPills}`);
  const accountRecords=registry().accounts.reduce((n,a)=>n+read(path.join(site,'accounts',a.slug,'account_data.json')).items.length,0);
  $portal('.stat').each((_,e)=>{const label=$portal(e).find('span').text();if(label==='更新时间')$portal(e).find('b').text(now().slice(0,16));if(label==='视频')$portal(e).find('b').text(accountRecords+data.items.length);});fs.writeFileSync(portal,$portal.html(),'utf8');
  const summary={run_id:id,started:b.started_at,finished:now(),status,scan_status:scanStatus,selected_new:(b.scans?.[0]?.new_ids||[]).length,downloaded:results.filter(r=>r.download_status==='ok').length,transcribed:fresh.filter(i=>i.transcript_source==='audio_asr').length,text_extracted:fresh.filter(i=>i.transcript_source!=='audio_asr').length,merged_new:fresh.length,pending:pendingIds.length,failed,total_records:data.items.length,latest_published_at:latest};
  write(path.join(site,'logs','latest_favorites_update_summary.json'),summary);write(path.join(root,'logs',`${id}.json`),summary);
  const overall=read(path.join(site,'logs','latest_update_summary.json'));overall.favorites={status,run_id:id,scanned_at:b.scans?.[0]?.scanned_at,merged_new:fresh.length,pending:pendingIds.length,failed,total_records:data.items.length};overall.site={...(overall.site||{}),favorites_records:data.items.length};write(path.join(site,'logs','latest_update_summary.json'),overall);
  console.log(JSON.stringify({status:'favorites_rendered',added,merged_new:fresh.length,total:data.items.length,summary}));return summary;
}

function validate() {
  let records=0,newRecords=0;const problems=[];
  for(const a of registry().accounts){const dir=path.join(site,'accounts',a.slug),d=read(path.join(dir,'account_data.json'));const ids=new Set();for(const i of d.items){records++;if(ids.has(i.aweme_id))problems.push(`duplicate ${a.slug}/${i.aweme_id}`);ids.add(i.aweme_id);if(i.html_file){newRecords++;if(!i.transcript?.trim()||!i.points?.length||!fs.existsSync(path.join(dir,i.html_file)))problems.push(`missing content ${a.slug}/${i.aweme_id}`);}}
    const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');if(html.includes('\ufffd')||/\?{4,}/.test(html))problems.push(`encoding ${a.slug}`);
  }
  const favoriteDir=path.join(site,'collections','favorites'),favorites=read(path.join(favoriteDir,'collection_data.json')),favoriteIds=new Set();for(const i of favorites.items){if(favoriteIds.has(i.aweme_id))problems.push(`duplicate favorites/${i.aweme_id}`);favoriteIds.add(i.aweme_id);if(i.html_file&&(!i.transcript?.trim()||!i.points?.length||!fs.existsSync(path.join(favoriteDir,i.html_file))))problems.push(`missing favorite content ${i.aweme_id}`);}const favoriteHtml=fs.readFileSync(path.join(favoriteDir,'index.html'),'utf8');if(load(favoriteHtml)('.video-list a').length!==favorites.items.length)problems.push('favorite index count');
  if(problems.length)throw Error(problems.join('\n'));console.log(JSON.stringify({status:'validated',accounts:registry().accounts.length,records,new_records:newRecords}));
}

async function cleanup(id) {
  const b=read(batchFile(id));const r=await fetch('http://121.196.147.222:3667/research-library/content/douyin/logs/latest_update_summary.json',{signal:AbortSignal.timeout(20000)});
  if(!r.ok||(await r.json()).run_id!==id)throw Error('Public run verification is required before media cleanup');
  const published=new Map();for(const a of registry().accounts){const response=await fetch(`http://121.196.147.222:3667/research-library/content/douyin/accounts/${a.slug}/account_data.json`,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Public account verification failed');published.set(a.slug,(await response.json()).items);}
  let removed=0,retainedForReview=0;const mediaRoot=path.resolve(root,'media');
  for(const item of b.items){if(!fs.existsSync(resultFile(item)))continue;const result=read(resultFile(item));if(result.review_status!=='approved')continue;const record=published.get(item.slug)?.find(i=>i.aweme_id===item.aweme_id);if(!record||record.sync_run_id!==id||record.reviewed_at!==result.reviewed_at)continue;if(/待听辨|待复核|待核对/.test(result.corrected_transcript||'')){retainedForReview++;continue;}const file=path.resolve(mediaRoot,`${item.slug}_${item.aweme_id}.m4a`);if(!file.startsWith(mediaRoot+path.sep))throw Error('Unsafe cache path');if(fs.existsSync(file)){fs.unlinkSync(file);removed++;}}
  console.log(JSON.stringify({status:'media_cleaned',removed,retained_for_review:retainedForReview}));
}

async function cleanupFavorites(id){
  const b=read(batchFile(id));const base='http://121.196.147.222:3667/research-library/content/douyin/collections/favorites/';
  const response=await fetch(base+'collection_data.json',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Public favorites verification failed');const published=(await response.json()).items;
  let removed=0,retainedForReview=0;const mediaRoot=path.resolve(root,'media');
  for(const item of b.items){const rf=resultFile(item);if(!fs.existsSync(rf))continue;const result=read(rf);if(result.review_status!=='approved')continue;const record=published.find(i=>i.aweme_id===item.aweme_id);if(!record||record.sync_run_id!==id||record.reviewed_at!==result.reviewed_at)continue;if(/待听辨|待复核|待核对/.test(result.corrected_transcript||'')){retainedForReview++;continue;}const file=path.resolve(mediaRoot,`${item.slug}_${item.aweme_id}.m4a`);if(!file.startsWith(mediaRoot+path.sep))throw Error('Unsafe cache path');if(fs.existsSync(file)){fs.unlinkSync(file);removed++;}}
  console.log(JSON.stringify({status:'favorites_media_cleaned',removed,retained_for_review:retainedForReview}));
}

function serve() {
  const form='<!DOCTYPE html><meta charset="utf-8"><title>抖音同步批次接收</title><h1>抖音同步批次接收</h1><form method="post" action="/ingest"><textarea name="payload" aria-label="采集批次 JSON" style="width:90%;height:320px"></textarea><br><button>保存采集批次</button></form><pre>数据仅保存在本机，不包含 Cookie。mode=review 时保存复核后的文案。</pre>';
  const server=http.createServer(async(req,res)=>{
    if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(form);return;}
    if(req.method==='GET'&&req.url.startsWith('/batch/')){try{const v=read(batchFile(decodeURIComponent(req.url.slice(7))));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(`<meta charset="utf-8"><pre>${esc(JSON.stringify(v))}</pre>`);}catch(e){res.writeHead(404);res.end('Batch not found');}return;}
    if(req.method==='POST'&&req.url==='/ingest'){try{if(req.headers.origin!=='http://127.0.0.1:8793')throw Error('Only the local intake form may submit data');let body='';for await(const c of req){body+=c.toString();if(body.length>12*1024*1024)throw Error('Payload too large');}const v=JSON.parse(new URLSearchParams(body).get('payload'));let result;if(v.mode==='proof'){const bytes=Buffer.from(v.png_base64,'base64');const isPng=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const isJpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(!isPng&&!isJpeg)throw Error('Unsupported screenshot format');const output='C:/Users/Evan/Documents/Codex/2026-10-14/new-chat/outputs/sync-restored.'+(isPng?'png':'jpg');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);result={status:'saved',screenshot:output};}else result=v.mode==='review'?review(v):ingest(v);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(`<meta charset="utf-8"><h1>已保存</h1><pre>${esc(JSON.stringify(result,null,2))}</pre><a href="/">返回</a>`);}catch(e){res.writeHead(400,{'Content-Type':'text/html; charset=utf-8'});res.end(`<h1>保存失败</h1><pre>${esc(e.message)}</pre>`);}return;}
    res.writeHead(404);res.end();
  });server.listen(8793,'127.0.0.1',()=>console.log('Intake ready at http://127.0.0.1:8793'));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const [command,id,limit]=process.argv.slice(2);
if(command==='init')initialize();
else if(command==='serve')serve();
else if(command==='process')await processBatch(id,limit?Number(limit):Infinity);
else if(command==='render')publishLocal(id);
else if(command==='render-favorites')publishFavoritesLocal(id);
else if(command==='validate')validate();
else if(command==='cleanup')await cleanup(id);
else if(command==='cleanup-favorites')await cleanupFavorites(id);
else if(command==='review-file')console.log(JSON.stringify(review(read(id))));
else if(command==='plan')console.log(JSON.stringify(registry().accounts.map(a=>{const d=read(path.join(site,'accounts',a.slug,'account_data.json'));const latest=[...d.items].sort((a,b)=>Number(b.create_time)-Number(a.create_time))[0];return {...a,last_aweme_id:latest.aweme_id,last_published_at:latest.published_at,pending_ids:d.sync?.pending_ids||[],record_count:d.items.length};})));
else throw Error('Use init, serve, plan, process RUN_ID [LIMIT], render RUN_ID, validate');
}
