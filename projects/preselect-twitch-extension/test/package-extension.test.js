import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const command=promisify(execFile);
const root=fileURLToPath(new URL('../',import.meta.url));
test('packaging requires a reviewed HTTPS origin and injects it into the uploadable assets',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'preselect-package-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  await cp(join(root,'public/twitch'),join(directory,'public/twitch'),{recursive:true});
  const run=value=>command(process.execPath,[join(root,'scripts/package-extension.mjs')],{cwd:directory,env:{...process.env,PICK_PREDICT_EBS_ORIGIN:value}});
  for(const value of ['', 'http://localhost:4173','https://user:password@example.test','https://example.test/path'])await assert.rejects(run(value));
  await run('https://review.example.invalid');
  const source=await readFile(join(directory,'dist/twitch-extension/extension.js'),'utf8');assert.match(source,/https:\/\/review.example.invalid/);assert.doesNotMatch(source,/https:\/\/twitchleagueplugin.vercel.app/);
  const zip=await command('unzip',['-Z1',join(directory,'dist/pick-predict-twitch-extension.zip')]);assert.match(zip.stdout,/config.html/);assert.match(zip.stdout,/panel.html/);assert.match(zip.stdout,/video.html/);
});
