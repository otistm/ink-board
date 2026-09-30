/* Ink Board: shared helpers, sizes, saved progress and the game state. */
"use strict";
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const wrap=a=>{ a%=TAU; return a>Math.PI?a-TAU:a<-Math.PI?a+TAU:a; };
const fmtN=n=>Math.round(n).toLocaleString('en-US');
// a small seeded random number generator, so a chunk of street always comes out the same
function rng(seed){ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return (s>>>0)/4294967296; }; }
function hash(a,b){ let h=(a|0)*374761393+(b|0)*668265263; h=(h^(h>>>13))*1274126177; return (h^(h>>>16))>>>0; }

/* ---------- sizes ----------
   The world is measured in board units: the deck is 100 long and 28 wide, like a fingerboard.
   Everything else (cones, twigs, rails, pavement slabs) is at fingerboard scale too. */
const B={len:100, wid:28, truck:28, half:14, vmax:140};
const CRUISE=95;     // how fast the board rolls by itself with two fingers on it (a push can go faster, up to B.vmax)
const STREET=100;   // the pavement runs from -100 to 100 across; a kerb and grass lie beyond
const SLAB=50;      // pavement slab size
const CHUNK=300;    // the street is made in chunks this long

/* ---------- saved progress (never wipe these) ---------- */
const store={
  get(k,d){ try{ const v=JSON.parse(localStorage.getItem(k)); return v&&typeof v==='object'?v:d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
};
const META=Object.assign({v:1,tut:0,sound:1}, store.get('inkboard-meta',{}));
const BEST=Object.assign({v:1,score:0,combo:0,comboName:'',runs:0}, store.get('inkboard-best',{}));
const saveMeta=()=>store.set('inkboard-meta',META);
const saveBest=()=>store.set('inkboard-best',BEST);

/* ---------- screen ----------
   The board sits still on the screen, nose up, as if it were resting on the phone.
   The ground slides and turns underneath it. */
const V={W:0,H:0,D:1,s:3.4,cx:0,cy:0};
const cv=document.getElementById('c'), ctx=cv.getContext('2d');
function resize(){
  V.D=Math.min(2,devicePixelRatio||1); V.W=innerWidth; V.H=innerHeight;
  cv.width=Math.round(V.W*V.D); cv.height=Math.round(V.H*V.D);
  const L=Math.min(V.H*.4, V.W*1.15);
  V.s=L/B.len; V.cx=V.W/2; V.cy=V.H*.66;
}
addEventListener('resize',resize); resize();
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- game state ---------- */
const S={
  mode:'home',                 // home | play | pause | done
  P:{x:0,y:0}, h:0, v:0,       // where the board is, which way it's rolling (0 = up the street), speed in units a second
  st:'ground',                 // ground | air | grind | bail
  air:null, grind:null, bail:null, ghost:null, ramp:0,
  yaw:0,                       // the deck's spin relative to the way it's rolling (0 or half a turn after a shove-it)
  flip:0, z:0, squash:0,
  leanIn:0, leanS:0,
  score:0, time:SESSION, live:false, over:false,
  combo:null, comboIdle:0, tricks:0, bestCombo:{pts:0,name:''},
  shake:0, marks:[], sparks:[], rings:[], t:0,
  tut:-1, tutFlags:{}, turned:0, pushing:false, grinding:false,
  cellF:'', cellB:''
};
const fwd=h=>({x:Math.sin(h),y:-Math.cos(h)});
const rgt=h=>({x:Math.cos(h),y:Math.sin(h)});
// screen position -> world position (the ground under a finger)
function toWorld(sx,sy){ const x=(sx-V.cx)/V.s, y=(sy-V.cy)/V.s, c=Math.cos(S.h), s=Math.sin(S.h);
  return {x:S.P.x+x*c-y*s, y:S.P.y+x*s+y*c}; }
// screen position -> board coordinates: u runs up the board (nose is +50), v across (right is +)
function toBoard(sx,sy){ return {u:(V.cy-sy)/V.s, v:(sx-V.cx)/V.s}; }
