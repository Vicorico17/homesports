import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { createApi } from '../src/api.js';
import { authFor } from '../src/auth.js';

const extensionSecret = Buffer.alloc(32, 7).toString('base64');
const sessionSecret = 'test-only-session-secret-not-a-real-credential';
const origin = 'https://predict.example';
function token(role = 'viewer', channel = '123', viewer = 'Uviewer', extra = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role, channel_id: channel, opaque_user_id: viewer, exp: Math.floor(Date.now()/1000)+3600, ...extra })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256',Buffer.from(extensionSecret,'base64')).update(`${header}.${payload}`).digest('base64url')}`;
}
function cookie(id='123', extra={}) {
  const payload=Buffer.from(JSON.stringify({id,displayName:'Fixture producer',expiresAt:Date.now()+3600000,...extra})).toString('base64url');
  return `pp_session=${payload}.${createHmac('sha256',sessionSecret).update(payload).digest('base64url')}`;
}
async function harness(t, { seed=null }={}) {
  const configured={NODE_ENV:'production',VERCEL:undefined,PICK_PREDICT_DEMO:undefined,PICK_PREDICT_PUBLIC_ORIGIN:origin,PICK_PREDICT_DATA_FILE:'/tmp/test-only-pick-predict.json',TWITCH_EXTENSION_SECRET:extensionSecret,TWITCH_EXTENSION_CLIENT_ID:'fixture',TWITCH_CLIENT_ID:undefined,TWITCH_CLIENT_SECRET:undefined,SESSION_SECRET:undefined,TWITCH_CHANNEL_IDS:undefined,TWITCH_BROADCASTER_IDS:undefined,TWITCH_MODERATOR_CHANNELS:undefined,TWITCH_REDIRECT_URI:undefined};
  const old=Object.fromEntries(Object.keys(configured).map(key=>[key,process.env[key]]));
  for(const [key,value] of Object.entries(configured)){if(value===undefined)delete process.env[key];else process.env[key]=value}
  let snapshot=seed,saves=0,fail=false,clock=Date.now();
  const api=createApi({now:()=>clock,persistence:{mode:'test-memory',async load(){return structuredClone(snapshot)},async save(value){if(fail)throw Error('disk error with private details');snapshot=structuredClone(value);saves++}}});
  const server=createServer(api.handle);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await api.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));for(const [key,value]of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value}});
  async function request(path, {data,role='viewer',channel='123',viewer='Uviewer',headers={},method,raw}={}) {
    const response=await fetch(`${base}/api/${path}`,{method:method||(data===undefined&&raw===undefined?'GET':'POST'),headers:{...(role?{'x-extension-jwt':token(role,channel,viewer)}:{}),...(data!==undefined||raw!==undefined?{'content-type':'application/json'}:{}),...headers},body:raw??(data===undefined?undefined:JSON.stringify(data)),redirect:'manual'});
    return {status:response.status,headers:response.headers,body:await response.json()};
  }
  async function create(channel='123') {return request('match/create',{role:'broadcaster',channel,data:{blueTeam:'Blue',redTeam:'Red',bestOf:3,expectedControlRevision:0}})}
  async function live() {assert.equal((await create()).status,200);assert.equal((await request('draft/start',{role:'broadcaster',data:{expectedControlRevision:1}})).status,200);return(await request('state')).body}
  return {request,create,live,snapshot:()=>snapshot,saves:()=>saves,setFailure:value=>{fail=value},advance:ms=>{clock+=ms}};
}

test('production authentication never falls back to demo, even when demo is requested',async t=>{
  const h=await harness(t);process.env.PICK_PREDICT_DEMO='true';
  const auth=authFor({headers:{}});assert.equal(auth.producer,false);assert.equal(auth.authenticated,false);
  const result=await h.request('match/create?channel=123',{role:null,data:{blueTeam:'A',redTeam:'B',expectedControlRevision:0}});
  assert.equal(result.status,403);assert.equal(h.saves(),0);
});

