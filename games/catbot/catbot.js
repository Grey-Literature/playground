'use strict';
/* =====================================================================
   CATBOT RIG: procedural 2D character, side view, brass & copper.
   Rig made with Claude Opus 5.5 (claude-opus-5-5) in Claude Code.
   Shared by the game (index.html) and the dev pose picker (catbot-rig.html).
   Layers:  game/scene -> ctrl (intent)  ->  Catbot.update (physics)  ->  drawCat
   World units: px, y-down on screen; the rig itself thinks in a y-up
   local frame whose origin is the root on the ground under the body.
   Pages supply W, H, the canvases and the loop; this file only needs GY.
   GY is the main deck. A cat standing on something higher has rig.fl = its height above GY (setFloor).
   ===================================================================== */
const TAU=Math.PI*2, DEG=Math.PI/180;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const seg=(t,a,b)=>smooth((t-a)/(b-a));
const lin=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const rnd=(a,b)=>a+Math.random()*(b-a);
const damp=(cur,tgt,rate,dt)=>cur+(tgt-cur)*(1-Math.exp(-rate*dt));
const rot=(x,y,a)=>{const c=Math.cos(a),s=Math.sin(a);return [x*c-y*s,x*s+y*c];};
const easeIO=t=>t<.5?2*t*t:1-2*(1-t)*(1-t);

class Spring{
  constructor(v,f,z){this.v=v;this.vel=0;this.f=f;this.z=z;}
  step(tg,dt){const w=TAU*this.f;this.vel+=(w*w*(tg-this.v)-2*this.z*w*this.vel)*dt;this.v+=this.vel*dt;return this.v;}
}

/* ---------- ground + shadow projection ---------- */
const GY=302;                          // ground contact line (screen px)
const SK=.55, SS=.17;                  // shadow projection: light from upper-left-front

/* ---------- palette ---------- */
const OL='#22150a';
function shade(hex,k){const n=parseInt(hex.slice(1),16);const f=v=>Math.min(255,v*k)|0;return `rgb(${f((n>>16)&255)},${f((n>>8)&255)},${f(n&255)})`;}
function pal(k){const s=h=>shade(h,k);return{bL:s('#ffe3a0'),b:s('#d29f4a'),bD:s('#8c5b22'),bX:s('#4a2e10'),cL:s('#f2a47a'),c:s('#c3673d'),cD:s('#6a2a13'),stL:s('#c9ced4'),st:s('#8d939b'),stD:s('#3b3f45'),cr:s('#f4ead6'),crD:s('#cdb894')};}
const NEAR=pal(1), FARP=pal(.58);
const BR=P=>[P.bL,P.b,P.bD], STC=P=>[P.stL,P.st,P.stD];

/* ---------- drawing primitives ---------- */
function limb(c,ax,ay,bx,by,w1,w2,cols,lw=1.4){
  const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,a=Math.atan2(dy,dx);
  c.beginPath();
  c.moveTo(ax+nx*w1/2,ay+ny*w1/2);c.lineTo(bx+nx*w2/2,by+ny*w2/2);
  c.arc(bx,by,w2/2,a+Math.PI/2,a-Math.PI/2,true);
  c.lineTo(ax-nx*w1/2,ay-ny*w1/2);
  c.arc(ax,ay,w1/2,a-Math.PI/2,a+Math.PI/2,true);
  c.closePath();
  const g=c.createLinearGradient(ax-nx*w1/2,ay-ny*w1/2,ax+nx*w1/2,ay+ny*w1/2);
  g.addColorStop(0,cols[0]);g.addColorStop(.4,cols[1]);g.addColorStop(1,cols[2]);
  c.fillStyle=g;c.fill();c.lineWidth=lw;c.strokeStyle=OL;c.stroke();
}
const GP={};
function gearPath(r,n){
  const k=r.toFixed(1)+'_'+n; if(GP[k])return GP[k];
  const p=new Path2D(), ri=r*.74;
  for(let i=0;i<n;i++){
    const A=[[ri,i],[r,i+.18],[r,i+.48],[ri,i+.66]];
    for(const [rr,u] of A){const a=u/n*TAU;(i===0&&u===i?p.moveTo:p.lineTo).call(p,Math.cos(a)*rr,Math.sin(a)*rr);}
  }
  p.closePath(); p.moveTo(r*.3,0); p.arc(0,0,r*.3,0,TAU,true);
  return GP[k]=p;
}
function gear(c,x,y,r,n,ang,fill){
  c.save();c.translate(x,y);c.rotate(ang);const p=gearPath(r,n);
  c.fillStyle=fill;c.fill(p,'evenodd');c.lineWidth=.8;c.strokeStyle=OL;c.stroke(p);c.restore();
}
function bolt(c,x,y,r,P){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=P.stD;c.fill();c.lineWidth=.8;c.strokeStyle=OL;c.stroke();c.beginPath();c.arc(x-r*.3,y+r*.3,r*.35,0,TAU);c.fillStyle=P.stL;c.fill();}
function disc(c,x,y,r,P,ang,cop){
  c.save();c.translate(x,y);
  const g=c.createRadialGradient(-r*.35,r*.35,r*.1,0,0,r);
  g.addColorStop(0,cop?P.cL:P.bL);g.addColorStop(.55,cop?P.c:P.b);g.addColorStop(1,cop?P.cD:P.bD);
  c.beginPath();c.arc(0,0,r,0,TAU);c.fillStyle=g;c.fill();c.lineWidth=1.5;c.strokeStyle=OL;c.stroke();
  c.beginPath();c.arc(0,0,r*.74,0,TAU);c.strokeStyle=cop?P.cD:P.bD;c.lineWidth=1.1;c.stroke();
  gear(c,0,0,r*.56,9,ang,cop?P.b:P.c);
  c.beginPath();c.arc(0,0,r*.17,0,TAU);c.fillStyle=P.stD;c.fill();
  c.restore();
}
function softEllipse(g,x,y,rx,ry,a,rgb='8,5,3'){
  if(a<=.004)return;
  g.save();g.translate(x,y);g.scale(1,ry/rx);
  const gr=g.createRadialGradient(0,0,0,0,0,rx);gr.addColorStop(0,`rgba(${rgb},${a})`);gr.addColorStop(1,`rgba(${rgb},0)`);
  g.fillStyle=gr;g.beginPath();g.arc(0,0,rx,0,TAU);g.fill();g.restore();
}

/* =====================================================================
   RIG
   ===================================================================== */
const L=92, HIPH=58, SHH=62;           // spine length, standing hip/shoulder heights
const FU=25, FL=25, HT=24, HS=24;      // front upper/lower, hind thigh/shin
const TSEG=9, TN=11;                   // tail segment length, points
const G=2600, TG=2600;                 // gravity (px/s²): a heavy brass cat
const DEF={
  vx:0,accel:260,face:0,kin:null,
  height:1,crouch:0,pitch:0,sit:0,colF:0,colH:0,hipLift:0,hipDrop:0,
  headPitch:0,headYaw:.35,headTilt:0,headDrop:0,headFwd:0,
  earL:0,earR:0,earFlick:true,squint:0,lid:.14,lidTilt:.35,happy:0,pupil:.45,lookX:.2,lookY:0,mouth:0,blink:true,
  tailBase:162,tailCurve:-9,tailTip:-16,tailStiff:1,wagAmp:3,wagFreq:1.1,wagTip:0,tipFreq:2.5,
  energy:1,flicker:0,keySpin:null,claws:0,strain:0,
  gaitRate:1,gaitHz:0,duty:0,lift:1,weight:1,slip:0,belt:0,hindReach:0,frontReach:0,stepDust:0,
  bodyFreq:3.2,tuck:0,limp:0,pawFront:0,manual:null
};
function freshCtrl(){const c=Object.assign({},DEF);c.manual={};return c;}

