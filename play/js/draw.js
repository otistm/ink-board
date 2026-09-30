/* Ink Board: drawing. The pavement, cones, twigs, rails and kickers are drawn in world units;
   the board is drawn last, still in the middle of the screen, as if it were lying on the phone. */
"use strict";
const INK='#000', PAPER='#fff', SHADE='rgba(0,0,0,.15)';
// a few flecks of grit on the grip tape, the same every time
const GRIT=(()=>{ const r=rng(77), a=[]; for(let i=0;i<90;i++) a.push([(r()*2-1)*12,(r()*2-1)*46]); return a; })();

function draw(){
  const {W,H,s}=V;
  ctx.setTransform(V.D,0,0,V.D,0,0);
  ctx.fillStyle=PAPER; ctx.fillRect(0,0,W,H);
  const sh=S.shake>0?S.shake*S.shake*9:0, ox=(Math.random()-.5)*sh, oy=(Math.random()-.5)*sh;
  ctx.save();
  ctx.translate(V.cx+ox,V.cy+oy); ctx.scale(s,s); ctx.rotate(-S.h); ctx.translate(-S.P.x,-S.P.y);
  ctx.lineCap='round'; ctx.lineJoin='round';
  const rad=Math.hypot(Math.max(V.cx,W-V.cx),Math.max(V.cy,H-V.cy))/s+12;
  const ks=[]; for(let k=Math.floor((S.P.y-rad)/CHUNK);k<=Math.floor((S.P.y+rad)/CHUNK);k++) ks.push(chunk(k));
  drawGround(ks,rad);
  drawMarks();
  ks.forEach(c=>c.obs.forEach(o=>drawShadow(o)));
  ks.forEach(c=>c.obs.forEach(o=>drawObs(o)));
  ctx.restore();
  drawBoard(ox,oy);
  drawSparks(); drawFingers();
}

/* ---------- the ground ---------- */
function drawGround(ks,rad){
  const y0=S.P.y-rad, y1=S.P.y+rad, xl=S.P.x-rad, xr=S.P.x+rad;
  // grass tufts beyond the kerb
  ctx.strokeStyle=INK; ctx.globalAlpha=.32; ctx.lineWidth=.5; ctx.beginPath();
  ks.forEach(c=>c.tufts.forEach(([x,y,z])=>{ if(x<xl||x>xr) return; ctx.moveTo(x-z,y+z*.7); ctx.lineTo(x,y-z*.6); ctx.lineTo(x+z,y+z*.7); }));
  ctx.stroke();
  // pavement grit
  ctx.globalAlpha=.3; ctx.fillStyle=INK;
  ks.forEach(c=>c.dots.forEach(([x,y,r])=>{ if(x>xl&&x<xr) ctx.fillRect(x-r/2,y-r/2,r,r); }));
  // slab joints
  ctx.globalAlpha=.32; ctx.lineWidth=.4; ctx.beginPath();
  for(let y=Math.ceil(y0/SLAB)*SLAB;y<=y1;y+=SLAB){ ctx.moveTo(-STREET,y); ctx.lineTo(STREET,y); }
  for(let x=-STREET+SLAB;x<STREET;x+=SLAB){ ctx.moveTo(x,y0); ctx.lineTo(x,y1); }
  ctx.stroke();
  // cracks
  ctx.globalAlpha=.5; ctx.lineWidth=.35; ctx.beginPath();
  ks.forEach(c=>c.cracks.forEach(pts=>{ pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); }));
  ctx.stroke();
  ctx.globalAlpha=1;
  // the kerb: a double line with stone joints
  ctx.lineWidth=.6; ctx.beginPath();
  [-1,1].forEach(sd=>{ ctx.moveTo(sd*STREET,y0); ctx.lineTo(sd*STREET,y1); ctx.moveTo(sd*(STREET+5),y0); ctx.lineTo(sd*(STREET+5),y1); });
  ctx.stroke();
  ctx.globalAlpha=.4; ctx.lineWidth=.4; ctx.beginPath();
  for(let y=Math.ceil(y0/12)*12;y<=y1;y+=12) [-1,1].forEach(sd=>{ ctx.moveTo(sd*STREET,y); ctx.lineTo(sd*(STREET+5),y); });
  ctx.stroke(); ctx.globalAlpha=1;
  // leaves and drain covers
  ks.forEach(c=>{
    c.leaves.forEach(([x,y,a,z])=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-z,0); ctx.quadraticCurveTo(0,-z*.7,z,0); ctx.quadraticCurveTo(0,z*.7,-z,0);
      ctx.fillStyle=PAPER; ctx.fill(); ctx.lineWidth=.35; ctx.strokeStyle=INK; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-z*1.3,0); ctx.lineTo(z*.8,0); ctx.stroke(); ctx.restore(); });
    if(c.hole){ const [x,y]=c.hole; ctx.save(); ctx.beginPath(); ctx.arc(x,y,16,0,TAU); ctx.fillStyle=PAPER; ctx.fill(); ctx.lineWidth=.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,13.5,0,TAU); ctx.lineWidth=.4; ctx.stroke(); ctx.clip();
      ctx.globalAlpha=.45; ctx.beginPath(); for(let i=-14;i<=14;i+=3.5){ ctx.moveTo(x+i,y-14); ctx.lineTo(x+i,y+14); ctx.moveTo(x-14,y+i); ctx.lineTo(x+14,y+i); } ctx.stroke(); ctx.restore(); }
  });
}
// finger scuffs on the ground: they roll away with the street and fade
function drawMarks(){
  ctx.strokeStyle=INK; ctx.lineWidth=2.4; ctx.lineCap='butt';
  S.marks.forEach(m=>{ const p=m.pts, a=1-(S.t-p[p.length-1].t); if(a<=0||p.length<2) return;
    ctx.globalAlpha=.12*a; ctx.beginPath(); p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)); ctx.stroke(); });
  ctx.globalAlpha=1; ctx.lineCap='round';
}

