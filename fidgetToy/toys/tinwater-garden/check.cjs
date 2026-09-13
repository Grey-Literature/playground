/* Run: node tinwater-garden/check.cjs — deterministic behavior and conservation checks. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const T=require('./physics.js');
const {GardenPhysics}=T;
function advance(s,seconds,observe){for(let n=0;n<seconds*120;n++){s.step(1/120);observe?.(s);}}
function conserve(s){const b=s.accounting(),remaining=b.cups+b.air+b.soil+b.infiltrated+b.escaped;assert.ok(Math.abs(b.source-remaining)<1e-6,JSON.stringify(b));assert.ok(s.cups.every(c=>Number.isFinite(c.angle)&&c.volume>=0));}
const s=new GardenPhysics();const max=s.cups.map(()=>0),min=s.cups.map(()=>Infinity);advance(s,120,()=>{s.cups.forEach((c,i)=>{max[i]=Math.max(max[i],Math.abs(c.angle));if(s.time>30)min[i]=Math.min(min[i],c.volume);});});conserve(s);
assert.ok(s.cups.slice(0,5).every(c=>c.received>50),'All five main cups receive water');assert.ok(s.cups.slice(0,5).every((c,i)=>max[i]>.45),'All main cups tip');assert.ok(min.slice(0,5).every(v=>v<30),'Cups dump a substantial fraction of their load');assert.ok(s.soil.some(c=>c.water>3),'A puddle forms');
console.log('Natural cascade:',s.cups.map((c,i)=>({cup:i+1,tips:c.tips,maxAngle:+max[i].toFixed(2),minVolume:+min[i].toFixed(1),received:Math.round(c.received)})));
const held=new GardenPhysics();held.cups[0].held=true;advance(held,25);assert.equal(held.cups[0].angle,0);assert.ok(held.cups[0].volume>=held.cups[0].capacity*.95);conserve(held);held.releaseAll();advance(held,15);assert.ok(held.cups[0].tips>0);conserve(held);
const back=new GardenPhysics();back.cups[2].held=true;back.cups[2].target=-.65;advance(back,80);conserve(back);assert.ok(back.cups[5].received>2,'Backward pour reaches side cup');console.log('Side cup received',back.cups[5].received.toFixed(1));
const before=s.accounting().infiltrated;advance(s,5);assert.ok(s.accounting().infiltrated>before);
const leaf=new GardenPhysics();leaf.leaves[0].held=true;const ly=leaf.leaves[0].y;advance(leaf,1);assert.equal(leaf.leaves[0].y,ly);leaf.leaves[0].held=false;leaf.leaves[0].y=400;advance(leaf,8);assert.ok(Math.abs(leaf.leaves[0].y-T.terrain(leaf.leaves[0].x))<20);
const context={window:{Tinwater:T},Math,console};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/wildlife.js','utf8'),context);const wildlife=new T.Wildlife();const eggSim=new GardenPhysics();eggSim.cups[1].held=true;eggSim.cups[1].target=.72;
advance(eggSim,90,()=>wildlife.update(1/120,eggSim,1,false));assert.ok(wildlife.eggDone,'Real redirected stream helps spider catch fly');assert.ok(wildlife.eggUntil>0);console.log('Spider catch at',wildlife.eggUntil-24,'seconds');
const cycle=new GardenPhysics(),animals=new T.Wildlife();advance(cycle,720,()=>{const minute=(990+cycle.time*2)%1440,h=minute/60,n=h>=7&&h<17?0:h>=17&&h<20?(h-17)/3:h>=20||h<4.5?1:1-(h-4.5)/2.5;animals.update(1/120,cycle,n,false);});conserve(cycle);assert.ok(cycle.drops.length<2000);assert.ok(cycle.splashes.length<=240);assert.ok(cycle.ripples.length<=100);
console.log('PASS: balance, cascade, holds, recovery, side routing, puddles, leaves, real spider trigger, 12-minute cycle, bounded particles.');