function ik(ax,ay,bx,by,l1,l2,sg){
  const dx=bx-ax,dy=by-ay;let d=Math.hypot(dx,dy);d=clamp(d,Math.abs(l1-l2)+.01,l1+l2-.01);
  const a=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)), b=Math.atan2(dy,dx)+sg*a;
  return {x:ax+Math.cos(b)*l1,y:Math.max(1.5,ay+Math.sin(b)*l1)};
}

class Catbot{
  constructor(){
    // lateral-sequence walk: near-hind, near-fore, far-hind, far-fore, 25% apart.
    // trot offsets pair the diagonals.
    this.legs=[
      {id:'HN',hind:1,near:1,off:0,  tr:0},
      {id:'FN',hind:0,near:1,off:.25,tr:.5},
      {id:'HF',hind:1,near:0,off:.5, tr:.5},
      {id:'FF',hind:0,near:0,off:.75,tr:1}
    ];
    this.tail=[];for(let i=0;i<TN;i++)this.tail.push({x:0,y:0,px:0,py:0});
    this.earL=new Spring(0,4.5,.26);this.earR=new Spring(0,4.5,.26);
    this.hOx=new Spring(0,3.4,.4);this.hOy=new Spring(0,3.4,.32);
    this.hA=new Spring(0,3,.5);this.tilt=new Spring(0,2.4,.45);
    this.events=[];this.c=freshCtrl();
    this.hipGear=1;                    // 0 = near hip socket empty (the game's first missing part)
    this.reset(200);
  }
  leg(id){return this.legs.find(l=>l.id===id);}
  reset(x){
    Object.assign(this,{x,vx:0,bv:0,fl:0,ax:0,facing:1,y:(HIPH+SHH)/2,vy:0,th:Math.asin((SHH-HIPH)/L),thv:0,air:false,phase:0,turnT:-1,t:0,
      E:1,key:0,keyV:1,gear:0,blinkT:2.5,blinkP:-1,flk:1,coreI:1,lid:.14,lidTilt:.35,happy:0,pupil:.45,lookX:.2,lookY:0,yaw:.35,mouth:0,
      claws:0,strain:0,squint:0,meta:0,ts:1,trx:0,try:0,hyPrev:0,headDown:false});
    for(const s of [this.earL,this.earR,this.hOx,this.hOy,this.tilt]){s.v=0;s.vel=0;}
    this.hA.v=this.th*.45;this.hA.vel=0;
    this.c=freshCtrl();this.body();
    for(const lg of this.legs){lg.planted=true;lg.sw=0;lg.fy=0;lg.pang=0;lg.manualOn=false;lg.cyc=null;lg.fx=this.x+this.facing*this.nLocal(lg);}
    const R=this.tailRest(this.c);
    this.tail.forEach((p,i)=>{p.x=p.px=this.x+R[i].x;p.y=p.py=R[i].y;});
    this.headPos(0);this.hyPrev=this.hy;
    this.solve();
  }
  body(){
    const c=Math.cos(this.th),s=Math.sin(this.th),y=this.y;
    const bp=(bx,by)=>({x:bx*c-by*s,y:y+bx*s+by*c});
    this.bp=bp;
    this.hipJ=bp(-L/2+2,-8);this.shJ=bp(L/2-4,-10);
    this.neck=bp(L/2+8,13);this.tailB=bp(-L/2-18,9);
    this.core=bp(60,-2);this.keyP=bp(-6,36);
  }
  nLocal(lg){const c=this.c;return lg.hind?this.hipJ.x-3+c.hindReach:this.shJ.x+3+c.frontReach;}
  nX(lg){return this.x+this.facing*this.nLocal(lg);}
  footErr(lg){return (lg.fx-this.nX(lg))*this.facing;}
  toWorld(p){return {x:this.x+this.facing*this.ts*(p.x+this.trx),y:GY-this.fl-(p.y+this.try)};}
  /* the floor under it changes height (a platform, or walking off one). Everything the rig keeps is measured up from
     its own floor, so shift it all by the difference: the cat stays exactly where it is in the world. fall=true also
     lets go of the ground (walked off an edge). */
  setFloor(nf,fall){
    const dy=this.fl-nf;if(!dy)return;
    this.fl=nf;this.y+=dy;this.hyPrev+=dy;
    for(const lg of this.legs){lg.fy+=dy;if(lg.sy!=null)lg.sy+=dy;}
    for(const p of this.tail){p.y+=dy;p.py+=dy;}
    if(fall&&!this.air){this.air=true;this.vy=Math.min(this.vy,0);for(const lg of this.legs)if(!lg.manualOn)lg.planted=false;}
  }
  /* the muzzle, in world px: where a carried thing sits (there's no jaw, so it's held in front of the chin) */
  mouthP(){const fx=4+10*this.yaw,[mx,my]=rot(fx+3,-14,this.hA.v+this.tilt.v);return this.toWorld({x:this.hx+mx,y:this.hy+my});}
  emit(k,mag,p){this.events.push({k,mag,x:p.x,y:p.y});}
  startSwing(lg,dur){lg.planted=false;lg.sw=0;lg.dur=dur;lg.sx=lg.fx;lg.sy=lg.fy;}
  forceStep(id,dur=.2){const lg=this.leg(id);if(lg.planted&&!lg.manualOn)this.startSwing(lg,dur);}
  pairBusy(lg){return this.legs.some(o=>o!==lg&&o.hind===lg.hind&&!o.planted&&!o.manualOn);}
  jump(vy,vx){if(this.air)return;this.air=true;this.vy=vy;this.vx=vx;for(const lg of this.legs)if(!lg.manualOn)lg.planted=false;}
  flip(){
    this.facing*=-1;const X=this.x;
    for(const lg of this.legs){lg.fx=2*X-lg.fx;lg.sx=2*X-(lg.sx??lg.fx);}
    for(const p of this.tail){p.x=2*X-p.x;p.px=2*X-p.px;}
  }
  land(){
    this.air=false;
    for(const lg of this.legs)if(!lg.manualOn){lg.planted=true;lg.fy=0;lg.sw=0;lg.pang=0;}
    this.hOy.vel+=this.vy*.35;
    this.emit('land',-this.vy,{x:this.x,y:GY-this.fl});
  }
  footfall(lg,speed,c){
    const lame=lg.id==='HN'?c.limp:0;    // the bad leg lands hard: a hitch you can see in the body
    const J=(8+speed*.33)*c.weight*(1+lame*1.2);
    this.vy-=J;this.thv+=(lg.hind?1:-1)*J/L*.6;this.hOy.vel-=J*.45;
    this.emit('foot',J,{x:lg.fx,y:GY-this.fl-(lg.near?0:6)});     // every plant, at any speed: the sound layer's footstep ('step' below is the dust cue and only fires at trot or with stepDust)
    if(c.stepDust||speed>150)this.emit('step',J,{x:lg.fx,y:GY-this.fl-(lg.near?0:6)});
    // and the empty socket grinds on the axle: a nose-down hitch and sparks at the hip
    if(lame>.3){this.thv-=.35*lame;this.hOy.vel-=12*lame;this.emit('grind',lame,this.toWorld(this.hipJ));}
  }
  tailRest(c){
    const pts=[{x:this.tailB.x,y:this.tailB.y}];let x=this.tailB.x,y=this.tailB.y,a=c.tailBase*DEG+this.th;
    for(let i=1;i<TN;i++){
      const fr=i/(TN-1);
      a+=c.tailCurve*DEG+(i>=TN-3?c.tailTip*DEG:0);
      const w=Math.sin(this.t*c.wagFreq*TAU-i*.55)*c.wagAmp*DEG*fr*1.6+(i>=TN-4?Math.sin(this.t*c.tipFreq*TAU)*c.wagTip*DEG:0);
      x+=Math.cos(a+w)*TSEG;y+=Math.sin(a+w)*TSEG;pts.push({x,y});
    }
    return pts;
  }
  headPos(dt){
    const c=this.c,n=this.neck;
    let [hx,hy]=rot(14+c.headFwd,15-c.headDrop,this.th*.6);
    hx+=n.x;hy+=n.y;
    const ox=dt?this.hOx.step(0,dt):0, oy=dt?this.hOy.step(0,dt):0;
    this.hx=hx+clamp(ox,-8,8);this.hy=hy+clamp(oy,-10,10);
    // chin on the floor: one thud on contact, then it just rests there
    if(this.hy<20){
      if(dt&&!this.headDown&&(this.hy-this.hyPrev)/dt<-90)this.emit('headthud',Math.min(400,-(this.hy-this.hyPrev)/dt),this.toWorld({x:this.hx+4,y:0}));
      this.headDown=true;this.hy=20;this.hOy.vel=Math.max(0,this.hOy.vel);
    }else this.headDown=false;
    this.hyPrev=this.hy;
  }

