/* Ink Board: starting a session, the clock, and the main loop. Always loaded last. */
"use strict";
function startRun(lesson){
  audioInit(); cardHide(); PT.clear(); resetWorld();
  Object.assign(S,{mode:'play',P:{x:0,y:0},h:0,v:0,st:'ground',air:null,grind:null,bail:null,ghost:null,ramp:0,yaw:0,flip:0,z:0,squash:0,
    leanIn:0,leanS:0,score:0,time:SESSION,live:false,over:false,combo:null,comboIdle:0,tricks:0,bestCombo:{pts:0,name:''},
    shake:0,marks:[],sparks:[],rings:[],tut:-1,turned:0,cellF:'',cellB:''});
  hudShow(true); lastHud=''; $('skip').hidden=true;
  if(lesson) tutStart(); else hint('Two fingers on the board to roll');
}
function endRun(){
  S.over=true; S.mode='done'; PT.clear(); hint(null);
  BEST.runs=(BEST.runs||0)+1;
  const isBest=S.score>0&&S.score>BEST.score;
  if(isBest) BEST.score=S.score;
  if(S.bestCombo.pts>BEST.combo){ BEST.combo=S.bestCombo.pts; BEST.comboName=S.bestCombo.name; }
  saveBest();
  callout('Time!');
  setTimeout(()=>{ if(S.mode==='done') doneCard(isBest); },1100);
}

let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  S.t+=dt;
  if(S.mode==='play'){
    inputFrame(dt); step(dt);
    if(S.live){ S.time-=dt;
      if(S.time<=0){ S.time=0; if(S.st==='ground'||S.st==='bail'){ if(S.combo&&S.st==='ground') bank(); endRun(); } } }
    if(!S.live&&S.tut<0&&S.v>12&&!S.over) startClock();
    updHUD();
  } else if(S.mode==='home'||S.mode==='done'){
    // behind the cards the board rolls on by itself
    const tgt=S.mode==='home'?32:0; S.v+=(tgt-S.v)*Math.min(1,dt*(S.mode==='home'?1:1.5));
    if(S.st!=='ground'){ S.st='ground'; S.air=null; S.grind=null; S.bail=null; S.flip=0; S.z=0; }
    S.leanS*=.9; move(dt); S.squash=Math.max(0,S.squash-dt*4);
  }
  S.rings.forEach(r=>r.t+=dt); S.rings=S.rings.filter(r=>r.t<.35);
  S.sparks.forEach(p=>p.t+=dt); S.sparks=S.sparks.filter(p=>p.t<.25);
  marksAge(); loopsSet();
  draw();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden) pauseGame(); });
$('pause').onclick=pauseGame;
$('skip').onclick=()=>{ if(S.tut>=0) tutDone(); };
homeCard();
requestAnimationFrame(frame);
