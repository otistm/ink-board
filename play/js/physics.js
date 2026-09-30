/* Ink Board: how the board rolls, pops, flips, grinds and bails, and how tricks add up into combos. */
"use strict";
// a faster board flies further and stays up a little longer
const airTime=()=>.8+.25*S.v/B.vmax;

function newAir(o){ return Object.assign({t:0,T:.3,kick:false,pop:false,drop:false,fr:null,bk:null,fx:0,bx:0,
  flipN:0,flipDir:0,shove:0,shoveDir:0,yaw0:S.yaw,over:new Set(),z0:0},o); }

// the pop: the pointer finger slid up to the nose while the middle finger held the tail
function pop(fr,bk,kick){
  if(S.st==='grind') leaveGrind(false);
  S.st='air'; S.ramp=0; S.comboIdle=0;
  S.air=newAir({T:airTime()*(kick?1.45:1),kick:!!kick,pop:!kick,z0:kick?.35:0,
    fr:fr?fr.id:null,bk:bk?bk.id:null,fx:fr?fr.x:0,bx:bk?bk.x:0});
  sfx('pop'); trickLive();
}
function launch(){
  pop(null,null,true);
  // on a kicker the fingers already on the board can still flick a trick
  const on=onBoard(); if(on[0]) airAssign(on[0]); if(on[1]) airAssign(on[1]);
}
function airAssign(p){ const a=S.air; if(!a) return;
  if(a.fr===null){ a.fr=p.id; a.fx=p.x; } else if(a.bk===null&&p.id!==a.fr){ a.bk=p.id; a.bx=p.x; } }
// early in the air, a finger flicked off the side flips the board; the tail finger swiped sideways spins it
function airFinger(p){
  const a=S.air; if(!a||S.st!=='air'||a.drop||a.t/a.T>.5) return;
  if(p.id===a.fr){ const dx=(p.x-a.fx)/V.s, n=Math.abs(dx)>=38?2:Math.abs(dx)>=12?1:0;
    if(n>a.flipN&&(!a.flipDir||Math.sign(dx)===a.flipDir)){ if(!a.flipN) sfx('flick'); a.flipN=n; a.flipDir=Math.sign(dx); trickLive(); } }
  else if(p.id===a.bk){ const dx=(p.x-a.bx)/V.s, n=Math.abs(dx)>=34?360:Math.abs(dx)>=12?180:0;
    if(n>a.shove&&(!a.shoveDir||Math.sign(dx)===a.shoveDir)){ if(!a.shove) sfx('flick'); a.shove=n; a.shoveDir=Math.sign(dx); trickLive(); } }
}
// what the trick is called and what it's worth. A flick to the right is a kickflip, to the left a heelflip.
function trickOf(a){
  const f=a.flipN, s=a.shove, heel=a.flipDir<0; let n;
  if(f&&s) n=s===360?(heel?'Laser flip':'360 flip'):(heel?'Varial heelflip':'Varial kickflip');
  else if(f) n=heel?'Heelflip':'Kickflip';
  else if(s) n=s===360?'360 shove-it':'Pop shove-it';
  else n=a.kick?'Launch':'Ollie';
  if(f===2) n='Double '+n.charAt(0).toLowerCase()+n.slice(1);
  return {n, pts:(a.kick?150:100)+f*250+(s===360?350:s?150:0)+(f&&s?100:0), fancy:!!(f||s)};
}

function land(){
  const a=S.air; S.air=null; S.flip=0; S.z=0;
  S.yaw=wrap(a.yaw0+a.shove*Math.PI/180*a.shoveDir); if(Math.abs(S.yaw)<.01) S.yaw=0;
  const rail=a.drop?null:railUnder();
  if(!rail) for(const o of near(S.P.y)) if(o.t!=='kick'&&o!==S.ghost&&overlaps(o)){ bail('Bail!',o); return; }
  S.st='ground'; S.squash=1; sfx('land',.8+.4*Math.min(1,S.v/B.vmax));
  if(a.drop) return;
  const tr=trickOf(a), caught=tr.fancy&&(onBoard().length>0||!!a.keys);
  let pts=tr.pts*(caught?1.5:1)+a.over.size*75;
  addTrick(tr.n,pts,{caught,over:a.over.size});
  tutEvent('ollie'); if(tr.fancy) tutEvent('flip'); if(caught) tutEvent('catch');
  if(rail) startGrind(rail);
}

