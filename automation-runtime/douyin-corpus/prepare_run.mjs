import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),date=process.argv[2];
if(!/^\d{8}$/.test(date||''))throw Error('Supply YYYYMMDD');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const accounts=read(path.join(root,'accounts.json')).accounts.map(account=>{
 const data=read(`D:/evan/html/douyin/accounts/${account.slug}/account_data.json`),latest=[...data.items].sort((a,b)=>Number(b.create_time)-Number(a.create_time))[0];
 return {...account,last_aweme_id:latest.aweme_id,pending_ids:data.sync?.pending_ids||[],known_ids:data.items.map(i=>String(i.aweme_id))};
});
const favorites=read('D:/evan/html/douyin/collections/favorites/collection_data.json');
fs.writeFileSync(path.join(root,'inbox',`known_${date}.json`),JSON.stringify({run_id:`known_${date}`,accounts,favorite_known_ids:favorites.items.map(i=>String(i.aweme_id))}));
const response=await fetch('http://121.196.147.222:3667/research-library/catalog.json');if(!response.ok)throw Error('Public catalog unavailable');
const catalog=await response.json();fs.writeFileSync(path.join(root,'logs',`baseline-catalog-${date}.json`),JSON.stringify(catalog));
console.log(JSON.stringify({date,accounts:accounts.length,favorites:favorites.items.length,baseline_catalog_pages:catalog.entries.length,collections:catalog.collections.length}));
