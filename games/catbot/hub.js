'use strict';
/* =====================================================================
   HUB: the deck plan. Top-down, and it doubles as the goal screen: the
   plan IS the shuttle blueprint, one socket per compartment, and each
   socket lights as its part goes in.
   Built with Claude Sonnet 5.5 (claude-sonnet-5-5) in Claude Code.
   The unlock chain (needs/lock) and the built-rooms cockpit rule: Claude Opus 5.5 (claude-opus-5-5).
   Same shape as opening.js: an IIFE that reads the game's globals
   (W, H, S, mode, installed, ROOMS, caps, fadeTo, loadRoom ...).
   Layout is plain data (DECK). A slot with no ROOMS[] entry of the same
   id is sealed: its room just isn't built yet.
   Movement-only, like everywhere else: ← ↑ ↓ → / A W S D / the thumb-stick.
   ===================================================================== */
const HUB=(()=>{
const DW=36;                                // door gap width
const BUS_T=126, BUS_B=280;                 // conduit bus rows along the atrium's edges
const POCKET=26, MAT=34, SILL=12;           // doorway recess depth; floor mat in front of a door; how far in counts as "through"
const TR=8.5, MAXV=130, ACC=460;            // token radius, top speed, acceleration (px, px/s, px/s²)
const SENSE=10;                             // a locked hatch answers a token this many px short of touching it (touchHatch)
const MODES=['hub','hubin','hubgo'];

/* ---------------------------------------------------------------------
   DECK: px in the 720x405 frame, nose to the right (matches the shuttle
   profile in the opening). door.side = which wall of the room holds the
   door; door.at = where along that wall.
   --------------------------------------------------------------------- */
const rc=(x,y,w,h)=>({x,y,w,h});
const DECK={
  atrium:rc(122,118,474,170),
  table:{x:360,y:203,r:34},
  pillars:[[240,160],[240,246],[480,160],[480,246]],
  slots:[
    {id:'aft-hold',    part:'hip',          label:'AFT HOLD',      hint:'Where it woke up.',                        rect:rc(18,96,104,214),  door:{side:'r',at:203}},
    {id:'engine',                           label:'ENGINE BAY',    hint:'The floors drift. Steam keeps time.',      rect:rc(122,26,150,92),  door:{side:'b',at:197}, needs:['aft-hold'],
      lock:'Breaker tripped. Power stops at the Aft Hold.'},
    {id:'galley',                           label:'GALLEY / MESS', hint:'Slidey trays. Something green.',           rect:rc(272,26,160,92),  door:{side:'b',at:352}, needs:['engine'],
      lock:'Breaker tripped. Power stops at the Engine Bay.'},
    {id:'observation',                      label:'OBSERVATION',   hint:'Low gravity. Long jumps.',                 rect:rc(432,26,164,92),  door:{side:'b',at:514}, needs:['galley'],
      lock:'Breaker tripped. Power stops at the Galley.'},
    {id:'berthing',                         label:'BERTHING',      hint:'Dark. A light sweeps the floor.',          rect:rc(122,288,150,92), door:{side:'t',at:197}, needs:['engine'],
      lock:'Breaker tripped. Power stops at the Engine Bay.'},
    {id:'hydroponics',                      label:'HYDROPONICS',   hint:'Something in here is catnip.',             rect:rc(272,288,160,92), door:{side:'t',at:352}, needs:['sanitation'],
      lock:'Breaker tripped. Power stops at Sanitation.'},
    {id:'sanitation',                       label:'SANITATION',    hint:'Sand. It remembers where you walked.',     rect:rc(432,288,164,92), door:{side:'t',at:514}, needs:['observation'], scrawl:'LITTER BOX',
      lock:'Breaker tripped. Power stops at Observation.'},
    {id:'cockpit',     part:'yarn',         label:'COCKPIT',       hint:'Needs every other socket lit.',            rect:rc(596,96,106,214), door:{side:'l',at:203}, req:'others',
      poly:[[596,96],[650,96],[702,150],[702,256],[650,310],[596,310]], sock:{x:652,y:203,r:22}}
  ]
};
/* needs: the power chain the conduits already draw. Aft Hold feeds the top bus west to east (engine, galley,
   observation), then it comes back along the bottom bus east to west (sanitation, hydroponics, berthing). A slot
   whose needs aren't all in place stays sealed even if its room is built, and says why with its own lock line. */
for(const s of DECK.slots){s.part=s.part||s.id;s.room=s.room||s.id;}
GAME.totalParts=DECK.slots.length;           // the goal is one socket per compartment; the toolbox in the rooms reads the same number
const rt={};                                 // runtime state per slot id
for(const s of DECK.slots)rt[s.id]={lit:0,door:0,flash:0,blink:0,charge:0,rv:false,show:0,near:0,bumpT:0,touch:9,pow:0};   // touch: seconds since the token last touched this hatch

/* ---------- state ---------- */
let t=0, shown=new Set();                    // shown: parts the plan has already lit
const cam={x:W/2,y:H/2,z:1};
const scrawled=new Set();                    // doors whose cat-scrawled name has been read
const iv={x:0,y:0};                          // input vector, set by index.html's control()
let tok=null;
let ckOn=false, pulseT=-1, pulseDone=false;  // the cockpit's power-up beat: set once every other socket is lit
let foot=null;                               // the footnote egg, once it has been typed
const FOOT='¹ Cat sat on the blueprint. Filed by Claude Sonnet 5.5 (claude-sonnet-5-5) in Claude Code.';
try{document.fonts.load('13px "Permanent Marker"');}catch(e){}

/* ---------- slot helpers ---------- */
const polyOf=s=>s.poly||[[s.rect.x,s.rect.y],[s.rect.x+s.rect.w,s.rect.y],[s.rect.x+s.rect.w,s.rect.y+s.rect.h],[s.rect.x,s.rect.y+s.rect.h]];
/* door centre on the wall + the normal pointing out of the room, into the atrium */
function doorPos(s){
  const r=s.rect,d=s.door,side=d.side;
  return side==='b'?{x:d.at,y:r.y+r.h,nx:0,ny:1,side}:side==='t'?{x:d.at,y:r.y,nx:0,ny:-1,side}:side==='r'?{x:r.x+r.w,y:d.at,nx:1,ny:0,side}:{x:r.x,y:d.at,nx:-1,ny:0,side};
}
const sockPos=s=>s.sock||{x:s.rect.x+s.rect.w/2,y:s.rect.y+s.rect.h/2,r:14};
/* index of the polygon edge that holds the door */
function edgeOf(s){
  if(s._e!=null)return s._e;
  const P=polyOf(s),r=s.rect,sd=s.door.side;
  const on=p=>sd==='t'?p[1]===r.y:sd==='b'?p[1]===r.y+r.h:sd==='l'?p[0]===r.x:p[0]===r.x+r.w;
  for(let i=0;i<P.length;i++)if(on(P[i])&&on(P[(i+1)%P.length]))return s._e=i;
  return s._e=-1;
}
const built=s=>ROOMS.some(r=>r.id===s.room);
const slotById=id=>DECK.slots.find(o=>o.id===id);
const unmet=s=>(s.needs||[]).some(id=>{const o=slotById(id);return o&&!installed.has(o.part);});
/* the cockpit waits on every other slot whose room exists, not all eight: if fewer rooms ship, the ending still opens.
   (The ending's minimum scope is an open question; see CLAUDE.md.) */
const others=()=>DECK.slots.filter(o=>!o.req&&built(o));
const gated=s=>s.req==='others'&&!(others().length&&others().every(o=>installed.has(o.part)));
const sealed=s=>!built(s)||gated(s)||unmet(s);
const done=s=>installed.has(s.part);
const doorState=s=>sealed(s)?'sealed':done(s)?'done':'open';
const DOOR_COL={sealed:'#ff5a4a',open:'#ffd27a',done:'#7dffb0'};
const DOOR_RGB={sealed:'255,90,74',open:'255,210,122',done:'125,255,176'};
/* the doorway recess: a short pocket in the room, DW wide, POCKET deep */
function pocketRect(s){
  const r=s.rect,d=s.door,h=DW/2;
  return d.side==='b'?rc(d.at-h,r.y+r.h-POCKET,DW,POCKET):d.side==='t'?rc(d.at-h,r.y,DW,POCKET):d.side==='r'?rc(r.x+r.w-POCKET,d.at-h,POCKET,DW):rc(r.x,d.at-h,POCKET,DW);
}
/* the hatch that closes a sealed door, thin, right on the door line */
function hatchRect(s){
  const p=doorPos(s),h=DW/2;
  return p.nx===0?rc(p.x-h-2,p.y-3,DW+4,6):rc(p.x-3,p.y-h-2,6,DW+4);
}
/* where a token stands to read a door: just outside it */
const matCenter=s=>{const p=doorPos(s);return {x:p.x+p.nx*(MAT-6),y:p.y+p.ny*(MAT-6)};};
/* distance out from the door line, and sideways along it */
function doorUV(s,x,y){const p=doorPos(s);return {u:(x-p.x)*p.nx+(y-p.y)*p.ny,v:(x-p.x)*-p.ny+(y-p.y)*p.nx};}

/* ---------- solids: every room rect, minus its doorway pocket ---------- */
const SOL=[];
function carve(R,P){
  const out=[];
  const add=(x,y,w,h)=>{if(w>.01&&h>.01)out.push(rc(x,y,w,h));};
  add(R.x,R.y,P.x-R.x,R.h);                              // left of the pocket
  add(P.x+P.w,R.y,R.x+R.w-P.x-P.w,R.h);                  // right of it
  add(P.x,R.y,P.w,P.y-R.y);                              // above it
  add(P.x,P.y+P.h,P.w,R.y+R.h-P.y-P.h);                  // below it
  return out;
}
for(const s of DECK.slots)for(const q of carve(s.rect,pocketRect(s)))SOL.push(q);

/* ---------- conduits: socket -> door -> bus -> cockpit door ---------- */
const CK=DECK.slots.find(s=>s.req==='others');
/* how "repaired" a compartment looks: its own socket, or (cockpit) a partial glow once it has power */
const lv=s=>{const o=rt[s.id];return s===CK?Math.max(o.lit,.45*o.pow):o.lit;};
const allOthersShown=()=>others().length>0&&others().every(o=>shown.has(o.part));   // same rule as gated(): built rooms only
function buildWires(){
  const cd=doorPos(CK);
  for(const s of DECK.slots){
    if(s===CK){s.wire=[[cd.x,cd.y],[CK.sock.x,CK.sock.y]];}
    else{
      const sk=sockPos(s),d=doorPos(s),bus=(d.side==='b'||d.side==='r')?BUS_T:BUS_B,pts=[[sk.x,sk.y],[d.x,d.y]];
      if(d.side==='r')pts.push([d.x+12,d.y],[d.x+12,bus]);else pts.push([d.x,bus]);
      pts.push([588,bus],[588,cd.y],[cd.x,cd.y]);
      s.wire=pts;
    }
    let len=0;s.wireLen=[0];
    for(let i=1;i<s.wire.length;i++){len+=Math.hypot(s.wire[i][0]-s.wire[i-1][0],s.wire[i][1]-s.wire[i-1][1]);s.wireLen.push(len);}
    s.wireTotal=len;
  }
}
buildWires();
function wirePoint(s,d){
  const w=s.wire,L=s.wireLen;
  for(let i=1;i<w.length;i++)if(d<=L[i]){const u=(d-L[i-1])/((L[i]-L[i-1])||1);return [lerp(w[i-1][0],w[i][0],u),lerp(w[i-1][1],w[i][1],u)];}
  return w[w.length-1];
}
function strokeWire(g,s,u){
  const w=s.wire,end=s.wireTotal*u;g.beginPath();g.moveTo(w[0][0],w[0][1]);
  for(let i=1;i<w.length;i++){
    if(s.wireLen[i]<=end)g.lineTo(w[i][0],w[i][1]);
    else{const p=wirePoint(s,end);g.lineTo(p[0],p[1]);break;}
  }
  g.stroke();
}

/* ---------------------------------------------------------------------
   TOKEN: a brass puck with ears. Not a top-down rig, just enough
   character: ears on springs, a lagging tail, four paws in the rig's
   lateral sequence, a wobble locked to the stride, a winding key.
   --------------------------------------------------------------------- */
const SEG=4.2, TN=6;
const wrapA=a=>{while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a;};
function makeTok(x,y,ang){
  const k={x,y,vx:0,vy:0,ang,sp:0,pv:0,phase:0,idle:0,sit:0,lift:0,key:0,blinkT:2,blink:0,turnCd:0,onTable:false,
    earL:new Spring(0,5,.28),earR:new Spring(0,5,.28),wob:new Spring(0,5.5,.3),tail:[]};
  for(let i=0;i<TN;i++)k.tail.push({x:x-Math.cos(ang)*(10+i*SEG),y:y-Math.sin(ang)*(10+i*SEG)});
  return k;
}
/* ---- mini top-down particles (the rig's FX set is side-view) ---- */
const pf=[];
function sparks(x,y,n,dx,dy){
  n=Math.ceil(n*calmK());
  for(let i=0;i<n;i++)pf.push({x,y,vx:dx*rnd(50,140)+rnd(-60,60),vy:dy*rnd(50,140)+rnd(-60,60),life:0,max:rnd(.2,.45)});
}
function updParticles(dt){
  for(let i=pf.length-1;i>=0;i--){const p=pf[i];p.life+=dt;if(p.life>p.max){pf.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;const d=Math.exp(-4*dt);p.vx*=d;p.vy*=d;}
}
function drawParticles(g){
  if(!pf.length)return;
  g.save();g.globalCompositeOperation='lighter';
  for(const p of pf){const u=p.life/p.max;g.fillStyle=`rgba(255,${210-80*u|0},110,${1-u})`;g.fillRect(p.x-1,p.y-1,2,2);}
  g.restore();
}

/* ---- collision: circle vs the solids ---- */
function pushRect(k,R,slot){
  const cx=clamp(k.x,R.x,R.x+R.w),cy=clamp(k.y,R.y,R.y+R.h),dx=k.x-cx,dy=k.y-cy,d2=dx*dx+dy*dy;
  if(d2>=TR*TR)return;
  let nx,ny,pen;const d=Math.sqrt(d2);
  if(d<1e-4){   // centre inside the rect: leave through the nearest face
    const l=k.x-R.x,r=R.x+R.w-k.x,u=k.y-R.y,b=R.y+R.h-k.y,m=Math.min(l,r,u,b);
    if(m===l){nx=-1;ny=0;pen=l+TR;}else if(m===r){nx=1;ny=0;pen=r+TR;}else if(m===u){nx=0;ny=-1;pen=u+TR;}else{nx=0;ny=1;pen=b+TR;}
  }else{nx=dx/d;ny=dy/d;pen=TR-d;}
  k.x+=nx*pen;k.y+=ny*pen;
  const vn=k.vx*nx+k.vy*ny;
  if(slot)rt[slot.id].touch=0;                // touching it counts as touched (see touchHatch)
  if(vn<0){
    const bounce=slot?1.35:1;                 // a hatch bounces you a little; a wall just slides you
    k.vx-=nx*vn*bounce;k.vy-=ny*vn*bounce;
    if(slot&&-vn>22)bump(slot,k.x-nx*TR,k.y-ny*TR,nx,ny);
  }
}
/* A locked hatch also answers a token that merely passes close to it. Hugging the wall past a door barely touches
   the frame (it stands 3 px proud of the wall), and a hard corner hit flings the cat ~8 px off the wall, so the next
   door could be passed in silence. Within SENSE px of the frame it counts as touched: a fresh touch (none for 0.3 s)
   bumps it, so sliding on to the next door says no again, but standing or pressing there says it once, not repeatedly. */
function touchHatch(s,k){
  const R=hatchRect(s),cx=clamp(k.x,R.x,R.x+R.w),cy=clamp(k.y,R.y,R.y+R.h),dx=k.x-cx,dy=k.y-cy,d=Math.hypot(dx,dy);
  if(d>=TR+SENSE)return;
  const o=rt[s.id],fresh=o.touch>.3;o.touch=0;
  if(fresh)bump(s,cx,cy,d>1e-4?dx/d:0,d>1e-4?dy/d:1);
}
function pushCircle(k,cx,cy,r){
  const dx=k.x-cx,dy=k.y-cy,d=Math.hypot(dx,dy),m=r+TR;if(d>=m)return;
  const nx=d?dx/d:1,ny=d?dy/d:0;k.x=cx+nx*m;k.y=cy+ny*m;
  const vn=k.vx*nx+k.vy*ny;if(vn<0){k.vx-=nx*vn;k.vy-=ny*vn;}
}
function solve(k){
  for(let pass=0;pass<3;pass++){
    for(const R of SOL)pushRect(k,R,null);
    for(const s of DECK.slots)if(sealed(s))pushRect(k,hatchRect(s),s);
    for(const [x,y] of DECK.pillars)pushCircle(k,x,y,7);
  }
  for(const s of DECK.slots)if(sealed(s))touchHatch(s,k);
}
/* a sealed hatch refuses you: lamp blink, sparks, a wobble. The first time, it says why. */
function bump(s,x,y,nx,ny){
  const o=rt[s.id];if(o.bumpT>0)return;
  o.bumpT=.7;o.blink=1;sparks(x,y,6,nx,ny);tok.wob.vel+=8;tok.earL.vel-=6;tok.earR.vel-=6;
  sfx('nuh',{x});                                                  // "nu-uh": once per bump (bumpT above is the debounce), panned to the door
  const why=gated(s)?'gated':s.req?'ckunbuilt':built(s)&&unmet(s)?'needs':'sealed';
  const key=why==='needs'?'hub-needs-'+s.id:'hub-'+why;   // each chained door explains itself once
  if(!seenCaps.has(key)){
    seenCaps.add(key);
    caps.push({text:why==='needs'&&s.lock?s.lock:{gated:'The cockpit needs every other socket lit first.',ckunbuilt:'The cockpit has power. The way in is not built yet.',needs:'Breaker tripped. No power on this one yet.',sealed:'Breaker tripped. No power on this one yet.'}[why],t:0,max:4.2});
  }
}

/* ---- the token's physics + feel ---- */
function stepTok(dt){
  const k=tok,m=Math.hypot(iv.x,iv.y);
  let tx=0,ty=0;if(m>0){tx=iv.x/m*MAXV;ty=iv.y/m*MAXV;}
  let ax=tx-k.vx,ay=ty-k.vy;const al=Math.hypot(ax,ay),lim=ACC*dt;if(al>lim){ax*=lim/al;ay*=lim/al;}
  k.vx+=ax;k.vy+=ay;
  const n=Math.max(1,Math.ceil(Math.hypot(k.vx,k.vy)*dt/4));
  for(let i=0;i<n;i++){k.x+=k.vx*dt/n;k.y+=k.vy*dt/n;solve(k);}
  const sp=Math.hypot(k.vx,k.vy);
  if(sp>30&&k.pv<=30)k.wob.vel-=3;                                   // wind-up: a little crouch
  if(sp<20&&k.pv>=60){k.wob.vel+=4;k.earL.vel+=3;k.earR.vel+=3;}     // settle on stopping
  k.pv=k.sp=sp;
  // heading follows velocity; a hard reversal flicks the ears
  const want=sp>15?Math.atan2(k.vy,k.vx):(m>0?Math.atan2(iv.y,iv.x):k.ang),dA=wrapA(want-k.ang);
  k.ang+=dA*(1-Math.exp(-11*dt));
  k.turnCd-=dt;if(Math.abs(dA)>2.3&&k.turnCd<=0&&sp>20){k.turnCd=.5;k.earL.vel-=7;k.earR.vel-=7;k.wob.vel+=3;}
  k.phase+=sp*dt/26;k.key+=(1.4+sp*.07)*dt*(1-k.sit*.8);
  // idle: after a beat it sits into a loaf, ears twitch now and then
  const still=sp<8&&m===0;k.idle=still?k.idle+dt:0;k.sit=damp(k.sit,k.idle>1.2?1:0,4,dt);
  if(still&&Math.random()<dt*.5)(Math.random()<.5?k.earL:k.earR).vel-=6;
  k.blinkT-=dt;if(k.blinkT<0){k.blink=1;k.blinkT=rnd(2,5);}k.blink=Math.max(0,k.blink-dt*7);
  // the plot table is a low step: catbot gets up on it
  const T_=DECK.table;k.onTable=Math.hypot(k.x-T_.x,k.y-T_.y)<T_.r-6;k.lift=damp(k.lift,k.onTable?1:0,9,dt);
  k.earL.step(0,dt);k.earR.step(0,dt);k.wob.step(0,dt);
  // tail: follow-the-leader behind the rump, curled round the flank when sitting
  const hx=Math.cos(k.ang),hy=Math.sin(k.ang),wag=Math.sin(t*(3+sp*.02))*(sp>10?1.2:2.2);
  const root=k.tail[0];root.x=k.x-hx*10;root.y=k.y-hy*10;
  for(let i=1;i<TN;i++){
    const p=k.tail[i],q=k.tail[i-1];
    p.x+=-hy*wag*.18*i*dt*10;p.y+=hx*wag*.18*i*dt*10;
    let dx=p.x-q.x,dy=p.y-q.y;const d=Math.hypot(dx,dy)||1;p.x=q.x+dx/d*SEG;p.y=q.y+dy/d*SEG;
    if(k.sit>.01){
      const th=Math.PI-i*.4,lx=-2+11.5*Math.cos(th),ly=9.2*Math.sin(th);
      const cx=k.x+hx*lx-hy*ly,cy=k.y+hy*lx+hx*ly;
      p.x=lerp(p.x,cx,k.sit*.9);p.y=lerp(p.y,cy,k.sit*.9);
    }
  }
}
function drawToken(g){
  const k=tok;if(!k)return;
  const lift=k.lift,sit=k.sit,spn=clamp(k.sp/100,0,1);
  // shadow, same upper-left light as the rooms; the table lifts it away
  softEllipse(g,k.x+3+4*lift,k.y+4+5*lift,14+3*lift,11+3*lift,.42-.12*lift);
  // tail (world space), under the body
  // tapered, with a lazy sideways wave that settles when it sits
  const hx=Math.cos(k.ang),hy=Math.sin(k.ang),wv=(k.sp<10?1.5:.8)*(1-.85*sit);
  const tp=k.tail.map((p,i)=>{const o=Math.sin(t*3.2-i*.9)*i*.38*wv;return [p.x-hy*o,p.y-3*lift+hx*o];});
  g.save();g.lineCap='round';g.lineJoin='round';
  for(const [col,add] of [[OL,1.9],['#d29f4a',0]]){
    g.strokeStyle=col;
    for(let i=1;i<TN;i++){g.lineWidth=3.7-i*.3+add;g.beginPath();g.moveTo(tp[i-1][0],tp[i-1][1]);g.lineTo(tp[i][0],tp[i][1]);g.stroke();}
  }
  const te=tp[TN-1];g.beginPath();g.arc(te[0],te[1],1.9,0,TAU);g.fillStyle='#c3673d';g.fill();g.lineWidth=.8;g.strokeStyle=OL;g.stroke();
  g.restore();
  // body: wobble = stride-locked squash + roll, plus the settle spring
  const ph=k.phase*TAU,sq=.055*Math.sin(2*ph)*spn+.13*k.wob.v,roll=.06*Math.sin(ph)*spn;
  g.save();g.translate(k.x,k.y-3*lift);g.rotate(k.ang+roll);
  const sc=1+.08*lift;g.scale(sc*(1+sq),sc*(1-sq));
  // paws: lateral sequence, tucked away when sitting
  const amp=3.2*spn*(1-sit),legs=[[-6,6.2,0],[6,6.2,.25],[-6,-6.2,.5],[6,-6.2,.75]];
  g.fillStyle='#8c5b22';g.strokeStyle=OL;g.lineWidth=.8;
  for(const [lx,ly,off] of legs){g.beginPath();g.arc(lx+amp*Math.sin(TAU*(k.phase+off)),ly*(1-.4*sit),2.3,0,TAU);g.fill();g.stroke();}
  // body shell. Its highlight stays upper-left in the world while it turns.
  const [hlx,hly]=rot(-3.5,-3.5,-(k.ang+roll));
  const rx=11-1.4*sit,ry=8+1.2*sit,bg=g.createRadialGradient(hlx,hly,1,0,0,13);
  bg.addColorStop(0,'#ffe3a0');bg.addColorStop(.55,'#d29f4a');bg.addColorStop(1,'#8c5b22');
  g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);g.fillStyle=bg;g.fill();g.lineWidth=1.4;g.strokeStyle=OL;g.stroke();
  g.strokeStyle='rgba(74,46,16,.55)';g.lineWidth=1;g.beginPath();g.moveTo(-rx+2,0);g.lineTo(rx-3,0);g.moveTo(-4,-ry+1.2);g.lineTo(-4,ry-1.2);g.moveTo(2,-ry+.8);g.lineTo(2,ry-.8);g.stroke();
  // core + winding key
  g.beginPath();g.arc(-1.5,0,2.4,0,TAU);g.fillStyle='#5fd0ff';g.fill();g.lineWidth=.8;g.strokeStyle=OL;g.stroke();
  g.save();g.translate(-6.5,0);g.rotate(k.key);g.strokeStyle='#c9ced4';g.lineWidth=1.5;g.beginPath();g.moveTo(-3.4,0);g.lineTo(3.4,0);g.stroke();
  for(const sx of [-3.4,3.4]){g.beginPath();g.arc(sx,0,1.6,0,TAU);g.fillStyle='#8d939b';g.fill();g.lineWidth=.8;g.strokeStyle=OL;g.stroke();}
  g.restore();
  // head + ears
  const hb=g.createRadialGradient(hlx*.3+10,hly*.3,1,10,0,7);hb.addColorStop(0,'#ffe3a0');hb.addColorStop(.6,'#d29f4a');hb.addColorStop(1,'#8c5b22');
  for(const [s,sp_] of [[1,k.earL],[-1,k.earR]]){
    g.save();g.translate(8.6,s*4.4);g.rotate(sp_.v*s*.3+sit*.35*s);
    g.beginPath();g.moveTo(-3.4,-2.2*s);g.lineTo(3.6,-2.2*s);g.lineTo(2.6,8.4*s);g.closePath();g.fillStyle='#d29f4a';g.fill();g.lineWidth=1.1;g.lineJoin='round';g.strokeStyle=OL;g.stroke();
    g.beginPath();g.moveTo(-1.4,.4*s);g.lineTo(2,.4*s);g.lineTo(1.9,5.8*s);g.closePath();g.fillStyle='#c3673d';g.fill();
    g.restore();
  }
  g.beginPath();g.arc(10,0,6.3,0,TAU);g.fillStyle=hb;g.fill();g.lineWidth=1.3;g.strokeStyle=OL;g.stroke();
  // eyes: two small amber lamps on the leading edge; shut when it sits
  const open=(1-clamp(sit*1.6,0,1))*(1-k.blink);
  g.fillStyle='#ffd27a';
  for(const s of [1,-1]){
    if(open>.15){g.beginPath();g.ellipse(14.2,s*2.7,1.45,1.45*open,0,0,TAU);g.fill();}
    else{g.strokeStyle=OL;g.lineWidth=1;g.beginPath();g.moveTo(13.4,s*2.7);g.lineTo(15,s*2.7);g.stroke();}
  }
  g.beginPath();g.arc(16.3,0,.9,0,TAU);g.fillStyle='#c3673d';g.fill();
  g.restore();
}

/* ---------------------------------------------------------------------
   DRAW: the plan
   --------------------------------------------------------------------- */
const hexRGB=h=>{const n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];};
const mix=(a,b,k)=>`rgb(${lerp(a[0],b[0],k)|0},${lerp(a[1],b[1],k)|0},${lerp(a[2],b[2],k)|0})`;
const COL={roomOff:hexRGB('#0f1722'),roomOn:hexRGB('#2a2016'),lineOff:hexRGB('#4fa6c9'),lineOn:hexRGB('#d6a54e')};
const HULL=(()=>{
  const p=new Path2D();p.moveTo(10,84);p.lineTo(44,16);p.lineTo(580,16);p.bezierCurveTo(660,16,714,100,714,170);p.lineTo(714,236);
  p.bezierCurveTo(714,306,660,390,580,390);p.lineTo(44,390);p.lineTo(10,322);p.closePath();return p;
})();
function polyPath(g,P){g.beginPath();P.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();}
function label(g,txt,x,y,font,col,align){
  g.save();g.font=font;g.fillStyle=col;g.textAlign=align||'left';
  if('letterSpacing' in g)g.letterSpacing='1.5px';
  g.fillText(txt,x,y);g.restore();
}

function drawBackdrop(g){
  g.fillStyle='#080b10';g.fillRect(-20,-20,W+40,H+40);
  const rg=g.createRadialGradient(W/2,H/2,40,W/2,H/2,W*.62);rg.addColorStop(0,'#101a26');rg.addColorStop(1,'#080b10');
  g.fillStyle=rg;g.fillRect(-20,-20,W+40,H+40);
  g.lineWidth=1;
  for(let x=0;x<=W;x+=20){g.strokeStyle=x%100?'rgba(95,208,255,.04)':'rgba(95,208,255,.08)';g.beginPath();g.moveTo(x+.5,0);g.lineTo(x+.5,H);g.stroke();}
  for(let y=0;y<=H;y+=20){g.strokeStyle=y%100?'rgba(95,208,255,.04)':'rgba(95,208,255,.08)';g.beginPath();g.moveTo(0,y+.5);g.lineTo(W,y+.5);g.stroke();}
}
function drawHull(g){
  g.fillStyle='rgba(12,18,26,.88)';g.fill(HULL);
  g.lineWidth=2.5;g.strokeStyle='rgba(95,208,255,.5)';g.stroke(HULL);
  g.lineWidth=1;g.strokeStyle='rgba(95,208,255,.18)';g.stroke(HULL);
}
function drawAtrium(g){
  const a=DECK.atrium,T_=DECK.table;
  g.fillStyle='#0f1620';g.fillRect(a.x,a.y,a.w,a.h);
  g.strokeStyle='rgba(214,165,78,.1)';g.lineWidth=1;g.setLineDash([6,6]);
  g.beginPath();g.arc(T_.x,T_.y,T_.r+26,0,TAU);g.stroke();
  g.beginPath();g.moveTo(a.x+16,T_.y);g.lineTo(T_.x-T_.r-34,T_.y);g.moveTo(T_.x+T_.r+34,T_.y);g.lineTo(a.x+a.w-16,T_.y);g.stroke();
  g.setLineDash([]);
}
function drawRoomFill(g,s){
  const L=lv(s),P=polyOf(s),r=s.rect;
  polyPath(g,P);g.fillStyle=mix(COL.roomOff,COL.roomOn,L);g.fill();
  if(L>.02){
    g.save();polyPath(g,P);g.clip();g.globalCompositeOperation='lighter';
    softEllipse(g,r.x+r.w/2,r.y+r.h/2,Math.max(r.w,r.h)*.7,Math.max(r.w,r.h)*.55,.17*L*(.92+.08*Math.sin(t*2+r.x)),'255,180,80');
    g.restore();
  }
}
/* faint floor art in each compartment: a preview of what's inside. Under everything else, a little animated. */
const hr=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};   // deterministic scatter
function drawGlyph(g,s){
  const r=s.rect,L=lv(s),cx=r.x+r.w/2,a=.13+.07*L;
  const ink=`rgba(${lerp(95,214,L)|0},${lerp(208,165,L)|0},${lerp(255,78,L)|0},${a})`;
  g.save();polyPath(g,polyOf(s));g.clip();g.lineWidth=1;g.strokeStyle=ink;g.fillStyle=ink;
  switch(s.id){
    case 'aft-hold':        // two crates and the recess
      g.strokeRect(r.x+14,r.y+r.h-44,24,24);g.beginPath();g.moveTo(r.x+14,r.y+r.h-44);g.lineTo(r.x+38,r.y+r.h-20);g.moveTo(r.x+38,r.y+r.h-44);g.lineTo(r.x+14,r.y+r.h-20);g.stroke();
      g.strokeRect(r.x+46,r.y+r.h-36,16,16);
      g.setLineDash([3,3]);g.strokeRect(r.x+r.w-44,r.y+22,30,14);g.setLineDash([]);
      break;
    case 'engine':{         // belts that run against you, and a vent that breathes on a timer
      const off=(t*16)%14;
      for(const yy of [r.y+36,r.y+60])for(let x=r.x-14-off;x<r.x+r.w+14;x+=14){g.beginPath();g.moveTo(x+3,yy-4);g.lineTo(x,yy);g.lineTo(x+3,yy+4);g.stroke();}
      const vx=r.x+r.w-26,vy=r.y+r.h-30,sp=Math.max(0,Math.sin(t*1.7));
      g.beginPath();g.arc(vx,vy,6,0,TAU);g.stroke();
      g.globalCompositeOperation='lighter';softEllipse(g,vx,vy-12*sp,10,10,.14*sp,'235,240,245');
      break;}
    case 'galley':          // trays, and one cucumber
      for(let i=0;i<5;i++){const x=r.x+12+hr(i)*(r.w-56),y=r.y+22+hr(i+9)*(r.h-62);g.beginPath();g.roundRect(x,y,22,12,3);g.stroke();}
      g.fillStyle=`rgba(125,255,176,${a+.1})`;g.beginPath();g.ellipse(r.x+r.w-26,r.y+r.h-32,9,4.5,.5,0,TAU);g.fill();
      break;
    case 'observation':     // a window, and stars that twinkle in it
      g.lineWidth=2;g.beginPath();g.arc(cx+24,r.y-22,58,.2*Math.PI,.8*Math.PI);g.stroke();g.lineWidth=1;
      for(let i=0;i<9;i++){g.globalAlpha=.5+.5*Math.sin(t*2+i*2.3);g.fillRect(r.x+r.w*.4+hr(i+20)*(r.w*.55),r.y+4+hr(i+30)*30,1.4,1.4);}
      break;
    case 'berthing':{       // two bunks, and a light that sweeps the floor
      g.strokeRect(r.x+12,r.y+14,28,44);g.strokeRect(r.x+r.w-40,r.y+14,28,44);
      const ang=-Math.PI/2+Math.sin(t*.9)*.95,len=78,ax=cx,ay=r.y+r.h-4,lg=g.createRadialGradient(ax,ay,2,ax,ay,len);
      g.globalCompositeOperation='lighter';lg.addColorStop(0,'rgba(255,240,200,.16)');lg.addColorStop(1,'rgba(255,240,200,0)');
      g.fillStyle=lg;g.beginPath();g.moveTo(ax,ay);g.arc(ax,ay,len,ang-.26,ang+.26);g.closePath();g.fill();
      break;}
    case 'hydroponics':     // planters; one of them is the catnip
      for(const [x,y,c] of [[r.x+24,r.y+26,0],[r.x+r.w-26,r.y+30,0],[r.x+r.w-34,r.y+r.h-26,1]]){
        g.beginPath();g.arc(x,y,8,0,TAU);g.stroke();
        for(let i=0;i<5;i++){const q=i/5*TAU+t*.2;g.beginPath();g.ellipse(x+Math.cos(q)*5,y+Math.sin(q)*5,3.5,1.6,q,0,TAU);g.stroke();}
        if(c){g.fillStyle=`rgba(125,255,176,${a+.1})`;g.beginPath();g.arc(x,y,3,0,TAU);g.fill();}
      }
      break;
    case 'sanitation':      // sand, and a trail of paw prints
      for(let i=0;i<34;i++)g.fillRect(r.x+8+hr(i+40)*(r.w-16),r.y+8+hr(i+70)*(r.h-16),1.1,1.1);
      for(let i=0;i<4;i++){const x=r.x+r.w-26-i*24,y=r.y+r.h-46-(i%2)*10;g.beginPath();g.arc(x,y,2.6,0,TAU);g.fill();for(const dx of [-3.6,0,3.6]){g.beginPath();g.arc(x+dx,y-4.6,1.3,0,TAU);g.fill();}}
      break;
    case 'cockpit':         // the console following the nose, two screens, the pilot's chair
      g.beginPath();g.moveTo(644,122);g.lineTo(678,152);g.lineTo(678,254);g.lineTo(644,284);g.stroke();
      g.strokeRect(655,166,14,9);g.strokeRect(655,231,14,9);
      g.beginPath();g.arc(618,203,8,0,TAU);g.stroke();g.beginPath();g.arc(618,203,13,Math.PI*.6,Math.PI*1.4,true);g.stroke();
      break;
  }
  g.restore();
}
function drawWires(g){
  let lit=0,n=0;
  for(const s of DECK.slots)if(s!==CK){lit+=rt[s.id].lit;n++;}
  const trunk=lit/n;
  for(const s of DECK.slots){
    const u=s===CK?trunk:rt[s.id].lit;
    g.lineCap='round';g.lineJoin='round';
    g.strokeStyle='rgba(95,208,255,.12)';g.lineWidth=1.6;strokeWire(g,s,1);
    if(u<=.01)continue;
    g.strokeStyle='rgba(95,208,255,.55)';g.lineWidth=1.6;strokeWire(g,s,u);
    g.save();g.globalCompositeOperation='lighter';
    const run=s.wireTotal*u;
    for(let i=0;i<Math.max(2,Math.round(s.wireTotal/60));i++){
      const d=((t*55+i*60)%s.wireTotal);if(d>run)continue;
      const p=wirePoint(s,d);softEllipse(g,p[0],p[1],8,8,.5,'95,208,255');
    }
    g.restore();
  }
  // the unlock beat: one bright pulse runs down every conduit to the cockpit
  if(pulseT>=0){
    const u=clamp(pulseT/1.4,0,1);
    g.save();g.globalCompositeOperation='lighter';
    for(const s of others())if(shown.has(s.part)){const p=wirePoint(s,s.wireTotal*u);softEllipse(g,p[0],p[1],15,15,.9,'190,255,255');}   // only the conduits that carry power
    g.restore();
  }
  g.lineCap='butt';
}
function drawWalls(g,s){
  const L=lv(s),P=polyOf(s),e=edgeOf(s),dp=doorPos(s),h=DW/2,line=mix(COL.lineOff,COL.lineOn,L);
  g.strokeStyle=line;g.lineWidth=2.5;g.lineCap='square';g.beginPath();
  for(let i=0;i<P.length;i++){
    const a=P[i],b=P[(i+1)%P.length];
    if(i!==e){g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);continue;}
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]),ex=(b[0]-a[0])/len,ey=(b[1]-a[1])/len,tc=(dp.x-a[0])*ex+(dp.y-a[1])*ey;
    g.moveTo(a[0],a[1]);g.lineTo(a[0]+ex*(tc-h),a[1]+ey*(tc-h));
    g.moveTo(a[0]+ex*(tc+h),a[1]+ey*(tc+h));g.lineTo(b[0],b[1]);
  }
  g.stroke();g.lineCap='butt';
  // the doorway recess: a short pocket into the room (local +x points into the room)
  g.save();g.translate(dp.x,dp.y);g.rotate(Math.atan2(-dp.ny,-dp.nx));
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,-h,POCKET,DW);
  g.strokeStyle=line;g.lineWidth=1.6;g.beginPath();g.moveTo(0,-h);g.lineTo(POCKET,-h);g.lineTo(POCKET,h);g.lineTo(0,h);g.stroke();
  g.restore();
}
/* the floor mat in front of a door: chevrons point at it. Stand still on it and it tells you what's inside. */
function drawMat(g,s){
  const dp=doorPos(s),o=rt[s.id],pr=clamp(1-o.near/90,0,1);
  g.save();g.translate(dp.x,dp.y);g.rotate(Math.atan2(dp.ny,dp.nx));   // local +x points out into the atrium
  g.fillStyle=`rgba(214,165,78,${.04+.07*pr})`;g.fillRect(3,-DW/2-5,MAT,DW+10);
  g.strokeStyle=`rgba(214,165,78,${.1+.25*pr})`;g.lineWidth=1.3;
  for(let i=0;i<3;i++){const x0=7+i*9;g.beginPath();g.moveTo(x0+4,-6);g.lineTo(x0,0);g.lineTo(x0+4,6);g.stroke();}
  if(o.charge>0){
    g.beginPath();g.arc(MAT/2+3,0,10,-Math.PI/2,-Math.PI/2+TAU*o.charge);g.lineWidth=2.4;g.strokeStyle='#7dffb0';g.lineCap='round';g.stroke();
  }
  g.restore();
}
function drawDoor(g,s){
  const dp=doorPos(s),ds=doorState(s),o=rt[s.id],h=DW/2,tx=-dp.ny,ty=dp.nx;
  g.save();g.translate(dp.x,dp.y);g.rotate(Math.atan2(ty,tx));
  // leaves slide into the posts as the door opens
  const ll=h*(1-o.door);
  g.fillStyle=ds==='sealed'?'#4a2a2a':'#4b5059';g.strokeStyle=OL;g.lineWidth=1;
  if(ll>.5){
    g.fillRect(-h,-2.5,ll,5);g.strokeRect(-h,-2.5,ll,5);
    g.fillRect(h-ll,-2.5,ll,5);g.strokeRect(h-ll,-2.5,ll,5);
    if(ds==='sealed'){g.fillStyle='#d6a54e';for(let i=0;i<4;i++){const x=-h+3+i*(DW-6)/3;g.fillRect(x-1,-1,2,2);}}
  }
  g.fillStyle='#2a2e35';g.strokeStyle='#8c5b22';g.lineWidth=1;
  for(const x of [-h,h]){g.fillRect(x-2.5,-4,5,8);g.strokeRect(x-2.5,-4,5,8);}
  g.restore();
  // status lamp, just beside the door on the wall line (flares when a sealed hatch is bumped)
  const lx=dp.x+tx*(h+10),ly=dp.y+ty*(h+10);
  g.beginPath();g.arc(lx,ly,3.5+1.2*o.blink,0,TAU);g.fillStyle=DOOR_COL[ds];g.fill();g.strokeStyle=OL;g.lineWidth=1;g.stroke();
  g.save();g.globalCompositeOperation='lighter';softEllipse(g,lx,ly,15+10*o.blink,15+10*o.blink,.32+.08*Math.sin(t*3+dp.x)+.5*o.blink,DOOR_RGB[ds]);g.restore();
}
function yarnBall(g,x,y,r,a){
  g.beginPath();g.arc(x,y,r,0,TAU);
  const gr=g.createRadialGradient(x-r*.3,y-r*.4,r*.12,x,y,r);gr.addColorStop(0,'#f07a8c');gr.addColorStop(1,'#8e2c40');
  g.fillStyle=gr;g.fill();g.lineWidth=1.4;g.strokeStyle=OL;g.stroke();
  g.save();g.beginPath();g.arc(x,y,r-1,0,TAU);g.clip();g.translate(x,y);g.rotate(a);
  g.strokeStyle='rgba(255,200,210,.55)';g.lineWidth=1;
  for(let i=-3;i<=3;i++){g.beginPath();g.ellipse(0,0,r*1.05,Math.abs(i)*r*.27+1,i*.3,0,TAU);g.stroke();}
  g.restore();
}
function drawSocket(g,s){
  const sk=sockPos(s),L=rt[s.id].lit,r=sk.r||14,yarn=s===CK;
  g.save();g.translate(sk.x,sk.y);
  if(L<.98){
    g.globalAlpha=1-L;
    g.setLineDash([3,3.5]);g.strokeStyle='rgba(95,208,255,.7)';g.lineWidth=1.4;g.beginPath();g.arc(0,0,r+4,0,TAU);g.stroke();g.setLineDash([]);
    if(yarn){g.strokeStyle='rgba(95,208,255,.4)';g.lineWidth=1;g.beginPath();g.arc(0,0,r*.55,0,TAU);g.stroke();g.beginPath();g.arc(0,0,r*.2,0,TAU);g.stroke();}
    else{const gp=gearPath(r*.62,9);g.fillStyle='rgba(95,208,255,.13)';g.fill(gp,'evenodd');g.lineWidth=1;g.strokeStyle='rgba(95,208,255,.55)';g.stroke(gp);}
    g.globalAlpha=1;
  }
  if(L>.02){
    g.globalAlpha=L;
    g.strokeStyle='#d6a54e';g.lineWidth=1.6;g.beginPath();g.arc(0,0,r+4,0,TAU);g.stroke();
    if(yarn)yarnBall(g,0,0,r,t*.5);else disc(g,0,0,r,NEAR,t*.4+sk.x,false);
    g.globalAlpha=1;
    g.globalCompositeOperation='lighter';softEllipse(g,0,0,r*2.4,r*2.4,.2*L*(.8+.2*Math.sin(t*2.4+sk.x)),'255,200,110');
  }
  // power-up flash: a ring leaves the socket as the part seats
  const fl=rt[s.id].flash*calmK();
  if(fl>.01){
    g.globalCompositeOperation='lighter';softEllipse(g,0,0,r*4,r*4,.7*fl,'255,225,150');
    g.globalCompositeOperation='source-over';g.strokeStyle=`rgba(255,227,160,${.8*fl})`;g.lineWidth=2*fl+.5;
    g.beginPath();g.arc(0,0,r+4+(1-rt[s.id].flash)*46,0,TAU);g.stroke();
  }
  g.restore();
}
function drawLabels(g,s){
  const r=s.rect,ds=doorState(s),top=s.door.side==='t',L=lv(s);
  const ink=`rgba(${lerp(130,230,L)|0},${lerp(200,190,L)|0},${lerp(225,120,L)|0},.9)`;
  const lx=s===CK?r.x+10:r.x+9,ly=top?r.y+r.h-20:r.y+16;
  const scr=s.scrawl&&scrawled.has(s.id);
  if(scr){
    // someone has been at the sign with a marker
    g.save();g.font='600 10px Oswald,sans-serif';if('letterSpacing' in g)g.letterSpacing='1.5px';
    const w=g.measureText(s.label).width;g.fillStyle='rgba(130,200,225,.4)';g.fillText(s.label,lx,ly);
    g.strokeStyle='#e8b65a';g.lineWidth=1.8;g.lineCap='round';g.beginPath();g.moveTo(lx-2,ly-2.5);g.quadraticCurveTo(lx+w/2,ly-5.5,lx+w+3,ly-3);g.stroke();
    g.translate(lx+w+8,ly+2);g.rotate(-.07);g.font='13px "Permanent Marker",cursive';if('letterSpacing' in g)g.letterSpacing='0px';
    g.fillStyle='#f0c070';g.fillText(s.scrawl,0,0);g.restore();
  }else label(g,s.label,lx,ly,'600 10px Oswald,sans-serif',ink);
  const stx=ds==='sealed'?'SEALED':ds==='done'?'ONLINE':'OPEN';
  label(g,stx,lx,ly+10,'600 7px Oswald,sans-serif',`rgba(${DOOR_RGB[ds]},.6)`);
}
function drawPillars(g){
  for(const [x,y] of DECK.pillars){
    g.beginPath();g.arc(x,y,7,0,TAU);const gr=g.createRadialGradient(x-2,y-2,1,x,y,7);gr.addColorStop(0,'#8d939b');gr.addColorStop(1,'#3b3f45');
    g.fillStyle=gr;g.fill();g.lineWidth=1.2;g.strokeStyle=OL;g.stroke();
  }
}
function count(){let n=0;for(const s of DECK.slots)if(shown.has(s.part))n++;return n;}
function drawTable(g){
  const T_=DECK.table,n=count(),N=DECK.slots.length,f=n/N;
  g.save();g.translate(T_.x,T_.y);
  g.beginPath();g.arc(0,0,T_.r,0,TAU);g.fillStyle='#121a25';g.fill();g.lineWidth=3;g.strokeStyle='#8c5b22';g.stroke();
  g.beginPath();g.arc(0,0,T_.r-2,Math.PI*.9,Math.PI*1.45);g.lineWidth=1.5;g.strokeStyle='rgba(255,227,160,.55)';g.stroke();
  g.lineWidth=5;g.strokeStyle='rgba(95,208,255,.16)';g.beginPath();g.arc(0,0,T_.r-9,0,TAU);g.stroke();
  if(f>0){
    const gr=g.createLinearGradient(-T_.r,0,T_.r,0);gr.addColorStop(0,'#5fd0ff');gr.addColorStop(1,'#7dffb0');
    g.strokeStyle=gr;g.lineCap='round';g.beginPath();g.arc(0,0,T_.r-9,-Math.PI/2,-Math.PI/2+TAU*f);g.stroke();g.lineCap='butt';
  }
  g.textAlign='center';
  g.font='600 7px Oswald,sans-serif';g.fillStyle='rgba(214,165,78,.8)';g.fillText('REPAIR',0,-7);
  g.font='600 15px Oswald,sans-serif';g.fillStyle='#efe6d2';g.fillText(`${Math.round(f*100)}%`,0,7);
  g.font='400 8px Inter,sans-serif';g.fillStyle='rgba(239,230,210,.6)';g.fillText(`${n} of ${N}`,0,18);
  g.restore();
}
/* the drawing's own furniture: a title block in the dead hull above the aft hold, a legend below */
function drawFurniture(g){
  label(g,'DECK PLAN',24,40,'600 12px Oswald,sans-serif','rgba(214,165,78,.85)');
  g.font='400 8px Inter,sans-serif';g.fillStyle='rgba(239,230,210,.45)';g.fillText('SHUTTLE  ·  REV. A',24,54);
  g.fillStyle='rgba(239,230,210,.6)';g.fillText(`SOCKETS LIT  ${count()} / ${DECK.slots.length}`,24,72);
  const rows=[['empty','EMPTY SOCKET'],['lit','PART IN PLACE'],['sealed','SEALED DOOR']];
  rows.forEach(([k,txt],i)=>{
    const y=338+i*17,x=32;
    g.save();g.translate(x,y);
    if(k==='empty'){g.setLineDash([2,2.5]);g.strokeStyle='rgba(95,208,255,.7)';g.lineWidth=1.2;g.beginPath();g.arc(0,0,5.5,0,TAU);g.stroke();}
    else if(k==='lit'){disc(g,0,0,5.5,NEAR,0,false);}
    else{g.beginPath();g.arc(0,0,3.2,0,TAU);g.fillStyle=DOOR_COL.sealed;g.fill();}
    g.restore();
    g.font='400 8px Inter,sans-serif';g.fillStyle='rgba(239,230,210,.5)';g.textAlign='left';g.fillText(txt,46,y+3);
  });
}
/* what's behind a door, read off its mat: a small tag out in the atrium */
function drawHints(g){
  const a=DECK.atrium;
  for(const s of DECK.slots){
    const o=rt[s.id];if(o.show<.03)continue;
    const dp=doorPos(s);
    g.save();g.globalAlpha=o.show;g.font='400 9.5px Inter,sans-serif';
    const tw=g.measureText(s.hint).width,pw=tw+18,ph=18;
    const cx=clamp(dp.x+dp.nx*(MAT+14+pw/2*Math.abs(dp.nx)),a.x+6+pw/2,a.x+a.w-6-pw/2),cy=clamp(dp.y+dp.ny*(MAT+14),a.y+6+ph/2,a.y+a.h-6-ph/2);
    g.fillStyle='rgba(8,12,18,.92)';g.strokeStyle='rgba(214,165,78,.55)';g.lineWidth=1;
    g.beginPath();g.roundRect(cx-pw/2,cy-ph/2,pw,ph,4);g.fill();g.stroke();
    g.fillStyle='#efe6d2';g.textAlign='center';g.fillText(s.hint,cx,cy+3.4);
    g.restore();
  }
}
function drawPlan(g){
  drawBackdrop(g);
  drawHull(g);
  drawAtrium(g);
  for(const s of DECK.slots)drawRoomFill(g,s);
  for(const s of DECK.slots)drawGlyph(g,s);
  drawWires(g);
  for(const s of DECK.slots)drawWalls(g,s);
  for(const s of DECK.slots)drawSocket(g,s);
  for(const s of DECK.slots)drawLabels(g,s);
  for(const s of DECK.slots)drawMat(g,s);
  drawPillars(g);
  drawTable(g);
  for(const s of DECK.slots)drawDoor(g,s);
  drawFurniture(g);
  drawToken(g);
  drawParticles(g);
  drawHints(g);
  drawFoot(g);
}
/* EGG: park catbot on the plot table and it sits on the blueprint, the way a cat sits on whatever you're
   reading. A footnote types itself into the drawing's bottom margin (never over the REPAIR readout). */