  update(dt,c){
    this.c=c;this.t+=dt;
    /* --- turn: a turnstile squash; feet and tail mirror at the midpoint --- */
    if(c.face&&c.face!==this.facing&&this.turnT<0&&!this.air&&Math.abs(this.vx)<25)this.turnT=0;
    if(this.turnT>=0){const p=this.turnT;this.turnT+=dt/.36;if(p<.5&&this.turnT>=.5)this.flip();if(this.turnT>=1)this.turnT=-1;}
    this.ts=this.turnT>=0?Math.max(.12,Math.abs(Math.cos(Math.PI*this.turnT))):1;

    /* --- horizontal: heavy inertia, limited acceleration --- */
    const pvx=this.vx;
    if(!this.air){
      if(c.kin!=null)this.vx=c.kin;
      else{const tv=this.turnT>=0?0:c.vx,a=c.accel*dt;this.vx+=clamp(tv-this.vx,-a,a);}
    }
    /* a moving floor (c.belt, px/s): vx stays catbot's own pace over the floor, the floor adds to it.
       So gait, trot and idle all read the cat's own effort, and standing still on a belt is being carried. */
    const pbv=this.bv||0;this.bv=this.air?0:c.belt||0;
    this.x+=(this.vx+this.bv)*dt;
    this.ax=damp(this.ax,(this.vx-pvx)/dt,8,dt);
    this.hOx.vel-=(this.vx-pvx+this.bv-pbv)*this.facing*.22;   // stepping on or off a belt lurches the head like a change of pace

    /* --- body: hip & shoulder targets -> root height + pitch springs --- */
    let hipT=HIPH*c.height-c.crouch*24+c.hipLift, shT=SHH*c.height-c.crouch*18;
    hipT=lerp(hipT,21,c.sit);shT=lerp(shT,68,c.sit);
    hipT=lerp(hipT,16,c.colH);shT=lerp(shT,14,c.colF);
    hipT-=c.hipDrop;
    const yT=(hipT+shT)/2;
    const thT=Math.asin(clamp((shT-hipT)/L,-.95,.95))+c.pitch+clamp(this.ax*this.facing*.00035,-.14,.14);
    const w=TAU*c.bodyFreq;
    if(this.air){
      this.vy-=G*dt;this.y+=this.vy*dt;
      if(this.vy<0&&this.y<=yT)this.land();
    }else{
      this.vy+=(w*w*(yT-this.y)-2*.48*w*this.vy)*dt;this.y+=this.vy*dt;
    }
    const wt=w*1.05;this.thv+=(wt*wt*(thT-this.th)-2*.5*wt*this.thv)*dt;this.th+=this.thv*dt;
    // the hull can't pass through the floor
    const yMin=16*Math.cos(this.th)+58*Math.abs(Math.sin(this.th))+1;
    if(this.y<yMin){
      if(this.vy<-70)this.emit('thud',-this.vy,this.toWorld({x:this.th>.2?-52:0,y:0}));
      this.y=yMin;if(this.vy<0)this.vy*=-.12;
    }
    this.body();

    /* --- gait --- */
    const speed=Math.abs(this.vx), stride=clamp(34+speed*.42,34,120);
    let f=Math.max(speed/stride,.9)*c.gaitRate; if(c.gaitHz)f=c.gaitHz;
    const tb=clamp((speed-115)/60,0,1), duty=c.duty||lerp(.62,.46,tb);
    this.phase+=f*dt;
    this.meta=damp(this.meta,Math.max(c.sit,c.colH),6,dt);
    for(const lg of this.legs){
      const nX=this.nX(lg), man=c.manual[lg.id];
      if(man){
        lg.manualOn=true;lg.planted=false;lg.sw=0;const r=man.rate??16;
        lg.fx=damp(lg.fx,man.x,r,dt);lg.fy=damp(lg.fy,man.y,r,dt);lg.pang=damp(lg.pang,man.ang||0,12,dt);continue;
      }
      if(lg.manualOn){lg.manualOn=false;if(lg.fy>.5&&!this.air)this.startSwing(lg,.22);else if(!this.air){lg.planted=true;lg.fy=0;}}
      if(this.air){
        const j=lg.hind?this.hipJ:this.shJ,k=c.tuck;
        const lx=j.x+(lg.hind?-9-k*4:11-k*9), ly=j.y+(lg.hind?-38+k*17:-40+k*19);
        lg.fx=damp(lg.fx,this.x+this.facing*lx,14,dt);lg.fy=Math.max(0,damp(lg.fy,ly,14,dt));lg.pang=damp(lg.pang,-.5,10,dt);lg.planted=false;continue;
      }
      const off=lerp(lg.off,lg.tr,tb), cyc=Math.floor(this.phase+off-duty);
      if(lg.cyc==null)lg.cyc=cyc;
      if(cyc!==lg.cyc){
        lg.cyc=cyc;
        if(lg.planted&&f>0){const err=Math.abs(lg.fx-nX);if(speed>4||err>4||c.gaitHz)this.startSwing(lg,clamp((1-duty)/f,.07,.45)*(lg.id==='HN'?1+.3*c.limp:1));}
      }
      if(lg.planted){
        if(c.slip)lg.fx+=this.vx*dt*c.slip;
        if(this.bv)lg.fx+=this.bv*dt;     // planted on a belt: the foot rides it (walk against one and it's a treadmill)
        if(Math.abs(lg.fx-nX)>10+stride*.55&&!this.pairBusy(lg))this.startSwing(lg,.2);
      }else{
        lg.sw+=dt/lg.dur;const sw0=Math.min(1,lg.sw);let sw=sw0,e=easeIO(sw0);
        if(lg.id==='HN'&&c.limp>0){
          // missing teeth: the bad leg doesn't swing, it ratchets. Four jerks
          // forward with dead holds between them, like a gear skipping.
          const n=4,u=sw0*n,k=Math.min(n-1,Math.floor(u)),q=(k+smooth((u-k)/.3))/n;
          e=lerp(e,q,c.limp);sw=lerp(sw0,q,c.limp);
        }
        const stance=Math.min(duty/Math.max(f,.01),.6);
        const lead=c.gaitHz?7*this.facing:this.vx*stance*.5;
        const tx=nX+(this.vx+(this.bv||0))*(1-sw)*lg.dur+lead;
        lg.fx=lerp(lg.sx,tx,e);
        const lift=(5+Math.min(speed,170)*.07)*c.lift*(lg.id==='HN'?1-.8*c.limp:1)+(c.gaitHz?2:0);
        lg.fy=lg.sy*(1-e)+lift*Math.sin(Math.PI*Math.pow(sw,.85));
        lg.pang=-.6*Math.sin(Math.PI*sw)*Math.min(1,lift/6);
        if((c.lift<.5||(lg.id==='HN'&&c.limp>.3))&&lg.fy<2.5&&Math.random()<dt*25)this.emit('scuff',1,{x:lg.fx,y:GY-this.fl-(lg.near?0:6)});
        if(lg.sw>=1){lg.planted=true;lg.fy=0;lg.fx=tx;lg.pang=0;this.footfall(lg,speed,c);}
      }
    }
    this.solve();

    /* --- head, ears, face --- */
    this.headPos(dt);
    this.hA.step(this.th*.45+c.headPitch,dt);this.tilt.step(c.headTilt,dt);
    if(c.earFlick&&Math.random()<dt*.3)(Math.random()<.5?this.earL:this.earR).vel+=rnd(-12,12);
    this.earL.step(c.earL*DEG,dt);this.earR.step(c.earR*DEG,dt);
    this.lid=damp(this.lid,c.lid,14,dt);this.lidTilt=damp(this.lidTilt,c.lidTilt,6,dt);
    this.happy=damp(this.happy,c.happy,10,dt);this.squint=damp(this.squint,c.squint,16,dt);this.pupil=damp(this.pupil,c.pupil,6,dt);
    this.lookX=damp(this.lookX,c.lookX,9,dt);this.lookY=damp(this.lookY,c.lookY,9,dt);
    this.yaw=damp(this.yaw,c.headYaw,5,dt);this.mouth=damp(this.mouth,c.mouth,8,dt);
    this.blinkT-=dt;
    if(this.blinkT<0&&c.blink&&this.blinkP<0){this.blinkP=0;this.blinkT=rnd(2.2,5);}
    if(this.blinkP>=0){this.blinkP+=dt/.16;if(this.blinkP>=1)this.blinkP=-1;}
    const bl=this.blinkP>=0?1-Math.abs(this.blinkP*2-1):0;
    this.lidEff=Math.max(this.lid,bl);

    /* --- energy, key, gears, core --- */
    this.E=damp(this.E,c.energy,4,dt);
    if(c.flicker>0&&Math.random()<dt*14*c.flicker)this.flk=Math.random()<.55?.08:1;else this.flk=damp(this.flk,1,8,dt);
    this.keyV=damp(this.keyV,c.keySpin??(1+speed*.03),5,dt);this.key+=this.keyV*dt;
    this.gear+=(.5+speed*.035+c.strain*9)*Math.max(this.E,.04)*dt;
    this.coreI=Math.max(0,this.E*(.8+.2*Math.sin(this.t*2.6))*this.flk);
    this.strain=damp(this.strain,c.strain,8,dt);this.claws=damp(this.claws,c.claws,14,dt);
    this.trx=Math.sin(this.t*71)*this.strain*.9;this.try=Math.cos(this.t*53)*this.strain*.6;

    /* --- tail: verlet chain pulled toward a rest curve, under gravity --- */
    const R=this.tailRest(c), T=this.tail;
    T[0].x=this.x+this.facing*R[0].x;T[0].y=R[0].y;
    for(let i=1;i<TN;i++){
      const p=T[i],vx=(p.x-p.px)*.994,vy=(p.y-p.py)*.994;
      p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy-TG*dt*dt;
      const k=clamp(c.tailStiff*(.15-.0085*i),0,.5);
      p.x+=(this.x+this.facing*R[i].x-p.x)*k;p.y+=(R[i].y-p.y)*k;
      const q=T[i-1],dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1;
      p.x=q.x+dx/d*TSEG;p.y=q.y+dy/d*TSEG;
      if(p.y<3){const v=p.y-p.py;p.y=3;p.py=p.y+v*.35;p.px=lerp(p.px,p.x,.4);}
    }
  }
  tailFlick(power=3){for(let i=TN-4;i<TN;i++){this.tail[i].py-=power*(i-TN+5)/4;}}

