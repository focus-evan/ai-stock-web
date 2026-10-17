import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const runtime=path.dirname(fileURLToPath(import.meta.url)),checkout=path.resolve(process.argv[2]||''),sourceOnly=process.argv.includes('--source-only');
if(!fs.existsSync(path.join(checkout,'.git')))throw Error('Supply an existing Git checkout');
const source='D:/evan/html',destination=path.join(checkout,'research-library/douyin-source');
const extensions=new Set(['.html','.htm','.json','.jsonl','.csv','.tsv','.md','.txt','.pdf','.png','.jpg','.jpeg','.webp','.gif','.svg','.css','.js','.mjs','.woff','.woff2','.ico']);
const hashes={};
function copyFile(input,output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(input,output);const stat=fs.statSync(input);fs.utimesSync(output,stat.atime,stat.mtime);}
function copySource(dir,prefix='douyin'){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.isSymbolicLink()||entry.name.startsWith('.'))continue;
  const relative=prefix+'/'+entry.name,input=path.join(dir,entry.name);
  if(relative.includes('/_tools/')&&relative!=='douyin/_tools/catalog-exclusions.json')continue;
  if(entry.isDirectory()){copySource(input,relative);continue;}
  if(!extensions.has(path.extname(entry.name).toLowerCase()))continue;
  const output=path.join(destination,...relative.split('/'));copyFile(input,output);hashes[relative]=createHash('sha256').update(fs.readFileSync(output)).digest('hex');
 }
}
copySource(path.join(source,'douyin'));copyFile(path.join(source,'index.html'),path.join(destination,'index.html'));hashes['index.html']=createHash('sha256').update(fs.readFileSync(path.join(destination,'index.html'))).digest('hex');
const corpusTarget=path.join(checkout,'automation-runtime/douyin-corpus');
for(const entry of fs.readdirSync(runtime,{withFileTypes:true}))if(entry.isFile()&&(/\.(mjs|py)$/.test(entry.name)||['README.md','requirements.lock.txt','accounts.json','dispositions.json'].includes(entry.name)))copyFile(path.join(runtime,entry.name),path.join(corpusTarget,entry.name));
if(!sourceOnly){
 const publisher=path.resolve(runtime,'../research-publisher'),target=path.join(checkout,'automation-runtime/research-publisher');
 for(const name of ['publish.ps1','package.json','package-lock.json'])if(fs.existsSync(path.join(publisher,name)))copyFile(path.join(publisher,name),path.join(target,name));
 fs.cpSync(path.join(publisher,'scripts'),path.join(target,'scripts'),{recursive:true});
 fs.cpSync(path.join(publisher,'public/research-library/_ui'),path.join(target,'public/research-library/_ui'),{recursive:true});
 for(const name of ['index.html','catalog.seed.json'])copyFile(path.join(publisher,'public/research-library',name),path.join(target,'public/research-library',name));
 fs.cpSync(path.join(publisher,'node_modules'),path.join(target,'node_modules'),{recursive:true});
}
const manifest={scope:'douyin',source_directory:'research-library/douyin-source',source_file_count:Object.keys(hashes).length,files:hashes};
fs.writeFileSync(path.join(checkout,'research-library/douyin-source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({checkout,source_files:manifest.source_file_count,source_only:sourceOnly}));
