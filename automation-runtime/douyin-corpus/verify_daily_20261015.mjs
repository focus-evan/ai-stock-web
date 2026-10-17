import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from '../research-publisher/node_modules/cheerio/dist/esm/index.js';
import {fetchBytesWithRetry} from '../research-publisher/scripts/fetch-with-retry.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),run_id='daily_20261015',favoritesRun='favorites_20261015',phase=process.argv[2]||'final';
const local=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const base='http://121.196.147.222:3667/research-library/';
const text=async p=>(await fetchBytesWithRetry(base+p,{attempts:4})).toString('utf8');
const get=async p=>JSON.parse(await text(p));
const catalog=await get('catalog.json');assert.equal(catalog.collections.length,35);
const registry=local(path.join(root,'accounts.json'));
const summary=await get('content/douyin/logs/latest_update_summary.json');assert.equal(summary.run_id,run_id);assert.equal(summary.favorites.run_id,favoritesRun);
let accountRecords=0,oldAccountRecords=0,newAccountRecords=0,newPages=0;
for(const account of registry.accounts){
  const slug=account.slug,d=await get(`content/douyin/accounts/${slug}/account_data.json`),baseline=local(path.join(root,'backups',run_id,slug+'.json'));
  accountRecords+=d.items.length;oldAccountRecords+=baseline.items.length;
  const known=new Set(d.items.map(i=>i.aweme_id));for(const previous of baseline.items)assert.ok(known.has(previous.aweme_id),`Missing prior ${slug}/${previous.aweme_id}`);
  assert.equal(known.size,d.items.length);
  for(const i of d.items.filter(i=>i.sync_run_id===run_id)){
    const result=local(path.join(root,'results',`${slug}_${i.aweme_id}.json`));assert.equal(result.review_status,'approved');assert.equal(i.transcript,result.corrected_transcript);assert.ok(i.points?.length);assert.equal(i.author,account.nickname);
    const url=`content/douyin/accounts/${slug}/${i.html_file}`,$=load(await text(url));assert.ok($('pre').first().text()===i.transcript,`Body mismatch ${i.aweme_id}`);assert.equal($('.rl-reader-toolbar').length,1);assert.ok(catalog.entries.some(e=>e.href===url));newAccountRecords++;newPages++;
  }
}
assert.equal(newAccountRecords,phase==='initial'?9:20);
const favorites=await get('content/douyin/collections/favorites/collection_data.json'),priorFavorites=local(path.join(root,'backups',favoritesRun,'favorites.json'));
const favoriteIds=new Set(favorites.items.map(i=>i.aweme_id));for(const i of priorFavorites.items)assert.ok(favoriteIds.has(i.aweme_id));assert.equal(favoriteIds.size,favorites.items.length);assert.equal(favorites.items.length,247);
const b=local(path.join(root,'inbox',favoritesRun+'.json')),observed=b.scans[0].observed_order.filter(id=>favoriteIds.has(id));assert.deepEqual(favorites.items.slice(0,observed.length).map(i=>i.aweme_id),observed);
for(const i of favorites.items.filter(i=>i.sync_run_id===favoritesRun)){const result=local(path.join(root,'results',`favorites_${i.aweme_id}.json`));assert.equal(i.transcript,result.corrected_transcript);assert.equal(i.author,'炎辉财经图书');const url=`content/douyin/collections/favorites/${i.html_file}`,$=load(await text(url));assert.equal($('pre').first().text(),i.transcript);assert.equal($('.rl-reader-toolbar').length,1);assert.ok(catalog.entries.some(e=>e.href===url));newPages++;}
const favSummary=await get('content/douyin/logs/latest_favorites_update_summary.json');assert.equal(favSummary.run_id,favoritesRun);assert.equal(favSummary.merged_new,1);assert.equal(favSummary.failed,0);
const blocked=summary.sources.reduce((n,s)=>n+s.blocked,0),failed=summary.sources.reduce((n,s)=>n+s.failed,0),pending=summary.sources.reduce((n,s)=>n+s.pending,0);assert.equal(blocked,2);assert.equal(failed,0);if(phase==='final')assert.equal(pending,2);
const report={status:'public_verified',phase,checked_at:new Date().toISOString(),run_id,favorites_run_id:favoritesRun,new_account_records:newAccountRecords,new_favorites:1,new_pages_verified:newPages,previous_account_records_preserved:oldAccountRecords,account_records:accountRecords,favorites_records:favorites.items.length,favorite_observed_order_verified:observed.length,blocked_paid:blocked,pending,failed,collections:catalog.collections.length,catalog_pages:catalog.entries.length,source_types:summary.sources.map(s=>({slug:s.slug,audio:s.transcribed,text:s.text_extracted})),url:base+'content/douyin/index.html'};
fs.writeFileSync(path.join(root,'logs',phase==='final'?'public-verification.json':'public-verification-initial-20261015.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