  /* --- IK: feet (world) -> joints (local) --- */
  solve(){
    const m=this.meta;
    for(const lg of this.legs){
      const F={x:(lg.fx-this.x)*this.facing,y:lg.fy};
      if(lg.hind){
        const J=this.hipJ;
        let [mx,my]=rot(lerp(-5,-19,m),lerp(18,3,m),lg.pang*.5);
        let Hx=F.x+mx,Hy=F.y+my+2;
        const dx=Hx-J.x,dy=Hy-J.y,d=Math.hypot(dx,dy),R=HT+HS-.5;
        if(d>R){Hx=J.x+dx/d*R;Hy=J.y+dy/d*R;F.x=Hx-mx;F.y=Hy-my-2;}
        lg.J=J;lg.K=ik(J.x,J.y,Hx,Hy,HT,HS,1);lg.H={x:Hx,y:Hy};lg.P=F;
      }else{
        const J=this.shJ;
        let [ox,oy]=rot(-3,7,lg.pang);
        let Wx=F.x+ox,Wy=F.y+oy;
        const dx=Wx-J.x,dy=Wy-J.y,d=Math.hypot(dx,dy),R=FU+FL-.5;
        if(d>R){Wx=J.x+dx/d*R;Wy=J.y+dy/d*R;F.x=Wx-ox;F.y=Wy-oy;}
        lg.J=J;lg.K=ik(J.x,J.y,Wx,Wy,FU,FL,-1);lg.H={x:Wx,y:Wy};lg.P=F;
      }
    }
  }
}

/* =====================================================================
   DRAW THE CAT  (local frame: y-up, facing +x)
   ===================================================================== */