function startFoot(){
  ctx.save();ctx.font='500 9.5px Inter,sans-serif';
  const xs=[];let w=0;for(const ch of FOOT){xs.push(w);w+=ctx.measureText(ch).width;}
  ctx.restore();
  foot={t:0,gone:0,xs,w};
  console.log('%c'+FOOT,'color:#5fd0ff');
}
function drawFoot(g){
  if(!foot)return;
  const f=foot,fade=1-clamp((f.gone-4.8)/1.2,0,1);if(fade<=0)return;
  const T_=DECK.table,x0=W/2-f.w/2,y=401;
  g.save();g.textAlign='left';
  g.globalAlpha=clamp(f.t/.4,0,1)*fade;g.font='600 13px Inter,sans-serif';g.fillStyle='#ffd27a';g.fillText('¹',T_.x+T_.r*.78,T_.y-T_.r*.78);   // the marker, beside the table
  g.font='500 9.5px Inter,sans-serif';g.shadowColor='rgba(120,190,255,.8)';g.shadowBlur=5;g.fillStyle='rgb(215,232,255)';
  for(let i=0;i<FOOT.length;i++){const a=clamp((f.t-.3-i*.03)/.2,0,1)*fade;if(a<=0)break;g.globalAlpha=a;g.fillText(FOOT[i],x0+f.xs[i],y);}
  const n=Math.floor((f.t-.3)/.03);   // a cursor while it types
  if(n>=0&&n<FOOT.length&&Math.sin(f.t*14)>0){g.globalAlpha=fade;g.shadowBlur=0;g.fillRect(x0+f.xs[n],y-8,1.2,10);}
  g.restore();
}

