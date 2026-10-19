import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { Window } from 'happy-dom';
const code=fs.readFileSync(new URL('../public/research-library/_ui/douyin-records.js',import.meta.url),'utf8');
const key='react-antd-admin-0.0.0-prod-access-token';
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function server(){
 const accounts=new Map();let fail=false;
 return {accounts,setFail:v=>fail=v,fetch:async(url,options={})=>{
  if(fail)return {ok:false,status:500};
  const account=options.headers?.Authorization?.replace('Bearer ','');
  if(!account)return {ok:false,status:401};
  if(!accounts.has(account))accounts.set(account,{records:{},preferences:{sort:'liked',filter:'all'},user:{id:account,name:account}});
  const state=accounts.get(account),patch=options.body?JSON.parse(options.body):null;let result;
  if(url.endsWith('/preferences')){Object.assign(state.preferences,patch);result=state.preferences}
  else if(options.method==='PATCH'){
   const id=url.split('/').at(-1);const row=state.records[id]||{liked:false,deleted:false,likedAt:0};
   if(patch.liked!==undefined)row.likedAt=patch.liked?Date.now():0;
   state.records[id]={...row,...patch};result=state.records[id];
  }else result=state;
  return {ok:true,status:200,json:async()=>structuredClone(result)};
 }};
}
async function browser(api,account='reader-a',detail=false){
 const w=new Window({url:'http://localhost/research-library/content/douyin/'+(detail?'accounts/a/videos/012_7697503444638125350.html':'collections/favorites/index.html')});
 if(account)w.localStorage.setItem(key,JSON.stringify({state:{token:account}}));
 w.fetch=api.fetch;
 w.document.body.innerHTML=detail?'<h1>文案一</h1><p>原文保留</p>':`<main><section><div class="video-list"><a class="video-link" data-aweme-id="7697503444638125350" href="videos/001_7697503444638125350.html"><b>001</b><div><strong>文案一</strong><span>内容一</span></div><small>2026-10-01</small></a><a class="video-link" href="videos/new_7697307583401107785.html"><b>002</b><div><strong>文案二</strong><span>内容二</span></div><small>2026-10-02</small></a></div></section></main>`;
 w.eval(code);await tick();return w;
}
test('like, cross-device sync, stable IDs, delete/restore and account isolation',async()=>{
 const api=server(),a=await browser(api);
 const rows=()=>[...a.document.querySelectorAll('.dyr-record')];
 assert.equal(rows().length,2);rows()[1].querySelector('[data-action=like]').click();await tick();
 assert.equal(rows()[0].dataset.awemeId,'7697307583401107785');
 const b=await browser(api);assert.equal(b.document.querySelector('.dyr-record').dataset.awemeId,'7697307583401107785');
 const c=await browser(api,'reader-b');assert.equal(c.document.querySelector('[data-action=like]').getAttribute('aria-pressed'),'false');
 rows()[0].querySelector('[data-action=delete]').click();await tick();assert.equal(rows()[0].hidden,true);
 a.document.querySelector('[data-filter=deleted]').click();await tick();assert.equal(rows()[0].hidden,false);
 rows()[0].querySelector('[data-action=restore]').click();await tick();assert.equal(api.accounts.get('reader-a').records['7697307583401107785'].liked,true);
 const detail=await browser(api,'reader-a',true);detail.document.querySelector('[data-action=like]').click();await tick();
 assert.equal(api.accounts.get('reader-a').records['7697503444638125350'].liked,true);
 assert(detail.document.body.textContent.includes('原文保留'));
 for(const w of [a,b,c,detail])await w.happyDOM.close();
});
test('login gate and failed server writes never claim success',async()=>{
 const api=server(),guest=await browser(api,'');
 assert.equal(guest.document.querySelector('[data-action=like]').disabled,true);
 assert.equal(guest.document.querySelector('a.dyr-button').hidden,false);
 const w=await browser(api);api.setFail(true);
 w.document.querySelector('[data-action=like]').click();await tick();
 assert.equal(w.document.querySelector('[data-action=like]').getAttribute('aria-pressed'),'false');
 assert(w.document.querySelector('.dyr-status').textContent.includes('保存未完成'));
 await guest.happyDOM.close();await w.happyDOM.close();
});
test('sort preferences are stored on server and restored on another device',async()=>{
 const api=server(),a=await browser(api);const select=a.document.querySelector('.dyr-select');
 select.value='published';select.dispatchEvent(new a.Event('change'));await tick();
 const b=await browser(api);assert.equal(b.document.querySelector('.dyr-select').value,'published');
 assert.equal(b.document.querySelector('.dyr-record').dataset.awemeId,'7697307583401107785');
 await a.happyDOM.close();await b.happyDOM.close();
});
