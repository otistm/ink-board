/* Ink Board: the score and clock, the trick line, callouts, the first-time lesson and the cards. */
"use strict";
const $=id=>document.getElementById(id);
const fmtT=t=>{ const s=Math.ceil(Math.max(0,t)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };

function hudShow(on){ ['hud','pause'].forEach(id=>$(id).hidden=!on); if(!on){ hint(null); $('combo').className=''; } }
let lastHud='';
function updHUD(){
  const t=S.live?fmtT(S.time):fmtT(SESSION), txt=fmtN(S.score)+'|'+t+'|'+S.live;
  if(txt===lastHud) return; lastHud=txt;
  $('score').textContent=fmtN(S.score); $('time').textContent=t;
  $('time').classList.toggle('low',S.live&&S.time<=10);
  $('tsub').textContent=S.live?'left':S.tut>=0?'Learning':'Roll to start';
  $('bestL').textContent=BEST.score?'Best '+fmtN(BEST.score):'No best yet';
}
function callout(big,small){
  const el=$('callout'); el.innerHTML=`<b>${big}</b>`+(small?`<span>${small}</span>`:'');
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
}
function hint(text){ if(text){ $('hintT').textContent=text; $('hint').hidden=false; } else $('hint').hidden=true; }
let holdT=0;
function holdWarn(){ if(S.t-holdT<2.5) return; holdT=S.t; if(S.tut<0) callout('Hold the board','Keep your pointer finger on it to push'); }

/* ---------- the trick line ----------
   While a combo is going it shows each trick and the running points times the number of tricks. */
function comboText(extra){
  const c=S.combo, n=c?c.names.slice():[]; if(extra) n.push(extra);
  const names=n.length>4?n.slice(0,2).join(' + ')+' + … + '+n.slice(-2).join(' + '):n.join(' + ');
  $('comboN').textContent=names;
  $('comboP').textContent=c?fmtN(c.pts)+(c.names.length>1?' × '+c.names.length:''):'';
}
function comboPop(cls){ const el=$('combo'); el.className=''; void el.offsetWidth; el.className=cls; }
function trickLive(){ const a=S.air; if(!a) return; const tr=trickOf(a); comboText(tr.n); comboPop('on pop'); $('comboTag').textContent=''; }
function comboShow(info){ comboText(); comboPop('on pop');
  $('comboTag').textContent=info.caught&&info.over?'Caught · cleared it':info.caught?'Caught':info.over?'Cleared it':''; }
let tickT=0;
function comboTick(){ if(S.t-tickT<.1) return; tickT=S.t; comboText(); }
function comboBanked(total){ $('comboP').textContent='+'+fmtN(total); $('comboTag').textContent=''; comboPop('bank'); }
function comboBail(why){ $('comboN').textContent=why; $('comboP').textContent=''; $('comboTag').textContent=''; comboPop('bail'); }

/* ---------- the first-time lesson ---------- */
const TUT=[
  {t:'Put your pointer and middle fingers on the board to roll', ev:'roll'},
  {t:'Steer: slide your pointer finger a little left or right', ev:'steer'},
  {t:'Ollie: middle finger on the tail, then slide your pointer finger up to the nose, fast', ev:'ollie'},
  {t:'Kickflip: slide up and flick off the right side. Flick left for a heelflip', ev:'flip'},
  {t:'Catch it: get your fingers back on the board before it lands', ev:'catch'}
];
function tutStart(){ S.tut=0; hint(TUT[0].t); $('skip').hidden=false; }
function tutEvent(ev){
  if(S.mode!=='play') return;
  if(S.tut<0) return;
  if(TUT[S.tut].ev!==ev) return;
  S.tut++; sfx('tick');
  if(S.tut>=TUT.length) tutDone(); else hint(TUT[S.tut].t);
}
function tutDone(){ S.tut=-1; META.tut=1; saveMeta(); hint(null); $('skip').hidden=true; S.turned=0; startClock(); }
function startClock(){ S.live=true; hint(null); S.time=SESSION; callout('Go!',SESSION+' seconds. Land tricks.'); }

/* ---------- cards ---------- */
function card(html,cls){ const c=$('card'); c.className=cls||''; $('panel').innerHTML=html; c.hidden=false; }
function cardHide(){ $('card').hidden=true; }
function homeCard(){
  S.mode='home'; hudShow(false); PT.clear();
  if(S.live||S.over){ resetWorld(); Object.assign(S,{live:false,over:false,P:{x:0,y:0},h:0,combo:null,marks:[],ghost:null}); }
  card(`<h2 class="logo">Ink Board</h2>
    <p>Two fingers. One board.</p>
    ${BEST.score?`<div class="bestline">Best <b>${fmtN(BEST.score)}</b></div>`:''}
    <button class="btn" id="go">Skate</button>
    ${META.tut?'<button class="btn ghost" id="how">Show me how again</button>':''}
    <div class="how">
      <div><b>Roll</b> Two fingers on the board and it rolls. Swipe one down the ground to push faster.</div>
      <div><b>Ollie</b> Middle finger on the tail, slide your pointer finger to the nose.</div>
      <div><b>Flip</b> Slide up and flick off the side. Catch it before it lands.</div>
    </div>
    <button class="fbc${META.sound?' on':''}" id="snd">${META.sound?'Sound on':'Sound off'}</button>
    <p class="ver">Version ${VERSION}</p>`,'home');
  $('go').onclick=()=>startRun(!META.tut);
  if($('how')) $('how').onclick=()=>startRun(true);
  $('snd').onclick=()=>{ audioInit(); soundOn(!META.sound); homeCard(); };
}
function pauseGame(){
  if(S.mode!=='play') return; S.mode='pause'; PT.clear();
  card(`<h2>Paused</h2><p>${S.live?fmtT(S.time)+' left':'The clock hasn’t started'}</p>
    <button class="btn" id="res">Keep skating</button>
    <button class="btn ghost" id="rst">Start again</button>
    <button class="btn ghost" id="hm">Home</button>`);
  $('res').onclick=()=>{ cardHide(); S.mode='play'; last=performance.now(); };
  $('rst').onclick=()=>startRun(false);
  $('hm').onclick=homeCard;
}
function doneCard(isBest){
  const bc=S.bestCombo;
  card(`<h2>Time!</h2>
    <div class="big">${fmtN(S.score)}</div>
    <p class="nxt">${isBest?'A new best':'Best '+fmtN(BEST.score)}</p>
    <div class="stats"><div><b>${S.tricks}</b><small>tricks landed</small></div><div><b>${fmtN(bc.pts)}</b><small>best combo</small></div></div>
    ${bc.name?`<p class="cname">${bc.name}</p>`:''}
    <button class="btn" id="again">Skate again</button>
    <button class="btn ghost" id="hm">Home</button>`);
  $('again').onclick=()=>startRun(false);
  $('hm').onclick=homeCard;
}