/* ---------------------------------------------------------------------
   PUBLIC
   --------------------------------------------------------------------- */
const on=()=>MODES.includes(mode);
/* arriving from a room: the camera starts on that compartment and pulls out to the whole plan,
   catbot walks out of the door onto its mat, then every part that went in since the last visit
   lights its socket, one after another */
const ZOUT=1.3;                              // seconds for the pull-out
const focus=s=>({x:s.rect.x+s.rect.w/2,y:s.rect.y+s.rect.h/2,z:Math.min(W/(s.rect.w+10),H/(s.rect.h+10))});
let arrive=9, from=null, pend=[], matAt=null;
const hasNew=()=>DECK.slots.some(s=>installed.has(s.part)&&!shown.has(s.part));   // a part went in that the plan hasn't shown yet
function enter(fromId,opt){
  const f=DECK.slots.find(s=>s.room===fromId||s.id===fromId),fs=f||DECK.slots[0],dp=doorPos(fs);
  document.body.classList.add('hub');
  modeT=0;arrive=0;from=f?focus(f):null;iv.x=iv.y=0;pf.length=0;
  cam.x=W/2;cam.y=H/2;cam.z=1;
  matAt=matCenter(fs);
  const ang=Math.atan2(dp.ny,dp.nx);
  if(!f||(opt&&opt.snap)){                   // dev entry: land fully lit on the mat, no beat
    mode='hub';arrive=9;from=null;pend=[];
    tok=makeTok(matAt.x,matAt.y,ang);
    shown=new Set(installed);ckOn=allOthersShown();
    for(const s of DECK.slots){const o=rt[s.id];o.lit=shown.has(s.part)?1:0;o.door=sealed(s)?0:.6;o.pow=s===CK&&ckOn?1:0;}
    return;
  }
  mode='hubin';
  tok=makeTok(dp.x-dp.nx*14,dp.y-dp.ny*14,ang);   // inside the doorway, about to walk out
  pend=DECK.slots.filter(s=>installed.has(s.part)&&!shown.has(s.part)).map((s,i)=>({s,at:ZOUT+.25+i*.55}));
  Object.assign(cam,from);
}
function lightUp(s){
  shown.add(s.part);rt[s.id].flash=1;
  if(!ckOn&&allOthersShown()){ckOn=true;pulseT=0;pulseDone=false;}   // that was the last one: the cockpit gets its beat
  // say it once, on the last socket of this batch, and not at all when the cockpit's own line is about to take over
  if(!seenCaps.has('hub-first')&&pend.length<=1&&!allOthersShown()){
    seenCaps.add('hub-first');
    caps.push({text:`${count()} of ${DECK.slots.length} sockets lit. The rest of the plan is still dark.`,t:0,max:4.6});
  }
}
/* through a door: catbot walks on in, the camera zooms onto that compartment (the cutaway), the screen
   fades near the end, and the room comes up from above with catbot dropping in on its feet */
