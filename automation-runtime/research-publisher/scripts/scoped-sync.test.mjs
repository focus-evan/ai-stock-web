import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {syncLibrary} from './sync-research-library.mjs';

test('a committed Douyin source snapshot preserves the live overview and peer collections',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'douyin-scoped-sync-'));
 const full=path.join(temp,'full'),scoped=path.join(temp,'scoped'),destination=path.join(temp,'library'),reportFile=path.join(temp,'report.json');
 const write=(root,name,body)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
 try{
  write(full,'index.html','<html><head><title>Overview</title></head><body>existing overview</body></html>');
  write(full,'stock-reports/index.html','<html><head><title>Peer report</title></head><body>keep peer</body></html>');
  write(full,'douyin/index.html','<html><head><title>Douyin</title></head><body>previous corpus</body></html>');
  await syncLibrary({source:full,destination,reportFile,scope:''});
  const overview=fs.readFileSync(path.join(destination,'content/index.html'),'utf8'),peer=fs.readFileSync(path.join(destination,'content/stock-reports/index.html'),'utf8');
  write(scoped,'index.html','<html><body>source-root marker; must not replace overview</body></html>');
  write(scoped,'douyin/index.html','<html><head><title>Updated corpus</title></head><body><a href="../stock-reports/index.html">peer</a><a href="new.html">new</a></body></html>');
  write(scoped,'douyin/new.html','<html><head><title>New transcript</title></head><body>actual text</body></html>');
  await syncLibrary({source:scoped,destination,reportFile,merge:true,scope:'douyin'});
  assert.equal(fs.readFileSync(path.join(destination,'content/index.html'),'utf8'),overview);
  assert.equal(fs.readFileSync(path.join(destination,'content/stock-reports/index.html'),'utf8'),peer);
  const body=fs.readFileSync(path.join(destination,'content/douyin/index.html'),'utf8');
  assert.ok(body.includes('href="../stock-reports/index.html"'));
  assert.ok(!body.includes('data-library-unavailable'));
  const catalog=JSON.parse(fs.readFileSync(path.join(destination,'catalog.json'),'utf8'));
  assert.deepEqual(new Set(catalog.collections.map(c=>c.id)),new Set(['douyin','stock-reports']));
  assert.ok(catalog.entries.some(e=>e.id==='douyin/new.html'));
  await assert.rejects(syncLibrary({source:scoped,destination,reportFile,scope:'douyin'}),/requires merge/);
  await assert.rejects(syncLibrary({source:scoped,destination,reportFile,merge:true,scope:'../other'}),/Invalid source scope/);
 }finally{
  assert.equal(path.dirname(path.resolve(temp)),path.resolve(os.tmpdir()));assert.ok(path.basename(temp).startsWith('douyin-scoped-sync-'));
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
