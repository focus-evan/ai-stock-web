import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from '../research-publisher/node_modules/cheerio/dist/esm/index.js';
import {fetchBytesWithRetry} from '../research-publisher/scripts/fetch-with-retry.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),run_id=process.argv[2],favorites_run_id=process.argv[3];
if(!/^[\w-]{1,80}$/.test(run_id||'')||!/^[\w-]{1,80}$/.test(favorites_run_id||''))throw Error('Supply account and favorite run IDs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const accounts=read(path.join(root,'accounts.json')).accounts,batch=read(path.join(root,'inbox',run_id+'.json')),favoritesBatch=read(path.join(root,'inbox',favorites_run_id+'.json')),dispositions=read(path.join(root,'dispositions.json'));
const base='http://121.196.147.222:3667/research-library/';
const getText=async p=>(await fetchBytesWithRetry(base+p,{attempts:4})).toString('utf8');
const get=async p=>JSON.parse(await getText(p));
const catalog=await get('catalog.json'),summary=await get('content/douyin/logs/latest_update_summary.json'),favoriteSummary=await get('content/douyin/logs/latest_favorites_update_summary.json');
assert.equal(summary.run_id,run_id);assert.equal(summary.favorites.run_id,favorites_run_id);assert.equal(favoriteSummary.run_id,favorites_run_id);assert.equal(favoriteSummary.status,'ok');
const catalogIds=new Set(catalog.entries.map(e=>e.id));assert.equal(catalogIds.size,catalog.entries.length);
const baselineFile=path.join(root,'logs',`baseline-catalog-${run_id.match(/\d{8}/)?.[0]}.json`),baseline=read(baselineFile);for(const e of baseline.entries)assert.ok(catalogIds.has(e.id),`Missing baseline catalog row ${e.id}`);
const collectionIds=new Set(catalog.collections.map(c=>c.id));assert.equal(collectionIds.size,catalog.collections.length);for(const c of baseline.collections)assert.ok(collectionIds.has(c.id),`Missing baseline collection ${c.id}`);
const expectedCatalogNew=new Set();let newPages=0,accountRecords=0,previousAccounts=0,newAccountItems=0,newFavorites=0;
async function verifyArticle(directory,item,input){
 const result=read(path.join(root,'results',`${input.slug}_${input.aweme_id}.json`));assert.equal(result.review_status,'approved');assert.equal(item.transcript,result.corrected_transcript);assert.ok(item.transcript?.trim()&&item.points?.length);assert.equal(item.author,input.author||accounts.find(a=>a.slug===input.slug).nickname);
 const url=directory+item.html_file,$=load(await getText(url));assert.equal($('pre').first().text(),item.transcript,`Published body mismatch ${item.aweme_id}`);assert.equal($('.rl-reader-toolbar').length,1);assert.ok(catalog.entries.some(e=>e.href===url));expectedCatalogNew.add(url.replace(/^content\//,''));
 if(input.extraction_kind==='video_frames'){assert.equal(item.extraction_kind,'video_frames');assert.equal(item.frame_ocr_count,input.frame_ocr_count);assert.ok(item.transcript.includes('视频画面字幕'));}
 else if(input.source_type==='image_ocr'){assert.equal((item.transcript.match(/【图片 \d+】/g)||[]).length,input.ocr_images);assert.equal(input.ocr_images,input.image_files.length);}
 newPages++;
}
for(const a of accounts){
 const d=await get(`content/douyin/accounts/${a.slug}/account_data.json`),prior=read(path.join(root,'backups',run_id,a.slug+'.json')),known=new Map(d.items.map(i=>[i.aweme_id,i]));assert.equal(known.size,d.items.length);accountRecords+=d.items.length;previousAccounts+=prior.items.length;
 for(const item of prior.items)assert.ok(known.has(item.aweme_id),`Missing original record ${a.slug}/${item.aweme_id}`);
 const newInputs=batch.items.filter(i=>i.slug===a.slug&&!dispositions[i.aweme_id]);for(const input of newInputs){const item=known.get(input.aweme_id);assert.ok(item,`Missing new record ${input.aweme_id}`);assert.equal(item.sync_run_id,run_id);await verifyArticle(`content/douyin/accounts/${a.slug}/`,item,input);newAccountItems++;}
 assert.equal(d.sync.scan_status,'complete');for(const id of d.sync.pending_ids||[])assert.equal(dispositions[id]?.status,'blocked',`Unresolved accessible item ${id}`);assert.equal(d.sync.failed,0);
}
const favorites=await get('content/douyin/collections/favorites/collection_data.json'),previousFavorites=read(path.join(root,'backups',favorites_run_id,'favorites.json')),favoriteMap=new Map(favorites.items.map(i=>[i.aweme_id,i]));assert.equal(favoriteMap.size,favorites.items.length);for(const item of previousFavorites.items)assert.ok(favoriteMap.has(item.aweme_id));
for(const input of favoritesBatch.items){const item=favoriteMap.get(input.aweme_id);assert.ok(item);assert.equal(item.sync_run_id,favorites_run_id);await verifyArticle('content/douyin/collections/favorites/',item,input);newFavorites++;}
const observed=favoritesBatch.scans[0].observed_order.filter(id=>favoriteMap.has(id));assert.deepEqual(favorites.items.slice(0,observed.length).map(i=>i.aweme_id),observed);assert.equal(favorites.sync.pending_ids.length,0);assert.equal(favorites.items.length,previousFavorites.items.length+newFavorites);
assert.equal(summary.site.account_records,accountRecords);assert.equal(summary.site.favorites_records,favorites.items.length);assert.equal(favoriteSummary.merged_new,newFavorites);assert.equal(favoriteSummary.total_records,favorites.items.length);assert.equal(favoriteSummary.failed,0);
const originalIds=new Set(baseline.entries.map(e=>e.id));for(const e of catalog.entries.filter(e=>e.id.startsWith('douyin/')&&!originalIds.has(e.id)))assert.ok(expectedCatalogNew.has(e.id),`Unexpected new Douyin report/alias ${e.id}`);
const blocked=summary.sources.reduce((n,s)=>n+s.blocked,0),failed=summary.sources.reduce((n,s)=>n+s.failed,0);assert.equal(failed,0);assert.equal(blocked,2);
const report={status:'public_verified',checked_at:new Date().toISOString(),run_id,favorites_run_id,new_account_records:newAccountItems,new_favorites:newFavorites,new_pages_verified:newPages,previous_account_records_preserved:previousAccounts,account_records:accountRecords,favorites_records:favorites.items.length,favorite_observed_order_verified:observed.length,ocr_images:[...batch.items,...favoritesBatch.items].reduce((n,i)=>n+(i.ocr_images||0),0),blocked_paid:blocked,accessible_pending:0,failed,collections:catalog.collections.length,catalog_pages:catalog.entries.length,baseline_catalog_rows_preserved:baseline.entries.length,missing_baseline_rows:0,url:base+'content/douyin/index.html'};
fs.writeFileSync(path.join(root,'logs',run_id+'-verification.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(root,'logs','public-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
