'use strict';
/* =====================================================================
   CATBOT · audio.js: the sound layer (plumbing + placeholder sounds).
   Built with Claude Sonnet 5.5 (claude-sonnet-5-5) in Claude Code.

   Jam rule still holds: audio is OUTPUT only. Nothing here reads or adds
   an input; mute/unmute is the trolley's SOUND floor button (settings.sound).

   The idea: sound is a second consumer of things the game already does.
     one-shots   sfx(name,{mag,x,rate,delay})   called where the thing happens
                 (handleRigEvents for rig events; one line at each mechanic's
                 call site in index.html)
     loops       AUDIO.start(name,params) / AUDIO.stop(name)   for *states*
                 (push strain, ice, the ambient tick); start() is idempotent
                 and doubles as "set params", so the game just calls it per frame
     music       AUDIO.music.setLayers(n)   stub, does nothing yet

   All synthesized (oscillators, filtered noise, envelopes): no audio files,
   no libraries, no build step, so no asset-rights question.
   Everything is wrapped: if Web Audio is missing or anything throws, every
   call becomes a silent no-op and the game runs exactly as it did before.
   ===================================================================== */
window.AUDIO=(()=>{
  const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, rnd=(a,b)=>a+Math.random()*(b-a);
  const MASTER=.35;             // low default master level; the compressor below catches what's left
  const MAXV=28;                // live-voice cap: a second safety net behind the per-name rate limit
  let ac=null, dead=false, enabled=true, forced=false, wantRun=false, hiddenSusp=false, limiting=true, warned=false;
  let master=null, comp=null, meter=null, sfxBus=null, ambBus=null, noise=null, duckG=null, lp=null;
  let wantMuffle=20000, wantDuck=1;     // scene-level mix state; remembered so it applies even if the context is built a moment later
  const loops={}, last={}, log=[];
  /* live voices = scheduled end times still ahead of the audio clock. Counted by time, not by 'ended' events, so a
     suspended context (hidden tab: the clock freezes with its sources unfinished) can't leave the count stuck high. */
  const ends=[];
  function voices(){const n=ac?ac.currentTime:0;for(let i=ends.length-1;i>=0;i--)if(ends[i]<=n)ends.splice(i,1);return ends.length;}
  const warn=e=>{if(!warned){warned=true;console.warn('[audio] a call failed and was skipped:',e);}};

  /* ===================================================================
     1. CONTEXT LIFECYCLE
     What: the AudioContext is created lazily, on the first user gesture, and
     resumed there. Why: browsers refuse to start audio before a gesture, and
     creating the context early only earns a console warning. The game also
     calls unlock() at the wake latch (the first walk input); the listeners
     below cover touch, where pointerdown does NOT count as activation but
     pointerup/touchend does, so they stay attached until audio is running.
     Hidden tab: suspend (and resume only if we were the ones who suspended).
     =================================================================== */
  const GESTURES=['keydown','pointerdown','pointerup','touchend'];
  function dropGestureListeners(){for(const g of GESTURES)removeEventListener(g,onGesture,true);}
  function onGesture(){unlock();if(ac&&ac.state==='running')dropGestureListeners();}
  function unlock(){
    if(dead)return;
    try{
      if(!ac){
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC){dead=true;return;}
        // wait for a real gesture before creating it (a touch's pointerdown isn't one; its pointerup is)
        if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return;
        build(new AC());
        ac.addEventListener('statechange',()=>{if(ac.state==='running')dropGestureListeners();});
      }
      wantRun=true;
      if(ac.state!=='running'&&!document.hidden)ac.resume().catch(()=>{});
      else if(ac.state==='running')dropGestureListeners();
    }catch(e){dead=true;warn(e);}
  }
  for(const g of GESTURES)addEventListener(g,onGesture,true);
  document.addEventListener('visibilitychange',()=>{
    if(!ac)return;
    try{
      if(document.hidden){if(ac.state==='running'){hiddenSusp=true;ac.suspend().catch(()=>{});}}
      else if(hiddenSusp){hiddenSusp=false;ac.resume().catch(()=>{});}
    }catch(e){warn(e);}
  });

  /* ===================================================================
     2. SIGNAL CHAIN
     What: voices -> sfxBus / ambBus -> master (low) -> compressor -> out.
     Why: the compressor is the soft limiter, so a landing on top of a thud on
     top of a clang can't clip; master is low by default and ramps to 0 when
     muted; the ambient has its own bus so it can be treated separately from
     the one-shots. The analyser is a read-only tap for AUDIO.peak().
     =================================================================== */
  function build(ctx){
    ac=ctx;
    master=ac.createGain();master.gain.value=enabled?MASTER:0;
    comp=ac.createDynamicsCompressor();
    comp.threshold.value=-16;comp.knee.value=10;comp.ratio.value=14;comp.attack.value=.002;comp.release.value=.18;
    meter=ac.createAnalyser();meter.fftSize=2048;
    sfxBus=ac.createGain();ambBus=ac.createGain();ambBus.gain.value=.55;
    duckG=ac.createGain();duckG.gain.value=wantDuck;                            // scene-level level (duck) and low-pass (muffle): see below
    lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=wantMuffle;lp.Q.value=.5;
    sfxBus.connect(duckG);ambBus.connect(duckG);duckG.connect(lp);lp.connect(master);master.connect(comp);comp.connect(ac.destination);comp.connect(meter);
    noise=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);          // 1 s of white noise, shared by every hiss and rasp
    const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }
  /* Scene-level mix controls, used by the opening and available to anything later:
       muffle(hz,secs)   a low-pass over the whole mix: heard through a hull, a focus pull, a dull world after a blast
       duck(level,secs)  scales the whole mix; duck(0) is true silence
       stopAll(secs)     ends every loop and fades the mix out, then restores it: used when the opening is skipped
                         so nothing carries on over the next scene
     active()          true only if sound can actually be heard from here: not muted in-game, context running, not
                         failed. The web gives a page no way to see a muted tab or a muted system volume, so this is
                         as far as detection goes (the cover page's Sound toggle covers the rest).                  */
  function muffle(hz,secs){
    wantMuffle=hz;note({name:'~muffle',hz,secs});if(!ac)return;
    try{const t=ac.currentTime;lp.frequency.cancelScheduledValues(t);lp.frequency.setTargetAtTime(hz,t,Math.max(.004,(secs||.1)/3));}catch(e){warn(e);}
  }
  function duck(level,secs){
    wantDuck=level;note({name:'~duck',level,secs});if(!ac)return;
    try{const t=ac.currentTime;duckG.gain.cancelScheduledValues(t);duckG.gain.setTargetAtTime(level,t,Math.max(.004,(secs||.1)/3));}catch(e){warn(e);}
  }
  function stopAll(secs){
    secs=secs||.25;wantDuck=1;wantMuffle=20000;note({name:'~stopAll',secs});
    for(const n of Object.keys(loops))stop(n);
    if(!ac)return;
    try{
      const t=ac.currentTime;
      duckG.gain.cancelScheduledValues(t);duckG.gain.setTargetAtTime(0,t,secs/3);duckG.gain.setValueAtTime(1,t+secs+.5);
      lp.frequency.cancelScheduledValues(t);lp.frequency.setValueAtTime(20000,t+secs);
    }catch(e){warn(e);}
  }
  const active=()=>!dead&&enabled&&!!ac&&ac.state==='running';

  /* master follows settings.sound. Muting stops the loops; the ambient and
     one-shots simply stop being scheduled (sfx() and frame() return early). */
  function enable(on){
    enabled=!!on;
    if(!ac)return;
    try{
      const t=ac.currentTime;master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(enabled?MASTER:0,t,.03);
      if(!enabled)for(const n of Object.keys(loops))stop(n);
      else if(wantRun&&ac.state==='suspended'&&!document.hidden)ac.resume().catch(()=>{});
    }catch(e){warn(e);}
  }

  /* ===================================================================
     3. VOICE PRIMITIVES
     What: tone() = an oscillator with a pitch sweep and an exponential decay;
     burst() = a filtered noise burst. Every sound is built from these two.
     Why: two helpers keep each placeholder sound to a few readable lines, and
     the retuning you'll want later is just numbers. Each voice records its
     scheduled end in `ends` so the voice cap can see how many are live.
     =================================================================== */
  const running=()=>!!ac&&(ac.state==='running'||forced);
  /* Voices decay exponentially to a floor over their length, so by default they fall ~80 dB and the last stretch is
     silence. `end` (a fraction of vol, e.g. .04) raises that floor so a heavy thud can keep ringing for its whole length. */
  const endLevel=p=>p.end?Math.max(.0001,p.vol*p.end):.0001;
  function out(pan,bus){          // optional stereo pan (skipped where StereoPannerNode doesn't exist)
    if(pan&&ac.createStereoPanner){const p=ac.createStereoPanner();p.pan.value=pan;p.connect(bus);return p;}
    return bus;
  }
  function tone(t,p,to){
    const o=ac.createOscillator(),g=ac.createGain(),f0=p.f0,f1=p.f1??p.f0,dur=p.dur,a=p.a??.002;
    o.type=p.type||'sine';o.frequency.setValueAtTime(f0,t);
    if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(p.vol,t+a);g.gain.exponentialRampToValueAtTime(endLevel(p),t+dur);
    if(p.end)g.gain.linearRampToValueAtTime(0,t+dur+.015);              // a tone that ends above silence fades out cleanly instead of clicking
    o.connect(g);g.connect(to);o.start(t);o.stop(t+dur+.02);ends.push(t+dur+.03);
  }
  function burst(t,p,to){
    const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain(),dur=p.dur,a=p.a??.002,f0=p.f0,f1=p.f1??p.f0;
    s.buffer=noise;s.loop=true;f.type=p.type||'bandpass';f.Q.value=p.q??1;f.frequency.setValueAtTime(f0,t);
    if(f1!==f0)f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(p.vol,t+a);g.gain.exponentialRampToValueAtTime(endLevel(p),t+dur);
    if(p.end)g.gain.linearRampToValueAtTime(0,t+dur+.015);
    s.connect(f);f.connect(g);g.connect(to);s.start(t,rnd(0,.5));s.stop(t+dur+.02);ends.push(t+dur+.03);
  }
  const voice=(t,to)=>({tone:(dt,p)=>tone(t+dt,p,to),burst:(dt,p)=>burst(t+dt,p,to)});

  /* ===================================================================
     4. PLACEHOLDER SOUNDS (the table)
     What: name -> {ref, gap, fn}. ref = the raw mag that counts as "full
     level" (so call sites pass e.mag untouched); gap = rate limit in ms;
     fn(v, L, r) builds the voice at the scheduled time: L = level 0..1.3
     from mag/ref, r = pitch multiplier (the caller's `rate` with a few %
     of random wobble so repeats don't machine-gun).
     Why: these are deliberately ugly stand-ins. Every number you'll want to
     retune is in here, and nothing else needs to change when you do.
     =================================================================== */
  const SOUNDS={
    /* ---- rig events (catbot.js emits these; handleRigEvents forwards them) ---- */
    land:{ref:420,gap:90,fn(v,L,r){          // heavy: low and short, a metallic clang on top (two inharmonic partials)
      const k=Math.pow(L,.8);
      v.tone(0,{f0:120*r,f1:42*r,dur:.14+.12*k,vol:.7*k});
      v.burst(0,{type:'lowpass',f0:500,dur:.12,vol:.3*k});
      v.tone(0,{f0:840*r,f1:790*r,type:'triangle',dur:.1+.2*k,vol:.1*k});
      v.tone(0,{f0:1330*r,f1:1290*r,type:'triangle',dur:.08+.14*k,vol:.07*k});
      v.burst(0,{type:'bandpass',f0:3200,q:2,dur:.04,vol:.16*k});
    }},
    thud:{ref:260,gap:140,fn(v,L,r){         // the hull hitting the deck: lower and duller than a landing
      const k=Math.pow(L,.8);
      v.tone(0,{f0:80*r,f1:34*r,dur:.2+.1*k,vol:.7*k});
      v.burst(0,{type:'lowpass',f0:280,dur:.16,vol:.32*k});
      v.tone(0,{f0:610*r,f1:580*r,type:'triangle',dur:.12,vol:.05*k});
    }},
    headthud:{ref:400,gap:140,fn(v,L,r){     // chin on the floor: hollow knock
      const k=Math.pow(L,.8);
      v.tone(0,{f0:160*r,f1:78*r,dur:.1,vol:.5*k});
      v.burst(0,{type:'lowpass',f0:900,dur:.05,vol:.22*k});
      v.tone(0,{f0:1900*r,f1:1800*r,type:'triangle',dur:.06,vol:.05*k});
    }},
    foot:{ref:60,gap:55,fn(v,L,r){           // every footfall: a small tick (walking pace included; see the 'foot' event in catbot.js)
      const k=Math.pow(L,.8);
      v.burst(0,{type:'bandpass',f0:1800*r,q:3,dur:.03,vol:.2*k});
      v.tone(0,{f0:140*r,f1:90*r,dur:.05,vol:.22*k});
    }},
    scuff:{ref:1,gap:70,fn(v,L,r){           // a dragging paw: short dry rasp (the rig emits these as a random stream)
      v.burst(0,{type:'highpass',f0:2500*r,q:.7,dur:.05,vol:.09});
      v.burst(0,{type:'bandpass',f0:1200*r,q:1.5,dur:.05,vol:.07});
    }},
    grind:{ref:1,gap:110,fn(v,L,r){          // the empty hip socket: a rasp with a rough saw under it
      const k=.5+.5*clamp(L,0,1);
      v.burst(0,{type:'bandpass',f0:900*r,f1:1700*r,q:4,dur:.18,vol:.25*k});
      v.tone(0,{f0:95*r,f1:70*r,type:'sawtooth',dur:.16,vol:.1*k});
    }},
    /* ---- mechanics (called from the sites in index.html) ---- */
    ratchet:{ref:1,gap:45,fn(v,L,r){         // one winding-key click; mag = how far along the winding (pitch climbs with it)
      const p=1+.5*clamp(L,0,1);
      v.burst(0,{type:'bandpass',f0:2600*p*r,q:6,dur:.018,vol:.34});
      v.tone(0,{f0:700*p*r,type:'square',dur:.02,vol:.1});
      v.tone(0,{f0:220*r,type:'sine',dur:.035,vol:.1});
    }},
    rewind:{ref:1,gap:400,fn(v,L,r){         // the key run backwards: ~14 clicks, falling pitch, then a clunk. Schedules its own clicks.
      for(let i=0;i<14;i++){
        const dt=i*.055,p=lerp(1.5,.6,i/13);
        v.burst(dt,{type:'bandpass',f0:2600*p*r,q:6,dur:.018,vol:.3});
        v.tone(dt,{f0:700*p*r,type:'square',dur:.02,vol:.09});
      }
      v.tone(.8,{f0:95*r,f1:60*r,dur:.14,vol:.3});
    }},
    relit:{ref:1,gap:300,fn(v,L,r){          // the core relights: a rising power-up sweep and a crackle
      v.tone(0,{f0:120*r,f1:520*r,type:'sawtooth',a:.05,dur:.5,vol:.07});
      v.tone(0,{f0:240*r,f1:1040*r,a:.05,dur:.5,vol:.1});
      v.burst(.1,{type:'highpass',f0:5000,q:.7,dur:.3,vol:.05});
    }},
    crate:{ref:1,gap:200,fn(v,L,r){          // the crate drops into the recess and seats: the heaviest thing in the room, so a THUD.
      // A sub-bass sweep alone is inaudible on laptop and phone speakers (the first version put 91% of its energy under
      // 150 Hz and decayed in ~100 ms). So the weight is carried by a body in the 150-400 Hz range with a long decay, with
      // the sub underneath for real speakers, a hard slap on top, and a smaller second settle as it rocks in.
      // The limiter caps the impact, so the settle must stay well under it or the two read as equal knocks.
      const k=clamp(L,.5,1.3);
      v.tone(0,{f0:210*r,f1:100*r,dur:.45,end:.04,vol:.8*k});                 // the body: what small speakers hear as "heavy"
      v.tone(0,{f0:140*r,f1:70*r,type:'triangle',dur:.45,end:.03,vol:.55*k}); // a rounder layer, its odd harmonics reach well up
      v.tone(0,{f0:72*r,f1:38*r,dur:.6,end:.05,vol:.45*k});                   // the sub, for speakers that have one
      v.burst(0,{type:'lowpass',f0:900,f1:180,q:.7,dur:.3,vol:.55*k});        // the dull slap of a crate on plate
      v.burst(0,{type:'bandpass',f0:1500,f1:400,q:1.1,dur:.05,vol:.4*k});     // the hard edge of the hit
      v.tone(0,{f0:520*r,f1:500*r,type:'triangle',dur:.35,vol:.05*k});        // the recess ringing, quietly
      v.tone(.17,{f0:150*r,f1:70*r,dur:.2,vol:.16*k});                        // it rocks and settles: a much smaller second thud...
      v.burst(.17,{type:'lowpass',f0:500,dur:.12,vol:.1*k});
      v.tone(.33,{f0:140*r,f1:68*r,dur:.14,vol:.07*k});                       // ...and a third, smaller still
    }},
    plate:{ref:1,gap:200,fn(v,L,r){          // the pressure plate: a relay click-click
      v.burst(0,{type:'bandpass',f0:3500*r,q:8,dur:.015,vol:.38});
      v.tone(0,{f0:1800*r,f1:1200*r,type:'square',dur:.04,vol:.1});
      v.tone(.06,{f0:1400*r,f1:1100*r,type:'square',dur:.03,vol:.08});
    }},
    gate:{ref:1,gap:300,fn(v,L,r){           // gate lifts: a servo whine, then the latch clunk as it arrives (the spring gets there in ~0.2 s)
      v.tone(0,{f0:180*r,f1:420*r,type:'sawtooth',a:.03,dur:.22,vol:.06});
      v.tone(.19,{f0:120*r,f1:55*r,dur:.22,vol:.6});
      v.burst(.19,{type:'lowpass',f0:700,dur:.12,vol:.35});
    }},
    hatch:{ref:1,gap:400,fn(v,L,r){          // exit hatch: unlatch, a long steam hiss, a clunk at the end of travel
      v.tone(0,{f0:300*r,f1:200*r,type:'square',dur:.05,vol:.13});
      v.burst(.03,{type:'highpass',f0:3500,f1:1800,q:.7,a:.05,dur:.6,vol:.22});
      v.tone(.03,{f0:90*r,f1:70*r,type:'sawtooth',dur:.4,vol:.05});
      v.tone(.3,{f0:100*r,f1:60*r,dur:.14,vol:.32});
    }},
    unstick:{ref:1,gap:300,fn(v,L,r){        // the crate lets go of the deck: one hard crack, a crunch, a dull thump (the scrape loop takes over)
      v.burst(0,{type:'bandpass',f0:2600*r,f1:900*r,q:1.5,dur:.09,vol:.35});
      v.burst(0,{type:'lowpass',f0:400,dur:.16,vol:.3});
      v.tone(0,{f0:150*r,f1:70*r,dur:.12,vol:.3});
    }},
    nuh:{ref:1,gap:450,fn(v,L,r){            // a locked door refuses you, "nu-uh": two falling buzzes, the second lower, over the dull thunk of the bump
      v.tone(0,{f0:95*r,f1:60,dur:.09,vol:.3});
      v.tone(0,{f0:330*r,f1:300*r,type:'square',a:.01,dur:.13,vol:.07});
      v.tone(0,{f0:333*r,f1:302*r,type:'sawtooth',a:.01,dur:.13,vol:.05});     // detuned a hair so the pair buzzes
      v.tone(.17,{f0:250*r,f1:195*r,type:'square',a:.01,dur:.2,vol:.07});
      v.tone(.17,{f0:253*r,f1:197*r,type:'sawtooth',a:.01,dur:.2,vol:.05});
    }},
    perk:{ref:1,gap:150,fn(v,L,r){         // ears up: two quick chirps
      v.tone(0,{f0:1200*r,f1:1800*r,dur:.05,vol:.13});
      v.tone(.07,{f0:1500*r,f1:2200*r,dur:.05,vol:.13});
    }},
    pounce:{ref:1,gap:200,fn(v,L,r){         // the leap: a whoosh
      v.burst(0,{type:'bandpass',f0:400*r,f1:1800*r,q:1.2,a:.08,dur:.28,vol:.3});
    }},
    pin:{ref:1,gap:200,fn(v,L,r){            // paw pins the toy: a metal-on-deck clack
      v.burst(0,{type:'bandpass',f0:1600*r,q:4,dur:.04,vol:.3});
      v.tone(0,{f0:520*r,f1:300*r,type:'triangle',dur:.08,vol:.22});
    }},
    partfly:{ref:1,gap:600,fn(v,L,r){        // the part flies home: a rising whir with a spark fizz on top
      v.tone(0,{f0:300*r,f1:1200*r,type:'sawtooth',a:.05,dur:.8,vol:.06});
      v.tone(0,{f0:600*r,f1:2400*r,a:.05,dur:.8,vol:.07});
      v.burst(0,{type:'highpass',f0:6000,q:.7,a:.05,dur:.8,vol:.04});
    }},
    socket:{ref:1,gap:400,fn(v,L,r){         // the part clicks into the hip: click-click, then a chime
      v.burst(0,{type:'bandpass',f0:3000*r,q:6,dur:.015,vol:.4});
      v.burst(.05,{type:'bandpass',f0:3400*r,q:6,dur:.015,vol:.34});
      v.tone(.08,{f0:1320*r,dur:.5,vol:.2});
      v.tone(.1,{f0:1980*r,dur:.45,vol:.09});
      v.tone(.14,{f0:2640*r,dur:.3,vol:.05});
    }},
    puff:{ref:1,gap:200,fn(v,L,r){           // a puff of steam from the key
      v.burst(0,{type:'highpass',f0:3000,f1:1500,q:.7,a:.03,dur:.45,vol:.18});
    }},
    slip:{ref:1,gap:300,fn(v,L,r){           // the gear train skips a tooth at idle: k-krk
      v.burst(0,{type:'bandpass',f0:1800*r,q:5,dur:.02,vol:.3});
      v.burst(.03,{type:'bandpass',f0:1100*r,q:5,dur:.02,vol:.26});
      v.tone(0,{f0:200*r,f1:120*r,type:'sawtooth',dur:.06,vol:.09});
    }},
    pad:{ref:1,gap:120,fn(v,L,r){            // a trolley floor button going in
      v.tone(0,{f0:900*r,type:'square',dur:.035,vol:.12});
      v.tone(0,{f0:450*r,dur:.06,vol:.2});
      v.burst(0,{type:'bandpass',f0:3000,q:5,dur:.01,vol:.2});
    }},
    card:{ref:1,gap:800,fn(v,L,r){           // the part card: a short rising chime
      for(const [dt,f] of [[0,660],[.12,880],[.24,1320]])v.tone(dt,{f0:f*r,dur:.6,vol:.18});
    }},
    /* ---- the opening (opening.js calls these at its cue marks): heard through the hull, then inside the cabin, then the quiet ---- */
    cough:{ref:1,gap:120,fn(v,L,r){          // engine A sputters: two dull puffs
      v.burst(0,{type:'lowpass',f0:240*r,f1:90,dur:.2,vol:.34});
      v.tone(0,{f0:72*r,f1:40,dur:.2,vol:.26});
      v.burst(.12,{type:'lowpass',f0:200*r,f1:80,dur:.14,vol:.2});
    }},
    flameout:{ref:1,gap:500,fn(v,L,r){       // engine B is gone: a long falling whump and a few last coughs
      v.tone(0,{f0:95*r,f1:28,type:'sawtooth',dur:1.4,vol:.2});
      v.burst(0,{type:'lowpass',f0:420,f1:60,dur:1.4,vol:.3});
      for(const dt of [.55,.85,1.1])v.burst(dt,{type:'lowpass',f0:220,f1:80,dur:.12,vol:.2});
    }},
    creak:{ref:1,gap:300,fn(v,L,r){          // the hull flexing: a slow groan
      v.tone(0,{f0:210*r,f1:150*r,type:'sawtooth',a:.15,dur:.9,vol:.05});
      v.burst(0,{type:'bandpass',f0:900*r,f1:420*r,q:8,a:.2,dur:.9,vol:.07});
    }},
    rip:{ref:1,gap:0,fn(v,L,r){              // a panel tears off: a metal rip with a snap at the end
      v.burst(0,{type:'bandpass',f0:1800*r,f1:500*r,q:2,dur:.35,vol:.34});
      v.tone(0,{f0:260*r,f1:90*r,type:'sawtooth',dur:.3,vol:.12});
      v.tone(.04,{f0:1100*r,f1:700*r,type:'triangle',dur:.25,vol:.06});
      v.burst(.3,{type:'highpass',f0:4000,dur:.08,vol:.18});
    }},
    alarm:{ref:1,gap:200,fn(v,L,r){          // the cabin's warning tone, once per beacon pulse
      v.tone(0,{f0:740*r,f1:690*r,type:'sawtooth',a:.01,dur:.34,vol:.1});
      v.tone(0,{f0:370*r,type:'square',a:.01,dur:.34,vol:.05});
    }},
    bang:{ref:1,gap:0,fn(v,L,r){             // a locker door slamming open (three at once, staggered by the caller)
      v.tone(0,{f0:110*r,f1:55,dur:.22,vol:.5});
      v.burst(0,{type:'bandpass',f0:1400*r,q:1.2,dur:.12,vol:.35});
      v.tone(0,{f0:380*r,f1:340*r,type:'triangle',dur:.3,vol:.08});
    }},
    /* what spills out of the lockers, one sound per kind of object (opening.js calls these from the real floor bounces, mag = impact speed) */
    clink:{ref:500,gap:30,fn(v,L,r){         // gears, bolts, the watch
      const k=Math.pow(clamp(L,.15,1.3),.8);
      v.tone(0,{f0:(1500+rnd(0,700))*r,f1:1400*r,type:'triangle',dur:.08,vol:.12*k});
      v.burst(0,{type:'bandpass',f0:4500,q:6,dur:.02,vol:.12*k});
    }},
    thunk:{ref:500,gap:60,fn(v,L,r){         // the crates
      const k=Math.pow(clamp(L,.15,1.3),.8);
      v.tone(0,{f0:180*r,f1:90,dur:.1,vol:.3*k});
      v.burst(0,{type:'lowpass',f0:700,dur:.08,vol:.25*k});
    }},
    clang:{ref:500,gap:60,fn(v,L,r){         // the wrenches
      const k=Math.pow(clamp(L,.15,1.3),.8);
      v.tone(0,{f0:520*r,type:'triangle',dur:.35,vol:.14*k});
      v.tone(0,{f0:1310*r,type:'triangle',dur:.25,vol:.08*k});
      v.burst(0,{type:'bandpass',f0:3000,q:4,dur:.03,vol:.15*k});
    }},
    tink:{ref:500,gap:60,fn(v,L,r){          // the bulb (glass)
      const k=Math.pow(clamp(L,.15,1.3),.8);
      v.tone(0,{f0:3200*r,f1:3000*r,dur:.12,vol:.08*k});
      v.tone(0,{f0:4800*r,dur:.08,vol:.04*k});
    }},
    boing:{ref:500,gap:120,fn(v,L,r){        // the spring
      const k=Math.pow(clamp(L,.15,1.3),.8);
      v.tone(0,{f0:400*r,f1:150*r,type:'triangle',dur:.3,vol:.12*k});
    }},
    chirp:{ref:500,gap:250,fn(v,L,r){        // the clockwork bird, once, quietly
      for(const dt of [0,.07,.14])v.tone(dt,{f0:2600*r,f1:3400*r,dur:.05,vol:.05});
    }},
    boom:{ref:1,gap:500,fn(v,L,r){           // the impact: a sub boom with weight and a flat slap on top
      v.tone(0,{f0:70*r,f1:24,dur:1.1,vol:.8});
      v.burst(0,{type:'lowpass',f0:300,f1:60,dur:1,vol:.55});
      v.burst(0,{type:'lowpass',f0:1200,dur:.25,vol:.32});
    }},
    crunch:{ref:1,gap:500,fn(v,L,r){         // metal folding: a long crush with torn-metal snaps in it and a low groan under
      v.burst(0,{type:'bandpass',f0:900,f1:250,q:.9,a:.02,dur:1.5,vol:.3});
      for(let i=0;i<10;i++)v.burst(i*.13+rnd(0,.08),{type:'bandpass',f0:rnd(500,2500),q:3,dur:.08,vol:.12});
      v.tone(0,{f0:130*r,f1:60,type:'triangle',dur:1.5,vol:.1});
    }},
    debris:{ref:1,gap:500,fn(v,L,r){         // bits of ship landing around the wreck, over about a second and a half
      for(let i=0;i<16;i++){const dt=.15+rnd(0,1.3);v.tone(dt,{f0:rnd(900,3000)*r,type:'triangle',dur:.06,vol:rnd(.02,.07)});v.burst(dt,{type:'bandpass',f0:rnd(2000,5000),q:4,dur:.015,vol:.05});}
    }},
    ring:{ref:1,gap:500,fn(v,L,r){           // ears ringing after the blast
      v.tone(0,{f0:3400*r,a:.05,dur:3.2,vol:.06});
      v.tone(0,{f0:3520*r,a:.05,dur:3,vol:.03});
    }},
    groan:{ref:1,gap:500,fn(v,L,r){          // the wreck settling: metal bending, falling in pitch
      v.tone(0,{f0:190*r,f1:58,type:'sawtooth',a:.1,dur:1.6,vol:.14});
      v.burst(0,{type:'bandpass',f0:700,f1:200,q:4,a:.1,dur:1.6,vol:.12});
    }},
    powerdown:{ref:1,gap:500,fn(v,L,r){      // the last tube dying: a whine falling to nothing
      v.tone(0,{f0:900*r,f1:35,type:'sawtooth',dur:1,vol:.15});
      v.tone(0,{f0:450*r,f1:30,dur:1,vol:.15});
      v.burst(0,{type:'highpass',f0:5000,dur:.15,vol:.1});
    }},
    cool:{ref:1,gap:500,fn(v,L,r){           // one distant tink of cooling metal, to prove the silence is real
      v.tone(0,{f0:2100*r,f1:1900*r,a:.005,dur:.5,vol:.05});
      v.tone(0,{f0:3150*r,dur:.3,vol:.025});
    }},
    click:{ref:1,gap:100,fn(v,L,r){          // 'a faint mechanical click': the loudest thing in a quiet room
      v.burst(0,{type:'bandpass',f0:3200*r,q:7,dur:.014,vol:.6});
      v.tone(0,{f0:900*r,f1:600*r,type:'square',dur:.03,vol:.12});
      v.tone(0,{f0:230*r,dur:.05,vol:.12});
    }},
    earTink:{ref:1,gap:200,fn(v,L,r){        // an ear flicks: two tiny notes
      v.tone(0,{f0:2400*r,f1:2200*r,dur:.08,vol:.08});
      v.tone(.09,{f0:3000*r,dur:.08,vol:.06});
    }},
    winding:{ref:1,gap:400,fn(v,L,r){        // the key turns once: six ratchet clicks climbing in pitch. Schedules its own clicks.
      for(let i=0;i<6;i++){
        const dt=i*.085,p=1+.5*(i/5);
        v.burst(dt,{type:'bandpass',f0:2600*p*r,q:6,dur:.018,vol:.3});
        v.tone(dt,{f0:700*p*r,type:'square',dur:.02,vol:.09});
        v.tone(dt,{f0:220*r,dur:.035,vol:.1});
      }
    }},
    tk:{ref:1,gap:200,fn(v,L,r){             // the key stops
      v.burst(0,{type:'bandpass',f0:2000*r,q:6,dur:.02,vol:.35});
      v.tone(0,{f0:160*r,f1:80,dur:.06,vol:.15});
    }}
  };

  /* ===================================================================
     5. ONE-SHOTS: sfx(name,{mag,x,rate,delay})
     What: looks the sound up, rate-limits it, converts world x to a pan,
     and plays it. mag is raw (each sound's ref normalises it); x is a world
     x panned against the room camera through AUDIO.view (set by the game);
     rate is a pitch multiplier; delay is seconds from now.
     Why rate-limit per name: the rig can emit dozens of scuffs a second
     and a trot is a burst of footfalls; a minimum gap per name keeps them
     from piling up (wall clock, so it still works if the audio clock is
     frozen). Unknown names are ignored, so a new event kind is silent
     until someone writes its sound. Every call is also logged to a short
     ring buffer (AUDIO.trace) so behaviour can be verified without ears.
     =================================================================== */
  const panOf=x=>{
    if(x==null||!api.view)return 0;
    const v=api.view();return clamp(((x-v.x)/v.w*2-1)*.7,-.7,.7);
  };
  function note(e){log.push(e);if(log.length>80)log.shift();}
  function sfx(name,o){
    try{
      if(dead||!ac||!enabled)return;
      const d=SOUNDS[name];if(!d)return;
      o=o||{};
      const now=performance.now();
      if(limiting){if(now-(last[name]??-1e9)<(d.gap??80))return;last[name]=now;}
      const mag=o.mag==null?1:o.mag,pan=panOf(o.x),ok=running()&&(!limiting||voices()<=MAXV);
      note({name,mag:+mag.toFixed(2),pan:+pan.toFixed(2),ok});
      if(!ok)return;
      const t=ac.currentTime+(o.delay||0)+.004;
      d.fn(voice(t,out(pan,sfxBus)),clamp(Math.abs(mag)/(d.ref||1),0,1.3),(o.rate||1)*(1+rnd(-.04,.04)));
    }catch(e){warn(e);}
  }

  /* ===================================================================
     6. LOOPS: start(name,params) / stop(name)
     What: states that last (push strain, ice) are persistent node graphs whose
     params glide with setTargetAtTime; start() is idempotent and doubles as
     "set params", so the game calls it every frame while the state holds and
     stop() when it ends (the gain fades, then the sources are freed).
     The ambient 'tick' is a loop too, but a pulse generator: a phase
     accumulator advanced from frame(dt) at a rate that follows rig energy,
     so the tick speeds up and slows with no pitch artefacts and no timers.
     =================================================================== */
  function tickClick(t,tock,E){               // the clockwork: a dry click and a tiny pitched tk, alternating tick / tock
    const f=tock?.82:1,vol=lerp(.5,.9,E);
    burst(t,{type:'bandpass',f0:2300*f,q:6,dur:.014,vol:.5*vol},ambBus);
    tone(t,{f0:1500*f,f1:950*f,dur:.022,vol:.14*vol},ambBus);
  }
  /* Two modulation envelopes for the scrape, built once (a few ms): looping buffers wired into a gain's
     AudioParam and sped up or slowed with playbackRate.
       grain: irregular roughness (rectified low-passed noise), the "rrrrr" inside any scrape
       slip:  stick-slip, a load that climbs then lets go, about 7 times a second and never evenly */
  let grainBuf=null, slipBuf=null;
  function envBuffers(){
    if(grainBuf)return;
    const sr=ac.sampleRate,len=sr*2;
    grainBuf=ac.createBuffer(1,len,sr);
    const g=grainBuf.getChannelData(0),k=1-Math.exp(-6.2832*40/sr);
    let y=0,sum=0;
    for(let i=0;i<len;i++){y+=k*((Math.random()*2-1)-y);g[i]=Math.abs(y);sum+=g[i];}
    const m=sum/len*2;for(let i=0;i<len;i++)g[i]=Math.min(1,g[i]/m);
    const N=2048;for(let i=0;i<N;i++){const w=i/N;g[len-N+i]=g[len-N+i]*(1-w)+g[i]*w;}   // blend the end into the start so the loop point doesn't click
    slipBuf=ac.createBuffer(1,len,sr);
    const s=slipBuf.getChannelData(0);
    for(let i=0;i<len;){
      const n=Math.floor(sr*rnd(.09,.2));                          // one stick-slip cycle: the load climbs, then lets go
      for(let j=0;j<n&&i<len;j++,i++)s[i]=.12+.88*Math.pow(j/n,1.6);
    }
  }
  const LOOPS={
    strain:{make(){                          // leaning on the crate, then dragging it: a SCRAPE, so noise, not a tone. Filter centre ("pitch") and level rise with amt (= P.str); slide = crate speed
      envBuffers();
      const out=ac.createGain();out.gain.value=0;out.connect(sfxBus);
      const srcs=[];
      const noiseSrc=()=>{const n=ac.createBufferSource();n.buffer=noise;n.loop=true;srcs.push(n);return n;};
      const envSrc=b=>{const e=ac.createBufferSource();e.buffer=b;e.loop=true;srcs.push(e);return e;};
      const flt=(type,f,q)=>{const b=ac.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;return b;};
      // grit: band-limited noise, roughened by the grain envelope and chattered by the slip envelope.
      // (an envelope wired into a gain's AudioParam adds to the param's own value: amplitude = base + env x depth)
      const gBP=flt('bandpass',900,.9),gA=ac.createGain(),gB=ac.createGain();
      gA.gain.value=0;gB.gain.value=1;
      noiseSrc().connect(gBP);gBP.connect(gA);gA.connect(gB);gB.connect(out);
      const grain=envSrc(grainBuf),gD=ac.createGain();grain.connect(gD);gD.connect(gA.gain);
      const slip=envSrc(slipBuf),sD=ac.createGain();slip.connect(sD);sD.connect(gB.gain);
      // weight: the crate's low rumble on the deck
      const rLP=flt('lowpass',170,.7),rG=ac.createGain();rG.gain.value=0;noiseSrc().connect(rLP);rLP.connect(rG);rG.connect(out);
      // effort: a faint servo groan whose pitch climbs with the strain (the only tone left, and a quiet one)
      const sv=ac.createOscillator(),svLP=flt('lowpass',500,.7),svG=ac.createGain();
      sv.type='triangle';sv.frequency.value=70;svG.gain.value=0;sv.connect(svLP);svLP.connect(svG);svG.connect(out);srcs.push(sv);
      // squeal: metal on metal near the limit, gated by the same stick-slip so it chirps rather than whistles
      const qBP=flt('bandpass',3000,16),qG=ac.createGain(),qD=ac.createGain();
      qG.gain.value=0;noiseSrc().connect(qBP);qBP.connect(qG);qG.connect(out);slip.connect(qD);qD.connect(qG.gain);
      for(const s of srcs){if(s.buffer)s.start(0,rnd(0,.9));else s.start();}      // random start points, so no two pushes sound identical
      return{g:out,srcs,p:{},set(p){
        const a=clamp(p.amt||0,0,1),s=clamp(p.slide||0,0,1),t=ac.currentTime,T=.06;
        const grit=(.04+.16*a+.26*s)*4;                          // level of the grit layer (x4: band-limited noise carries little energy)
        const q=clamp(.35+.5*a-.3*s,.15,.9);                     // stick-slip depth: strong while straining, smoother once it is moving
        out.gain.setTargetAtTime(.5,t,.05);                      // overall trim: noise has a high crest factor, so it peaks well above what it sounds like
        gBP.frequency.setTargetAtTime(650+1700*a+1100*s,t,T);    // brighter with effort and with speed
        gA.gain.setTargetAtTime(grit*.45,t,T);gD.gain.setTargetAtTime(grit*.9,t,T);
        gB.gain.setTargetAtTime(1-q,t,T);sD.gain.setTargetAtTime(q,t,T);
        grain.playbackRate.setTargetAtTime(.8+1.6*(a*.5+s),t,.1);  // the roughness speeds up with speed
        slip.playbackRate.setTargetAtTime(.7+1.2*a+s,t,.1);        // the chatter speeds up as the strain builds
        rG.gain.setTargetAtTime((.02+.1*s+.04*a)*8,t,T);
        sv.frequency.setTargetAtTime(70+160*a,t,T);svG.gain.setTargetAtTime(.05*a*(1-.6*s),t,T);
        qBP.frequency.setTargetAtTime(3300-1300*a,t,T);qD.gain.setTargetAtTime(Math.max(0,a-.55)*1.2*(1-s),t,T);
        this.p={amt:+a.toFixed(3),slide:+s.toFixed(3)};
      }};
    }},
    ice:{make(){                              // sliding on ice: a high hiss that brightens and swells with floorSlip x speed (amt)
      const g=ac.createGain();g.gain.value=0;g.connect(sfxBus);
      const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=3000;hp.connect(g);
      const n=ac.createBufferSource();n.buffer=noise;n.loop=true;n.connect(hp);n.start();
      return{g,srcs:[n],p:{},set(p){
        const a=clamp(p.amt||0,0,1),t=ac.currentTime;
        hp.frequency.setTargetAtTime(2800+2000*a,t,.08);g.gain.setTargetAtTime(a*.25,t,.08);this.p={amt:+a.toFixed(3)};
      }};
    }},
    /* ---- beds for the opening (opening.js starts and feeds them; they are states, like strain and ice) ---- */
    drone:{make(){                            // the low bed: sines a few Hz apart (they beat slowly) over a low rumble. amt = level
      const g=ac.createGain();g.gain.value=0;g.connect(sfxBus);
      const srcs=[];
      for(const [f,a] of [[41,.3],[61.5,.2],[82.2,.08]]){const o=ac.createOscillator(),og=ac.createGain();o.frequency.value=f;og.gain.value=a;o.connect(og);og.connect(g);srcs.push(o);}
      const n=ac.createBufferSource(),lpf=ac.createBiquadFilter(),ng=ac.createGain();
      n.buffer=noise;n.loop=true;lpf.type='lowpass';lpf.frequency.value=140;ng.gain.value=1.2;n.connect(lpf);lpf.connect(ng);ng.connect(g);srcs.push(n);
      for(const s of srcs){if(s.buffer)s.start(0,rnd(0,.9));else s.start();}
      return{g,srcs,p:{},set(p){const a=clamp(p.amt||0,0,1.2);g.gain.setTargetAtTime(a,ac.currentTime,.25);this.p={amt:+a.toFixed(3)};}};
    }},
    air:{make(){                              // atmosphere and wind: wide-band noise. amt = level, hz = centre (climbs as the ship drops)
      const g=ac.createGain();g.gain.value=0;g.connect(sfxBus);
      const n=ac.createBufferSource(),bp=ac.createBiquadFilter();
      n.buffer=noise;n.loop=true;bp.type='bandpass';bp.Q.value=.5;bp.frequency.value=800;n.connect(bp);bp.connect(g);n.start(0,rnd(0,.9));
      return{g,srcs:[n],p:{},set(p){
        const a=clamp(p.amt||0,0,1),t=ac.currentTime;
        bp.frequency.setTargetAtTime(p.hz||800,t,.15);g.gain.setTargetAtTime(a*1.1,t,.2);this.p={amt:+a.toFixed(3),hz:Math.round(p.hz||800)};
      }};
    }},
    tube:{make(){                             // a failing light tube, then the lamp: 100 Hz mains buzz and hiss. amt follows the flicker, so it drops out when the light does
      const g=ac.createGain();g.gain.value=0;g.connect(sfxBus);
      const lpf=ac.createBiquadFilter();lpf.type='lowpass';lpf.frequency.value=900;lpf.connect(g);
      const o1=ac.createOscillator(),o2=ac.createOscillator(),o3=ac.createOscillator(),g2=ac.createGain(),g3=ac.createGain();
      o1.type='sawtooth';o1.frequency.value=100;o2.type='square';o2.frequency.value=200.7;o3.type='sine';o3.frequency.value=50;
      g2.gain.value=.25;g3.gain.value=.5;o1.connect(lpf);o2.connect(g2);g2.connect(lpf);o3.connect(g3);g3.connect(lpf);
      const n=ac.createBufferSource(),hp=ac.createBiquadFilter(),ng=ac.createGain();
      n.buffer=noise;n.loop=true;hp.type='highpass';hp.frequency.value=3500;ng.gain.value=.5;n.connect(hp);hp.connect(ng);ng.connect(g);
      const srcs=[o1,o2,o3,n];for(const s of srcs){if(s.buffer)s.start(0,rnd(0,.9));else s.start();}
      return{g,srcs,p:{},set(p){const a=clamp(p.amt||0,0,1);g.gain.setTargetAtTime(Math.pow(a,1.5)*.12,ac.currentTime,.012);this.p={amt:+a.toFixed(3)};}};
    }},
    tick:{make(){                             // ambient clockwork: rate = lerp(0.7, 3.4 Hz, energy); the slower it gets, the less even
      return{srcs:[],p:{},E:1,ph:.9,n:0,set(p){this.E=clamp(p.energy??1,0,1);this.p={energy:+this.E.toFixed(3)};},
        pump(dt){
          const E=this.E;this.ph+=lerp(.7,3.4,E)*dt*(1+(Math.random()-.5)*.2*(1-E));
          if(this.ph>=1){this.ph-=1;tickClick(ac.currentTime+.01,this.n++&1,E);}
        }};
    }}
  };
  function start(name,p){
    try{
      if(dead||!ac||!enabled||!running())return;
      const def=LOOPS[name];if(!def)return;
      let L=loops[name];
      if(!L){L=loops[name]=def.make();note({name:'+'+name});}
      L.set(p||{});
    }catch(e){warn(e);}
  }
  function stop(name){
    try{
      const L=loops[name];if(!L)return;
      delete loops[name];note({name:'-'+name});
      if(L.g){const t=ac.currentTime;L.g.gain.cancelScheduledValues(t);L.g.gain.setTargetAtTime(0,t,.05);for(const s of L.srcs)s.stop(t+.4);}
    }catch(e){warn(e);}
  }
  /* once per game tick: advances the pulse generators (the ambient tick). Loops with params are fed by the game; this only keeps time. */
  function frame(dt){
    try{
      if(!ac||!enabled||!running())return;
      for(const n of Object.keys(loops)){const L=loops[n];if(L.pump)L.pump(dt);}
    }catch(e){warn(e);}
  }

  /* ===================================================================
     7. MUSIC (stub)
     What: does nothing yet. Why: the shape is here so a later pass can map
     "how repaired is the ship" (installed parts, or the repair %) to stem
     layers without touching any game code. index.html already calls it when
     the hip goes in.
     =================================================================== */
  const music={setLayers(n){/* stub: layers 0..n of a score would fade in here */}};

  /* ===================================================================
     8. DEV AIDS (small, read-only apart from limits/attach)
     trace: what was actually asked for, in order ({name,mag,pan,ok}; loops as
       '+name' / '-name'). peak(): the largest sample at the output in the last
       ~43 ms (the analyser window), so poll it faster than that while measuring.
       debug(): state, mute flag, master gain, loops and their last params.
       limits(false): turns the per-name rate limit and the voice cap off (for barrage tests).
       attach(ctx,force): build the chain on a given context (an
       OfflineAudioContext, in tests); force skips the 'running' check.
     =================================================================== */
  const pk=new Float32Array(2048);
  function peak(){
    if(!meter)return 0;
    meter.getFloatTimeDomainData(pk);let m=0;for(let i=0;i<pk.length;i++){const a=Math.abs(pk[i]);if(a>m)m=a;}
    return m;
  }
  const sp=new Float32Array(1024);
  function spectrum(){                        // output spectrum in dB per bin (~23 Hz a bin at 48 kHz): tells noise from tone without ears
    if(!meter)return null;
    meter.getFloatFrequencyData(sp);return sp;
  }
  function debug(){
    const lps={};for(const n of Object.keys(loops))lps[n]=loops[n].p;
    return{state:ac?ac.state:'none',time:ac?+ac.currentTime.toFixed(3):null,dead,enabled,muffle:lp?Math.round(lp.frequency.value):wantMuffle,duck:duckG?+duckG.gain.value.toFixed(3):wantDuck,master:master?+master.gain.value.toFixed(3):null,voices:voices(),loops:lps,sounds:Object.keys(SOUNDS)};
  }
  function attach(ctx,force){build(ctx);forced=!!force;wantRun=true;}

  const api={sfx,start,stop,enable,unlock,frame,music,muffle,duck,stopAll,active,peak,spectrum,debug,attach,
    limits(on){limiting=!!on;},get trace(){return log;},view:null};   // view: ()=>({x,w}) world x of the screen's left edge and its width, for panning
  return api;
})();
window.sfx=(n,o)=>window.AUDIO.sfx(n,o);   // shorthand for call sites