/* ---------- things on the street ---------- */
function drawShadow(o){
  ctx.fillStyle=SHADE; ctx.beginPath();
  if(o.t==='cone'&&!o.down) ctx.arc(o.x+3,o.y+3.5,6.5,0,TAU);
  else if(o.t==='rail') ctx.rect(o.x+2.5,o.y0+3,3.6,o.y1-o.y0);
  else if(o.t==='kick') ctx.rect(o.x-o.w/2+2,o.y-5,o.w,5.5);
  ctx.fill();
}
function drawObs(o){
  ctx.strokeStyle=INK; ctx.fillStyle=PAPER;
  if(o.t==='cone'){
    ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.rot);
    ctx.lineWidth=.7;
    if(o.down){ // knocked over: lying on its side
      ctx.beginPath(); ctx.moveTo(-4.8,0); ctx.lineTo(4.8,0); ctx.lineTo(1,-15); ctx.lineTo(-1,-15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3.2,-6.5); ctx.lineTo(3.2,-6.5); ctx.lineTo(2.4,-9.5); ctx.lineTo(-2.4,-9.5); ctx.closePath(); ctx.fillStyle=INK; ctx.fill();
      ctx.beginPath(); ctx.rect(-6,-.5,12,3.2); ctx.fillStyle=PAPER; ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.rect(-6,-6,12,12); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,4.8,0,TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,3.3,0,TAU); ctx.lineWidth=1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,1.3,0,TAU); ctx.fill(); ctx.lineWidth=.5; ctx.stroke();
    }
    ctx.restore();
  } else if(o.t==='stick'){
    ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.a); if(o.down) ctx.globalAlpha=.55;
    const path=()=>{ ctx.beginPath(); o.pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      const [bx,by]=o.pts[Math.round(o.twig[0]*6)]; ctx.moveTo(bx,by); ctx.lineTo(bx+4,by+o.twig[1]*5); };
    ctx.fillStyle=SHADE; ctx.strokeStyle=SHADE; ctx.lineWidth=2.8; ctx.translate(1.5,2); path(); ctx.stroke(); ctx.translate(-1.5,-2);
    ctx.strokeStyle=INK; ctx.lineWidth=2.6; path(); ctx.stroke();
    ctx.strokeStyle=PAPER; ctx.lineWidth=.5; ctx.beginPath(); o.pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y-.5):ctx.moveTo(x,y-.5)); ctx.stroke();
    ctx.restore();
  } else if(o.t==='rail'){
    const posts=[o.y0+5]; for(let y=o.y0+85;y<o.y1-40;y+=80) posts.push(y); posts.push(o.y1-5);
    ctx.fillStyle=INK; posts.forEach(y=>ctx.fillRect(o.x-3,y-3,6,6));
    ctx.beginPath(); ctx.rect(o.x-1.7,o.y0,3.4,o.y1-o.y0); ctx.fillStyle=PAPER; ctx.fill(); ctx.lineWidth=.7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.x-.4,o.y0+2); ctx.lineTo(o.x-.4,o.y1-2); ctx.lineWidth=.3; ctx.globalAlpha=.6; ctx.stroke(); ctx.globalAlpha=1;
  } else if(o.t==='kick'){
    const x0=o.x-o.w/2;
    ctx.beginPath(); ctx.rect(x0,o.y,o.w,o.l); ctx.fill(); ctx.lineWidth=.7; ctx.stroke();
    // hatching gets denser toward the lip, where the ramp is steepest
    ctx.beginPath(); ctx.lineWidth=.35;
    for(let i=1;i<12;i++){ const y=o.y+o.l*(1-Math.pow(i/12,.55)); ctx.moveTo(x0+1,y); ctx.lineTo(x0+o.w-1,y); }
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0,o.y); ctx.lineTo(x0+o.w,o.y); ctx.lineWidth=2.2; ctx.stroke();
    ctx.beginPath(); ctx.lineWidth=1.1;
    [o.y+o.l*.72,o.y+o.l*.9].forEach(y=>{ ctx.moveTo(o.x-5,y+3); ctx.lineTo(o.x,y-1); ctx.lineTo(o.x+5,y+3); });
    ctx.stroke();
  }
}