function paw(c,x,y,ang,P,claws){
  c.save();c.translate(x,y);c.rotate(ang);
  c.beginPath();c.ellipse(2.5,4.3,8.5,4.6,0,0,TAU);
  const g=c.createLinearGradient(0,9,0,0);g.addColorStop(0,P.cr);g.addColorStop(1,P.crD);
  c.fillStyle=g;c.fill();c.lineWidth=1.3;c.strokeStyle=OL;c.stroke();
  c.strokeStyle=P.crD;c.lineWidth=.9;
  for(const tx of [4,7,9.5]){c.beginPath();c.moveTo(tx,1.2);c.lineTo(tx-.6,4.6);c.stroke();}
  if(claws>.04){
    c.fillStyle='#eef3f8';c.strokeStyle=OL;c.lineWidth=.7;
    for(let k=0;k<3;k++){
      const bx=9.5-k*1.4,by=1.4+k*1.9,L=5*claws;
      c.beginPath();c.moveTo(bx,by+1.3);c.quadraticCurveTo(bx+L*.9,by+1.2,bx+L,by-L*.55);c.quadraticCurveTo(bx+L*.4,by-.2,bx,by-.3);c.closePath();c.fill();c.stroke();
    }
  }
  c.restore();
}
/* an empty hip: rim, sheared tooth stubs, a bare axle */
function socket(c,x,y,r,P){
  c.save();c.translate(x,y);
  c.beginPath();c.arc(0,0,r,0,TAU);c.fillStyle=P.bD;c.fill();c.lineWidth=1.5;c.strokeStyle=OL;c.stroke();
  const g=c.createRadialGradient(r*.25,-r*.25,0,0,0,r*.8);g.addColorStop(0,'#07040a');g.addColorStop(1,'#2e1c0c');
  c.beginPath();c.arc(0,0,r*.78,0,TAU);c.fillStyle=g;c.fill();
  c.fillStyle=P.bX;for(const a of [.4,1.9,3.3,4.6,5.6]){c.save();c.rotate(a);c.fillRect(r*.6,-1.7,r*.2,3.4);c.restore();}
  c.beginPath();c.arc(0,0,r*.2,0,TAU);c.fillStyle=P.stL;c.fill();c.lineWidth=.8;c.strokeStyle=OL;c.stroke();
  c.restore();
}
function drawLeg(c,lg,P,r){
  const {J,K,H,P:F}=lg;
  if(lg.hind){
    limb(c,J.x,J.y,K.x,K.y,17,12,BR(P));
    const dx=H.x-K.x,dy=H.y-K.y,l=Math.hypot(dx,dy)||1,nx=-dy/l*5,ny=dx/l*5;
    limb(c,K.x-nx,K.y-ny,H.x-nx*.6,H.y-ny*.6,3,3,STC(P),.8);
    limb(c,K.x,K.y,H.x,H.y,10,8,BR(P));
    limb(c,H.x,H.y,F.x+1,F.y+4,8,7,STC(P));
    bolt(c,K.x,K.y,3.2,P);bolt(c,H.x,H.y,2.6,P);
    paw(c,F.x,F.y,lg.pang,P,r.claws);
    if(lg.id==='HN'&&r.hipGear<1)socket(c,J.x,J.y,17,P);else disc(c,J.x,J.y,17,P,r.gear*1.3,false);
  }else{
    const W=H;
    limb(c,J.x,J.y,K.x,K.y,14,10,BR(P));
    limb(c,K.x,K.y,W.x,W.y,10,8,BR(P));
    const cx=lerp(K.x,W.x,.78),cy=lerp(K.y,W.y,.78);
    limb(c,cx,cy,W.x,W.y,9,9,STC(P),1);
    bolt(c,K.x,K.y,3,P);
    paw(c,F.x,F.y,lg.pang,P,r.claws);
    disc(c,J.x,J.y,13,P,-r.gear*1.6,true);
  }
}
function drawTail(c,r){
  const T=r.tail,P=NEAR;
  const pts=T.map(p=>({x:(p.x-r.x)*r.facing,y:p.y}));
  for(let i=1;i<TN;i++){
    const a=pts[i-1],b=pts[i],w=7.6-i*.28;
    limb(c,a.x,a.y,b.x,b.y,w,w-.3,i%2?STC(P):BR(P),1.2);
  }
  const e=pts[TN-1],d=pts[TN-2];
  limb(c,d.x,d.y,e.x+(e.x-d.x)*.5,e.y+(e.y-d.y)*.5,6.4,5.6,BR(P));
}
function drawKey(c,r,P){
  limb(c,-6,17,-6,31,4,4,STC(P),1);
  const k=Math.cos(r.key),ak=Math.abs(k),front=Math.sin(r.key)>0;
  for(const s of [-1,1]){
    const cx=-6+s*7.2*k;
    c.beginPath();c.ellipse(cx,37.5,1.4+5.4*ak,6.2,0,0,TAU);
    const g=c.createLinearGradient(cx,44,cx,31);g.addColorStop(0,front?P.bL:P.b);g.addColorStop(1,front?P.b:P.bD);
    c.fillStyle=g;c.fill();c.lineWidth=1.3;c.strokeStyle=OL;c.stroke();
    if(ak>.15){c.beginPath();c.ellipse(cx,37.5,2.3*ak,2.4,0,0,TAU);c.fillStyle='#2a1a0a';c.fill();}
  }
  c.beginPath();c.ellipse(-6,33,3.2,3,0,0,TAU);c.fillStyle=P.b;c.fill();c.lineWidth=1;c.strokeStyle=OL;c.stroke();
}
function drawBody(c,r){
  const P=NEAR;
  c.save();c.translate(0,r.y);c.rotate(r.th);
  const hull=new Path2D();
  hull.moveTo(-50,-13);
  hull.bezierCurveTo(-68,-11,-72,13,-54,18);
  hull.bezierCurveTo(-30,25,20,23,46,19);
  hull.bezierCurveTo(68,16,70,-8,56,-17);
  hull.bezierCurveTo(30,-24,-18,-21,-50,-13);
  const g=c.createLinearGradient(0,24,0,-22);
  g.addColorStop(0,P.bL);g.addColorStop(.3,P.b);g.addColorStop(.78,P.bD);g.addColorStop(1,P.bX);
  c.fillStyle=g;c.fill(hull);
  c.save();c.clip(hull);
    c.fillStyle=P.cr;c.beginPath();c.ellipse(8,-24,46,11,0,0,TAU);c.fill();
    c.beginPath();c.ellipse(58,-4,11,14,-.2,0,TAU);c.fill();
    const sh=c.createLinearGradient(0,-24,0,-4);sh.addColorStop(0,'rgba(40,20,5,.5)');sh.addColorStop(1,'rgba(40,20,5,0)');
    c.fillStyle=sh;c.fillRect(-80,-30,160,26);
    c.strokeStyle='rgba(255,242,200,.6)';c.lineWidth=3;c.beginPath();c.moveTo(-52,15);c.bezierCurveTo(-28,21,18,20,44,16);c.stroke();
    c.strokeStyle=P.bX;c.lineWidth=1;c.globalAlpha=.55;
    for(const sx of [-36,-24,8,24,38]){c.beginPath();c.moveTo(sx,26);c.quadraticCurveTo(sx+3,6,sx-1,-12);c.stroke();}
    c.globalAlpha=1;
    c.fillStyle='#1d130a';c.beginPath();c.ellipse(-8,3,15,10,0,0,TAU);c.fill();
    gear(c,-13,2,8.5,10,r.gear*1.6,P.b);gear(c,-1,5.5,6,8,-r.gear*2.3,P.c);
    c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=1.2;c.beginPath();c.ellipse(-8,3,15,10,0,0,TAU);c.stroke();
    c.fillStyle=P.bD;for(const rx of [-44,-30,-16,0,16,30,42]){c.beginPath();c.arc(rx,18.5+(rx>20?-1:0),1.1,0,TAU);c.fill();}
  c.restore();
  c.lineWidth=1.8;c.strokeStyle=OL;c.stroke(hull);
  // chest core housing + lens
  c.beginPath();c.arc(60,-2,7.6,0,TAU);c.fillStyle=P.stD;c.fill();c.lineWidth=1.2;c.strokeStyle=OL;c.stroke();
  const I=r.coreI,lg=c.createRadialGradient(59,-1,0,60,-2,5.6);
  lg.addColorStop(0,`rgb(${lerp(40,235,I)|0},${lerp(50,252,I)|0},${lerp(60,255,I)|0})`);
  lg.addColorStop(.5,`rgb(${lerp(25,90,I)|0},${lerp(40,205,I)|0},${lerp(55,255,I)|0})`);
  lg.addColorStop(1,`rgb(${lerp(15,10,I)|0},${lerp(25,70,I)|0},${lerp(35,140,I)|0})`);
  c.beginPath();c.arc(60,-2,5.6,0,TAU);c.fillStyle=lg;c.fill();
  drawKey(c,r,P);
  c.restore();
}
function drawEar(c,x,y,ang,s,wk,P,gearA){
  c.save();c.translate(x,y);c.rotate(s<0?ang:-ang);
  const w=9*wk;
  c.beginPath();c.moveTo(-w,-3);c.quadraticCurveTo(-w*.6+s*1,12,s*4.5,22);c.quadraticCurveTo(w*.6+s*1,12,w,-3);c.closePath();
  const g=c.createLinearGradient(-w,0,w,0);g.addColorStop(0,P.bL);g.addColorStop(1,P.bD);
  c.fillStyle=g;c.fill();c.lineWidth=1.6;c.strokeStyle=OL;c.stroke();
  c.beginPath();c.moveTo(-w*.55,1);c.quadraticCurveTo(-w*.3,10,s*3.2,16.5);c.quadraticCurveTo(w*.3,10,w*.55,1);c.closePath();
  c.fillStyle=P.cD;c.fill();
  gear(c,s*.6,6.5,3.6,7,gearA,P.bD);
  c.restore();
}
function drawEye(c,ex,ey,w,s,r){
  const h=w*.8;
  if(r.squint>.5){
    const ix=ex-s*w*.7,ox=ex+s*w*.95;
    c.beginPath();c.moveTo(ox,ey+h*.8);c.lineTo(ix,ey+h*.12);c.lineTo(ox,ey-h*.55);
    c.lineWidth=2.6;c.lineCap='round';c.lineJoin='round';c.strokeStyle=OL;c.stroke();c.lineCap='butt';c.lineJoin='miter';return;
  }
  if(r.happy>.5){
    c.beginPath();c.moveTo(ex-w,ey-h*.15);c.quadraticCurveTo(ex,ey+h*1.4,ex+w,ey-h*.15);
    c.lineWidth=2.6;c.lineCap='round';c.strokeStyle=OL;c.stroke();c.lineCap='butt';return;
  }
  const inX=ex-s*w,outX=ex+s*w;
  const p=new Path2D();p.moveTo(inX,ey-h*.1);p.quadraticCurveTo(ex,ey+h*1.45,outX,ey+h*.25);p.quadraticCurveTo(ex,ey-h*1.2,inX,ey-h*.1);
  c.fillStyle='#0b1428';c.fill(p);
  c.save();c.clip(p);
  const ix=ex+r.lookX*w*.38,iy=ey+r.lookY*h*.35+h*.05;
  const g=c.createRadialGradient(ix-w*.15,iy+h*.2,0,ix,iy,h*1.05);
  g.addColorStop(0,'#c8f6ff');g.addColorStop(.45,'#3fa4ff');g.addColorStop(1,'#0c3a8c');
  c.fillStyle=g;c.beginPath();c.arc(ix,iy,h*1.05,0,TAU);c.fill();
  c.fillStyle='#050a14';c.beginPath();c.ellipse(ix,iy,w*(.1+.42*r.pupil),h*(.74+.2*r.pupil),0,0,TAU);c.fill();
  c.fillStyle='rgba(255,255,255,.95)';c.beginPath();c.arc(ix-w*.32,iy+h*.38,1.7,0,TAU);c.fill();
  if(r.E<1){c.fillStyle=`rgba(8,12,24,${(1-r.E)*.72})`;c.fillRect(ex-w-2,ey-h*2,w*2+4,h*4);}
  // eyelid: a brass shutter, tilted (stern ↔ sad)
  const yc=ey+h*.8-r.lidEff*h*1.45, ly=x=>yc+r.lidTilt*.9*h*s*(x-ex)/w;
  const x0=ex-w-2,x1=ex+w+2;
  c.beginPath();c.moveTo(x0,ly(x0));c.lineTo(x1,ly(x1));c.lineTo(x1,ey+h*2);c.lineTo(x0,ey+h*2);c.closePath();
  c.fillStyle=NEAR.b;c.fill();
  c.beginPath();c.moveTo(x0,ly(x0));c.lineTo(x1,ly(x1));c.lineWidth=2.2;c.strokeStyle=OL;c.stroke();
  c.restore();
  c.lineWidth=1.5;c.strokeStyle=OL;c.stroke(p);
}
function drawHead(c,r){
  const P=NEAR;
  c.save();c.translate(r.hx,r.hy);c.rotate(r.hA.v+r.tilt.v);
  const yaw=r.yaw,fx=4+10*yaw;
  drawEar(c,-12+fx*.3,14,r.earL.v,-1,1-Math.max(0,-yaw)*.3,P,r.gear*2);
  drawEar(c,9+fx*.55,16,r.earR.v,1,1-Math.max(0,yaw)*.35,P,-r.gear*2);
  const jx=fx*.45+1;
  c.beginPath();c.ellipse(0,3,23,20,0,0,TAU);c.moveTo(jx+20.5,-7);c.ellipse(jx,-7,20.5,13,0,0,TAU);
  c.lineWidth=3.2;c.strokeStyle=OL;c.stroke();
  const g=c.createRadialGradient(-9,14,2,0,2,31);g.addColorStop(0,P.bL);g.addColorStop(.55,P.b);g.addColorStop(1,P.bD);
  c.fillStyle=g;c.fill();
  // exposed gear in the skull
  c.fillStyle='#1d130a';c.beginPath();c.arc(-12,11,6.4,0,TAU);c.fill();
  gear(c,-12,11,5.2,8,r.gear*2.2,P.b);
  // face plates
  c.strokeStyle=P.bD;c.lineWidth=1.1;
  c.beginPath();c.moveTo(fx-20,9);c.quadraticCurveTo(fx,15.5,fx+18,8);c.stroke();
  c.beginPath();c.moveTo(fx,22);c.lineTo(fx,13);c.stroke();
  c.fillStyle=P.bD;for(const [rx,ry] of [[fx-16,6.5],[fx+15,6],[-17,-2],[fx-2,18]]){c.beginPath();c.arc(rx,ry,1,0,TAU);c.fill();}
  // muzzle & chin
  c.fillStyle=P.cr;c.beginPath();c.ellipse(fx+2,-9,11.5,7.6,0,0,TAU);c.fill();
  c.fillStyle='#fffaf0';c.beginPath();c.ellipse(fx+2,-15,7.5,4.2,0,0,TAU);c.fill();
  // eyes
  for(const s of [-1,1]){
    const ew=9*(1-.45*Math.max(0,s*yaw)), ex=fx+s*9.6*(1-.25*Math.max(0,s*yaw));
    drawEye(c,ex,3,ew,s,r);
  }
  // nose, mouth, whiskers
  const nx=fx+2+yaw*2,m=r.mouth;
  c.beginPath();c.moveTo(nx-3,-3.2);c.lineTo(nx+3,-3.2);c.lineTo(nx,-6.2);c.closePath();
  c.fillStyle='#e48d8a';c.fill();c.lineWidth=1;c.strokeStyle=OL;c.stroke();
  c.beginPath();c.moveTo(nx,-6.2);c.lineTo(nx,-8.2);
  c.moveTo(nx-4.6,-8.6+m);c.quadraticCurveTo(nx-2.2,-10.6-m*.5,nx,-8.2);c.quadraticCurveTo(nx+2.2,-10.6-m*.5,nx+4.6,-8.6+m);
  c.lineWidth=1.1;c.stroke();
  c.strokeStyle='rgba(252,246,232,.85)';c.lineWidth=.8;
  const wl=1-Math.max(0,yaw)*.4,wr=1-Math.max(0,-yaw)*.4;
  for(const [dy,ey] of [[-7,-4],[-8.5,-9],[-10,-13.5]]){
    c.beginPath();c.moveTo(fx-6,dy);c.lineTo(fx-6-19*wr,ey);c.stroke();
    c.beginPath();c.moveTo(fx+10,dy);c.lineTo(fx+10+18*wl,ey);c.stroke();
  }
  c.restore();
}
function drawCat(c,r){
  c.save();
  c.translate(r.x+r.facing*r.ts*r.trx,GY-r.fl-r.try);c.scale(r.facing*r.ts,-1);
  const L_=id=>r.leg(id);
  c.save();c.translate(5,6);drawLeg(c,L_('HF'),FARP,r);drawLeg(c,L_('FF'),FARP,r);c.restore();
  drawTail(c,r);
  drawBody(c,r);
  drawLeg(c,L_('HN'),NEAR,r);
  // neck + collar, then the near foreleg sits over the chest
  const n=r.neck;
  limb(c,n.x,n.y,r.hx-2,r.hy-6,15,13,STC(NEAR));
  c.save();c.translate(n.x,n.y);c.rotate(r.th+.55);
  c.beginPath();c.roundRect(-4.5,-12,9,24,3);c.fillStyle=NEAR.stD;c.fill();c.lineWidth=1.2;c.strokeStyle=OL;c.stroke();
  c.fillStyle=NEAR.b;for(const y of [-7,0,7]){c.beginPath();c.arc(0,y,1.3,0,TAU);c.fill();}
  c.restore();
  // pawFront: near forepaw drawn over the face (grooming); otherwise the head overlaps it
  if(!r.c.pawFront)drawLeg(c,L_('FN'),NEAR,r);
  drawHead(c,r);
  if(r.c.pawFront)drawLeg(c,L_('FN'),NEAR,r);
  c.restore();
}
function drawGlow(g,r){
  const I=r.coreI;if(I<.02)return;
  const p=r.toWorld(r.bp(60,-2)), R=9+24*I;
  g.save();g.globalCompositeOperation='lighter';
  const gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,R);
  gr.addColorStop(0,`rgba(160,228,255,${.6*I})`);gr.addColorStop(.35,`rgba(60,170,255,${.22*I})`);gr.addColorStop(1,'rgba(40,120,255,0)');
  g.fillStyle=gr;g.fillRect(p.x-R,p.y-R,R*2,R*2);g.restore();
}
/* contact shadows: they carry the weight.
   load  = how hard the hull is bearing down: body-spring compression below
           standing height, motor strain, and the downward speed of a landing.
   slide = planted feet that are moving with the body (ice, c.slip) smear
           their shadow back along the slide and lose the hard pressure core. */
