/* Ink Board: two fingers on the glass.
   A finger that lands on the board holds it (that's your pointer finger, or both fingers for tricks).
   A finger that lands on the ground beside it is a foot: swipe it down to push, hold it still to brake.
   Pop: with a finger on the tail, slide the front finger up to the nose, fast.
   Then, early in the air: flick the front finger off the side to flip, swipe the tail finger sideways to spin. */
"use strict";
const PT=new Map();
const KEY={l:0,r:0,brake:0};
// the fingers holding the board, front (nearest the top of the screen) first
function onBoard(){ return [...PT.values()].filter(p=>p.on).sort((a,b)=>a.y-b.y); }
function boardHit(x,y){ const b=toBoard(x,y), sc=1+.16*S.z, pad=26/V.s;
  return Math.abs(b.u)<=B.len/2*sc+pad && Math.abs(b.v)<=B.half*sc+pad; }
const mouseDown=()=>[...PT.values()].some(p=>p.type==='mouse');

cv.addEventListener('pointerdown',e=>{
  if(S.mode!=='play') return;
  e.preventDefault(); audioInit();
  const now=performance.now(), on=boardHit(e.clientX,e.clientY);
  const p={id:e.pointerId,type:e.pointerType,x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t0:now,lt:now,on,g:!on,vy:0,still:0,hist:[],mark:null};
  p.hist.push({t:now,u:toBoard(p.x,p.y).u});
  PT.set(p.id,p);
  try{ cv.setPointerCapture(p.id); }catch(_){}
  S.rings.push({x:p.x,y:p.y,t:0,on});
  if(on){ tutEvent('touch'); if(S.st==='air') airAssign(p); }
},{passive:false});

cv.addEventListener('pointermove',e=>{
  const p=PT.get(e.pointerId); if(!p) return;
  const now=performance.now(), dt=Math.max(4,now-p.lt)/1000;
  p.vy=lerp(p.vy,(e.clientY-p.y)/dt,.55); p.x=e.clientX; p.y=e.clientY; p.lt=now;
  if(p.on){
    if(!boardHit(p.x,p.y)) p.on=false;
    else { p.hist.push({t:now,u:toBoard(p.x,p.y).u}); while(p.hist.length&&now-p.hist[0].t>300) p.hist.shift(); tryPop(p,now); }
  }
  if(S.st==='air') airFinger(p);
});
function lift(e){ const p=PT.get(e.pointerId); if(!p) return;
  if(S.st==='air') airFinger(p);
  PT.delete(e.pointerId); }
cv.addEventListener('pointerup',lift); cv.addEventListener('pointercancel',lift);
cv.addEventListener('contextmenu',e=>e.preventDefault());

// the ollie: the front finger slides at least a fifth of the board toward the nose within a quarter second,
// while another finger holds the tail behind it
function tryPop(p,now){
  if(S.mode!=='play'||!(S.st==='ground'||S.st==='grind')) return;
  const on=onBoard(); if(on[0]!==p) return;
  const bk=on[1]||null; if(!bk&&p.type!=='mouse') return;
  let umin=Infinity; for(const h of p.hist) if(now-h.t<=240) umin=Math.min(umin,h.u);
  const u=toBoard(p.x,p.y).u; if(u-umin<20) return;
  if(bk&&toBoard(bk.x,bk.y).u>umin-6) return;
  pop(p,bk,false);
}

// every frame: steering from the board fingers, pushing and braking from the ground finger
function inputFrame(dt){
  const now=performance.now(), on=onBoard(), hold=on.length>0||mouseDown();
  let lean=0;
  for(const p of on){ const dx=p.x-p.x0, d=Math.sign(dx)*Math.max(0,Math.abs(dx)-6); lean+=clamp(d/36,-1,1); }
  if(on.length) lean/=on.length;
  S.leanIn=clamp(lean+KEY.r-KEY.l,-1,1);
  S.pushing=false;
  for(const g of PT.values()){
    if(!g.g) continue;
    if(now-g.lt>60) g.vy=0;
    g.still=Math.abs(g.vy)<70?g.still+dt:0;
    // the ground under a finger leaves a faint scuff that rolls away with the street
    const w=toWorld(g.x,g.y);
    if(!g.mark){ g.mark={pts:[]}; S.marks.push(g.mark); }
    const m=g.mark.pts, l=m[m.length-1]; if(!l||Math.hypot(w.x-l.x,w.y-l.y)>.8){ m.push({x:w.x,y:w.y,t:S.t}); if(m.length>80) m.shift(); }
    if(S.st!=='ground') continue;
    const fv=g.vy/V.s;
    if(fv>S.v+5&&fv>30){
      if(!hold){ holdWarn(); continue; }
      const tgt=Math.min(B.vmax,fv*.62);
      if(tgt>S.v){ S.v+=(tgt-S.v)*Math.min(1,4*dt); S.pushing=true; }
    } else if(g.still>.3&&S.v>1) S.v=Math.max(0,S.v-90*dt);
  }
  for(const g of PT.values()) if(!g.g) g.mark=null;
  // two fingers on the board: it rolls forward by itself, easing up to a steady cruise
  if(S.st==='ground'&&(on.length>=2||on.some(p=>p.type==='mouse'))&&S.v<CRUISE) S.v=Math.min(CRUISE,S.v+(12+(CRUISE-S.v)*.9)*dt);
  if(KEY.brake&&S.st==='ground') S.v=Math.max(0,S.v-90*dt);
  if(S.v>45) tutEvent('roll');
  if(S.turned>.6) tutEvent('steer');
}
// forget fingers that ended up as marks on the ground
function marksAge(){ S.marks=S.marks.filter(m=>m.pts.length&&S.t-m.pts[m.pts.length-1].t<1.1); }

/* ---------- keys, for playing on a computer ----------
   Up pushes, down brakes, left and right steer. Space ollies, X kickflips, Z heelflips, C shove-its (hold Shift for doubles). */
addEventListener('keydown',e=>{
  if(S.mode!=='play') return;
  const k=e.key.toLowerCase();
  if(k==='escape'||k==='p'){ pauseGame(); return; }
  audioInit();
  if(k==='arrowleft'||k==='a') KEY.l=1;
  else if(k==='arrowright'||k==='d') KEY.r=1;
  else if(k==='arrowdown'||k==='s') KEY.brake=1;
  else if((k==='arrowup'||k==='w')&&!e.repeat&&S.st==='ground'){ S.v=Math.min(B.vmax,S.v+40); tutEvent('touch'); }
  else if([' ','x','z','c'].includes(k)&&!e.repeat&&(S.st==='ground'||S.st==='grind')){
    pop(null,null,false); const a=S.air; a.keys=true;
    if(k==='x'||k==='z'){ a.flipN=e.shiftKey?2:1; a.flipDir=k==='x'?1:-1; }
    if(k==='c'){ a.shove=e.shiftKey?360:180; a.shoveDir=1; }
    trickLive();
  } else return;
  e.preventDefault();
});
addEventListener('keyup',e=>{ const k=e.key.toLowerCase();
  if(k==='arrowleft'||k==='a') KEY.l=0; else if(k==='arrowright'||k==='d') KEY.r=0; else if(k==='arrowdown'||k==='s') KEY.brake=0; });
