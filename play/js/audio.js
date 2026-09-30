/* Ink Board: tiny procedural sounds. Wheels rolling, the clack of slab joints, pops, landings, grinds. */
"use strict";
let AC=null, OUT=null, LOOP=null;
function audioInit(){
  if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    OUT=AC.createGain(); OUT.gain.value=META.sound?1:0; OUT.connect(AC.destination); loopsInit(); }
  if(AC.state==='suspended') AC.resume();
}
function soundOn(on){ META.sound=on?1:0; saveMeta(); if(OUT) OUT.gain.setTargetAtTime(on?1:0,AC.currentTime,.02); }
function noiseBuf(d){ const n=Math.floor(AC.sampleRate*d),buf=AC.createBuffer(1,n,AC.sampleRate),a=buf.getChannelData(0); for(let i=0;i<n;i++) a[i]=Math.random()*2-1; return buf; }
function tone(f,d,type,v,f2,delay){ if(!AC) return; const t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g).connect(OUT); o.start(t); o.stop(t+d+.02); }
function noise(d,v,fc,q,type,delay){ if(!AC) return; const t=AC.currentTime+(delay||0),s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBuf(d); f.type=type||'bandpass'; f.frequency.value=fc; f.Q.value=q||1; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f).connect(g).connect(OUT); s.start(t); }
// three loops: wheels rolling, a finger scuffing the ground, trucks grinding a rail
function loopsInit(){
  const mk=(type,fc,q)=>{ const s=AC.createBufferSource(); s.buffer=noiseBuf(2); s.loop=true; const f=AC.createBiquadFilter(); f.type=type; f.frequency.value=fc; f.Q.value=q;
    const g=AC.createGain(); g.gain.value=0; s.connect(f).connect(g).connect(OUT); s.start(); return {f,g}; };
  LOOP={roll:mk('lowpass',400,1.2), push:mk('bandpass',520,1.4), grind:mk('bandpass',2600,3)};
}
function loopsSet(){
  if(!LOOP) return; const t=AC.currentTime, k=S.v/B.vmax, live=S.mode==='play';
  LOOP.roll.g.gain.setTargetAtTime(live&&S.st==='ground'?Math.min(.16,k*.2):0,t,.05);
  LOOP.roll.f.frequency.setTargetAtTime(250+k*900,t,.08);
  LOOP.push.g.gain.setTargetAtTime(live&&S.pushing?.12:0,t,.03);
  LOOP.grind.g.gain.setTargetAtTime(live&&S.st==='grind'?.1+k*.06:0,t,.03);
}
const buzz=ms=>{ try{ navigator.vibrate&&navigator.vibrate(ms); }catch(e){} };
function sfx(k,p=1){
  if(!AC) return;
  if(k==='clack'){ noise(.035,.18*p,1700,2); tone(150,.04,'square',.025*p); }
  else if(k==='pop'){ noise(.07,.55,2400,1.4); tone(230,.09,'triangle',.28,110); buzz(12); }
  else if(k==='flick'){ noise(.2,.12,1300,.7); }
  else if(k==='land'){ noise(.14,.5*p,380,.8); tone(95,.13,'sine',.35*p,50); buzz(18); }
  else if(k==='grind'){ noise(.12,.35,3200,2); tone(1400,.08,'square',.03,900); }
  else if(k==='bail'){ noise(.4,.55,300,.6); [0,.09,.2,.31].forEach((d,i)=>noise(.05,.25/(i+1),1500+i*300,2,'bandpass',d)); buzz([30,40,30]); }
  else if(k==='knock'){ noise(.08,.3,700,1.2); tone(120,.08,'triangle',.15,70); }
  else if(k==='bank'){ tone(660,.14,'sine',.12); tone(990,.22,'sine',.12,null,.09); }
  else if(k==='tick'){ tone(880,.05,'sine',.06); }
}
