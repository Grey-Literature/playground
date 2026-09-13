/* Tinwater Garden — water is accounted for as volume-carrying parcels.
   No visual particle creates or destroys simulated water. Units are garden units. */
(function(root){
  'use strict';
  const W=1440,H=960,G=480;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function transform(c,x,y){const a=c.angle;return{x:c.x+x*Math.cos(a)-y*Math.sin(a),y:c.y+x*Math.sin(a)+y*Math.cos(a)};}
  function polygon(c){return[[-c.w,-42],[c.w,-42],[c.w*.82,2],[c.w*.36,25],[-c.w*.36,25],[-c.w*.82,2]].map(p=>transform(c,...p));}
  function area(p){let s=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];s+=p[i].x*q.y-q.x*p[i].y;}return Math.abs(s)/2;}
  function below(poly,y){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],aa=a.y>=y,bb=b.y>=y;if(aa)out.push(a);if(aa!==bb){const t=(y-a.y)/(b.y-a.y);out.push({x:a.x+(b.x-a.x)*t,y});}}return out;}
  function liquid(c){const p=polygon(c),volume=c.volume/c.capacity*c.area;let lo=Math.min(...p.map(q=>q.y))-1,hi=Math.max(...p.map(q=>q.y))+1;for(let i=0;i<17;i++){const m=(lo+hi)/2;if(area(below(p,m))>volume)lo=m;else hi=m;}return{poly:below(p,(lo+hi)/2),y:(lo+hi)/2};}
  function segment(a,b,c,d){const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-8)return null;const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/den,u=((c.x-a.x)*ry-(c.y-a.y)*rx)/den;return t>=0&&t<=1&&u>=0&&u<=1?{x:a.x+rx*t,y:a.y+ry*t,t}:null;}
  function terrain(x){return 823+17*Math.sin(x*.013)+9*Math.sin(x*.031);}
  function makeCup(x,y,w,dir,id){const c={id,x,y,w,dir,angle:0,velocity:0,volume:0,capacity:w*.92,held:false,target:0,fillRate:0,outflow:0,impact:0,tips:0,wasTipped:false,received:0};c.area=area(polygon(c));return c;}
  class GardenPhysics{
    constructor(seed=721){this.seed=seed;this.time=0;this.cups=[makeCup(690,183,68,1,0),makeCup(802,322,68,-1,1),makeCup(687,460,76,1,2),makeCup(812,591,69,-1,3),makeCup(699,719,77,-1,4),makeCup(535,588,65,1,5)];this.drops=[];this.splashes=[];this.ripples=[];this.events=[];this.soil=Array.from({length:72},(_,i)=>({x:i*20+10,wet:0,water:0}));this.leaves=[{x:565,y:853,angle:-.3,kind:0,held:false,vx:0},{x:927,y:838,angle:.2,kind:1,held:false,vx:0},{x:430,y:806,angle:-.5,kind:0,held:false,vx:0}];this.budget={source:0,infiltrated:0,escaped:0};this.sourceClock=0;}
    random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
    emit(type,data){this.events.push({type,...data});}
    addDrop(x,y,vx,vy,volume,from=-1){this.drops.push({x,y,px:x,py:y,vx,vy,volume,from,age:0});}
    splash(x,y,amount,material='soil',cup=null){this.emit('impact',{x,y,amount,material,cup});for(let i=0,n=Math.min(7,Math.ceil(amount*3));i<n;i++)this.splashes.push({x,y,vx:(this.random()-.5)*100,vy:-30-this.random()*80,life:.25+this.random()*.4});this.ripples.push({x,y,r:2,life:.85,max:10+amount*4});if(this.splashes.length>240)this.splashes.splice(0,this.splashes.length-240);if(this.ripples.length>100)this.ripples.splice(0,this.ripples.length-100);}
    tap(c,side=1){c.velocity+=side*.9;this.emit('tap',{cup:c,x:c.x,amount:.4});}
    releaseAll(){for(const c of this.cups)c.held=false;for(const l of this.leaves)l.held=false;}
    step(dt){
      this.time+=dt;this.events.length=0;this.sourceClock+=dt;
      while(this.sourceClock>=.04){this.sourceClock-=.04;const v=.37;this.budget.source+=v;this.addDrop(690+(this.random()-.5)*2,57,(this.random()-.5)*3,40,v);}
      for(const c of this.cups){
        c.impact*=Math.exp(-dt*6);c.fillRate*=Math.exp(-dt*4);c.outflow=0;
        const fill=clamp(c.volume/c.capacity,0,1.3),waterCy=16-90*Math.sqrt(fill),dryX=-c.dir*8;
        // Gravity acts on dry metal/counterweight and on the load's moving COM.
        const torque=.34*((dryX*Math.cos(c.angle)-8*Math.sin(c.angle))+.95*fill*(c.dir*15*Math.cos(c.angle)-waterCy*Math.sin(c.angle)));
        if(c.held){const delta=clamp(c.target-c.angle,-.15,.15);c.velocity=delta/Math.max(dt,.001);c.angle+=delta;}
        else{c.velocity+=(torque-c.velocity*.42)*dt;c.angle+=c.velocity*dt;}
        const limit=1.64;if(Math.abs(c.angle)>limit){c.angle=clamp(c.angle,-limit,limit);if(Math.abs(c.velocity)>.15)this.emit('stop',{cup:c,x:c.x,amount:Math.min(1,Math.abs(c.velocity))});c.velocity*=-.24;}
        // An unobtrusive rest pin holds the empty cup at zero until load torque wins.
        if(!c.held&&c.angle*c.dir<0&&Math.abs(c.angle)<.1&&c.volume<c.capacity*.6){if(c.velocity*c.dir<-.07)this.emit('stop',{cup:c,x:c.x,amount:Math.min(.55,Math.abs(c.velocity))});c.angle=0;c.velocity=0;}
        if(Math.abs(c.angle)>.6&&!c.wasTipped){c.tips++;c.wasTipped=true;}if(Math.abs(c.angle)<.2)c.wasTipped=false;
        const p=polygon(c),lip=p[0].y>p[1].y?p[0]:p[1],retained=area(below(p,lip.y))/c.area*c.capacity;c.poly=p;
        if(c.volume>retained+.025){const out=Math.min(c.volume-retained,dt*(16+95*Math.abs(Math.sin(c.angle))+70*(c.volume/c.capacity)));c.volume-=out;c.outflow=out/dt;const side=lip===p[0]?-1:1;this.addDrop(lip.x+side*1.8,lip.y+1,side*(18+23*Math.abs(Math.sin(c.angle))),28+Math.abs(c.velocity)*12,out,c.id);}
      }
      for(let i=this.drops.length-1;i>=0;i--){const d=this.drops[i];d.px=d.x;d.py=d.y;d.age+=dt;d.vy+=G*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;let hit=null;
        for(const c of this.cups){if(c.id===d.from&&d.age<.35)continue;const p=c.poly;if(d.vy<0||Math.abs(c.angle)>1.55||d.y<Math.min(p[0].y,p[1].y)||d.py>Math.max(p[0].y,p[1].y))continue;const h=segment({x:d.px,y:d.py},d,p[0],p[1]);if(h&&(!hit||h.t<hit.h.t))hit={c,h};}
        if(hit){const c=hit.c;c.volume+=d.volume;c.received+=d.volume;c.fillRate+=d.volume;c.impact=Math.min(1,c.impact+d.volume*.2);c.velocity+=clamp((d.x-c.x)*d.volume*.00013,-.035,.035);this.splash(hit.h.x,hit.h.y,d.volume,c.volume>c.capacity*.15?'water':'metal',c);this.drops.splice(i,1);continue;}
        for(const l of this.leaves){if(!l.held&&Math.hypot(d.x-l.x,d.y-l.y)<23){l.vx+=d.vx*.08;l.y+=Math.min(3,d.volume);}}
        if(d.y>=terrain(d.x)){const index=clamp(Math.floor(d.x/20),0,71),soil=this.soil[index];soil.water+=d.volume;soil.wet=Math.min(1,soil.wet+d.volume*.12);this.splash(d.x,terrain(d.x),d.volume,soil.water>2?'puddle':(d.x<570||d.x>990?'stone':'soil'));this.drops.splice(i,1);}
        else if(d.x<0||d.x>W||d.age>8){this.budget.escaped+=d.volume;this.drops.splice(i,1);}
      }
      // Finite-volume surface flow: neighboring soil cells exchange only available water.
      for(let i=0;i<this.soil.length;i++){const s=this.soil[i],infiltration=Math.min(s.water,dt*(.16+.32*(1-s.wet)));s.water-=infiltration;this.budget.infiltrated+=infiltration;s.wet=Math.max(0,s.wet-dt*.005);if(s.water>0)s.wet=Math.min(1,s.wet+dt*.1);for(const j of [i-1,i+1]){const n=this.soil[j];if(!n)continue;const head=s.water*.5-terrain(s.x),other=n.water*.5-terrain(n.x);if(head>other&&s.water>2){const flow=Math.min(s.water*.1,(head-other)*dt*.7);s.water-=flow;n.water+=flow;}}}
      for(const l of this.leaves){if(l.held)continue;let c=this.cups.find(c=>c.volume>2&&Math.abs(l.x-c.x)<c.w*.9&&Math.abs(l.y-c.y)<90&&Math.abs(l.y-liquid(c).y)<25);if(c){const surf=liquid(c);l.y+=(surf.y-l.y)*Math.min(1,dt*7);l.x+=Math.sin(c.angle)*dt*37;l.angle+=(c.angle*.3-l.angle)*dt*2;}else{const soil=this.soil[clamp(Math.floor(l.x/20),0,71)];if(l.y<terrain(l.x)-5){l.y+=dt*75;l.x+=l.vx*dt;}else{l.y=terrain(l.x)-Math.min(9,soil.water*.3);if(soil.water>2){const left=this.soil[clamp(Math.floor(l.x/20)-1,0,71)],right=this.soil[clamp(Math.floor(l.x/20)+1,0,71)];l.vx+=(left.water-right.water)*dt*.4;l.angle+=Math.sin(this.time*1.4+l.x)*dt*.04;}l.x+=l.vx*dt;}l.vx*=Math.exp(-dt*2);}l.x=clamp(l.x,50,W-50);}
      for(const s of this.splashes){s.life-=dt;s.vy+=G*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;}this.splashes=this.splashes.filter(s=>s.life>0);
      for(const r of this.ripples){r.life-=dt;r.r+=dt*14;}this.ripples=this.ripples.filter(r=>r.life>0);
    }
    accounting(){return{...this.budget,cups:this.cups.reduce((s,c)=>s+c.volume,0),air:this.drops.reduce((s,d)=>s+d.volume,0),soil:this.soil.reduce((s,c)=>s+c.water,0)};}
  }
  root.Tinwater={W,H,G,clamp,transform,polygon,area,below,liquid,terrain,GardenPhysics};
  if(typeof module!=='undefined')module.exports=root.Tinwater;
})(typeof window==='undefined'?globalThis:window);
