// Channel selectors are untrusted until the API authorizes them. Never silently
// discard a malformed or duplicated selector and fall back to another channel.
export function createChannelClient(location) {
  const entry = new URLSearchParams(location.search);
  const entries = entry.getAll('channel');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const invalid = entries.length > 1 || (entries.length === 1 && !/^\d{1,32}$/.test(entries[0]) && !(local && entries[0] === 'demo'));
  let channel = entries[0] || null;
  function assertValid() {
    if (invalid) throw Object.assign(new Error('Use one valid channel ID in the page URL, for example ?channel=12345.'), {code:'invalid_channel'});
  }
  function url(path, parameters = {}) {
    assertValid();
    const target = new URL(path, location.origin);
    if (target.origin !== location.origin) throw new Error('Only same-site navigation is supported.');
    if (channel) target.searchParams.set('channel', channel);
    for (const [key,value] of Object.entries(parameters)) if (value !== undefined && value !== null) target.searchParams.set(key,value);
    return target.pathname + target.search + target.hash;
  }
  function adopt(state) {
    assertValid();
    const id = state?.channelId;
    if (typeof id !== 'string' || (!/^\d{1,32}$/.test(id) && !(local && id === 'demo'))) return;
    if (channel && channel !== id) throw new Error('The server returned a different channel. Reload the intended channel URL.');
    channel = id;
  }
  function links(root) {
    root.querySelectorAll('a[href]').forEach(link => {
      const target = new URL(link.getAttribute('href'),location.origin);
      if(target.origin===location.origin && ['/', '/control', '/automation', '/overlay', '/api/recovery/export'].includes(target.pathname)) link.setAttribute('href',url(target.pathname+target.search+target.hash));
    });
  }
  function loginUrl() {
    return '/api/auth/login?'+new URLSearchParams({returnTo:url(location.pathname || '/control')});
  }
  return {url,adopt,links,loginUrl};
}
export async function readResponse(response) {
  const data=await response.json();
  if(!response.ok)throw Object.assign(new Error(data.error || 'The request failed. Please try again.'),{code:data.code,status:response.status});
  return data;
}
export function showConnectionError(root,error,client) {
  const section=document.createElement('section');section.className='card notice';section.setAttribute('role','alert');
  const title=document.createElement('h1');title.textContent=error.code==='channel_required'?'Choose a channel':'Unable to load this channel';
  const detail=document.createElement('p');detail.textContent=error.code==='channel_required'?'Open the channel link from the broadcaster, including ?channel=their-channel-ID. Producers can sign in below.':error.message;
  section.append(title,detail);
  if(error.code==='channel_required'||error.code==='viewer_sign_in_required'||error.code==='producer_required'){
    const link=document.createElement('a');link.className='button';link.textContent='Sign in with Twitch';link.href=client.loginUrl();section.append(link);
  }
  root.replaceChildren(section);
}