/* ---------- the board ---------- */
function deckPath(){ ctx.beginPath(); ctx.moveTo(-14,-36); ctx.arc(0,-36,14,Math.PI,0); ctx.lineTo(14,36); ctx.arc(0,36,14,0,Math.PI); ctx.closePath(); }
function drawBoard(ox,oy){
  const s=V.s; let x=V.cx+ox, y=V.cy+oy, rot=S.yaw+S.leanS*.1, alpha=1;
  if(S.st==='bail'){ const b=S.bail, k=Math.min(1,b.t/.35), e=1-Math.pow(1-k,3), back=b.t>.75?(b.t-.75)/.25:0;
    x+=b.dir*s*26*e*(1-back); y-=s*10*e*(1-back); rot+=b.dir*2.4*e*(1-back); alpha=1-.5*e*(1-back); }
  const sc=(1+.16*S.z)*(1-.05*S.squash), c=Math.cos(S.flip), across=Math.max(.09,Math.abs(c))*(1-.12*Math.abs(S.leanS));
  // the shadow drops away from the board as it rises
  const zo=S.z*s*5;
  ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x+zo*.7-S.leanS*s*.8,y+zo); ctx.scale(s,s); ctx.rotate(rot); ctx.scale(across*(1+.05*S.z),1);
  deckPath(); ctx.fillStyle=`rgba(0,0,0,${(.17-.05*Math.min(1,S.z)).toFixed(3)})`; ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x,y); ctx.scale(s*sc,s*sc); ctx.rotate(rot); ctx.scale(across,1);
  if(c>=0||Math.abs(c)<.09) gripSide(); else underside();
  ctx.restore();
  // a landing stamps little ink lines out from the trucks
  if(S.squash>.05&&!REDUCED){ const k=1-S.squash; ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.strokeStyle=INK; ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.globalAlpha=S.squash;
    ctx.beginPath(); [-1,1].forEach(sd=>[-1,1].forEach(e=>{ const bx=sd*(B.half+3+k*8)*s, by=e*B.truck*s; ctx.moveTo(bx,by); ctx.lineTo(bx+sd*(6+k*8),by+e*4); })); ctx.stroke(); ctx.restore(); }
}
function gripSide(){
  deckPath(); ctx.fillStyle=INK; ctx.fill();
  ctx.fillStyle=PAPER; ctx.globalAlpha*=.22; GRIT.forEach(([u,v])=>ctx.fillRect(u,v,.5,.5)); ctx.globalAlpha/=.22;
  // where the nose and tail kick up
  ctx.strokeStyle=PAPER; ctx.lineWidth=.45; ctx.globalAlpha*=.3; ctx.beginPath(); ctx.moveTo(-13,-37); ctx.lineTo(13,-37); ctx.moveTo(-13,37); ctx.lineTo(13,37); ctx.stroke(); ctx.globalAlpha/=.3;
  // a wavy cut in the grip near the nose, so you can tell which end is which
  ctx.lineWidth=.9; ctx.beginPath(); ctx.moveTo(-12,-43); ctx.bezierCurveTo(-5,-47,4,-39,12,-43); ctx.stroke();
  ctx.fillStyle=PAPER; [-1,1].forEach(e=>[[-3,-3],[3,-3],[-3,3],[3,3]].forEach(([a,b])=>{ ctx.beginPath(); ctx.arc(a,e*B.truck+b,.9,0,TAU); ctx.fill(); }));
}
function underside(){
  deckPath(); ctx.fillStyle=PAPER; ctx.fill(); ctx.lineWidth=1.3; ctx.strokeStyle=INK; ctx.stroke();
  ctx.save(); ctx.rotate(-Math.PI/2); ctx.fillStyle=INK; ctx.font='italic 900 19px Fraunces, Georgia, serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('ink',0,1); ctx.restore();
  [-1,1].forEach(e=>{ const T=e*B.truck; ctx.fillStyle=INK; ctx.fillRect(-5,T-4.5,10,9); ctx.fillRect(-12.5,T-1.6,25,3.2);
    ctx.fillStyle=PAPER; ctx.lineWidth=.7; [-1,1].forEach(sd=>{ ctx.beginPath(); ctx.rect(sd*11-2.5,T-3.2,5,6.4); ctx.fill(); ctx.stroke(); }); });
}

