import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const checkout = path.resolve(process.argv[2] || process.cwd());
const ref = process.argv[3] || 'HEAD';
function git(args) {
  const result = spawnSync('git', ['-c', 'core.longpaths=true', ...args], {
    cwd: checkout, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true,
  });
  if (result.status !== 0) throw Error(result.stderr || 'Git failed');
  return result.stdout;
}
const indexed = ref === '--index';
const tree = new Map();
for (const entry of git(indexed ? ['ls-files', '--stage', '-z'] : ['ls-tree', '-r', '-z', ref]).split('\0')) {
  if (!entry) continue;
  const [metadata, filename] = entry.split('\t');
  tree.set(filename, metadata.split(' ')[indexed ? 1 : 2]);
}
const manifestName = 'research-library/douyin-source-manifest.json';
const manifestBytes = fs.readFileSync(path.join(checkout, manifestName));
const blobHash = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
if (tree.get(manifestName) !== blobHash(manifestBytes)) throw Error('Manifest differs from Git');
const manifest = JSON.parse(manifestBytes);
let count = 0;
for (const [name, expected] of Object.entries(manifest.files)) {
  const filename = `${manifest.source_directory}/${name}`;
  const bytes = fs.readFileSync(path.join(checkout, filename));
  if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error(`Snapshot hash mismatch: ${name}`);
  if (tree.get(filename) !== blobHash(bytes)) throw Error(`Snapshot differs from Git: ${name}`);
  count++;
}
if (count !== manifest.source_file_count) throw Error('Manifest count mismatch');
console.log(JSON.stringify({ verified: true, ref, source_files: count, byte_identical_to_git: true }));