const ZIN=1.0;                               // seconds for the zoom into a compartment
let goS=null, goT=0, goFired=false, goTo=null, goCam=null;
function go(s){
  const dp=doorPos(s),f=focus(s);
  mode='hubgo';modeT=0;goS=s;goT=0;goFired=false;
  goCam={x:f.x,y:f.y,z:Math.min(f.z,3.6)};
  goTo={x:dp.x-dp.nx*(POCKET-11),y:dp.y-dp.ny*(POCKET-11)};
}
function intoRoom(s){
  const i=ROOMS.findIndex(r=>r.id===s.room);
  document.body.classList.remove('hub');
  iv.x=iv.y=0;zoom=1;
  loadRoom(i);                               // resets the room and puts catbot at the room's start
  mode='play';modeT=0;
  camY=-46;                                  // camera starts above the deck and settles (index.html eases camY to 0)
  rig.jump(0,0);rig.y+=60;                   // and catbot drops the last bit: the rig lands it with dust and a thud
}
/* index.html's control() hands over the (latch-filtered) direction every tick */
function ctrl(dx,dy){iv.x=dx;iv.y=dy;}
function update(dt){
  dt=Math.min(dt,1/30);
  t+=dt;arrive+=dt;
  if(mode==='hubin'){
    const u=seg(arrive,0,ZOUT);
    cam.x=lerp(from.x,W/2,u);cam.y=lerp(from.y,H/2,u);cam.z=lerp(from.z,1,u);
    // catbot walks itself out onto the mat; no input until the camera is home
    const dx=matAt.x-tok.x,dy=matAt.y-tok.y,d=Math.hypot(dx,dy);
    iv.x=d>5?dx/d:0;iv.y=d>5?dy/d:0;
    if(arrive>=ZOUT){mode='hub';modeT=0;cam.x=W/2;cam.y=H/2;cam.z=1;}
  }
  if(mode==='hubgo'){
    goT+=dt;const u=easeIO(clamp(goT/ZIN,0,1));
    cam.x=lerp(W/2,goCam.x,u);cam.y=lerp(H/2,goCam.y,u);cam.z=lerp(1,goCam.z,u);
    const dx=goTo.x-tok.x,dy=goTo.y-tok.y,d=Math.hypot(dx,dy);   // no input: catbot walks itself in
    iv.x=d>4?dx/d:0;iv.y=d>4?dy/d:0;
    if(goT>=.7&&!goFired){const s=goS;fadeTo(()=>intoRoom(s));goFired=fadeDir>0;}
  }
  if(tok)stepTok(dt);
  for(let i=pend.length-1;i>=0;i--)if(arrive>=pend[i].at){lightUp(pend[i].s);pend.splice(i,1);}
  if(pulseT>=0){
    pulseT+=dt;
    if(pulseT>=1.4&&!pulseDone){pulseDone=true;rt[CK.id].flash=1;caps.push({text:others().length===DECK.slots.length-1?'Every other socket is lit. The cockpit has power.':'Every working room is back on line. The cockpit has power.',t:0,max:4.8});}
    if(pulseT>2.4)pulseT=-1;
  }
  // egg: 8 s of sitting on the plot table files a footnote; it lingers while catbot stays, fades ~6 s after it leaves
  if(foot){foot.t+=dt;foot.gone=tok.onTable&&tok.idle>.3?0:foot.gone+dt;if(foot.gone>6)foot=null;}
  else if(mode==='hub'&&tok.onTable&&tok.idle>8)startFoot();
  if(arrive>=ZOUT+.3&&!seenCaps.has('hub-move')){
    seenCaps.add('hub-move');
    caps.push({text:'Walk to a door. Stand still on its mat to see what is behind it.',t:0,max:4.8});
  }
  const k=tok,still=k&&k.sp<25&&mode==='hub';
  for(const s of DECK.slots){
    const o=rt[s.id],tg=shown.has(s.part)?1:0,dp=doorPos(s);
    o.lit+=clamp(tg-o.lit,-dt*1.2,dt*1.2);
    o.pow=damp(o.pow,s===CK&&ckOn?1:0,2.5,dt);
    o.flash=Math.max(0,o.flash-dt*1.6);o.blink=Math.max(0,o.blink-dt*2);o.bumpT=Math.max(0,o.bumpT-dt);o.touch+=dt;
    // the door: ajar at rest, open as catbot comes near, shut and red when sealed
    o.near=k?Math.hypot(k.x-dp.x,k.y-dp.y):999;
    o.door=damp(o.door,sealed(s)?0:o.near<72?1:.6,6,dt);
    // the mat: stand still on it and it reads out
    const {u,v}=k?doorUV(s,k.x,k.y):{u:-1,v:99},onMat=u>=2&&u<=MAT&&Math.abs(v)<=DW/2+5;
    if(onMat&&still&&!o.rv){
      o.charge=Math.min(1,o.charge+dt/.7);
      if(o.charge>=1){o.rv=true;if(s.scrawl)scrawled.add(s.id);k.wob.vel+=3;}
    }else if(!onMat){o.rv=false;o.charge=Math.max(0,o.charge-dt*3);}
    else if(!o.rv)o.charge=Math.max(0,o.charge-dt*3);
    o.show=damp(o.show,o.rv&&onMat?1:0,10,dt);
    // far enough into an open doorway: that's the room
    if(mode==='hub'&&!sealed(s)&&-u>SILL&&Math.abs(v)<DW/2)go(s);
  }
  updParticles(dt);
}
function render(g){
  g.setTransform(S,0,0,S,0,0);
  g.fillStyle='#05070b';g.fillRect(0,0,W,H);
  g.save();g.translate(W/2,H/2);g.scale(cam.z,cam.z);g.translate(-cam.x,-cam.y);
  drawPlan(g);
  g.restore();
  g.setTransform(S,0,0,S,0,0);
}
return {on,enter,ctrl,update,render,hasNew,DECK,cam,tok:()=>tok};
})();

/* dev entry: index.html#hub  (optional  &parts=hip,engine ) skips the opening and lands in the hub */
if(/(^|[#&])hub\b/.test(location.hash)){
  const m=/parts=([\w,-]+)/.exec(location.hash);
  if(m)for(const id of m[1].split(','))installed.add(id);
  OPEN.finish(false);
  HUB.enter(null);
}