function railUnder(){ if(Math.abs(fwd(S.h).x)>.5) return null;
  for(const o of near(S.P.y)) if(o.t==='rail'&&Math.abs(S.P.x-o.x)<10&&S.P.y>o.y0+4&&S.P.y<o.y1-4) return o;
  return null; }
function startGrind(o){ S.st='grind'; S.grind={o,dir:fwd(S.h).y<0?-1:1,t:0}; S.v=Math.max(S.v,40); addTrick('50-50',100,{}); sfx('grind'); tutEvent('grind'); }
function leaveGrind(drop){
  const g=S.grind; if(!g) return; S.ghost=g.o; S.grind=null; S.h=g.dir<0?0:Math.PI;
  if(drop){ S.st='air'; S.air=newAir({T:.22,drop:true}); }
}

function bail(why,o){
  if(o){ if(o.t==='cone'||o.t==='stick'){ o.down=true; o.rot=(o.rot||0)+1; if(o.t==='stick'){ o.a+=.7; o.y-=4; } } else S.ghost=o; }
  S.st='bail'; S.air=null; S.grind=null; S.ramp=0; S.bail={t:0,dir:Math.random()<.5?-1:1,why,z:S.z};
  S.v*=.35; S.shake=REDUCED?0:1; sfx('bail');
  if(S.combo){ S.combo=null; }
  comboBail(why);
}
function bailEnd(){
  S.st='ground'; S.bail=null; S.yaw=0; S.flip=0; S.z=0; S.squash=1; S.v=0;
  // clear anything the board has come to rest on
  for(const o of near(S.P.y)){ if((o.t==='cone'||o.t==='stick')&&overlaps(o)) o.down=true; else if((o.t==='rail'&&overlaps(o))||(o.t==='kick'&&inKick(o,S.P.x,S.P.y))) S.ghost=o; }
}

/* ---------- combos ----------
   Tricks chain while you keep popping within a second of landing (or grinding).
   The combo is banked once you roll a second without a trick: its points times the number of tricks.
   Doing the same trick again in one combo is worth half each time. */
function addTrick(n,pts,info){
  if(!S.combo) S.combo={names:[],pts:0,count:{}};
  const c=S.combo, rep=c.count[n]||0; c.count[n]=rep+1; c.names.push(n); c.pts+=pts*Math.pow(.5,rep);
  S.comboIdle=0; S.tricks++; comboShow(info);
}
function comboName(c){ const n=c.names; return n.length>4?n.slice(0,2).join(' + ')+' + … + '+n[n.length-1]:n.join(' + '); }
function bank(){
  const c=S.combo; S.combo=null; const total=Math.round(c.pts*c.names.length);
  S.score+=total; if(total>S.bestCombo.pts) S.bestCombo={pts:total,name:comboName(c)};
  sfx('bank'); comboBanked(total);
}

/* ---------- each frame ---------- */
function move(dt){ const f=fwd(S.h); S.P.x+=f.x*S.v*dt; S.P.y+=f.y*S.v*dt; kerb(); }
// the kerb bounces the board back onto the pavement
function kerb(){ const lim=STREET-B.half-2; if(Math.abs(S.P.x)<=lim) return;
  const sd=Math.sign(S.P.x); S.P.x=sd*lim;
  if(fwd(S.h).x*sd>0){ S.h=-S.h; if(S.st==='ground'){ S.v*=.8; sfx('knock'); S.shake=Math.max(S.shake,REDUCED?0:.3); } } }