function contactAO(g,r){
  const c=r.c, wt=c.weight??1, slip=c.slip||0;
  const comp=clamp((60-r.y)/22,-.3,1), impact=r.air?0:clamp(-r.vy/420,0,.7);
  const load=wt*(1+.45*Math.max(0,comp)+.5*r.strain+impact);
  const vs=r.vx*slip, sl=Math.min(1,Math.abs(vs)/150), dir=Math.sign(vs);
  for(const lg of r.legs){
    const far=!lg.near, up=clamp(1-lg.fy/22,0,1);
    if(up<=0)continue;
    // a straining cat drives through its hind feet
    const L=load*(lg.hind?1+.6*r.strain:1-.25*r.strain);
    const a=Math.min(.72,.44*up*(far?.8:1)*(.7+.35*L))*(1-.3*sl);
    const x=lg.fx+r.facing*(3+(far?5:0)), y=GY-r.fl-(far?6:0)+1;
    softEllipse(g,x,y,10*(.9+.18*L),3*(.85+.3*L),a);
    if(lg.planted&&sl>.02){const len=Math.abs(vs)*.14;softEllipse(g,x-dir*len*.5,y,10+len*.5,2.6,a*.55*sl);}
  }
  const body=.26*clamp(1-(r.y-17)/110,0,1)*(.85+.3*load);
  softEllipse(g,r.x-dir*Math.abs(vs)*.06,GY-r.fl-2,64*(.95+.1*Math.max(0,comp))+Math.abs(vs)*.08,8,Math.min(.5,body));
}

