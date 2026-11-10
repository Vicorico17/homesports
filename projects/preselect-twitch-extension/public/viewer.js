import {createChannelClient,readResponse,showConnectionError} from "./channel-client.js";
const channelClient=createChannelClient(location);
let viewerId = localStorage.getItem("pick-predict-viewer");
let state = null;
let busy=false,refreshPromise=null;
let boardMode = "seriesScore";
let search = "";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const initials = name => name.split(/\s|'/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase();
const api = async (path, data) => {
  const response = await fetch(channelClient.url(`/api/${path}`), { method:"POST", headers:{"content-type":"application/json", ...(viewerId ? {"x-viewer-id":viewerId}:{})}, body:JSON.stringify(data || {}) });
  return readResponse(response);
};
const toast = message => { const el=document.createElement("div"); el.className="toast"; el.textContent=message; document.body.append(el); setTimeout(()=>el.remove(),2200); };

async function refresh(force=false) {
  if((busy&&force!==true)||document.hidden)return;
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{try{const response=await fetch(channelClient.url("/api/state",{viewerId}),{cache:"no-store"});const next=await readResponse(response);channelClient.adopt(next);state=next;render()}catch(error){state=null;$("#join").classList.add("hidden");showConnectionError($("#app"),error,channelClient)}})();
  try{await refreshPromise}finally{refreshPromise=null}
}

