import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
test('local server completes a draft action, rejects replay, and recovers scores after restart',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'preselect-server-'));
  const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const base=`http://127.0.0.1:${port}`;
  let child,exit;
  const environment={...process.env,NODE_ENV:'development',PICK_PREDICT_DEMO:'true',PORT:String(port),HOST:'127.0.0.1',PICK_PREDICT_PUBLIC_ORIGIN:base,PICK_PREDICT_DATA_FILE:join(directory,'state.json')};
  for(const key of ['VERCEL','TWITCH_CLIENT_ID','TWITCH_CLIENT_SECRET','SESSION_SECRET','TWITCH_EXTENSION_SECRET','TWITCH_CHANNEL_IDS'])delete environment[key];
  async function stop(){if(!child||child.exitCode!==null)return;child.kill('SIGTERM');await exit;child=null}
  t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true})});
  async function start(){child=spawn(process.execPath,['src/server.js'],{cwd:root,env:environment,stdio:['ignore','pipe','pipe']});exit=once(child,'exit');let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);for(let attempt=0;attempt<100;attempt++){try{const response=await fetch(`${base}/api/health`);if(response.ok)return}catch{}if(child.exitCode!==null)throw Error(output);await new Promise(resolve=>setTimeout(resolve,20))}throw Error(`Server failed to start: ${output}`)}
  const request=async(path,data)=>{const response=await fetch(`${base}/api/${path}`,{method:data===undefined?'GET':'POST',headers:{origin:base,'content-type':'application/json','x-viewer-id':'demo-viewer'},body:data===undefined?undefined:JSON.stringify(data)});return {status:response.status,body:await response.json()}};
  await start();
  const page=await fetch(`${base}/twitch/config.html`);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/object-src 'none'/);assert.match(await page.text(),/extension.js/);
  assert.equal((await fetch(`${base}/channel-client.js`)).status,200);
  assert.equal((await request('match/create',{blueTeam:'Blue',redTeam:'Red',revealDelaySeconds:0,expectedControlRevision:0})).status,200);
  assert.equal((await request('draft/start',{expectedControlRevision:1})).status,200);
  const live=(await request('state')).body;
  assert.equal((await request('join',{name:'Viewer'})).status,200);
  assert.equal((await request('predict',{roundId:live.round.id,champion:'Ahri'})).status,200);
  const resolution={roundId:live.round.id,champion:'Ahri',expectedControlRevision:2};
  assert.deepEqual((await Promise.all([request('draft/resolve',resolution),request('draft/resolve',resolution)])).map(r=>r.status).sort(),[200,409]);
  assert.equal((await request('state')).body.me.seriesScore,75);
  await stop();await start();
  const recovered=(await request('state')).body;assert.equal(recovered.me.seriesScore,75);assert.equal(recovered.controlRevision,3);assert.equal(recovered.actions.length,1);
  assert.equal((await request('recovery/import',{expectedControlRevision:3,snapshot:{version:2,viewers:[]}})).status,400);
  assert.equal((await request('state')).body.me.seriesScore,75);
});