/* =====================================================================
   PARTICLES
   ===================================================================== */
const parts=[], scratches=[]; let shake=0;
function addP(o){o.life=0;parts.push(o);if(parts.length>700)parts.shift();}
const FX={
  dust(x,y,n,pow=1,dir=0){for(let i=0;i<n;i++)addP({k:'dust',x:x+rnd(-6,6),y:y-rnd(0,3),fl:y,vx:rnd(-45,45)*pow+dir*rnd(20,70)*pow,vy:-rnd(8,45)*pow,max:rnd(.5,1.1),r:rnd(3,6)*Math.sqrt(pow)});},
  ring(x,y,pow){addP({k:'ring',x,y,max:.45,pow});},
  sparks(x,y,n,dir=1,pow=1){for(let i=0;i<n;i++)addP({k:'spark',x,y,fl:y+rnd(-3,4),vx:dir*rnd(30,190)*pow,vy:-rnd(40,230)*pow,max:rnd(.25,.6)});},
  steam(x,y,n,pow=1){for(let i=0;i<n;i++)addP({k:'steam',x:x+rnd(-3,3),y,vx:rnd(-14,14)*pow,vy:-rnd(28,60)*pow,max:rnd(.9,1.6),r:rnd(3,6)*pow});},
  cogs(x,y,n){for(let i=0;i<n;i++)addP({k:'cog',x,y,fl:GY+rnd(-8,6),vx:rnd(-150,150),vy:-rnd(220,430),rot:rnd(0,TAU),vr:rnd(-12,12),max:rnd(1.3,2),r:rnd(2.5,4.5),c:Math.random()<.6?'#e6b25a':'#c3673d'});},
  nut(x,y,vx,fl){addP({k:'nut',x,y,vx,vy:-30,rot:0,vr:9,max:2.5,fl});},
  ice(x,y,n,dir=1,pow=1){for(let i=0;i<n;i++)addP({k:'ice',x,y,fl:y+rnd(-3,4),vx:dir*rnd(20,150)*pow,vy:-rnd(30,140)*pow,max:rnd(.3,.7),r:rnd(.8,1.8)});},
  flash(x,y,pow,rgb='150,225,255'){addP({k:'flash',x,y,max:.5,pow,rgb});},
};
function scratch(x,len,a=.5){scratches.push({x,y:GY+rnd(-3,2),len,life:0,max:5,a});if(scratches.length>160)scratches.shift();}
function updParts(dt){
  shake=clamp(shake-dt*(14+shake*5),0,9);
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life+=dt;if(p.life>p.max){parts.splice(i,1);continue;}
    if(p.k==='dust'){p.vx*=Math.exp(-3*dt);p.vy*=Math.exp(-3*dt);p.vy-=6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
    else if(p.k==='spark'||p.k==='cog'){p.vy+=900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.rot!=null)p.rot+=p.vr*dt;
      if(p.y>p.fl&&p.vy>0){p.y=p.fl;p.vy*=-.35;p.vx*=.6;if(p.vr)p.vr*=.6;}}
    else if(p.k==='steam'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy*=Math.exp(-.6*dt);p.r+=dt*9;}
    else if(p.k==='nut'){p.vy+=1400*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;if(p.fl!=null&&p.y>p.fl&&p.vy>0){p.y=p.fl;p.vy*=-.32;p.vx*=.5;p.vr*=.5;}}
    else if(p.k==='ice'){p.vy+=700*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y>p.fl&&p.vy>0){p.y=p.fl;p.vy*=-.2;p.vx*=.4;}}
  }
  for(let i=scratches.length-1;i>=0;i--){const s=scratches[i];s.life+=dt;if(s.life>s.max)scratches.splice(i,1);}
}
function drawScratches(g){
  g.lineWidth=.9;
  for(const s of scratches){const a=s.a*(1-s.life/s.max);g.strokeStyle=`rgba(255,250,235,${a})`;g.beginPath();g.moveTo(s.x,s.y);g.lineTo(s.x+s.len,s.y+.4);g.stroke();
    g.strokeStyle=`rgba(0,0,0,${a*.6})`;g.beginPath();g.moveTo(s.x,s.y+1);g.lineTo(s.x+s.len,s.y+1.4);g.stroke();}
}
function drawParts(g){
  for(const p of parts){
    const t=p.life/p.max;
    if(p.k==='dust'){g.fillStyle=`rgba(168,140,108,${.42*(1-t)})`;g.beginPath();g.arc(p.x,p.y,p.r*(1+t*1.6),0,TAU);g.fill();}
    else if(p.k==='steam'){g.fillStyle=`rgba(235,240,245,${.38*(1-t)})`;g.beginPath();g.arc(p.x,p.y,p.r,0,TAU);g.fill();}
    else if(p.k==='ring'){g.strokeStyle=`rgba(190,165,130,${.5*(1-t)})`;g.lineWidth=2*(1-t)+.5;g.beginPath();g.ellipse(p.x,p.y,20+t*90*p.pow,(20+t*90*p.pow)*.16,0,0,TAU);g.stroke();}
    else if(p.k==='spark'){g.save();g.globalCompositeOperation='lighter';g.strokeStyle=`rgba(255,${200-t*120|0},${90-t*80|0},${1-t})`;g.lineWidth=1.6;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);g.stroke();g.restore();}
    else if(p.k==='ice'){g.fillStyle=`rgba(230,248,255,${.9*(1-t)})`;g.fillRect(p.x-p.r/2,p.y-p.r/2,p.r,p.r);}
    else if(p.k==='cog'){g.globalAlpha=1-Math.max(0,t-.7)/.3;gear(g,p.x,p.y,p.r,7,p.rot,p.c);g.globalAlpha=1;}
    else if(p.k==='nut'){g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU;g.lineTo(Math.cos(a)*4,Math.sin(a)*4);}g.closePath();g.fillStyle='#9aa0a8';g.fill();g.strokeStyle=OL;g.lineWidth=.8;g.stroke();g.beginPath();g.arc(0,0,1.5,0,TAU);g.fillStyle='#222';g.fill();g.restore();}
    else if(p.k==='flash'){g.save();g.globalCompositeOperation='lighter';const R=10+t*60*p.pow;const gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,R);gr.addColorStop(0,`rgba(${p.rgb},${.7*(1-t)})`);gr.addColorStop(1,`rgba(${p.rgb},0)`);g.fillStyle=gr;g.fillRect(p.x-R,p.y-R,R*2,R*2);g.restore();}
  }
}