test('channel isolation protects controls and recovery from viewers and unrelated tokens',async t=>{
  const h=await harness(t);assert.equal((await h.create()).status,200);
  assert.equal((await h.request('state?channel=456',{role:'broadcaster'})).status,403);
  assert.equal((await h.request('recovery/export')).status,403);
  assert.equal((await h.request('draft/start',{data:{expectedControlRevision:1}})).status,403);
  assert.equal((await h.request('draft/start',{role:'moderator',data:{expectedControlRevision:1}})).status,200);
  assert.equal((await h.request('state',{channel:'456'})).body.match,null);
});

test('repeated concurrent resolution commits exactly once and hides unrevealed scores',async t=>{
  const h=await harness(t);const state=await h.live();
  assert.equal((await h.request('join',{data:{name:'Viewer'}})).status,200);
  assert.equal((await h.request('predict',{data:{roundId:state.round.id,champion:'Ahri'}})).status,200);
  const change={role:'broadcaster',data:{roundId:state.round.id,champion:'Ahri',expectedControlRevision:2}};
  const results=await Promise.all([h.request('draft/resolve',change),h.request('draft/resolve',change)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const hidden=(await h.request('state')).body;assert.equal(hidden.actions.length,1);assert.equal(hidden.lastAction.champion,null);assert.equal(hidden.me.seriesScore,0);
  h.advance(7001);const revealed=(await h.request('state')).body;assert.equal(revealed.lastAction.champion,'Ahri');assert.equal(revealed.me.seriesScore,75);assert.equal(revealed.controlRevision,3);
  assert.equal((await h.request('predict',{data:{roundId:state.round.id,champion:'Ahri'}})).status,409);
});

test('stale producer mutations and missing round identifiers cannot change another round',async t=>{
  const h=await harness(t);const state=await h.live();
  assert.equal((await h.request('draft/cancel',{role:'broadcaster',data:{expectedControlRevision:2}})).status,409);
  assert.equal((await h.request('series/clear',{role:'broadcaster',data:{expectedControlRevision:1}})).status,409);
  assert.equal((await h.request('draft/cancel',{role:'broadcaster',data:{expectedControlRevision:2,roundId:state.round.id}})).status,200);
  assert.equal((await h.request('draft/cancel',{role:'broadcaster',data:{expectedControlRevision:3,roundId:state.round.id}})).status,409);
  assert.equal((await h.request('state')).body.actions.length,1);
});

test('failed persistence rolls back points, round and revision before exposing state',async t=>{
  const h=await harness(t);const state=await h.live();h.setFailure(true);
  const result=await h.request('draft/resolve',{role:'broadcaster',data:{expectedControlRevision:2,roundId:state.round.id,champion:'Ahri'}});
  assert.equal(result.status,503);assert.equal(result.headers.get('retry-after'),'5');assert.doesNotMatch(JSON.stringify(result.body),/private details/);
  const unchanged=(await h.request('state')).body;assert.equal(unchanged.round.id,state.round.id);assert.equal(unchanged.controlRevision,2);assert.equal(unchanged.actions.length,0);
  assert.equal(h.snapshot().channels[0][1].controlRevision,2);
});

test('anonymous Twitch viewers can watch but cannot persist participation',async t=>{
  const h=await harness(t);await h.create();const before=h.saves();
  assert.equal((await h.request('state',{viewer:'Aanonymous'})).body.extension.anonymous,true);
  assert.equal((await h.request('join',{viewer:'Aanonymous',data:{name:'Guest'}})).status,403);
  assert.equal(h.saves(),before);
});

test('production ignores arbitrary viewer identity headers and query parameters',async t=>{
  const h=await harness(t);await h.live();await h.request('join',{viewer:'Ualice',data:{name:'Alice'}});
  const result=await h.request('state?channel=123&viewerId=Ualice',{role:null,headers:{'x-viewer-id':'Ualice'}});
  assert.equal(result.status,200);assert.equal(result.body.me,null);
  assert.equal((await h.request('join?channel=123',{role:null,headers:{origin,'x-viewer-id':'Ualice'},data:{name:'Impersonator'}})).status,403);
});

test('OAuth producer mutations require the configured origin and explicit channel permission',async t=>{
  const h=await harness(t);Object.assign(process.env,{TWITCH_CLIENT_ID:'fixture-client',TWITCH_CLIENT_SECRET:'fixture-secret',SESSION_SECRET:sessionSecret,TWITCH_BROADCASTER_IDS:'123'});
  const data={blueTeam:'Blue',redTeam:'Red',expectedControlRevision:0};const headers={cookie:cookie()};
  assert.equal((await h.request('match/create?channel=123',{role:null,headers,data})).status,403);
  assert.equal((await h.request('match/create?channel=123',{role:null,headers:{...headers,origin:'https://attacker.example'},data})).status,403);
  assert.equal((await h.request('match/create?channel=456',{role:null,headers:{...headers,origin},data})).status,403);
  assert.equal((await h.request('match/create?channel=123',{role:null,headers:{...headers,origin},data})).status,200);
  assert.equal((await h.request('auth/logout',{role:null,headers:{...headers,origin}})).status,405);
  assert.equal((await h.request('auth/logout',{role:null,headers:{...headers,origin},data:{}})).status,200);
});

test('malformed, expired, missing-role and external JWTs do not gain fallback access',async t=>{
  const h=await harness(t);
  for(const jwt of ['broken',token('external'),token('viewer','123','Uviewer',{exp:'forever'}),token('viewer','123','Uviewer',{role:null}),token('viewer','123','Uviewer',{nbf:Date.now()/1000+1000})]){
    const result=await h.request('state?channel=123',{role:null,headers:{'x-extension-jwt':jwt}});assert.equal(result.status,401);
  }
});

test('only the configured extension CDN receives CORS access',async t=>{
  const h=await harness(t);
  const allowed=await h.request('state',{headers:{origin:'https://fixture.ext-twitch.tv'}});assert.equal(allowed.status,200);assert.equal(allowed.headers.get('access-control-allow-origin'),'https://fixture.ext-twitch.tv');
  assert.equal((await h.request('state',{headers:{origin:'https://other.ext-twitch.tv'}})).status,403);
});

test('request size, JSON shape and content type are bounded before mutation',async t=>{
  const h=await harness(t);await h.create();
  assert.equal((await h.request('match/configure',{role:'broadcaster',raw:'x'.repeat(65537)})).status,413);
  assert.equal((await h.request('match/configure',{role:'broadcaster',raw:'[]'})).status,400);
  assert.equal((await h.request('match/configure',{role:'broadcaster',raw:'{'})).status,400);
  assert.equal((await h.request('match/configure',{role:'broadcaster',raw:'{}',headers:{'content-type':'text/plain'}})).status,415);
  assert.equal((await h.request('constructor',{role:'broadcaster',data:{}})).status,404);
  assert.equal(h.saves(),1);
});

test('unconfigured serverless production returns 503 instead of memory-only success',async t=>{
  const h=await harness(t);process.env.VERCEL='1';const result=await h.request('health',{role:null});
  assert.equal(result.status,503);assert.match(result.body.error,/shared transactional storage/);assert.equal(h.saves(),0);
});

test('corrupt recovery fails closed and never overwrites saved state',async t=>{
  const h=await harness(t,{seed:{version:3,channels:[['123',{version:2,viewers:[]}]]}});
  assert.equal((await h.request('health')).status,503);assert.equal((await h.create()).status,503);assert.equal(h.saves(),0);
});

test('read-only requests do not allocate persisted channels',async t=>{
  const h=await harness(t);
  for(let index=1;index<=105;index++)assert.equal((await h.request('state',{channel:String(index)})).status,200);
  assert.equal(h.saves(),0);assert.equal((await h.create('999')).status,200);
});
