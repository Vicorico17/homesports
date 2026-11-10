import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createChannelClient,readResponse,showConnectionError} from '../public/channel-client.js';
const location={origin:'https://example.com',hostname:'example.com',pathname:'/',search:'?channel=123'};
test('channel propagates through state, producer writes, SSE and recovery',()=>{
  const client=createChannelClient(location);
  for(const path of ['/api/state','/api/draft/resolve','/api/events','/api/recovery/export'])assert.equal(client.url(path),path+'?channel=123');
  assert.equal(client.url('/api/state',{producer:1}),'/api/state?channel=123&producer=1');
});
test('same-site navigation keeps channel, OAuth carries local return route',()=>{
  const client=createChannelClient({...location,pathname:'/automation'});
  const links=['/control','/overlay','/','/api/recovery/export'].map(href=>({href,getAttribute(){return this.href},setAttribute(key,value){this[key]=value}}));
  client.links({querySelectorAll:()=>links});
  assert.ok(links.every(link=>link.href.endsWith('?channel=123')));
  assert.equal(new URL(client.loginUrl(),location.origin).searchParams.get('returnTo'),'/automation?channel=123');
});
test('bad channel selectors fail closed instead of falling back to another channel',()=>{
  for(const search of ['?channel=123&channel=456','?channel=','?channel=other','?channel=demo'])assert.throws(()=>createChannelClient({...location,search}).url('/api/state'),/valid channel ID/);
  assert.throws(()=>createChannelClient(location).url('https://other.example/'),/same-site/);
});
test('default authorized channel from server is pinned for navigation and mutations',()=>{
  const client=createChannelClient({...location,search:''});client.adopt({channelId:'456'});
  assert.equal(client.url('/api/draft/start'),'/api/draft/start?channel=456');
  assert.throws(()=>client.adopt({channelId:'789'}),/different channel/);
});
test('demo channel accepted only on explicit localhost entry',()=>{
  const client=createChannelClient({...location,hostname:'localhost',search:'?channel=demo'});
  assert.equal(client.url('/api/state'),'/api/state?channel=demo');
});
test('API errors retain actionable channel/auth codes',async()=>{
  for(const code of ['channel_required','viewer_sign_in_required','producer_required'])await assert.rejects(()=>readResponse({ok:false,status:403,json:async()=>({error:'Sign in',code})}),error=>error.code===code&&error.status===403);
});
test('missing-channel and sign-in errors render text and an actionable login link',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({children:[],setAttribute(){},append(...items){this.children.push(...items)}})};
  try{for(const code of ['channel_required','viewer_sign_in_required']){let section;showConnectionError({replaceChildren(value){section=value}},{code,message:'Sign in'},createChannelClient({...location,search:''}));assert.equal(section.children.at(-1).textContent,'Sign in with Twitch');assert.match(section.children.at(-1).href,/returnTo=/);if(code==='channel_required')assert.match(section.children[1].textContent,/channel-ID/)}}finally{globalThis.document=previous}
});
test('all standalone clients use shared URL construction and preserve API error metadata',()=>{
  for(const file of ['control','viewer','automation','overlay']){const source=readFileSync(new URL(`../public/${file}.js`,import.meta.url),'utf8');assert.match(source,/fetch\(channelClient.url/);assert.match(source,/readResponse/);assert.doesNotMatch(source,/new EventSource\("\/api/)}
  assert.doesNotMatch(readFileSync(new URL('../public/automation.js',import.meta.url),'utf8'),/template:"provider"/);
});