function step(dt){
  if(S.ghost&&!(S.ghost.t==='kick'?inKick(S.ghost,S.P.x,S.P.y):overlaps(S.ghost))) S.ghost=null;
  S.leanS+=((S.st==='ground'?S.leanIn:0)-S.leanS)*Math.min(1,10*dt);
  S.squash=Math.max(0,S.squash-dt*4); S.shake=Math.max(0,S.shake-dt*2.5);
  if(S.st==='ground'){
    const w=S.leanS*1.7*clamp(S.v/35,0,1); S.h=wrap(S.h+w*dt); S.turned+=Math.abs(w*dt);
    S.v=Math.max(0,S.v-(4+S.v*.035)*dt);
    move(dt); rolling(); clacks();
    if(S.st==='ground'&&S.combo){ S.comboIdle+=dt; if(S.comboIdle>1) bank(); }
  } else if(S.st==='air'){
    const a=S.air; a.t+=dt; const p=Math.min(1,a.t/a.T);
    S.z=a.drop?0.12*(1-p):a.z0*(1-p)+4*p*(1-p)*(a.kick?1.35:1);
    move(dt);
    // the flip and the spin finish just before the board comes down
    const rem=Math.max(.001,a.T*.9-a.t), ft=a.flipN*TAU*a.flipDir, yt=a.yaw0+a.shove*Math.PI/180*a.shoveDir;
    S.flip+=(ft-S.flip)*Math.min(1,dt/rem); S.yaw+=(yt-S.yaw)*Math.min(1,dt/rem);
    if(!a.drop) for(const o of near(S.P.y)) if(o.t!=='kick'&&!o.down&&overlaps(o)) a.over.add(o);
    if(a.t>=a.T) land();
  } else if(S.st==='grind'){
    const g=S.grind, o=g.o, th=g.dir<0?0:Math.PI;
    S.h=wrap(S.h+wrap(th-S.h)*Math.min(1,12*dt)); S.P.x+=(o.x-S.P.x)*Math.min(1,14*dt);
    S.v=Math.max(35,S.v-10*dt); S.P.y+=g.dir*S.v*dt; g.t+=dt; S.z=.14;
    if(S.combo){ S.combo.pts+=150*dt; S.comboIdle=0; comboTick(); }
    if(Math.random()<dt*30) spark();
    if(S.P.y<o.y0||S.P.y>o.y1) leaveGrind(true);
  } else if(S.st==='bail'){
    const b=S.bail; b.t+=dt; S.v=Math.max(0,S.v-140*dt); move(dt); S.z=b.z*Math.max(0,1-b.t*4);
    if(b.t>1) bailEnd();
  }
}

function rolling(){
  for(const o of near(S.P.y)){
    if(o===S.ghost) continue;
    if(o.t==='kick'){
      if(!inKick(o,S.P.x,S.P.y)) continue;
      if(fwd(S.h).y<-.55){ S.ramp=clamp((o.y+o.l-S.P.y)/o.l,0,1); S.z=.35*S.ramp; if(S.P.y<=o.y+1.5) launch(); }
      else bail('Wrong way up the kicker',o);
      return;
    }
    if(overlaps(o)){ bail(o.t==='rail'?'Clipped the rail':'Bail!',o); return; }
  }
  S.ramp=0; S.z=0;
}

// the wheels clack over each joint between pavement slabs
function clacks(){
  const f=fwd(S.h), cell=d=>{ const x=S.P.x+f.x*d, y=S.P.y+f.y*d; return Math.floor(x/SLAB)+','+Math.floor(y/SLAB); };
  const a=cell(B.truck), b=cell(-B.truck), k=.6+.6*S.v/B.vmax;
  if(S.v>4){ if(S.cellF&&a!==S.cellF) sfx('clack',k); if(S.cellB&&b!==S.cellB) setTimeout(()=>sfx('clack',k*.9),0); }
  S.cellF=a; S.cellB=b;
}
function spark(){ const sd=Math.random()<.5?-1:1; S.sparks.push({x:V.cx+(Math.random()-.5)*B.wid*V.s*.4, y:V.cy+sd*B.truck*V.s, a:Math.random()*TAU, t:0}); }
