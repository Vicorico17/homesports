import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../public/twitch/extension.js',import.meta.url),'utf8');
function harness({hosted=false,hidden=false,view="config"}={}) {
  const calls=[];
  const document={hidden,documentElement:{dataset:{view}},activeElement:null,querySelector:()=>({remove(){},prepend(){},querySelectorAll:()=>[]}),querySelectorAll:()=>[],createElement:()=>({setAttribute(){}})};
  const context=vm.createContext({document,location:{hostname:hosted?'test.ext-twitch.tv':'localhost',origin:'http://localhost',search:''},localStorage:{getItem:()=>null,setItem(){}},crypto:{randomUUID:()=> 'local-test'},URLSearchParams,confirm:()=>true,setInterval:()=>0,clearInterval(){},fetch:async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>({controlRevision:12,round:{id:'round-2'}})}}});
  vm.runInContext(source.slice(0,source.indexOf('if(window.Twitch?.ext)'))+'\nrender=()=>{}; notice=()=>{}; state={controlRevision:11,round:{id:"round-1"}};',context);
  return {context,calls,run:code=>vm.runInContext(code,context)};
}
test('producer mutations carry the rendered revision and round without replay',async()=>{
  const h=harness();await h.run('act("draft/resolve",{champion:"Ahri",roundId:"round-1"})');
  assert.deepEqual(JSON.parse(h.calls[0].body),{champion:'Ahri',roundId:'round-1',expectedControlRevision:11});
  assert.match(h.calls[1].url,/producer=1/);
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
});
test('predictions carry round identity but not a producer revision',async()=>{
  const h=harness();await h.run('act("predict",{champion:"Ahri",roundId:"round-1"})');
  assert.deepEqual(JSON.parse(h.calls[0].body),{champion:'Ahri',roundId:'round-1'});
});
test('hidden and unauthorised hosted extensions do not poll',async()=>{
  for(const options of [{hidden:true},{hosted:true}]){const h=harness(options);await h.run('refresh()');assert.equal(h.calls.length,0)}
});
test('hosted extensions never send arbitrary local viewer identities',()=>{
  const h=harness({hosted:true});assert.equal(h.run('headers()["x-viewer-id"]'),undefined);
  h.run('token="verified-jwt"');assert.equal(h.run('headers()["x-extension-jwt"]'),'verified-jwt');
});
test('duplicate mutations are ignored while first request is pending',async()=>{
  const h=harness();let release;h.context.fetch=async(url,options)=>{h.calls.push({url,...options});if(options.method==='POST')await new Promise(resolve=>{release=resolve});return {ok:true,json:async()=>({controlRevision:12})}};
  const first=h.run('act("draft/start",{})');await h.run('act("draft/start",{})');assert.equal(h.calls.length,1);release();await first;
});
test('polls coalesce while a state request is pending',async()=>{
  const h=harness();let release;h.context.fetch=async()=>{h.calls.push({});await new Promise(resolve=>{release=resolve});return {ok:true,json:async()=>({controlRevision:12})}};
  const first=h.run('refresh()');const second=h.run('refresh()');assert.equal(h.calls.length,1);release();await Promise.all([first,second]);
});
test('stale control response refreshes state and never replays the mutation',async()=>{
  const h=harness();h.context.fetch=async(url,options)=>{h.calls.push({url,...options});return options.method==='POST'?{ok:false,json:async()=>({error:'Draft changed. Refresh and try again.',code:'STALE_CONTROL'})}:{ok:true,json:async()=>({controlRevision:12})}};
  await h.run('act("draft/undo",{})');
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
  assert.equal(h.calls.filter(c=>c.method==='GET').length,1);
  assert.equal(h.run('busy'),false);
});
test('anonymous Twitch viewers are not auto-joined',async()=>{
  const h=harness({hosted:true,view:"panel"});h.run('token="anonymous-jwt"');
  h.context.fetch=async(url,options)=>{h.calls.push({url,...options});return {ok:true,json:async()=>({extension:{anonymous:true},me:null})}};
  await h.run('refresh()');assert.equal(h.calls.length,1);
});
test('unconfigured Twitch channel renders a waiting lobby without attempting join',async()=>{
  const h=harness({hosted:true,view:'panel'});h.run('token="viewer-jwt"');
  h.context.fetch=async(url,options)=>{h.calls.push({url,...options});return {ok:true,json:async()=>({match:null,extension:{anonymous:false},me:null})}};
  await h.run('refresh()');assert.equal(h.calls.length,1);assert.equal(h.calls[0].method,'GET');
});
