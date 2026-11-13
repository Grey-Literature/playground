// Deterministic logic verification. The game's private closure is exposed only in this VM.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const noop = () => {};
const draw = new Proxy({}, { get: (o,k) => k==='createRadialGradient'?()=>({addColorStop:noop}):o[k]||noop, set:(o,k,v)=>(o[k]=v,true) });
const elements = new Map();
function element(id) {
  if(!elements.has(id)) elements.set(id,{id,textContent:'',innerHTML:'',style:{},dataset:{},classList:{add:noop,remove:noop},setAttribute:noop,addEventListener:noop,focus:noop,getContext:()=>draw});
  return elements.get(id);
}
const sandbox = {
  document:{getElementById:element,createElement:()=>element('terrain'),querySelector:element,querySelectorAll:()=>[],addEventListener:noop,activeElement:null},
  window:{addEventListener:noop},localStorage:{getItem:()=>null,setItem:noop},requestAnimationFrame:noop,setTimeout:noop,performance:{now:()=>0},console,Math
};
vm.createContext(sandbox);
let source=fs.readFileSync('game.js','utf8');
source=source.replace('setup();requestAnimationFrame(frame);',`setup();globalThis.test = {
  setup,start,update,draw,place,gobble,interact,hit,finish,pathTo,navigate,walkable,open,move,spring,takeKey,togglePause,at,keys,
  state:()=>({night,phase,player,farmer,dog,grandma,drone,combine,traps,inventory,pickups,grid,gate,droppedKey,keyHeld,totalScore,time,gobbleCD,employed,employmentReceipt}),
  setNight:n=>night=n,setTime:t=>time=t,setPhase:p=>phase=p
};`);
vm.runInContext(source,sandbox,{filename:'game.js'});
const t=sandbox.test;
const tick=(seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)t.update(1/60);};
const reset=(night=0)=>{t.setNight(night);t.setup();t.setPhase('ready');t.start();};
let passed=0;
function check(name, fn){fn();passed++;console.log('PASS '+name);}
check('All five maps: gate, pickups, patrols, and start are reachable',()=>{
  for(let n=0;n<5;n++){
    reset(n);const s=t.state();
    assert.ok(t.pathTo(s.player,s.gate).length>0);
    for(const p of s.pickups)assert.ok(t.pathTo(s.player,p).length>0,`pickup night ${n+1}`);
    for(const p of [[22,9],[17,4],[6,4],[6,14],[22,14],[29,4]])assert.ok(t.pathTo(s.farmer,t.at(...p)).length>0);
    t.draw(100);
  }
});
check('Waddle, sprint drain, and rest recovery',()=>{
  reset();let s=t.state(),x=s.player.x;t.keys.add('d');tick(.4);t.keys.clear();assert.ok(s.player.x>x+30);
  t.keys.add('d');t.keys.add('Shift');tick(.5);t.keys.clear();assert.ok(s.player.stamina<90);tick(1);assert.equal(s.player.stamina,100);
});
check('Corn blocks the farmer; turkey tunnels admit only the turkey',()=>{
  reset();assert.equal(t.walkable(14,8,false),false);assert.equal(t.walkable(14,8,true),true);
  assert.equal(t.open(100,100,9,true),false);
});
check('Gobble draws a path and enforces cooldown',()=>{
  reset();Object.assign(t.state().player,t.at(22,14));t.gobble();assert.equal(t.state().farmer.state,'investigate');assert.equal(t.state().gobbleCD,5);
  t.gobble();assert.equal(t.state().gobbleCD,5);const y=t.state().farmer.y;tick(1);assert.ok(t.state().farmer.y>y);
});
check('Same-tile targets remain reachable at sub-tile positions',()=>{
  reset();const a={...t.at(6,4),angle:0,path:[],repath:0};const b={x:a.x+13,y:a.y+8};
  for(let i=0;i<120;i++)t.navigate(a,b,90,1/60);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<5);
});
check('Placement grace period, then meaningful friendly fire',()=>{
  reset();const s=t.state();t.place('rake');assert.equal(s.inventory.rake,2);tick(.5);assert.equal(s.player.hp,3);tick(.7);assert.equal(s.player.hp,2);
});
check('Farmer knockdown drops the key; theft enables an actual win',()=>{
  reset();const s=t.state();const trap={...s.farmer,type:'rake',armed:true};t.spring(trap,s.farmer);
  assert.ok(s.farmer.stun>=6);assert.ok(t.state().droppedKey);assert.equal(s.farmer.composure,70);
  Object.assign(s.player,t.state().droppedKey);t.interact();assert.equal(t.state().keyHeld,true);Object.assign(s.player,s.gate);t.interact();assert.equal(t.state().phase,'won');
});
check('A real gobble lures the navigating farmer onto a placed rake',()=>{
  reset();const s=t.state();Object.assign(s.player,t.at(22,11));t.place('rake');Object.assign(s.player,t.at(22,14));t.gobble();tick(3);
  assert.ok(t.state().droppedKey);assert.ok(s.farmer.stun>0);assert.equal(s.player.hp,3);
});
check('Retry restores the current night score and three feathers',()=>{
  reset();const base=t.state().totalScore;t.spring({...t.state().farmer,type:'rake',armed:true},t.state().farmer);t.setTime(.01);tick(.1);assert.equal(t.state().phase,'lost');t.start();assert.equal(t.state().totalScore,base);assert.equal(t.state().player.hp,3);
});
check('Three hits lose; pause freezes dinner',()=>{
  reset();for(let i=0;i<3;i++){t.state().player.invuln=0;t.hit('farmer');}assert.equal(t.state().phase,'lost');
  reset();const time=t.state().time;t.togglePause();tick(2);assert.equal(t.state().time,time);t.togglePause();assert.equal(t.state().phase,'playing');
});
check('Biscuit negotiates only with nearby cornbread',()=>{
  reset(1);const s=t.state();s.player.bread=1;Object.assign(s.player,{x:s.dog.x-60,y:s.dog.y});t.interact();assert.equal(s.dog.bribed,25);assert.equal(s.player.bread,0);
});
check('Each threat arrives on its night; corn shifts without sealing the exit',()=>{
  reset(0);assert.equal(t.state().dog,null);reset(1);assert.ok(t.state().dog);assert.equal(t.state().grandma,null);
  reset(2);assert.ok(t.state().grandma);reset(3);assert.ok(t.state().drone);
  const s=t.state(),before=s.grid[8][14];s.player.invuln=100;tick(25.1);assert.notEqual(s.grid[8][14],before);assert.ok(t.pathTo(s.player,s.gate).length>0);
  reset(4);assert.ok(t.state().combine);
});
check('Five successive escapes complete campaign, and replay starts night one',()=>{
  reset();for(let n=0;n<5;n++){assert.equal(t.state().night,n);t.spring({...t.state().farmer,type:'rake',armed:true},t.state().farmer);t.takeKey();Object.assign(t.state().player,t.state().gate);t.interact();assert.equal(t.state().phase,n===4?'complete':'won');if(n<4)t.start();}t.start();assert.equal(t.state().night,0);assert.equal(t.state().phase,'playing');
});
check('Scarecrow employment requires stillness, includes a receipt, and ends on movement',()=>{
  reset();Object.assign(t.state().player,{x:240,y:580});tick(8.1);assert.equal(t.state().employed,true);assert.equal(t.state().employmentReceipt,true);
  t.keys.add('a');tick(.1);t.keys.clear();assert.equal(t.state().employed,false);assert.equal(t.state().employmentReceipt,true);
});
console.log(`\n${passed} gameplay checks passed.`);