/* =====================================================================
   SHARED PROPS
   ===================================================================== */
function drawCrate(g,cr){
  const x=cr.x,y=GY-cr.h+2,w=cr.w,h=cr.h;
  const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,'#9a6a35');gr.addColorStop(1,'#5e3c1c');
  g.fillStyle=gr;g.fillRect(x,y,w,h);
  g.strokeStyle='rgba(30,15,5,.55)';g.lineWidth=1;
  for(let i=1;i<4;i++){g.beginPath();g.moveTo(x,y+h*i/4);g.lineTo(x+w,y+h*i/4);g.stroke();}
  g.lineWidth=7;g.strokeStyle='#6b4523';g.beginPath();g.moveTo(x+8,y+8);g.lineTo(x+w-8,y+h-8);g.stroke();
  g.lineWidth=1.6;g.strokeStyle=OL;g.strokeRect(x,y,w,h);
  g.fillStyle='#7d838b';
  for(const [cx,cy] of [[x,y],[x+w-12,y],[x,y+h-12],[x+w-12,y+h-12]]){g.fillRect(cx,cy,12,12);g.strokeRect(cx,cy,12,12);}
  g.font='600 11px Oswald,sans-serif';g.fillStyle='rgba(20,10,4,.65)';g.textAlign='center';g.fillText('HEAVY',x+w/2,y+h*.36);g.fillText('200 KG',x+w/2,y+h*.36+13);g.textAlign='left';
}
function drawLamp(g,lp){
  const x=lp.x,by=GY-20;
  g.fillStyle='#2b2f36';g.beginPath();g.ellipse(x,by,16,4,0,0,TAU);g.fill();
  limb(g,x,by-2,x,by-66,6,5,['#ffe3a0','#d29f4a','#8c5b22']);
  g.beginPath();g.arc(x,by-80,13,0,TAU);
  const col=lp.col||[60,60,60];const I=lp.glow;
  g.fillStyle=`rgb(${lerp(55,col[0],I)|0},${lerp(58,col[1],I)|0},${lerp(62,col[2],I)|0})`;g.fill();
  g.lineWidth=1.5;g.strokeStyle=OL;g.stroke();
  g.strokeStyle='#8c5b22';g.lineWidth=3;g.beginPath();g.arc(x,by-80,13,.15*Math.PI,.85*Math.PI);g.stroke();
  g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(x-4,by-85,3,0,TAU);g.fill();
  if(I>.02){g.save();g.globalCompositeOperation='lighter';const R=60*I+10;const gr=g.createRadialGradient(x,by-80,0,x,by-80,R);gr.addColorStop(0,`rgba(${col},${.55*I})`);gr.addColorStop(1,`rgba(${col},0)`);g.fillStyle=gr;g.fillRect(x-R,by-80-R,R*2,R*2);g.restore();}
}