/* ---------- sparks and fingers (screen space) ---------- */
function drawSparks(){
  ctx.strokeStyle=INK; ctx.lineWidth=1.6; ctx.lineCap='round';
  S.sparks.forEach(p=>{ const k=p.t/.25, r=4+k*14; ctx.globalAlpha=1-k; ctx.beginPath();
    for(let i=0;i<4;i++){ const a=p.a+i*TAU/4; ctx.moveTo(p.x+Math.cos(a)*r*.4,p.y+Math.sin(a)*r*.4); ctx.lineTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r); } ctx.stroke(); });
  ctx.globalAlpha=1;
}
function drawFingers(){
  S.rings.forEach(r=>{ const k=r.t/.35; ctx.globalAlpha=1-k; ctx.beginPath(); ctx.arc(r.x,r.y,18+k*18,0,TAU); ctx.lineWidth=2.5; ctx.strokeStyle=r.on?PAPER:INK; ctx.stroke(); });
  ctx.globalAlpha=1;
  PT.forEach(p=>{ if(!p.on&&!p.g) return; ctx.beginPath(); ctx.arc(p.x,p.y,21,0,TAU);
    if(p.on&&boardHit(p.x,p.y)&&S.st!=='air'){ ctx.lineWidth=5.5; ctx.strokeStyle=INK; ctx.stroke(); ctx.lineWidth=3; ctx.strokeStyle=PAPER; ctx.stroke(); }
    else { ctx.lineWidth=2.5; ctx.strokeStyle=INK; ctx.globalAlpha=.55; ctx.stroke(); ctx.globalAlpha=1; } });
}