function render() {
  if(!state)return;
  const focused=document.activeElement?.id;const selection=[document.activeElement?.selectionStart,document.activeElement?.selectionEnd];
  const authenticated=state?.auth?.authenticated;
  $("#join").classList.toggle("hidden",!state?.match || Boolean(state.me) || !authenticated);
  if(state?.auth?.role==="demo"&&!viewerId){viewerId=crypto.randomUUID();localStorage.setItem("pick-predict-viewer",viewerId)}
  const app = $("#app");
  if (!state?.match) {
    app.innerHTML = `<section class="card notice"><div class="eyebrow">Broadcast lobby</div><h1>The desk is getting ready.</h1><p>The prediction game will appear here as soon as the producer creates a match.</p></section>`;
    return;
  }
  const {match, round, actions, leaderboard} = state;
  const team = round ? (round.side === "blue" ? match.blueTeam : match.redTeam) : "";
  const available = state.champions.filter(champion => champion.toLowerCase().includes(search.toLowerCase()));
  const roundOpen = round?.status === "open" && authenticated && Boolean(state.me);
  const title = round ? `${escapeHtml(team)} ${round.kind} ${round.slot}` : state.status === "complete" ? "Draft complete" : "Waiting for the draft";
  const revealed = state.lastAction?.status === "resolved" && state.lastAction.champion;
  app.innerHTML = `${!authenticated?`<section class="card notice"><p>Sign in to Twitch to participate.</p><a class="button" href="${escapeHtml(channelClient.loginUrl())}">Sign in with Twitch</a></section>`:""}<div class="layout">
    <section class="card hero">
      ${revealed ? `<div class="reveal-banner">${escapeHtml(state.lastAction.side === "blue" ? match.blueTeam : match.redTeam)} locked <strong>${escapeHtml(state.lastAction.champion)}</strong> · ${state.lastAction.correctVotes || 0}/${state.lastAction.totalVotes || 0} correct</div>` : ""}
      <div class="eyebrow">${escapeHtml(match.seriesName)} · Game ${state.game} · Best of ${match.bestOf}</div>
      <div class="match-line"><div class="team blue-text">${escapeHtml(match.blueTeam)}</div><div class="versus">VS</div><div class="team red red-text">${escapeHtml(match.redTeam)}</div></div>
      <div class="round-heading"><div><div class="eyebrow">${round ? `${round.side} side · predict the next ${round.kind}` : "Draft status"}</div><h1 class="round-title">${title}</h1></div><div id="timer" class="timer"></div></div>
      <div class="progress"><div id="progress"></div></div>
      ${round ? `<input class="search" id="search" value="${escapeHtml(search)}" placeholder="Search ${state.champions.length} champions…" ${roundOpen?"":"disabled"}>
      <div class="champions">${available.map(champion => `<button class="champion ${state.myPrediction===champion?"selected":""}" data-champion="${escapeHtml(champion)}" ${roundOpen?"":"disabled"}><span class="initials">${initials(champion)}</span><span class="champion-name">${escapeHtml(champion)}</span></button>`).join("")}</div>` : `<div class="empty">${state.status === "complete" ? "Final calls are in. Check the leaderboard." : "The producer will open predictions shortly."}</div>`}
      <div class="draft-strip">${Array.from({length:20},(_,i)=>{const done=actions[i]; const current=round?.index===i; const side=done?.side || (current?round.side:""); return `<div class="draft-step ${side} ${done?"done":""} ${current?"current":""}" title="${done?`${done.kind}: ${done.champion||"cancelled"}`:`Action ${i+1}`}">${i+1}</div>`}).join("")}</div>
    </section>
    <aside class="card side-card"><h2 class="card-title">Live leaderboard</h2><div class="tabs"><button class="tab ${boardMode==="gameScore"?"active":""}" data-mode="gameScore">Game</button><button class="tab ${boardMode==="seriesScore"?"active":""}" data-mode="seriesScore">Series</button></div><div id="leaders">${leaderboard.length ? [...leaderboard].sort((a,b)=>b[boardMode]-a[boardMode]).slice(0,12).map((viewer,i)=>`<div class="leader-row"><div class="rank">${String(i+1).padStart(2,"0")}</div><div><div class="leader-name">${escapeHtml(viewer.name)}</div><div class="leader-meta">${viewer.correct}/${viewer.attempts} correct · ${viewer.streak} streak</div></div><div class="score">${viewer[boardMode]}</div></div>`).join("") : `<div class="empty">No analysts yet.</div>`}</div></aside>
  </div>`;
  $("#search")?.addEventListener("input", event => { search=event.target.value; render(); $("#search")?.focus(); });
  document.querySelectorAll("[data-champion]").forEach(button => button.addEventListener("click", async()=>{ if(busy)return;busy=true;document.querySelectorAll("[data-champion]").forEach(b=>b.disabled=true);try { if(refreshPromise)await refreshPromise;await api("predict",{champion:button.dataset.champion,roundId:round.id}); toast(`Locked ${button.dataset.champion}`); await refresh(true); } catch(error){toast(error.message);await refresh(true)}finally{busy=false;render()} }));
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click",()=>{boardMode=button.dataset.mode;render()}));
  updateTimer();
  if(focused==="search"&&$("#search")&&!$("#search").disabled){$("#search").focus({preventScroll:true});$("#search").setSelectionRange(...selection)}
  if(busy)document.querySelectorAll("[data-champion]").forEach(b=>b.disabled=true);
}

function updateTimer(){
  const timer=$("#timer"), progress=$("#progress"); if(!timer||!state?.round){if(timer)timer.textContent="";return}
  const left=Math.max(0,state.round.closesAt-Date.now());
  timer.textContent=state.round.status==="open"?`${Math.ceil(left/1000)}s`:"VOTING CLOSED";
  timer.classList.toggle("closed",state.round.status!=="open");
  if(progress) progress.style.width=`${Math.max(0,Math.min(100,left/(state.roundSeconds*10)))}%`;
}

$("#join-form").addEventListener("submit", async event => { event.preventDefault();if(busy)return;busy=true;const submit=event.target.querySelector("button[type=submit]");submit.disabled=true;try { const json=await api("join",{name:$("#name").value}); viewerId=json.result.viewerId; localStorage.setItem("pick-predict-viewer",viewerId); $("#join").classList.add("hidden"); await refresh(true); } catch(error){toast(error.message)}finally{busy=false;submit.disabled=false;render()} });
try{new EventSource(channelClient.url("/api/events")).addEventListener("refresh",refresh)}catch(error){state=null;showConnectionError($("#app"),error,channelClient)};
setInterval(updateTimer,200);
setInterval(()=>{if(!busy)refresh()},3000);
refresh();
