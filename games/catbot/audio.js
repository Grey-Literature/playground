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
  let master=null, comp=null, meter=null, sfxBus=null, ambBus=null, noise=null;
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
    sfxBus.connect(master);ambBus.connect(master);master.connect(comp);comp.connect(ac.destination);comp.connect(meter);
    noise=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);          // 1 s of white noise, shared by every hiss and rasp
    const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }
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
  function out(pan,bus){          // optional stereo pan (skipped where StereoPannerNode doesn't exist)
    if(pan&&ac.createStereoPanner){const p=ac.createStereoPanner();p.pan.value=pan;p.connect(bus);return p;}
    return bus;
  }
  function tone(t,p,to){
    const o=ac.createOscillator(),g=ac.createGain(),f0=p.f0,f1=p.f1??p.f0,dur=p.dur,a=p.a??.002;
    o.type=p.type||'sine';o.frequency.setValueAtTime(f0,t);
    if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(p.vol,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(to);o.start(t);o.stop(t+dur+.02);ends.push(t+dur+.03);
  }
  function burst(t,p,to){
    const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain(),dur=p.dur,a=p.a??.002,f0=p.f0,f1=p.f1??p.f0;
    s.buffer=noise;s.loop=true;f.type=p.type||'bandpass';f.Q.value=p.q??1;f.frequency.setValueAtTime(f0,t);
    if(f1!==f0)f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(p.vol,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
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
    crate:{ref:1,gap:200,fn(v,L,r){          // the crate seats in the recess: the biggest bang in the room
      const k=clamp(L,.5,1.3);
      v.tone(0,{f0:90*r,f1:38*r,dur:.35,vol:.65*k});
      v.burst(0,{type:'lowpass',f0:500,dur:.25,vol:.4*k});
      v.tone(0,{f0:520*r,f1:500*r,type:'triangle',dur:.4,vol:.12*k});
      v.burst(.02,{type:'bandpass',f0:2200,q:2,dur:.1,vol:.16*k});
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
    perk:{ref:1,gap:150,fn(v,L,r){           // ears up: two quick chirps
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
  const LOOPS={
    strain:{make(){                           // leaning on the crate: stick-slip grind. Pitch and level both rise with amt (= P.str); slide adds grit while it moves
      const g=ac.createGain();g.gain.value=0;g.connect(sfxBus);
      const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;lp.connect(g);
      const m=ac.createGain();m.gain.value=.5;m.connect(lp);                          // the stick-slip chatter rides this gain
      const o1=ac.createOscillator(),o2=ac.createOscillator(),lfo=ac.createOscillator(),ld=ac.createGain();
      o1.type='sawtooth';o2.type='square';lfo.frequency.value=8;ld.gain.value=.35;
      lfo.connect(ld);ld.connect(m.gain);o1.connect(m);o2.connect(m);
      const n=ac.createBufferSource(),bp=ac.createBiquadFilter(),ng=ac.createGain();
      n.buffer=noise;n.loop=true;bp.type='bandpass';bp.Q.value=2;ng.gain.value=.6;n.connect(bp);bp.connect(ng);ng.connect(g);
      const srcs=[o1,o2,lfo,n];for(const s of srcs)s.start();
      return{g,srcs,p:{},set(p){
        const a=clamp(p.amt||0,0,1),s=clamp(p.slide||0,0,1),t=ac.currentTime,f=55+210*a;
        o1.frequency.setTargetAtTime(f,t,.05);o2.frequency.setTargetAtTime(f*1.012,t,.05);lfo.frequency.setTargetAtTime(6+8*a,t,.1);
        bp.frequency.setTargetAtTime(380+1500*a,t,.05);lp.frequency.setTargetAtTime(500+1800*a,t,.05);
        g.gain.setTargetAtTime(a*.2+s*.1,t,.06);this.p={amt:+a.toFixed(3),slide:+s.toFixed(3)};
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
  function debug(){
    const lp={};for(const n of Object.keys(loops))lp[n]=loops[n].p;
    return{state:ac?ac.state:'none',time:ac?+ac.currentTime.toFixed(3):null,dead,enabled,master:master?+master.gain.value.toFixed(3):null,voices:voices(),loops:lp,sounds:Object.keys(SOUNDS)};
  }
  function attach(ctx,force){build(ctx);forced=!!force;wantRun=true;}

  const api={sfx,start,stop,enable,unlock,frame,music,peak,debug,attach,
    limits(on){limiting=!!on;},get trace(){return log;},view:null};   // view: ()=>({x,w}) world x of the screen's left edge and its width, for panning
  return api;
})();
window.sfx=(n,o)=>window.AUDIO.sfx(n,o);   // shorthand for call sites
