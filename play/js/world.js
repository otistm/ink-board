/* Ink Board: the street. It's made in chunks as you roll, with cones, twigs, rails and kickers. */
"use strict";
const CH=new Map(); let RUNSEED=1;
// how hard the street is: it gets busier through the session
const diff=()=>S.live?clamp((SESSION-S.time)/60,0,1):0;

function chunk(k){ let c=CH.get(k); if(!c){ c=makeChunk(k); CH.set(k,c); } return c; }
function resetWorld(){ CH.clear(); RUNSEED=(Math.random()*1e9)|0; }

function makeChunk(k){
  const r=rng(hash(k,RUNSEED)), y0=k*CHUNK, c={k,y0,obs:[],cracks:[],dots:[],leaves:[],tufts:[],hole:null};
  // pavement grit, cracks, a few leaves, the odd drain cover, and grass tufts beyond the kerb
  for(let i=0;i<70;i++) c.dots.push([(r()*2-1)*STREET, y0+r()*CHUNK, .25+r()*.55]);
  const nc=r()<.6?1+(r()*2|0):0;
  for(let i=0;i<nc;i++){ let x=(r()*2-1)*(STREET-20), y=y0+r()*CHUNK, a=r()*TAU; const pts=[[x,y]];
    for(let j=0;j<3+(r()*4|0);j++){ a+=(r()-.5)*1.4; const l=5+r()*9; x+=Math.cos(a)*l; y+=Math.sin(a)*l; pts.push([x,y]); } c.cracks.push(pts); }
  for(let i=0;i<(r()*3|0);i++) c.leaves.push([(r()*2-1)*(STREET-8), y0+r()*CHUNK, r()*TAU, 3+r()*2]);
  if(r()<.14) c.hole=[(r()*2-1)*55, y0+40+r()*(CHUNK-80)];
  for(let i=0;i<34;i++){ const sd=r()<.5?-1:1; c.tufts.push([sd*(STREET+9+r()*140), y0+r()*CHUNK, 1.6+r()*1.4]); }
  // obstacles only once the session is running, and never right where the board is
  if(S.live && Math.abs(S.P.y-(y0+CHUNK/2))>CHUNK/2+150) features(c,r);
  return c;
}

function features(c,r){
  const d=diff(), y0=c.y0, pick=()=>{ const w=[['cone',30],['stick',24],['rail',22+10*d],['kick',14],['none',16-8*d]];
    let t=r()*w.reduce((a,b)=>a+b[1],0); for(const [n,x] of w){ t-=x; if(t<=0) return n; } return 'none'; };
  const a=pick(), two=a!=='rail'&&r()<.2+.4*d;
  const kinds=two?[a,pick()]:[a];
  kinds.forEach((kind,i)=>{
    const lo=y0+(two?i*150:0)+25, span=(two?150:CHUNK)-50, yy=lo+r()*span;
    if(kind==='cone'){ const n=1+(r()*(1.4+1.8*d)|0), x0=(r()*2-1)*60, gap=16+r()*14;
      for(let j=0;j<n;j++) c.obs.push({t:'cone',x:clamp(x0+(j-(n-1)/2)*gap,-80,80),y:yy+(r()-.5)*6,r:5,down:false,rot:r()*TAU}); }
    else if(kind==='stick'){ const len=26+r()*26, pts=[]; let x=-len/2, y=0;
      for(let j=0;j<=6;j++){ pts.push([x,y]); x+=len/6; y+=(r()-.5)*2.2; }
      c.obs.push({t:'stick',x:(r()*2-1)*60,y:yy,a:(r()-.5)*.7,len,pts,twig:[.3+r()*.4,r()<.5?-1:1],down:false}); }
    else if(kind==='rail'){ if(two) return; const len=150+r()*110, ys=y0+25+r()*(CHUNK-50-len);
      c.obs.push({t:'rail',x:(r()*2-1)*55,y0:ys,y1:ys+len}); }
    else if(kind==='kick'){ const x=(r()*2-1)*55, lip=yy-10;
      c.obs.push({t:'kick',x,y:lip,w:38,l:34});
      if(!two&&r()<.55) c.obs.push({t:'cone',x:x+(r()-.5)*10,y:lip-60-r()*30,r:5,down:false,rot:r()*TAU}); }
  });
}

// every obstacle near a point along the street
function near(y){ const k=Math.floor(y/CHUNK), out=[]; for(let i=k-1;i<=k+1;i++) for(const o of chunk(i).obs) out.push(o); return out; }

/* ---------- touching things ----------
   The board's hit box runs between its trucks (the wheels are what catch on things). */
const BOX={u:32,v:13};
function local(px,py){ const f=fwd(S.h), r=rgt(S.h), dx=px-S.P.x, dy=py-S.P.y; return {u:dx*f.x+dy*f.y, v:dx*r.x+dy*r.y}; }
function inBox(px,py,pad){ const l=local(px,py); return Math.abs(l.u)<BOX.u+pad && Math.abs(l.v)<BOX.v+pad; }
function overlaps(o){
  if(o.t==='cone') return !o.down && inBox(o.x,o.y,o.r*.8);
  if(o.t==='stick'){ if(o.down) return false; const c=Math.cos(o.a), s=Math.sin(o.a);
    for(let i=0;i<=8;i++){ const x=(i/8-.5)*o.len; if(inBox(o.x+x*c,o.y+x*s,1.2)) return true; } return false; }
  if(o.t==='rail'){ const a=Math.max(o.y0,S.P.y-60), b=Math.min(o.y1,S.P.y+60);
    for(let y=a;y<=b;y+=2) if(inBox(o.x,y,1.2)) return true; return false; }
  return false;
}
const inKick=(k,x,y)=>Math.abs(x-k.x)<k.w/2 && y>=k.y && y<=k.y+k.l;
